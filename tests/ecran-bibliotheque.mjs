// Phase 5 (docs/PLAN.md) : l'écran Bibliothèque (maquette validée le 2026-10-25,
// docs/maquettes/bibliotheque/), ouvert par Menu → Réglages → Bibliothèque sur la bibliothèque de
// départ installée par l'appli. Le rangement des catégories est dans ecran-bibliotheque-rangement.mjs.
// - lecture : titre, « 5 catégories · 17 objets », cinq cartes repliées dans l'ordre de la
//   bibliothèque ; sous le nom, « N objets · Toujours incluse », ou « N objets » et les étiquettes en
//   puces (Camping) ; Alimentation dépliée : ses objets par nom, leur règle, « consommable », ⓘ, puis
//   « Ajouter un objet » ;
// - deux panneaux sur la tablette en paysage (choix à gauche, la première choisie, ses objets à
//   droite ; toucher une autre la montre), une colonne en portrait ;
// - noms avec < & " : rendus en texte sur la carte, ses puces, ses objets, les libellés ▲ ▼ ;
// Téléphones 360 × 640 et 640 × 360, téléphone, tablette (portrait, paysage) et ordinateur, en clair
// et en sombre : cibles de 44 px, rien sous les barres système ; captures bibliotheque-… et ranger-…
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { chromium } from 'playwright';
import { calme } from './outils/attente.mjs';
import { demarrerServeur } from './outils/serveur.mjs';
import { construireBibliotheque } from '../src/modele/bibliotheque.js';
import {
  DONNEES,
  DEPART,
  TOUS_FORMATS,
  commande,
  compter,
  fermerEssai,
  fr,
  idDe,
  lire,
  ouvrirBibliotheque as ouvrirLaBibliotheque,
  remplir,
  vu,
} from './outils/bibliotheque.mjs';
import { CAPTURES, NOMS_THEME, creerJuge, verifierBarres, verifierCommandes } from './outils/page.mjs';

const LARGES = new Set(['tablette-paysage', 'ordinateur']);

// Une catégorie, son étiquette et son objet aux noms piégés (Review Focus 1), ajoutés à la
// bibliothèque de départ.
const PIEGE = { categorie: '<b>Été & "co"</b>', etiquette: '<i>Pluie & "x"</i>', objet: '<u>Sac & "y"</u>' };
let numero = 0;
const base = construireBibliotheque(fr.bibliothequeDeDepart, { nouvelId: () => `id-${++numero}`, maintenant: 'x' });
const DONNEES_PIEGE = {
  ...DONNEES,
  meta: { bibliothequeInstallee: true, langueBibliotheque: 'fr' },
  bibliotheque: {
    ...base,
    etiquettes: [
      ...base.etiquettes,
      { id: 'e-piege', groupeId: base.groupes[0].id, nom: PIEGE.etiquette, ordre: 9, modifieLe: 'x' },
    ],
    categories: [
      ...base.categories,
      {
        id: 'c-piege',
        nom: PIEGE.categorie,
        icone: 'tent',
        couleur: 'lilas',
        ordre: 5,
        toujoursIncluse: false,
        modifieLe: 'x',
        etiquettes: ['e-piege'],
      },
    ],
    objets: [
      ...base.objets,
      {
        id: 'o-piege',
        categorieId: 'c-piege',
        nom: PIEGE.objet,
        regle: 'fixe',
        valeur: 1,
        plafond: null,
        parPersonne: true,
        consommable: false,
        toujoursInclus: false,
        note: '',
        modifieLe: 'x',
        etiquettes: ['e-piege'],
      },
    ],
  },
};

const b = fr.bibliotheque;
const juge = creerJuge();
const serveur = await demarrerServeur();
const navigateur = await chromium.launch();
const ouvrirBibliotheque = (format, options) => ouvrirLaBibliotheque(navigateur, serveur.url, format, options);
const fermer = (cas, ouvert) => fermerEssai(juge, cas, ouvert);

