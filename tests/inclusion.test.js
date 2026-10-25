// L'inclusion par étiquettes et l'aperçu (docs/PRD.md, « Inclusion »).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { estInclus, etiquettesChoisies, genererApercu, groupesAvecEtiquettes } from '../src/modele/inclusion.js';

const categorie = (id, nom, ordre, etiquettes = []) => ({
  id,
  nom,
  icone: 'package',
  couleur: 'ciel',
  ordre,
  toujoursIncluse: etiquettes.length === 0,
  modifieLe: 'x',
  etiquettes,
});
const objet = (id, categorieId, nom, regle, valeur, etiquettes = [], autres = {}) => ({
  id,
  categorieId,
  nom,
  regle,
  valeur,
  plafond: null,
  parPersonne: false,
  consommable: false,
  toujoursInclus: etiquettes.length === 0,
  note: '',
  modifieLe: 'x',
  etiquettes,
  ...autres,
});
const groupe = (id, nom, ordre) => ({ id, nom, ordre, modifieLe: 'x' });
const etiquette = (id, groupeId, nom, ordre) => ({ id, groupeId, nom, ordre, modifieLe: 'x' });

const bibliotheque = () => ({
  groupes: [groupe('g-climat', 'Climat', 1), groupe('g-vide', 'Vide', 2), groupe('g-activites', 'Activités', 0)],
  etiquettes: [
    etiquette('froid', 'g-climat', 'Froid', 1),
    etiquette('chaud', 'g-climat', 'Chaud', 0),
    etiquette('camping', 'g-activites', 'Camping', 0),
    etiquette('plage', 'g-activites', 'Plage', 1),
    etiquette('pluie', 'g-climat', 'Pluie', 2),
  ],
  categories: [
    categorie('c-plage', 'Plage', 2, ['plage']),
    categorie('c-camping', 'Camping', 1, ['camping']),
    categorie('c-vet', 'Vêtements', 0),
  ],
  objets: [
    objet('o-tshirts', 'c-vet', 'T-shirts', 'par_jour', 1, [], { plafond: 5, parPersonne: true }),
    objet('o-doudoune', 'c-vet', 'Doudoune', 'fixe', 1, ['froid'], { parPersonne: true }),
    objet('o-lampe', 'c-camping', 'Lampe frontale', 'fixe', 1, [], { parPersonne: true }),
    objet('o-rechaud', 'c-camping', 'Réchaud', 'fixe', 1),
    objet('o-parasol', 'c-plage', 'Parasol', 'fixe', 1, ['chaud']),
    // Deux étiquettes pour le même objet : une seule ligne même si les deux sont choisies.
    objet('o-veste', 'c-camping', 'Veste', 'fixe', 1, ['camping', 'froid']),
  ],
});
const infos = { depart: '2026-10-10', retour: '2026-10-13', voyageurs: 2 };
const lignes = apercu => apercu.map(({ categorie: c, objets }) => [c.nom, objets.map(l => [l.objet.nom, l.quantite])]);

test('un modèle toujours inclus entre sans étiquette choisie ; sinon il lui en faut une', () => {
  assert.equal(estInclus({ toujours: true, etiquettes: [] }, new Set()), true);
  assert.equal(estInclus({ toujours: false, etiquettes: ['froid'] }, new Set(['froid'])), true);
  assert.equal(estInclus({ toujours: false, etiquettes: ['froid'] }, new Set(['pluie'])), false);
});

test('aperçu sans étiquette : seulement ce qui est toujours inclus', () => {
  assert.deepEqual(lignes(genererApercu(bibliotheque(), infos, new Set())), [['Vêtements', [['T-shirts', 8]]]]);
});

test('aperçu avec camping et froid : catégories dans l’ordre, objets par nom, un objet une seule fois', () => {
  const apercu = genererApercu(bibliotheque(), infos, new Set(['camping', 'froid']));
  assert.deepEqual(lignes(apercu), [
    [
      'Vêtements',
      [
        ['Doudoune', 2],
        ['T-shirts', 8],
      ],
    ],
    [
      'Camping',
      [
        ['Lampe frontale', 2],
        ['Réchaud', 1],
        ['Veste', 1],
      ],
    ],
  ]);
});

test('un objet dont la catégorie n’entre pas n’entre pas, même si son étiquette est choisie', () => {
  const noms = genererApercu(bibliotheque(), infos, new Set(['chaud'])).flatMap(({ objets }) =>
    objets.map(l => l.objet.nom),
  );
  assert.equal(noms.includes('Parasol'), false);
});

test('une quantité calculée à 0 retire l’objet, et sa catégorie si elle reste vide', () => {
  const biblio = bibliotheque();
  biblio.objets = [objet('o-pyjama', 'c-vet', 'Pyjama', 'par_nuit', 1)];
  assert.deepEqual(genererApercu(biblio, { ...infos, retour: '2026-10-10' }, new Set()), []);
});

test('les groupes sont rangés par ordre, leurs étiquettes aussi, et un groupe vide est omis', () => {
  assert.deepEqual(
    groupesAvecEtiquettes(bibliotheque()).map(({ groupe: g, etiquettes }) => [g.nom, etiquettes.map(e => e.nom)]),
    [
      ['Activités', ['Camping', 'Plage']],
      ['Climat', ['Chaud', 'Froid', 'Pluie']],
    ],
  );
});

test('les étiquettes choisies, dans l’ordre des groupes puis de leurs étiquettes', () => {
  const choisies = new Set(['froid', 'plage', 'chaud', 'inconnue']);
  assert.deepEqual(
    etiquettesChoisies(bibliotheque(), choisies).map(e => e.nom),
    ['Plage', 'Chaud', 'Froid'],
  );
  assert.deepEqual(etiquettesChoisies(bibliotheque(), new Set()), []);
});
