// Phase 5 (docs/PLAN.md) : la fiche d'un objet modèle (maquette validée le 2026-10-25,
// docs/maquettes/bibliotheque/, états « fiche-objet », « nouvel-objet », « refus »).
// - fiche de Repas : « Par jour » coché, 2, plafond inactif, « Par personne », encadré « 2 par jour et
//   par personne » et « Pour 10 jours, 9 nuits et 3 voyageurs : 60. » ; plafond activé puis 6 → « … : 18. » ;
//   « Fixe » → plus de plafond ;
// - Review Focus 5 : valeur vidée puis « Enregistrer » → « Indiquez une quantité, de 1 à 999. » à sa
//   place, rien ne bouge au-dessus, rien d'écrit ; « 0 » → 1 ; « 1000 » → 999 ; « 12a » → 12 ; − / +
//   ne sortent pas de 1 à 999 ;
// - curseur : « 1|2 » + 5 → « 15|2 » (rien de réécrit) ; « 1|2 » + a → « 1|2 » (le « a » retiré) ;
//   « 1| » effacé → champ vide ;
// - phase 13 : « Par semaine » (« Chaque semaine », exemple « (2 semaines) »), « Pour qui » Enfants puis
//   « Partagé » (résumé, exemple, « Sans enfant dans le voyage… »), enregistré puis relu tel quel ;
// - nouvel objet dans Alimentation : « Ajouter l’objet » sans nom → « Donnez un nom à cet objet. » et
//   focus sur le nom ; « Pâtes », par jour → rangé entre Gourde et Repas, éclairé, enregistré ;
// - Review Focus 1 : un objet nommé <i>Pâtes</i> & "riz" reste du texte dans sa ligne et le titre de
//   sa fiche.
import { join } from 'node:path';
import { chromium } from 'playwright';
import { calme } from './outils/attente.mjs';
import { demarrerServeur } from './outils/serveur.mjs';
import { fermerEssai, lire, ouvrirBibliotheque as ouvrirLaBibliotheque, remplir, vu } from './outils/bibliotheque.mjs';
import {
  FICHE,
  attendreFermee,
  bibliothequeStockee,
  eclaire,
  enregistrer,
  exemple,
  lireFiche,
  m,
  ouvrirFicheObjet,
  ouvrirNouvelObjet,
  saisir,
  segment,
  toucher,
} from './outils/fiches.mjs';
import { CAPTURES, creerJuge } from './outils/page.mjs';

const juge = creerJuge();
const serveur = await demarrerServeur();
const navigateur = await chromium.launch();
const ouvrirBibliotheque = (format, options) => ouvrirLaBibliotheque(navigateur, serveur.url, format, options);
const fermer = (cas, ouvert) => fermerEssai(juge, cas, ouvert);
const o = m.objet;

// La place des blocs de la quantité, du nom jusqu'au message sous la quantité.
const places = page =>
  page.evaluate(selecteur => {
    const d = document.querySelector(selecteur);
    return ['#f-nom', '.segments', '.lecture', '#f-valeur-erreur'].map(s =>
      Math.round(d.querySelector(s)?.getBoundingClientRect().top ?? -1),
    );
  }, FICHE);

// Une touche frappée dans la quantité, le curseur posé à « place » dans « texte » : rend le texte et
// la place du curseur après la frappe (« | » marque le curseur dans les messages).
async function frapper(page, texte, place, touche) {
  const champ = page.locator(`${FICHE} input[data-nombre="valeur"]`);
  await champ.fill(texte);
  await champ.evaluate((c, p) => c.setSelectionRange(p, p), place);
  await page.keyboard.press(touche);
  await calme(page);
  return champ.evaluate(c => `${c.value.slice(0, c.selectionStart)}|${c.value.slice(c.selectionStart)}`);
}

