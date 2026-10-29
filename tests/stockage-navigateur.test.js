// La variante navigateur du stockage, qui sert de base aux tests d'écran : elle doit se comporter
// comme la base SQLite (src-tauri/src/*.rs) — installation unique, voyage relu à l'identique,
// voyage inconnu absent.
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import contrat from './contrat/stockage.json' with { type: 'json' };
import { creerStockageNavigateur } from '../src/stockage/navigateur.js';

// Une mémoire du navigateur minimale, remise à zéro avant chaque test.
beforeEach(() => {
  const memoire = new Map();
  globalThis.localStorage = {
    getItem: cle => memoire.get(cle) ?? null,
    setItem: (cle, valeur) => memoire.set(cle, String(valeur)),
  };
});

test('la bibliothèque s’installe une seule fois et se relit à l’identique', async () => {
  const stockage = creerStockageNavigateur();
  assert.equal(await stockage.bibliothequeInstallee(), false);
  assert.equal(await stockage.installerBibliotheque(contrat.bibliotheque, 'fr'), true);
  assert.equal(await stockage.bibliothequeInstallee(), true);
  assert.equal(
    await stockage.installerBibliotheque({ groupes: [], etiquettes: [], categories: [], objets: [] }, 'en'),
    false,
  );
  assert.deepEqual(await stockage.lireBibliotheque(), contrat.bibliotheque);
});

test('un voyage créé se relit à l’identique et apparaît dans la liste', async () => {
  const stockage = creerStockageNavigateur();
  await stockage.creerVoyage(contrat.voyage);
  assert.deepEqual(await stockage.lireVoyage('v-vercors'), contrat.voyage);
  assert.deepEqual(await stockage.listerVoyages(), [contrat.voyage.voyage]);
  assert.equal(await stockage.lireVoyage('inconnu'), null);
});

test('les voyages déposés par un test (forme de la phase 1) restent lisibles', async () => {
  localStorage.setItem('baluchon-essai', JSON.stringify({ voyages: [contrat.voyage.voyage] }));
  const stockage = creerStockageNavigateur();
  assert.deepEqual(await stockage.listerVoyages(), [contrat.voyage.voyage]);
  assert.deepEqual(await stockage.lireVoyage('v-vercors'), {
    voyage: contrat.voyage.voyage,
    etiquettes: [],
    categories: [],
    objets: [],
  });
});

test('un voyage garde ses étiquettes, et un ancien voyage sans la clé en a une liste vide', async () => {
  const stockage = creerStockageNavigateur();
  const deux = [
    ...contrat.voyage.etiquettes,
    { ...contrat.voyage.etiquettes[0], id: 'ev-froid', nom: 'Froid', ordre: 1 },
  ];
  await stockage.creerVoyage({ ...contrat.voyage, etiquettes: deux });
  assert.deepEqual((await stockage.lireVoyage('v-vercors')).etiquettes, deux);
  const donnees = JSON.parse(localStorage.getItem('baluchon-essai'));
  delete donnees.etiquettesDuVoyage;
  localStorage.setItem('baluchon-essai', JSON.stringify(donnees));
  assert.deepEqual((await stockage.lireVoyage('v-vercors')).etiquettes, []);
});

test('une panne simulée fait échouer la création sans rien écrire', async () => {
  localStorage.setItem('baluchon-essai', JSON.stringify({ pannes: ['creerVoyage'] }));
  const stockage = creerStockageNavigateur();
  await assert.rejects(stockage.creerVoyage(contrat.voyage));
  assert.deepEqual(await stockage.listerVoyages(), []);
});

test('régler les pièces dans le sac se relit, change la date et apparaît dans les états', async () => {
  const stockage = creerStockageNavigateur();
  await stockage.creerVoyage(contrat.voyage);
  await stockage.reglerDansLeSac('ov-repas', 6, 0, '2026-10-24T09:00:00.000Z');
  const objet = (await stockage.lireVoyage('v-vercors')).objets.find(o => o.id === 'ov-repas');
  assert.equal(objet.dansLeSac, 6);
  assert.equal(objet.modifieLe, '2026-10-24T09:00:00.000Z');
  const etats = await stockage.etatsDesObjets();
  assert.deepEqual(
    etats.find(e => e.dansLeSac === 6),
    { voyageId: 'v-vercors', quantite: 16, dansLeSac: 6 },
  );
  assert.equal(etats.length, contrat.voyage.objets.length);
});

