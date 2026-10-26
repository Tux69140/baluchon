// Les textes des suppressions sûres (phase 7) : repris de la maquette validée
// (docs/maquettes/suppressions/) et rangés dans fr.json, seule source des textes.
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

const CLES = [
  ...[
    'voyages',
    'objetTitre',
    'objetTexte',
    'categorieTitre',
    'categorieObjets',
    'categorieTexte',
    'etiquetteSuite',
    'groupeEtiquettes',
    'objets',
    'categories',
    'perteEtiquette',
    'perteGroupe',
  ].map(c => `suppression.${c}`),
  ...['titre', 'etiquette', 'groupe', 'reste', 'categorie', 'objet', 'libre', 'regle', 'toutRegle', 'fermer'].map(
    c => `refus.${c}`,
  ),
  ...['objet', 'categorie', 'categorieVide', 'etiquette', 'groupe', 'groupeVide', 'annuler', 'erreur'].map(
    c => `annulation.${c}`,
  ),
  'modele.categorie.supprimer',
  'modele.objet.supprimer',
];

const textes = valeur => (typeof valeur === 'string' ? [valeur] : Object.values(valeur));

test('chaque texte des suppressions existe', () => {
  for (const cle of CLES) assert.ok(estUnTexte(lire(cle)), `texte manquant : ${cle}`);
});

test('aucun espace ordinaire autour des guillemets ni devant : ; ? !', () => {
  for (const cle of CLES)
    for (const texte of textes(lire(cle))) {
      assert.doesNotMatch(texte, /« /, `${cle} : espace après «`);
      assert.doesNotMatch(texte, / [»:;?!]/, `${cle} : espace avant » : ; ? !`);
    }
});

test('les phrases de la maquette sont reprises', () => {
  const objets = remplir(pluriel('suppression.objets', 3), { n: 3 });
  assert.equal(
    remplir(pluriel('suppression.categorieObjets', 3), { compte: objets }),
    'Ses 3 objets seront supprimés aussi.',
  );
  assert.equal(
    remplir(lire('suppression.perteEtiquette.objet'), { compte: remplir(pluriel('suppression.objets', 1), { n: 1 }) }),
    '1 objet perdra cette étiquette ; il garde ses autres étiquettes.',
  );
  assert.equal(
    remplir(lire('suppression.perteEtiquette.plusieurs'), { compte: '1 objet et 1 catégorie' }),
    '1 objet et 1 catégorie perdront cette étiquette ; ils gardent leurs autres étiquettes.',
  );
  assert.equal(remplir(lire('refus.titre'), { nom: 'Plage' }), 'Impossible de supprimer « Plage » pour l’instant');
  assert.equal(remplir(lire('annulation.objet'), { nom: 'Pull' }), 'Objet « Pull » supprimé');
  assert.ok(lire('refus.groupe').one.startsWith('Sans ses étiquettes, cet élément'));
});

test('apostrophes typographiques', () => {
  const tous = JSON.stringify([fr.suppression, fr.refus, fr.annulation, fr.modele.categorie, fr.modele.objet]);
  assert.equal(tous.includes("'"), false, 'apostrophe droite');
});

test('l’icône « annuler » est importée (arrow-counter-clockwise, Bold)', () => {
  const source = readFileSync(new URL('../src/ecrans/icones.js', import.meta.url), 'utf8');
  assert.ok(source.includes("'@phosphor-icons/core/bold/arrow-counter-clockwise-bold.svg?raw'"));
  assert.match(source, /annuler: arrowCounterClockwise/);
});
