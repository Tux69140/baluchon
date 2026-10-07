// Dates de calendrier sans heure (docs/PLAN.md, « Dates »).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ajouterJours,
  ajouterMois,
  dateDuJour,
  ecartEnJours,
  estDate,
  moisDe,
  moisEnSemaines,
  moisVoisin,
} from '../src/modele/dates.js';

test(`une date se reconnaît à son format et à son existence dans le calendrier`, () => {
  assert.equal(estDate('2026-10-10'), true);
  assert.equal(estDate('2028-02-29'), true);
  assert.equal(estDate('2026-02-29'), false);
  assert.equal(estDate('2026-02-30'), false);
  assert.equal(estDate('2026-13-01'), false);
  assert.equal(estDate('10/10/2026'), false);
  assert.equal(estDate(undefined), false);
});

test(`ajouter des jours traverse les mois, les années et le changement d'heure`, () => {
  assert.equal(ajouterJours('2026-10-24', 2), '2026-10-26');
  assert.equal(ajouterJours('2026-12-31', 1), '2027-01-01');
  assert.equal(ajouterJours('2026-03-01', -1), '2026-02-28');
});

test(`l'écart en jours compte les dates entre deux jours`, () => {
  assert.equal(ecartEnJours('2026-10-10', '2026-10-13'), 3);
  assert.equal(ecartEnJours('2026-10-10', '2026-10-10'), 0);
  assert.equal(ecartEnJours('2026-03-28', '2026-03-30'), 2);
});

test(`la date du jour suit l'horloge locale, même tard le soir`, () => {
  assert.equal(dateDuJour(new Date(2026, 9, 12, 23, 30)), '2026-10-12');
  assert.equal(dateDuJour(new Date(2026, 0, 1, 0, 5)), '2026-01-01');
});

test(`mois voisins et ajout de mois`, () => {
  assert.deepEqual(moisDe('2026-10-10'), { annee: 2026, mois: 10 });
  assert.deepEqual(moisVoisin({ annee: 2026, mois: 12 }, 1), { annee: 2027, mois: 1 });
  assert.deepEqual(moisVoisin({ annee: 2026, mois: 1 }, -1), { annee: 2025, mois: 12 });
  assert.deepEqual(moisVoisin({ annee: 2026, mois: 10 }, 12), { annee: 2027, mois: 10 });
  // Le 31 janvier plus un mois : le dernier jour de février.
  assert.equal(ajouterMois('2026-01-31', 1), '2026-02-28');
  assert.equal(ajouterMois('2028-02-29', 12), '2029-02-28');
  assert.equal(ajouterMois('2026-12-15', 1), '2027-01-15');
  assert.equal(ajouterMois('2026-01-15', -1), '2025-12-15');
});

test(`un mois se découpe en semaines du lundi au dimanche`, () => {
  // Le 1er octobre 2026 est un jeudi.
  const octobre = moisEnSemaines({ annee: 2026, mois: 10 });
  assert.equal(octobre.length, 5);
  assert.deepEqual(octobre[0], [null, null, null, '2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04']);
  assert.deepEqual(octobre[4], [
    '2026-10-26',
    '2026-10-27',
    '2026-10-28',
    '2026-10-29',
    '2026-10-30',
    '2026-10-31',
    null,
  ]);
  // Février 2027 commence un lundi et compte 28 jours : quatre semaines pleines.
  const fevrier = moisEnSemaines({ annee: 2027, mois: 2 });
  assert.equal(fevrier.length, 4);
  assert.equal(fevrier.flat().includes(null), false);
  assert.equal(fevrier[0][0], '2027-02-01');
});
