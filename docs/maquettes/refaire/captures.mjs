// Captures de la maquette de la phase 11, aux formats de l'appli : `pnpm dev`, puis
// `node docs/maquettes/refaire/captures.mjs <dossier>`. Sort en erreur si la page en signale une.
// ETATS, THEMES, FORMATS (listes séparées par des virgules) restreignent la campagne.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const dossier = process.argv[2] ?? 'captures-refaire';
mkdirSync(dossier, { recursive: true });
const FORMATS = {
  telephone: { width: 393, height: 873 },
  'tablette-portrait': { width: 800, height: 1280 },
  'tablette-paysage': { width: 1280, height: 800 },
  ordinateur: { width: 1920, height: 1080 },
};
const TOUS =
  'voyages-menu,voyage,voyage-menu,voyage-long,refaire-infos,refaire-etiquettes,refaire-apercu,suppression,annuler,changements-retire';
const ETATS = (process.env.ETATS ?? TOUS).split(',');
const THEMES = (process.env.THEMES ?? 'clair,sombre').split(',');
const FORMATS_VOULUS = (process.env.FORMATS ?? Object.keys(FORMATS).join(',')).split(',');
// Ce qui doit être à l'écran avant la capture : on attend l'effet, jamais une pause fixe.
const ATTENDU = {
  'voyages-menu': '.menu-voyage:popover-open',
  voyage: '.voyage-titre .menu-voyage-bouton',
  'voyage-menu': '.voyage-titre .menu-voyage:popover-open',
  'voyage-long': '.voyage-titre .menu-voyage-bouton',
  'refaire-infos': '.assistant .calendrier .jour',
  'refaire-etiquettes': '.assistant .puces-etiquettes',
  'refaire-apercu': '.assistant .refaire-disparus',
  suppression: 'dialog.confirmation',
  annuler: '.bandeau-annuler:popover-open',
  'changements-retire': '.recapitulatif .pastille-mention',
};
// Les endroits de l'aperçu à montrer en plus du haut : la quantité fixée, Plage (retiré, ajouté à la main),
// puis la fin (Pêche à pied).
const SUITES = {
  'refaire-apercu': {
    manuelle: '.refaire-manuelle',
    retire: '[data-objet="m-parasol"]',
    fin: '[data-objet="q-seaux"]',
  },
};

// Amène l'élément dans la vue : le panneau de la fenêtre défile, ou la page.
const amener = (page, selecteur) =>
  page.evaluate(s => {
    const el = document.querySelector(s);
    const panneau = el.closest('.etape-panneau');
    const zone = panneau && panneau.scrollHeight > panneau.clientHeight ? panneau : null;
    if (zone) zone.scrollTop += el.getBoundingClientRect().top - zone.getBoundingClientRect().top - 80;
    else scrollTo(0, scrollY + el.getBoundingClientRect().top - 120);
  }, selecteur);

const navigateur = await chromium.launch();
let erreurs = 0;
for (const nomFormat of FORMATS_VOULUS)
  for (const theme of THEMES) {
    // L'écran de l'appareil a la taille de la fenêtre : l'assistant choisit fenêtre ou plein écran d'après lui.
    const taille = FORMATS[nomFormat];
    const page = await navigateur.newPage({
      viewport: taille,
      screen: taille,
      colorScheme: theme === 'sombre' ? 'dark' : 'light',
      reducedMotion: 'reduce',
    });
    page.on('pageerror', e => (erreurs++, console.error(nomFormat, e.message)));
    page.on('console', m => m.type() === 'error' && (erreurs++, console.error(nomFormat, m.text())));
    for (const etat of ETATS) {
      await page.goto(`http://localhost:1430/docs/maquettes/refaire/?etat=${etat}&capture&theme=${theme}`);
      await page.waitForSelector(ATTENDU[etat] ?? 'main', { state: 'visible' });
      await page.evaluate(() => document.fonts.ready);
      await page.screenshot({ path: `${dossier}/${etat}-${nomFormat}-${theme}.png` });
      for (const [nom, selecteur] of Object.entries(SUITES[etat] ?? {})) {
        await amener(page, selecteur);
        await page.screenshot({ path: `${dossier}/${etat}-${nom}-${nomFormat}-${theme}.png` });
      }
    }
    await page.close();
  }
await navigateur.close();
process.exit(erreurs ? 1 : 0);
