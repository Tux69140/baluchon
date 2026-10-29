// Les ajustements d'un voyage dans la variante navigateur du stockage : mêmes cas et mêmes refus que
// les tests de la base (src-tauri/src/ajustements.rs), moins la fermeture de la base.
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import contrat from './contrat/stockage.json' with { type: 'json' };
import { creerStockageNavigateur } from '../src/stockage/navigateur.js';

const MAINTENANT = '2026-10-28T10:00:00.000Z';

beforeEach(() => {
  const memoire = new Map();
  globalThis.localStorage = {
    getItem: cle => memoire.get(cle) ?? null,
    setItem: (cle, valeur) => memoire.set(cle, String(valeur)),
  };
});

async function stockageAvecVoyage({ bibliotheque = false, pannes } = {}) {
  const stockage = creerStockageNavigateur();
  if (bibliotheque) await stockage.installerBibliotheque(contrat.bibliotheque, 'fr');
  await stockage.creerVoyage(contrat.voyage);
  if (pannes) {
    const donnees = JSON.parse(localStorage.getItem('baluchon-essai'));
    localStorage.setItem('baluchon-essai', JSON.stringify({ ...donnees, pannes }));
  }
  return stockage;
}

const objetALaMain = (id, categorieId) => ({
  id,
  voyageId: 'v-vercors',
  categorieId,
  modeleId: null,
  nom: 'Gourde',
  regle: 'fixe',
  valeur: 2,
  plafond: null,
  parPersonne: true,
  consommable: false,
  quantite: 2,
  quantiteManuelle: true,
  dansLeSac: 0,
  aAcheter: false,
  achetes: 0,
  note: '',
  modifieLe: MAINTENANT,
});

const categorieNeuve = (id, voyageId, ordre) => ({
  id,
  voyageId,
  modeleId: null,
  nom: 'Outils',
  icone: 'wrench',
  couleur: 'ciel',
  ordre,
  modifieLe: MAINTENANT,
});

test('ajouter un objet dans une catégorie neuve est relu', async () => {
  const stockage = await stockageAvecVoyage();
  const ajout = {
    categorie: categorieNeuve('cv-outils', 'v-vercors', 3),
    objet: objetALaMain('ov-gourde', 'cv-outils'),
  };
  await stockage.ajouterAuVoyage(ajout);
  const relu = await stockage.lireVoyage('v-vercors');
  assert.equal(relu.categories.length, contrat.voyage.categories.length + 1);
  assert.deepEqual(relu.categories.at(-1), ajout.categorie);
  assert.deepEqual(relu.objets.at(-1), ajout.objet);
});

test('ajouter dans une catégorie existante ne crée pas de catégorie', async () => {
  const stockage = await stockageAvecVoyage();
  const objet = objetALaMain('ov-gourde', 'cv-vetements');
  await stockage.ajouterAuVoyage({ categorie: null, objet });
  const relu = await stockage.lireVoyage('v-vercors');
  assert.deepEqual(relu.categories, contrat.voyage.categories);
  assert.deepEqual(relu.objets.at(-1), objet);
});

test('ajouter dans la catégorie d’un autre voyage est refusé sans rien écrire', async () => {
  const stockage = await stockageAvecVoyage();
  const autre = {
    voyage: { ...contrat.voyage.voyage, id: 'v-autre' },
    etiquettes: [],
    categories: [{ ...contrat.voyage.categories[0], id: 'cv-autre', voyageId: 'v-autre' }],
    objets: [],
  };
  await stockage.creerVoyage(autre);
  const avant = localStorage.getItem('baluchon-essai');
  for (const categorieId of ['cv-autre', 'cv-absente']) {
    await assert.rejects(stockage.ajouterAuVoyage({ categorie: null, objet: objetALaMain('ov-gourde', categorieId) }));
  }
  const inconnu = { ...objetALaMain('ov-gourde', 'cv-nouvelle'), voyageId: 'v-inconnu' };
  await assert.rejects(
    stockage.ajouterAuVoyage({ categorie: categorieNeuve('cv-nouvelle', 'v-inconnu', 0), objet: inconnu }),
  );
  await assert.rejects(
    stockage.ajouterAuVoyage({
      categorie: categorieNeuve('cv-nouvelle', 'v-vercors', 3),
      objet: objetALaMain('ov-gourde', 'cv-vetements'),
    }),
  );
  assert.equal(localStorage.getItem('baluchon-essai'), avant);
});

