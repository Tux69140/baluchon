// Phase 11 (docs/superpowers/specs/2026-10-30-phase-11-refaire-supprimer-design.md, « Le menu « ⋮ » d'un
// voyage » ; maquette validée le 2026-10-30, docs/maquettes/refaire/) : le menu « ⋮ » de chaque carte de
// Mes voyages.
// - aux quatre formats × 2 thèmes : chaque carte a son bouton « Actions du voyage « … » », passées
//   comprises, posé à part du lien, dans le coin haut droit ; le nom de la carte ne passe pas dessous ;
// - l'appui sur le bouton ouvre le menu sans ouvrir le voyage : « Refaire ce voyage », puis « Supprimer
//   ce voyage » en dernier, en danger ; Échap le ferme et rend le focus au bouton ;
// - l'appui sur la carte ouvre toujours le voyage ;
// - près du bas de l'écran, le menu s'ouvre au-dessus du bouton ; témoin : en haut, il s'ouvre dessous ;
// - le retour système ferme le menu et reste sur Mes voyages ;
// - menu ouvert, un appui sur une autre carte ferme le menu et ouvre ce voyage, qui reste à l'écran.
// Captures : menu fermé et ouvert, aux quatre formats × 2 thèmes (captures-travail/).
import { mkdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { chromium } from 'playwright';
import { attendreQue, calme } from './outils/attente.mjs';
import { demarrerServeur } from './outils/serveur.mjs';
import {
  CAPTURES,
  FORMATS,
  NOMS_THEME,
  RACINE,
  attendreEcran,
  creerJuge,
  ouvrir,
  verifierCommandes,
} from './outils/page.mjs';

const fr = JSON.parse(await readFile(join(RACINE, 'src/i18n/fr.json'), 'utf8'));
const remplir = (texte, valeurs) => texte.replace(/\{(\w+)\}/g, (_, nom) => String(valeurs[nom]));
const MAINTENANT = new Date('2026-10-12T10:00:00');
const QUATRE = ['telephone', 'tablette-portrait', 'tablette-paysage', 'ordinateur'];
const vu = e => JSON.stringify(e);
const v = (id, nom, depart, retour) => ({
  id,
  nom,
  destination: 'Quelque part',
  depart,
  retour,
  voyageurs: 2,
  modifieLe: 'x',
});
const VOYAGES = [
  v('c1', 'Vercors', '2026-10-10', '2026-10-13'),
  v('a1', 'Toussaint', '2026-10-24', '2026-11-01'),
  v('a2', 'Tour de Bretagne à vélo, de Saint-Malo à Quiberon par la côte sauvage', '2026-11-05', '2026-11-12'),
  v('a3', '<b>Été & "co"</b>', '2026-12-20', '2026-12-27'),
  v('p1', 'Pâques', '2026-04-03', '2026-04-06'),
  v('p2', 'Week-end', '2026-10-09', '2026-10-11'),
  v('p3', 'Été', '2026-07-01', '2026-07-15'),
  v('p4', 'Printemps', '2026-03-01', '2026-03-05'),
];
const nomDe = id => VOYAGES.find(x => x.id === id).nom;
const carte = id => `li.carte-avec-actions:has(> a.carte-voyage[href="#/voyage/${id}"])`;

const juge = creerJuge();
const serveur = await demarrerServeur();
const navigateur = await chromium.launch();

const ouvrirAccueil = (format, theme = 'light') =>
  ouvrir(navigateur, serveur.url, {
    taille: FORMATS[format],
    theme,
    maintenant: MAINTENANT,
    donnees: { voyages: VOYAGES },
    adresse: '#/voyages',
  });

// Chaque carte : son lien, son bouton (nom, place), et si le nom de la carte passe sous le bouton.
const lireCartes = page =>
  page.evaluate(() =>
    [...document.querySelectorAll('a.carte-voyage')].map(a => {
      const li = a.parentElement;
      const b = li.querySelector(':scope > .menu-voyage-bouton');
      const r = b?.getBoundingClientRect();
      const c = a.getBoundingClientRect();
      const nom = a.querySelector('.carte-voyage-nom').getBoundingClientRect();
      return {
        id: a.getAttribute('href').slice('#/voyage/'.length),
        avecActions: li.classList.contains('carte-avec-actions'),
        nom: b?.getAttribute('aria-label') ?? null,
        horsDuLien: Boolean(b) && !a.contains(b),
        coin: Boolean(r) && c.right - r.right < 16 && r.top - c.top < 16,
        libre: Boolean(r) && nom.right <= r.left,
      };
    }),
  );

const lireMenu = (page, id) =>
  page.evaluate(selecteur => {
    const li = document.querySelector(selecteur);
    const m = li?.querySelector('.menu-voyage');
    const b = li?.querySelector('.menu-voyage-bouton');
    const lignes = [...(m?.querySelectorAll('[role="menuitem"]') ?? [])];
    const rm = m?.getBoundingClientRect();
    const rb = b?.getBoundingClientRect();
    return {
      ouvert: Boolean(m?.matches(':popover-open')),
      lignes: lignes.map(l => l.textContent.trim()),
      danger: lignes.map(l => l.classList.contains('menu-voyage-danger')),
      focus: document.activeElement === b ? 'bouton' : lignes.indexOf(document.activeElement),
      dessous: rm && rb ? rm.top >= rb.bottom : null,
      dessus: rm && rb ? rm.bottom <= rb.top && rm.top >= 0 : null,
      aLEcran: rm ? rm.bottom <= innerHeight && rm.top >= 0 : null,
      ecran: document.querySelector('#app')?.dataset.ecran,
      adresse: location.hash,
    };
  }, carte(id));

async function ouvrirMenu(page, id) {
  await page.click(`${carte(id)} > .menu-voyage-bouton`);
  await attendreQue(page, s => document.querySelector(`${s} .menu-voyage`)?.matches(':popover-open'), carte(id));
  await calme(page);
}

try {
  await mkdir(CAPTURES, { recursive: true });
  for (const theme of ['light', 'dark']) {
    for (const format of QUATRE) {
      const cas = `${format}, ${NOMS_THEME[theme]}`;
      const capture = nom => page.screenshot({ path: join(CAPTURES, `${nom}-${format}-${NOMS_THEME[theme]}.png`) });
      const { contexte, page, erreurs } = await ouvrirAccueil(format, theme);
      const cartes = await lireCartes(page);
      juge.exige(cartes.length === VOYAGES.length, `${cas} : ${cartes.length} cartes`);
      for (const c of cartes) {
        juge.exige(
          c.avecActions && c.nom === remplir(fr.menuVoyage.actions, { nom: nomDe(c.id) }) && c.horsDuLien,
          `${cas} : bouton de la carte ${vu(c)}`,
        );
        juge.exige(c.coin && c.libre, `${cas} : place du bouton de la carte ${vu(c)}`);
      }
      await verifierCommandes(page, juge, cas);
      await capture('voyages-menu-ferme');

      // L'appui sur le bouton (une carte passée) ouvre son menu, sans ouvrir le voyage.
      await ouvrirMenu(page, 'p1');
      const ouvert = await lireMenu(page, 'p1');
      juge.exige(
        ouvert.ouvert &&
          vu(ouvert.lignes) === vu([fr.menuVoyage.refaire, fr.menuVoyage.supprimer]) &&
          vu(ouvert.danger) === vu([false, true]) &&
          ouvert.focus === 0 &&
          ouvert.aLEcran &&
          ouvert.ecran === 'voyages' &&
          ouvert.adresse === '#/voyages',
        `${cas} : menu de la carte ${vu(ouvert)}`,
      );
      await capture('voyages-menu-ouvert');
      await page.keyboard.press('Escape');
      await calme(page);
      const ferme = await lireMenu(page, 'p1');
      juge.exige(!ferme.ouvert && ferme.focus === 'bouton', `${cas} : Échap ${vu(ferme)}`);

      // Témoin : en haut de l'écran, le menu s'ouvre sous le bouton.
      await ouvrirMenu(page, 'c1');
      const haut = await lireMenu(page, 'c1');
      juge.exige(haut.dessous && haut.aLEcran, `${cas} : menu de la première carte ${vu(haut)}`);
      await page.keyboard.press('Escape');

      // L'appui sur la carte ouvre toujours le voyage.
      await page.click(`${carte('a1')} > a.carte-voyage`);
      await attendreEcran(page, 'voyage');
      juge.exige(
        (await page.evaluate(() => location.hash)) === '#/voyage/a1',
        `${cas} : la carte n'ouvre plus le voyage`,
      );
      juge.exige(erreurs.length === 0, `${cas} : erreurs ${erreurs.join(' | ')}`);
      await contexte.close();
    }
  }

  // Menu ouvert, un appui sur une autre carte (à la souris comme au doigt) : ce voyage s'ouvre et reste à
  // l'écran (le retrait de l'étape du menu ne le défait pas).
  for (const geste of ['click', 'tap']) {
    const { contexte, page, erreurs } = await ouvrirAccueil('telephone');
    await ouvrirMenu(page, 'c1');
    await page[geste](`${carte('a1')} > a.carte-voyage`);
    await attendreEcran(page, 'voyage');
    await calme(page);
    const etat = await page.evaluate(() => [document.querySelector('#app').dataset.ecran, location.hash]);
    juge.exige(vu(etat) === vu(['voyage', '#/voyage/a1']), `${geste} sur une autre carte menu ouvert : ${vu(etat)}`);
    juge.exige(erreurs.length === 0, `${geste} sur une autre carte : erreurs ${erreurs.join(' | ')}`);
    await contexte.close();
  }

  // Près du bas de l'écran, le menu s'ouvre au-dessus du bouton ; le retour système le ferme, on reste.
  {
    const { contexte, page, erreurs } = await ouvrirAccueil('telephone');
    await page.evaluate(s => {
      const b = document.querySelector(`${s} > .menu-voyage-bouton`);
      scrollBy(0, b.getBoundingClientRect().bottom - (innerHeight - 60));
    }, carte('p2'));
    await calme(page);
    await ouvrirMenu(page, 'p2');
    const bas = await lireMenu(page, 'p2');
    juge.exige(bas.dessus && bas.aLEcran, `près du bas : menu ${vu(bas)}`);
    await page.goBack({ timeout: 3000 }).catch(() => null);
    await calme(page);
    const apres = await lireMenu(page, 'p2');
    juge.exige(!apres.ouvert && apres.ecran === 'voyages', `retour, menu de la carte : ${vu(apres)}`);
    juge.exige(erreurs.length === 0, `près du bas : erreurs ${erreurs.join(' | ')}`);
    await contexte.close();
  }
} finally {
  await navigateur.close();
  await serveur.fermer();
}
juge.conclure('Menu « ⋮ » des cartes', '4 formats × 2 thèmes, carte et bouton, Échap, près du bas, retour système');