test('régler le sac écrit aussi les pièces achetées, dans leurs bornes', async () => {
  const stockage = creerStockageNavigateur();
  await stockage.creerVoyage(contrat.voyage);
  await stockage.reglerDansLeSac('ov-repas', 16, 16, 'x');
  const objet = (await stockage.lireVoyage('v-vercors')).objets.find(o => o.id === 'ov-repas');
  assert.deepEqual([objet.dansLeSac, objet.achetes], [16, 16]);
  await assert.rejects(stockage.reglerDansLeSac('ov-repas', 0, 17, 'x'));
  await assert.rejects(stockage.reglerDansLeSac('ov-repas', 0, -1, 'x'));
});

test('régler un objet inconnu ou hors bornes est refusé et ne change rien', async () => {
  const stockage = creerStockageNavigateur();
  await stockage.creerVoyage(contrat.voyage);
  await assert.rejects(stockage.reglerDansLeSac('inconnu', 1, 0, 'x'));
  await assert.rejects(stockage.reglerDansLeSac('ov-repas', 17, 0, 'x'));
  await assert.rejects(stockage.reglerDansLeSac('ov-repas', -1, 0, 'x'));
  await assert.rejects(stockage.reglerDansLeSac('ov-repas', 1.5, 0, 'x'));
  assert.deepEqual(await stockage.lireVoyage('v-vercors'), contrat.voyage);
});

test('une panne simulée fait échouer le réglage ou la lecture des états', async () => {
  const stockage = creerStockageNavigateur();
  await stockage.creerVoyage(contrat.voyage);
  const donnees = JSON.parse(localStorage.getItem('baluchon-essai'));
  localStorage.setItem('baluchon-essai', JSON.stringify({ ...donnees, pannes: ['reglerDansLeSac', 'etatsDesObjets'] }));
  await assert.rejects(stockage.reglerDansLeSac('ov-repas', 6, 0, 'x'));
  await assert.rejects(stockage.etatsDesObjets());
  localStorage.setItem('baluchon-essai', JSON.stringify(donnees));
  assert.deepEqual(await stockage.lireVoyage('v-vercors'), contrat.voyage);
});

test('le filtre « Reste à emballer » est retenu par voyage, d’une instance à l’autre', () => {
  creerStockageNavigateur().ecrireFiltre('v-vercors', true);
  const stockage = creerStockageNavigateur();
  assert.equal(stockage.lireFiltre('v-vercors'), true);
  assert.equal(stockage.lireFiltre('autre'), false);
  stockage.ecrireFiltre('v-vercors', false);
  assert.equal(stockage.lireFiltre('v-vercors'), false);
});

test('un localStorage qui échoue donne un filtre inactif, sans erreur', () => {
  globalThis.localStorage = {
    getItem: () => {
      throw new Error('illisible');
    },
    setItem: () => {
      throw new Error('plein');
    },
  };
  const stockage = creerStockageNavigateur();
  assert.equal(stockage.lireFiltre('v-vercors'), false);
  assert.doesNotThrow(() => stockage.ecrireFiltre('v-vercors', true));
});

// Écritures de la bibliothèque (mêmes refus que la base : src-tauri/src/edition.rs).
async function stockageInstalle() {
  const stockage = creerStockageNavigateur();
  await stockage.installerBibliotheque(structuredClone(contrat.bibliotheque), 'fr');
  return stockage;
}

