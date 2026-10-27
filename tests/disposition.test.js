// Les seuils du grand format sont écrits deux fois, en JS (disposition.js) et en CSS
// (grand-format.css) : ce test garde les deux identiques.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { GRAND_FORMAT, TROIS_COLONNES } from '../src/ecrans/disposition.js';

test('les deux requêtes ont les seuils validés', () => {
  assert.equal(GRAND_FORMAT, '(min-width: 600px) and (min-height: 600px)');
  assert.equal(TROIS_COLONNES, '(min-width: 1340px) and (min-height: 600px)');
});

test('chaque @media de grand-format.css est une des requêtes de disposition', async () => {
  const css = await readFile(new URL('../src/styles/grand-format.css', import.meta.url), 'utf8');
  const requetes = [...css.matchAll(/@media ([^{]+)\{/g)].map(m => m[1].trim());
  const permises = [
    GRAND_FORMAT,
    TROIS_COLONNES,
    `${GRAND_FORMAT} and (max-width: 1339.98px)`,
    '(min-width: 720px) and (max-width: 1339.98px) and (min-height: 600px)',
  ];
  assert.ok(requetes.length >= 4, 'les quatre requêtes sont utilisées');
  for (const requete of requetes) assert.ok(permises.includes(requete), `requête inconnue : ${requete}`);
  for (const permise of permises) assert.ok(requetes.includes(permise), `requête absente : ${permise}`);
});
