// Nouveau voyage en fenêtre modale (décisions du chef de projet et du contrôleur, 2026-10-07), hors
// navigation (voir ecran-retour.mjs pour la fermeture) :
// - ouverte depuis Mes voyages par le bouton flottant, sur la tablette (1280 × 800, au doigt) : fenêtre
//   modale nommée par son titre « Nouveau voyage », Mes voyages derrière ; un « × » nommé « Fermer » et
//   « Annuler » ; pas de lien « Mes voyages » ; le focus est sur le titre, sans contour (ce n'est pas
//   une commande), pas sur le nom (le clavier masquerait aussitôt le calendrier) ; au clavier, Tab et
//   Maj+Tab n'atteignent jamais Mes voyages derrière — témoin : Tab passe bien par « × », « Annuler »
//   et « Créer le voyage » ;
// - à l'ordinateur (souris) : le focus est sur le nom ;
// - au téléphone : écran plein, titre de l'écran, lien « Mes voyages », ni « × » ni « Annuler » ;
// - panne d'enregistrement dans la fenêtre en une colonne (800 × 1280) : le message s'affiche en
//   entier dans le pied, sans rien faire bouger (fenêtre, « Annuler », « Créer le voyage ») ;
// - ouverte par son adresse, au doigt : le titre a le focus, sans contour ;
// - clavier ouvert sur la tablette en paysage (fenêtre réduite de 1280 × 800 à 1280 × 420) : la même
//   fenêtre modale reste ouverte, toujours sur deux colonnes, « Créer le voyage » visible, le corps
//   défile, la saisie est gardée ;
// - ouverture animée (fondu et montée) ; aucune animation si l'appareil en demande moins.
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { chromium } from 'playwright';
import { calme } from './outils/attente.mjs';
import { demarrerServeur } from './outils/serveur.mjs';
import { FORMATS, RACINE, attendreEcran, creerJuge, ouvrir } from './outils/page.mjs';

const fr = JSON.parse(await readFile(join(RACINE, 'src/i18n/fr.json'), 'utf8'));
const MAINTENANT = new Date('2026-10-06T10:00:00');
const PAQUES = {
  id: 'p1',
  nom: 'Pâques',
  destination: '',
  depart: '2026-04-03',
  retour: '2026-04-06',
  voyageurs: 2,
  modifieLe: 'x',
};

// Ce que la personne voit de la fenêtre et autour d'elle.
const vue = page =>
  page.evaluate(() => {
    const fenetre = document.querySelector('dialog');
    const visible = s => [...document.querySelectorAll(s)].some(el => el.getBoundingClientRect().width > 0);
    const titre = fenetre && document.getElementById(fenetre.getAttribute('aria-labelledby'));
    return {
      modale: Boolean(fenetre?.matches(':modal')),
      titre: titre && fenetre.contains(titre) ? titre.textContent.trim() : null,
      derriere: document.querySelector('main h1')?.textContent.trim(),
      h1: document.querySelector('h1')?.textContent.trim(),
      fermer: visible('dialog .bouton-fermer')
        ? document.querySelector('.bouton-fermer').getAttribute('aria-label')
        : null,
      annuler: visible('[data-fermer].bouton-secondaire')
        ? document.querySelector('[data-fermer].bouton-secondaire').textContent.trim()
        : null,
      lienRetour: visible('.lien-retour'),
      focus: document.activeElement?.id || null,
      nom: document.querySelector('#nom')?.value,
      depart: document.querySelector('.jour-depart')?.dataset.jour ?? null,
      retour: document.querySelector('.jour-retour')?.dataset.jour ?? null,
    };
  });

// L'élément qui a le focus : dans la fenêtre ou non, et lequel. Après le dernier bouton, Tab passe au
// navigateur lui-même (aucun élément de la page n'a le focus) : ce n'est pas l'écran de derrière.
const focusActuel = page =>
  page.evaluate(() => {
    const el = document.activeElement;
    return {
      dedans: !el || el === document.body || Boolean(el.closest('dialog')),
      quoi: el?.getAttribute('aria-label') || el?.textContent.trim().slice(0, 30) || el?.id || el?.tagName,
    };
  });

