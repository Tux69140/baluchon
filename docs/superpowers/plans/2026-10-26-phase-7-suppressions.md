# Phase 7 — Suppressions sûres dans la bibliothèque : plan de réalisation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal :** on supprime une catégorie, un objet, un groupe ou une étiquette de la bibliothèque après une question qui chiffre la conséquence ; une suppression qui rendrait un objet ou une catégorie orphelin est refusée par une fenêtre qui mène à chacun d'eux ; un bandeau « Annuler » de 10 s, qui suit d'un écran à l'autre, rétablit tout à l'identique. Les voyages existants ne bougent jamais.

**Architecture :** la base reçoit trois écritures (supprimer une catégorie avec ses objets, supprimer un objet, rétablir un extrait de bibliothèque), sans migration. Le modèle calcule, en un seul endroit, ce qu'une suppression emporte, qui elle rendrait orphelin, et l'extrait à garder pour l'annuler (`src/modele/suppressions.js`). Côté écrans : une orchestration commune (`suppression.js` : relire, chiffrer ou refuser, écrire, montrer le bandeau), la fenêtre de refus (`refus-suppression.js`), le bandeau (`annulation.js`, posé hors des écrans pour survivre aux changements d'écran), et l'ouverture des fiches de catégorie et d'objet sortie de `bibliotheque.js` (`edition-modeles.js`) pour servir aussi depuis la fenêtre de refus de l'écran Étiquettes.

**Tech Stack :** Tauri 2, JavaScript simple, Vite 6, rusqlite 0.32, Playwright 1.62 (dont `page.clock`), `node --test`, Phosphor 2.1.1.

