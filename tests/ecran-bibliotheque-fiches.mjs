// Phase 5 (docs/PLAN.md) : la fiche d'une catégorie et le catalogue des pictos (maquette validée le
// 2026-10-25, docs/maquettes/bibliotheque/, états « fiche-categorie », « catalogue… »,
// « nouvelle-categorie »). Les fiches d'objet sont dans ecran-bibliotheque-objets.mjs, l'abandon et les
// pannes dans ecran-bibliotheque-abandon.mjs, les formats et captures dans
// ecran-bibliotheque-fiches-formats.mjs.
// - fiche de Camping : nom, pavé et « Camping », nuancier (Abricot coché), « Selon les étiquettes »,
//   Camping et Tente pressées, phrase « Proposée si l’une de ces étiquettes est cochée : Camping, Tente. » ;
// - catalogue : 80 tuiles en dix thèmes, la courante pressée ; « tente », « soleil », « xyz » ; la
//   hauteur de la fenêtre ne bouge pas pendant la recherche ; une tuile touchée referme le catalogue
//   et change le pavé de la fiche ;
// - nouvelle catégorie « Courses » en Lilas, liée à Plage : en dernier, dépliée (une colonne) ou
//   choisie (deux panneaux), éclairée ; stockage à jour ; « Selon les étiquettes » sans étiquette :
//   message, rien d'écrit ;
// - rotation (1280 × 800 → 800 × 1280) fiche ouverte : la fiche et sa saisie restent.
import { chromium } from 'playwright';
import { calme } from './outils/attente.mjs';
import { demarrerServeur } from './outils/serveur.mjs';
import {
  fermerEssai,
  fr,
  lire,
  ouvrirBibliotheque as ouvrirLaBibliotheque,
  remplir,
  vu,
} from './outils/bibliotheque.mjs';
import {
  CATALOGUE,
  attendreFermee,
  attendreOuverte,
  bibliothequeStockee,
  chercherPicto,
  eclaire,
  enregistrer,
  idEtiquette,
  lireCatalogue,
  lireFiche,
  m,
  nomPicto,
  ouvrirFicheCategorie,
  ouvrirFicheObjet,
  ouvrirNouvelleCategorie,
  saisir,
  segment,
  toucher,
} from './outils/fiches.mjs';
import { creerJuge } from './outils/page.mjs';

const juge = creerJuge();
const serveur = await demarrerServeur();
const navigateur = await chromium.launch();
const ouvrirBibliotheque = (format, options) => ouvrirLaBibliotheque(navigateur, serveur.url, format, options);
const fermer = (cas, ouvert) => fermerEssai(juge, cas, ouvert);
const c = m.categorie;

