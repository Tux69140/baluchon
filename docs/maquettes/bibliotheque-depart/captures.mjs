// Captures de la maquette de la phase 13, aux formats de l'appli, en thème clair seulement (consigne du chef
// de projet) : `pnpm dev`, puis `node docs/maquettes/bibliotheque-depart/captures.mjs <dossier>`. Sort en
// erreur si la page en signale une, si elle défile de côté, ou si une commande fait moins de 44 px de côté.
// ETATS, FORMATS (listes séparées par des virgules) restreignent la campagne.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const dossier = process.argv[2] ?? 'captures-bibliotheque-depart';
mkdirSync(dossier, { recursive: true });
const FORMATS = {
  telephone: { width: 393, height: 873 },
  'tablette-portrait': { width: 800, height: 1280 },
  'tablette-paysage': { width: 1280, height: 800 },
  ordinateur: { width: 1440, height: 900 },
};
const TOUS =
  'infos,infos-aucun,infos-max,apercu,voyages,voyage,bibliotheque,bibliotheque-papiers,fiche-lessive,fiche-carnet,fiche-rasoir,fiche-culottes,fiche-creme,changements,menu,a-propos';
const ETATS = (process.env.ETATS ?? TOUS).split(',');
const FORMATS_VOULUS = (process.env.FORMATS ?? Object.keys(FORMATS).join(',')).split(',');
// Ce qui doit être à l'écran avant la capture : on attend l'effet, jamais une pause fixe.
const FICHE = 'dialog.fiche-modele .lecture';
const ATTENDU = {
  infos: '.champ-composition',
  'infos-aucun': '.composition-message[data-etat="erreur"]',
  'infos-max': '.composition-message[data-etat="limite"]',
  apercu: '.assistant .apercu-categories',
  voyages: '.carte-voyage',
  voyage: '.voyage-details',
  bibliotheque: '.objet-modele',
  'bibliotheque-papiers': '.objet-modele',
  'fiche-lessive': FICHE,
  'fiche-carnet': FICHE,
  'fiche-rasoir': FICHE,
  'fiche-culottes': FICHE,
  'fiche-creme': FICHE,
  changements: '.recapitulatif .recap-modifs',
  menu: '.tiroir a[href="#/a-propos"]',
  'a-propos': '.a-propos-liste',
};
// Les endroits à montrer en plus du haut : « Pour qui » et l'encadré de lecture de la fiche ; dans l'aperçu,
// les vêtements (culottes pour les femmes et l'enfant, rien pour les hommes) ; aux changements, les objets
// pour enfants plus bas (Doudou).
const LECTURE = { lecture: '.pour-qui' };
const SUITES = {
  'fiche-lessive': LECTURE,
  'fiche-carnet': LECTURE,
  'fiche-rasoir': LECTURE,
  'fiche-culottes': LECTURE,
  'fiche-creme': LECTURE,
  apercu: { vetements: '.apercu-objet[aria-label^="Culottes ou slips"]' },
  changements: { enfants: '.recap-ligne[aria-label^="Doudou"]' },
};

// Amène l'élément dans la vue : le corps de la fiche défile, ou le panneau de l'assistant, ou la page.
const amener = (page, selecteur) =>
  page.evaluate(s => {
    const el = document.querySelector(s);
    const zone = el.closest('.fiche-corps, .etape-panneau');
    if (zone && zone.scrollHeight > zone.clientHeight)
      zone.scrollTop += el.getBoundingClientRect().top - zone.getBoundingClientRect().top - (zone.matches('.fiche-corps') ? 16 : 100);
    else scrollTo(0, scrollY + el.getBoundingClientRect().top - 120);
  }, selecteur);

// Ce qui cloche dans la page : un défilement de côté, une commande visible trop petite.
const defauts = page =>
  page.evaluate(() => {
    const trouves = [];
    if (document.documentElement.scrollWidth > innerWidth) trouves.push('défilement horizontal');
    const commandes = document.querySelectorAll('button, a, .segment, [role="radio"]');
    for (const el of commandes) {
      const r = el.getBoundingClientRect();
      if (!r.width || el.closest('.maquette-etats, [inert]') || el.matches('.lien-retour')) continue;
      // Ce que cache une fenêtre ouverte par-dessus ne se touche pas : on ne le compte pas.
      const modale = document.querySelector('dialog:modal');
      if (modale && !modale.contains(el)) continue;
      if (getComputedStyle(el).visibility === 'hidden' || el.closest('[style*="display: none"]')) continue;
      if (r.width < 44 || r.height < 44)
        trouves.push(`cible ${Math.round(r.width)}×${Math.round(r.height)} : ${el.textContent.trim().slice(0, 30)}`);
    }
    return trouves;
  });

const navigateur = await chromium.launch();
let erreurs = 0;
for (const nomFormat of FORMATS_VOULUS) {
  // L'écran de l'appareil a la taille de la fenêtre : l'assistant choisit fenêtre ou plein écran d'après lui.
  const taille = FORMATS[nomFormat];
  const page = await navigateur.newPage({ viewport: taille, screen: taille, colorScheme: 'light', reducedMotion: 'reduce' });
  page.on('pageerror', e => (erreurs++, console.error(nomFormat, e.message)));
  page.on('console', m => m.type() === 'error' && (erreurs++, console.error(nomFormat, m.text())));
  for (const etat of ETATS) {
    await page.goto(`http://localhost:1430/docs/maquettes/bibliotheque-depart/?etat=${etat}&capture`);
    await page.waitForSelector(ATTENDU[etat] ?? 'main', { state: 'visible' });
    await page.evaluate(() => document.fonts.ready);
    for (const defaut of await defauts(page)) (erreurs++, console.error(nomFormat, etat, defaut));
    await page.screenshot({ path: `${dossier}/${etat}-${nomFormat}.png` });
    for (const [nom, selecteur] of Object.entries(SUITES[etat] ?? {})) {
      await amener(page, selecteur);
      await page.screenshot({ path: `${dossier}/${etat}-${nom}-${nomFormat}.png` });
    }
  }
  await page.close();
}
await navigateur.close();
process.exit(erreurs ? 1 : 0);
