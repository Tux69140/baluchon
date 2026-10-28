// Phase 8 (docs/superpowers/specs/2026-10-28-phase-8-ajuster-design.md, « Ajouter aussi à la bibliothèque ? » ;
// maquette docs/maquettes/ajuster/, premier bloc de gestes.mjs) : après l'ajout d'un objet au voyage, la
// question « Ajouter aussi à la bibliothèque ? ».
// - « Non », ou la question fermée, ne touche pas la bibliothèque (critère du plan) ; le focus revient à l'objet ;
// - « Oui » dans une catégorie connue de la bibliothèque : la fiche d'objet préremplie (nom, quantité fixe,
//   partagé, selon les étiquettes sans étiquette) ; sans étiquette elle refuse, avec elle enregistre l'objet
//   modèle dans cette catégorie, lié à l'objet du voyage (critère du plan) ; « … est dans la bibliothèque. » ;
// - catégorie propre au voyage : choisir une catégorie de la bibliothèque y range l'objet (la catégorie du
//   voyage n'est pas liée) ; « Nouvelle catégorie » : la fiche de catégorie préremplie, « Suivant » sans rien
//   écrire, puis catégorie et objet ensemble, et la catégorie du voyage liée ;
// - abandonner à chaque étape n'écrit rien (Review Focus 5) ; la question ne se pose que après un ajout ;
// - panne → fiche ouverte, rien d'écrit ; nouvel essai (double appui, écriture lente) → un seul objet ;
// - captures claire et sombre (question, liste, fiches préremplies, message).
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { chromium } from 'playwright';
import {
  ESSAI,
  ajouter,
  b,
  enregistrerModele,
  etiquette,
  lireMessage,
  nouvelleCategorie,
  oui,
  suivant,
} from './outils/ajout-bibliotheque.mjs';
import { attendreQue, calme } from './outils/attente.mjs';
import {
  QUESTION,
  attendreQuestion,
  fr,
  lireQuestion,
  ouvrirFiche,
  ouvrirVoyage,
  remplir,
  repondre,
  toucherFiche,
  vu,
} from './outils/ajuster.mjs';
import { CHOIX, focusSur, lireChoix } from './outils/ajouter.mjs';
import { fermerEssai } from './outils/bibliotheque.mjs';
import { FICHE, attendreOuverte, lireFiche } from './outils/fiches.mjs';
import { CAPTURES, NOMS_THEME, creerJuge, ecrireStockage, lireStockage, verifierCommandes } from './outils/page.mjs';
import { demarrerServeur } from './outils/serveur.mjs';

const m = fr.modele;
const juge = creerJuge();
const serveur = await demarrerServeur();
const navigateur = await chromium.launch();
const PIEGE = 'Coton <i>&</i> "tige"';
const CAT_PIEGE = 'Plongée <b>&</b> "apnée"';

const ouvrirEssai = (options = {}) => ouvrirVoyage(navigateur, serveur.url, { donnees: ESSAI, ...options });
const capture = (page, nom, format, theme) =>
  page.screenshot({ path: join(CAPTURES, `${nom}-${format}-${NOMS_THEME[theme]}.png`) });
const sansErreurSimulee = ouvert =>
  ouvert.erreurs.splice(0, ouvert.erreurs.length, ...ouvert.erreurs.filter(e => !e.includes('Panne simulée')));

// Rien n'a été écrit dans la bibliothèque, l'objet du voyage n'est pas lié, et le focus est sur sa ligne.
async function rienEcrit(cas, page, avant, objet) {
  await attendreQue(page, s => !document.querySelector(s), `${QUESTION}, ${CHOIX}, ${FICHE}`);
  await calme(page);
  const stocke = await lireStockage(page);
  const relu = stocke.objetsDuVoyage.find(o => o.id === objet?.id);
  juge.exige(
    vu(stocke.bibliotheque) === vu(avant.bibliotheque) &&
      relu?.modeleId === null &&
      vu(stocke.categoriesDuVoyage.map(c => c.modeleId)) ===
        vu(stocke.categoriesDuVoyage.map(c => avant.categoriesDuVoyage.find(x => x.id === c.id)?.modeleId ?? null)),
    `${cas} : bibliothèque ou liens touchés ${vu(relu)}`,
  );
  juge.exige((await focusSur(page)) === objet?.id, `${cas} : focus sur ${await focusSur(page)}`);
}

