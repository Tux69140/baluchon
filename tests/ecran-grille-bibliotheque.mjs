// Grille de la phase 14 : la Bibliothèque (cartes, mode « Ranger », fiches de catégorie et d'objet), les
// Étiquettes (cartes, mode « Ranger », fiches de groupe et d'étiquette), les suppressions (question
// chiffrée, refus « N à régler ») et le bandeau « Annuler », à chaque format et chaque thème (voir
// tests/outils/grille.mjs). Les formats bloquants jugent par le code de sortie ; telephone-paysage est
// mis au rapport dans captures-travail/phase-14/rapports/.
// Hors grille, la Bibliothèque dans une fenêtre Debian basse (1000 × 560, sans doigt) est jugée par ses
// seules commandes : grand écran par la largeur, pas par la hauteur.
import { chromium } from 'playwright';
import { pathToFileURL } from 'node:url';
import { attendreQue } from './outils/attente.mjs';
import { supprimerCategorie, supprimerObjet, DONNEES as DONNEES_ANNULATION } from './outils/annulation.mjs';
import { DONNEES, fr } from './outils/bibliotheque.mjs';
import { DEPART } from './outils/etiquettes.mjs';
import { FICHE, attendreOuverte, ouvrirFicheCategorie, ouvrirFicheObjet, segment, toucher } from './outils/fiches.mjs';
import { FORMATS_BLOQUANTS, parcourirGrille } from './outils/grille.mjs';
import {
  LONG,
  bandeauEntierEtTouchable,
  dernierBoutonAtteignable,
  fenetreEntiere,
  figerHorloge,
  installerHorloge,
  segmentsBordsNets,
  segmentsSansDebord,
} from './outils/grille-fenetres.mjs';
import { bibliothequeDeNoms, graineMini, miniAvecNoms } from './outils/mini-bibliotheque.mjs';
import { attendreEcran, creerJuge, ouvrir, poserZones, verifierBarres, verifierCommandes } from './outils/page.mjs';
import { demarrerServeur } from './outils/serveur.mjs';
import {
  attendreQuestion,
  attendreRefus,
  donnees as donneesSuppressions,
  ouvrirFicheDe,
  toucherSupprimer,
} from './outils/suppressions.mjs';

const BIBLIOTHEQUE = '#/bibliotheque';
const ETIQUETTES = '#/etiquettes';
const BANDEAU = '.bandeau-annuler';
const o = fr.modele.objet;

// Les noms les plus longs de la mini-bibliothèque : un groupe, une étiquette, une catégorie, un objet.
const longues = miniAvecNoms();
longues.groupes[0].nom = LONG;
longues.groupes[0].etiquettes[0].nom = LONG;
longues.categories[0].nom = LONG;
longues.categories[0].objets[0].nom = LONG;
let numero = 0;
const NOMS_LONGS = {
  toucheRetour: true,
  ...graineMini(bibliothequeDeNoms(longues, { nouvelId: () => `id-${++numero}`, maintenant: 'x' })),
};

// Pas d'heure imposée à la page : rien de la Bibliothèque ne dépend de la date, et une heure fixée
// empêcherait l'horloge simulée du bandeau « Annuler » de tourner.
const sur = (nom, adresse, donnees, preparer) => ({ nom, adresse, donnees, preparer });
const bibliotheque = async page => attendreEcran(page, 'bibliotheque');
const etiquettes = async page => attendreEcran(page, 'etiquettes');
const ranger = ecran => async page => {
  await attendreEcran(page, ecran);
  await page.click('#app [data-action="ranger"]');
  await attendreQue(page, () => document.querySelector('#app [data-action="terminer"]') !== null);
};
const ficheCategorie = nom => async page => {
  await bibliotheque(page);
  await ouvrirFicheCategorie(page, nom);
};
const ficheObjet = (categorie, objet) => async page => {
  await bibliotheque(page);
  await ouvrirFicheObjet(page, categorie, objet);
};
const ficheDe = (sorte, nom) => async page => {
  await etiquettes(page);
  await ouvrirFicheDe(page, sorte, nom);
};