async function essaiRepas() {
  const cas = 'fiche de Repas';
  const ouvert = await ouvrirBibliotheque('telephone');
  const { page } = ouvert;
  juge.exige(await ouvrirFicheObjet(page, 'Alimentation', 'Repas'), `${cas} : la fiche ne s'ouvre pas`);
  const repas = await lireFiche(page);
  juge.exige(
    repas?.titre === 'Repas' &&
      repas.sousTitre === remplir(o.dans, { categorie: 'Alimentation' }) &&
      repas.bouton === m.enregistrer &&
      vu(repas.choix) === vu([o.parJour, o.groupes.tous, o.par.tous, m.toujoursInclus]) &&
      repas.valeur === '2' &&
      repas.plafondActif === 'false' &&
      repas.plafond === null &&
      vu(repas.lecture) === vu(['2 par jour et par personne', exemple(60)]),
    `${cas} : ${vu(repas)}`,
  );
  await toucher(page, '[data-bascule="plafondActif"]');
  await saisir(page, 'input[data-nombre="plafond"]', '6');
  const plafond = await lireFiche(page);
  juge.exige(
    plafond?.plafondActif === 'true' &&
      plafond.plafond === '6' &&
      vu(plafond.lecture) === vu(['2 par jour, au plus 6, par personne', exemple(18)]),
    `${cas} : plafond à 6 ${vu(plafond)}`,
  );
  await segment(page, o.fixe);
  const fixe = await lireFiche(page);
  juge.exige(
    fixe?.plafondActif === null && fixe.plafond === null && vu(fixe.lecture) === vu(['2 par personne', exemple(6)]),
    `${cas} : Fixe ${vu(fixe)}`,
  );
  await segment(page, o.parJour);

  // Review Focus 5 : valeur vidée, refusée à sa place ; puis ramenée entre 1 et 999.
  const avant = await places(page);
  await saisir(page, 'input[data-nombre="valeur"]', '');
  await enregistrer(page);
  const vide = await lireFiche(page);
  const apres = await places(page);
  await page.screenshot({ path: join(CAPTURES, 'fiche-objet-quantite-videe-telephone.png') });
  juge.exige(
    vu(vide?.erreurs) === vu([o.erreurs.valeurManquante]) &&
      vide.focus === 'valeur' &&
      vu(vide.lecture) === vu([o.aIndiquer, o.aIndiquerAide]),
    `${cas} : valeur vide ${vu(vide)}`,
  );
  // Le nom, les segments, l'encadré et le message restent en place : l'encadré garde sa hauteur, que son
  // exemple chiffré fasse deux lignes ou « Quantité à indiquer » une seule.
  juge.exige(vu(apres) === vu(avant), `${cas} : le message a déplacé la fiche ${vu({ avant, apres })}`);
  const repasStocke = (await bibliothequeStockee(page)).objets.find(x => x.nom === 'Repas');
  juge.exige(repasStocke?.valeur === 2 && repasStocke.regle === 'par_jour', `${cas} : écrit ${vu(repasStocke)}`);
  for (const [tape, lu] of [
    ['0', '1'],
    ['1000', '999'],
    ['12a', '12'],
  ]) {
    await saisir(page, 'input[data-nombre="valeur"]', tape);
    const fiche = await lireFiche(page);
    juge.exige(fiche?.valeur === lu && fiche.erreurs.length === 0, `${cas} : « ${tape} » → ${vu(fiche?.valeur)}`);
  }
  // Le curseur reste où l'on tape : rien de réécrit si la valeur est déjà la bonne, sinon juste après
  // la frappe, décalé de ce qui est retiré avant lui.
  for (const [texte, place, touche, attendu] of [
    ['12', 1, '5', '15|2'],
    ['12', 1, 'a', '1|2'],
    ['1', 1, 'Backspace', '|'],
  ]) {
    const lu = await frapper(page, texte, place, touche);
    juge.exige(lu === attendu, `${cas} : « ${texte.slice(0, place)}|${texte.slice(place)} » + ${touche} → « ${lu} »`);
  }
  await saisir(page, 'input[data-nombre="valeur"]', '999');
  await toucher(page, '[data-pas="valeur"][data-sens="1"]', { force: true });
  const haut = await lireFiche(page);
  await saisir(page, 'input[data-nombre="valeur"]', '1');
  await toucher(page, '[data-pas="valeur"][data-sens="-1"]', { force: true });
  const bas = await lireFiche(page);
  juge.exige(haut?.valeur === '999' && bas?.valeur === '1', `${cas} : − / + bornés ${vu([haut?.valeur, bas?.valeur])}`);
  // Témoin : + avance bien d'un.
  await toucher(page, '[data-pas="valeur"][data-sens="1"]');
  juge.exige((await lireFiche(page))?.valeur === '2', `${cas} : + n'ajoute rien`);
  await fermer(cas, ouvert);
}

