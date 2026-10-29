// Les textes de la phase 8 (ajuster un voyage) : repris de la maquette validée
// (docs/maquettes/ajuster/) et rangés dans fr.json, seule source des textes. La phase 10 a remplacé
// « Retirer N » et « … sort de la liste » par « Plus tard » et « C’est fait » (décision du chef de projet,
// 2026-10-29 ; maquette docs/maquettes/plans-changent/).
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
    'fixeeAvecFormule',
    'quantiteMoins',
    'quantitePlus',
    'renommer',
    'retirer',
  ].map(c => `fiche.${c}`),
  ...['titre', 'texte', 'garder', 'suite'].map(c => `ajustement.baisse.${c}`),
  ...[
    'titre',
    'bibliotheque',
    'sortir',
    'derniere',
    'garder',
    'retirer',
    'bandeau',
    'bandeauCategorie',
    'bandeauPlusieurs',
    'erreur',
  ].map(c => `ajustement.retrait.${c}`),
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
  ...['plusTard', 'fait', 'garder', 'texte', 'suite', 'ligne', 'ligneRetire', 'rappel', 'rappelRetire'].map(
    c => `sortie.${c}`,
  ),
  ...['aSortir', 'retire', 'marqueSortir', 'case.sortir'].map(c => `voyage.${c}`),
];
const PLURIELS = [
  'ajustement.pieces',
  'ajustement.baisse.titre',
  'ajustement.baisse.texte',
  'ajustement.baisse.suite',
  'ajustement.retrait.sortir',
  'ajustement.retrait.bandeauPlusieurs',
  'sortie.ligne',
  'sortie.rappel',
  'voyage.aSortir',
  'ajustement.ajout.objetsDansCeVoyage',
  'ajustement.choix.objets',
];

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
  // La formule d'origine, en bref, sur la même ligne (décision du chef de projet, 2026-10-29).
  assert.equal(t('fiche.fixeeAvecFormule', { regle: '2 / jour' }), 'fixée manuellement · initialement 2 / jour');
  // « 2 pièces », un morceau à part : l'écran le met en gras dans la phrase (comme la phase 7).
  const pieces = n => remplir(pluriel('ajustement.pieces', n), { n });
  // La question vient à la fermeture de la fiche : elle compte les pièces qui sortent (2026-10-29).
  const baisse = (cle, n, valeurs) => remplir(pluriel(`ajustement.baisse.${cle}`, n), { n, ...valeurs });
  assert.equal(baisse('titre', 1), `Sortir une pièce du sac${NB}?`);
  assert.equal(baisse('titre', 3), `Sortir 3 pièces du sac${NB}?`);
  assert.equal(
    baisse('texte', 1, { nom: 'Bonnet', compte: pieces(2), quantite: 1 }),
    `Les 2 pièces de «${NB}Bonnet${NB}» sont déjà dans le sac. En prévoir 1 en sort une.`,
  );
  assert.equal(
    baisse('texte', 3, { nom: 'Chaussettes', compte: pieces(8), quantite: 5 }),
    `Les 8 pièces de «${NB}Chaussettes${NB}» sont déjà dans le sac. En prévoir 5 en sort 3.`,
  );
  assert.equal(t('ajustement.baisse.garder', { n: 2 }), 'Garder 2');
  assert.equal(
    pluriel('ajustement.baisse.suite', 1),
    `Sortez-la, puis touchez «${NB}C’est fait${NB}». «${NB}Plus tard${NB}»${NB}: elle reste signalée par un «${NB}!${NB}» dans la liste.`,
  );
  assert.equal(
    remplir(pluriel('ajustement.retrait.sortir', 3), { compte: pieces(3) }),
    `Ses 3 pièces sont dans le sac${NB}: sortez-les, puis touchez «${NB}C’est fait${NB}». «${NB}Plus tard${NB}»${NB}: il reste barré dans la liste, avec un «${NB}!${NB}», jusqu’à ce qu’elles soient sorties.`,
  );
  assert.deepEqual(
    [lire('sortie.plusTard'), lire('sortie.fait'), lire('sortie.garder')],
    ['Plus tard', 'C’est fait', 'Le garder dans le voyage'],
  );
  assert.equal(remplir(pluriel('voyage.aSortir', 1), { n: 1 }), '1 à sortir du sac');
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
