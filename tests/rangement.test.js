// L'état d'affichage figé pendant la seconde de répit (docs/PRD.md, US-15).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  apresRepit,
  apresTampon,
  basculerCategorie,
  basculerFiltre,
  categoriesAffichees,
  choisirCategorie,
  etatInitial,
  rendreObjet,
} from '../src/ecrans/rangement.js';

// Vêtements : Pantalons 0/4, Pull 2/2 ; Toilette : Crème 0/1, Brosse 2/2 ; Papiers : Pièce 2/2.
const CATEGORIES = [
  [
    'vet',
    'Vêtements',
    [
      ['pantalons', 'Pantalons', 4, 0],
      ['pull', 'Pull', 2, 2],
    ],
  ],
  [
    'toi',
    'Toilette',
    [
      ['creme', 'Crème', 1, 0],
      ['brosse', 'Brosse', 2, 2],
    ],
  ],
  ['pap', 'Papiers', [['piece', 'Pièce', 2, 2]]],
];

// Une liste telle que listeParCategorie la rend, avec des pièces modifiées : { creme: 1 }.
function liste(pieces = {}) {
  return CATEGORIES.map(([id, nom, objets]) => ({
    categorie: { id, nom },
    objets: objets
      .map(([oid, onom, quantite, dansLeSac]) => ({
        id: oid,
        nom: onom,
        quantite,
        dansLeSac: pieces[oid] ?? dansLeSac,
      }))
      .sort((a, b) => Number(a.dansLeSac >= a.quantite) - Number(b.dansLeSac >= b.quantite)),
  }));
}

const noms = (etat, l) => categoriesAffichees(etat, l).map(c => c.categorie.id);
const objetsDe = (etat, l, id) =>
  categoriesAffichees(etat, l)
    .find(c => c.categorie.id === id)
    .objets.map(o => o.id);

test('état initial : Papiers bouclée et repliée, les autres ouvertes, la première à faire choisie', () => {
  const etat = etatInitial(liste(), { filtre: false });
  assert.deepEqual([...etat.bouclees], ['pap']);
  assert.deepEqual([...etat.ouvertes], ['vet', 'toi']);
  assert.equal(etat.choisie, 'vet');
  assert.equal(etat.sacBoucle, false);
  assert.equal(etat.masques.size, 0);
  assert.equal(etat.enBas.size, 0);
});

test('tout bouclé au départ : la première catégorie est choisie', () => {
  const l = liste({ pantalons: 4, creme: 1 });
  assert.equal(etatInitial(l, { filtre: false }).choisie, 'vet');
  assert.equal(etatInitial(l, { filtre: false }).sacBoucle, true);
});

test('rien ne bouge avant la fin du répit, puis Vêtements est bouclée mais encore ouverte', () => {
  const avant = liste();
  const etat = etatInitial(avant, { filtre: false });
  const apres = liste({ pantalons: 4 });
  assert.deepEqual(objetsDe(etat, apres, 'vet'), ['pantalons', 'pull']);
  assert.equal(etat.bouclees.has('vet'), false);

  const r = apresRepit(etat, apres);
  assert.deepEqual(r.nouvelles, ['vet']);
  assert.equal(r.etat.bouclees.has('vet'), true);
  assert.equal(r.etat.ouvertes.has('vet'), true);
  assert.equal(r.sacVientDeBoucler, false);
  assert.deepEqual(objetsDe(r.etat, apres, 'vet'), ['pantalons', 'pull']);
});

test('apresTampon replie Vêtements et la sélection passe à Toilette', () => {
  const apres = liste({ pantalons: 4 });
  const r = apresRepit(etatInitial(liste(), { filtre: false }), apres);
  const etat = apresTampon(r.etat, r.nouvelles, apres);
  assert.equal(etat.ouvertes.has('vet'), false);
  assert.equal(etat.choisie, 'toi');
  assert.equal(r.etat.choisie, 'vet', "l'ancien état n'est pas modifié");
});

