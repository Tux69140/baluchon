// Règles d'un ajustement de voyage : ajouter, régler la quantité, retirer, préremplir la bibliothèque (phase 8).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  aUneFormuleInitiale,
  boutonsDeQuantite,
  extraitDuRetrait,
  preparerAjout,
  quantiteGardee,
  reglageDeQuantite,
  saisieCategoriePourLaBibliotheque,
  saisieObjetPourLaBibliotheque,
  validerAjout,
  validerNouvelleCategorie,
  validerRenommage,
} from '../src/modele/ajustements.js';
import { validerCategorie, validerObjet } from '../src/modele/modeles.js';

let n = 0;
const contexte = { nouvelId: () => `id${++n}`, maintenant: '2026-10-28T10:00:00.000Z' };
const categorie = (id, ordre) => ({
  id,
  voyageId: 'v1',
  modeleId: 'm' + id,
  nom: id,
  icone: 'tshirt',
  couleur: 'corail',
  ordre,
  modifieLe: 'x',
});
const objet = (id, categorieId, extra = {}) => ({
  id,
  voyageId: 'v1',
  categorieId,
  modeleId: 'mo' + id,
  nom: id,
  regle: 'par_jour',
  valeur: 1,
  plafond: 5,
  parPersonne: true,
  consommable: true,
  quantite: 4,
  quantiteManuelle: false,
  dansLeSac: 2,
  aAcheter: true,
  achetes: 0,
  note: 'n',
  modifieLe: 'x',
  ...extra,
});
const contenu = {
  voyage: { id: 'v1' },
  etiquettes: [],
  categories: [categorie('c1', 0), categorie('c2', 4)],
  objets: [objet('o1', 'c1'), objet('o2', 'c1'), objet('o3', 'c2')],
};

test('un objet ajouté est fixé manuellement et ne dit pas partagé', () => {
  const { categorie: cat, objet: o } = preparerAjout(
    { nom: '  Lampe ', categorie: 'c1', quantite: 3 },
    contenu,
    contexte,
  );
  assert.equal(cat, null);
  assert.deepEqual(o, {
    id: o.id,
    voyageId: 'v1',
    categorieId: 'c1',
    modeleId: null,
    nom: 'Lampe',
    regle: 'fixe',
    valeur: 0,
    plafond: null,
    parPersonne: true,
    consommable: false,
    quantite: 3,
    quantiteManuelle: true,
    dansLeSac: 0,
    aAcheter: false,
    achetes: 0,
    note: '',
    modifieLe: contexte.maintenant,
  });
});

test('seul un objet venu d’un calcul garde sa formule initiale, pas un objet ajouté à la main', () => {
  const { objet: ajoute } = preparerAjout({ nom: 'Lampe', categorie: 'c1', quantite: 3 }, contenu, contexte);
  assert.equal(aUneFormuleInitiale(ajoute), false);
  // Mis ensuite dans la bibliothèque, il est lié à un modèle mais n'a toujours pas eu de formule.
  assert.equal(aUneFormuleInitiale({ ...ajoute, modeleId: 'm1' }), false);
  // Copié de la bibliothèque, « 1 par personne » sans plafond est bien une formule, lié ou non.
  const brosse = { ...ajoute, valeur: 1, modeleId: 'm2' };
  assert.equal(aUneFormuleInitiale(brosse), true);
  assert.equal(aUneFormuleInitiale({ ...brosse, modeleId: null }), true);
  assert.equal(aUneFormuleInitiale({ ...brosse, regle: 'par_jour', parPersonne: false, plafond: 2 }), true);
});

test('la quantité d’un objet ajouté vaut 1 par défaut et reste bornée', () => {
  assert.equal(preparerAjout({ nom: 'a', categorie: 'c1' }, contenu, contexte).objet.quantite, 1);
  assert.equal(preparerAjout({ nom: 'a', categorie: 'c1', quantite: 5000 }, contenu, contexte).objet.quantite, 999);
});

test('une catégorie neuve prend le rang suivant et naît avec l’objet', () => {
  const nouvelle = { nom: ' Jeux ', icone: 'dice', couleur: 'bleu' };
  const { categorie: cat, objet: o } = preparerAjout({ nom: 'Cartes', categorie: { nouvelle } }, contenu, contexte);
  assert.deepEqual(cat, {
    id: cat.id,
    voyageId: 'v1',
    modeleId: null,
    nom: 'Jeux',
    icone: 'dice',
    couleur: 'bleu',
    ordre: 5,
    modifieLe: contexte.maintenant,
  });
  assert.equal(o.categorieId, cat.id);
});

