// Quand les plans changent (docs/PLAN.md, phase 10 ; conception
// docs/superpowers/specs/2026-10-29-phase-10-plans-changent-design.md) : ce que propose l'étape
// « Changements », et ce qu'écrit son application.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { appliquerChangements, calculerChangements, choisiesDuVoyage } from '../src/modele/changements.js';
import { genererVoyage } from '../src/modele/voyage.js';

const MAINTENANT = '2026-10-29T10:00:00.000Z';
function compteur(prefixe = 'id') {
  let n = 0;
  return () => `${prefixe}-${++n}`;
}
const categorie = (id, nom, ordre, etiquettes = []) => ({
  id,
  nom,
  icone: 'package',
  couleur: 'ciel',
  ordre,
  toujoursIncluse: etiquettes.length === 0,
  modifieLe: 'x',
  etiquettes,
});
const objet = (id, categorieId, nom, regle, valeur, autres = {}) => ({
  id,
  categorieId,
  nom,
  regle,
  valeur,
  plafond: null,
  parPersonne: false,
  consommable: false,
  toujoursInclus: !autres.etiquettes?.length,
  note: '',
  modifieLe: 'x',
  etiquettes: [],
  ...autres,
});
const bibliotheque = () => ({
  groupes: [
    { id: 'g-activites', nom: 'Activités', ordre: 0, modifieLe: 'x' },
    { id: 'g-climat', nom: 'Climat', ordre: 1, modifieLe: 'x' },
  ],
  etiquettes: [
    { id: 'e-rando', groupeId: 'g-activites', nom: 'Randonnée', ordre: 0, modifieLe: 'x' },
    { id: 'e-camping', groupeId: 'g-activites', nom: 'Camping', ordre: 1, modifieLe: 'x' },
    { id: 'e-pluie', groupeId: 'g-climat', nom: 'Pluie', ordre: 0, modifieLe: 'x' },
  ],
  categories: [
    categorie('c-vet', 'Vêtements', 0),
    categorie('c-ali', 'Alimentation', 1),
    categorie('c-camp', 'Camping', 2, ['e-camping']),
  ],
  objets: [
    objet('o-tshirts', 'c-vet', 'T-shirts', 'par_jour', 1, { parPersonne: true }),
    objet('o-pull', 'c-vet', 'Pull', 'fixe', 1, { parPersonne: true }),
    objet('o-chaussures', 'c-vet', 'Chaussures de marche', 'fixe', 1, { etiquettes: ['e-rando'] }),
    objet('o-poncho', 'c-vet', 'Poncho', 'fixe', 1, { parPersonne: true, etiquettes: ['e-pluie'] }),
    objet('o-repas', 'c-ali', 'Repas', 'par_jour', 2, { parPersonne: true, consommable: true }),
    objet('o-gaz', 'c-camp', 'Cartouches de gaz', 'par_nuit', 1, { consommable: true, etiquettes: ['e-camping'] }),
    objet('o-lampe', 'c-camp', 'Lampe frontale', 'fixe', 1, { etiquettes: ['e-camping'] }),
  ],
});
// Du 10 au 13 : 4 jours, 3 nuits.
const infos = (autres = {}) => ({
  nom: 'Quiberon',
  destination: 'Bretagne',
  depart: '2026-10-10',
  retour: '2026-10-13',
  voyageurs: 2,
  ...autres,
});
const creer = ({ i = infos(), choisies = [], ecartes = [] } = {}) =>
  genererVoyage(
    bibliotheque(),
    i,
    { choisies: new Set(choisies), ecartes: new Set(ecartes) },
    { nouvelId: compteur('v'), maintenant: 'avant' },
  );
// Le voyage tel qu'il est, avec des changements faits depuis sa création (pièces, quantités…).
const retoucher = (contenu, nom, champs) => ({
  ...contenu,
  objets: contenu.objets.map(o => (o.nom === nom ? { ...o, ...champs } : o)),
});
const changer = (contenu, nouvellesInfos, choisies, biblio = bibliotheque()) =>
  calculerChangements({ contenu, bibliotheque: biblio, infos: nouvellesInfos, choisies: new Set(choisies) });
const lignes = changements => changements.flatMap(c => c.lignes);
const ligne = (changements, nom) => lignes(changements).find(l => l.nom === nom);
const appliquer = (contenu, nouvellesInfos, choisies, acceptes = null, biblio = bibliotheque()) => {
  const changements = changer(contenu, nouvellesInfos, choisies, biblio);
  const parDefaut = new Set(
    lignes(changements)
      .filter(l => l.defaut)
      .map(l => l.cle),
  );
  return appliquerChangements(
    {
      contenu,
      bibliotheque: biblio,
      infos: nouvellesInfos,
      choisies: new Set(choisies),
      changements,
      acceptes: acceptes ? new Set(acceptes(changements)) : parDefaut,
    },
    { nouvelId: compteur('n'), maintenant: MAINTENANT },
  );
};
const modifie = (modification, nom) => modification.objetsModifies.find(o => o.nom === nom);

