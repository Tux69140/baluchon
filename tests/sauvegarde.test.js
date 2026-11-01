// Le fichier de sauvegarde (docs/superpowers/specs/2026-10-31-phase-12-reglages-sauvegarde-design.md).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import contrat from './contrat/stockage.json' with { type: 'json' };
import {
  FORMAT_SAUVEGARDE,
  VERSION_SAUVEGARDE,
  construireSauvegarde,
  lireSauvegarde,
  nomDeSauvegarde,
} from '../src/modele/sauvegarde.js';

const CREE = '2026-10-31T17:40:12.000Z';
const copie = x => JSON.parse(JSON.stringify(x));
const fichier = (retouche = () => {}) => {
  const s = construireSauvegarde(
    { bibliotheque: copie(contrat.bibliotheque), voyages: [copie(contrat.voyage)], langue: 'fr' },
    CREE,
  );
  retouche(s);
  return JSON.stringify(s);
};
const raison = texte => lireSauvegarde(texte).raison;

test('le nom du fichier porte la date et l’heure locales', () => {
  assert.equal(nomDeSauvegarde(new Date('2026-10-31T18:40:12')), 'baluchon-2026-10-31-18h40.json');
  assert.equal(nomDeSauvegarde(new Date('2026-01-05T07:03')), 'baluchon-2026-01-05-07h03.json');
});

test('le nom du fichier prévoit le doublon et l’avant-restauration', () => {
  const d = new Date('2026-10-31T18:40:12');
  assert.equal(nomDeSauvegarde(d, { numero: 2 }), 'baluchon-2026-10-31-18h40-2.json');
  assert.equal(nomDeSauvegarde(d, { avantRestauration: true }), 'baluchon-avant-restauration-2026-10-31-18h40.json');
});

test('un numéro de doublon de 1 ou de 0 ne met pas de suffixe', () => {
  const d = new Date('2026-10-31T18:40:12');
  assert.equal(nomDeSauvegarde(d, { numero: 1 }), 'baluchon-2026-10-31-18h40.json');
  assert.equal(nomDeSauvegarde(d, { numero: 0 }), 'baluchon-2026-10-31-18h40.json');
});

test('une sauvegarde construite est relue à l’identique', () => {
  const lu = lireSauvegarde(fichier());
  assert.equal(lu.ok, true);
  assert.deepEqual(lu.contenu, {
    bibliotheque: contrat.bibliotheque,
    voyages: [contrat.voyage],
    langue: 'fr',
  });
  assert.deepEqual(lu.resume, { creeLe: CREE, voyages: 1, objets: contrat.bibliotheque.objets.length });
});

test('un voyage sans « écartés » (version d’avant) est accepté', () => {
  const lu = lireSauvegarde(fichier(s => delete s.voyages[0].ecartes));
  assert.equal(lu.ok, true);
  assert.deepEqual(lu.contenu.voyages[0].ecartes, []);
});

test('un fichier illisible ou incomplet est abîmé', () => {
  const texte = fichier();
  assert.equal(raison(texte.slice(0, texte.length / 2)), 'abime');
  assert.equal(raison(''), 'abime');
  assert.equal(raison('null'), 'abime');
});

test('un champ manquant ou mal typé est abîmé', () => {
  assert.equal(raison(fichier(s => delete s.bibliotheque.objets[0].nom)), 'abime');
  assert.equal(raison(fichier(s => (s.voyages[0].objets[0].quantite = '3'))), 'abime');
  assert.equal(raison(fichier(s => delete s.langue)), 'abime');
  // Une date de création illisible ferait échouer l'affichage de la confirmation : fichier abîmé.
  assert.equal(raison(fichier(s => (s.creeLe = 'hier soir'))), 'abime');
});

test('un identifiant en double dans une table est abîmé', () => {
  assert.equal(raison(fichier(s => s.bibliotheque.objets.push(copie(s.bibliotheque.objets[0])))), 'abime');
  assert.equal(raison(fichier(s => s.voyages[0].objets.push(copie(s.voyages[0].objets[0])))), 'abime');
});

test('un identifiant d’objet repris par un autre voyage est abîmé', () => {
  const second = s => {
    const v = copie(s.voyages[0]);
    v.voyage.id = 'v-autre';
    for (const l of [...v.etiquettes, ...v.categories, ...v.objets]) l.voyageId = 'v-autre';
    for (const l of [...v.etiquettes, ...v.categories]) l.id += '-2';
    for (const o of v.objets) o.categorieId += '-2';
    return v;
  };
  // Témoin : un second voyage aux identifiants tous différents est accepté.
  assert.equal(
    lireSauvegarde(
      fichier(s => {
        const v = second(s);
        v.objets.forEach(o => (o.id += '-2'));
        s.voyages.push(v);
      }),
    ).ok,
    true,
  );
  assert.equal(raison(fichier(s => s.voyages.push(second(s)))), 'abime');
});

test('un voyage sans sa clé « voyage », ou des « écartés » mal typés, est abîmé', () => {
  assert.equal(raison(fichier(s => delete s.voyages[0].voyage)), 'abime');
  assert.equal(raison(fichier(s => (s.voyages[0].ecartes = 'om-chargeur'))), 'abime');
  assert.equal(raison(fichier(s => (s.voyages[0].ecartes = [3]))), 'abime');
});

test('des liens vers des lignes inconnues sont abîmés', () => {
  assert.equal(raison(fichier(s => (s.voyages[0].objets[0].categorieId = 'cm-vetements'))), 'abime');
  assert.equal(raison(fichier(s => (s.bibliotheque.etiquettes[0].groupeId = 'inconnu'))), 'abime');
  assert.equal(raison(fichier(s => s.bibliotheque.categories[1].etiquettes.push('inconnu'))), 'abime');
  assert.equal(raison(fichier(s => s.bibliotheque.objets[0].etiquettes.push('inconnu'))), 'abime');
  assert.equal(raison(fichier(s => (s.voyages[0].objets[0].voyageId = 'autre'))), 'abime');
});

test('une version non entière est abîmée', () => {
  assert.equal(raison(fichier(s => (s.version = '1'))), 'abime');
  assert.equal(raison(fichier(s => (s.version = 1.5))), 'abime');
  assert.equal(raison(fichier(s => delete s.version)), 'abime');
  assert.equal(raison(fichier(s => (s.version = 0))), 'abime');
  assert.equal(raison(fichier(s => (s.version = -1))), 'abime');
});

test('un JSON lisible qui n’est pas une sauvegarde a un autre format', () => {
  assert.equal(raison('{"format":"autre","version":1}'), 'format');
  assert.equal(raison('[1,2]'), 'format');
});

test('une version future est refusée, même si le reste est abîmé', () => {
  assert.equal(raison(fichier(s => (s.version = 2))), 'version');
  assert.equal(
    raison(
      fichier(s => {
        s.version = 2;
        delete s.bibliotheque;
      }),
    ),
    'version',
  );
});

test('la sauvegarde construite porte son format et sa version', () => {
  const s = JSON.parse(fichier());
  assert.equal(s.format, FORMAT_SAUVEGARDE);
  assert.equal(s.version, VERSION_SAUVEGARDE);
  assert.equal(s.creeLe, CREE);
});
