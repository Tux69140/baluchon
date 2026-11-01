// Les préférences de l'appareil (src/stockage/preferences.js) : retenues dans localStorage, hors base et
// hors sauvegarde. Une valeur inconnue ou un stockage refusé donnent les défauts, sans jamais lever.
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  ecrireDerniereComposition,
  ecrireDerniereSauvegarde,
  ecrireTheme,
  lireDerniereComposition,
  lireDerniereSauvegarde,
  lireTheme,
} from '../src/stockage/preferences.js';

let magasin;
beforeEach(() => {
  magasin = new Map();
  globalThis.localStorage = {
    getItem: cle => magasin.get(cle) ?? null,
    setItem: (cle, valeur) => magasin.set(cle, String(valeur)),
  };
});
afterEach(() => {
  delete globalThis.localStorage;
});

const refuse = () => {
  globalThis.localStorage = {
    getItem: () => {
      throw new Error('refusé');
    },
    setItem: () => {
      throw new Error('refusé');
    },
  };
};

test('le thème choisi est retenu ; sans choix, ou valeur inconnue, c’est « appareil »', () => {
  assert.equal(lireTheme(), 'appareil');
  for (const choix of ['sombre', 'clair', 'appareil']) {
    ecrireTheme(choix);
    assert.equal(lireTheme(), choix);
  }
  magasin.set('baluchon-theme', 'violet');
  assert.equal(lireTheme(), 'appareil');
});

test('écrire un thème inconnu ne retient rien de faux', () => {
  ecrireTheme('sombre');
  ecrireTheme('violet');
  assert.equal(lireTheme(), 'sombre');
});

test('la date de la dernière sauvegarde est retenue ; sans elle, null', () => {
  assert.equal(lireDerniereSauvegarde(), null);
  ecrireDerniereSauvegarde('2026-10-31T14:05:00.000Z');
  assert.equal(lireDerniereSauvegarde(), '2026-10-31T14:05:00.000Z');
  assert.equal(magasin.get('baluchon-derniere-sauvegarde'), '2026-10-31T14:05:00.000Z');
});

test('un stockage refusé donne les défauts et n’empêche rien', () => {
  refuse();
  assert.equal(lireTheme(), 'appareil');
  assert.equal(lireDerniereSauvegarde(), null);
  assert.doesNotThrow(() => ecrireTheme('sombre'));
  assert.doesNotThrow(() => ecrireDerniereSauvegarde('2026-10-31T14:05:00.000Z'));
});

test('la dernière composition est retenue ; sans elle, ou abîmée, tout est à zéro', () => {
  const initiale = { femmes: 0, hommes: 0, enfants: 0 };
  assert.deepEqual(lireDerniereComposition(), initiale);
  ecrireDerniereComposition({ femmes: 2, hommes: 0, enfants: 1 });
  assert.deepEqual(lireDerniereComposition(), { femmes: 2, hommes: 0, enfants: 1 });
  for (const abimee of [
    'n’importe quoi',
    '{"femmes":0,"hommes":0,"enfants":0}',
    '{"femmes":30,"hommes":1,"enfants":0}',
    '{"femmes":"2"}',
    'null',
  ]) {
    magasin.set('baluchon-derniere-composition', abimee);
    assert.deepEqual(lireDerniereComposition(), initiale, abimee);
  }
  refuse();
  assert.deepEqual(lireDerniereComposition(), initiale);
  assert.doesNotThrow(() => ecrireDerniereComposition({ femmes: 2, hommes: 0, enfants: 1 }));
});
