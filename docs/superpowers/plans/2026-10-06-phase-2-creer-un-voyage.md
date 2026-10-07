# Phase 2 — Créer un voyage simple : plan de réalisation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** installer une mini-bibliothèque au premier lancement, créer un voyage depuis un formulaire avec un calendrier unique, l'afficher en lecture seule et classer la liste des voyages en cours, à venir et passés.

**Architecture:** le modèle pur (`src/modele/`) porte les dates, la période, les quantités, la validation, la génération et le classement. La couche de stockage (`src/stockage/`) relaie vers SQLite (Rust, `src-tauri/src/`) ou vers une variante navigateur pour les tests d'écran. Les écrans (`src/ecrans/`) sont des objets `{ nom, charger, dessiner }`, aiguillés par l'adresse dans `src/main.js`.

**Tech Stack:** Tauri 2, JavaScript simple, Vite 6, rusqlite 0.32, Playwright 1.62, `node --test`, Phosphor (`@phosphor-icons/core` 2.1.1, MIT).

**Spec:** `docs/superpowers/specs/2026-10-06-phase-2-design.md` (validée le 2026-10-06), `docs/PLAN.md` phase 2.

## Global Constraints

- Lire `AGENTS.md` et `CLAUDE.md` : français partout (commentaires qui disent le *pourquoi*), TDD (garder la sortie rouge), fichiers de 500 lignes au plus, un nom n'est exporté que s'il est importé ailleurs, aucun texte d'interface hors de `src/i18n/fr.json`.
- Couches : un écran n'importe jamais `src/stockage/*` sauf `src/stockage/index.js` ; le modèle n'importe que le modèle ; seul le stockage parle à Tauri ou à `localStorage`.
- pnpm uniquement (jamais npm/npx).
- **Aucun commit** : le dossier n'est pas un dépôt git et AGENTS.md interdit tout commit sans demande.
- Format : Prettier (`printWidth` 120, guillemets simples, `arrowParens: avoid`). Lancer `pnpm exec prettier --write <fichiers>` après chaque écriture.
- Dates `AAAA-MM-JJ`, calculs en UTC ; « aujourd'hui » = date locale de l'appareil.
- Voyageurs de 1 à 20, 2 par défaut ; durée au plus jusqu'au même jour de l'année suivante (29 février → 28 février).
- Choix A : un appui sur un jour antérieur au départ en fait le nouveau départ.
- Champs JS en camelCase, colonnes SQLite en snake_case ; serde `rename_all = "camelCase"` fait le lien.
- Cibles tactiles ≥ 44 × 44 px, contraste ≥ 4,5:1, rien sous les barres système, aucune requête hors de l'appli.
- Tests d'écran jugés au code de sortie, jamais de pause fixe ; une capture claire et une sombre par écran touché, dans `captures-travail/`.

## Review Focus

1. Nom très long sans espace (120 « A ») : aucun écran ne défile de côté (tâches 8 et 9).
2. Double appui sur « Créer le voyage » : un seul voyage créé (tâche 10).
3. Nom avec `<b>`, `&` et guillemets : affiché tel quel, jamais interprété (tâches 8 et 9).
4. Changement de mois au clavier du 31 janvier : 28 février ; passage décembre → janvier (tâches 1 et 10).
5. Relancement de l'appli : la bibliothèque n'est pas installée une seconde fois ; une panne d'enregistrement laisse le formulaire et affiche un message (tâches 5, 6 et 10).

## Ordre et parallélisme

Tâches 1 → 4 (modèle) dans l'ordre. La tâche 5 (Rust) dépend de la tâche 4 pour son test de contrat. La tâche 6 dépend de la 5 (fixture). La tâche 7 dépend des tâches 4 et 6. Les tâches 8 et 9 peuvent partir ensemble après la 7 (fichiers distincts, sauf une ligne chacune dans `src/main.js`). La tâche 10 vient après la 9, puis la 11.

---

### Task 1: Dates de calendrier

**Files:**
- Create: `src/modele/dates.js`
- Test: `tests/dates.test.js`

**Interfaces:**
- Produces : `estDate(texte) → boolean`, `ajouterJours(date, n) → date`, `ecartEnJours(de, a) → entier`, `dateDuJour(maintenant: Date) → date`, `moisDe(date) → { annee, mois }` (mois de 1 à 12), `moisVoisin({ annee, mois }, decalage) → { annee, mois }`, `ajouterMois(date, n) → date` (jour ramené au dernier du mois si besoin), `moisEnSemaines({ annee, mois }) → (date|null)[][]` (semaines du lundi au dimanche).

- [ ] **Step 1: Write the failing test** — `tests/dates.test.js`

```js
// Dates de calendrier sans heure (docs/PLAN.md, « Dates »).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ajouterJours,
  ajouterMois,
  dateDuJour,
  ecartEnJours,
  estDate,
  moisDe,
  moisEnSemaines,
  moisVoisin,
} from '../src/modele/dates.js';

test('une date se reconnaît à son format et à son existence dans le calendrier', () => {
  assert.equal(estDate('2026-10-10'), true);
  assert.equal(estDate('2028-02-29'), true);
  assert.equal(estDate('2026-02-29'), false);
  assert.equal(estDate('2026-02-30'), false);
  assert.equal(estDate('2026-13-01'), false);
  assert.equal(estDate('10/10/2026'), false);
  assert.equal(estDate(undefined), false);
});

test('ajouter des jours traverse les mois, les années et le changement d’heure', () => {
  assert.equal(ajouterJours('2026-10-24', 2), '2026-10-26');
  assert.equal(ajouterJours('2026-12-31', 1), '2027-01-01');
  assert.equal(ajouterJours('2026-03-01', -1), '2026-02-28');
});

test('l’écart en jours compte les dates entre deux jours', () => {
  assert.equal(ecartEnJours('2026-10-10', '2026-10-13'), 3);
  assert.equal(ecartEnJours('2026-10-10', '2026-10-10'), 0);
  assert.equal(ecartEnJours('2026-03-28', '2026-03-30'), 2);
});

test('la date du jour suit l’horloge locale, même tard le soir', () => {
  assert.equal(dateDuJour(new Date(2026, 9, 12, 23, 30)), '2026-10-12');
  assert.equal(dateDuJour(new Date(2026, 0, 1, 0, 5)), '2026-01-01');
});

test('mois voisins et ajout de mois', () => {
  assert.deepEqual(moisDe('2026-10-10'), { annee: 2026, mois: 10 });
  assert.deepEqual(moisVoisin({ annee: 2026, mois: 12 }, 1), { annee: 2027, mois: 1 });
  assert.deepEqual(moisVoisin({ annee: 2026, mois: 1 }, -1), { annee: 2025, mois: 12 });
  assert.deepEqual(moisVoisin({ annee: 2026, mois: 10 }, 12), { annee: 2027, mois: 10 });
  // Le 31 janvier plus un mois : le dernier jour de février.
  assert.equal(ajouterMois('2026-01-31', 1), '2026-02-28');
  assert.equal(ajouterMois('2028-02-29', 12), '2029-02-28');
  assert.equal(ajouterMois('2026-12-15', 1), '2027-01-15');
  assert.equal(ajouterMois('2026-01-15', -1), '2025-12-15');
});

test('un mois se découpe en semaines du lundi au dimanche', () => {
  // Le 1er octobre 2026 est un jeudi.
  const octobre = moisEnSemaines({ annee: 2026, mois: 10 });
  assert.equal(octobre.length, 5);
  assert.deepEqual(octobre[0], [null, null, null, '2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04']);
  assert.deepEqual(octobre[4], [
    '2026-10-26',
    '2026-10-27',
    '2026-10-28',
    '2026-10-29',
    '2026-10-30',
    '2026-10-31',
    null,
  ]);
  // Février 2027 commence un lundi et compte 28 jours : quatre semaines pleines.
  const fevrier = moisEnSemaines({ annee: 2027, mois: 2 });
  assert.equal(fevrier.length, 4);
  assert.equal(fevrier.flat().includes(null), false);
  assert.equal(fevrier[0][0], '2027-02-01');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/dates.test.js`
Expected : FAIL, `Cannot find module '…/src/modele/dates.js'`.

- [ ] **Step 3: Write minimal implementation** — `src/modele/dates.js`

```js
// Dates de calendrier locales, sans heure (« AAAA-MM-JJ », docs/PLAN.md « Dates »). Les calculs se
// font en UTC : une date de calendrier n'a pas de fuseau, et un passage à l'heure d'été ne doit
// jamais décaler un jour.
const FORMAT = /^(\d{4})-(\d{2})-(\d{2})$/;
const MS_PAR_JOUR = 86_400_000;

const deux = n => String(n).padStart(2, '0');
const versTexte = (annee, mois, jour) => `${annee}-${deux(mois)}-${deux(jour)}`;
const depuisUtc = ms => new Date(ms).toISOString().slice(0, 10);
const joursDansLeMois = (annee, mois) => new Date(Date.UTC(annee, mois, 0)).getUTCDate();

function versUtc(date) {
  const [, annee, mois, jour] = FORMAT.exec(date);
  return Date.UTC(Number(annee), Number(mois) - 1, Number(jour));
}

// Une vraie date du calendrier : le 30 février ou le 13e mois sont refusés.
export function estDate(texte) {
  return typeof texte === 'string' && FORMAT.test(texte) && depuisUtc(versUtc(texte)) === texte;
}

export const ajouterJours = (date, n) => depuisUtc(versUtc(date) + n * MS_PAR_JOUR);

export const ecartEnJours = (de, a) => Math.round((versUtc(a) - versUtc(de)) / MS_PAR_JOUR);

// La date du jour sur l'horloge de l'appareil, en heure locale : à 23 h 30 le 12, on est le 12.
export const dateDuJour = maintenant =>
  versTexte(maintenant.getFullYear(), maintenant.getMonth() + 1, maintenant.getDate());

export const moisDe = date => ({ annee: Number(date.slice(0, 4)), mois: Number(date.slice(5, 7)) });

export function moisVoisin({ annee, mois }, decalage) {
  const indice = annee * 12 + (mois - 1) + decalage;
  return { annee: Math.floor(indice / 12), mois: (indice % 12) + 1 };
}

// Le même jour n mois plus tard, ramené au dernier jour du mois s'il n'existe pas (31 janvier → 28 février).
export function ajouterMois(date, n) {
  const { annee, mois } = moisVoisin(moisDe(date), n);
  return versTexte(annee, mois, Math.min(Number(date.slice(8)), joursDansLeMois(annee, mois)));
}

// Un mois découpé en semaines du lundi au dimanche ; null pour les cases hors du mois.
export function moisEnSemaines({ annee, mois }) {
  const decalage = (new Date(Date.UTC(annee, mois - 1, 1)).getUTCDay() + 6) % 7;
  const cases = [
    ...Array(decalage).fill(null),
    ...Array.from({ length: joursDansLeMois(annee, mois) }, (_, i) => versTexte(annee, mois, i + 1)),
  ];
  while (cases.length % 7) cases.push(null);
  return Array.from({ length: cases.length / 7 }, (_, i) => cases.slice(i * 7, i * 7 + 7));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/dates.test.js`
Expected : PASS (6 tests).

---

### Task 2: Période et quantités

**Files:**
- Create: `src/modele/periode.js`, `src/modele/quantites.js`
- Test: `tests/periode.test.js`, `tests/quantites.test.js`

**Interfaces:**
- Consumes : `ecartEnJours`, `ajouterMois` (tâche 1).
- Produces : `joursEtNuits(depart, retour) → { jours, nuits }` ; `dateLimite(depart) → date` ; `choisirJour({ depart, retour }, jour) → { depart, retour }` (valeurs `null` quand absentes) ; `etatDuJour({ depart, retour }, jour) → { depart, retour, entre, horsLimite }` (booléens) ; `calculerQuantite(objet, { jours, nuits, voyageurs }) → entier`, où `objet = { regle: 'fixe'|'par_jour'|'par_nuit', valeur, plafond: entier|null, parPersonne: boolean }`.

- [ ] **Step 1: Write the failing tests**

`tests/periode.test.js` :

```js
// La période d'un voyage et le choix des dates sur le calendrier (spec phase 2, choix A).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { choisirJour, dateLimite, etatDuJour, joursEtNuits } from '../src/modele/periode.js';

test('jours et nuits : du 10 au 13, 4 jours et 3 nuits ; dans la journée, 1 jour et 0 nuit', () => {
  assert.deepEqual(joursEtNuits('2026-10-10', '2026-10-13'), { jours: 4, nuits: 3 });
  assert.deepEqual(joursEtNuits('2026-10-10', '2026-10-10'), { jours: 1, nuits: 0 });
  assert.deepEqual(joursEtNuits('2026-10-24', '2026-10-26'), { jours: 3, nuits: 2 });
});

test('un voyage dure au plus un an, jusqu’au même jour de l’année suivante', () => {
  assert.equal(dateLimite('2026-10-10'), '2027-10-10');
  assert.equal(dateLimite('2028-02-29'), '2029-02-28');
});

test('premier appui : le départ ; second : le retour ; un nouvel appui recommence', () => {
  const vide = { depart: null, retour: null };
  const depart = choisirJour(vide, '2026-10-15');
  assert.deepEqual(depart, { depart: '2026-10-15', retour: null });
  const complet = choisirJour(depart, '2026-10-18');
  assert.deepEqual(complet, { depart: '2026-10-15', retour: '2026-10-18' });
  assert.deepEqual(choisirJour(complet, '2026-10-20'), { depart: '2026-10-20', retour: null });
  assert.deepEqual(choisirJour(complet, '2026-10-12'), { depart: '2026-10-12', retour: null });
});

test('choix A : un jour antérieur au départ devient le nouveau départ', () => {
  const depart = { depart: '2026-10-15', retour: null };
  assert.deepEqual(choisirJour(depart, '2026-10-12'), { depart: '2026-10-12', retour: null });
});

test('deux appuis sur le même jour : un aller-retour dans la journée', () => {
  assert.deepEqual(choisirJour({ depart: '2026-10-15', retour: null }, '2026-10-15'), {
    depart: '2026-10-15',
    retour: '2026-10-15',
  });
});

test('un jour au-delà d’un an ne change rien ; le dernier jour permis est accepté', () => {
  const depart = { depart: '2026-10-10', retour: null };
  assert.deepEqual(choisirJour(depart, '2027-10-11'), depart);
  assert.deepEqual(choisirJour(depart, '2027-10-10'), { depart: '2026-10-10', retour: '2027-10-10' });
});

test('état d’un jour sur le calendrier', () => {
  const periode = { depart: '2026-10-10', retour: '2026-10-13' };
  assert.deepEqual(etatDuJour(periode, '2026-10-10'), { depart: true, retour: false, entre: false, horsLimite: false });
  assert.deepEqual(etatDuJour(periode, '2026-10-11'), { depart: false, retour: false, entre: true, horsLimite: false });
  assert.deepEqual(etatDuJour(periode, '2026-10-13'), { depart: false, retour: true, entre: false, horsLimite: false });
  const enAttente = { depart: '2026-10-10', retour: null };
  assert.equal(etatDuJour(enAttente, '2027-10-11').horsLimite, true);
  assert.equal(etatDuJour(enAttente, '2027-10-10').horsLimite, false);
  // Choix A : les jours avant le départ restent choisissables.
  assert.equal(etatDuJour(enAttente, '2026-10-01').horsLimite, false);
  assert.equal(etatDuJour({ depart: null, retour: null }, '2030-01-01').horsLimite, false);
});
```

`tests/quantites.test.js` :

```js
// Calcul des quantités (docs/PRD.md, « Calcul des quantités » ; critère de succès 2).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calculerQuantite } from '../src/modele/quantites.js';

const objet = (regle, valeur, { plafond = null, parPersonne = false } = {}) => ({ regle, valeur, plafond, parPersonne });
const du10au13a2 = { jours: 4, nuits: 3, voyageurs: 2 };

test('critère 2 : « Repas : 2 par jour, par personne » vaut 16 du 10 au 13 à deux', () => {
  assert.equal(calculerQuantite(objet('par_jour', 2, { parPersonne: true }), du10au13a2), 16);
});

test('critère 2 : un objet partagé fixe à 1 vaut 1', () => {
  assert.equal(calculerQuantite(objet('fixe', 1), du10au13a2), 1);
});

test('le plafond s’applique par personne, avant la multiplication par les voyageurs', () => {
  const tshirts = objet('par_jour', 1, { plafond: 5, parPersonne: true });
  assert.equal(calculerQuantite(tshirts, { jours: 10, nuits: 9, voyageurs: 2 }), 10);
  // Témoin : sous le plafond, il ne joue pas.
  assert.equal(calculerQuantite(tshirts, du10au13a2), 8);
});

test('par nuit : 0 sur un aller-retour dans la journée', () => {
  const pyjama = objet('par_nuit', 1, { plafond: 1, parPersonne: true });
  assert.equal(calculerQuantite(pyjama, { jours: 1, nuits: 0, voyageurs: 2 }), 0);
  assert.equal(calculerQuantite(pyjama, du10au13a2), 2);
});

test('un objet fixe par personne se multiplie par les voyageurs', () => {
  assert.equal(calculerQuantite(objet('fixe', 1, { parPersonne: true }), { jours: 1, nuits: 0, voyageurs: 3 }), 3);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test tests/periode.test.js tests/quantites.test.js`
Expected : FAIL, modules introuvables.

- [ ] **Step 3: Write minimal implementation**

`src/modele/periode.js` :

```js
// La période d'un voyage : jours et nuits, durée maximale, et le choix des dates sur le calendrier
// unique (docs/superpowers/specs/2026-10-06-phase-2-design.md).
import { ajouterMois, ecartEnJours } from './dates.js';

// Du 10 au 13 : 4 jours, 3 nuits ; un aller-retour dans la journée : 1 jour, 0 nuit.
export function joursEtNuits(depart, retour) {
  const nuits = ecartEnJours(depart, retour);
  return { jours: nuits + 1, nuits };
}

// Un voyage dure au plus un an : retour au plus tard le même jour de l'année suivante (le 28 février
// pour un départ un 29 février).
export const dateLimite = depart => ajouterMois(depart, 12);

// Un appui sur le calendrier. Premier appui : le départ ; second : le retour. Un jour antérieur au
// départ en devient le nouveau départ (choix A du chef de projet, 2026-10-06) ; une fois les deux
// fixés, un appui recommence la sélection. Un jour au-delà d'un an ne change rien.
export function choisirJour({ depart, retour }, jour) {
  if (!depart || retour || jour < depart) return { depart: jour, retour: null };
  if (jour > dateLimite(depart)) return { depart, retour: null };
  return { depart, retour: jour };
}

// Ce que le calendrier montre d'un jour : bornes, période grisée, jours trop lointains.
export function etatDuJour({ depart, retour }, jour) {
  return {
    depart: jour === depart,
    retour: jour === retour,
    entre: Boolean(depart && retour) && jour > depart && jour < retour,
    horsLimite: Boolean(depart) && !retour && jour > dateLimite(depart),
  };
}
```

`src/modele/quantites.js` :

```js
// Quantité d'un objet pour un voyage (docs/PRD.md, « Calcul des quantités ») : valeur fixe, ou par
// jour, ou par nuit ; le plafond s'applique par personne, puis on multiplie par le nombre de
// voyageurs si l'objet est « par personne ». Seul endroit où ce calcul existe.
const BASES = {
  fixe: () => 1,
  par_jour: ({ jours }) => jours,
  par_nuit: ({ nuits }) => nuits,
};

export function calculerQuantite({ regle, valeur, plafond, parPersonne }, periode) {
  const base = valeur * BASES[regle](periode);
  const parTete = plafond === null || plafond === undefined ? base : Math.min(base, plafond);
  return parPersonne ? parTete * periode.voyageurs : parTete;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test tests/periode.test.js tests/quantites.test.js`
Expected : PASS (12 tests).

---

### Task 3: Voyage — validation, génération, classement ; identifiants

**Files:**
- Create: `src/modele/voyage.js`, `src/modele/identifiant.js`
- Test: `tests/voyage.test.js`, `tests/identifiant.test.js`

**Interfaces:**
- Consumes : `estDate` (tâche 1) ; `dateLimite`, `joursEtNuits`, `calculerQuantite` (tâche 2).
- Produces :
  - `VOYAGEURS = { min: 1, max: 20 }` ;
  - `validerInformations({ nom, destination, depart, retour, voyageurs }) → { nom?, dates?, voyageurs? }`, avec les codes `nomManquant`, `datesManquantes`, `datesInvalides`, `retourAvantDepart`, `tropLong`, `voyageursHorsLimites` ;
  - `genererVoyage(bibliotheque, infos, { nouvelId, maintenant }) → { voyage, categories, objets }`, qui lève une `Error` portant `.erreurs` si les informations sont invalides ;
  - `listeParCategorie({ categories, objets }) → [{ categorie, objets }]` ;
  - `classerVoyages(voyages, aujourdhui) → { enCours, aVenir, passes }` ;
  - `nouvelId() → UUID v4`.
