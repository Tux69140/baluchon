// La forme des données échangées entre le modèle et la base : tests/contrat/stockage.json est relu
// tel quel par les tests de la base (src-tauri/src/essais.rs). Ce que fabrique le modèle doit avoir
// exactement les mêmes champs, sinon la base le refuserait sur l'appareil.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import contrat from './contrat/stockage.json' with { type: 'json' };
import fr from '../src/i18n/fr.json' with { type: 'json' };
import { construireBibliotheque } from '../src/modele/bibliotheque.js';
import { nouvelId } from '../src/modele/identifiant.js';
import { appliquerChangements, calculerChangements } from '../src/modele/changements.js';
import { genererVoyage } from '../src/modele/voyage.js';

const champs = objet => Object.keys(objet).sort();
const bibliotheque = construireBibliotheque(fr.bibliothequeDeDepart, { nouvelId, maintenant: 'x' });

test('la bibliothèque construite a les champs attendus par la base', () => {
  assert.deepEqual(champs(bibliotheque), champs(contrat.bibliotheque));
  for (const g of bibliotheque.groupes) assert.deepEqual(champs(g), champs(contrat.bibliotheque.groupes[0]));
  for (const e of bibliotheque.etiquettes) assert.deepEqual(champs(e), champs(contrat.bibliotheque.etiquettes[0]));
  for (const c of bibliotheque.categories) assert.deepEqual(champs(c), champs(contrat.bibliotheque.categories[0]));
  for (const o of bibliotheque.objets) assert.deepEqual(champs(o), champs(contrat.bibliotheque.objets[0]));
});

test('le voyage généré a les champs attendus par la base', () => {
  const contenu = genererVoyage(
    bibliotheque,
    { nom: 'Vercors', destination: '', depart: '2026-10-10', retour: '2026-10-13', voyageurs: 2 },
    { choisies: new Set([bibliotheque.etiquettes[0].id]), ecartes: new Set() },
    { nouvelId, maintenant: 'x' },
  );
  assert.deepEqual(champs(contenu), champs(contrat.voyage));
  assert.deepEqual(champs(contenu.voyage), champs(contrat.voyage.voyage));
  assert.equal(contenu.etiquettes.length, 1);
  for (const e of contenu.etiquettes) assert.deepEqual(champs(e), champs(contrat.voyage.etiquettes[0]));
  for (const c of contenu.categories) assert.deepEqual(champs(c), champs(contrat.voyage.categories[0]));
  for (const o of contenu.objets) assert.deepEqual(champs(o), champs(contrat.voyage.objets[0]));
});

test('la modification calculée par le modèle a les champs attendus par la base', () => {
  const contenu = genererVoyage(
    bibliotheque,
    { nom: 'Vercors', destination: '', depart: '2026-10-10', retour: '2026-10-13', voyageurs: 2 },
    { choisies: new Set(), ecartes: new Set() },
    { nouvelId, maintenant: 'x' },
  );
  const entree = {
    contenu,
    bibliotheque,
    infos: { nom: 'Vercors', destination: '', depart: '2026-10-10', retour: '2026-10-13', voyageurs: 3 },
    choisies: new Set(),
  };
  const changements = calculerChangements(entree);
  const acceptes = new Set(changements.flatMap(c => c.lignes).map(l => l.cle));
  assert.ok(acceptes.size > 0);
  const { modification } = appliquerChangements({ ...entree, changements, acceptes }, { nouvelId, maintenant: 'x' });
  assert.deepEqual(champs(modification), champs(contrat.modification));
  assert.deepEqual(champs(modification.voyage), champs(contrat.modification.voyage));
  assert.ok(modification.objetsModifies.length > 0);
  for (const o of modification.objetsModifies)
    assert.deepEqual(champs(o), champs(contrat.modification.objetsModifies[0]));
});