test('une catégorie enregistrée se relit, neuve puis modifiée, sans changer de rang', async () => {
  const stockage = await stockageInstalle();
  const neuve = {
    id: 'cm-neuve',
    nom: 'Plage',
    icone: 'suitcase-rolling',
    couleur: 'corail',
    ordre: 2,
    toujoursIncluse: false,
    modifieLe: '2026-10-26T09:00:00.000Z',
    etiquettes: ['et-froid', 'et-camping'],
  };
  await stockage.enregistrerCategorie(neuve);
  assert.deepEqual((await stockage.lireBibliotheque()).categories[2], neuve);
  const modifiee = { ...neuve, nom: 'Mer', ordre: 0, etiquettes: ['et-camping'] };
  await stockage.enregistrerCategorie(modifiee);
  const { categories } = await stockage.lireBibliotheque();
  assert.equal(categories.length, 3);
  assert.deepEqual(categories[2], { ...modifiee, ordre: 2 });
});

test('un objet enregistré se relit, neuf puis modifié, sa catégorie ne changeant pas', async () => {
  const stockage = await stockageInstalle();
  const neuf = { ...contrat.bibliotheque.objets[0], id: 'om-neuf', plafond: null, etiquettes: ['et-camping'] };
  await stockage.enregistrerObjet(neuf);
  assert.deepEqual(
    (await stockage.lireBibliotheque()).objets.find(o => o.id === 'om-neuf'),
    neuf,
  );
  const modifie = { ...neuf, nom: 'Gros pull', plafond: 4, categorieId: 'cm-papiers', etiquettes: [] };
  await stockage.enregistrerObjet(modifie);
  const { objets } = await stockage.lireBibliotheque();
  assert.equal(objets.length, 3);
  assert.deepEqual(
    objets.find(o => o.id === 'om-neuf'),
    { ...modifie, categorieId: neuf.categorieId },
  );
});

test('une catégorie, un objet ou une étiquette inconnus sont refusés sans rien écrire', async () => {
  const stockage = await stockageInstalle();
  const objet = contrat.bibliotheque.objets[0];
  await assert.rejects(stockage.enregistrerObjet({ ...objet, id: 'om-x', categorieId: 'cm-inconnue' }));
  await assert.rejects(stockage.enregistrerObjet({ ...objet, nom: 'Changé', etiquettes: ['et-inconnue'] }));
  await assert.rejects(
    stockage.enregistrerCategorie({
      ...contrat.bibliotheque.categories[1],
      nom: 'Changée',
      etiquettes: ['et-inconnue'],
    }),
  );
  assert.deepEqual(await stockage.lireBibliotheque(), contrat.bibliotheque);
});

test('ranger suit l’ordre donné et refuse une liste incomplète, inconnue ou doublée', async () => {
  const stockage = await stockageInstalle();
  await stockage.rangerCategories(['cm-papiers', 'cm-vetements'], '2026-10-26T09:00:00.000Z');
  const { categories } = await stockage.lireBibliotheque();
  assert.deepEqual(
    categories.map(c => [c.id, c.ordre]),
    [
      ['cm-papiers', 0],
      ['cm-vetements', 1],
    ],
  );
  assert.equal(categories[1].modifieLe, '2026-10-26T09:00:00.000Z');
  for (const ids of [['cm-papiers'], ['cm-papiers', 'cm-inconnue'], ['cm-papiers', 'cm-papiers']]) {
    await assert.rejects(stockage.rangerCategories(ids, '2026-10-27T09:00:00.000Z'));
  }
  assert.deepEqual(
    (await stockage.lireBibliotheque()).categories.map(c => c.id),
    ['cm-papiers', 'cm-vetements'],
  );
});

test('une panne simulée fait échouer chaque écriture de la bibliothèque sans rien écrire', async () => {
  const stockage = await stockageInstalle();
  const donnees = JSON.parse(localStorage.getItem('baluchon-essai'));
  localStorage.setItem(
    'baluchon-essai',
    JSON.stringify({ ...donnees, pannes: ['enregistrerObjet', 'enregistrerCategorie', 'rangerCategories'] }),
  );
  await assert.rejects(
    stockage.enregistrerObjet({ ...contrat.bibliotheque.objets[0], nom: 'Changé' }),
    /Panne simulée/,
  );
  await assert.rejects(
    stockage.enregistrerCategorie({ ...contrat.bibliotheque.categories[0], nom: 'Changée' }),
    /Panne/,
  );
  await assert.rejects(stockage.rangerCategories(['cm-papiers', 'cm-vetements'], 'x'), /Panne/);
  assert.deepEqual(await stockage.lireBibliotheque(), contrat.bibliotheque);
});

