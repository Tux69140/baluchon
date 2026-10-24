# Phase 3 — Cocher dans le sac : plan de réalisation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** dans la liste d'un voyage, compter pièce par pièce ce qui est dans le sac, montrer la progression (catégories, voyage, accueil), fêter les catégories et le sac bouclés, filtrer « Reste à emballer », ouvrir la fiche d'un objet, en une colonne au téléphone et en deux panneaux sur la tablette en paysage et l'ordinateur.

**Architecture:** le modèle (`src/modele/sac.js`) porte toutes les règles du sac : objet complet, geste de la case, bornes, progression, ordre, catégorie suivante. Un module d'écran pur (`src/ecrans/rangement.js`) tient l'état d'affichage figé pendant la seconde de répit (ordre, masqués, tampons, replis), testable sans navigateur ; `src/ecrans/voyage.js` ne fait que brancher gestes, minuteurs et stockage. La base SQLite passe `dans_le_sac` d'un oui/non à un nombre de pièces (migration 003).

**Tech Stack:** Tauri 2, JavaScript simple, Vite 6, rusqlite 0.32, Playwright 1.62 (avec `page.clock` pour la seconde de répit), `node --test`, Phosphor 2.1.1.

**Spec:** `docs/PRD.md` (US-15, 16, 17, 22, 40 ; « Écrans et gestes » ; « Données »), `docs/PLAN.md` phase 3, `docs/DESIGN.md` (journal du 2026-10-24), maquette validée `docs/maquettes/voyage/` (tâche 0). La maquette fait foi pour l'aspect : en cas de doute sur une marge ou une couleur, on reprend `maquette.css`.

## Global Constraints

- Lire `AGENTS.md` et `CLAUDE.md` : français partout, commentaires qui disent le *pourquoi*, TDD (garder la sortie rouge dans le rapport), fichiers de 500 lignes au plus, un nom n'est exporté que s'il est importé ailleurs, aucun texte d'interface hors de `src/i18n/fr.json`.
- Couches : un écran n'importe que `src/stockage/index.js` côté stockage ; le modèle n'importe que le modèle ; seul le stockage touche `localStorage` ou Tauri (contrôle `frontiere-couches`).
- pnpm uniquement. Prettier (`printWidth` 120, guillemets simples, `arrowParens: avoid`) après chaque écriture : `pnpm exec prettier --write <fichiers>`.
- **Commits** : seulement si le chef de projet l'a demandé pour cette phase ; alors sur une branche `phase-3`, fichiers nommés (`git add <chemins>`), message `type(portée): message` en français, et toute modification du schéma SQLite signalée dans le message.
- Champs JS en camelCase, colonnes SQLite en snake_case (serde `rename_all = "camelCase"`).
- Règles du sac (PRD) : chaque appui sur la case ajoute une pièce ; objet **complet** quand `dansLeSac >= quantite` ; la case d'un objet complet remet à 0, **après confirmation si `quantite > 1`** ; « Vider » dans la fiche demande confirmation **si `dansLeSac > 1`** ; le + s'arrête à la quantité ; compteurs = objets complets / objets.
- Délai : **1000 ms** sans nouvelle coche avant tout déplacement ; chaque coche relance le délai ; le tampon reste **1000 ms** avant le repli (une colonne) ou le passage à la catégorie suivante non bouclée (deux panneaux) ; sous le filtre, la catégorie bouclée descend en bas, atténuée, à ce même moment.
- Deux panneaux : `(min-width: 1000px) and (orientation: landscape)`, contenu centré d'au plus 1080 px (`--largeur-max`), colonne de gauche `minmax(320px, 380px)`.
- Fiche : panneau montant du bas si `(max-width: 599px), (max-height: 599px)`, sinon fenêtre centrée de 480 px ; Échap, × et (au doigt) glissé vers le bas de plus de 80 px la ferment ; un appui sur le voile la ferme aussi (rien à perdre, contrairement à « Nouveau voyage »).
- Animations : glissement 320 ms `cubic-bezier(0.65, 0, 0.35, 1)` ; tampon 500 ms `cubic-bezier(0.2, 1.6, 0.4, 1)` ; bandeau 550 ms ; fiche 260 ms. Rien ne bouge si `prefers-reduced-motion: reduce`.
- Hors périmètre de la phase 3 (visibles dans la maquette, **non construits**) : puce « Courses », bouton « Ajouter un objet », pastille « à acheter », bloc « Ajuster cet objet » de la fiche.
- Tests d'écran jugés au code de sortie, jamais de pause fixe (`page.clock` pour le délai, `calme()` sinon) ; une capture claire et une sombre par écran touché dans `captures-travail/`.

## Review Focus

