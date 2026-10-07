// La mini-bibliothèque de départ (spec phase 2) : décrite dans fr.json, installée une fois.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fr from '../src/i18n/fr.json' with { type: 'json' };
import { construireBibliotheque } from '../src/modele/bibliotheque.js';
import { nouvelId } from '../src/modele/identifiant.js';
import { genererVoyage } from '../src/modele/voyage.js';

const MAINTENANT = '2026-10-06T08:00:00.000Z';
const construire = () => construireBibliotheque(fr.bibliothequeDeDepart, { nouvelId, maintenant: MAINTENANT });

test("quatre catégories dans l’ordre prévu, toutes toujours incluses", () => {
  const { categories } = construire();
  assert.deepEqual(
    categories.map(c => [c.nom, c.icone, c.couleur, c.ordre, c.toujoursIncluse]),
    [
      ['Vêtements', 't-shirt', 'ciel', 0, true],
      ['Toilette', 'tooth', 'lagon', 1, true],
      ['Alimentation', 'fork-knife', 'pomme', 2, true],
      ['Papiers', 'identification-card', 'tournesol', 3, true],
    ],
  );
  assert.ok(categories.every(c => c.modifieLe === MAINTENANT));
});

test('neuf objets rattachés à leur catégorie, avec leurs règles', () => {
  const { categories, objets } = construire();
  const nomDe = id => categories.find(c => c.id === id).nom;
  assert.deepEqual(
    objets.map(o => [nomDe(o.categorieId), o.nom, o.regle, o.valeur, o.plafond, o.parPersonne, o.consommable]),
    [
      ['Vêtements', 'T-shirts', 'par_jour', 1, 5, true, false],
      ['Vêtements', 'Sous-vêtements', 'par_jour', 1, null, true, false],
      ['Vêtements', 'Pyjama', 'par_nuit', 1, 1, true, false],
      ['Toilette', 'Brosse à dents', 'fixe', 1, null, true, false],
      ['Toilette', 'Dentifrice', 'fixe', 1, null, false, false],
      ['Alimentation', 'Repas', 'par_jour', 2, null, true, true],
      ['Alimentation', 'Gourde', 'fixe', 1, null, true, false],
      ['Papiers', "Pièce d’identité", 'fixe', 1, null, true, false],
      ['Papiers', 'Chargeur de téléphone', 'fixe', 1, null, false, false],
    ],
  );
  assert.ok(objets.every(o => o.toujoursInclus && o.note === '' && o.modifieLe === MAINTENANT));
  const ids = [...categories, ...objets].map(x => x.id);
  assert.equal(new Set(ids).size, ids.length);
});

test('avec la vraie bibliothèque, du 10 au 13 à deux : Repas 16, T-shirts 8, Pyjama 2, Dentifrice 1', () => {
  const contenu = genererVoyage(
    construire(),
    { nom: 'Vercors', destination: '', depart: '2026-10-10', retour: '2026-10-13', voyageurs: 2 },
    { nouvelId, maintenant: MAINTENANT },
  );
  const q = Object.fromEntries(contenu.objets.map(o => [o.nom, o.quantite]));
  assert.equal(q.Repas, 16);
  assert.equal(q['T-shirts'], 8);
  assert.equal(q.Pyjama, 2);
  assert.equal(q.Dentifrice, 1);
  assert.equal(contenu.objets.length, 9);
});
