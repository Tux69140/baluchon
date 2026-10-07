// La forme des données échangées entre le modèle et la base : tests/contrat/stockage.json est relu
// tel quel par les tests de la base (src-tauri/src/essais.rs). Ce que fabrique le modèle doit avoir
// exactement les mêmes champs, sinon la base le refuserait sur l'appareil.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import contrat from './contrat/stockage.json' with { type: 'json' };
import fr from '../src/i18n/fr.json' with { type: 'json' };
import { construireBibliotheque } from '../src/modele/bibliotheque.js';
import { nouvelId } from '../src/modele/identifiant.js';
import { genererVoyage } from '../src/modele/voyage.js';

const champs = objet => Object.keys(objet).sort();
const bibliotheque = construireBibliotheque(fr.bibliothequeDeDepart, { nouvelId, maintenant: 'x' });

test('la bibliothèque construite a les champs attendus par la base', () => {
  assert.deepEqual(champs(bibliotheque), champs(contrat.bibliotheque));
  for (const c of bibliotheque.categories) assert.deepEqual(champs(c), champs(contrat.bibliotheque.categories[0]));
  for (const o of bibliotheque.objets) assert.deepEqual(champs(o), champs(contrat.bibliotheque.objets[0]));
});

test('le voyage généré a les champs attendus par la base', () => {
  const contenu = genererVoyage(
    bibliotheque,
    { nom: 'Vercors', destination: '', depart: '2026-10-10', retour: '2026-10-13', voyageurs: 2 },
    { nouvelId, maintenant: 'x' },
  );
  assert.deepEqual(champs(contenu), champs(contrat.voyage));
  assert.deepEqual(champs(contenu.voyage), champs(contrat.voyage.voyage));
  for (const c of contenu.categories) assert.deepEqual(champs(c), champs(contrat.voyage.categories[0]));
  for (const o of contenu.objets) assert.deepEqual(champs(o), champs(contrat.voyage.objets[0]));
});
