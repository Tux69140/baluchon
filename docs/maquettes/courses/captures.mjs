// Captures de la maquette de la phase 9, aux formats de l'appli : `pnpm dev`, puis
// `node docs/maquettes/courses/captures.mjs <dossier>`. Sort en erreur si la page en signale une.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const dossier = process.argv[2] ?? 'captures-courses';
mkdirSync(dossier, { recursive: true });
const FORMATS = {
  telephone: { width: 393, height: 873 },
  'tablette-portrait': { width: 800, height: 1280 },
  'tablette-paysage': { width: 1280, height: 800 },
  ordinateur: { width: 1920, height: 1080 },
};
const ETATS = (process.env.ETATS ?? 'voyage,fiche,courses,courses-partiel,fiche-achat,achat-fini,courses-vide,courses-faites').split(',');
const THEMES = (process.env.THEMES ?? 'clair').split(',');
const navigateur = await chromium.launch();
let erreurs = 0;
for (const [nomFormat, taille] of Object.entries(FORMATS))
  for (const theme of THEMES) {
    const page = await navigateur.newPage({ viewport: taille, colorScheme: theme === 'sombre' ? 'dark' : 'light' });
    page.on('pageerror', e => (erreurs++, console.error(nomFormat, e.message)));
    page.on('console', m => m.type() === 'error' && (erreurs++, console.error(nomFormat, m.text())));
    for (const etat of ETATS) {
      await page.goto(`http://localhost:1430/docs/maquettes/courses/?etat=${etat}&capture&theme=${theme}`);
      await page.waitForTimeout(etat === 'achat-fini' ? 600 : 400);
      await page.screenshot({ path: `${dossier}/${etat}-${nomFormat}-${theme}.png`, fullPage: false });
      if (etat === 'achat-fini') {
        await page.waitForTimeout(1200);
        await page.screenshot({ path: `${dossier}/${etat}-bandeau-${nomFormat}-${theme}.png` });
      }
    }
    await page.close();
  }
await navigateur.close();
process.exit(erreurs ? 1 : 0);