// Phase 13 : « Par semaine » et « Pour qui » (maquette validée, docs/maquettes/bibliotheque-depart/).
async function essaiPourQui() {
  const cas = 'pour qui et par semaine';
  const ouvert = await ouvrirBibliotheque('telephone');
  const { page } = ouvert;
  juge.exige(await ouvrirFicheObjet(page, 'Alimentation', 'Repas'), `${cas} : la fiche ne s'ouvre pas`);
  const depart = await lireFiche(page);
  juge.exige(
    vu(depart?.regles) === vu([o.fixe, o.parJour, o.parNuit, o.parSemaine]) && depart.absent === null,
    `${cas} : règles ${vu(depart)}`,
  );
  await segment(page, o.parSemaine);
  const semaine = await lireFiche(page);
  juge.exige(
    semaine?.libelleNombre === o.chaqueSemaine &&
      vu(semaine.lecture) === vu(['2 par semaine et par personne', exemple(12, { semaines: true })]),
    `${cas} : par semaine ${vu(semaine)}`,
  );
  await segment(page, o.groupes.enfants);
  await segment(page, o.partage);
  const enfants = await lireFiche(page);
  juge.exige(
    vu(enfants?.choix) === vu([o.parSemaine, o.groupes.enfants, o.partage, m.toujoursInclus]) &&
      vu(enfants.lecture) === vu(['2 par semaine, partagé entre les enfants', exemple(4, { semaines: true })]) &&
      enfants.absent === 'Sans enfant dans le voyage, il n’est pas proposé.',
    `${cas} : enfants partagé ${vu(enfants)}`,
  );
  await toucher(page, '[data-bascule="plafondActif"]');
  const plafond = await lireFiche(page);
  juge.exige(
    vu(plafond?.lecture) ===
      vu(['2 par semaine, au plus 2, partagé entre les enfants', exemple(2, { semaines: true })]),
    `${cas} : plafond ${vu(plafond)}`,
  );
  await segment(page, o.par.enfants);
  await enregistrer(page);
  juge.exige(await attendreFermee(page), `${cas} : la fiche reste ouverte`);
  const stocke = (await bibliothequeStockee(page)).objets.find(x => x.nom === 'Repas');
  juge.exige(
    stocke?.regle === 'par_semaine' && stocke.pourQui === 'enfants' && stocke.parPersonne === true,
    `${cas} : écrit ${vu(stocke)}`,
  );
  await ouvrirFicheObjet(page, 'Alimentation', 'Repas');
  const relu = await lireFiche(page);
  juge.exige(
    vu(relu?.choix) === vu([o.parSemaine, o.groupes.enfants, o.par.enfants, m.toujoursInclus]),
    `${cas} : relu ${vu(relu)}`,
  );
  await segment(page, o.partage);
  await enregistrer(page);
  juge.exige(await attendreFermee(page), `${cas} : la fiche reste ouverte (2)`);
  await ouvrirFicheObjet(page, 'Alimentation', 'Repas');
  const partage = await lireFiche(page);
  juge.exige(
    vu(partage?.choix) === vu([o.parSemaine, o.groupes.enfants, o.partage, m.toujoursInclus]),
    `${cas} : « Enfants, partagé » relu ${vu(partage)}`,
  );
  await fermer(cas, ouvert);
}

