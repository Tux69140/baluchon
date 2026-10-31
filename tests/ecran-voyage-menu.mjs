// Phase 11 (décision 13 de docs/superpowers/specs/2026-10-30-phase-11-refaire-supprimer-design.md ;
// maquette validée le 2026-10-30, docs/maquettes/refaire/) : le menu « ⋮ » au bout du titre du voyage.
// - aux quatre formats × 2 thèmes : le bouton « Actions du voyage « … » » est dans le bloc du titre, à
//   droite du nom, calé sur sa première ligne ; plus aucun bouton « Modifier le voyage » ;
// - ouvert : « Modifier ce voyage », « Refaire ce voyage », puis « Supprimer ce voyage » en dernier, en
//   danger ; le focus sur la première ligne ; flèches, Début et Fin passent d'une ligne à l'autre ;
// - Échap le ferme et rend le focus au bouton ; un appui ailleurs le ferme ;
// - le retour système (page.goBack) le ferme sans quitter le voyage ; témoin : le retour suivant quitte
//   le voyage pour Mes voyages (aucune étape laissée derrière) ;
// - ouvert pendant que la liste se range (une seconde après une coche), il reste ouvert, et le retour
//   le ferme toujours ;
// - « Modifier ce voyage » ouvre l'assistant de modification, qui reste à l'écran ;
// - menu ouvert, un appui sur la case d'un objet ferme le menu sans rien mettre dans le sac (décision R10) ;
//   témoins : menu fermé, le même appui et Entrée au clavier en mettent une pièce ;
// - menu ouvert, un appui sur « Mes voyages » le ferme et mène à Mes voyages, qui reste à l'écran ;
// - vigilance 5 : un nom de voyage long ne fait jamais défiler la page de côté, et le bouton reste sur
//   la première ligne du titre.
// Captures : menu fermé et ouvert, nom long, aux quatre formats × 2 thèmes (captures-travail/).
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
  lireStockage,
  ouvrir,
  verifierCommandes,
} from './outils/page.mjs';
import { DONNEES, NOM } from './outils/voyage-essai.mjs';

const fr = JSON.parse(await readFile(join(RACINE, 'src/i18n/fr.json'), 'utf8'));
const remplir = (texte, valeurs) => texte.replace(/\{(\w+)\}/g, (_, nom) => String(valeurs[nom]));
const LONG = 'Tour de Bretagne à vélo, de Saint-Malo à Quiberon par la côte sauvage';
const AVEC_LONG = { ...DONNEES, voyages: DONNEES.voyages.map(v => (v.id === 'v1' ? { ...v, nom: LONG } : v)) };
const QUATRE = ['telephone', 'tablette-portrait', 'tablette-paysage', 'ordinateur'];
const BOUTON = '.voyage-titre .menu-voyage-bouton';
const MENU = '.voyage-titre .menu-voyage';
const vu = e => JSON.stringify(e);

const juge = creerJuge();
const serveur = await demarrerServeur();
const navigateur = await chromium.launch();

// Le voyage v1 ouvert depuis Mes voyages : un retour qui quitte le voyage y ramène.
async function ouvrirVoyage(format, { theme = 'light', donnees = DONNEES } = {}) {
  const ouvert = await ouvrir(navigateur, serveur.url, {
    taille: FORMATS[format],
    theme,
    donnees,
    adresse: '#/voyages',
  });
  await ouvert.page.click('a.carte-voyage[href="#/voyage/v1"]');
  await attendreEcran(ouvert.page, 'voyage');
  return ouvert;
}

