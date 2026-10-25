// Phase 5 (docs/PLAN.md) : la fiche d'un objet modèle (maquette validée le 2026-10-25,
// docs/maquettes/bibliotheque/, états « fiche-objet », « nouvel-objet », « refus »).
// - fiche de Repas : « Par jour » coché, 2, plafond inactif, « Par personne », encadré « 2 par jour et
//   par personne » et « Pour 4 jours, 3 nuits et 2 voyageurs : 16. » ; plafond activé puis 6 → « … : 12. » ;
//   « Fixe » → plus de plafond ;
// - Review Focus 5 : valeur vidée puis « Enregistrer » → « Indiquez une quantité, de 1 à 999. » à sa
//   place, rien ne bouge au-dessus, rien d'écrit ; « 0 » → 1 ; « 1000 » → 999 ; « 12a » → 12 ; − / +
//   ne sortent pas de 1 à 999 ;
// - nouvel objet dans Alimentation : « Ajouter l’objet » sans nom → « Donnez un nom à cet objet. » et
//   focus sur le nom ; « Pâtes », par jour → rangé entre Gourde et Repas, éclairé, enregistré ;
// - Review Focus 1 : un objet nommé <i>Pâtes</i> & "riz" reste du texte dans sa ligne et le titre de
//   sa fiche.
import { chromium } from 'playwright';
import { demarrerServeur } from './outils/serveur.mjs';
import {
  fermerEssai,
  fr,
  lire,
  ouvrirBibliotheque as ouvrirLaBibliotheque,
  remplir,
  vu,
} from './outils/bibliotheque.mjs';
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
import { creerJuge } from './outils/page.mjs';

const juge = creerJuge();
const serveur = await demarrerServeur();
const navigateur = await chromium.launch();
const ouvrirBibliotheque = (format, options) => ouvrirLaBibliotheque(navigateur, serveur.url, format, options);
const fermer = (cas, ouvert) => fermerEssai(juge, cas, ouvert);
const o = m.objet;
const regle = (cle, valeurs) => remplir(fr.regle[cle], valeurs);

// La place des blocs de la quantité, du nom jusqu'au message sous la quantité.
const places = page =>
  page.evaluate(selecteur => {
    const d = document.querySelector(selecteur);
    return ['#f-nom', '.segments', '.lecture', '#f-valeur-erreur'].map(s =>
      Math.round(d.querySelector(s)?.getBoundingClientRect().top ?? -1),
    );
  }, FICHE);

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
      vu(repas.choix) === vu([o.parJour, o.parPersonne, m.toujoursInclus]) &&
      repas.valeur === '2' &&
      repas.plafondActif === 'false' &&
      repas.plafond === null &&
      vu(repas.lecture) === vu([regle('parJourParPersonne', { valeur: 2 }), exemple(16)]),
    `${cas} : ${vu(repas)}`,
  );
  await toucher(page, '[data-bascule="plafondActif"]');
  await saisir(page, 'input[data-nombre="plafond"]', '6');
  const plafond = await lireFiche(page);
  juge.exige(
    plafond?.plafondActif === 'true' &&
      plafond.plafond === '6' &&
      vu(plafond.lecture) ===
        vu([
          regle('plafondParPersonne', { regle: regle('parJourParPersonne', { valeur: 2 }), plafond: 6 }),
          exemple(12),
        ]),
    `${cas} : plafond à 6 ${vu(plafond)}`,
  );
  await segment(page, o.fixe);
  const fixe = await lireFiche(page);
  juge.exige(
    fixe?.plafondActif === null &&
      fixe.plafond === null &&
      vu(fixe.lecture) === vu([regle('fixeParPersonne', { valeur: 2 }), exemple(4)]),
    `${cas} : Fixe ${vu(fixe)}`,
  );
  await segment(page, o.parJour);

  // Review Focus 5 : valeur vidée, refusée à sa place ; puis ramenée entre 1 et 999.
  const avant = await places(page);
  await saisir(page, 'input[data-nombre="valeur"]', '');
  await enregistrer(page);
  const vide = await lireFiche(page);
  const apres = await places(page);
  juge.exige(
    vu(vide?.erreurs) === vu([o.erreurs.valeurManquante]) &&
      vide.focus === 'valeur' &&
      vu(vide.lecture) === vu([o.aIndiquer, o.aIndiquerAide]),
    `${cas} : valeur vide ${vu(vide)}`,
  );
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
      vu(neuf.choix) === vu([o.fixe, o.parPersonne, m.toujoursInclus]) &&
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
  await essaiNouvelObjet();
  await essaiNomPiege();
} finally {
  await navigateur.close();
  await serveur.fermer();
}
juge.conclure('Fiches d’objet', 'Repas, plafond, Fixe, valeurs bornées, nouvel objet, nom piégé');
