// Phase 1 (docs/PLAN.md) : l'écran Voyages du premier lancement (US-29, US-35, US-37).
// Au téléphone (393 × 873) et à la tablette (800 × 1280, 1280 × 800), en clair puis en sombre :
// - l'écran vide s'affiche, mascotte, invitation et bouton « Nouveau voyage » (44 × 44 au moins),
//   tous ses textes venus de src/i18n/fr.json ;
// - le fond suit le thème de l'appareil (sable en clair, nuit marine en sombre) ;
// - les polices sont celles de l'appli, chargées sans aucune requête hors de l'appli (hors ligne) ;
// - rien ne défile de côté ; avec des barres système simulées, rien ne passe dessous.
// Témoin : un stockage qui contient un voyage ne montre pas l'écran vide, mais ce voyage — l'écran
// lit donc bien le stockage, et l'écran vide n'est pas affiché d'office.
// Captures claire et sombre à la tablette en portrait, dans captures-travail/.
import { mkdir, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { calme } from './outils/attente.mjs';
import { demarrerServeur } from './outils/serveur.mjs';

const RACINE = join(dirname(fileURLToPath(import.meta.url)), '..');
const fr = JSON.parse(await readFile(join(RACINE, 'src/i18n/fr.json'), 'utf8'));
const FORMATS = {
  telephone: { width: 393, height: 873 },
  'tablette-portrait': { width: 800, height: 1280 },
  'tablette-paysage': { width: 1280, height: 800 },
};
// Fond de page attendu (docs/DESIGN.md) : sable en clair, nuit marine en sombre.
const FONDS = { light: 'rgb(247, 246, 241)', dark: 'rgb(13, 22, 36)' };
const NOMS_THEME = { light: 'clair', dark: 'sombre' };
// Barres système d'une tablette Android : heure en haut, boutons en bas, encoches sur les côtés.
const ZONES = { haut: 64, bas: 48, gauche: 24, droite: 24 };
const CAPTURES = join(RACINE, 'captures-travail');

const fautes = [];
const exige = (condition, message) => {
  if (!condition) fautes.push(message);
};

// Mesures prises dans la page.
function mesurer() {
  const vide = document.querySelector('.vide');
  const bouton = vide?.querySelector('button');
  const image = vide?.querySelector('img');
  const rect = bouton?.getBoundingClientRect();
  return {
    ecran: document.querySelector('#app')?.dataset.ecran,
    titre: vide?.querySelector('h2')?.textContent.trim(),
    bouton: bouton?.textContent.trim(),
    tailleBouton: rect ? { largeur: rect.width, hauteur: rect.height } : null,
    mascotte: Boolean(image?.complete && image.naturalWidth > 0),
    fond: getComputedStyle(document.body).backgroundColor,
    polices: [...document.fonts].filter(f => f.status === 'loaded').map(f => f.family.replace(/"/g, '')),
    policeTitre: document.querySelector('h1') ? getComputedStyle(document.querySelector('h1')).fontFamily : '',
    debordement: document.documentElement.scrollWidth - window.innerWidth,
    langue: document.documentElement.lang,
    titreFenetre: document.title,
  };
}

// Avec les barres système posées, tout texte ou commande visible reste hors des bandes, en haut de
// page comme tout en bas après défilement ; et chaque bande, opaque, est bien au-dessus du contenu.
async function horsDesBarres(page) {
  await page.evaluate(zones => {
    for (const [cote, taille] of Object.entries(zones))
      document.documentElement.style.setProperty(`--zone-${cote}`, `${taille}px`);
  }, ZONES);
  await calme(page);
  const releve = () =>
    page.evaluate(({ haut, bas, gauche, droite }) => {
      const W = window.innerWidth;
      const H = window.innerHeight;
      const empietes = [];
      for (const el of document.querySelectorAll('#app h1, #app h2, #app p, #app button, #app img, #app li')) {
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.bottom <= 0 || r.top >= H) continue;
        if (r.top < haut - 0.5 || r.bottom > H - bas + 0.5 || r.left < gauche - 0.5 || r.right > W - droite + 0.5) {
          empietes.push(`${el.tagName.toLowerCase()} « ${el.textContent.trim().slice(0, 30)} »`);
        }
      }
      const bandes = ['haut', 'bas', 'gauche', 'droite'].filter(zone => {
        const bande = document.querySelector(`.zone-systeme[data-zone="${zone}"]`);
        const r = bande?.getBoundingClientRect();
        return (
          !r ||
          r.width === 0 ||
          r.height === 0 ||
          document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2) !== bande
        );
      });
      return { empietes, bandes };
    }, ZONES);
  const enHaut = await releve();
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await calme(page);
  const enBas = await releve();
  return { empietes: [...new Set([...enHaut.empietes, ...enBas.empietes])], bandes: enHaut.bandes };
}

async function ouvrir(navigateur, url, { taille, theme, voyages }) {
  const contexte = await navigateur.newContext({ viewport: taille, colorScheme: theme, hasTouch: true });
  const page = await contexte.newPage();
  const sorties = [];
  const erreurs = [];
  page.on('pageerror', e => erreurs.push(e.message));
  page.on('console', m => m.type() === 'error' && erreurs.push(m.text()));
  // Hors ligne : toute requête qui quitte l'appli est coupée, et comptée comme une faute.
  await page.route(
    adresse => adresse.hostname !== 'localhost',
    route => {
      sorties.push(route.request().url());
      return route.abort();
    },
  );
  if (voyages)
    await page.addInitScript(v => localStorage.setItem('baluchon-essai', JSON.stringify({ voyages: v })), voyages);
  await page.goto(url);
  await calme(page);
  return { contexte, page, sorties, erreurs };
}

const serveur = await demarrerServeur();
const navigateur = await chromium.launch();
try {
  await mkdir(CAPTURES, { recursive: true });
  for (const theme of ['light', 'dark']) {
    for (const [format, taille] of Object.entries(FORMATS)) {
      const cas = `${format}, ${NOMS_THEME[theme]}`;
      const { contexte, page, sorties, erreurs } = await ouvrir(navigateur, serveur.url, { taille, theme });
      const m = await page.evaluate(mesurer);
      exige(m.ecran === 'voyages', `${cas} : l’écran Voyages n’est pas affiché (${m.ecran})`);
      exige(m.titre === fr.voyages.vide.titre, `${cas} : invitation inattendue « ${m.titre} »`);
      exige(m.bouton === fr.voyages.nouveau, `${cas} : bouton inattendu « ${m.bouton} »`);
      exige(
        m.tailleBouton?.largeur >= 44 && m.tailleBouton?.hauteur >= 44,
        `${cas} : bouton trop petit (${JSON.stringify(m.tailleBouton)})`,
      );
      exige(m.mascotte, `${cas} : la mascotte n’est pas affichée`);
      exige(m.fond === FONDS[theme], `${cas} : fond ${m.fond}, attendu ${FONDS[theme]}`);
      exige(
        m.polices.includes('Baumans') && m.polices.includes('Source Sans 3'),
        `${cas} : polices chargées ${m.polices}`,
      );
      exige(m.policeTitre.startsWith('Baumans'), `${cas} : le titre n’est pas en Baumans (${m.policeTitre})`);
      exige(m.debordement <= 0, `${cas} : la page défile de côté (${m.debordement} px)`);
      exige(
        m.langue === 'fr' && m.titreFenetre === fr.appli.nom,
        `${cas} : langue « ${m.langue} », titre « ${m.titreFenetre} »`,
      );
      if (format === 'tablette-portrait')
        await page.screenshot({ path: join(CAPTURES, `voyages-vide-${NOMS_THEME[theme]}.png`) });
      const barres = await horsDesBarres(page);
      exige(barres.empietes.length === 0, `${cas} : sous les barres système : ${barres.empietes.join(', ')}`);
      exige(
        barres.bandes.length === 0,
        `${cas} : bandes des barres système absentes ou recouvertes : ${barres.bandes.join(', ')}`,
      );
      exige(sorties.length === 0, `${cas} : requêtes hors de l’appli : ${sorties.join(', ')}`);
      exige(erreurs.length === 0, `${cas} : erreurs dans la page : ${erreurs.join(' | ')}`);
      await contexte.close();
    }
  }

  // Témoin : un voyage dans le stockage, et l'écran le montre au lieu de l'écran vide.
  const voyage = {
    id: 'v1',
    nom: 'Vercors',
    destination: 'Autrans',
    depart: '2026-10-10',
    retour: '2026-10-13',
    voyageurs: 2,
  };
  const temoin = await ouvrir(navigateur, serveur.url, {
    taille: FORMATS['tablette-portrait'],
    theme: 'light',
    voyages: [voyage],
  });
  const vu = await temoin.page.evaluate(() => ({
    ecran: document.querySelector('#app')?.dataset.ecran,
    vide: Boolean(document.querySelector('.vide')),
    texte: document.querySelector('#app').textContent,
  }));
  exige(
    vu.ecran === 'voyages' && !vu.vide && vu.texte.includes('Vercors'),
    `témoin : un voyage enregistré devrait remplacer l’écran vide (${JSON.stringify(vu)})`,
  );
  await temoin.contexte.close();
} finally {
  await navigateur.close();
  await serveur.fermer();
}

if (fautes.length) {
  console.error(`✗ Écran Voyages vide : ${fautes.length} faute(s)`);
  for (const faute of fautes) console.error(`    ${faute}`);
  process.exitCode = 1;
} else {
  console.log('✓ Écran Voyages vide : 3 formats × 2 thèmes, témoin compris');
}
