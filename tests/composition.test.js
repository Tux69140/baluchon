// Composition d'un voyage et groupes de « Pour qui » (phase 13).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  BORNES_COMPOSITION,
  COMPOSITION_INITIALE,
  POUR_QUI,
  composition,
  ecartsDeComposition,
  personnes,
  totalVoyageurs,
  validerComposition,
} from '../src/modele/composition.js';

test('les constantes de la composition', () => {
  assert.deepEqual(BORNES_COMPOSITION, { min: 0, max: 20, total: 20 });
  assert.deepEqual(COMPOSITION_INITIALE, { femmes: 0, hommes: 0, enfants: 0 });
});

test('personnes par groupe', () => {
  const c = { femmes: 2, hommes: 1, enfants: 3 };
  assert.deepEqual(
    POUR_QUI.map(g => personnes(g, c)),
    [6, 3, 2, 1, 3],
  );
});

test('composition extrait les trois nombres, totalVoyageurs les additionne', () => {
  const voyage = { id: 'v', nom: 'Vercors', femmes: 2, hommes: 1, enfants: 3 };
  assert.deepEqual(composition(voyage), { femmes: 2, hommes: 1, enfants: 3 });
  assert.equal(totalVoyageurs(voyage), 6);
});

test('bornes : au moins 1, au plus 20 en tout', () => {
  assert.deepEqual(validerComposition({ femmes: 0, hommes: 0, enfants: 0 }), { composition: 'aucunVoyageur' });
  assert.deepEqual(validerComposition({ femmes: 8, hommes: 7, enfants: 6 }), { composition: 'tropDeVoyageurs' });
  assert.deepEqual(validerComposition({ femmes: 8, hommes: 7, enfants: 5 }), {});
});

test('un compteur hors limites, fractionnaire ou en texte est refusé', () => {
  assert.deepEqual(validerComposition({ femmes: 21, hommes: 0, enfants: 0 }), { composition: 'tropDeVoyageurs' });
  assert.deepEqual(validerComposition({ femmes: -1, hommes: 2, enfants: 0 }), { composition: 'aucunVoyageur' });
  assert.deepEqual(validerComposition({ femmes: 1.5, hommes: 1, enfants: 0 }), { composition: 'aucunVoyageur' });
  assert.deepEqual(validerComposition({ femmes: '2', hommes: 0, enfants: 0 }), { composition: 'aucunVoyageur' });
});

test('écarts de composition', () => {
  assert.deepEqual(ecartsDeComposition({ femmes: 1, hommes: 1, enfants: 0 }, { femmes: 1, hommes: 0, enfants: 2 }), [
    { groupe: 'hommes', ecart: -1 },
    { groupe: 'enfants', ecart: 2 },
  ]);
  assert.deepEqual(ecartsDeComposition({ femmes: 1, hommes: 1, enfants: 0 }, { femmes: 1, hommes: 1, enfants: 0 }), []);
});
