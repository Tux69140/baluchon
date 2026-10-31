// « Refaire ce voyage » (docs/PLAN.md, phase 11 ; conception
// docs/superpowers/specs/2026-10-30-phase-11-refaire-supprimer-design.md, décisions 1 à 7 et 12) : ce
// qu'un voyage refait reprend du voyage d'origine, sur la bibliothèque actuelle, et ce qu'en écrit la
// génération du voyage.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { raisonVide } from '../src/ecrans/assistant.js';
import { apercuRefait, repriseDe } from '../src/modele/refaire.js';
import { copierAjout, genererVoyage } from '../src/modele/voyage.js';

const MAINTENANT = '2026-10-31T10:00:00.000Z';
function compteur(prefixe = 'n') {
  let n = 0;
  return () => `${prefixe}-${++n}`;
}
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
const modele = (id, categorieId, nom, regle, valeur, autres = {}) => ({
  id,
  categorieId,
  nom,
  regle,
  valeur,
  plafond: null,
  parPersonne: false,
  consommable: false,
  toujoursInclus: !autres.etiquettes?.length,
  note: '',
  modifieLe: 'x',
  etiquettes: [],
  ...autres,
});
// La bibliothèque d'aujourd'hui : « Rando » s'appelle désormais « Randonnée », « Plage » et la trousse
// de secours ont été supprimées.
const bibliotheque = () => ({
  groupes: [
    { id: 'g-activites', nom: 'Activités', ordre: 0, modifieLe: 'x' },
    { id: 'g-climat', nom: 'Climat', ordre: 1, modifieLe: 'x' },
  ],
  etiquettes: [
    { id: 'e-rando', groupeId: 'g-activites', nom: 'Randonnée', ordre: 0, modifieLe: 'x' },
    { id: 'e-camping', groupeId: 'g-activites', nom: 'Camping', ordre: 1, modifieLe: 'x' },
    { id: 'e-pluie', groupeId: 'g-climat', nom: 'Pluie', ordre: 0, modifieLe: 'x' },
  ],
  categories: [
    categorie('c-vet', 'Vêtements', 0),
    categorie('c-toil', 'Toilette', 1),
    categorie('c-camp', 'Camping', 2, ['e-camping']),
  ],
  objets: [
    modele('o-tshirts', 'c-vet', 'T-shirts', 'par_jour', 1, { parPersonne: true }),
    modele('o-pull', 'c-vet', 'Pull', 'fixe', 1, { parPersonne: true }),
    modele('o-chaussures', 'c-vet', 'Chaussures de marche', 'fixe', 1, { etiquettes: ['e-rando'] }),
    modele('o-chaussettes', 'c-vet', 'Chaussettes', 'par_jour', 1),
    modele('o-gourde', 'c-vet', 'Gourde', 'fixe', 1),
    modele('o-poncho', 'c-vet', 'Poncho', 'fixe', 1, { etiquettes: ['e-pluie'] }),
    modele('o-brosse', 'c-toil', 'Brosse à dents', 'fixe', 1, { parPersonne: true }),
    modele('o-savon', 'c-toil', 'Savon', 'fixe', 1, { consommable: true }),
    modele('o-lampe', 'c-camp', 'Lampe frontale', 'fixe', 1, { etiquettes: ['e-camping'] }),
  ],
});