// La bibliothèque de départ, repliée puis Alimentation dépliée.
async function essaiLecture() {
  const cas = 'lecture';
  const ouvert = await ouvrirBibliotheque();
  const { page } = ouvert;
  const vue = await lire(page);
  const camping = vue.cartes.find(c => c.nom === 'Camping');
  const vetements = vue.cartes.find(c => c.nom === 'Vêtements');
  juge.exige(
    vue.titre === b.titre &&
      vue.resume === `${compter('categories', 5)} · ${compter('objets', 17)}` &&
      vue.retour === fr.reglages.titre &&
      vue.menu &&
      vue.ranger &&
      vue.nouvelle &&
      !vue.panneaux,
    `${cas} : en-tête ${vu({ ...vue, cartes: undefined })}`,
  );
  juge.exige(vu(vue.cartes.map(c => c.nom)) === vu(DEPART), `${cas} : ordre ${vu(vue.cartes.map(c => c.nom))}`);
  juge.exige(
    vue.cartes.every(c => c.ouverte === 'false' && c.objets.length === 0),
    `${cas} : cartes repliées ${vu(vue.cartes)}`,
  );
  juge.exige(
    camping?.inclusion === compter('objets', 3) && vu(camping.puces) === vu(['Camping', 'Tente']),
    `${cas} : Camping ${vu(camping)}`,
  );
  juge.exige(
    vetements?.inclusion === `${compter('objets', 7)} · ${b.toujoursIncluse}` && vetements.puces.length === 0,
    `${cas} : Vêtements ${vu(vetements)}`,
  );
  juge.exige(
    vetements?.modifier === remplir(b.modifierCategorie, { nom: 'Vêtements' }),
    `${cas} : bouton Modifier ${vu(vetements?.modifier)}`,
  );

  const alimentation = idDe(vue, 'Alimentation');
  await page.click(commande('accordeon', alimentation));
  await calme(page);
  const ouverte = (await lire(page)).cartes.find(c => c.nom === 'Alimentation');
  const [gourde, repas] = ouverte?.objets ?? [];
  juge.exige(
    ouverte?.ouverte === 'true' &&
      vu(ouverte.objets.map(o => o.nom)) === vu(['Gourde', 'Repas']) &&
      ouverte.objets.every(o => o.action === 'modifier-objet'),
    `${cas} : Alimentation ${vu(ouverte)}`,
  );
  juge.exige(
    vu(repas?.sous) === vu([fr.regle.parJourParPersonne.replace('{valeur}', 2), b.consommable]) &&
      repas.note &&
      vu(gourde?.sous) === vu([fr.regle.fixeParPersonne.replace('{valeur}', 1)]) &&
      !gourde.note,
    `${cas} : lignes ${vu(ouverte?.objets)}`,
  );
  juge.exige(
    ouverte?.derniere?.texte === b.ajouterObjet &&
      ouverte.derniere.action === 'nouvel-objet' &&
      ouverte.derniere.id === alimentation,
    `${cas} : dernière ligne ${vu(ouverte?.derniere)}`,
  );
  await fermer(cas, ouvert);
}

// Deux panneaux à 1280 × 800, une colonne à 800 × 1280.
async function essaiDispositions() {
  const cas = 'deux panneaux';
  const large = await ouvrirBibliotheque('tablette-paysage');
  const vue = await lire(large.page);
  juge.exige(
    vue.panneaux &&
      vue.cartes.length === 0 &&
      vu(vue.choix) === vu(DEPART) &&
      vue.choisie === 'Vêtements' &&
      vue.choixAGauche &&
      vue.detail === 'Vêtements' &&
      vu(vue.detailObjets) === vu(vue.detailObjets.toSorted((x, y) => x.localeCompare(y, 'fr'))) &&
      vue.detailObjets.length === 7,
    `${cas} : ${vu(vue)}`,
  );
  await large.page.click('.choix:has-text("Alimentation")');
  await calme(large.page);
  const choisie = await lire(large.page);
  juge.exige(
    choisie.choisie === 'Alimentation' &&
      choisie.detail === 'Alimentation' &&
      vu(choisie.detailObjets) === vu(['Gourde', 'Repas']),
    `${cas}, Alimentation touchée : ${vu(choisie)}`,
  );
  await fermer(cas, large);

  const etroit = await ouvrirBibliotheque('tablette-portrait');
  const colonne = await lire(etroit.page);
  juge.exige(
    !colonne.panneaux && colonne.cartes.length === 5 && colonne.choix.length === 0,
    `une colonne en portrait : ${vu(colonne)}`,
  );
  await fermer('une colonne', etroit);
}

