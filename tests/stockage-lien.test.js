// Ouvrir une adresse du site dans le navigateur du système (écran « À propos ») : par l'activité sous
// Android (window.BaluchonAndroid.ouvrirLien), par la commande de l'appli sur l'ordinateur
// (src/stockage/tauri.js) ; dans un navigateur (tests d'écran), par window.open.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ouvrirLienTauri } from '../src/stockage/tauri.js';
import { creerStockageNavigateur } from '../src/stockage/navigateur.js';

const ADRESSE = 'https://baluchon.biovibralyon.fr/telecharger';

test('sous Android, l’activité ouvre l’adresse', async () => {
  const appels = [];
  const fenetre = { BaluchonAndroid: { ouvrirLien: adresse => appels.push(adresse) } };
  await ouvrirLienTauri(ADRESSE, fenetre);
  assert.deepEqual(appels, [ADRESSE]);
});

test('dans un navigateur, window.open ouvre l’adresse sans lien avec la page', async () => {
  const appels = [];
  globalThis.window = { open: (...args) => appels.push(args) };
  try {
    await creerStockageNavigateur().ouvrirLien(ADRESSE);
  } finally {
    delete globalThis.window;
  }
  assert.deepEqual(appels, [[ADRESSE, '_blank', 'noopener']]);
});
