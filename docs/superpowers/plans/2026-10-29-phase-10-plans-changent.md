# Phase 10 : Quand les plans changent — plan de construction

> **Pour les agents :** sous-skill requis : superpowers:subagent-driven-development (recommandé) ou
> superpowers:executing-plans, tâche par tâche. Les étapes se suivent par cases (`- [ ]`).

**But :** modifier un voyage existant (informations, dates, voyageurs, étiquettes) par l'assistant
prérempli, avec une étape « Changements » acceptée ligne par ligne, et les pièces à sortir du sac
confirmées tout de suite ou plus tard (« ! »).

**Architecture :** une seule nouvelle règle de sac (pièces à sortir = dans le sac − quantité, quand
c'est positif ; « emballé » = dans le sac égal à la quantité) dans `src/modele/sac.js`, dont dépendent
déjà jauges, tampons et tri ; un module pur `src/modele/changements.js` qui compare le voyage à ce que
donneraient les nouvelles informations et produit la modification à écrire ; une écriture unique
`modifierVoyage` dans les deux stockages ; le contrôleur de l'assistant sorti de
`src/ecrans/nouveau-voyage.js` pour servir aux deux modes.

**Pile :** JavaScript simple + Vite, Tauri 2 / Rust (rusqlite), tests `node --test`, tests d'écran
Playwright (`tests/ecran-*.mjs`, jugés au code de sortie), `cargo test`.

**Conception :** `docs/superpowers/specs/2026-10-29-phase-10-plans-changent-design.md` (fait autorité ;
la lire en entier avant chaque tâche). Maquette validée : `docs/maquettes/plans-changent/`
(`pnpm dev`, puis `http://localhost:1430/docs/maquettes/plans-changent/?etat=…`) — ses textes et son
dessin sont la référence visuelle ; ses fichiers sont un brouillon, ne pas les importer dans l'appli.

## Contraintes globales

- Lire `AGENTS.md` et `CLAUDE.md` ; pnpm seulement ; TDD (sortie rouge gardée pour le rapport).
- Fichiers d'environ 500 lignes au plus (`pnpm controles` le vérifie) ; une seule définition par règle ;
  aucun écran ne touche SQLite ni Tauri ; le modèle reste pur.
- Tous les textes d'interface dans `src/i18n/fr.json` (repris de la maquette, typographie française :
  « … » avec espaces insécables, apostrophe ’).
- Chaque fonction ajoutée au stockage existe dans **les deux** stockages (`src/stockage/tauri.js`,
  `src/stockage/navigateur.js`) et est rangée dans `AUTRES` de `tests/ecritures-bibliotheque.test.js`.
- La forme des données échangées est figée par `tests/contrat/stockage.json` (relu par les tests Rust).
- Commits locaux sur `phase-10`, fichiers nommés (`git add <chemins>`), messages `type(portée): …` en
  français, terminés par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Jamais de push.
- Tests d'écran : pas de pause fixe, on attend l'effet ; une paire de captures clair / sombre par écran
  touché, aux formats 393 × 873, 800 × 1280, 1280 × 800, 1920 × 1080, regardées avant de rendre.
- Pendant une tâche, seulement les tests touchés ; `pnpm verif` complet une fois, en tâche 9.

## Points de vigilance (non couverts d'office, chacun reçoit son test dans la tâche indiquée)

1. Un objet « à sortir » qu'on touche **deux fois vite** : chaque appui sort une seule pièce, jamais
   en dessous de la quantité prévue pour un objet gardé (tâche 2, tâche 6).
2. Une panne d'enregistrement de « Appliquer les changements » : rien n'est écrit, l'assistant reste
   ouvert avec le message de panne, un second appui réessaie (tâche 4, tâche 8).
3. Un voyage dont une étiquette a disparu de la bibliothèque : elle reste dans le voyage et n'est
   jamais proposée au retrait de ses objets (tâche 3).
4. Une catégorie dont tous les objets sont retirés (sans pièce dans le sac) disparaît du voyage ; une
   catégorie qui garde un objet retiré en attente de sortie reste (tâche 3, tâche 4).