// La fiche de Camping, puis son catalogue des pictos.
async function essaiFicheCategorie() {
  const cas = 'fiche de Camping';
  const ouvert = await ouvrirBibliotheque('telephone');
  const { page } = ouvert;
  juge.exige(await ouvrirFicheCategorie(page, 'Camping'), `${cas} : la fiche ne s'ouvre pas`);
  const fiche = await lireFiche(page);
  juge.exige(
    fiche?.titre === 'Camping' &&
      fiche.sousTitre === remplir(fr.bibliotheque.objets.other, { n: 3 }) &&
      fiche.bouton === m.enregistrer &&
      fiche.nom === 'Camping' &&
      fiche.pave === 'abricot' &&
      fiche.picto === nomPicto('tent') &&
      fiche.nuancier === 8 &&
      vu(fiche.couleurs) === vu(['abricot']) &&
      vu(fiche.choix) === vu([m.selonEtiquettes]) &&
      vu(fiche.etiquettes) === vu(['Camping', 'Tente']) &&
      fiche.aide === remplir(c.aideEtiquettes, { etiquettes: 'Camping, Tente' }) &&
      fiche.erreurs.length === 0,
    `${cas} : ${vu(fiche)}`,
  );
  const nuancier = await page.$$eval('dialog.fiche-modele .teinte', b => b.map(x => x.getAttribute('aria-label')));
  juge.exige(
    vu(nuancier) ===
      vu(['corail', 'tournesol', 'abricot', 'pomme', 'lagon', 'ciel', 'framboise', 'lilas'].map(x => fr.couleurs?.[x])),
    `${cas} : noms des couleurs ${vu(nuancier)}`,
  );

  // Le catalogue : 80 pictos en dix thèmes, Camping (tent) pressé.
  await toucher(page, '[data-action="catalogue"]');
  juge.exige(await attendreOuverte(page, CATALOGUE), `${cas} : le catalogue ne s'ouvre pas`);
  const tout = await lireCatalogue(page);
  juge.exige(
    tout?.titre === fr.catalogue.titre &&
      tout.tuiles.length === 80 &&
      vu(tout.themes) === vu(Object.values(fr.catalogue.themes)) &&
      vu(tout.pressee) === vu(['tent']) &&
      tout.compte === remplir(fr.catalogue.compte.other, { n: 80 }),
    `${cas} : catalogue ${vu({ ...tout, tuiles: tout?.tuiles.length, noms: undefined })}`,
  );
  const tente = await chercherPicto(page, 'tente');
  juge.exige(
    vu(tente?.tuiles) === vu(['tent']) &&
      tente.compte === remplir(fr.catalogue.trouves.one, { n: 1, mot: 'tente' }) &&
      tente.hauteur === tout.hauteur,
    `${cas} : « tente » ${vu(tente)} (hauteur d'abord ${tout?.hauteur})`,
  );
  const soleil = await chercherPicto(page, 'soleil');
  juge.exige(
    vu(soleil?.noms.toSorted()) === vu(['Lunettes de soleil', 'Soleil']) && soleil.hauteur === tout.hauteur,
    `${cas} : « soleil » ${vu(soleil)}`,
  );
  const rien = await chercherPicto(page, 'xyz');
  juge.exige(
    rien?.tuiles.length === 0 &&
      rien.vide === remplir(fr.catalogue.aucun, { mot: 'xyz' }) &&
      rien.hauteur === tout.hauteur,
    `${cas} : « xyz » ${vu(rien)}`,
  );
  await chercherPicto(page, 'soleil');
  await page.click(`${CATALOGUE} .tuile[data-picto="sun"]`);
  juge.exige(await attendreFermee(page, CATALOGUE), `${cas} : le catalogue reste ouvert après le choix`);
  const apres = await lireFiche(page);
  juge.exige(
    apres?.picto === nomPicto('sun') && apres.pave === 'abricot' && apres.nom === 'Camping',
    `${cas} : picto choisi ${vu(apres)}`,
  );
  // Rien n'est écrit avant « Enregistrer ».
  const stockee = await bibliothequeStockee(page);
  juge.exige(stockee.categories.find(x => x.nom === 'Camping')?.icone === 'tent', `${cas} : écrit sans Enregistrer`);
  await enregistrer(page);
  juge.exige(await attendreFermee(page), `${cas} : la fiche reste ouverte après Enregistrer`);
  const camping = (await bibliothequeStockee(page)).categories.find(x => x.nom === 'Camping');
  juge.exige(camping?.icone === 'sun' && camping.couleur === 'abricot', `${cas} : enregistrée ${vu(camping)}`);
  juge.exige((await eclaire(page)) === 'Camping', `${cas} : carte éclairée ${vu(await eclaire(page))}`);
  await fermer(cas, ouvert);
}