test('sous le filtre : Crème cochée est masquée après le répit, Toilette descend après le tampon', () => {
  const etat = etatInitial(liste(), { filtre: true });
  assert.deepEqual([...etat.masques].sort(), ['brosse', 'piece', 'pull']);
  assert.deepEqual([...etat.enBas], ['pap']);

  const apres = liste({ creme: 1 });
  assert.deepEqual(objetsDe(etat, apres, 'toi'), ['creme'], 'tant que le répit court, Crème reste');
  const r = apresRepit(etat, apres);
  assert.deepEqual(r.nouvelles, ['toi']);
  assert.equal(r.etat.masques.has('creme'), true);

  const final = apresTampon(r.etat, r.nouvelles, apres);
  assert.equal(final.enBas.has('toi'), true);
  const ordre = noms(final, apres);
  assert.deepEqual(ordre, ['vet', 'toi', 'pap'], "le fond garde l'ordre de la bibliothèque");
  assert.equal(final.choisie, 'vet', 'la sélection ne change que si la catégorie bouclée était choisie');
});

test('décocher dans une catégorie bouclée la rouvre', () => {
  const etat = basculerFiltre(etatInitial(liste(), { filtre: false }), liste());
  assert.equal(etat.enBas.has('pap'), true);
  const apres = liste({ piece: 0 });
  const r = apresRepit(etat, apres);
  assert.equal(r.etat.bouclees.has('pap'), false);
  assert.equal(r.etat.ouvertes.has('pap'), true);
  assert.equal(r.etat.enBas.has('pap'), false);
  assert.deepEqual(r.nouvelles, []);
});

test('le sac se boucle quand tout est complet, et se débouclé en décochant', () => {
  const plein = liste({ pantalons: 4, creme: 1 });
  const r = apresRepit(etatInitial(liste(), { filtre: false }), plein);
  assert.equal(r.sacVientDeBoucler, true);
  assert.equal(r.etat.sacBoucle, true);

  const r2 = apresRepit(r.etat, liste({ pantalons: 3, creme: 1 }));
  assert.equal(r2.etat.sacBoucle, false);
  assert.equal(r2.sacVientDeBoucler, false);
  const r3 = apresRepit(r2.etat, plein);
  assert.equal(r3.sacVientDeBoucler, true, 'il peut reboucler');
});

test("basculer le filtre deux fois ramène à l'état sans masqués ni enBas", () => {
  const l = liste();
  const depart = etatInitial(l, { filtre: false });
  const filtre = basculerFiltre(depart, l);
  assert.equal(filtre.filtre, true);
  assert.deepEqual([...filtre.masques].sort(), ['brosse', 'piece', 'pull']);
  assert.deepEqual(noms(filtre, l), ['vet', 'toi', 'pap']);
  const retour = basculerFiltre(filtre, l);
  assert.equal(retour.filtre, false);
  assert.equal(retour.masques.size, 0);
  assert.equal(retour.enBas.size, 0);
});

test('accordéon et choix de catégorie', () => {
  const etat = etatInitial(liste(), { filtre: false });
  const ferme = basculerCategorie(etat, 'vet');
  assert.equal(ferme.ouvertes.has('vet'), false);
  assert.equal(etat.ouvertes.has('vet'), true, "l'état d'origine reste intact");
  assert.equal(basculerCategorie(ferme, 'vet').ouvertes.has('vet'), true);
  assert.equal(choisirCategorie(etat, 'toi').choisie, 'toi');
});

test('hors filtre, un objet coché descend au fond de sa catégorie seulement après le répit', () => {
  const etat = etatInitial(liste(), { filtre: false });
  const apres = liste({ creme: 1 });
  assert.deepEqual(objetsDe(etat, apres, 'toi'), ['creme', 'brosse']);
  assert.deepEqual(objetsDe(apresRepit(etat, apres).etat, apres, 'toi'), ['brosse', 'creme']);
});

test('rouvrir et refermer le filtre ne réordonne pas le fond', () => {
  const l = liste({ creme: 1 });
  const un = basculerFiltre(etatInitial(l, { filtre: false }), l);
  const deux = basculerFiltre(basculerFiltre(un, l), l);
  assert.deepEqual(noms(deux, l), noms(un, l));
  assert.deepEqual(noms(un, l), ['vet', 'toi', 'pap']);
});