1. Coches très rapides (dix appuis en une seconde sur « Repas 16 ») : dix pièces comptées, une seule écriture perdue nulle part, un seul déplacement (tâche 6).
2. Panne d'enregistrement au milieu d'une série : l'écran revient à l'état réellement enregistré, le message s'affiche en bas sans rien pousser (tâche 6).
3. Rouvrir une catégorie bouclée et y décocher un objet : le tampon disparaît, la catégorie reste ouverte, l'objet remonte après la seconde (tâches 5 et 6).
4. Basculer le filtre pendant la seconde de répit : aucun objet ne reste à moitié effacé, l'ordre final est juste (tâches 5 et 6).
5. Tourner la tablette (passage une colonne ↔ deux panneaux) fiche ouverte ou après des coches : la catégorie choisie et les coches restent (tâche 8).

## Ordre et parallélisme

0 d'abord. Puis 1 (base) et 2 (modèle) et 4 (textes) en parallèle : fichiers distincts. 3 après 1 (contrat). 5 après 2. 6 après 3, 4, 5. 7 et 8 après 6, l'une après l'autre (toutes deux touchent `voyage.js`). 9 après 2, 3, 4 (peut partir en même temps que 6). 10 en dernier.

---

### Task 0: Conserver la maquette validée

**Files:**
- Create: `docs/maquettes/voyage/index.html`, `maquette.css`, `maquette.js`, `gestes.mjs`, `captures.mjs` (copies de `maquettes-travail/voyage/`)

- [ ] **Step 1:** copier les cinq fichiers ; corriger les chemins relatifs (`../../src/` → `../../../src/`, `../../node_modules/` → `../../../node_modules/`) et l'URL des scripts (`/maquettes-travail/voyage/` → `/docs/maquettes/voyage/`).
- [ ] **Step 2:** en tête de `maquette.js`, une ligne : « Maquette validée par le chef de projet le 2026-10-24 (phase 3) ; servir la racine du dépôt (`python3 -m http.server`) et ouvrir `/docs/maquettes/voyage/` ».
- [ ] **Step 3:** vérifier que les contrôles ignorent ce dossier (`pnpm controles`) ; sinon l'ajouter aux exclusions de `scripts/controles/fichiers.mjs` et de `eslint.config.js` / `.prettierignore`, avec un commentaire.
- [ ] **Step 4:** `node docs/maquettes/voyage/gestes.mjs` (serveur à la racine) → toutes les lignes `ok`.

---

### Task 1: Le nombre de pièces dans la base SQLite

**Files:**
- Create: `src-tauri/migrations/003_dans_le_sac_en_pieces.sql`
- Modify: `src-tauri/src/base.rs` (MIGRATIONS → 3 entrées, test de migration), `src-tauri/src/voyages.rs`, `src-tauri/src/lib.rs`, `tests/contrat/stockage.json`, `src/modele/voyage.js` (`dansLeSac: 0`), `tests/voyage.test.js`

