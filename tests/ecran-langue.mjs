// Phase 13 (docs/superpowers/specs/2026-11-01-phase-13-bibliotheque-traduisible-design.md, « Langue et
// traduction ») : la langue de l'appareil, jouée avec la langue d'essai « eo » (tests/langues/eo.json, écrite
// par tests/outils/langue-essai.mjs : le français, chaque texte précédé de « ⟦eo⟧ »).
// - Appareil en « eo » : le titre de l'accueil et les entrées du menu commencent par ⟦eo⟧ ; au premier
//   lancement, la bibliothèque installée est en « eo » (noms de catégories et d'objets marqués).
// - Même stockage rouvert avec un appareil en « fr-FR » : l'interface est en français, la bibliothèque reste
//   en « eo » (elle appartient à l'utilisateur, critère 5).
// - Appareil en « de-DE » (aucune traduction) : tout est en français, bibliothèque comprise (critère 4).
// - Aucune requête hors de l'appli, aucune erreur dans la page.
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { chromium } from 'playwright';
import { DEPART } from '../src/modele/depart/index.js';
import { ecrireLangueEssai, MARQUE_ESSAI } from './outils/langue-essai.mjs';
import { demarrerServeur } from './outils/serveur.mjs';
import { RACINE, creerJuge, lireStockage, ouvrir } from './outils/page.mjs';
import { attendreQue } from './outils/attente.mjs';

const fr = JSON.parse(await readFile(join(RACINE, 'src/i18n/fr.json'), 'utf8'));
const TAILLE = { width: 393, height: 873 };
const juge = creerJuge();
await ecrireLangueEssai();
const serveur = await demarrerServeur();
const navigateur = await chromium.launch();

// Ce que l'écran montre : le titre de l'accueil et les entrées du menu ouvert.
async function lireAccueil(page) {
  await attendreQue(page, () => document.querySelector('#app h1')?.textContent.trim());
  const titre = await page.locator('#app h1').first().textContent();
  await page.click('[data-action="menu"]');
  await attendreQue(page, () => document.querySelector('dialog.tiroir[open] .tiroir-lien') !== null);
  const entrees = await page.$$eval('dialog.tiroir[open] .tiroir-lien', liens => liens.map(a => a.textContent.trim()));
  return { titre: titre.trim(), entrees };
}

const nomsDeCategories = (stocke, langue) =>
  stocke.bibliotheque.categories
    .map(c => c.nom)
    .sort()
    .join() ===
  DEPART.categories
    .map(c => langue.depart.categories[c.cle])
    .sort()
    .join();

async function jouer(cas, locale, donnees, jugement) {
  const { contexte, page, sorties, erreurs } = await ouvrir(navigateur, serveur.url, {
    taille: TAILLE,
    locale,
    donnees,
  });
  const accueil = await lireAccueil(page);
  const stocke = await lireStockage(page);
  await jugement(accueil, stocke);
  juge.exige(sorties.length === 0, `${cas} : requêtes hors de l’appli : ${sorties.join(', ')}`);
  juge.exige(erreurs.length === 0, `${cas} : erreurs dans la page : ${erreurs.join(' | ')}`);
  await contexte.close();
  return stocke;
}

const marque = texte => texte.startsWith(MARQUE_ESSAI);
const eo = JSON.parse(await readFile(join(RACINE, 'tests/langues/eo.json'), 'utf8'));

const stockeEo = await jouer('eo', 'eo', undefined, (accueil, stocke) => {
  juge.exige(marque(accueil.titre), `eo : titre « ${accueil.titre} » sans la marque`);
  juge.exige(
    accueil.entrees.length > 0 && accueil.entrees.every(marque),
    `eo : menu « ${accueil.entrees.join(' | ')} » sans la marque`,
  );
  juge.exige(
    stocke.meta?.langueBibliotheque === 'eo' && nomsDeCategories(stocke, eo),
    `eo : bibliothèque installée en ${stocke.meta?.langueBibliotheque}, noms ${stocke.bibliotheque.categories[0]?.nom}`,
  );
});

await jouer('fr-FR sur la bibliothèque eo', 'fr-FR', stockeEo, (accueil, stocke) => {
  juge.exige(accueil.titre === fr.voyages.titre, `fr-FR : titre « ${accueil.titre} »`);
  juge.exige(!accueil.entrees.some(marque), `fr-FR : menu « ${accueil.entrees.join(' | ')} » en eo`);
  juge.exige(
    stocke.meta?.langueBibliotheque === 'eo' && nomsDeCategories(stocke, eo),
    'fr-FR : la bibliothèque installée en eo a changé',
  );
});

await jouer('de-DE', 'de-DE', undefined, (accueil, stocke) => {
  juge.exige(accueil.titre === fr.voyages.titre, `de-DE : titre « ${accueil.titre} »`);
  juge.exige(!accueil.entrees.some(marque), `de-DE : menu « ${accueil.entrees.join(' | ')} » en eo`);
  juge.exige(
    stocke.meta?.langueBibliotheque === 'fr' && nomsDeCategories(stocke, fr),
    `de-DE : bibliothèque installée en ${stocke.meta?.langueBibliotheque}`,
  );
});

juge.conclure('langue', 'eo, fr-FR sur bibliothèque eo, de-DE');
await navigateur.close();
await serveur.fermer();
