import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  consequences,
  consequencesVoyage,
  estBloquee,
  extraitAvant,
  memesConsequences,
} from '../src/modele/suppressions.js';

// Bibliothèque construite sur le modèle de docs/maquettes/suppressions/donnees.js, avec les
// formes que rend lireBibliotheque() : les étiquettes des modèles sont des identifiants, dans l'ordre.
const groupes = [
  { id: 'g-act', nom: 'Activités', ordre: 0, modifieLe: 'm1' },
  { id: 'g-cli', nom: 'Climat', ordre: 1, modifieLe: 'm1' },
  { id: 'g-heb', nom: 'Hébergement', ordre: 2, modifieLe: 'm1' },
];
const etiquettes = [
  ['e-rando', 'g-act', 'Randonnée'],
  ['e-camping', 'g-act', 'Camping'],
  ['e-plage', 'g-act', 'Plage'],
  ['e-chaud', 'g-cli', 'Chaud'],
  ['e-froid', 'g-cli', 'Froid'],
  ['e-pluie', 'g-cli', 'Pluie'],
  ['e-hotel', 'g-heb', 'Hôtel'],
  ['e-tente', 'g-heb', 'Tente'],
  ['e-chez', 'g-heb', 'Chez l’habitant'],
].map(([id, groupeId, nom], i) => ({ id, groupeId, nom, ordre: i % 3, modifieLe: 'm1' }));

const categorie = (id, nom, ordre, ids, toujoursIncluse = false) => ({
  id,
  nom,
  ordre,
  icone: 'x',
  couleur: 'ciel',
  toujoursIncluse,
  etiquettes: ids,
  modifieLe: 'm2',
});
const objet = (id, nom, categorieId, ids, toujoursInclus = false) => ({
  id,
  nom,
  categorieId,
  toujoursInclus,
  etiquettes: ids,
  modifieLe: 'm3',
});

const bibliotheque = {
  groupes,
  etiquettes,
  categories: [
    categorie('c-vet', 'Vêtements', 0, [], true),
    categorie('c-toil', 'Toilette', 1, [], true),
    categorie('c-bai', 'Baignade', 2, ['e-plage']),
    categorie('c-cam', 'Camping', 3, ['e-camping', 'e-tente']),
  ],
  objets: [
    objet('o-maillot', 'Maillot de bain', 'c-vet', ['e-plage']),
    objet('o-tongs', 'Tongs', 'c-vet', ['e-plage']),
    objet('o-doudoune', 'Doudoune', 'c-vet', ['e-froid']),
    objet('o-bonnet', 'Bonnet', 'c-vet', ['e-froid']),
    objet('o-cape', 'Cape de pluie', 'c-vet', ['e-pluie']),
    objet('o-creme', 'Crème solaire', 'c-toil', ['e-plage', 'e-chaud']),
    objet('o-serviette', 'Serviette de plage', 'c-bai', [], true),
    objet('o-parasol', 'Parasol', 'c-bai', [], true),
    objet('o-masque', 'Masque et tuba', 'c-bai', [], true),
    objet('o-tente', 'Tente', 'c-cam', ['e-camping']),
    objet('o-sac', 'Sac de couchage', 'c-cam', ['e-camping']),
    objet('o-lampe', 'Lampe frontale', 'c-cam', ['e-camping']),
  ],
};

const noms = liste => liste.map(x => x.nom);
const etiquette = id => ({ type: 'etiquette', id });
const vide = { categories: [], objets: [] };

test('une catégorie emporte ses objets', () => {
  const c = consequences(bibliotheque, { type: 'categorie', id: 'c-cam' }, 'fr');
  assert.deepEqual(noms(c.objets).sort(), ['Lampe frontale', 'Sac de couchage', 'Tente']);
  assert.deepEqual(c.etiquettes, []);
  assert.deepEqual(c.perdent, vide);
  assert.deepEqual(c.bloquent, vide);
  assert.equal(estBloquee(c), false);
});

test('un objet n’emporte rien d’autre', () => {
  const c = consequences(bibliotheque, { type: 'objet', id: 'o-tongs' }, 'fr');
  assert.deepEqual(c, { objets: [], etiquettes: [], perdent: vide, bloquent: vide });
});

