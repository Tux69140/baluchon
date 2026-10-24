// Écran d'un voyage (#/voyage/:id) : sa liste en une colonne, où l'on compte pièce par pièce ce qui
// est dans le sac (docs/PRD.md, US-15, US-16, US-17, US-22 ; maquette docs/maquettes/voyage/).
// Ce fichier branche les gestes, les minuteries et le stockage ; le dessin est dans voyage-vues.js,
// l'état d'affichage figé dans rangement.js, les règles du sac dans le modèle.
//
// Le déroulé d'une coche : l'objet change aussitôt à l'écran, sans que rien ne bouge ; l'écriture part
// dans la file ; une seconde sans nouvel appui, la liste se range en glissant ; une catégorie qui vient
// de boucler reçoit son tampon, puis se replie une seconde plus tard. La fiche d'un objet (fiche.js)
// passe par le même chemin que la case.
import { appuiSurCase } from '../modele/sac.js';
import { listeParCategorie } from '../modele/voyage.js';
import { confirmerVider, ouvrirFiche } from './fiche.js';
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
  // La fin de l'écran, quel que soit le chemin (retour système, lien, adresse, redessin) : dès que
  // ce main n'est plus dans la page, minuteries arrêtées, question en cours retirée, et plus rien ne
  // touche la page.
  const fin = new AbortController();
  // La fiche ouverte : l'objet qu'elle montre et de quoi la repeindre.
  let fiche = null;

  function peindre({ glissement = false } = {}) {
    const avant = glissement && !moinsDAnimations.matches ? places(main) : null;
    const focus = document.activeElement?.closest('[data-action]');
    const cle = focus && main.contains(focus) && { action: focus.dataset.action, id: focus.dataset.id };
    main.innerHTML = vueVoyage(contexte, { contenu, liste, etat, poses });
    poses = { tampons: new Set(), bandeau: false };
    if (cle) trouverCommande(cle.action, cle.id)?.focus({ preventScroll: true });
    if (avant) glisser(main, avant);
    // Un objet disparu à la relecture ferme la fiche (repeindre(undefined)).
    fiche?.repeindre(contenu.objets.find(o => o.id === fiche.id));
  }

  const trouverCommande = (action, id) =>
    main.querySelector(`[data-action="${action}"]${id ? `[data-id="${CSS.escape(id)}"]` : ''}`);

  function arreter() {
    for (const cle of Object.keys(minuteries)) clearTimeout(minuteries[cle]);
  }

  // Vrai si l'écran est parti ; le constat suffit à tout arrêter, sans attendre l'observateur.
  function parti() {
    if (!fin.signal.aborted && !main.isConnected) fin.abort();
    return fin.signal.aborted;
  }

  function finDuRepit() {
    if (parti()) return;
    const resultat = apresRepit(etat, liste);
    etat = resultat.etat;
    poses = { tampons: new Set(resultat.nouvelles), bandeau: resultat.sacVientDeBoucler };
    aReplier = [...new Set([...aReplier, ...resultat.nouvelles])];
    peindre({ glissement: true });
    if (aReplier.length) minuteries.tampon = setTimeout(finDuTampon, TAMPON);
  }

  function finDuTampon() {
    if (parti()) return;
    etat = apresTampon(etat, aReplier, liste);
    aReplier = [];
    peindre({ glissement: true });
  }

  function relancerRepit() {
    clearTimeout(minuteries.repit);
    clearTimeout(minuteries.tampon);
    minuteries.repit = setTimeout(finDuRepit, REPIT);
  }

  // Une fenêtre ouverte (la fiche) rend l'écran derrière inerte et voilé : le message se pose alors
  // en elle, pour être vu et lu ; pas dans une fenêtre en train de se fermer, qui l'emporterait.
  function alerter(texte) {
    app.querySelector('.alerte')?.remove();
    clearTimeout(minuteries.alerte);
    const hote = app.querySelector('dialog:modal:not([data-fermeture])') ?? app;
    hote.insertAdjacentHTML('beforeend', vueAlerte(texte));
    const alerte = hote.lastElementChild;
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
    if (parti()) return;
    peindre();
    alerter(t('voyage.erreurEnregistrement'));
  }

  function enregistrer(id, dansLeSac) {
    const sienne = generation;
    file = file
      .then(() => sienne === generation && stockage.reglerDansLeSac(id, dansLeSac, new Date().toISOString()))
      .catch(erreur => sienne === generation && echec(erreur))
      // Un échec qui échoue lui-même ne doit pas bloquer la file pour toujours.
      .catch(erreur => console.error(erreur));
  }

  // Le chemin commun de tout changement de pièces, case ou fiche : l'écran d'abord, la liste figée,
  // puis la base. Pendant la relecture qui suit un échec, rien ne change.
  function changer(id, dansLeSac) {
    if (relecture) return;
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
      const accord = await confirmerVider({ t, objet, signal: fin.signal });
      if (parti()) return;
      // Le dessin a pu changer pendant la question : le focus revient à la case de l'objet.
      trouverCommande('case', id)?.focus();
      if (!accord) return;
    }
    changer(id, dansLeSac);
  }

  // Fermée, la fiche rend le focus à la ligne de l'objet, où qu'elle soit passée entre-temps ; si la
  // ligne n'est plus dessinée (catégorie repliée après son tampon, objet masqué par le filtre), à
  // l'en-tête de sa catégorie, sinon au filtre : jamais à la page entière.
  function ouvrirLaFiche(id) {
    const objet = contenu.objets.find(o => o.id === id);
    if (!objet || fiche) return;
    fiche = {
      id,
      repeindre: ouvrirFiche({
        t,
        objet,
        categorie: contenu.categories.find(c => c.id === objet.categorieId),
        surChangement: valeur => changer(id, valeur),
        surFermeture: () => {
          fiche = null;
          const retour =
            trouverCommande('fiche', id) ??
            trouverCommande('accordeon', objet.categorieId) ??
            trouverCommande('filtre');
          retour?.focus();
        },
        signal: fin.signal,
        dans: app,
      }),
    };
  }

  main.addEventListener('click', evenement => {
    const commande = evenement.target.closest('[data-action]');
    if (!commande) return;
    const { action, id } = commande.dataset;
    if (action === 'case') appuyerSurCase(id);
    else if (action === 'fiche') ouvrirLaFiche(id);
    else if (action === 'accordeon') {
      etat = basculerCategorie(etat, id);
      peindre();
    } else if (action === 'filtre') {
      etat = basculerFiltre(etat, liste);
      stockage.ecrireFiltre(contenu.voyage.id, etat.filtre);
      peindre({ glissement: true });
    }
  });
  fin.signal.addEventListener('abort', arreter);
  const observateur = new MutationObserver(() => parti() && observateur.disconnect());
  observateur.observe(app, { childList: true });
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
