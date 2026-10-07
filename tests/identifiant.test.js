// Identifiants UUID v4 en texte (docs/PLAN.md, « Schéma »).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nouvelId } from '../src/modele/identifiant.js';

test('un identifiant est un UUID v4, et deux tirages ne se répètent pas', () => {
  const ids = Array.from({ length: 1000 }, nouvelId);
  for (const id of ids) assert.match(id, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  assert.equal(new Set(ids).size, 1000);
});
