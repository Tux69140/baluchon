// Phase 8 (docs/superpowers/specs/2026-10-28-phase-8-ajuster-design.md ; maquette docs/maquettes/ajuster/) :
// « Ajouter un objet » à un voyage, la suite de tests/ecran-voyage-ajouter.mjs.
// - un voyage vide propose « Ajouter un objet » ; sans catégorie, refusé ; la première naît avec l'objet ;
// - un retrait qui vide le voyage rend le focus à « Ajouter un objet » de l'écran vide ;
// - ajouter rend définitif un retrait du même voyage (le bandeau « Annuler » s'en va) ;
// - panne → fiche ouverte avec sa saisie, message en haut, rien dans la liste ; nouvel essai (double appui,
//   écriture lente) → un seul objet, une seule catégorie ;
// - captures claire et sombre (écran, fiche, liste, nouvelle catégorie, fiche remplie, objet ajouté).
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { chromium } from 'playwright';
import { attendreQue, calme } from './outils/attente.mjs';
import {
  BANDEAU,
  attendreQuestion,
  fr,
  ouvrirFiche,
  ouvrirVoyage,
  repondre,
  texteBandeau,
  toucherFiche,
  vu,
} from './outils/ajuster.mjs';
import {
  AJOUT,
  AVEC_BIBLIOTHEQUE,
  FLOTTANT,
  NOUVELLE,
  choisir,
  creerCategorie,
  focusSur,
  lireAjout,
  lireChoix,
  ouvrirChoix,
  partie,
  remplirEtAjouter,
  toucherAjouter,
} from './outils/ajouter.mjs';
import { fermerEssai } from './outils/bibliotheque.mjs';
import { CAPTURES, NOMS_THEME, creerJuge, ecrireStockage, lireStockage, verifierCommandes } from './outils/page.mjs';
import { demarrerServeur } from './outils/serveur.mjs';
import { DONNEES } from './outils/voyage-essai.mjs';

const a = fr.ajustement.ajout;
const juge = creerJuge();
const serveur = await demarrerServeur();
const navigateur = await chromium.launch();
const capture = (page, nom, format, theme) =>
  page.screenshot({ path: join(CAPTURES, `${nom}-${format}-${NOMS_THEME[theme]}.png`) });
const ouvrirEssai = (options = {}) => ouvrirVoyage(navigateur, serveur.url, { donnees: AVEC_BIBLIOTHEQUE, ...options });
// Dentifrice seul dans le voyage v1.
const UN_SEUL = {
  ...AVEC_BIBLIOTHEQUE,
  objetsDuVoyage: DONNEES.objetsDuVoyage.filter(o => o.id === 'o-den' || o.voyageId !== 'v1'),
};
const sansErreurSimulee = ouvert =>
  ouvert.erreurs.splice(0, ouvert.erreurs.length, ...ouvert.erreurs.filter(e => !e.includes('Panne simulée')));