test('choisiesDuVoyage : les étiquettes du voyage qui existent encore dans la bibliothèque', () => {
  const contenu = creer({ choisies: ['e-rando'] });
  const etiquettes = [...contenu.etiquettes, { ...contenu.etiquettes[0], id: 'ev-x', modeleId: 'e-disparue' }];
  assert.deepEqual([...choisiesDuVoyage(bibliotheque(), etiquettes)], ['e-rando']);
});

test('critère : de 2 à 3 voyageurs, Repas 16 → 24, accepté par défaut', () => {
  const contenu = creer();
  const repas = ligne(changer(contenu, infos({ voyageurs: 3 }), []), 'Repas');
  assert.deepEqual([repas.genre, repas.avant, repas.apres, repas.defaut], ['quantite', 16, 24, true]);
  const { modification } = appliquer(contenu, infos({ voyageurs: 3 }), []);
  assert.equal(modifie(modification, 'Repas').quantite, 24);
  assert.equal(modification.voyage.voyageurs, 3);
  assert.equal(modification.voyage.modifieLe, MAINTENANT);
});

test('critère : une quantité fixée manuellement est gardée par défaut, recalculée sur demande', () => {
  const contenu = retoucher(creer(), 'Pull', { quantite: 5, quantiteManuelle: true });
  const pull = ligne(changer(contenu, infos({ voyageurs: 3 }), []), 'Pull');
  assert.deepEqual([pull.genre, pull.avant, pull.apres, pull.defaut], ['manuelle', 5, 3, false]);
  const garde = appliquer(contenu, infos({ voyageurs: 3 }), []).modification;
  assert.equal(modifie(garde, 'Pull'), undefined);
  const recalcule = appliquer(contenu, infos({ voyageurs: 3 }), [], ch => lignes(ch).map(l => l.cle)).modification;
  assert.deepEqual([modifie(recalcule, 'Pull').quantite, modifie(recalcule, 'Pull').quantiteManuelle], [3, false]);
});

test('critère : ajouter « Pluie » propose le Poncho, avec sa quantité calculée pour ce voyage', () => {
  const contenu = creer({ choisies: ['e-camping'], ecartes: ['o-lampe'] });
  const changements = changer(contenu, infos(), ['e-camping', 'e-pluie']);
  assert.deepEqual(
    lignes(changements).map(l => [l.genre, l.nom, l.avant, l.apres, l.defaut]),
    [['entree', 'Poncho', 0, 2, true]],
  );
  const { modification } = appliquer(contenu, infos(), ['e-camping', 'e-pluie']);
  const [poncho] = modification.objetsAjoutes;
  const vetements = contenu.categories.find(c => c.nom === 'Vêtements');
  assert.deepEqual(
    [poncho.nom, poncho.quantite, poncho.dansLeSac, poncho.modeleId, poncho.categorieId, poncho.voyageId],
    ['Poncho', 2, 0, 'o-poncho', vetements.id, contenu.voyage.id],
  );
  assert.deepEqual(modification.categoriesAjoutees, []);
  assert.deepEqual(
    modification.etiquettes.map(e => e.nom),
    ['Camping', 'Pluie'],
  );
});

test('critère : aucun objet déjà présent n’est proposé, ni un objet écarté à la création', () => {
  const contenu = creer({ choisies: ['e-camping'], ecartes: ['o-lampe'] });
  const noms = lignes(changer(contenu, infos(), ['e-camping', 'e-pluie'])).map(l => l.nom);
  assert.equal(noms.includes('Lampe frontale'), false);
  assert.equal(noms.includes('T-shirts'), false);
});

test('ajouter « Camping » copie sa catégorie, qui n’est pas créée si tout est refusé', () => {
  const contenu = creer();
  const changements = changer(contenu, infos(), ['e-camping']);
  const camping = changements.find(c => c.categorie.nom === 'Camping');
  assert.equal(camping.categorie.neuve, true);
  assert.deepEqual(
    camping.lignes.map(l => [l.nom, l.apres]),
    [
      ['Cartouches de gaz', 3],
      ['Lampe frontale', 1],
    ],
  );
  const { modification } = appliquer(contenu, infos(), ['e-camping']);
  assert.equal(modification.categoriesAjoutees.length, 1);
  assert.equal(modification.categoriesAjoutees[0].modeleId, 'c-camp');
  assert.ok(modification.objetsAjoutes.every(o => o.categorieId === modification.categoriesAjoutees[0].id));
  assert.equal(modification.objetsAjoutes.find(o => o.nom === 'Cartouches de gaz').aAcheter, true);
  const refuse = appliquer(contenu, infos(), ['e-camping'], () => []).modification;
  assert.deepEqual([refuse.categoriesAjoutees, refuse.objetsAjoutes], [[], []]);
});

