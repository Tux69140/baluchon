// Phase 7 (spec, « Maquettes validées », docs/maquettes/suppressions/bandeau.js) : le bandeau
// « Annuler » de 10 s (src/ecrans/annulation.js), après la suppression d'un objet ou d'une catégorie
// dans la Bibliothèque. L'horloge de la page est simulée (page.clock) : elle court d'elle-même, et le
// test ne l'arrête que pour mesurer les 10 s.
// - un objet supprimé, « Annuler » : il revient, éclairé, et le stockage est celui d'avant ;
// - une catégorie : ses objets et leurs liens reviennent, au même rang, la catégorie choisie et
//   dépliée (Review Focus 4) ;
// - le bandeau suit sur Mes voyages puis dans un voyage, sans repartir de zéro : à 9 s il est là, à
//   10,1 s parti (Review Focus 5) ;
// - une seconde suppression le remplace : « Annuler » ne rend que la seconde ;
// - une fiche ouverte : il passe dans la fenêtre, en haut, puis dans la question ouverte par-dessus ;
//   « Annuler » y répond ; la fenêtre fermée, il revient en bas ; enregistrer une fiche le retire
//   (Review Focus 5) ;
// - panne du rétablissement : il reste, message en haut ; un nouvel essai réussit ; double appui sur
//   « Annuler » pendant un rétablissement lent : un seul rétablissement (Review Focus 2 et 3) ;
// - noms « Sacs <&"> » affichés tels quels (Review Focus 1) ; la seule catégorie supprimée puis
//   rétablie revient d'une bibliothèque vide, choisie, dépliée et éclairée (Review Focus 4).
// L'aspect et la place, à tous les formats, sont dans tests/ecran-annulation-place.mjs.
import { chromium } from 'playwright';
import { construireBibliotheque } from '../src/modele/bibliotheque.js';
import { attendreQue, calme } from './outils/attente.mjs';
import {
  DONNEES,
  a,
  annuler,
  attendreSansBandeau,
  empreinte,
  lireBandeau,
  ouvrirAvecHorloge,
  supprimerCategorie,
  supprimerObjet,
  versMesVoyages,
} from './outils/annulation.mjs';
import { avecBibliotheque } from './outils/assistant.mjs';
import { DEPART, fermerEssai, fr, lire, remplir, vu } from './outils/bibliotheque.mjs';
import { libererEcritures } from './outils/etiquettes.mjs';
import {
  attendreFermee,
  bibliothequeStockee,
  eclaire,
  enregistrer,
  ouvrirFicheObjet,
  saisir,
  toucher,
} from './outils/fiches.mjs';
import { attendreEcran, creerJuge, ecrireStockage, lireStockage } from './outils/page.mjs';
import { demarrerServeur } from './outils/serveur.mjs';

const juge = creerJuge();
const serveur = await demarrerServeur();
const navigateur = await chromium.launch();
const FORMATS = ['telephone-etroit', 'tablette-paysage'];
const QUESTION = 'dialog[role="alertdialog"]';
const PIEGE = 'Sacs <&">';
const depart = fr.bibliothequeDeDepart;
const nomsDe = nom =>
  depart.categories
    .find(c => c.nom === nom)
    .objets.map(o => o.nom)
    .sort((x, y) => x.localeCompare(y, 'fr'));

// Une seule catégorie, au nom piégé, et son seul objet, au même nom (Review Focus 1).
const papiers = depart.categories.find(c => c.nom === 'Papiers');
let numero = 0;
const DONNEES_PIEGE = {
  ...DONNEES,
  ...avecBibliotheque(
    construireBibliotheque(
      {
        groupes: depart.groupes,
        categories: [{ ...papiers, nom: PIEGE, objets: [{ ...papiers.objets[0], nom: PIEGE }] }],
      },
      { nouvelId: () => `id-${++numero}`, maintenant: 'x' },
    ),
  ),
};

const ouvrirBibliotheque = (format, options) => ouvrirAvecHorloge(navigateur, serveur.url, format, options);

// La panne simulée est attendue : seule une autre erreur est une faute.
function fermer(cas, ouvert) {
  ouvert.erreurs.splice(0, Infinity, ...ouvert.erreurs.filter(e => !e.includes('Panne simulée')));
  return fermerEssai(juge, cas, ouvert);
}