const MAINTENANT = '2026-10-26T09:00:00.000Z';
const groupeNeuf = { id: 'ge-neuf', nom: 'Saison', ordre: 2, modifieLe: MAINTENANT };
const etiquetteNeuve = { id: 'et-neuve', groupeId: 'ge-climat', nom: 'Chaud', ordre: 1, modifieLe: MAINTENANT };

test('un groupe neuf puis renommé est relu, avec son rang de création', async () => {
  const stockage = await stockageInstalle();
  await stockage.enregistrerGroupe(groupeNeuf);
  assert.deepEqual((await stockage.lireBibliotheque()).groupes[2], groupeNeuf);
  await stockage.enregistrerGroupe({ ...groupeNeuf, nom: 'Saisons', ordre: 9, modifieLe: 'plus tard' });
  const { groupes } = await stockage.lireBibliotheque();
  assert.equal(groupes.length, 3);
  assert.deepEqual(groupes[2], { ...groupeNeuf, nom: 'Saisons', modifieLe: 'plus tard' });
});

test('une étiquette neuve puis renommée garde son groupe et son rang ; un groupe inconnu est refusé', async () => {
  const stockage = await stockageInstalle();
  await stockage.enregistrerEtiquette(etiquetteNeuve);
  await stockage.enregistrerEtiquette({
    ...etiquetteNeuve,
    nom: 'Canicule',
    groupeId: 'ge-activites',
    ordre: 9,
    modifieLe: 'plus tard',
  });
  const { etiquettes } = await stockage.lireBibliotheque();
  assert.equal(etiquettes.length, 3);
  assert.deepEqual(etiquettes[2], { ...etiquetteNeuve, nom: 'Canicule', modifieLe: 'plus tard' });
  await assert.rejects(stockage.enregistrerEtiquette({ ...etiquetteNeuve, id: 'et-x', groupeId: 'ge-inconnu' }));
  assert.equal((await stockage.lireBibliotheque()).etiquettes.length, 3);
});

test('ranger les groupes et les étiquettes suit l’ordre donné et refuse une liste inexacte', async () => {
  const stockage = await stockageInstalle();
  await stockage.enregistrerEtiquette({ ...etiquetteNeuve, id: 'et-b', groupeId: 'ge-activites', ordre: 1 });
  await stockage.rangerGroupes(['ge-climat', 'ge-activites'], MAINTENANT);
  await stockage.rangerEtiquettes('ge-activites', ['et-b', 'et-camping'], MAINTENANT);
  const { groupes, etiquettes } = await stockage.lireBibliotheque();
  assert.deepEqual(
    groupes.map(g => [g.id, g.ordre, g.modifieLe]),
    [
      ['ge-climat', 0, MAINTENANT],
      ['ge-activites', 1, MAINTENANT],
    ],
  );
  const activites = etiquettes.filter(e => e.groupeId === 'ge-activites');
  assert.deepEqual(
    activites.map(e => [e.id, e.ordre]),
    [
      ['et-b', 0],
      ['et-camping', 1],
    ],
  );
  assert.equal(etiquettes.find(e => e.id === 'et-froid').ordre, 0);
  const avant = await stockage.lireBibliotheque();
  for (const ids of [['ge-climat'], ['ge-climat', 'ge-inconnu'], ['ge-climat', 'ge-climat']]) {
    await assert.rejects(stockage.rangerGroupes(ids, 'x'));
  }
  for (const ids of [[], ['et-b', 'et-inconnue'], ['et-b', 'et-b'], ['et-b', 'et-froid']]) {
    await assert.rejects(stockage.rangerEtiquettes('ge-activites', ids, 'x'));
  }
  await assert.rejects(stockage.rangerEtiquettes('ge-inconnu', [], 'x'));
  assert.deepEqual(await stockage.lireBibliotheque(), avant);
});

