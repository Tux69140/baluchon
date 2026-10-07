// Outils communs aux tests d'écran : ouvrir l'appli dans un format et un thème, juger les fautes, et
// les vérifications que tout écran doit passer (cibles de 44 px, pas de défilement de côté, rien sous
// les barres système, aucune requête hors de l'appli).
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { calme } from './attente.mjs';

export const RACINE = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const CAPTURES = join(RACINE, 'captures-travail');
export const FORMATS = {
  telephone: { width: 393, height: 873 },
  'tablette-portrait': { width: 800, height: 1280 },
  'tablette-paysage': { width: 1280, height: 800 },
};
export const NOMS_THEME = { light: 'clair', dark: 'sombre' };
// Barres système d'une tablette Android : heure en haut, boutons en bas, encoches sur les côtés.
const ZONES = { haut: 64, bas: 48, gauche: 24, droite: 24 };
const VISIBLES =
  '#app h1, #app h2, #app h3, #app p, #app a, #app button, #app input, #app img, #app li, #app legend, #app label, #app output, #app dialog';
const CLE = 'baluchon-essai';

export function creerJuge() {
  const fautes = [];
  return {
    exige(condition, message) {
      if (!condition) fautes.push(message);
    },
    conclure(titre, resume) {
      if (!fautes.length) return console.log(`✓ ${titre} : ${resume}`);
      console.error(`✗ ${titre} : ${fautes.length} faute(s)`);
      for (const faute of fautes) console.error(`    ${faute}`);
      process.exitCode = 1;
    },
  };
}

// donnees : l'état de départ du stockage du navigateur, déposé une seule fois par onglet, pour qu'un
// rechargement de la page retrouve ce que l'appli a écrit. maintenant : l'horloge de la page.
// ecran : l'écran de l'appareil, s'il diffère de la fenêtre (ordinateur, téléphone tourné) ;
// tactile : pointeur au doigt (tablette, téléphone) ou à la souris (ordinateur).
export async function ouvrir(
  navigateur,
  url,
  { taille, theme, donnees, maintenant, adresse = '', ecran, tactile = true },
) {
  const contexte = await navigateur.newContext({
    viewport: taille,
    colorScheme: theme,
    hasTouch: tactile,
    ...(ecran && { screen: ecran }),
  });
  const page = await contexte.newPage();
  const sorties = [];
  const erreurs = [];
  page.on('pageerror', e => erreurs.push(e.message));
  page.on('console', m => m.type() === 'error' && erreurs.push(m.text()));
  // Hors ligne : toute requête qui quitte l'appli est coupée, et comptée comme une faute.
  await page.route(
    lien => lien.hostname !== 'localhost',
    route => {
      sorties.push(route.request().url());
      return route.abort();
    },
  );
  if (maintenant) await page.clock.setFixedTime(maintenant);
  if (donnees)
    await page.addInitScript(
      ({ cle, d }) => {
        // Un retour qui quitte l'appli mène à une page vide, sans stockage : rien à y déposer.
        if (location.protocol !== 'http:') return;
        if (sessionStorage.getItem('graine-posee')) return;
        localStorage.setItem(cle, JSON.stringify(d));
        sessionStorage.setItem('graine-posee', '1');
      },
      { cle: CLE, d: donnees },
    );
  await page.goto(url + adresse);
  await calme(page);
  return { contexte, page, sorties, erreurs };
}

export async function attendreEcran(page, nom) {
  await page.waitForFunction(n => document.querySelector('#app')?.dataset.ecran === n, nom, { timeout: 10000 });
  await calme(page);
}

export const lireStockage = page => page.evaluate(cle => JSON.parse(localStorage.getItem(cle) ?? '{}'), CLE);
export const ecrireStockage = (page, donnees) =>
  page.evaluate(({ cle, d }) => localStorage.setItem(cle, JSON.stringify(d)), { cle: CLE, d: donnees });

// Toute commande visible offre une cible d'au moins 44 × 44 px ; la page ne défile pas de côté.
export async function verifierCommandes(page, juge, cas) {
  const m = await page.evaluate(() => ({
    petites: [...document.querySelectorAll('#app a, #app button, #app input')]
      .filter(el => {
        const r = el.getBoundingClientRect();
        return r.width > 0 && (r.width < 43.5 || r.height < 43.5);
      })
      .map(
        el =>
          `${el.tagName.toLowerCase()} « ${(el.textContent.trim() || el.getAttribute('aria-label') || el.id).slice(0, 30)} »`,
      ),
    debordement: document.documentElement.scrollWidth - window.innerWidth,
  }));
  juge.exige(m.petites.length === 0, `${cas} : cibles de moins de 44 px : ${m.petites.join(', ')}`);
  juge.exige(m.debordement <= 0, `${cas} : la page défile de côté (${m.debordement} px)`);
}

