// Les textes de l'écran Étiquettes et de ses fiches (phase 6) : repris de la maquette validée
// (docs/maquettes/etiquettes/) et rangés dans fr.json, seule source des textes.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import fr from '../src/i18n/fr.json' with { type: 'json' };

const lire = cle => cle.split('.').reduce((branche, morceau) => branche?.[morceau], fr);
const estUnTexte = valeur =>
  typeof valeur === 'string' ||
  (typeof valeur === 'object' && valeur !== null && typeof valeur.one === 'string' && typeof valeur.other === 'string');

const CLES = [
  'reglages.etiquettes',
  'reglages.etiquettesAide',
  ...[
    'titre',
    'groupes',
    'etiquettes',
    'aide',
    'ranger',
    'rangerAide',
    'termine',
    'infos',
    'absent',
    'vide',
    'ajouter',
    'nouveauGroupe',
    'modifierGroupe',
    'modifierEtiquette',
    'monter',
    'descendre',
    'place',
    'listeEtiquettes',
    'erreurOrdre',
  ].map(c => `etiquettes.${c}`),
  ...[
    'nouveau',
    'creer',
    'sousTitreNeuf',
    'aucune',
    'aide',
    'abandonTexte',
    'abandonNouveau',
    'supprimer',
    'erreurs.nomManquant',
    'erreurs.nomPris',
  ].map(c => `modele.groupe.${c}`),
  ...[
    'nouvelle',
    'ajouter',
    'dans',
    'aide',
    'abandonTexte',
    'abandonNouvelle',
    'supprimer',
    'erreurs.nomManquant',
    'erreurs.nomPris',
    'erreurs.nomPrisIci',
  ].map(c => `modele.etiquette.${c}`),
  ...[
    'garder',
    'supprimer',
    'etiquetteTitre',
    'etiquetteSuite',
    'groupeTitre',
    'groupeEtiquettes',
    'voyages',
    'erreur',
  ].map(c => `suppression.${c}`),
];

// Les textes de la phase 6 remplacés par la question chiffrée de la phase 7 n'existent plus.
test('chaque texte de l’écran Étiquettes existe, les anciennes questions de suppression non', () => {
  for (const cle of CLES) assert.ok(estUnTexte(lire(cle)), `texte manquant : ${cle}`);
  for (const cle of ['etiquetteTexte', 'groupeTexte', 'groupeVide'])
    assert.equal(lire(`suppression.${cle}`), undefined, `texte remplacé encore là : suppression.${cle}`);
});

test('les valeurs reprennent la maquette, apostrophes typographiques', () => {
  assert.equal(lire('etiquettes.place'), '{nom} : place {n} sur {total}');
  assert.equal(lire('etiquettes.infos'), '{etiquettes} · étape {n} de « Nouveau voyage »');
  assert.equal(lire('modele.etiquette.erreurs.nomPrisIci'), 'L’étiquette « {nom} » existe déjà dans ce groupe.');
  assert.equal(
    lire('suppression.groupeEtiquettes').one.startsWith('Son étiquette {etiquettes} sera supprimée aussi'),
    true,
  );
  assert.equal(
    lire('suppression.groupeEtiquettes').other.startsWith('Ses étiquettes {etiquettes} seront supprimées'),
    true,
  );
  const tous = JSON.stringify([fr.etiquettes, fr.suppression, fr.modele.groupe, fr.modele.etiquette]);
  assert.equal(tous.includes("'"), false, 'apostrophe droite');
});

test('l’icône « supprimer » est importée (trash, Bold)', () => {
  const source = readFileSync(new URL('../src/ecrans/icones.js', import.meta.url), 'utf8');
  assert.ok(source.includes("'@phosphor-icons/core/bold/trash-bold.svg?raw'"));
  assert.match(source, /supprimer: trash/);
});
