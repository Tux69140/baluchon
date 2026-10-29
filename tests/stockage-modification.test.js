// La modification d'un voyage dans la variante navigateur du stockage : mêmes cas et mêmes refus que
// les tests de la base (src-tauri/src/modification_essais.rs).
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import contrat from './contrat/stockage.json' with { type: 'json' };
import { creerStockageNavigateur } from '../src/stockage/navigateur.js';

const MAINTENANT = '2026-10-29T10:00:00.000Z';
const copie = valeur => structuredClone(valeur);

beforeEach(() => {
  const memoire = new Map();
  globalThis.localStorage = {
    getItem: cle => memoire.get(cle) ?? null,
    setItem: (cle, valeur) => memoire.set(cle, String(valeur)),
  };
});

async function stockageAvecVoyage({ pannes } = {}) {
  const stockage = creerStockageNavigateur();
  await stockage.creerVoyage(contrat.voyage);
  if (pannes) {
    const donnees = JSON.parse(localStorage.getItem('baluchon-essai'));
    localStorage.setItem('baluchon-essai', JSON.stringify({ ...donnees, pannes }));
  }
  return stockage;
}

test('une modification complète est relue à l’identique', async () => {
  const stockage = await stockageAvecVoyage();
  const m = contrat.modification;
  await stockage.modifierVoyage(copie(m));
  const relu = await stockage.lireVoyage('v-vercors');
  assert.deepEqual(relu.voyage, m.voyage);
  assert.deepEqual(relu.etiquettes, m.etiquettes);
  assert.deepEqual(relu.categories.map(c => c.id).sort(), ['cv-alimentation', 'cv-camping']);
  assert.deepEqual(
    relu.objets.find(o => o.id === 'ov-gaz'),
    m.objetsAjoutes[0],
  );
  assert.deepEqual(
    relu.objets.find(o => o.id === 'ov-repas'),
    m.objetsModifies[0],
  );
  assert.equal(relu.objets.length, 2);
  assert.deepEqual(await stockage.listerVoyages(), [m.voyage]);
});

for (const [cas, abimer] of [
  ['touche un autre voyage', m => (m.objetsModifies[0].voyageId = 'v-autre')],
  ['retire une catégorie encore occupée', m => (m.objetsRetires = [])],
  ['crée des pièces de trop', m => (m.objetsModifies[0].dansLeSac = 25)],
  ['range un objet dans une catégorie inconnue', m => (m.objetsAjoutes[0].categorieId = 'cv-inconnue')],
])
  test(`une modification qui ${cas} est refusée sans rien écrire`, async () => {
    const stockage = await stockageAvecVoyage();
    const m = copie(contrat.modification);
    abimer(m);
    await assert.rejects(stockage.modifierVoyage(m));
    assert.deepEqual(await stockage.lireVoyage('v-vercors'), contrat.voyage);
  });

test('une panne d’enregistrement ne laisse rien d’écrit', async () => {
  const stockage = await stockageAvecVoyage({ pannes: ['modifierVoyage'] });
  await assert.rejects(stockage.modifierVoyage(copie(contrat.modification)));
  assert.deepEqual(await stockage.lireVoyage('v-vercors'), contrat.voyage);
});

test('marquer retiré garde le sac et vide la quantité ; sans pièce, refusé', async () => {
  const stockage = await stockageAvecVoyage();
  await stockage.marquerRetire('ov-tshirts', MAINTENANT);
  const tshirts = (await stockage.lireVoyage('v-vercors')).objets.find(o => o.id === 'ov-tshirts');
  assert.deepEqual([tshirts.quantite, tshirts.dansLeSac, tshirts.achetes], [0, 3, 0]);
  await assert.rejects(stockage.marquerRetire('ov-repas', MAINTENANT));
});

test('garder dans le voyage rend une quantité et garde le sac', async () => {
  const stockage = await stockageAvecVoyage();
  await stockage.marquerRetire('ov-tshirts', MAINTENANT);
  await assert.rejects(stockage.garderDansLeVoyage('ov-tshirts', 0, false, 0, MAINTENANT));
  await assert.rejects(stockage.garderDansLeVoyage('ov-tshirts', 3, true, 4, MAINTENANT));
  await stockage.garderDansLeVoyage('ov-tshirts', 3, true, 3, MAINTENANT);
  const tshirts = (await stockage.lireVoyage('v-vercors')).objets.find(o => o.id === 'ov-tshirts');
  assert.deepEqual([tshirts.quantite, tshirts.dansLeSac, tshirts.quantiteManuelle, tshirts.achetes], [3, 3, true, 3]);
});