// Le bloc du titre : le bouton, son nom, sa place par rapport à la première ligne du nom.
const lireTitre = page =>
  page.evaluate(
    ({ bouton }) => {
      const b = document.querySelector(bouton);
      const h1 = document.querySelector('.voyage-titre > h1');
      if (!b || !h1) return null;
      const r = b.getBoundingClientRect();
      const t = h1.getBoundingClientRect();
      const plage = document.createRange();
      plage.selectNodeContents(h1);
      const premiere = plage.getClientRects()[0];
      const milieu = x => x.top + x.height / 2;
      const bloc = b.closest('.gf-gauche, main').getBoundingClientRect();
      return {
        nom: b.getAttribute('aria-label'),
        ouvert: b.getAttribute('aria-expanded'),
        aDroite: r.left >= t.right - 1,
        // Le bouton centré sur la première ligne du nom, à quelques pixels près.
        premiereLigne: Math.abs(milieu(r) - milieu(premiere)) <= 6,
        lignes: Math.round(t.height / parseFloat(getComputedStyle(h1).lineHeight)),
        // Rien du bouton ne sort du bloc qui le contient (le bloc du voyage défile seul en trois colonnes).
        dansLeBloc: r.top >= bloc.top - 0.5 && r.right <= bloc.right + 0.5,
        largeurPage: document.documentElement.scrollWidth <= document.documentElement.clientWidth,
        ancienBouton: document.querySelectorAll('.voyage-modifier, #app [data-action="modifier"]').length,
      };
    },
    { bouton: BOUTON },
  );

// Le menu : ouvert ou non, ses lignes, la ligne qui a le focus.
const lireMenu = page =>
  page.evaluate(
    ({ menu, bouton }) => {
      const m = document.querySelector(menu);
      const lignes = [...(m?.querySelectorAll('[role="menuitem"]') ?? [])];
      const el = document.activeElement;
      return {
        ouvert: Boolean(m?.matches(':popover-open')),
        lignes: lignes.map(l => l.textContent.trim()),
        danger: lignes.map(l => l.classList.contains('menu-voyage-danger')),
        focus: el === document.querySelector(bouton) ? 'bouton' : lignes.indexOf(el),
        ecran: document.querySelector('#app')?.dataset.ecran,
        adresse: location.hash,
      };
    },
    { menu: MENU, bouton: BOUTON },
  );

const ouvrirMenu = async page => {
  await page.click(BOUTON);
  await attendreQue(page, m => document.querySelector(m)?.matches(':popover-open'), MENU);
  await calme(page);
};
const LIGNES = [fr.menuVoyage.modifier, fr.menuVoyage.refaire, fr.menuVoyage.supprimer];

async function retour(page) {
  await page.goBack({ timeout: 3000 }).catch(() => null);
  await calme(page);
  return lireMenu(page);
}