try {
  await mkdir(CAPTURES, { recursive: true });

  // Un voyage vide : « Ajouter un objet » sous la phrase ; sans catégorie, refusé ; puis la première.
  for (const format of ['telephone-etroit', 'ordinateur']) {
    const cas = `voyage vide (${format})`;
    const ouvert = await ouvrirEssai({ format, voyageId: 'v4' });
    const { page } = ouvert;
    const vide = await page.evaluate(
      s => ({
        bouton: document.querySelector('#app .vide-voyage [data-action="ajouter"]')?.textContent.trim() ?? null,
        flottant: Boolean(document.querySelector(s)),
      }),
      FLOTTANT,
    );
    juge.exige(vide.bouton === fr.voyage.ajouter && !vide.flottant, `${cas} : ${vu(vide)}`);
    await toucherAjouter(page, '#app .vide-voyage [data-action="ajouter"]');
    const fiche = await lireAjout(page);
    juge.exige(fiche?.categorie === a.aChoisir && fiche.sous === a.aChoisirAide, `${cas} : fiche ${vu(fiche)}`);
    await remplirEtAjouter(page, { nom: 'Palmes' });
    await calme(page);
    const refusee = await lireAjout(page);
    juge.exige(
      vu(refusee?.erreurs) === vu([fr.modele.objet.erreurs.categorieManquante]) &&
        vu(refusee.invalides) === vu(['categorie']) &&
        refusee.focus === 'categorie',
      `${cas} : sans catégorie ${vu(refusee)}`,
    );
    await ouvrirChoix(page);
    const choix = await lireChoix(page);
    juge.exige(vu(choix?.lignes.map(l => l.id)) === vu(['nouvelle']), `${cas} : liste ${vu(choix)}`);
    await choisir(page, 'nouvelle');
    await page.fill(`${NOUVELLE} input[data-texte="nom"]`, 'Plongée');
    await page.click(`${NOUVELLE} [data-enregistrer]`);
    await partie(page, NOUVELLE);
    await calme(page);
    juge.exige(vu((await lireAjout(page))?.erreurs) === '[]', `${cas} : le message reste après le choix`);
    await page.click(`${AJOUT} [data-enregistrer]`);
    await partie(page, AJOUT);
    await attendreQue(page, () => document.querySelector('#app .objet[data-id]'));
    const stocke = await lireStockage(page);
    const categorie = stocke.categoriesDuVoyage.find(c => c.voyageId === 'v4');
    juge.exige(
      categorie?.ordre === 0 &&
        stocke.objetsDuVoyage.some(o => o.voyageId === 'v4' && o.categorieId === categorie.id) &&
        (await page.$('#app .vide-voyage')) === null,
      `${cas} : après l'ajout ${vu(categorie)}`,
    );
    await fermerEssai(juge, cas, ouvert);
  }

  // Un retrait qui vide le voyage : le focus va à « Ajouter un objet » de l'écran vide.
  for (const format of ['telephone-etroit', 'ordinateur']) {
    const cas = `retrait qui vide le voyage (${format})`;
    const ouvert = await ouvrirEssai({ format, donnees: UN_SEUL });
    const { page } = ouvert;
    await ouvrirFiche(page, 'o-den');
    await toucherFiche(page, 'retirer');
    await attendreQuestion(page);
    await repondre(page, fr.ajustement.retrait.retirer);
    await attendreQue(page, () => document.querySelector('#app .vide-voyage'));
    const focus = await attendreQue(page, () =>
      document.activeElement?.matches('#app .vide-voyage [data-action="ajouter"]'),
    );
    juge.exige(focus, `${cas} : focus sur ${await focusSur(page)}`);
    await fermerEssai(juge, cas, ouvert);
  }

  // Ajouter rend définitif un retrait du même voyage : le bandeau s'en va. L'horloge est figée dès qu'il
  // paraît : ses 10 s ne peuvent pas s'écouler, seul l'ajout peut le retirer. Sans calme() ensuite (il
  // attend une image, que l'horloge figée retient).
  {
    const cas = 'retrait rendu définitif';
    const ouvert = await ouvrirEssai({ format: 'telephone-etroit', horloge: true });
    const { page } = ouvert;
    await ouvrirFiche(page, 'o-tsh');
    await toucherFiche(page, 'retirer');
    await attendreQuestion(page);
    await repondre(page, fr.ajustement.retrait.retirer);
    const bandeau = await attendreQue(page, s => document.querySelector(s)?.matches(':popover-open'), BANDEAU);
    await page.clock.pauseAt((await page.evaluate(() => Date.now())) + 20);
    await partie(page, 'dialog.fiche-voyage');
    await page.click(FLOTTANT);
    await attendreQue(page, s => document.querySelector(s)?.matches(':modal'), AJOUT);
    juge.exige(bandeau && (await texteBandeau(page)) !== null, `${cas} : pas de bandeau avant l'ajout`);
    await remplirEtAjouter(page, { nom: 'Gants' });
    await partie(page, AJOUT);
    await attendreQue(page, s => !document.querySelector(s), BANDEAU);
    const stocke = await lireStockage(page);
    juge.exige(
      (await page.$(BANDEAU)) === null &&
        !stocke.objetsDuVoyage.some(o => o.id === 'o-tsh') &&
        stocke.objetsDuVoyage.some(o => o.nom === 'Gants'),
      `${cas} : bandeau « ${await texteBandeau(page)} »`,
    );
    await fermerEssai(juge, cas, ouvert);
  }

  // Panne : la fiche reste avec sa saisie ; nouvel essai en double appui, écriture lente : un seul objet.
  {
    const cas = 'panne puis nouvel essai';
    const ouvert = await ouvrirEssai({ format: 'telephone-etroit' });
    const { page } = ouvert;
    const avant = await lireStockage(page);
    await ecrireStockage(page, { ...avant, pannes: ['ajouterAuVoyage'] });
    await toucherAjouter(page, FLOTTANT);
    await page.fill(`${AJOUT} #f-nom`, 'Palmes');
    await creerCategorie(page, { nom: 'Plongée', couleur: 'lilas' });
    await page.click(`${AJOUT} [data-enregistrer]`);
    const message = await attendreQue(page, () => document.querySelector('.alerte-haut')?.textContent.trim());
    await calme(page);
    const fiche = await lireAjout(page);
    const pendant = await lireStockage(page);
    juge.exige(
      message === a.erreur &&
        fiche?.nom === 'Palmes' &&
        fiche.categorie === 'Plongée' &&
        (await page.$$('#app .categorie')).length === 4 &&
        vu(pendant.objetsDuVoyage) === vu(avant.objetsDuVoyage) &&
        vu(pendant.categoriesDuVoyage) === vu(avant.categoriesDuVoyage),
      `${cas} : message « ${message} », fiche ${vu(fiche)}`,
    );
    await ecrireStockage(page, { ...pendant, pannes: [], lenteurs: ['ajouterAuVoyage'] });
    await page.dblclick(`${AJOUT} [data-enregistrer]`);
    await attendreQue(page, () => typeof window.debloquerStockage === 'function');
    await page.click(`${AJOUT} [data-enregistrer]`, { force: true });
    await ecrireStockage(page, { ...(await lireStockage(page)), lenteurs: [] });
    await page.evaluate(() => window.debloquerStockage());
    await partie(page, AJOUT);
    await calme(page);
    const stocke = await lireStockage(page);
    juge.exige(
      stocke.objetsDuVoyage.filter(o => o.nom === 'Palmes').length === 1 &&
        stocke.categoriesDuVoyage.filter(c => c.nom === 'Plongée').length === 1 &&
        (await page.$$('#app .objet-nom')).length > 0 &&
        (await page.$$eval('#app .objet-nom', els => els.filter(e => e.textContent === 'Palmes').length)) === 1,
      `${cas} : ${stocke.objetsDuVoyage.filter(o => o.nom === 'Palmes').length} « Palmes » stockés`,
    );
    sansErreurSimulee(ouvert);
    await fermerEssai(juge, cas, ouvert);
  }

  // Captures : l'écran, la fiche, la liste, la nouvelle catégorie, puis l'objet ajouté.
  for (const theme of ['light', 'dark'])
    for (const format of ['telephone-etroit', 'tablette-portrait', 'ordinateur']) {
      const cas = `captures, ${format}, ${NOMS_THEME[theme]}`;
      const ouvert = await ouvrirEssai({ format, theme });
      const { page } = ouvert;
      if (format !== 'telephone-etroit') {
        await page.click('#app .gf-menu [data-action="choisir"][data-id="c-toi"]');
        await calme(page);
      }
      await capture(page, 'voyage-ajouter-ecran', format, theme);
      await verifierCommandes(page, juge, `${cas}, écran`);
      await toucherAjouter(
        page,
        format === 'telephone-etroit' ? FLOTTANT : '#app .objet-ajout [data-action="ajouter"]',
      );
      await remplirEtAjouter(page, { nom: 'Palmes', plus: 1, valider: false });
      await capture(page, 'voyage-ajouter-fiche', format, theme);
      await verifierCommandes(page, juge, `${cas}, fiche`);
      await ouvrirChoix(page);
      await capture(page, 'voyage-ajouter-liste', format, theme);
      await verifierCommandes(page, juge, `${cas}, liste`);
      await choisir(page, 'nouvelle');
      await page.fill(`${NOUVELLE} input[data-texte="nom"]`, 'Plongée');
      await page.click(`${NOUVELLE} .teinte[data-valeur="lilas"]`);
      await calme(page);
      await capture(page, 'voyage-ajouter-nouvelle', format, theme);
      await verifierCommandes(page, juge, `${cas}, nouvelle catégorie`);
      await page.click(`${NOUVELLE} [data-enregistrer]`);
      await partie(page, NOUVELLE);
      await calme(page);
      await capture(page, 'voyage-ajouter-rempli', format, theme);
      await page.click(`${AJOUT} [data-enregistrer]`);
      await partie(page, AJOUT);
      await calme(page);
      await capture(page, 'voyage-ajouter-fait', format, theme);
      await fermerEssai(juge, cas, ouvert);
    }
} finally {
  await navigateur.close();
  await serveur.fermer();
}
juge.conclure(
  'Ajouter un objet au voyage (suite)',
  'voyage vide, retrait qui le vide, retrait rendu définitif, panne et nouvel essai, captures',
);
