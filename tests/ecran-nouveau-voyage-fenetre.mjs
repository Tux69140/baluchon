// Nouveau voyage en fenêtre modale (décision du chef de projet, 2026-10-07), hors navigation (voir
// ecran-retour.mjs pour la fermeture) :
// - ouverte depuis Mes voyages par le bouton flottant, en tablette (1280 × 800) : fenêtre modale
//   nommée par son titre « Nouveau voyage », Mes voyages derrière ; un « × » nommé « Fermer » et
//   « Annuler » ; pas de lien « Mes voyages » ; le focus est sur le nom ; au clavier, Tab et Maj+Tab
//   n'atteignent jamais Mes voyages derrière — témoin : Tab passe bien par « × », « Annuler » et
//   « Créer le voyage » ;
// - au téléphone : écran plein, titre de l'écran, lien « Mes voyages », ni « × » ni « Annuler » ;
// - panne d'enregistrement dans la fenêtre en une colonne (800 × 1280) : le message s'affiche en
//   entier dans le pied, sans rien faire bouger (fenêtre, « Annuler », « Créer le voyage ») ;
// - la fenêtre redimensionnée sous 600 px de large devient l'écran plein, et l'inverse, sans rien
//   perdre de la saisie ; une fois l'écran quitté, redimensionner ne cause aucune erreur ;
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
    juge.exige(v.focus === 'nom', `tablette : à l’ouverture, le focus est sur « ${v.focus} »`);
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

  // Changer la taille de la fenêtre d'ordinateur : fenêtre modale ↔ écran plein, saisie gardée.
  {
    const { contexte, page, erreurs } = await ouvrir(navigateur, serveur.url, {
      taille: FORMATS['tablette-paysage'],
      theme: 'light',
      maintenant: MAINTENANT,
      adresse: '#/nouveau-voyage',
    });
    await attendreEcran(page, 'nouveau-voyage');
    await page.fill('#nom', 'Vercors');
    await page.click('[data-jour="2026-10-10"]');
    await page.click('[data-jour="2026-10-13"]');
    const garde = v => v.nom === 'Vercors' && v.depart === '2026-10-10' && v.retour === '2026-10-13';
    await page.setViewportSize(FORMATS.telephone);
    await page.waitForFunction(() => !document.querySelector('dialog'));
    await calme(page);
    let v = await vue(page);
    juge.exige(!v.modale && v.lienRetour, `rétrécie : pas d’écran plein (${JSON.stringify(v)})`);
    juge.exige(garde(v), `rétrécie : saisie perdue ${JSON.stringify(v)}`);
    await page.setViewportSize(FORMATS['tablette-paysage']);
    await page.waitForFunction(() => document.querySelector('dialog'));
    await calme(page);
    v = await vue(page);
    juge.exige(v.modale && !v.lienRetour, `élargie : pas de fenêtre modale (${JSON.stringify(v)})`);
    juge.exige(garde(v), `élargie : saisie perdue ${JSON.stringify(v)}`);
    await page.click('[data-fermer].bouton-secondaire');
    await attendreEcran(page, 'voyages');
    await page.setViewportSize(FORMATS.telephone);
    await page.setViewportSize(FORMATS['tablette-paysage']);
    await calme(page);
    const apresDepart = await page.evaluate(() => ({
      ecran: document.querySelector('#app').dataset.ecran,
      fenetre: Boolean(document.querySelector('dialog')),
    }));
    juge.exige(
      apresDepart.ecran === 'voyages' && !apresDepart.fenetre,
      `écran quitté : redimensionner rouvre le formulaire (${JSON.stringify(apresDepart)})`,
    );
    juge.exige(erreurs.length === 0, `redimensionnement : erreurs dans la page : ${erreurs.join(' | ')}`);
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
  'ouverture, focus gardé dans la fenêtre, écran plein au téléphone, panne, redimensionnement, animations',
);
