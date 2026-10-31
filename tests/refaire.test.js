// « Refaire ce voyage » (docs/PLAN.md, phase 11 ; conception
// docs/superpowers/specs/2026-10-30-phase-11-refaire-supprimer-design.md, décisions 1 à 7 et 12) : ce
// qu'un voyage refait reprend du voyage d'origine, sur la bibliothèque actuelle. Ce qu'en écrit la
// génération du voyage : tests/refaire-voyage.test.js.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { raisonVide } from '../src/ecrans/assistant.js';
import { apercuRefait, repriseDe } from '../src/modele/refaire.js';
import { genererVoyage } from '../src/modele/voyage.js';
import { MAINTENANT, bibliotheque, compteur, infos, objetDuVoyage, origine } from './outils/refaire-donnees.mjs';

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
