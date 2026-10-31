// Relecture finale de la phase 11 : « Annuler » d'une suppression de voyage touché pendant que Mes voyages
// n'est qu'un fond, ou qu'une question est ouverte par-dessus (src/ecrans/voyages.js, voyage-retabli).
// - sur la tablette en paysage (1280 × 800, au doigt), 2 thèmes : un voyage supprimé depuis sa carte, puis
//   « Nouveau voyage » ouvert en fenêtre au-dessus de Mes voyages et un nom saisi ; le bandeau passe dans
//   la fenêtre ; « Annuler » rend le voyage, et la fenêtre reste ouverte avec sa saisie, à son adresse ;
//   une fois revenu à Mes voyages (« Abandonner »), la carte du voyage rendu est là ;
// - la même chose avec « Refaire ce voyage » ouvert depuis une autre carte ;
// - une question de suppression ouverte sur Mes voyages : « Annuler » rend le voyage sans fermer la
//   question ; « Garder », et la carte du voyage rendu revient ;
// - la dernière relecture l'emporte : la relecture d'après la suppression, lente, qui aboutit après
//   « Annuler » (sans le voyage rendu), ne cache pas la carte que la relecture d'« Annuler » remet.
// Captures : la fenêtre « Nouveau voyage » restée ouverte après « Annuler », 2 thèmes (captures-travail/).
import { mkdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { chromium } from 'playwright';
import { attendreQue, calme } from './outils/attente.mjs';
import { lireBandeau } from './outils/annulation.mjs';
import { demarrerServeur } from './outils/serveur.mjs';
import {
  CAPTURES,
  FORMATS,
  NOMS_THEME,
  RACINE,
  attendreEcran,
  creerJuge,
  ecrireStockage,
  lireStockage,
  ouvrir,
} from './outils/page.mjs';
import { DONNEES } from './outils/voyage-essai.mjs';

const fr = JSON.parse(await readFile(join(RACINE, 'src/i18n/fr.json'), 'utf8'));
const QUESTION = 'dialog[role="alertdialog"]';
const BANDEAU = '.bandeau-annuler';
const vu = e => JSON.stringify(e);
const carte = id => `li.carte-avec-actions:has(> a.carte-voyage[href="#/voyage/${id}"])`;

const juge = creerJuge();
const serveur = await demarrerServeur();
const navigateur = await chromium.launch();

async function ouvrirAccueil(theme = 'light') {
  const ouvert = await ouvrir(navigateur, serveur.url, {
    taille: FORMATS['tablette-paysage'],
    theme,
    donnees: DONNEES,
    adresse: '#/voyages',
  });
  // Une commande attendue qui ne vient pas fait buter l'essai vite, sans attendre 30 s.
  ouvert.page.setDefaultTimeout(5000);
  await attendreEcran(ouvert.page, 'voyages');
  return ouvert;
}

async function fermer(cas, { contexte, erreurs, sorties }) {
  juge.exige(erreurs.length === 0, `${cas} : erreurs dans la page : ${erreurs.join(' | ')}`);
  juge.exige(sorties.length === 0, `${cas} : requêtes hors de l’appli : ${sorties.join(', ')}`);
  await contexte.close();
}

// Le menu « ⋮ » de la carte, puis l'une de ses lignes.
async function choisirDansLeMenu(page, id, cle) {
  await page.click(`${carte(id)} > .menu-voyage-bouton`);
  await attendreQue(page, () => document.querySelector('.menu-voyage:popover-open') !== null);
  await calme(page);
  await page.click(`.menu-voyage:popover-open [data-menu="${cle}"]`);
}

async function demanderSuppression(page, id) {
  await choisirDansLeMenu(page, id, 'supprimer');
  await attendreQue(page, q => document.querySelector(`${q}[open]`) !== null, QUESTION);
  await calme(page);
}

async function repondre(page, libelle) {
  await page.click(`${QUESTION} .fenetre-pied button:text-is("${libelle}")`);
  await attendreQue(page, q => !document.querySelector(`${q}[open]`), QUESTION);
}

// Supprime ce voyage depuis sa carte, jusqu'au bandeau « Annuler ».
async function supprimer(page, id) {
  await demanderSuppression(page, id);
  await repondre(page, fr.suppression.supprimer);
  await attendreQue(page, b => document.querySelector(b)?.matches(':popover-open') ?? false, BANDEAU);
  await calme(page);
}

// « Annuler » du bandeau, puis l'attente du voyage rendu dans le stockage ; rend s'il l'est.
async function annuler(page, id) {
  await page.click(`${BANDEAU} button`);
  const rendu = await attendreQue(
    page,
    v => JSON.parse(localStorage.getItem('baluchon-essai')).voyages.some(x => x.id === v),
    id,
  );
  await calme(page);
  return rendu;
}

// Ce que montre l'assistant ouvert en fenêtre au-dessus de Mes voyages.
const lireAssistant = page =>
  page.evaluate(() => ({
    fenetre: Boolean(document.querySelector('dialog.assistant[open]')),
    nom: document.querySelector('dialog.assistant #nom')?.value ?? null,
    adresse: location.hash,
    ecran: document.querySelector('#app')?.dataset.ecran,
  }));

// Ferme l'assistant (Échap ; avec une saisie, « Abandonner »), jusqu'à Mes voyages.
async function quitterAssistant(page) {
  await page.keyboard.press('Escape');
  const question = await attendreQue(page, q => document.querySelector(`${q}[open]`) !== null, QUESTION, {
    max: 1000,
  });
  if (question) await repondre(page, fr.nouveauVoyage.abandon.abandonner);
  await attendreEcran(page, 'voyages');
}

const carteLa = (page, id) => attendreQue(page, s => document.querySelector(s) !== null, carte(id));

try {
  await mkdir(CAPTURES, { recursive: true });

  // 1. « Nouveau voyage » (2 thèmes), puis « Refaire ce voyage » d'une autre carte, en fenêtre au-dessus de
  // Mes voyages.
  const ouvertures = [
    ...['light', 'dark'].map(theme => ({
      cas: `Nouveau voyage, ${NOMS_THEME[theme]}`,
      theme,
      adresse: '#/nouveau-voyage',
      ouvrirAssistant: page => page.click('.bouton-flottant'),
      ecran: 'nouveau-voyage',
      capture: `voyages-annuler-sous-assistant-tablette-paysage-${NOMS_THEME[theme]}.png`,
    })),
    {
      cas: 'Refaire ce voyage',
      theme: 'light',
      adresse: '#/voyages/refaire/v1',
      ouvrirAssistant: page => choisirDansLeMenu(page, 'v1', 'refaire'),
      ecran: 'refaire-voyage',
    },
  ];
  for (const { cas, theme, adresse, ouvrirAssistant, ecran, capture } of ouvertures) {
    const ouvert = await ouvrirAccueil(theme);
    const { page } = ouvert;
    await supprimer(page, 'v2');
    await ouvrirAssistant(page);
    await attendreEcran(page, ecran);
    await page.fill('#nom', 'Saisie gardée');
    await calme(page);
    const bandeau = await lireBandeau(page);
    juge.exige(bandeau?.hote === 'fenetre', `${cas} : le bandeau n’est pas dans la fenêtre ${vu(bandeau)}`);
    const rendu = await annuler(page, 'v2');
    const apres = await lireAssistant(page);
    juge.exige(rendu, `${cas} : « Annuler » n’a pas rendu le voyage`);
    juge.exige(
      vu(apres) === vu({ fenetre: true, nom: 'Saisie gardée', adresse, ecran }),
      `${cas} : après « Annuler », ${vu(apres)}`,
    );
    if (capture) await page.screenshot({ path: join(CAPTURES, capture) });
    // La fenêtre effacée, il n'y a plus d'assistant à quitter.
    if (apres.fenetre) await quitterAssistant(page);
    else await page.click('a[href="#/voyages"]').catch(() => null);
    juge.exige(await carteLa(page, 'v2'), `${cas} : revenu à Mes voyages, la carte du voyage rendu manque`);
    await fermer(cas, ouvert);
  }

  // 2. Une question de suppression ouverte sur Mes voyages : « Annuler » ne la ferme pas ; « Garder », et la
  // carte rendue revient.
  {
    const cas = 'question ouverte';
    const ouvert = await ouvrirAccueil();
    const { page } = ouvert;
    await supprimer(page, 'v2');
    await demanderSuppression(page, 'v1');
    const bandeau = await lireBandeau(page);
    juge.exige(bandeau?.hote === 'question', `${cas} : le bandeau n’est pas dans la question ${vu(bandeau)}`);
    const rendu = await annuler(page, 'v2');
    const question = await page.evaluate(
      q => document.querySelector(`${q}[open]`)?.querySelector('h2').textContent ?? null,
      QUESTION,
    );
    juge.exige(rendu, `${cas} : « Annuler » n’a pas rendu le voyage`);
    juge.exige(
      question === fr.suppressionVoyage.titre.replace('{nom}', DONNEES.voyages[0].nom),
      `${cas} : après « Annuler », la question est ${vu(question)}`,
    );
    if (question) await repondre(page, fr.suppression.garder);
    juge.exige(await carteLa(page, 'v2'), `${cas} : « Garder », la carte du voyage rendu manque`);
    juge.exige(await carteLa(page, 'v1'), `${cas} : « Garder », la carte du voyage gardé manque`);
    await fermer(cas, ouvert);
  }

  // 3. La dernière relecture l'emporte : la liste des voyages, lente, tient la relecture d'après la
  // suppression (r1, sans le voyage) et celle d'« Annuler » (r2, avec) ; r1 aboutit la première.
  {
    const cas = 'relectures croisées';
    const ouvert = await ouvrirAccueil();
    const { page } = ouvert;
    await ecrireStockage(page, { ...(await lireStockage(page)), lenteurs: ['listerVoyages'] });
    await demanderSuppression(page, 'v2');
    await repondre(page, fr.suppression.supprimer);
    const r1 = await attendreQue(page, () => {
      if (!window.debloquerStockage) return false;
      window.r1 = window.debloquerStockage;
      delete window.debloquerStockage;
      return true;
    });
    await attendreQue(page, b => document.querySelector(b)?.matches(':popover-open') ?? false, BANDEAU);
    await page.click(`${BANDEAU} button`);
    const r2 = await attendreQue(page, () => Boolean(window.debloquerStockage));
    juge.exige(r1 && r2, `${cas} : les deux relectures ne sont pas tenues ${vu({ r1, r2 })}`);
    await ecrireStockage(page, { ...(await lireStockage(page)), lenteurs: [] });
    await page.evaluate(() => window.r1());
    await calme(page);
    await page.evaluate(() => window.debloquerStockage());
    juge.exige(await carteLa(page, 'v2'), `${cas} : la carte du voyage rendu manque`);
    juge.exige(
      (await page.evaluate(s => document.activeElement === document.querySelector(`${s} > a`), carte('v2'))) === true,
      `${cas} : le focus n’est pas sur la carte rendue`,
    );
    await fermer(cas, ouvert);
  }
} finally {
  await navigateur.close();
  await serveur.fermer();
}
juge.conclure(
  '« Annuler » sous une fenêtre de Mes voyages',
  'Nouveau voyage (2 thèmes) et Refaire en fenêtre, question ouverte, relectures croisées',
);