**Interfaces:**
- Produces (Rust) : `ObjetDuVoyage.dans_le_sac: i64` ; `Base::regler_dans_le_sac(&self, id: &str, dans_le_sac: i64, modifie_le: &str) -> Result<(), String>` (erreur si aucun objet n'a cet id ou si la valeur sort de 0..=quantite) ; `Base::etats_des_objets(&self) -> Result<Vec<EtatObjet>, String>` avec `EtatObjet { voyage_id: String, quantite: i64, dans_le_sac: i64 }` (camelCase en JSON).
- Produces (commandes Tauri) : `regler_dans_le_sac(id, dans_le_sac, modifie_le)`, `etats_des_objets()`.
- Produces (contrat) : `dansLeSac` est un entier dans `tests/contrat/stockage.json` et dans ce que fabrique `genererVoyage` (0 à la création).

- [ ] **Step 1: Tests Rust qui échouent** — dans `voyages.rs` :
  - `regler_dans_le_sac_est_relu_et_survit_a_la_fermeture` : créer le contrat, régler le 1er objet à 1, rouvrir la base, relire `dans_le_sac == 1` et `modifie_le` changé.
  - `regler_dans_le_sac_refuse_hors_bornes_et_objet_inconnu` : `-1` → Err, `quantite + 1` → Err, id `"inconnu"` → Err ; la valeur enregistrée reste inchangée.
  - `etats_des_objets_donne_quantite_et_pieces_de_chaque_objet` : après création du contrat, autant d'états que d'objets, chacun avec `voyage_id == "v-vercors"`.
  - dans `base.rs`, `la_migration_003_convertit_les_coches_en_pieces` : base à la version 2 (MIGRATIONS[0..2] appliquées), un objet `quantite 16, dans_le_sac 1` et un autre `quantite 2, dans_le_sac 0` ; après `Base::ouvrir`, version 3, valeurs **16** et **0**, le voyage et ses catégories intacts.
- [ ] **Step 2:** `pnpm test:base` → échec (champ booléen, fonctions absentes).
- [ ] **Step 3: Migration** `003_dans_le_sac_en_pieces.sql` : reconstruire `objet_du_voyage` (SQLite ne modifie pas une contrainte) — nouvelle table identique sauf `dans_le_sac INTEGER NOT NULL DEFAULT 0` et la contrainte de table `CHECK (dans_le_sac >= 0 AND dans_le_sac <= quantite)` ; copie avec `CASE WHEN dans_le_sac = 1 THEN quantite ELSE 0 END` ; `DROP`, `ALTER TABLE … RENAME`, recréer l'index `objet_du_voyage_par_voyage`. Commentaire d'en-tête : pourquoi la reconstruction, et qu'une coche de l'ancien format devient « toutes les pièces ».
- [ ] **Step 4:** Rust : `dans_le_sac: i64`, les deux méthodes (UPDATE … WHERE id = ?1, `changes() == 0` → `Err("Objet introuvable.")`), la struct `EtatObjet`, les deux commandes dans `lib.rs` (et `generate_handler!`).
- [ ] **Step 5:** `tests/contrat/stockage.json` : `dansLeSac` en nombres (dont au moins un objet à une valeur partielle, par ex. 1 sur 2) ; `src/modele/voyage.js` : `dansLeSac: 0` ; dans `tests/voyage.test.js`, l'assertion existante de création attend `dansLeSac: 0`.
- [ ] **Step 6:** `pnpm test:base && pnpm test` → vert.
- [ ] **Step 7: Commit** (si autorisé) — `feat(base): nombre de pièces dans le sac (migration 003, schéma modifié)`.

---

### Task 2: Les règles du sac dans le modèle

**Files:**
- Create: `src/modele/sac.js`, `tests/sac.test.js`
- Modify: `src/modele/voyage.js` (`listeParCategorie` trie avec `ordreDansLeSac`), `tests/voyage.test.js`

**Interfaces:**
- Produces :
  - `estComplet(objet) → boolean` (`dansLeSac >= quantite`)
  - `etatDansLeSac(objet) → 'vide' | 'entame' | 'plein'`
  - `appuiSurCase(objet) → { dansLeSac: number, confirmer: boolean }`
  - `bornerDansLeSac(objet, valeur) → number` (entier entre 0 et `quantite`)
  - `viderDemandeConfirmation(objet) → boolean` (`dansLeSac > 1`)
  - `progression(objets) → { faits: number, total: number }`
  - `estBouclee(objets) → boolean` (au moins un objet, tous complets)
  - `ordreDansLeSac(objets) → objet[]` (copie : incomplets par nom, puis complets par nom ; `localeCompare` comme `parNom`)
  - `progressionParVoyage(etats) → Map<voyageId, { faits, total }>`
  - `categorieSuivante(ids, choisie, estBoucleeParId) → id | null` (la suivante non bouclée après `choisie`, en reprenant au début ; `null` s'il n'y en a pas)

- [ ] **Step 1: Test qui échoue** — `tests/sac.test.js` (extraits, valeurs exactes) :

```js
const o = (dansLeSac, quantite, nom = 'Repas') => ({ nom, dansLeSac, quantite });
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
});
test('les compteurs comptent les objets complets, pas les pièces', () => {
  assert.deepEqual(progression([o(16, 16), o(6, 16), o(0, 1)]), { faits: 1, total: 3 });
  assert.equal(estBouclee([]), false);
  assert.equal(estBouclee([o(2, 2), o(1, 1)]), true);
});
test('ordre : par nom, les complets en bas', () => {
  const noms = ordreDansLeSac([o(1, 1, 'Pull'), o(0, 2, 'T-shirts'), o(0, 1, 'Chaussettes'), o(2, 2, 'Maillot')]).map(x => x.nom);
  assert.deepEqual(noms, ['Chaussettes', 'T-shirts', 'Maillot', 'Pull']);
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
```

  et dans `tests/voyage.test.js` : `listeParCategorie` place un objet complet après les incomplets de sa catégorie.
- [ ] **Step 2:** `pnpm test` → échec (module absent).
- [ ] **Step 3:** écrire `src/modele/sac.js` (en-tête : renvoi au PRD « Écrans et gestes », US-15/16/17/40) ; `listeParCategorie` utilise `ordreDansLeSac` (et son commentaire « les cochés en bas viendront en phase 3 » disparaît).
- [ ] **Step 4:** `pnpm test` → vert.
- [ ] **Step 5: Commit** (si autorisé) — `feat(modele): règles du sac (pièces, progression, ordre)`.

---

### Task 3: Le stockage — régler, lire les états, retenir le filtre

**Files:**
- Create: `src/stockage/preferences.js`
- Modify: `src/stockage/tauri.js`, `src/stockage/navigateur.js`, `tests/stockage-navigateur.test.js`

**Interfaces:**
- Consumes : commandes de la tâche 1.
- Produces (les deux variantes, même forme) :
  - `reglerDansLeSac(id, dansLeSac, modifieLe) → Promise<void>` (rejet si l'objet est inconnu ou hors bornes, comme la base ; panne simulée `'reglerDansLeSac'`)
  - `etatsDesObjets() → Promise<{ voyageId, quantite, dansLeSac }[]>` (panne simulée `'etatsDesObjets'`)
  - `lireFiltre(voyageId) → boolean`, `ecrireFiltre(voyageId, actif) → void` — définis une seule fois dans `preferences.js` (clé `baluchon-filtre-reste`, un objet `{ [voyageId]: true }` en JSON ; lecture ou écriture qui échoue = filtre inactif, sans erreur) et réexportés par les deux variantes. Préférence de l'appareil : hors base, hors sauvegarde (PRD « Données »).

- [ ] **Step 1: Tests qui échouent** — dans `tests/stockage-navigateur.test.js` :
  - régler 6 sur l'objet de 16 pièces du contrat, relire `lireVoyage` → 6, `modifieLe` changé ; `etatsDesObjets()` le reflète ;
  - `reglerDansLeSac('inconnu', 1, 'x')` et une valeur au-delà de la quantité sont rejetés, rien ne change ;
  - panne `'reglerDansLeSac'` : rejet, valeur inchangée ;
  - `ecrireFiltre('v-vercors', true)` puis une **nouvelle** instance du stockage → `lireFiltre('v-vercors') === true`, `lireFiltre('autre') === false` ; un `localStorage` qui lève une exception → `false` sans erreur.
- [ ] **Step 2:** `pnpm test` → échec.
- [ ] **Step 3:** implémenter ; la variante navigateur vérifie les bornes comme la contrainte SQLite (commentaire : « même refus que la base »).
- [ ] **Step 4:** `pnpm test && pnpm controles` → vert (le contrôle `exports-inutilises` passera une fois les écrans branchés : si besoin, lancer seulement `node --test tests/stockage-navigateur.test.js` à cette étape).
- [ ] **Step 5: Commit** (si autorisé) — `feat(stockage): régler les pièces dans le sac, retenir le filtre`.

---

### Task 4: Textes, notes de départ, description d'une règle, pictos

**Files:**
- Modify: `src/i18n/fr.json`, `src/ecrans/format.js`, `tests/format.test.js`, `src/ecrans/icones.js`, `tests/traduction.test.js` (si un contrôle des clés y vit)

**Interfaces:**
- Produces : `decrireRegle(t, objet) → string` dans `format.js` ; pictos d'interface `coche` (check), `info`, `deplier` (caret-down), `filtre` (funnel), `boucle` (check-circle) dans `iconeInterface` (et `svgInterface(nom)` sans enveloppe si la case ou la pastille en ont besoin, exporté seulement s'il est importé).
- Produces (clés `fr.json`, textes exacts) :
  - `voyage.dansLeSac` « Dans le sac » ; `voyage.compte` « {faits} / {total} » ; `voyage.sacBoucle` « Sac bouclé ! » ; `voyage.toutEstDansLeSac` « Tout est dans le sac » ; `voyage.boucle` « Bouclé ! » ; `voyage.filtre` « Reste à emballer » ; `voyage.masques.one` « {n} objet dans le sac, masqué » / `.other` « {n} objets dans le sac, masqués » ; `voyage.partage` « partagé » ; `voyage.categories` « Catégories » ; `voyage.categorieMasquee.one` « Catégorie bouclée : son objet est dans le sac, masqué par le filtre. » / `.other` « Catégorie bouclée : ses {n} objets sont dans le sac, masqués par le filtre. » ; `voyage.vide.titre` « Rien à emballer pour l’instant » ; `voyage.vide.texte` « Aucun objet de la bibliothèque ne correspondait à ce voyage. » ; `voyage.erreurEnregistrement` « La coche n’a pas pu être enregistrée. Rien n’a changé ; réessayez. »
  - libellés de la case : `voyage.case.ajouter` « {nom} : {n} sur {total} dans le sac. Ajouter une pièce » ; `.cocher` « {nom} : pas encore dans le sac. Cocher » ; `.vider` « {nom} : dans le sac. Vider » ; `.decocher` « {nom} : dans le sac. Décocher » ; `voyage.ouvrirFiche` « {nom}, {quantite}. Ouvrir la fiche » ; `voyage.avecNote` « une note ».
  - fiche : `fiche.dansLeSac` « Dans le sac » ; `fiche.sur` « sur {total} » ; `fiche.moins` « Une pièce de moins » ; `fiche.plus` « Une pièce de plus » ; `fiche.tout` « Tout dans le sac » ; `fiche.vider` « Vider » ; `fiche.note` « Note » ; `fiche.confirmerTitre` « Vider « {nom} » ? » ; `fiche.confirmerTexte` « Les {n} pièces repartent hors du sac. »
  - règles : `regle.fixe` « {valeur} en tout » ; `regle.fixeParPersonne` « {valeur} par personne » ; `regle.parJour` « {valeur} par jour » ; `regle.parJourParPersonne` « {valeur} par jour et par personne » ; `regle.parNuit` « {valeur} par nuit » ; `regle.parNuitParPersonne` « {valeur} par nuit et par personne » ; `regle.plafond` « {regle}, au plus {plafond} » ; `regle.plafondParPersonne` « {regle}, au plus {plafond} par personne ».
  - `bibliothequeDeDepart` : notes rédigées par nous — « Pièce d’identité » : « Vérifier la date de validité avant de partir : certaines démarches prennent des semaines. » ; « Repas » : « Prévoir un repas de secours par personne en plus. » ; « Chargeur de téléphone » : « Une multiprise de voyage dépanne dans les chambres à prise unique. »

- [ ] **Step 1: Test qui échoue** — `tests/format.test.js` :

```js
test('une règle se décrit en toutes lettres', () => {
  const r = (regle, valeur, parPersonne, plafond = null) => decrireRegle(t, { regle, valeur, parPersonne, plafond });
  assert.equal(r('par_jour', 2, true), '2 par jour et par personne');
  assert.equal(r('fixe', 1, false), '1 en tout');
  assert.equal(r('par_jour', 1, true, 5), '1 par jour et par personne, au plus 5 par personne');
  assert.equal(r('par_nuit', 1, false, 3), '1 par nuit, au plus 3');
});
```
- [ ] **Step 2:** `pnpm test` → échec.
- [ ] **Step 3:** ajouter les clés, les notes, `decrireRegle`, les pictos.
- [ ] **Step 4:** `pnpm test` → vert (le test de contrat garde les mêmes champs : la note existait déjà).
- [ ] **Step 5: Commit** (si autorisé) — `feat(textes): textes du sac et notes de la bibliothèque de départ`.

---

### Task 5: L'état d'affichage pendant la seconde de répit

**Files:**
- Create: `src/ecrans/rangement.js`, `tests/rangement.test.js`

**Interfaces:**
- Consumes : `estComplet`, `estBouclee`, `ordreDansLeSac`, `categorieSuivante` (tâche 2) ; la liste `listeParCategorie(contenu)` → `[{ categorie, objets }]`.
- Produces — l'état est un objet simple, jamais modifié en place (chaque fonction rend un nouvel état) :
  - `etatInitial(liste, { filtre }) → Etat` avec `Etat = { filtre, ordre: Map<catId, objetId[]>, bouclees: Set<catId>, ouvertes: Set<catId>, enBas: Set<catId>, masques: Set<objetId>, sacBoucle: boolean, choisie: catId | null }` — ouvertes = non bouclées ; masqués = complets si filtre ; enBas = bouclées si filtre ; choisie = première non bouclée (sinon la première).
  - `apresRepit(etat, liste) → { etat, nouvelles: catId[], sacVientDeBoucler: boolean }` — recalcule l'ordre (`ordreDansLeSac`), les masqués (si filtre), retire des bouclées celles qui ne le sont plus (et de `enBas`, et les rouvre), ajoute les nouvelles bouclées.
  - `apresTampon(etat, nouvelles, liste) → Etat` — replie les nouvelles encore bouclées ; sous le filtre, les met dans `enBas` ; si `choisie` en fait partie, `choisie = categorieSuivante(…) ?? choisie`.
  - `basculerFiltre(etat, liste) → Etat` — masqués = complets si filtre actif, sinon vide ; enBas = bouclées si actif, sinon vide.
  - `basculerCategorie(etat, catId) → Etat` (accordéon) ; `choisirCategorie(etat, catId) → Etat`.
  - `categoriesAffichees(etat, liste) → [{ categorie, objets }]` — ordre de la bibliothèque, celles de `enBas` à la fin si filtre ; `objets` dans `etat.ordre`, sans les masqués.

- [ ] **Step 1: Test qui échoue** — `tests/rangement.test.js`, avec une petite liste (Vêtements : Pantalons 0/4, Pull 2/2 ; Toilette : Crème 0/1, Brosse 2/2 ; Papiers : Pièce 2/2) :
  - état initial : Papiers bouclée et repliée, Vêtements et Toilette ouvertes, choisie = Vêtements ;
  - Pantalons passé à 4/4 **sans** `apresRepit` : `categoriesAffichees` garde l'ordre initial `['Pantalons', 'Pull']` et Vêtements sans tampon (rien ne bouge) ; après `apresRepit` : Vêtements dans `nouvelles` et dans `bouclees`, mais encore ouverte ;
  - `apresTampon` : Vêtements repliée ; `choisie` passe à Toilette ;
  - sous filtre : Crème cochée → après `apresRepit`, Crème masquée ; après `apresTampon`, Toilette dans `enBas` et affichée en dernier ;
  - décocher Pièce (0/2) dans Papiers bouclée puis `apresRepit` : Papiers n'est plus bouclée, elle est rouverte, sort de `enBas` ;
  - tout complet → `sacVientDeBoucler === true`, `sacBoucle === true` ; décocher un objet → `sacBoucle === false` ;
  - `basculerFiltre` deux fois revient à l'état sans masqués ni `enBas`.
- [ ] **Step 2:** `node --test tests/rangement.test.js` → échec.
- [ ] **Step 3:** écrire `rangement.js` (en-tête : pourquoi un état figé — la liste ne bouge qu'après la seconde, PRD US-15).
- [ ] **Step 4:** `node --test tests/rangement.test.js` → vert.
- [ ] **Step 5: Commit** (si autorisé) — `feat(ecrans): état d'affichage figé pendant la seconde de répit`.

---

### Task 6: L'écran du voyage en une colonne

**Files:**
- Create: `src/ecrans/voyage-vues.js` (HTML : en-tête, progression, outils, carte de catégorie, ligne d'objet, écran vide), `tests/ecran-voyage-gestes.mjs`
- Modify: `src/ecrans/voyage.js` (charger, dessiner, gestes, minuteurs), `src/styles/voyage.css` (repris de la maquette : progression, puces, cartes, case, lignes, tampon, alerte), `tests/ecran-voyage.mjs`

**Interfaces:**
- Consumes : tâches 2 à 5.
- Produces : `ecranVoyage` (même forme `{ nom, charger, dessiner }`) ; `charger` rend aussi `filtre: stockage.lireFiltre(id)`. Repères stables pour les tests : `.progression` (`[data-boucle]` quand le sac est bouclé), `[data-action="filtre"][aria-pressed]`, `.masques`, `.categorie[data-id]` (`[data-attenuee]`), `.categorie-tete[aria-expanded]`, `.tampon`, `.objet[data-id][data-etat]`, `.case`, `.objet-corps`, `.objet-quantite`, `.objet-note`, `.alerte[role="alert"]`.
- Comportement à brancher dans `voyage.js` :
  - un appui sur `.case` : `appuiSurCase` ; si `confirmer`, `confirmer()` de la tâche 7 — **en attendant la tâche 7**, la tâche 6 l'appelle déjà par `import { confirmer } from './fenetre.js'` et l'y crée (titre, texte, « Annuler », « Vider » ; promesse de booléen) ; sinon mise à jour immédiate de l'objet à l'écran, redessin (sans déplacement), relance du minuteur de 1000 ms, puis écriture `reglerDansLeSac(id, valeur, new Date().toISOString())` ;
  - les écritures passent dans une **file** (une promesse chaînée) : dans l'ordre des appuis, jamais deux à la fois ;
  - une écriture rejetée : la file se vide, l'écran relit le voyage (`lireVoyage`), reconstruit l'état et affiche `.alerte` (6 s, en bas, par-dessus, `role="alert"`) ;
  - au bout du minuteur : `apresRepit`, redessin avec glissement (FLIP sur `[data-flip]`, sauf animations réduites) ; s'il y a des nouvelles bouclées : tampon posé (`data-pose`), puis 1000 ms plus tard `apresTampon` et redessin avec glissement ;
  - le filtre : `basculerFiltre`, `ecrireFiltre`, redessin avec glissement ;
  - quitter l'écran (changement d'adresse) annule les minuteurs.

- [ ] **Step 1: Tests d'écran qui échouent.** `tests/ecran-voyage.mjs` : données `dansLeSac` en nombres ; attendus d'une colonne (téléphone, tablette en portrait) : en-tête, progression juste pour les données du test (objets complets / objets), catégories dans l'ordre de la bibliothèque, objets par nom avec les complets en bas, état de chaque case, « 6 / 16 » sur une ligne partielle, ⓘ seulement sur l'objet qui a une note, catégorie bouclée repliée avec son tampon ; voyage sans objet → `.vide-voyage` et ses deux textes ; cas existants gardés (inconnu, adresse mal formée, pannes de lecture). Le format tablette en paysage passe à la tâche 8 : le retirer ici de la boucle, avec un commentaire.
  `tests/ecran-voyage-gestes.mjs` (téléphone, `page.clock.install()` avant le chargement) :
  - six appuis sur la case de Repas (0/16) → `.objet-quantite` « 6 / 16 », `data-etat="entame"`, ordre inchangé ; seize → `plein` ;
  - trois coches en moins d'une seconde qui complètent trois objets (Pantalons 3/4, Pyjama 1/2, Pull 1/2) : après `clock.runFor(900)` l'ordre n'a pas changé ; après `runFor(200)` il a changé **une fois** (relevé de l'ordre à chaque image : exactement deux ordres distincts) ;
  - case d'un objet complet de 2 pièces → `dialog[role="alertdialog"]` ; « Annuler » ne change rien ; « Vider » → 0 ; objet complet d'une pièce → décoché sans fenêtre ;
  - dernière pièce de Toilette : après 1000 ms `.tampon` visible, après 1000 ms de plus `aria-expanded="false"` ;
  - filtre : objets complets masqués après le délai, `.masques` au texte de `voyage.masques.other` avec le nombre d'objets complets du test, catégorie bouclée en dernier avec `data-attenuee` ; rechargement de la page → filtre toujours actif et coches gardées ;
  - dernier objet du voyage → `.progression[data-boucle]` « Sac bouclé ! » ;
  - panne `reglerDansLeSac` déposée après le chargement : un appui → `.alerte` avec `fr.voyage.erreurEnregistrement`, la case revient à son état enregistré ;
  - animations réduites (`reducedMotion: 'reduce'`) : après une coche et le délai, `document.getAnimations().length === 0` ;
  - 2 formats × 2 thèmes : `verifierCommandes`, `verifierBarres`, captures `voyage-<etat>-<theme>.png`.
- [ ] **Step 2:** `node tests/ecran-voyage.mjs; node tests/ecran-voyage-gestes.mjs` → rouges (garder la sortie).
- [ ] **Step 3:** écrire `voyage-vues.js` et réécrire `voyage.js` (chacun sous 500 lignes) ; reprendre de `docs/maquettes/voyage/maquette.css` les règles de l'en-tête, de la progression, des puces, des cartes, de la case et des lignes, du tampon et de l'alerte dans `voyage.css`.
- [ ] **Step 4:** les deux tests d'écran → verts ; `pnpm test && pnpm controles` → verts.
- [ ] **Step 5:** regarder soi-même les captures téléphone et tablette en portrait, clair et sombre, contre celles de la maquette.
- [ ] **Step 6: Commit** (si autorisé) — `feat(ecrans): cocher pièce par pièce dans la liste d'un voyage`.

---

### Task 7: La fiche de l'objet

**Files:**
- Create: `src/ecrans/fiche.js`, `src/styles/fiche.css`, `tests/ecran-voyage-fiche.mjs`
- Modify: `src/ecrans/fenetre.js` (option `fermerSurVoile`, glissé vers le bas pour la fiche, `confirmer` déjà créé en tâche 6), `src/ecrans/voyage.js` (appui sur `.objet-corps`), `src/main.js` (import de `fiche.css`)

**Interfaces:**
- Consumes : `bornerDansLeSac`, `viderDemandeConfirmation`, `estComplet` ; `decrireRegle` ; `vueFenetre`, `ouvrirFenetre`, `confirmer`.
- Produces : `ouvrirFiche({ t, objet, categorie, surChangement }) → void` — `surChangement(valeur)` est le même chemin que la case (mise à jour immédiate, file d'écriture, minuteur) ; la fiche se repeint à chaque changement. `ouvrirFenetre(fenetre, { surFermeture, fermerSurVoile = false })`.
- Contenu (maquette) : titre = nom ; ligne « Catégorie · règle décrite » ; « Dans le sac » avec − / sortie / + / « sur 16 » (− désactivé à 0, + désactivé au complet, `aria-disabled`) ; « Tout dans le sac » (principal, désactivé au complet) et « Vider » (secondaire, désactivé à 0, confirmation si `viderDemandeConfirmation`) ; bloc « Note » si une note existe. Fermer rend le focus à la ligne d'origine.

- [ ] **Step 1: Test d'écran qui échoue** — `tests/ecran-voyage-fiche.mjs` :
  - appui sur la ligne Repas (6/16) → `dialog.fiche[open]`, titre « Repas », ligne « Alimentation · 2 par jour et par personne », sortie « 6 », « sur 16 », note visible ;
  - « + » → 7, la ligne derrière affiche « 7 / 16 » ; « Tout dans le sac » → 16, + désactivé ;
  - « Vider » → `alertdialog` « Les 16 pièces repartent hors du sac. » ; « Vider » → 0 ; avec 1 pièce, « Vider » ne demande rien ;
  - Échap ferme, le focus revient sur la ligne ; appui sur le voile ferme ;
  - téléphone : la fiche touche le bas de l'écran (bord bas = hauteur de la fenêtre moins la zone système) et prend toute la largeur ; tablette : fenêtre centrée de 480 px ;
  - au doigt (téléphone), glisser l'en-tête de 120 px vers le bas ferme la fiche ; témoin : 40 px ne la ferme pas ;
  - un objet sans note n'a pas de bloc « Note » ;
  - 2 formats × 2 thèmes : `verifierCommandes`, `verifierBarres`, captures `fiche-<theme>.png`.
- [ ] **Step 2:** `node tests/ecran-voyage-fiche.mjs` → rouge.
- [ ] **Step 3:** écrire `fiche.js` et `fiche.css` (reprise de la maquette : panneau du bas, poignée, compteur, actions qui passent à la ligne sans couper un libellé).
- [ ] **Step 4:** le test → vert ; relancer `tests/ecran-voyage-gestes.mjs` et `tests/ecran-nouveau-voyage-fenetre.mjs` (fenêtre partagée) → verts.
- [ ] **Step 5: Commit** (si autorisé) — `feat(ecrans): fiche d'un objet du voyage`.

---

### Task 8: Deux panneaux sur la tablette en paysage et l'ordinateur

**Files:**
- Create: `src/styles/voyage-panneaux.css`, `tests/ecran-voyage-panneaux.mjs`
- Modify: `src/ecrans/voyage-vues.js` (liste des choix, panneau de détail), `src/ecrans/voyage.js` (choix de la disposition par `matchMedia`, redessin au changement), `src/main.js` (import du CSS), `tests/ecran-voyage.mjs` (rend le format paysage à ce test-ci)

**Interfaces:**
- Consumes : `choisirCategorie`, `apresTampon` (passage à la suivante), `categoriesAffichees`.
- Produces : constante `DEUX_PANNEAUX = '(min-width: 1000px) and (orientation: landscape)'` dans `voyage.js`, avec un commentaire qui renvoie à la même requête dans `voyage-panneaux.css` ; repères `.panneaux`, `.panneau-gauche`, `.choix[data-id][aria-current]`, `.panneau-droit`, `#detail-titre`.

- [ ] **Step 1: Test d'écran qui échoue** — `tests/ecran-voyage-panneaux.mjs` (1280×800 et 1440×900) :
  - `.panneaux` présent, contenu d'au plus 1080 px, centré ; à gauche en-tête, progression, filtre, choix dans l'ordre de la bibliothèque ; choisie = première non bouclée, `aria-current="true"`, fond actif et flèche visible ;
  - toucher Alimentation → `#detail-titre` « Alimentation », ses objets à droite ;
  - dernière pièce de Toilette choisie : tampon dans `.detail-tete` après 1000 ms, puis `#detail-titre` = catégorie suivante non bouclée après 1000 ms de plus (`page.clock`) ;
  - filtre : Papiers bouclée en dernier dans la liste de gauche, `data-attenuee` ; la choisir → `.ligne-info` avec le texte `categorieMasquee` ;
  - tourner (800×1280 ↔ 1280×800 dans la même page) après une coche : la catégorie choisie reste celle de la liste ouverte, la coche aussi ; en portrait, une colonne ;
  - 2 formats × 2 thèmes : `verifierCommandes`, `verifierBarres`, captures `voyage-panneaux-<theme>.png`.
- [ ] **Step 2:** → rouge.
- [ ] **Step 3:** écrire la disposition (reprise de la maquette : grille, panneaux qui défilent chacun, choix choisi à bord encre 2 px).
- [ ] **Step 4:** → vert ; relancer les tests d'écran du voyage → verts.
- [ ] **Step 5:** regarder soi-même les captures paysage et ordinateur, clair et sombre.
- [ ] **Step 6: Commit** (si autorisé) — `feat(ecrans): liste d'un voyage en deux panneaux en paysage`.

---

### Task 9: La progression sur l'accueil

**Files:**
- Modify: `src/ecrans/voyages.js`, `src/styles/voyages.css`, `tests/ecran-voyages-liste.mjs`

**Interfaces:**
- Consumes : `etatsDesObjets()` (tâche 3), `progressionParVoyage` (tâche 2), clés `voyage.compte`, `voyage.dansLeSac`, `voyage.sacBoucle` (tâche 4 ; ajouter `voyages.progression` « {faits} / {total} dans le sac » et `voyages.sacBoucle` « Sac bouclé » si absentes).
- Produces : `.carte-progression` dans la carte des voyages **en cours et à venir** ayant au moins un objet : mini-jauge + « 13 / 31 dans le sac », ou pastille `.pastille-boucle` « Sac bouclé » avec son picto ; rien sur les passés.

- [ ] **Step 1: Test qui échoue** — dans `tests/ecran-voyages-liste.mjs`, des objets pour trois voyages : un en cours à 1 / 3, un à venir entièrement coché, un passé coché à moitié → textes exacts « 1 / 3 dans le sac » et « Sac bouclé », aucune progression sur le passé ; témoin : un voyage à venir sans objet n'a pas de jauge.
- [ ] **Step 2:** → rouge.
- [ ] **Step 3:** `charger` lit aussi `etatsDesObjets()` ; une panne de cette lecture garde la liste sans jauges (la progression est un plus, pas une raison d'écran d'erreur) — l'ajouter au test (panne `'etatsDesObjets'` → cartes visibles, sans jauge).
- [ ] **Step 4:** → vert.
- [ ] **Step 5: Commit** (si autorisé) — `feat(ecrans): progression des voyages sur l'accueil`.

---

### Task 10: Vérification complète et essai sur la tablette

**Files:** aucun nouveau ; `docs/PLAN.md` n'est pas coché (le chef de projet valide).

- [ ] **Step 1:** `pnpm verif` en tâche de fond → tout vert (lint, format, contrôles, tests, base, écrans).
- [ ] **Step 2:** relecture de l'ensemble (une seule) : règles écrites une seule fois (`estComplet` et l'ordre n'existent que dans `sac.js`), aucun texte en dur, fichiers sous 500 lignes, migration 003 relue avec soin (perte de données impossible : la copie précède la suppression, le tout dans la transaction de `migrer`).
- [ ] **Step 3:** essai sur la tablette (mémoire « Essai sur la tablette ») : `adb -s R92Y1158BQJ` ; montrer au chef de projet la liste des voyages présents avant d'effacer les données de Baluchon (`pm clear fr.biovibralyon.baluchon`, accord donné le 2026-10-24 pour ces seuls essais) ; `pnpm android:essai`, `adb install -r` ; vérifier en portrait et en paysage, clair et sombre : une coche, « 6 / 16 », une catégorie bouclée, le filtre, la fiche, le passage en deux panneaux en tournant ; remettre rotation et thème d'origine.
- [ ] **Step 4:** compte rendu au chef de projet (une quarantaine de lignes au plus) : ce qui a changé, ce qui est vérifié (commandes et résultats), l'impact sur les données (schéma 003), ce qui reste à valider par lui.
