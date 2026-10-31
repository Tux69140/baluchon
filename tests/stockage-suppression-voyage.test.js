// Les objets écartés d'un voyage et sa suppression dans la variante navigateur du stockage : mêmes cas et
// mêmes refus que les tests de la base (src-tauri/src/voyages_essais.rs).
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import contrat from './contrat/stockage.json' with { type: 'json' };
import { creerStockageNavigateur } from '../src/stockage/navigateur.js';

beforeEach(() => {
  const memoire = new Map();
  globalThis.localStorage = {
    getItem: cle => memoire.get(cle) ?? null,
    setItem: (cle, valeur) => memoire.set(cle, String(valeur)),
  };
});

test('un voyage créé relit ses objets écartés triés, et un ancien voyage sans la clé en a une liste vide', async () => {
  const stockage = creerStockageNavigateur();
  await stockage.creerVoyage({ ...contrat.voyage, ecartes: ['m-b', 'm-a'] });
  assert.deepEqual((await stockage.lireVoyage('v-vercors')).ecartes, ['m-a', 'm-b']);
  const donnees = JSON.parse(localStorage.getItem('baluchon-essai'));
  delete donnees.objetsEcartes;
  localStorage.setItem('baluchon-essai', JSON.stringify(donnees));
  assert.deepEqual((await stockage.lireVoyage('v-vercors')).ecartes, []);
});

// Un second voyage, copie du premier sous d'autres identifiants.
function autreVoyage() {
  const prefixe = id => `autre-${id}`;
  const v = contrat.voyage;
  return {
    voyage: { ...v.voyage, id: 'v-autre' },
    etiquettes: v.etiquettes.map(e => ({ ...e, id: prefixe(e.id), voyageId: 'v-autre' })),
    categories: v.categories.map(c => ({ ...c, id: prefixe(c.id), voyageId: 'v-autre' })),
    objets: v.objets.map(o => ({ ...o, id: prefixe(o.id), voyageId: 'v-autre', categorieId: prefixe(o.categorieId) })),
    ecartes: ['om-cartes'],
  };
}

test('supprimer un voyage efface tout ce qui en dépend, et rien du reste', async () => {
  const stockage = creerStockageNavigateur();
  await stockage.installerBibliotheque(contrat.bibliotheque, 'fr');
  await stockage.creerVoyage({ ...contrat.voyage, ecartes: ['om-cartes'] });
  await stockage.creerVoyage(autreVoyage());
  await stockage.supprimerVoyage('v-vercors');
  assert.equal(await stockage.lireVoyage('v-vercors'), null);
  assert.deepEqual(await stockage.lireVoyage('v-autre'), autreVoyage());
  assert.deepEqual(
    (await stockage.listerVoyages()).map(v => v.id),
    ['v-autre'],
  );
  const donnees = JSON.parse(localStorage.getItem('baluchon-essai'));
  for (const cle of ['etiquettesDuVoyage', 'categoriesDuVoyage', 'objetsDuVoyage', 'objetsEcartes']) {
    assert.ok(donnees[cle].length > 0, cle);
    assert.ok(
      donnees[cle].every(x => x.voyageId === 'v-autre'),
      cle,
    );
  }
  assert.deepEqual(await stockage.lireBibliotheque(), contrat.bibliotheque);
});

test('supprimer un voyage inconnu est refusé sans rien écrire', async () => {
  const stockage = creerStockageNavigateur();
  await stockage.creerVoyage(contrat.voyage);
  const avant = localStorage.getItem('baluchon-essai');
  await assert.rejects(stockage.supprimerVoyage('inconnu'), /Voyage inconnu : inconnu/);
  assert.equal(localStorage.getItem('baluchon-essai'), avant);
});

test('recréer un voyage supprimé le rend à l’identique', async () => {
  const stockage = creerStockageNavigateur();
  const objets = [{ ...contrat.voyage.objets[0], quantite: 3, dansLeSac: 4, achetes: 2, quantiteManuelle: true }];
  await stockage.creerVoyage({
    ...contrat.voyage,
    objets: [...objets, contrat.voyage.objets[1]],
    ecartes: ['om-cartes', 'om-autre'],
  });
  const avant = await stockage.lireVoyage('v-vercors');
  await stockage.supprimerVoyage('v-vercors');
  await stockage.creerVoyage(avant);
  assert.deepEqual(await stockage.lireVoyage('v-vercors'), avant);
});

test('une panne simulée fait échouer la suppression sans rien retirer', async () => {
  const stockage = creerStockageNavigateur();
  await stockage.creerVoyage(contrat.voyage);
  const donnees = JSON.parse(localStorage.getItem('baluchon-essai'));
  localStorage.setItem('baluchon-essai', JSON.stringify({ ...donnees, pannes: ['supprimerVoyage'] }));
  await assert.rejects(stockage.supprimerVoyage('v-vercors'), /Panne simulée/);
  localStorage.setItem('baluchon-essai', JSON.stringify(donnees));
  assert.deepEqual(await stockage.lireVoyage('v-vercors'), contrat.voyage);
});
