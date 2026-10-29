// Phase 8, essai sur l'ASUS (2026-10-29) : au téléphone, l'objet ajouté s'arrête au-dessus du bouton flottant,
// pas dessous, une fois répondu « Non » à « Ajouter aussi à la bibliothèque ? ». La marge qui l'arrête est
// posée sur la page (scroll-padding-bottom) : la WebView 116 de l'ASUS ignore celle posée sur la ligne
// (scroll-margin-bottom), que Chromium récent respecte (mesuré sur l'appareil).
import { chromium } from 'playwright';
import { calme } from './outils/attente.mjs';
import { attendreQuestion, fr, ouvrirVoyage, repondre, vu } from './outils/ajuster.mjs';
import {
  AJOUT,
  AVEC_BIBLIOTHEQUE,
  FLOTTANT,
  creerCategorie,
  partie,
  remplirEtAjouter,
  toucherAjouter,
} from './outils/ajouter.mjs';
import { fermerEssai } from './outils/bibliotheque.mjs';
import { creerJuge, lireStockage } from './outils/page.mjs';
import { demarrerServeur } from './outils/serveur.mjs';

const juge = creerJuge();
const serveur = await demarrerServeur();
const navigateur = await chromium.launch();

// La ligne de l'objet et le bouton flottant, en pixels de l'écran.
const places = (page, id) =>
  page.evaluate(
    ({ id, flottant }) => {
      const ligne = document.querySelector(`#app .objet[data-id="${CSS.escape(id)}"]`)?.getBoundingClientRect();
      const bouton = document.querySelector(flottant)?.getBoundingClientRect();
      return { ligne: ligne && { haut: ligne.top, bas: ligne.bottom }, bouton: bouton && { haut: bouton.top } };
    },
    { id, flottant: FLOTTANT },
  );

try {
  for (const format of ['telephone-etroit', 'telephone']) {
    const cas = `${format}, objet ajouté dans une catégorie neuve, « Non »`;
    const ouvert = await ouvrirVoyage(navigateur, serveur.url, { format, donnees: AVEC_BIBLIOTHEQUE });
    const { page } = ouvert;
    await toucherAjouter(page, FLOTTANT);
    await creerCategorie(page, { nom: 'Plongée', couleur: 'lilas' });
    await remplirEtAjouter(page, { nom: 'Palmes', plus: 1 });
    await partie(page, AJOUT);
    await attendreQuestion(page);
    await repondre(page, fr.ajustement.bibliotheque.non);
    await calme(page);
    const id = (await lireStockage(page)).objetsDuVoyage.find(o => o.nom === 'Palmes')?.id;
    const vue = await places(page, id);
    const marge = await page.evaluate(() => getComputedStyle(document.documentElement).scrollPaddingBottom);
    juge.exige(marge !== 'auto' && parseFloat(marge) > 0, `${cas} : marge de la page sous la liste : ${marge}`);
    juge.exige(
      vue.ligne && vue.bouton && vue.ligne.haut >= 0 && vue.ligne.bas <= vue.bouton.haut,
      `${cas} : la ligne doit être au-dessus du bouton flottant ${vu(vue)}`,
    );
    await fermerEssai(juge, cas, ouvert);
  }
} finally {
  await navigateur.close();
  await serveur.fermer();
}
juge.conclure('Objet ajouté au téléphone', 'au-dessus du bouton flottant après « Ajouter aussi à la bibliothèque ? »');
