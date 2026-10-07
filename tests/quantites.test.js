// Calcul des quantités (docs/PRD.md, « Calcul des quantités » ; critère de succès 2).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calculerQuantite } from '../src/modele/quantites.js';

const objet = (regle, valeur, { plafond = null, parPersonne = false } = {}) => ({
  regle,
  valeur,
  plafond,
  parPersonne,
});
const du10au13a2 = { jours: 4, nuits: 3, voyageurs: 2 };

test('critère 2 : « Repas : 2 par jour, par personne » vaut 16 du 10 au 13 à deux', () => {
  assert.equal(calculerQuantite(objet('par_jour', 2, { parPersonne: true }), du10au13a2), 16);
});

test('critère 2 : un objet partagé fixe à 1 vaut 1', () => {
  assert.equal(calculerQuantite(objet('fixe', 1), du10au13a2), 1);
});

test("le plafond s'applique par personne, avant la multiplication par les voyageurs", () => {
  const tshirts = objet('par_jour', 1, { plafond: 5, parPersonne: true });
  assert.equal(calculerQuantite(tshirts, { jours: 10, nuits: 9, voyageurs: 2 }), 10);
  // Témoin : sous le plafond, il ne joue pas.
  assert.equal(calculerQuantite(tshirts, du10au13a2), 8);
});

test('par nuit : 0 sur un aller-retour dans la journée', () => {
  const pyjama = objet('par_nuit', 1, { plafond: 1, parPersonne: true });
  assert.equal(calculerQuantite(pyjama, { jours: 1, nuits: 0, voyageurs: 2 }), 0);
  assert.equal(calculerQuantite(pyjama, du10au13a2), 2);
});

test('un objet fixe par personne se multiplie par les voyageurs', () => {
  assert.equal(calculerQuantite(objet('fixe', 1, { parPersonne: true }), { jours: 1, nuits: 0, voyageurs: 3 }), 3);
});
