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
  assert.equal(
    await stockage.installerBibliotheque({ groupes: [], etiquettes: [], categories: [], objets: [] }, 'en'),
    false,
  );
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
    etiquettes: [],
    categories: [],
    objets: [],
  });
});

test('un voyage garde ses étiquettes, et un ancien voyage sans la clé en a une liste vide', async () => {
  const stockage = creerStockageNavigateur();
  const deux = [
    ...contrat.voyage.etiquettes,
    { ...contrat.voyage.etiquettes[0], id: 'ev-froid', nom: 'Froid', ordre: 1 },
  ];
  await stockage.creerVoyage({ ...contrat.voyage, etiquettes: deux });
  assert.deepEqual((await stockage.lireVoyage('v-vercors')).etiquettes, deux);
  const donnees = JSON.parse(localStorage.getItem('baluchon-essai'));
  delete donnees.etiquettesDuVoyage;
  localStorage.setItem('baluchon-essai', JSON.stringify(donnees));
  assert.deepEqual((await stockage.lireVoyage('v-vercors')).etiquettes, []);
});

test('une panne simulée fait échouer la création sans rien écrire', async () => {
  localStorage.setItem('baluchon-essai', JSON.stringify({ pannes: ['creerVoyage'] }));
  const stockage = creerStockageNavigateur();
  await assert.rejects(stockage.creerVoyage(contrat.voyage));
  assert.deepEqual(await stockage.listerVoyages(), []);
});

test('régler les pièces dans le sac se relit, change la date et apparaît dans les états', async () => {
  const stockage = creerStockageNavigateur();
  await stockage.creerVoyage(contrat.voyage);
  await stockage.reglerDansLeSac('ov-repas', 6, '2026-10-24T09:00:00.000Z');
  const objet = (await stockage.lireVoyage('v-vercors')).objets.find(o => o.id === 'ov-repas');
  assert.equal(objet.dansLeSac, 6);
  assert.equal(objet.modifieLe, '2026-10-24T09:00:00.000Z');
  const etats = await stockage.etatsDesObjets();
  assert.deepEqual(
    etats.find(e => e.dansLeSac === 6),
    { voyageId: 'v-vercors', quantite: 16, dansLeSac: 6 },
  );
  assert.equal(etats.length, contrat.voyage.objets.length);
});

test('régler un objet inconnu ou hors bornes est refusé et ne change rien', async () => {
  const stockage = creerStockageNavigateur();
  await stockage.creerVoyage(contrat.voyage);
  await assert.rejects(stockage.reglerDansLeSac('inconnu', 1, 'x'));
  await assert.rejects(stockage.reglerDansLeSac('ov-repas', 17, 'x'));
  await assert.rejects(stockage.reglerDansLeSac('ov-repas', -1, 'x'));
  await assert.rejects(stockage.reglerDansLeSac('ov-repas', 1.5, 'x'));
  assert.deepEqual(await stockage.lireVoyage('v-vercors'), contrat.voyage);
});

test('une panne simulée fait échouer le réglage ou la lecture des états', async () => {
  const stockage = creerStockageNavigateur();
  await stockage.creerVoyage(contrat.voyage);
  const donnees = JSON.parse(localStorage.getItem('baluchon-essai'));
  localStorage.setItem('baluchon-essai', JSON.stringify({ ...donnees, pannes: ['reglerDansLeSac', 'etatsDesObjets'] }));
  await assert.rejects(stockage.reglerDansLeSac('ov-repas', 6, 'x'));
  await assert.rejects(stockage.etatsDesObjets());
  localStorage.setItem('baluchon-essai', JSON.stringify(donnees));
  assert.deepEqual(await stockage.lireVoyage('v-vercors'), contrat.voyage);
});

test('le filtre « Reste à emballer » est retenu par voyage, d’une instance à l’autre', () => {
  creerStockageNavigateur().ecrireFiltre('v-vercors', true);
  const stockage = creerStockageNavigateur();
  assert.equal(stockage.lireFiltre('v-vercors'), true);
  assert.equal(stockage.lireFiltre('autre'), false);
  stockage.ecrireFiltre('v-vercors', false);
  assert.equal(stockage.lireFiltre('v-vercors'), false);
});

test('un localStorage qui échoue donne un filtre inactif, sans erreur', () => {
  globalThis.localStorage = {
    getItem: () => {
      throw new Error('illisible');
    },
    setItem: () => {
      throw new Error('plein');
    },
  };
  const stockage = creerStockageNavigateur();
  assert.equal(stockage.lireFiltre('v-vercors'), false);
  assert.doesNotThrow(() => stockage.ecrireFiltre('v-vercors', true));
});
