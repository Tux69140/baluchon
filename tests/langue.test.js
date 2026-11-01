// Choix de la langue de l'appli parmi celles que l'appareil préfère (spec phase 13, décision 7).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { choisirLangue } from '../src/i18n/langue.js';

const dispo = ['fr', 'eo', 'pt-BR'];

test('langue exacte, puis langue de base, puis français', () => {
  assert.equal(choisirLangue(['eo'], dispo), 'eo');
  assert.equal(choisirLangue(['fr-CA'], dispo), 'fr');
  assert.equal(choisirLangue(['pt-BR', 'fr'], dispo), 'pt-BR');
  assert.equal(choisirLangue(['de-DE', 'eo-XX'], dispo), 'eo');
  assert.equal(choisirLangue(['de-DE'], dispo), 'fr');
  assert.equal(choisirLangue([], dispo), 'fr');
});
