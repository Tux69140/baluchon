// « Refaire ce voyage » (docs/PLAN.md, phase 11 ; conception
// docs/superpowers/specs/2026-10-30-phase-11-refaire-supprimer-design.md, décisions 1 à 7 et 12) : ce
// qu'écrit la génération du voyage refait, depuis son aperçu (tests/refaire.test.js).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { apercuRefait, repriseDe } from '../src/modele/refaire.js';
import { copierAjout, genererVoyage, listeParCategorie } from '../src/modele/voyage.js';
import { MAINTENANT, bibliotheque, categorie, compteur, infos, modele, origine } from './outils/refaire-donnees.mjs';

// Le gel en profondeur : une écriture dans le voyage d'origine lève une erreur.
function geler(valeur) {
  if (valeur && typeof valeur === 'object') {
    Object.values(valeur).forEach(geler);
    Object.freeze(valeur);
  }
  return valeur;
}
const creer = ({ ecartes, recalculer = new Set() } = {}) => {
  const o = geler(origine());
  const avant = structuredClone(o);
  const b = bibliotheque();
  const reprise = repriseDe(o, b);
  const { apercu } = apercuRefait(o, b, infos(), reprise.choisies, recalculer);
  const cree = genererVoyage(
    b,
    infos(),
    { choisies: reprise.choisies, ecartes: ecartes ?? reprise.ecartes, apercu },
    { nouvelId: compteur(), maintenant: MAINTENANT },
  );
  return { cree, o, avant };
};
const parNom = (objets, nom) => objets.find(x => x.nom === nom);

test('le voyage refait : quantités, noms, quantités fixées et écartés attendus', () => {
  const { cree } = creer();
  assert.deepEqual(
    cree.objets.map(x => [x.nom, x.quantite, x.quantiteManuelle]),
    [
      ['Chaussettes', 3, true],
      ['Chaussures de rando', 1, false],
      ['Pull', 2, false],
      ['T-shirts', 14, false],
      ['Bouchons d’oreille', 4, true],
      ['Brosse à dents', 2, false],
      ['Crème solaire bio', 1, true],
      ['Hamac', 1, true],
      ['Jeux de cartes', 2, true],
      ['Livres', 3, true],
    ],
  );
  // La gourde et le savon arrivent écartés et le restent ; la lampe n'est plus proposée.
  assert.deepEqual(cree.ecartes, ['o-gourde', 'o-savon']);
  assert.equal(
    cree.objets.every(x => x.voyageId === cree.voyage.id && x.dansLeSac === 0 && x.achetes === 0),
    true,
  );
});

test('« Recalculer » donne la quantité calculée, sans « fixée manuellement »', () => {
  const { cree } = creer({ recalculer: new Set(['o-chaussettes']) });
  const chaussettes = parNom(cree.objets, 'Chaussettes');
  assert.equal(chaussettes.quantite, 7);
  assert.equal(chaussettes.quantiteManuelle, false);
});

test('les catégories : celles de la bibliothèque, puis celles d’origine copiées avec leur modèle', () => {
  const { cree } = creer();
  assert.deepEqual(
    cree.categories.map(c => [c.nom, c.modeleId, c.ordre, c.icone, c.couleur]),
    [
      ['Vêtements', 'c-vet', 0, 'package', 'ciel'],
      ['Toilette', 'c-toil', 1, 'package', 'ciel'],
      ['Camping', 'c-camp', 2, 'package', 'ciel'],
      ['Loisirs', null, 3, 'puzzle', 'lavande'],
    ],
  );
  assert.equal(
    cree.categories.every(c => c.voyageId === cree.voyage.id && !c.id.startsWith('cv-') && c.modifieLe === MAINTENANT),
    true,
  );
  const idDe = nom => cree.categories.find(c => c.nom === nom).id;
  assert.equal(parNom(cree.objets, 'Hamac').categorieId, idDe('Camping'));
  assert.equal(parNom(cree.objets, 'Livres').categorieId, idDe('Loisirs'));
  assert.equal(parNom(cree.objets, 'Jeux de cartes').categorieId, idDe('Loisirs'));
  assert.equal(parNom(cree.objets, 'Bouchons d’oreille').categorieId, idDe('Toilette'));
});

test('les catégories d’origine, en fin d’aperçu, restent en fin du voyage créé, dans le même ordre', () => {
  // Sport (rang 3 de la bibliothèque) passe avant Camping et Loisirs d'origine (rangs 2 et 3 dans le voyage
  // d'origine) : leurs anciens rangs les feraient remonter au milieu de la liste.
  const b = bibliotheque();
  b.categories.push(categorie('c-sport', 'Sport', 3));
  b.objets.push(modele('o-ballon', 'c-sport', 'Ballon', 'fixe', 1));
  const o = origine();
  const reprise = repriseDe(o, b);
  const { apercu } = apercuRefait(o, b, infos(), reprise.choisies, new Set());
  const vus = apercu.map(g => g.categorie.nom);
  assert.deepEqual(vus, ['Vêtements', 'Toilette', 'Sport', 'Camping', 'Loisirs']);
  const cree = genererVoyage(
    b,
    infos(),
    { choisies: reprise.choisies, ecartes: reprise.ecartes, apercu },
    { nouvelId: compteur(), maintenant: MAINTENANT },
  );
  assert.deepEqual(
    listeParCategorie(cree).map(g => g.categorie.nom),
    vus,
  );
  assert.deepEqual(
    cree.categories.map(c => c.ordre),
    [0, 1, 3, 4, 5],
  );
});

test('copierAjout : l’objet d’origine dans le nouveau voyage, ni dans le sac ni acheté', () => {
  const creme = origine().objets.find(x => x.id === 'ov-creme');
  assert.deepEqual(
    copierAjout(
      creme,
      { voyageId: 'v-neuf', categorieId: 'c-neuve' },
      { nouvelId: () => 'o-neuf', maintenant: MAINTENANT },
    ),
    {
      ...creme,
      id: 'o-neuf',
      voyageId: 'v-neuf',
      categorieId: 'c-neuve',
      dansLeSac: 0,
      achetes: 0,
      modifieLe: MAINTENANT,
    },
  );
});

test('un ajout « à acheter » revient à acheter, rien d’acheté, rien dans le sac', () => {
  const { cree, o } = creer();
  const creme = parNom(cree.objets, 'Crème solaire bio');
  const sienne = o.objets.find(x => x.id === 'ov-creme');
  assert.deepEqual(creme, {
    ...sienne,
    id: creme.id,
    voyageId: cree.voyage.id,
    categorieId: creme.categorieId,
    aAcheter: true,
    achetes: 0,
    dansLeSac: 0,
    modifieLe: MAINTENANT,
  });
  assert.notEqual(creme.id, 'ov-creme');
  assert.equal(parNom(cree.objets, 'Livres').note, 'Un chacun.');
});

test('un ajout décoché à l’aperçu n’est pas copié, ni retenu parmi les écartés', () => {
  const { cree } = creer({ ecartes: new Set(['o-gourde', 'o-savon', 'ov-livres', 'ov-hamac']) });
  assert.equal(parNom(cree.objets, 'Livres'), undefined);
  assert.equal(
    cree.categories.some(c => c.nom === 'Camping'),
    false,
  );
  assert.deepEqual(cree.ecartes, ['o-gourde', 'o-savon']);
});

test('le voyage d’origine n’a pas bougé', () => {
  const { o, avant } = creer({ recalculer: new Set(['o-chaussettes']) });
  assert.deepEqual(o, avant);
});
