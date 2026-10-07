// Un voyage : validation, génération depuis la bibliothèque, classement (docs/PLAN.md, phase 2).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  classerVoyages,
  genererVoyage,
  listeParCategorie,
  validerInformations,
  VOYAGEURS,
} from '../src/modele/voyage.js';

const MAINTENANT = '2026-10-06T08:00:00.000Z';
function compteur() {
  let n = 0;
  return () => `id-${++n}`;
}
const categorie = (id, nom, ordre, toujoursIncluse = true) => ({
  id,
  nom,
  icone: 'package',
  couleur: 'ciel',
  ordre,
  toujoursIncluse,
  modifieLe: 'x',
});
const objet = (id, categorieId, nom, regle, valeur, autres = {}) => ({
  id,
  categorieId,
  nom,
  regle,
  valeur,
  plafond: null,
  parPersonne: false,
  consommable: false,
  toujoursInclus: true,
  note: '',
  modifieLe: 'x',
  ...autres,
});
// Catégories rangées dans le désordre : l'ordre de la bibliothèque doit être respecté.
const bibliotheque = () => ({
  categories: [
    categorie('c-ali', 'Alimentation', 1),
    categorie('c-vet', 'Vêtements', 0),
    categorie('c-nuit', 'Nuit', 2),
    categorie('c-ski', 'Ski', 3, false),
  ],
  objets: [
    objet('o-repas', 'c-ali', 'Repas', 'par_jour', 2, { parPersonne: true, consommable: true, note: 'Midi et soir.' }),
    objet('o-dentifrice', 'c-vet', 'Dentifrice', 'fixe', 1),
    objet('o-pyjama', 'c-nuit', 'Pyjama', 'par_nuit', 1, { plafond: 1, parPersonne: true }),
    objet('o-parapluie', 'c-vet', 'Parapluie', 'fixe', 1, { toujoursInclus: false }),
    objet('o-skis', 'c-ski', 'Skis', 'fixe', 1),
  ],
});
const infos = (autres = {}) => ({
  nom: 'Vercors',
  destination: 'Autrans',
  depart: '2026-10-10',
  retour: '2026-10-13',
  voyageurs: 2,
  ...autres,
});
const generer = (i = infos()) => genererVoyage(bibliotheque(), i, { nouvelId: compteur(), maintenant: MAINTENANT });

test('le nombre de voyageurs par défaut est 2', () => {
  assert.equal(VOYAGEURS.parDefaut, 2);
});

test('des informations complètes ne portent aucune erreur', () => {
  assert.deepEqual(validerInformations(infos()), {});
  assert.deepEqual(validerInformations(infos({ destination: '' })), {});
  assert.deepEqual(validerInformations(infos({ voyageurs: VOYAGEURS.min })), {});
  assert.deepEqual(validerInformations(infos({ voyageurs: VOYAGEURS.max })), {});
});

test('chaque information fautive a son code d’erreur', () => {
  assert.deepEqual(validerInformations(infos({ nom: '   ' })), { nom: 'nomManquant' });
  assert.deepEqual(validerInformations(infos({ retour: null })), { dates: 'datesManquantes' });
  assert.deepEqual(validerInformations(infos({ depart: '2026-02-30' })), { dates: 'datesInvalides' });
  assert.deepEqual(validerInformations(infos({ retour: '2026-10-09' })), { dates: 'retourAvantDepart' });
  assert.deepEqual(validerInformations(infos({ voyageurs: VOYAGEURS.min - 1 })), { voyageurs: 'voyageursHorsLimites' });
  assert.deepEqual(validerInformations(infos({ voyageurs: VOYAGEURS.max + 1 })), { voyageurs: 'voyageursHorsLimites' });
  assert.deepEqual(validerInformations(infos({ voyageurs: 2.5 })), { voyageurs: 'voyageursHorsLimites' });
  assert.deepEqual(validerInformations(infos({ voyageurs: '2' })), { voyageurs: 'voyageursHorsLimites' });
});

test('un an pile est accepté, un jour de plus est refusé, 29 février compris', () => {
  assert.deepEqual(validerInformations(infos({ retour: '2027-10-10' })), {});
  assert.deepEqual(validerInformations(infos({ retour: '2027-10-11' })), { dates: 'tropLong' });
  assert.deepEqual(validerInformations(infos({ depart: '2028-02-29', retour: '2029-02-28' })), {});
  assert.deepEqual(validerInformations(infos({ depart: '2028-02-29', retour: '2029-03-01' })), { dates: 'tropLong' });
});

test('critère 2 : du 10 au 13 à deux, Repas vaut 16 et le dentifrice partagé 1', () => {
  const { objets } = generer();
  const quantites = Object.fromEntries(objets.map(o => [o.nom, o.quantite]));
  assert.deepEqual(quantites, { Repas: 16, Dentifrice: 1, Pyjama: 2 });
});

