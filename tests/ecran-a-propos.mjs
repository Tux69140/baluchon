// Phase 13 (docs/PLAN.md, maquette validée, docs/maquettes/bibliotheque-depart/) : l'écran « À propos ».
// - Le menu montre « À propos » en dernier ; l'entrée mène à l'écran, titre « À propos ».
// - L'écran dit « Version 0.1.0 » (lue dans package.json), la licence GPL-3.0-or-later, Phosphor et Baumans,
//   et la ligne « Traduction » (texte original en français) ; ni « GitHub » ni « BagPacker » dans la page.
// - Les deux liens ouvrent le site par le navigateur du système (ici : window.open, espionné ; aucune requête
//   ne quitte l'appli) : « Découvrir Baluchon » et « Nouvelles versions », aux adresses de la conception.
// - La touche retour (Android) ramène à l'accueil ; le menu ouvert sur l'écran marque « À propos » comme courant.
// - Cibles de 44 px, pas de défilement de côté, rien sous les barres système, deux colonnes dès 900 px de
//   large, clair et sombre ; captures a-propos-….
import { mkdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { chromium } from 'playwright';
import { attendreQue, calme } from './outils/attente.mjs';
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
import { demarrerServeur } from './outils/serveur.mjs';

const fr = JSON.parse(await readFile(join(RACINE, 'src/i18n/fr.json'), 'utf8'));
const { version } = JSON.parse(await readFile(join(RACINE, 'package.json'), 'utf8'));
const A = fr.aPropos;
const DONNEES = { toucheRetour: true, voyages: [] };
const SITE = 'https://baluchon.biovibralyon.fr/';
const VERSIONS = 'https://baluchon.biovibralyon.fr/telecharger';
const vu = e => JSON.stringify(e);
const net = texte => texte.replace(/\s+/g, ' ');

const juge = creerJuge();
const serveur = await demarrerServeur();
const navigateur = await chromium.launch();

async function ouvrirEcran(taille, theme = 'light', adresse = '#/a-propos') {
  const ouvert = await ouvrir(navigateur, serveur.url, { taille, theme, donnees: DONNEES, adresse });
  await attendreEcran(ouvert.page, adresse === '#/a-propos' ? 'a-propos' : 'voyages');
  return ouvert;
}

// Le menu ouvert : ses entrées dans l'ordre et celles marquées courantes.
async function lireMenu(page) {
  await page.click('[data-action="menu"]');
  await attendreQue(page, () => document.querySelector('dialog.tiroir[open]') !== null);
  await calme(page);
  return page.evaluate(() => {
    const liens = [...document.querySelectorAll('dialog.tiroir .tiroir-lien')];
    return {
      entrees: liens.map(a => a.textContent.trim()),
      courantes: liens.filter(a => a.getAttribute('aria-current') === 'page').map(a => a.textContent.trim()),
    };
  });
}

// Le menu : « À propos » en dernier, et il mène à l'écran ; la touche retour revient à l'accueil.
async function essaiMenu() {
  const { page, contexte, erreurs } = await ouvrirEcran(FORMATS.telephone, 'light', '#/voyages');
  const menu = await lireMenu(page);
  juge.exige(menu.entrees.at(-1) === fr.menu.aPropos && menu.entrees.length === 4, `menu : ${vu(menu)}`);
  await page.click(`dialog.tiroir .tiroir-lien:text-is("${fr.menu.aPropos}")`);
  await attendreEcran(page, 'a-propos');
  const titre = await page.evaluate(() => document.querySelector('#app h1')?.textContent.trim());
  juge.exige(titre === A.titre, `titre de l’écran : ${vu(titre)}`);
  const ouvertSur = await lireMenu(page);
  juge.exige(vu(ouvertSur.courantes) === vu([fr.menu.aPropos]), `menu ouvert sur À propos : ${vu(ouvertSur)}`);
  await page.keyboard.press('Escape');
  await attendreQue(page, () => !document.querySelector('dialog.tiroir'));
  await page.evaluate(() => window.toucheRetour());
  await attendreEcran(page, 'voyages');
  const sorties = await page.evaluate(() => window.sortiesDemandees);
  juge.exige(sorties === 0, `touche retour : l’appli est restée (${sorties} sortie(s))`);
  juge.exige(erreurs.length === 0, `menu : erreurs dans la page : ${erreurs.join(' | ')}`);
  await contexte.close();
}

// Le contenu : version, licence, crédits, traduction ; aucun mot interdit.
async function essaiContenu() {
  const { page, contexte, erreurs } = await ouvrirEcran(FORMATS.telephone);
  const texte = net(await page.evaluate(() => document.querySelector('#app main').textContent));
  for (const attendu of [`Version ${version}`, 'GPL-3.0-or-later', 'Phosphor', 'Baumans', A.traduction.texte])
    juge.exige(texte.includes(net(attendu)), `contenu : « ${attendu} » absent`);
  for (const interdit of ['GitHub', 'BagPacker'])
    juge.exige(!texte.toLowerCase().includes(interdit.toLowerCase()), `contenu : « ${interdit} » présent`);
  const liens = await page.evaluate(() =>
    [...document.querySelectorAll('#app a.a-propos-lien')].map(a => ({
      nom: a.querySelector('b').textContent.trim(),
      aide: a.getAttribute('aria-label'),
    })),
  );
  juge.exige(vu(liens.map(l => l.nom)) === vu([A.decouvrir.titre, A.versions.titre]), `liens : ${vu(liens)}`);
  juge.exige(
    liens.every(l => l.aide.includes(A.navigateur)),
    `liens : le navigateur n’est pas annoncé ${vu(liens)}`,
  );
  juge.exige(erreurs.length === 0, `contenu : erreurs dans la page : ${erreurs.join(' | ')}`);
  await contexte.close();
}

// Chaque lien appelle window.open (espionné) avec son adresse, sans quitter la page.
async function essaiLiens() {
  const { page, contexte, erreurs, sorties } = await ouvrirEcran(FORMATS.telephone);
  await page.evaluate(() => {
    window.ouverts = [];
    window.open = (...args) => window.ouverts.push(args);
  });
  const attendus = [
    [A.decouvrir.titre, SITE],
    [A.versions.titre, VERSIONS],
  ];
  for (const [nom, adresse] of attendus) {
    await page.click(`#app a.a-propos-lien:has(b:text-is("${nom}"))`);
    await calme(page);
    const ouverts = await page.evaluate(() => window.ouverts);
    juge.exige(
      ouverts.at(-1)?.[0] === adresse && ouverts.at(-1)[1] === '_blank' && ouverts.at(-1)[2] === 'noopener',
      `« ${nom} » ouvre ${vu(ouverts.at(-1))}`,
    );
    const ecran = await page.evaluate(() => [document.querySelector('#app').dataset.ecran, location.hash]);
    juge.exige(vu(ecran) === vu(['a-propos', '#/a-propos']), `« ${nom} » : la page a bougé ${vu(ecran)}`);
  }
  const total = await page.evaluate(() => window.ouverts.length);
  juge.exige(total === 2, `deux appuis, ${total} ouvertures`);
  juge.exige(sorties.length === 0, `requêtes hors de l’appli : ${sorties.join(', ')}`);
  juge.exige(erreurs.length === 0, `liens : erreurs dans la page : ${erreurs.join(' | ')}`);
  await contexte.close();
}

// Chaque format, chaque thème : cibles, débordement, barres système, deux colonnes dès 900 px.
async function essaiFormat(format, theme) {
  const cas = `${format}, ${NOMS_THEME[theme]}`;
  const taille = FORMATS[format];
  const { page, contexte, erreurs, sorties } = await ouvrirEcran(taille, theme);
  await verifierCommandes(page, juge, cas);
  const colonnes = await page.evaluate(() => {
    const [liens, bref] = [...document.querySelectorAll('.a-propos-colonnes > section')].map(s =>
      s.getBoundingClientRect(),
    );
    return { cote: Math.abs(liens.top - bref.top) < 2 && liens.right <= bref.left + 1 };
  });
  juge.exige(colonnes.cote === taille.width >= 900, `${cas} : colonnes côte à côte = ${colonnes.cote}`);
  await page.mouse.move(0, 0);
  await page.screenshot({ path: join(CAPTURES, `a-propos-${format}-${NOMS_THEME[theme]}.png`), fullPage: true });
  await verifierBarres(page, juge, cas);
  juge.exige(sorties.length === 0, `${cas} : requêtes hors de l’appli : ${sorties.join(', ')}`);
  juge.exige(erreurs.length === 0, `${cas} : erreurs dans la page : ${erreurs.join(' | ')}`);
  await contexte.close();
}

// Téléphone étroit (360 px) : l'adresse affichée ne se coupe jamais au milieu d'un mot, seulement après « / ».
async function essaiAdresseEtroite() {
  const { page, contexte, erreurs } = await ouvrirEcran({ width: 360, height: 640 });
  const lignes = await page.evaluate(() => {
    const noeud = document.querySelector('#app a.a-propos-lien[href$="/telecharger"] .reglage-texte > span');
    const texte = noeud.textContent;
    const courant = [];
    const plage = document.createRange();
    const par = [];
    const parcours = document.createTreeWalker(noeud, NodeFilter.SHOW_TEXT);
    let debut = 0;
    for (let n = parcours.nextNode(); n; n = parcours.nextNode()) {
      for (let i = 0; i < n.length; i++) {
        plage.setStart(n, i);
        plage.setEnd(n, i + 1);
        par.push(Math.round(plage.getBoundingClientRect().top));
      }
    }
    for (let i = 1; i < par.length; i++) if (par[i] !== par[i - 1]) courant.push(texte.slice(debut, (debut = i)));
    courant.push(texte.slice(debut));
    return { texte, lignes: courant };
  });
  const coupures = lignes.lignes.slice(0, -1);
  juge.exige(
    coupures.every(l => l.endsWith('/')),
    `360 px : l’adresse se coupe ailleurs qu’après « / » ${vu(lignes.lignes)}`,
  );
  juge.exige(
    lignes.texte === 'baluchon.biovibralyon.fr/telecharger',
    `360 px : texte de l’adresse ${vu(lignes.texte)}`,
  );
  await page.screenshot({ path: join(CAPTURES, 'a-propos-360.png'), fullPage: true });
  juge.exige(erreurs.length === 0, `360 px : erreurs dans la page : ${erreurs.join(' | ')}`);
  await contexte.close();
}

try {
  await mkdir(CAPTURES, { recursive: true });
  await essaiMenu();
  await essaiContenu();
  await essaiLiens();
  await essaiAdresseEtroite();
  for (const theme of ['light', 'dark']) for (const format of Object.keys(FORMATS)) await essaiFormat(format, theme);
} finally {
  await navigateur.close();
  await serveur.fermer();
}
juge.conclure(
  'À propos',
  'menu, contenu, deux liens (adresses), retour ; 5 formats × 2 thèmes, deux colonnes dès 900 px',
);
