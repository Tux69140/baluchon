// Catalogue des pictos et sa recherche (docs/superpowers, spec de la phase 5).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CATALOGUE, chercherPictos } from '../src/modele/catalogue.js';

// Un échantillon des noms et mots-clés de la maquette ; dans l'appli, fr.json les fournit.
const pictos = [
  { cle: 'tent', nom: 'Camping', mots: 'tente camping bivouac' },
  { cle: 'sun', nom: 'Soleil', mots: 'soleil été chaud' },
  { cle: 'sunglasses', nom: 'Lunettes de soleil', mots: 'lunettes soleil' },
  { cle: 'train', nom: 'Train', mots: 'train gare' },
];
const cles = liste => liste.map(p => p.cle);

test('le catalogue compte dix thèmes et 80 pictos distincts', () => {
  assert.equal(CATALOGUE.length, 10);
  const toutes = CATALOGUE.flatMap(t => t.pictos);
  assert.equal(toutes.length, 80);
  assert.equal(new Set(toutes).size, 80);
  for (const cle of ['t-shirt', 'tooth', 'fork-knife', 'identification-card', 'tent', 'suitcase-rolling'])
    assert.ok(toutes.includes(cle), cle);
});

test('chercherPictos : un mot qui commence le nom ou un mot-clé', () => {
  assert.deepEqual(cles(chercherPictos(pictos, 'tente')), ['tent']);
  assert.deepEqual(cles(chercherPictos(pictos, 'soleil')), ['sun', 'sunglasses']);
  assert.deepEqual(cles(chercherPictos(pictos, 'lun')), ['sunglasses']);
});

test('chercherPictos ignore majuscules et accents', () => {
  assert.deepEqual(cles(chercherPictos(pictos, 'SOLEIL')), ['sun', 'sunglasses']);
  assert.deepEqual(cles(chercherPictos(pictos, 'ete')), ['sun']);
});

test('chercherPictos : aucun résultat, ou mot vide qui rend tout', () => {
  assert.deepEqual(chercherPictos(pictos, 'xyz'), []);
  assert.deepEqual(chercherPictos(pictos, ''), pictos);
  assert.deepEqual(chercherPictos(pictos, '  '), pictos);
  // Témoin : le mot doit commencer, pas seulement figurer au milieu.
  assert.deepEqual(chercherPictos(pictos, 'ent'), []);
});