test('seuls les « toujours inclus » entrent, dans des catégories elles-mêmes incluses', () => {
  const { categories, objets } = generer();
  assert.deepEqual(
    categories.map(c => c.nom),
    ['Vêtements', 'Alimentation', 'Nuit'],
  );
  assert.equal(
    objets.some(o => o.nom === 'Parapluie' || o.nom === 'Skis'),
    false,
  );
});

test('un objet à 0 est écarté, et une catégorie restée vide aussi', () => {
  const { categories, objets } = generer(infos({ retour: '2026-10-10' }));
  assert.equal(
    objets.some(o => o.nom === 'Pyjama'),
    false,
  );
  assert.equal(
    categories.some(c => c.nom === 'Nuit'),
    false,
  );
});

test('le voyage est une copie : champs copiés, modèle d’origine noté, marques de départ', () => {
  const contenu = generer(infos({ nom: '  Vercors  ', destination: ' Autrans ' }));
  assert.equal(contenu.voyage.nom, 'Vercors');
  assert.equal(contenu.voyage.destination, 'Autrans');
  assert.equal(contenu.voyage.modifieLe, MAINTENANT);
  const repas = contenu.objets.find(o => o.nom === 'Repas');
  const alimentation = contenu.categories.find(c => c.nom === 'Alimentation');
  assert.deepEqual(repas, {
    id: repas.id,
    voyageId: contenu.voyage.id,
    categorieId: alimentation.id,
    modeleId: 'o-repas',
    nom: 'Repas',
    regle: 'par_jour',
    valeur: 2,
    plafond: null,
    parPersonne: true,
    consommable: true,
    quantite: 16,
    quantiteManuelle: false,
    dansLeSac: false,
    aAcheter: true,
    achete: false,
    note: 'Midi et soir.',
    modifieLe: MAINTENANT,
  });
  assert.equal(alimentation.modeleId, 'c-ali');
  assert.equal(alimentation.voyageId, contenu.voyage.id);
  assert.equal(
    new Set([contenu.voyage.id, ...contenu.categories.map(c => c.id), ...contenu.objets.map(o => o.id)]).size,
    1 + 3 + 3,
  );
});

test('changer la bibliothèque après coup ne change pas le voyage', () => {
  const biblio = bibliotheque();
  const contenu = genererVoyage(biblio, infos(), { nouvelId: compteur(), maintenant: MAINTENANT });
  biblio.objets[0].nom = 'Repas renommé';
  biblio.categories[0].nom = 'Autre nom';
  assert.ok(contenu.objets.some(o => o.nom === 'Repas'));
  assert.ok(contenu.categories.some(c => c.nom === 'Alimentation'));
});

test('des informations invalides ne génèrent rien et disent pourquoi', () => {
  assert.throws(
    () => generer(infos({ retour: '2026-10-09' })),
    erreur => erreur.erreurs?.dates === 'retourAvantDepart',
  );
});

test('la liste d’un voyage : catégories dans leur ordre, objets par ordre alphabétique', () => {
  const liste = listeParCategorie({
    categories: [
      { id: 'b', nom: 'B', ordre: 1 },
      { id: 'a', nom: 'A', ordre: 0 },
    ],
    objets: [
      { id: '1', categorieId: 'a', nom: 'Tente' },
      { id: '2', categorieId: 'b', nom: 'Gourde' },
      { id: '3', categorieId: 'a', nom: 'Duvet' },
    ],
  });
  assert.deepEqual(
    liste.map(({ categorie, objets }) => [categorie.nom, objets.map(o => o.nom)]),
    [
      ['A', ['Duvet', 'Tente']],
      ['B', ['Gourde']],
    ],
  );
});

test('classement : en cours, à venir du plus proche, passés du plus récent', () => {
  const v = (nom, depart, retour) => ({ id: nom, nom, depart, retour });
  const classes = classerVoyages(
    [
      v('Pâques', '2026-04-03', '2026-04-06'),
      v('Noël', '2026-12-20', '2026-12-27'),
      v('Vercors', '2026-10-10', '2026-10-13'),
      v('Week-end', '2026-10-09', '2026-10-11'),
      v('Toussaint', '2026-10-24', '2026-11-01'),
      v('Part aujourd’hui', '2026-10-12', '2026-10-20'),
      v('Rentre aujourd’hui', '2026-10-05', '2026-10-12'),
    ],
    '2026-10-12',
  );
  const noms = liste => liste.map(x => x.nom);
  assert.deepEqual(noms(classes.enCours), ['Rentre aujourd’hui', 'Vercors', 'Part aujourd’hui']);
  assert.deepEqual(noms(classes.aVenir), ['Toussaint', 'Noël']);
  assert.deepEqual(noms(classes.passes), ['Week-end', 'Pâques']);
});
