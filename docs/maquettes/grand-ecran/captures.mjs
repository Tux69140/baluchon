// Les 16 captures de la maquette validée le 2026-10-27, numérotées dans l'ordre de
// lecture, dans captures-travail/grand-ecran/a-valider/ (le dossier est vidé à chaque passage).
// Contrôles : pas de défilement de côté, cibles d'au moins 44 px, aucun texte sous 13 px.
// Usage : node docs/maquettes/grand-ecran/captures.mjs [copie]  (serveur sur 127.0.0.1:8650)
import { chromium } from 'playwright';
import { cpSync, mkdirSync, rmSync } from 'node:fs';

const ADRESSE = 'http://127.0.0.1:8650/docs/maquettes/grand-ecran/';
const ORDINATEUR = { width: 1920, height: 1080 };
const PORTABLE = { width: 1366, height: 768 };
const PAYSAGE = { width: 1280, height: 800, isMobile: true, hasTouch: true };
const PORTRAIT = { width: 800, height: 1280, isMobile: true, hasTouch: true };
const TELEPHONE = { width: 393, height: 873, isMobile: true, hasTouch: true, deviceScaleFactor: 2 };
const VOYAGE = '';
const BIBLIO = 'ecran=bibliotheque';
const BANDEAU = `&bandeau=${encodeURIComponent('Objet « Parasol » supprimé')}`;

const BEAUCOUP = '&etat=beaucoup';
const PRISES = [
  ['01-voyage-ordinateur-1920', ORDINATEUR, VOYAGE],
  ['02-voyage-portable-1366', PORTABLE, VOYAGE],
  ['03-voyage-tablette-paysage', PAYSAGE, VOYAGE],
  ['04-voyage-tablette-portrait', PORTRAIT, VOYAGE],
  ['05-voyage-tablette-paysage-11-categories', PAYSAGE, VOYAGE + BEAUCOUP],
  ['06-voyage-tablette-portrait-11-categories', PORTRAIT, VOYAGE + BEAUCOUP],
  ['07-voyage-tablette-paysage-11-categories-bandeau-annuler', PAYSAGE, VOYAGE + BEAUCOUP + BANDEAU, { bandeau: true }],
  ['08-voyage-portable-1366-11-categories-menu-defile', PORTABLE, VOYAGE + BEAUCOUP, { defiler: '.ge-menu' }],
  ['09-bibliotheque-ordinateur-1920', ORDINATEUR, BIBLIO],
  ['10-bibliotheque-tablette-paysage', PAYSAGE, BIBLIO],
  ['11-bibliotheque-tablette-portrait', PORTRAIT, BIBLIO],
  ['12-bibliotheque-tablette-paysage-11-categories', PAYSAGE, BIBLIO + BEAUCOUP],
  ['13-bibliotheque-tablette-portrait-11-categories', PORTRAIT, BIBLIO + BEAUCOUP],
  ['14-voyage-ordinateur-sombre', ORDINATEUR, VOYAGE, { sombre: true }],
  ['15-voyage-tablette-paysage-sombre', PAYSAGE, VOYAGE, { sombre: true }],
  ['16-telephone-inchange', TELEPHONE, VOYAGE],
];

const dossier = new URL('../../../captures-travail/grand-ecran/', import.meta.url).pathname;
rmSync(dossier, { recursive: true, force: true });
mkdirSync(`${dossier}a-valider/`, { recursive: true });

const controler = () => {
  const fautes = [];
  for (const el of document.querySelectorAll('#app button, #app a')) {
    if (el.closest('.maquette-menu')) continue;
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) continue;
    if (r.width < 43.5 || r.height < 43.5)
      fautes.push(`cible ${Math.round(r.width)}×${Math.round(r.height)} : ${el.textContent.trim().slice(0, 30)}`);
  }
  for (const el of document.querySelectorAll('#app *')) {
    const texte = [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim());
    if (texte && parseFloat(getComputedStyle(el).fontSize) < 13)
      fautes.push(`texte sous 13 px : ${el.textContent.trim()}`);
  }
  if (document.documentElement.scrollWidth > innerWidth) fautes.push('défilement horizontal');
  return fautes;
};

const navigateur = await chromium.launch();
const erreurs = [];
for (const [nom, { width, height, ...appareil }, requete, options = {}] of PRISES) {
  const contexte = await navigateur.newContext({
    viewport: { width, height },
    ...appareil,
    colorScheme: options.sombre ? 'dark' : 'light',
    reducedMotion: 'reduce',
  });
  const page = await contexte.newPage();
  page.on('pageerror', e => erreurs.push(`${nom}: ${e.message}`));
  await page.goto(`${ADRESSE}?capture${requete && `&${requete.replace(/^&/, '')}`}`);
  await page.waitForSelector('html[data-pret]');
  if (options.bandeau) await page.waitForSelector('html[data-bandeau]');
  await page.evaluate(() => document.fonts.ready);
  // Le menu défile seul jusqu'en bas : la liste, à côté, ne bouge pas.
  if (options.defiler) await page.evaluate(sel => (document.querySelector(sel).scrollTop = 1e6), options.defiler);
  for (const f of await page.evaluate(controler)) erreurs.push(`${nom}: ${f}`);
  await page.screenshot({ path: `${dossier}a-valider/${nom}.png` });
  await contexte.close();
}
await navigateur.close();
if (erreurs.length) {
  console.error(erreurs.join('\n'));
  process.exit(1);
}
// Une copie pour le coordinateur, si on la demande : node captures.mjs <dossier>
const copie = process.argv[2];
if (copie) {
  rmSync(copie, { recursive: true, force: true });
  cpSync(`${dossier}a-valider/`, copie, { recursive: true });
}
console.log('captures prises');