5. Augmenter le sac au-delà de la quantité reste interdit partout : seul un excédent déjà là (baisse,
   retrait) peut exister, et il ne fait que décroître (tâche 1, tâche 2).

---

### Tâche 1 : la base accepte des pièces à sortir (migration 006)

**Fichiers :**
- Créer : `src-tauri/migrations/006_pieces_a_sortir.sql`
- Modifier : `src-tauri/src/base.rs` (liste des migrations, test de migration), `src-tauri/src/voyages.rs`
  (`regler_dans_le_sac`), `src-tauri/src/ajustements.rs` (`regler_quantite`),
  `src/stockage/navigateur.js` et `src/stockage/navigateur-voyages.js` (mêmes bornes)
- Tests : `src-tauri/src/base.rs`, `src-tauri/src/ajustements_essais.rs`, `tests/stockage-ajustements.test.js`

**Interfaces :**
- Produit : la règle de borne commune aux deux stockages — une nouvelle valeur de `dansLeSac` est
  acceptée si `0 ≤ valeur ≤ max(quantité, ancienne valeur)` ; `regler_quantite` garde son refus
  `quantite < 1` et applique la même borne au sac (l'ancienne valeur est relue dans la base).

- [ ] **Étape 1 : tests rouges.** Rust : `la_migration_006_garde_les_objets_et_permet_un_excedent`
  (une base en version 5 avec un objet `quantite 4, dans_le_sac 4, achetes 2` se rouvre en version 6
  à l'identique ; puis un `UPDATE … SET quantite = 3` réussit avec `dans_le_sac` resté à 4 ; un
  `achetes = 5` sur quantité 4 est toujours refusé). `regler_quantite_garde_un_excedent_deja_la`
  (4 dans le sac, quantité réglée à 3 avec `dans_le_sac 4` : accepté) et
  `regler_dans_le_sac_refuse_de_creer_un_excedent` (quantité 3, sac 3 → 4 refusé ; sac 4 sur
  quantité 3 → 3 accepté). JS, mêmes deux cas sur le stockage navigateur.
- [ ] **Étape 2 :** `pnpm test:base` et `node --test tests/stockage-ajustements.test.js` : rouges pour
  la raison attendue (contrainte CHECK, borne).
- [ ] **Étape 3 :** migration 006 sur le modèle de 005 (reconstruction de `objet_du_voyage`, même
  colonnes, `CHECK (dans_le_sac >= 0)` et `CHECK (achetes >= 0 AND achetes <= quantite)` ; commentaire
  d'en-tête qui dit pourquoi). Bornes dans `regler_dans_le_sac`, `regler_quantite` et leurs jumeaux JS.
- [ ] **Étape 4 :** les mêmes commandes, vertes ; `pnpm test:base` entier vert.
- [ ] **Étape 5 :** commit `feat(base): pièces à sortir du sac (migration 006)` — le message signale
  l'impact sur le schéma.

### Tâche 2 : la règle du sac connaît les pièces à sortir

**Fichiers :** Modifier `src/modele/sac.js` ; Test `tests/sac.test.js`.

**Interfaces :**
- Produit, dans `src/modele/sac.js` :
  - `piecesASortir(objet) → number` : `max(0, dansLeSac − quantite)` ;
  - `estRetire(objet) → boolean` : `quantite === 0` (objet retiré qui attend sa sortie) ;
  - `estComplet(objet)` devient `dansLeSac === quantite` (emballé, rien à sortir) — `progression`,
    `estBouclee`, `ordreDansLeSac`, `progressionParVoyage` suivent sans changement de code ;
  - `etatDansLeSac(objet) → 'vide' | 'entame' | 'plein' | 'a-sortir'` (`'a-sortir'` dès qu'il y a des
    pièces à sortir) ;
  - `appuiSurCase(objet)` : avec des pièces à sortir, `{ dansLeSac: dansLeSac − 1, confirmer: false }` ;
  - `bornerDansLeSac(objet, valeur)` : borne haute `max(quantite, objet.dansLeSac)`.

- [ ] **Étape 1 : tests rouges** dans `tests/sac.test.js` : T-shirts `{quantite 3, dansLeSac 4}` →
  `piecesASortir 1`, `estComplet false`, `etatDansLeSac 'a-sortir'`, `appuiSurCase → {dansLeSac 3,
  confirmer false}` puis complet ; objet retiré `{quantite 0, dansLeSac 1}` → `estRetire true`,
  `piecesASortir 1`, non complet ; une catégorie `[complet, à sortir]` n'est pas bouclée et compte
  `1 / 2` ; `ordreDansLeSac` met l'objet à sortir avec les incomplets ; `bornerDansLeSac({quantite 3,
  dansLeSac 4}, 9) === 4`, `bornerDansLeSac({quantite 3, dansLeSac 2}, 9) === 3`. Témoin positif :
  `{quantite 3, dansLeSac 3}` reste complet et `appuiSurCase` vide toujours avec confirmation.
- [ ] **Étape 2 :** `node --test tests/sac.test.js` rouge.
- [ ] **Étape 3 :** les fonctions ci-dessus ; commentaires mis à jour (le « au moins » de `estComplet`
  n'a plus cours : expliquer pourquoi l'égalité).
- [ ] **Étape 4 :** `node --test tests/sac.test.js tests/courses.test.js tests/voyage.test.js` verts.
- [ ] **Étape 5 :** commit `feat(sac): pièces à sortir, un objet n'est emballé que sans excédent`.