test('supprimer une étiquette la retire des modèles sans les modifier', async () => {
  const stockage = await stockageInstalle();
  await stockage.supprimerEtiquette('et-camping');
  const { etiquettes, categories } = await stockage.lireBibliotheque();
  assert.deepEqual(
    etiquettes.map(e => e.id),
    ['et-froid'],
  );
  const papiers = categories.find(c => c.id === 'cm-papiers');
  assert.deepEqual(papiers, { ...contrat.bibliotheque.categories[1], etiquettes: [] });
});

test('supprimer un groupe supprime ses étiquettes et les retire des modèles ; un inconnu est refusé', async () => {
  const stockage = await stockageInstalle();
  await assert.rejects(stockage.supprimerGroupe('ge-inconnu'));
  await assert.rejects(stockage.supprimerEtiquette('et-inconnue'));
  assert.deepEqual(await stockage.lireBibliotheque(), contrat.bibliotheque);
  await stockage.supprimerGroupe('ge-climat');
  const { groupes, etiquettes, objets, categories } = await stockage.lireBibliotheque();
  assert.deepEqual(
    groupes.map(g => g.id),
    ['ge-activites'],
  );
  assert.deepEqual(
    etiquettes.map(e => e.id),
    ['et-camping'],
  );
  assert.deepEqual(objets.find(o => o.id === 'om-tshirts').etiquettes, []);
  assert.deepEqual(categories.find(c => c.id === 'cm-papiers').etiquettes, ['et-camping']);
});

test('une panne simulée fait échouer chaque écriture des étiquettes sans rien écrire', async () => {
  const stockage = await stockageInstalle();
  const donnees = JSON.parse(localStorage.getItem('baluchon-essai'));
  const pannes = [
    'enregistrerGroupe',
    'enregistrerEtiquette',
    'rangerGroupes',
    'rangerEtiquettes',
    'supprimerEtiquette',
  ];
  localStorage.setItem('baluchon-essai', JSON.stringify({ ...donnees, pannes: [...pannes, 'supprimerGroupe'] }));
  await assert.rejects(stockage.enregistrerGroupe(groupeNeuf), /Panne/);
  await assert.rejects(stockage.enregistrerEtiquette(etiquetteNeuve), /Panne/);
  await assert.rejects(stockage.rangerGroupes(['ge-climat', 'ge-activites'], 'x'), /Panne/);
  await assert.rejects(stockage.rangerEtiquettes('ge-activites', ['et-camping'], 'x'), /Panne/);
  await assert.rejects(stockage.supprimerEtiquette('et-camping'), /Panne/);
  await assert.rejects(stockage.supprimerGroupe('ge-climat'), /Panne/);
  assert.deepEqual(await stockage.lireBibliotheque(), contrat.bibliotheque);
  // Témoin : sans la panne, le groupe et ses étiquettes partent bien.
  localStorage.setItem('baluchon-essai', JSON.stringify({ ...donnees, pannes: [] }));
  await stockage.supprimerGroupe('ge-climat');
  const { groupes, etiquettes } = await stockage.lireBibliotheque();
  assert.equal(groupes.length, 1);
  assert.equal(etiquettes.length, 1);
});

// Suppressions de la bibliothèque et rétablissement (mêmes cas que src-tauri/src/suppressions.rs).
const extraitVide = { groupes: [], etiquettes: [], categories: [], objets: [] };
const biblio = contrat.bibliotheque;

test('supprimer une catégorie supprime ses objets ; les autres gardent leur rang', async () => {
  const stockage = await stockageInstalle();
  await stockage.supprimerCategorie('cm-vetements');
  const apres = await stockage.lireBibliotheque();
  assert.deepEqual(apres.categories, [biblio.categories[1]]);
  assert.deepEqual(apres.objets, [biblio.objets[1]]);
  assert.deepEqual(apres.etiquettes, biblio.etiquettes);
});

test('supprimer un objet ne touche que lui', async () => {
  const stockage = await stockageInstalle();
  await stockage.supprimerObjet('om-tshirts');
  const apres = await stockage.lireBibliotheque();
  assert.deepEqual(apres.objets, [biblio.objets[1]]);
  assert.deepEqual(apres.categories, biblio.categories);
});

