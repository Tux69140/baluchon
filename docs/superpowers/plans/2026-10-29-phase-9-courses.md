# Phase 9 : Courses — plan de construction

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal :** la marque « à acheter » visible et réglable dans le voyage, et l'écran Courses où l'on note les
pièces achetées.

**Architecture :** les règles « à acheter » vivent dans un nouveau module pur `src/modele/courses.js` ;
la base remplace la colonne `achete` (0/1) par `achetes` (nombre de pièces) et gagne une écriture
`regler_achats` ; l'écran Courses est un nouvel écran (`#/voyage/:id/courses`) qui reprend la case, la
fiche, le bandeau « Annuler » et le grand format existants.

**Tech Stack :** Tauri 2, Rust + rusqlite, JavaScript sans framework, Vite, Playwright, `node --test`.

**Spec :** `docs/superpowers/specs/2026-10-29-phase-9-courses-design.md` (à lire en entier avant chaque
tâche) ; maquette validée `docs/maquettes/courses/` (`pnpm dev`, puis
`http://localhost:1430/docs/maquettes/courses/`), qui montre chaque état et le HTML attendu.

## Global Constraints

- `AGENTS.md` fait loi : TDD (test rouge d'abord), fichiers ≈ 500 lignes au plus, une seule définition
  par règle, couches étanches (aucun écran ne touche SQLite ni Tauri), textes dans `src/i18n/fr.json`,
  commentaires en français qui disent le pourquoi, exports utiles seulement.
- pnpm seulement (jamais npm/npx). Commits locaux sur `phase-9` ; jamais de push ni de fusion.
- Nom du champ : `achetes` (JS) / `achetes` (Rust, `i64`) / colonne `achetes` ; il remplace `achete`
  partout (aucune trace de l'ancien nom ne doit rester hors des migrations 002 et 003).
- Bornes : `achetes` entier, `0 ≤ achetes ≤ quantite`, refusé sinon par la base et par la variante
  navigateur, avec le même message.
- Textes exacts : ceux de la spec et de `docs/maquettes/courses/maquette.js` (espaces insécables dans
  les guillemets, apostrophes typographiques ’).
- Icône chariot : Phosphor Bold `shopping-cart`, ajoutée à `INTERFACE` de `src/ecrans/icones.js` sous le
  nom `courses`.
- WebView d'Android 7 (Chrome 116) : pas de CSS plus récent que le reste de l'appli.
- Chaque tâche finit par `pnpm lint && pnpm format:verif && pnpm controles` vert, plus ses propres tests.

## Review Focus

1. Deux appuis rapides sur la case d'un objet à 1 pièce, ou un appui pendant sa seconde de répit : un
   seul achat compté, aucune écriture au-delà de la quantité (test de la tâche 5).
2. Écriture d'un achat refusée (panne) : l'écran Courses relit, l'objet reste avec son ancien compte et
   un message le dit au bas de l'écran (test de la tâche 5).
3. « Annuler » du bandeau touché après être revenu au voyage : la pastille y réapparaît sans recharger
   (test de la tâche 5).
4. Nom d'objet piégé (`<b>`, `&`, `"`) : lu tel quel dans la ligne, la fiche d'achat et le bandeau
   (tests des tâches 5 et 6).
5. Quantité prévue baissée sous les pièces achetées : `achetes` suit, sans refus de la base (test de la
   tâche 3).

---

### Task 1 : Les règles « à acheter » dans le modèle

**Files :**
- Create : `src/modele/courses.js`
- Modify : `src/modele/sac.js` (exporter `etatDePieces`, réécrire `etatDansLeSac` avec elle)
- Test : `tests/courses.test.js`

**Interfaces :**
- Produces (tous dans `src/modele/courses.js`, sauf le premier) :
  - `etatDePieces(n: number, quantite: number) → 'vide' | 'entame' | 'plein'` (dans `sac.js`)
  - `resteAAcheter(objet) → number` : `objet.aAcheter ? max(0, quantite − achetes) : 0`
  - `estAAcheter(objet) → boolean`
  - `etatAchat(objet) → 'vide' | 'entame' | 'plein'` (= `etatDePieces(achetes, quantite)`)
  - `bornerAchetes(objet, n) → number` (entier entre 0 et la quantité)
  - `achetesApresSac(objet, dansLeSac) → number` : la quantité si l'objet est marqué et `dansLeSac ≥ quantite`, sinon `objet.achetes`
  - `achetesApresQuantite(objet, quantite) → number` : `min(objet.achetes, quantite)`
  - `basculerAAcheter(objet) → { aAcheter, achetes }` : éteint si `estAAcheter` (achetes inchangés) ; sinon allumé, `achetes` à 0 s'il était ≥ quantité
  - `listeDesCourses({ categories, objets }, retenus = new Set()) → [{ categorie, objets }]` : catégories par `ordre`, sans celles qui n'ont rien ; objets `estAAcheter` ou dont l'id est dans `retenus` (seconde de répit), par nom (`localeCompare`, `'fr'`)
  - `etatDesCourses(objets) → 'a-faire' | 'faites' | 'rien'` : `'rien'` si aucun objet n'a `aAcheter`, `'faites'` si aucun n'est `estAAcheter`

- [ ] **Step 1 : tests rouges** — dans `tests/courses.test.js`, un test par fonction, avec au moins :
  `resteAAcheter({ aAcheter: true, quantite: 16, achetes: 6 }) === 10` ; non marqué → 0 ;
  `achetesApresSac({ aAcheter: true, quantite: 2, achetes: 0 }, 2) === 2` ; même objet, sac à 1 → 0 ;
  non marqué, sac plein → achetes inchangés ; `achetesApresQuantite({ achetes: 6 }, 4) === 4` ;
  `basculerAAcheter({ aAcheter: true, quantite: 4, achetes: 4 })` → `{ aAcheter: true, achetes: 0 }`
  (marqué mais tout acheté : rallumer repart de zéro) ; `{ aAcheter: true, quantite: 4, achetes: 2 }` →
  `{ aAcheter: false, achetes: 2 }` ; `{ aAcheter: false, quantite: 4, achetes: 2 }` →
  `{ aAcheter: true, achetes: 2 }` ; `listeDesCourses` : ordre des catégories par `ordre`, catégorie sans
  achat absente, objet de `retenus` gardé ; `etatDesCourses` pour les trois cas ; `etatDePieces(0,3)`,
  `(1,3)`, `(3,3)`. `tests/sac.test.js` reste vert sans changement.
- [ ] **Step 2** : `pnpm test` → les nouveaux tests échouent (module introuvable).
- [ ] **Step 3** : écrire `src/modele/courses.js` et `etatDePieces` dans `sac.js` (règles et commentaires
  de la spec, « Règles »).
- [ ] **Step 4** : `pnpm test` → vert.
- [ ] **Step 5** : `git commit -m "feat(modele): règles « à acheter » des Courses"`

### Task 2 : La base compte les pièces achetées

**Files :**
- Create : `src-tauri/migrations/005_achats_en_pieces.sql`, `src-tauri/src/courses.rs`, `src-tauri/src/courses_essais.rs`
- Modify : `src-tauri/src/base.rs` (`MIGRATIONS` à 5, test de passage 4 → 5), `src-tauri/src/voyages.rs`
  (`ObjetDuVoyage.achetes: i64`, `COLONNES_OBJET`, lecture, insertion, `regler_dans_le_sac`),
  `src-tauri/src/ajustements.rs` (`regler_quantite`), `src-tauri/src/ajustements_essais.rs`,
  `src-tauri/src/lib.rs` (commandes), `tests/contrat/stockage.json` (`"achetes": 0` à la place de
  `"achete": false`)

**Interfaces :**
- Produces (commandes Tauri, paramètres en camelCase côté JS) :
  - `regler_dans_le_sac(id, dans_le_sac, achetes, modifie_le)` — écrit les deux en une seule requête
  - `regler_quantite(id, quantite, dans_le_sac, achetes, modifie_le)` — refuse `achetes > quantite`
  - `regler_achats(id, a_acheter: bool, achetes, modifie_le)` (nouvelle, `Base::regler_achats` dans `courses.rs`)
  - erreurs : objet inconnu → `"Objet introuvable."` ; hors bornes → `"Les pièces achetées dépassent la quantité prévue."`

- [ ] **Step 1 : tests rouges** — dans `courses_essais.rs` (inclus par `#[cfg(test)] #[path] mod tests;`
  comme `ajustements_essais.rs`) : `regler_achats` écrit marque et compte puis `lire_voyage` les rend ;
  refuse `achetes` = quantité + 1, = −1, et un id inconnu ; `regler_dans_le_sac` écrit `achetes` ;
  `regler_quantite` refuse `achetes` au-delà de la nouvelle quantité. Dans `base.rs` : une base à la
  version 4 contenant un objet `a_acheter = 1, dans_le_sac = quantite`, un objet `a_acheter = 1,
  dans_le_sac = 0`, un objet `achete = 1` → après ouverture, `achetes` vaut quantité, 0, quantité ; version 5.
- [ ] **Step 2** : `pnpm test:base` → rouge (ne compile pas).
- [ ] **Step 3** : migration 005 en reconstruisant la table comme 003 (même schéma, `achetes INTEGER NOT
  NULL DEFAULT 0` à la place de `achete`, `CHECK (achetes >= 0 AND achetes <= quantite)`) ; copie :
  `CASE WHEN achete = 1 OR (a_acheter = 1 AND dans_le_sac >= quantite) THEN quantite ELSE 0 END` ;
  recréer l'index `objet_du_voyage_par_voyage`. Puis le code Rust et le contrat.
- [ ] **Step 4** : `pnpm test:base` → vert ; `pnpm test` → `tests/contrat.test.js` rouge tant que la
  tâche 3 n'est pas faite : le noter, c'est attendu.
- [ ] **Step 5** : `git commit -m "feat(base): pièces achetées et réglage « à acheter »"`

### Task 3 : Le stockage et les écritures du voyage suivent

**Files :**
- Modify : `src/stockage/tauri.js`, `src/stockage/navigateur.js` (`reglerDansLeSac`),
  `src/stockage/navigateur-voyages.js` (`reglerQuantite`, nouvelle `reglerAchats`),
  `src/modele/voyage.js` (`achetes: 0`), `src/modele/ajustements.js` (`preparerAjout` : `achetes: 0`),
  `src/ecrans/voyage.js` (`changer`), `src/ecrans/ajustements.js` (`regler`),
  `tests/ecritures-bibliotheque.test.js` (ranger `reglerAchats` avec les écritures du voyage),
  `tests/outils/voyage-essai.mjs` et toute donnée d'essai qui porte `achete`
- Test : `tests/stockage-courses.test.js` (nouveau), `tests/stockage-navigateur.test.js`,
  `tests/stockage-ajustements.test.js`, `tests/contrat.test.js`

**Interfaces :**
- Consumes : tâche 1 (`achetesApresSac`, `achetesApresQuantite`), tâche 2 (commandes).
- Produces (stockage, même forme dans les deux variantes) :
  - `reglerDansLeSac(id, dansLeSac, achetes, modifieLe)`
  - `reglerQuantite(id, quantite, dansLeSac, achetes, modifieLe)`
  - `reglerAchats(id, aAcheter, achetes, modifieLe)`, avec la panne simulée `'reglerAchats'` comme les autres

- [ ] **Step 1 : tests rouges** — `tests/stockage-courses.test.js` : `reglerAchats` écrit puis
  `lireVoyage` relit ; refus de 17 sur 16, de −1, de 1.5, d'un id inconnu ; la panne `'reglerAchats'`
  refuse sans rien écrire. Adapter les appels existants à la nouvelle forme, et ajouter : `reglerQuantite`
  refuse `achetes` au-delà de la quantité. `tests/contrat.test.js` vert une fois `genererVoyage` corrigé.
- [ ] **Step 2** : `pnpm test` → rouge.
- [ ] **Step 3** : stockage et modèle. Dans `voyage.js`, `changer(id, dansLeSac)` calcule
  `achetes = achetesApresSac(objet, dansLeSac)`, le montre (`avecObjet`) et l'écrit ; dans
  `ajustements.js`, `regler` calcule `achetesApresQuantite(objet, quantite)` de même.
- [ ] **Step 4** : `pnpm test` vert, puis `node tests/ecran-voyage-gestes.mjs`,
  `node tests/ecran-voyage-fiche.mjs`, `node tests/ecran-voyage-ajuster.mjs` verts (aucun changement
  visible attendu).
- [ ] **Step 5** : `git commit -m "feat(stockage): achats en pièces ; sac plein = acheté"`

### Task 4 : La marque « à acheter » dans la liste du voyage

**Files :**
- Create : `src/styles/courses.css` (importé dans `src/main.js` après `ajustements.css` ; `.pastille-achat`
  et le reste des styles de la phase, repris de `docs/maquettes/courses/maquette.css` sans la liste des
  états), `tests/ecran-voyage-courses.mjs`
- Modify : `src/ecrans/voyage-vues.js` (puce dans `vueOutils`, pastille dans `vueObjet` et dans le nom
  accessible de la ligne), `src/ecrans/fiche.js` (ligne « À acheter » dans « Ajuster cet objet »),
  `src/ecrans/voyage.js` (relier la fiche), `src/ecrans/ajustements.js` (geste `basculerAAcheter(id)`),
  `src/ecrans/icones.js` (`courses`), `src/i18n/fr.json`

**Interfaces :**
- Consumes : tâches 1 et 3.
- Produces :
  - puce `<a class="puce" href="#/voyage/{id}/courses" data-action="courses">` ; textes `voyage.courses`
    (« Courses ») et `voyage.coursesCompte` (« Courses · {n} »)
  - `ouvrirFiche({ …, surAAcheter })` : `surAAcheter()` appelé à chaque appui sur l'interrupteur
    (`data-fiche="a-acheter"`, `role="switch"`, `aria-checked` = `estAAcheter(objet)`)
  - `gestesDAjustement(…).basculerAAcheter(id)` : `basculerAAcheter(objet)` du modèle, montré puis écrit
    par `reglerAchats` dans la file (`ecran.appliquer`) ; aucun bandeau (choix de la spec)
  - textes : `voyage.aAcheter` « à acheter », `voyage.encoreAAcheter` « encore {n} à acheter »,
    `fiche.aAcheter` « À acheter », `fiche.aAcheterAide` « apparaît dans les Courses »,
    `fiche.achetesSur` (`one` « {n} acheté sur {total} », `other` « {n} achetés sur {total} »)

- [ ] **Step 1 : test rouge** `tests/ecran-voyage-courses.mjs` (sur le modèle de
  `tests/ecran-voyage-ajuster.mjs`, données de `tests/outils/voyage-essai.mjs` où deux objets sont
  marqués, l'un avec 6 / 16 achetés) : la puce dit « Courses · 2 » et mène à `#/voyage/v1/courses` ;
  pastilles « à acheter » et « encore 10 à acheter » avec leur icône ; aucune sur un objet non marqué ;
  sans objet marqué, la puce dit « Courses » ; l'interrupteur éteint retire la pastille et le reste à la
  relecture ; rallumé sur un objet tout acheté, il revient à « à acheter » ; « Tout dans le sac » sur un
  objet marqué fait disparaître sa pastille, et « Vider » ne la ramène pas ; quantité augmentée de 2 sur
  un objet tout acheté → « encore 2 à acheter » ; captures claire et sombre de la liste et de la fiche
  aux formats de `TOUS_FORMATS`, regardées à 393 × 873, 800 × 1280, 1280 × 800 et 1920 × 1080.
- [ ] **Step 2** : `node tests/ecran-voyage-courses.mjs` → rouge.
- [ ] **Step 3** : vues, fiche, geste, textes, styles.
- [ ] **Step 4** : le test vert, puis `pnpm test:ecrans` vert (tests instables : rejoués seuls, cf.
  mémoire du chef de projet).
- [ ] **Step 5** : `git commit -m "feat(voyage): pastille et interrupteur « à acheter », puce Courses"`

### Task 5 : L'écran Courses

**Files :**
- Create : `src/ecrans/courses.js` (`ecranCourses` : `{ nom: 'courses', charger, dessiner }`, gestes et
  file d'écriture), `src/ecrans/courses-vues.js` (HTML), `tests/ecran-courses.mjs`
- Modify : `src/main.js` (route `/^#\/voyage\/([\w%-]+)\/courses$/` → `ecranCourses`), `src/ecrans/annulation.js`
  (`montrerAnnulation({ …, icone = 'supprimer' })`), `src/ecrans/voyage.js` (écoute de `achat-retabli`),
  `src/styles/courses.css`, `src/i18n/fr.json`

**Interfaces :**
- Consumes : tâches 1, 3, 4 (`icones.courses`, styles).
- Produces :
  - `vueCourses(contexte, { contenu, liste, retenus, grandFormat, troisColonnes }) → { classe, colonnes, html }`
    — même forme que `vueVoyage`, posée par `suivreDisposition` ; cases `data-action="case-achat"`,
    lignes `data-action="fiche-achat"`, `data-id` = id de l'objet
  - événement `window` `achat-retabli` `{ detail: { voyageId, objetId } }`, envoyé après l'écriture de
    « Annuler » ; l'écran Courses et l'écran du voyage relisent alors l'objet (`lireVoyage`) et le montrent
  - textes `courses.*` : `titre` « Courses », `compte` (`one`/`other` « {n} objet(s) à acheter »),
    `case.cocher` « {nom} : pas encore acheté. Cocher », `case.ajouter`
    « {nom} : {n} sur {total} achetés. Ajouter une pièce », `ouvrirFiche` « {nom}, {quantite}. Ouvrir la fiche »,
    `vide.rien.titre/texte`, `vide.faites.titre/texte`, `retourVoyage` « Retour au voyage »,
    `erreurEnregistrement` « L’achat n’a pas pu être enregistré. Réessayez. » ; `annulation.achete`
    (`one` « {nom} : acheté », `other` « {nom} : achetés ({n}) »), `annulation.plusAAcheter`
    « {nom} : plus à acheter »

- [ ] **Step 1 : test rouge** `tests/ecran-courses.mjs` : arrivée par la puce ; titre, « 2 objets à
  acheter », cartes dans l'ordre du voyage, objets par nom, quantité ou « 6 / 16 » ; la case ajoute une
  pièce (écrite, relue) ; la dernière pièce : case pleine pendant ~1 s puis l'objet part et le bandeau
  au chariot dit « Café : acheté » ; un appui pendant cette seconde ne change rien ; « Annuler » le rend
  avec son ancien compte ; « Annuler » touché après le lien retour au voyage : la pastille réapparaît sur la ligne (Review Focus 3) ; panne `'reglerAchats'` → message au bas, compte
  d'avant relu (Review Focus 2) ; voyage sans marque → « Rien à acheter » ; tout acheté → « Courses
  faites ! » ; « Retour au voyage » et le retour système ramènent au voyage ; voyage inconnu → écran
  « Voyage introuvable » de l'écran du voyage (`vueIntrouvable`) ; nom piégé lu tel quel ; grand format :
  2 colonnes à 1280 × 800, 3 à 1920 × 1080 ; captures claire et sombre de chaque état aux quatre formats.
- [ ] **Step 2** : `node tests/ecran-courses.mjs` → rouge.
- [ ] **Step 3** : l'écran. File d'écriture à une écriture à la fois, comme `voyage.js` (`appliquer`) ;
  échec → relecture et `vueAlerte` ; répit de 1 s par objet (`retenus`), puis bandeau
  `montrerAnnulation({ icone: 'courses', … })` dont `annuler()` écrit `reglerAchats(id, aAcheter,
  achetesAvant, modifieLe)` puis envoie `achat-retabli`.
- [ ] **Step 4** : le test vert, puis `pnpm test:ecrans`.
- [ ] **Step 5** : `git commit -m "feat(courses): écran Courses"`

### Task 6 : La fiche d'achat

**Files :**
- Create : `src/ecrans/fiche-achat.js` (`ouvrirFicheAchat`), `tests/ecran-courses-fiche.mjs`
- Modify : `src/ecrans/courses.js`, `src/i18n/fr.json`

**Interfaces :**
- Consumes : tâche 5 (file d'écriture, répit, bandeau), `vueFenetre`/`ouvrirFenetre`.
- Produces : `ouvrirFicheAchat({ t, objet, categorie, surAchetes(n), surAAcheter(), surFermeture, signal, dans }) → repeindre(objet)`
  — même mécanique que `ouvrirFiche` (`src/ecrans/fiche.js`) : panneau du bas au téléphone, fenêtre
  centrée ailleurs, titre au focus, retour système qui la ferme. Textes `achat.titre` « Acheté »,
  `achat.sur` « sur {total} », `achat.moins`, `achat.plus`, `achat.tout` « Tout acheté »,
  `achat.aAcheterAide` « l’éteindre retire l’objet des Courses ».

- [ ] **Step 1 : test rouge** `tests/ecran-courses-fiche.mjs` : la ligne ouvre la fiche (nom en titre,
  catégorie dessous, « 6 sur 16 ») ; + et − écrivent ; − inactif à 0 ; « Tout acheté » ferme la fiche,
  l'objet part après ~1 s avec le bandeau « Repas : achetés (16) » ; + jusqu'à la quantité fait de même ;
  l'interrupteur éteint ferme la fiche, l'objet part avec « Pain : plus à acheter », « Annuler » le remet
  marqué ; retour système ferme la fiche sans rien écrire ; nom piégé lu tel quel ; captures claire et
  sombre au téléphone et à 1280 × 800.
- [ ] **Step 2** : rouge.
- [ ] **Step 3** : la fiche, branchée sur les gestes de l'écran Courses.
- [ ] **Step 4** : vert, puis `pnpm verif` complet vert.
- [ ] **Step 5** : `git commit -m "feat(courses): fiche d'achat"`

### Task 7 : Vérification finale

- [ ] **Step 1** : `pnpm verif` vert ; regarder soi-même les captures des tâches 4 à 6 aux quatre formats,
  clair et sombre, et les comparer à la maquette.
- [ ] **Step 2** : essai sur l'appli de bureau (`pnpm tauri dev`) avec une base existante d'avant la phase
  (migration 005) : un voyage créé avant la phase montre ses consommables à acheter.
- [ ] **Step 3** : ne pas cocher les critères du PLAN avant la validation du chef de projet.