### Tâche 3 : le modèle des changements

**Fichiers :** Créer `src/modele/changements.js` ; Test `tests/changements.test.js`.

**Interfaces :**
- Consomme : `genererApercu`, `etiquettesChoisies` (`src/modele/inclusion.js`), `calculerQuantite`
  (`src/modele/quantites.js`), `joursEtNuits` (`src/modele/periode.js`), `validerInformations`
  (`src/modele/voyage.js`), `aUneFormuleInitiale` (`src/modele/ajustements.js`), `piecesASortir`,
  `estRetire` (tâche 2), `achetesApresQuantite` (`src/modele/courses.js`).
- Produit :
  - `choisiesDuVoyage(bibliotheque, etiquettesDuVoyage) → Set<string>` : les identifiants de la
    bibliothèque des étiquettes du voyage qui y existent encore (présélection de l'assistant) ;
  - `calculerChangements({ contenu, bibliotheque, infos, choisies }) → Array<{ categorie, lignes }>`
    où `contenu` est le voyage lu (`{ voyage, etiquettes, categories, objets }`), `categorie` une
    catégorie du voyage ou un modèle de la bibliothèque (`{ ...modele, neuve: true }`), et chaque ligne
    `{ cle, genre, nom, avant, apres, objet?, modele?, defaut }` avec
    `genre ∈ 'quantite' | 'manuelle' | 'entree' | 'sortie' | 'retour'` ; `defaut` vaut `true`
    (appliquer) pour `quantite`, `entree`, `retour`, `false` pour `sortie` et `manuelle` (garder) ;
    catégories dans l'ordre (`ordre`), lignes par nom ;
  - `appliquerChangements({ contenu, bibliotheque, infos, choisies, changements, acceptes },
    { nouvelId, maintenant }) → { modification, aSortir }` où `acceptes: Set<cle>` (les lignes à
    appliquer ; pour `manuelle`, présente = recalculer) ; `modification` a exactement la forme
    `{ voyage, etiquettes, categoriesAjoutees, objetsAjoutes, objetsModifies, objetsRetires,
    categoriesRetirees }` (objets complets pour `objetsModifies`, identifiants pour les retraits) ;
    `aSortir` liste `{ id, nom, categorie, pieces, retire }` des objets qui ont des pièces à sortir
    après application.
- Règles (conception, « Le récapitulatif ») : inclusion de la bibliothèque **actuelle** avec les
  anciennes étiquettes (`choisiesDuVoyage`) et les anciennes infos, puis avec les nouvelles ; seuls les
  modèles dont l'inclusion change sont `entree` / `sortie` / `retour` ; les quantités se recalculent
  avec la règle **copiée** dans l'objet du voyage pour tout objet qui a une formule
  (`aUneFormuleInitiale`) ; calcul tombé à 0 → `sortie` ; quantité manuelle différente du calcul →
  `manuelle` (« le calcul donne N ») ; un `retour` est un objet retiré en attente (`estRetire`) que
  la modification inclut de nouveau. À l'application : une `sortie` acceptée sans pièce dans le sac
  est retirée, avec des pièces elle passe à quantité 0 et achats 0 ; une baisse garde le sac tel quel
  (l'excédent devient « à sortir ») ; `achetes` suit `achetesApresQuantite` ; un `recalculer` remet
  `quantiteManuelle: false` ; une entrée naît comme dans `genererVoyage` (même champs, `aAcheter`
  = consommable), dans la catégorie du voyage de même `modeleId` ou dans une catégorie copiée ;
  une catégorie copiée dont aucune entrée n'est acceptée n'est pas créée ; une catégorie vidée par
  les retraits est retirée. Étiquettes : celles de `etiquettesChoisies(bibliotheque, choisies)`
  copiées comme à la création (une étiquette déjà dans le voyage garde son `id`), suivies de celles
  du voyage dont l'origine a disparu. **Factoriser** avec `genererVoyage` la fabrication d'un objet et
  d'une catégorie du voyage depuis un modèle (une seule définition : exporter ces deux fabriques de
  `src/modele/voyage.js` et s'en servir des deux côtés).

- [ ] **Étape 1 : tests rouges**, données de la maquette (`docs/maquettes/plans-changent/donnees.js`) :
  - critère du PLAN : Repas « 2 par jour, par personne », 4 jours, 2 → 3 voyageurs donne une ligne
    `quantite` `16 → 24` acceptée par défaut ; un Pull fixé à 3 donne `manuelle` gardée, et
    l'appliquer sans l'accepter laisse 3 ; l'accepter donne la quantité calculée et
    `quantiteManuelle false` ;
  - ajouter « Pluie » propose `entree` Poncho avec la quantité calculée pour ce voyage, et ne propose
    aucun objet dont le modèle est déjà dans le voyage ; un objet décoché à la création (modèle inclus
    avant comme après) n'est pas proposé ;
  - retirer « Randonnée » propose `sortie` Chaussures de marche, défaut `false` ; appliquer sans
    l'accepter laisse **tous** les objets et leurs pièces ; l'accepter avec 1 pièce dans le sac donne
    `quantite 0, dansLeSac 1` et une entrée `aSortir` `retire: true` ; sans pièce, l'objet est dans
    `objetsRetires` et sa catégorie vide dans `categoriesRetirees` ;
  - baisse Cartouches de gaz 3 → 2 avec 3 dans le sac : `aSortir` `pieces 1`, `dansLeSac` resté 3 ;
  - par nuit sur un aller-retour devenu séjour (0 → 1) : `entree` ; l'inverse : `sortie` ;
  - étiquette du voyage dont l'origine a disparu : gardée dans `modification.etiquettes`, ses objets
    jamais en `sortie` ;
  - rien ne change (même infos et étiquettes, nom changé) : `calculerChangements` rend `[]` et
    `appliquerChangements` ne touche aucun objet ;
  - objet ajouté à la main (valeur 0) : jamais dans les changements ;
  - retour : un objet `{quantite 0, dansLeSac 1}` dont l'étiquette revient → `retour` `0 → N`.
- [ ] **Étape 2 :** `node --test tests/changements.test.js` rouge.
- [ ] **Étape 3 :** le module (sous 500 lignes ; scinder en `changements.js` + `changements-appliquer.js`
  si besoin, la porte d'entrée restant `changements.js`).
- [ ] **Étape 4 :** `node --test tests/changements.test.js tests/voyage.test.js tests/contrat.test.js` verts.
- [ ] **Étape 5 :** commit `feat(voyage): changements d'un voyage quand les plans changent`.

### Tâche 4 : les écritures de la modification

**Fichiers :**
- Créer : `src-tauri/src/modification.rs`, `src-tauri/src/modification_essais.rs`,
  `src/stockage/navigateur-modification.js`
- Modifier : `src-tauri/src/lib.rs` (modules et commandes), `src/stockage/tauri.js`,
  `src/stockage/navigateur.js`, `tests/ecritures-bibliotheque.test.js` (`AUTRES`),
  `tests/contrat/stockage.json` (clé `modification`), `tests/contrat.test.js`,
  `src-tauri/src/essais.rs` si le contrat y est relu
- Tests : `src-tauri/src/modification_essais.rs`, `tests/stockage-modification.test.js` (créer)

**Interfaces :**
- Consomme : la forme `modification` de la tâche 3.
- Produit, dans les deux stockages :
  - `modifierVoyage(modification)` → commande `modifier_voyage { modification }` : une transaction ;
    met à jour la ligne `voyage` (doit exister), remplace toutes ses étiquettes, insère catégories et
    objets ajoutés (`inserer_categorie`, `inserer_objet`), réécrit les objets modifiés (tous les
    champs sauf `id`, `voyage_id` ; refus si l'objet n'est pas de ce voyage), supprime les objets
    retirés puis les catégories retirées (refus si une catégorie retirée a encore un objet) ;
  - `marquerRetire(id, modifieLe)` → `marquer_retire` : quantité 0, achats 0, sac inchangé
    (« Retirer du voyage » puis « Plus tard ») ;
  - `garderDansLeVoyage(id, quantite, quantiteManuelle, modifieLe)` → `garder_dans_le_voyage` :
    quantité ≥ 1, sac inchangé.

- [ ] **Étape 1 : tests rouges** (Rust et navigateur, mêmes cas) : une modification complète relue à
  l'identique par `lireVoyage` ; une modification dont un objet modifié appartient à un autre voyage
  est refusée **et n'écrit rien** (le voyage relu est inchangé, étiquettes comprises) ; panne simulée
  (`pannes: ['modifierVoyage']`) du navigateur : rien d'écrit ; catégorie retirée encore occupée :
  refus ; `marquerRetire` puis `lireVoyage` donne `quantite 0, dansLeSac` inchangé ;
  `garderDansLeVoyage(id, 0, …)` refusé. Contrat : la modification produite par
  `appliquerChangements` a exactement les champs de `contrat.modification`.
- [ ] **Étape 2 :** `pnpm test:base` et `node --test tests/stockage-modification.test.js tests/contrat.test.js
  tests/ecritures-bibliotheque.test.js` rouges.
- [ ] **Étape 3 :** les écritures (Rust sur le modèle de `ajustements.rs` ; `voyages.rs` est à 481
  lignes, ne rien y ajouter) ; navigateur sur le modèle de `navigateur-voyages.js` (calculer le
  résultat entier avant `ecrire`).
- [ ] **Étape 4 :** les mêmes commandes, vertes.
- [ ] **Étape 5 :** commit `feat(stockage): modifier un voyage en une seule écriture`.

### Tâche 5 : le « ! » dans la liste du voyage

**Fichiers :** Modifier `src/ecrans/voyage-vues.js`, `src/ecrans/grand-format-vues.js`,
`src/styles/voyage.css` (ou `grand-format.css`), `src/i18n/fr.json` ; Tests
`tests/textes-voyage.test.js`, créer `tests/ecran-voyage-a-sortir.mjs` (et l'inscrire dans
`tests/ecrans.mjs`).

**Interfaces :** Consomme `etatDansLeSac`, `piecesASortir`, `estRetire` (tâche 2).

Dessin de la maquette (état `a-sortir`) : case « ! » ambre pleine à la place de la coche, avec un
libellé accessible (« 1 pièce à sortir du sac »), pastille « N à sortir du sac » (icône + mot) sous
le nom ; objet retiré barré, « retiré du voyage », sans quantité à droite ; « ! » rond devant le compte
de la catégorie (carte, menu des catégories, tuile du grand écran) ; pas de tampon « Bouclé ! » ni de
repli automatique ; pas de « Sac bouclé ! » (déjà donné par la tâche 2 : le vérifier). Contraste
4,5:1 en clair et en sombre.

- [ ] **Étape 1 : test d'écran rouge** `tests/ecran-voyage-a-sortir.mjs` : voyage déposé dans le
  stockage navigateur avec T-shirts `{quantite 3, dansLeSac 4}` et Chaussures `{quantite 0, dansLeSac
  1}`, tout le reste emballé : les deux lignes portent la pastille « 1 à sortir du sac », Chaussures
  est barré, la catégorie n'a pas de tampon et porte le « ! », aucun « Sac bouclé ! » ; avec le filtre
  « Reste à emballer », les deux restent visibles ; au format 1280 × 800, la tuile porte le « ! ».
  Témoin positif : sans excédent, la même catégorie est « Bouclé ! ».
- [ ] **Étape 2 :** `node tests/ecran-voyage-a-sortir.mjs` sort en erreur.
- [ ] **Étape 3 :** vues, styles, textes.
- [ ] **Étape 4 :** le test vert, puis `node tests/ecran-voyage.mjs`, `node tests/ecran-voyage-grand-format.mjs`,
  `node tests/ecran-voyage-emballe.mjs` verts ; captures clair / sombre de l'état, regardées.
- [ ] **Étape 5 :** commit `feat(voyage): signaler les pièces à sortir du sac`.

### Tâche 6 : sortir les pièces — gestes, fiche et gestes alignés de la phase 8

**Fichiers :** Créer `src/ecrans/sortie-du-sac.js` (la question « Sortir N pièces du sac ? », « C'est
fait », « Plus tard », « Le garder dans le voyage ») ; Modifier `src/ecrans/voyage.js` (appui sur une
case « ! », sans grossir : déléguer à `sortie-du-sac.js`), `src/ecrans/fiche.js` (encadré « N à sortir
du sac », « C'est fait » à la place de « Tout dans le sac », pour un retiré : « C'est fait » et « Le
garder dans le voyage » seulement), `src/ecrans/ajustements.js` (`confirmerBaisse` à trois boutons
« Garder N » / « Plus tard » / « C'est fait » ; `confirmerRetrait` d'un objet emballé : « Garder » /
« Plus tard » / « C'est fait » en rouge), `src/i18n/fr.json` ; Tests : créer
`tests/ecran-voyage-sortir.mjs`, adapter `tests/ecran-voyage-ajuster.mjs` et
`tests/ecran-voyage-retirer.mjs` aux nouveaux boutons (sans affaiblir ce qu'ils vérifient).

**Interfaces :**
- Consomme : `appuiSurCase`, `piecesASortir`, `estRetire` (tâche 2) ; `reglerDansLeSac`,
  `reglerQuantite` (bornes de la tâche 1), `retirerDuVoyage`, `retablirDansLeVoyage`, `marquerRetire`,
  `garderDansLeVoyage` (tâche 4) ; `montrerAnnulation` (`src/ecrans/annulation.js`) ;
  `calculerQuantite` pour « Le garder » (formule copiée et période du voyage ; sans formule, le nombre
  de pièces dans le sac, `quantiteManuelle: true`).
- Produit : `demanderSortie({ t, langue, objets, signal }) → Promise<'fait' | 'plus-tard' | null>`
  (objets : `{ nom, pieces, retire, categorie }`), utilisée aussi par la tâche 8 ;
  `sortirDuSac(ecran, objets)` qui écrit « C'est fait » pour une liste d'objets (sac ramené à la
  quantité ; un retiré quitte le voyage, avec le bandeau « Annuler » — un seul bandeau pour
  plusieurs, son « Annuler » les rend tous).

- [ ] **Étape 1 : tests d'écran rouges** `tests/ecran-voyage-sortir.mjs` : appui sur la case « ! » de
  T-shirts (3 prévus, 4 dans le sac) → 3 dans le sac, coché ; **deux appuis rapides** sur une case
  « ! » à 2 pièces de trop → exactement 2 sorties, jamais sous la quantité ; dernière pièce de
  Chaussures retiré → la ligne part, bandeau « Annuler », « Annuler » la rend barrée avec sa pièce ;
  fiche de T-shirts : « C'est fait » → coché ; fiche de Chaussures : « Le garder dans le voyage » → la
  ligne n'est plus barrée et reprend la quantité calculée ; baisse à la main 4 → 3 avec 4 dans le sac :
  « Plus tard » → la ligne porte le « ! », « C'est fait » → 3 dans le sac, « Garder 4 » → rien ne
  change ; « Retirer du voyage » d'un objet emballé : « Plus tard » → barré avec « ! », « C'est fait »
  → parti avec « Annuler ». Témoin positif : un objet sans pièce dans le sac se retire comme en phase 8.
- [ ] **Étape 2 :** `node tests/ecran-voyage-sortir.mjs` sort en erreur.
- [ ] **Étape 3 :** le module et les branchements ; `voyage.js` reste sous 500 lignes.
- [ ] **Étape 4 :** le test vert, puis `node tests/ecran-voyage-ajuster.mjs`, `node tests/ecran-voyage-retirer.mjs`,
  `node tests/ecran-voyage-fiche.mjs`, `node tests/ecran-voyage-gestes.mjs`, `node tests/ecran-annulation-voyage.mjs`
  verts ; captures clair / sombre de la fiche à sortir, de la fiche d'un retiré et des deux questions.
- [ ] **Étape 5 :** commit `feat(voyage): sortir les pièces du sac, tout de suite ou plus tard`.

### Tâche 7 : le contrôleur de l'assistant, commun aux deux modes (sans changement visible)

**Fichiers :** Créer `src/ecrans/assistant-controleur.js` ; Modifier `src/ecrans/nouveau-voyage.js`
(ne garde que ce qui est propre à la création) ; Tests : tous les `tests/ecran-nouveau-voyage*.mjs`,
`tests/ecran-annulation-assistant.mjs`, `tests/ecran-retour*.mjs` — ils sont le filet, aucun ne change.

**Interfaces :**
- Produit : `ouvrirAssistant(app, contexte, mode)` qui contient tout le corps actuel de
  `ecranNouveauVoyage.dessiner` (étapes, rangée, calendrier, garde du retour, fenêtre, pied, alertes,
  relecture de la bibliothèque), paramétré par `mode` :
  `{ infos, choisies, fond(app), textes: { titre, abandonTitre, abandonTexte, derniere, terminer },
  peindreDerniere({ panneau, infos, etat, bibliotheque }) , grise(infos, etat), terminer({ infos,
  etat, bibliotheque, alerter }) → Promise, surClic(cible) → boolean, saisieCommencee(infos, etat),
  focusAuRetour }`. Le mode création reprend exactement le comportement actuel (aperçu, objets
  écartés, « Créer le voyage »).

- [ ] **Étape 1 :** lancer les tests d'écran de l'assistant **avant** de toucher au code (référence verte).
- [ ] **Étape 2 :** déplacer le contrôleur, `nouveau-voyage.js` devenant le mode création ; aucun texte,
  sélecteur ni comportement ne change.
- [ ] **Étape 3 :** les mêmes tests, verts ; `pnpm controles` vert (tailles, exports inutilisés).
- [ ] **Étape 4 :** commit `refactor(assistant): contrôleur commun à la création et à la modification`.

### Tâche 8 : « Modifier le voyage » et l'étape « Changements »

**Fichiers :** Créer `src/ecrans/modifier-voyage.js` (écran `#/voyage/:id/modifier`, mode
« modification » de `ouvrirAssistant`), `src/ecrans/changements-vues.js` (dessin de l'étape),
`src/styles/changements.css` (importée dans `src/main.js`) ; Modifier `src/main.js` (route),
`src/ecrans/voyage-vues.js` (bouton « Modifier le voyage » au crayon sous les étiquettes, lien vers la
route), `src/i18n/fr.json` ; Tests : créer `tests/ecran-voyage-modifier.mjs` (inscrit dans
`tests/ecrans.mjs`), `tests/textes-voyage.test.js`.

**Interfaces :**
- Consomme : `ouvrirAssistant` (tâche 7), `choisiesDuVoyage`, `calculerChangements`,
  `appliquerChangements` (tâche 3), `modifierVoyage` (tâche 4), `demanderSortie`, `sortirDuSac`
  (tâche 6), `creerCalendrier` avec `periode` préremplie.
- Comportement (conception, « L'accès » et « Le récapitulatif » ; maquette, états `voyage`,
  `assistant`, `recapitulatif`, `sortie`) : fond = l'écran du voyage ; titre « Modifier le voyage » ;
  dernière étape « Changements », pied « Voir les changements » / « Appliquer les changements » ;
  titre de l'étape « N changements à appliquer sur M », rappel du voyage, puces de ce qui change, une
  carte par catégorie, valeur « 16 → 24 » à droite, changement refusé = valeur barrée, quantité fixée
  manuellement en segments « Garder 3 | Recalculer : 4 » ; **sans aucun changement d'objet**, entrer
  dans la dernière étape enregistre directement et revient au voyage ; fermer avec des changements non
  appliqués demande « Abandonner ces changements ? » ; après « Appliquer », retour au voyage, puis, s'il
  y a des pièces à sortir, `demanderSortie` une fois pour toutes ; panne d'écriture : message de panne
  dans le pied, rien d'écrit, un second appui réessaie ; un double appui n'écrit qu'une fois.

- [ ] **Étape 1 : test d'écran rouge** `tests/ecran-voyage-modifier.mjs` : depuis un voyage de la
  bibliothèque de départ (2 voyageurs), « Modifier le voyage » ouvre l'assistant prérempli (nom,
  dates, voyageurs, étiquettes du voyage pressées) ; passer à 3 voyageurs, « Voir les changements » :
  la ligne Repas dit « 16 → 24 » ; « Appliquer » : le voyage montre 24, une quantité fixée à la main
  n'a pas bougé ; ajouter une étiquette propose ses objets (aucun déjà présent), les appliquer les fait
  entrer avec leur quantité ; retirer une étiquette puis « Appliquer » sans rien cocher : tous les
  objets et leurs pièces restent ; accepter un retrait d'objet emballé → question de sortie →
  « Plus tard » → ligne barrée avec « ! » ; seulement le nom changé : aucune étape « Changements »
  affichée, le voyage porte le nouveau nom ; panne `modifierVoyage` : message, voyage inchangé ;
  abandon après un changement : la question, puis le voyage inchangé ; retour système à chaque
  étape comme dans la création.
- [ ] **Étape 2 :** `node tests/ecran-voyage-modifier.mjs` sort en erreur.
- [ ] **Étape 3 :** écran, vues, styles, textes.
- [ ] **Étape 4 :** le test vert, puis les tests d'écran de l'assistant et du voyage verts ; captures
  clair / sombre aux quatre formats des états `assistant`, `changements`, `sortie`, regardées.
- [ ] **Étape 5 :** commit `feat(voyage): modifier un voyage, étape « Changements »`.

### Tâche 9 : vérification complète

**Fichiers :** Modifier `docs/superpowers/specs/2026-10-29-phase-10-plans-changent-design.md` seulement
si la construction a dû trancher autrement (le dire au rapport).

- [ ] **Étape 1 :** `pnpm verif` en tâche de fond ; tout vert (un test instable sous charge se relance
  seul : il doit être vert seul, le noter).
- [ ] **Étape 2 :** relire les quatre critères d'acceptation et la nouvelle ligne de critères de la
  phase 10 (`docs/PLAN.md`) et nommer pour chacun le test qui le prouve. Ne **pas** cocher le PLAN :
  c'est après la validation du chef de projet.
- [ ] **Étape 3 :** commit des retouches éventuelles.

---

## Ce qui peut avancer en parallèle

| Tâche | Fichiers principaux | Dépend de |
|---|---|---|
| 1 | migrations, `base.rs`, `voyages.rs`, `ajustements.rs`, `navigateur*.js` | — |
| 2 | `src/modele/sac.js` | — |
| 3 | `src/modele/changements.js`, `src/modele/voyage.js` | 2 |
| 4 | `modification.rs`, `lib.rs`, `tauri.js`, `navigateur.js`, contrat | 3 (forme), 1 (`navigateur.js`) |
| 5 | `voyage-vues.js`, `grand-format-vues.js`, styles | 2 |
| 6 | `sortie-du-sac.js`, `voyage.js`, `fiche.js`, `ajustements.js` (écrans) | 1, 2, 4, 5 |
| 7 | `assistant-controleur.js`, `nouveau-voyage.js` | — |
| 8 | `modifier-voyage.js`, `changements-vues.js`, `main.js`, `voyage-vues.js` | 3, 4, 6, 7 |
| 9 | — | toutes |

Départ possible ensemble : 1, 2 et 7 ; puis 3 et 5 ; puis 4 ; puis 6 ; puis 8.
