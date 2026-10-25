// La touche retour d'Android passe par la page (essai sur la tablette du 2026-10-25, Ruling R8) :
// tant que l'appli a une étape derrière elle — un écran ouvert depuis l'accueil (profondeur, tenue
// par src/main.js) ou un niveau ouvert par-dessus (niveau, tenu par src/ecrans/fenetre.js) —, la
// touche recule d'une étape dans l'appli ; à l'accueil, rien d'ouvert, elle ferme l'appli.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { retourDansLAppli } from '../src/ecrans/retour-systeme.js';

test('à l’accueil, rien d’ouvert : la touche ferme l’appli', () => {
  assert.equal(retourDansLAppli({ profondeur: 0 }), false);
  assert.equal(retourDansLAppli({ profondeur: 0, niveau: 0 }), false);
});

test('à l’accueil, une fenêtre ouverte : la touche la ferme, l’appli reste', () => {
  assert.equal(retourDansLAppli({ profondeur: 0, niveau: 1 }), true);
});

test('un écran ouvert depuis l’accueil : la touche y ramène', () => {
  assert.equal(retourDansLAppli({ profondeur: 1 }), true);
});

test('l’assistant, sa garde et une question par-dessus : la touche reste dans l’appli', () => {
  assert.equal(retourDansLAppli({ profondeur: 1, niveau: 1 }), true);
  assert.equal(retourDansLAppli({ profondeur: 1, niveau: 2 }), true);
});

test('avant le premier écran (aucun état noté) : la touche ferme l’appli', () => {
  assert.equal(retourDansLAppli(null), false);
  assert.equal(retourDansLAppli(undefined), false);
});
