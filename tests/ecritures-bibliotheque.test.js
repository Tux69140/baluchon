// La liste des écritures de la bibliothèque (src/stockage/index.js), que surveille le bandeau
// « Annuler » (src/ecrans/annulation.js) : chacune rend la suppression précédente définitive. Une
// écriture ajoutée plus tard au stockage et oubliée dans la liste laisserait « Annuler » réécrire
// par-dessus elle (constat M4 de la relecture finale de la phase 7) : chaque fonction des deux
// stockages doit être rangée, ici ou dans la liste.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ECRITURES_BIBLIOTHEQUE } from '../src/stockage/index.js';
import { creerStockageNavigateur } from '../src/stockage/navigateur.js';
import { creerStockageTauri } from '../src/stockage/tauri.js';

// Tout le reste, avec sa raison.
const AUTRES = [
  // Les lectures.
  'listerVoyages',
  'bibliothequeInstallee',
  'lireBibliotheque',
  'lireVoyage',
  'etatsDesObjets',
  'lireFiltre',
  // Les écritures d'un voyage ou d'une préférence : elles ne touchent pas la bibliothèque.
  'creerVoyage',
  'reglerDansLeSac',
  'ajouterAuVoyage',
  'retablirDansLeVoyage',
  'reglerQuantite',
  'renommerObjetDuVoyage',
  'retirerDuVoyage',
  'ecrireFiltre',
  // L'installation n'a lieu qu'au premier lancement, avant toute suppression ; le rétablissement est
  // « Annuler » lui-même.
  'installerBibliotheque',
  'retablirBibliotheque',
];

const fonctions = stockage => Object.keys(stockage).sort();

test('chaque fonction du stockage est une écriture de la bibliothèque surveillée, ou rangée ailleurs', () => {
  const rangees = [...ECRITURES_BIBLIOTHEQUE, ...AUTRES].sort();
  assert.equal(new Set(rangees).size, rangees.length, 'une fonction rangée deux fois');
  assert.deepEqual(fonctions(creerStockageNavigateur()), rangees);
  assert.deepEqual(fonctions(creerStockageTauri()), rangees);
});
