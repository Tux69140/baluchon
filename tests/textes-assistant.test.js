// Les textes de l'assistant « Nouveau voyage » complet (phase 4) : repris de la maquette validée
// (docs/maquettes/assistant/maquette.js, objet T) et rangés dans fr.json, seule source des textes.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fr from '../src/i18n/fr.json' with { type: 'json' };

const lire = cle => cle.split('.').reduce((branche, morceau) => branche?.[morceau], fr);

// Une clé est un texte, ou un objet { one, other } pour les pluriels.
const estUnTexte = valeur =>
  typeof valeur === 'string' ||
  (typeof valeur === 'object' && valeur !== null && typeof valeur.one === 'string' && typeof valeur.other === 'string');

const CLES_TEXTES = [
  'nouveauVoyage.etapes',
  'nouveauVoyage.etape.informations',
  'nouveauVoyage.etape.apercu',
  'nouveauVoyage.legende',
  'nouveauVoyage.precedent',
  'nouveauVoyage.suivant',
  'nouveauVoyage.voirApercu',
  'nouveauVoyage.aideGroupe',
  'nouveauVoyage.choisies',
  'nouveauVoyage.aucuneChoisie',
  'nouveauVoyage.retenus',
  'nouveauVoyage.aideApercu',
  'nouveauVoyage.vide.titre',
  'nouveauVoyage.vide.texte',
  'nouveauVoyage.vide.revenir',
  'nouveauVoyage.toutEcarte',
  'nouveauVoyage.abandon.titre',
  'nouveauVoyage.abandon.texte',
  'nouveauVoyage.abandon.continuer',
  'nouveauVoyage.abandon.abandonner',
  'nouveauVoyage.ecartes.titre',
  'nouveauVoyage.ecartes.texte',
  'nouveauVoyage.ecartes.garder',
  'nouveauVoyage.ecartes.remettre',
  'nouveauVoyage.case.objet',
  'nouveauVoyage.case.categorie',
  'voyage.etiquettes',
];

for (const cle of CLES_TEXTES) {
  test(`le texte « ${cle} » existe dans fr.json`, () => {
    assert.ok(estUnTexte(lire(cle)), `${cle} doit être un texte ou un { one, other }`);
  });
}

test('les pluriels portent la forme { one, other } attendue', () => {
  assert.equal(fr.nouveauVoyage.choisies.one, '1 étiquette choisie');
  assert.equal(fr.nouveauVoyage.choisies.other, '{n} étiquettes choisies');
  assert.equal(fr.nouveauVoyage.retenus.one, '{n} objet retenu sur {total}');
  assert.equal(fr.nouveauVoyage.retenus.other, '{n} objets retenus sur {total}');
});

test('les textes gardent les apostrophes typographiques', () => {
  assert.equal(fr.nouveauVoyage.voirApercu, 'Voir l’aperçu');
  assert.equal(
    fr.nouveauVoyage.aideApercu,
    'Décochez ce que vous n’emporterez pas. Rien n’est créé avant « Créer le voyage ».',
  );
  assert.equal(fr.nouveauVoyage.abandon.titre, 'Abandonner ce nouveau voyage ?');
});

test('les textes de la maquette reprennent leurs mots exacts', () => {
  assert.equal(fr.nouveauVoyage.legende, 'Étape {n} sur {total} · {nom}');
  assert.equal(fr.nouveauVoyage.aucuneChoisie, 'Aucune étiquette choisie : ce groupe n’ajoute rien.');
  assert.equal(
    fr.nouveauVoyage.toutEcarte,
    'Vous avez écarté tous les objets. Recochez ceux à emporter pour créer le voyage.',
  );
  assert.equal(fr.nouveauVoyage.case.categorie, '{nom} : {retenus} sur {total} retenus');
  assert.equal(fr.nouveauVoyage.case.objet, '{nom}, {quantite}');
  assert.equal(fr.voyage.etiquettes, 'Étiquettes du voyage');
});