const juge = creerJuge();
const serveur = await demarrerServeur();
const navigateur = await chromium.launch();
try {
  // Ouverte depuis Mes voyages, en tablette.
  {
    const { contexte, page, erreurs } = await ouvrir(navigateur, serveur.url, {
      taille: FORMATS['tablette-paysage'],
      theme: 'light',
      maintenant: MAINTENANT,
      donnees: { voyages: [PAQUES] },
    });
    await attendreEcran(page, 'voyages');
    await page.click('.bouton-flottant');
    await attendreEcran(page, 'nouveau-voyage');
    const v = await vue(page);
    juge.exige(v.modale, 'tablette : pas de fenêtre modale');
    juge.exige(v.titre === fr.nouveauVoyage.titre, `tablette : fenêtre nommée « ${v.titre} »`);
    juge.exige(v.derriere === fr.voyages.titre, `tablette : derrière la fenêtre, « ${v.derriere} »`);
    juge.exige(v.fermer === fr.fenetre.fermer, `tablette : bouton « × » nommé « ${v.fermer} »`);
    juge.exige(v.annuler === fr.fenetre.annuler, `tablette : bouton « Annuler » absent (${v.annuler})`);
    juge.exige(!v.lienRetour, 'tablette : le lien « Mes voyages » est resté');
    juge.exige(v.focus === 'titre-nouveau-voyage', `tablette : à l’ouverture, le focus est sur « ${v.focus} »`);
    const vus = new Set();
    for (let i = 0; i < 45; i++) {
      await page.keyboard.press('Tab');
      const f = await focusActuel(page);
      juge.exige(f.dedans, `tablette : Tab n° ${i + 1} sort de la fenêtre, sur « ${f.quoi} »`);
      vus.add(f.quoi);
    }
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Shift+Tab');
      const f = await focusActuel(page);
      juge.exige(f.dedans, `tablette : Maj+Tab n° ${i + 1} sort de la fenêtre, sur « ${f.quoi} »`);
    }
    for (const attendu of [fr.fenetre.fermer, fr.fenetre.annuler, fr.nouveauVoyage.creer])
      juge.exige(vus.has(attendu), `tablette : témoin, Tab ne passe pas par « ${attendu} » (${[...vus]})`);
    juge.exige(erreurs.length === 0, `tablette : erreurs dans la page : ${erreurs.join(' | ')}`);
    await contexte.close();
  }

  // À l'ordinateur, à la souris : le focus est sur le nom.
  {
    const { contexte, page } = await ouvrir(navigateur, serveur.url, {
      taille: FORMATS['tablette-paysage'],
      ecran: { width: 1920, height: 1080 },
      tactile: false,
      theme: 'light',
      maintenant: MAINTENANT,
      adresse: '#/nouveau-voyage',
    });
    await attendreEcran(page, 'nouveau-voyage');
    const v = await vue(page);
    juge.exige(v.modale && v.focus === 'nom', `souris : à l’ouverture, le focus est sur « ${v.focus} »`);
    await contexte.close();
  }

  // Au téléphone : écran plein.
  {
    const { contexte, page } = await ouvrir(navigateur, serveur.url, {
      taille: FORMATS.telephone,
      theme: 'light',
      maintenant: MAINTENANT,
      adresse: '#/nouveau-voyage',
    });
    await attendreEcran(page, 'nouveau-voyage');
    const v = await vue(page);
    juge.exige(!v.modale, 'téléphone : une fenêtre modale s’est ouverte');
    juge.exige(v.h1 === fr.nouveauVoyage.titre, `téléphone : titre « ${v.h1} »`);
    juge.exige(v.lienRetour, 'téléphone : pas de lien « Mes voyages »');
    juge.exige(!v.fermer && !v.annuler, `téléphone : « × » (${v.fermer}) ou « Annuler » (${v.annuler}) visible`);
    await contexte.close();
  }

  // Panne d'enregistrement dans la fenêtre en une colonne : rien ne bouge.
  {
    const { contexte, page } = await ouvrir(navigateur, serveur.url, {
      taille: FORMATS['tablette-portrait'],
      theme: 'light',
      maintenant: MAINTENANT,
      donnees: { pannes: ['creerVoyage'] },
      adresse: '#/nouveau-voyage',
    });
    await attendreEcran(page, 'nouveau-voyage');
    const places = () =>
      page.evaluate(() =>
        ['dialog', '[data-fermer].bouton-secondaire', 'button[type=submit]'].map(s => {
          const r = document.querySelector(s)?.getBoundingClientRect() ?? {};
          return `${r.left},${r.top},${r.width},${r.height}`;
        }),
      );
    const avant = await places();
    await page.fill('#nom', 'Vercors');
    await page.click('[data-jour="2026-10-10"]');
    await page.click('[data-jour="2026-10-13"]');
    await page.click('button[type=submit]');
    await page.waitForFunction(() => document.querySelector('#erreur-creation').textContent.trim() !== '');
    await calme(page);
    const apres = await places();
    juge.exige(avant.join(' ') === apres.join(' '), `panne : la fenêtre a bougé ${avant} → ${apres}`);
    const message = await page.evaluate(() => {
      const m = document.querySelector('#erreur-creation').getBoundingClientRect();
      const pied = document.querySelector('.formulaire-pied')?.getBoundingClientRect();
      return { dansLePied: Boolean(pied) && m.top >= pied.top && m.bottom <= pied.bottom, hauteur: m.height };
    });
    juge.exige(message.dansLePied, `panne : le message n’est pas en entier dans le pied (${JSON.stringify(message)})`);
    await contexte.close();
  }

  // Clavier ouvert sur la tablette en paysage : la fenêtre perd près de la moitié de sa hauteur.
  {
    const { contexte, page, erreurs } = await ouvrir(navigateur, serveur.url, {
      taille: FORMATS['tablette-paysage'],
      theme: 'light',
      maintenant: MAINTENANT,
      adresse: '#/nouveau-voyage',
    });
    await attendreEcran(page, 'nouveau-voyage');
    // Ouverte par son adresse, sans geste préalable : le titre reçoit le focus par programme ; ce n'est
    // pas une commande, aucun contour autour de lui.
    const titre = await page.evaluate(() => ({
      id: document.activeElement.id,
      contour: getComputedStyle(document.activeElement).outlineStyle,
    }));
    juge.exige(
      titre.id === 'titre-nouveau-voyage' && titre.contour === 'none',
      `adresse directe : focus sur « ${titre.id} », contour « ${titre.contour} »`,
    );
    await page.fill('#nom', 'Vercors');
    await page.click('[data-jour="2026-10-10"]');
    await page.click('[data-jour="2026-10-13"]');
    await page.$eval('dialog', d => (d.dataset.temoin = 'avant'));
    await page.setViewportSize({ width: 1280, height: 420 });
    await calme(page);
    const v = await vue(page);
    const m = await page.evaluate(() => {
      const boite = s => document.querySelector(s).getBoundingClientRect();
      const creer = boite('button[type=submit]');
      const corps = document.querySelector('.formulaire-corps');
      return {
        meme: document.querySelector('dialog')?.dataset.temoin === 'avant',
        deuxColonnes: boite('.calendrier').left >= boite('#nom').right,
        creerVisible: document
          .querySelector('button[type=submit]')
          .contains(document.elementFromPoint(creer.left + creer.width / 2, creer.top + creer.height / 2)),
        corpsDefile: corps.scrollHeight > corps.clientHeight,
      };
    });
    juge.exige(v.modale && m.meme, `clavier ouvert : la fenêtre a basculé ou s’est refermée (${JSON.stringify(m)})`);
    juge.exige(m.deuxColonnes, 'clavier ouvert : la fenêtre est passée à une colonne');
    juge.exige(m.creerVisible, 'clavier ouvert : « Créer le voyage » ne se voit plus');
    juge.exige(m.corpsDefile, 'clavier ouvert : témoin, le corps de la fenêtre devrait défiler');
    juge.exige(
      v.nom === 'Vercors' && v.depart === '2026-10-10' && v.retour === '2026-10-13',
      `clavier ouvert : saisie perdue ${JSON.stringify(v)}`,
    );
    juge.exige(erreurs.length === 0, `clavier ouvert : erreurs dans la page : ${erreurs.join(' | ')}`);
    await contexte.close();
  }

  // Animation d'ouverture, et rien quand l'appareil demande moins d'animations.
  {
    const { contexte, page } = await ouvrir(navigateur, serveur.url, {
      taille: FORMATS['tablette-paysage'],
      theme: 'light',
      maintenant: MAINTENANT,
      adresse: '#/nouveau-voyage',
    });
    await attendreEcran(page, 'nouveau-voyage');
    const animation = () => page.$eval('dialog', d => getComputedStyle(d).animationName);
    const normale = await animation();
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const reduite = await animation();
    juge.exige(normale !== 'none', `animation : témoin, aucune animation d’ouverture (${normale})`);
    juge.exige(reduite === 'none', `animation : encore « ${reduite} » quand l’appareil en demande moins`);
    await contexte.close();
  }
} finally {
  await navigateur.close();
  await serveur.fermer();
}
juge.conclure(
  'Nouveau voyage en fenêtre modale',
  'ouverture, focus selon le pointeur et gardé dans la fenêtre, écran plein, panne, clavier ouvert, animations',
);
