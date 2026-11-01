// Lire et remplacer toutes les données dans la variante navigateur du stockage : mêmes cas que les
// tests de la base (src-tauri/src/sauvegarde_essais.rs).
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import contrat from './contrat/stockage.json' with { type: 'json' };
import { creerStockageNavigateur } from '../src/stockage/navigateur.js';

beforeEach(() => {
  const memoire = new Map();
  globalThis.localStorage = {
    getItem: cle => memoire.get(cle) ?? null,
    setItem: (cle, valeur) => memoire.set(cle, String(valeur)),
  };
});

// Le voyage du contrat sous d'autres identifiants, avec d'autres coches.
function autreVoyage() {
  const suffixe = id => `${id}-2`;
  const v = contrat.voyage;
  return {
    voyage: { ...v.voyage, id: 'v-alpes', nom: 'Alpes' },
    etiquettes: v.etiquettes.map(e => ({ ...e, id: suffixe(e.id), voyageId: 'v-alpes' })),
    categories: v.categories.map(c => ({ ...c, id: suffixe(c.id), voyageId: 'v-alpes' })),
    objets: v.objets.map(o => ({
      ...o,
      id: suffixe(o.id),
      voyageId: 'v-alpes',
      categorieId: suffixe(o.categorieId),
      dansLeSac: 2,
      quantiteManuelle: true,
      achetes: 1,
    })),
    ecartes: ['om-chargeur', 'om-tshirts'],
  };
}

async function stockageRempli() {
  const stockage = creerStockageNavigateur();
  await stockage.installerBibliotheque(contrat.bibliotheque, 'fr');
  await stockage.creerVoyage({ ...contrat.voyage, ecartes: ['om-cartes'] });
  return stockage;
}

test('lireTout rend la bibliothèque, les voyages complets et la langue', async () => {
  const tout = await (await stockageRempli()).lireTout();
  assert.deepEqual(tout.bibliotheque, contrat.bibliotheque);
  assert.deepEqual(
    tout.voyages,
    [contrat.voyage].map(v => ({ ...v, ecartes: ['om-cartes'] })),
  );
  assert.equal(tout.langue, 'fr');
});

test('remplacer puis lire rend le même contenu', async () => {
  const stockage = await stockageRempli();
  const contenu = { bibliotheque: contrat.bibliotheque, voyages: [contrat.voyage, autreVoyage()], langue: 'en' };
  await stockage.remplacerTout(contenu);
  assert.deepEqual(await stockage.lireTout(), contenu);
  assert.equal(await stockage.bibliothequeInstallee(), true);
});

test('remplacer efface ce qui n’est pas dans le contenu', async () => {
  const stockage = await stockageRempli();
  const contenu = { bibliotheque: contrat.bibliotheque, voyages: [autreVoyage()], langue: 'fr' };
  await stockage.remplacerTout(contenu);
  assert.equal(await stockage.lireVoyage('v-vercors'), null);
  assert.deepEqual(await stockage.lireTout(), contenu);
});

test('une ligne refusée ne change rien', async () => {
  const stockage = await stockageRempli();
  const avant = await stockage.lireTout();
  const objets = contrat.bibliotheque.objets.map((o, i) => (i === 1 ? { ...o, categorieId: 'inconnue' } : o));
  await assert.rejects(
    stockage.remplacerTout({
      bibliotheque: { ...contrat.bibliotheque, objets },
      voyages: [autreVoyage()],
      langue: 'en',
    }),
  );
  assert.deepEqual(await stockage.lireTout(), avant);
});

test('une panne simulée fait échouer lireTout et remplacerTout', async () => {
  const stockage = await stockageRempli();
  const donnees = JSON.parse(localStorage.getItem('baluchon-essai'));
  localStorage.setItem('baluchon-essai', JSON.stringify({ ...donnees, pannes: ['lireTout', 'remplacerTout'] }));
  await assert.rejects(stockage.lireTout(), /Panne simulée : lireTout/);
  await assert.rejects(
    stockage.remplacerTout({ bibliotheque: contrat.bibliotheque, voyages: [], langue: 'fr' }),
    /Panne simulée : remplacerTout/,
  );
});

const donneesBrutes = () => JSON.parse(localStorage.getItem('baluchon-essai'));
const poser = ajout => localStorage.setItem('baluchon-essai', JSON.stringify({ ...donneesBrutes(), ...ajout }));

test('déposer garde le fichier dans les données du navigateur, sans écraser un nom déjà pris', async () => {
  const stockage = creerStockageNavigateur();
  assert.equal(await stockage.deposerFichier('a.json', 'un'), 'depose');
  assert.equal(await stockage.deposerFichier('b.json', 'deux'), 'depose');
  assert.equal(await stockage.deposerFichier('a.json', 'trois'), 'existe');
  assert.deepEqual(donneesBrutes().telechargements, [
    { nom: 'a.json', texte: 'un' },
    { nom: 'b.json', texte: 'deux' },
  ]);
});

test('un refus programmé rend « refuse » et ne dépose rien ; une panne programmée rejette', async () => {
  const stockage = creerStockageNavigateur();
  poser({ refus: ['deposerFichier'] });
  assert.equal(await stockage.deposerFichier('a.json', 'un'), 'refuse');
  assert.deepEqual(donneesBrutes().telechargements ?? [], []);
  poser({ refus: [], pannes: ['deposerFichier'] });
  await assert.rejects(stockage.deposerFichier('a.json', 'un'), /Panne simulée : deposerFichier/);
});
