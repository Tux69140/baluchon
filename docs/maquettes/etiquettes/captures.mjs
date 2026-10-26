// Captures de la maquette : chaque état, à chaque format, en clair et en sombre, avec trois
// contrôles : pas de défilement de côté, cibles d'au moins 44 px, aucun texte sous 13 px.
// Usage : node docs/maquettes/etiquettes/captures.mjs [etat…]  (serveur sur 127.0.0.1:8645)
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const FORMATS = {
  telephone: { width: 360, height: 640, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
  'telephone-paysage': { width: 640, height: 360, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
  'tablette-portrait': { width: 800, height: 1280, isMobile: true, hasTouch: true, deviceScaleFactor: 1 },
  'tablette-paysage': { width: 1280, height: 800, isMobile: true, hasTouch: true, deviceScaleFactor: 1 },
  ordinateur: { width: 1440, height: 900, deviceScaleFactor: 1 },
};
const ETATS = process.argv.slice(2).length
  ? process.argv.slice(2)
  : ['reglages', 'etiquettes', 'groupe-vide', 'ranger', 'fiche-etiquette', 'nouvelle-etiquette', 'fiche-groupe',
     'nouveau-groupe', 'refus-vide', 'refus-pris', 'refus-groupe', 'supprimer-etiquette', 'supprimer-groupe', 'abandon',
     'panne', 'assistant', 'assistant-debut', 'assistant-fin', 'assistant-mini'];
const dossier = new URL('../../../captures-travail/etiquettes/', import.meta.url).pathname;
mkdirSync(dossier, { recursive: true });

// Ce que l'on peut toucher : chaque cible visible doit faire 44 × 44 au moins.
const controler = () => {
  const fautes = [];
  const racines = [...document.querySelectorAll('dialog[open]')];
  const dessus = racines.at(-1) ?? document.getElementById('app');
  for (const el of dessus.querySelectorAll('button, a, input, textarea, .segment')) {
    if (el.closest('.maquette-menu') || el.matches('.segment input')) continue;
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) continue;
    if (r.width < 43.5 || r.height < 43.5) fautes.push(`cible ${Math.round(r.width)}×${Math.round(r.height)} : ${(el.textContent || el.getAttribute('aria-label') || el.className).trim().slice(0, 30)}`);
  }
  for (const el of dessus.querySelectorAll('*')) {
    if (el.closest('.maquette-menu') || !el.childNodes.length) continue;
    const texte = [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim());
    if (texte && parseFloat(getComputedStyle(el).fontSize) < 13) fautes.push(`texte sous 13 px : ${el.textContent.trim().slice(0, 30)}`);
  }
  if (document.documentElement.scrollWidth > innerWidth) fautes.push('défilement horizontal');
  return fautes;
};

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
      await page.goto(`http://127.0.0.1:8645/docs/maquettes/etiquettes/?etat=${etat}&capture`);
      await page.waitForSelector('html[data-pret]');
      await page.evaluate(() => document.fonts.ready);
      if (theme === 'light') for (const f of await page.evaluate(controler)) erreurs.push(`${format}/${etat}: ${f}`);
      await page.screenshot({ path: `${dossier}${etat}-${format}-${theme === 'light' ? 'clair' : 'sombre'}.png` });
    }
    await contexte.close();
  }
await navigateur.close();
if (erreurs.length) {
  console.error([...new Set(erreurs)].join('\n'));
  process.exit(1);
}
console.log('captures prises');