- Forme des données (identique à celle de la tâche 5) :
  - bibliothèque `{ categories: [{ id, nom, icone, couleur, ordre, toujoursIncluse, modifieLe }], objets: [{ id, categorieId, nom, regle, valeur, plafond, parPersonne, consommable, toujoursInclus, note, modifieLe }] }` ;
  - voyage `{ id, nom, destination, depart, retour, voyageurs, modifieLe }` ;
  - catégorie du voyage `{ id, voyageId, modeleId, nom, icone, couleur, ordre, modifieLe }` ;
  - objet du voyage `{ id, voyageId, categorieId, modeleId, nom, regle, valeur, plafond, parPersonne, consommable, quantite, quantiteManuelle, dansLeSac, aAcheter, achete, note, modifieLe }`.

- [ ] **Step 1: Write the failing tests**

`tests/identifiant.test.js` :

```js
// Identifiants UUID v4 en texte (docs/PLAN.md, « Schéma »).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nouvelId } from '../src/modele/identifiant.js';

test('un identifiant est un UUID v4, et deux tirages ne se répètent pas', () => {
  const ids = Array.from({ length: 1000 }, nouvelId);
  for (const id of ids) assert.match(id, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  assert.equal(new Set(ids).size, 1000);
});
```

`tests/voyage.test.js` :

```js
// Un voyage : validation, génération depuis la bibliothèque, classement (docs/PLAN.md, phase 2).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classerVoyages, genererVoyage, listeParCategorie, validerInformations } from '../src/modele/voyage.js';

const MAINTENANT = '2026-10-06T08:00:00.000Z';
function compteur() {
  let n = 0;
  return () => `id-${++n}`;
}
const categorie = (id, nom, ordre, toujoursIncluse = true) => ({
  id,
  nom,
  icone: 'package',
  couleur: 'ciel',
  ordre,
  toujoursIncluse,
  modifieLe: 'x',
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
  toujoursInclus: true,
  note: '',
  modifieLe: 'x',
  ...autres,
});
// Catégories rangées dans le désordre : l'ordre de la bibliothèque doit être respecté.
const bibliotheque = () => ({
  categories: [
    categorie('c-ali', 'Alimentation', 1),
    categorie('c-vet', 'Vêtements', 0),
    categorie('c-nuit', 'Nuit', 2),
    categorie('c-ski', 'Ski', 3, false),
  ],
  objets: [
    objet('o-repas', 'c-ali', 'Repas', 'par_jour', 2, { parPersonne: true, consommable: true, note: 'Midi et soir.' }),
    objet('o-dentifrice', 'c-vet', 'Dentifrice', 'fixe', 1),
    objet('o-pyjama', 'c-nuit', 'Pyjama', 'par_nuit', 1, { plafond: 1, parPersonne: true }),
    objet('o-parapluie', 'c-vet', 'Parapluie', 'fixe', 1, { toujoursInclus: false }),
    objet('o-skis', 'c-ski', 'Skis', 'fixe', 1),
  ],
});
const infos = (autres = {}) => ({
  nom: 'Vercors',
  destination: 'Autrans',
  depart: '2026-10-10',
  retour: '2026-10-13',
  voyageurs: 2,
  ...autres,
});
const generer = (i = infos()) => genererVoyage(bibliotheque(), i, { nouvelId: compteur(), maintenant: MAINTENANT });

test('des informations complètes ne portent aucune erreur', () => {
  assert.deepEqual(validerInformations(infos()), {});
  assert.deepEqual(validerInformations(infos({ destination: '' })), {});
  assert.deepEqual(validerInformations(infos({ voyageurs: 1 })), {});
  assert.deepEqual(validerInformations(infos({ voyageurs: 20 })), {});
});

test('chaque information fautive a son code d’erreur', () => {
  assert.deepEqual(validerInformations(infos({ nom: '   ' })), { nom: 'nomManquant' });
  assert.deepEqual(validerInformations(infos({ retour: null })), { dates: 'datesManquantes' });
  assert.deepEqual(validerInformations(infos({ depart: '2026-02-30' })), { dates: 'datesInvalides' });
  assert.deepEqual(validerInformations(infos({ retour: '2026-10-09' })), { dates: 'retourAvantDepart' });
  assert.deepEqual(validerInformations(infos({ voyageurs: 0 })), { voyageurs: 'voyageursHorsLimites' });
  assert.deepEqual(validerInformations(infos({ voyageurs: 21 })), { voyageurs: 'voyageursHorsLimites' });
  assert.deepEqual(validerInformations(infos({ voyageurs: 2.5 })), { voyageurs: 'voyageursHorsLimites' });
  assert.deepEqual(validerInformations(infos({ voyageurs: '2' })), { voyageurs: 'voyageursHorsLimites' });
});

test('un an pile est accepté, un jour de plus est refusé, 29 février compris', () => {
  assert.deepEqual(validerInformations(infos({ retour: '2027-10-10' })), {});
  assert.deepEqual(validerInformations(infos({ retour: '2027-10-11' })), { dates: 'tropLong' });
  assert.deepEqual(validerInformations(infos({ depart: '2028-02-29', retour: '2029-02-28' })), {});
  assert.deepEqual(validerInformations(infos({ depart: '2028-02-29', retour: '2029-03-01' })), { dates: 'tropLong' });
});

test('critère 2 : du 10 au 13 à deux, Repas vaut 16 et le dentifrice partagé 1', () => {
  const { objets } = generer();
  const quantites = Object.fromEntries(objets.map(o => [o.nom, o.quantite]));
  assert.deepEqual(quantites, { Repas: 16, Dentifrice: 1, Pyjama: 2 });
});

test('seuls les « toujours inclus » entrent, dans des catégories elles-mêmes incluses', () => {
  const { categories, objets } = generer();
  assert.deepEqual(
    categories.map(c => c.nom),
    ['Vêtements', 'Alimentation', 'Nuit'],
  );
  assert.equal(
    objets.some(o => o.nom === 'Parapluie' || o.nom === 'Skis'),
    false,
  );
});

test('un objet à 0 est écarté, et une catégorie restée vide aussi', () => {
  const { categories, objets } = generer(infos({ retour: '2026-10-10' }));
  assert.equal(
    objets.some(o => o.nom === 'Pyjama'),
    false,
  );
  assert.equal(
    categories.some(c => c.nom === 'Nuit'),
    false,
  );
});

test('le voyage est une copie : champs copiés, modèle d’origine noté, marques de départ', () => {
  const contenu = generer(infos({ nom: '  Vercors  ', destination: ' Autrans ' }));
  assert.equal(contenu.voyage.nom, 'Vercors');
  assert.equal(contenu.voyage.destination, 'Autrans');
  assert.equal(contenu.voyage.modifieLe, MAINTENANT);
  const repas = contenu.objets.find(o => o.nom === 'Repas');
  const alimentation = contenu.categories.find(c => c.nom === 'Alimentation');
  assert.deepEqual(repas, {
    id: repas.id,
    voyageId: contenu.voyage.id,
    categorieId: alimentation.id,
    modeleId: 'o-repas',
    nom: 'Repas',
    regle: 'par_jour',
    valeur: 2,
    plafond: null,
    parPersonne: true,
    consommable: true,
    quantite: 16,
    quantiteManuelle: false,
    dansLeSac: false,
    aAcheter: true,
    achete: false,
    note: 'Midi et soir.',
    modifieLe: MAINTENANT,
  });
  assert.equal(alimentation.modeleId, 'c-ali');
  assert.equal(alimentation.voyageId, contenu.voyage.id);
  assert.equal(new Set([contenu.voyage.id, ...contenu.categories.map(c => c.id), ...contenu.objets.map(o => o.id)]).size, 1 + 3 + 3);
});

test('changer la bibliothèque après coup ne change pas le voyage', () => {
  const biblio = bibliotheque();
  const contenu = genererVoyage(biblio, infos(), { nouvelId: compteur(), maintenant: MAINTENANT });
  biblio.objets[0].nom = 'Repas renommé';
  biblio.categories[0].nom = 'Autre nom';
  assert.ok(contenu.objets.some(o => o.nom === 'Repas'));
  assert.ok(contenu.categories.some(c => c.nom === 'Alimentation'));
});

test('des informations invalides ne génèrent rien et disent pourquoi', () => {
  assert.throws(
    () => generer(infos({ retour: '2026-10-09' })),
    erreur => erreur.erreurs?.dates === 'retourAvantDepart',
  );
});

test('la liste d’un voyage : catégories dans leur ordre, objets par ordre alphabétique', () => {
  const liste = listeParCategorie({
    categories: [
      { id: 'b', nom: 'B', ordre: 1 },
      { id: 'a', nom: 'A', ordre: 0 },
    ],
    objets: [
      { id: '1', categorieId: 'a', nom: 'Tente' },
      { id: '2', categorieId: 'b', nom: 'Gourde' },
      { id: '3', categorieId: 'a', nom: 'Duvet' },
    ],
  });
  assert.deepEqual(
    liste.map(({ categorie, objets }) => [categorie.nom, objets.map(o => o.nom)]),
    [
      ['A', ['Duvet', 'Tente']],
      ['B', ['Gourde']],
    ],
  );
});

test('classement : en cours, à venir du plus proche, passés du plus récent', () => {
  const v = (nom, depart, retour) => ({ id: nom, nom, depart, retour });
  const classes = classerVoyages(
    [
      v('Pâques', '2026-04-03', '2026-04-06'),
      v('Noël', '2026-12-20', '2026-12-27'),
      v('Vercors', '2026-10-10', '2026-10-13'),
      v('Week-end', '2026-10-09', '2026-10-11'),
      v('Toussaint', '2026-10-24', '2026-11-01'),
      v('Part aujourd’hui', '2026-10-12', '2026-10-20'),
      v('Rentre aujourd’hui', '2026-10-05', '2026-10-12'),
    ],
    '2026-10-12',
  );
  const noms = liste => liste.map(x => x.nom);
  assert.deepEqual(noms(classes.enCours), ['Rentre aujourd’hui', 'Vercors', 'Part aujourd’hui']);
  assert.deepEqual(noms(classes.aVenir), ['Toussaint', 'Noël']);
  assert.deepEqual(noms(classes.passes), ['Week-end', 'Pâques']);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test tests/voyage.test.js tests/identifiant.test.js`
Expected : FAIL, modules introuvables.

- [ ] **Step 3: Write minimal implementation**

`src/modele/identifiant.js` :

```js
// Identifiants UUID v4 en texte (docs/PLAN.md, « Schéma »), tirés par crypto.getRandomValues :
// disponible partout où tourne Baluchon (Android, Debian, Node), contrairement à
// crypto.randomUUID, qui exige une page « sécurisée ».
export function nouvelId() {
  const octets = globalThis.crypto.getRandomValues(new Uint8Array(16));
  octets[6] = (octets[6] & 0x0f) | 0x40;
  octets[8] = (octets[8] & 0x3f) | 0x80;
  const hex = [...octets].map(o => o.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
```

`src/modele/voyage.js` :

```js
// Un voyage : validation des informations saisies, génération depuis la bibliothèque, ordre de sa
// liste et classement des voyages (docs/PLAN.md, phase 2).
import { estDate } from './dates.js';
import { dateLimite, joursEtNuits } from './periode.js';
import { calculerQuantite } from './quantites.js';

export const VOYAGEURS = Object.freeze({ min: 1, max: 20 });

// Les erreurs, rangées par champ ; un objet vide quand tout est bon. Chaque code a son texte dans
// fr.json (nouveauVoyage.erreurs.*). L'écran rend la plupart impossibles (calendrier, − / +), mais
// la règle vit ici : c'est elle qui refuse un voyage absurde, d'où qu'il vienne.
export function validerInformations({ nom, depart, retour, voyageurs }) {
  const erreurs = {};
  if (!String(nom ?? '').trim()) erreurs.nom = 'nomManquant';
  if (!depart || !retour) erreurs.dates = 'datesManquantes';
  else if (!estDate(depart) || !estDate(retour)) erreurs.dates = 'datesInvalides';
  else if (retour < depart) erreurs.dates = 'retourAvantDepart';
  else if (retour > dateLimite(depart)) erreurs.dates = 'tropLong';
  if (!Number.isInteger(voyageurs) || voyageurs < VOYAGEURS.min || voyageurs > VOYAGEURS.max)
    erreurs.voyageurs = 'voyageursHorsLimites';
  return erreurs;
}

const parOrdre = (a, b) => a.ordre - b.ordre;
const parNom = (a, b) => a.nom.localeCompare(b.nom);

// Le voyage est une copie indépendante de la bibliothèque : il ne garde du modèle que son
// identifiant d'origine (modeleId). Phase 2 : seuls les « toujours inclus » entrent ; les étiquettes
// arrivent en phase 4. « À acheter » reprend « consommable » dès maintenant (écran Courses, phase 9).
export function genererVoyage(bibliotheque, infos, { nouvelId, maintenant }) {
  const erreurs = validerInformations(infos);
  if (Object.keys(erreurs).length)
    throw Object.assign(new Error(`Voyage refusé : ${Object.values(erreurs).join(', ')}`), { erreurs });
  const { depart, retour, voyageurs } = infos;
  const periode = { ...joursEtNuits(depart, retour), voyageurs };
  const voyage = {
    id: nouvelId(),
    nom: infos.nom.trim(),
    destination: String(infos.destination ?? '').trim(),
    depart,
    retour,
    voyageurs,
    modifieLe: maintenant,
  };
  const categories = [];
  const objets = [];
  for (const modele of [...bibliotheque.categories].sort(parOrdre)) {
    if (!modele.toujoursIncluse) continue;
    const retenus = bibliotheque.objets
      .filter(o => o.categorieId === modele.id && o.toujoursInclus)
      .map(o => ({ o, quantite: calculerQuantite(o, periode) }))
      .filter(({ quantite }) => quantite > 0);
    if (!retenus.length) continue;
    const { nom, icone, couleur, ordre } = modele;
    const categorie = { id: nouvelId(), voyageId: voyage.id, modeleId: modele.id, nom, icone, couleur, ordre, modifieLe: maintenant };
    categories.push(categorie);
    for (const { o, quantite } of retenus)
      objets.push({
        id: nouvelId(),
        voyageId: voyage.id,
        categorieId: categorie.id,
        modeleId: o.id,
        nom: o.nom,
        regle: o.regle,
        valeur: o.valeur,
        plafond: o.plafond,
        parPersonne: o.parPersonne,
        consommable: o.consommable,
        quantite,
        quantiteManuelle: false,
        dansLeSac: false,
        aAcheter: o.consommable,
        achete: false,
        note: o.note,
        modifieLe: maintenant,
      });
  }
  return { voyage, categories, objets };
}

// La liste d'un voyage à l'écran : catégories dans l'ordre de la bibliothèque, objets par ordre
// alphabétique (docs/PRD.md, « Écrans et gestes » ; les cochés en bas viendront en phase 3).
export function listeParCategorie({ categories, objets }) {
  return [...categories]
    .sort(parOrdre)
    .map(categorie => ({ categorie, objets: objets.filter(o => o.categorieId === categorie.id).sort(parNom) }));
}

// En cours (départ ≤ aujourd'hui ≤ retour), puis à venir du plus proche au plus lointain, puis
// passés du plus récent au plus ancien (docs/PRD.md, « Liste des voyages »).
const parDepart = (a, b) => a.depart.localeCompare(b.depart) || parNom(a, b);
const parRetourRecent = (a, b) => b.retour.localeCompare(a.retour) || parNom(a, b);

export function classerVoyages(voyages, aujourdhui) {
  const enCours = [];
  const aVenir = [];
  const passes = [];
  for (const v of voyages) (v.retour < aujourdhui ? passes : v.depart > aujourdhui ? aVenir : enCours).push(v);
  return { enCours: enCours.sort(parDepart), aVenir: aVenir.sort(parDepart), passes: passes.sort(parRetourRecent) };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test tests/voyage.test.js tests/identifiant.test.js` puis `pnpm exec prettier --write src/modele tests/*.test.js`
Expected : PASS (12 tests).

---

### Task 4: Mini-bibliothèque de départ

**Files:**
- Modify: `src/i18n/fr.json` (ajout de la clé `bibliothequeDeDepart`)
- Create: `src/modele/bibliotheque.js`
- Test: `tests/bibliotheque.test.js`

**Interfaces:**
- Consumes : `genererVoyage`, `nouvelId` (tâche 3).
- Produces : `construireBibliotheque(depart, { nouvelId, maintenant }) → { categories, objets }`, de la forme définie à la tâche 3 ; `fr.bibliothequeDeDepart = { categories: [{ nom, icone, couleur, objets: [{ nom, regle, valeur, plafond?, parPersonne, consommable? }] }] }`.

- [ ] **Step 1: Write the failing test** — `tests/bibliotheque.test.js`

```js
// La mini-bibliothèque de départ (spec phase 2) : décrite dans fr.json, installée une fois.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fr from '../src/i18n/fr.json' with { type: 'json' };
import { construireBibliotheque } from '../src/modele/bibliotheque.js';
import { nouvelId } from '../src/modele/identifiant.js';
import { genererVoyage } from '../src/modele/voyage.js';

const MAINTENANT = '2026-10-06T08:00:00.000Z';
const construire = () => construireBibliotheque(fr.bibliothequeDeDepart, { nouvelId, maintenant: MAINTENANT });

test('quatre catégories dans l’ordre prévu, toutes toujours incluses', () => {
  const { categories } = construire();
  assert.deepEqual(
    categories.map(c => [c.nom, c.icone, c.couleur, c.ordre, c.toujoursIncluse]),
    [
      ['Vêtements', 't-shirt', 'ciel', 0, true],
      ['Toilette', 'tooth', 'lagon', 1, true],
      ['Alimentation', 'fork-knife', 'pomme', 2, true],
      ['Papiers', 'identification-card', 'tournesol', 3, true],
    ],
  );
  assert.ok(categories.every(c => c.modifieLe === MAINTENANT));
});

test('neuf objets rattachés à leur catégorie, avec leurs règles', () => {
  const { categories, objets } = construire();
  const nomDe = id => categories.find(c => c.id === id).nom;
  assert.deepEqual(
    objets.map(o => [nomDe(o.categorieId), o.nom, o.regle, o.valeur, o.plafond, o.parPersonne, o.consommable]),
    [
      ['Vêtements', 'T-shirts', 'par_jour', 1, 5, true, false],
      ['Vêtements', 'Sous-vêtements', 'par_jour', 1, null, true, false],
      ['Vêtements', 'Pyjama', 'par_nuit', 1, 1, true, false],
      ['Toilette', 'Brosse à dents', 'fixe', 1, null, true, false],
      ['Toilette', 'Dentifrice', 'fixe', 1, null, false, false],
      ['Alimentation', 'Repas', 'par_jour', 2, null, true, true],
      ['Alimentation', 'Gourde', 'fixe', 1, null, true, false],
      ['Papiers', 'Pièce d’identité', 'fixe', 1, null, true, false],
      ['Papiers', 'Chargeur de téléphone', 'fixe', 1, null, false, false],
    ],
  );
  assert.ok(objets.every(o => o.toujoursInclus && o.note === '' && o.modifieLe === MAINTENANT));
  const ids = [...categories, ...objets].map(x => x.id);
  assert.equal(new Set(ids).size, ids.length);
});

test('avec la vraie bibliothèque, du 10 au 13 à deux : Repas 16, T-shirts 8, Pyjama 2, Dentifrice 1', () => {
  const contenu = genererVoyage(
    construire(),
    { nom: 'Vercors', destination: '', depart: '2026-10-10', retour: '2026-10-13', voyageurs: 2 },
    { nouvelId, maintenant: MAINTENANT },
  );
  const q = Object.fromEntries(contenu.objets.map(o => [o.nom, o.quantite]));
  assert.equal(q.Repas, 16);
  assert.equal(q['T-shirts'], 8);
  assert.equal(q.Pyjama, 2);
  assert.equal(q.Dentifrice, 1);
  assert.equal(contenu.objets.length, 9);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/bibliotheque.test.js`
Expected : FAIL, module `src/modele/bibliotheque.js` introuvable.

- [ ] **Step 3: Write minimal implementation**

Ajouter à `src/i18n/fr.json`, au premier niveau, après `"erreurs"` :

```json
  "bibliothequeDeDepart": {
    "categories": [
      {
        "nom": "Vêtements",
        "icone": "t-shirt",
        "couleur": "ciel",
        "objets": [
          { "nom": "T-shirts", "regle": "par_jour", "valeur": 1, "plafond": 5, "parPersonne": true },
          { "nom": "Sous-vêtements", "regle": "par_jour", "valeur": 1, "parPersonne": true },
          { "nom": "Pyjama", "regle": "par_nuit", "valeur": 1, "plafond": 1, "parPersonne": true }
        ]
      },
      {
        "nom": "Toilette",
        "icone": "tooth",
        "couleur": "lagon",
        "objets": [
          { "nom": "Brosse à dents", "regle": "fixe", "valeur": 1, "parPersonne": true },
          { "nom": "Dentifrice", "regle": "fixe", "valeur": 1, "parPersonne": false }
        ]
      },
      {
        "nom": "Alimentation",
        "icone": "fork-knife",
        "couleur": "pomme",
        "objets": [
          { "nom": "Repas", "regle": "par_jour", "valeur": 2, "parPersonne": true, "consommable": true },
          { "nom": "Gourde", "regle": "fixe", "valeur": 1, "parPersonne": true }
        ]
      },
      {
        "nom": "Papiers",
        "icone": "identification-card",
        "couleur": "tournesol",
        "objets": [
          { "nom": "Pièce d’identité", "regle": "fixe", "valeur": 1, "parPersonne": true },
          { "nom": "Chargeur de téléphone", "regle": "fixe", "valeur": 1, "parPersonne": false }
        ]
      }
    ]
  }
```

