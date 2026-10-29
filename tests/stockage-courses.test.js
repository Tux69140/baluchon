// Les Courses dans la variante navigateur du stockage : mêmes cas et mêmes refus que les tests de la base
// (src-tauri/src/courses_essais.rs).
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import contrat from './contrat/stockage.json' with { type: 'json' };
import { creerStockageNavigateur } from '../src/stockage/navigateur.js';

const MAINTENANT = '2026-10-29T10:00:00.000Z';

beforeEach(() => {
  const memoire = new Map();
  globalThis.localStorage = {
    getItem: cle => memoire.get(cle) ?? null,
    setItem: (cle, valeur) => memoire.set(cle, String(valeur)),
  };
});

async function stockageAvecVoyage() {
  const stockage = creerStockageNavigateur();
  await stockage.creerVoyage(contrat.voyage);
  return stockage;
}

const repas = async stockage => (await stockage.lireVoyage('v-vercors')).objets.find(o => o.id === 'ov-repas');

test('régler les achats se relit', async () => {
  const stockage = await stockageAvecVoyage();
  await stockage.reglerAchats('ov-repas', true, 6, MAINTENANT);
  const objet = await repas(stockage);
  assert.deepEqual([objet.aAcheter, objet.achetes, objet.modifieLe], [true, 6, MAINTENANT]);
  await stockage.reglerAchats('ov-repas', false, 6, MAINTENANT);
  assert.equal((await repas(stockage)).aAcheter, false);
});

test('régler les achats refuse hors bornes et un objet inconnu, sans rien changer', async () => {
  const stockage = await stockageAvecVoyage();
  const avant = localStorage.getItem('baluchon-essai');
  await assert.rejects(stockage.reglerAchats('ov-repas', true, 17, MAINTENANT), /Les pièces achetées dépassent/);
  await assert.rejects(stockage.reglerAchats('ov-repas', true, -1, MAINTENANT));
  await assert.rejects(stockage.reglerAchats('ov-repas', true, 1.5, MAINTENANT));
  await assert.rejects(stockage.reglerAchats('inconnu', true, 0, MAINTENANT));
  assert.equal(localStorage.getItem('baluchon-essai'), avant);
});

test('une panne simulée fait échouer le réglage des achats sans rien écrire', async () => {
  const stockage = await stockageAvecVoyage();
  const donnees = JSON.parse(localStorage.getItem('baluchon-essai'));
  localStorage.setItem('baluchon-essai', JSON.stringify({ ...donnees, pannes: ['reglerAchats'] }));
  await assert.rejects(stockage.reglerAchats('ov-repas', true, 6, MAINTENANT));
  localStorage.setItem('baluchon-essai', JSON.stringify(donnees));
  assert.equal((await repas(stockage)).achetes, 0);
});