// Les objets que l'écran montre d'une catégorie (dépliée ou choisie).
const objetsVus = (vue, nom) =>
  (vue.panneaux ? vue.detailObjets : vue.cartes.find(c => c.nom === nom)?.objets.map(o => o.nom)) ?? [];
const categoriesVues = vue => (vue.panneaux ? vue.choix : vue.cartes.map(c => c.nom));

async function poser(page, cle, operations) {
  const donnees = await lireStockage(page);
  await ecrireStockage(page, { ...donnees, [cle]: operations });
}

const alerte = page =>
  page.evaluate(() => {
    const el = document.querySelector('.alerte-haut');
    return el?.matches(':popover-open') ? el.textContent.trim() : null;
  });

const objetStocke = async (page, nom) => (await bibliothequeStockee(page)).objets.some(o => o.nom === nom);

// Le rétablissement fini : le stockage a l'objet, l'écran l'a relu.
const attendreObjet = (page, nom) =>
  attendreQue(
    page,
    n => [...document.querySelectorAll('#app .objet-nom')].some(el => el.textContent.trim() === n),
    nom,
  );

// 1. Un objet : supprimé, puis rétabli à l'identique, éclairé.
async function essaiObjet(format) {
  const cas = `objet rétabli (${format})`;
  const ouvert = await ouvrirBibliotheque(format);
  const { page } = ouvert;
  const avant = await empreinte(page);
  await supprimerObjet(page, 'Toilette', 'Crème solaire');
  const bandeau = await lireBandeau(page);
  juge.exige(
    bandeau?.texte === remplir(a.objet, { nom: 'Crème solaire' }) &&
      bandeau.role === 'status' &&
      bandeau.place === 'bas' &&
      bandeau.hote === 'page' &&
      bandeau.bouton.libelle === a.annuler &&
      bandeau.touchable,
    `${cas} : bandeau ${vu(bandeau)}`,
  );
  juge.exige(
    !objetsVus(await lire(page), 'Toilette').includes('Crème solaire'),
    `${cas} : Crème solaire encore à l'écran`,
  );
  await annuler(page);
  juge.exige(await attendreSansBandeau(page), `${cas} : le bandeau reste après « Annuler »`);
  await attendreObjet(page, 'Crème solaire');
  await calme(page);
  juge.exige(
    vu(objetsVus(await lire(page), 'Toilette')) === vu(nomsDe('Toilette')) && (await eclaire(page)) === 'Crème solaire',
    `${cas} : écran ${vu({ objets: objetsVus(await lire(page), 'Toilette'), eclaire: await eclaire(page) })}`,
  );
  juge.exige((await empreinte(page)) === avant, `${cas} : le stockage n'est pas celui d'avant`);
  await fermer(cas, ouvert);
}

// 2. Une catégorie : elle revient à son rang avec ses objets et leurs liens, choisie et dépliée.
async function essaiCategorie(format) {
  const cas = `catégorie rétablie (${format})`;
  const ouvert = await ouvrirBibliotheque(format);
  const { page } = ouvert;
  const avant = await empreinte(page);
  await supprimerCategorie(page, 'Camping');
  const bandeau = await lireBandeau(page);
  juge.exige(
    bandeau?.texte === remplir(a.categorie.other, { nom: 'Camping', n: 3 }),
    `${cas} : bandeau ${vu(bandeau)}`,
  );
  juge.exige(!categoriesVues(await lire(page)).includes('Camping'), `${cas} : Camping encore à l'écran`);
  await annuler(page);
  juge.exige(await attendreSansBandeau(page), `${cas} : le bandeau reste après « Annuler »`);
  await attendreQue(page, () => document.querySelector('#app [data-recent]') !== null);
  await calme(page);
  const vue = await lire(page);
  const recent = await page.evaluate(() => document.querySelector('#app [data-recent] b')?.textContent.trim());
  const ouverte = vue.panneaux
    ? vue.choisie === 'Camping' && vue.detail === 'Camping'
    : vue.cartes.find(c => c.nom === 'Camping')?.ouverte === 'true';
  juge.exige(
    vu(categoriesVues(vue)) === vu(DEPART) &&
      ouverte &&
      recent === 'Camping' &&
      vu(objetsVus(vue, 'Camping')) === vu(nomsDe('Camping')),
    `${cas} : écran ${vu({ categories: categoriesVues(vue), ouverte, recent, objets: objetsVus(vue, 'Camping') })}`,
  );
  juge.exige((await empreinte(page)) === avant, `${cas} : le stockage n'est pas celui d'avant`);
  await fermer(cas, ouvert);
}