try {
  await mkdir(CAPTURES, { recursive: true });

  // « Non », ou la question fermée : la bibliothèque ne change pas, le focus revient à l'objet.
  {
    const cas = '« Non »';
    const ouvert = await ouvrirEssai({ format: 'telephone-etroit' });
    const { page } = ouvert;
    const avant = await lireStockage(page);
    const objet = await ajouter(page, { nom: PIEGE, categorie: 'c-toi' });
    const question = await lireQuestion(page);
    juge.exige(
      question?.titre === remplir(b.question, { nom: PIEGE }) &&
        vu(question.textes) === vu([b.questionTexte]) &&
        vu(question.boutons) === vu([b.non, b.oui]) &&
        question.balises === 0,
      `${cas} : question ${vu(question)}`,
    );
    const premier = await page.evaluate(
      s => document.activeElement?.closest(s) && document.activeElement.textContent.trim(),
      QUESTION,
    );
    juge.exige(premier === b.non, `${cas} : focus de la question sur ${premier}`);
    await repondre(page, b.non);
    await rienEcrit(cas, page, avant, objet);
    // Fermée par Échap : de même.
    const autre = await ajouter(page, { nom: 'Masque', categorie: 'c-toi' });
    await page.keyboard.press('Escape');
    await rienEcrit(`${cas} (Échap)`, page, avant, autre);
    await fermerEssai(juge, cas, ouvert);
  }

  // « Oui » dans une catégorie connue : la fiche préremplie ; sans étiquette elle refuse, avec elle enregistre.
  for (const format of ['telephone-etroit', 'ordinateur']) {
    const cas = `« Oui », catégorie connue (${format})`;
    const ouvert = await ouvrirEssai({ format });
    const { page } = ouvert;
    const avant = await lireStockage(page);
    const objet = await ajouter(page, { nom: PIEGE, categorie: 'c-toi', plus: 2 });
    await oui(page);
    const fiche = await lireFiche(page);
    juge.exige(
      fiche?.titre === m.objet.nouveau &&
        fiche.sousTitre === remplir(m.objet.dans, { categorie: 'Toilette' }) &&
        fiche.nom === PIEGE &&
        fiche.valeur === '3' &&
        vu(fiche.choix) === vu([m.objet.fixe, m.objet.partage, m.selonEtiquettes]) &&
        vu(fiche.etiquettes) === '[]' &&
        fiche.bouton === b.ajouter &&
        fiche.balises === 0 &&
        !(await page.$(CHOIX)),
      `${cas} : fiche ${vu(fiche)}`,
    );
    await enregistrerModele(page);
    const refusee = await lireFiche(page);
    juge.exige(
      vu(refusee?.erreurs) === vu([m.objet.erreurs.etiquettesManquantes]) &&
        vu((await lireStockage(page)).bibliotheque) === vu(avant.bibliotheque),
      `${cas} : sans étiquette ${vu(refusee)}`,
    );
    await etiquette(page, 'e-pla');
    await enregistrerModele(page);
    await attendreQue(page, () => document.querySelector('.alerte-haut.message-succes'));
    const message = await lireMessage(page);
    await attendreQue(page, s => !document.querySelector(s), FICHE);
    await calme(page);
    const stocke = await lireStockage(page);
    const neuf = stocke.bibliotheque.objets.find(o => o.nom === PIEGE);
    const { id, modifieLe, ...champs } = neuf ?? {};
    juge.exige(
      vu(champs) ===
        vu({
          categorieId: 'b-toi',
          nom: PIEGE,
          regle: 'fixe',
          valeur: 3,
          plafond: null,
          parPersonne: false,
          consommable: false,
          toujoursInclus: false,
          note: '',
          etiquettes: ['e-pla'],
        }) &&
        Boolean(id && modifieLe) &&
        stocke.bibliotheque.objets.length === avant.bibliotheque.objets.length + 1 &&
        vu(stocke.bibliotheque.categories) === vu(avant.bibliotheque.categories),
      `${cas} : objet modèle ${vu(neuf)}`,
    );
    const relu = stocke.objetsDuVoyage.find(o => o.id === objet?.id);
    juge.exige(
      relu?.modeleId === id &&
        relu.nom === PIEGE &&
        relu.quantite === 3 &&
        relu.categorieId === 'c-toi' &&
        stocke.categoriesDuVoyage.find(c => c.id === 'c-toi').modeleId === 'b-toi',
      `${cas} : objet du voyage ${vu(relu)}`,
    );
    juge.exige(
      message?.texte === remplir(b.fait, { nom: PIEGE }) &&
        message.succes &&
        message.role === 'status' &&
        message.balises === 0,
      `${cas} : message ${vu(message)}`,
    );
    juge.exige((await focusSur(page)) === objet?.id, `${cas} : focus sur ${await focusSur(page)}`);
    await fermerEssai(juge, cas, ouvert);
  }

  // Catégorie propre au voyage : la liste de la bibliothèque ; une catégorie choisie y range l'objet, et la
  // catégorie du voyage n'est pas liée.
  {
    const cas = 'catégorie propre au voyage, catégorie existante choisie';
    const ouvert = await ouvrirEssai({ format: 'telephone-etroit' });
    const { page } = ouvert;
    const avant = await lireStockage(page);
    const objet = await ajouter(page, { nom: 'Gants', categorie: 'c-vet' });
    await oui(page);
    const choix = await lireChoix(page);
    const texte = await page.evaluate(s => document.querySelector(`${s} .fiche-corps > p`)?.textContent, CHOIX);
    const n = nombre => remplir(fr.ajustement.choix.objets[nombre > 1 ? 'other' : 'one'], { n: nombre });
    juge.exige(
      choix?.titre === b.choixTitre &&
        texte === remplir(b.choixTexte, { categorie: 'Vêtements', nom: 'Gants' }) &&
        vu(choix.lignes) ===
          vu([
            { id: 'b-toi', nom: 'Toilette', sous: n(1), retenue: false, coche: false },
            { id: 'b-ali', nom: 'Repas', sous: n(2), retenue: false, coche: false },
            {
              id: 'nouvelle',
              nom: fr.ajustement.choix.nouvelle,
              sous: remplir(b.creer, { categorie: 'Vêtements' }),
              retenue: false,
              coche: false,
            },
          ]) &&
        vu(choix.boutons) === vu([fr.fenetre.annuler]),
      `${cas} : liste ${vu(choix)}, texte « ${texte} »`,
    );
    await page.click(`${CHOIX} [data-choix="b-ali"]`);
    await attendreOuverte(page);
    const fiche = await lireFiche(page);
    juge.exige(
      fiche?.sousTitre === remplir(m.objet.dans, { categorie: 'Repas' }) && fiche.nom === 'Gants',
      `${cas} : fiche ${vu(fiche)}`,
    );
    await etiquette(page, 'e-mon');
    await enregistrerModele(page);
    await attendreQue(page, s => !document.querySelector(s), FICHE);
    await calme(page);
    const stocke = await lireStockage(page);
    const neuf = stocke.bibliotheque.objets.find(o => o.nom === 'Gants');
    juge.exige(
      neuf?.categorieId === 'b-ali' &&
        vu(stocke.bibliotheque.categories) === vu(avant.bibliotheque.categories) &&
        stocke.objetsDuVoyage.find(o => o.id === objet?.id)?.modeleId === neuf.id &&
        stocke.categoriesDuVoyage.find(c => c.id === 'c-vet').modeleId === null,
      `${cas} : ${vu(neuf)}`,
    );
    await fermerEssai(juge, cas, ouvert);
  }

  // Catégorie propre au voyage, « Nouvelle catégorie » : la fiche de catégorie préremplie, « Suivant » sans rien
  // écrire, puis catégorie et objet ensemble ; la catégorie du voyage est liée à la neuve.
  for (const format of ['telephone-etroit', 'tablette-portrait']) {
    const cas = `« Nouvelle catégorie » de la bibliothèque (${format})`;
    const ouvert = await ouvrirEssai({ format });
    const { page } = ouvert;
    const avant = await lireStockage(page);
    const objet = await ajouter(page, { nom: PIEGE, nouvelle: { nom: CAT_PIEGE, couleur: 'lilas' }, plus: 1 });
    const duVoyage = (await lireStockage(page)).categoriesDuVoyage.find(c => c.nom === CAT_PIEGE);
    await oui(page);
    const choix = await lireChoix(page);
    juge.exige(
      choix?.lignes.at(-1).sous === remplir(b.creer, { categorie: CAT_PIEGE }) && choix.balises === 0,
      `${cas} : liste ${vu(choix)}`,
    );
    await nouvelleCategorie(page);
    const categorie = await lireFiche(page);
    juge.exige(
      categorie?.titre === m.categorie.nouvelle &&
        categorie.nom === CAT_PIEGE &&
        categorie.pave === 'lilas' &&
        vu(categorie.couleurs) === vu(['lilas']) &&
        categorie.picto === fr.catalogue.pictos['suitcase-rolling'].nom &&
        vu(categorie.choix) === vu([m.selonEtiquettes]) &&
        vu(categorie.etiquettes) === '[]' &&
        categorie.bouton === b.suivant,
      `${cas} : fiche de catégorie ${vu(categorie)}`,
    );
    await enregistrerModele(page);
    const refusee = await lireFiche(page);
    juge.exige(
      vu(refusee?.erreurs) === vu([m.categorie.erreurs.etiquettesManquantes]),
      `${cas} : « Suivant » sans étiquette ${vu(refusee)}`,
    );
    await etiquette(page, 'e-pla');
    await suivant(page);
    const fiche = await lireFiche(page);
    juge.exige(
      fiche?.titre === m.objet.nouveau &&
        fiche.sousTitre === remplir(m.objet.dans, { categorie: CAT_PIEGE }) &&
        fiche.nom === PIEGE &&
        fiche.valeur === '2' &&
        fiche.bouton === b.ajouter &&
        fiche.balises === 0 &&
        vu((await lireStockage(page)).bibliotheque) === vu(avant.bibliotheque),
      `${cas} : fiche d'objet ${vu(fiche)}, rien d'écrit avant`,
    );
    await etiquette(page, 'e-mon');
    await enregistrerModele(page);
    await attendreQue(page, s => !document.querySelector(s), FICHE);
    const message = await lireMessage(page);
    await calme(page);
    const stocke = await lireStockage(page);
    const neuve = stocke.bibliotheque.categories.find(c => c.nom === CAT_PIEGE);
    const neuf = stocke.bibliotheque.objets.find(o => o.nom === PIEGE);
    juge.exige(
      neuve?.icone === 'suitcase-rolling' &&
        neuve.couleur === 'lilas' &&
        neuve.ordre === 2 &&
        !neuve.toujoursIncluse &&
        vu(neuve.etiquettes) === vu(['e-pla']) &&
        neuf?.categorieId === neuve.id &&
        neuf.valeur === 2 &&
        vu(neuf.etiquettes) === vu(['e-mon']) &&
        stocke.categoriesDuVoyage.find(c => c.id === duVoyage?.id)?.modeleId === neuve.id &&
        stocke.objetsDuVoyage.find(o => o.id === objet?.id)?.modeleId === neuf.id,
      `${cas} : stockés ${vu(neuve)} ${vu(neuf)}`,
    );
    juge.exige(message?.texte === remplir(b.fait, { nom: PIEGE }), `${cas} : message ${vu(message)}`);
    juge.exige((await focusSur(page)) === objet?.id, `${cas} : focus sur ${await focusSur(page)}`);
    await fermerEssai(juge, cas, ouvert);
  }

  // Abandonner à chaque étape n'écrit rien (Review Focus 5) : la liste, la fiche de catégorie, la fiche
  // d'objet après « Suivant », la fiche d'objet modifiée puis abandonnée.
  {
    const cas = 'abandon';
    const ouvert = await ouvrirEssai({ format: 'telephone-etroit' });
    const { page } = ouvert;
    const avant = await lireStockage(page);
    // La liste fermée par « Annuler » (Alimentation vient d'une catégorie disparue de la bibliothèque).
    let objet = await ajouter(page, { nom: 'Thé', categorie: 'c-ali' });
    await oui(page);
    juge.exige((await lireChoix(page))?.titre === b.choixTitre, `${cas} : catégorie disparue, pas de liste`);
    await page.click(`${CHOIX} .fenetre-pied [data-fermer]`);
    await rienEcrit(`${cas}, liste`, page, avant, objet);
    // La fiche de catégorie fermée telle quelle.
    objet = await ajouter(page, { nom: 'Bonnet', categorie: 'c-vet' });
    await oui(page);
    await nouvelleCategorie(page);
    await page.keyboard.press('Escape');
    await rienEcrit(`${cas}, fiche de catégorie`, page, avant, objet);
    // La fiche d'objet après « Suivant », fermée telle quelle.
    objet = await ajouter(page, { nom: 'Écharpe', categorie: 'c-vet' });
    await oui(page);
    await nouvelleCategorie(page);
    await etiquette(page, 'e-pla');
    await suivant(page);
    juge.exige((await lireFiche(page))?.bouton === b.ajouter, `${cas} : pas de fiche d'objet après « Suivant »`);
    await page.click(`${FICHE} .fenetre-pied [data-fermer]`);
    await rienEcrit(`${cas}, fiche d'objet après « Suivant »`, page, avant, objet);
    // La fiche d'objet modifiée : « Abandonner » après la question.
    objet = await ajouter(page, { nom: 'Savon', categorie: 'c-toi' });
    await oui(page);
    await etiquette(page, 'e-pla');
    await page.click(`${FICHE} .fenetre-pied [data-fermer]`);
    await attendreQuestion(page);
    await repondre(page, m.abandon.abandonner);
    await rienEcrit(`${cas}, fiche d'objet modifiée`, page, avant, objet);
    await fermerEssai(juge, cas, ouvert);
  }

  // La question ne se pose qu'après un ajout : jamais pour un objet venu de la bibliothèque (régler, renommer).
  {
    const cas = 'objet venu de la bibliothèque';
    const ouvert = await ouvrirEssai({ format: 'telephone-etroit' });
    const { page } = ouvert;
    await ouvrirFiche(page, 'o-den');
    await page.click('dialog.fiche-voyage [data-fiche="quantite-plus"]');
    await calme(page);
    const apresReglage = await lireQuestion(page);
    await toucherFiche(page, 'renommer');
    await attendreQue(page, () => document.querySelector('dialog.fiche-nom'));
    await page.fill('dialog.fiche-nom #f-nom', 'Dentifrice bio');
    await page.click('dialog.fiche-nom [data-enregistrer]');
    await attendreQue(page, () => !document.querySelector('dialog.fiche-nom'));
    await calme(page);
    juge.exige(
      apresReglage === null && (await lireQuestion(page)) === null,
      `${cas} : question posée ${vu(apresReglage)} ${vu(await lireQuestion(page))}`,
    );
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
  'Ajouter aussi à la bibliothèque',
  '« Non », catégorie connue, catégorie choisie ou neuve, abandon à chaque étape, objet venu de la bibliothèque, panne, captures',
);
