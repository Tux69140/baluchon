// Édition des modèles de la bibliothèque : saisie, validation, préparation, rangement (phase 5).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  BORNES_QUANTITE,
  PERIODE_EXEMPLE,
  activerPlafond,
  bornerQuantite,
  changerRegle,
  deplacerCategorie,
  exempleQuantite,
  lireNombre,
  preparerCategorie,
  regleDeSaisie,
  preparerObjet,
  saisieDeCategorie,
  saisieDObjet,
  validerCategorie,
  validerObjet,
} from '../src/modele/modeles.js';

const contexte = { nouvelId: () => 'nouveau', maintenant: '2026-10-25T10:00:00.000Z' };
const pates = { ...saisieDObjet(null), nom: 'Pâtes' };

test('les constantes de la phase', () => {
  assert.deepEqual(BORNES_QUANTITE, { min: 1, max: 999 });
  assert.deepEqual(PERIODE_EXEMPLE, { jours: 4, nuits: 3, voyageurs: 2 });
});

test('saisies par défaut', () => {
  assert.deepEqual(saisieDObjet(null), {
    nom: '',
    regle: 'fixe',
    valeur: 1,
    plafondActif: false,
    plafond: null,
    parPersonne: true,
    consommable: false,
    selonEtiquettes: false,
    etiquettes: [],
    note: '',
  });
  assert.deepEqual(saisieDeCategorie(null), {
    nom: '',
    icone: 'suitcase-rolling',
    couleur: 'corail',
    selonEtiquettes: false,
    etiquettes: [],
  });
});

test('saisies tirées d’un modèle existant', () => {
  const objet = {
    id: 'o1',
    categorieId: 'c1',
    nom: 'T-shirts',
    regle: 'par_jour',
    valeur: 1,
    plafond: 5,
    parPersonne: true,
    consommable: false,
    toujoursInclus: false,
    note: 'n',
    modifieLe: 'x',
    etiquettes: ['camping'],
  };
  assert.deepEqual(saisieDObjet(objet), {
    nom: 'T-shirts',
    regle: 'par_jour',
    valeur: 1,
    plafondActif: true,
    plafond: 5,
    parPersonne: true,
    consommable: false,
    selonEtiquettes: true,
    etiquettes: ['camping'],
    note: 'n',
  });
  assert.equal(saisieDObjet({ ...objet, plafond: null }).plafondActif, false);
  const categorie = {
    id: 'c1',
    nom: 'Camping',
    icone: 'tent',
    couleur: 'abricot',
    ordre: 3,
    toujoursIncluse: true,
    modifieLe: 'x',
    etiquettes: [],
  };
  assert.deepEqual(saisieDeCategorie(categorie), {
    nom: 'Camping',
    icone: 'tent',
    couleur: 'abricot',
    selonEtiquettes: false,
    etiquettes: [],
  });
});

test('validerObjet : nom, valeur, plafond, étiquettes', () => {
  assert.deepEqual(validerObjet(pates), {});
  assert.equal(validerObjet({ ...pates, nom: '' }).nom, 'nomManquant');
  assert.equal(validerObjet({ ...pates, nom: '   ' }).nom, 'nomManquant');
  assert.equal(validerObjet({ ...pates, valeur: null }).valeur, 'valeurManquante');
  const sansPlafond = { ...pates, regle: 'par_jour', plafondActif: true, plafond: null };
  assert.equal(validerObjet(sansPlafond).plafond, 'plafondManquant');
  // Un plafond n'existe pas avec « fixe » : il n'est pas jugé.
  assert.deepEqual(validerObjet({ ...sansPlafond, regle: 'fixe' }), {});
  assert.deepEqual(validerObjet({ ...sansPlafond, plafondActif: false }), {});
  assert.equal(validerObjet({ ...pates, selonEtiquettes: true }).etiquettes, 'etiquettesManquantes');
  assert.deepEqual(validerObjet({ ...pates, selonEtiquettes: true, etiquettes: ['camping'] }), {});
});

