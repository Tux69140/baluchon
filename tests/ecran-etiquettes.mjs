// Phase 6 (spec, « Maquettes validées », docs/maquettes/etiquettes/) : l'écran Étiquettes, ouvert par
// Menu → Réglages → Étiquettes sur la bibliothèque de départ installée par l'appli. Le rangement est
// dans ecran-etiquettes-rangement.mjs, le détail des fiches dans ecran-etiquettes-fiches.mjs.
// - lecture : la ligne « Étiquettes » de Réglages ; titre, « 3 groupes · 9 étiquettes », l'aide, trois
//   cartes dans l'ordre avec « 3 étiquettes · étape N de « Nouveau voyage » » et leurs puces ; touche
//   retour : Réglages, l'accueil, la sortie de l'appli ;
// - « Nouveau groupe » « Transport » : carte en dernier, « Aucune étiquette · absent… », éclairée,
//   focus sur son « Ajouter une étiquette » ; y ajouter « Train » → « étape 5 » ; double appui sur
//   « Créer le groupe » pendant une écriture lente : un seul groupe (Review Focus 4) ;
// - renommer Plage, supprimer Pluie, supprimer Climat (Hébergement passe à l'étape 3), sur une
//   bibliothèque où ces suppressions ne laissent aucun modèle sans étiquette (phase 7) ;
// - Review Focus 1 : noms à balises rendus en texte (carte, puce et son libellé, ▲ ▼) ;
// - tous les formats, clair et sombre : deux colonnes de cartes dès qu'elles tiennent (tablette,
//   ordinateur), une au téléphone ; cibles, barres système ; captures etiquettes-… et reglages-….
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { chromium } from 'playwright';
import { attendreQue, calme } from './outils/attente.mjs';
import { demarrerServeur } from './outils/serveur.mjs';
import { construireBibliotheque } from '../src/modele/bibliotheque.js';
import { DONNEES, TOUS_FORMATS, commande, fermerEssai, fr, remplir, toucheRetour, vu } from './outils/bibliotheque.mjs';
import { attendreFermee, attendreOuverte, enregistrer, saisir, toucher } from './outils/fiches.mjs';
import {
  DEPART,
  arbreDe,
  arbreDesCartes,
  arbreStocke,
  compter,
  e,
  idEtiquette,
  idGroupe,
  infos,
  libererEcritures,
  lire,
  ouvrirEtiquettes as ouvrirLesEtiquettes,
} from './outils/etiquettes.mjs';
import { CAPTURES, NOMS_THEME, creerJuge, verifierBarres, verifierCommandes } from './outils/page.mjs';

const juge = creerJuge();
const serveur = await demarrerServeur();
const navigateur = await chromium.launch();
const ouvrirEtiquettes = (format, options) => ouvrirLesEtiquettes(navigateur, serveur.url, format, options);
const fermer = (cas, ouvert) => fermerEssai(juge, cas, ouvert);
const QUESTION = 'dialog[role="alertdialog"]';
const LARGES = new Set(['tablette-portrait', 'tablette-paysage', 'ordinateur']);

// Une étiquette et un groupe aux noms piégés (Review Focus 1), ajoutés à la bibliothèque de départ.
const PIEGE = { etiquette: '<b>&"x', groupe: '<i>&"g' };
let numero = 0;
const base = construireBibliotheque(fr.bibliothequeDeDepart, { nouvelId: () => `id-${++numero}`, maintenant: 'x' });
const DONNEES_PIEGE = {
  ...DONNEES,
  meta: { bibliothequeInstallee: true, langueBibliotheque: 'fr' },
  bibliotheque: {
    ...base,
    groupes: [...base.groupes, { id: 'g-piege', nom: PIEGE.groupe, ordre: 9, modifieLe: 'x' }],
    etiquettes: [
      ...base.etiquettes,
      { id: 'e-piege', groupeId: 'g-piege', nom: PIEGE.etiquette, ordre: 0, modifieLe: 'x' },
    ],
  },
};

// Depuis la phase 7, une suppression qui laisserait un modèle sans étiquette est refusée (décision du
// chef de projet du 2026-10-26) : Doudoune, Bonnet et Cape de pluie, qui ne portent que des étiquettes
// de Climat, sont ici « toujours inclus », pour que Pluie et Climat se suppriment.
const climat = new Set(
  base.etiquettes.filter(x => x.groupeId === base.groupes.find(g => g.nom === 'Climat').id).map(x => x.id),
);
const DONNEES_SANS_ORPHELIN = {
  ...DONNEES,
  meta: DONNEES_PIEGE.meta,
  bibliotheque: {
    ...base,
    objets: base.objets.map(o =>
      o.etiquettes.length && o.etiquettes.every(id => climat.has(id))
        ? { ...o, toujoursInclus: true, etiquettes: [] }
        : o,
    ),
  },
};