const V = 'v-origine';
const categorieDuVoyage = (id, modeleId, nom, ordre) => ({
  id,
  voyageId: V,
  modeleId,
  nom,
  icone: modeleId ? 'package' : 'puzzle',
  couleur: modeleId ? 'ciel' : 'lavande',
  ordre,
  modifieLe: 'avant',
});
// Un objet du voyage d'origine : venu d'un modèle (modeleId), ou ajouté à la main (modeleId null).
const objetDuVoyage = (id, categorieId, modeleId, nom, quantite, autres = {}) => ({
  id,
  voyageId: V,
  categorieId,
  modeleId,
  nom,
  regle: 'fixe',
  valeur: modeleId ? 1 : 0,
  plafond: null,
  parPersonne: !modeleId,
  consommable: false,
  quantite,
  quantiteManuelle: !modeleId,
  dansLeSac: 0,
  aAcheter: false,
  achetes: 0,
  note: '',
  modifieLe: 'avant',
  ...autres,
});
// Le voyage d'origine, tel que le stockage le relit, avec l'été passé dans le sac.
const origine = (autres = {}) => ({
  voyage: {
    id: V,
    nom: 'Quiberon',
    destination: 'Bretagne',
    depart: '2026-07-10',
    retour: '2026-07-13',
    voyageurs: 2,
    modifieLe: 'avant',
  },
  etiquettes: [
    { id: 'ev-rando', voyageId: V, modeleId: 'e-rando', nom: 'Rando', ordre: 0, modifieLe: 'avant' },
    { id: 'ev-plage', voyageId: V, modeleId: 'e-plage', nom: 'Plage', ordre: 1, modifieLe: 'avant' },
  ],
  categories: [
    categorieDuVoyage('cv-vet', 'c-vet', 'Vêtements', 0),
    categorieDuVoyage('cv-toil', 'c-toil', 'Toilette', 1),
    categorieDuVoyage('cv-camp', 'c-camp', 'Camping', 2),
    categorieDuVoyage('cv-loisirs', null, 'Loisirs', 3),
  ],
  objets: [
    objetDuVoyage('ov-tshirts', 'cv-vet', 'o-tshirts', 'T-shirts', 8, { dansLeSac: 8 }),
    objetDuVoyage('ov-chaussures', 'cv-vet', 'o-chaussures', 'Chaussures de rando', 1, { dansLeSac: 1 }),
    objetDuVoyage('ov-chaussettes', 'cv-vet', 'o-chaussettes', 'Chaussettes', 3, { quantiteManuelle: true }),
    // Retiré, fixé à la main, une pièce encore dans le sac : il attend sa sortie.
    objetDuVoyage('ov-gourde', 'cv-vet', 'o-gourde', 'Gourde 1 L', 0, { quantiteManuelle: true, dansLeSac: 1 }),
    objetDuVoyage('ov-brosse', 'cv-toil', 'o-brosse', 'Brosse à dents', 2, { quantiteManuelle: true }),
    objetDuVoyage('ov-trousse', 'cv-toil', 'o-trousse', 'Trousse de secours', 1),
    // Son modèle a disparu, mais il était retiré : rien à signaler.
    objetDuVoyage('ov-crampons', 'cv-vet', 'o-crampons', 'Crampons', 0, { dansLeSac: 2 }),
    objetDuVoyage('ov-bouchons', 'cv-toil', null, 'Bouchons d’oreille', 4, { dansLeSac: 4 }),
    objetDuVoyage('ov-creme', 'cv-toil', null, 'Crème solaire bio', 1, { aAcheter: true, achetes: 1, dansLeSac: 1 }),
    objetDuVoyage('ov-hamac', 'cv-camp', null, 'Hamac', 1),
    objetDuVoyage('ov-livres', 'cv-loisirs', null, 'Livres', 3, { note: 'Un chacun.' }),
    objetDuVoyage('ov-jeux', 'cv-loisirs', null, 'Jeux de cartes', 2),
    // Ajouté à la main puis retiré : il n'existe nulle part ailleurs, il ne revient pas.
    objetDuVoyage('ov-parapluie', 'cv-vet', null, 'Parapluie pliant', 0, { dansLeSac: 1 }),
  ],
  ecartes: ['o-gourde', 'o-lampe', 'o-savon'],
  ...autres,
});
// L'été suivant : du 10 au 16, 7 jours, à deux.
const infos = (autres = {}) => ({
  nom: 'Quiberon 2027',
  destination: '',
  depart: '2027-07-10',
  retour: '2027-07-16',
  voyageurs: 2,
  ...autres,
});

// L'aperçu en clair : par catégorie, chaque ligne [nom, quantité, marques].
const enClair = apercu =>
  apercu.map(({ categorie: c, objets, origine: o }) => [
    c.nom,
    Boolean(o),
    objets.map(l => [l.objet.nom, l.quantite, ...(l.ajout ? ['ajout'] : []), ...(l.manuelle ? ['manuelle'] : [])]),
  ]);
const refaire = ({ o = origine(), b = bibliotheque(), i = infos(), choisies, recalculer = new Set() } = {}) =>
  apercuRefait(o, b, i, choisies ?? repriseDe(o, b).choisies, recalculer);