// 3. Le bandeau suit d'un écran à l'autre, sans repartir de zéro, et s'en va au bout de 10 s.
async function essaiSuit() {
  const cas = 'le bandeau suit (telephone-etroit)';
  const ouvert = await ouvrirBibliotheque('telephone-etroit');
  const { page } = ouvert;
  // L'heure de la page à l'arrivée du bandeau, et un repère posé sur lui : c'est bien le même qui suit.
  await page.evaluate(() => {
    new MutationObserver(() => {
      const bandeau = document.querySelector('.bandeau-annuler');
      if (!bandeau || window.arriveeBandeau) return;
      window.arriveeBandeau = Date.now();
      bandeau.dataset.temoin = '';
    }).observe(document.body, { childList: true, subtree: true });
  });
  await supprimerObjet(page, 'Toilette', 'Crème solaire');
  const texte = remplir(a.objet, { nom: 'Crème solaire' });
  const meme = () => page.evaluate(() => document.querySelector('.bandeau-annuler')?.hasAttribute('data-temoin'));
  await versMesVoyages(page);
  const accueil = await lireBandeau(page);
  juge.exige(
    accueil?.texte === texte && accueil.place === 'bas' && (await meme()),
    `${cas} : sur Mes voyages ${vu(accueil)}`,
  );
  await page.click('#app a.carte-voyage[href="#/voyage/v1"]');
  await attendreEcran(page, 'voyage');
  const voyage = await lireBandeau(page);
  juge.exige(voyage?.texte === texte && (await meme()), `${cas} : dans un voyage ${vu(voyage)}`);
  // L'horloge arrêtée : seul le test la fait avancer, jusqu'à 9 s puis 10,1 s après l'arrivée.
  const maintenant = (await page.evaluate(() => Date.now())) + 20;
  await page.clock.pauseAt(maintenant);
  const ecoule = maintenant - (await page.evaluate(() => window.arriveeBandeau));
  juge.exige(ecoule < 9000, `${cas} : le parcours a pris ${ecoule} ms, trop pour juger les 9 s`);
  await page.clock.runFor(Math.max(0, 9000 - ecoule));
  juge.exige((await lireBandeau(page))?.texte === texte, `${cas} : parti avant 9 s`);
  await page.clock.runFor(1100);
  juge.exige(
    (await page.evaluate(() => document.querySelector('.bandeau-annuler'))) === null,
    `${cas} : encore là à 10,1 s`,
  );
  await page.clock.resume();
  await fermer(cas, ouvert);
}

// 4. Une seconde suppression remplace le bandeau : « Annuler » ne rend que la seconde.
async function essaiRemplace() {
  const cas = 'seconde suppression (telephone-etroit)';
  const ouvert = await ouvrirBibliotheque('telephone-etroit');
  const { page } = ouvert;
  await supprimerObjet(page, 'Toilette', 'Crème solaire');
  await supprimerObjet(page, 'Toilette', 'Dentifrice');
  const bandeaux = await page.evaluate(() => document.querySelectorAll('.bandeau-annuler').length);
  const bandeau = await lireBandeau(page);
  juge.exige(
    bandeaux === 1 && bandeau?.texte === remplir(a.objet, { nom: 'Dentifrice' }),
    `${cas} : ${bandeaux} bandeau(x) ${vu(bandeau)}`,
  );
  await annuler(page);
  await attendreSansBandeau(page);
  await attendreObjet(page, 'Dentifrice');
  await calme(page);
  juge.exige(
    vu(objetsVus(await lire(page), 'Toilette')) === vu(['Brosse à dents', 'Dentifrice']) &&
      (await objetStocke(page, 'Dentifrice')) &&
      !(await objetStocke(page, 'Crème solaire')),
    `${cas} : ${vu(objetsVus(await lire(page), 'Toilette'))}`,
  );
  await fermer(cas, ouvert);
}