test('critère : retirer « Randonnée » sans rien cocher garde tous les objets et leurs pièces', () => {
  const contenu = retoucher(creer({ choisies: ['e-rando'] }), 'Chaussures de marche', { dansLeSac: 1 });
  const chaussures = ligne(changer(contenu, infos(), []), 'Chaussures de marche');
  assert.deepEqual([chaussures.genre, chaussures.avant, chaussures.apres, chaussures.defaut], ['sortie', 1, 0, false]);
  const { modification, aSortir } = appliquer(contenu, infos(), []);
  assert.deepEqual([modification.objetsModifies, modification.objetsRetires, aSortir], [[], [], []]);
  assert.deepEqual(modification.etiquettes, []);
});

test('retirer « Randonnée » et accepter : avec une pièce dans le sac, l’objet attend sa sortie', () => {
  const contenu = retoucher(creer({ choisies: ['e-rando'] }), 'Chaussures de marche', { dansLeSac: 1 });
  const { modification, aSortir } = appliquer(contenu, infos(), [], ch => lignes(ch).map(l => l.cle));
  const chaussures = modifie(modification, 'Chaussures de marche');
  assert.deepEqual([chaussures.quantite, chaussures.dansLeSac, chaussures.achetes], [0, 1, 0]);
  assert.deepEqual(aSortir, [
    { id: chaussures.id, nom: 'Chaussures de marche', categorie: 'Vêtements', pieces: 1, retire: true },
  ]);
  assert.deepEqual(modification.objetsRetires, []);
});

test('retirer « Camping » et accepter, rien dans le sac : objets et catégorie retirés', () => {
  const contenu = creer({ choisies: ['e-camping'] });
  const { modification, aSortir } = appliquer(contenu, infos(), [], ch => lignes(ch).map(l => l.cle));
  const camping = contenu.categories.find(c => c.nom === 'Camping');
  const ids = contenu.objets.filter(o => o.categorieId === camping.id).map(o => o.id);
  assert.deepEqual([...modification.objetsRetires].sort(), [...ids].sort());
  assert.deepEqual(modification.categoriesRetirees, [camping.id]);
  assert.deepEqual(aSortir, []);
});

test('une catégorie qui garde un objet en attente de sortie n’est pas retirée', () => {
  const contenu = retoucher(creer({ choisies: ['e-camping'] }), 'Lampe frontale', { dansLeSac: 1 });
  const { modification } = appliquer(contenu, infos(), [], ch => lignes(ch).map(l => l.cle));
  assert.deepEqual(modification.categoriesRetirees, []);
  assert.equal(modification.objetsRetires.length, 1);
});

test('une baisse sous le sac garde les pièces : Cartouches de gaz 3 → 2, une à sortir', () => {
  const contenu = retoucher(creer({ choisies: ['e-camping'] }), 'Cartouches de gaz', { dansLeSac: 3, achetes: 3 });
  const { modification, aSortir } = appliquer(contenu, infos({ retour: '2026-10-12' }), ['e-camping']);
  const gaz = modifie(modification, 'Cartouches de gaz');
  assert.deepEqual([gaz.quantite, gaz.dansLeSac, gaz.achetes], [2, 3, 2]);
  assert.deepEqual(
    aSortir.map(o => [o.nom, o.pieces, o.retire]),
    [['Cartouches de gaz', 1, false]],
  );
});

test('par nuit : un aller-retour devenu séjour fait entrer l’objet, l’inverse propose sa sortie', () => {
  const journee = infos({ retour: '2026-10-10' });
  const court = creer({ i: journee, choisies: ['e-camping'] });
  const entree = ligne(changer(court, infos({ retour: '2026-10-11' }), ['e-camping']), 'Cartouches de gaz');
  assert.deepEqual([entree.genre, entree.apres, entree.defaut], ['entree', 1, true]);
  const long = creer({ i: infos({ retour: '2026-10-11' }), choisies: ['e-camping'] });
  const sortie = ligne(changer(long, journee, ['e-camping']), 'Cartouches de gaz');
  assert.deepEqual([sortie.genre, sortie.avant, sortie.apres, sortie.defaut], ['sortie', 1, 0, false]);
});

