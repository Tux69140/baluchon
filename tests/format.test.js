// Mise en forme des dates et des nombres pour l'écran (spec phase 2, « Mes voyages »).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fr from '../src/i18n/fr.json' with { type: 'json' };
import { creerTraducteur } from '../src/i18n/traduction.js';
import {
  decrireRegle,
  detailComposition,
  detailsVoyage,
  formaterDate,
  formaterInstant,
  formaterJourCourt,
  formaterPeriode,
  pluriel,
} from '../src/ecrans/format.js';

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

test('le jour court (« sam. 10 oct. ») est celui du résumé des dates et des périodes', () => {
  assert.equal(formaterJourCourt('2026-10-10', 'fr'), 'sam. 10 oct.');
  assert.equal(formaterJourCourt('2026-10-13', 'en'), 'Tue, Oct 13');
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
  const voyage = { depart: '2026-10-10', retour: '2026-10-13', femmes: 1, hommes: 1, enfants: 0 };
  assert.equal(detailsVoyage(t, voyage, 'fr'), 'du sam. 10 oct. au mar. 13 oct. 2026 · 2\u00a0voyageurs');
  assert.equal(
    detailsVoyage(t, { ...voyage, hommes: 0 }, 'fr'),
    'du sam. 10 oct. au mar. 13 oct. 2026 · 1\u00a0voyageur',
  );
});

test('une règle se décrit en toutes lettres, selon « pour qui » et « partagé »', () => {
  const r = (regle, valeur, parPersonne, pourQui, plafond = null) =>
    decrireRegle(t, { regle, valeur, parPersonne, pourQui, plafond });
  assert.equal(r('fixe', 1, true, 'enfants'), '1 par enfant');
  assert.equal(r('fixe', 1, true, 'tous'), '1 par personne');
  assert.equal(r('par_semaine', 1, true, 'tous'), '1 par semaine et par personne');
  assert.equal(r('par_jour', 2, true, 'tous'), '2 par jour et par personne');
  assert.equal(r('par_jour', 1, true, 'femmes', 5), '1 par jour, au plus 5, par femme');
  assert.equal(r('par_semaine', 5, false, 'tous'), '5 par semaine, partagé');
  assert.equal(r('fixe', 1, false, 'tous'), '1, partagé');
  assert.equal(r('fixe', 4, false, 'adultes'), '4, partagé entre les adultes');
  assert.equal(r('par_nuit', 1, false, 'hommes', 3), '1 par nuit, au plus 3, partagé entre les hommes');
  assert.equal(r('fixe', 2, true, 'hommes'), '2 par homme');
  assert.equal(r('fixe', 2, true, 'adultes'), '2 par adulte');
});

test('une règle se décrit aussi en bref, pour tenir sur une ligne (« 2 / jour / enfant »)', () => {
  const r = (regle, valeur, parPersonne, pourQui, plafond = null) =>
    decrireRegle(t, { regle, valeur, parPersonne, pourQui, plafond }, { bref: true });
  assert.equal(r('par_jour', 2, true, 'enfants'), '2 / jour / enfant');
  assert.equal(r('par_jour', 2, true, 'tous'), '2 / jour / personne');
  assert.equal(r('par_semaine', 5, false, 'tous'), '5 / semaine');
  assert.equal(r('fixe', 1, false, 'tous'), '1 en tout');
  assert.equal(r('fixe', 3, true, 'tous'), '3 / personne');
  assert.equal(r('par_nuit', 1, true, 'femmes', 1), '1 / nuit / femme, au plus 1 / femme');
  assert.equal(r('par_nuit', 1, false, 'tous', 3), '1 / nuit, au plus 3');
});

test('un instant se lit à l’heure de l’appareil, en toutes lettres : « 31 octobre 2026, 18 h 40 »', () => {
  assert.equal(
    formaterInstant(t, new Date(2026, 9, 31, 18, 40).toISOString(), 'fr'),
    '31 octobre 2026, 18\u00a0h\u00a040',
  );
  assert.equal(formaterInstant(t, new Date(2026, 0, 2, 7, 5).toISOString(), 'fr'), '2 janvier 2026, 7\u00a0h\u00a005');
});

test('detailComposition dit les groupes présents, au singulier ou au pluriel, groupes vides omis', () => {
  assert.equal(detailComposition(t, { femmes: 2, hommes: 0, enfants: 1 }, 'fr'), '2\u00a0femmes, 1\u00a0enfant');
  assert.equal(detailComposition(t, { femmes: 0, hommes: 1, enfants: 0 }, 'fr'), '1\u00a0homme');
  assert.equal(
    detailsVoyage(t, { depart: '2026-10-10', retour: '2026-10-13', femmes: 2, hommes: 0, enfants: 1 }, 'fr', {
      detail: true,
    }),
    'du sam. 10 oct. au mar. 13 oct. 2026 · 2\u00a0femmes, 1\u00a0enfant',
  );
});

test('le pluriel lit la forme de la langue, puis « other » si elle manque', () => {
  const dico = { n: { one: '{n} un', few: '{n} quelques', other: '{n} autres' } };
  const tp = creerTraducteur({ fr: dico }, 'fr');
  assert.equal(pluriel(tp, 'n', 3, 'pl'), '3 quelques');
  assert.equal(pluriel(tp, 'n', 3, 'fr'), '3 autres');
  assert.equal(pluriel(tp, 'n', 1, 'fr'), '1 un');
  // « many » (français : un million) n'existe pas dans ce dictionnaire.
  assert.equal(pluriel(tp, 'n', 1000000, 'fr'), '1000000 autres');
});
