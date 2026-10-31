// Captures de la maquette de la phase 12, aux formats de l'appli : `pnpm dev`, puis
// `node docs/maquettes/reglages/captures.mjs <dossier>`. Sort en erreur si la page en signale une, si
// elle défile de côté, ou si une commande fait moins de 44 px de côté.
// ETATS, THEMES, FORMATS (listes séparées par des virgules) restreignent la campagne.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const dossier = process.argv[2] ?? 'captures-reglages';
mkdirSync(dossier, { recursive: true });
const FORMATS = {
  telephone: { width: 393, height: 873 },
  'tablette-portrait': { width: 800, height: 1280 },
  'tablette-paysage': { width: 1280, height: 800 },
  ordinateur: { width: 1440, height: 900 },
};
const TOUS =
  'reglages,reglages-sauvegarde,sauvegarde-faite,theme-sombre,theme-clair,confirmation,refus-abime,refus-format,refus-version,autorisation-refusee,restauration-reussie,panne';
const ETATS = (process.env.ETATS ?? TOUS).split(',');
const THEMES = (process.env.THEMES ?? 'clair,sombre').split(',');
const FORMATS_VOULUS = (process.env.FORMATS ?? Object.keys(FORMATS).join(',')).split(',');
// Ce qui doit être à l'écran avant la capture : on attend l'effet, jamais une pause fixe.
const FENETRE = 'dialog.confirmation';
const BANDEAU = '.bandeau-annuler:popover-open';
const ATTENDU = {
  'sauvegarde-faite': BANDEAU,
  'restauration-reussie': BANDEAU,
  confirmation: FENETRE,
  'refus-abime': FENETRE,
  'refus-format': FENETRE,
  'refus-version': FENETRE,
  'autorisation-refusee': FENETRE,
  panne: FENETRE,
};

// Ce qui cloche dans la page : un défilement de côté, une commande visible trop petite.
const defauts = page =>
  page.evaluate(() => {
    const trouves = [];
    if (document.documentElement.scrollWidth > innerWidth) trouves.push('défilement horizontal');
    const commandes = document.querySelectorAll('button, a, .segment, [role="radio"]');
    for (const el of commandes) {
      const r = el.getBoundingClientRect();
      if (!r.width || el.closest('.maquette-etats, [inert]') || el.matches('.lien-retour')) continue;
      if (r.width < 44 || r.height < 44)
        trouves.push(`cible ${Math.round(r.width)}×${Math.round(r.height)} : ${el.textContent.trim().slice(0, 30)}`);
    }
    return trouves;
  });

const navigateur = await chromium.launch();
let erreurs = 0;
for (const nomFormat of FORMATS_VOULUS)
  for (const theme of THEMES) {
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
      await page.goto(`http://localhost:1430/docs/maquettes/reglages/?etat=${etat}&capture&theme=${theme}`);
      await page.waitForSelector(ATTENDU[etat] ?? '.reglages-blocs', { state: 'visible' });
      await page.evaluate(() => document.fonts.ready);
      for (const defaut of await defauts(page)) (erreurs++, console.error(nomFormat, theme, etat, defaut));
      await page.screenshot({ path: `${dossier}/${etat}-${nomFormat}-${theme}.png` });
    }
    await page.close();
  }
await navigateur.close();
process.exit(erreurs ? 1 : 0);