`src/modele/bibliotheque.js` :

```js
// La bibliothèque de départ : décrite dans le fichier de traduction (src/i18n/fr.json,
// « bibliothequeDeDepart »), elle devient au premier lancement les lignes de la bibliothèque de
// l'utilisateur, qui lui appartiennent ensuite (docs/PRD.md, « Données »). Mini-bibliothèque de la
// phase 2 : tout y est « toujours inclus », les étiquettes arrivent en phase 4.
export function construireBibliotheque(depart, { nouvelId, maintenant }) {
  const categories = [];
  const objets = [];
  depart.categories.forEach(({ nom, icone, couleur, objets: siens }, ordre) => {
    const id = nouvelId();
    categories.push({ id, nom, icone, couleur, ordre, toujoursIncluse: true, modifieLe: maintenant });
    for (const o of siens)
      objets.push({
        id: nouvelId(),
        categorieId: id,
        nom: o.nom,
        regle: o.regle,
        valeur: o.valeur,
        plafond: o.plafond ?? null,
        parPersonne: o.parPersonne,
        consommable: o.consommable ?? false,
        toujoursInclus: true,
        note: o.note ?? '',
        modifieLe: maintenant,
      });
  });
  return { categories, objets };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test tests/bibliotheque.test.js tests/traduction.test.js` puis `pnpm controles`
Expected : PASS ; contrôles verts (aucun texte hors traduction, exports tous importés).

---

### Task 5: Base SQLite — migration 002, bibliothèque, voyages, contrat

**Files:**
- Create : `src-tauri/migrations/002_bibliotheque_et_voyages.sql`, `src-tauri/src/bibliotheque.rs`, `src-tauri/src/voyages.rs`, `src-tauri/src/essais.rs`, `tests/contrat/stockage.json`, `tests/contrat.test.js`.
- Modify : `src-tauri/src/base.rs` (ses lectures de voyages partent dans `voyages.rs`, ses outils de test dans `essais.rs`), `src-tauri/src/lib.rs`, `src-tauri/Cargo.toml` (`[dev-dependencies] serde_json = "1"`, déjà présent dans le verrou par Tauri), `package.json` (script `test:base`, ajouté à `verif`).

**Interfaces:**
- Consumes : la forme des données de la tâche 3 ; `construireBibliotheque` (tâche 4).
- Produces, en commandes Tauri :
  - `lister_voyages() → Voyage[]` ;
  - `bibliotheque_installee() → bool` ;
  - `installer_bibliotheque(bibliotheque, langue) → bool` (false si elle était déjà installée) ;
  - `lire_bibliotheque() → { categories, objets }`, triés par ordre de catégorie puis par ordre d'insertion ;
  - `creer_voyage(contenu)` ;
  - `lire_voyage(id) → { voyage, categories, objets } | null`.

- [ ] **Step 1: Write the contract fixture and the failing tests**

`tests/contrat/stockage.json` (lu par les deux côtés) :

```json
{
  "bibliotheque": {
    "categories": [
      { "id": "cm-vetements", "nom": "Vêtements", "icone": "t-shirt", "couleur": "ciel", "ordre": 0, "toujoursIncluse": true, "modifieLe": "2026-10-06T08:00:00.000Z" },
      { "id": "cm-papiers", "nom": "Papiers", "icone": "identification-card", "couleur": "tournesol", "ordre": 1, "toujoursIncluse": true, "modifieLe": "2026-10-06T08:00:00.000Z" }
    ],
    "objets": [
      { "id": "om-tshirts", "categorieId": "cm-vetements", "nom": "T-shirts", "regle": "par_jour", "valeur": 1, "plafond": 5, "parPersonne": true, "consommable": false, "toujoursInclus": true, "note": "", "modifieLe": "2026-10-06T08:00:00.000Z" },
      { "id": "om-chargeur", "categorieId": "cm-papiers", "nom": "Chargeur de téléphone", "regle": "fixe", "valeur": 1, "plafond": null, "parPersonne": false, "consommable": false, "toujoursInclus": true, "note": "Un pour deux suffit.", "modifieLe": "2026-10-06T08:00:00.000Z" }
    ]
  },
  "voyage": {
    "voyage": { "id": "v-vercors", "nom": "Vercors", "destination": "Autrans", "depart": "2026-10-10", "retour": "2026-10-13", "voyageurs": 2, "modifieLe": "2026-10-06T08:00:00.000Z" },
    "categories": [
      { "id": "cv-vetements", "voyageId": "v-vercors", "modeleId": "cm-vetements", "nom": "Vêtements", "icone": "t-shirt", "couleur": "ciel", "ordre": 0, "modifieLe": "2026-10-06T08:00:00.000Z" },
      { "id": "cv-alimentation", "voyageId": "v-vercors", "modeleId": null, "nom": "Alimentation", "icone": "fork-knife", "couleur": "pomme", "ordre": 2, "modifieLe": "2026-10-06T08:00:00.000Z" }
    ],
    "objets": [
      { "id": "ov-tshirts", "voyageId": "v-vercors", "categorieId": "cv-vetements", "modeleId": "om-tshirts", "nom": "T-shirts", "regle": "par_jour", "valeur": 1, "plafond": 5, "parPersonne": true, "consommable": false, "quantite": 8, "quantiteManuelle": false, "dansLeSac": false, "aAcheter": false, "achete": false, "note": "", "modifieLe": "2026-10-06T08:00:00.000Z" },
      { "id": "ov-repas", "voyageId": "v-vercors", "categorieId": "cv-alimentation", "modeleId": null, "nom": "Repas", "regle": "par_jour", "valeur": 2, "plafond": null, "parPersonne": true, "consommable": true, "quantite": 16, "quantiteManuelle": false, "dansLeSac": false, "aAcheter": true, "achete": false, "note": "Midi et soir.", "modifieLe": "2026-10-06T08:00:00.000Z" }
    ]
  }
}
```

`tests/contrat.test.js` :

```js
// La forme des données échangées entre le modèle et la base : tests/contrat/stockage.json est relu
// tel quel par les tests de la base (src-tauri/src/essais.rs). Ce que fabrique le modèle doit avoir
// exactement les mêmes champs, sinon la base le refuserait sur l'appareil.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import contrat from './contrat/stockage.json' with { type: 'json' };
import fr from '../src/i18n/fr.json' with { type: 'json' };
import { construireBibliotheque } from '../src/modele/bibliotheque.js';
import { nouvelId } from '../src/modele/identifiant.js';
import { genererVoyage } from '../src/modele/voyage.js';

const champs = objet => Object.keys(objet).sort();
const bibliotheque = construireBibliotheque(fr.bibliothequeDeDepart, { nouvelId, maintenant: 'x' });

test('la bibliothèque construite a les champs attendus par la base', () => {
  assert.deepEqual(champs(bibliotheque), champs(contrat.bibliotheque));
  for (const c of bibliotheque.categories) assert.deepEqual(champs(c), champs(contrat.bibliotheque.categories[0]));
  for (const o of bibliotheque.objets) assert.deepEqual(champs(o), champs(contrat.bibliotheque.objets[0]));
});

test('le voyage généré a les champs attendus par la base', () => {
  const contenu = genererVoyage(
    bibliotheque,
    { nom: 'Vercors', destination: '', depart: '2026-10-10', retour: '2026-10-13', voyageurs: 2 },
    { nouvelId, maintenant: 'x' },
  );
  assert.deepEqual(champs(contenu), champs(contrat.voyage));
  assert.deepEqual(champs(contenu.voyage), champs(contrat.voyage.voyage));
  for (const c of contenu.categories) assert.deepEqual(champs(c), champs(contrat.voyage.categories[0]));
  for (const o of contenu.objets) assert.deepEqual(champs(o), champs(contrat.voyage.objets[0]));
});
```

Tests Rust : voir les blocs `#[cfg(test)]` des fichiers de l'étape 3, à écrire **avant** les fonctions qu'ils appellent. Pour l'étape rouge, écrire d'abord `essais.rs`, les modules de test et des signatures vides (`todo!()`).

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test tests/contrat.test.js` → PASS attendu si les tâches 3 et 4 sont faites. C'est le témoin positif. Pour prouver qu'il rougit, retirer temporairement `note` d'un objet dans `construireBibliotheque` : le test doit échouer sur `champs`. Remettre le champ ensuite.
Run: `cargo test --manifest-path src-tauri/Cargo.toml` → FAIL (`todo!()` ou table `meta` inexistante).

- [ ] **Step 3: Write the implementation**

`src-tauri/migrations/002_bibliotheque_et_voyages.sql` :

```sql
-- Phase 2 (docs/PLAN.md, « Schéma ») : la bibliothèque (sans étiquettes : phase 4) et le contenu des
-- voyages. Un voyage est une copie indépendante : modele_id garde seulement la trace du modèle
-- d'origine, sans contrainte, pour qu'une suppression dans la bibliothèque ne touche jamais un
-- voyage. Seuls des ajouts : les voyages existants ne changent pas.
CREATE TABLE meta (
  cle TEXT PRIMARY KEY NOT NULL,
  valeur TEXT NOT NULL
);

CREATE TABLE categorie_modele (
  id TEXT PRIMARY KEY NOT NULL,
  nom TEXT NOT NULL,
  icone TEXT NOT NULL,
  couleur TEXT NOT NULL,
  ordre INTEGER NOT NULL,
  toujours_incluse INTEGER NOT NULL CHECK (toujours_incluse IN (0, 1)),
  modifie_le TEXT NOT NULL
);

CREATE TABLE objet_modele (
  id TEXT PRIMARY KEY NOT NULL,
  categorie_id TEXT NOT NULL REFERENCES categorie_modele (id),
  nom TEXT NOT NULL,
  regle TEXT NOT NULL CHECK (regle IN ('fixe', 'par_jour', 'par_nuit')),
  valeur INTEGER NOT NULL CHECK (valeur >= 0),
  plafond INTEGER CHECK (plafond IS NULL OR plafond >= 0),
  par_personne INTEGER NOT NULL CHECK (par_personne IN (0, 1)),
  consommable INTEGER NOT NULL CHECK (consommable IN (0, 1)),
  toujours_inclus INTEGER NOT NULL CHECK (toujours_inclus IN (0, 1)),
  note TEXT NOT NULL DEFAULT '',
  modifie_le TEXT NOT NULL
);

CREATE TABLE categorie_du_voyage (
  id TEXT PRIMARY KEY NOT NULL,
  voyage_id TEXT NOT NULL REFERENCES voyage (id) ON DELETE CASCADE,
  modele_id TEXT,
  nom TEXT NOT NULL,
  icone TEXT NOT NULL,
  couleur TEXT NOT NULL,
  ordre INTEGER NOT NULL,
  modifie_le TEXT NOT NULL
);
CREATE INDEX categorie_du_voyage_par_voyage ON categorie_du_voyage (voyage_id);

CREATE TABLE objet_du_voyage (
  id TEXT PRIMARY KEY NOT NULL,
  voyage_id TEXT NOT NULL REFERENCES voyage (id) ON DELETE CASCADE,
  categorie_id TEXT NOT NULL REFERENCES categorie_du_voyage (id) ON DELETE CASCADE,
  modele_id TEXT,
  nom TEXT NOT NULL,
  regle TEXT NOT NULL CHECK (regle IN ('fixe', 'par_jour', 'par_nuit')),
  valeur INTEGER NOT NULL CHECK (valeur >= 0),
  plafond INTEGER CHECK (plafond IS NULL OR plafond >= 0),
  par_personne INTEGER NOT NULL CHECK (par_personne IN (0, 1)),
  consommable INTEGER NOT NULL CHECK (consommable IN (0, 1)),
  quantite INTEGER NOT NULL CHECK (quantite >= 0),
  quantite_manuelle INTEGER NOT NULL DEFAULT 0 CHECK (quantite_manuelle IN (0, 1)),
  dans_le_sac INTEGER NOT NULL DEFAULT 0 CHECK (dans_le_sac IN (0, 1)),
  a_acheter INTEGER NOT NULL DEFAULT 0 CHECK (a_acheter IN (0, 1)),
  achete INTEGER NOT NULL DEFAULT 0 CHECK (achete IN (0, 1)),
  note TEXT NOT NULL DEFAULT '',
  modifie_le TEXT NOT NULL
);
CREATE INDEX objet_du_voyage_par_voyage ON objet_du_voyage (voyage_id);
```

`src-tauri/src/base.rs` (remplace le fichier ; `lister_voyages`, la structure `Voyage` et leurs tests partent dans `voyages.rs`, le dossier temporaire dans `essais.rs`) :

```rust
// La base locale SQLite : ouverture et migrations. Les lectures et écritures vivent par sujet
// (bibliotheque.rs, voyages.rs) ; les commandes Tauri (lib.rs) ne font que relayer.
use rusqlite::{Connection, Params, Row};
use std::{
    path::Path,
    sync::{Mutex, MutexGuard},
};

const MIGRATIONS: [&str; 2] = [
    include_str!("../migrations/001_initial.sql"),
    include_str!("../migrations/002_bibliotheque_et_voyages.sql"),
];

pub struct Base(Mutex<Connection>);

// Les erreurs SQLite remontent à l'écran sous forme de texte : les commandes Tauri renvoient String.
pub fn en_texte(erreur: rusqlite::Error) -> String {
    erreur.to_string()
}

