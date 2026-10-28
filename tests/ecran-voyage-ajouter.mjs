// Phase 8 (docs/superpowers/specs/2026-10-28-phase-8-ajuster-design.md ; maquette docs/maquettes/ajuster/) :
// « Ajouter un objet » à un voyage, au besoin dans une catégorie propre au voyage (la suite : voyage vide,
// retraits, panne et captures, tests/ecran-voyage-ajouter-vide-panne.mjs).
// - au téléphone, le bouton flottant ouvre la fiche, partie de la dernière catégorie dépliée touchée, sinon
//   de la première ; en grand écran, la ligne « Ajouter un objet » part de la catégorie choisie ;
// - ajouter dans une catégorie existante : l'objet apparaît à sa place, éclairé, 0 sur N, sans « partagé »,
//   fixé manuellement, et le reste à la relecture ; la bibliothèque ne change pas ;
// - ajouter dans une catégorie neuve : elle naît en dernier avec l'objet (critère du plan : la bibliothèque
//   inchangée) ; rien n'est écrit avant « Ajouter » ;
// - abandonner (liste, « Nouvelle catégorie », fiche) ne crée rien, pas même la catégorie neuve ;
// - sans nom, refusé ; noms piégés (<, &, ") lus tels quels.
import { chromium } from 'playwright';
import { ordreDansLeSac } from '../src/modele/sac.js';
import { attendreQue, calme } from './outils/attente.mjs';
import {
  attendreQuestion,
  fr,
  ligne,
  lireQuestion,
  ouvrirFiche,
  ouvrirVoyage,
  remplir,
  repondre,
  vu,
} from './outils/ajuster.mjs';
import {
  AJOUT,
  AVEC_BIBLIOTHEQUE,
  CHOIX,
  FLOTTANT,
  NOUVELLE,
  ajoute,
  choisir,
  creerCategorie,
  fermerAjout,
  focusSur,
  lignesDe,
  lireAjout,
  lireChoix,
  lireNouvelle,
  ouvrirChoix,
  pareil,
  partie,
  remplirEtAjouter,
  sansIdNiDate,
  toucherAjouter,
} from './outils/ajouter.mjs';
import { fermerEssai } from './outils/bibliotheque.mjs';
import { attendreEcran, creerJuge, lireStockage } from './outils/page.mjs';
import { demarrerServeur } from './outils/serveur.mjs';

const a = fr.ajustement.ajout;
const juge = creerJuge();
const serveur = await demarrerServeur();
const navigateur = await chromium.launch();
const ouvrirEssai = (options = {}) => ouvrirVoyage(navigateur, serveur.url, { donnees: AVEC_BIBLIOTHEQUE, ...options });
const PIEGE = 'Coton <i>&</i> "tige"';
const CAT_PIEGE = 'Plongée <b>&</b> "apnée"';