// Ouvrir la fiche par sa commande, y taper un nom, l'enregistrer ; rend vrai si elle s'est fermée.
async function nommer(page, selecteur, nom) {
  await page.click(selecteur);
  juge.exige(await attendreOuverte(page), `la fiche de ${selecteur} s'ouvre`);
  await saisir(page, '#f-nom', nom);
  await enregistrer(page);
  return attendreFermee(page);
}

// Ouvrir la fiche, « Supprimer », puis « Supprimer » dans la question ; rend vrai si tout s'est fermé.
async function supprimer(page, selecteur) {
  await page.click(selecteur);
  juge.exige(await attendreOuverte(page), `la fiche de ${selecteur} s'ouvre`);
  await toucher(page, '[data-supprimer]');
  await attendreQue(page, q => document.querySelector(`${q}[open]`) !== null, QUESTION);
  await calme(page);
  await page.click(`${QUESTION} .fenetre-pied button:text-is("${fr.suppression.supprimer}")`);
  return attendreFermee(page);
}

async function essaiLecture() {
  const cas = 'lecture';
  const ouvert = await ouvrirEtiquettes();
  const { page } = ouvert;
  const vue = await lire(page);
  juge.exige(
    vue.titre === e.titre &&
      vue.resume === `${compter('groupes', 3)} · ${compter('etiquettes', 9)}` &&
      vue.aide === e.aide &&
      vue.retour === fr.reglages.titre &&
      vue.menu &&
      vue.ranger === e.ranger &&
      vue.nouveauGroupe === e.nouveauGroupe,
    `${cas} : en-tête ${vu({ ...vue, cartes: undefined })}`,
  );
  juge.exige(arbreDesCartes(vue) === arbreDe(DEPART), `${cas} : cartes ${arbreDesCartes(vue)}`);
  juge.exige(
    vu(vue.cartes.map(c => c.infos)) === vu([infos(3, 2), infos(3, 3), infos(3, 4)]) &&
      vue.cartes.every(c => c.vide === null && c.ajout === e.ajouter) &&
      vue.cartes[1].modifier === remplir(e.modifierGroupe, { nom: 'Climat' }) &&
      vue.cartes[0].puces[2].libelle === remplir(e.modifierEtiquette, { nom: 'Plage' }),
    `${cas} : cartes ${vu(vue.cartes)}`,
  );

  // La touche retour : Réglages (et sa ligne Étiquettes), l'accueil, puis la sortie de l'appli.
  await toucheRetour(page);
  const reglages = await lire(page);
  await toucheRetour(page);
  const accueil = await lire(page);
  await toucheRetour(page);
  const sortie = await lire(page);
  juge.exige(
    reglages.ecran === 'reglages' &&
      reglages.reglage?.titre === fr.reglages.etiquettes &&
      reglages.reglage.aide === fr.reglages.etiquettesAide &&
      reglages.reglage.picto,
    `${cas}, Réglages : ${vu(reglages.reglage)}`,
  );
  juge.exige(
    accueil.ecran === 'voyages' && accueil.sorties === 0 && sortie.ecran === 'voyages' && sortie.sorties === 1,
    `${cas}, touches retour : ${vu([reglages.ecran, accueil.ecran, accueil.sorties, sortie.sorties])}`,
  );
  await fermer(cas, ouvert);
}