// Toutes les lignes d'une requête, lues par `lire`.
pub fn lire_lignes<T, P: Params>(
    connexion: &Connection,
    sql: &str,
    parametres: P,
    lire: fn(&Row<'_>) -> rusqlite::Result<T>,
) -> Result<Vec<T>, String> {
    let mut requete = connexion.prepare(sql).map_err(en_texte)?;
    let lignes = requete.query_map(parametres, lire).map_err(en_texte)?;
    lignes.collect::<Result<_, _>>().map_err(en_texte)
}

// (version_du_schema et migrer : inchangées, recopiées telles quelles depuis la phase 1.)

impl Base {
    // (ouvrir : inchangée.)

    pub fn connexion(&self) -> Result<MutexGuard<'_, Connection>, String> {
        self.0.lock().map_err(|_| "La base locale est verrouillée.".to_owned())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::essais::{base_jetable, Dossier};

    fn version(base: &Base) -> i64 {
        base.connexion()
            .unwrap()
            .query_row("SELECT MAX(version) FROM schema_migrations", [], |r| r.get(0))
            .unwrap()
    }

    #[test]
    fn une_base_neuve_est_a_la_derniere_version() {
        let (_dossier, base) = base_jetable();
        assert_eq!(version(&base), MIGRATIONS.len() as i64);
    }

    // (rouvrir_une_base_garde_ses_donnees_sans_rejouer_les_migrations et
    // le_nombre_de_voyageurs_reste_entre_1_et_20 : inchangés, sauf `base.0.lock().unwrap()` qui
    // devient `base.connexion().unwrap()`, et `tempfile_maison::Dossier` qui devient `Dossier`.)

    #[test]
    fn la_migration_002_garde_les_voyages_de_la_phase_1() {
        let dossier = Dossier::nouveau();
        let chemin = dossier.chemin.join("phase1.sqlite3");
        {
            let connexion = Connection::open(&chemin).unwrap();
            connexion.execute_batch(MIGRATIONS[0]).unwrap();
            connexion
                .execute("INSERT INTO schema_migrations (version) VALUES (1)", [])
                .unwrap();
            connexion
                .execute(
                    "INSERT INTO voyage (id, nom, destination, depart, retour, voyageurs, modifie_le)
                     VALUES ('v1', 'Vercors', 'Autrans', '2026-10-10', '2026-10-13', 2, 'x')",
                    [],
                )
                .unwrap();
        }
        let base = Base::ouvrir(&chemin).unwrap();
        assert_eq!(version(&base), 2);
        assert_eq!(base.lister_voyages().unwrap()[0].nom, "Vercors");
        assert!(!base.bibliotheque_installee().unwrap());
    }
}
```

`src-tauri/src/essais.rs` :

```rust
// Outils communs des tests de la base : dossier temporaire effacé en fin de test (sans dépendance
// de plus), base jetable, et données d'essai lues dans tests/contrat/stockage.json — le fichier que
// vérifie aussi tests/contrat.test.js côté modèle : les deux côtés parlent la même forme.
use crate::base::Base;
use crate::bibliotheque::Bibliotheque;
use crate::voyages::VoyageComplet;
use serde::Deserialize;
use std::path::PathBuf;
use std::sync::atomic::{AtomicU32, Ordering};

static COMPTEUR: AtomicU32 = AtomicU32::new(0);

pub struct Dossier {
    pub chemin: PathBuf,
}

impl Dossier {
    pub fn nouveau() -> Dossier {
        let numero = COMPTEUR.fetch_add(1, Ordering::SeqCst);
        let chemin = std::env::temp_dir().join(format!("baluchon-essai-{}-{numero}", std::process::id()));
        std::fs::create_dir_all(&chemin).unwrap();
        Dossier { chemin }
    }
}

impl Drop for Dossier {
    fn drop(&mut self) {
        let _ = std::fs::remove_dir_all(&self.chemin);
    }
}

pub fn base_jetable() -> (Dossier, Base) {
    let dossier = Dossier::nouveau();
    let base = Base::ouvrir(&dossier.chemin.join("essai.sqlite3")).unwrap();
    (dossier, base)
}

#[derive(Deserialize)]
pub struct Contrat {
    pub bibliotheque: Bibliotheque,
    pub voyage: VoyageComplet,
}

pub fn contrat() -> Contrat {
    serde_json::from_str(include_str!("../../tests/contrat/stockage.json")).unwrap()
}
```

`src-tauri/src/bibliotheque.rs` :

```rust
// La bibliothèque de l'utilisateur : installée une seule fois depuis la bibliothèque de départ
// (construite par le modèle, src/modele/bibliotheque.js), puis lue pour générer les voyages.
use crate::base::{en_texte, lire_lignes, Base};
use rusqlite::{params, Connection, Row};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CategorieModele {
    pub id: String,
    pub nom: String,
    pub icone: String,
    pub couleur: String,
    pub ordre: i64,
    pub toujours_incluse: bool,
    pub modifie_le: String,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ObjetModele {
    pub id: String,
    pub categorie_id: String,
    pub nom: String,
    pub regle: String,
    pub valeur: i64,
    pub plafond: Option<i64>,
    pub par_personne: bool,
    pub consommable: bool,
    pub toujours_inclus: bool,
    pub note: String,
    pub modifie_le: String,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Bibliotheque {
    pub categories: Vec<CategorieModele>,
    pub objets: Vec<ObjetModele>,
}

const INSTALLEE: &str = "bibliotheque_installee";

fn est_installee(connexion: &Connection) -> Result<bool, String> {
    connexion
        .query_row("SELECT COUNT(*) FROM meta WHERE cle = ?1", [INSTALLEE], |r| r.get::<_, i64>(0))
        .map(|n| n > 0)
        .map_err(en_texte)
}

fn categorie_depuis(r: &Row<'_>) -> rusqlite::Result<CategorieModele> {
    Ok(CategorieModele {
        id: r.get(0)?,
        nom: r.get(1)?,
        icone: r.get(2)?,
        couleur: r.get(3)?,
        ordre: r.get(4)?,
        toujours_incluse: r.get(5)?,
        modifie_le: r.get(6)?,
    })
}

fn objet_depuis(r: &Row<'_>) -> rusqlite::Result<ObjetModele> {
    Ok(ObjetModele {
        id: r.get(0)?,
        categorie_id: r.get(1)?,
        nom: r.get(2)?,
        regle: r.get(3)?,
        valeur: r.get(4)?,
        plafond: r.get(5)?,
        par_personne: r.get(6)?,
        consommable: r.get(7)?,
        toujours_inclus: r.get(8)?,
        note: r.get(9)?,
        modifie_le: r.get(10)?,
    })
}

impl Base {
    pub fn bibliotheque_installee(&self) -> Result<bool, String> {
        est_installee(&self.connexion()?)
    }

    // Vérification et écriture dans une seule opération : une erreur ne laisse jamais une
    // bibliothèque à moitié installée, et un second appel ne l'installe pas deux fois.
    // Renvoie false si elle était déjà là (rien n'est écrit).
    pub fn installer_bibliotheque(&self, bibliotheque: &Bibliotheque, langue: &str) -> Result<bool, String> {
        let connexion = self.connexion()?;
        let tx = connexion.unchecked_transaction().map_err(en_texte)?;
        if est_installee(&tx)? {
            return Ok(false);
        }
        for c in &bibliotheque.categories {
            tx.execute(
                "INSERT INTO categorie_modele (id, nom, icone, couleur, ordre, toujours_incluse, modifie_le)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
                params![c.id, c.nom, c.icone, c.couleur, c.ordre, c.toujours_incluse, c.modifie_le],
            )
            .map_err(en_texte)?;
        }
        for o in &bibliotheque.objets {
            tx.execute(
                "INSERT INTO objet_modele (id, categorie_id, nom, regle, valeur, plafond, par_personne,
                   consommable, toujours_inclus, note, modifie_le)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)",
                params![
                    o.id,
                    o.categorie_id,
                    o.nom,
                    o.regle,
                    o.valeur,
                    o.plafond,
                    o.par_personne,
                    o.consommable,
                    o.toujours_inclus,
                    o.note,
                    o.modifie_le
                ],
            )
            .map_err(en_texte)?;
        }
        tx.execute(
            "INSERT INTO meta (cle, valeur) VALUES (?1, '1'), ('langue_bibliotheque', ?2)",
            params![INSTALLEE, langue],
        )
        .map_err(en_texte)?;
        tx.commit().map_err(en_texte)?;
        Ok(true)
    }

    pub fn lire_bibliotheque(&self) -> Result<Bibliotheque, String> {
        let connexion = self.connexion()?;
        let categories = lire_lignes(
            &connexion,
            "SELECT id, nom, icone, couleur, ordre, toujours_incluse, modifie_le
             FROM categorie_modele ORDER BY ordre, rowid",
            [],
            categorie_depuis,
        )?;
        let objets = lire_lignes(
            &connexion,
            "SELECT o.id, o.categorie_id, o.nom, o.regle, o.valeur, o.plafond, o.par_personne,
                    o.consommable, o.toujours_inclus, o.note, o.modifie_le
             FROM objet_modele o JOIN categorie_modele c ON c.id = o.categorie_id
             ORDER BY c.ordre, o.rowid",
            [],
            objet_depuis,
        )?;
        Ok(Bibliotheque { categories, objets })
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::essais::{base_jetable, contrat};

    fn langue(base: &Base) -> Option<String> {
        base.connexion()
            .unwrap()
            .query_row("SELECT valeur FROM meta WHERE cle = 'langue_bibliotheque'", [], |r| r.get(0))
            .ok()
    }

    #[test]
    fn une_bibliotheque_installee_est_relue_a_l_identique() {
        let (_dossier, base) = base_jetable();
        assert!(!base.bibliotheque_installee().unwrap());
        let bibliotheque = contrat().bibliotheque;
        assert!(base.installer_bibliotheque(&bibliotheque, "fr").unwrap());
        assert!(base.bibliotheque_installee().unwrap());
        assert_eq!(base.lire_bibliotheque().unwrap(), bibliotheque);
        assert_eq!(langue(&base).as_deref(), Some("fr"));
    }

    #[test]
    fn la_bibliotheque_ne_s_installe_qu_une_fois() {
        let (_dossier, base) = base_jetable();
        let premiere = contrat().bibliotheque;
        base.installer_bibliotheque(&premiere, "fr").unwrap();
        let mut seconde = contrat().bibliotheque;
        seconde.categories[0].nom = "Autre".into();
        seconde.categories[0].id = "autre".into();
        seconde.objets.clear();
        assert!(!base.installer_bibliotheque(&seconde, "en").unwrap());
        assert_eq!(base.lire_bibliotheque().unwrap(), premiere);
        assert_eq!(langue(&base).as_deref(), Some("fr"));
    }

    #[test]
    fn une_installation_refusee_n_ecrit_rien() {
        let (_dossier, base) = base_jetable();
        let mut bibliotheque = contrat().bibliotheque;
        bibliotheque.objets[1].categorie_id = "categorie-inconnue".into();
        assert!(base.installer_bibliotheque(&bibliotheque, "fr").is_err());
        assert!(!base.bibliotheque_installee().unwrap());
        assert_eq!(base.lire_bibliotheque().unwrap().categories, vec![]);
    }
}
```

`src-tauri/src/voyages.rs` :

```rust
// Les voyages : liste, création et lecture d'un voyage complet. Un voyage est une copie
// indépendante de la bibliothèque (docs/PLAN.md, « Schéma ») ; il est créé en une seule opération,
// qui n'écrit rien si une seule ligne est refusée.
use crate::base::{en_texte, lire_lignes, Base};
use rusqlite::{params, OptionalExtension, Row};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Voyage {
    pub id: String,
    pub nom: String,
    pub destination: String,
    pub depart: String,
    pub retour: String,
    pub voyageurs: i64,
    pub modifie_le: String,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CategorieDuVoyage {
    pub id: String,
    pub voyage_id: String,
    pub modele_id: Option<String>,
    pub nom: String,
    pub icone: String,
    pub couleur: String,
    pub ordre: i64,
    pub modifie_le: String,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ObjetDuVoyage {
    pub id: String,
    pub voyage_id: String,
    pub categorie_id: String,
    pub modele_id: Option<String>,
    pub nom: String,
    pub regle: String,
    pub valeur: i64,
    pub plafond: Option<i64>,
    pub par_personne: bool,
    pub consommable: bool,
    pub quantite: i64,
    pub quantite_manuelle: bool,
    pub dans_le_sac: bool,
    pub a_acheter: bool,
    pub achete: bool,
    pub note: String,
    pub modifie_le: String,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct VoyageComplet {
    pub voyage: Voyage,
    pub categories: Vec<CategorieDuVoyage>,
    pub objets: Vec<ObjetDuVoyage>,
}

const COLONNES_VOYAGE: &str = "id, nom, destination, depart, retour, voyageurs, modifie_le";
const COLONNES_CATEGORIE: &str = "id, voyage_id, modele_id, nom, icone, couleur, ordre, modifie_le";
const COLONNES_OBJET: &str = "id, voyage_id, categorie_id, modele_id, nom, regle, valeur, plafond, par_personne,
    consommable, quantite, quantite_manuelle, dans_le_sac, a_acheter, achete, note, modifie_le";

fn voyage_depuis(r: &Row<'_>) -> rusqlite::Result<Voyage> {
    Ok(Voyage {
        id: r.get(0)?,
        nom: r.get(1)?,
        destination: r.get(2)?,
        depart: r.get(3)?,
        retour: r.get(4)?,
        voyageurs: r.get(5)?,
        modifie_le: r.get(6)?,
    })
}

fn categorie_depuis(r: &Row<'_>) -> rusqlite::Result<CategorieDuVoyage> {
    Ok(CategorieDuVoyage {
        id: r.get(0)?,
        voyage_id: r.get(1)?,
        modele_id: r.get(2)?,
        nom: r.get(3)?,
        icone: r.get(4)?,
        couleur: r.get(5)?,
        ordre: r.get(6)?,
        modifie_le: r.get(7)?,
    })
}

fn objet_depuis(r: &Row<'_>) -> rusqlite::Result<ObjetDuVoyage> {
    Ok(ObjetDuVoyage {
        id: r.get(0)?,
        voyage_id: r.get(1)?,
        categorie_id: r.get(2)?,
        modele_id: r.get(3)?,
        nom: r.get(4)?,
        regle: r.get(5)?,
        valeur: r.get(6)?,
        plafond: r.get(7)?,
        par_personne: r.get(8)?,
        consommable: r.get(9)?,
        quantite: r.get(10)?,
        quantite_manuelle: r.get(11)?,
        dans_le_sac: r.get(12)?,
        a_acheter: r.get(13)?,
        achete: r.get(14)?,
        note: r.get(15)?,
        modifie_le: r.get(16)?,
    })
}

impl Base {
    pub fn lister_voyages(&self) -> Result<Vec<Voyage>, String> {
        let connexion = self.connexion()?;
        lire_lignes(&connexion, &format!("SELECT {COLONNES_VOYAGE} FROM voyage"), [], voyage_depuis)
    }

    pub fn creer_voyage(&self, contenu: &VoyageComplet) -> Result<(), String> {
        let connexion = self.connexion()?;
        let tx = connexion.unchecked_transaction().map_err(en_texte)?;
        let v = &contenu.voyage;
        tx.execute(
            &format!("INSERT INTO voyage ({COLONNES_VOYAGE}) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)"),
            params![v.id, v.nom, v.destination, v.depart, v.retour, v.voyageurs, v.modifie_le],
        )
        .map_err(en_texte)?;
        for c in &contenu.categories {
            tx.execute(
                &format!("INSERT INTO categorie_du_voyage ({COLONNES_CATEGORIE}) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)"),
                params![c.id, c.voyage_id, c.modele_id, c.nom, c.icone, c.couleur, c.ordre, c.modifie_le],
            )
            .map_err(en_texte)?;
        }
        for o in &contenu.objets {
            tx.execute(
                &format!(
                    "INSERT INTO objet_du_voyage ({COLONNES_OBJET})
                     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17)"
                ),
                params![
                    o.id,
                    o.voyage_id,
                    o.categorie_id,
                    o.modele_id,
                    o.nom,
                    o.regle,
                    o.valeur,
                    o.plafond,
                    o.par_personne,
                    o.consommable,
                    o.quantite,
                    o.quantite_manuelle,
                    o.dans_le_sac,
                    o.a_acheter,
                    o.achete,
                    o.note,
                    o.modifie_le
                ],
            )
            .map_err(en_texte)?;
        }
        // Sans ce commit (erreur plus haut), la transaction abandonnée n'a rien écrit.
        tx.commit().map_err(en_texte)
    }

    pub fn lire_voyage(&self, id: &str) -> Result<Option<VoyageComplet>, String> {
        let connexion = self.connexion()?;
        let voyage = connexion
            .query_row(&format!("SELECT {COLONNES_VOYAGE} FROM voyage WHERE id = ?1"), [id], voyage_depuis)
            .optional()
            .map_err(en_texte)?;
        let Some(voyage) = voyage else { return Ok(None) };
        let categories = lire_lignes(
            &connexion,
            &format!("SELECT {COLONNES_CATEGORIE} FROM categorie_du_voyage WHERE voyage_id = ?1 ORDER BY ordre, rowid"),
            [id],
            categorie_depuis,
        )?;
        let objets = lire_lignes(
            &connexion,
            &format!("SELECT {COLONNES_OBJET} FROM objet_du_voyage WHERE voyage_id = ?1 ORDER BY rowid"),
            [id],
            objet_depuis,
        )?;
        Ok(Some(VoyageComplet { voyage, categories, objets }))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::essais::{base_jetable, contrat, Dossier};

    #[test]
    fn une_base_neuve_ne_contient_aucun_voyage() {
        let (_dossier, base) = base_jetable();
        assert_eq!(base.lister_voyages().unwrap(), vec![]);
    }

    #[test]
    fn un_voyage_cree_est_relu_a_l_identique() {
        let (_dossier, base) = base_jetable();
        let contenu = contrat().voyage;
        base.creer_voyage(&contenu).unwrap();
        assert_eq!(base.lire_voyage("v-vercors").unwrap(), Some(contenu.clone()));
        assert_eq!(base.lister_voyages().unwrap(), vec![contenu.voyage]);
    }

    #[test]
    fn un_voyage_inconnu_se_lit_comme_absent() {
        let (_dossier, base) = base_jetable();
        assert_eq!(base.lire_voyage("inconnu").unwrap(), None);
    }

    #[test]
    fn une_creation_refusee_n_ecrit_rien() {
        let (_dossier, base) = base_jetable();
        let mut contenu = contrat().voyage;
        contenu.objets[1].categorie_id = "categorie-inconnue".into();
        assert!(base.creer_voyage(&contenu).is_err());
        assert_eq!(base.lister_voyages().unwrap(), vec![]);
        let categories: i64 = base
            .connexion()
            .unwrap()
            .query_row("SELECT COUNT(*) FROM categorie_du_voyage", [], |r| r.get(0))
            .unwrap();
        assert_eq!(categories, 0);
    }

    #[test]
    fn un_voyage_cree_survit_a_la_fermeture_de_la_base() {
        let dossier = Dossier::nouveau();
        let chemin = dossier.chemin.join("essai.sqlite3");
        let contenu = contrat().voyage;
        Base::ouvrir(&chemin).unwrap().creer_voyage(&contenu).unwrap();
        let rouverte = Base::ouvrir(&chemin).unwrap();
        assert_eq!(rouverte.lire_voyage("v-vercors").unwrap(), Some(contenu));
    }
}
```

`src-tauri/src/lib.rs` :

```rust
mod base;
mod bibliotheque;
#[cfg(test)]
mod essais;
mod voyages;

use base::Base;
use bibliotheque::Bibliotheque;
use std::fs;
use tauri::{AppHandle, Manager, State};
use voyages::{Voyage, VoyageComplet};

fn chemin_de_la_base(app: &AppHandle) -> Result<std::path::PathBuf, String> {
    let dossier = app.path().app_data_dir().map_err(|e| e.to_string())?;
    fs::create_dir_all(&dossier).map_err(|e| e.to_string())?;
    Ok(dossier.join("baluchon.sqlite3"))
}

#[tauri::command]
fn lister_voyages(base: State<'_, Base>) -> Result<Vec<Voyage>, String> {
    base.lister_voyages()
}

#[tauri::command]
fn bibliotheque_installee(base: State<'_, Base>) -> Result<bool, String> {
    base.bibliotheque_installee()
}

#[tauri::command]
fn installer_bibliotheque(base: State<'_, Base>, bibliotheque: Bibliotheque, langue: String) -> Result<bool, String> {
    base.installer_bibliotheque(&bibliotheque, &langue)
}

#[tauri::command]
fn lire_bibliotheque(base: State<'_, Base>) -> Result<Bibliotheque, String> {
    base.lire_bibliotheque()
}

#[tauri::command]
fn creer_voyage(base: State<'_, Base>, contenu: VoyageComplet) -> Result<(), String> {
    base.creer_voyage(&contenu)
}

#[tauri::command]
fn lire_voyage(base: State<'_, Base>, id: String) -> Result<Option<VoyageComplet>, String> {
    base.lire_voyage(&id)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let chemin = chemin_de_la_base(app.handle()).map_err(std::io::Error::other)?;
            app.manage(Base::ouvrir(&chemin).map_err(std::io::Error::other)?);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            lister_voyages,
            bibliotheque_installee,
            installer_bibliotheque,
            lire_bibliotheque,
            creer_voyage,
            lire_voyage
        ])
        .run(tauri::generate_context!())
        .expect("Baluchon n'a pas pu démarrer");
}
```

`src-tauri/Cargo.toml`, à ajouter :

```toml
[dev-dependencies]
serde_json = "1"
```

`package.json`, scripts :

```json
    "test:base": "cargo test --manifest-path src-tauri/Cargo.toml --quiet",
    "verif": "pnpm lint && pnpm format:verif && pnpm controles && pnpm test && pnpm test:base && pnpm test:ecrans"
```

- [ ] **Step 4: Run tests to verify they pass**

Run : `pnpm test:base && node --test tests/contrat.test.js && pnpm controles`
Expected : tous les tests Rust passent (4 dans `base`, 3 dans `bibliotheque`, 5 dans `voyages`), 2 tests de contrat passent, les contrôles sont verts (taille des fichiers `.rs` et `.sql` comprise).

---

### Task 6: Couche de stockage JS (Tauri et navigateur)

**Files:**
- Modify : `src/stockage/tauri.js`, `src/stockage/navigateur.js`
- Test : `tests/stockage-navigateur.test.js`

**Interfaces:**
- Consumes : les commandes Tauri de la tâche 5 ; `tests/contrat/stockage.json`.
- Produces, mêmes fonctions dans les deux variantes, toutes asynchrones :
  - `listerVoyages()` ;
  - `bibliothequeInstallee() → boolean` ;
  - `installerBibliotheque(bibliotheque, langue) → boolean` ;
  - `lireBibliotheque() → { categories, objets }` ;
  - `creerVoyage({ voyage, categories, objets })` ;
  - `lireVoyage(id) → { voyage, categories, objets } | null`.
- Variante navigateur : une seule clé `baluchon-essai`, de la forme `{ voyages, categoriesDuVoyage, objetsDuVoyage, bibliotheque, meta, pannes }`. `pannes: ['creerVoyage']` fait échouer la création, pour simuler une panne dans les tests d'écran.

- [ ] **Step 1: Write the failing test** — `tests/stockage-navigateur.test.js`

```js
// La variante navigateur du stockage, qui sert de base aux tests d'écran : elle doit se comporter
// comme la base SQLite (src-tauri/src/*.rs) — installation unique, voyage relu à l'identique,
// voyage inconnu absent.
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import contrat from './contrat/stockage.json' with { type: 'json' };
import { creerStockageNavigateur } from '../src/stockage/navigateur.js';

// Une mémoire du navigateur minimale, remise à zéro avant chaque test.
beforeEach(() => {
  const memoire = new Map();
  globalThis.localStorage = {
    getItem: cle => memoire.get(cle) ?? null,
    setItem: (cle, valeur) => memoire.set(cle, String(valeur)),
  };
});

test('la bibliothèque s’installe une seule fois et se relit à l’identique', async () => {
  const stockage = creerStockageNavigateur();
  assert.equal(await stockage.bibliothequeInstallee(), false);
  assert.equal(await stockage.installerBibliotheque(contrat.bibliotheque, 'fr'), true);
  assert.equal(await stockage.bibliothequeInstallee(), true);
  assert.equal(await stockage.installerBibliotheque({ categories: [], objets: [] }, 'en'), false);
  assert.deepEqual(await stockage.lireBibliotheque(), contrat.bibliotheque);
});

test('un voyage créé se relit à l’identique et apparaît dans la liste', async () => {
  const stockage = creerStockageNavigateur();
  await stockage.creerVoyage(contrat.voyage);
  assert.deepEqual(await stockage.lireVoyage('v-vercors'), contrat.voyage);
  assert.deepEqual(await stockage.listerVoyages(), [contrat.voyage.voyage]);
  assert.equal(await stockage.lireVoyage('inconnu'), null);
});

test('les voyages déposés par un test (forme de la phase 1) restent lisibles', async () => {
  localStorage.setItem('baluchon-essai', JSON.stringify({ voyages: [contrat.voyage.voyage] }));
  const stockage = creerStockageNavigateur();
  assert.deepEqual(await stockage.listerVoyages(), [contrat.voyage.voyage]);
  assert.deepEqual(await stockage.lireVoyage('v-vercors'), { voyage: contrat.voyage.voyage, categories: [], objets: [] });
});

test('une panne simulée fait échouer la création sans rien écrire', async () => {
  localStorage.setItem('baluchon-essai', JSON.stringify({ pannes: ['creerVoyage'] }));
  const stockage = creerStockageNavigateur();
  await assert.rejects(stockage.creerVoyage(contrat.voyage));
  assert.deepEqual(await stockage.listerVoyages(), []);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run : `node --test tests/stockage-navigateur.test.js`
Expected : FAIL, `stockage.bibliothequeInstallee is not a function`.

- [ ] **Step 3: Write the implementation**

`src/stockage/navigateur.js` :

```js
// Variante navigateur du stockage, pour les tests d'écran : même forme que le stockage Tauri, données
// rangées dans le navigateur sous une seule clé. Un test y dépose son état de départ avant le
// chargement de la page ; « pannes » y simule une erreur d'enregistrement.
const CLE = 'baluchon-essai';

function lire() {
  try {
    return JSON.parse(localStorage.getItem(CLE)) ?? {};
  } catch {
    return {};
  }
}

const ecrire = donnees => localStorage.setItem(CLE, JSON.stringify(donnees));

export function creerStockageNavigateur() {
  return Object.freeze({
    listerVoyages: async () => lire().voyages ?? [],
    bibliothequeInstallee: async () => Boolean(lire().meta?.bibliothequeInstallee),
    async installerBibliotheque(bibliotheque, langue) {
      const donnees = lire();
      if (donnees.meta?.bibliothequeInstallee) return false;
      ecrire({ ...donnees, bibliotheque, meta: { bibliothequeInstallee: true, langueBibliotheque: langue } });
      return true;
    },
    lireBibliotheque: async () => lire().bibliotheque ?? { categories: [], objets: [] },
    async creerVoyage({ voyage, categories, objets }) {
      const donnees = lire();
      if (donnees.pannes?.includes('creerVoyage')) throw new Error('Panne simulée : creerVoyage');
      ecrire({
        ...donnees,
        voyages: [...(donnees.voyages ?? []), voyage],
        categoriesDuVoyage: [...(donnees.categoriesDuVoyage ?? []), ...categories],
        objetsDuVoyage: [...(donnees.objetsDuVoyage ?? []), ...objets],
      });
    },
    async lireVoyage(id) {
      const donnees = lire();
      const voyage = (donnees.voyages ?? []).find(v => v.id === id);
      if (!voyage) return null;
      return {
        voyage,
        categories: (donnees.categoriesDuVoyage ?? []).filter(c => c.voyageId === id),
        objets: (donnees.objetsDuVoyage ?? []).filter(o => o.voyageId === id),
      };
    },
  });
}
```

`src/stockage/tauri.js` :

```js
// Le stockage de l'appli : chaque fonction relaie une commande de src-tauri/src/lib.rs.
import { invoke } from '@tauri-apps/api/core';

export function creerStockageTauri() {
  return Object.freeze({
    listerVoyages: () => invoke('lister_voyages'),
    bibliothequeInstallee: () => invoke('bibliotheque_installee'),
    installerBibliotheque: (bibliotheque, langue) => invoke('installer_bibliotheque', { bibliotheque, langue }),
    lireBibliotheque: () => invoke('lire_bibliotheque'),
    creerVoyage: contenu => invoke('creer_voyage', { contenu }),
    lireVoyage: id => invoke('lire_voyage', { id }),
  });
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run : `node --test tests/stockage-navigateur.test.js && pnpm controles`
Expected : PASS (4 tests) ; contrôles verts (le stockage seul touche `localStorage`).

---

### Task 7: Socle des écrans — aiguillage, icônes, mise en forme, outils de test

**Files:**
- Create : `src/ecrans/icones.js`, `src/ecrans/format.js`, `src/styles/pave.css`, `tests/outils/page.mjs`
- Modify : `src/i18n/traduction.js` (+ `remplir`), `tests/traduction.test.js`, `src/main.js`, `src/ecrans/voyages.js` (objet écran, bouton de l'écran vide en lien), `src/styles/socle.css`, `tests/ecran-voyages-vide.mjs` (utilise `tests/outils/page.mjs`), `package.json` (dépendance)
- Dépendance : `pnpm add @phosphor-icons/core@2.1.1` (MIT, pictos choisis dans DESIGN.md ; Vite n'embarque que les fichiers importés).

**Interfaces:**
- Consumes : stockage (tâche 6), `construireBibliotheque` (tâche 4), `nouvelId` (tâche 3), `dateDuJour` (tâche 1).
- Produces :
  - `remplir(texte, valeurs) → texte` (`src/i18n/traduction.js`) ;
  - `formaterDate(date, langue, options)`, `formaterPeriode(depart, retour, langue)`, `pluriel(t, cle, n, langue)` (`src/ecrans/format.js`) ;
  - `iconeInterface(nom)`, avec les noms `retour`, `precedent`, `suivant`, `plus`, `moins`, `erreur` ; `paveCategorie({ icone, couleur })` (`src/ecrans/icones.js`) ;
  - un écran est un objet `{ nom, charger(contexte) → Promise<donnees>, dessiner(app, donnees, contexte) }`, avec `contexte = { stockage, t, langue, parametre }` ;
  - `src/main.js` porte la liste `ECRANS = [{ motif, ecran }]`, et les tâches 9 et 10 y ajoutent leur ligne ;
  - outils de test (`tests/outils/page.mjs`) : `FORMATS`, `NOMS_THEME`, `CAPTURES`, `RACINE`, `creerJuge()`, `ouvrir(navigateur, url, { taille, theme, donnees, maintenant, adresse })`, `attendreEcran(page, nom)`, `verifierCommandes(page, juge, cas)`, `verifierBarres(page, juge, cas)`, `lireStockage(page)`.

- [ ] **Step 1: Write the failing tests**

À ajouter à `tests/traduction.test.js` (et `remplir` à l'import) :

```js
test('remplir pose les valeurs dans un texte, et laisse voir une valeur oubliée', () => {
  assert.equal(remplir('{n} voyageurs', { n: 2 }), '2 voyageurs');
  assert.equal(remplir('Du {depart} au {retour}', { depart: 'sam. 10', retour: 'mar. 13' }), 'Du sam. 10 au mar. 13');
  assert.equal(remplir('{n} et {n}', { n: 0 }), '0 et 0');
  assert.equal(remplir('{n} voyageurs', {}), '{n} voyageurs');
});
```

Créer `tests/outils/page.mjs` (outils communs ; le contenu reprend celui de `ecran-voyages-vide.mjs`) :

```js
// Outils communs aux tests d'écran : ouvrir l'appli dans un format et un thème, juger les fautes, et
// les vérifications que tout écran doit passer (cibles de 44 px, pas de défilement de côté, rien sous
// les barres système, aucune requête hors de l'appli).
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { calme } from './attente.mjs';

export const RACINE = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const CAPTURES = join(RACINE, 'captures-travail');
export const FORMATS = {
  telephone: { width: 393, height: 873 },
  'tablette-portrait': { width: 800, height: 1280 },
  'tablette-paysage': { width: 1280, height: 800 },
};
export const NOMS_THEME = { light: 'clair', dark: 'sombre' };
// Barres système d'une tablette Android : heure en haut, boutons en bas, encoches sur les côtés.
const ZONES = { haut: 64, bas: 48, gauche: 24, droite: 24 };
const VISIBLES = '#app h1, #app h2, #app h3, #app p, #app a, #app button, #app input, #app img, #app li, #app legend, #app label, #app output';
const CLE = 'baluchon-essai';

export function creerJuge() {
  const fautes = [];
  return {
    exige(condition, message) {
      if (!condition) fautes.push(message);
    },
    conclure(titre, resume) {
      if (!fautes.length) return console.log(`✓ ${titre} : ${resume}`);
      console.error(`✗ ${titre} : ${fautes.length} faute(s)`);
      for (const faute of fautes) console.error(`    ${faute}`);
      process.exitCode = 1;
    },
  };
}

// donnees : l'état de départ du stockage du navigateur, déposé une seule fois par onglet, pour qu'un
// rechargement de la page retrouve ce que l'appli a écrit. maintenant : l'horloge de la page.
export async function ouvrir(navigateur, url, { taille, theme, donnees, maintenant, adresse = '' }) {
  const contexte = await navigateur.newContext({ viewport: taille, colorScheme: theme, hasTouch: true });
  const page = await contexte.newPage();
  const sorties = [];
  const erreurs = [];
  page.on('pageerror', e => erreurs.push(e.message));
  page.on('console', m => m.type() === 'error' && erreurs.push(m.text()));
  // Hors ligne : toute requête qui quitte l'appli est coupée, et comptée comme une faute.
  await page.route(
    lien => lien.hostname !== 'localhost',
    route => {
      sorties.push(route.request().url());
      return route.abort();
    },
  );
  if (maintenant) await page.clock.setFixedTime(maintenant);
  if (donnees)
    await page.addInitScript(
      ({ cle, d }) => {
        if (sessionStorage.getItem('graine-posee')) return;
        localStorage.setItem(cle, JSON.stringify(d));
        sessionStorage.setItem('graine-posee', '1');
      },
      { cle: CLE, d: donnees },
    );
  await page.goto(url + adresse);
  await calme(page);
  return { contexte, page, sorties, erreurs };
}

export async function attendreEcran(page, nom) {
  await page.waitForFunction(n => document.querySelector('#app')?.dataset.ecran === n, nom, { timeout: 10000 });
  await calme(page);
}

export const lireStockage = page => page.evaluate(cle => JSON.parse(localStorage.getItem(cle) ?? '{}'), CLE);

// Toute commande visible offre une cible d'au moins 44 × 44 px ; la page ne défile pas de côté.
export async function verifierCommandes(page, juge, cas) {
  const m = await page.evaluate(() => ({
    petites: [...document.querySelectorAll('#app a, #app button, #app input')]
      .filter(el => {
        const r = el.getBoundingClientRect();
        return r.width > 0 && (r.width < 43.5 || r.height < 43.5);
      })
      .map(el => `${el.tagName.toLowerCase()} « ${(el.textContent.trim() || el.getAttribute('aria-label') || el.id).slice(0, 30)} »`),
    debordement: document.documentElement.scrollWidth - window.innerWidth,
  }));
  juge.exige(m.petites.length === 0, `${cas} : cibles de moins de 44 px : ${m.petites.join(', ')}`);
  juge.exige(m.debordement <= 0, `${cas} : la page défile de côté (${m.debordement} px)`);
}

// Avec les barres système posées, tout texte ou commande visible reste hors des bandes, en haut de
// page comme tout en bas après défilement ; et chaque bande, opaque, est bien au-dessus du contenu.
// Les éléments fixés à l'écran (bouton flottant) sont mesurés de la même façon.
export async function verifierBarres(page, juge, cas) {
  await page.evaluate(zones => {
    for (const [cote, taille] of Object.entries(zones))
      document.documentElement.style.setProperty(`--zone-${cote}`, `${taille}px`);
  }, ZONES);
  await calme(page);
  const releve = () =>
    page.evaluate(
      ({ zones: { haut, bas, gauche, droite }, visibles }) => {
        const W = window.innerWidth;
        const H = window.innerHeight;
        const empietes = [];
        for (const el of document.querySelectorAll(visibles)) {
          const r = el.getBoundingClientRect();
          if (r.width === 0 || r.bottom <= 0 || r.top >= H) continue;
          if (r.top < haut - 0.5 || r.bottom > H - bas + 0.5 || r.left < gauche - 0.5 || r.right > W - droite + 0.5)
            empietes.push(`${el.tagName.toLowerCase()} « ${el.textContent.trim().slice(0, 30)} »`);
        }
        const bandes = ['haut', 'bas', 'gauche', 'droite'].filter(zone => {
          const bande = document.querySelector(`.zone-systeme[data-zone="${zone}"]`);
          const r = bande?.getBoundingClientRect();
          return (
            !r ||
            r.width === 0 ||
            r.height === 0 ||
            document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2) !== bande
          );
        });
        return { empietes, bandes };
      },
      { zones: ZONES, visibles: VISIBLES },
    );
  const enHaut = await releve();
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await calme(page);
  const enBas = await releve();
  const empietes = [...new Set([...enHaut.empietes, ...enBas.empietes])];
  juge.exige(empietes.length === 0, `${cas} : sous les barres système : ${empietes.join(', ')}`);
  juge.exige(enHaut.bandes.length === 0, `${cas} : bandes des barres système absentes ou recouvertes : ${enHaut.bandes.join(', ')}`);
}
```

Modifier `tests/ecran-voyages-vide.mjs`, sans changer ce qu'il vérifie :
- importer `FORMATS`, `NOMS_THEME`, `CAPTURES`, `RACINE`, `creerJuge`, `ouvrir`, `verifierBarres` depuis `./outils/page.mjs` et supprimer leurs copies locales (`exige`, `fautes`, `horsDesBarres`, `ouvrir`, `ZONES`) ;
- dans `mesurer()`, `vide?.querySelector('button')` devient `vide?.querySelector('.bouton')`, car le bouton devient un lien vers `#/nouveau-voyage` ;
- le témoin passe `donnees: { voyages: [voyage] }` au lieu de `voyages: [voyage]` ;
- conclusion : `juge.conclure('Écran Voyages vide', '3 formats × 2 thèmes, témoin compris')`.

- [ ] **Step 2: Run tests to verify they fail**

Run : `node --test tests/traduction.test.js` → FAIL (`remplir` n'est pas exporté).
Run : `node tests/ecran-voyages-vide.mjs` → doit rester **vert** après le passage aux outils communs. C'est un remaniement, et ce test est son filet. Le cas rouge de cette tâche est celui de `remplir`. L'aiguillage est prouvé rouge puis vert par le test « adresse inconnue » de la tâche 8.

- [ ] **Step 3: Write the implementation**

`src/i18n/traduction.js`, à ajouter à la fin :

```js
// Les valeurs d'un texte : « {n} voyageurs » avec { n: 2 } → « 2 voyageurs ». Une valeur absente
// laisse l'accolade visible, pour qu'un oubli se voie à l'écran et dans les tests.
export function remplir(texte, valeurs) {
  return texte.replace(/\{(\w+)\}/g, (accolade, nom) => (nom in valeurs ? String(valeurs[nom]) : accolade));
}
```

`src/ecrans/format.js` :

```js
// Mise en forme des dates et des nombres pour l'écran, dans la langue de l'appli : les noms des jours
// et des mois viennent du navigateur (Intl), il n'y a donc rien à traduire de notre côté.
import { remplir } from '../i18n/traduction.js';

// Une date de calendrier se lit à midi UTC et se formate en UTC : aucun fuseau ne la décale.
const enDate = date => new Date(`${date}T12:00:00Z`);

export const formaterDate = (date, langue, options) =>
  new Intl.DateTimeFormat(langue, { ...options, timeZone: 'UTC' }).format(enDate(date));

// « sam. 10 – mar. 13 oct. 2026 » : le navigateur regroupe ce que les deux dates ont en commun.
export const formaterPeriode = (depart, retour, langue) =>
  new Intl.DateTimeFormat(langue, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).formatRange(
    enDate(depart),
    enDate(retour),
  );

// « 1 voyageur », « 2 voyageurs » : clés `one` et `other` du fichier de traduction. Une langue aux
// pluriels plus fins (phase 13) ajoutera ses formes ici.
export function pluriel(t, cle, n, langue) {
  const forme = new Intl.PluralRules(langue).select(n) === 'one' ? 'one' : 'other';
  return remplir(t(`${cle}.${forme}`), { n });
}
```

`src/ecrans/icones.js` :

```js
// Les pictos Phosphor (MIT, docs/DESIGN.md « Iconography ») : Duotone dans les pavés de catégorie,
// Bold dans l'interface. Seuls les fichiers importés ici sont embarqués dans l'appli. Le catalogue
// complet des catégories (environ 80 pictos) arrive en phase 5.
import tShirt from '@phosphor-icons/core/duotone/t-shirt-duotone.svg?raw';
import tooth from '@phosphor-icons/core/duotone/tooth-duotone.svg?raw';
import forkKnife from '@phosphor-icons/core/duotone/fork-knife-duotone.svg?raw';
import identificationCard from '@phosphor-icons/core/duotone/identification-card-duotone.svg?raw';
import caretLeft from '@phosphor-icons/core/bold/caret-left-bold.svg?raw';
import caretRight from '@phosphor-icons/core/bold/caret-right-bold.svg?raw';
import plus from '@phosphor-icons/core/bold/plus-bold.svg?raw';
import minus from '@phosphor-icons/core/bold/minus-bold.svg?raw';
import warningCircle from '@phosphor-icons/core/bold/warning-circle-bold.svg?raw';
import { echapper } from './html.js';

const CATEGORIES = { 't-shirt': tShirt, tooth, 'fork-knife': forkKnife, 'identification-card': identificationCard };
const INTERFACE = { retour: caretLeft, precedent: caretLeft, suivant: caretRight, plus, moins: minus, erreur: warningCircle };

// Un picto est décoratif : le texte voisin (ou l'aria-label du bouton) dit ce qu'il signifie.
const enveloppe = svg => `<span class="icone" aria-hidden="true">${svg}</span>`;

export const iconeInterface = nom => enveloppe(INTERFACE[nom]);

// Le pavé coloré qui identifie une catégorie (docs/DESIGN.md, « Le pavé identifie ») : la couleur
// vient du nom de la couleur (jetons.css), l'icône est à l'encre marine. Une icône inconnue laisse
// le pavé vide plutôt que de casser l'écran.
export const paveCategorie = ({ icone, couleur }) =>
  `<span class="pave" data-couleur="${echapper(couleur)}" aria-hidden="true">${CATEGORIES[icone] ?? ''}</span>`;
```

`src/styles/pave.css` :

```css
/* Pavé de catégorie (src/ecrans/icones.js) : 44 px, couleur de bagagerie, icône à l'encre marine. */
.pave {
  display: inline-flex;
  flex: none;
  align-items: center;
  justify-content: center;
  width: var(--cible);
  height: var(--cible);
  border-radius: var(--r-md);
  background: var(--releve);
  color: var(--encre-categorie);
}

.pave svg {
  width: 28px;
  height: 28px;
}

.pave[data-couleur='corail'] { background: var(--corail); }
.pave[data-couleur='tournesol'] { background: var(--tournesol); }
.pave[data-couleur='abricot'] { background: var(--abricot); }
.pave[data-couleur='pomme'] { background: var(--pomme); }
.pave[data-couleur='lagon'] { background: var(--lagon); }
.pave[data-couleur='ciel'] { background: var(--ciel); }
.pave[data-couleur='framboise'] { background: var(--framboise); }
.pave[data-couleur='lilas'] { background: var(--lilas); }
```

`src/styles/socle.css` : remplacer la règle `.bouton:focus-visible` par une règle commune, et ajouter :

```css
/* Focus visible sur toute commande, au clavier. */
:focus-visible {
  outline: 3px solid var(--ciel);
  outline-offset: 2px;
}

.ecran > h1 {
  overflow-wrap: anywhere;
}

a.bouton {
  text-decoration: none;
}

.icone {
  display: inline-flex;
  flex: none;
}

.icone svg {
  width: 1.25em;
  height: 1.25em;
}

/* Bouton carré d'un seul picto (− / +, mois précédent…) : son nom est dans aria-label. */
.bouton-icone {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: var(--cible);
  height: var(--cible);
  padding: 0;
  border: 1.5px solid var(--contour);
  border-radius: var(--r-md);
  background: var(--carte);
  color: var(--encre);
  cursor: pointer;
}

.bouton-icone[aria-disabled='true'] {
  opacity: 0.45;
  cursor: default;
}

.lien-retour {
  display: inline-flex;
  align-items: center;
  gap: var(--e-xs);
  min-height: var(--cible);
  margin-left: calc(-1 * var(--e-sm));
  padding: 0 var(--e-sm);
  color: var(--encre-douce);
  font: 600 var(--taille-libelle) var(--police);
  text-decoration: none;
}

/* Bouton flottant : toujours au-dessus de la barre système du bas ; l'écran garde la place libre. */
.bouton-flottant {
  position: fixed;
  right: calc(var(--zone-droite) + var(--e-md));
  bottom: calc(var(--zone-bas) + var(--e-md));
  z-index: 50;
  border-radius: var(--r-lg);
  box-shadow: 0 6px 16px rgb(26 38 60 / 0.25);
}

.ecran-avec-flottant {
  padding-bottom: calc(var(--e-2xl) + 64px);
}
```

`src/main.js` (remplace le fichier) :

```js
// Démarrage : textes, stockage, bibliothèque de départ, puis l'écran demandé par l'adresse. Une seule
// page ; chaque écran a son adresse interne (docs/PLAN.md, « Écrans ») et se compose de charger
// (lire les données) puis dessiner.
import './styles/polices.css';
import './styles/jetons.css';
import './styles/socle.css';
import './styles/pave.css';
import './styles/voyages.css';
import fr from './i18n/fr.json';
import { creerTraducteur } from './i18n/traduction.js';
import { ouvrirStockage } from './stockage/index.js';
import { construireBibliotheque } from './modele/bibliotheque.js';
import { nouvelId } from './modele/identifiant.js';
import { ecranVoyages, vueErreur } from './ecrans/voyages.js';

// Une seule langue pour l'instant ; celle de l'appareil viendra avec les traductions (phase 13).
const LANGUE = 'fr';
const t = creerTraducteur({ fr }, LANGUE);
const app = document.querySelector('#app');

document.documentElement.lang = LANGUE;
document.title = t('appli.nom');

// Une adresse inconnue ramène à l'accueil.
const ACCUEIL = '#/voyages';
const ECRANS = [{ motif: /^#\/voyages$/, ecran: ecranVoyages }];

let stockage;
// Chaque affichage porte un numéro : un écran lent à charger ne recouvre jamais celui demandé après lui.
let dernierAffichage = 0;

function montrerErreur() {
  app.innerHTML = vueErreur({ t });
  app.dataset.ecran = 'erreur';
}

async function afficher() {
  const numero = ++dernierAffichage;
  const route = ECRANS.map(({ motif, ecran }) => ({ ecran, trouve: motif.exec(location.hash) })).find(r => r.trouve);
  if (!route) return location.replace(ACCUEIL);
  // Repère des tests d'écran : retiré pendant le chargement, posé une fois l'écran dessiné.
  delete app.dataset.ecran;
  const contexte = { stockage, t, langue: LANGUE, parametre: route.trouve[1] };
  try {
    const donnees = await route.ecran.charger(contexte);
    if (numero !== dernierAffichage) return;
    route.ecran.dessiner(app, donnees, contexte);
    app.dataset.ecran = route.ecran.nom;
    window.scrollTo(0, 0);
  } catch (erreur) {
    if (numero !== dernierAffichage) return;
    console.error(erreur);
    montrerErreur();
  }
}

async function demarrer() {
  stockage = await ouvrirStockage();
  // La bibliothèque de départ s'installe une seule fois, dans la langue du premier lancement ; elle
  // appartient ensuite à l'utilisateur (docs/PRD.md, « Données »).
  if (!(await stockage.bibliothequeInstallee()))
    await stockage.installerBibliotheque(
      construireBibliotheque(fr.bibliothequeDeDepart, { nouvelId, maintenant: new Date().toISOString() }),
      LANGUE,
    );
  window.addEventListener('hashchange', afficher);
  await afficher();
}

demarrer().catch(erreur => {
  console.error(erreur);
  montrerErreur();
});
```

`src/ecrans/voyages.js` (provisoire, la liste classée arrive à la tâche 8) : remplacer `export function vueVoyages({ voyages, t })` par l'objet écran ci-dessous, et changer le `<button … data-action="nouveau-voyage">` de `vueVide` en `<a class="bouton bouton-principal" href="#/nouveau-voyage">`.

```js
export const ecranVoyages = {
  nom: 'voyages',
  charger: async ({ stockage }) => ({ voyages: await stockage.listerVoyages() }),
  dessiner(app, { voyages }, { t }) {
    app.innerHTML = `
    <main class="ecran">
      <h1>${t('voyages.titre')}</h1>
      ${voyages.length ? vueListe(voyages) : vueVide(t)}
    </main>`;
  },
};
```

- [ ] **Step 4: Run tests to verify they pass**

Run : `pnpm add @phosphor-icons/core@2.1.1 && node --test tests/traduction.test.js && node tests/ecran-voyages-vide.mjs && pnpm controles && pnpm build`
Expected : PASS ; écran vide vert sur 3 formats × 2 thèmes, témoin compris ; contrôles verts ; la construction Vite réussit (les imports `?raw` des SVG sont résolus).
Si Vite refuse les chemins `@phosphor-icons/core/duotone/…`, utiliser `@phosphor-icons/core/assets/duotone/…`, que les `exports` du paquet déclarent aussi.

---

### Task 8: Écran Mes voyages — rubriques classées et bouton flottant

**Files:**
- Modify : `src/ecrans/voyages.js`, `src/styles/voyages.css`, `src/i18n/fr.json`
- Test : `tests/ecran-voyages-liste.mjs`

**Interfaces:**
- Consumes : `classerVoyages` (tâche 3), `dateDuJour` (tâche 1), `formaterPeriode`, `pluriel`, `iconeInterface` et les outils de test (tâche 7).
- Produces : `ecranVoyages` (même nom), avec des cartes `a.carte-voyage[href="#/voyage/<id>"]`, des rubriques `section.rubrique > h2` et un lien `a.bouton-flottant[href="#/nouveau-voyage"]`.

- [ ] **Step 1: Write the failing test** — `tests/ecran-voyages-liste.mjs`

```js
// Phase 2 (docs/PLAN.md) : la liste des voyages classée (US-28).
// Le 12 octobre 2026 (horloge de la page fixée), des voyages enregistrés dans le désordre :
// - rubriques « En cours », « À venir », « Passés », dans cet ordre, et dans chacune l'ordre prévu
//   (à venir : du plus proche au plus lointain ; passés : du plus récent au plus ancien) ; un voyage
//   qui part ou rentre aujourd'hui est en cours ;
// - chaque carte mène à son voyage ; un nom avec des caractères spéciaux s'affiche tel quel ; un nom
//   très long sans espace ne fait pas défiler la page de côté ;
// - le bouton flottant « Nouveau voyage » mène à l'assistant et ne cache jamais la dernière carte ;
// - une adresse inconnue ramène à Mes voyages.
// Témoin : avec seulement des voyages à venir, une seule rubrique s'affiche.
// 3 formats × 2 thèmes : cibles de 44 px, pas de défilement de côté, rien sous les barres système.
import { mkdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { chromium } from 'playwright';
import { calme } from './outils/attente.mjs';
import { demarrerServeur } from './outils/serveur.mjs';
import {
  CAPTURES,
  FORMATS,
  NOMS_THEME,
  RACINE,
  attendreEcran,
  creerJuge,
  ouvrir,
  verifierBarres,
  verifierCommandes,
} from './outils/page.mjs';

const fr = JSON.parse(await readFile(join(RACINE, 'src/i18n/fr.json'), 'utf8'));
const MAINTENANT = new Date('2026-10-12T10:00:00');
const NOM_SPECIAL = '<b>Été & "co"</b>';
const NOM_LONG = 'A'.repeat(120);
const v = (id, nom, depart, retour) => ({ id, nom, destination: 'Quelque part', depart, retour, voyageurs: 2, modifieLe: 'x' });
const VOYAGES = [
  v('p1', 'Pâques', '2026-04-03', '2026-04-06'),
  v('a2', 'Noël', '2026-12-20', '2026-12-27'),
  v('c1', 'Vercors', '2026-10-10', '2026-10-13'),
  v('p2', 'Week-end', '2026-10-09', '2026-10-11'),
  v('a1', 'Toussaint', '2026-10-24', '2026-11-01'),
  v('c2', 'Rentre aujourd’hui', '2026-10-05', '2026-10-12'),
  v('c3', 'Part aujourd’hui', '2026-10-12', '2026-10-20'),
  v('a3', NOM_SPECIAL, '2026-11-05', '2026-11-06'),
  v('a4', NOM_LONG, '2027-01-01', '2027-01-02'),
];
const ATTENDU = [
  [fr.voyages.rubriques.enCours, ['Rentre aujourd’hui', 'Vercors', 'Part aujourd’hui']],
  [fr.voyages.rubriques.aVenir, ['Toussaint', NOM_SPECIAL, 'Noël', NOM_LONG]],
  [fr.voyages.rubriques.passes, ['Week-end', 'Pâques']],
];

const lireRubriques = page =>
  page.evaluate(() =>
    [...document.querySelectorAll('.rubrique')].map(r => [
      r.querySelector('h2').textContent.trim(),
      [...r.querySelectorAll('.carte-voyage-nom')].map(n => n.textContent),
    ]),
  );

const juge = creerJuge();
const serveur = await demarrerServeur();
const navigateur = await chromium.launch();
try {
  await mkdir(CAPTURES, { recursive: true });
  for (const theme of ['light', 'dark']) {
    for (const [format, taille] of Object.entries(FORMATS)) {
      const cas = `${format}, ${NOMS_THEME[theme]}`;
      const { contexte, page, sorties, erreurs } = await ouvrir(navigateur, serveur.url, {
        taille,
        theme,
        maintenant: MAINTENANT,
        donnees: { voyages: VOYAGES },
      });
      juge.exige(
        JSON.stringify(await lireRubriques(page)) === JSON.stringify(ATTENDU),
        `${cas} : rubriques ${JSON.stringify(await lireRubriques(page))}`,
      );
      const liens = await page.$$eval('a.carte-voyage', as => as.map(a => a.getAttribute('href')));
      juge.exige(liens[0] === '#/voyage/c2' && liens.length === VOYAGES.length, `${cas} : liens ${liens}`);
      const flottant = await page.$eval('.bouton-flottant', a => ({ href: a.getAttribute('href'), texte: a.textContent.trim() }));
      juge.exige(
        flottant.href === '#/nouveau-voyage' && flottant.texte === fr.voyages.nouveau,
        `${cas} : bouton flottant ${JSON.stringify(flottant)}`,
      );
      await verifierCommandes(page, juge, cas);
      if (format === 'tablette-portrait')
        await page.screenshot({ path: join(CAPTURES, `voyages-liste-${NOMS_THEME[theme]}.png`) });
      // Tout en bas, la dernière carte reste au-dessus du bouton flottant.
      await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
      await calme(page);
      const cache = await page.evaluate(() => {
        const cartes = document.querySelectorAll('.carte-voyage');
        return cartes[cartes.length - 1].getBoundingClientRect().bottom > document.querySelector('.bouton-flottant').getBoundingClientRect().top;
      });
      juge.exige(!cache, `${cas} : le bouton flottant cache la dernière carte`);
      await verifierBarres(page, juge, cas);
      juge.exige(sorties.length === 0, `${cas} : requêtes hors de l’appli : ${sorties.join(', ')}`);
      juge.exige(erreurs.length === 0, `${cas} : erreurs dans la page : ${erreurs.join(' | ')}`);
      await contexte.close();
    }
  }

  // Une adresse inconnue ramène à Mes voyages.
  const egare = await ouvrir(navigateur, serveur.url, { taille: FORMATS.telephone, theme: 'light', adresse: '#/nimporte' });
  await attendreEcran(egare.page, 'voyages');
  juge.exige((await egare.page.evaluate(() => location.hash)) === '#/voyages', 'adresse inconnue : pas de retour à #/voyages');
  await egare.contexte.close();

  // Témoin : seulement des voyages à venir → une seule rubrique.
  const temoin = await ouvrir(navigateur, serveur.url, {
    taille: FORMATS.telephone,
    theme: 'light',
    maintenant: MAINTENANT,
    donnees: { voyages: [v('a1', 'Toussaint', '2026-10-24', '2026-11-01')] },
  });
  const seule = await lireRubriques(temoin.page);
  juge.exige(
    seule.length === 1 && seule[0][0] === fr.voyages.rubriques.aVenir,
    `témoin : rubriques ${JSON.stringify(seule)}`,
  );
  await temoin.contexte.close();
} finally {
  await navigateur.close();
  await serveur.fermer();
}
juge.conclure('Écran Voyages classé', '3 formats × 2 thèmes, adresse inconnue et témoin compris');
```

- [ ] **Step 2: Run test to verify it fails**

Run : `node tests/ecran-voyages-liste.mjs`
Expected : FAIL (code 1), avec « rubriques [] » et l'absence de `.bouton-flottant`.

- [ ] **Step 3: Write the implementation**

`src/i18n/fr.json`, dans `"voyages"` :

```json
    "rubriques": { "enCours": "En cours", "aVenir": "À venir", "passes": "Passés" },
    "voyageurs": { "one": "{n} voyageur", "other": "{n} voyageurs" }
```

`src/ecrans/voyages.js` (remplace le fichier) :

```js
// Écran Voyages (#/voyages), l'accueil : les voyages en cours, à venir puis passés (US-28) ou, au
// premier lancement, l'écran vide qui invite à créer le premier (US-29).
import { echapper } from './html.js';
import { formaterPeriode, pluriel } from './format.js';
import { iconeInterface } from './icones.js';
import { dateDuJour } from '../modele/dates.js';
import { classerVoyages } from '../modele/voyage.js';
import mascotte from '../images/baluchon.svg';

const RUBRIQUES = ['enCours', 'aVenir', 'passes'];

function vueVide(t) {
  return `
    <section class="vide">
      <img src="${mascotte}" alt="" width="96" height="96" />
      <h2>${t('voyages.vide.titre')}</h2>
      <p>${t('voyages.vide.texte')}</p>
      <a class="bouton bouton-principal" href="#/nouveau-voyage">${t('voyages.nouveau')}</a>
    </section>`;
}

function carte(voyage, { t, langue }) {
  const destination = voyage.destination
    ? `<span class="carte-voyage-destination">${echapper(voyage.destination)}</span>`
    : '';
  return `
        <li>
          <a class="carte-voyage" href="#/voyage/${encodeURIComponent(voyage.id)}">
            <span class="carte-voyage-nom">${echapper(voyage.nom)}</span>
            ${destination}
            <span class="carte-voyage-details">${echapper(formaterPeriode(voyage.depart, voyage.retour, langue))} · ${pluriel(t, 'voyages.voyageurs', voyage.voyageurs, langue)}</span>
          </a>
        </li>`;
}

function vueListe(voyages, aujourdhui, contexte) {
  const classes = classerVoyages(voyages, aujourdhui);
  const rubriques = RUBRIQUES.filter(rubrique => classes[rubrique].length).map(
    rubrique => `
      <section class="rubrique" aria-labelledby="rubrique-${rubrique}">
        <h2 id="rubrique-${rubrique}">${contexte.t(`voyages.rubriques.${rubrique}`)}</h2>
        <ul class="voyages">${classes[rubrique].map(v => carte(v, contexte)).join('')}
        </ul>
      </section>`,
  );
  return `${rubriques.join('')}
      <a class="bouton bouton-principal bouton-flottant" href="#/nouveau-voyage">${iconeInterface('plus')}${contexte.t('voyages.nouveau')}</a>`;
}

export const ecranVoyages = {
  nom: 'voyages',
  charger: async ({ stockage }) => ({ voyages: await stockage.listerVoyages(), aujourdhui: dateDuJour(new Date()) }),
  dessiner(app, { voyages, aujourdhui }, contexte) {
    app.innerHTML = `
    <main class="ecran${voyages.length ? ' ecran-avec-flottant' : ''}">
      <h1>${contexte.t('voyages.titre')}</h1>
      ${voyages.length ? vueListe(voyages, aujourdhui, contexte) : vueVide(contexte.t)}
    </main>`;
  },
};

export function vueErreur({ t }) {
  return `
    <main class="ecran">
      <h1>${t('voyages.titre')}</h1>
      <p class="message message-erreur" role="alert">${t('erreurs.lecture')}</p>
    </main>`;
}
```

`src/styles/voyages.css` : garder `.vide`, `.vide h2` et `.vide p`, remplacer `.voyages` et `.voyages li` par :

```css
.rubrique {
  margin-top: var(--e-lg);
}

.rubrique h2 {
  font-size: var(--taille-section);
  margin-bottom: var(--e-sm);
}

.voyages {
  display: grid;
  gap: var(--e-sm);
  list-style: none;
  margin: 0;
  padding: 0;
}

.carte-voyage {
  display: flex;
  flex-direction: column;
  gap: var(--e-2xs);
  min-height: 56px;
  padding: var(--e-md);
  background: var(--carte);
  border: 1px solid var(--separation);
  border-radius: var(--r-lg);
  color: var(--encre);
  text-decoration: none;
  overflow-wrap: anywhere;
}

.carte-voyage:hover {
  background: var(--releve);
}

.carte-voyage-nom {
  font: 600 var(--taille-objet) / 1.3 var(--police);
}

.carte-voyage-destination,
.carte-voyage-details {
  color: var(--encre-douce);
  font-size: var(--taille-libelle);
}

.carte-voyage-details {
  font-variant-numeric: tabular-nums;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run : `node tests/ecran-voyages-liste.mjs && node tests/ecran-voyages-vide.mjs && pnpm controles`
Expected : `✓ Écran Voyages classé` et `✓ Écran Voyages vide` ; contrôles verts. Regarder les captures `captures-travail/voyages-liste-clair.png` et `-sombre.png`.

---

### Task 9: Écran d'un voyage, en lecture seule

**Files:**
- Create : `src/ecrans/voyage.js`, `src/styles/voyage.css`
- Modify : `src/main.js` (import du style et une ligne dans `ECRANS`), `src/i18n/fr.json`
- Test : `tests/ecran-voyage.mjs`

**Interfaces:**
- Consumes : `listeParCategorie` (tâche 3), `stockage.lireVoyage` (tâche 6), `paveCategorie`, `iconeInterface`, `formaterPeriode`, `pluriel` et les outils de test (tâche 7).
- Produces : `ecranVoyage` (nom `voyage`), sur l'adresse `#/voyage/<id>`. La page porte `h1` (nom du voyage), `section.categorie[data-id]`, `.objet-nom` et `.objet-quantite`.

- [ ] **Step 1: Write the failing test** — `tests/ecran-voyage.mjs`

```js
// Phase 2 (docs/PLAN.md) : un voyage s'ouvre en lecture (US-28).
// - en-tête : nom (caractères spéciaux affichés tels quels), destination, période, voyageurs, retour
//   vers Mes voyages ;
// - catégories dans l'ordre de la bibliothèque, chacune avec son pavé coloré et son picto ; objets par
//   ordre alphabétique avec leur quantité ; rien d'un autre voyage ;
// - un voyage inconnu affiche un message en toutes lettres et un retour vers Mes voyages.
// 3 formats × 2 thèmes : cibles de 44 px, pas de défilement de côté (nom très long compris), rien
// sous les barres système.
import { mkdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { chromium } from 'playwright';
import { demarrerServeur } from './outils/serveur.mjs';
import { CAPTURES, FORMATS, NOMS_THEME, RACINE, creerJuge, ouvrir, verifierBarres, verifierCommandes } from './outils/page.mjs';

const fr = JSON.parse(await readFile(join(RACINE, 'src/i18n/fr.json'), 'utf8'));
const NOM = 'Vercors <i>&</i> "amis"';
const voyage = (id, nom) => ({ id, nom, destination: 'Autrans', depart: '2026-10-10', retour: '2026-10-13', voyageurs: 2, modifieLe: 'x' });
const categorie = (id, voyageId, nom, icone, couleur, ordre) => ({ id, voyageId, modeleId: null, nom, icone, couleur, ordre, modifieLe: 'x' });
const objet = (id, voyageId, categorieId, nom, quantite) => ({
  id,
  voyageId,
  categorieId,
  modeleId: null,
  nom,
  regle: 'fixe',
  valeur: quantite,
  plafond: null,
  parPersonne: false,
  consommable: false,
  quantite,
  quantiteManuelle: false,
  dansLeSac: false,
  aAcheter: false,
  achete: false,
  note: '',
  modifieLe: 'x',
});
// Rangés dans le désordre, avec un second voyage dont rien ne doit apparaître.
const DONNEES = {
  voyages: [voyage('v1', NOM), voyage('v2', 'Autre'), voyage('v3', 'B'.repeat(120))],
  categoriesDuVoyage: [
    categorie('c-pap', 'v1', 'Papiers', 'identification-card', 'tournesol', 3),
    categorie('c-vet', 'v1', 'Vêtements', 't-shirt', 'ciel', 0),
    categorie('c-ali', 'v1', 'Alimentation', 'fork-knife', 'pomme', 2),
    categorie('c-autre', 'v2', 'Ski', 'tooth', 'lilas', 1),
  ],
  objetsDuVoyage: [
    objet('o1', 'v1', 'c-vet', 'T-shirts', 8),
    objet('o2', 'v1', 'c-vet', 'Pyjama', 2),
    objet('o3', 'v1', 'c-vet', 'Sous-vêtements', 8),
    objet('o4', 'v1', 'c-ali', 'Repas', 16),
    objet('o5', 'v1', 'c-ali', 'Gourde', 2),
    objet('o6', 'v1', 'c-pap', 'Pièce d’identité', 2),
    objet('o7', 'v1', 'c-pap', 'Chargeur de téléphone', 1),
    objet('o8', 'v2', 'c-autre', 'Skis', 2),
  ],
};
const ATTENDU = [
  ['Vêtements', 'rgb(90, 169, 255)', [['Pyjama', '2'], ['Sous-vêtements', '8'], ['T-shirts', '8']]],
  ['Alimentation', 'rgb(140, 203, 78)', [['Gourde', '2'], ['Repas', '16']]],
  ['Papiers', 'rgb(255, 201, 60)', [['Chargeur de téléphone', '1'], ['Pièce d’identité', '2']]],
];

const lire = page =>
  page.evaluate(() => ({
    titre: document.querySelector('h1')?.textContent,
    entete: document.querySelector('.voyage-entete')?.textContent ?? '',
    retour: document.querySelector('.lien-retour')?.getAttribute('href'),
    categories: [...document.querySelectorAll('.categorie')].map(c => [
      c.querySelector('h2').textContent.trim(),
      getComputedStyle(c.querySelector('.pave')).backgroundColor,
      [...c.querySelectorAll('.objet')].map(o => [o.querySelector('.objet-nom').textContent, o.querySelector('.objet-quantite').textContent]),
    ]),
    picto: [...document.querySelectorAll('.pave')].every(p => p.querySelector('svg')),
  }));

const juge = creerJuge();
const serveur = await demarrerServeur();
const navigateur = await chromium.launch();
try {
  await mkdir(CAPTURES, { recursive: true });
  for (const theme of ['light', 'dark']) {
    for (const [format, taille] of Object.entries(FORMATS)) {
      const cas = `${format}, ${NOMS_THEME[theme]}`;
      const { contexte, page, sorties, erreurs } = await ouvrir(navigateur, serveur.url, {
        taille,
        theme,
        donnees: DONNEES,
        adresse: '#/voyage/v1',
      });
      const m = await lire(page);
      juge.exige(m.titre === NOM, `${cas} : titre « ${m.titre} »`);
      juge.exige(
        m.entete.includes('Autrans') && m.entete.includes(fr.voyages.voyageurs.other.replace('{n}', 2)),
        `${cas} : en-tête « ${m.entete} »`,
      );
      juge.exige(m.retour === '#/voyages', `${cas} : retour ${m.retour}`);
      juge.exige(JSON.stringify(m.categories) === JSON.stringify(ATTENDU), `${cas} : liste ${JSON.stringify(m.categories)}`);
      juge.exige(m.picto, `${cas} : un pavé sans picto`);
      await verifierCommandes(page, juge, cas);
      if (format === 'tablette-portrait') await page.screenshot({ path: join(CAPTURES, `voyage-${NOMS_THEME[theme]}.png`), fullPage: true });
      await verifierBarres(page, juge, cas);
      juge.exige(sorties.length === 0, `${cas} : requêtes hors de l’appli : ${sorties.join(', ')}`);
      juge.exige(erreurs.length === 0, `${cas} : erreurs dans la page : ${erreurs.join(' | ')}`);
      await contexte.close();
    }
  }

  // Nom très long sans espace : rien ne défile de côté au téléphone.
  const long = await ouvrir(navigateur, serveur.url, { taille: FORMATS.telephone, theme: 'light', donnees: DONNEES, adresse: '#/voyage/v3' });
  await verifierCommandes(long.page, juge, 'nom très long');
  await long.contexte.close();

  // Voyage inconnu : message et retour.
  const inconnu = await ouvrir(navigateur, serveur.url, { taille: FORMATS.telephone, theme: 'light', donnees: DONNEES, adresse: '#/voyage/inconnu' });
  const vu = await inconnu.page.evaluate(() => ({
    ecran: document.querySelector('#app').dataset.ecran,
    message: document.querySelector('.message')?.textContent.trim(),
    retour: document.querySelector('.lien-retour')?.getAttribute('href'),
  }));
  juge.exige(
    vu.ecran === 'voyage' && vu.message === fr.voyage.introuvable && vu.retour === '#/voyages',
    `voyage inconnu : ${JSON.stringify(vu)}`,
  );
  await inconnu.contexte.close();
} finally {
  await navigateur.close();
  await serveur.fermer();
}
juge.conclure('Écran d’un voyage', '3 formats × 2 thèmes, nom long et voyage inconnu compris');
```

- [ ] **Step 2: Run test to verify it fails**

Run : `node tests/ecran-voyage.mjs`
Expected : FAIL (code 1). L'adresse `#/voyage/v1` ramène à Mes voyages : titre « Mes voyages », liste vide.

- [ ] **Step 3: Write the implementation**

`src/i18n/fr.json`, au premier niveau :

```json
  "voyage": {
    "introuvable": "Ce voyage est introuvable. Il a peut-être été supprimé."
  },
```

`src/ecrans/voyage.js` :

```js
// Écran d'un voyage (#/voyage/:id), en lecture seule pour la phase 2 : ses catégories dans l'ordre de
// la bibliothèque, chacune avec son pavé, et ses objets par ordre alphabétique avec leur quantité.
// Les coches arrivent en phase 3, les corrections en phase 8.
import { echapper } from './html.js';
import { formaterPeriode, pluriel } from './format.js';
import { iconeInterface, paveCategorie } from './icones.js';
import { listeParCategorie } from '../modele/voyage.js';

const lienRetour = t => `<a class="lien-retour" href="#/voyages">${iconeInterface('retour')}${t('voyages.titre')}</a>`;

function vueCategorie({ categorie, objets }) {
  const id = `categorie-${echapper(categorie.id)}`;
  return `
      <section class="categorie" data-id="${echapper(categorie.id)}" aria-labelledby="${id}">
        <div class="categorie-entete">
          ${paveCategorie(categorie)}
          <h2 id="${id}">${echapper(categorie.nom)}</h2>
        </div>
        <ul class="objets">${objets
          .map(
            o => `
          <li class="objet"><span class="objet-nom">${echapper(o.nom)}</span><span class="objet-quantite">${o.quantite}</span></li>`,
          )
          .join('')}
        </ul>
      </section>`;
}

export const ecranVoyage = {
  nom: 'voyage',
  charger: async ({ stockage, parametre }) => ({ contenu: await stockage.lireVoyage(decodeURIComponent(parametre)) }),
  dessiner(app, { contenu }, { t, langue }) {
    if (!contenu) {
      app.innerHTML = `
    <main class="ecran">
      ${lienRetour(t)}
      <p class="message message-erreur" role="alert">${t('voyage.introuvable')}</p>
    </main>`;
      return;
    }
    const { voyage } = contenu;
    const destination = voyage.destination ? `<p>${echapper(voyage.destination)}</p>` : '';
    app.innerHTML = `
    <main class="ecran">
      ${lienRetour(t)}
      <header class="voyage-entete">
        <h1>${echapper(voyage.nom)}</h1>
        ${destination}
        <p class="voyage-details">${echapper(formaterPeriode(voyage.depart, voyage.retour, langue))} · ${pluriel(t, 'voyages.voyageurs', voyage.voyageurs, langue)}</p>
      </header>
      <div class="categories">${listeParCategorie(contenu).map(vueCategorie).join('')}
      </div>
    </main>`;
  },
};
```

`src/styles/voyage.css` :

```css
/* Écran d'un voyage (src/ecrans/voyage.js) : une carte par catégorie, objets en lignes de 56 px. */
.voyage-entete h1 {
  font-size: var(--taille-ecran);
  line-height: 1.15;
  overflow-wrap: anywhere;
}

.voyage-entete p {
  margin: var(--e-xs) 0 0;
  color: var(--encre-douce);
  font-size: var(--taille-libelle);
  overflow-wrap: anywhere;
}

.voyage-details {
  font-variant-numeric: tabular-nums;
}

.categories {
  display: grid;
  gap: var(--e-md);
  margin-top: var(--e-lg);
}

.categorie {
  padding: var(--e-sm) var(--e-md);
  background: var(--carte);
  border: 1px solid var(--separation);
  border-radius: var(--r-lg);
}

.categorie-entete {
  display: flex;
  align-items: center;
  gap: var(--e-md);
  min-height: 56px;
}

.categorie-entete h2 {
  font-size: var(--taille-section);
  overflow-wrap: anywhere;
}

.objets {
  list-style: none;
  margin: 0;
  padding: 0;
}

.objet {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--e-md);
  min-height: 56px;
  border-top: 1px solid var(--separation);
  font-size: var(--taille-objet);
  overflow-wrap: anywhere;
}

.objet-quantite {
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}
```

`src/main.js` : ajouter `import './styles/voyage.css';` après `voyages.css`, `import { ecranVoyage } from './ecrans/voyage.js';`, et dans `ECRANS` :

```js
const ECRANS = [
  { motif: /^#\/voyages$/, ecran: ecranVoyages },
  { motif: /^#\/voyage\/([\w%-]+)$/, ecran: ecranVoyage },
];
```

- [ ] **Step 4: Run tests to verify they pass**

Run : `node tests/ecran-voyage.mjs && pnpm controles`
Expected : `✓ Écran d’un voyage` ; contrôles verts. Regarder `captures-travail/voyage-clair.png` et `-sombre.png`.

---

### Task 10: Calendrier unique et écran Nouveau voyage

**Files:**
- Create : `src/ecrans/calendrier.js`, `src/ecrans/nouveau-voyage.js`, `src/styles/calendrier.css`, `src/styles/nouveau-voyage.css`
- Modify : `src/main.js` (styles, import, une ligne dans `ECRANS`), `src/i18n/fr.json`
- Test : `tests/ecran-nouveau-voyage.mjs`

**Interfaces:**
- Consumes :
  - modèle : `ajouterJours`, `ajouterMois`, `moisDe`, `moisVoisin`, `moisEnSemaines`, `dateDuJour` (tâche 1) ; `choisirJour`, `etatDuJour`, `joursEtNuits` (tâche 2) ; `VOYAGEURS`, `validerInformations`, `genererVoyage`, `nouvelId` (tâche 3) ;
  - stockage : `lireBibliotheque`, `creerVoyage` (tâche 6) ;
  - écrans : `formaterDate`, `pluriel`, `iconeInterface`, `remplir` (tâche 7) ;
  - l'écran du voyage (tâche 9) comme destination.
- Produces :
  - `creerCalendrier(conteneur, { t, langue, aujourdhui, periode: { depart, retour }, auChangement })`. Il dessine `.calendrier-titre`, des boutons `[data-mois="-1|1"]` et des boutons `.jour[data-jour]` portant les classes `jour-depart`, `jour-retour`, `jour-entre` et `jour-aujourdhui`, et `aria-disabled="true"` au-delà d'un an.
  - `ecranNouveauVoyage` (nom `nouveau-voyage`) : champs `#nom` et `#destination`, `#resume-dates`, `.compteur-valeur`, `[data-voyageurs]`, messages `#erreur-nom`, `#erreur-dates` et `#erreur-creation`, bouton `button[type=submit]`.

- [ ] **Step 1: Write the failing test** — `tests/ecran-nouveau-voyage.mjs`

```js
// Phase 2 (docs/PLAN.md, spec 2026-10-06) : créer un voyage (US-9, US-10).
// Le 6 octobre 2026 (horloge fixée), bibliothèque de départ installée par l'appli :
// - parcours complet depuis l'écran vide : nom, destination, 10 puis 13 octobre sur le calendrier
//   (résumé « 4 jours, 3 nuits », jours 11 et 12 grisés), Créer → la liste du voyage : Repas 16,
//   T-shirts 8, Pyjama 2, Dentifrice 1 ; elle survit au rechargement ; le retour mène à Mes voyages,
//   où le voyage figure dans « À venir » ; la bibliothèque n'est pas installée deux fois ;
// - aller-retour dans la journée (deux appuis sur le 10) : pas de Pyjama ;
// - choix A : après le 15, un appui sur le 12 en fait le nouveau départ ; un appui après un voyage
//   complet recommence ;
// - au-delà d'un an après le départ, les jours sont inactifs ; le dernier jour permis est choisissable ;
// - Créer sans rien : messages en toutes lettres à leur place réservée, rien ne bouge, focus sur le
//   nom ; le message du nom s'efface une fois le nom saisi ;
// - au clavier : flèches, Page suiv., Entrée et Espace ;
// - voyageurs : 2 par défaut, bornés à 1 et 20 ;
// - double appui sur Créer : un seul voyage ; panne d'enregistrement : message, on reste sur le
//   formulaire.
// 3 formats × 2 thèmes : cibles de 44 px, pas de défilement de côté, rien sous les barres système.
import { mkdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { chromium } from 'playwright';
import { calme } from './outils/attente.mjs';
import { demarrerServeur } from './outils/serveur.mjs';
import {
  CAPTURES,
  FORMATS,
  NOMS_THEME,
  RACINE,
  attendreEcran,
  creerJuge,
  lireStockage,
  ouvrir,
  verifierBarres,
  verifierCommandes,
} from './outils/page.mjs';

const fr = JSON.parse(await readFile(join(RACINE, 'src/i18n/fr.json'), 'utf8'));
const MAINTENANT = new Date('2026-10-06T10:00:00');
const jour = date => `[data-jour="${date}"]`;
const titreMois = (annee, mois) =>
  new Intl.DateTimeFormat('fr', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(Date.UTC(annee, mois - 1, 15));

const etat = page =>
  page.evaluate(() => ({
    titre: document.querySelector('.calendrier-titre')?.textContent.trim(),
    depart: document.querySelector('.jour-depart')?.dataset.jour ?? null,
    retour: document.querySelector('.jour-retour')?.dataset.jour ?? null,
    entre: [...document.querySelectorAll('.jour-entre')].map(b => b.dataset.jour),
    resume: document.querySelector('#resume-dates')?.textContent.trim(),
    focus: document.activeElement?.dataset?.jour ?? document.activeElement?.id ?? null,
    voyageurs: document.querySelector('.compteur-valeur')?.textContent.trim(),
  }));

const objetsAffiches = page =>
  page.evaluate(() =>
    Object.fromEntries([...document.querySelectorAll('.objet')].map(o => [o.querySelector('.objet-nom').textContent, o.querySelector('.objet-quantite').textContent])),
  );

async function nouveauFormulaire(navigateur, url, options = {}) {
  const ouvert = await ouvrir(navigateur, url, {
    taille: FORMATS.telephone,
    theme: 'light',
    maintenant: MAINTENANT,
    adresse: '#/nouveau-voyage',
    ...options,
  });
  await attendreEcran(ouvert.page, 'nouveau-voyage');
  return ouvert;
}

async function remplirEtCreer(page, { nom, depart, retour, double = false }) {
  await page.fill('#nom', nom);
  await page.click(jour(depart));
  await page.click(jour(retour));
  if (double) await page.dblclick('button[type=submit]');
  else await page.click('button[type=submit]');
}

const juge = creerJuge();
const serveur = await demarrerServeur();
const navigateur = await chromium.launch();
try {
  await mkdir(CAPTURES, { recursive: true });

  // Parcours complet, depuis l'écran vide du premier lancement.
  {
    const { contexte, page, erreurs } = await ouvrir(navigateur, serveur.url, {
      taille: FORMATS['tablette-portrait'],
      theme: 'light',
      maintenant: MAINTENANT,
    });
    await page.click('.vide .bouton');
    await attendreEcran(page, 'nouveau-voyage');
    juge.exige((await etat(page)).titre === titreMois(2026, 10), `parcours : mois affiché ${(await etat(page)).titre}`);
    juge.exige((await etat(page)).voyageurs === '2', 'parcours : 2 voyageurs par défaut');
    await page.fill('#nom', 'Vercors');
    await page.fill('#destination', 'Autrans');
    await page.click(jour('2026-10-10'));
    await page.click(jour('2026-10-13'));
    const e = await etat(page);
    juge.exige(e.depart === '2026-10-10' && e.retour === '2026-10-13', `parcours : sélection ${JSON.stringify(e)}`);
    juge.exige(JSON.stringify(e.entre) === JSON.stringify(['2026-10-11', '2026-10-12']), `parcours : jours grisés ${e.entre}`);
    juge.exige(
      e.resume.includes(fr.duree.jours.other.replace('{n}', 4)) && e.resume.includes(fr.duree.nuits.other.replace('{n}', 3)),
      `parcours : résumé « ${e.resume} »`,
    );
    await page.click('button[type=submit]');
    await attendreEcran(page, 'voyage');
    const hash = await page.evaluate(() => location.hash);
    juge.exige(/^#\/voyage\/[0-9a-f-]{36}$/.test(hash), `parcours : adresse ${hash}`);
    const attendus = { Repas: '16', 'T-shirts': '8', Pyjama: '2', Dentifrice: '1' };
    const vus = await objetsAffiches(page);
    for (const [nom, quantite] of Object.entries(attendus))
      juge.exige(vus[nom] === quantite, `parcours : ${nom} vaut ${vus[nom]}, attendu ${quantite}`);
    await page.reload();
    await attendreEcran(page, 'voyage');
    juge.exige((await objetsAffiches(page)).Repas === '16', 'parcours : le voyage ne survit pas au rechargement');
    juge.exige((await lireStockage(page)).bibliotheque.categories.length === 4, 'parcours : bibliothèque installée deux fois');
    await page.goBack();
    await attendreEcran(page, 'voyages');
    const aVenir = await page.$$eval('#rubrique-aVenir ~ ul .carte-voyage-nom', n => n.map(x => x.textContent));
    juge.exige(aVenir.includes('Vercors'), `parcours : Vercors absent de « À venir » (${aVenir})`);
    juge.exige(erreurs.length === 0, `parcours : erreurs dans la page : ${erreurs.join(' | ')}`);
    await contexte.close();
  }

  // Aller-retour dans la journée : pas de Pyjama.
  {
    const { contexte, page } = await nouveauFormulaire(navigateur, serveur.url);
    await remplirEtCreer(page, { nom: 'Journée', depart: '2026-10-10', retour: '2026-10-10' });
    await attendreEcran(page, 'voyage');
    const vus = await objetsAffiches(page);
    juge.exige(!('Pyjama' in vus) && vus['T-shirts'] === '2', `journée : ${JSON.stringify(vus)}`);
    await contexte.close();
  }

  // Choix A, recommencer, et limite d'un an.
  {
    const { contexte, page } = await nouveauFormulaire(navigateur, serveur.url);
    await page.click(jour('2026-10-15'));
    await page.click(jour('2026-10-12'));
    let e = await etat(page);
    juge.exige(e.depart === '2026-10-12' && e.retour === null, `choix A : ${JSON.stringify(e)}`);
    juge.exige(e.resume.startsWith(fr.nouveauVoyage.resume.depart.split('{')[0]), `choix A : résumé « ${e.resume} »`);
    await page.click(jour('2026-10-14'));
    await page.click(jour('2026-10-20'));
    e = await etat(page);
    juge.exige(e.depart === '2026-10-20' && e.retour === null, `recommencer : ${JSON.stringify(e)}`);
    await page.click(jour('2026-10-10'));
    for (let i = 0; i < 12; i++) await page.click('[data-mois="1"]');
    e = await etat(page);
    juge.exige(e.titre === titreMois(2027, 10), `limite : mois ${e.titre}`);
    const inactifs = await page.evaluate(() => ({
      apres: document.querySelector('[data-jour="2027-10-11"]').getAttribute('aria-disabled'),
      limite: document.querySelector('[data-jour="2027-10-10"]').getAttribute('aria-disabled'),
    }));
    juge.exige(inactifs.apres === 'true' && inactifs.limite !== 'true', `limite : ${JSON.stringify(inactifs)}`);
    await page.click(jour('2027-10-11'));
    juge.exige((await etat(page)).retour === null, 'limite : un jour au-delà d’un an a été choisi');
    await page.click(jour('2027-10-10'));
    juge.exige((await etat(page)).retour === '2027-10-10', 'limite : le dernier jour permis est refusé');
    await contexte.close();
  }

  // Créer sans rien : messages à leur place réservée, rien ne bouge.
  {
    const { contexte, page } = await nouveauFormulaire(navigateur, serveur.url);
    const positions = () =>
      page.evaluate(() => ['.calendrier', '.compteur', 'button[type=submit]'].map(s => document.querySelector(s).getBoundingClientRect().top + window.scrollY));
    const avant = await positions();
    await page.click('button[type=submit]');
    await calme(page);
    const apres = await positions();
    juge.exige(JSON.stringify(avant) === JSON.stringify(apres), `erreurs : l’écran a bougé ${avant} → ${apres}`);
    const textes = await page.evaluate(() => ({
      nom: document.querySelector('#erreur-nom').textContent.trim(),
      dates: document.querySelector('#erreur-dates').textContent.trim(),
    }));
    juge.exige(
      textes.nom === fr.nouveauVoyage.erreurs.nomManquant && textes.dates === fr.nouveauVoyage.erreurs.datesManquantes,
      `erreurs : messages ${JSON.stringify(textes)}`,
    );
    juge.exige((await etat(page)).focus === 'nom', `erreurs : focus sur ${(await etat(page)).focus}`);
    juge.exige((await page.evaluate(() => location.hash)) === '#/nouveau-voyage', 'erreurs : le formulaire a été quitté');
    await page.fill('#nom', 'Vercors');
    juge.exige((await page.textContent('#erreur-nom')).trim() === '', 'erreurs : le message du nom reste après saisie');
    await contexte.close();
  }

  // Au clavier.
  {
    const { contexte, page } = await nouveauFormulaire(navigateur, serveur.url);
    await page.focus(jour('2026-10-10'));
    await page.keyboard.press('ArrowRight');
    juge.exige((await etat(page)).focus === '2026-10-11', `clavier : → mène à ${(await etat(page)).focus}`);
    await page.keyboard.press('ArrowDown');
    juge.exige((await etat(page)).focus === '2026-10-18', `clavier : ↓ mène à ${(await etat(page)).focus}`);
    await page.keyboard.press('PageDown');
    let e = await etat(page);
    juge.exige(e.focus === '2026-11-18' && e.titre === titreMois(2026, 11), `clavier : Page suiv. ${JSON.stringify(e)}`);
    await page.keyboard.press('Enter');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('Space');
    e = await etat(page);
    juge.exige(e.depart === '2026-11-18' && e.retour === '2026-11-20', `clavier : sélection ${JSON.stringify(e)}`);
    await contexte.close();
  }

  // Voyageurs bornés de 1 à 20.
  {
    const { contexte, page } = await nouveauFormulaire(navigateur, serveur.url);
    await page.click('[data-voyageurs="-1"]');
    await page.click('[data-voyageurs="-1"]');
    const min = await page.evaluate(() => ({
      valeur: document.querySelector('.compteur-valeur').textContent,
      inactif: document.querySelector('[data-voyageurs="-1"]').getAttribute('aria-disabled'),
    }));
    juge.exige(min.valeur === '1' && min.inactif === 'true', `voyageurs : minimum ${JSON.stringify(min)}`);
    for (let i = 0; i < 25; i++) await page.click('[data-voyageurs="1"]');
    juge.exige((await etat(page)).voyageurs === '20', `voyageurs : maximum ${(await etat(page)).voyageurs}`);
    await contexte.close();
  }

  // Double appui : un seul voyage.
  {
    const { contexte, page } = await nouveauFormulaire(navigateur, serveur.url);
    await remplirEtCreer(page, { nom: 'Vercors', depart: '2026-10-10', retour: '2026-10-13', double: true });
    await attendreEcran(page, 'voyage');
    const n = (await lireStockage(page)).voyages.length;
    juge.exige(n === 1, `double appui : ${n} voyages créés`);
    await contexte.close();
  }

  // Panne d'enregistrement : message, on reste sur le formulaire.
  {
    const { contexte, page } = await nouveauFormulaire(navigateur, serveur.url, { donnees: { pannes: ['creerVoyage'] } });
    await remplirEtCreer(page, { nom: 'Vercors', depart: '2026-10-10', retour: '2026-10-13' });
    await page.waitForFunction(() => document.querySelector('#erreur-creation').textContent.trim() !== '');
    juge.exige(
      (await page.textContent('#erreur-creation')).trim() === fr.nouveauVoyage.erreurs.enregistrement,
      'panne : message absent ou inattendu',
    );
    juge.exige((await page.evaluate(() => location.hash)) === '#/nouveau-voyage', 'panne : le formulaire a été quitté');
    await contexte.close();
  }

  // 3 formats × 2 thèmes, période choisie.
  for (const theme of ['light', 'dark']) {
    for (const [format, taille] of Object.entries(FORMATS)) {
      const cas = `${format}, ${NOMS_THEME[theme]}`;
      const { contexte, page, sorties, erreurs } = await nouveauFormulaire(navigateur, serveur.url, { taille, theme });
      await page.fill('#nom', 'Vercors');
      await page.click(jour('2026-10-10'));
      await page.click(jour('2026-10-13'));
      await page.evaluate(() => window.scrollTo(0, 0));
      await verifierCommandes(page, juge, cas);
      if (format === 'tablette-portrait')
        await page.screenshot({ path: join(CAPTURES, `nouveau-voyage-${NOMS_THEME[theme]}.png`), fullPage: true });
      await verifierBarres(page, juge, cas);
      juge.exige(sorties.length === 0, `${cas} : requêtes hors de l’appli : ${sorties.join(', ')}`);
      juge.exige(erreurs.length === 0, `${cas} : erreurs dans la page : ${erreurs.join(' | ')}`);
      await contexte.close();
    }
  }
} finally {
  await navigateur.close();
  await serveur.fermer();
}
juge.conclure('Écran Nouveau voyage', 'parcours, calendrier, erreurs, clavier, voyageurs, pannes, 3 formats × 2 thèmes');
```

- [ ] **Step 2: Run test to verify it fails**

Run : `node tests/ecran-nouveau-voyage.mjs`
Expected : FAIL (code 1). L'adresse `#/nouveau-voyage` est inconnue et ramène à Mes voyages, et `attendreEcran(page, 'nouveau-voyage')` dépasse son délai.

- [ ] **Step 3: Write the implementation**

`src/i18n/fr.json`, au premier niveau :

```json
  "nouveauVoyage": {
    "titre": "Nouveau voyage",
    "nom": "Nom du voyage",
    "destination": "Destination (facultatif)",
    "dates": "Dates",
    "voyageurs": "Voyageurs",
    "moinsVoyageurs": "Un voyageur de moins",
    "plusVoyageurs": "Un voyageur de plus",
    "creer": "Créer le voyage",
    "resume": {
      "vide": "Touchez le jour du départ, puis celui du retour.",
      "depart": "Départ le {depart} : touchez le jour du retour.",
      "periode": "Du {depart} au {retour} · {jours}, {nuits}"
    },
    "erreurs": {
      "nomManquant": "Donnez un nom à ce voyage.",
      "datesManquantes": "Choisissez le jour du départ et celui du retour.",
      "datesInvalides": "Ces dates n’existent pas dans le calendrier.",
      "retourAvantDepart": "Le retour ne peut pas précéder le départ.",
      "tropLong": "Un voyage dure au plus un an.",
      "voyageursHorsLimites": "Le nombre de voyageurs va de 1 à 20.",
      "enregistrement": "Le voyage n’a pas pu être enregistré. Rien n’a été modifié ; réessayez."
    }
  },
  "calendrier": {
    "moisPrecedent": "Mois précédent",
    "moisSuivant": "Mois suivant"
  },
  "duree": {
    "jours": { "one": "{n} jour", "other": "{n} jours" },
    "nuits": { "one": "{n} nuit", "other": "{n} nuits" }
  },
```

`src/ecrans/calendrier.js` :

```js
// Le calendrier unique du choix des dates : un premier appui fixe le départ, un second le retour, et
// la période est grisée (décision du chef de projet, 2026-10-06). Les règles (choix A, limite d'un
// an) vivent dans le modèle (src/modele/periode.js). Composant à part, pour servir aussi à « Refaire
// ce voyage » (phase 11) et au changement de dates (phase 10).
import { ajouterJours, ajouterMois, moisDe, moisEnSemaines, moisVoisin } from '../modele/dates.js';
import { choisirJour, etatDuJour } from '../modele/periode.js';
import { formaterDate } from './format.js';
import { iconeInterface } from './icones.js';

const DEPLACEMENTS = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
const SAUTS_DE_MOIS = { PageUp: -1, PageDown: 1 };
// Un lundi quelconque : de lui, on tire les noms des sept jours, du lundi au dimanche.
const UN_LUNDI = '2024-01-01';
const SEMAINE = Array.from({ length: 7 }, (_, i) => ajouterJours(UN_LUNDI, i));

export function creerCalendrier(conteneur, { t, langue, aujourdhui, periode, auChangement }) {
  let selection = { depart: periode.depart ?? null, retour: periode.retour ?? null };
  // Jour qui reçoit le focus au clavier : un seul jour du mois est atteignable par Tab.
  let focus = selection.depart ?? aujourdhui;
  let mois = moisDe(focus);

  const dansLeMois = date => moisDe(date).annee === mois.annee && moisDe(date).mois === mois.mois;

  function cellule(jour) {
    if (!jour) return '<td></td>';
    const e = etatDuJour(selection, jour);
    const classes = [
      'jour',
      e.depart && 'jour-depart',
      e.retour && 'jour-retour',
      e.entre && 'jour-entre',
      jour === aujourdhui && 'jour-aujourdhui',
    ]
      .filter(Boolean)
      .join(' ');
    const nom = formaterDate(jour, langue, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    return `<td><button type="button" class="${classes}" data-jour="${jour}" tabindex="${jour === focus ? 0 : -1}"
      aria-label="${nom}" aria-pressed="${e.depart || e.retour}"${jour === aujourdhui ? ' aria-current="date"' : ''}${e.horsLimite ? ' aria-disabled="true"' : ''}>${Number(jour.slice(8))}</button></td>`;
  }

  function dessiner() {
    const semaines = moisEnSemaines(mois);
    if (!dansLeMois(focus)) focus = semaines.flat().find(Boolean);
    const titre = formaterDate(semaines.flat().find(Boolean), langue, { month: 'long', year: 'numeric' });
    const entetes = SEMAINE.map(
      j => `<th scope="col" abbr="${formaterDate(j, langue, { weekday: 'long' })}">${formaterDate(j, langue, { weekday: 'short' })}</th>`,
    ).join('');
    conteneur.innerHTML = `
          <div class="calendrier-entete">
            <button type="button" class="bouton-icone" data-mois="-1" aria-label="${t('calendrier.moisPrecedent')}">${iconeInterface('precedent')}</button>
            <p class="calendrier-titre" id="calendrier-titre" aria-live="polite">${titre}</p>
            <button type="button" class="bouton-icone" data-mois="1" aria-label="${t('calendrier.moisSuivant')}">${iconeInterface('suivant')}</button>
          </div>
          <table class="calendrier-grille" aria-labelledby="calendrier-titre">
            <thead><tr>${entetes}</tr></thead>
            <tbody>${semaines.map(s => `<tr>${s.map(cellule).join('')}</tr>`).join('')}</tbody>
          </table>`;
  }

  // Redessiner remplace les boutons : le focus est rendu à son équivalent dans le nouveau dessin.
  function redessinerEtFocaliser(selecteur) {
    dessiner();
    conteneur.querySelector(selecteur)?.focus();
  }

  conteneur.addEventListener('click', evenement => {
    const bouton = evenement.target.closest('button');
    if (!bouton) return;
    if (bouton.dataset.mois) {
      mois = moisVoisin(mois, Number(bouton.dataset.mois));
      return redessinerEtFocaliser(`[data-mois="${bouton.dataset.mois}"]`);
    }
    if (bouton.getAttribute('aria-disabled') === 'true') return;
    selection = choisirJour(selection, bouton.dataset.jour);
    focus = bouton.dataset.jour;
    redessinerEtFocaliser(`[data-jour="${focus}"]`);
    auChangement({ ...selection });
  });

  conteneur.addEventListener('keydown', evenement => {
    const jour = evenement.target.dataset?.jour;
    const pas = DEPLACEMENTS[evenement.key];
    const saut = SAUTS_DE_MOIS[evenement.key];
    if (!jour || (pas === undefined && saut === undefined)) return;
    evenement.preventDefault();
    focus = pas === undefined ? ajouterMois(jour, saut) : ajouterJours(jour, pas);
    mois = moisDe(focus);
    redessinerEtFocaliser(`[data-jour="${focus}"]`);
  });

  dessiner();
}
```

`src/ecrans/nouveau-voyage.js` :

```js
// Écran Nouveau voyage (#/nouveau-voyage), étape Informations (US-9, US-10) : nom, destination,
// dates sur le calendrier unique, voyageurs. « Créer le voyage » copie la bibliothèque dans le voyage
// et ouvre sa liste. Les étapes des étiquettes et l'aperçu arrivent en phase 4.
import { remplir } from '../i18n/traduction.js';
import { dateDuJour } from '../modele/dates.js';
import { nouvelId } from '../modele/identifiant.js';
import { joursEtNuits } from '../modele/periode.js';
import { VOYAGEURS, genererVoyage, validerInformations } from '../modele/voyage.js';
import { creerCalendrier } from './calendrier.js';
import { formaterDate, pluriel } from './format.js';
import { iconeInterface } from './icones.js';

// Le couple qui voyage (choix du chef de projet, 2026-10-06).
const VOYAGEURS_PAR_DEFAUT = 2;
// Les champs qui ont un message, dans l'ordre de l'écran : le premier en erreur reçoit le focus.
const CHAMPS = ['nom', 'dates'];

function resume({ depart, retour }, t, langue) {
  const jour = date => formaterDate(date, langue, { weekday: 'short', day: 'numeric', month: 'short' });
  if (!depart) return t('nouveauVoyage.resume.vide');
  if (!retour) return remplir(t('nouveauVoyage.resume.depart'), { depart: jour(depart) });
  const { jours, nuits } = joursEtNuits(depart, retour);
  return remplir(t('nouveauVoyage.resume.periode'), {
    depart: jour(depart),
    retour: jour(retour),
    jours: pluriel(t, 'duree.jours', jours, langue),
    nuits: pluriel(t, 'duree.nuits', nuits, langue),
  });
}

function vue(t) {
  return `
    <main class="ecran">
      <a class="lien-retour" href="#/voyages">${iconeInterface('retour')}${t('voyages.titre')}</a>
      <h1>${t('nouveauVoyage.titre')}</h1>
      <form class="formulaire" novalidate>
        <div class="champ">
          <label for="nom">${t('nouveauVoyage.nom')}</label>
          <input id="nom" name="nom" type="text" autocomplete="off" aria-describedby="erreur-nom" />
          <p class="erreur-champ" id="erreur-nom" aria-live="polite"></p>
        </div>
        <div class="champ">
          <label for="destination">${t('nouveauVoyage.destination')}</label>
          <input id="destination" name="destination" type="text" autocomplete="off" />
        </div>
        <fieldset class="champ" aria-describedby="resume-dates erreur-dates">
          <legend>${t('nouveauVoyage.dates')}</legend>
          <p class="resume-dates" id="resume-dates" aria-live="polite"></p>
          <div class="calendrier"></div>
          <p class="erreur-champ" id="erreur-dates" aria-live="polite"></p>
        </fieldset>
        <fieldset class="champ">
          <legend>${t('nouveauVoyage.voyageurs')}</legend>
          <div class="compteur">
            <button type="button" class="bouton-icone" data-voyageurs="-1" aria-label="${t('nouveauVoyage.moinsVoyageurs')}">${iconeInterface('moins')}</button>
            <output class="compteur-valeur" aria-live="polite"></output>
            <button type="button" class="bouton-icone" data-voyageurs="1" aria-label="${t('nouveauVoyage.plusVoyageurs')}">${iconeInterface('plus')}</button>
          </div>
        </fieldset>
        <p class="erreur-champ" id="erreur-creation" aria-live="polite"></p>
        <button class="bouton bouton-principal" type="submit">${t('nouveauVoyage.creer')}</button>
      </form>
    </main>`;
}

export const ecranNouveauVoyage = {
  nom: 'nouveau-voyage',
  charger: async ({ stockage }) => ({ bibliotheque: await stockage.lireBibliotheque(), aujourdhui: dateDuJour(new Date()) }),
  dessiner(app, { bibliotheque, aujourdhui }, { stockage, t, langue }) {
    const infos = { nom: '', destination: '', depart: null, retour: null, voyageurs: VOYAGEURS_PAR_DEFAUT };
    // Les messages n'apparaissent qu'après un premier essai, puis suivent chaque correction.
    let essaye = false;
    let enregistrement = false;
    app.innerHTML = vue(t);
    const formulaire = app.querySelector('form');
    const message = (id, code) => {
      app.querySelector(`#erreur-${id}`).innerHTML = code
        ? `${iconeInterface('erreur')}<span>${t(`nouveauVoyage.erreurs.${code}`)}</span>`
        : '';
    };

    function rafraichir() {
      app.querySelector('#resume-dates').textContent = resume(infos, t, langue);
      app.querySelector('.compteur-valeur').textContent = infos.voyageurs;
      app.querySelector('[data-voyageurs="-1"]').setAttribute('aria-disabled', infos.voyageurs <= VOYAGEURS.min);
      app.querySelector('[data-voyageurs="1"]').setAttribute('aria-disabled', infos.voyageurs >= VOYAGEURS.max);
      if (!essaye) return;
      const erreurs = validerInformations(infos);
      for (const champ of CHAMPS) message(champ, erreurs[champ]);
    }

    creerCalendrier(app.querySelector('.calendrier'), {
      t,
      langue,
      aujourdhui,
      periode: infos,
      auChangement({ depart, retour }) {
        Object.assign(infos, { depart, retour });
        rafraichir();
      },
    });

    formulaire.addEventListener('input', ({ target }) => {
      if (target.name !== 'nom' && target.name !== 'destination') return;
      infos[target.name] = target.value;
      rafraichir();
    });

    formulaire.addEventListener('click', ({ target }) => {
      const bouton = target.closest('[data-voyageurs]');
      if (!bouton) return;
      const voulu = infos.voyageurs + Number(bouton.dataset.voyageurs);
      infos.voyageurs = Math.min(VOYAGEURS.max, Math.max(VOYAGEURS.min, voulu));
      rafraichir();
    });

    formulaire.addEventListener('submit', async evenement => {
      evenement.preventDefault();
      // Un double appui ne crée jamais deux voyages.
      if (enregistrement) return;
      essaye = true;
      message('creation', null);
      rafraichir();
      const erreurs = validerInformations(infos);
      const premier = CHAMPS.find(champ => erreurs[champ]);
      if (premier === 'nom') return app.querySelector('#nom').focus();
      if (premier === 'dates') return app.querySelector('.jour[tabindex="0"]').focus();
      // Les voyageurs sont bornés par − / + : une erreur ici serait une faute de programmation.
      if (erreurs.voyageurs) return message('creation', erreurs.voyageurs);
      enregistrement = true;
      try {
        const contenu = genererVoyage(bibliotheque, infos, { nouvelId, maintenant: new Date().toISOString() });
        await stockage.creerVoyage(contenu);
        // Remplacer l'adresse : le retour depuis la liste du voyage mène à Mes voyages, pas au formulaire.
        location.replace(`#/voyage/${contenu.voyage.id}`);
      } catch (erreur) {
        console.error(erreur);
        message('creation', 'enregistrement');
        enregistrement = false;
      }
    });

    rafraichir();
  },
};
```

`src/styles/nouveau-voyage.css` :

```css
/* Écran Nouveau voyage (src/ecrans/nouveau-voyage.js). */
.formulaire {
  display: grid;
  gap: var(--e-md);
  max-width: 640px;
  margin-top: var(--e-lg);
}

.champ {
  display: grid;
  gap: var(--e-xs);
  min-width: 0;
  margin: 0;
  padding: 0;
  border: 0;
}

.champ label,
.champ legend {
  padding: 0;
  font: 600 var(--taille-libelle) var(--police);
}

.champ input {
  width: 100%;
  min-height: 48px;
  padding: 0 12px;
  border: 1.5px solid var(--contour);
  border-radius: var(--r-sm);
  background: var(--carte);
  color: var(--encre);
  font: 400 var(--taille-objet) var(--police);
}

/* Place réservée : un message qui apparaît ne fait rien bouger à l'écran. */
.erreur-champ {
  display: flex;
  gap: var(--e-xs);
  align-items: flex-start;
  min-height: calc(var(--taille-libelle) * 1.5);
  margin: 0;
  color: var(--erreur);
  font-size: var(--taille-libelle);
}

.resume-dates {
  min-height: calc(var(--taille-libelle) * 1.5);
  margin: 0;
  color: var(--encre-douce);
  font-size: var(--taille-libelle);
  font-variant-numeric: tabular-nums;
}

.compteur {
  display: flex;
  align-items: center;
  gap: var(--e-md);
}

.compteur-valeur {
  min-width: 2ch;
  text-align: center;
  font: 600 var(--taille-section) var(--police);
  font-variant-numeric: tabular-nums;
}

.formulaire > .bouton-principal {
  justify-self: start;
}
```

`src/styles/calendrier.css` :

```css
/* Calendrier unique (src/ecrans/calendrier.js) : bornes à l'encre marine, période grisée, jours
   trop lointains barrés (jamais la couleur seule). */
.calendrier {
  max-width: 420px;
  padding: var(--e-sm);
  background: var(--carte);
  border: 1px solid var(--separation);
  border-radius: var(--r-lg);
}

.calendrier-entete {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--e-sm);
}

.calendrier-titre {
  margin: 0;
  font: 600 var(--taille-objet) var(--police);
  text-transform: capitalize;
}

.calendrier-grille {
  width: 100%;
  margin-top: var(--e-sm);
  border-collapse: collapse;
  table-layout: fixed;
}

.calendrier-grille th {
  padding-bottom: var(--e-xs);
  color: var(--encre-douce);
  font: 600 var(--taille-mention) var(--police);
  text-transform: capitalize;
}

.calendrier-grille td {
  padding: 1px 0;
  text-align: center;
}

.jour {
  width: 100%;
  min-width: var(--cible);
  height: var(--cible);
  border: 0;
  border-radius: var(--r-plein);
  background: none;
  color: var(--encre);
  font: 400 16px var(--police);
  font-variant-numeric: tabular-nums;
  cursor: pointer;
}

.jour:hover {
  background: var(--releve);
}

.jour-aujourdhui {
  box-shadow: inset 0 0 0 1.5px var(--contour);
  font-weight: 700;
}

.jour-entre {
  border-radius: 0;
  background: var(--actif);
}

.jour-depart,
.jour-retour,
.jour-depart:hover,
.jour-retour:hover {
  background: var(--encre);
  color: var(--fond);
  font-weight: 700;
}

.jour[aria-disabled='true'] {
  color: var(--contour);
  text-decoration: line-through;
  cursor: default;
}

.jour[aria-disabled='true']:hover {
  background: none;
}
```

`src/main.js` : ajouter `import './styles/nouveau-voyage.css';` et `import './styles/calendrier.css';` après `voyage.css`, puis `import { ecranNouveauVoyage } from './ecrans/nouveau-voyage.js';`, et dans `ECRANS` :

```js
  { motif: /^#\/nouveau-voyage$/, ecran: ecranNouveauVoyage },
```

- [ ] **Step 4: Run tests to verify they pass**

Run : `node tests/ecran-nouveau-voyage.mjs && pnpm controles`
Expected : `✓ Écran Nouveau voyage` ; contrôles verts. Regarder `captures-travail/nouveau-voyage-clair.png` et `-sombre.png` : période grisée, bornes marquées, aucun débordement.

---

### Task 11: Vérification complète, essais Debian et tablette

**Files:** aucun fichier de code ; captures dans `captures-travail/`.

- [ ] **Step 1: Suite complète, une seule fois**

Run : `pnpm verif` (en tâche de fond)
Expected : lint, formatage, contrôles, tests du modèle, tests de la base, et les quatre tests d'écran, tous verts.

- [ ] **Step 2: Essai Debian**

Run : `pnpm tauri dev` (en tâche de fond), puis demander au chef de projet de faire l'essai. Il crée un voyage du 10 au 13 à deux voyageurs et vérifie Repas 16. Il ferme ensuite l'appli, la rouvre, et vérifie que le voyage est toujours là.

- [ ] **Step 3: Essai tablette (mémoire « essai-tablette »)**

1. Relever l'état d'origine de la tablette : mode avion et thème.
2. `pnpm android:essai`, puis `adb install -r …/app-universal-debug.apk`. Cette mise à jour garde les données de la phase 1 et applique la migration 002.
3. **Vérifier l'icône installée sur l'appareil** (piège connu de Tauri).
4. Passer en mode avion. Créer un voyage, fermer l'appli, la rouvrir et retrouver le voyage. Essayer le geste retour d'Android depuis la liste du voyage : il doit ramener à Mes voyages.
5. Prendre des captures en clair et en sombre.
6. Remettre la tablette dans son état d'origine.

- [ ] **Step 4: Compte rendu au chef de projet**

En quelques lignes : ce qui a changé, ce qui a été vérifié (commandes et résultats), ce qui reste à valider. Rien n'est « validé » avant son accord explicite.
Pour `CLAUDE.md`, proposer de remplacer la ligne « État » par « Phase 2 codée et testée le … ; en attente de validation » ; ne pas modifier ce fichier soi-même.
