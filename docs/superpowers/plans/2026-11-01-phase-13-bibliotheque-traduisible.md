# Phase 13 : bibliothèque de départ complète et traduisible — plan de construction

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** livrer la bibliothèque de départ complète (16 catégories, 171 objets, 47 notes), la composition femmes / hommes / enfants avec « Pour qui », la règle « par semaine », une appli traduisible qui suit la langue de l'appareil, et l'écran « À propos ».

**Architecture:** le voyage porte trois nombres (`femmes`, `hommes`, `enfants`) à la place de `voyageurs` ; chaque objet (modèle et du voyage) gagne `pourQui`, `parPersonne: false` voulant dire « partagé ». Le calcul reste dans `src/modele/quantites.js`. La structure de la bibliothèque de départ quitte `fr.json` pour `src/modele/depart/` ; les fichiers de langue ne gardent que les textes. La langue est choisie au démarrage parmi les fichiers `src/i18n/*.json` chargés automatiquement.

**Tech Stack:** Tauri 2, JavaScript simple (modules ES), Vite 6, SQLite (rusqlite), Kotlin (pont Android), `node --test`, Playwright (tests d'écran), pnpm.

**Spec:** `docs/superpowers/specs/2026-11-01-phase-13-bibliotheque-traduisible-design.md` (et sa maquette validée `docs/maquettes/bibliotheque-depart/`, dont `textes.js` donne les textes exacts et `composition.js` le calcul de référence).

## Global Constraints

- Lire et respecter `AGENTS.md` : TDD, fichiers d'environ 500 lignes au plus, une seule définition par règle, couches étanches (écrans → stockage par `src/stockage/index.js` seulement ; le modèle ne produit aucun texte).
- pnpm seulement, jamais npm ni npx. Aucun push, aucune fusion. Commits locaux sur `phase-13` autorisés.
- Tout texte affiché vit dans `src/i18n/fr.json` (le contrôle `textes-hors-traduction` le vérifie) ; espaces insécables avant `: ; ! ?`, dans `« »` et entre un nombre et son mot ; apostrophe `’`.
- Composition : chaque compteur de 0 à 20, total de 1 à 20.
- Règles de quantité : `fixe`, `par_jour`, `par_nuit`, `par_semaine` ; valeurs et plafonds entiers de 1 à 999 ; plafond impossible avec `fixe`.
- `pourQui` ∈ `tous`, `adultes`, `femmes`, `hommes`, `enfants` ; `tous` compte les enfants.
- Semaines = `Math.ceil(jours / 7)`.
- Adresses : « Découvrir Baluchon » → `https://baluchon.biovibralyon.fr/`, « Nouvelles versions » → `https://baluchon.biovibralyon.fr/telecharger`. Aucun lien GitHub, aucune mention de BagPacker.
- Thème clair et sombre : les écrans existants doivent rester justes dans les deux (les tests d'écran les passent).
- `pnpm verif` vert à la fin de chaque tâche, sauf mention contraire dans la tâche.

## Review Focus

1. Un voyage créé avant la mise à jour (base existante, ou sauvegarde de version 1) : mêmes quantités après qu'avant, partout (liste, Courses, Modifier le voyage).
2. Un objet partagé dont le groupe est vide (« Comprimés pour enfant, partagé entre les enfants » sans enfant) : jamais proposé, et sorti par « Modifier le voyage » quand le dernier enfant est retiré.
3. Un fichier de langue incomplet ou faux (clé manquante, `{n}` oublié, forme de pluriel manquante) : rien de vide ni de brut à l'écran ; `pnpm verif` le refuse s'il est faux.
4. Une langue d'appareil régionale ou absente (`fr-CA`, `de-DE` sans traduction, liste vide) : la bonne langue, sinon le français, sans plantage.
5. Retour sur l'étape Informations après la saisie : la composition (et la mémoire de la dernière composition) n'est pas comptée comme une saisie qui fait demander « Abandonner ce nouveau voyage ? ».

Les tests qui fixent ces points sont dans les tâches 1 (points 1, 2), 2 (point 1), 3 (point 5), 5 (point 4) et 7 (point 3).

---

### Task 1 : Composition, « Pour qui » et « par semaine » dans le modèle

**Files:**
- Create: `src/modele/composition.js`, `tests/composition.test.js`
- Modify: `src/modele/quantites.js`, `src/modele/inclusion.js`, `src/modele/voyage.js`, `src/modele/changements.js`, `src/modele/ajustements.js`, `src/modele/refaire.js`, `src/modele/modeles.js`, `src/modele/bibliotheque.js` (ajoute `pourQui: o.pourQui ?? 'tous'`), `tests/contrat/stockage.json`
- Test: `tests/quantites.test.js`, `tests/inclusion.test.js`, `tests/voyage.test.js`, `tests/changements.test.js`, `tests/ajustements.test.js`, `tests/refaire.test.js`, `tests/modeles.test.js`, `tests/contrat.test.js`

**Interfaces:**
- Produces (`src/modele/composition.js`) :
  - `GROUPES_COMPOSITION = ['femmes', 'hommes', 'enfants']`, `POUR_QUI = ['tous', 'adultes', 'femmes', 'hommes', 'enfants']`
  - `BORNES_COMPOSITION = { min: 0, max: 20, total: 20 }`, `COMPOSITION_INITIALE = { femmes: 1, hommes: 1, enfants: 0 }`
  - `composition(x) -> { femmes, hommes, enfants }` (extrait les trois nombres de tout objet qui les porte)
  - `totalVoyageurs(c) -> number`, `personnes(pourQui, c) -> number`
  - `validerComposition(c) -> {} | { composition: 'aucunVoyageur' | 'tropDeVoyageurs' }`
  - `ecartsDeComposition(avant, apres) -> [{ groupe, ecart }]` (écarts non nuls, dans l'ordre des groupes ; sert à la puce « 1 enfant de plus »)
- Produces (`quantites.js`) : `calculerQuantite({ regle, valeur, plafond, parPersonne, pourQui }, { jours, nuits, femmes, hommes, enfants }) -> number` ; renvoie 0 si le groupe ne compte personne, même partagé (ainsi « un objet à 0 n'apparaît pas » couvre le groupe vide, sans seconde règle).
- Produces (`voyage.js`) : `validerInformations({ nom, depart, retour, femmes, hommes, enfants })` (erreur `composition` remplace `voyageurs`) ; `VOYAGEURS` disparaît au profit de `BORNES_COMPOSITION` ; voyages, objets copiés et `infos` portent `femmes`, `hommes`, `enfants` et `pourQui` (plus de `voyageurs`).
- Produces (`changements.js`) : la `raison` d'une ligne entrante ou sortante devient `{ genre: 'etiquette', nom } | { genre: 'groupe', pourQui } | null` (`groupe` quand c'est un groupe de « Pour qui » passé de 0 à au moins 1, ou l'inverse).
- Produces (`modeles.js`) : `saisieDObjet` ajoute `pourQui` (défaut `'tous'`) ; `PERIODE_EXEMPLE = { jours: 10, nuits: 9, femmes: 1, hommes: 1, enfants: 1 }`.

- [ ] **Step 1 : écrire les tests qui échouent**

```js
// tests/quantites.test.js (ajouts)
const p = (c, jours = 4) => ({ jours, nuits: jours - 1, femmes: 0, hommes: 0, enfants: 0, ...c });
test('par semaine : semaines commencées', () => {
  const lessive = { regle: 'par_semaine', valeur: 5, plafond: null, parPersonne: false, pourQui: 'tous' };
  assert.equal(calculerQuantite(lessive, p({ femmes: 1 }, 7)), 5);
  assert.equal(calculerQuantite(lessive, p({ femmes: 1 }, 10)), 10);
  assert.equal(calculerQuantite(lessive, p({ femmes: 1 }, 1)), 5);
});
test('par personne : multiplié par le groupe ; enfants comptés dans « tous »', () => {
  const repas = { regle: 'par_jour', valeur: 2, plafond: null, parPersonne: true, pourQui: 'tous' };
  assert.equal(calculerQuantite(repas, p({ femmes: 1, hommes: 1 })), 16); // critère 2 du PRD
  assert.equal(calculerQuantite(repas, p({ femmes: 2, enfants: 1 })), 24);
  const culottes = { regle: 'par_jour', valeur: 1, plafond: 5, parPersonne: true, pourQui: 'femmes' };
  assert.equal(calculerQuantite(culottes, p({ femmes: 2, hommes: 1 }, 10)), 10);
});
test('groupe vide : 0, même partagé', () => {
  const comprimes = { regle: 'fixe', valeur: 4, plafond: null, parPersonne: false, pourQui: 'enfants' };
  assert.equal(calculerQuantite(comprimes, p({ femmes: 2 })), 0);
  assert.equal(calculerQuantite(comprimes, p({ femmes: 2, enfants: 3 })), 4);
});

// tests/composition.test.js
test('personnes par groupe', () => {
  const c = { femmes: 2, hommes: 1, enfants: 3 };
  assert.deepEqual(POUR_QUI.map(g => personnes(g, c)), [6, 3, 2, 1, 3]);
});
test('bornes : au moins 1, au plus 20 en tout', () => {
  assert.deepEqual(validerComposition({ femmes: 0, hommes: 0, enfants: 0 }), { composition: 'aucunVoyageur' });
  assert.deepEqual(validerComposition({ femmes: 8, hommes: 7, enfants: 6 }), { composition: 'tropDeVoyageurs' });
  assert.deepEqual(validerComposition({ femmes: 8, hommes: 7, enfants: 5 }), {});
});
test('écarts de composition', () => {
  assert.deepEqual(ecartsDeComposition({ femmes: 1, hommes: 1, enfants: 0 }, { femmes: 1, hommes: 0, enfants: 2 }), [
    { groupe: 'hommes', ecart: -1 },
    { groupe: 'enfants', ecart: 2 },
  ]);
});
```

Plus, dans les tests existants : remplacer `voyageurs: 2` par `femmes: 1, hommes: 1, enfants: 0` (mêmes résultats attendus) ; dans `tests/inclusion.test.js`, un objet `pourQui: 'enfants'` absent de l'aperçu sans enfant et présent avec ; dans `tests/changements.test.js`, ajouter un enfant fait entrer l'objet « enfants » avec `raison: { genre: 'groupe', pourQui: 'enfants' }`, retirer le dernier enfant le fait sortir avec la même raison, et passer de 1 femme + 1 homme à 2 femmes ne change aucune quantité « tous » ; `tests/contrat.test.js` passe `femmes/hommes/enfants` à `genererVoyage`.

- [ ] **Step 2 : lancer `pnpm test`** — attendu : échecs sur `composition.js` introuvable et sur les nouvelles assertions.
- [ ] **Step 3 : implémenter** `composition.js`, puis `calculerQuantite` (base × `{ fixe: 1, par_jour: jours, par_nuit: nuits, par_semaine: ⌈jours/7⌉ }`, plafond sur la base, × `personnes(pourQui, c)` si `parPersonne`, 0 si `personnes` vaut 0), puis remplacer `voyageurs` dans les modules listés (`genererApercu(bibliotheque, infos, choisies)` lit la composition de `infos`). `tests/contrat/stockage.json` : `voyage.voyage` perd `voyageurs` et gagne `femmes`, `hommes`, `enfants` ; `bibliotheque.objets[0]` et `voyage.objets[0]` (et les objets de modification) gagnent `pourQui`.
- [ ] **Step 4 : lancer `pnpm test`** — attendu : tout vert. (`pnpm test:base` et `pnpm test:ecrans` redeviennent verts aux tâches 2 et 3.)
- [ ] **Step 5 : commit** `feat(modele): composition du voyage, « pour qui » et règle par semaine`

### Task 2 : Base de données, stockage et sauvegarde version 2

**Files:**
- Create: `src-tauri/migrations/008_composition_et_semaine.sql`
- Modify: `src-tauri/src/base.rs` (liste des migrations, essais), `src-tauri/src/voyages.rs`, `src-tauri/src/modification.rs`, `src-tauri/src/bibliotheque.rs`, `src-tauri/src/edition.rs`, `src-tauri/src/ajustements.rs`, `src-tauri/src/sauvegarde.rs` et leurs `*_essais.rs`, `src/stockage/navigateur*.js`, `src/modele/sauvegarde.js`
- Test: `src-tauri/src/base.rs` (essais de migration), `tests/sauvegarde.test.js`, `tests/stockage-*.test.js`

**Interfaces:**
- Consumes : la forme des données de la tâche 1 (`tests/contrat/stockage.json`).
- Produces : `VERSION_SAUVEGARDE = 2` ; `lireSauvegarde(texte)` accepte la version 1 et la rend au format 2 (conversion ci-dessous).

Conversion (migration 008 et sauvegarde v1, même règle) : `femmes = ⌈voyageurs / 2⌉`, `hommes = ⌊voyageurs / 2⌋`, `enfants = 0` ; tout objet reçoit `pour_qui = 'tous'` ; `par_personne` est gardé.

- [ ] **Step 1 : écrire les tests qui échouent**
  - `base.rs` : `la_migration_008_garde_les_quantites` — une base en version 7 avec un voyage à 3 voyageurs et deux objets (par personne, partagé) : après migration, `femmes = 2, hommes = 1, enfants = 0`, `pour_qui = 'tous'`, quantités, coches, achats et objets écartés inchangés ; `la_composition_reste_entre_1_et_20` (0/0/0 refusé, 8/7/6 refusé, 8/7/5 accepté, un compteur à 21 refusé) ; `la_regle_par_semaine_est_acceptee` ; `pour_qui_inconnu_refuse`.
  - `tests/sauvegarde.test.js` : une sauvegarde de version 1 avec `voyageurs: 3` se lit en `{ femmes: 2, hommes: 1, enfants: 0 }` et des objets `pourQui: 'tous'` ; une version 3 est refusée (`raison: 'version'`) ; une version 2 sans `pourQui` est refusée (`raison: 'abime'`).
- [ ] **Step 2 : lancer `pnpm test:base` et `pnpm test`** — attendu : échecs sur ces tests.
- [ ] **Step 3 : implémenter** la migration 008 en une transaction : SQLite ne modifie pas une contrainte, on reconstruit `voyage`, `objet_modele` et `objet_du_voyage` (nouvelle table, copie convertie, suppression, renommage, index recréés, clés étrangères vérifiées) ; `CHECK (regle IN ('fixe','par_jour','par_nuit','par_semaine'))`, `pour_qui TEXT NOT NULL CHECK (pour_qui IN (...))`, `femmes/hommes/enfants INTEGER NOT NULL CHECK (... BETWEEN 0 AND 20)` et `CHECK (femmes + hommes + enfants BETWEEN 1 AND 20)`. Puis les structures et requêtes Rust, la variante navigateur du stockage et le schéma de `sauvegarde.js` (types de champs, ligne 56).
- [ ] **Step 4 : lancer `pnpm test:base` et `pnpm test`** — attendu : verts.
- [ ] **Step 5 : commit** `feat(base): migration 008 et sauvegarde version 2`

### Task 3 : Les écrans de la composition

**Files:**
- Modify: `src/ecrans/assistant-vues.js`, `src/ecrans/assistant-controleur.js`, `src/ecrans/assistant.js`, `src/ecrans/nouveau-voyage.js`, `src/ecrans/modifier-voyage.js`, `src/ecrans/refaire-voyage.js`, `src/ecrans/changements-vues.js`, `src/ecrans/voyage-vues.js`, `src/ecrans/format.js`, `src/stockage/preferences.js`, `src/styles/nouveau-voyage.css`, `src/i18n/fr.json`
- Test: `tests/ecran-nouveau-voyage*.mjs`, `tests/ecran-voyage-modifier.mjs`, `tests/ecran-refaire*.mjs`, `tests/ecran-voyages-liste.mjs`, `tests/preferences.test.js`, `tests/format.test.js`, `tests/textes-assistant.test.js`, et tout test d'écran qui écrivait `voyageurs`

**Interfaces:**
- Consumes : `composition.js` (tâche 1).
- Produces (`format.js`) : `detailComposition(t, c, langue) -> '2 femmes, 1 enfant'` (groupes vides omis) ; `detailsVoyage(t, voyage, langue, { detail })` : total (« 3 voyageurs ») sur les cartes, détail dans l'en-tête et l'aperçu.
- Produces (`preferences.js`) : `lireDerniereComposition() -> { femmes, hommes, enfants }` (clé `baluchon-derniere-composition` ; `COMPOSITION_INITIALE` si absente ou invalide) et `ecrireDerniereComposition(c)`, appelé à la création d'un voyage (pas à la modification) ; réexportés par `src/stockage/index.js`.

Disposition et textes : ceux de la maquette (spec, « Maquette validée » ; `docs/maquettes/bibliotheque-depart/compteurs.js` et `textes.js`) : légende « Voyageurs » et « N en tout », une ligne par groupe, côte à côte dès 540 px de champ, ligne de message réservée (« Ajoutez au moins une personne. » rouge ; « Un voyage compte au plus 20 voyageurs. » gris, + grisés) ; boutons `data-groupe="femmes" data-pas="-1"` avec les libellés « Une femme de moins »… ; puce « 1 enfant de plus » / « 2 femmes de moins » dans « Changements » ; mention « nouveau · pour les enfants » (raison `groupe`) ; « partagé » sous une ligne du voyage dès que le total vaut au moins 2.

- [ ] **Step 1 : écrire les tests qui échouent**
  - `tests/preferences.test.js` : sans rien, `{ femmes: 1, hommes: 1, enfants: 0 }` ; après `ecrireDerniereComposition({ femmes: 2, hommes: 0, enfants: 1 })`, la même chose relue ; une valeur abîmée donne la composition initiale.
  - `tests/format.test.js` : `detailComposition` de `{2,0,1}` → `2 femmes, 1 enfant` (avec espaces insécables) ; `{0,1,0}` → `1 homme`.
  - `tests/ecran-nouveau-voyage.mjs` : trois compteurs à 1, 1, 0 au premier voyage ; tout à 0 → message et « Suivant » refusé ; à 20, les trois + `aria-disabled="true"` ; un voyage créé avec 2 femmes et 1 enfant → le « Nouveau voyage » suivant propose 2, 0, 1 ; retour depuis Informations sans autre saisie que les compteurs déjà proposés → aucune question « Abandonner » (Review Focus 5) ; aperçu : « 2 femmes, 1 enfant » dans la ligne de résumé ; cartes : « 3 voyageurs ».
  - `tests/ecran-voyage-modifier.mjs` : ajouter un enfant → puce « 1 enfant de plus » et la ligne de l'objet « enfants » marquée « nouveau · pour les enfants ».
  - `tests/ecran-refaire.mjs` : la composition du voyage d'origine est reprise.
- [ ] **Step 2 : lancer `pnpm test` et `pnpm test:ecrans`** — attendu : échecs sur ces tests.
- [ ] **Step 3 : implémenter.** Les nouveaux textes vont dans `fr.json` (`nouveauVoyage.composition.*`, `voyages.compte.{femmes,hommes,enfants}.{one,other}`, `changements.composition.{plus,moins}.*`), les anciens textes `voyageurs*` devenus inutiles sont retirés.
- [ ] **Step 4 : lancer `pnpm verif`** — attendu : vert (fin du bloc des tâches 1 à 3).
- [ ] **Step 5 : commit** `feat(assistant): compteurs femmes, hommes, enfants`

### Task 4 : Fiche d'un objet modèle et résumés de règle

**Files:**
- Modify: `src/ecrans/fiche-objet.js` (et `fiche-modele*.js` si la fiche y vit), `src/ecrans/format.js` (`decrireRegle`), `src/ecrans/bibliotheque-vues.js`, `src/ecrans/assistant-vues.js` (résumé sous chaque objet de l'aperçu), `src/styles/fiche-modele.css`, `src/i18n/fr.json`
- Test: `tests/format.test.js`, `tests/textes-bibliotheque.test.js`, `tests/ecran-bibliotheque-fiches.mjs`, `tests/ecran-bibliotheque-objets.mjs`

**Interfaces:**
- Consumes : `POUR_QUI`, `personnes`, `PERIODE_EXEMPLE` (tâche 1).
- Produces : `decrireRegle(t, objet, { bref })` aux formes de la maquette ; `bref` garde la forme courte d'une formule d'origine (« 2 / jour / enfant », « 5 / semaine »).

- [ ] **Step 1 : écrire les tests qui échouent** (`tests/format.test.js`, espaces insécables compris) :

| objet | `decrireRegle` |
|---|---|
| fixe 1, par personne, enfants | `1 par enfant` |
| fixe 1, par personne, tous | `1 par personne` |
| par_semaine 1, par personne, tous | `1 par semaine et par personne` |
| par_jour 1, plafond 5, par personne, femmes | `1 par jour, au plus 5, par femme` |
| par_semaine 5, partagé, tous | `5 par semaine, partagé` |
| fixe 1, partagé, tous | `1, partagé` |
| fixe 4, partagé, adultes | `4, partagé entre les adultes` |

  Écran : la fiche montre Fixe | Par jour | Par nuit | Par semaine (compteur « Chaque semaine »), le bloc « Pour qui » (Tous | Adultes | Femmes | Hommes | Enfants) puis « Par femme » | « Partagé » (le premier nommé d'après le groupe) ; plafond « au plus, par femme » ; l'encadré donne le résumé puis « Pour 10 jours (2 semaines) et 9 nuits, avec 1 femme, 1 homme et 1 enfant : 10. » pour la lessive (« (2 semaines) » seulement pour « par semaine ») et « Sans femme dans le voyage, il n'est pas proposé. » pour un groupe autre que « tous » ; enregistrer un objet « Enfants, partagé » le relit tel quel ; la liste de la Bibliothèque affiche le résumé.
- [ ] **Step 2 : lancer `pnpm test` et `pnpm test:ecrans`** — attendu : échecs.
- [ ] **Step 3 : implémenter.** Au passage, `fr.json` : la phrase « Proposé dès que la catégorie « {categorie} » l'est. » reçoit des espaces insécables dans les guillemets.
- [ ] **Step 4 : lancer `pnpm verif`** — attendu : vert.
- [ ] **Step 5 : commit** `feat(bibliotheque): « pour qui » et « par semaine » dans la fiche d'objet`

### Task 5 : Langue de l'appareil, pluriels, tri et dates

**Files:**
- Create: `src/i18n/langue.js`, `src/i18n/dictionnaires.js`, `src/modele/tri.js`, `tests/langue.test.js`, `tests/tri.test.js`
- Modify: `src/main.js`, `src/ecrans/format.js` (`pluriel`), `src/modele/{sac,voyage,changements,inclusion,refaire,courses,suppressions}.js`, `src/ecrans/bibliotheque.js`, `tests/outils/serveur.mjs` (`createServer({ mode: 'essai', … })`)
- Test: `tests/format.test.js`

**Interfaces:**
- Produces (`langue.js`, pur, testable sous node) : `choisirLangue(preferees: string[], disponibles: string[]) -> string` — pour chaque langue préférée dans l'ordre : la forme exacte si disponible, sinon sa langue de base ; sinon `'fr'`.
- Produces (`dictionnaires.js`, Vite seulement) : `DICTIONNAIRES` = `{ fr: {...}, ... }` par `import.meta.glob('./*.json', { eager: true, import: 'default' })`, plus, quand `import.meta.env.MODE === 'essai'`, les fichiers de `tests/langues/*.json` (le build de production les élimine).
- Produces (`tri.js`) : `poserLangueDuTri(langue)` (appelé une fois au démarrage) et `comparerNoms(a, b)` sur `Intl.Collator(langue, { sensitivity: 'base', numeric: true })` ; seule définition du tri par nom, utilisée par tous les modules listés (fin des `localeCompare` sans langue ou avec `'fr'` en dur).
- Produces (`format.js`) : `pluriel(t, cle, n, langue)` lit la forme `Intl.PluralRules(langue).select(n)` (`zero`, `one`, `two`, `few`, `many`, `other`), puis `other` si cette forme manque.

- [ ] **Step 1 : écrire les tests qui échouent**

```js
// tests/langue.test.js
const dispo = ['fr', 'eo', 'pt-BR'];
test('langue exacte, puis langue de base, puis français', () => {
  assert.equal(choisirLangue(['eo'], dispo), 'eo');
  assert.equal(choisirLangue(['fr-CA'], dispo), 'fr');
  assert.equal(choisirLangue(['pt-BR', 'fr'], dispo), 'pt-BR');
  assert.equal(choisirLangue(['de-DE', 'eo-XX'], dispo), 'eo');
  assert.equal(choisirLangue(['de-DE'], dispo), 'fr');
  assert.equal(choisirLangue([], dispo), 'fr');
});
// tests/format.test.js : avec un dictionnaire { n: { one: '{n} un', few: '{n} quelques', other: '{n} autres' } }
// pluriel(t, 'n', 3, 'pl') → '3 quelques' ; pluriel(t, 'n', 3, 'fr') → '3 autres' ; une forme 'many' absente → 'other'.
// tests/tri.test.js : poserLangueDuTri('fr') ; ['Écharpe', 'eau', 'Zip', 'élastique'].sort(comparerNoms)
// → ['eau', 'Écharpe', 'élastique', 'Zip'] ; 'Objet 10' après 'Objet 2'.
```

- [ ] **Step 2 : lancer `pnpm test`** — attendu : échecs.
- [ ] **Step 3 : implémenter.** `main.js` : `const LANGUE = choisirLangue(navigator.languages?.length ? [...navigator.languages] : [navigator.language ?? 'fr'], Object.keys(DICTIONNAIRES))`, `creerTraducteur(DICTIONNAIRES, LANGUE)`, `document.documentElement.lang = LANGUE`, `poserLangueDuTri(LANGUE)`. Le serveur des tests d'écran (`tests/outils/serveur.mjs`) démarre Vite en mode `essai`. Vérifier que le calendrier commence le lundi quelle que soit la langue (déjà le cas, `src/modele/dates.js`) et que toutes les dates passent par `langue`.
- [ ] **Step 4 : lancer `pnpm verif`** — attendu : vert.
- [ ] **Step 5 : commit** `feat(i18n): langue de l'appareil, pluriels et tri selon la langue`

### Task 6 : La bibliothèque de départ complète

**Files:**
- Create: `src/modele/depart/index.js`, `src/modele/depart/groupes.js`, un fichier par catégorie dans `src/modele/depart/` (16), `tests/depart.test.js`, `tests/outils/mini-bibliotheque.mjs`
- Modify: `src/modele/bibliotheque.js`, `src/i18n/fr.json` (retire `bibliothequeDeDepart`, ajoute `depart`), `src/main.js`, les tests qui lisaient `fr.bibliothequeDeDepart` (`tests/bibliotheque.test.js`, `tests/contrat.test.js`, `tests/assistant.test.js`, `tests/outils/suppressions.mjs`, et les tests d'écran listés par `grep -l bibliothequeDeDepart tests`)

**Interfaces:**
- Produces (`src/modele/depart/index.js`) : `DEPART = { groupes, categories }`, sans aucun texte :
  - groupe : `{ cle, etiquettes: [cle, ...] }` ;
  - catégorie : `{ cle, icone, couleur, etiquettes?: [cle], objets: [objet] }` ;
  - objet : `{ cle, regle, valeur, plafond?, parPersonne, pourQui, consommable?, etiquettes?: [cle], note?: true }`.
  Les clés (minuscules, tirets) sont uniques dans tout `DEPART`.
- Produces (`fr.json`, branche `depart`) : `groupes.<cle>`, `etiquettes.<cle>`, `categories.<cle>`, `objets.<cle>.nom` et, si `note: true`, `objets.<cle>.note`.
- Produces (`bibliotheque.js`) :
  - `construireBibliotheque(depart, textes, { nouvelId, maintenant })` : `textes` est la branche `depart` d'un dictionnaire ; même forme de sortie qu'aujourd'hui, plus `pourQui` ;
  - `bibliothequeComplete(depart, textes) -> boolean` : tout nom (et toute note annoncée) présent et non vide ;
  - `langueDeLaBibliotheque(langue, dictionnaires, depart) -> string` : `langue` si sa bibliothèque est complète, sinon `'fr'`.
- Produces (`tests/outils/mini-bibliotheque.mjs`) : `MINI_DEPART`, `MINI_TEXTES` (la mini-bibliothèque actuelle, au nouveau format), `miniBibliotheque()` (construite) et `graineMini()` : l'état du stockage du navigateur juste après son installation, à passer en `donnees` à `ouvrir()`.

Source du contenu : `docs/maquettes/bibliotheque-depart/bibliotheque-v5.js` (copie de la 5e relecture ; en cas de doute, https://baluchon.biovibralyon.fr/ fait foi). Correspondance : `f/j/n/s` + valeur = règle (`fixe`, `par_jour`, `par_nuit`, `par_semaine`), `/N` = plafond, `~` devant = partagé (`parPersonne: false`), groupe = `pourQui`, `a` = `consommable: true`, étiquettes et notes reprises mot pour mot. La conversion peut se faire par un script jetable, non commité.

- [ ] **Step 1 : écrire les tests qui échouent** (`tests/depart.test.js`) : 4 groupes (Activités 12, Destination 4, Transport 3, Hébergement 4 étiquettes, noms français exacts de la spec) ; 16 catégories, 171 objets, 47 notes ; chaque étiquette citée existe ; chaque picto est dans `src/modele/catalogue.js` ; chaque couleur dans `COULEURS` ; aucune clé en double ; aucun nom en double dans une catégorie ; `bibliothequeComplete(DEPART, fr.depart) === true` ; règles, valeurs (1 à 999), plafonds (jamais avec `fixe`) et `pourQui` valides ; et quelques objets témoins exacts : « Lessive de voyage » `par_semaine` 5 partagé tous, sans plafond ; « Carnet de santé » fixe 1 par personne enfants ; « Espèces » note « Prévoir de partir avec environ 50 € par personne ». Plus : `langueDeLaBibliotheque('eo', { fr, eo: { depart: {} } }, DEPART) === 'fr'`.
- [ ] **Step 2 : lancer `pnpm test`** — attendu : échecs.
- [ ] **Step 3 : implémenter.** Installation (`main.js`) : `construireBibliotheque(DEPART, DICTIONNAIRES[l].depart, …)` avec `l = langueDeLaBibliotheque(LANGUE, DICTIONNAIRES, DEPART)`, langue `l` retenue en base comme aujourd'hui. Les tests d'écran qui supposaient la mini-bibliothèque l'installent par `graineMini()` ; `tests/ecran-voyages-vide.mjs` vérifie désormais que le premier lancement installe les 16 catégories de `DEPART` en langue `fr`.
- [ ] **Step 4 : lancer `pnpm verif`** — attendu : vert.
- [ ] **Step 5 : commit** `feat(bibliotheque): bibliothèque de départ complète, structure séparée des textes`

### Task 7 : Contrôle des fichiers de langue, traduction d'essai et guide

**Files:**
- Create: `scripts/controles/langues.mjs`, `tests/outils/langue-essai.mjs`, `tests/ecran-langue.mjs`, `docs/TRADUIRE.md`
- Modify: `scripts/controles/tous.mjs`, `tests/controles.test.js`, `tests/ecrans.mjs`, `.gitignore` (`tests/langues/`)

**Interfaces:**
- Produces (`scripts/controles/langues.mjs`) : `verifierLangue(reference, traduction, langue) -> string[]` (fautes lisibles, vide si tout va bien) : clé absente du français ; `{valeur}` différente de celle du français ; forme de pluriel attendue par `Intl.PluralRules(langue).resolvedOptions().pluralCategories` manquante ; branche `depart` ni complète ni absente. Le contrôle parcourt `src/i18n/*.json` hors `fr.json`.
- Produces (`tests/outils/langue-essai.mjs`) : `ecrireLangueEssai()` écrit `tests/langues/eo.json` : chaque texte de `fr.json` précédé de `⟦eo⟧ ` (valeurs `{…}` gardées), bibliothèque comprise ; appelé par `tests/ecrans.mjs` avant les tests.

- [ ] **Step 1 : écrire les tests qui échouent**
  - `tests/controles.test.js` : une traduction avec une clé inconnue, une avec `{n}` oublié, une `pl` sans forme `few`, une avec une bibliothèque à moitié traduite : chacune donne une faute ; une traduction partielle sans `depart` : aucune faute.
  - `tests/ecran-langue.mjs` (Playwright `locale: 'eo'`) : le titre et le menu commencent par `⟦eo⟧` ; au premier lancement, la bibliothèque installée est en `eo` ; rouverte avec `locale: 'fr-FR'` sur le même stockage, l'interface est en français et la bibliothèque reste en `eo` (critère 5) ; avec `locale: 'de-DE'`, tout est en français (critère 4).
- [ ] **Step 2 : lancer `pnpm test` et `pnpm test:ecrans`** — attendu : échecs.
- [ ] **Step 3 : implémenter**, et écrire `docs/TRADUIRE.md` (en français, une page) : copier `src/i18n/fr.json` en `<code>.json`, traduire les textes sans toucher aux clés ni aux `{valeurs}`, formes de pluriel de la langue, traduire toute la bibliothèque `depart` ou la retirer, remplir `aPropos.traduction.texte` (« Traduction : … »), lancer `pnpm verif`.
- [ ] **Step 4 : lancer `pnpm verif`** — attendu : vert.
- [ ] **Step 5 : commit** `feat(i18n): contrôle des fichiers de langue et traduction d'essai`

### Task 8 : « À propos »

**Files:**
- Create: `src/ecrans/a-propos.js`, `src/styles/a-propos.css`, `tests/ecran-a-propos.mjs`
- Modify: `src/main.js` (route `#/a-propos`), `src/ecrans/menu.js`, `src/stockage/index.js`, `src/stockage/tauri.js`, `src/stockage/navigateur.js`, `src-tauri/src/lib.rs` (commande `ouvrir_lien`), `src-tauri/android/java/fr/biovibralyon/baluchon/MainActivity.kt` (`ouvrirLien`), `src/i18n/fr.json`

**Interfaces:**
- Produces : `stockage.ouvrirLien(adresse) -> Promise<void>` : sur Android `window.BaluchonAndroid.ouvrirLien(adresse)` (Intent `ACTION_VIEW`) ; sur ordinateur `invoke('ouvrir_lien', { adresse })` (lance `xdg-open`, sans nouvelle dépendance) ; dans le navigateur, `window.open(adresse, '_blank', 'noopener')`. Kotlin et Rust refusent toute adresse qui ne commence pas par `https://`. Les deux adresses sont définies une seule fois, dans `src/ecrans/a-propos.js`.

Contenu, textes et disposition : ceux de la maquette (`docs/maquettes/bibliotheque-depart/a-propos.js`, `textes.js` → `aPropos`) ; version lue dans `package.json` ; dernière entrée du menu, picto ⓘ ; deux colonnes dès 900 px.

- [ ] **Step 1 : écrire les tests qui échouent** (`tests/ecran-a-propos.mjs`) : le menu montre « À propos » en dernier ; l'écran affiche « Version 0.1.0 », « GPL-3.0-or-later », « Phosphor », « Baumans » ; aucun texte « GitHub » ni « BagPacker » dans la page ; un appui sur « Nouvelles versions » appelle `window.open` (remplacé par un espion dans le test) avec `https://baluchon.biovibralyon.fr/telecharger` ; essais de format habituels (44 px, pas de défilement de côté) aux formats de `FORMATS`. Côté Rust : `ouvrir_lien` refuse `file:///etc/passwd` et `http://…`.
- [ ] **Step 2 : lancer `pnpm test:ecrans` et `pnpm test:base`** — attendu : échecs.
- [ ] **Step 3 : implémenter.**
- [ ] **Step 4 : lancer `pnpm verif`** — attendu : vert.
- [ ] **Step 5 : commit** `feat(a-propos): écran « À propos » et ouverture des liens`

### Task 9 : Essais sur les appareils et documents (fait par l'agent principal)

- [ ] Effacer les données de l'appli sur les appareils (autorisé), installer `pnpm android:essai` sur la SM-X210 et l'ASUS, et l'appli de bureau ; annoncer chaque appareil au moment de le piloter.
- [ ] Vérifier sur chacun : premier voyage sans saisie (critère 1) ; 2 femmes + 1 enfant (objets « hommes » absents, « enfants » présents) ; « À propos » et ses deux liens ouvrent le navigateur.
- [ ] Langue : passer la SM-X210 puis l'ASUS dans une langue non traduite (allemand) → tout en français ; remettre la langue d'origine. Sous Debian : `LANGUAGE=de LANG=de_DE.UTF-8 pnpm tauri dev` (jamais de réglage du bureau). Vérifier que `navigator.languages` suit bien l'appareil sous Android 7.
- [ ] Mettre à jour `docs/PLAN.md` (cases de la phase 13) et `CLAUDE.md` (état) seulement à la validation du chef de projet.
