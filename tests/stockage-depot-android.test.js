// Le dépôt d'un fichier par le passage Android (window.BaluchonAndroid.deposer) : la réponse arrive plus
// tard par window.baluchonDepose, y compris après la demande d'autorisation (src/stockage/tauri.js).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { deposerDansTelechargements } from '../src/stockage/tauri.js';

function fenetreAndroid() {
  const appels = [];
  return { appels, BaluchonAndroid: { deposer: (...args) => appels.push(args) } };
}

test('la promesse attend la réponse de l’activité, numéro par numéro', async () => {
  const fenetre = fenetreAndroid();
  const premier = deposerDansTelechargements('a.json', 'un', fenetre);
  const second = deposerDansTelechargements('b.json', 'deux', fenetre);
  assert.deepEqual(fenetre.appels, [
    ['1', 'a.json', 'un'],
    ['2', 'b.json', 'deux'],
  ]);
  // Les réponses arrivent dans le désordre.
  fenetre.baluchonDepose('2', 'existe');
  fenetre.baluchonDepose('1', 'depose');
  assert.equal(await premier, 'depose');
  assert.equal(await second, 'existe');
});

test('un refus d’autorisation se rend tel quel, une autre panne rejette', async () => {
  const fenetre = fenetreAndroid();
  const refus = deposerDansTelechargements('a.json', 'un', fenetre);
  fenetre.baluchonDepose(fenetre.appels[0][0], 'refuse');
  assert.equal(await refus, 'refuse');
  const panne = deposerDansTelechargements('a.json', 'un', fenetre);
  fenetre.baluchonDepose(fenetre.appels[1][0], 'erreur:disque plein');
  await assert.rejects(panne, /disque plein/);
});

test('un passage qui plante rejette la promesse', async () => {
  const fenetre = {
    BaluchonAndroid: {
      deposer: () => {
        throw new Error('passage fermé');
      },
    },
  };
  await assert.rejects(deposerDansTelechargements('a.json', 'un', fenetre), /passage fermé/);
});
