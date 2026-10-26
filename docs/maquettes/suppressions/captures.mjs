// Captures de la maquette : chaque état, à chaque format, en clair et en sombre, avec quatre
// contrôles : pas de défilement de côté, cibles d'au moins 44 px, aucun texte sous 13 px, et le
// bandeau « Annuler » qui ne couvre ni le bouton flottant ni les boutons d'une fenêtre.
// Usage : node docs/maquettes/suppressions/captures.mjs [etat…]  (serveur sur 127.0.0.1:8646)
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const FORMATS = {
  telephone: { width: 360, height: 640, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
  'telephone-paysage': { width: 640, height: 360, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
  'tablette-portrait': { width: 800, height: 1280, isMobile: true, hasTouch: true, deviceScaleFactor: 1 },
  'tablette-paysage': { width: 1280, height: 800, isMobile: true, hasTouch: true, deviceScaleFactor: 1 },
  ordinateur: { width: 1440, height: 900, deviceScaleFactor: 1 },
};
const BANDEAU = encodeURIComponent('Objet « Parasol » supprimé');
// Les deux écrans d'autres maquettes où le bandeau suit l'utilisateur.
const AILLEURS = {
  'bandeau-voyage': `../voyage/?etat=en-cours&bandeau=${BANDEAU}`,
  'bandeau-assistant': `../etiquettes/?etat=assistant-mini&bandeau=${BANDEAU}`,
};
const ETATS = process.argv.slice(2).length
  ? process.argv.slice(2)
  : ['bibliotheque', 'fiche-categorie', 'supprimer-categorie', 'bandeau-categorie', 'fiche-objet', 'supprimer-objet',
     'bandeau-objet', 'etiquettes', 'supprimer-etiquette', 'supprimer-etiquette-libre', 'bandeau-etiquette',
     'refus-etiquette', 'refus-fiche', 'refus-regle', 'refus-bandeau', 'refus-fini', 'supprimer-groupe', 'refus-groupe',
     'bandeau-reglages', 'bandeau-accueil', ...Object.keys(AILLEURS)];
const dossier = new URL('../../../captures-travail/suppressions/', import.meta.url).pathname;
mkdirSync(dossier, { recursive: true });

const controler = () => {
  const fautes = [];
  const racines = [...document.querySelectorAll('dialog[open]')];
  const dessus = racines.at(-1) ?? document.getElementById('app');
  const bandeau = document.querySelector('.bandeau-annuler');
  for (const el of new Set([...dessus.querySelectorAll('button, a, input, textarea, .segment'), ...(bandeau?.querySelectorAll('button') ?? [])])) {
    if (el.closest('.maquette-menu') || el.matches('.segment input')) continue;
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) continue;
    if (r.width < 43.5 || r.height < 43.5) fautes.push(`cible ${Math.round(r.width)}×${Math.round(r.height)} : ${(el.textContent || el.getAttribute('aria-label') || el.className).trim().slice(0, 30)}`);
  }
  for (const el of [...dessus.querySelectorAll('*'), ...(bandeau?.querySelectorAll('*') ?? [])]) {
    if (el.closest('.maquette-menu') || !el.childNodes.length) continue;
    const texte = [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim());
    if (texte && parseFloat(getComputedStyle(el).fontSize) < 13) fautes.push(`texte sous 13 px : ${el.textContent.trim().slice(0, 30)}`);
  }
  if (document.documentElement.scrollWidth > innerWidth) fautes.push('défilement horizontal');
  // Le bandeau ne cache rien de ce qu'on touche : ni le bouton flottant, ni les boutons de la fenêtre du dessus.
  if (bandeau) {
    const b = bandeau.getBoundingClientRect();
    const touche = r => r.width && !(r.right <= b.left || r.left >= b.right || r.bottom <= b.top || r.top >= b.bottom);
    // Sans fenêtre : tout ce qui est fixé en bas (bouton flottant, boutons collés de l'assistant).
    const fixes = [...document.body.querySelectorAll('*')].filter(el => {
      const p = getComputedStyle(el).position;
      return (p === 'fixed' || p === 'sticky') && !el.closest('.bandeau-annuler, .maquette-menu');
    });
    const cibles = racines.length
      ? racines.at(-1).querySelectorAll('button, a, input')
      : fixes.flatMap(el => (el.matches('button, a') ? [el] : [...el.querySelectorAll('button, a')]));
    for (const el of cibles) if (!el.closest('.bandeau-annuler') && touche(el.getBoundingClientRect())) fautes.push(`bandeau sur : ${(el.textContent || el.getAttribute('aria-label')).trim().slice(0, 30)}`);
    if (b.bottom > innerHeight || b.top < 0) fautes.push('bandeau hors de l’écran');
  }
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
      const adresse = AILLEURS[etat] ? `${AILLEURS[etat]}&capture` : `?etat=${etat}&capture`;
      await page.goto(new URL(adresse, 'http://127.0.0.1:8646/docs/maquettes/suppressions/').href);
      await page.waitForSelector(AILLEURS[etat] ? 'html[data-bandeau]' : 'html[data-pret]');
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
