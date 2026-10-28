// Phase 8 (docs/superpowers/specs/2026-10-28-phase-8-ajuster-design.md, « Ajouter aussi à la bibliothèque ? » ;
// maquette docs/maquettes/ajuster/) : la suite de tests/ecran-voyage-ajout-bibliotheque.mjs.
// - les liens gardés par l'écran : un second objet de la même catégorie neuve va droit à la fiche d'objet ;
//   retiré puis rendu par « Annuler », l'objet et sa catégorie gardent leurs liens à la bibliothèque ;
// - lecture de la bibliothèque en panne après « Oui » : message, aucune fiche, rien d'écrit ;
// - panne d'écriture → fiche ouverte, rien d'écrit ; nouvel essai (double appui, écriture lente) → un seul objet ;
// - captures claire et sombre (question, liste, fiches préremplies, message).
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { chromium } from 'playwright';
import {
  ESSAI,
  ajouter,
  enregistrerModele,
  entrerAvecNouvelleCategorie,
  etiquette,
  nouvelleCategorie,
  oui,
  rienEcrit,
  sansErreurSimulee,
  suivant,
} from './outils/ajout-bibliotheque.mjs';
import { attendreQue, calme } from './outils/attente.mjs';
import {
  BANDEAU,
  attendreQuestion,
  fr,
  ouvrirFiche,
  ouvrirVoyage,
  remplir,
  repondre,
  toucherFiche,
  vu,
} from './outils/ajuster.mjs';
import { CHOIX } from './outils/ajouter.mjs';
import { fermerEssai } from './outils/bibliotheque.mjs';
import { FICHE, lireFiche } from './outils/fiches.mjs';
import { CAPTURES, NOMS_THEME, creerJuge, ecrireStockage, lireStockage, verifierCommandes } from './outils/page.mjs';
import { demarrerServeur } from './outils/serveur.mjs';

const juge = creerJuge();
const serveur = await demarrerServeur();
const navigateur = await chromium.launch();
const ouvrirEssai = (options = {}) => ouvrirVoyage(navigateur, serveur.url, { donnees: ESSAI, ...options });
const capture = (page, nom, format, theme) =>
  page.screenshot({ path: join(CAPTURES, `${nom}-${format}-${NOMS_THEME[theme]}.png`) });