// Avec les barres système posées, aucun texte ni commande visible ne passe sous une bande, et chaque
// bande, opaque, est bien au-dessus du contenu. Une page plus haute que l'écran défile sous les
// bandes : on juge donc le bord haut en haut de page, le bord bas tout en bas après défilement, et
// les côtés partout. Un élément fixé à l'écran (bouton flottant, fenêtre modale) ne défile pas avec
// la page : ses deux bords sont jugés à chaque fois. Ce qui défile dans une boîte (corps d'une
// fenêtre) est jugé sur sa seule partie visible, la boîte défilée en haut puis en bas. Une fenêtre
// modale ouverte couvre les bandes de son voile, comme le reste de l'écran : c'est voulu.
export async function verifierBarres(page, juge, cas) {
  await page.evaluate(zones => {
    for (const [cote, taille] of Object.entries(zones))
      document.documentElement.style.setProperty(`--zone-${cote}`, `${taille}px`);
  }, ZONES);
  const releve = async bord => {
    await calme(page);
    return page.evaluate(
      ({ bord, zones: { haut, bas, gauche, droite }, visibles }) => {
        const W = window.innerWidth;
        const H = window.innerHeight;
        const fixe = el => {
          for (let n = el; n; n = n.parentElement) if (getComputedStyle(n).position === 'fixed') return true;
          return false;
        };
        // La partie d'un élément que ses boîtes à défilement (ou à bord coupé) laissent voir.
        const partieVisible = el => {
          let { left, top, right, bottom } = el.getBoundingClientRect();
          for (let n = el.parentElement; n && n !== document.body; n = n.parentElement) {
            const s = getComputedStyle(n);
            if (s.overflowX === 'visible' && s.overflowY === 'visible') continue;
            const c = n.getBoundingClientRect();
            [left, top, right, bottom] = [
              Math.max(left, c.left),
              Math.max(top, c.top),
              Math.min(right, c.right),
              Math.min(bottom, c.bottom),
            ];
          }
          return { left, top, right, bottom, width: right - left, height: bottom - top };
        };
        for (const boite of document.querySelectorAll('#app *')) {
          if (boite.scrollHeight <= boite.clientHeight || !/auto|scroll/.test(getComputedStyle(boite).overflowY))
            continue;
          boite.scrollTop = bord === 'haut' ? 0 : boite.scrollHeight;
        }
        const empietes = [];
        for (const el of document.querySelectorAll(visibles)) {
          if (el.getBoundingClientRect().width === 0) continue;
          const r = partieVisible(el);
          if (r.width <= 0 || r.height <= 0 || r.bottom <= 0 || r.top >= H) continue;
          const touteHauteur = fixe(el);
          const dessus = (bord === 'haut' || touteHauteur) && r.top < haut - 0.5;
          const dessous = (bord === 'bas' || touteHauteur) && r.bottom > H - bas + 0.5;
          if (dessus || dessous || r.left < gauche - 0.5 || r.right > W - droite + 0.5)
            empietes.push(`${el.tagName.toLowerCase()} « ${el.textContent.trim().slice(0, 30)} »`);
        }
        const modale = document.querySelector('dialog:modal');
        const bandes = ['haut', 'bas', 'gauche', 'droite'].filter(zone => {
          const bande = document.querySelector(`.zone-systeme[data-zone="${zone}"]`);
          const r = bande?.getBoundingClientRect();
          if (!r || r.width === 0 || r.height === 0) return true;
          const dessus = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
          return dessus !== bande && !(modale && dessus === modale);
        });
        return { empietes, bandes };
      },
      { bord, zones: ZONES, visibles: VISIBLES },
    );
  };
  await page.evaluate(() => window.scrollTo(0, 0));
  const enHaut = await releve('haut');
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  const enBas = await releve('bas');
  const empietes = [...new Set([...enHaut.empietes, ...enBas.empietes])];
  juge.exige(empietes.length === 0, `${cas} : sous les barres système : ${empietes.join(', ')}`);
  juge.exige(
    enHaut.bandes.length === 0,
    `${cas} : bandes des barres système absentes ou recouvertes : ${enHaut.bandes.join(', ')}`,
  );
}
