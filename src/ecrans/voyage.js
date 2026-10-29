// Écran d'un voyage (#/voyage/:id) : sa liste, où l'on compte pièce par pièce ce qui est dans le sac
// (docs/PRD.md, US-15, US-16, US-17, US-22 ; maquettes docs/maquettes/voyage/ et grand-ecran/). Une
// colonne de cartes au téléphone ; dès 600 px de petit côté (tablettes, ordinateur), le voyage, le
// menu des catégories et la liste de la choisie : en trois colonnes dès 1340 px de large, sinon les
// catégories en tuiles et la liste dessous (le « repli »).
// Ce fichier branche les gestes, les minuteries et le stockage ; le dessin est dans voyage-vues.js,
// l'état d'affichage figé dans rangement.js, les règles du sac dans le modèle.
//
// Le déroulé d'une coche : l'objet change aussitôt à l'écran, sans que rien ne bouge ; l'écriture part
// dans la file ; une seconde sans nouvel appui, la liste se range en glissant ; une catégorie qui vient
// de boucler reçoit son tampon, puis se replie une seconde plus tard. La fiche d'un objet (fiche.js)
// passe par le même chemin que la case (appliquer), et ses ajustements (quantité prévue, renommer,
// retirer et « Annuler », src/ecrans/ajustements.js) aussi, comme « Ajouter un objet ».
import { appuiSurCase } from '../modele/sac.js';
import { listeParCategorie } from '../modele/voyage.js';
import { DUREE_ALERTE } from './alerte.js';
import { avecObjet, gestesDAjustement } from './ajustements.js';
import { allerALaListe, suivreDisposition, trouverCommande } from './disposition.js';
import { confirmerVider, ouvrirFiche } from './fiche.js';
import {
  apresRepit,
  apresTampon,
  basculerCategorie,
  basculerFiltre,
  categoriesAffichees,
  choisirCategorie,
  etatInitial,
  rendreObjet,
} from './rangement.js';
import { vueAlerte, vueIntrouvable, vueVoyage } from './voyage-vues.js';

// Une seconde sans appui avant tout déplacement, une seconde de tampon avant le repli (docs/PRD.md).
const REPIT = 1000;
const TAMPON = 1000;
// Glissement des lignes qui changent de place (docs/DESIGN.md, journal du 2026-10-24).
const GLISSEMENT = { duration: 320, easing: 'cubic-bezier(0.65, 0, 0.35, 1)' };

