# Phase 5 — Bibliothèque : catégories et objets : plan de réalisation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal :** un menu (Mes voyages, Nouveau voyage, Réglages) mène, par Réglages, à l'écran Bibliothèque, où l'on crée et modifie catégories et objets modèles et où l'on range les catégories ; les voyages créés ensuite en tiennent compte, les voyages existants ne bougent pas.

**Architecture :** la base reçoit trois écritures (catégorie, objet, ordre), sans migration ; le modèle porte la validation, la préparation des modèles, le déplacement et la recherche du catalogue (`src/modele/modeles.js`, `catalogue.js`) ; les écrans suivent le découpage du voyage : un écran qui branche gestes et stockage (`bibliotheque.js`), ses vues (`bibliotheque-vues.js`), une mécanique de fiche de saisie commune (`fiche-modele.js`) et une fiche par sujet. Le routeur gagne deux adresses et une navigation « par l'accueil » pour le menu.

**Tech Stack :** Tauri 2, JavaScript simple, Vite 6, rusqlite 0.32, Playwright 1.62, `node --test`, Phosphor 2.1.1.

**Spec :** `docs/superpowers/specs/2026-10-25-phase-5-bibliotheque-design.md` (conception validée, section « Maquettes validées »), `docs/PLAN.md` phase 5, `docs/PRD.md` (US-2 à US-5 ; « Écrans et gestes », puces « Navigation » et « Bibliothèque »), maquette validée `docs/maquettes/bibliotheque/` (`python3 -m http.server 8644` à la racine, puis `/docs/maquettes/bibliotheque/?etat=…`). **La maquette fait foi pour l'aspect et les textes** : règles de `maquette.css`, textes de `maquette.js`, `fiches.js` et `donnees.js` (catalogue).

## Global Constraints

