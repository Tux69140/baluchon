// Captures de la maquette : chaque état, à chaque format, en clair et en sombre.
// Usage : node docs/maquettes/voyage/captures.mjs [etat…]  (serveur sur 127.0.0.1:8642)
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const FORMATS = {
  telephone: { width: 393, height: 873, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
  'tablette-portrait': { width: 800, height: 1280, isMobile: true, hasTouch: true, deviceScaleFactor: 1 },
  'tablette-paysage': { width: 1280, height: 800, isMobile: true, hasTouch: true, deviceScaleFactor: 1 },
  ordinateur: { width: 1440, height: 900, deviceScaleFactor: 1 },
};
const ETATS = process.argv.slice(2).length
  ? process.argv.slice(2)
  : ['en-cours', 'tampon', 'filtre', 'boucle', 'vide', 'fiche', 'confirmation', 'panne', 'accueil'];
const dossier = new URL('../../../captures-travail/maquette/', import.meta.url).pathname;
mkdirSync(dossier, { recursive: true });

const navigateur = await chromium.launch();
const erreurs = [];
for (const [format, vue] of Object.entries(FORMATS))
  for (const theme of ['light', 'dark']) {
    const contexte = await navigateur.newContext({
      viewport: { width: vue.width, height: vue.height },
      deviceScaleFactor: vue.deviceScaleFactor,
      isMobile: vue.isMobile ?? false,
      hasTouch: vue.hasTouch ?? false,
      colorScheme: theme,
      reducedMotion: 'reduce',
    });
    const page = await contexte.newPage();
    page.on('pageerror', e => erreurs.push(`${format}/${theme}: ${e.message}`));
    for (const etat of ETATS) {
      await page.goto(`http://127.0.0.1:8642/docs/maquettes/voyage/?etat=${etat}&capture`);
      await page.waitForSelector('html[data-pret]');
      await page.evaluate(() => document.fonts.ready);
      if (['fiche', 'confirmation'].includes(etat)) await page.waitForSelector('dialog[open]');
      // Défilement horizontal interdit à tous les formats.
      const large = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
      if (large) erreurs.push(`${format}/${theme}/${etat}: défilement horizontal`);
      await page.screenshot({ path: `${dossier}${etat}-${format}-${theme === 'light' ? 'clair' : 'sombre'}.png` });
    }
    await contexte.close();
  }
await navigateur.close();
if (erreurs.length) {
  console.error(erreurs.join('\n'));
  process.exit(1);
}
console.log('captures prises');