test("la suivante se cherche dans l'ordre affiché, après la descente des bouclées", () => {
  const objet = (id, dansLeSac) => ({ id, nom: id, quantite: 1, dansLeSac });
  const l = pieces =>
    ['A', 'B', 'C'].map(id => ({ categorie: { id, nom: id }, objets: [objet(`o${id}`, pieces[id] ?? 0)] }));
  const etat = choisirCategorie(etatInitial(l({}), { filtre: true }), 'B');
  const apres = l({ B: 1 });
  const r = apresRepit(etat, apres);
  const final = apresTampon(r.etat, r.nouvelles, apres);
  assert.deepEqual(noms(final, apres), ['A', 'C', 'B']);
  assert.equal(final.choisie, 'A');
});

test('décochée entre le répit et le tampon : la catégorie ne se replie pas et la sélection reste', () => {
  const bouclee = liste({ pantalons: 4 });
  const r = apresRepit(etatInitial(liste(), { filtre: true }), bouclee);
  const final = apresTampon(r.etat, r.nouvelles, liste({ pantalons: 3 }));
  assert.equal(final.ouvertes.has('vet'), true);
  assert.equal(final.enBas.has('vet'), false);
  assert.equal(final.choisie, 'vet');
});

test('un objet rendu par « Annuler » prend tout de suite sa place, sa catégorie choisie et dépliée', () => {
  // Pantalons retiré, Vêtements repliée et Toilette choisie ; puis Pantalons revient.
  const sans = liste().map(c =>
    c.categorie.id === 'vet' ? { ...c, objets: c.objets.filter(o => o.id !== 'pantalons') } : c,
  );
  const etat = { ...choisirCategorie(etatInitial(sans, { filtre: false }), 'toi'), ouvertes: new Set(['toi']) };
  const l = liste();
  // Témoin : sans placement, l'objet apparu se met en queue.
  assert.deepEqual(objetsDe(etat, l, 'vet'), ['pull', 'pantalons']);
  const rendu = rendreObjet(etat, l, { categorieId: 'vet', objetId: 'pantalons' });
  assert.deepEqual(objetsDe(rendu, l, 'vet'), ['pantalons', 'pull']);
  assert.equal(rendu.choisie, 'vet');
  assert.deepEqual([...rendu.ouvertes].sort(), ['toi', 'vet']);
  // Le reste de la liste ne bouge pas : Toilette garde son ordre figé.
  assert.deepEqual(rendu.ordre.get('toi'), etat.ordre.get('toi'));
});

test('sous le filtre, un objet rendu complet est masqué aussitôt', () => {
  const sans = liste().map(c =>
    c.categorie.id === 'vet' ? { ...c, objets: c.objets.filter(o => o.id !== 'pull') } : c,
  );
  const etat = etatInitial(sans, { filtre: true });
  const rendu = rendreObjet(etat, liste(), { categorieId: 'vet', objetId: 'pull' });
  assert.ok(rendu.masques.has('pull'));
  assert.deepEqual(objetsDe(rendu, liste(), 'vet'), ['pantalons']);
});

test('une catégorie rendue par « Annuler » est bouclée ou non selon ses pièces (relecture finale, point 8)', () => {
  // Papiers (Pièce 2/2) disparue avec Pièce, puis rendue : elle est déjà bouclée, sans tampon à venir.
  const sansPapiers = liste().filter(c => c.categorie.id !== 'pap');
  const rendu = rendreObjet(etatInitial(sansPapiers, { filtre: false }), liste(), {
    categorieId: 'pap',
    objetId: 'piece',
  });
  assert.equal(rendu.bouclees.has('pap'), true);
  // Une coche ailleurs : seule Toilette, qui vient de boucler, reçoit son tampon (témoin), pas Papiers.
  const coche = liste({ creme: 1 });
  assert.deepEqual(apresRepit(rendu, coche).nouvelles, ['toi']);
  // Vêtements réduite à Pull 2/2 (bouclée), puis Pantalons 0/4 rendu : elle ne l'est plus.
  const sansPantalons = liste().map(c =>
    c.categorie.id === 'vet' ? { ...c, objets: c.objets.filter(o => o.id !== 'pantalons') } : c,
  );
  const etat = etatInitial(sansPantalons, { filtre: false });
  assert.equal(etat.bouclees.has('vet'), true);
  const rouvert = rendreObjet(etat, liste(), { categorieId: 'vet', objetId: 'pantalons' });
  assert.equal(rouvert.bouclees.has('vet'), false);
});
