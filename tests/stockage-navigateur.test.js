// La variante navigateur du stockage, qui sert de base aux tests d'écran : elle doit se comporter
// comme la base SQLite (src-tauri/src/*.rs) — installation unique, voyage relu à l'identique,
// voyage inconnu absent.
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import contrat from './contrat/stockage.json' with { type: 'json' };
import { creerStockageNavigateur } from '../src/stockage/navigateur.js';

// Une mémoire du navigateur minimale, remise à zéro avant chaque test.
beforeEach(() => {
  const memoire = new Map();
  globalThis.localStorage = {
    getItem: cle => memoire.get(cle) ?? null,
    setItem: (cle, valeur) => memoire.set(cle, String(valeur)),
  };
});

test('la bibliothèque s’installe une seule fois et se relit à l’identique', async () => {
  const stockage = creerStockageNavigateur();
  assert.equal(await stockage.bibliothequeInstallee(), false);
  assert.equal(await stockage.installerBibliotheque(contrat.bibliotheque, 'fr'), true);
  assert.equal(await stockage.bibliothequeInstallee(), true);
  assert.equal(await stockage.installerBibliotheque({ categories: [], objets: [] }, 'en'), false);
  assert.deepEqual(await stockage.lireBibliotheque(), contrat.bibliotheque);
});

test('un voyage créé se relit à l’identique et apparaît dans la liste', async () => {
  const stockage = creerStockageNavigateur();
  await stockage.creerVoyage(contrat.voyage);
  assert.deepEqual(await stockage.lireVoyage('v-vercors'), contrat.voyage);
  assert.deepEqual(await stockage.listerVoyages(), [contrat.voyage.voyage]);
  assert.equal(await stockage.lireVoyage('inconnu'), null);
});

test('les voyages déposés par un test (forme de la phase 1) restent lisibles', async () => {
  localStorage.setItem('baluchon-essai', JSON.stringify({ voyages: [contrat.voyage.voyage] }));
  const stockage = creerStockageNavigateur();
  assert.deepEqual(await stockage.listerVoyages(), [contrat.voyage.voyage]);
  assert.deepEqual(await stockage.lireVoyage('v-vercors'), {
    voyage: contrat.voyage.voyage,
    categories: [],
    objets: [],
  });
});

test('une panne simulée fait échouer la création sans rien écrire', async () => {
  localStorage.setItem('baluchon-essai', JSON.stringify({ pannes: ['creerVoyage'] }));
  const stockage = creerStockageNavigateur();
  await assert.rejects(stockage.creerVoyage(contrat.voyage));
  assert.deepEqual(await stockage.listerVoyages(), []);
});