try {
  // Téléphone : le bouton flottant, et la catégorie d'où part la fiche.
  {
    const cas = 'téléphone, bouton flottant';
    const ouvert = await ouvrirEssai({ format: 'telephone-etroit' });
    const { page } = ouvert;
    const flottant = await page.evaluate(
      s => ({
        texte: document.querySelector(s)?.textContent.trim() ?? null,
        place: document.querySelector('#app main').classList.contains('ecran-avec-flottant'),
      }),
      FLOTTANT,
    );
    juge.exige(flottant.texte === fr.voyage.ajouter && flottant.place, `${cas} : bouton ${vu(flottant)}`);
    // Sans rien toucher : la première catégorie.
    await toucherAjouter(page, FLOTTANT);
    const fiche = await lireAjout(page);
    juge.exige(
      fiche?.titre === a.titre &&
        fiche.sousTitre === a.voyageSeulement &&
        fiche.nom === '' &&
        fiche.categorie === 'Papiers' &&
        fiche.sous === remplir(a.objetsDansCeVoyage.other, { n: 2 }) &&
        fiche.couleur === 'tournesol' &&
        fiche.quantite === '1' &&
        fiche.quantiteAide === a.pourToutLeVoyage &&
        fiche.bouton === a.ajouter &&
        vu(fiche.erreurs) === '[]',
      `${cas} : fiche au départ ${vu(fiche)}`,
    );
    await fermerAjout(page);
    juge.exige((await focusSur(page)) === 'ajouter', `${cas} : focus rendu à ${await focusSur(page)}`);
    // Toilette repliée puis dépliée : elle est la dernière dépliée touchée.
    await page.click('#app [data-action="accordeon"][data-id="c-toi"]');
    await page.click('#app [data-action="accordeon"][data-id="c-toi"]');
    await toucherAjouter(page, FLOTTANT);
    juge.exige((await lireAjout(page))?.categorie === 'Toilette', `${cas} : après Toilette dépliée`);
    await fermerAjout(page);
    // La fiche de Repas, ouverte puis fermée : Alimentation.
    await ouvrirFiche(page, 'o-rep');
    await page.keyboard.press('Escape');
    await partie(page, 'dialog.fiche-voyage');
    await toucherAjouter(page, FLOTTANT);
    juge.exige((await lireAjout(page))?.categorie === 'Alimentation', `${cas} : après la fiche de Repas`);
    await fermerAjout(page);
    // Alimentation repliée : plus dépliée, la fiche repart de la première.
    await page.click('#app [data-action="accordeon"][data-id="c-ali"]');
    await toucherAjouter(page, FLOTTANT);
    juge.exige((await lireAjout(page))?.categorie === 'Papiers', `${cas} : après Alimentation repliée`);
    await fermerAjout(page);
    await fermerEssai(juge, cas, ouvert);
  }

  // Grand écran : la dernière ligne de la liste, partie de la catégorie choisie ; pas de bouton flottant.
  for (const format of ['ordinateur', 'tablette-paysage']) {
    const cas = `grand écran (${format})`;
    const ouvert = await ouvrirEssai({ format });
    const { page } = ouvert;
    await page.click('#app .gf-menu [data-action="choisir"][data-id="c-toi"]');
    await calme(page);
    const lignes = await lignesDe(page, 'c-toi');
    juge.exige(
      lignes.at(-1) === 'ajout:c-toi' && (await page.$(FLOTTANT)) === null,
      `${cas} : lignes ${vu(lignes)}, flottant ${Boolean(await page.$(FLOTTANT))}`,
    );
    await toucherAjouter(page, '#app .objet-ajout [data-action="ajouter"]');
    const fiche = await lireAjout(page);
    juge.exige(
      fiche?.categorie === 'Toilette' && fiche.sous === remplir(a.objetsDansCeVoyage.other, { n: 3 }),
      `${cas} : fiche ${vu(fiche)}`,
    );
    await fermerAjout(page);
    juge.exige((await focusSur(page)) === 'ajouter', `${cas} : focus rendu à ${await focusSur(page)}`);
    await fermerEssai(juge, cas, ouvert);
  }

  // Dans une catégorie existante : à sa place, éclairé, 0 sur 3, sans « partagé » ; la bibliothèque intacte.
  {
    const cas = 'catégorie existante';
    const ouvert = await ouvrirEssai({ format: 'telephone-etroit' });
    const { page } = ouvert;
    const avant = await lireStockage(page);
    await page.click('#app [data-action="accordeon"][data-id="c-toi"]');
    await page.click('#app [data-action="accordeon"][data-id="c-toi"]');
    await toucherAjouter(page, FLOTTANT);
    await remplirEtAjouter(page, { nom: PIEGE, plus: 2 });
    await partie(page, AJOUT);
    const stocke = await lireStockage(page);
    const nouveau = stocke.objetsDuVoyage.find(o => o.nom === PIEGE);
    juge.exige(
      pareil(sansIdNiDate(nouveau ?? {}) ?? {}, ajoute('c-toi', PIEGE, 3)) &&
        stocke.categoriesDuVoyage.length === avant.categoriesDuVoyage.length &&
        vu(stocke.bibliotheque) === vu(avant.bibliotheque),
      `${cas} : stocké ${vu(nouveau)}, catégories ${stocke.categoriesDuVoyage.length}`,
    );
    const id = nouveau?.id;
    await attendreQue(page, i => document.querySelector(`#app .objet[data-id="${CSS.escape(i)}"]`), id);
    const vue = await ligne(page, id);
    const details = await page.evaluate(i => {
      const li = document.querySelector(`#app .objet[data-id="${CSS.escape(i)}"]`);
      return { etat: li?.dataset.etat, sous: Boolean(li?.querySelector('.objet-sous')) };
    }, id);
    const voulu = ordreDansLeSac(stocke.objetsDuVoyage.filter(o => o.categorieId === 'c-toi')).map(o => o.id);
    juge.exige(
      vue?.nom === PIEGE &&
        vue.quantite === '3' &&
        vue.recent &&
        vue.balises === 0 &&
        details.etat === 'vide' &&
        !details.sous &&
        vu(await lignesDe(page, 'c-toi')) === vu(voulu),
      `${cas} : ligne ${vu(vue)} ${vu(details)}, ordre ${vu(await lignesDe(page, 'c-toi'))} / ${vu(voulu)}`,
    );
    // « Ajouter aussi à la bibliothèque ? » (tests/ecran-voyage-ajout-bibliotheque.mjs) : « Non » rend le focus.
    await attendreQuestion(page);
    await repondre(page, fr.ajustement.bibliotheque.non);
    await calme(page);
    juge.exige((await focusSur(page)) === id, `${cas} : focus sur ${await focusSur(page)}`);
    // Relu : toujours là, toujours fixé à la main.
    await page.reload();
    await attendreEcran(page, 'voyage');
    juge.exige((await ligne(page, id))?.quantite === '3', `${cas} : après relecture ${vu(await ligne(page, id))}`);
    await fermerEssai(juge, cas, ouvert);
  }

  // Dans une catégorie neuve : la liste, « Nouvelle catégorie », puis l'objet, et elle naît en dernier.
  for (const format of ['telephone-etroit', 'ordinateur']) {
    const cas = `catégorie neuve (${format})`;
    const ouvert = await ouvrirEssai({ format });
    const { page } = ouvert;
    const avant = await lireStockage(page);
    await toucherAjouter(page);
    await ouvrirChoix(page);
    const choix = await lireChoix(page);
    const depart = format === 'ordinateur' ? 'c-vet' : 'c-pap';
    const n = id => avant.objetsDuVoyage.filter(o => o.categorieId === id).length;
    const attendues = [
      ...['c-pap', 'c-vet', 'c-toi', 'c-ali'].map(id => ({
        id,
        nom: avant.categoriesDuVoyage.find(c => c.id === id).nom,
        sous: remplir(fr.ajustement.choix.objets.other, { n: n(id) }),
        retenue: id === depart,
        coche: id === depart,
      })),
      {
        id: 'nouvelle',
        nom: fr.ajustement.choix.nouvelle,
        sous: fr.ajustement.choix.pourCeVoyage,
        retenue: false,
        coche: false,
      },
    ];
    juge.exige(
      choix?.titre === fr.ajustement.choix.titre &&
        vu(choix.lignes) === vu(attendues) &&
        vu(choix.boutons) === vu([fr.fenetre.annuler]),
      `${cas} : liste ${vu(choix)}`,
    );
    await choisir(page, 'nouvelle');
    const nouvelle = await lireNouvelle(page);
    juge.exige(
      nouvelle?.titre === fr.modele.categorie.nouvelle &&
        nouvelle.sousTitre === fr.ajustement.nouvelleCategorie.texte &&
        nouvelle.nom === '' &&
        nouvelle.libelle &&
        nouvelle.pave === 'corail' &&
        nouvelle.picto === fr.catalogue.pictos['suitcase-rolling'].nom &&
        nouvelle.teintes === 8 &&
        nouvelle.bouton === fr.ajustement.nouvelleCategorie.choisir,
      `${cas} : nouvelle catégorie ${vu(nouvelle)}`,
    );
    // « Choisir » sans nom : refusé, la fiche reste.
    await page.click(`${NOUVELLE} [data-enregistrer]`);
    await calme(page);
    const refusee = await lireNouvelle(page);
    juge.exige(
      vu(refusee?.erreurs) === vu([fr.modele.categorie.erreurs.nomManquant]),
      `${cas} : « Choisir » sans nom ${vu(refusee)}`,
    );
    await page.fill(`${NOUVELLE} input[data-texte="nom"]`, CAT_PIEGE);
    await page.click(`${NOUVELLE} .teinte[data-valeur="lilas"]`);
    await page.click(`${NOUVELLE} [data-enregistrer]`);
    await partie(page, NOUVELLE);
    await calme(page);
    const retenue = await lireAjout(page);
    const rien = await lireStockage(page);
    juge.exige(
      retenue?.categorie === CAT_PIEGE &&
        retenue.sous === a.nouvelleSousTitre &&
        retenue.couleur === 'lilas' &&
        retenue.balises === 0 &&
        retenue.focus === 'categorie' &&
        rien.categoriesDuVoyage.length === avant.categoriesDuVoyage.length,
      `${cas} : catégorie retenue ${vu(retenue)}, ${rien.categoriesDuVoyage.length} catégories stockées`,
    );
    await remplirEtAjouter(page, { nom: 'Palmes' });
    await partie(page, AJOUT);
    const stocke = await lireStockage(page);
    const categorie = stocke.categoriesDuVoyage.find(c => c.nom === CAT_PIEGE);
    const objet = stocke.objetsDuVoyage.find(o => o.nom === 'Palmes');
    juge.exige(
      pareil(sansIdNiDate(categorie ?? {}) ?? {}, {
        voyageId: 'v1',
        modeleId: null,
        nom: CAT_PIEGE,
        icone: 'suitcase-rolling',
        couleur: 'lilas',
        ordre: 4,
      }) &&
        pareil(sansIdNiDate(objet ?? {}) ?? {}, ajoute(categorie?.id, 'Palmes', 1)) &&
        vu(stocke.bibliotheque) === vu(avant.bibliotheque),
      `${cas} : stockés ${vu(categorie)} ${vu(objet)}`,
    );
    await attendreQue(page, i => document.querySelector(`#app .objet[data-id="${CSS.escape(i)}"]`), objet?.id);
    const ecran = await page.evaluate(() => {
      const dernier = [...document.querySelectorAll('#app .categorie, #app .gf-menu [data-action="choisir"]')].at(-1);
      return {
        derniere: dernier?.dataset.id ?? null,
        ouverte:
          dernier?.querySelector('.categorie-tete')?.getAttribute('aria-expanded') ??
          dernier?.getAttribute('aria-current'),
        nom: dernier?.querySelector('.categorie-nom b')?.textContent ?? null,
      };
    });
    juge.exige(
      ecran.derniere === categorie?.id &&
        ecran.ouverte === 'true' &&
        ecran.nom === CAT_PIEGE &&
        (await ligne(page, objet?.id))?.recent &&
        vu(await lignesDe(page, categorie?.id)).includes(objet?.id),
      `${cas} : écran ${vu(ecran)}, ligne ${vu(await ligne(page, objet?.id))}`,
    );
    await fermerEssai(juge, cas, ouvert);
  }

  // Abandonner en chemin : rien n'est créé, pas même la catégorie neuve.
  {
    const cas = 'abandon';
    const ouvert = await ouvrirEssai({ format: 'telephone-etroit' });
    const { page } = ouvert;
    const avant = await lireStockage(page);
    await toucherAjouter(page, FLOTTANT);
    await page.fill(`${AJOUT} #f-nom`, 'Masque');
    await creerCategorie(page, { nom: 'Plongée', couleur: 'lilas' });
    // La liste rouverte : la catégorie neuve n'y est pas encore, aucune n'est retenue.
    await ouvrirChoix(page);
    const choix = await lireChoix(page);
    juge.exige(!choix?.lignes.some(l => l.retenue || l.nom === 'Plongée'), `${cas} : liste rouverte ${vu(choix)}`);
    // « Nouvelle catégorie » reprend la saisie ; l'abandonner garde celle d'avant.
    await choisir(page, 'nouvelle');
    const reprise = await lireNouvelle(page);
    juge.exige(reprise?.nom === 'Plongée' && reprise.pave === 'lilas', `${cas} : reprise ${vu(reprise)}`);
    await page.fill(`${NOUVELLE} input[data-texte="nom"]`, 'Apnée');
    await page.click(`${NOUVELLE} .fenetre-pied [data-fermer]`);
    await attendreQuestion(page);
    const questionCategorie = await lireQuestion(page);
    await repondre(page, fr.modele.abandon.abandonner);
    await partie(page, NOUVELLE);
    await calme(page);
    juge.exige(
      questionCategorie?.titre === fr.ajustement.nouvelleCategorie.abandonTitre &&
        vu(questionCategorie.textes) === vu([fr.modele.categorie.abandonNouvelle]) &&
        (await lireAjout(page))?.categorie === 'Plongée',
      `${cas} : abandon de la catégorie ${vu(questionCategorie)}, fiche ${vu(await lireAjout(page))}`,
    );
    // La liste fermée par « Annuler » : rien ne change.
    await ouvrirChoix(page);
    await page.click(`${CHOIX} .fenetre-pied [data-fermer]`);
    await partie(page, CHOIX);
    await calme(page);
    juge.exige((await lireAjout(page))?.categorie === 'Plongée', `${cas} : liste annulée`);
    // La fiche fermée : « Abandonner cet objet ? ».
    await page.click(`${AJOUT} .fenetre-pied [data-fermer]`);
    await attendreQuestion(page);
    const question = await lireQuestion(page);
    await repondre(page, fr.modele.abandon.abandonner);
    await partie(page, AJOUT);
    await calme(page);
    const apres = await lireStockage(page);
    juge.exige(
      question?.titre === a.abandon.titre &&
        vu(question.textes) === vu([a.abandon.texte]) &&
        vu(apres.categoriesDuVoyage) === vu(avant.categoriesDuVoyage) &&
        vu(apres.objetsDuVoyage) === vu(avant.objetsDuVoyage) &&
        (await page.$$('#app .categorie')).length === 4,
      `${cas} : question ${vu(question)}, ${apres.categoriesDuVoyage.length} catégories, ${apres.objetsDuVoyage.length} objets`,
    );
    await fermerEssai(juge, cas, ouvert);
  }

  // La quantité : − inactif à 1, + inactif à 999, 1000 tapé ramené à 999 ; vidée, elle revient à 1 en
  // quittant le champ (maquette validée).
  {
    const cas = 'quantité';
    const ouvert = await ouvrirEssai({ format: 'telephone-etroit' });
    const { page } = ouvert;
    await toucherAjouter(page, FLOTTANT);
    const champ = `${AJOUT} input[data-nombre="quantite"]`;
    const bornes = () =>
      page.evaluate(s => {
        const inactif = sens =>
          document.querySelector(`${s} [data-pas="quantite"][data-sens="${sens}"]`)?.getAttribute('aria-disabled') ===
          'true';
        return {
          valeur: document.querySelector(`${s} input[data-nombre="quantite"]`).value,
          moins: inactif(-1),
          plus: inactif(1),
        };
      }, AJOUT);
    const depart = await bornes();
    await page.fill(champ, '1000');
    const haut = await bornes();
    await page.fill(champ, '');
    await page.focus(`${AJOUT} #f-nom`);
    await calme(page);
    const vide = await bornes();
    juge.exige(
      vu(depart) === vu({ valeur: '1', moins: true, plus: false }) &&
        vu(haut) === vu({ valeur: '999', moins: false, plus: true }) &&
        vu(vide) === vu({ valeur: '1', moins: true, plus: false }),
      `${cas} : au départ ${vu(depart)}, 1000 tapé ${vu(haut)}, vidée puis quittée ${vu(vide)}`,
    );
    await fermerEssai(juge, cas, ouvert);
  }

  // Sans nom : refusé, le nom en faute reçoit le focus ; rien n'est écrit.
  {
    const cas = 'sans nom';
    const ouvert = await ouvrirEssai({ format: 'telephone-etroit' });
    const { page } = ouvert;
    const avant = await lireStockage(page);
    await toucherAjouter(page, FLOTTANT);
    await page.click(`${AJOUT} [data-enregistrer]`);
    await calme(page);
    const fiche = await lireAjout(page);
    juge.exige(
      vu(fiche?.erreurs) === vu([fr.modele.objet.erreurs.nomManquant]) &&
        vu(fiche.invalides) === vu(['f-nom']) &&
        fiche.focus === 'f-nom' &&
        vu((await lireStockage(page)).objetsDuVoyage) === vu(avant.objetsDuVoyage),
      `${cas} : ${vu(fiche)}`,
    );
    await fermerEssai(juge, cas, ouvert);
  }
} finally {
  await navigateur.close();
  await serveur.fermer();
}
juge.conclure(
  'Ajouter un objet au voyage',
  'bouton flottant, ligne du grand écran, catégorie existante ou neuve, abandon, sans nom',
);
