// Captures de la maquette de la phase 10, aux formats de l'appli : `pnpm dev`, puis
// `node docs/maquettes/plans-changent/captures.mjs <dossier>`. Sort en erreur si la page en signale une.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const dossier = process.argv[2] ?? 'captures-plans-changent';
mkdirSync(dossier, { recursive: true });
const FORMATS = {
  telephone: { width: 393, height: 873 },
  'tablette-portrait': { width: 800, height: 1280 },
  'tablette-paysage': { width: 1280, height: 800 },
  ordinateur: { width: 1920, height: 1080 },
};
const TOUS = 'voyage,assistant,recapitulatif,sortie,a-sortir,fiche-a-sortir,fiche-retire,baisse,retrait';
const ETATS = (process.env.ETATS ?? TOUS).split(',');
const THEMES = (process.env.THEMES ?? 'clair,sombre').split(',');
const FORMATS_VOULUS = (process.env.FORMATS ?? Object.keys(FORMATS).join(',')).split(',');
// Ce qui doit être à l'écran avant la capture : on attend l'effet, jamais une pause fixe.
const ATTENDU = {
  assistant: '.assistant .calendrier .jour',
  recapitulatif: '.recapitulatif',
  sortie: 'dialog.confirmation .liste-ecartes',
  'fiche-a-sortir': 'dialog.fiche-voyage .sortir-rappel',
  'fiche-retire': 'dialog.fiche-voyage .sortir-rappel',
  baisse: 'dialog.confirmation',
  retrait: 'dialog.confirmation',
};
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
      await page.goto(`http://localhost:1430/docs/maquettes/plans-changent/?etat=${etat}&capture&theme=${theme}`);
      await page.waitForSelector(ATTENDU[etat] ?? 'main', { state: 'visible' });
      await page.evaluate(() => document.fonts.ready);
      await page.screenshot({ path: `${dossier}/${etat}-${nomFormat}-${theme}.png` });
      // Le bas du récapitulatif (Garder / Recalculer, Camping) : le panneau de la fenêtre, ou la page.
      if (etat === 'recapitulatif') {
        await page.evaluate(() => {
          const panneau = document.querySelector('.fenetre .etape-panneau');
          if (panneau) panneau.scrollTop = panneau.scrollHeight;
          else scrollTo(0, document.scrollingElement.scrollHeight);
        });
        await page.screenshot({ path: `${dossier}/${etat}-bas-${nomFormat}-${theme}.png` });
      }
    }
    await page.close();
  }
await navigateur.close();
process.exit(erreurs ? 1 : 0);
