// Phase 3 (docs/PLAN.md) : quitter la liste d'un voyage ne laisse rien derrière soi.
// - confirmation « Vider » ouverte, deux retours système d'affilée (le premier ferme la confirmation,
//   le second quitte le voyage pendant qu'elle s'efface) : Mes voyages s'affiche sans fenêtre restée
//   par-dessus, ses cartes répondent, et rien n'a été vidé ;
// - même chose quand l'adresse change sans passer par l'historique (voyage ouvert directement) ;
// - une coche puis « Mes voyages » sur un voyage ouvert directement (retour sans changement d'adresse
//   suivi) : la seconde de répit qui court ensuite ne fait ni erreur ni message sur Mes voyages.
import { chromium } from 'playwright';
import { attendreQue } from './outils/attente.mjs';
import { demarrerServeur } from './outils/serveur.mjs';
import { FORMATS, attendreEcran, creerJuge, lireStockage, ouvrir } from './outils/page.mjs';
import { DONNEES } from './outils/voyage-essai.mjs';

const juge = creerJuge();
const serveur = await demarrerServeur();
const navigateur = await chromium.launch();

// Mes voyages est réellement utilisable : aucune fenêtre dans la page, et la carte du voyage reçoit
// le toucher (une fenêtre modale restée ouverte prendrait tout l'écran sous son voile).
const accueilLibre = page =>
  page.evaluate(() => {
    const carte = document.querySelector('a.carte-voyage[href="#/voyage/v1"]');
    const r = carte?.getBoundingClientRect();
    const touche = r && document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return {
      ecran: document.querySelector('#app').dataset.ecran,
      fenetres: document.querySelectorAll('dialog').length,
      touchable: Boolean(touche && carte.contains(touche)),
    };
  });

async function ouvrirConfirmation(page) {
  await page.click('.objet[data-id="o-gou"] .case');
  return attendreQue(page, () => document.querySelector('dialog[role="alertdialog"][open]') !== null);
}

const gourde = async page => (await lireStockage(page)).objetsDuVoyage.find(o => o.id === 'o-gou').dansLeSac;

try {
  // Deux retours système d'affilée, confirmation ouverte.
  {
    const { contexte, page, erreurs } = await ouvrir(navigateur, serveur.url, {
      taille: FORMATS.telephone,
      theme: 'light',
      donnees: DONNEES,
      adresse: '#/voyages',
    });
    await page.click('a.carte-voyage[href="#/voyage/v1"]');
    await attendreEcran(page, 'voyage');
    const ouverte = await ouvrirConfirmation(page);
    await page.evaluate(() => {
      history.back();
      history.back();
    });
    await attendreEcran(page, 'voyages');
    const vu = await accueilLibre(page);
    juge.exige(
      ouverte && vu.ecran === 'voyages' && vu.fenetres === 0 && vu.touchable,
      `deux retours, confirmation ouverte : ${JSON.stringify({ ouverte, ...vu })}`,
    );
    juge.exige((await gourde(page)) === 2, 'deux retours : Gourde vidée');
    if (vu.touchable) {
      await page.click('a.carte-voyage[href="#/voyage/v1"]');
      await attendreEcran(page, 'voyage');
    }
    juge.exige(erreurs.length === 0, `deux retours : erreurs dans la page : ${erreurs.join(' | ')}`);
    await contexte.close();
  }

  // Changement d'adresse hors de l'historique, confirmation ouverte.
  {
    const { contexte, page, erreurs } = await ouvrir(navigateur, serveur.url, {
      taille: FORMATS.telephone,
      theme: 'light',
      donnees: DONNEES,
      adresse: '#/voyage/v1',
    });
    const ouverte = await ouvrirConfirmation(page);
    await page.evaluate(() => (location.hash = '#/voyages'));
    await attendreEcran(page, 'voyages');
    const vu = await accueilLibre(page);
    juge.exige(
      ouverte && vu.fenetres === 0 && vu.touchable && (await gourde(page)) === 2,
      `changement d’adresse, confirmation ouverte : ${JSON.stringify({ ouverte, ...vu })}`,
    );
    juge.exige(erreurs.length === 0, `changement d’adresse : erreurs dans la page : ${erreurs.join(' | ')}`);
    await contexte.close();
  }

  // « Mes voyages » sur un voyage ouvert directement, une seconde de répit en cours.
  {
    const { contexte, page, erreurs } = await ouvrir(navigateur, serveur.url, {
      taille: FORMATS.telephone,
      theme: 'light',
      donnees: DONNEES,
      adresse: '#/voyage/v1',
      horloge: true,
    });
    await page.clock.pauseAt((await page.evaluate(() => Date.now())) + 10);
    await page.click('.objet[data-id="o-pan"] .case');
    await page.click('.lien-retour');
    await attendreQue(page, () => document.querySelector('#app').dataset.ecran === 'voyages');
    await page.clock.runFor(3000);
    const vu = await page.evaluate(() => ({
      ecran: document.querySelector('#app').dataset.ecran,
      cartes: document.querySelectorAll('a.carte-voyage').length,
      alerte: Boolean(document.querySelector('.alerte')),
    }));
    juge.exige(
      vu.ecran === 'voyages' && vu.cartes > 0 && !vu.alerte && erreurs.length === 0,
      `« Mes voyages » pendant le répit : ${JSON.stringify(vu)}, erreurs ${erreurs.join(' | ')}`,
    );
    await contexte.close();
  }
} finally {
  await navigateur.close();
  await serveur.fermer();
}
juge.conclure(
  'Quitter la liste d’un voyage',
  'deux retours d’affilée et changement d’adresse avec la confirmation ouverte, retour pendant la seconde de répit',
);