try {
  await mkdir(CAPTURES, { recursive: true });

  // Les liens gardés par l'écran : la catégorie du voyage, liée à la catégorie neuve de la bibliothèque, est
  // désormais connue ; un second objet qu'on y ajoute va droit à la fiche d'objet, dans celle-ci.
  {
    const cas = 'second objet de la catégorie neuve';
    const ouvert = await ouvrirEssai({ format: 'telephone-etroit' });
    const { page } = ouvert;
    await ajouter(page, { nom: 'Palmes', nouvelle: { nom: 'Plongée', couleur: 'lilas' } });
    await entrerAvecNouvelleCategorie(page);
    const duVoyage = (await lireStockage(page)).categoriesDuVoyage.find(c => c.nom === 'Plongée');
    await ajouter(page, { nom: 'Tuba', categorie: duVoyage?.id });
    await oui(page);
    const fiche = await lireFiche(page);
    juge.exige(
      !(await page.$(CHOIX)) &&
        fiche?.nom === 'Tuba' &&
        fiche.sousTitre === remplir(fr.modele.objet.dans, { categorie: 'Plongée' }),
      `${cas} : liste ${Boolean(await page.$(CHOIX))}, fiche ${vu(fiche)}`,
    );
    await fermerEssai(juge, cas, ouvert);
  }

  // Retiré puis rendu par « Annuler » : l'objet et sa catégorie (partie avec lui, son dernier objet) sont
  // réécrits tels que l'écran les garde, liens compris.
  {
    const cas = 'retrait puis « Annuler » après « Oui »';
    const ouvert = await ouvrirEssai({ format: 'telephone-etroit' });
    const { page } = ouvert;
    const objet = await ajouter(page, { nom: 'Palmes', nouvelle: { nom: 'Plongée', couleur: 'lilas' } });
    await entrerAvecNouvelleCategorie(page);
    const lies = await lireStockage(page);
    const neuve = lies.bibliotheque.categories.find(c => c.nom === 'Plongée');
    const neuf = lies.bibliotheque.objets.find(o => o.nom === 'Palmes');
    await ouvrirFiche(page, objet?.id);
    await toucherFiche(page, 'retirer');
    await attendreQuestion(page);
    await repondre(page, fr.ajustement.retrait.retirer);
    await attendreQue(page, s => document.querySelector(s)?.matches(':popover-open') ?? false, BANDEAU);
    await page.click(`${BANDEAU} button`);
    await attendreQue(page, s => !document.querySelector(s), BANDEAU);
    await calme(page);
    const stocke = await lireStockage(page);
    const relu = stocke.objetsDuVoyage.find(o => o.id === objet?.id);
    const categorie = stocke.categoriesDuVoyage.find(c => c.id === objet?.categorieId);
    juge.exige(
      Boolean(neuve && neuf) && relu?.modeleId === neuf.id && categorie?.modeleId === neuve.id,
      `${cas} : objet ${vu(relu)}, catégorie ${vu(categorie)}`,
    );
    await fermerEssai(juge, cas, ouvert);
  }

  // Lecture de la bibliothèque en panne après « Oui » (décision du contrôleur : le message existant) : aucune
  // fiche, rien d'écrit, l'objet reste dans le voyage, le focus sur sa ligne.
  {
    const cas = 'lecture de la bibliothèque en panne';
    const ouvert = await ouvrirEssai({ format: 'telephone-etroit' });
    const { page } = ouvert;
    const avant = await lireStockage(page);
    const objet = await ajouter(page, { nom: 'Masque', categorie: 'c-vet' });
    await ecrireStockage(page, { ...(await lireStockage(page)), pannes: ['lireBibliotheque'] });
    await repondre(page, fr.ajustement.bibliotheque.oui);
    const message = await attendreQue(page, () => document.querySelector('.alerte-haut')?.textContent.trim());
    await rienEcrit(juge, cas, page, avant, objet);
    const stocke = await lireStockage(page);
    juge.exige(
      message === fr.voyage.erreurModification &&
        !(await page.$(`${FICHE}, ${CHOIX}`)) &&
        stocke.objetsDuVoyage.some(o => o.id === objet?.id) &&
        Boolean(await page.$(`#app .objet[data-id="${objet?.id}"]`)),
      `${cas} : message « ${message} »`,
    );
    sansErreurSimulee(ouvert);
    await fermerEssai(juge, cas, ouvert);
  }

  // Panne : la fiche reste avec sa saisie, rien d'écrit ; nouvel essai en double appui, écriture lente : un
  // seul objet et une seule catégorie.
  {
    const cas = 'panne puis nouvel essai';
    const ouvert = await ouvrirEssai({ format: 'telephone-etroit' });
    const { page } = ouvert;
    const avant = await lireStockage(page);
    const objet = await ajouter(page, { nom: 'Palmes', nouvelle: { nom: 'Plongée', couleur: 'lilas' } });
    await oui(page);
    await nouvelleCategorie(page);
    await etiquette(page, 'e-pla');
    await suivant(page);
    await etiquette(page, 'e-pla');
    await ecrireStockage(page, { ...(await lireStockage(page)), pannes: ['ajouterALaBibliotheque'] });
    await page.click(`${FICHE} [data-enregistrer]`);
    const message = await attendreQue(page, () => document.querySelector('.alerte-haut')?.textContent.trim());
    await calme(page);
    const fiche = await lireFiche(page);
    const pendant = await lireStockage(page);
    juge.exige(
      message === fr.bibliotheque.erreurEnregistrement &&
        fiche?.nom === 'Palmes' &&
        vu(fiche.etiquettes) === vu(['Plage']) &&
        vu(pendant.bibliotheque) === vu(avant.bibliotheque) &&
        pendant.objetsDuVoyage.find(o => o.id === objet?.id)?.modeleId === null,
      `${cas} : message « ${message} », fiche ${vu(fiche)}`,
    );
    await ecrireStockage(page, { ...pendant, pannes: [], lenteurs: ['ajouterALaBibliotheque'] });
    await page.dblclick(`${FICHE} [data-enregistrer]`);
    await attendreQue(page, () => typeof window.debloquerStockage === 'function');
    await page.click(`${FICHE} [data-enregistrer]`, { force: true });
    await ecrireStockage(page, { ...(await lireStockage(page)), lenteurs: [] });
    await page.evaluate(() => window.debloquerStockage());
    await attendreQue(page, s => !document.querySelector(s), FICHE);
    await calme(page);
    const stocke = await lireStockage(page);
    juge.exige(
      stocke.bibliotheque.objets.filter(o => o.nom === 'Palmes').length === 1 &&
        stocke.bibliotheque.categories.filter(c => c.nom === 'Plongée').length === 1 &&
        stocke.objetsDuVoyage.find(o => o.id === objet?.id)?.modeleId ===
          stocke.bibliotheque.objets.find(o => o.nom === 'Palmes')?.id,
      `${cas} : ${stocke.bibliotheque.objets.filter(o => o.nom === 'Palmes').length} « Palmes » stockés`,
    );
    sansErreurSimulee(ouvert);
    await fermerEssai(juge, cas, ouvert);
  }

  // Captures : la question, la liste, la fiche de catégorie, la fiche d'objet, le message.
  for (const theme of ['light', 'dark'])
    for (const format of ['telephone-etroit', 'tablette-portrait', 'ordinateur']) {
      const cas = `captures, ${format}, ${NOMS_THEME[theme]}`;
      const ouvert = await ouvrirEssai({ format, theme });
      const { page } = ouvert;
      await ajouter(page, { nom: 'Palmes', nouvelle: { nom: 'Plongée', couleur: 'lilas' }, plus: 1 });
      await capture(page, 'voyage-biblio-question', format, theme);
      await oui(page);
      await capture(page, 'voyage-biblio-liste', format, theme);
      await verifierCommandes(page, juge, `${cas}, liste`);
      await nouvelleCategorie(page);
      await capture(page, 'voyage-biblio-categorie', format, theme);
      await verifierCommandes(page, juge, `${cas}, fiche de catégorie`);
      await etiquette(page, 'e-pla');
      await suivant(page);
      await capture(page, 'voyage-biblio-objet', format, theme);
      await verifierCommandes(page, juge, `${cas}, fiche d'objet`);
      await etiquette(page, 'e-pla');
      await enregistrerModele(page);
      await attendreQue(page, s => !document.querySelector(s), FICHE);
      await attendreQue(page, () => document.querySelector('.alerte-haut.message-succes'));
      await calme(page);
      await capture(page, 'voyage-biblio-fait', format, theme);
      await verifierCommandes(page, juge, `${cas}, message`);
      await fermerEssai(juge, cas, ouvert);
    }
} finally {
  await navigateur.close();
  await serveur.fermer();
}
juge.conclure(
  'Ajouter aussi à la bibliothèque (suite)',
  'liens gardés par l’écran, lecture en panne, écriture en panne et nouvel essai, captures',
);