// 5. Une fiche ouverte, puis la question par-dessus : le bandeau y passe, en haut, et « Annuler » y
// répond ; fenêtre fermée, il revient en bas ; enregistrer une fiche le retire.
async function essaiFenetres(format) {
  const cas = `bandeau et fenêtres (${format})`;
  const ouvert = await ouvrirBibliotheque(format);
  const { page } = ouvert;
  const enHaut = b =>
    b?.place === 'haut' && b.cadre.top <= 24 && Math.abs(b.cadre.left + b.cadre.right - b.largeurEcran) < 2;
  await supprimerObjet(page, 'Toilette', 'Crème solaire');
  await ouvrirFicheObjet(page, 'Toilette', 'Brosse à dents');
  const fiche = await lireBandeau(page);
  juge.exige(fiche?.hote === 'fiche' && enHaut(fiche) && fiche.touchable, `${cas} : sur la fiche ${vu(fiche)}`);
  await toucher(page, '[data-supprimer]');
  await attendreQue(page, q => document.querySelector(`${q}[open]`) !== null, QUESTION);
  await calme(page);
  const question = await lireBandeau(page);
  juge.exige(
    question?.hote === 'question' && enHaut(question) && question.touchable,
    `${cas} : sur la question ${vu(question)}`,
  );
  await page.click(`${QUESTION} .fenetre-pied button:text-is("${fr.suppression.garder}")`);
  await attendreQue(page, q => !document.querySelector(q), QUESTION);
  await calme(page);
  const retour = await lireBandeau(page);
  juge.exige(retour?.hote === 'fiche' && enHaut(retour), `${cas} : de retour sur la fiche ${vu(retour)}`);
  // « Annuler » touché dans la fiche : l'objet revient derrière elle.
  await annuler(page);
  juge.exige(await attendreSansBandeau(page), `${cas} : le bandeau reste après « Annuler » dans la fiche`);
  juge.exige(
    await attendreQue(page, () =>
      JSON.parse(localStorage.getItem('baluchon-essai')).bibliotheque.objets.some(o => o.nom === 'Crème solaire'),
    ),
    `${cas} : « Annuler » dans la fiche n'a rien rétabli`,
  );
  await toucher(page, '.bouton-fermer');
  await attendreFermee(page);
  juge.exige(
    objetsVus(await lire(page), 'Toilette').includes('Crème solaire'),
    `${cas} : Crème solaire pas revenue à l'écran`,
  );

  // La fiche fermée : le bandeau revient en bas, le même.
  await supprimerObjet(page, 'Toilette', 'Crème solaire');
  await ouvrirFicheObjet(page, 'Toilette', 'Brosse à dents');
  await toucher(page, '.bouton-fermer');
  await attendreFermee(page);
  const bas = await lireBandeau(page);
  juge.exige(bas?.hote === 'page' && bas.place === 'bas' && bas.touchable, `${cas} : fiche fermée ${vu(bas)}`);

  // Une autre écriture dans la bibliothèque retire le bandeau : la suppression devient définitive.
  await ouvrirFicheObjet(page, 'Toilette', 'Brosse à dents');
  await saisir(page, '#f-nom', 'Brosse à dents souple');
  await enregistrer(page);
  await attendreFermee(page);
  juge.exige(
    (await page.evaluate(() => document.querySelector('.bandeau-annuler'))) === null &&
      !(await objetStocke(page, 'Crème solaire')),
    `${cas} : le bandeau reste après un enregistrement`,
  );
  await fermer(cas, ouvert);
}