// Review Focus 1 : des noms avec < & " restent du texte.
async function essaiNomsPieges() {
  const cas = 'noms piégés';
  const ouvert = await ouvrirBibliotheque('telephone', { donnees: DONNEES_PIEGE });
  const { page } = ouvert;
  const vue = await lire(page);
  const carte = vue.cartes.find(c => c.id === 'c-piege');
  juge.exige(
    vue.resume === `${compter('categories', 6)} · ${compter('objets', 18)}` &&
      carte?.nom === PIEGE.categorie &&
      vu(carte.puces) === vu([PIEGE.etiquette]) &&
      carte.modifier === remplir(b.modifierCategorie, { nom: PIEGE.categorie }),
    `${cas} : carte ${vu(carte)}`,
  );
  await page.click(commande('accordeon', 'c-piege'));
  await calme(page);
  const ouverte = (await lire(page)).cartes.find(c => c.id === 'c-piege');
  juge.exige(
    ouverte?.objets[0]?.nom === PIEGE.objet && vu(ouverte.objets[0].puces) === vu([PIEGE.etiquette]),
    `${cas} : objet ${vu(ouverte?.objets)}`,
  );
  await page.click('[data-action="ranger"]');
  await calme(page);
  const ligne = (await lire(page)).rangement.at(-1);
  juge.exige(
    ligne?.nom === PIEGE.categorie &&
      ligne.monter === remplir(b.monter, { nom: PIEGE.categorie }) &&
      ligne.descendre === remplir(b.descendre, { nom: PIEGE.categorie }),
    `${cas} : rangement ${vu(ligne)}`,
  );
  const balises = await page.evaluate(
    () => document.querySelectorAll('#app b b, #app i, #app u, #app .puces-mini span *').length,
  );
  juge.exige(balises === 0, `${cas} : ${balises} balise(s) venue(s) des noms`);
  await fermer(cas, ouvert);
}

// Chaque format, chaque thème : la Bibliothèque (Alimentation ouverte ou choisie) et le rangement.
async function essaiFormat(format, theme) {
  const cas = `${format}, ${NOMS_THEME[theme]}`;
  const ouvert = await ouvrirBibliotheque(format, { theme });
  const { page } = ouvert;
  const alimentation = idDe(await lire(page), 'Alimentation');
  if (LARGES.has(format)) await page.click('.choix:has-text("Alimentation")');
  else await page.click(commande('accordeon', alimentation));
  await page.mouse.move(0, 0);
  await calme(page);
  const vue = await lire(page);
  juge.exige(vue.panneaux === LARGES.has(format), `${cas} : disposition ${vu(vue.panneaux)}`);
  await verifierCommandes(page, juge, `${cas}, Bibliothèque`);
  await page.screenshot({ path: join(CAPTURES, `bibliotheque-${format}-${NOMS_THEME[theme]}.png`) });
  await page.click('[data-action="ranger"]');
  await page.mouse.move(0, 0);
  await calme(page);
  await verifierCommandes(page, juge, `${cas}, rangement`);
  await page.screenshot({ path: join(CAPTURES, `ranger-${format}-${NOMS_THEME[theme]}.png`) });
  // Les barres système simulées restent posées : les captures sont prises avant.
  await verifierBarres(page, juge, `${cas}, rangement`);
  await page.click('[data-action="terminer"]');
  await calme(page);
  await verifierBarres(page, juge, `${cas}, Bibliothèque`);
  await fermer(cas, ouvert);
}

try {
  await mkdir(CAPTURES, { recursive: true });
  await essaiLecture();
  await essaiDispositions();
  await essaiNomsPieges();
  for (const theme of ['light', 'dark'])
    for (const format of Object.keys(TOUS_FORMATS)) await essaiFormat(format, theme);
} finally {
  await navigateur.close();
  await serveur.fermer();
}
juge.conclure('Bibliothèque', 'lecture, deux panneaux, noms piégés ; 6 formats × 2 thèmes, captures');