- Lire `AGENTS.md` et `CLAUDE.md` : français partout, commentaires qui disent le *pourquoi*, TDD (garder la sortie rouge dans le rapport), fichiers de 500 lignes au plus, un nom n'est exporté que s'il est importé ailleurs, aucun texte d'interface hors de `src/i18n/fr.json`.
- Couches : un écran n'importe que `src/stockage/index.js` côté stockage ; le modèle n'importe que le modèle ; seul le stockage touche `localStorage` ou Tauri.
- pnpm uniquement ; `pnpm exec prettier --write <fichiers>` après chaque écriture.
- **Commits** autorisés sur la branche `phase-5` ; fichiers nommés (`git add <chemins>`, vérifier `git diff --cached --name-only`), message `type(portée): message` en français. Jamais de push. **Aucune migration** dans cette phase : le schéma ne change pas, le dire dans les messages des commits de la base.
- **Rien des phases suivantes** (décision du chef de projet) : ni écran Étiquettes, ni suppression, ni « Jamais proposés », ni ajout depuis un voyage, ni « À propos », ni place réservée pour eux.
- **Menu** : bouton `Menu` (picto `list`, 44 px, sans bord) en haut à gauche de l'accueil, de Réglages et de la Bibliothèque seulement ; l'écran du voyage et l'assistant ne changent pas. Panneau depuis la gauche (`<dialog class="tiroir">`), largeur `min(320px, 100vw − 56px)`, mascotte et « Baluchon » en tête, entrées Mes voyages · Nouveau voyage · Réglages, l'entrée de l'écran courant sur fond actif (`aria-current="page"` ; Réglages pour la Bibliothèque). Se ferme par ×, appui sur le voile, Échap, retour système.
- **Navigation** : depuis le menu, Mes voyages = `revenirAccueil()` ; Nouveau voyage et Réglages = remonter à l'accueil **puis** ouvrir l'adresse (une seule étape au-dessus de l'accueil) ; une entrée vers l'écran déjà ouvert ne fait que fermer le menu. Réglages ouvre la Bibliothèque (profondeur 2). Retour système depuis la Bibliothèque : Réglages, puis Mes voyages, puis sortie de l'appli. Le lien « Réglages » de la Bibliothèque recule d'une étape (ou remplace l'adresse si la Bibliothèque a été ouverte directement).
- **Bibliothèque** : catégories par `ordre`, objets par nom (`localeCompare`) ; une colonne, cartes **repliées à l'ouverture** ; deux panneaux sous la même requête que l'écran du voyage, `(min-width: 1000px) and (orientation: landscape)` (une seule définition JS, partagée). Sous le nom d'une catégorie : « N objets · Toujours incluse », ou « N objets » suivi des étiquettes en petites puces.
- **Fiches de modèle** : création et modification par la même fiche ; « Enregistrer » écrit tout d'un coup ; fermer une fiche modifiée (×, « Annuler », voile, Échap, retour système) demande « Abandonner les modifications ? » (« Continuer la saisie » d'abord, « Abandonner » principal) ; une fiche non modifiée se ferme directement. Au téléphone (`(max-width: 599px), (max-height: 599px)`) : panneau du bas comme la fiche du voyage ; ailleurs, fenêtre centrée de 560 px (catalogue : 640 px, hauteur fixe).
- **Valeurs** : nom nettoyé des espaces, obligatoire ; valeur et plafond entiers de **1 à 999**, saisis au clavier (chiffres seuls) ou par − / + ; plafond proposé seulement avec « par jour » et « par nuit » (« fixe » l'efface) ; « Selon les étiquettes » sans aucune étiquette est refusé ; noms en double permis ; la catégorie d'un objet ne se change pas.
- **Défauts** : catégorie neuve `suitcase-rolling`, `corail`, toujours incluse, placée en dernier ; objet neuf `fixe` 1, sans plafond, par personne, non consommable, toujours inclus, note vide.
- **Phrase de quantité** : celle de `decrireRegle` (`src/ecrans/format.js`, une seule définition) ; exemple chiffré par `calculerQuantite` sur 4 jours, 3 nuits, 2 voyageurs.
- **Panne d'écriture** : message en haut de l'écran, par-dessus la fiche (élément `popover="manual"`), 6 s ; la fiche reste ouverte avec sa saisie ; rien ne change à l'écran ni dans la base. Une panne pendant le rangement laisse l'ordre d'avant.
- Animations : menu 240 ms à l'entrée, 180 ms à la sortie ; déplacement d'une ligne 220 ms `cubic-bezier(0.22, 1, 0.36, 1)` ; éclairage de ce qui vient d'être enregistré 1 600 ms ; rien si `prefers-reduced-motion: reduce`.
- Tests d'écran jugés au code de sortie, jamais de pause fixe ; formats : ceux de `tests/outils/page.mjs`, **plus** le téléphone étroit `360 × 640` et son paysage `640 × 360` pour les écrans de cette phase ; une capture claire et une sombre par écran touché dans `captures-travail/`.

## Review Focus

1. Nom de catégorie ou d'objet avec `<`, `&`, `"` : rendu en texte sur la carte, dans le titre de fiche, la question d'abandon, les libellés ▲ ▼ et les puces (tâches 5 et 6).
2. Retour système sur une fiche modifiée : la question s'ouvre, la fiche reste ; catalogue ouvert par-dessus : le retour ne ferme que le catalogue, la saisie reste (tâche 6).
3. Double appui sur « Enregistrer » d'une nouvelle catégorie, ou second appui après une panne levée : une seule catégorie créée (tâche 6).
4. Appuis rapides et répétés sur ▲ / ▼, et panne pendant un déplacement : l'ordre affiché égale toujours l'ordre enregistré (tâche 5).
5. Valeur saisie « 0 », « 1000 », « 12a », vide : chiffres seuls, ramenée entre 1 et 999, vide refusé avec son message (tâches 2 et 6).

## Ordre et parallélisme

1 (base et stockage) et 2 (modèle) en parallèle (aucun fichier commun). 3 (textes et pictos) après 2. 4 (menu, Réglages, navigation) après 3. 5 (écran Bibliothèque) après 1, 2, 4. 6 (fiches) après 5. 7 (effets sur les voyages) après 6. 8 en dernier.

---

### Task 1: Écrire la bibliothèque dans la base et le stockage

**Files:**
- Create: `src-tauri/src/edition.rs` (écritures de la bibliothèque ; `bibliotheque.rs` en est déjà à 323 lignes)
- Modify: `src-tauri/src/lib.rs`, `src/stockage/tauri.js`, `src/stockage/navigateur.js`, `tests/stockage-navigateur.test.js`

**Interfaces:**
- Produces (Rust, `impl Base`) : `enregistrer_categorie(&self, categorie: &CategorieModele) -> Result<(), String>` ; `enregistrer_objet(&self, objet: &ObjetModele) -> Result<(), String>` ; `ranger_categories(&self, ids: &[String], modifie_le: &str) -> Result<(), String>`.
- Produces (commandes Tauri et stockage JS, mêmes formes que le contrat `tests/contrat/stockage.json`, inchangé) : `enregistrerCategorie(categorie)`, `enregistrerObjet(objet)`, `rangerCategories(ids, modifieLe)`. Pannes simulées du stockage navigateur sous ces trois noms.

- [ ] **Step 1: Tests Rust qui échouent** (dans `edition.rs`, base jetable et contrat installé) :
  - `une_categorie_neuve_est_relue_avec_ses_etiquettes` et `une_categorie_modifiee_remplace_ses_liens` (nom, icône, couleur, `toujours_incluse`, `modifie_le` et liens remplacés, pas ajoutés) ;
  - `un_objet_neuf_puis_modifie_est_relu_a_l_identique` (plafond `None` compris) ;
  - `un_objet_d_une_categorie_inconnue_est_refuse_sans_rien_ecrire` et `une_etiquette_inconnue_est_refusee_sans_rien_ecrire` (l'objet d'avant et ses liens restent) ;
  - `ranger_suit_l_ordre_donne` ; `ranger_refuse_une_liste_incomplete_ou_inconnue` (ordre inchangé) ;
  - `modifier_un_modele_ne_touche_pas_un_voyage` : voyage du contrat créé, catégorie et objet modèles renommés, `lire_voyage` rend exactement le voyage du contrat.
- [ ] **Step 2:** `pnpm test:base` → rouge (garder la sortie).
- [ ] **Step 3:** écrire `edition.rs` : chaque écriture dans une transaction ; catégorie et objet par `INSERT … ON CONFLICT(id) DO UPDATE`, puis liens effacés et réécrits dans l'ordre ; `ranger_categories` refuse si `ids` n'est pas exactement l'ensemble des catégories, puis `ordre` = rang 0, 1, 2… et `modifie_le`. Brancher les trois commandes dans `lib.rs` et `tauri.js`.
- [ ] **Step 4: Stockage navigateur** : mêmes trois opérations sur `bibliotheque` (mêmes refus que la base : catégorie inconnue, étiquette inconnue, liste incomplète) ; tests dans `tests/stockage-navigateur.test.js` : création, modification, rangement relus par `lireBibliotheque` ; panne `enregistrerObjet` → rien d'écrit.
- [ ] **Step 5:** `pnpm test:base && node --test tests/stockage-navigateur.test.js` → vert.
- [ ] **Step 6: Commit** — `feat(base): enregistrer catégories et objets modèles, ranger les catégories (sans changement de schéma)`.

---

### Task 2: Le modèle : valider, préparer, ranger, chercher un picto

**Files:**
- Create: `src/modele/modeles.js`, `src/modele/catalogue.js`, `tests/modeles.test.js`, `tests/catalogue.test.js`

**Interfaces:**
- Produces (`modeles.js`) :
  - `BORNES_QUANTITE = { min: 1, max: 999 }` ; `PERIODE_EXEMPLE = { jours: 4, nuits: 3, voyageurs: 2 }`
  - saisie de catégorie : `{ nom, icone, couleur, selonEtiquettes: boolean, etiquettes: string[] }` ; saisie d'objet : `{ nom, regle, valeur: number | null, plafondActif: boolean, plafond: number | null, parPersonne, consommable, selonEtiquettes, etiquettes, note }`
  - `saisieDeCategorie(categorie | null) → saisie` et `saisieDObjet(objet | null) → saisie` (défauts de la phase pour `null`)
  - `validerCategorie(saisie) → { nom?: 'nomManquant', etiquettes?: 'etiquettesManquantes' }`
  - `validerObjet(saisie) → { nom?: 'nomManquant', valeur?: 'valeurManquante', plafond?: 'plafondManquant', etiquettes?: 'etiquettesManquantes' }` (plafond jugé seulement si `plafondActif` et règle ≠ `fixe`)
  - `lireNombre(texte) → number | null` : chiffres seuls, vide → `null`, sinon borné à `BORNES_QUANTITE`
  - `preparerCategorie(saisie, { existante, categories, nouvelId, maintenant }) → CategorieModele` et `preparerObjet(saisie, { existant, categorieId, nouvelId, maintenant }) → ObjetModele` (lèvent une erreur `{ erreurs }` si la saisie n'est pas valide, comme `genererVoyage`) : nom nettoyé, `toujoursIncluse` / `toujoursInclus` = `!selonEtiquettes`, `etiquettes` = `[]` si toujours, `plafond` = `null` si règle `fixe` ou plafond inactif, nouvelle catégorie à `ordre` = plus grand + 1 (0 si aucune)
  - `deplacerCategorie(ids, id, sens) → ids` (sens −1 ou 1 ; aux bords, la liste rendue est égale)
  - `exempleQuantite(objet) → number` (= `calculerQuantite(objet, PERIODE_EXEMPLE)`)
- Produces (`catalogue.js`) : `CATALOGUE = [{ theme, pictos: [cle] }]` (dix thèmes et 80 clés de `docs/maquettes/bibliotheque/donnees.js`, même ordre ; clés de thème `transport`, `bagages`, `vetements`, `toilette`, `alimentation`, `pleinAir`, `meteo`, `mer`, `electronique`, `maison`) ; `chercherPictos(pictos: [{ cle, nom, mots }], mot) → pictos` (un mot du nom ou des mots-clés **commence par** le mot cherché, sans accents ni majuscules ; mot vide → tous).

- [ ] **Step 1: Tests qui échouent** :
  - `saisieDObjet(null)` → `fixe`, 1, plafond inactif, par personne, non consommable, `selonEtiquettes: false`, note vide ; `saisieDeCategorie(null)` → `suitcase-rolling`, `corail`, toujours ;
  - `validerObjet` : nom « » ou « ␣␣ » → `nomManquant` ; `valeur: null` → `valeurManquante` ; `plafondActif` avec `plafond: null` en `par_jour` → `plafondManquant`, mais rien en `fixe` ; `selonEtiquettes` sans étiquette → `etiquettesManquantes` ; témoin : la saisie par défaut nommée « Pâtes » → `{}` ;
  - `lireNombre` : « 0 » → 1 ; « 1000 » → 999 ; « 12a » → 12 ; « » → `null` (Review Focus 5) ;
  - `preparerObjet` : « ␣Pâtes␣ » → « Pâtes » ; `fixe` avec plafond actif 5 → `plafond: null` ; `par_jour` 2, plafond 6 → `plafond: 6` ; selon [Camping] → `toujoursInclus: false`, `etiquettes: ['camping']` ; un existant garde son `id` ;
  - `preparerCategorie` : neuve dans une bibliothèque d'ordres 0 à 4 → `ordre: 5` ; existante garde `id` et `ordre` ; saisie invalide → lève, avec `erreurs` ;
  - `deplacerCategorie(['a','b','c'], 'c', -1)` → `['a','c','b']` ; `('a', -1)` → inchangé ;
  - `exempleQuantite({ regle: 'par_jour', valeur: 2, plafond: null, parPersonne: true })` → 16 ; avec plafond 6 → 12 ;
  - `chercherPictos` sur les entrées de `fr.json` (tâche 3 les écrit ; ici une liste d'essai dans le test) : « tente » → `tent` ; « soleil » → `sun` et `sunglasses` ; « SOLEIL » pareil ; « ete » → `sun` (« été ») ; « xyz » → `[]` ; `CATALOGUE` compte 80 clés distinctes, dont `t-shirt`, `tooth`, `fork-knife`, `identification-card`, `tent`, `suitcase-rolling`.
- [ ] **Step 2:** `node --test tests/modeles.test.js tests/catalogue.test.js` → rouge.
- [ ] **Step 3:** écrire les deux modules (en-têtes : renvoi à la spec de la phase 5 et au PRD « Calcul des quantités »).
- [ ] **Step 4:** → vert ; `pnpm controles`.
- [ ] **Step 5: Commit** — `feat(modele): saisie, validation et rangement des modèles ; catalogue des pictos`.

---

### Task 3: Textes, pictos du catalogue et icônes d'interface

**Files:**
- Create: `src/ecrans/pictos.js`, `tests/textes-bibliotheque.test.js`
- Modify: `src/i18n/fr.json`, `src/ecrans/icones.js`

**Interfaces:**
- Consumes : `CATALOGUE` (tâche 2).
- Produces (textes, repris mot pour mot de la maquette) : `menu.{ouvrir, fermer, reglages}` ; `reglages.{titre, bibliotheque, bibliothequeAide}` ; `bibliotheque.{titre, categories {one, other}, objets {one, other}, toujoursIncluse, ranger, termine, rangerAide, monter, descendre, place, nouvelleCategorie, modifierCategorie, modifier, ajouterObjet, consommable, erreurEnregistrement, erreurOrdre}` ; `modele.{nom, enregistrer, inclusion, toujoursIncluse, toujoursInclus, selonEtiquettes, abandon.{titre, continuer, abandonner}}` ; `modele.categorie.{nouvelle, creer, apparence, changerPicto, couleur, aideToujours, aideEtiquettes, choisirEtiquettes, abandonTexte, abandonNouvelle, erreurs.{nomManquant, etiquettesManquantes}}` ; `modele.objet.{nouveau, ajouter, dans, quantite, fixe, parJour, parNuit, nombre, chaqueJour, chaqueNuit, moins, plus, plafond, plafondAucun, plafondAuPlus, plafondAuPlusParPersonne, auPlus, parPersonne, partage, exemple, aIndiquer, aIndiquerAide, consommable, consommableAide, aideToujours, aideEtiquettes, choisirEtiquettes, note, noteAide, abandonTexte, abandonNouveau, erreurs.{nomManquant, valeurManquante, plafondManquant, etiquettesManquantes}}` ; `catalogue.{titre, chercher, indication, compte {one, other}, trouves {one, other}, aucun, themes.<theme>, pictos.<cle>.{nom, mots}}`. Valeurs avec `{…}` : `place` « {nom} : place {n} sur {total} » ; `exemple` « Pour {jours}, {nuits} et {voyageurs} : {quantite}. » (pluriels de `duree.*` et `voyages.voyageurs`) ; `aideEtiquettes` « Proposée si l’une de ces étiquettes est cochée : {etiquettes}. » (catégorie), « Proposé … » (objet) ; `choisirEtiquettes` « … qui la feront proposer. » (catégorie), « … qui le feront proposer. » (objet). Apostrophes typographiques.
- Produces (`pictos.js`) : `svgPicto(cle) → string` (Duotone, `''` si inconnu), une importation `?raw` par clé de `CATALOGUE`. `paveCategorie` (`icones.js`) s'appuie dessus ; sa table de cinq pictos disparaît.
- Produces (`iconeInterface`) : `menu` (`list`), `modifier` (`pencil-simple`), `ranger` (`arrows-down-up`), `monter` (`arrow-up`), `descendre` (`arrow-down`), `chercher` (`magnifying-glass`), `bibliotheque` (`books`), `reglages` (`gear-six`), `voyages` (`suitcase-rolling`), `nouveau` (`plus-circle`).

- [ ] **Step 1: Test qui échoue** — `tests/textes-bibliotheque.test.js` : chaque clé ci-dessus existe (chaîne, ou `{ one, other }`) ; chaque clé de `CATALOGUE` a `catalogue.pictos.<cle>.nom` et `.mots` et un fichier `node_modules/@phosphor-icons/core/assets/duotone/<cle>-duotone.svg` ; `src/ecrans/pictos.js` importe chacune (lecture du source) ; chaque thème a son nom.
- [ ] **Step 2:** → rouge. **Step 3:** écrire textes et pictos (`icones.js` : en-tête mis à jour, le catalogue est arrivé). **Step 4:** `pnpm test && pnpm controles` → vert ; `tests/ecran-voyage.mjs` reste vert (pavés inchangés).
- [ ] **Step 5: Commit** — `feat(textes): textes de la bibliothèque, catalogue de 80 pictos`.

---

### Task 4: Menu, Réglages et navigation

**Files:**
- Create: `src/ecrans/menu.js`, `src/ecrans/reglages.js`, `src/styles/menu.css`, `tests/ecran-menu.mjs`
- Modify: `src/main.js`, `src/ecrans/voyages.js` (barre du haut), `tests/ecran-voyages-liste.mjs`, `tests/ecran-voyages-vide.mjs` (si leurs attendus de mise en page bougent)

**Interfaces:**
- Consumes : textes et icônes (tâche 3), `ouvrirFenetre` (`fenetre.js`).
- Produces : `barreHaut(contexte, { retour })` (`menu.js`) → bouton `[data-action="menu"]` puis, si `retour = { adresse, libelle }`, un `a.lien-retour` ; `ouvrirMenu(contexte, { courant: 'voyages' | 'reglages' })` ; contexte des écrans enrichi de `allerDepuisAccueil(adresse)` et `revenir(adresseParDefaut)` (`src/main.js`) ; `ecranReglages` (`nom: 'reglages'`, adresse `#/reglages`) avec la ligne `a.reglage[href="#/bibliotheque"]`. Styles du menu, de la barre et de Réglages repris de `maquette.css`.

- [ ] **Step 1: Test d'écran qui échoue** — `tests/ecran-menu.mjs` :
  - accueil : bouton « Menu » en haut à gauche ; menu ouvert : trois entrées dans l'ordre, « Mes voyages » `aria-current="page"` ; ×, voile, Échap et retour système le ferment (l'accueil reste, le retour suivant quitte l'appli : `sortiesDemandees` à 1) ;
  - Menu → Réglages : titre « Réglages », ligne « Bibliothèque » et son explication ; retour système → accueil ; lien « Mes voyages » → accueil ;
  - Menu → Nouveau voyage depuis Réglages : l'assistant ; « Créer le voyage » → le voyage ; retour système → l'accueil (pas Réglages) ;
  - menu ouvert depuis Réglages : « Réglages » `aria-current`, le toucher ferme seulement le menu ;
  - au téléphone 360 × 640 et 640 × 360, tablette, ordinateur, clair et sombre : `verifierCommandes`, `verifierBarres` ; captures `menu-…` et `reglages-…`.
- [ ] **Step 2:** → rouge. **Step 3:** implémenter : routes `#/reglages` (et bientôt `#/bibliotheque`) dans `ECRANS` ; `allerDepuisAccueil` remonte à l'accueil (`history.go(-profondeur)`) et, arrivé là, pose l'adresse demandée au lieu de dessiner l'accueil ; mettre à jour le commentaire « Seul l'accueil ouvre d'autres écrans » (Réglages ouvre la Bibliothèque ; le menu passe par l'accueil). **Step 4:** ce test, `tests/ecran-voyages-*.mjs`, `tests/ecran-retour*.mjs`, `tests/ecran-focus.mjs` → verts.
- [ ] **Step 5: Commit** — `feat(ecrans): menu, écran Réglages et navigation par l'accueil`.

---

### Task 5: L'écran Bibliothèque : lecture, accordéon, deux panneaux, rangement

**Files:**
- Create: `src/ecrans/bibliotheque.js`, `src/ecrans/bibliotheque-vues.js`, `src/ecrans/disposition.js`, `src/styles/bibliotheque.css`, `tests/ecran-bibliotheque.mjs`
- Modify: `src/main.js` (route `#/bibliotheque`, import du style), `src/ecrans/voyage.js` (`DEUX_PANNEAUX` importé de `disposition.js`)

**Interfaces:**
- Consumes : `stockage.lireBibliotheque`, `rangerCategories` (tâche 1) ; `deplacerCategorie` (tâche 2) ; `barreHaut`, `revenir` (tâche 4) ; `decrireRegle`, `paveCategorie`, `echapper`.
- Produces : `ecranBibliotheque` (`nom: 'bibliotheque'`) ; `DEUX_PANNEAUX` (`disposition.js`) ; repères : `section.categorie[data-categorie]` > `button.categorie-tete[data-action="accordeon"][aria-expanded]` et `button[data-action="modifier-categorie"]` ; `li.objet-modele` > `button[data-action="modifier-objet"][data-id]` ; `button[data-action="nouvel-objet"][data-id]` ; `[data-action="nouvelle-categorie"]` ; `[data-action="ranger"]`, `[data-action="terminer"]`, `[data-action="monter|descendre"][data-id]` ; `.choix[aria-current]` en deux panneaux ; zone `[aria-live]` du rangement. Les actions `modifier-*` et `nouvel*` ne font rien avant la tâche 6.

- [ ] **Step 1: Test d'écran qui échoue** — `tests/ecran-bibliotheque.mjs` (bibliothèque de départ installée par l'appli, ouverte par Menu → Réglages → Bibliothèque) :
  - titre, « 5 catégories · 17 objets », cinq cartes repliées dans l'ordre Vêtements, Toilette, Alimentation, Papiers, Camping ; Camping montre « 3 objets » et les puces Camping, Tente ;
  - Alimentation dépliée : Gourde puis Repas, « 2 par jour et par personne », « consommable », ⓘ ; dernière ligne « Ajouter un objet » ;
  - deux panneaux à 1280 × 800 : choix à gauche, Vêtements choisie, ses objets à droite ; une colonne à 800 × 1280 ;
  - rangement : « Ranger les catégories » → liste compacte, ▲ de Vêtements et ▼ de Camping `aria-disabled` ; Camping ▲ deux fois → ordre … Camping, Papiers puis … Alimentation, Camping … ; le focus reste sur le bouton ; l'annonce dit la nouvelle place ; « Terminé » → cartes dans le nouvel ordre ; le stockage a cet ordre ; retour système en rangement = « Terminé » (on reste sur la Bibliothèque) ;
  - Review Focus 4 : six appuis rapides sur ▲ → l'ordre affiché égale celui du stockage ; panne `rangerCategories` → message en haut, ordre affiché inchangé ;
  - Review Focus 1 : une catégorie d'essai nommée `<b>Été & "co"</b>` est rendue en texte (carte, libellés ▲ ▼) ;
  - retour système : Réglages, puis accueil ; lien « Réglages » → Réglages ;
  - formats de la phase × 2 thèmes : `verifierCommandes`, `verifierBarres`, captures `bibliotheque-…` et `ranger-…`.
- [ ] **Step 2:** → rouge. **Step 3:** implémenter (structure de `voyage.js` : un `AbortController` de fin d'écran, `peindre()` qui garde le focus et le défilement des panneaux, glissement des lignes déplacées) ; écritures du rangement l'une après l'autre ; garde du retour (`poserGardeRetour`) tant que le rangement est ouvert. **Step 4:** ce test et `tests/ecran-voyage-panneaux.mjs` → verts.
- [ ] **Step 5: Commit** — `feat(ecrans): écran Bibliothèque, ses deux dispositions et le rangement des catégories`.

---

### Task 6: Les fiches : catégorie, catalogue, objet

**Files:**
- Create: `src/ecrans/fiche-modele.js` (mécanique commune), `src/ecrans/fiche-categorie.js`, `src/ecrans/catalogue.js`, `src/ecrans/fiche-objet.js`, `src/styles/fiche-modele.css`, `tests/ecran-bibliotheque-fiches.mjs`
- Modify: `src/ecrans/bibliotheque.js` (ouvrir les fiches, enregistrer, relire), `src/main.js` (import du style)

**Interfaces:**
- Consumes : tâches 1 à 5 ; `ouvrirFenetre`, `demander`, `poserGardeRetour` (`fenetre.js`).
- Produces : `ouvrirFicheModele({ t, titre, sousTitre, bouton, saisie, valider, dessiner, texteAbandon, enregistrer, signal, dans })` (brouillon, segments, interrupteurs, − / +, messages sous les champs à place réservée, focus sur le premier champ fautif, ombre du pied `data-ombre`, garde d'abandon, retour système, message de panne `popover`) ; `ouvrirFicheCategorie(…)`, `ouvrirFicheObjet(…)`, `ouvrirCatalogue({ t, icone, couleur, signal }) → Promise<string | null>`. `enregistrer(saisie)` rend une promesse ; tant qu'elle court, « Enregistrer » est `aria-disabled` (Review Focus 3).

- [ ] **Step 1: Test d'écran qui échoue** — `tests/ecran-bibliotheque-fiches.mjs` :
  - fiche de Camping : nom, pavé et « Camping », nuancier (Abricot `aria-checked`), « Selon les étiquettes » coché, Camping et Tente pressées, phrase « Proposée si l’une de ces étiquettes est cochée : Camping, Tente. » ;
  - catalogue : « Changer de picto » → 80 tuiles en dix thèmes, la courante `aria-pressed` ; « tente » → `tent` ; « soleil » → Soleil et Lunettes de soleil ; « xyz » → message « Aucun picto… » ; la hauteur de la fenêtre ne change pas pendant la recherche ; une tuile touchée referme le catalogue et change le pavé de la fiche ;
  - nouvelle catégorie « Courses » en Lilas, liée à Plage : en dernier, dépliée, éclairée ; stockage à jour ; « Selon les étiquettes » sans étiquette → message, rien d'écrit ;
  - fiche de Repas : « Par jour » coché, 2, plafond inactif, « Par personne », encadré « 2 par jour et par personne » et « Pour 4 jours, 3 nuits et 2 voyageurs : 16. » ; plafond activé à 6 → « … : 12. » ; « Fixe » → plus de plafond ;
  - Review Focus 5 : valeur vidée → « Indiquez une quantité, de 1 à 999. » à sa place, rien ne bouge au-dessus ; « 0 » → 1 ; « 1000 » → 999 ; « 12a » → 12 ;
  - nouvel objet dans Alimentation : « Enregistrer » sans nom → « Donnez un nom à cet objet. » et focus sur le nom ; « Pâtes », par jour → rangé entre Gourde et Repas ;
  - abandon : Repas modifié puis ×, « Annuler », Échap, retour système → chaque fois la question ; « Continuer la saisie » garde la saisie ; « Abandonner » ferme sans écrire ; fiche non modifiée → fermeture directe ; Review Focus 2 : catalogue ouvert sur une fiche modifiée, retour système → seul le catalogue se ferme ;
  - Review Focus 3 : double appui sur « Créer la catégorie » → une seule catégorie ; panne `enregistrerCategorie` → message en haut, fiche ouverte avec sa saisie, rien d'écrit ; panne levée, second appui → une seule catégorie ;
  - rotation (1280 × 800 → 800 × 1280) fiche ouverte : la fiche et sa saisie restent ;
  - Review Focus 1 : objet nommé `<i>Pâtes</i> & "riz"` rendu en texte dans le titre de fiche et la question d'abandon ;
  - formats de la phase × 2 thèmes, fiches ouvertes : `verifierCommandes` (dans la fenêtre), pas de défilement de côté ; captures `fiche-categorie-…`, `catalogue-…`, `fiche-objet-…`, `refus-…`, `abandon-…`, `panne-…`.
- [ ] **Step 2:** → rouge. **Step 3:** implémenter (chaque fichier sous 500 lignes ; le retour système d'une fiche modifiée passe par la garde, comme l'assistant) ; après enregistrement, relire la bibliothèque, repeindre, éclairer la ligne ou la carte. **Step 4:** ce test, `tests/ecran-bibliotheque.mjs`, `tests/ecran-voyage-fiche.mjs`, `tests/ecran-fenetre-demander.mjs` → verts.
- [ ] **Step 5:** regarder soi-même les captures contre celles de la maquette (`node docs/maquettes/bibliotheque/captures.mjs`).
- [ ] **Step 6: Commit** — `feat(ecrans): fiches de catégorie et d'objet, catalogue des pictos`.

---

### Task 7: Les effets sur les voyages (critères d'acceptation)

**Files:**
- Create: `tests/ecran-bibliotheque-voyages.mjs`

**Interfaces:**
- Consumes : tout ce qui précède, par l'interface seulement.

- [ ] **Step 1: Test d'écran** (horloge fixée au 2026-10-06), tout à l'écran :
  - critère 1 : Alimentation liée à Camping, trois objets ajoutés (5 en tout) ; premier voyage, Camping cochée → l'aperçu et le voyage créé ont Alimentation et ses 5 objets ; un second voyage sans Camping n'a pas Alimentation ;
  - critère 3 : voyage créé, puis Repas renommé « Repas du soir » → le voyage montre toujours « Repas » ; un nouveau voyage montre « Repas du soir » ;
  - critère 4 : Camping rangée en tête → l'aperçu et le nouveau voyage commencent par Camping ;
  - critère 5 : objet sans nom ou sans valeur refusé avec son message (déjà vu en tâche 6 : ici, au fil du parcours complet).
- [ ] **Step 2:** lancer ; s'il est vert d'emblée, le dire dans le rapport (les tâches 1 à 6 suffisaient) ; s'il rougit, corriger au plus petit dans le fichier fautif, avec son test.
- [ ] **Step 3: Commit** — `test(ecrans): la bibliothèque modifiée nourrit les nouveaux voyages, pas les anciens`.

---

### Task 8: Vérification complète et essai sur les appareils

**Files :** aucun nouveau ; `docs/PLAN.md` n'est coché que par le chef de projet.

- [ ] **Step 1:** `pnpm verif` en tâche de fond → tout vert.
- [ ] **Step 2:** relecture de l'ensemble (une seule, et une seconde sur `edition.rs` : écritures de données) : validation et bornes seulement dans `modeles.js` ; inclusion toujours seulement dans `inclusion.js` ; phrase de quantité seulement dans `decrireRegle` ; aucun texte en dur ; fichiers sous 500 lignes ; aucune trace des phases suivantes.
- [ ] **Step 3:** essai sur la tablette, l'ASUS et le Xiaomi (mémoires « Essai sur la tablette », « Données des appareils effaçables ») : données effacées, `pnpm android:essai`, installation ; parcours menu → Réglages → Bibliothèque, une catégorie et un objet créés, rangement, un voyage créé ensuite ; portrait et paysage, clair et sombre ; retour système à chaque niveau ; remettre rotation et thème d'origine.
- [ ] **Step 4:** compte rendu au chef de projet (une quarantaine de lignes au plus) : ce qui a changé, ce qui est vérifié (commandes et résultats), aucun changement de schéma, ce qui reste à valider par lui.