test('ajouter sans nom ou sans catégorie est refusé', () => {
  assert.deepEqual(validerAjout({ nom: ' ', categorie: null }), {
    nom: 'nomManquant',
    categorie: 'categorieManquante',
  });
  assert.deepEqual(validerAjout({ nom: 'a', categorie: 'c1' }), {});
  assert.deepEqual(validerAjout({ nom: 'a', categorie: { nouvelle: { nom: 'x' } } }), {});
  assert.deepEqual(validerNouvelleCategorie({ nom: ' ' }), { nom: 'nomManquant' });
  assert.deepEqual(validerNouvelleCategorie({ nom: 'x' }), {});
  // Renommer un objet du voyage : le nom seul, obligatoire.
  assert.deepEqual(validerRenommage({ nom: '  ' }), { nom: 'nomManquant' });
  assert.deepEqual(validerRenommage({ nom: 'Bonnet de laine' }), {});
  assert.throws(() => preparerAjout({ nom: '', categorie: 'c1' }, contenu, contexte), {
    erreurs: { nom: 'nomManquant' },
  });
});

test('moins est inactif à 1, plus à 999 et au-delà', () => {
  assert.deepEqual(boutonsDeQuantite({ quantite: 1 }), { moins: false, plus: true });
  assert.deepEqual(boutonsDeQuantite({ quantite: 2 }), { moins: true, plus: true });
  assert.deepEqual(boutonsDeQuantite({ quantite: 999 }), { moins: true, plus: false });
  assert.deepEqual(boutonsDeQuantite({ quantite: 1200 }), { moins: true, plus: false });
});

test('baisser sous ce qui est dans le sac demande confirmation et fait suivre le sac', () => {
  assert.deepEqual(reglageDeQuantite({ quantite: 4, dansLeSac: 3 }, 2), { quantite: 2, dansLeSac: 2, confirmer: true });
});

test('monter ne demande rien', () => {
  assert.deepEqual(reglageDeQuantite({ quantite: 4, dansLeSac: 3 }, 5), {
    quantite: 5,
    dansLeSac: 3,
    confirmer: false,
  });
  assert.deepEqual(reglageDeQuantite({ quantite: 4, dansLeSac: 3 }, 3), {
    quantite: 3,
    dansLeSac: 3,
    confirmer: false,
  });
});

test('le retrait du dernier objet emporte sa catégorie dans l’extrait', () => {
  const dernier = extraitDuRetrait(contenu, 'o3');
  assert.deepEqual(dernier, { categorie: contenu.categories[1], objet: contenu.objets[2] });
  const parmiD = extraitDuRetrait(contenu, 'o1');
  assert.deepEqual(parmiD, { categorie: null, objet: contenu.objets[0] });
});

test('les saisies préremplies passent la validation des fiches une fois une étiquette choisie', () => {
  const o = saisieObjetPourLaBibliotheque(objet('o1', 'c1', { quantite: 1500, nom: 'Lampe' }));
  assert.deepEqual(o, {
    nom: 'Lampe',
    regle: 'fixe',
    valeur: 999,
    plafond: null,
    parPersonne: false,
    consommable: false,
    selonEtiquettes: true,
    etiquettes: [],
    note: '',
  });
  assert.deepEqual(validerObjet(o), { etiquettes: 'etiquettesManquantes' });
  assert.deepEqual(validerObjet({ ...o, etiquettes: ['e1'] }), {});
  const c = saisieCategoriePourLaBibliotheque(contenu.categories[0]);
  assert.deepEqual(c, { nom: 'c1', icone: 'tshirt', couleur: 'corail', selonEtiquettes: true, etiquettes: [] });
  assert.deepEqual(validerCategorie(c), { etiquettes: 'etiquettesManquantes' });
  assert.deepEqual(validerCategorie({ ...c, etiquettes: ['e1'] }), {});
});

// Phase 10 : « Plus tard » garde les pièces de trop dans le sac, jusqu'à ce qu'on confirme leur sortie.
test('baisser avec « Plus tard » garde le sac tel quel', () => {
  assert.deepEqual(reglageDeQuantite({ quantite: 4, dansLeSac: 4 }, 3, { plusTard: true }), {
    quantite: 3,
    dansLeSac: 4,
    confirmer: true,
  });
});

// « Le garder dans le voyage » (phase 10) : la quantité que donne sa formule pour ce voyage, sinon ses
// pièces dans le sac, fixées manuellement.
test('un objet retiré gardé reprend sa formule, ou ses pièces faute de formule', () => {
  const voyage = { depart: '2026-10-10', retour: '2026-10-13', voyageurs: 2 };
  const retire = objet('o1', 'c1', { quantite: 0, dansLeSac: 3, plafond: null });
  assert.deepEqual(quantiteGardee(retire, voyage), { quantite: 8, quantiteManuelle: false, achetes: 0 });
  // Relecture finale, défaut 2 : tout entier dans le sac, un objet à acheter compte comme acheté.
  const aLaMain = { ...retire, valeur: 0, regle: 'fixe', quantiteManuelle: true };
  assert.deepEqual(quantiteGardee(aLaMain, voyage), { quantite: 3, quantiteManuelle: true, achetes: 3 });
  const parNuit = { ...retire, regle: 'par_nuit' };
  assert.deepEqual(quantiteGardee(parNuit, { ...voyage, retour: '2026-10-10' }), {
    quantite: 3,
    quantiteManuelle: true,
    achetes: 3,
  });
});
