// La bibliothèque de départ complète (spec de la phase 13) : une structure sans texte (src/modele/depart/)
// et ses mots français (src/i18n/fr.json, branche « depart »). Ces tests gardent la structure cohérente
// et les textes complets ; le contenu lui-même a été validé par le chef de projet.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fr from '../src/i18n/fr.json' with { type: 'json' };
import { DEPART } from '../src/modele/depart/index.js';
import { bibliothequeComplete, construireBibliotheque, langueDeLaBibliotheque } from '../src/modele/bibliotheque.js';
import { CATALOGUE } from '../src/modele/catalogue.js';
import { COULEURS } from '../src/modele/modeles.js';
import { POUR_QUI } from '../src/modele/composition.js';

const textes = fr.depart;
const objets = DEPART.categories.flatMap(c => c.objets);
const etiquettes = DEPART.groupes.flatMap(g => g.etiquettes);
const ids = () => {
  let n = 0;
  return () => `id-${++n}`;
};
const construite = () => construireBibliotheque(DEPART, textes, { nouvelId: ids(), maintenant: 'x' });
const objet = nom => construite().objets.find(o => o.nom === nom);

test('quatre groupes d’étiquettes, aux noms et aux effectifs prévus', () => {
  assert.deepEqual(
    DEPART.groupes.map(g => [textes.groupes[g.cle], g.etiquettes.length]),
    [
      ['Activités', 12],
      ['Destination', 4],
      ['Transport', 3],
      ['Hébergement', 4],
    ],
  );
});

test('seize catégories, 171 objets, 47 notes', () => {
  assert.equal(DEPART.categories.length, 16);
  assert.equal(objets.length, 171);
  assert.equal(objets.filter(o => o.note).length, 47);
});

test('chaque étiquette citée existe, chaque picto est au catalogue, chaque couleur est connue', () => {
  const connues = new Set(etiquettes);
  const pictos = new Set(CATALOGUE.flatMap(t => t.pictos));
  for (const c of DEPART.categories) {
    assert.ok(pictos.has(c.icone), `picto inconnu : ${c.icone}`);
    assert.ok(COULEURS.includes(c.couleur), `couleur inconnue : ${c.couleur}`);
    for (const cle of [...(c.etiquettes ?? []), ...c.objets.flatMap(o => o.etiquettes ?? [])])
      assert.ok(connues.has(cle), `étiquette inconnue : ${cle}`);
  }
});

test('les clés sont uniques dans tout le départ, en minuscules et tirets', () => {
  const cles = [
    ...DEPART.groupes.map(g => g.cle),
    ...etiquettes,
    ...DEPART.categories.map(c => c.cle),
    ...objets.map(o => o.cle),
  ];
  assert.equal(new Set(cles).size, cles.length);
  for (const cle of cles) assert.match(cle, /^[a-z0-9]+(-[a-z0-9]+)*$/);
});

test('aucun nom d’objet en double dans une catégorie', () => {
  for (const c of DEPART.categories) {
    const noms = c.objets.map(o => textes.objets[o.cle].nom);
    assert.equal(new Set(noms).size, noms.length, c.cle);
  }
});

test('règles, quantités, plafonds et « pour qui » sont valides', () => {
  for (const o of objets) {
    assert.ok(['fixe', 'par_jour', 'par_nuit', 'par_semaine'].includes(o.regle), o.cle);
    assert.ok(Number.isInteger(o.valeur) && o.valeur >= 1 && o.valeur <= 999, o.cle);
    if (o.plafond !== undefined) {
      assert.notEqual(o.regle, 'fixe', `${o.cle} : un plafond avec « fixe »`);
      assert.ok(Number.isInteger(o.plafond) && o.plafond >= 1 && o.plafond <= 999, o.cle);
    }
    assert.ok(POUR_QUI.includes(o.pourQui), o.cle);
    assert.equal(typeof o.parPersonne, 'boolean', o.cle);
  }
});

