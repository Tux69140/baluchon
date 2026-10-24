// Écran d'un voyage (#/voyage/:id) : sa liste en une colonne, où l'on compte pièce par pièce ce qui
// est dans le sac (docs/PRD.md, US-15, US-16, US-17, US-22 ; maquette docs/maquettes/voyage/).
// Ce fichier branche les gestes, les minuteries et le stockage ; le dessin est dans voyage-vues.js,
// l'état d'affichage figé dans rangement.js, les règles du sac dans le modèle.
//
// Le déroulé d'une coche : l'objet change aussitôt à l'écran, sans que rien ne bouge ; l'écriture part
// dans la file ; une seconde sans nouvel appui, la liste se range en glissant ; une catégorie qui vient
// de boucler reçoit son tampon, puis se replie une seconde plus tard.
import { remplir } from '../i18n/traduction.js';
import { appuiSurCase } from '../modele/sac.js';
import { listeParCategorie } from '../modele/voyage.js';
import { confirmer } from './fenetre.js';
import { apresRepit, apresTampon, basculerCategorie, basculerFiltre, etatInitial } from './rangement.js';
import { vueAlerte, vueIntrouvable, vueVoyage } from './voyage-vues.js';

// Une seconde sans appui avant tout déplacement, une seconde de tampon avant le repli (docs/PRD.md).
const REPIT = 1000;
const TAMPON = 1000;
const DUREE_ALERTE = 6000;
// Glissement des lignes qui changent de place (docs/DESIGN.md, journal du 2026-10-24).
const GLISSEMENT = { duration: 320, easing: 'cubic-bezier(0.65, 0, 0.35, 1)' };
const moinsDAnimations = matchMedia('(prefers-reduced-motion: reduce)');

// Une adresse mal formée (« %E0%A4%A ») ne désigne aucun voyage : elle est dite introuvable, comme
// un voyage supprimé, plutôt que de passer pour une panne de lecture.
function lireIdentifiant(parametre) {
  try {
    return decodeURIComponent(parametre);
  } catch {
    return null;
  }
}

// La place de chaque élément mobile, relevée par rapport à l'élément mobile qui le contient : une
// ligne qui descend avec sa carte ne glisse qu'une fois, avec elle.
function places(racine) {
  const resultat = new Map();
  for (const el of racine.querySelectorAll('[data-flip]')) {
    const parent = el.parentElement.closest('[data-flip]');
    resultat.set(el.dataset.flip, el.getBoundingClientRect().top - (parent?.getBoundingClientRect().top ?? 0));
  }
  return resultat;
}

// Chaque élément part de son ancienne place et glisse jusqu'à la nouvelle (technique « FLIP »).
function glisser(racine, avant) {
  const apres = places(racine);
  for (const el of racine.querySelectorAll('[data-flip]')) {
    // Un élément qui vient d'apparaître (filtre retiré) n'a pas d'ancienne place : il est là, simplement.
    if (!avant.has(el.dataset.flip)) continue;
    const delta = avant.get(el.dataset.flip) - apres.get(el.dataset.flip);
    if (Math.abs(delta) > 1) el.animate([{ transform: `translateY(${delta}px)` }, { transform: 'none' }], GLISSEMENT);
  }
}

