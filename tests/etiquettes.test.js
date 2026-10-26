// Groupes et étiquettes : noms uniques, préparation des objets écrits en base (spec de la phase 6).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  homonymeDEtiquette,
  homonymeDeGroupe,
  preparerEtiquette,
  preparerGroupe,
  validerEtiquette,
  validerGroupe,
} from '../src/modele/etiquettes.js';

const langue = 'fr';
const groupes = [
  { id: 'g-act', nom: 'Activités', ordre: 0, modifieLe: 'x' },
  { id: 'g-cli', nom: 'Climat', ordre: 1, modifieLe: 'x' },
];
const et = (id, groupeId, nom, ordre) => ({ id, groupeId, nom, ordre, modifieLe: 'x' });
const bibliotheque = {
  groupes,
  etiquettes: [
    et('e-ran', 'g-act', 'Randonnée', 0),
    et('e-cam', 'g-act', 'Camping', 1),
    et('e-pla', 'g-act', 'Plage', 2),
    et('e-cha', 'g-cli', 'Chaud', 0),
    et('e-fro', 'g-cli', 'Froid', 1),
    et('e-plu', 'g-cli', 'Pluie', 2),
    et('e-ete', 'g-cli', 'Été', 3),
  ],
  categories: [],
  objets: [],
};
const contexte = { nouvelId: () => 'nouveau', maintenant: '2026-10-26T10:00:00.000Z', langue };
const ici = (nom, extra) => validerEtiquette({ nom }, { bibliotheque, langue, ...extra });

test('étiquette : nom manquant', () => {
  assert.deepEqual(ici('', { groupeId: 'g-cli' }), { nom: 'nomManquant' });
  assert.deepEqual(ici('  ', { groupeId: 'g-cli' }), { nom: 'nomManquant' });
});

test('étiquette : un homonyme d’un autre groupe est « pris », du même groupe « pris ici »', () => {
  assert.deepEqual(ici(' plage ', { groupeId: 'g-cli' }), { nom: 'nomPris' });
  assert.deepEqual(ici('PLAGE', { groupeId: 'g-act' }), { nom: 'nomPrisIci' });
  const trouve = homonymeDEtiquette(bibliotheque, ' plage ', { langue });
  assert.equal(trouve.etiquette.id, 'e-pla');
  assert.equal(trouve.groupe.id, 'g-act');
  assert.equal(homonymeDEtiquette(bibliotheque, 'Neige', { langue }), null);
});

test('étiquette : un élément renommé ne se compare pas à lui-même', () => {
  const existante = bibliotheque.etiquettes[2];
  assert.deepEqual(ici('plage', { existante, groupeId: 'g-act' }), {});
  assert.deepEqual(ici('camping', { existante, groupeId: 'g-act' }), { nom: 'nomPrisIci' });
});

test('étiquette : les accents comptent, le nom d’un groupe est permis', () => {
  assert.deepEqual(ici('Ete', { groupeId: 'g-cli' }), {});
  assert.deepEqual(ici('Climat', { groupeId: 'g-act' }), {});
});

test('groupe : unique sans tenir compte des majuscules, pas comparé à lui-même ni aux étiquettes', () => {
  const valider = (nom, existant) => validerGroupe({ nom }, { groupes, existant, langue });
  assert.deepEqual(valider('climat'), { nom: 'nomPris' });
  assert.deepEqual(valider('Climat', groupes[1]), {});
  assert.deepEqual(valider('Plage'), {});
  assert.deepEqual(valider(' '), { nom: 'nomManquant' });
  assert.equal(homonymeDeGroupe(groupes, ' CLIMAT', { langue }).id, 'g-cli');
  assert.equal(homonymeDeGroupe(groupes, 'Climat', { exclu: 'g-cli', langue }), null);
});

test('preparerEtiquette : nom nettoyé, rang en fin de groupe', () => {
  const neuve = preparerEtiquette({ nom: '  Neige  ' }, { groupeId: 'g-cli', bibliotheque, ...contexte });
  assert.deepEqual(neuve, {
    id: 'nouveau',
    groupeId: 'g-cli',
    nom: 'Neige',
    ordre: 4,
    modifieLe: contexte.maintenant,
  });
  const vide = preparerEtiquette({ nom: 'A' }, { groupeId: 'g-vide', bibliotheque, ...contexte });
  assert.equal(vide.ordre, 0);
});

test('preparerEtiquette : une existante garde id, ordre et groupe', () => {
  const existante = bibliotheque.etiquettes[1];
  const rendue = preparerEtiquette({ nom: ' Bivouac ' }, { existante, groupeId: 'autre', bibliotheque, ...contexte });
  assert.deepEqual(rendue, { ...existante, nom: 'Bivouac', modifieLe: contexte.maintenant });
});

test('preparerEtiquette : une saisie invalide lève, avec ses erreurs', () => {
  assert.throws(
    () => preparerEtiquette({ nom: 'plage' }, { groupeId: 'g-cli', bibliotheque, ...contexte }),
    e => e.erreurs.nom === 'nomPris',
  );
});

test('preparerGroupe : en fin de liste, 0 si aucune', () => {
  assert.equal(preparerGroupe({ nom: ' Santé ' }, { groupes, ...contexte }).ordre, 2);
  assert.equal(preparerGroupe({ nom: 'Santé' }, { groupes, ...contexte }).nom, 'Santé');
  assert.equal(preparerGroupe({ nom: 'Santé' }, { groupes: [], ...contexte }).ordre, 0);
  const rendu = preparerGroupe({ nom: 'Météo' }, { existant: groupes[1], groupes, ...contexte });
  assert.deepEqual(rendu, { ...groupes[1], nom: 'Météo', modifieLe: contexte.maintenant });
  assert.throws(
    () => preparerGroupe({ nom: 'climat' }, { groupes, ...contexte }),
    e => e.erreurs.nom === 'nomPris',
  );
});
