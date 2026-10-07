// Mise en forme des dates et des nombres pour l'écran (spec phase 2, « Mes voyages »).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fr from '../src/i18n/fr.json' with { type: 'json' };
import { creerTraducteur } from '../src/i18n/traduction.js';
import { detailsVoyage, formaterDate, formaterPeriode, pluriel } from '../src/ecrans/format.js';

const t = creerTraducteur({ fr }, 'fr');

test('une date de calendrier se lit dans la langue demandée, sans décalage de fuseau', () => {
  assert.equal(
    formaterDate('2026-10-10', 'fr', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
    'samedi 10 octobre 2026',
  );
  // Un 1er janvier reste un 1er janvier : lu à minuit locale, il pourrait reculer d'un jour.
  assert.equal(formaterDate('2026-01-01', 'fr', { day: 'numeric', month: 'long' }), '1 janvier');
  assert.equal(formaterDate('2026-10-10', 'en', { weekday: 'long' }), 'Saturday');
});

test('une période de la même année ne donne l’année qu’au retour', () => {
  assert.equal(formaterPeriode(t, '2026-10-10', '2026-10-13', 'fr'), 'du sam. 10 oct. au mar. 13 oct. 2026');
  assert.equal(formaterPeriode(t, '2026-10-10', '2026-10-10', 'fr'), 'du sam. 10 oct. au sam. 10 oct. 2026');
});

test('une période à cheval sur deux années donne l’année aux deux dates', () => {
  assert.equal(formaterPeriode(t, '2026-12-30', '2027-01-02', 'fr'), 'du mer. 30 déc. 2026 au sam. 2 janv. 2027');
});

test('pluriel choisit la forme selon le nombre et la langue, et y pose le nombre', () => {
  const tp = creerTraducteur({ fr: { voyageurs: { one: '{n} voyageur', other: '{n} voyageurs' } } }, 'fr');
  assert.equal(pluriel(tp, 'voyageurs', 1, 'fr'), '1 voyageur');
  assert.equal(pluriel(tp, 'voyageurs', 2, 'fr'), '2 voyageurs');
  assert.equal(pluriel(tp, 'voyageurs', 20, 'fr'), '20 voyageurs');
  // En français, zéro est au singulier ; en anglais, au pluriel.
  assert.equal(pluriel(tp, 'voyageurs', 0, 'fr'), '0 voyageur');
  assert.equal(pluriel(tp, 'voyageurs', 0, 'en'), '0 voyageurs');
});

test('detailsVoyage assemble la période et les voyageurs avec le séparateur de fr.json', () => {
  const voyage = { depart: '2026-10-10', retour: '2026-10-13', voyageurs: 2 };
  assert.equal(detailsVoyage(t, voyage, 'fr'), 'du sam. 10 oct. au mar. 13 oct. 2026 · 2 voyageurs');
  assert.equal(
    detailsVoyage(t, { ...voyage, voyageurs: 1 }, 'fr'),
    'du sam. 10 oct. au mar. 13 oct. 2026 · 1 voyageur',
  );
});