async function essaiNouveauGroupe() {
  const cas = 'nouveau groupe';
  const ouvert = await ouvrirEtiquettes();
  const { page } = ouvert;
  juge.exige(await nommer(page, '#app [data-action="nouveau-groupe"]', 'Transport'), `${cas} : la fiche se ferme`);
  const vue = await lire(page);
  const transport = vue.cartes.at(-1);
  juge.exige(
    vue.cartes.length === 4 &&
      transport.nom === 'Transport' &&
      transport.infos === e.absent &&
      transport.vide === e.vide &&
      transport.puces.length === 0 &&
      transport.recent &&
      vue.cartes.slice(0, 3).every(c => !c.recent) &&
      vue.resume === `${compter('groupes', 4)} · ${compter('etiquettes', 9)}`,
    `${cas} : ${vu(transport)}`,
  );
  juge.exige(
    vu(vue.focus) === vu({ action: 'nouvelle-etiquette', id: transport.id }),
    `${cas} : focus ${vu(vue.focus)}`,
  );
  juge.exige(
    (await arbreStocke(page)) === arbreDe({ ...DEPART, Transport: [] }),
    `${cas} : stocké ${await arbreStocke(page)}`,
  );

  const casTrain = 'étiquette Train';
  juge.exige(await nommer(page, commande('nouvelle-etiquette', transport.id), 'Train'), `${casTrain} : fermée`);
  const avecTrain = await lire(page);
  const carte = avecTrain.cartes.at(-1);
  juge.exige(
    carte.infos === infos(1, 5) && vu(carte.puces.map(p => p.nom)) === vu(['Train']) && avecTrain.recent === 'Train',
    `${casTrain} : ${vu(carte)}, éclairée ${vu(avecTrain.recent)}`,
  );
  juge.exige(
    (await arbreStocke(page)) === arbreDe({ ...DEPART, Transport: ['Train'] }),
    `${casTrain} : stocké ${await arbreStocke(page)}`,
  );
  await fermer(cas, ouvert);

  // Review Focus 4 : deux appuis sur « Créer le groupe » pendant une écriture lente.
  const casDouble = 'double appui sur Créer le groupe';
  const lent = await ouvrirEtiquettes('telephone', { donnees: { ...DONNEES, lenteurs: ['enregistrerGroupe'] } });
  const p = lent.page;
  await p.click('#app [data-action="nouveau-groupe"]');
  await attendreOuverte(p);
  await saisir(p, '#f-nom', 'Transport');
  await p.evaluate(() => {
    const bouton = document.querySelector('dialog.fiche-modele .fenetre-pied .bouton-principal');
    bouton.click();
    bouton.click();
  });
  await libererEcritures(p, { max: 2 });
  juge.exige(await attendreFermee(p), `${casDouble} : la fiche se ferme`);
  const double = await lire(p);
  juge.exige(
    double.cartes.filter(c => c.nom === 'Transport').length === 1 &&
      (await arbreStocke(p)) === arbreDe({ ...DEPART, Transport: [] }),
    `${casDouble} : ${vu(double.cartes.map(c => c.nom))}, stocké ${await arbreStocke(p)}`,
  );
  await fermer(casDouble, lent);
}

async function essaiRenommerSupprimer() {
  const cas = 'renommer et supprimer';
  const ouvert = await ouvrirEtiquettes('telephone', { donnees: DONNEES_SANS_ORPHELIN });
  const { page } = ouvert;
  const depart = await lire(page);
  juge.exige(
    await nommer(page, commande('modifier-etiquette', idEtiquette(depart, 'Plage')), 'Plage et baignade'),
    `${cas} : fiche de Plage fermée`,
  );
  const renomme = await lire(page);
  juge.exige(
    vu(renomme.cartes[0].puces.map(p => p.nom)) === vu(['Randonnée', 'Camping', 'Plage et baignade']) &&
      renomme.recent === 'Plage et baignade',
    `${cas}, Plage renommée : ${vu(renomme.cartes[0])}`,
  );

  juge.exige(await supprimer(page, commande('modifier-etiquette', idEtiquette(depart, 'Pluie'))), `${cas} : Pluie`);
  const sansPluie = await lire(page);
  const attendu = { ...DEPART, Activités: ['Randonnée', 'Camping', 'Plage et baignade'], Climat: ['Chaud', 'Froid'] };
  juge.exige(
    arbreDesCartes(sansPluie) === arbreDe(attendu) && sansPluie.cartes[1].infos === infos(2, 3),
    `${cas}, Pluie supprimée : ${arbreDesCartes(sansPluie)}`,
  );
  juge.exige((await arbreStocke(page)) === arbreDe(attendu), `${cas} : stocké ${await arbreStocke(page)}`);

  juge.exige(await supprimer(page, commande('modifier-groupe', idGroupe(depart, 'Climat'))), `${cas} : Climat`);
  const sansClimat = await lire(page);
  delete attendu.Climat;
  juge.exige(
    arbreDesCartes(sansClimat) === arbreDe(attendu) &&
      sansClimat.cartes[1].infos === infos(3, 3) &&
      sansClimat.resume === `${compter('groupes', 2)} · ${compter('etiquettes', 6)}`,
    `${cas}, Climat supprimé : ${vu(sansClimat.cartes.map(c => [c.nom, c.infos]))}`,
  );
  juge.exige((await arbreStocke(page)) === arbreDe(attendu), `${cas} : stocké ${await arbreStocke(page)}`);
  await fermer(cas, ouvert);
}