test('supprimer une catégorie ou un objet inconnu est refusé sans rien changer', async () => {
  const stockage = await stockageInstalle();
  await assert.rejects(stockage.supprimerCategorie('cm-inconnue'));
  await assert.rejects(stockage.supprimerObjet('om-inconnu'));
  assert.deepEqual(await stockage.lireBibliotheque(), biblio);
});

test('rétablir une catégorie et ses objets rend la bibliothèque identique', async () => {
  const stockage = await stockageInstalle();
  await stockage.supprimerCategorie('cm-vetements');
  await stockage.retablirBibliotheque({
    ...extraitVide,
    categories: [biblio.categories[0]],
    objets: [biblio.objets[0]],
  });
  assert.deepEqual(await stockage.lireBibliotheque(), biblio);
});

test('rétablir une étiquette rend ses liens dans leur ordre', async () => {
  const stockage = await stockageInstalle();
  const lie = { ...biblio.objets[0], etiquettes: ['et-camping', 'et-froid'] };
  await stockage.enregistrerObjet(lie);
  const avant = await stockage.lireBibliotheque();
  await stockage.supprimerEtiquette('et-camping');
  assert.deepEqual((await stockage.lireBibliotheque()).objets[0].etiquettes, ['et-froid']);
  await stockage.retablirBibliotheque({
    ...extraitVide,
    etiquettes: [avant.etiquettes[0]],
    objets: [avant.objets[0]],
    categories: [avant.categories[1]],
  });
  // Deux groupes peuvent partager le rang 0 : leur ordre dans la liste plate dépend de l'écriture
  // (comme dans la base), l'écran les range par groupe. On compare donc par id.
  const parId = b => ({ ...b, etiquettes: [...b.etiquettes].sort((x, y) => x.id.localeCompare(y.id)) });
  assert.deepEqual(parId(await stockage.lireBibliotheque()), parId(avant));
});

test('rétablir un groupe rend ses étiquettes et leurs liens', async () => {
  const stockage = await stockageInstalle();
  await stockage.supprimerGroupe('ge-climat');
  await stockage.retablirBibliotheque({
    ...extraitVide,
    groupes: [biblio.groupes[1]],
    etiquettes: [biblio.etiquettes[1]],
    objets: [biblio.objets[0]],
  });
  assert.deepEqual(await stockage.lireBibliotheque(), biblio);
});

test('rétablir refuse un lien vers une étiquette absente ou un objet sans catégorie, sans rien écrire', async () => {
  const stockage = await stockageInstalle();
  await stockage.supprimerCategorie('cm-papiers');
  const avant = await stockage.lireBibliotheque();
  const categorie = { ...biblio.categories[1], etiquettes: ['et-absente'] };
  await assert.rejects(stockage.retablirBibliotheque({ ...extraitVide, categories: [categorie] }));
  await assert.rejects(stockage.retablirBibliotheque({ ...extraitVide, objets: [biblio.objets[1]] }));
  assert.deepEqual(await stockage.lireBibliotheque(), avant);
});

test('une panne simulée de supprimerCategorie ne change rien, ni celles de supprimerObjet et retablirBibliotheque', async () => {
  const stockage = await stockageInstalle();
  const donnees = JSON.parse(localStorage.getItem('baluchon-essai'));
  const pannes = ['supprimerCategorie', 'supprimerObjet', 'retablirBibliotheque'];
  localStorage.setItem('baluchon-essai', JSON.stringify({ ...donnees, pannes }));
  await assert.rejects(stockage.supprimerCategorie('cm-vetements'), /Panne/);
  await assert.rejects(stockage.supprimerObjet('om-tshirts'), /Panne/);
  await assert.rejects(stockage.retablirBibliotheque(extraitVide), /Panne/);
  assert.deepEqual(await stockage.lireBibliotheque(), biblio);
  // Témoin : sans la panne, la catégorie part bien.
  localStorage.setItem('baluchon-essai', JSON.stringify({ ...donnees, pannes: [] }));
  await stockage.supprimerCategorie('cm-vetements');
  assert.equal((await stockage.lireBibliotheque()).categories.length, 1);
});
