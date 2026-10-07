// La période d'un voyage et le choix des dates sur le calendrier (spec phase 2, choix A).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { choisirJour, dateLimite, etatDuJour, joursEtNuits } from '../src/modele/periode.js';

test('jours et nuits : du 10 au 13, 4 jours et 3 nuits ; dans la journée, 1 jour et 0 nuit', () => {
  assert.deepEqual(joursEtNuits('2026-10-10', '2026-10-13'), { jours: 4, nuits: 3 });
  assert.deepEqual(joursEtNuits('2026-10-10', '2026-10-10'), { jours: 1, nuits: 0 });
  assert.deepEqual(joursEtNuits('2026-10-24', '2026-10-26'), { jours: 3, nuits: 2 });
});

test("un voyage dure au plus un an, jusqu'au même jour de l'année suivante", () => {
  assert.equal(dateLimite('2026-10-10'), '2027-10-10');
  assert.equal(dateLimite('2028-02-29'), '2029-02-28');
});

test('premier appui : le départ ; second : le retour ; un nouvel appui recommence', () => {
  const vide = { depart: null, retour: null };
  const depart = choisirJour(vide, '2026-10-15');
  assert.deepEqual(depart, { depart: '2026-10-15', retour: null });
  const complet = choisirJour(depart, '2026-10-18');
  assert.deepEqual(complet, { depart: '2026-10-15', retour: '2026-10-18' });
  assert.deepEqual(choisirJour(complet, '2026-10-20'), { depart: '2026-10-20', retour: null });
  assert.deepEqual(choisirJour(complet, '2026-10-12'), { depart: '2026-10-12', retour: null });
});

test('choix A : un jour antérieur au départ devient le nouveau départ', () => {
  const depart = { depart: '2026-10-15', retour: null };
  assert.deepEqual(choisirJour(depart, '2026-10-12'), { depart: '2026-10-12', retour: null });
});

test('deux appuis sur le même jour : un aller-retour dans la journée', () => {
  assert.deepEqual(choisirJour({ depart: '2026-10-15', retour: null }, '2026-10-15'), {
    depart: '2026-10-15',
    retour: '2026-10-15',
  });
});

test("un jour au-delà d'un an ne change rien ; le dernier jour permis est accepté", () => {
  const depart = { depart: '2026-10-10', retour: null };
  assert.deepEqual(choisirJour(depart, '2027-10-11'), depart);
  assert.deepEqual(choisirJour(depart, '2027-10-10'), { depart: '2026-10-10', retour: '2027-10-10' });
});

test("état d'un jour sur le calendrier", () => {
  const periode = { depart: '2026-10-10', retour: '2026-10-13' };
  assert.deepEqual(etatDuJour(periode, '2026-10-10'), { depart: true, retour: false, entre: false, horsLimite: false });
  assert.deepEqual(etatDuJour(periode, '2026-10-11'), { depart: false, retour: false, entre: true, horsLimite: false });
  assert.deepEqual(etatDuJour(periode, '2026-10-13'), { depart: false, retour: true, entre: false, horsLimite: false });
  const enAttente = { depart: '2026-10-10', retour: null };
  assert.equal(etatDuJour(enAttente, '2027-10-11').horsLimite, true);
  assert.equal(etatDuJour(enAttente, '2027-10-10').horsLimite, false);
  // Choix A : les jours avant le départ restent choisissables.
  assert.equal(etatDuJour(enAttente, '2026-10-01').horsLimite, false);
  assert.equal(etatDuJour({ depart: null, retour: null }, '2030-01-01').horsLimite, false);
});
