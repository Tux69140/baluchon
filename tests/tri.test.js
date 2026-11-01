// Le tri par nom, unique pour tout le modèle : sans égard aux accents ni à la casse, chiffres en nombres.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { comparerNoms, poserLangueDuTri } from '../src/modele/tri.js';

test('les noms se trient comme un lecteur francophone l’attend', () => {
  poserLangueDuTri('fr');
  assert.deepEqual(['Écharpe', 'eau', 'Zip', 'élastique'].sort(comparerNoms), ['eau', 'Écharpe', 'élastique', 'Zip']);
  assert.deepEqual(['Objet 10', 'Objet 2'].sort(comparerNoms), ['Objet 2', 'Objet 10']);
});