// Review Focus 1 : la fiche d'objet complète (« Par semaine », « Pour qui » ouvert sur « Enfants ») défilée
// jusqu'en bas ; son dernier bouton est dans l'écran, hors de la barre du bas.
const ficheObjetDefilee = async page => {
  await ficheObjet('Alimentation', 'Repas')(page);
  await segment(page, o.parSemaine);
  await segment(page, o.groupes.enfants);
  await dernierBoutonAtteignable(page, FICHE);
};
const ficheCategorieDefilee = async page => {
  await ficheCategorie('Camping')(page);
  await dernierBoutonAtteignable(page, FICHE);
};
const questionChiffree = async page => {
  await ficheCategorie('Camping')(page);
  await toucher(page, '[data-supprimer]');
  await attendreQuestion(page);
};
const refus = async page => {
  await ficheDe('etiquette', 'Plage')(page);
  await toucherSupprimer(page);
  await attendreRefus(page);
};
const retirerObjet = async page => {
  await bibliotheque(page);
  await installerHorloge(page);
  await supprimerObjet(page, 'Toilette', 'Crème solaire');
  await figerHorloge(page);
  await bandeauEntierEtTouchable(page, BANDEAU, "bandeau « Annuler » absent ou perdu après l'arrêt de l'horloge");
};
// Review Focus 3 : le bandeau apparu, une fiche s'ouvre ; il se range dans la fenêtre, entier et touchable.
const bandeauFicheOuverte = async page => {
  await bibliotheque(page);
  await installerHorloge(page);
  await supprimerObjet(page, 'Toilette', 'Crème solaire');
  await ouvrirFicheCategorie(page, 'Camping');
  await figerHorloge(page);
  await bandeauEntierEtTouchable(page, BANDEAU, 'bandeau « Annuler » dans une fenêtre');
};
// Une catégorie supprimée, puis la fiche d'un objet ouverte : le bandeau se range dans la fiche.
const bandeauFicheObjet = async page => {
  await bibliotheque(page);
  await installerHorloge(page);
  await supprimerCategorie(page, 'Camping');
  await ouvrirFicheObjet(page, 'Alimentation', 'Repas');
  await figerHorloge(page);
  await bandeauEntierEtTouchable(page, BANDEAU, "bandeau « Annuler » sous la fiche d'objet");
};

const ficheNomsLongs = async page => {
  await ficheCategorie(LONG)(page);
  await fenetreEntiere(page, FICHE);
};
const ficheObjetNomLong = async page => {
  await ficheObjet(LONG, LONG)(page);
  await fenetreEntiere(page, FICHE);
  await segmentsBordsNets(page, `${FICHE} .segments-pour-qui`);
};
const ficheEtiquetteNomLong = async page => {
  await etiquettes(page);
  await page.click(`#app .puce-modele:has-text("${LONG.slice(0, 20)}")`);
  await attendreOuverte(page);
  await fenetreEntiere(page, 'dialog[open]');
};
const ficheGroupeNomLong = async page => {
  await etiquettes(page);
  await page.click('#app [data-action="modifier-groupe"]');
  await attendreOuverte(page);
  await fenetreEntiere(page, 'dialog[open]');
};

export const ETATS = [
  sur('bibliotheque', BIBLIOTHEQUE, DONNEES, bibliotheque),
  sur('bibliotheque-ranger', BIBLIOTHEQUE, DONNEES, ranger('bibliotheque')),
  sur('fiche-categorie', BIBLIOTHEQUE, DONNEES, ficheCategorie('Camping')),
  sur('fiche-categorie-defilee', BIBLIOTHEQUE, DONNEES, ficheCategorieDefilee),
  sur('fiche-objet-defilee', BIBLIOTHEQUE, DONNEES, ficheObjetDefilee),
  sur('etiquettes', ETIQUETTES, DONNEES, etiquettes),
  sur('etiquettes-ranger', ETIQUETTES, DONNEES, ranger('etiquettes')),
  sur('fiche-groupe', ETIQUETTES, DONNEES, ficheDe('groupe', Object.keys(DEPART)[0])),
  sur('fiche-etiquette', ETIQUETTES, DONNEES, ficheDe('etiquette', 'Camping')),
  sur('suppression-question-chiffree', BIBLIOTHEQUE, DONNEES, questionChiffree),
  sur('suppression-refus', ETIQUETTES, donneesSuppressions(), refus),
  sur('bandeau-annuler', BIBLIOTHEQUE, DONNEES_ANNULATION, retirerObjet),
  sur('bandeau-fiche-ouverte', BIBLIOTHEQUE, DONNEES_ANNULATION, bandeauFicheOuverte),
  sur('bandeau-fiche-objet', BIBLIOTHEQUE, DONNEES_ANNULATION, bandeauFicheObjet),
  sur('noms-longs', BIBLIOTHEQUE, NOMS_LONGS, bibliotheque),
  sur('noms-longs-fiche-categorie', BIBLIOTHEQUE, NOMS_LONGS, ficheNomsLongs),
  sur('noms-longs-fiche-objet', BIBLIOTHEQUE, NOMS_LONGS, ficheObjetNomLong),
  sur('noms-longs-etiquettes', ETIQUETTES, NOMS_LONGS, etiquettes),
  sur('noms-longs-fiche-etiquette', ETIQUETTES, NOMS_LONGS, ficheEtiquetteNomLong),
  sur('noms-longs-fiche-groupe', ETIQUETTES, NOMS_LONGS, ficheGroupeNomLong),
];

