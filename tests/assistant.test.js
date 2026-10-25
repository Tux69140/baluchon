// L'état de l'assistant « Nouveau voyage », sans navigateur (docs/PRD.md, « Écrans et gestes »).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fr from '../src/i18n/fr.json' with { type: 'json' };
import { construireBibliotheque } from '../src/modele/bibliotheque.js';
import { nouvelId } from '../src/modele/identifiant.js';
import { genererApercu } from '../src/modele/inclusion.js';
import {
  allerA,
  basculerCategorie,
  basculerEtiquette,
  basculerObjet,
  creerAssistant,
  entrerDansApercu,
  etapesDe,
  etatCoche,
  etatEtape,
  raisonVide,
  remettre,
  saisieCommencee,
  signatureDe,
} from '../src/ecrans/assistant.js';

const depart = () => construireBibliotheque(fr.bibliothequeDeDepart, { nouvelId, maintenant: 'x' });
const idDe = (bibliotheque, nom) => bibliotheque.objets.find(o => o.nom === nom).id;
const types = bibliotheque => etapesDe(bibliotheque).map(e => e.type);
const infos = { nom: '', destination: '', depart: '', retour: '', voyageurs: 2 };
const troisJours = { ...infos, nom: 'Test', depart: '2026-10-10', retour: '2026-10-12' };
const unJour = { ...troisJours, retour: '2026-10-10' };

test('les étapes : informations, un groupe avec étiquettes par étape, aperçu', () => {
  const b = depart();
  assert.deepEqual(types(b), ['informations', 'groupe', 'groupe', 'groupe', 'apercu']);
  assert.deepEqual(types({ ...b, groupes: [], etiquettes: [] }), ['informations', 'apercu']);
  const sansEtiquette = { ...b, etiquettes: b.etiquettes.filter(e => e.groupeId !== b.groupes[0].id) };
  assert.equal(etapesDe(sansEtiquette).length, 4);
});

test('la rangée : courante, ouverte si vue, aperçu ouvert dès que les informations sont valides', () => {
  const dernier = { derniere: 4, infosValides: false };
  const etat = creerAssistant();
  assert.deepEqual(
    [0, 1, 2, 3, 4].map(i => etatEtape(etat, i, dernier)),
    ['courante', 'fermee', 'fermee', 'fermee', 'fermee'],
  );
  const valides = { derniere: 4, infosValides: true };
  assert.deepEqual(
    [0, 1, 2, 3, 4].map(i => etatEtape(etat, i, valides)),
    ['courante', 'fermee', 'fermee', 'fermee', 'ouverte'],
  );
  const ailleurs = allerA(etat, 1);
  assert.deepEqual(
    [0, 1, 2].map(i => etatEtape(ailleurs, i, valides)),
    ['ouverte', 'courante', 'fermee'],
  );
  assert.equal(etat.etape, 0);
  assert.equal(etat.vues.has(1), false);
});

test('étiquettes et objets : bascule sans muter', () => {
  const etat = creerAssistant();
  const avec = basculerEtiquette(etat, 'camping');
  assert.ok(avec.choisies.has('camping') && !etat.choisies.has('camping'));
  assert.ok(!basculerEtiquette(avec, 'camping').choisies.has('camping'));
  const ecarte = basculerObjet(etat, 'o1');
  assert.ok(ecarte.ecartes.has('o1') && !etat.ecartes.has('o1'));
  assert.ok(!basculerObjet(ecarte, 'o1').ecartes.has('o1'));
});

test('etatCoche et basculerCategorie', () => {
  const ids = ['a', 'b', 'c'];
  const plein = creerAssistant();
  assert.deepEqual(etatCoche(ids, plein.ecartes), { retenus: 3, coche: 'plein' });
  const entame = basculerObjet(plein, 'a');
  assert.deepEqual(etatCoche(ids, entame.ecartes), { retenus: 2, coche: 'entame' });
  const vide = basculerCategorie(plein, ids);
  assert.equal(etatCoche(ids, vide.ecartes).coche, 'vide');
  assert.equal(etatCoche(ids, basculerCategorie(entame, ids).ecartes).coche, 'vide');
  assert.equal(etatCoche(ids, basculerCategorie(vide, ids).ecartes).coche, 'plein');
  assert.equal(plein.ecartes.size, 0);
});

