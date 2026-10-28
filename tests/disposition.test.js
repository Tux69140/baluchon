// Les seuils du grand format sont écrits deux fois, en JS (disposition.js) et en CSS
// (grand-format.css) : ce test garde les deux identiques.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { GRAND_FORMAT, TROIS_COLONNES } from '../src/ecrans/disposition.js';

const lireCss = () => readFile(new URL('../src/styles/grand-format.css', import.meta.url), 'utf8');

test('les deux requêtes ont les seuils validés', () => {
  assert.equal(GRAND_FORMAT, '(min-width: 600px) and (min-height: 600px)');
  assert.equal(TROIS_COLONNES, '(min-width: 1340px) and (min-height: 600px)');
});

test('chaque @media de grand-format.css est une des requêtes de disposition', async () => {
  // Le repli finit 0,02 px avant les trois colonnes : jamais de trou ni de recouvrement entre les deux.
  const largeur = Number(TROIS_COLONNES.match(/min-width: (\d+)px/)[1]);
  const avant = `${(largeur - 0.02).toFixed(2)}px`;
  const permises = [
    GRAND_FORMAT,
    TROIS_COLONNES,
    `${GRAND_FORMAT} and (max-width: ${avant})`,
    `(min-width: 720px) and (max-width: ${avant}) and (min-height: 600px)`,
  ];
  const requetes = [...(await lireCss()).matchAll(/@media ([^{]+)\{/g)].map(m => m[1].trim());
  assert.deepEqual([...requetes].sort(), [...permises].sort());
});

test('les classes propres au grand format portent le préfixe gf-', async () => {
  // .tuile existe déjà pour le catalogue de pictos (fiche-modele.css) : pas de collision.
  const css = await lireCss();
  const classes = [...css.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/\.([a-z][\w-]*)/g)].map(m => m[1]);
  for (const nom of classes.filter(n => /^tuile/.test(n))) assert.fail(`classe sans préfixe : .${nom}`);
});

test('les deux panneaux ont disparu : plus de feuille, plus de condition sur l’orientation', async () => {
  // Fin de la règle « deux panneaux dès 1000 px en paysage » : l'orientation n'entre plus dans aucune
  // condition de l'écran d'un voyage ni de la Bibliothèque (le grand format suit la largeur et la hauteur).
  await assert.rejects(readFile(new URL('../src/styles/voyage-panneaux.css', import.meta.url)), { code: 'ENOENT' });
  const fichiers = [
    'src/ecrans/disposition.js',
    'src/ecrans/voyage.js',
    'src/ecrans/voyage-vues.js',
    'src/ecrans/bibliotheque.js',
    'src/ecrans/bibliotheque-vues.js',
    'src/styles/grand-format.css',
    'src/styles/voyage.css',
    'src/styles/bibliotheque.css',
    'src/main.js',
  ];
  for (const fichier of fichiers) {
    const texte = await readFile(new URL(`../${fichier}`, import.meta.url), 'utf8');
    assert.doesNotMatch(texte, /orientation\s*:|voyage-panneaux|DEUX_PANNEAUX/, fichier);
  }
});
