// Les règles « à acheter » des Courses (docs/superpowers/specs/2026-10-29-phase-9-courses-design.md,
// « Règles »).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  achetesApresQuantite,
  achetesApresSac,
  basculerAAcheter,
  bornerAchetes,
  estAAcheter,
  etatAchat,
  etatDesCourses,
  listeDesCourses,
  resteAAcheter,
} from '../src/modele/courses.js';
import { etatDePieces } from '../src/modele/sac.js';

const o = (champs = {}) => ({
  id: 'o',
  categorieId: 'c',
  nom: 'Repas',
  quantite: 16,
  dansLeSac: 0,
  aAcheter: true,
  achetes: 0,
  ...champs,
});

test('le reste à acheter est la quantité moins les pièces achetées, pour un objet marqué', () => {
  assert.equal(resteAAcheter(o({ achetes: 6 })), 10);
  assert.equal(resteAAcheter(o({ achetes: 16 })), 0);
  assert.equal(resteAAcheter(o({ aAcheter: false })), 0);
  assert.equal(estAAcheter(o({ achetes: 6 })), true);
  assert.equal(estAAcheter(o({ achetes: 16 })), false);
  assert.equal(estAAcheter(o({ aAcheter: false })), false);
});

test('les pièces disent vide, entamé ou plein, pour le sac comme pour les achats', () => {
  assert.equal(etatDePieces(0, 3), 'vide');
  assert.equal(etatDePieces(1, 3), 'entame');
  assert.equal(etatDePieces(3, 3), 'plein');
  assert.equal(etatAchat(o({ achetes: 6 })), 'entame');
  assert.equal(etatAchat(o({ achetes: 16 })), 'plein');
});

test('les pièces achetées restent entières entre 0 et la quantité', () => {
  assert.equal(bornerAchetes(o(), 17), 16);
  assert.equal(bornerAchetes(o(), -1), 0);
  assert.equal(bornerAchetes(o(), 2.7), 2);
});

test('un objet marqué mis en entier dans le sac compte comme acheté', () => {
  assert.equal(achetesApresSac(o({ quantite: 2 }), 2), 2);
  assert.equal(achetesApresSac(o({ quantite: 2 }), 1), 0);
  assert.equal(achetesApresSac(o({ quantite: 2, aAcheter: false, achetes: 1 }), 2), 1);
  // Ressortir du sac ne rend pas l'objet à acheter.
  assert.equal(achetesApresSac(o({ quantite: 2, achetes: 2, dansLeSac: 2 }), 0), 2);
});

test('une quantité baissée ramène les pièces achetées à elle au plus', () => {
  assert.equal(achetesApresQuantite(o({ achetes: 6 }), 4), 4);
  assert.equal(achetesApresQuantite(o({ achetes: 6 }), 18), 6);
});

test("l'interrupteur éteint un objet à acheter, et rallumé sur un objet tout acheté repart de zéro", () => {
  assert.deepEqual(basculerAAcheter(o({ quantite: 4, achetes: 2 })), { aAcheter: false, achetes: 2 });
  assert.deepEqual(basculerAAcheter(o({ quantite: 4, achetes: 4 })), { aAcheter: true, achetes: 0 });
  assert.deepEqual(basculerAAcheter(o({ quantite: 4, achetes: 2, aAcheter: false })), { aAcheter: true, achetes: 2 });
  assert.deepEqual(basculerAAcheter(o({ quantite: 4, achetes: 4, aAcheter: false })), { aAcheter: true, achetes: 0 });
});

test('la liste des Courses suit l’ordre des catégories, sans celles qui n’ont rien, objets par nom', () => {
  const categories = [
    { id: 'c2', nom: 'Énergie', ordre: 2 },
    { id: 'c1', nom: 'Alimentation', ordre: 1 },
    { id: 'c3', nom: 'Vêtements', ordre: 3 },
  ];
  const objets = [
    o({ id: 'piles', categorieId: 'c2', nom: 'Piles' }),
    o({ id: 'repas', categorieId: 'c1', nom: 'Repas' }),
    o({ id: 'cafe', categorieId: 'c1', nom: 'Café' }),
    o({ id: 'pull', categorieId: 'c3', nom: 'Pull', aAcheter: false }),
    o({ id: 'pain', categorieId: 'c1', nom: 'Pain', achetes: 16 }),
  ];
  const liste = listeDesCourses({ categories, objets });
  assert.deepEqual(
    liste.map(c => [c.categorie.id, c.objets.map(x => x.id)]),
    [
      ['c1', ['cafe', 'repas']],
      ['c2', ['piles']],
    ],
  );
  // Un objet tout juste acheté reste le temps de sa seconde de répit.
  const avecRepit = listeDesCourses({ categories, objets }, new Set(['pain']));
  assert.deepEqual(
    avecRepit[0].objets.map(x => x.id),
    ['cafe', 'pain', 'repas'],
  );
});

test('les Courses sont à faire, faites, ou sans rien de marqué', () => {
  assert.equal(etatDesCourses([o(), o({ aAcheter: false })]), 'a-faire');
  assert.equal(etatDesCourses([o({ achetes: 16 }), o({ aAcheter: false })]), 'faites');
  assert.equal(etatDesCourses([o({ aAcheter: false })]), 'rien');
  assert.equal(etatDesCourses([]), 'rien');
});