test('Chaud : 1 objet la perd, rien ne bloque', () => {
  const c = consequences(bibliotheque, etiquette('e-chaud'), 'fr');
  assert.deepEqual(noms(c.etiquettes), ['Chaud']);
  assert.deepEqual(noms(c.perdent.objets), ['Crème solaire']);
  assert.deepEqual(c.perdent.categories, []);
  assert.equal(estBloquee(c), false);
});

test('Hôtel : personne ne la porte', () => {
  const c = consequences(bibliotheque, etiquette('e-hotel'), 'fr');
  assert.deepEqual(
    c.etiquettes.map(e => e.nom),
    ['Hôtel'],
  );
  assert.deepEqual(c.perdent, vide);
  assert.deepEqual(c.bloquent, vide);
});

test('Plage : Baignade, Maillot de bain et Tongs bloquent, Crème solaire perd', () => {
  const c = consequences(bibliotheque, etiquette('e-plage'), 'fr');
  assert.deepEqual(noms(c.bloquent.categories), ['Baignade']);
  assert.deepEqual(noms(c.bloquent.objets), ['Maillot de bain', 'Tongs']);
  assert.deepEqual(noms(c.perdent.objets), ['Crème solaire']);
  assert.equal(estBloquee(c), true);
});

test('groupe Climat : Bonnet, Cape de pluie, Doudoune bloquent ; Crème solaire perd une fois', () => {
  const c = consequences(bibliotheque, { type: 'groupe', id: 'g-cli' }, 'fr');
  assert.deepEqual(noms(c.etiquettes), ['Chaud', 'Froid', 'Pluie']);
  assert.deepEqual(noms(c.bloquent.objets), ['Bonnet', 'Cape de pluie', 'Doudoune']);
  assert.deepEqual(noms(c.perdent.objets), ['Crème solaire']);
  assert.deepEqual(c.bloquent.categories, []);
});

test('groupe Hébergement : Camping perd, rien ne bloque', () => {
  const c = consequences(bibliotheque, { type: 'groupe', id: 'g-heb' }, 'fr');
  assert.deepEqual(noms(c.perdent.categories), ['Camping']);
  assert.deepEqual(c.perdent.objets, []);
  assert.equal(estBloquee(c), false);
});

test('un modèle toujours inclus qui porte l’étiquette la perd sans bloquer', () => {
  const b = {
    ...bibliotheque,
    objets: [objet('o-t', 'Torche', 'c-vet', ['e-plage'], true)],
  };
  const c = consequences(b, etiquette('e-plage'), 'fr');
  assert.deepEqual(noms(c.perdent.objets), ['Torche']);
  assert.deepEqual(c.bloquent.objets, []);
});

test('un modèle déjà sans étiquette ne bloque rien', () => {
  const c = consequences(bibliotheque, { type: 'groupe', id: 'g-act' }, 'fr');
  assert.ok(!noms(c.bloquent.objets).includes('Parasol'));
  assert.ok(!noms(c.perdent.objets).includes('Parasol'));
});

test('l’extrait d’une étiquette garde les modèles tels qu’avant, liens dans l’ordre', () => {
  const extrait = extraitAvant(bibliotheque, etiquette('e-plage'));
  assert.deepEqual(extrait.groupes, []);
  assert.deepEqual(noms(extrait.etiquettes), ['Plage']);
  assert.deepEqual(extrait.categories, [bibliotheque.categories[2]]);
  assert.deepEqual(noms(extrait.objets).sort(), ['Crème solaire', 'Maillot de bain', 'Tongs']);
  assert.deepEqual(extrait.objets.find(o => o.id === 'o-creme').etiquettes, ['e-plage', 'e-chaud']);
});

test('l’extrait d’une catégorie contient ses objets ; celui d’un groupe ses étiquettes', () => {
  const cat = extraitAvant(bibliotheque, { type: 'categorie', id: 'c-cam' });
  assert.deepEqual(noms(cat.categories), ['Camping']);
  assert.equal(cat.objets.length, 3);
  assert.deepEqual([cat.groupes, cat.etiquettes], [[], []]);

  const objetSeul = extraitAvant(bibliotheque, { type: 'objet', id: 'o-tongs' });
  assert.deepEqual(noms(objetSeul.objets), ['Tongs']);
  assert.deepEqual(objetSeul.categories, []);

  const grp = extraitAvant(bibliotheque, { type: 'groupe', id: 'g-heb' });
  assert.deepEqual(noms(grp.groupes), ['Hébergement']);
  assert.deepEqual(noms(grp.etiquettes), ['Hôtel', 'Tente', 'Chez l’habitant']);
  assert.deepEqual(noms(grp.categories), ['Camping']);
  assert.deepEqual(grp.objets, []);
});

