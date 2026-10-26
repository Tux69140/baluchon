// La rangée d'étapes de l'assistant quand les groupes sont nombreux (phase 6, décision du chef de
// projet, 2026-10-26) : combien d'étapes entières tiennent, et laquelle se montre la première pour
// garder l'étape en cours au milieu sans dépasser les bords. Sans navigateur.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LARGEUR_MINI, fenetreDEtapes } from '../src/ecrans/rangee-etapes.js';

test('les largeurs mini : 52 px au téléphone (ronds seuls), 104 px ailleurs', () => {
  assert.deepEqual(LARGEUR_MINI, { etroit: 52, large: 104 });
});

test('9 étapes sur 328 px au téléphone : 6 tiennent, la rangée défile, chacune prend une part', () => {
  const f = fenetreDEtapes({ nombre: 9, courante: 3, place: 328, mini: LARGEUR_MINI.etroit });
  assert.equal(f.tiennent, 6);
  assert.equal(f.defile, true);
  assert.equal(f.part, 328 / 6);
  assert.equal(f.premiere, 1);
});

test('l’étape en cours au milieu, sans dépasser les bords', () => {
  const premiere = courante => fenetreDEtapes({ nombre: 9, courante, place: 328, mini: LARGEUR_MINI.etroit }).premiere;
  assert.equal(premiere(0), 0);
  assert.equal(premiere(3), 1);
  assert.equal(premiere(8), 3);
});

test('tout tient : pas de défilement, la première étape est la première', () => {
  const f = fenetreDEtapes({ nombre: 5, courante: 4, place: 328, mini: LARGEUR_MINI.etroit });
  assert.equal(f.defile, false);
  assert.equal(f.premiere, 0);
});

test('une place plus étroite qu’une étape : une étape tient quand même', () => {
  const f = fenetreDEtapes({ nombre: 9, courante: 5, place: 30, mini: LARGEUR_MINI.etroit });
  assert.equal(f.tiennent, 1);
  assert.equal(f.defile, true);
  assert.equal(f.premiere, 5);
});