test('validerCategorie : nom et étiquettes', () => {
  const base = { ...saisieDeCategorie(null), nom: 'Camping' };
  assert.deepEqual(validerCategorie(base), {});
  assert.equal(validerCategorie({ ...base, nom: ' ' }).nom, 'nomManquant');
  assert.equal(validerCategorie({ ...base, selonEtiquettes: true }).etiquettes, 'etiquettesManquantes');
});

test('lireNombre : chiffres seuls, borné, vide refusé', () => {
  assert.equal(lireNombre('0'), 1);
  assert.equal(lireNombre('1000'), 999);
  assert.equal(lireNombre('12a'), 12);
  assert.equal(lireNombre(''), null);
  assert.equal(lireNombre('abc'), null);
  assert.equal(lireNombre('7'), 7);
});

test('preparerObjet : nom nettoyé, plafond, étiquettes, identité', () => {
  const o = preparerObjet({ ...pates, nom: '  Pâtes  ' }, { ...contexte, categorieId: 'c1' });
  assert.equal(o.nom, 'Pâtes');
  assert.equal(o.id, 'nouveau');
  assert.equal(o.categorieId, 'c1');
  assert.equal(o.modifieLe, contexte.maintenant);
  assert.equal(o.toujoursInclus, true);
  assert.deepEqual(o.etiquettes, []);
  const fixe = preparerObjet({ ...pates, plafondActif: true, plafond: 5 }, { ...contexte, categorieId: 'c1' });
  assert.equal(fixe.plafond, null);
  const jour = preparerObjet(
    { ...pates, regle: 'par_jour', valeur: 2, plafondActif: true, plafond: 6 },
    { ...contexte, categorieId: 'c1' },
  );
  assert.equal(jour.plafond, 6);
  const inactif = preparerObjet({ ...pates, regle: 'par_jour', plafond: 6 }, { ...contexte, categorieId: 'c1' });
  assert.equal(inactif.plafond, null);
  const camping = preparerObjet(
    { ...pates, selonEtiquettes: true, etiquettes: ['camping'] },
    { ...contexte, categorieId: 'c1' },
  );
  assert.equal(camping.toujoursInclus, false);
  assert.deepEqual(camping.etiquettes, ['camping']);
});

test('preparerObjet : un existant garde son identifiant et sa catégorie', () => {
  const existant = { id: 'o9', categorieId: 'c9' };
  const o = preparerObjet(pates, { ...contexte, existant, categorieId: 'autre' });
  assert.equal(o.id, 'o9');
  assert.equal(o.categorieId, 'c9');
});

test('preparerObjet refuse une saisie invalide avec ses erreurs', () => {
  assert.throws(
    () => preparerObjet({ ...pates, nom: '' }, { ...contexte, categorieId: 'c1' }),
    e => e.erreurs.nom === 'nomManquant',
  );
});

test('preparerCategorie : neuve en dernier, existante inchangée de place', () => {
  const categories = [0, 1, 2, 3, 4].map(ordre => ({ id: `c${ordre}`, ordre }));
  const saisie = { ...saisieDeCategorie(null), nom: ' Camping ' };
  const neuve = preparerCategorie(saisie, { ...contexte, existante: null, categories });
  assert.equal(neuve.ordre, 5);
  assert.equal(neuve.nom, 'Camping');
  assert.equal(neuve.id, 'nouveau');
  assert.equal(neuve.toujoursIncluse, true);
  assert.equal(preparerCategorie(saisie, { ...contexte, existante: null, categories: [] }).ordre, 0);
  const existante = { id: 'c2', ordre: 2 };
  const modifiee = preparerCategorie(
    { ...saisie, selonEtiquettes: true, etiquettes: ['camping'] },
    { ...contexte, existante, categories },
  );
  assert.equal(modifiee.id, 'c2');
  assert.equal(modifiee.ordre, 2);
  assert.equal(modifiee.toujoursIncluse, false);
  assert.deepEqual(modifiee.etiquettes, ['camping']);
  assert.throws(
    () => preparerCategorie({ ...saisie, nom: '' }, { ...contexte, existante: null, categories }),
    e => e.erreurs.nom === 'nomManquant',
  );
});