// Nouvelle catégorie : refusée sans étiquette, puis « Courses » en Lilas, liée à Plage.
async function essaiNouvelleCategorie(format) {
  const cas = `nouvelle catégorie (${format})`;
  const ouvert = await ouvrirBibliotheque(format);
  const { page } = ouvert;
  juge.exige(await ouvrirNouvelleCategorie(page), `${cas} : la fiche ne s'ouvre pas`);
  const neuve = await lireFiche(page);
  juge.exige(
    neuve?.titre === c.nouvelle &&
      neuve.bouton === c.creer &&
      neuve.nom === '' &&
      neuve.pave === 'corail' &&
      neuve.picto === nomPicto('suitcase-rolling') &&
      vu(neuve.choix) === vu([m.toujoursIncluse]) &&
      neuve.aide === c.aideToujours,
    `${cas} : fiche neuve ${vu(neuve)}`,
  );
  await saisir(page, '#f-nom', 'Courses');
  await segment(page, m.selonEtiquettes);
  const sans = await lireFiche(page);
  juge.exige(sans?.aide === c.choisirEtiquettes && sans.erreurs.length === 0, `${cas} : sans étiquette ${vu(sans)}`);
  await enregistrer(page);
  const refus = await lireFiche(page);
  juge.exige(
    vu(refus?.erreurs) === vu([c.erreurs.etiquettesManquantes]) &&
      (await bibliothequeStockee(page)).categories.length === 5,
    `${cas} : refus sans étiquette ${vu(refus)}`,
  );
  await toucher(page, '.teinte[data-valeur="lilas"]');
  await toucher(page, '.puce-etiquette:has-text("Plage")');
  const prete = await lireFiche(page);
  juge.exige(
    vu(prete?.couleurs) === vu(['lilas']) &&
      prete.pave === 'lilas' &&
      vu(prete.etiquettes) === vu(['Plage']) &&
      prete.erreurs.length === 0,
    `${cas} : Lilas et Plage ${vu(prete)}`,
  );
  await enregistrer(page);
  juge.exige(await attendreFermee(page), `${cas} : la fiche reste ouverte`);
  const stockee = await bibliothequeStockee(page);
  const courses = stockee.categories.find(x => x.nom === 'Courses');
  juge.exige(
    stockee.categories.length === 6 &&
      courses?.couleur === 'lilas' &&
      courses.icone === 'suitcase-rolling' &&
      !courses.toujoursIncluse &&
      vu(courses.etiquettes) === vu([idEtiquette(stockee, 'Plage')]) &&
      courses.ordre === Math.max(...stockee.categories.map(x => x.ordre)),
    `${cas} : stockage ${vu(courses)}`,
  );
  const vue = await lire(page);
  if (vue.panneaux)
    juge.exige(
      vue.choix.at(-1) === 'Courses' && vue.choisie === 'Courses' && vue.detail === 'Courses',
      `${cas} : choisie ${vu({ choix: vue.choix, choisie: vue.choisie })}`,
    );
  else
    juge.exige(
      vue.cartes.at(-1)?.nom === 'Courses' && vue.cartes.at(-1).ouverte === 'true',
      `${cas} : en dernier, dépliée ${vu(vue.cartes.at(-1))}`,
    );
  juge.exige((await eclaire(page)) === 'Courses', `${cas} : éclairée ${vu(await eclaire(page))}`);
  await fermer(cas, ouvert);
}

// Tablette tournée, fiche ouverte : elle reste, avec sa saisie.
async function essaiRotation() {
  const cas = 'rotation';
  const ouvert = await ouvrirBibliotheque('tablette-paysage');
  const { page } = ouvert;
  await ouvrirFicheObjet(page, 'Alimentation', 'Repas');
  await toucher(page, '[data-pas="valeur"][data-sens="1"]');
  await saisir(page, '#f-nom', 'Repas chauds');
  await page.setViewportSize({ width: 800, height: 1280 });
  await calme(page);
  const fiche = await lireFiche(page);
  const vue = await lire(page);
  juge.exige(
    fiche?.titre === 'Repas' && fiche.nom === 'Repas chauds' && fiche.valeur === '3' && !vue.panneaux,
    `${cas} : ${vu({ fiche, panneaux: vue.panneaux })}`,
  );
  await fermer(cas, ouvert);
}

try {
  await essaiFicheCategorie();
  await essaiNouvelleCategorie('telephone');
  await essaiNouvelleCategorie('tablette-paysage');
  await essaiRotation();
} finally {
  await navigateur.close();
  await serveur.fermer();
}
juge.conclure('Fiches de catégorie', 'Camping, catalogue, nouvelle catégorie (une colonne, deux panneaux), rotation');