// Une liste ouverte : son état, ses minuteries et sa file d'écriture vivent le temps de l'écran.
function ouvrirListe(app, donnees, contexte) {
  const { stockage, t } = contexte;
  app.innerHTML = '<main class="ecran"></main>';
  const main = app.firstElementChild;
  let contenu = donnees.contenu;
  let liste = listeParCategorie(contenu);
  let etat = etatInitial(liste, { filtre: donnees.filtre });
  // Les tampons et le bandeau qui viennent d'apparaître : animés à ce dessin-là seulement.
  let poses = { tampons: new Set(), bandeau: false };
  // Les catégories bouclées qui attendent leur repli ; un appui pendant le tampon le repousse.
  let aReplier = [];
  const minuteries = { repit: null, tampon: null, alerte: null };
  // La file d'écriture : une écriture à la fois, dans l'ordre des appuis. Après un échec, les
  // écritures d'avant (génération dépassée) sont abandonnées, et les appuis attendent la relecture.
  let file = Promise.resolve();
  let generation = 0;
  let relecture = false;

  function peindre({ glissement = false } = {}) {
    const avant = glissement && !moinsDAnimations.matches ? places(main) : null;
    const focus = document.activeElement?.closest('[data-action]');
    const cle = focus && main.contains(focus) && { action: focus.dataset.action, id: focus.dataset.id };
    main.innerHTML = vueVoyage(contexte, { contenu, liste, etat, poses });
    poses = { tampons: new Set(), bandeau: false };
    if (cle) trouverCommande(cle.action, cle.id)?.focus({ preventScroll: true });
    if (avant) glisser(main, avant);
  }

  const trouverCommande = (action, id) =>
    main.querySelector(`[data-action="${action}"]${id ? `[data-id="${CSS.escape(id)}"]` : ''}`);

  function arreter() {
    for (const cle of Object.keys(minuteries)) clearTimeout(minuteries[cle]);
  }

  function finDuRepit() {
    const resultat = apresRepit(etat, liste);
    etat = resultat.etat;
    poses = { tampons: new Set(resultat.nouvelles), bandeau: resultat.sacVientDeBoucler };
    aReplier = [...new Set([...aReplier, ...resultat.nouvelles])];
    peindre({ glissement: true });
    if (aReplier.length) minuteries.tampon = setTimeout(finDuTampon, TAMPON);
  }

  function finDuTampon() {
    etat = apresTampon(etat, aReplier, liste);
    aReplier = [];
    peindre({ glissement: true });
  }

  function relancerRepit() {
    clearTimeout(minuteries.repit);
    clearTimeout(minuteries.tampon);
    minuteries.repit = setTimeout(finDuRepit, REPIT);
  }

  function alerter(texte) {
    app.querySelector('.alerte')?.remove();
    clearTimeout(minuteries.alerte);
    app.insertAdjacentHTML('beforeend', vueAlerte(texte));
    const alerte = app.lastElementChild;
    minuteries.alerte = setTimeout(() => alerte.remove(), DUREE_ALERTE);
  }

  // L'écriture refusée : on revient à ce que le stockage garde réellement, et on le dit.
  async function echec(erreur) {
    console.error(erreur);
    generation += 1;
    relecture = true;
    clearTimeout(minuteries.repit);
    clearTimeout(minuteries.tampon);
    aReplier = [];
    try {
      const relu = await stockage.lireVoyage(contenu.voyage.id);
      if (relu) {
        contenu = relu;
        liste = listeParCategorie(contenu);
        etat = etatInitial(liste, { filtre: etat.filtre });
      }
    } catch (erreurDeLecture) {
      // Relecture impossible : l'écran garde ce qu'il montre, le message dit que la coche n'est pas sûre.
      console.error(erreurDeLecture);
    } finally {
      relecture = false;
    }
    if (!main.isConnected) return;
    peindre();
    alerter(t('voyage.erreurEnregistrement'));
  }

  function enregistrer(id, dansLeSac) {
    const sienne = generation;
    file = file
      .then(() => sienne === generation && stockage.reglerDansLeSac(id, dansLeSac, new Date().toISOString()))
      .catch(erreur => sienne === generation && echec(erreur));
  }

  // Le chemin commun de tout changement de pièces : l'écran d'abord, la liste figée, puis la base.
  function changer(id, dansLeSac) {
    contenu = { ...contenu, objets: contenu.objets.map(o => (o.id === id ? { ...o, dansLeSac } : o)) };
    liste = listeParCategorie(contenu);
    peindre();
    const caseCochee = trouverCommande('case', id);
    if (caseCochee) caseCochee.dataset.pulse = '';
    relancerRepit();
    enregistrer(id, dansLeSac);
  }

  async function appuyerSurCase(id) {
    const objet = contenu.objets.find(o => o.id === id);
    if (!objet || relecture) return;
    const { dansLeSac, confirmer: demander } = appuiSurCase(objet);
    if (demander) {
      const accord = await confirmer({
        t,
        titre: remplir(t('fiche.confirmerTitre'), { nom: objet.nom }),
        texte: remplir(t('fiche.confirmerTexte'), { n: objet.dansLeSac }),
        action: t('fiche.vider'),
      });
      if (!main.isConnected) return;
      // Le dessin a pu changer pendant la question : le focus revient à la case de l'objet.
      trouverCommande('case', id)?.focus();
      if (!accord || relecture) return;
    }
    changer(id, dansLeSac);
  }

  main.addEventListener('click', evenement => {
    const commande = evenement.target.closest('[data-action]');
    if (!commande) return;
    const { action, id } = commande.dataset;
    if (action === 'case') appuyerSurCase(id);
    else if (action === 'accordeon') {
      etat = basculerCategorie(etat, id);
      peindre();
    } else if (action === 'filtre') {
      etat = basculerFiltre(etat, liste);
      stockage.ecrireFiltre(contenu.voyage.id, etat.filtre);
      peindre({ glissement: true });
    }
  });
  // Quitter l'écran arrête les minuteries : elles ne toucheraient plus qu'une page partie.
  window.addEventListener('hashchange', arreter, { once: true });
  peindre();
}

export const ecranVoyage = {
  nom: 'voyage',
  async charger({ stockage, parametre }) {
    const id = lireIdentifiant(parametre);
    const contenu = id === null ? null : await stockage.lireVoyage(id);
    return { contenu, filtre: contenu ? stockage.lireFiltre(contenu.voyage.id) : false };
  },
  dessiner(app, donnees, contexte) {
    if (!donnees.contenu) app.innerHTML = vueIntrouvable(contexte.t);
    else ouvrirListe(app, donnees, contexte);
  },
};