**Spec :** `docs/superpowers/specs/2026-10-26-phase-7-suppressions-design.md` (décisions, choix de l'agent, section « Maquettes validées »), `docs/PLAN.md` phase 7, `docs/PRD.md` (US-7 ; « Écrans et gestes », puces « Toute suppression » et « Suppressions dans la bibliothèque »), maquette validée `docs/maquettes/suppressions/` (`python3 -m http.server 8646 --bind 127.0.0.1` à la racine, puis `/docs/maquettes/suppressions/?etat=…`). **La maquette fait foi pour l'aspect, les textes et les gestes** : `bandeau.js` et `bandeau.css` (bandeau), `refus.js` et `maquette.css` (fenêtre de refus), `textes.js` (toutes les phrases), `donnees.js` (`consequences`, la règle), `gestes.mjs` (le parcours attendu).

## Global Constraints

- Lire `AGENTS.md` et `CLAUDE.md` : français partout, commentaires qui disent le *pourquoi*, TDD (garder la sortie rouge dans le rapport), fichiers de 500 lignes au plus, un nom n'est exporté que s'il est importé ailleurs, aucun texte d'interface hors de `src/i18n/fr.json`.
- Couches : un écran n'importe que `src/stockage/index.js` côté stockage ; le modèle n'importe que le modèle ; seul le stockage touche `localStorage` ou Tauri. La règle des orphelins et le chiffrage vivent dans le modèle ; la base ne refuse pas un orphelin (le modèle le fait avant d'écrire).
- pnpm uniquement ; `pnpm exec prettier --write <fichiers>` après chaque écriture ; `cargo fmt` pour le Rust.
- **Commits** autorisés sur la branche `phase-7` ; fichiers nommés (`git add <chemins>`, vérifier `git diff --cached --name-only`), message `type(portée): message` en français ; ne jamais ajouter `CLAUDE.md` (modifié par une autre session). Jamais de push. **Aucune migration** : le schéma ne change pas (le dire dans les messages des commits de la base).
- **Rien des phases suivantes** : ni filtre « Jamais proposés » (retiré du projet), ni retrait d'un objet d'un voyage (phase 8), ni suppression d'un voyage (phase 11), ni corbeille.
- **Cible** d'une suppression : `{ type: 'categorie' | 'objet' | 'etiquette' | 'groupe', id }`.
- **Orphelin** : une catégorie ou un objet modèle **non** « toujours inclus(e) », qui porte au moins une étiquette, et dont **toutes** les étiquettes seraient supprimées. Il bloque la suppression. Un élément qui garde au moins une étiquette, ou qui est « toujours inclus(e) », la **perd** seulement. Un élément déjà sans étiquette (reste de la phase 6) ne bloque rien. Chaque élément compte une fois, même s'il porte plusieurs étiquettes d'un groupe supprimé.
- **Supprimer** une catégorie supprime ses objets ; un groupe, ses étiquettes ; une étiquette, ses liens. Rien d'autre ne change (pas de renumérotation des rangs, `modifieLe` des survivants inchangé). Aucune écriture ne touche une table du voyage.
- **Annuler** rétablit à l'identique : mêmes identifiants, mêmes rangs, mêmes champs (dont `modifieLe`), mêmes liens **dans le même ordre**. Une seule transaction.
- **Bandeau** : 10 000 ms ; une nouvelle suppression le remplace (la précédente devient définitive) ; toute autre écriture dans la bibliothèque le retire (suppression définitive) ; changer d'écran ne le retire pas ; fermer l'appli rend la suppression définitive (rien à faire : elle est déjà écrite).
- **Typographie des nouveaux textes** : espace insécable (U+00A0) après « et avant », et avant `: ; ? !` (« Plage » ne se coupe plus). Les textes existants des phases précédentes ne changent pas, sauf ceux que la tâche 6 remplace.
- Panne d'écriture : message en haut (`alerterEnHaut`), 6 s ; rien ne change à l'écran ni dans la base ; aucun bandeau.
- Tests d'écran jugés au code de sortie, jamais de pause fixe (le temps du bandeau se mesure avec `page.clock`) ; formats : `TOUS_FORMATS` de `tests/outils/bibliotheque.mjs` ; une capture claire et une sombre par écran touché dans `captures-travail/`.

## Review Focus

1. Noms avec `<`, `&`, `"` (catégorie, objet, étiquette, groupe) : rendus en texte dans la question chiffrée, les lignes du refus, le titre « Plus rien ne bloque » et le bandeau ; seul le nombre est en gras (tâches 4, 5, 6).
2. Appuis répétés : double appui sur « Supprimer » de la question, ou sur « Annuler » du bandeau : une seule écriture, un seul rétablissement (bouton inactif pendant l'écriture) (tâches 4 et 5).
3. Pannes : panne à la suppression → la fiche reste ouverte, rien n'a changé, pas de bandeau ; panne au rétablissement → le bandeau reste jusqu'au bout de ses 10 s avec le message « L'annulation n'a pas pu être enregistrée… », un nouvel essai réussit (tâches 4 et 5).
4. Supprimer la catégorie choisie en deux panneaux, puis la dernière catégorie qui reste : l'écran choisit la première restante, puis montre une bibliothèque vide (« 0 catégorie · 0 objet », « Nouvelle catégorie ») sans erreur, aux deux dispositions ; « Annuler » rend la catégorie, choisie et éclairée (tâche 5).
5. Bandeau pendant qu'une fenêtre s'ouvre ou se ferme (fiche, question, refus, Nouveau voyage sur tablette) : il passe dans la fenêtre du dessus, « Annuler » répond au doigt, puis revient en bas à la fermeture, sans que ses 10 s repartent de zéro ; au téléphone, il ne couvre jamais les boutons collés en bas de l'assistant (tâche 5).

## Ordre et parallélisme

1 (base et stockage), 2 (modèle) et 3 (textes et icône) en parallèle : aucun fichier commun. 4 après 1, 2 et 3. 5 après 4. 6 après 5. 7 après 6. 8 en dernier.

---

### Task 1: Supprimer et rétablir dans la base et le stockage

**Files:**
- Create: `src-tauri/src/suppressions.rs`
- Modify: `src-tauri/src/edition.rs` (sortir l'écriture d'une catégorie et d'un objet dans une transaction donnée), `src-tauri/src/etiquettes.rs` (idem pour un groupe et une étiquette ; `supprimer_ligne` en `pub(crate)`), `src-tauri/src/lib.rs`, `src/stockage/tauri.js`, `src/stockage/navigateur.js`, `tests/stockage-navigateur.test.js`

**Interfaces:**
- Produces (Rust, `pub(crate)`, sur `&rusqlite::Transaction`) : `ecrire_categorie(tx, &CategorieModele)`, `ecrire_objet(tx, &ObjetModele)`, `ecrire_groupe(tx, &GroupeEtiquettes)`, `ecrire_etiquette(tx, &Etiquette)` — le corps actuel des `enregistrer_*` (insertion, ou mise à jour qui garde rang, groupe et catégorie ; liens effacés puis réécrits dans l'ordre reçu) ; les `enregistrer_*` deviennent transaction + appel + commit, sans changement de comportement.
- Produces (Rust, `impl Base`, dans `suppressions.rs`) :
  - `supprimer_categorie(&self, id: &str) -> Result<(), String>` : supprime ses objets (`objet_modele.categorie_id` n'a pas de `ON DELETE CASCADE`) puis la catégorie ; liens partis par cascade ; id inconnu refusé ;
  - `supprimer_objet(&self, id: &str) -> Result<(), String>` : id inconnu refusé ;
  - `retablir_bibliotheque(&self, extrait: &Bibliotheque) -> Result<(), String>` : une transaction ; groupes, puis étiquettes, puis catégories, puis objets, chacun par `ecrire_*` ; un lien vers une étiquette absente ou un objet d'une catégorie absente fait tout refuser.
- Produces (commandes Tauri `supprimer_categorie`, `supprimer_objet`, `retablir_bibliotheque` ; stockage JS, mêmes refus des deux côtés) : `supprimerCategorie(id)`, `supprimerObjet(id)`, `retablirBibliotheque(extrait)` où `extrait` a la forme de `lireBibliotheque()` (`{ groupes, etiquettes, categories, objets }`). Pannes et lenteurs simulées du stockage navigateur sous ces trois noms. Contrat `tests/contrat/stockage.json` inchangé.

- [ ] **Step 1: Tests Rust qui échouent** (dans `suppressions.rs`, base jetable et contrat installé, comme `etiquettes.rs`) :
  - `supprimer_une_categorie_supprime_ses_objets_et_leurs_liens` (plus aucune ligne de `objet_modele_etiquette` pour eux ; les autres catégories gardent leurs rangs) ;
  - `supprimer_un_objet_ne_touche_que_lui` ;
  - `supprimer_un_inconnu_est_refuse` (catégorie et objet) ;
  - `retablir_une_categorie_rend_la_bibliotheque_identique` (`lire_bibliotheque()` avant suppression == après rétablissement de l'extrait {catégorie + ses objets}) ;
  - `retablir_une_etiquette_rend_ses_liens_dans_leur_ordre` (un objet lié à [A, B] ; supprimer A ; rétablir {A, l'objet tel qu'avant} ; il relit [A, B], pas [B, A]) ;
  - `retablir_un_groupe_rend_ses_etiquettes_et_leurs_liens` ;
  - `retablir_refuse_un_lien_vers_une_etiquette_absente_sans_rien_ecrire` ;
  - `supprimer_ou_retablir_ne_touche_pas_un_voyage` (un voyage créé avant est relu identique).
- [ ] **Step 2:** `pnpm test:base` → les nouveaux tests échouent (fonctions absentes).
- [ ] **Step 3:** extraire les quatre `ecrire_*`, écrire `suppressions.rs`, déclarer le module et les trois commandes dans `lib.rs` (comme `supprimer_etiquette`).
- [ ] **Step 4:** `pnpm test:base` → tout vert, anciens tests compris ; `cargo fmt`.
- [ ] **Step 5: Tests JS qui échouent** dans `tests/stockage-navigateur.test.js`, mêmes cas que l'étape 1 (sans le voyage), plus `une panne simulée de supprimerCategorie ne change rien`.
- [ ] **Step 6:** écrire les trois fonctions dans `navigateur.js` (résultat entier calculé avant d'écrire ; rétablir = `remplacerOuAjouter` de chaque ligne avec **tous** ses champs, puis `verifierEtiquettes` et vérification des catégories des objets) et dans `tauri.js`. `pnpm test` → vert.
- [ ] **Step 7: Commit** `feat(base): supprimer une catégorie ou un objet modèle, et rétablir un extrait de bibliothèque (sans migration)`.

### Task 2: Ce qu'emporte une suppression (modèle)

**Files:**
- Create: `src/modele/suppressions.js`, `tests/suppressions.test.js`

**Interfaces:**
- Consumes : la bibliothèque telle que `lireBibliotheque()` la rend (étiquettes des modèles = ids, dans l'ordre ; `toujoursIncluse` / `toujoursInclus`).
- Produces :
  - `consequences(bibliotheque, cible, langue) -> { objets: ObjetModele[], etiquettes: Etiquette[], perdent: { categories, objets }, bloquent: { categories, objets } }` — `objets` : ceux supprimés avec une catégorie ; `etiquettes` : celles supprimées (une, ou celles du groupe par rang) ; `perdent` / `bloquent` : selon la règle des Global Constraints ; catégories par rang, objets par rang de leur catégorie puis par nom (`localeCompare(langue)`). Pour une catégorie ou un objet, `perdent` et `bloquent` sont vides.
  - `estBloquee(consequences) -> boolean`.
  - `extraitAvant(bibliotheque, cible) -> { groupes, etiquettes, categories, objets }` : les lignes entières, telles qu'avant, de tout ce que la suppression enlève **ou modifie** (catégorie + ses objets ; l'objet ; l'étiquette + les modèles qui la portent ; le groupe + ses étiquettes + les modèles qui en portent une).

- [ ] **Step 1: Tests qui échouent** (`tests/suppressions.test.js`, bibliothèque construite à la main sur le modèle de `docs/maquettes/suppressions/donnees.js` : groupes Activités [Randonnée, Camping, Plage], Climat [Chaud, Froid, Pluie], Hébergement [Hôtel, Tente, Chez l'habitant] ; Vêtements toujours incluse avec Maillot de bain [Plage], Tongs [Plage], Doudoune [Froid], Bonnet [Froid], Cape de pluie [Pluie] ; Toilette avec Crème solaire [Plage, Chaud] ; Baignade [Plage] avec 3 objets toujours inclus ; Camping [Camping, Tente] avec 3 objets) :
  - `une catégorie emporte ses objets` (Camping → 3 objets, rien de bloqué) ;
  - `Chaud : 1 objet la perd, rien ne bloque` (Crème solaire dans `perdent.objets`) ;
  - `Hôtel : personne ne la porte` (tout vide) ;
  - `Plage : Baignade, Maillot de bain et Tongs bloquent, Crème solaire perd` (ordre exact : catégories puis objets) ;
  - `groupe Climat : Bonnet, Cape de pluie, Doudoune bloquent ; Crème solaire perd une fois` ;
  - `groupe Hébergement : Camping perd, rien ne bloque` ;
  - `un modèle toujours inclus qui porte l'étiquette la perd sans bloquer` ;
  - `un modèle déjà sans étiquette ne bloque rien` ;
  - `l'extrait d'une étiquette garde les modèles tels qu'avant, liens dans l'ordre` (Crème solaire : [Plage, Chaud]) ;
  - `l'extrait d'une catégorie contient ses objets ; celui d'un groupe ses étiquettes`.
- [ ] **Step 2:** `node --test tests/suppressions.test.js` → échec (module absent).
- [ ] **Step 3:** écrire `src/modele/suppressions.js` (sans import hors du modèle ; `parOrdre` de `inclusion.js`).
- [ ] **Step 4:** test vert ; `pnpm controles` vert (exports, couches).
- [ ] **Step 5: Commit** `feat(modele): ce qu'emporte une suppression, qui elle rendrait orphelin, et de quoi l'annuler`.

### Task 3: Textes et icône

**Files:**
- Modify: `src/i18n/fr.json`, `src/ecrans/icones.js`
- Create: `tests/textes-suppressions.test.js`

**Interfaces:**
- Produces (clés de `fr.json`, textes copiés de `docs/maquettes/suppressions/textes.js` et `refus.js`, avec les espaces insécables des Global Constraints ; `{compte}` reçoit un texte déjà mis en gras par l'écran) :
  - `suppression.voyages` « Les voyages déjà créés ne changent pas. » ; `suppression.objetTitre`, `suppression.objetTexte` ; `suppression.categorieTitre`, `suppression.categorieObjets` {one « Son {compte} sera supprimé aussi. », other « Ses {compte} seront supprimés aussi. »}, `suppression.categorieTexte` « Elle ne sera plus proposée dans « Nouveau voyage ». » ; `suppression.etiquetteSuite` « Elle ne sera plus proposée dans « Nouveau voyage ». » ; `suppression.groupeEtiquettes` {one, other} (« Son étiquette {etiquettes} sera supprimée aussi, et son étape disparaîtra de « Nouveau voyage ». ») ;
  - `suppression.objets` et `suppression.categories` {one « {n} objet », other « {n} objets »} ;
  - `suppression.perteEtiquette` {objet « {compte} perdra cette étiquette ; il garde ses autres étiquettes. », categorie « … ; elle garde ses autres étiquettes. », plusieurs « {compte} perdront cette étiquette ; ils gardent leurs autres étiquettes. »} ; `suppression.perteGroupe` {objet « {compte} perdra une de ses étiquettes ; il garde les autres. », categorie « … ; elle garde les autres. », plusieurs « {compte} perdront une de leurs étiquettes ; ils gardent les autres. »} ;
  - `refus.titre` « Impossible de supprimer « {nom} » pour l’instant », `refus.etiquette` et `refus.groupe` {one, other} (les deux phrases de `textes.js`), `refus.reste` « {n} à régler », `refus.categorie` {one, other} « Catégorie · {n} objet(s) », `refus.objet` « Objet · dans « {categorie} » », `refus.libre` « Plus rien ne bloque : vous pouvez supprimer « {nom} ». », `refus.regle` « {noms} : réglé. Il en reste {n}. », `refus.toutRegle` « Tout est réglé. », `refus.fermer` « Fermer » ;
  - `annulation.objet`, `annulation.categorie` {one, other}, `annulation.categorieVide`, `annulation.etiquette`, `annulation.groupe` {one, other}, `annulation.groupeVide` (textes de `bandeau()` dans `textes.js`), `annulation.annuler` « Annuler », `annulation.erreur` « L’annulation n’a pas pu être enregistrée. Réessayez avant la fin du bandeau. » ;
  - `modele.categorie.supprimer` « Supprimer la catégorie », `modele.objet.supprimer` « Supprimer l’objet ».
- Produces (icône) : `iconeInterface('annuler')` = Phosphor Bold `arrow-counter-clockwise`.

- [ ] **Step 1: Test qui échoue** `tests/textes-suppressions.test.js` (même forme que `textes-etiquettes.test.js`) : chaque clé existe et est un texte ou un pluriel ; `aucun espace ordinaire autour des guillemets ni devant : ; ? !` sur toutes ces clés ; `les phrases de la maquette sont reprises` (comparer, après `remplir`, aux phrases de `docs/maquettes/suppressions/gestes.mjs` : « Ses 3 objets seront supprimés aussi », « 1 objet perdra cette étiquette », « 1 objet et 1 catégorie perdront cette étiquette »).
- [ ] **Step 2:** `node --test tests/textes-suppressions.test.js` → échec.
- [ ] **Step 3:** ajouter les clés et l'icône (import `?raw` comme les autres).
- [ ] **Step 4:** tests verts ; `pnpm controles` vert.
- [ ] **Step 5: Commit** `feat(textes): textes des suppressions sûres et icône d'annulation`.

### Task 4: Supprimer une catégorie ou un objet, avec la question chiffrée

**Files:**
- Create: `src/ecrans/edition-modeles.js`, `src/ecrans/suppression.js`, `src/ecrans/suppression-textes.js`, `tests/ecran-suppressions-modeles.mjs`
- Modify: `src/ecrans/bibliotheque.js` (ses fonctions `ouvrirCategorie` / `ouvrirObjet` partent dans `edition-modeles.js`), `src/ecrans/fiche-categorie.js`, `src/ecrans/fiche-objet.js`, `src/ecrans/fiche-modele-vues.js` (la zone « Supprimer » de `fiche-etiquette.js` y devient `zoneSuppression(texte)`), `src/ecrans/fiche-etiquette.js` (l'importe)

**Interfaces:**
- Consumes : tâches 1 à 3.
- Produces :
  - `zoneSuppression(texte) -> html` (fiche-modele-vues.js) : le bouton rouge `[data-supprimer]` sous un trait ; `ouvrirFicheCategorie` / `ouvrirFicheObjet` reçoivent `supprimer` (absent pour un élément neuf) et le passent à `ouvrirFicheModele`.
  - `editerCategorie({ t, langue, stockage, bibliotheque, categorie, nombreObjets, signal, dans, surFermeture, apresEcriture }) -> Promise<void>` et `editerObjet({ …, objet, categorie })` (edition-modeles.js) : ouvrent la fiche, gardent l'id stable d'un élément neuf, enregistrent (`preparerCategorie` / `preparerObjet` puis stockage), suppriment par `supprimerDeLaBibliotheque`, puis appellent `apresEcriture({ cible, neuve, supprimee })` ; la promesse se résout à la fermeture de la fiche (la fenêtre de refus de la tâche 6 l'attend). `bibliotheque.js` s'en sert pour toutes ses fiches.
  - `supprimerDeLaBibliotheque({ t, langue, stockage, cible, signal, dans, ouvrirFiche }) -> Promise<boolean>` (suppression.js) : relit la bibliothèque, calcule `consequences`, pose la question chiffrée (`demander`, « Garder » puis « Supprimer » `danger`), garde `extraitAvant`, écrit (`supprimerCategorie` / `supprimerObjet` / `supprimerEtiquette` / `supprimerGroupe`), rend true ; « Garder » rend false ; une panne lève (la fiche montre `suppression.erreur`). Le refus (bloquée) arrive à la tâche 6 ; le bandeau à la tâche 5.
  - `question(t, langue, cible, nom, consequences) -> { titre, texte }` (suppression-textes.js, `texte` en HTML : tout échappé, seul `{compte}` en `<b>`) ; `texteBandeau(t, langue, cible, nom, consequences) -> string` (utilisé à la tâche 5).

- [ ] **Step 1: Test d'écran qui échoue** `tests/ecran-suppressions-modeles.mjs` (bibliothèque de départ du stockage navigateur, téléphone 360 × 640 puis tablette en paysage) :
  - « Supprimer la catégorie » absent d'une fiche neuve, présent sous un trait dans une fiche existante ;
  - catégorie Camping : `#suppression-texte` dit « Ses 3 objets seront supprimés aussi. Elle ne sera plus proposée dans « Nouveau voyage ». Les voyages déjà créés ne changent pas. », « 3 objets » en gras ; « Garder » ne change rien ; « Supprimer » ferme fiche et question, Camping et ses objets ont quitté l'écran **et** le stockage ;
  - objet : question « Supprimer l’objet « … » ? » ; supprimé, il quitte sa catégorie ;
  - panne `supprimerObjet` : la fiche reste ouverte, message `suppression.erreur` en haut, stockage inchangé ;
  - catégorie choisie en deux panneaux supprimée : la première restante est choisie ; dernière catégorie supprimée : « 0 catégorie · 0 objet » et « Nouvelle catégorie », aux deux dispositions (Review Focus 4) ;
  - nom `Sacs <&">` : la question l'affiche tel quel (Review Focus 1) ; double appui sur « Supprimer » : une seule écriture (lenteur `supprimerObjet`, Review Focus 2).
- [ ] **Step 2:** `node tests/ecran-suppressions-modeles.mjs` → échec.
- [ ] **Step 3:** écrire `suppression-textes.js`, `suppression.js`, `edition-modeles.js`, `zoneSuppression` ; brancher les fiches et `bibliotheque.js` (après suppression : relire ; la catégorie choisie disparue → la première).
- [ ] **Step 4:** test vert ; `pnpm test:ecrans` sur `ecran-bibliotheque*.mjs` et `ecran-etiquettes*.mjs` vert (rien de cassé) ; captures clair/sombre de la fiche et de la question.
- [ ] **Step 5: Commit** `feat(bibliotheque): supprimer une catégorie ou un objet après une question chiffrée`.

### Task 5: Bandeau « Annuler »

**Files:**
- Create: `src/ecrans/annulation.js`, `src/styles/annulation.css`, `tests/ecran-annulation.mjs`
- Modify: `src/main.js` (feuille, `surveillerEcritures`), `src/styles/jetons.css` (`--action-inverse: light-dark(#6ec083, #007232)`), `src/styles/socle.css` et `src/styles/voyage-panneaux.css` / `bibliotheque.css` (place gardée), `src/ecrans/suppression.js`, `src/ecrans/bibliotheque.js`, `src/ecrans/etiquettes.js`

**Interfaces:**
- Consumes : `supprimerDeLaBibliotheque`, `texteBandeau`, `retablirBibliotheque`, `extraitAvant`.
- Produces (annulation.js) :
  - `montrerAnnulation({ t, app, texte, annuler })` : un seul bandeau à la fois (le précédent part, sa suppression devient définitive) ; `annuler()` rend une promesse ; tant qu'elle court, le bouton est inactif ; réussie, le bandeau part ; refusée, le bandeau reste jusqu'au bout de ses 10 s et `alerterEnHaut(app, t('annulation.erreur'), …)` ;
  - `retirerAnnulation()` ;
  - `surveillerEcritures(stockage) -> stockage` : même forme ; chaque écriture de la bibliothèque (`enregistrerCategorie`, `enregistrerObjet`, `rangerCategories`, `enregistrerGroupe`, `enregistrerEtiquette`, `rangerGroupes`, `rangerEtiquettes`, les quatre `supprimer*`) appelle d'abord `retirerAnnulation()` ; `retablirBibliotheque` et les écritures du voyage non. `main.js` l'applique au stockage ouvert.
  - Après un rétablissement réussi : `window.dispatchEvent(new CustomEvent('bibliotheque-retablie', { detail: { cible, categorieId } }))` ; la Bibliothèque (catégorie choisie et dépliée, élément éclairé) et les Étiquettes relisent et éclairent ; les autres écrans l'ignorent.
- Aspect et place : ceux de `docs/maquettes/suppressions/bandeau.css` et `bandeau.js` (élément `popover="manual"`, `role="status"`, 56 px, 440 px au plus, entrée de 200 ms sans mouvement si l'appareil en demande moins). Hors fenêtre : en bas à droite, au-dessus du plus haut de `.bouton-flottant, .assistant-pied` présents (8 px d'écart), sinon à 16 px du bas ; fenêtre modale ouverte : rangé **dans** `dialog:modal:not([data-fermeture])` du dessus, en haut, centré ; replacé à chaque ouverture ou fermeture de fenêtre (MutationObserver sur `document.body`, `childList` et attribut `open`), sans relancer son minuteur ni son entrée. Place gardée : le bas de `.ecran` (+ 80 px), de `.ecran-avec-flottant` (+ 72 px) et de chaque `.panneau` (+ 80 px), comme `maquette.css`.

- [ ] **Step 1: Test d'écran qui échoue** `tests/ecran-annulation.mjs` (`page.clock.install()` avant le chargement) :
  - supprimer un objet → bandeau « Objet « … » supprimé » ; « Annuler » → l'objet revient, éclairé, et le stockage est identique à avant (comparaison profonde) ;
  - catégorie supprimée puis annulée : ses objets et leurs liens reviennent, au même rang ;
  - le bandeau suit : supprimer, menu → Mes voyages, puis ouvrir un voyage : toujours là ; à 9 s il est là, à 10,1 s parti (Review Focus 5) ;
  - une seconde suppression remplace le bandeau ; « Annuler » ne rend que la seconde ;
  - une autre écriture (enregistrer une fiche) retire le bandeau ;
  - bandeau pendant une fiche ouverte : dans la fenêtre, en haut, « Annuler » touchable ; fenêtre fermée : de retour en bas (Review Focus 5) ;
  - au téléphone, sur l'accueil et la Bibliothèque : il ne recouvre pas le bouton flottant ; sur « Nouveau voyage » au téléphone : il ne recouvre pas « Précédent » / « Suivant » ; en fin de liste défilée, la dernière ligne reste au-dessus de lui ;
  - panne `retablirBibliotheque` : le bandeau reste, message d'erreur ; second appui après fin de panne : rétabli ; double appui rapide sur « Annuler » : un seul rétablissement (Review Focus 2 et 3) ;
  - nom `Sacs <&">` affiché tel quel (Review Focus 1) ;
  - cibles de 44 px, texte ≥ 13 px, aucun défilement de côté, à tous les formats, clair et sombre.
- [ ] **Step 2:** `node tests/ecran-annulation.mjs` → échec.
- [ ] **Step 3:** écrire `annulation.js`, `annulation.css`, la place gardée, `surveillerEcritures` dans `main.js` ; dans `suppression.js`, après l'écriture : `montrerAnnulation` avec `texteBandeau` et `annuler: () => stockage.retablirBibliotheque(extrait)` puis l'événement ; écouter l'événement dans `bibliotheque.js` et `etiquettes.js` (avec `fin.signal`).
- [ ] **Step 4:** test vert ; `pnpm test:ecrans` vert ; captures clair/sombre du bandeau sur l'accueil, la Bibliothèque, un voyage, « Nouveau voyage » et par-dessus une fiche.
- [ ] **Step 5: Commit** `feat(ecrans): bandeau « Annuler » de 10 s qui suit d'un écran à l'autre`.

### Task 6: Étiquettes et groupes : chiffrage et refus des orphelins

**Files:**
- Create: `src/ecrans/refus-suppression.js`, `src/styles/refus.css`, `tests/ecran-suppressions-etiquettes.mjs`
- Modify: `src/ecrans/suppression.js`, `src/ecrans/fiche-etiquette.js` (`confirmerPuisSupprimer` remplacé par `supprimerDeLaBibliotheque`), `src/ecrans/etiquettes.js` (`ouvrirFiche` par `editerCategorie` / `editerObjet`), `src/i18n/fr.json` (retirer `suppression.etiquetteTexte`, `suppression.groupeTexte`, `suppression.groupeVide`, remplacés par les clés de la tâche 3), `src/main.js` (feuille), `tests/textes-etiquettes.test.js`, `tests/ecran-etiquettes-fiches.mjs`, `tests/ecran-etiquettes-effets.mjs`

**Interfaces:**
- Consumes : tâches 2 à 5.
- Produces : `ouvrirRefus({ t, langue, cible, nom, lire, ouvrirFiche, supprimer, signal, dans }) -> Promise<boolean>` (refus-suppression.js) : `lire()` relit la bibliothèque (après chaque fiche fermée, et à l'événement `bibliotheque-retablie`) ; `ouvrirFiche(element, type)` ouvre la fiche par-dessus et rend une promesse résolue à sa fermeture ; liste vide → la fenêtre devient la question chiffrée ; « Supprimer » appelle `supprimer()` (écriture, bandeau) et rend true ; « Fermer », ×, Échap, retour système rendent false. `supprimerDeLaBibliotheque` l'appelle quand `estBloquee`.
- Aspect et textes : `docs/maquettes/suppressions/refus.js` et `maquette.css` (fenêtre 520 px, lignes de 64 px avec pavé, « N à régler », pied « Fermer » ombré tant qu'il reste à défiler ; liste vide : message vert avec coche, puis « Garder » / « Supprimer »). Le corps est une colonne qui défile dont aucun bloc ne se tasse.

- [ ] **Step 1: Tests qui échouent** :
  - `tests/ecran-suppressions-etiquettes.mjs` : le parcours de `docs/maquettes/suppressions/gestes.mjs`, transposé sur une bibliothèque déposée dans le stockage navigateur (celle de la tâche 2) — Chaud permise (« 1 objet perdra cette étiquette ») ; Plage refusée, 3 à régler, catégories d'abord ; Maillot de bain en « Toujours inclus » quitte la liste ; Tongs supprimé depuis sa fiche (bandeau en haut, liste à 1) puis rétabli par « Annuler » (liste à 2) puis supprimé de nouveau ; Baignade reçoit Chaud → « Plus rien ne bloque », « 1 objet et 1 catégorie perdront cette étiquette » ; « Supprimer » ferme refus et fiche, bandeau « Étiquette « Plage » supprimée » ; « Annuler » → Plage revient et Crème solaire relit [Plage, Chaud] **dans cet ordre** ; groupe Climat refusé (Bonnet, Cape de pluie, Doudoune) ; groupe Hébergement permis (« 1 catégorie perdra une de ses étiquettes ; elle garde les autres. ») ; refus au téléphone couché : la liste reste visible sous le texte ; voyage créé avant : identique ;
  - `tests/ecran-etiquettes-effets.mjs` : la suppression de la seule étiquette d'une catégorie (Review Focus 3 de la phase 6) est désormais **refusée** — remplacer l'assertion « la catégorie n'est plus proposée » par « la suppression est refusée et la catégorie reste proposée » (changement de règle du chef de projet du 2026-10-26, à dire dans le rapport) ;
  - `tests/ecran-etiquettes-fiches.mjs` et `tests/textes-etiquettes.test.js` : les textes de la question suivent les nouvelles clés.
- [ ] **Step 2:** lancer ces trois tests → échec.
- [ ] **Step 3:** écrire `refus-suppression.js` et `refus.css` ; brancher `supprimerDeLaBibliotheque`, `fiche-etiquette.js` et `etiquettes.js` ; retirer les trois clés remplacées.
- [ ] **Step 4:** tests verts ; `pnpm test:ecrans` vert ; captures clair/sombre du refus, de la fiche ouverte depuis la liste et de « Plus rien ne bloque », au téléphone (portrait et couché) et sur tablette.
- [ ] **Step 5: Commit** `feat(etiquettes): suppression chiffrée, et refus qui mène aux objets qu'elle rendrait orphelins`.

### Task 7: Critères de la phase de bout en bout

**Files:**
- Create: `tests/ecran-suppressions-criteres.mjs`

- [ ] **Step 1: Test** qui, sur la bibliothèque de départ réelle, pour chaque type de cible : lit le chiffre annoncé, supprime, compare au stockage (nombre exact d'objets supprimés, de modèles qui ont perdu l'étiquette) ; annule et compare le stockage entier à celui d'avant (identique, liens et ordre compris) ; vérifie qu'un voyage créé avant est identique après suppression et après annulation ; vérifie que l'arrivée et le départ du bandeau ne déplacent aucun élément de l'écran (positions mesurées avant / pendant / après).
- [ ] **Step 2:** le lancer. S'il échoue, c'est un défaut des tâches 1 à 6 : le corriger en TDD dans la tâche concernée (test rouge d'abord).
- [ ] **Step 3:** `pnpm verif` entier → vert.
- [ ] **Step 4: Commit** `test(ecrans): critères de la phase 7 de bout en bout`.

### Task 8: Essais sur les appareils (contrôleur)

- [ ] Construire et installer (`pnpm android:essai`) sur la tablette SM-X210, l'ASUS (Android 7, 360 points) et le Xiaomi (Android 15) ; données de l'appli effaçables. Sur chacun : supprimer un objet puis « Annuler » ; supprimer une catégorie, changer d'écran, « Annuler » depuis un voyage ; Plage refusée puis réglée jusqu'à la suppression ; bandeau par-dessus une fiche (touchable) ; touche retour pendant le refus (ferme le niveau du dessus). Debian : `pnpm tauri dev`, même parcours au clavier.
- [ ] Compte rendu au chef de projet ; cocher les critères de la phase 7 dans `docs/PLAN.md` seulement après sa validation ; proposer les lignes de `CLAUDE.md`.