test('la structure ne contient aucun texte : seules les clés y figurent', () => {
  const texte = JSON.stringify(DEPART);
  for (const mot of ['Activités', 'Vêtements', 'Passeport']) assert.ok(!texte.includes(mot));
});

test('le dictionnaire français est complet', () => {
  assert.equal(bibliothequeComplete(DEPART, textes), true);
});

test('une bibliothèque est incomplète dès qu’un nom ou une note manque ou est vide', () => {
  const sans = (branche, cle, retouche) => ({
    ...textes,
    [branche]: { ...textes[branche], [cle]: retouche },
  });
  const premier = objets[0].cle;
  assert.equal(bibliothequeComplete(DEPART, { ...textes, objets: {} }), false);
  assert.equal(bibliothequeComplete(DEPART, sans('objets', premier, { nom: '  ' })), false);
  assert.equal(bibliothequeComplete(DEPART, sans('categories', DEPART.categories[0].cle, '')), false);
  assert.equal(bibliothequeComplete(DEPART, sans('groupes', DEPART.groupes[0].cle, '')), false);
  assert.equal(bibliothequeComplete(DEPART, sans('etiquettes', etiquettes[0], '')), false);
  const avecNote = objets.find(o => o.note).cle;
  assert.equal(bibliothequeComplete(DEPART, sans('objets', avecNote, { nom: 'x' })), false);
  assert.equal(bibliothequeComplete(DEPART, sans('objets', avecNote, { nom: 'x', note: '' })), false);
  assert.equal(bibliothequeComplete(DEPART, undefined), false);
});

test('la langue de la bibliothèque : la langue de l’appareil si elle est complète, sinon le français', () => {
  const dictionnaires = { fr, eo: { depart: {} }, de: { depart: textes } };
  assert.equal(langueDeLaBibliotheque('eo', dictionnaires, DEPART), 'fr');
  assert.equal(langueDeLaBibliotheque('de', dictionnaires, DEPART), 'de');
  assert.equal(langueDeLaBibliotheque('fr', dictionnaires, DEPART), 'fr');
  assert.equal(langueDeLaBibliotheque('pt', dictionnaires, DEPART), 'fr');
});

test('la construction donne les noms de la langue, l’ordre du départ et les étiquettes liées', () => {
  const b = construite();
  assert.equal(b.groupes.length, 4);
  assert.equal(b.etiquettes.length, 23);
  assert.equal(b.categories.length, 16);
  assert.equal(b.objets.length, 171);
  assert.deepEqual(
    b.categories.map(c => c.nom),
    DEPART.categories.map(c => textes.categories[c.cle]),
  );
  const plage = b.categories.find(c => c.nom === 'Plage');
  assert.equal(plage.toujoursIncluse, false);
  assert.equal(plage.etiquettes.length, 1);
  assert.equal(b.etiquettes.find(e => e.id === plage.etiquettes[0]).nom, 'Plage');
});

test('objets témoins : Lessive de voyage, Carnet de santé, Espèces', () => {
  const lessive = objet('Lessive de voyage');
  assert.deepEqual(
    [lessive.regle, lessive.valeur, lessive.plafond, lessive.parPersonne, lessive.pourQui],
    ['par_semaine', 5, null, false, 'tous'],
  );
  const carnet = objet('Carnet de santé');
  assert.deepEqual([carnet.regle, carnet.valeur, carnet.parPersonne, carnet.pourQui], ['fixe', 1, true, 'enfants']);
  assert.equal(objet('Espèces').note, 'Prévoir de partir avec environ 50 € par personne.');
});

test('typographie : espace insécable avant « : ; ! ? » et dans les chiffres suivis d’une unité', () => {
  const tous = [
    ...Object.values(textes.groupes),
    ...Object.values(textes.etiquettes),
    ...Object.values(textes.categories),
    ...Object.values(textes.objets).flatMap(o => [o.nom, o.note ?? '']),
  ];
  for (const t of tous) {
    assert.doesNotMatch(t, / [:;!?»]/, t);
    assert.doesNotMatch(t, /\d [\p{L}€]/u, t);
  }
});
