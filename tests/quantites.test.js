// Calcul des quantités (docs/PRD.md, « Calcul des quantités » ; critère de succès 2).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calculerQuantite, semainesCommencees } from '../src/modele/quantites.js';

const objet = (regle, valeur, { plafond = null, parPersonne = false, pourQui = 'tous' } = {}) => ({
  regle,
  valeur,
  plafond,
  parPersonne,
  pourQui,
});
const du10au13a2 = { jours: 4, nuits: 3, femmes: 1, hommes: 1, enfants: 0 };

test('critère 2 : « Repas : 2 par jour, par personne » vaut 16 du 10 au 13 à deux', () => {
  assert.equal(calculerQuantite(objet('par_jour', 2, { parPersonne: true }), du10au13a2), 16);
});

test('critère 2 : un objet partagé fixe à 1 vaut 1', () => {
  assert.equal(calculerQuantite(objet('fixe', 1), du10au13a2), 1);
});

test("le plafond s'applique par personne, avant la multiplication par les voyageurs", () => {
  const tshirts = objet('par_jour', 1, { plafond: 5, parPersonne: true });
  assert.equal(calculerQuantite(tshirts, { jours: 10, nuits: 9, femmes: 1, hommes: 1, enfants: 0 }), 10);
  // Témoin : sous le plafond, il ne joue pas.
  assert.equal(calculerQuantite(tshirts, du10au13a2), 8);
});

test('par nuit : 0 sur un aller-retour dans la journée', () => {
  const pyjama = objet('par_nuit', 1, { plafond: 1, parPersonne: true });
  assert.equal(calculerQuantite(pyjama, { jours: 1, nuits: 0, femmes: 1, hommes: 1, enfants: 0 }), 0);
  assert.equal(calculerQuantite(pyjama, du10au13a2), 2);
});

test('un objet fixe par personne se multiplie par les voyageurs', () => {
  assert.equal(
    calculerQuantite(objet('fixe', 1, { parPersonne: true }), { jours: 1, nuits: 0, femmes: 1, hommes: 1, enfants: 1 }),
    3,
  );
});

const p = (c, jours = 4) => ({ jours, nuits: jours - 1, femmes: 0, hommes: 0, enfants: 0, ...c });

test('par semaine : semaines commencées', () => {
  const lessive = { regle: 'par_semaine', valeur: 5, plafond: null, parPersonne: false, pourQui: 'tous' };
  assert.equal(calculerQuantite(lessive, p({ femmes: 1 }, 7)), 5);
  assert.equal(calculerQuantite(lessive, p({ femmes: 1 }, 10)), 10);
  assert.equal(calculerQuantite(lessive, p({ femmes: 1 }, 1)), 5);
});

test('par personne : multiplié par le groupe ; enfants comptés dans « tous »', () => {
  const repas = { regle: 'par_jour', valeur: 2, plafond: null, parPersonne: true, pourQui: 'tous' };
  assert.equal(calculerQuantite(repas, p({ femmes: 1, hommes: 1 })), 16); // critère 2 du PRD
  assert.equal(calculerQuantite(repas, p({ femmes: 2, enfants: 1 })), 24);
  const culottes = { regle: 'par_jour', valeur: 1, plafond: 5, parPersonne: true, pourQui: 'femmes' };
  assert.equal(calculerQuantite(culottes, p({ femmes: 2, hommes: 1 }, 10)), 10);
});

test('groupe vide : 0, même partagé', () => {
  const comprimes = { regle: 'fixe', valeur: 4, plafond: null, parPersonne: false, pourQui: 'enfants' };
  assert.equal(calculerQuantite(comprimes, p({ femmes: 2 })), 0);
  assert.equal(calculerQuantite(comprimes, p({ femmes: 2, enfants: 3 })), 4);
});

test('semainesCommencees : une semaine entamée compte pour une', () => {
  assert.deepEqual([1, 7, 8, 10, 14, 15].map(semainesCommencees), [1, 1, 2, 2, 2, 3]);
});
