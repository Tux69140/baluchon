// Les textes de la bibliothèque (phase 5) : repris de la maquette validée
// (docs/maquettes/bibliotheque/) et rangés dans fr.json, seule source des textes. Les 80 pictos du
// catalogue doivent avoir leur nom, leurs mots-clés, leur fichier et leur importation.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import fr from '../src/i18n/fr.json' with { type: 'json' };
import { CATALOGUE } from '../src/modele/catalogue.js';
import { COULEURS } from '../src/modele/modeles.js';

const lire = cle => cle.split('.').reduce((branche, morceau) => branche?.[morceau], fr);
const estUnTexte = valeur =>
  typeof valeur === 'string' ||
  (typeof valeur === 'object' && valeur !== null && typeof valeur.one === 'string' && typeof valeur.other === 'string');

const CLES = [
  'menu.ouvrir',
  'menu.fermer',
  'menu.reglages',
  'reglages.titre',
  'reglages.bibliotheque',
  'reglages.bibliothequeAide',
  ...[
    'titre',
    'categories',
    'objets',
    'toujoursIncluse',
    'ranger',
    'termine',
    'rangerAide',
    'monter',
    'descendre',
    'place',
    'nouvelleCategorie',
    'modifierCategorie',
    'modifier',
    'ajouterObjet',
    'consommable',
    'erreurEnregistrement',
    'erreurOrdre',
  ].map(c => `bibliotheque.${c}`),
  ...[
    'nom',
    'enregistrer',
    'inclusion',
    'toujoursIncluse',
    'toujoursInclus',
    'selonEtiquettes',
    'abandon.titre',
    'abandon.continuer',
    'abandon.abandonner',
  ].map(c => `modele.${c}`),
  ...[
    'nouvelle',
    'creer',
    'apparence',
    'changerPicto',
    'couleur',
    'aideToujours',
    'aideEtiquettes',
    'choisirEtiquettes',
    'abandonTexte',
    'abandonNouvelle',
    'erreurs.nomManquant',
    'erreurs.etiquettesManquantes',
  ].map(c => `modele.categorie.${c}`),
  ...[
    'nouveau',
    'ajouter',
    'regle',
    'pourQui',
    'dans',
    'quantite',
    'fixe',
    'parJour',
    'parNuit',
    'nombre',
    'chaqueJour',
    'chaqueNuit',
    'moins',
    'plus',
    'plafond',
    'plafondAucun',
    'plafondAuPlus',
    'plafondAuPlusParPersonne',
    'auPlus',
    'parPersonne',
    'partage',
    'exemple',
    'aIndiquer',
    'aIndiquerAide',
    'consommable',
    'consommableAide',
    'aideToujours',
    'aideEtiquettes',
    'choisirEtiquettes',
    'note',
    'noteAide',
    'abandonTexte',
    'abandonNouveau',
    'erreurs.nomManquant',
    'erreurs.valeurManquante',
    'erreurs.plafondManquant',
    'erreurs.etiquettesManquantes',
  ].map(c => `modele.objet.${c}`),
  ...['titre', 'chercher', 'indication', 'compte', 'trouves', 'aucun'].map(c => `catalogue.${c}`),
];

test('chaque texte de la bibliothèque existe', () => {
  for (const cle of CLES) assert.ok(estUnTexte(lire(cle)), `texte manquant : ${cle}`);
});

test('les valeurs reprennent la maquette, apostrophes typographiques', () => {
  assert.equal(lire('modele.objet.choisirEtiquettes').endsWith('qui le feront proposer.'), true);
  assert.equal(lire('modele.categorie.choisirEtiquettes').endsWith('qui la feront proposer.'), true);
  assert.equal(lire('bibliotheque.place'), '{nom} : place {n} sur {total}');
  assert.equal(lire('modele.objet.exemple'), 'Pour {jours}, {nuits} et {voyageurs} : {quantite}.');
  const tous = JSON.stringify(fr.modele) + JSON.stringify(fr.bibliotheque) + JSON.stringify(fr.catalogue);
  assert.equal(tous.includes("'"), false, 'apostrophe droite');
});

// Les huit couleurs d'une catégorie (maquette, données « COULEURS ») : leur nom est lu par le lecteur
// d'écran dans le nuancier de la fiche.
test('chaque couleur de catégorie a son nom, dans l’ordre de la maquette', () => {
  assert.deepEqual(COULEURS, ['corail', 'tournesol', 'abricot', 'pomme', 'lagon', 'ciel', 'framboise', 'lilas']);
  assert.deepEqual(
    COULEURS.map(cle => lire(`couleurs.${cle}`)),
    ['Corail', 'Tournesol', 'Abricot', 'Pomme', 'Lagon', 'Ciel', 'Framboise', 'Lilas'],
  );
  assert.equal(lire('modele.objet.regle'), 'Règle de quantité');
  assert.equal(lire('modele.objet.pourQui'), 'Pour qui');
});

test('chaque picto du catalogue a son nom, ses mots-clés, son fichier et son importation', () => {
  const source = readFileSync(new URL('../src/ecrans/pictos.js', import.meta.url), 'utf8');
  for (const { theme, pictos } of CATALOGUE) {
    assert.ok(lire(`catalogue.themes.${theme}`), `thème sans nom : ${theme}`);
    for (const cle of pictos) {
      assert.ok(lire(`catalogue.pictos.${cle}.nom`), `nom manquant : ${cle}`);
      assert.ok(lire(`catalogue.pictos.${cle}.mots`), `mots manquants : ${cle}`);
      assert.ok(
        existsSync(new URL(`../node_modules/@phosphor-icons/core/assets/duotone/${cle}-duotone.svg`, import.meta.url)),
        cle,
      );
      assert.ok(
        source.includes(`'@phosphor-icons/core/duotone/${cle}-duotone.svg?raw'`),
        `importation manquante : ${cle}`,
      );
    }
  }
});