// Review Focus 1 : des noms avec < & " restent du texte.
async function essaiNomsPieges() {
  const cas = 'noms piégés';
  const ouvert = await ouvrirEtiquettes('telephone', { donnees: DONNEES_PIEGE });
  const { page } = ouvert;
  const carte = (await lire(page)).cartes.at(-1);
  const puce = carte?.puces[0];
  juge.exige(
    carte?.nom === PIEGE.groupe &&
      carte.modifier === remplir(e.modifierGroupe, { nom: PIEGE.groupe }) &&
      puce?.nom === PIEGE.etiquette &&
      puce.libelle === remplir(e.modifierEtiquette, { nom: PIEGE.etiquette }),
    `${cas} : carte ${vu(carte)}`,
  );
  await page.click('#app [data-action="ranger"]');
  await calme(page);
  const ligne = (await lire(page)).rangement.at(-1);
  const sienne = ligne?.etiquettes[0];
  juge.exige(
    ligne?.nom === PIEGE.groupe &&
      ligne.monter === remplir(e.monter, { nom: PIEGE.groupe }) &&
      ligne.liste === remplir(e.listeEtiquettes, { nom: PIEGE.groupe }) &&
      sienne?.nom === PIEGE.etiquette &&
      sienne.monter === remplir(e.monter, { nom: PIEGE.etiquette }) &&
      sienne.descendre === remplir(e.descendre, { nom: PIEGE.etiquette }),
    `${cas} : rangement ${vu(ligne)}`,
  );
  await page.click('#app [data-action="terminer"]');
  await calme(page);
  const balises = await page.evaluate(
    () => document.querySelectorAll('#app main b b, #app main i, #app .puce *:not(.icone, .icone *)').length,
  );
  juge.exige(balises === 0, `${cas} : ${balises} balise(s) venue(s) des noms`);
  await fermer(cas, ouvert);
}

// Chaque format, chaque thème : Réglages, puis l'écran Étiquettes.
async function essaiFormat(format, theme) {
  const cas = `${format}, ${NOMS_THEME[theme]}`;
  const ouvert = await ouvrirEtiquettes(format, { theme });
  const { page } = ouvert;
  await page.mouse.move(0, 0);
  await calme(page);
  const vue = await lire(page);
  const colonnes = LARGES.has(format) ? 2 : 1;
  juge.exige(
    vue.colonnes === colonnes && vue.lignesEgales,
    `${cas} : ${vue.colonnes} colonne(s) au lieu de ${colonnes}, hauteurs égales ${vue.lignesEgales}`,
  );
  await verifierCommandes(page, juge, `${cas}, Étiquettes`);
  await page.screenshot({ path: join(CAPTURES, `etiquettes-${format}-${NOMS_THEME[theme]}.png`) });
  await page.click('#app a.lien-retour');
  await page.waitForFunction(() => document.querySelector('#app')?.dataset.ecran === 'reglages');
  await page.mouse.move(0, 0);
  await calme(page);
  await verifierCommandes(page, juge, `${cas}, Réglages`);
  await page.screenshot({ path: join(CAPTURES, `reglages-${format}-${NOMS_THEME[theme]}.png`) });
  // Les barres système simulées restent posées : les captures sont prises avant.
  await verifierBarres(page, juge, `${cas}, Réglages`);
  await page.click('#app a.reglage[href="#/etiquettes"]');
  await page.waitForFunction(() => document.querySelector('#app')?.dataset.ecran === 'etiquettes');
  await calme(page);
  await verifierBarres(page, juge, `${cas}, Étiquettes`);
  await fermer(cas, ouvert);
}

try {
  await mkdir(CAPTURES, { recursive: true });
  await essaiLecture();
  await essaiNouveauGroupe();
  await essaiRenommerSupprimer();
  await essaiNomsPieges();
  for (const theme of ['light', 'dark'])
    for (const format of Object.keys(TOUS_FORMATS)) await essaiFormat(format, theme);
} finally {
  await navigateur.close();
  await serveur.fermer();
}
juge.conclure(
  'Étiquettes',
  'lecture, touche retour, nouveau groupe et étiquette, double appui, renommer, supprimer, noms piégés ; 6 formats × 2 thèmes',
);