test('une étiquette renommée est reprise sous son nouveau nom, une étiquette disparue est nommée', () => {
  const { choisies, disparues } = repriseDe(origine(), bibliotheque());
  assert.deepEqual([...choisies], ['e-rando']);
  assert.deepEqual(disparues.etiquettes, ['Plage']);
});

test('un objet dont le modèle a disparu est nommé, sauf s’il était retiré', () => {
  assert.deepEqual(repriseDe(origine(), bibliotheque()).disparues.objets, ['Trousse de secours']);
});

test('les objets disparus suivent l’ordre du voyage : catégories dans l’ordre, puis par nom', () => {
  const o = origine();
  o.objets.push(
    objetDuVoyage('ov-a', 'cv-toil', 'o-x', 'Antimoustique', 1),
    objetDuVoyage('ov-z', 'cv-vet', 'o-y', 'Zip', 1),
  );
  assert.deepEqual(repriseDe(o, bibliotheque()).disparues.objets, ['Zip', 'Antimoustique', 'Trousse de secours']);
});

test('les objets écartés du voyage d’origine sont repris tels quels', () => {
  assert.deepEqual([...repriseDe(origine(), bibliotheque()).ecartes], ['o-gourde', 'o-lampe', 'o-savon']);
});

test('l’aperçu refait : bibliothèque actuelle, noms d’origine, quantité gardée, ajouts à la main', () => {
  assert.deepEqual(enClair(refaire().apercu), [
    [
      'Vêtements',
      false,
      [
        ['Chaussettes', 3, 'manuelle'],
        ['Chaussures de rando', 1],
        ['Gourde', 1],
        ['Pull', 2],
        ['T-shirts', 14],
      ],
    ],
    [
      'Toilette',
      false,
      [
        ['Bouchons d’oreille', 4, 'ajout'],
        ['Brosse à dents', 2],
        ['Crème solaire bio', 1, 'ajout'],
        ['Savon', 1],
      ],
    ],
    ['Camping', true, [['Hamac', 1, 'ajout']]],
    [
      'Loisirs',
      true,
      [
        ['Jeux de cartes', 2, 'ajout'],
        ['Livres', 3, 'ajout'],
      ],
    ],
  ]);
});

test('un objet renommé dans l’origine garde son nom, le reste vient du modèle actuel', () => {
  const ligne = refaire().apercu[0].objets.find(l => l.objet.id === 'o-chaussures');
  assert.deepEqual(ligne.objet, {
    ...bibliotheque().objets.find(m => m.id === 'o-chaussures'),
    nom: 'Chaussures de rando',
  });
});

test('quantité fixée 3, calcul 7 : gardée par défaut, 7 avec « Recalculer »', () => {
  const { apercu, manuelles } = refaire();
  assert.deepEqual([...manuelles], [['o-chaussettes', { gardee: 3, calcul: 7 }]]);
  assert.deepEqual(
    apercu[0].objets.find(l => l.objet.id === 'o-chaussettes'),
    { objet: bibliotheque().objets.find(m => m.id === 'o-chaussettes'), quantite: 3, manuelle: true },
  );
  const recalcule = refaire({ recalculer: new Set(['o-chaussettes']) });
  assert.deepEqual(
    recalcule.apercu[0].objets.find(l => l.objet.id === 'o-chaussettes'),
    {
      objet: bibliotheque().objets.find(m => m.id === 'o-chaussettes'),
      quantite: 7,
    },
  );
  assert.deepEqual([...recalcule.manuelles], [['o-chaussettes', { gardee: 3, calcul: 7 }]]);
});

test('une quantité fixée que le calcul retrouve : ni mention ni « manuelle »', () => {
  const { apercu, manuelles } = refaire();
  assert.equal(manuelles.has('o-brosse'), false);
  assert.equal(apercu[1].objets.find(l => l.objet.id === 'o-brosse').manuelle, undefined);
});

test('un ajout à la main garde son identifiant, sa quantité et l’objet d’origine', () => {
  const { apercu, ajouts } = refaire();
  assert.deepEqual([...ajouts].sort(), ['ov-bouchons', 'ov-creme', 'ov-hamac', 'ov-jeux', 'ov-livres']);
  const o = origine();
  assert.deepEqual(
    apercu[1].objets.find(l => l.objet.id === 'ov-bouchons'),
    { objet: o.objets.find(x => x.id === 'ov-bouchons'), quantite: 4, ajout: true },
  );
});

