// Les règles du sac : pièces, progression, ordre (docs/PRD.md, « Écrans et gestes »).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  appuiSurCase,
  bornerDansLeSac,
  categorieSuivante,
  estBouclee,
  estComplet,
  estFini,
  estRetire,
  etatDansLeSac,
  ordreDansLeSac,
  piecesASortir,
  progression,
  progressionParVoyage,
  viderDemandeConfirmation,
} from '../src/modele/sac.js';

const o = (dansLeSac, quantite, nom = 'Repas') => ({ nom, dansLeSac, quantite });

test('un objet est complet quand le sac contient sa quantité, sans pièce de trop', () => {
  assert.equal(estComplet(o(16, 16)), true);
  assert.equal(estComplet(o(15, 16)), false);
});

test('la case ajoute une pièce, et un objet plein se vide', () => {
  assert.deepEqual(appuiSurCase(o(0, 16)), { dansLeSac: 1, confirmer: false });
  assert.deepEqual(appuiSurCase(o(15, 16)), { dansLeSac: 16, confirmer: false });
  assert.deepEqual(appuiSurCase(o(16, 16)), { dansLeSac: 0, confirmer: true });
  assert.deepEqual(appuiSurCase(o(1, 1)), { dansLeSac: 0, confirmer: false });
});

test('six appuis sur Repas 16 : entamé, seize : plein', () => {
  assert.equal(etatDansLeSac(o(0, 16)), 'vide');
  assert.equal(etatDansLeSac(o(6, 16)), 'entame');
  assert.equal(etatDansLeSac(o(16, 16)), 'plein');
});

test('vider dans la fiche demande confirmation au-delà d’une pièce', () => {
  assert.equal(viderDemandeConfirmation(o(6, 16)), true);
  assert.equal(viderDemandeConfirmation(o(1, 16)), false);
});

test('les bornes : jamais sous 0, jamais au-delà de la quantité', () => {
  assert.equal(bornerDansLeSac(o(0, 2), -1), 0);
  assert.equal(bornerDansLeSac(o(0, 2), 3), 2);
  assert.equal(bornerDansLeSac(o(0, 5), 2.7), 2);
});

test('les compteurs comptent les objets complets, pas les pièces', () => {
  assert.deepEqual(progression([o(16, 16), o(6, 16), o(0, 1)]), { faits: 1, total: 3 });
  assert.equal(estBouclee([]), false);
  assert.equal(estBouclee([o(2, 2), o(1, 1)]), true);
  assert.equal(estBouclee([o(2, 2), o(0, 1)]), false);
});

test('fini : tous les objets comptés sont complets, et il y en a au moins un', () => {
  assert.equal(estFini({ faits: 0, total: 0 }), false);
  assert.equal(estFini({ faits: 2, total: 2 }), true);
  assert.equal(estFini({ faits: 1, total: 2 }), false);
});

test('ordre : par nom, les complets en bas', () => {
  const objets = [o(1, 1, 'Pull'), o(0, 2, 'T-shirts'), o(0, 1, 'Chaussettes'), o(2, 2, 'Maillot')];
  const noms = ordreDansLeSac(objets).map(x => x.nom);
  assert.deepEqual(noms, ['Chaussettes', 'T-shirts', 'Maillot', 'Pull']);
  assert.equal(objets[0].nom, 'Pull', 'la liste d’origine reste intacte');
});

test('progression par voyage depuis les états de la base', () => {
  const p = progressionParVoyage([
    { voyageId: 'a', quantite: 2, dansLeSac: 2 },
    { voyageId: 'a', quantite: 16, dansLeSac: 6 },
    { voyageId: 'b', quantite: 1, dansLeSac: 1 },
  ]);
  assert.deepEqual(p.get('a'), { faits: 1, total: 2 });
  assert.deepEqual(p.get('b'), { faits: 1, total: 1 });
});

test('catégorie suivante non bouclée, en reprenant au début', () => {
  const bouclee = id => ['pap', 'toi'].includes(id);
  assert.equal(categorieSuivante(['pap', 'vet', 'toi', 'ali'], 'toi', bouclee), 'ali');
  assert.equal(categorieSuivante(['pap', 'vet', 'toi', 'ali'], 'ali', bouclee), 'vet');
  assert.equal(categorieSuivante(['pap', 'toi'], 'toi', bouclee), null);
});

// Phase 10 : une pièce de trop dans le sac (quantité baissée, objet retiré) attend sa sortie ; tant
// qu'elle n'est pas sortie, l'objet n'est pas emballé (décisions du chef de projet, 2026-10-29).
test('T-shirts 3 prévus, 4 dans le sac : une pièce à sortir, pas emballé', () => {
  const tshirts = o(4, 3, 'T-shirts');
  assert.equal(piecesASortir(tshirts), 1);
  assert.equal(estComplet(tshirts), false);
  assert.equal(etatDansLeSac(tshirts), 'a-sortir');
  assert.equal(estRetire(tshirts), false);
});

test('un appui sur la case « ! » sort une pièce, sans confirmation, jusqu’à la quantité', () => {
  assert.deepEqual(appuiSurCase(o(5, 3)), { dansLeSac: 4, confirmer: false });
  assert.deepEqual(appuiSurCase(o(4, 3)), { dansLeSac: 3, confirmer: false });
  assert.equal(estComplet(o(3, 3)), true);
  // Témoin : sans pièce de trop, un objet plein se vide toujours, après confirmation.
  assert.deepEqual(appuiSurCase(o(3, 3)), { dansLeSac: 0, confirmer: true });
});

test('un objet retiré qui attend sa sortie : quantité 0, toutes ses pièces à sortir', () => {
  const chaussures = o(1, 0, 'Chaussures de marche');
  assert.equal(estRetire(chaussures), true);
  assert.equal(piecesASortir(chaussures), 1);
  assert.equal(estComplet(chaussures), false);
  assert.deepEqual(appuiSurCase(chaussures), { dansLeSac: 0, confirmer: false });
  assert.equal(piecesASortir(o(2, 3)), 0);
});

test('une catégorie avec une pièce à sortir n’est pas bouclée, et l’objet reste en haut', () => {
  const objets = [o(2, 2, 'Pull'), o(4, 3, 'T-shirts')];
  assert.deepEqual(progression(objets), { faits: 1, total: 2 });
  assert.equal(estBouclee(objets), false);
  assert.deepEqual(
    ordreDansLeSac(objets).map(x => x.nom),
    ['T-shirts', 'Pull'],
  );
  assert.equal(estBouclee([o(2, 2, 'Pull'), o(3, 3, 'T-shirts')]), true);
});

test('les bornes de la fiche : un excédent ne fait que décroître', () => {
  assert.equal(bornerDansLeSac(o(4, 3), 9), 4);
  assert.equal(bornerDansLeSac(o(2, 3), 9), 3);
  assert.equal(bornerDansLeSac(o(4, 3), -1), 0);
});

test('progression par voyage : un objet à sortir ne compte pas comme emballé', () => {
  const parVoyage = progressionParVoyage([
    { voyageId: 'v', quantite: 3, dansLeSac: 4 },
    { voyageId: 'v', quantite: 0, dansLeSac: 1 },
    { voyageId: 'v', quantite: 2, dansLeSac: 2 },
  ]);
  assert.deepEqual(parVoyage.get('v'), { faits: 1, total: 3 });
});