// 6. Panne du rétablissement, nouvel essai, puis double appui pendant un rétablissement lent.
async function essaiPanneEtDoubleAppui() {
  const cas = 'panne et double appui (telephone-etroit)';
  const ouvert = await ouvrirBibliotheque('telephone-etroit');
  const { page } = ouvert;
  const avant = await empreinte(page);
  await supprimerObjet(page, 'Toilette', 'Crème solaire');
  const sansCreme = await empreinte(page);
  await poser(page, 'pannes', ['retablirBibliotheque']);
  await annuler(page);
  await attendreQue(page, () => document.querySelector('.alerte-haut') !== null);
  await calme(page);
  const reste = await lireBandeau(page);
  juge.exige(
    (await alerte(page)) === a.erreur &&
      reste?.texte === remplir(a.objet, { nom: 'Crème solaire' }) &&
      !reste.bouton.inactif &&
      (await empreinte(page)) === sansCreme,
    `${cas} : panne ${vu({ alerte: await alerte(page), bandeau: reste })}`,
  );
  await poser(page, 'pannes', []);
  await annuler(page);
  juge.exige(await attendreSansBandeau(page), `${cas} : nouvel essai, le bandeau reste`);
  juge.exige(
    (await attendreObjet(page, 'Crème solaire')) && (await empreinte(page)) === avant,
    `${cas} : nouvel essai, rien de rétabli`,
  );

  await supprimerObjet(page, 'Toilette', 'Crème solaire');
  await poser(page, 'lenteurs', ['retablirBibliotheque']);
  // Chaque écriture lente s'annonce en posant de quoi la libérer (src/stockage/navigateur.js) ; une
  // seconde, posée par-dessus la première, ne se verrait pas autrement.
  await page.evaluate(() => {
    let debloquer = null;
    window.ecrituresEnAttente = 0;
    Object.defineProperty(window, 'debloquerStockage', {
      configurable: true,
      get: () => debloquer,
      set(valeur) {
        if (typeof valeur === 'function') window.ecrituresEnAttente += 1;
        debloquer = valeur;
      },
    });
  });
  await annuler(page, { double: true });
  const pendant = await lireBandeau(page);
  const enAttente = await page.evaluate(() => window.ecrituresEnAttente);
  juge.exige(pendant?.bouton.inactif, `${cas} : « Annuler » actif pendant le rétablissement ${vu(pendant)}`);
  await libererEcritures(page, { max: 2 });
  juge.exige(await attendreSansBandeau(page), `${cas} : double appui, le bandeau reste`);
  await poser(page, 'lenteurs', []);
  juge.exige(
    enAttente === 1 && (await empreinte(page)) === avant,
    `${cas} : ${enAttente} rétablissement(s) demandé(s)`,
  );
  await fermer(cas, ouvert);
}

// 7. Noms piégés : affichés tels quels, sans balise. La seule catégorie supprimée puis rétablie :
// d'une bibliothèque vide, elle revient choisie, dépliée et éclairée (Review Focus 4).
async function essaiPiege(format) {
  const cas = `noms piégés, seule catégorie (${format})`;
  const ouvert = await ouvrirBibliotheque(format, { donnees: DONNEES_PIEGE });
  const { page } = ouvert;
  await supprimerObjet(page, PIEGE, PIEGE);
  const objet = await lireBandeau(page);
  juge.exige(objet?.texte === remplir(a.objet, { nom: PIEGE }) && objet.balises === 0, `${cas} : objet ${vu(objet)}`);
  await annuler(page);
  await attendreSansBandeau(page);
  await attendreObjet(page, PIEGE);
  await supprimerCategorie(page, PIEGE);
  const categorie = await lireBandeau(page);
  juge.exige(
    categorie?.texte === remplir(a.categorie.one, { nom: PIEGE, n: 1 }) && categorie.balises === 0,
    `${cas} : catégorie ${vu(categorie)}`,
  );
  juge.exige(categoriesVues(await lire(page)).length === 0, `${cas} : la bibliothèque n'est pas vide`);
  await annuler(page);
  await attendreSansBandeau(page);
  await attendreObjet(page, PIEGE);
  await calme(page);
  const vue = await lire(page);
  const ouverte = vue.panneaux ? vue.choisie === PIEGE : vue.cartes[0]?.ouverte === 'true';
  const recent = await page.evaluate(() => document.querySelector('#app [data-recent] b')?.textContent);
  juge.exige(
    vu(categoriesVues(vue)) === vu([PIEGE]) && ouverte && recent === PIEGE && vu(objetsVus(vue, PIEGE)) === vu([PIEGE]),
    `${cas} : rétablie ${vu({ categories: categoriesVues(vue), ouverte, recent })}`,
  );
  await fermer(cas, ouvert);
}

try {
  for (const format of FORMATS) {
    await essaiObjet(format);
    await essaiCategorie(format);
    await essaiFenetres(format);
  }
  await essaiSuit();
  await essaiRemplace();
  await essaiPanneEtDoubleAppui();
  for (const format of FORMATS) await essaiPiege(format);
} finally {
  await navigateur.close();
  await serveur.fermer();
}
juge.conclure(
  'Bandeau « Annuler »',
  'objet et catégorie rétablis, le bandeau suit 10 s, remplacé, retiré par une écriture, dans les fenêtres, panne, double appui, noms piégés',
);
