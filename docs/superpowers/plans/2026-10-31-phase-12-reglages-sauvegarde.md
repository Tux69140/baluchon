# Phase 12 : Réglages (thème, sauvegarde, restauration) — plan de construction

> **Pour les agents :** sous-compétence requise : superpowers:subagent-driven-development (recommandé)
> ou superpowers:executing-plans, tâche par tâche. Les étapes se cochent (`- [ ]`).

**But :** l'écran Réglages choisit le thème, dépose une sauvegarde complète dans Téléchargements et
restaure une sauvegarde après confirmation, sans jamais abîmer les données.

**Architecture :** le modèle pur (`src/modele/sauvegarde.js`) fabrique, nomme, valide et résume le
fichier ; la base Rust lit tout et remplace tout en une transaction ; le dépôt du fichier passe par
Tauri sur ordinateur et par le passage `window.BaluchonAndroid` sur Android ; thème et date de
dernière sauvegarde sont des préférences de l'appareil (`src/stockage/preferences.js`) ; l'écran
Réglages ne fait que montrer et transmettre.

**Pile :** Tauri 2, JavaScript simple, Vite, SQLite (rusqlite), Kotlin (activité Android), tests
`node --test`, `cargo test`, Playwright (`tests/ecran-*.mjs`).

**Conception (fait autorité) :** `docs/superpowers/specs/2026-10-31-phase-12-reglages-sauvegarde-design.md`.
**Maquette validée :** `docs/maquettes/reglages/` (textes : `textes.js` ; disposition : `maquette.css`,
`reglages.js`). Le code reprend ses textes et sa disposition.

## Contraintes globales

- Lire et respecter `AGENTS.md` : TDD, fichiers d'environ 500 lignes au plus, une seule définition par
  règle, couches étanches (les écrans ne connaissent que le modèle et le stockage), pnpm seulement.
- Tout texte d'interface dans `src/i18n/fr.json` (contrôle automatique) ; espaces insécables avant
  « : ? ! » et dans « ».
- `pnpm verif` vert avant la fin de chaque tâche (les tests rouges sous la charge mais verts seuls
  sont acceptés).
- Fichier : `format: "baluchon-sauvegarde"`, `version: 1`. Noms : `baluchon-AAAA-MM-JJ-HHhMM.json`,
  `baluchon-AAAA-MM-JJ-HHhMM-2.json` en cas de doublon, `baluchon-avant-restauration-AAAA-MM-JJ-HHhMM.json`
  (heure locale).
- Hors fichier : thème, filtres « Reste à emballer », date de dernière sauvegarde.
- Aucune migration.
- Barres système : n'y toucher qu'à partir d'Android 11 (`sousLesBarres` de `MainActivity.kt`).
- Commits locaux sur `phase-12` seulement ; jamais de push ni de fusion.

## Points de vigilance

1. **Fichier choisi deux fois de suite** (même fichier, ou annulation du sélecteur) : le second choix
   doit réagir (vider la valeur du champ fichier après lecture) ; annuler le sélecteur ne fait rien.
   Test : tâche 6.
2. **Sauvegarder deux fois dans la même minute** : le second fichier reçoit `-2`, jamais d'écrasement.
   Tests : tâches 1 et 3.
3. **Bandeau « Annuler » en cours** (suppression d'un voyage ou d'un objet de la bibliothèque) au moment
   de sauvegarder ou de restaurer : la sauvegarde ne fait pas disparaître « Annuler » ; la restauration
   le retire (rien à rétablir dans des données remplacées). Test : tâche 6.
4. **Sauvegarde du fichier tout juste restauré** : l'aller-retour sauvegarder → restaurer → sauvegarder
   donne un contenu identique (hors `creeLe`). Tests : tâches 2 et 7.
5. **Thème « Appareil » quand l'appareil change de thème pendant que Baluchon est ouvert** : la page et
   les barres suivent ; en « Clair » ou « Sombre » forcé, rien ne bouge. Test : tâche 4.

---

### Tâche 1 : le format de sauvegarde (modèle)

**Fichiers :**
- Créer : `src/modele/sauvegarde.js`
- Test : `tests/sauvegarde.test.js`