test('ajouter avec un id déjà pris est refusé sans rien écrire', async () => {
  const stockage = await stockageAvecVoyage();
  const avant = localStorage.getItem('baluchon-essai');
  await assert.rejects(
    stockage.ajouterAuVoyage({
      categorie: categorieNeuve('cv-outils', 'v-vercors', 3),
      objet: objetALaMain('ov-tshirts', 'cv-outils'),
    }),
  );
  assert.equal(localStorage.getItem('baluchon-essai'), avant);
});

test('régler la quantité la rend manuelle', async () => {
  const stockage = await stockageAvecVoyage();
  await stockage.reglerQuantite('ov-tshirts', 5, 2, 0, MAINTENANT);
  const objet = (await stockage.lireVoyage('v-vercors')).objets[0];
  assert.deepEqual(
    [objet.quantite, objet.dansLeSac, objet.quantiteManuelle, objet.modifieLe],
    [5, 2, true, MAINTENANT],
  );
});

test('régler la quantité refuse zéro et un sac trop plein', async () => {
  const stockage = await stockageAvecVoyage();
  const avant = localStorage.getItem('baluchon-essai');
  await assert.rejects(stockage.reglerQuantite('ov-tshirts', 0, 0, 0, MAINTENANT));
  await assert.rejects(stockage.reglerQuantite('ov-tshirts', 4, 5, 0, MAINTENANT));
  await assert.rejects(stockage.reglerQuantite('ov-tshirts', 4, -1, 0, MAINTENANT));
  await assert.rejects(stockage.reglerQuantite('inconnu', 4, 0, 0, MAINTENANT));
  assert.equal(localStorage.getItem('baluchon-essai'), avant);
});

test('régler la quantité refuse des pièces achetées au-delà, et les écrit sinon', async () => {
  const stockage = await stockageAvecVoyage();
  await assert.rejects(stockage.reglerQuantite('ov-repas', 4, 0, 5, MAINTENANT));
  await stockage.reglerQuantite('ov-repas', 4, 0, 4, MAINTENANT);
  const repas = (await stockage.lireVoyage('v-vercors')).objets.find(o => o.id === 'ov-repas');
  assert.deepEqual([repas.quantite, repas.achetes], [4, 4]);
});

test('régler au-delà de 999 est permis', async () => {
  const stockage = await stockageAvecVoyage();
  await stockage.reglerQuantite('ov-tshirts', 1500, 0, 0, MAINTENANT);
  assert.equal((await stockage.lireVoyage('v-vercors')).objets[0].quantite, 1500);
});

test('renommer refuse un nom vide', async () => {
  const stockage = await stockageAvecVoyage();
  const avant = localStorage.getItem('baluchon-essai');
  await assert.rejects(stockage.renommerObjetDuVoyage('ov-tshirts', '   ', MAINTENANT));
  await assert.rejects(stockage.renommerObjetDuVoyage('inconnu', 'Chaussettes', MAINTENANT));
  assert.equal(localStorage.getItem('baluchon-essai'), avant);
  await stockage.renommerObjetDuVoyage('ov-tshirts', '  Chaussettes ', MAINTENANT);
  const objet = (await stockage.lireVoyage('v-vercors')).objets[0];
  assert.deepEqual([objet.nom, objet.modifieLe], ['Chaussettes', MAINTENANT]);
});

test('retirer le dernier objet retire sa catégorie', async () => {
  const stockage = await stockageAvecVoyage();
  await stockage.retirerDuVoyage('ov-repas');
  const relu = await stockage.lireVoyage('v-vercors');
  assert.equal(relu.objets.length, contrat.voyage.objets.length - 1);
  assert.ok(relu.categories.every(c => c.id !== 'cv-alimentation'));
  await assert.rejects(stockage.retirerDuVoyage('ov-repas'));
});

test('retirer un objet garde sa catégorie s’il en reste un autre', async () => {
  const stockage = await stockageAvecVoyage();
  await stockage.ajouterAuVoyage({ categorie: null, objet: objetALaMain('ov-gourde', 'cv-vetements') });
  await stockage.retirerDuVoyage('ov-gourde');
  assert.deepEqual(await stockage.lireVoyage('v-vercors'), contrat.voyage);
});

