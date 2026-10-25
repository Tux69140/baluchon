// La mini-bibliothèque de départ (spec phase 2) : décrite dans fr.json, installée une fois.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fr from '../src/i18n/fr.json' with { type: 'json' };
import { construireBibliotheque } from '../src/modele/bibliotheque.js';
import { nouvelId } from '../src/modele/identifiant.js';
import { genererVoyage } from '../src/modele/voyage.js';

const MAINTENANT = '2026-10-06T08:00:00.000Z';
const construire = () => construireBibliotheque(fr.bibliothequeDeDepart, { nouvelId, maintenant: MAINTENANT });

test('trois groupes d’étiquettes, rangés et nommés comme prévu', () => {
  const { groupes, etiquettes } = construire();
  assert.deepEqual(
    groupes.map(g => [g.nom, g.ordre, etiquettes.filter(e => e.groupeId === g.id).map(e => [e.nom, e.ordre])]),
    [
      [
        'Activités',
        0,
        [
          ['Randonnée', 0],
          ['Camping', 1],
          ['Plage', 2],
        ],
      ],
      [
        'Climat',
        1,
        [
          ['Chaud', 0],
          ['Froid', 1],
          ['Pluie', 2],
        ],
      ],
      [
        'Hébergement',
        2,
        [
          ['Hôtel', 0],
          ['Tente', 1],
          ['Chez l’habitant', 2],
        ],
      ],
    ],
  );
  assert.ok([...groupes, ...etiquettes].every(x => x.modifieLe === MAINTENANT));
});

test('cinq catégories dans l’ordre prévu ; seule Camping dépend d’étiquettes', () => {
  const { categories, etiquettes } = construire();
  const nomDe = id => etiquettes.find(e => e.id === id).nom;
  assert.deepEqual(
    categories.map(c => [c.nom, c.icone, c.couleur, c.ordre, c.toujoursIncluse, c.etiquettes.map(nomDe)]),
    [
      ['Vêtements', 't-shirt', 'ciel', 0, true, []],
      ['Toilette', 'tooth', 'lagon', 1, true, []],
      ['Alimentation', 'fork-knife', 'pomme', 2, true, []],
      ['Papiers', 'identification-card', 'tournesol', 3, true, []],
      ['Camping', 'tent', 'abricot', 4, false, ['Camping', 'Tente']],
    ],
  );
  assert.ok(categories.every(c => c.modifieLe === MAINTENANT));
});

test('dix-sept objets rattachés à leur catégorie, avec leurs règles et leurs étiquettes', () => {
  const bib = construire();
  const { categories, etiquettes, objets } = bib;
  const nomDe = id => categories.find(c => c.id === id).nom;
  const etiqDe = id => etiquettes.find(e => e.id === id).nom;
  assert.deepEqual(
    objets.map(o => [
      nomDe(o.categorieId),
      o.nom,
      o.regle,
      o.valeur,
      o.plafond,
      o.parPersonne,
      o.consommable,
      o.etiquettes.map(etiqDe),
    ]),
    [
      ['Vêtements', 'T-shirts', 'par_jour', 1, 5, true, false, []],
      ['Vêtements', 'Sous-vêtements', 'par_jour', 1, null, true, false, []],
      ['Vêtements', 'Pyjama', 'par_nuit', 1, 1, true, false, []],
      ['Vêtements', 'Maillot de bain', 'fixe', 1, null, true, false, ['Plage']],
      ['Vêtements', 'Doudoune', 'fixe', 1, null, true, false, ['Froid']],
      ['Vêtements', 'Bonnet', 'fixe', 1, null, true, false, ['Froid']],
      ['Vêtements', 'Cape de pluie', 'fixe', 1, null, true, false, ['Pluie']],
      ['Toilette', 'Brosse à dents', 'fixe', 1, null, true, false, []],
      ['Toilette', 'Dentifrice', 'fixe', 1, null, false, false, []],
      ['Toilette', 'Crème solaire', 'fixe', 1, null, false, false, ['Plage', 'Chaud']],
      ['Alimentation', 'Repas', 'par_jour', 2, null, true, true, []],
      ['Alimentation', 'Gourde', 'fixe', 1, null, true, false, []],
      ['Papiers', 'Pièce d’identité', 'fixe', 1, null, true, false, []],
      ['Papiers', 'Chargeur de téléphone', 'fixe', 1, null, false, false, []],
      ['Camping', 'Lampe frontale', 'fixe', 1, null, true, false, []],
      ['Camping', 'Sac de couchage', 'fixe', 1, null, true, false, []],
      ['Camping', 'Réchaud', 'fixe', 1, null, false, false, []],
    ],
  );
  // « Toujours inclus » = aucune étiquette ; le reste dépend des siennes.
  assert.ok(objets.every(o => o.toujoursInclus === (o.etiquettes.length === 0)));
  assert.ok(objets.every(o => typeof o.note === 'string' && o.modifieLe === MAINTENANT));
  // Trois objets partent avec une note rédigée ; les autres n'en ont pas.
  assert.deepEqual(
    objets.filter(o => o.note !== '').map(o => o.nom),
    ['Repas', 'Pièce d’identité', 'Chargeur de téléphone'],
  );
  const ids = [...bib.groupes, ...bib.etiquettes, ...categories, ...objets].map(x => x.id);
  assert.equal(new Set(ids).size, ids.length);
});

test('sans étiquette choisie, du 10 au 13 à deux : Repas 16, T-shirts 8, Pyjama 2, Dentifrice 1', () => {
  const contenu = genererVoyage(
    construire(),
    { nom: 'Vercors', destination: '', depart: '2026-10-10', retour: '2026-10-13', voyageurs: 2 },
    { choisies: new Set(), ecartes: new Set() },
    { nouvelId, maintenant: MAINTENANT },
  );
  const q = Object.fromEntries(contenu.objets.map(o => [o.nom, o.quantite]));
  assert.equal(q.Repas, 16);
  assert.equal(q['T-shirts'], 8);
  assert.equal(q.Pyjama, 2);
  assert.equal(q.Dentifrice, 1);
  assert.equal(contenu.objets.length, 9);
  assert.deepEqual(contenu.etiquettes, []);
});