// Une adresse mal formée (« %E0%A4%A ») ne désigne aucun voyage : elle est dite introuvable, comme
// un voyage supprimé, plutôt que de passer pour une panne de lecture.
function lireIdentifiant(parametre) {
  try {
    return decodeURIComponent(parametre);
  } catch {
    return null;
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
  // L'objet que « Annuler » vient de rendre ({ id, depuis }), éclairé jusqu'à la fin de son animation :
  // un dessin entre-temps (le rangement après le répit) la reprend où elle en était.
  let recent = null;
  // Au téléphone, la dernière catégorie dépliée touchée (accordéon, case, fiche) : « Ajouter un objet »
  // part d'elle si elle l'est encore. Une fiche d'ajout ouverte : un second appui n'en ouvre pas d'autre.
  let derniere = null;
  let ajoutOuvert = false;

  // Chaque dessin suit la disposition du moment (src/ecrans/disposition.js) : tourner l'appareil ou
  // élargir la fenêtre redessine le même état (coches, catégorie choisie, filtre). Le focus d'une
  // commande qui n'est plus dessinée va à la ligne de son objet, sinon à sa catégorie, sinon au filtre.
  const { peindre, commandeProche } = suivreDisposition(main, {
    dessin: disposition =>
      vueVoyage(contexte, {
        contenu,
        liste,
        etat,
        poses,
        recent: recent && { id: recent.id, ecoule: performance.now() - recent.depuis },
        ...disposition,
      }),
    choisie: () => etat.choisie,
    categorieDe: id => contenu.objets.find(o => o.id === id)?.categorieId,
    ligne: 'fiche',
    repli: 'filtre',
    apresPose() {
      poses = { tampons: new Set(), bandeau: false };
      // Un objet disparu (relecture, retrait) ferme la fiche (repeindre(undefined)).
      const objet = contenu.objets.find(o => o.id === fiche?.id);
      fiche?.repeindre(
        objet,
        contenu.categories.find(c => c.id === objet?.categorieId),
      );
    },
    animation: GLISSEMENT,
    signal: fin.signal,
    parti,
  });

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

  // L'écriture refusée : on revient à ce que le stockage garde réellement, et on le dit (cle : le message).
  async function echec(erreur, cle) {
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
    alerter(t(cle));
  }

  // Un nouveau contenu à l'écran, la liste figée jusqu'au répit. La catégorie choisie qui n'est plus là
  // (son dernier objet retiré) laisse la place à la première qui reste.
  function montrer(nouveau) {
    contenu = nouveau;
    liste = listeParCategorie(contenu);
    if (!liste.some(c => c.categorie.id === etat.choisie))
      etat = choisirCategorie(etat, categoriesAffichees(etat, liste)[0]?.categorie.id ?? null);
    peindre();
    relancerRepit();
  }

  // Le passage commun de tout changement, coche comprise : l'écran d'abord, la liste figée, puis
  // l'écriture dans la file. Refusée, l'écran relit et le dit : la coche, ou une autre modification.
  // Pendant la relecture qui suit un échec, rien ne change (rend false).
  function appliquer(nouveau, ecriture, { coche = false } = {}) {
    if (relecture) return false;
    montrer(nouveau);
    const sienne = generation;
    const message = coche ? 'voyage.erreurEnregistrement' : 'voyage.erreurModification';
    file = file
      .then(() => sienne === generation && ecriture())
      .catch(erreur => sienne === generation && echec(erreur, message))
      // Un échec qui échoue lui-même ne doit pas bloquer la file pour toujours.
      .catch(erreur => console.error(erreur));
    return true;
  }

  // Une écriture qu'on attend avant de rien montrer (renommer, retirer) : dans la file, après celles en
  // cours (et la relecture d'un échec) ; sa promesse rend son résultat ou son refus, sans bloquer la file.
  function attendre(ecriture) {
    const resultat = file.then(ecriture);
    file = resultat.catch(() => {});
    return resultat;
  }

  // L'écran garde la même date que la base : « Annuler » un retrait réécrit l'objet tel qu'elle le gardait.
  function changer(id, dansLeSac) {
    const modifieLe = new Date().toISOString();
    const ecriture = () => stockage.reglerDansLeSac(id, dansLeSac, modifieLe);
    if (!appliquer(avecObjet(contenu, id, { dansLeSac, modifieLe }), ecriture, { coche: true })) return;
    const caseCochee = trouverCommande(main, 'case', id);
    if (caseCochee) caseCochee.dataset.pulse = '';
  }

  const gestes = gestesDAjustement({
    ...contexte,
    app,
    signal: fin.signal,
    contenu: () => contenu,
    appliquer,
    attendre,
    montrer,
  });

  async function appuyerSurCase(id) {
    const objet = contenu.objets.find(o => o.id === id);
    if (!objet || relecture) return;
    derniere = objet.categorieId;
    const { dansLeSac, confirmer: demander } = appuiSurCase(objet);
    if (demander) {
      const accord = await confirmerVider({ t, objet, signal: fin.signal });
      if (parti()) return;
      // Le dessin a pu changer pendant la question : le focus revient à la case de l'objet.
      trouverCommande(main, 'case', id)?.focus();
      if (!accord) return;
    }
    changer(id, dansLeSac);
  }

  // Fermée, la fiche rend le focus à la ligne de l'objet, où qu'elle soit passée entre-temps, ou à la
  // commande la plus proche si la ligne n'est plus dessinée (commandeProche) ; à « Ajouter un objet » de
  // l'écran vide quand le retrait de cet objet a vidé le voyage.
  function ouvrirLaFiche(id) {
    const objet = contenu.objets.find(o => o.id === id);
    if (!objet || fiche) return;
    derniere = objet.categorieId;
    fiche = {
      id,
      repeindre: ouvrirFiche({
        t,
        objet,
        categorie: contenu.categories.find(c => c.id === objet.categorieId),
        surChangement: valeur => changer(id, valeur),
        surQuantite: quantite => gestes.regler(id, quantite),
        surBaisse: quantite => gestes.confirmerBaisse(id, quantite),
        surRenommer: () => gestes.renommer(id),
        surRetirer: () => gestes.retirer(id),
        surFermeture: () => {
          fiche = null;
          (commandeProche({ action: 'fiche', id }) ?? trouverCommande(main, 'ajouter'))?.focus();
        },
        signal: fin.signal,
        dans: app,
      }),
    };
  }

  // Un objet qui revient (« Annuler » d'un retrait) ou qui arrive (« Ajouter un objet ») : il prend aussitôt
  // sa place dans sa catégorie, choisie et dépliée (rendreObjet), éclairé et amené dans la vue.
  function montrerRendu(nouveau, { categorieId, objetId }) {
    contenu = nouveau;
    liste = listeParCategorie(contenu);
    etat = rendreObjet(etat, liste, { categorieId, objetId });
    recent = { id: objetId, depuis: performance.now() };
    peindre({ enVue: `.objet[data-id="${CSS.escape(objetId)}"]` });
  }

  // La catégorie d'où part « Ajouter un objet » : celle de la ligne (grand format) ; sinon la dernière
  // dépliée touchée si elle l'est encore, sinon la première affichée ; aucune dans un voyage vide.
  function departDeLAjout(id) {
    if (id) return id;
    if (derniere && etat.ouvertes.has(derniere) && liste.some(c => c.categorie.id === derniere)) return derniere;
    return categoriesAffichees(etat, liste)[0]?.categorie.id ?? null;
  }

  // Ajouté, l'objet apparaît à sa place, éclairé, et sa ligne prend le focus ; la liste se range ensuite
  // comme après une coche (une catégorie bouclée qui reçoit un objet ne l'est plus). Puis « Ajouter aussi à
  // la bibliothèque ? » : quelle qu'en soit l'issue, le focus revient à sa ligne. Abandonné, le focus revient
  // à la commande touchée (ou à la plus proche).
  async function ajouterUnObjet(id) {
    if (ajoutOuvert || relecture) return;
    ajoutOuvert = true;
    const ecrit = await gestes.ajouter(departDeLAjout(id));
    ajoutOuvert = false;
    if (parti()) return;
    if (!ecrit) return commandeProche({ action: 'ajouter', id })?.focus();
    const { categorie, objet } = ecrit;
    derniere = objet.categorieId;
    montrerRendu(
      {
        ...contenu,
        categories: categorie ? [...contenu.categories, categorie] : contenu.categories,
        objets: [...contenu.objets, objet],
      },
      { categorieId: objet.categorieId, objetId: objet.id },
    );
    trouverCommande(main, 'fiche', objet.id)?.focus();
    relancerRepit();
    await gestes.proposer(objet);
    if (!parti()) trouverCommande(main, 'fiche', objet.id)?.focus();
  }

  main.addEventListener('click', evenement => {
    const commande = evenement.target.closest('[data-action]');
    if (!commande) return;
    const { action, id } = commande.dataset;
    if (action === 'case') appuyerSurCase(id);
    else if (action === 'fiche') ouvrirLaFiche(id);
    else if (action === 'ajouter') ajouterUnObjet(id);
    else if (action === 'accordeon') {
      etat = basculerCategorie(etat, id);
      if (etat.ouvertes.has(id)) derniere = id;
      peindre();
    } else if (action === 'choisir') {
      etat = choisirCategorie(etat, id);
      peindre();
      allerALaListe(main);
    } else if (action === 'filtre') {
      etat = basculerFiltre(etat, liste);
      stockage.ecrireFiltre(contenu.voyage.id, etat.filtre);
      peindre({ glissement: true });
    }
  });
  // « Annuler » d'un retrait (src/ecrans/ajustements.js), d'ici ou d'un autre écran puis revenu : l'objet
  // rendu, relu, rejoint ce que l'écran montre (les coches en cours restent), sa catégorie choisie et
  // dépliée, lui éclairé et amené dans la vue.
  window.addEventListener(
    'voyage-retabli',
    async ({ detail: { voyageId, objetId, categorieId } }) => {
      if (voyageId !== contenu.voyage.id || parti()) return;
      let relu;
      try {
        relu = await stockage.lireVoyage(voyageId);
      } catch (erreur) {
        console.error(erreur);
        return;
      }
      const objet = relu?.objets.find(o => o.id === objetId);
      if (!objet || parti()) return;
      montrerRendu(
        { ...contenu, categories: relu.categories, objets: [...contenu.objets.filter(o => o.id !== objetId), objet] },
        { categorieId, objetId },
      );
    },
    { signal: fin.signal },
  );
  // L'éclairage fini, l'objet redevient une ligne comme les autres.
  main.addEventListener(
    'animationend',
    ({ animationName, target }) => {
      if (animationName !== 'eclaire' || !recent) return;
      recent = null;
      target.closest('[data-recent]')?.removeAttribute('data-recent');
    },
    { signal: fin.signal },
  );
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