test('retirer puis rétablir rend le voyage identique, catégorie comprise', async () => {
  const stockage = await stockageAvecVoyage();
  // Le premier objet est retiré avec sa catégorie, qui est la première : elle doit retrouver son rang.
  const objet = contrat.voyage.objets[0];
  const categorie = contrat.voyage.categories.find(c => c.id === objet.categorieId);
  await stockage.retirerDuVoyage(objet.id);
  assert.notDeepEqual(await stockage.lireVoyage('v-vercors'), contrat.voyage);
  await stockage.retablirDansLeVoyage({ categorie, objet });
  const relu = await stockage.lireVoyage('v-vercors');
  assert.deepEqual(relu.categories, contrat.voyage.categories);
  assert.deepEqual(
    [...relu.objets].sort((a, b) => a.id.localeCompare(b.id)),
    [...contrat.voyage.objets].sort((a, b) => a.id.localeCompare(b.id)),
  );
});

test('retirer ne touche pas la bibliothèque', async () => {
  const stockage = await stockageAvecVoyage({ bibliotheque: true });
  await stockage.retirerDuVoyage('ov-tshirts');
  await stockage.retirerDuVoyage('ov-repas');
  assert.deepEqual(await stockage.lireBibliotheque(), contrat.bibliotheque);
});

const modelesNeufs = () => ({
  categorie: {
    id: 'cm-outils',
    nom: 'Outils',
    icone: 'wrench',
    couleur: 'ciel',
    ordre: 5,
    toujoursIncluse: true,
    modifieLe: MAINTENANT,
    etiquettes: [],
  },
  objet: {
    id: 'om-gourde',
    categorieId: 'cm-outils',
    nom: 'Gourde',
    regle: 'fixe',
    valeur: 2,
    plafond: null,
    parPersonne: true,
    consommable: false,
    toujoursInclus: true,
    note: '',
    modifieLe: MAINTENANT,
    etiquettes: [],
  },
});

test('ajouter à la bibliothèque crée catégorie, objet et liens', async () => {
  const stockage = await stockageAvecVoyage({ bibliotheque: true });
  const { categorie, objet } = modelesNeufs();
  await stockage.ajouterALaBibliotheque({
    categorie,
    objet,
    objetDuVoyage: 'ov-repas',
    categorieDuVoyage: 'cv-alimentation',
  });
  const bibliotheque = await stockage.lireBibliotheque();
  assert.deepEqual(bibliotheque.categories.at(-1), categorie);
  assert.deepEqual(bibliotheque.objets.at(-1), objet);
  const voyage = await stockage.lireVoyage('v-vercors');
  assert.equal(voyage.objets.find(o => o.id === 'ov-repas').modeleId, 'om-gourde');
  assert.equal(voyage.categories.find(c => c.id === 'cv-alimentation').modeleId, 'cm-outils');
});

test('ajouter à la bibliothèque dans une catégorie existante ne lie que l’objet', async () => {
  const stockage = await stockageAvecVoyage({ bibliotheque: true });
  const objet = { ...modelesNeufs().objet, categorieId: 'cm-vetements' };
  await stockage.ajouterALaBibliotheque({ categorie: null, objet, objetDuVoyage: 'ov-repas', categorieDuVoyage: null });
  const voyage = await stockage.lireVoyage('v-vercors');
  assert.equal(voyage.categories.find(c => c.id === 'cv-alimentation').modeleId, null);
});

test('ajouter à la bibliothèque refuse un objet du voyage inconnu sans rien écrire', async () => {
  const stockage = await stockageAvecVoyage({ bibliotheque: true });
  const avant = localStorage.getItem('baluchon-essai');
  const { categorie, objet } = modelesNeufs();
  await assert.rejects(
    stockage.ajouterALaBibliotheque({ categorie, objet, objetDuVoyage: 'ov-inconnu', categorieDuVoyage: null }),
  );
  assert.equal(localStorage.getItem('baluchon-essai'), avant);
});

test('une panne simulée de retirerDuVoyage ne change rien', async () => {
  const stockage = await stockageAvecVoyage({ pannes: ['retirerDuVoyage'] });
  await assert.rejects(stockage.retirerDuVoyage('ov-tshirts'), /Panne simulée/);
  assert.deepEqual(await stockage.lireVoyage('v-vercors'), contrat.voyage);
});