**Interfaces :**
- Produit :
  - `FORMAT_SAUVEGARDE = 'baluchon-sauvegarde'`, `VERSION_SAUVEGARDE = 1`.
  - `nomDeSauvegarde(date: Date, { avantRestauration = false, numero = 1 } = {}) -> string`.
  - `construireSauvegarde({ bibliotheque, voyages, langue }, creeLe: string /* ISO */) -> objet`
    `{ format, version, creeLe, langue, bibliotheque, voyages }` ; `voyages` : tableaux de
    `{ voyage, etiquettes, categories, objets, ecartes }` (forme de `lireVoyage`, voir
    `tests/contrat/stockage.json`).
  - `lireSauvegarde(texte: string) -> { ok: true, contenu: { bibliotheque, voyages, langue }, resume:
    { creeLe, voyages: number, objets: number } } | { ok: false, raison: 'abime' | 'format' | 'version' }`.

- [ ] **Étape 1 : tests qui échouent**, dans `tests/sauvegarde.test.js` :
  - `nomDeSauvegarde(new Date('2026-10-31T18:40:12'))` → `'baluchon-2026-10-31-18h40.json'` ;
    `numero: 2` → `'baluchon-2026-10-31-18h40-2.json'` ; `avantRestauration: true` →
    `'baluchon-avant-restauration-2026-10-31-18h40.json'` ; `new Date('2026-01-05T07:03')` →
    `'baluchon-2026-01-05-07h03.json'`.
  - Une sauvegarde construite depuis `tests/contrat/stockage.json` (bibliothèque + le voyage du contrat,
    `langue: 'fr'`) puis `JSON.stringify` est relue `ok`, avec `contenu` profondément égal à l'entrée
    et `resume` `{ creeLe, voyages: 1, objets: <nombre d'objets de la bibliothèque du contrat> }`.
  - Refus `abime` : texte tronqué (moitié du JSON), `''`, `'null'`, champ manquant (`objets[0].nom`
    retiré), champ mal typé (`quantite: '3'`), identifiant en double dans une même table, objet du
    voyage dont `categorieId` n'est pas une catégorie **de ce voyage**, étiquette de la bibliothèque dont
    `groupeId` est inconnu, lien d'étiquette (`categories[].etiquettes`, `objets[].etiquettes`) inconnu,
    `voyageId` d'une ligne différent de `voyage.id`, `version` non entière.
  - Refus `format` : `{"format":"autre","version":1}` et `'[1,2]'` (JSON lisible qui n'est pas une
    sauvegarde).
  - Refus `version` : `version: 2` (future), même si le reste est abîmé.
  - Voyage sans `ecartes` (version d'avant) : accepté, `ecartes` vaut `[]` dans `contenu`.

- [ ] **Étape 2 : lancer** `node --test tests/sauvegarde.test.js` — attendu : échec (module absent).

- [ ] **Étape 3 : écrire `src/modele/sauvegarde.js`.** Ordre de lecture : JSON illisible → `abime` ;
  pas un objet ou `format` différent → `format` ; `version` non entière ou < 1 → `abime` ; > 1 →
  `version` ; puis la forme. Les champs attendus et leurs types (texte, entier, booléen, entier ou
  `null`, texte ou `null`, liste de textes) sont décrits une seule fois, dans une table par sorte de
  ligne, calquée sur `tests/contrat/stockage.json` ; aucune clé en plus n'est exigée absente.

- [ ] **Étape 4 : lancer** `node --test tests/sauvegarde.test.js` puis `pnpm verif` — attendu : vert.

- [ ] **Étape 5 : commit** `feat(sauvegarde): format, nom et validation du fichier de sauvegarde`.

### Tâche 2 : lire tout et remplacer tout (base et stockage)

**Fichiers :**
- Créer : `src-tauri/src/sauvegarde.rs`, `src-tauri/src/sauvegarde_essais.rs`
- Modifier : `src-tauri/src/bibliotheque.rs` (extraire l'écriture des lignes de
  `installer_bibliotheque` dans `fn inserer_bibliotheque(tx: &Transaction, b: &Bibliotheque) ->
  Result<(), String>`), `src-tauri/src/voyages.rs` (extraire de `creer_voyage`
  `fn inserer_voyage(tx, &VoyageComplet)` et de `lire_voyage` `fn lire_voyage_de(connexion, id)`),
  `src-tauri/src/lib.rs` (commandes), `src/stockage/tauri.js`, `src/stockage/navigateur.js` (ou un
  nouveau `navigateur-sauvegarde.js` si la taille l'exige), `src/stockage/index.js`,
  `tests/ecritures-bibliotheque.test.js`.

**Interfaces :**
- Produit (Rust) : `#[serde(rename_all = "camelCase")] pub struct ContenuComplet { bibliotheque:
  Bibliotheque, voyages: Vec<VoyageComplet>, langue: String }` ; `Base::lire_tout(&self) ->
  Result<ContenuComplet, String>` ; `Base::remplacer_tout(&self, &ContenuComplet) -> Result<(), String>` ;
  commandes `lire_tout`, `remplacer_tout { contenu }`.
- Produit (stockage, les deux variantes) : `lireTout() -> Promise<{ bibliotheque, voyages, langue }>`,
  `remplacerTout(contenu) -> Promise<void>`.

- [ ] **Étape 1 : tests Rust qui échouent** (`sauvegarde_essais.rs`, sur `base_jetable`) :
  `lire_tout_rend_bibliotheque_voyages_et_langue` ; `remplacer_puis_lire_rend_le_meme_contenu`
  (contenu du contrat, deux voyages, coches, `quantite_manuelle`, `a_acheter`, `achetes`, `ecartes`) ;
  `remplacer_efface_ce_qui_n_est_pas_dans_le_contenu` (un voyage et une étiquette présents avant
  disparaissent) ; `remplacer_pose_installee_et_langue` (après, `bibliotheque_installee()` vaut `true`
  et la langue est celle du contenu) ; `une_ligne_refusee_ne_change_rien` (contenu dont un objet pointe
  vers une catégorie absente : `Err`, et `lire_tout` rend exactement l'état d'avant).
- [ ] **Étape 2 : lancer** `pnpm test:base` — attendu : échec de compilation.
- [ ] **Étape 3 : écrire.** `remplacer_tout` : une transaction ; effacer `voyage` (les cascades
  emportent le reste), les liens d'étiquettes des modèles, `objet_modele`, `categorie_modele`,
  `etiquette`, `groupe_etiquettes`, les clés `bibliotheque_installee` et `langue_bibliotheque` de
  `meta` ; réécrire avec `inserer_bibliotheque`, `inserer_voyage` ; reposer les deux clés de `meta` ;
  ne jamais toucher `schema_migrations`. `lire_tout` lit sous une seule connexion. Les deux variantes
  du stockage reçoivent les deux fonctions ; la variante navigateur respecte `panne(donnees, nom)` comme
  ses autres écritures. `remplacerTout` rejoint `ECRITURES_BIBLIOTHEQUE` (le bandeau « Annuler » de la
  bibliothèque part avec elle) ; `lireTout` rejoint les lectures de `AUTRES`.
- [ ] **Étape 4 : lancer** `pnpm test:base`, `pnpm test`, puis `pnpm verif` — attendu : vert.
- [ ] **Étape 5 : commit** `feat(sauvegarde): lire et remplacer toutes les données en une opération`.

### Tâche 3 : déposer un fichier dans Téléchargements

**Fichiers :**
- Modifier : `src-tauri/src/lib.rs` (commande, ordinateur seulement), `src-tauri/src/sauvegarde.rs`
  (écriture testable), `src-tauri/android/java/fr/biovibralyon/baluchon/MainActivity.kt`,
  `scripts/projet-android.mjs` (manifeste), `src/stockage/tauri.js`, `src/stockage/navigateur.js`,
  `src/stockage/index.js`, `tests/ecritures-bibliotheque.test.js`
- Test : `src-tauri/src/sauvegarde_essais.rs`, `tests/projet-android.test.js` (créer s'il n'existe pas)

**Interfaces :**
- Produit (stockage) : `deposerFichier(nom: string, texte: string) -> Promise<'depose' | 'existe' |
  'refuse'>` (`refuse` : autorisation d'écrire refusée, Android 7 à 9) ; une autre panne rejette la
  promesse.
- Produit (Rust) : `pub fn deposer(dossier: &Path, nom: &str, texte: &str) -> Result<&'static str,
  String>` (`"depose"` ou `"existe"`) ; commande `#[cfg(desktop)] deposer_dans_telechargements { nom,
  texte }` sur `app.path().download_dir()`.
- Produit (Android) : `window.BaluchonAndroid.deposer(numero: string, nom: string, texte: string)` ; la
  réponse arrive plus tard par `window.baluchonDepose(numero, reponse)` (`'depose' | 'existe' |
  'refuse' | 'erreur:…'`), appelée par l'activité (`evaluateJavascript`), y compris après la demande
  d'autorisation.
- Produit (`scripts/projet-android.mjs`) : le manifeste reçoit
  `WRITE_EXTERNAL_STORAGE` (`android:maxSdkVersion="28"`) et `DOWNLOAD_WITHOUT_NOTIFICATION` ;
  `verifierPersonnalisations` signale leur absence.

- [ ] **Étape 1 : tests qui échouent.** Rust : `deposer_ecrit_le_texte`,
  `deposer_ne_remplace_jamais_un_fichier_existant` (rend `"existe"`, contenu d'origine intact).
  Node : le manifeste du projet généré, passé dans la retouche, porte les deux autorisations ; une
  seconde passe ne les ajoute pas deux fois ; `verifierPersonnalisations` les réclame si absentes.
  Navigateur : `deposerFichier` garde chaque fichier (nom, texte) dans les données du navigateur,
  lisibles par les tests d'écran, et rend `'existe'` pour un nom déjà pris ; une panne programmée
  (`panne(donnees, 'deposerFichier')`) rejette ; un refus programmé rend `'refuse'`.
- [ ] **Étape 2 : lancer** `pnpm test:base` et `pnpm test` — attendu : échec.
- [ ] **Étape 3 : écrire.** Ordinateur : `OpenOptions::new().write(true).create_new(true)` ;
  `AlreadyExists` → `"existe"`. Android, recette de la conception (« Risques techniques : levés ») :
  Android 10 et plus, `MediaStore.Downloads` (un fichier de ce nom déjà visible → `existe`) ; Android 7
  à 9, autorisation (demandée si besoin, réponse dans `onRequestPermissionsResult`, refus → `refuse`),
  écriture directe sans écraser, `MediaScannerConnection.scanFile`, puis
  `DownloadManager.addCompletedDownload(nom, nom, true, "application/json", chemin, taille, false)`.
  Le travail se fait hors du fil de l'interface. `tauri.js` : `window.BaluchonAndroid?.deposer` si
  présent (promesse résolue par `baluchonDepose`), sinon `invoke('deposer_dans_telechargements')`.
  `deposerFichier` rejoint `AUTRES` (n'écrit pas dans la base).
- [ ] **Étape 4 : lancer** `pnpm verif` — attendu : vert. Puis `pnpm android:essai` construit.
- [ ] **Étape 5 : commit** `feat(sauvegarde): déposer un fichier dans Téléchargements`.

### Tâche 4 : le thème choisi et les préférences de l'appareil

**Fichiers :**
- Modifier : `src/stockage/preferences.js`, `src/stockage/tauri.js`, `src/stockage/navigateur.js`,
  `src/main.js`, `MainActivity.kt`, `tests/ecritures-bibliotheque.test.js`
- Créer : `src/ecrans/theme.js`
- Test : `tests/preferences.test.js` (créer ou compléter), `tests/ecran-theme.mjs`

**Interfaces :**
- Produit (stockage, les deux variantes, définies une fois dans `preferences.js`) :
  `lireTheme() -> 'appareil' | 'clair' | 'sombre'` (défaut et valeur inconnue : `'appareil'`),
  `ecrireTheme(choix)`, `lireDerniereSauvegarde() -> string | null` (ISO), `ecrireDerniereSauvegarde(iso)`,
  `reglerBarres(sombre: boolean)` (Tauri : `window.BaluchonAndroid?.reglerBarres` ; navigateur : rien,
  mais compté pour les tests).
- Produit (écran) : `appliquerTheme(stockage) -> void` dans `src/ecrans/theme.js` : pose
  `data-theme="light" | "dark"` sur `document.documentElement` (rien pour « appareil »), appelle
  `reglerBarres` avec le thème réellement affiché, et suit `matchMedia('(prefers-color-scheme: dark)')`
  tant que le choix est « appareil ».
- Produit (Android) : `@JavascriptInterface fun reglerBarres(sombre: Boolean)` ; sans effet sous
  Android 11 ; une fois appelé, `onConfigurationChanged` ne règle plus les barres lui-même (la page
  décide).

- [ ] **Étape 1 : tests qui échouent.** Node : aller-retour de chaque préférence ; valeur inconnue ou
  stockage refusé → défauts. Écran (`tests/ecran-theme.mjs`) : choix « Sombre » retenu après
  rechargement, appliqué avant le premier dessin (aucune capture claire entre deux) ; « Appareil » suit
  `page.emulateMedia({ colorScheme })` en direct, « Clair » forcé ne bouge pas ; `reglerBarres` reçoit
  la bonne valeur à chaque changement.
- [ ] **Étape 2 : lancer** — attendu : échec.
- [ ] **Étape 3 : écrire.** `main.js` appelle `appliquerTheme` avant tout dessin. Les préférences
  restent hors base (`localStorage`, clés `baluchon-theme`, `baluchon-derniere-sauvegarde`).
- [ ] **Étape 4 : lancer** `pnpm verif` — attendu : vert.
- [ ] **Étape 5 : commit** `feat(reglages): thème choisi sur l'appareil`.

### Tâche 5 : écran Réglages, bloc Thème et « Sauvegarder »

**Fichiers :**
- Modifier : `src/ecrans/reglages.js`, `src/i18n/fr.json`, `src/main.js` (feuille de style)
- Créer : `src/ecrans/sauvegarde.js` (les parcours Sauvegarder et Restaurer), `src/styles/reglages.css`
- Test : `tests/ecran-reglages.mjs`

**Interfaces :**
- Consomme : tâches 1 à 4.
- Produit : `sauvegarder(contexte) -> Promise<void>` dans `src/ecrans/sauvegarde.js` : `lireTout`,
  `construireSauvegarde(…, maintenant.toISOString())`, `deposerFichier` avec `numero` 1, 2, 3… tant
  que la réponse est `'existe'`, `ecrireDerniereSauvegarde`, bandeau du bas qui nomme le fichier ;
  `'refuse'` → fenêtre « Accès aux fichiers refusé » ; panne → message de panne habituel.

- [ ] **Étape 1 : tests d'écran qui échouent** (`tests/ecran-reglages.mjs`), aux formats et thèmes
  habituels (`FORMATS`, `NOMS_THEME`, cibles de 44 px, `verifierBarres`) :
  - Réglages montre Bibliothèque, Étiquettes, le bloc Thème (« Appareil » coché d'office) et le bloc
    Sauvegarde avec « Aucune sauvegarde depuis cet appareil ».
  - Toucher « Sombre » : la page passe en sombre aussitôt, le choix est coché.
  - « Sauvegarder » à `2026-10-31T18:40` : un fichier `baluchon-2026-10-31-18h40.json` déposé, lisible
    par `lireSauvegarde` ; bandeau « Sauvegarde déposée dans Téléchargements : baluchon-2026-10-31-18h40.json » ;
    ligne « Dernière sauvegarde : 31 octobre 2026, 18 h 40 ».
  - Second appui dans la même minute : `baluchon-2026-10-31-18h40-2.json`, le premier intact.
  - Refus d'autorisation programmé : fenêtre « Accès aux fichiers refusé », rien de déposé, la date ne
    change pas.
  - Un bandeau « Annuler » (suppression d'un objet de la bibliothèque) visible avant « Sauvegarder »
    reste utilisable après.
  - Disposition de la maquette : deux colonnes égales dès 700 px de large, empilées en dessous ;
    captures `reglages-…` claires et sombres.
- [ ] **Étape 2 : lancer** `node tests/ecran-reglages.mjs` — attendu : échec.
- [ ] **Étape 3 : écrire.** Textes repris de `docs/maquettes/reglages/textes.js` dans `fr.json`
  (`reglages.theme…`, `reglages.sauvegarde…`) ; segments `.segments` existants ; pictos de la
  maquette. La date s'écrit « 31 octobre 2026, 18 h 40 » (une seule fonction de formatage, dans
  `src/ecrans/format.js`). Le bandeau du bas sans bouton reprend le style du bandeau « Annuler » sans
  jamais retirer un bandeau « Annuler » en cours (s'il y en a un, le message passe par
  `annoncerEnHaut`).
- [ ] **Étape 4 : lancer** `pnpm verif` — attendu : vert ; regarder les captures soi-même.
- [ ] **Étape 5 : commit** `feat(reglages): thème et sauvegarde dans Réglages`.

### Tâche 6 : « Restaurer une sauvegarde… »

**Fichiers :**
- Modifier : `src/ecrans/sauvegarde.js`, `src/ecrans/reglages.js`, `src/i18n/fr.json`,
  `src/styles/reglages.css`
- Test : `tests/ecran-restaurer.mjs`

**Interfaces :**
- Consomme : `lireSauvegarde`, `nomDeSauvegarde({ avantRestauration: true })`, `lireTout`,
  `remplacerTout`, `deposerFichier`, `demander` (`src/ecrans/fenetre.js`).
- Produit : `restaurer(contexte, texte: string) -> Promise<void>`.

- [ ] **Étape 1 : tests d'écran qui échouent** (`setInputFiles` sur le champ fichier caché) :
  - Fichier valide (sauvegarde de 4 voyages, bibliothèque de 312 objets, créée le
    `2026-10-12T21:15`) : fenêtre « Restaurer la sauvegarde du 12 octobre 2026, 21 h 15 ? », « Elle
    contient 4 voyages et une bibliothèque de 312 objets. », boutons « Garder mes données » /
    « Restaurer » (rouge). « Garder mes données » : rien ne change, aucun fichier déposé.
  - « Restaurer » : d'abord `baluchon-avant-restauration-….json` déposé, relu `ok` et égal à l'état
    d'avant ; puis Mes voyages montre les 4 voyages et le bandeau « Sauvegarde du 12 octobre 2026
    restaurée. » ; un bandeau « Annuler » d'avant a disparu.
  - Restaurer ensuite la copie « avant restauration » ramène l'état d'avant (coches et quantités).
  - Refus : fichier tronqué, autre format, version 2 → fenêtre « Restauration impossible » avec le
    texte de la conception (décision 12) et « Rien n'a été modifié. », un seul bouton « Compris » ;
    aucun fichier déposé, données inchangées.
  - Copie préalable refusée (`'refuse'`) : « Accès aux fichiers refusé » et « Rien n'a été
    remplacé. » ; données inchangées.
  - Panne de `remplacerTout` : fenêtre « La restauration n'a pas abouti », données inchangées.
  - Choisir deux fois le même fichier : la seconde fois, la fenêtre revient ; annuler le sélecteur ne
    fait rien.
- [ ] **Étape 2 : lancer** `node tests/ecran-restaurer.mjs` — attendu : échec.
- [ ] **Étape 3 : écrire.** Champ `<input type="file" accept=".json,application/json">` caché derrière
  le bouton ; texte lu par `File.text()` ; valeur du champ vidée après chaque lecture. Ordre :
  valider → confirmer → copie préalable (s'arrête si elle n'est pas `'depose'`) → `remplacerTout` →
  `#/voyages` avec le bandeau. La date de dernière sauvegarde ne change pas.
- [ ] **Étape 4 : lancer** `pnpm verif` — attendu : vert ; regarder les captures soi-même.
- [ ] **Étape 5 : commit** `feat(reglages): restaurer une sauvegarde`.

### Tâche 7 : essais sur les appareils et documents

**Fichiers :** `CLAUDE.md` (« État »), `docs/PLAN.md` (cases de la phase 12) — à la validation seulement.

- [ ] **Étape 1 :** `pnpm verif` vert ; `pnpm android:essai`, installation sur la tablette récente,
  l'ASUS et le Xiaomi (annoncer l'appareil piloté au moment où on le pilote).
- [ ] **Étape 2 : critère de succès 5.** Sauvegarde sur la tablette, fichier copié sur l'ordinateur
  (`adb pull`), restauration dans `pnpm tauri dev` : bibliothèque et voyages identiques (comparer
  `lireTout` avant et après, hors `creeLe`).
- [ ] **Étape 3 :** sur l'ASUS (Android 7) : demande d'autorisation, fichier visible sous le raccourci
  « Téléchargements » du sélecteur, restauration ; sur la tablette et le Xiaomi : barres lisibles dans
  les trois choix de thème.
- [ ] **Étape 4 :** compte rendu au chef de projet ; documents mis à jour après sa validation ;
  commit `docs(plan): phase 12 validée par le chef de projet`.