test('une étiquette du voyage disparue de la bibliothèque est gardée, sans rien proposer', () => {
  const contenu = creer({ choisies: ['e-rando'] });
  const orpheline = { ...contenu.etiquettes[0], id: 'ev-orpheline', modeleId: 'e-disparue', nom: 'Kayak' };
  const avecOrpheline = { ...contenu, etiquettes: [...contenu.etiquettes, orpheline] };
  assert.deepEqual(changer(avecOrpheline, infos(), ['e-rando']), []);
  const { modification } = appliquer(avecOrpheline, infos(), ['e-rando']);
  assert.deepEqual(
    modification.etiquettes.map(e => [e.id, e.nom]),
    [
      [contenu.etiquettes[0].id, 'Randonnée'],
      ['ev-orpheline', 'Kayak'],
    ],
  );
});

test('rien ne change (seulement le nom) : aucun changement, aucun objet touché', () => {
  const contenu = creer();
  assert.deepEqual(changer(contenu, infos({ nom: 'Quiberon 2' }), []), []);
  const { modification } = appliquer(contenu, infos({ nom: '  Quiberon 2 ' }), []);
  assert.equal(modification.voyage.nom, 'Quiberon 2');
  assert.deepEqual([modification.objetsAjoutes, modification.objetsModifies, modification.objetsRetires], [[], [], []]);
});

test('un objet ajouté à la main n’est jamais dans les changements', () => {
  const contenu = creer();
  const gourde = { ...contenu.objets[0], id: 'main', nom: 'Gourde', modeleId: null, valeur: 0, quantiteManuelle: true };
  const avecGourde = { ...contenu, objets: [...contenu.objets, gourde] };
  assert.equal(ligne(changer(avecGourde, infos({ voyageurs: 3 }), []), 'Gourde'), undefined);
});

test('un objet retiré en attente de sortie revient quand son étiquette revient', () => {
  const contenu = retoucher(creer({ choisies: ['e-rando'] }), 'Chaussures de marche', { quantite: 0, dansLeSac: 1 });
  const sansRando = { ...contenu, etiquettes: [] };
  const retour = ligne(changer(sansRando, infos(), ['e-rando']), 'Chaussures de marche');
  assert.deepEqual([retour.genre, retour.avant, retour.apres, retour.defaut], ['retour', 0, 1, true]);
  const { modification, aSortir } = appliquer(sansRando, infos(), ['e-rando']);
  const chaussures = modifie(modification, 'Chaussures de marche');
  assert.deepEqual([chaussures.quantite, chaussures.dansLeSac], [1, 1]);
  assert.deepEqual(aSortir, []);
  assert.deepEqual(modification.objetsAjoutes, []);
});

test('des informations invalides sont refusées', () => {
  const contenu = creer();
  assert.throws(() => appliquer(contenu, infos({ retour: '2026-10-09' }), []));
});

// Ce que dit la ligne (maquette validée) : « nouveau · pour « Pluie » », « « Randonnée » retirée » ; une
// sortie due aux dates n'a pas d'étiquette à nommer.
test('chaque entrée ou sortie nomme l’étiquette qui la cause', () => {
  const contenu = creer({ choisies: ['e-rando'] });
  const changements = changer(contenu, infos(), ['e-pluie']);
  assert.equal(ligne(changements, 'Poncho').raison, 'Pluie');
  assert.equal(ligne(changements, 'Chaussures de marche').raison, 'Randonnée');
  const camping = changer(creer(), infos(), ['e-camping']);
  assert.equal(ligne(camping, 'Lampe frontale').raison, 'Camping');
  const long = creer({ i: infos({ retour: '2026-10-11' }), choisies: ['e-camping'] });
  assert.equal(ligne(changer(long, infos({ retour: '2026-10-10' }), ['e-camping']), 'Cartouches de gaz').raison, null);
});

// Trouvé par le test d'écran : une quantité fixée manuellement n'est proposée que si le calcul change
// (dates ou voyageurs), pas à chaque modification (une étiquette, le nom).
test('une quantité fixée manuellement ne figure pas quand ni dates ni voyageurs ne changent', () => {
  const contenu = retoucher(creer({ choisies: ['e-rando'] }), 'Pull', { quantite: 5, quantiteManuelle: true });
  assert.deepEqual(changer(contenu, infos({ nom: 'Autre' }), ['e-rando']), []);
  assert.equal(ligne(changer(contenu, infos(), ['e-rando', 'e-pluie']), 'Pull'), undefined);
  assert.equal(ligne(changer(contenu, infos({ voyageurs: 3 }), ['e-rando']), 'Pull').genre, 'manuelle');
});