try {
  await mkdir(CAPTURES, { recursive: true });
  for (const theme of ['light', 'dark']) {
    for (const format of QUATRE) {
      const cas = `${format}, ${NOMS_THEME[theme]}`;
      const capture = nom => page.screenshot({ path: join(CAPTURES, `${nom}-${format}-${NOMS_THEME[theme]}.png`) });
      const { contexte, page, erreurs } = await ouvrirVoyage(format, { theme });
      const titre = await lireTitre(page);
      juge.exige(
        titre?.nom === remplir(fr.menuVoyage.actions, { nom: NOM }) && titre.ouvert === 'false',
        `${cas} : bouton du titre ${vu(titre)}`,
      );
      juge.exige(titre?.aDroite && titre.premiereLigne && titre.dansLeBloc, `${cas} : place du bouton ${vu(titre)}`);
      juge.exige(titre?.ancienBouton === 0, `${cas} : « Modifier le voyage » encore là (${titre?.ancienBouton})`);
      await capture('voyage-menu-ferme');

      // Ouvert : trois lignes dans l'ordre, la suppression en dernier, en danger ; le focus sur la première.
      await ouvrirMenu(page);
      const ouvert = await lireMenu(page);
      juge.exige(
        ouvert.ouvert &&
          vu(ouvert.lignes) === vu(LIGNES) &&
          vu(ouvert.danger) === vu([false, false, true]) &&
          ouvert.focus === 0,
        `${cas} : menu ouvert ${vu(ouvert)}`,
      );
      juge.exige((await lireTitre(page))?.ouvert === 'true', `${cas} : aria-expanded du bouton ouvert`);
      await verifierCommandes(page, juge, `${cas}, menu ouvert`);
      await capture('voyage-menu-ouvert');
      const parcours = [];
      for (const touche of ['ArrowDown', 'End', 'ArrowDown', 'ArrowUp', 'Home', 'ArrowUp']) {
        await page.keyboard.press(touche);
        parcours.push((await lireMenu(page)).focus);
      }
      juge.exige(vu(parcours) === vu([1, 2, 0, 2, 0, 2]), `${cas} : flèches, Début, Fin ${vu(parcours)}`);

      // Échap : fermé, focus rendu au bouton.
      await page.keyboard.press('Escape');
      await calme(page);
      const echap = await lireMenu(page);
      juge.exige(!echap.ouvert && echap.focus === 'bouton', `${cas} : Échap ${vu(echap)}`);

      // Un appui ailleurs (sur le nom) le ferme.
      await ouvrirMenu(page);
      await page.click('.voyage-titre > h1');
      await calme(page);
      juge.exige(!(await lireMenu(page)).ouvert, `${cas} : appui ailleurs, le menu reste ouvert`);
      juge.exige(erreurs.length === 0, `${cas} : erreurs ${erreurs.join(' | ')}`);
      await contexte.close();

      // Vigilance 5 : le nom long passe à la ligne, la page ne défile pas de côté, le bouton reste en haut.
      const long = await ouvrirVoyage(format, { theme, donnees: AVEC_LONG });
      const l = await lireTitre(long.page);
      juge.exige(
        l?.largeurPage && l.aDroite && l.premiereLigne && l.dansLeBloc && l.lignes >= 2,
        `${cas}, nom long : ${vu(l)}`,
      );
      await long.page.screenshot({ path: join(CAPTURES, `voyage-menu-long-${format}-${NOMS_THEME[theme]}.png`) });
      await ouvrirMenu(long.page);
      await long.page.screenshot({
        path: join(CAPTURES, `voyage-menu-long-ouvert-${format}-${NOMS_THEME[theme]}.png`),
      });
      juge.exige(long.erreurs.length === 0, `${cas}, nom long : erreurs ${long.erreurs.join(' | ')}`);
      await long.contexte.close();
    }
  }

  for (const format of ['telephone', 'tablette-paysage']) {
    // Le retour système ferme le menu sans quitter le voyage ; le suivant quitte le voyage (témoin).
    {
      const { contexte, page, erreurs } = await ouvrirVoyage(format);
      await ouvrirMenu(page);
      const apres = await retour(page);
      juge.exige(
        !apres.ouvert && apres.ecran === 'voyage' && apres.adresse === '#/voyage/v1',
        `${format}, retour : ${vu(apres)}`,
      );
      const suivant = await retour(page);
      juge.exige(suivant.ecran === 'voyages', `${format}, second retour : ${vu(suivant)}`);
      juge.exige(erreurs.length === 0, `${format}, retour : erreurs ${erreurs.join(' | ')}`);
      await contexte.close();
    }

    // Ouvert pendant que la liste se range (une seconde après une coche) : il reste ouvert, et le retour
    // le ferme encore ; le suivant quitte le voyage.
    {
      const { contexte, page, erreurs } = await ouvrirVoyage(format);
      await page.click('[data-action="case"][data-id="o-tsh"]');
      await ouvrirMenu(page);
      await page.evaluate(m => (document.querySelector(m).dataset.avant = ''), MENU);
      const redessine = await attendreQue(
        page,
        m => document.querySelector(m) && !('avant' in document.querySelector(m).dataset),
        MENU,
      );
      await calme(page);
      const pendant = await lireMenu(page);
      juge.exige(redessine && pendant.ouvert, `${format}, liste rangée menu ouvert : ${vu({ redessine, pendant })}`);
      const apres = await retour(page);
      juge.exige(!apres.ouvert && apres.ecran === 'voyage', `${format}, rangée puis retour : ${vu(apres)}`);
      const suivant = await retour(page);
      juge.exige(suivant.ecran === 'voyages', `${format}, rangée, second retour : ${vu(suivant)}`);
      juge.exige(erreurs.length === 0, `${format}, rangée : erreurs ${erreurs.join(' | ')}`);
      await contexte.close();
    }

    // Décision R10 (relecture finale) : menu ouvert, l'appui sur la case d'un objet (à la souris comme au
    // doigt) ferme le menu et ne fait rien d'autre : rien de plus dans le sac, ni à l'écran ni gardé.
    // Témoins : le même appui, menu fermé, met une pièce dans le sac ; au clavier, Entrée sur la case aussi.
    for (const geste of ['click', 'tap']) {
      const { contexte, page, erreurs } = await ouvrirVoyage(format);
      const CASE = '[data-action="case"][data-id="o-tsh"]';
      const sac = async () => [
        (await lireStockage(page)).objetsDuVoyage.find(o => o.id === 'o-tsh').dansLeSac,
        await page.getAttribute(CASE, 'aria-label'),
      ];
      const avant = await sac();
      await ouvrirMenu(page);
      await page[geste](CASE);
      await calme(page);
      const ferme = await lireMenu(page);
      const apres = await sac();
      juge.exige(
        !ferme.ouvert && ferme.ecran === 'voyage' && vu(apres) === vu(avant),
        `${format}, ${geste} sur une case menu ouvert : ${vu({ ferme, avant, apres })}`,
      );
      await page[geste](CASE);
      const temoin = await attendreQue(
        page,
        id => JSON.parse(localStorage.getItem('baluchon-essai')).objetsDuVoyage.find(o => o.id === id).dansLeSac === 1,
        'o-tsh',
      );
      juge.exige(temoin, `${format}, ${geste} sur une case menu fermé : rien dans le sac ${vu(await sac())}`);
      await page.focus(CASE);
      await page.keyboard.press('Enter');
      const clavier = await attendreQue(
        page,
        id => JSON.parse(localStorage.getItem('baluchon-essai')).objetsDuVoyage.find(o => o.id === id).dansLeSac === 2,
        'o-tsh',
      );
      juge.exige(clavier, `${format}, Entrée sur une case : ${vu(await sac())}`);
      juge.exige(erreurs.length === 0, `${format}, case menu ouvert : erreurs ${erreurs.join(' | ')}`);
      await contexte.close();
    }

    // Menu ouvert, un appui sur le lien « Mes voyages » (à la souris comme au doigt) : le menu se ferme dès
    // l'appui, et Mes voyages s'ouvre et reste à l'écran (le retrait de l'étape du menu ne le défait pas).
    for (const geste of ['click', 'tap']) {
      const { contexte, page, erreurs } = await ouvrirVoyage(format);
      await ouvrirMenu(page);
      await page[geste]('.lien-retour');
      await attendreEcran(page, 'voyages');
      await calme(page);
      const etat = await lireMenu(page);
      juge.exige(
        etat.ecran === 'voyages' && etat.adresse === '#/voyages',
        `${format}, ${geste} sur « Mes voyages » menu ouvert : ${vu(etat)}`,
      );
      juge.exige(erreurs.length === 0, `${format}, lien menu ouvert : erreurs ${erreurs.join(' | ')}`);
      await contexte.close();
    }

    // « Modifier ce voyage » ouvre l'assistant de modification, qui reste à l'écran (l'étape du menu
    // est partie avant le changement d'adresse).
    {
      const { contexte, page, erreurs } = await ouvrirVoyage(format);
      await ouvrirMenu(page);
      await page.click(`${MENU} [data-menu="modifier"]`);
      await attendreEcran(page, 'modifier-voyage');
      await calme(page);
      const etat = await lireMenu(page);
      juge.exige(
        etat.ecran === 'modifier-voyage' && etat.adresse === '#/voyage/v1/modifier',
        `${format}, Modifier ce voyage : ${vu(etat)}`,
      );
      juge.exige(erreurs.length === 0, `${format}, Modifier : erreurs ${erreurs.join(' | ')}`);
      await contexte.close();
    }
  }
} finally {
  await navigateur.close();
  await serveur.fermer();
}
juge.conclure(
  'Menu « ⋮ » du voyage',
  '4 formats × 2 thèmes, clavier, Échap, appui ailleurs, retour système, rangement, Modifier, nom long',
);