// Review Focus 5 : une fenêtre Debian de 1000 × 560, à la souris ; la Bibliothèque sans défilement de côté
// et avec des cibles de 44 px (verifierCommandes, seule règle jugée ici), sans erreur ni requête sortante.
async function fenetreBasse() {
  const juge = creerJuge();
  const serveur = await demarrerServeur();
  const navigateur = await chromium.launch();
  try {
    const { contexte, page, erreurs, sorties } = await ouvrir(navigateur, serveur.url, {
      taille: { width: 1000, height: 560 },
      theme: 'light',
      donnees: DONNEES,
      adresse: BIBLIOTHEQUE,
      tactile: false,
    });
    const cas = 'bibliothèque · 1000 × 560';
    await attendreEcran(page, 'bibliotheque');
    await verifierCommandes(page, juge, cas);
    juge.exige(erreurs.length === 0, `${cas} : erreurs de page : ${erreurs.join(' | ')}`);
    juge.exige(sorties.length === 0, `${cas} : requêtes sortantes : ${sorties.join(', ')}`);
    await contexte.close();
  } finally {
    await navigateur.close();
    await serveur.fermer();
  }
  juge.conclure('fenêtre basse', 'la Bibliothèque à 1000 × 560 : cibles de 44 px, rien ne défile de côté');
}

// Un téléphone étroit (360 × 640, texte normal) : la fiche d'objet, rangée « Pour qui » comprise, tient entière,
// sans mot qui déborde de sa case, aux traits nets, avec des cibles de 44 px, rien qui défile de côté ni ne passe
// sous les barres système, sans erreur ni requête sortante.
async function ficheObjetEtroite() {
  const juge = creerJuge();
  const serveur = await demarrerServeur();
  const navigateur = await chromium.launch();
  try {
    for (const theme of ['light', 'dark']) {
      const { contexte, page, erreurs, sorties } = await ouvrir(navigateur, serveur.url, {
        taille: { width: 360, height: 640 },
        theme,
        donnees: NOMS_LONGS,
        adresse: BIBLIOTHEQUE,
      });
      const cas = `fiche d'objet · 360 × 640 · ${theme}`;
      await poserZones(page);
      await ficheObjet(LONG, LONG)(page);
      await fenetreEntiere(page, FICHE);
      await segmentsSansDebord(page, FICHE);
      await segmentsBordsNets(page, `${FICHE} .segments-pour-qui`);
      await verifierCommandes(page, juge, cas);
      await verifierBarres(page, juge, cas);
      juge.exige(erreurs.length === 0, `${cas} : erreurs de page : ${erreurs.join(' | ')}`);
      juge.exige(sorties.length === 0, `${cas} : requêtes sortantes : ${sorties.join(', ')}`);
      await contexte.close();
    }
  } finally {
    await navigateur.close();
    await serveur.fermer();
  }
  juge.conclure(
    'fiche étroite',
    "la fiche d'objet à 360 × 640 : entière, mots dans leur case, traits nets, cibles de 44 px, barres libres",
  );
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  await parcourirGrille({ titre: 'bibliotheque', etats: ETATS, formats: FORMATS_BLOQUANTS });
  await fenetreBasse();
  await ficheObjetEtroite();
}