test('deplacerCategorie : échange avec le voisin, inchangé aux bords', () => {
  assert.deepEqual(deplacerCategorie(['a', 'b', 'c'], 'c', -1), ['a', 'c', 'b']);
  assert.deepEqual(deplacerCategorie(['a', 'b', 'c'], 'a', 1), ['b', 'a', 'c']);
  assert.deepEqual(deplacerCategorie(['a', 'b', 'c'], 'a', -1), ['a', 'b', 'c']);
  assert.deepEqual(deplacerCategorie(['a', 'b', 'c'], 'c', 1), ['a', 'b', 'c']);
  const ids = ['a', 'b'];
  deplacerCategorie(ids, 'a', 1);
  assert.deepEqual(ids, ['a', 'b']);
});

test('exempleQuantite : 4 jours, 3 nuits, 2 voyageurs', () => {
  const repas = { regle: 'par_jour', valeur: 2, plafond: null, parPersonne: true };
  assert.equal(exempleQuantite(repas), 16);
  assert.equal(exempleQuantite({ ...repas, plafond: 6 }), 12);
});

// Les règles de la fiche d'un objet vivent dans le modèle : l'écran (− / +, phrase de quantité,
// exemple, « Fixe ») les appelle, et ce qu'il montre est ce qui sera enregistré.
test('bornerQuantite : ramenée de 1 à 999', () => {
  assert.equal(bornerQuantite(0), 1);
  assert.equal(bornerQuantite(-3), 1);
  assert.equal(bornerQuantite(1000), 999);
  assert.equal(bornerQuantite(42), 42);
});

test('regleDeSaisie : la règle enregistrée, plafond seulement s’il est actif et possible', () => {
  const jour = { ...pates, regle: 'par_jour', valeur: 2, plafondActif: true, plafond: 6 };
  assert.deepEqual(regleDeSaisie(jour), { regle: 'par_jour', valeur: 2, plafond: 6, parPersonne: true });
  assert.equal(regleDeSaisie({ ...jour, plafondActif: false }).plafond, null);
  assert.equal(regleDeSaisie({ ...jour, regle: 'fixe' }).plafond, null);
  assert.equal(regleDeSaisie({ ...jour, plafond: null }).plafond, null);
  // preparerObjet écrit la même règle.
  const ecrit = preparerObjet(jour, { ...contexte, categorieId: 'c1' });
  assert.deepEqual(
    { regle: ecrit.regle, valeur: ecrit.valeur, plafond: ecrit.plafond, parPersonne: ecrit.parPersonne },
    regleDeSaisie(jour),
  );
});

test('changerRegle : « Fixe » efface le plafond, les autres le gardent', () => {
  const jour = { ...pates, regle: 'par_jour', valeur: 2, plafondActif: true, plafond: 6 };
  const fixe = changerRegle(jour, 'fixe');
  assert.equal(fixe.regle, 'fixe');
  assert.equal(fixe.plafondActif, false);
  assert.equal(fixe.plafond, null);
  assert.equal(jour.plafond, 6, 'la saisie reçue n’est pas modifiée');
  const nuit = changerRegle(jour, 'par_nuit');
  assert.equal(nuit.regle, 'par_nuit');
  assert.equal(nuit.plafond, 6);
});

test('activerPlafond : allumé, il propose le nombre choisi ; éteint, il s’efface', () => {
  const jour = { ...pates, regle: 'par_jour', valeur: 2 };
  assert.deepEqual([activerPlafond(jour, true).plafondActif, activerPlafond(jour, true).plafond], [true, 2]);
  assert.equal(activerPlafond({ ...jour, plafond: 5 }, true).plafond, 5);
  assert.equal(activerPlafond({ ...jour, valeur: null }, true).plafond, 1);
  const eteint = activerPlafond({ ...jour, plafondActif: true, plafond: 5 }, false);
  assert.deepEqual([eteint.plafondActif, eteint.plafond], [false, null]);
});