test('objets écartés : seulement si la signature a changé et que l’objet est présent', () => {
  const b = depart();
  const gourde = idDe(b, 'Gourde');
  const pyjama = idDe(b, 'Pyjama');
  const etat = { ...creerAssistant(), ecartes: new Set([gourde, pyjama]) };
  const premier = entrerDansApercu(etat, 'a', [gourde, pyjama]);
  assert.deepEqual(premier.aReconfirmer, []);
  assert.equal(premier.etat.signature, 'a');
  assert.equal(etat.signature, null);
  assert.deepEqual(entrerDansApercu(premier.etat, 'a', [gourde]).aReconfirmer, []);
  const change = entrerDansApercu(premier.etat, 'b', [gourde]);
  assert.deepEqual(change.aReconfirmer, [gourde]);
  assert.ok(change.etat.ecartes.has(pyjama));
  assert.equal(change.etat.signature, 'b');
  assert.deepEqual(entrerDansApercu(premier.etat, 'b', [pyjama, gourde]).aReconfirmer, [pyjama, gourde]);
});

test('remettre reprend les objets nommés', () => {
  const etat = { ...creerAssistant(), ecartes: new Set(['a', 'b']) };
  const apres = remettre(etat, ['a']);
  assert.deepEqual([...apres.ecartes], ['b']);
  assert.equal(etat.ecartes.size, 2);
});

test('signatureDe : dates, voyageurs, étiquettes ; pas le nom', () => {
  const base = signatureDe(troisJours, new Set(['a', 'b']));
  assert.equal(signatureDe({ ...troisJours, nom: 'Autre' }, new Set(['b', 'a'])), base);
  assert.notEqual(signatureDe({ ...troisJours, retour: '2026-10-13' }, new Set(['a', 'b'])), base);
  assert.notEqual(signatureDe({ ...troisJours, depart: '2026-10-09' }, new Set(['a', 'b'])), base);
  assert.notEqual(signatureDe({ ...troisJours, voyageurs: 3 }, new Set(['a', 'b'])), base);
  assert.notEqual(signatureDe(troisJours, new Set(['a'])), base);
});

test('Pyjama écarté, dates à un jour : absent et non nommé ; trois jours : présent, toujours écarté', () => {
  const b = depart();
  const pyjama = idDe(b, 'Pyjama');
  const ids = i => genererApercu(b, i, new Set()).flatMap(c => c.objets.map(l => l.objet.id));
  let etat = basculerObjet(creerAssistant(), pyjama);
  assert.ok(ids(troisJours).includes(pyjama));
  etat = entrerDansApercu(etat, signatureDe(troisJours, etat.choisies), ids(troisJours)).etat;
  assert.ok(!ids(unJour).includes(pyjama));
  const court = entrerDansApercu(etat, signatureDe(unJour, etat.choisies), ids(unJour));
  assert.deepEqual(court.aReconfirmer, []);
  assert.ok(court.etat.ecartes.has(pyjama));
  const retour = entrerDansApercu(court.etat, signatureDe(troisJours, etat.choisies), ids(troisJours));
  assert.deepEqual(retour.aReconfirmer, [pyjama]);
  assert.ok(retour.etat.ecartes.has(pyjama));
});

test('raisonVide', () => {
  const ligne = id => ({ categorie: { id: 'c' }, objets: [{ objet: { id }, quantite: 1 }] });
  assert.equal(raisonVide([], new Set()), 'aucunObjet');
  assert.equal(raisonVide([ligne('a'), ligne('b')], new Set(['a', 'b'])), 'toutEcarte');
  assert.equal(raisonVide([ligne('a'), ligne('b')], new Set(['a'])), null);
});

test('saisieCommencee : les 2 voyageurs par défaut ne comptent pas', () => {
  const etat = creerAssistant();
  assert.equal(saisieCommencee(infos, etat), false);
  assert.equal(saisieCommencee({ ...infos, nom: ' ' }, etat), false);
  assert.equal(saisieCommencee({ ...infos, nom: 'Alpes' }, etat), true);
  assert.equal(saisieCommencee({ ...infos, destination: 'Gap' }, etat), true);
  assert.equal(saisieCommencee({ ...infos, depart: '2026-10-10' }, etat), true);
  assert.equal(saisieCommencee(infos, basculerEtiquette(etat, 'camping')), true);
});
