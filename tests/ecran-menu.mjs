// Phase 5 (docs/PLAN.md) : le menu, l'écran Réglages et la navigation par l'accueil (maquette validée
// le 2026-10-25, docs/maquettes/bibliotheque/). La touche retour d'Android est jouée par la page
// (window.toucheRetour) ; une sortie de l'appli demandée se compte dans window.sortiesDemandees.
// - Accueil : le bouton « Menu » en haut à gauche ; le menu ouvert montre Mes voyages, Nouveau voyage,
//   Réglages, dans cet ordre, Mes voyages marqué comme l'écran courant. ×, le voile, Échap et la touche
//   retour le ferment : l'accueil reste, et la touche suivante quitte l'appli (aucune étape oubliée).
// - Menu → Réglages : titre, ligne « Bibliothèque » et son explication ; la touche retour ramène à
//   l'accueil, le lien « Mes voyages » aussi (sans étape de plus : la touche suivante quitte l'appli).
// - Menu ouvert sur Réglages : Réglages est l'écran courant ; le toucher ferme seulement le menu.
// - Menu → Nouveau voyage depuis Réglages : l'assistant, sans redessiner l'accueil entre deux (témoin :
//   Menu → Mes voyages, lui, dessine l'accueil) ; « Créer le voyage » ouvre le voyage, et la touche
//   retour ramène à l'accueil (pas à Réglages), puis quitte l'appli. Même chose depuis l'accueil, et
//   depuis Réglages ouvert directement par son adresse.
// Téléphones 360 × 640 et 640 × 360, téléphone, tablette (portrait, paysage) et ordinateur, en clair
// et en sombre : cibles de 44 px, rien sous les barres système, largeur du menu ; captures menu-… et
// reglages-… dans captures-travail/.
import { mkdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { chromium } from 'playwright';
import { attendreQue, calme } from './outils/attente.mjs';
import { creerDepuisLAssistant } from './outils/assistant.mjs';
import { demarrerServeur } from './outils/serveur.mjs';
import {
  CAPTURES,
  FORMATS,
  NOMS_THEME,
  RACINE,
  attendreEcran,
  creerJuge,
  ouvrir,
  verifierBarres,
  verifierCommandes,
} from './outils/page.mjs';

const fr = JSON.parse(await readFile(join(RACINE, 'src/i18n/fr.json'), 'utf8'));
const MAINTENANT = new Date('2026-10-06T10:00:00');
const DONNEES = {
  toucheRetour: true,
  voyages: [
    {
      id: 'v1',
      nom: 'Vercors',
      destination: '',
      depart: '2026-10-10',
      retour: '2026-10-13',
      voyageurs: 2,
      modifieLe: 'x',
    },
  ],
};
// Les formats de cette phase : ceux de tous les écrans, plus le téléphone étroit et son paysage, et
// l'ordinateur (à la souris).
const TOUS_FORMATS = {
  'telephone-etroit': { taille: { width: 360, height: 640 } },
  'telephone-etroit-paysage': { taille: { width: 640, height: 360 }, ecran: { width: 360, height: 640 } },
  ...Object.fromEntries(Object.entries(FORMATS).map(([nom, taille]) => [nom, { taille }])),
  ordinateur: { taille: { width: 1440, height: 900 }, tactile: false },
};
const ENTREES = [fr.voyages.titre, fr.voyages.nouveau, fr.menu.reglages];

const vu = e => JSON.stringify(e);
const juge = creerJuge();
const serveur = await demarrerServeur();
const navigateur = await chromium.launch();

// Ce que l'on voit : l'écran, son adresse, le menu, et les sorties de l'appli demandées jusque-là.
const etat = page =>
  page.evaluate(() => ({
    ecran: document.querySelector('#app')?.dataset.ecran ?? null,
    adresse: location.hash,
    menu: Boolean(document.querySelector('dialog.tiroir')),
    sorties: window.sortiesDemandees ?? null,
  }));

// Le menu ouvert : ses entrées dans l'ordre, et celles marquées comme l'écran courant.
const lireMenu = page =>
  page.evaluate(() => {
    const tiroir = document.querySelector('dialog.tiroir[open]');
    if (!tiroir) return null;
    const liens = [...tiroir.querySelectorAll('.tiroir-lien')];
    return {
      entrees: liens.map(a => a.textContent.trim()),
      courantes: liens.filter(a => a.getAttribute('aria-current') === 'page').map(a => a.textContent.trim()),
      titre: tiroir.querySelector('h2')?.textContent.trim(),
      mascotte: Boolean(tiroir.querySelector('img')),
    };
  });

async function toucheRetour(page) {
  await page.evaluate(() => window.toucheRetour());
  await calme(page);
}

async function ouvrirMenu(page) {
  await page.click('[data-action="menu"]');
  await attendreQue(page, () => document.querySelector('dialog.tiroir[open]') !== null);
  await calme(page);
}

// Une entrée du menu, par son libellé.
const toucherEntree = (page, libelle) => page.click(`dialog.tiroir .tiroir-lien:text-is("${libelle}")`);

// Note chaque écran dessiné à partir de maintenant (le repère data-ecran posé par le routeur).
const suivreEcrans = page =>
  page.evaluate(() => {
    const app = document.querySelector('#app');
    window.ecransVus = [];
    new MutationObserver(() => app.dataset.ecran && window.ecransVus.push(app.dataset.ecran)).observe(app, {
      attributes: true,
      attributeFilter: ['data-ecran'],
    });
  });

async function ouvrirAvecTouche(cas, format, { adresse = '#/voyages', theme = 'light' } = {}) {
  const { taille, ecran, tactile } = TOUS_FORMATS[format];
  const ouvert = await ouvrir(navigateur, serveur.url, {
    taille,
    ecran,
    tactile,
    theme,
    maintenant: MAINTENANT,
    donnees: DONNEES,
    adresse,
  });
  await attendreEcran(ouvert.page, adresse === '#/reglages' ? 'reglages' : 'voyages');
  const offerte = await ouvert.page.evaluate(() => typeof window.toucheRetour === 'function');
  juge.exige(offerte, `${cas} : la page n’offre pas la touche retour`);
  return ouvert;
}

// Fin d'un cas : sur l'accueil, la touche retour quitte l'appli (une seule sortie, aucune avant).
async function finirSurAccueil(cas, ouvert) {
  const { page, erreurs, contexte } = ouvert;
  const avant = await etat(page);
  juge.exige(avant.ecran === 'voyages' && avant.sorties === 0, `${cas}, accueil : ${vu(avant)}`);
  await toucheRetour(page);
  const apres = await etat(page);
  juge.exige(apres.ecran === 'voyages' && apres.sorties === 1, `${cas}, touche sur l’accueil : ${vu(apres)}`);
  juge.exige(erreurs.length === 0, `${cas} : erreurs dans la page : ${erreurs.join(' | ')}`);
  await contexte.close();
}

// L'accueil : le bouton, le menu, et ses quatre façons de se fermer.
async function essaiAccueil(format) {
  const cas = `accueil, ${format}`;
  const ouvert = await ouvrirAvecTouche(cas, format);
  const { page } = ouvert;
  const bouton = await page.evaluate(() => {
    const b = document.querySelector('[data-action="menu"]');
    const h1 = document.querySelector('#app h1');
    if (!b) return null;
    const r = b.getBoundingClientRect();
    return {
      nom: b.getAttribute('aria-label'),
      avantLeTitre: r.bottom <= h1.getBoundingClientRect().top + 1,
      aGauche: r.left <= h1.getBoundingClientRect().left,
    };
  });
  juge.exige(
    bouton?.nom === fr.menu.ouvrir && bouton.avantLeTitre && bouton.aGauche,
    `${cas} : bouton Menu ${vu(bouton)}`,
  );
  const fermetures = {
    croix: () => page.click('dialog.tiroir [data-fermer]'),
    voile: () => page.mouse.click(page.viewportSize().width - 8, page.viewportSize().height / 2),
    echap: () => page.keyboard.press('Escape'),
    retour: () => page.evaluate(() => window.toucheRetour()),
  };
  for (const [geste, fermer] of Object.entries(fermetures)) {
    await ouvrirMenu(page);
    const menu = await lireMenu(page);
    juge.exige(
      vu(menu?.entrees) === vu(ENTREES) &&
        vu(menu.courantes) === vu([fr.voyages.titre]) &&
        menu.titre === fr.appli.nom &&
        menu.mascotte,
      `${cas} : menu ${vu(menu)}`,
    );
    await fermer();
    await attendreQue(page, () => !document.querySelector('dialog.tiroir'));
    await calme(page);
    const apres = await etat(page);
    juge.exige(
      !apres.menu && apres.ecran === 'voyages' && apres.adresse === '#/voyages' && apres.sorties === 0,
      `${cas}, fermé par ${geste} : ${vu(apres)}`,
    );
    if (geste === 'echap') {
      const focus = await page.evaluate(() => document.activeElement?.dataset.action ?? null);
      juge.exige(focus === 'menu', `${cas}, fermé par Échap : le focus est sur ${vu(focus)}`);
    }
  }
  await finirSurAccueil(cas, ouvert);
}

// Menu → Réglages, puis le retour par la touche, puis par le lien « Mes voyages » (témoin : ce lien
// dessine l'accueil).
async function essaiReglages(format) {
  const cas = `Réglages, ${format}`;
  const ouvert = await ouvrirAvecTouche(cas, format);
  const { page } = ouvert;
  await ouvrirMenu(page);
  await toucherEntree(page, fr.menu.reglages);
  await attendreEcran(page, 'reglages');
  const vue = await page.evaluate(() => {
    const ligne = document.querySelector('a.reglage[href="#/bibliotheque"]');
    return {
      titre: document.querySelector('#app h1')?.textContent.trim(),
      ligne: ligne?.querySelector('b')?.textContent.trim(),
      aide: ligne?.querySelector('.reglage-texte > span')?.textContent.trim(),
      menu: Boolean(document.querySelector('#app [data-action="menu"]')),
      retour: document.querySelector('#app a.lien-retour')?.textContent.trim(),
      menuOuvert: Boolean(document.querySelector('dialog.tiroir')),
    };
  });
  juge.exige(
    vue.titre === fr.reglages.titre &&
      vue.ligne === fr.reglages.bibliotheque &&
      vue.aide === fr.reglages.bibliothequeAide &&
      vue.menu &&
      vue.retour === fr.voyages.titre &&
      !vue.menuOuvert,
    `${cas} : ${vu(vue)}`,
  );

  // Menu ouvert sur Réglages : l'entrée Réglages ne fait que fermer le menu.
  await ouvrirMenu(page);
  const menu = await lireMenu(page);
  juge.exige(vu(menu?.courantes) === vu([fr.menu.reglages]), `${cas} : menu ${vu(menu)}`);
  await suivreEcrans(page);
  await toucherEntree(page, fr.menu.reglages);
  await attendreQue(page, () => !document.querySelector('dialog.tiroir'));
  await calme(page);
  const reste = await page.evaluate(() => ({ adresse: location.hash, vus: window.ecransVus }));
  juge.exige(reste.adresse === '#/reglages' && reste.vus.length === 0, `${cas}, Réglages touché : ${vu(reste)}`);

  await toucheRetour(page);
  const accueil = await etat(page);
  juge.exige(accueil.ecran === 'voyages' && accueil.sorties === 0, `${cas}, touche retour : ${vu(accueil)}`);

  await ouvrirMenu(page);
  await toucherEntree(page, fr.menu.reglages);
  await attendreEcran(page, 'reglages');
  await page.click('#app a.lien-retour');
  await attendreEcran(page, 'voyages');
  await finirSurAccueil(cas, ouvert);
}

// Remplit l'assistant ouvert et crée le voyage ; rend l'écran atteint.
async function creerVoyage(page) {
  await page.fill('#nom', 'Gorges du Tarn');
  await page.click('[data-jour="2026-10-10"]');
  await page.click('[data-jour="2026-10-13"]');
  await creerDepuisLAssistant(page);
  await attendreEcran(page, 'voyage');
}

// Menu → Nouveau voyage, depuis l'accueil, depuis Réglages ou depuis Réglages ouvert par son adresse.
async function essaiNouveau(format, depart) {
  const cas = `Nouveau voyage depuis ${depart}, ${format}`;
  const ouvert = await ouvrirAvecTouche(cas, format, {
    adresse: depart === 'Réglages direct' ? '#/reglages' : '#/voyages',
  });
  const { page } = ouvert;
  if (depart === 'Réglages') {
    await ouvrirMenu(page);
    await toucherEntree(page, fr.menu.reglages);
    await attendreEcran(page, 'reglages');
  }
  await suivreEcrans(page);
  await ouvrirMenu(page);
  await toucherEntree(page, fr.voyages.nouveau);
  await attendreEcran(page, 'nouveau-voyage');
  const vus = await page.evaluate(() => window.ecransVus);
  juge.exige(vu(vus) === vu(['nouveau-voyage']), `${cas} : écrans dessinés ${vu(vus)}`);
  await creerVoyage(page);
  await toucheRetour(page);
  await finirSurAccueil(cas, ouvert);
}

// Témoin du précédent : depuis Réglages, Menu → Mes voyages dessine bien l'accueil.
async function essaiMesVoyages(format) {
  const cas = `Mes voyages depuis Réglages, ${format}`;
  const ouvert = await ouvrirAvecTouche(cas, format);
  const { page } = ouvert;
  await ouvrirMenu(page);
  await toucherEntree(page, fr.menu.reglages);
  await attendreEcran(page, 'reglages');
  await suivreEcrans(page);
  await ouvrirMenu(page);
  await toucherEntree(page, fr.voyages.titre);
  await attendreEcran(page, 'voyages');
  const vus = await page.evaluate(() => window.ecransVus);
  juge.exige(vu(vus) === vu(['voyages']), `${cas} : écrans dessinés ${vu(vus)}`);
  await finirSurAccueil(cas, ouvert);
}

// Chaque format, chaque thème : le menu ouvert et Réglages passent les vérifications de tout écran.
async function essaiFormat(format, theme) {
  const cas = `${format}, ${NOMS_THEME[theme]}`;
  const ouvert = await ouvrirAvecTouche(cas, format, { theme });
  const { page, contexte, sorties, erreurs } = ouvert;
  await verifierCommandes(page, juge, `${cas}, accueil`);
  await ouvrirMenu(page);
  const largeur = await page.evaluate(() => ({
    tiroir: document.querySelector('dialog.tiroir').getBoundingClientRect().width,
    attendue: Math.min(320, window.innerWidth - 56),
  }));
  juge.exige(Math.abs(largeur.tiroir - largeur.attendue) < 1, `${cas} : largeur du menu ${vu(largeur)}`);
  await verifierCommandes(page, juge, `${cas}, menu`);
  await page.screenshot({ path: join(CAPTURES, `menu-${format}-${NOMS_THEME[theme]}.png`) });
  await toucherEntree(page, fr.menu.reglages);
  await attendreEcran(page, 'reglages');
  await verifierCommandes(page, juge, `${cas}, Réglages`);
  // Le pointeur resté là où était l'entrée du menu survolerait la ligne Bibliothèque sur la capture.
  await page.mouse.move(0, 0);
  await calme(page);
  await page.screenshot({ path: join(CAPTURES, `reglages-${format}-${NOMS_THEME[theme]}.png`) });
  // Les barres système simulées restent posées : les captures sont prises avant.
  await verifierBarres(page, juge, `${cas}, Réglages`);
  await ouvrirMenu(page);
  await verifierBarres(page, juge, `${cas}, menu`);
  juge.exige(sorties.length === 0, `${cas} : requêtes hors de l’appli : ${sorties.join(', ')}`);
  juge.exige(erreurs.length === 0, `${cas} : erreurs dans la page : ${erreurs.join(' | ')}`);
  await contexte.close();
}

try {
  await mkdir(CAPTURES, { recursive: true });
  for (const format of ['telephone', 'tablette-paysage']) {
    await essaiAccueil(format);
    await essaiReglages(format);
    await essaiMesVoyages(format);
    for (const depart of ['l’accueil', 'Réglages', 'Réglages direct']) await essaiNouveau(format, depart);
  }
  for (const theme of ['light', 'dark'])
    for (const format of Object.keys(TOUS_FORMATS)) await essaiFormat(format, theme);
} finally {
  await navigateur.close();
  await serveur.fermer();
}
juge.conclure(
  'Menu et Réglages',
  'menu fermé par ×, voile, Échap et retour ; Réglages ; Nouveau voyage par l’accueil ; 6 formats × 2 thèmes',
);