test('un ajout dans une catégorie non retenue revient dans sa catégorie d’origine, en fin d’aperçu', () => {
  const { apercu } = refaire();
  const o = origine();
  assert.deepEqual(
    apercu[2].categorie,
    o.categories.find(c => c.id === 'cv-camp'),
  );
  // Retenue par l'étiquette Camping, la catégorie de la bibliothèque l'accueille à sa place.
  const camping = refaire({ choisies: new Set(['e-rando', 'e-camping']) }).apercu;
  assert.deepEqual(enClair(camping).slice(2), [
    [
      'Camping',
      false,
      [
        ['Hamac', 1, 'ajout'],
        ['Lampe frontale', 1],
      ],
    ],
    [
      'Loisirs',
      true,
      [
        ['Jeux de cartes', 2, 'ajout'],
        ['Livres', 3, 'ajout'],
      ],
    ],
  ]);
  assert.equal(camping[2].categorie.id, 'c-camp');
});

test('une catégorie propre au voyage revient une seule fois pour ses deux ajouts', () => {
  const loisirs = refaire().apercu.filter(g => g.categorie.id === 'cv-loisirs');
  assert.equal(loisirs.length, 1);
  assert.equal(loisirs[0].origine, true);
});

test('un écarté que les étiquettes proposent est « retiré » ; celui qu’elles n’appellent plus est absent', () => {
  assert.deepEqual([...refaire().retires].sort(), ['o-gourde', 'o-savon']);
  const camping = refaire({ choisies: new Set(['e-rando', 'e-camping']) });
  assert.deepEqual([...camping.retires].sort(), ['o-gourde', 'o-lampe', 'o-savon']);
});

test('un voyage d’avant la phase : rien d’écarté, rien de retiré', () => {
  const o = origine({ ecartes: [] });
  assert.equal(repriseDe(o, bibliotheque()).ecartes.size, 0);
  assert.equal(refaire({ o }).retires.size, 0);
});

test('vigilance 1 : un ajout retiré et un objet de modèle retiré fixé à la main ne reviennent pas tels quels', () => {
  const { apercu, ajouts, manuelles } = refaire();
  const tous = apercu.flatMap(g => g.objets);
  assert.equal(ajouts.has('ov-parapluie'), false);
  assert.equal(
    tous.some(l => l.objet.id === 'ov-parapluie'),
    false,
  );
  assert.equal(manuelles.has('o-gourde'), false);
  // La gourde vient de la bibliothèque actuelle, sans rien de l'origine : ni « fixée : 0 », ni son nom.
  assert.deepEqual(
    tous.find(l => l.objet.id === 'o-gourde'),
    { objet: bibliotheque().objets.find(m => m.id === 'o-gourde'), quantite: 1 },
  );
});

test('vigilance 4 : des étiquettes qui n’appellent plus rien laissent les seuls ajouts à la main', () => {
  const b = bibliotheque();
  b.categories = b.categories.map(c => ({ ...c, toujoursIncluse: false, etiquettes: ['e-camping'] }));
  const { apercu, ajouts } = refaire({ b, choisies: new Set() });
  assert.deepEqual(enClair(apercu), [
    [
      'Toilette',
      true,
      [
        ['Bouchons d’oreille', 4, 'ajout'],
        ['Crème solaire bio', 1, 'ajout'],
      ],
    ],
    ['Camping', true, [['Hamac', 1, 'ajout']]],
    [
      'Loisirs',
      true,
      [
        ['Jeux de cartes', 2, 'ajout'],
        ['Livres', 3, 'ajout'],
      ],
    ],
  ]);
  assert.equal(raisonVide(apercu, new Set()), null);
  assert.equal(raisonVide(apercu, ajouts), 'toutEcarte');
  const cree = genererVoyage(
    b,
    infos(),
    { choisies: new Set(), ecartes: new Set(), apercu },
    { nouvelId: compteur(), maintenant: MAINTENANT },
  );
  assert.deepEqual(
    cree.objets.map(x => x.nom),
    ['Bouchons d’oreille', 'Crème solaire bio', 'Hamac', 'Jeux de cartes', 'Livres'],
  );
  assert.deepEqual(cree.ecartes, []);
});

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
