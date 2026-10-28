// Les textes de la phase 8 (ajuster un voyage) : repris de la maquette validée
// (docs/maquettes/ajuster/) et rangés dans fr.json, seule source des textes.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import fr from '../src/i18n/fr.json' with { type: 'json' };
import { remplir } from '../src/i18n/traduction.js';

const lire = cle => cle.split('.').reduce((branche, morceau) => branche?.[morceau], fr);
const estUnTexte = valeur =>
  typeof valeur === 'string' ||
  (typeof valeur === 'object' && valeur !== null && Object.values(valeur).every(v => typeof v === 'string'));
const pluriel = (cle, n) => lire(cle)[n > 1 ? 'other' : 'one'];
const NB = ' ';

const SIMPLES = [
  'voyage.ajouter',
  'voyage.vide.texte',
  'voyage.erreurModification',
  ...[
    'ajuster',
    'quantitePrevue',
    'calculee',
    'fixeeManuellement',
    'quantiteMoins',
    'quantitePlus',
    'renommer',
    'retirer',
  ].map(c => `fiche.${c}`),
  ...['titre', 'texte', 'garder', 'prevoir'].map(c => `ajustement.baisse.${c}`),
  ...['titre', 'bibliotheque', 'pieces', 'derniere', 'garder', 'retirer', 'bandeau', 'bandeauCategorie', 'erreur'].map(
    c => `ajustement.retrait.${c}`,
  ),
  ...[
    'titre',
    'voyageSeulement',
    'categorie',
    'objetsDansCeVoyage',
    'nouvelleSousTitre',
    'aChoisir',
    'aChoisirAide',
    'quantite',
    'pourToutLeVoyage',
    'ajouter',
    'abandon.titre',
    'abandon.texte',
    'erreur',
  ].map(c => `ajustement.ajout.${c}`),
  ...['titre', 'objets', 'nouvelle', 'pourCeVoyage'].map(c => `ajustement.choix.${c}`),
  ...['texte', 'choisir', 'abandonTitre'].map(c => `ajustement.nouvelleCategorie.${c}`),
  ...['titre', 'abandon'].map(c => `ajustement.renommer.${c}`),
  ...['question', 'questionTexte', 'non', 'oui', 'choixTitre', 'choixTexte', 'creer', 'suivant', 'ajouter', 'fait'].map(
    c => `ajustement.bibliotheque.${c}`,
  ),
  'modele.objet.erreurs.categorieManquante',
];
const PLURIELS = ['ajustement.retrait.pieces', 'ajustement.ajout.objetsDansCeVoyage', 'ajustement.choix.objets'];

const textes = valeur => (typeof valeur === 'string' ? [valeur] : Object.values(valeur));

test('chaque texte de la phase 8 existe', () => {
  for (const cle of SIMPLES) assert.ok(estUnTexte(lire(cle)), `texte manquant : ${cle}`);
  for (const cle of PLURIELS) {
    assert.ok(lire(cle)?.one && lire(cle)?.other, `pluriel one/other manquant : ${cle}`);
  }
});

test('typographie : insécable après « et avant », avant : ; ? !, apostrophes courbes', () => {
  for (const cle of [...SIMPLES, 'ajustement.renommer.abandon'])
    for (const texte of textes(lire(cle))) {
      assert.doesNotMatch(texte, /« /, `${cle} : espace ordinaire après «`);
      assert.doesNotMatch(texte, / [»:;?!]/, `${cle} : espace ordinaire avant » : ; ? !`);
      assert.equal(texte.includes("'"), false, `${cle} : apostrophe droite`);
    }
});

test('les phrases de la maquette sont reprises', () => {
  const t = (cle, valeurs) => remplir(lire(cle), valeurs);
  assert.equal(t('fiche.calculee', { regle: '1 par jour' }), `calculée${NB}: 1 par jour`);
  assert.equal(
    t('ajustement.baisse.texte', { nom: 'Bonnet', n: 2, quantite: 1 }),
    `Les 2 pièces de «${NB}Bonnet${NB}» sont déjà dans le sac. En prévoir 1 en sort une.`,
  );
  assert.equal(t('ajustement.baisse.garder', { n: 2 }), 'Garder 2');
  assert.equal(t('ajustement.baisse.prevoir', { quantite: 1 }), 'Prévoir 1');
  assert.equal(
    remplir(pluriel('ajustement.retrait.pieces', 1), { n: 1 }),
    'Sa pièce déjà dans le sac sort de la liste.',
  );
  assert.equal(
    remplir(pluriel('ajustement.retrait.pieces', 3), { n: 3 }),
    'Ses 3 pièces déjà dans le sac sortent de la liste.',
  );
  assert.equal(t('ajustement.retrait.titre', { nom: 'Pull' }), `Retirer «${NB}Pull${NB}» de ce voyage${NB}?`);
  assert.equal(
    t('ajustement.retrait.bandeauCategorie', { nom: 'Palmes', categorie: 'Plongée' }),
    `«${NB}Palmes${NB}» et la catégorie «${NB}Plongée${NB}» retirés du voyage`,
  );
  assert.equal(
    t('ajustement.bibliotheque.question', { nom: 'Gourde' }),
    `Ajouter aussi «${NB}Gourde${NB}» à la bibliothèque${NB}?`,
  );
  assert.equal(t('ajustement.bibliotheque.fait', { nom: 'Gourde' }), `«${NB}Gourde${NB}» est dans la bibliothèque.`);
  assert.equal(lire('voyage.vide.texte'), 'Ce voyage ne contient plus aucun objet. Ajoutez-en ici.');
  assert.equal(remplir(pluriel('ajustement.choix.objets', 1), { n: 1 }), '1 objet');
});

test('les icônes de la phase 8 sont embarquées (crayon, livres, corbeille)', () => {
  const source = readFileSync(new URL('../src/ecrans/icones.js', import.meta.url), 'utf8');
  for (const nom of ['pencil-simple', 'books', 'trash'])
    assert.ok(source.includes(`'@phosphor-icons/core/bold/${nom}-bold.svg?raw'`), nom);
  assert.match(source, /modifier: pencilSimple/);
  assert.match(source, /bibliotheque: books/);
  assert.match(source, /supprimer: trash/);
});