async function essaiNouvelObjet() {
  const cas = 'nouvel objet';
  const ouvert = await ouvrirBibliotheque('telephone');
  const { page } = ouvert;
  juge.exige(await ouvrirNouvelObjet(page, 'Alimentation'), `${cas} : la fiche ne s'ouvre pas`);
  const neuf = await lireFiche(page);
  juge.exige(
    neuf?.titre === o.nouveau &&
      neuf.bouton === o.ajouter &&
      neuf.nom === '' &&
      neuf.valeur === '1' &&
      vu(neuf.choix) === vu([o.fixe, o.groupes.tous, o.par.tous, m.toujoursInclus]) &&
      neuf.aide === remplir(o.aideToujours, { categorie: 'Alimentation' }),
    `${cas} : fiche neuve ${vu(neuf)}`,
  );
  await enregistrer(page);
  const refus = await lireFiche(page);
  juge.exige(
    vu(refus?.erreurs) === vu([o.erreurs.nomManquant]) && refus.focus === 'f-nom',
    `${cas} : sans nom ${vu(refus)}`,
  );
  // Le message suit la correction.
  await saisir(page, '#f-nom', 'Pâtes');
  juge.exige((await lireFiche(page))?.erreurs.length === 0, `${cas} : message resté après la saisie du nom`);
  await segment(page, o.parJour);
  await enregistrer(page);
  juge.exige(await attendreFermee(page), `${cas} : la fiche reste ouverte`);
  const alimentation = (await lire(page)).cartes.find(x => x.nom === 'Alimentation');
  juge.exige(
    vu(alimentation?.objets.map(x => x.nom)) === vu(['Gourde', 'Pâtes', 'Repas']),
    `${cas} : rangement ${vu(alimentation?.objets)}`,
  );
  juge.exige((await eclaire(page)) === 'Pâtes', `${cas} : éclairé ${vu(await eclaire(page))}`);
  const stockee = await bibliothequeStockee(page);
  const pates = stockee.objets.find(x => x.nom === 'Pâtes');
  const categorie = stockee.categories.find(x => x.nom === 'Alimentation');
  juge.exige(
    pates?.categorieId === categorie.id &&
      pates.regle === 'par_jour' &&
      pates.valeur === 1 &&
      pates.plafond === null &&
      pates.parPersonne &&
      !pates.consommable &&
      pates.toujoursInclus &&
      pates.note === '',
    `${cas} : stockage ${vu(pates)}`,
  );
  await fermer(cas, ouvert);
}

// Review Focus 1 : un nom piégé reste du texte (ligne, titre de la fiche).
async function essaiNomPiege() {
  const cas = 'nom piégé';
  const nom = '<i>Pâtes</i> & "riz"';
  const ouvert = await ouvrirBibliotheque('telephone');
  const { page } = ouvert;
  await ouvrirNouvelObjet(page, 'Alimentation');
  await saisir(page, '#f-nom', nom);
  await enregistrer(page);
  await attendreFermee(page);
  const ligne = (await lire(page)).cartes.find(x => x.nom === 'Alimentation')?.objets.map(x => x.nom);
  juge.exige(ligne?.includes(nom), `${cas} : ligne ${vu(ligne)}`);
  await ouvrirFicheObjet(page, 'Alimentation', nom);
  const fiche = await lireFiche(page);
  juge.exige(fiche?.titre === nom && fiche.nom === nom && fiche.balises === 0, `${cas} : fiche ${vu(fiche)}`);
  const balises = await page.evaluate(() => document.querySelectorAll('#app i').length);
  juge.exige(balises === 0, `${cas} : ${balises} balise(s) venue(s) du nom`);
  await fermer(cas, ouvert);
}

try {
  await essaiRepas();
  await essaiPourQui();
  await essaiNouvelObjet();
  await essaiNomPiege();
} finally {
  await navigateur.close();
  await serveur.fermer();
}
juge.conclure('Fiches d’objet', 'Repas, plafond, Fixe, valeurs bornées, curseur, nouvel objet, nom piégé');