// Constat C1 de la relecture finale : au moment d'écrire, la suppression relit la bibliothèque ; elle
// n'écrit que si ce qu'elle emporte est bien ce que la question a annoncé.
test('mêmes conséquences : rien de ce qui est emporté, perdu ou bloquant n’a changé', () => {
  const sans = (liste, id) => liste.filter(x => x.id !== id);
  const climat = { type: 'groupe', id: 'g-cli' };
  const toilette = { type: 'categorie', id: 'c-toil' };
  const de = (b, cible) => consequences(b, cible, 'fr');
  assert.equal(memesConsequences(de(bibliotheque, climat), de(structuredClone(bibliotheque), climat)), true);
  // Ailleurs, rien ne compte : un objet de plus dans Baignade, Hôtel renommé.
  const ailleurs = {
    ...bibliotheque,
    etiquettes: bibliotheque.etiquettes.map(e => (e.id === 'e-hotel' ? { ...e, nom: 'Gîte' } : e)),
    objets: [...bibliotheque.objets, objet('o-seau', 'Seau', 'c-bai', [], true)],
  };
  assert.equal(memesConsequences(de(bibliotheque, climat), de(ailleurs, climat)), true);
  // Crème solaire revenue : la catégorie Toilette emporte un objet de plus.
  const sansCreme = { ...bibliotheque, objets: sans(bibliotheque.objets, 'o-creme') };
  assert.equal(memesConsequences(de(sansCreme, toilette), de(bibliotheque, toilette)), false);
  // Chaud revenue : le groupe Climat emporte une étiquette de plus.
  const sansChaud = { ...bibliotheque, etiquettes: sans(bibliotheque.etiquettes, 'e-chaud') };
  assert.equal(memesConsequences(de(sansChaud, climat), de(bibliotheque, climat)), false);
  // Bonnet revenu : un élément bloque de plus.
  const sansBonnet = { ...bibliotheque, objets: sans(bibliotheque.objets, 'o-bonnet') };
  assert.equal(memesConsequences(de(sansBonnet, climat), de(bibliotheque, climat)), false);
  // Crème solaire revenue : un élément perd une étiquette de plus.
  const chaud = etiquette('e-chaud');
  assert.equal(memesConsequences(de(sansCreme, chaud), de(bibliotheque, chaud)), false);
});

// Phase 11 : la question avant de supprimer un voyage chiffre sa liste et ce qui est déjà dans le sac.
// Un objet compte dans le sac dès sa première pièce (pas les pièces) ; un objet retiré qui attend encore
// d'être sorti du sac (quantité 0) ne fait plus partie de la liste, mais ses pièces sont dans le sac.
const objetDuVoyage = (i, quantite, dansLeSac) => ({ id: `o-${i}`, quantite, dansLeSac });

test('un voyage de 87 objets dont 23 ont au moins une pièce dans le sac', () => {
  const objets = Array.from({ length: 87 }, (_, i) => objetDuVoyage(i, 3, i < 23 ? 1 + (i % 3) : 0));
  assert.deepEqual(consequencesVoyage({ objets }), { objets: 87, dansLeSac: 23 });
});

// Décision R9 (relecture finale de la phase 11) : la liste du voyage montre encore l'objet retiré qui
// attend sa sortie ; le total est celui de l'en-tête « Dans le sac x / N », et « dont » ne le dépasse jamais.
test('un objet retiré en attente de sortie compte dans la liste et dans le sac', () => {
  const objets = [objetDuVoyage(1, 2, 0), objetDuVoyage(2, 1, 1), objetDuVoyage(3, 0, 2)];
  assert.deepEqual(consequencesVoyage({ objets }), { objets: 3, dansLeSac: 2 });
});

test('« dont » ne dépasse jamais le total : un objet gardé, deux retirés encore dans le sac', () => {
  const objets = [objetDuVoyage(1, 1, 0), objetDuVoyage(2, 0, 1), objetDuVoyage(3, 0, 2)];
  assert.deepEqual(consequencesVoyage({ objets }), { objets: 3, dansLeSac: 2 });
});

test('un voyage sans objet ne compte rien', () => {
  assert.deepEqual(consequencesVoyage({ objets: [] }), { objets: 0, dansLeSac: 0 });
});
