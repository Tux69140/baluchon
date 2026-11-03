# Phase 15 : paquets installables et vrai voyage — plan de construction

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** fabriquer par une commande chacun des paquets légers et signés de Baluchon (Android normal et de secours, Debian, rpm, AppImage, Windows), garder les essais à l'écart des vraies données, rendre visible une base qui ne s'ouvre pas, puis vérifier la mise à jour sans perte, faire la recette en mode avion et accompagner le vrai voyage.

**Architecture:** les règles pures (numéro de version, numéro interne Android, noms des paquets, garde « à jour avec GitHub ») vivent dans `scripts/paquets/regles.mjs` et sont testées sans rien construire. Trois scripts minces (`scripts/paquets/android.mjs`, `linux.mjs`, `windows.mjs`) enchaînent les outils (Tauri, apksigner, appimagetool) et déposent les paquets dans `artifacts/`. Les retouches du projet Android régénéré (signature, nom de l'essai) passent par `scripts/projet-android.mjs`, comme le correctif Android 7. Côté Rust, `Base` sait être « en panne » avec sa cause, et le démarrage retente l'ouverture une fois.

**Tech Stack:** Tauri 2.12 (CLI et `tauri.conf.json`, dont `bundle.android.versionCode` et `bundle.android.debugApplicationIdSuffix`), Rust (rusqlite), Node (modules ES, `node:test`), Gradle/Kotlin du projet Android généré, Android SDK build-tools 36 (`apksigner`), `appimagetool` et `mksquashfs` tirés du cache de Tauri, NSIS sous Windows. pnpm seulement.

**Spec:** `docs/superpowers/specs/2026-11-03-phase-15-paquets-vrai-voyage-design.md` (décisions 1–13 et 28 du chef de projet, choix 14–27 et 29–31 de l'agent, résultats de l'essai jetable).

## Global Constraints

- Lire et respecter `AGENTS.md` et `CLAUDE.md` : TDD, fichiers d'environ 500 lignes au plus, une seule définition par règle, couches étanches, `pnpm verif` vert à la fin de chaque tâche.
- pnpm seulement (jamais npm/npx). Commits locaux sur `phase-15` autorisés, `git add <chemins>` explicites. Envoi de `phase-15` sur GitHub autorisé pendant la phase (décision 28) : seul le contrôleur le fait, en l'annonçant ; aucune fusion dans main.
- Version de référence : `package.json` (`"version"`), recopiée dans `src-tauri/Cargo.toml` ; `tauri.conf.json` la lit déjà (`"version": "../package.json"`). Première version signée : **0.1.0** ; version de l'essai de mise à jour : **0.1.1** (décision 5, choix 23).
- Numéro interne Android : `(majeur × 1 000 000 + mineur × 1 000 + correctif) × 10 + 2` pour le 64 bits, `+ 1` pour le 32 bits (choix 29) ; 0.1.0 → 10002 et 10001 ; plafond 2 100 000 000.
- Noms des paquets (dans `artifacts/`, hors git), pour la version `V` :
  `baluchon-V.apk` (64 bits, cible Tauri `aarch64`), `baluchon-V-anciens-appareils.apk` (32 bits, cible `armv7`), `baluchon-V-amd64.deb`, `baluchon-V.x86_64.rpm`, `baluchon-V-x86_64.AppImage`, `baluchon-V-x64-setup.exe`.
- Réglages de poids (choix 14), profil `[profile.release]` de `src-tauri/Cargo.toml` : `strip = true`, `lto = true`, `codegen-units = 1`, `opt-level = "s"`. **Pas** de `panic = "abort"` : une panique dans une commande ne doit pas fermer l'appli.
- AppImage (choix 15) : recompression zstd niveau 22, blocs de 1 Mo, même lanceur (runtime) que l'AppImage de Tauri. Rien d'autre retiré.
- Clé de signature réelle (choix 24) : `~/.local/share/baluchon/baluchon.jks` et `~/.local/share/baluchon/cle.properties` (clés `storeFile` et `keyAlias`), droits 600, jamais dans le dépôt ni dans la conversation. Le mot de passe est choisi par le chef de projet, tapé à chaque `pnpm paquets` et gardé seulement dans KeePass (décision du 2026-11-03, après la première fabrication). Alias `baluchon`.
- Essais à part (choix 16) : identifiant `fr.biovibralyon.baluchon.essai`, nom affiché « Baluchon essai », pour `pnpm bureau` (ordinateur) et `pnpm android:essai` (Android, installée à côté de la version signée).
- Les vraies données du chef de projet ne sont jamais touchées sans sa demande (anti-objectifs ; choix 23).
- Annoncer l'appareil piloté au moment où on le pilote, jamais avant (mémoire « annonces »).

## Review Focus

1. Clé absente, fichier de mots de passe incomplet ou mot de passe faux : `pnpm paquets` s'arrête **avant** la longue fabrication, avec un message qui dit où reposer la clé, et ne laisse aucun paquet non signé dans `artifacts/`.
2. Version mal formée dans `package.json` (« 0.1 », « 0.1.0-beta ») ou différente de celle de `Cargo.toml` : erreur claire, aucun paquet fabriqué avec un numéro faux.
3. Base illisible au démarrage (fichier abîmé, dossier non inscriptible) : l'appli ne plante pas, affiche « Vos voyages n'ont pas pu être lus… » et la cause exacte arrive dans la console de la page (donc dans le journal d'Android).
4. Version d'essai et version signée sur le même appareil : elles coexistent, chacune avec ses données ; installer, effacer ou désinstaller l'essai ne touche pas la version signée.
5. Fabrication de l'AppImage sur un poste où le cache de Tauri n'a pas encore les outils : message clair, et l'AppImage de Tauri non recompressée n'est pas présentée comme la finale.

Les tests qui fixent ces points sont dans les tâches 2 (points 1, 2, 5), 3 (point 4), 1 (point 3).

---

### Task 1 : Base en panne visible, ouverture retentée

**Files:**
- Modify: `src-tauri/src/base.rs`, `src-tauri/src/lib.rs` (fonction `run`, bloc `setup`)
- Test: dans `src-tauri/src/base.rs` (module `tests` existant)

**Interfaces:**
- Produces :
  - `pub struct Base` gardant une connexion facultative et la cause de la panne ; `Base::ouvrir(chemin: &Path) -> Result<Base, String>` inchangé pour les appelants.
  - `pub fn en_panne(cause: String) -> Base` : toute `connexion()` rend `Err(cause)`.
  - `pub fn ouvrir_ou_signaler(ouvrir: impl Fn() -> Result<Base, String>) -> Base` : essaie, attend 300 ms, réessaie une fois ; après deux échecs, écrit la cause sur la sortie d'erreur et rend `Base::en_panne("La base locale n'a pas pu s'ouvrir : <cause>")`.
  - `pub fn connexion(&self) -> Result<Connexion<'_>, String>` où `Connexion` implémente `Deref<Target = Connection>` : les appels existants (`base.connexion()?.query_row(…)`) ne changent pas.

- [ ] **Step 1 : Écrire les tests qui échouent**

```rust
#[test]
fn une_base_en_panne_rend_sa_cause_a_chaque_lecture() {
    let base = Base::en_panne("disque plein".to_owned());
    assert_eq!(base.lister_voyages().unwrap_err(), "disque plein");
}

#[test]
fn l_ouverture_est_retentee_une_fois() {
    let dossier = Dossier::nouveau();
    let essais = std::cell::Cell::new(0);
    let base = ouvrir_ou_signaler(|| {
        essais.set(essais.get() + 1);
        if essais.get() == 1 { Err("verrou".to_owned()) } else { Base::ouvrir(&dossier.chemin("b.sqlite3")) }
    });
    assert_eq!(essais.get(), 2);
    assert!(base.lister_voyages().is_ok());
}

#[test]
fn deux_echecs_donnent_une_base_en_panne_avec_la_cause() {
    let base = ouvrir_ou_signaler(|| Err("fichier abîmé".to_owned()));
    let cause = base.lister_voyages().unwrap_err();
    assert!(cause.starts_with("La base locale n'a pas pu s'ouvrir"));
    assert!(cause.contains("fichier abîmé"));
}
```

Adapter `Dossier` / `chemin` aux aides réelles de `crate::essais` (`base_jetable`, `Dossier`).

- [ ] **Step 2 : Lancer et constater l'échec** — `pnpm test:base` : échec de compilation (`en_panne`, `ouvrir_ou_signaler` inconnues).
- [ ] **Step 3 : Implémenter** dans `base.rs` : `Base { connexion: Mutex<Option<Connection>>, panne: Option<String> }`, `Connexion<'a>(MutexGuard<'a, Option<Connection>>)` avec `Deref` ; `connexion()` rend `Err(panne)` si la base est en panne. Dans `lib.rs`, `setup` fait `app.manage(ouvrir_ou_signaler(|| Base::ouvrir(&chemin)))` et ne renvoie plus d'erreur pour la base (l'erreur de `chemin_de_la_base` passe aussi par `en_panne`).
- [ ] **Step 4 : Lancer** — `pnpm test:base` : vert ; `pnpm verif` : vert (l'écran « Vos voyages n'ont pas pu être lus » et son `console.error` existent déjà dans `src/main.js`).
- [ ] **Step 5 : Commit** — `fix(base): une base qui ne s'ouvre pas laisse sa cause et l'ouverture est retentée`.

### Task 2 : Règles des paquets (version, numéro Android, noms, clé, GitHub)

**Files:**
- Create: `scripts/paquets/regles.mjs`
- Test: `tests/paquets.test.js`

**Interfaces:**
- Produces :
  - `lireVersion(racine: string) -> Promise<string>` : version de `package.json` ; lève si elle n'est pas `x.y.z` (entiers) ou si `src-tauri/Cargo.toml` porte une autre version (message qui cite les deux).
  - `codeVersionAndroid(version: string, architecture: 'arm64' | 'arm') -> number` (règle des Global Constraints ; lève au-delà de 2 100 000 000).
  - `nomPaquet(version: string, sorte: 'android' | 'android-anciens' | 'deb' | 'rpm' | 'appimage' | 'windows') -> string` (noms des Global Constraints).
  - `CIBLES_ANDROID` : `[{ cible: 'aarch64', architecture: 'arm64', sorte: 'android' }, { cible: 'armv7', architecture: 'arm', sorte: 'android-anciens' }]`.
  - `verifierCle(contenu: string | null, cheminProprietes: string) -> string[]` : fautes (fichier absent, clé `storeFile` / `keyAlias` / `password` manquante ou vide) ; chaque faute cite `cheminProprietes`.
  - `verifierAJourAvecGithub(git: (args: string[]) => string) -> void` : lève si la branche ne suit rien, si `git fetch` échoue (pas de réseau), ou si `HEAD..@{u}` compte des modifications en retard (reprendre la règle de Paré, `~/Documents/Evacuation/App_V2/appli/scripts/bundle-windows.mjs`).
  - `CACHE_TAURI = ~/.cache/tauri` et `outilsAppimage(cache: string) -> Promise<{ appimagetool: string, dossierOutils: string }>` : lève avec « lancer `pnpm paquets` avec le réseau ouvert : la première fabrication de Tauri remplit ce cache » si `linuxdeploy-plugin-appimage.AppImage` manque.

- [ ] **Step 1 : Écrire les tests qui échouent** (`tests/paquets.test.js`) :

```js
test('le numéro interne du 64 bits dépasse celui du 32 bits de la même version', () => {
  assert.equal(codeVersionAndroid('0.1.0', 'arm64'), 10002);
  assert.equal(codeVersionAndroid('0.1.0', 'arm'), 10001);
  assert.equal(codeVersionAndroid('0.1.1', 'arm'), 10011);
  assert.equal(codeVersionAndroid('1.2.3', 'arm64'), 10020032);
});
test('une version mal formée ou trop grande est refusée', () => {
  for (const v of ['0.1', '0.1.0-beta', 'v0.1.0', '']) assert.throws(() => codeVersionAndroid(v, 'arm64'), /0\.1\.0|x\.y\.z/);
  assert.throws(() => codeVersionAndroid('211.0.0', 'arm64'), /2 ?100 ?000 ?000/);
});
test('les noms des paquets', () => {
  assert.equal(nomPaquet('0.1.0', 'android'), 'baluchon-0.1.0.apk');
  assert.equal(nomPaquet('0.1.0', 'android-anciens'), 'baluchon-0.1.0-anciens-appareils.apk');
  assert.equal(nomPaquet('0.1.0', 'deb'), 'baluchon-0.1.0-amd64.deb');
  assert.equal(nomPaquet('0.1.0', 'rpm'), 'baluchon-0.1.0.x86_64.rpm');
  assert.equal(nomPaquet('0.1.0', 'appimage'), 'baluchon-0.1.0-x86_64.AppImage');
  assert.equal(nomPaquet('0.1.0', 'windows'), 'baluchon-0.1.0-x64-setup.exe');
});
test('package.json et Cargo.toml portent la même version', async () => {
  assert.match(await lireVersion(process.cwd()), /^\d+\.\d+\.\d+$/);
});
test('lireVersion refuse deux versions différentes', /* projet jetable : package.json 0.1.1, Cargo.toml 0.1.0 → rejet citant les deux */);
test('une clé absente ou incomplète est signalée avant toute fabrication', () => {
  assert.match(verifierCle(null, '/x/cle.properties')[0], /\/x\/cle\.properties/);
  assert.equal(verifierCle('storeFile=/a.jks\nkeyAlias=baluchon\npassword=\n', '/x').length, 1);
  assert.deepEqual(verifierCle('storeFile=/a.jks\nkeyAlias=baluchon\npassword=s3cret\n', '/x'), []);
});
test('la fabrication Windows refuse un dépôt en retard ou hors ligne', /* faux git : sans amont, fetch en échec, 3 en retard → trois messages ; à jour → ne lève pas */);
test('outilsAppimage dit quoi faire quand le cache de Tauri est vide', /* dossier vide → rejet /pnpm paquets/ */);
```

- [ ] **Step 2 : Lancer** — `pnpm test` : échec (module absent).
- [ ] **Step 3 : Implémenter** `scripts/paquets/regles.mjs` (fonctions pures, sauf `lireVersion` et `outilsAppimage` qui lisent des fichiers ; `outilsAppimage` extrait le greffon dans un dossier temporaire et rend le chemin de `appimagetool-prefix/usr/bin`, qui contient aussi `mksquashfs`).
- [ ] **Step 4 : Lancer** — `pnpm test` puis `pnpm verif` : vert.
- [ ] **Step 5 : Commit** — `feat(paquets): règles des versions, des noms et des gardes de fabrication`.

### Task 3 : Projet Android signé, essai à côté de la vraie appli

**Files:**
- Modify: `scripts/projet-android.mjs`, `tests/projet-android.test.js`, `src-tauri/tauri.conf.json`
- Create: `src-tauri/android/debug/res/values/strings.xml`

**Interfaces:**
- Consumes : rien des tâches précédentes.
- Produces : après `copierPersonnalisations(racine)`, `app/build.gradle.kts` du projet généré contient le bloc de signature (une seule fois), et `app/src/debug/res/values/strings.xml` porte « Baluchon essai » ; `verifierPersonnalisations` signale leur absence. La signature lit `keystore.properties` à la racine du projet Android **s'il existe** (sinon la version finale sort non signée, ce que `scripts/paquets/android.mjs` empêche en amont).

- [ ] **Step 1 : Écrire les tests qui échouent** dans `tests/projet-android.test.js`, sur le modèle des tests Jackson :
  - un projet tout juste recréé rougit sur « build.gradle.kts : signature absente » et « strings.xml de l'essai absent », et la copie le remet d'aplomb ;
  - copier deux fois ne double pas le bloc de signature ;
  - le bloc lit `rootProject.file("keystore.properties")`, ne fait rien si le fichier manque, et pose `signingConfig` sur le type `release` seulement ;
  - `src-tauri/tauri.conf.json` porte `bundle.android.debugApplicationIdSuffix = ".essai"`.
- [ ] **Step 2 : Lancer** — `pnpm test` : rouge.
- [ ] **Step 3 : Implémenter** : bloc Kotlin `signingConfigs { create("release") { … storePassword = keyPassword = password } }` et, dans `buildTypes.getByName("release")`, `signingConfig = signingConfigs.getByName("release")`, le tout sous `if (rootProject.file("keystore.properties").exists())`, inséré avant `\nrust {` comme `imposerJackson`. `strings.xml` de l'essai : `app_name` et `main_activity_title` = « Baluchon essai ». Ajouter la nouvelle source à `PERSONNALISATIONS` (`src-tauri/android/debug/res` → `src-tauri/gen/android/app/src/debug/res`). `tauri.conf.json` : `"android": { "debugApplicationIdSuffix": ".essai" }` dans `bundle`.
- [ ] **Step 4 : Lancer** — `pnpm test`, `pnpm verif` : vert. Puis `pnpm android:essai` construit (le contrôleur vérifie sur la SM-X210, à son passage, que « Baluchon essai » s'installe à côté d'une autre version sans la remplacer : point 4 du Review Focus).
- [ ] **Step 5 : Commit** — `feat(android): signature de la version finale et essai installé à côté`.

### Task 4 : `pnpm paquets` (Android et Linux, sur cette machine)

Une seule commande fabrique tous les paquets de l'ordinateur de travail (demande du chef de projet, 2026-11-03) : les deux paquets Android signés, puis Debian, rpm et AppImage. Windows reste à part (tâche 5), car il se fabrique sous Windows.

**Files:**
- Create: `scripts/paquets/fabriquer.mjs`
- Modify: `package.json` (`"paquets": "node scripts/paquets/fabriquer.mjs"`), `src-tauri/Cargo.toml` (profil `[profile.release]` des Global Constraints)

**Interfaces:**
- Consumes : `lireVersion`, `codeVersionAndroid`, `nomPaquet`, `CIBLES_ANDROID`, `verifierCle`, `outilsAppimage`, `CACHE_TAURI` (tâche 2) ; `copierPersonnalisations`, `verifierPersonnalisations` (tâche 3).
- Produces : dans `artifacts/`, `baluchon-V.apk` et `baluchon-V-anciens-appareils.apk` (signés), `baluchon-V-amd64.deb`, `baluchon-V.x86_64.rpm`, `baluchon-V-x86_64.AppImage` (recompressée) ; à la fin, un tableau des cinq paquets et de leur poids en Mo.

- [ ] **Step 1 : Gardes, avant toute fabrication** : `lireVersion` ; lire `~/.local/share/baluchon/cle.properties` et refuser si `verifierCle` rend des fautes (point 1 du Review Focus) ; `outilsAppimage(CACHE_TAURI)` seulement après la fabrication Linux de Tauri (le premier passage remplit le cache). Rien n'est fabriqué si une garde échoue.
- [ ] **Step 2 : Partie Android** : recréer le projet Android s'il manque (comme `scripts/android.mjs`) ; copier `cle.properties` vers `src-tauri/gen/android/keystore.properties` ; `copierPersonnalisations` puis refuser sur faute ; pour chaque entrée de `CIBLES_ANDROID` : `pnpm exec tauri android build --apk --ci --target <cible> --config '{"bundle":{"android":{"versionCode":<code>}}}'`, puis `apksigner verify` (build-tools sous `$ANDROID_HOME` ou `~/Android/Sdk`, version la plus récente), copie vers `artifacts/<nomPaquet>` ; si la vérification échoue, retirer le paquet copié. Effacer `src-tauri/gen/android/keystore.properties` à la fin, même en cas d'échec (`try/finally`).
- [ ] **Step 3 : Partie Linux** : vider `src-tauri/target/release/bundle/{deb,rpm,appimage}` ; `pnpm exec tauri build --bundles deb,rpm,appimage` ; copier deb et rpm sous leurs noms ; AppImage : `--appimage-extract` dans un dossier temporaire, lanceur = les `--appimage-offset` premiers octets du fichier de Tauri, puis `appimagetool --runtime-file <lanceur> --comp zstd --mksquashfs-opt -Xcompression-level --mksquashfs-opt 22 --mksquashfs-opt -b --mksquashfs-opt 1M <dossier> <artifacts/nom>` avec `ARCH=x86_64` et le dossier des outils en tête de `PATH` ; nettoyer le temporaire (`try/finally`).
- [ ] **Step 4 : Essai sans clé** — lancer `pnpm paquets` alors que `~/.local/share/baluchon/cle.properties` n'existe pas encore. Attendu : arrêt immédiat, message citant le chemin, rien de nouveau dans `artifacts/`.
- [ ] **Step 5 : Essai de la partie Linux** avec une clé jetable du dossier temporaire (passée par la variable d'environnement `BALUCHON_CLE`, chemin d'un autre `cle.properties` qui remplace celui par défaut ; à prévoir dans le script), puis effacer la clé et les deux paquets Android qu'elle a signés. Attendu : deb et rpm autour de 2,3 Mo, AppImage autour de 96 Mo, paquets Android autour de 7,0 et 5,5 Mo (essai jetable). Vérifier `dpkg-deb -f artifacts/baluchon-*-amd64.deb Depends` = `libwebkit2gtk-4.1-0, libgtk-3-0` (Debian 13 : `libgtk-3-0t64` fournit `libgtk-3-0`, aucune correction à faire). Inspecter le rpm (`rpm -qip` et `rpm -qlp` : nom, version, dépendances, fichiers ; choix 27). Lancer l'AppImage produite et constater que la fenêtre s'ouvre sur « Mes voyages ».
- [ ] **Step 6 : `pnpm verif`** vert (taille des fichiers et exports compris) ; **Commit** — `feat(paquets): pnpm paquets fabrique les paquets Android signés et Linux`.

La fabrication signée réelle se fait à la tâche 7, une fois la vraie clé créée.

### Task 5 : `pnpm paquets:windows`

**Files:**
- Create: `scripts/paquets/windows.mjs`
- Modify: `package.json` (`"paquets:windows": "node scripts/paquets/windows.mjs"`), `src-tauri/tauri.conf.json` (`bundle.windows.nsis.languages: ["French"]`)

**Interfaces:**
- Consumes : `lireVersion`, `nomPaquet`, `verifierAJourAvecGithub` (tâche 2).
- Produces : `artifacts/baluchon-V-x64-setup.exe`.

- [ ] **Step 1 : Écrire le script** : refuser hors Windows (`process.platform !== 'win32'` : « Le paquet Windows se fabrique sous Windows ») ; `verifierAJourAvecGithub` avec un `git` qui lance `git` sans shell ; lancer le CLI de Tauri par Node (`node node_modules/@tauri-apps/cli/tauri.js build --bundles nsis`, comme Paré : sous Windows `pnpm exec` passerait par un shell) ; copier l'installateur de `src-tauri/target/release/bundle/nsis/` (un seul `.exe` attendu, sinon erreur) vers `artifacts/<nomPaquet>`.
- [ ] **Step 2 : Essai sous Debian** : `pnpm paquets:windows` s'arrête sur le message « sous Windows ». `pnpm verif` vert.
- [ ] **Step 3 : Commit** — `feat(paquets): pnpm paquets:windows (à lancer sous Windows)`.

### Task 6 : Essais à part sur l'ordinateur, documentation des paquets

**Files:**
- Create: `src-tauri/tauri.essai.conf.json`, `docs/PAQUETS.md`, `docs/RECETTE.md`
- Modify: `package.json` (`"bureau": "tauri dev --config src-tauri/tauri.essai.conf.json"`), `src-tauri/src/lib.rs` (garde), `CLAUDE.md` (commandes), `tests/paquets.test.js`

**Interfaces:**
- Produces : `pnpm bureau` ; garde : une version de développement d'ordinateur dont l'identifiant ne finit pas par `.essai` refuse de démarrer.

- [ ] **Step 1 : Test qui échoue** (`tests/paquets.test.js`) : `tauri.essai.conf.json` porte `identifier = "fr.biovibralyon.baluchon.essai"` et `productName = "Baluchon essai"` ; le script `bureau` de `package.json` le passe à `tauri dev`.
- [ ] **Step 2 : Implémenter** le fichier, le script, et dans `setup` : `#[cfg(all(desktop, debug_assertions))]` si `app.config().identifier` ne finit pas par `.essai`, renvoyer l'erreur « Version de développement : lancer avec « pnpm bureau » pour ne pas toucher aux vraies données ».
- [ ] **Step 3 : Vérifier** — `pnpm test` vert ; `pnpm bureau` ouvre « Baluchon essai » avec ses propres données (`~/.local/share/fr.biovibralyon.baluchon.essai/`) ; `pnpm tauri dev` refuse de démarrer.
- [ ] **Step 4 : Documentation** :
  - `docs/PAQUETS.md`, en français, pour le chef de projet : chaque commande et ce qu'elle dépose dans `artifacts/` ; où vit la clé (chemins des Global Constraints) et comment la remettre en place depuis KeePass ; ce qu'il faut sous Windows (Git, Node, pnpm, Rust, dépôt cloné sur `phase-15` puis main, `pnpm install`) ; quel paquet Android prendre (normal, sinon « anciens appareils » si Android refuse).
  - `docs/RECETTE.md` : un tableau d'une ligne par user story US-1 à US-40 (numéro, intitulé court repris du PRD, appareil, date, résultat), et l'en-tête de la recette (mode avion vérifié, appareils, version).
  - `CLAUDE.md`, ligne « Commandes » : `pnpm bureau` remplace `pnpm tauri dev` ; ajouter `pnpm paquets` (Android et Linux) et `pnpm paquets:windows` (« seulement sur demande du chef de projet »).
- [ ] **Step 5 : `pnpm verif`** vert ; **Commit** — `feat(bureau): essais à part des vraies données ; docs des paquets et de la recette`.

---

Les tâches 7 à 11 reviennent au contrôleur, avec le chef de projet et les appareils ; elles ne se confient pas à un sous-agent.

### Task 7 : Vraie clé, envoi sur GitHub, fabrication de la 0.1.0

- [ ] Créer la clé (`keytool -genkeypair`, RSA 4096, validité 10 000 jours, alias `baluchon`, mot de passe choisi et tapé par le chef de projet dans son terminal) et `cle.properties` dans `~/.local/share/baluchon/` (droits 600). Dire au chef de projet où sont les deux fichiers, sans jamais afficher le mot de passe ; il les joint à une entrée KeePass et confirme (critère 3 du plan).
- [ ] `pnpm paquets` ; annoncer les poids.
- [ ] Annoncer puis envoyer `phase-15` sur GitHub ; le chef de projet lance `pnpm paquets:windows` sous Windows (`docs/PAQUETS.md`) et rapporte le poids.

### Task 8 : Installation de la 0.1.0

- [ ] SM-T550 au premier branchement : désinstaller la version de l'essai jetable et retirer `/sdcard/Download/baluchon-2026-11-03-09h52.json`.
- [ ] Ordinateur (choix 26) : copier `~/.local/share/fr.biovibralyon.baluchon/` dans le scratchpad, puis le vider ; installer le `.deb`.
- [ ] Installer le paquet normal sur la SM-X210, l'ASUS et le Xiaomi (appuyer « Installer » sur le Xiaomi), le paquet de secours sur la SM-T550 ; vérifier que `pnpm android:essai` installe « Baluchon essai » **à côté** (point 4 du Review Focus).

### Task 9 : Mise à jour sans perte (critère 2 du plan, choix 20)

- [ ] Sur la SM-X210, le Xiaomi et l'ordinateur (.deb et AppImage) : saisir un jeu qui touche tout (deux voyages, coches et pièces dans le sac, achats, objet écarté, catégorie et objet modèles modifiés, étiquette ajoutée, thème sombre), puis « Sauvegarder ».
- [ ] Passer la version à 0.1.1 (`package.json` et `Cargo.toml`), commit `chore: version 0.1.1` (avec `src-tauri/Cargo.lock`, mis à jour par `cargo update -p baluchon --manifest-path src-tauri/Cargo.toml`) ; refabriquer ; installer par-dessus sans désinstaller.
- [ ] Refaire une sauvegarde et comparer les deux fichiers : identiques hormis la date de la sauvegarde. Le chef de projet fait de même sous Windows.

### Task 10 : Recette en mode avion (critère 1 du plan, choix 21)

- [ ] Mode avion activé et vérifié ; dérouler `docs/RECETTE.md` ligne par ligne sur la SM-X210, le Xiaomi, l'ASUS et la SM-T550 ; remettre l'état d'origine des appareils.
- [ ] Le chef de projet refait la recette à la main sur l'appareil du voyage (SM-X210 ou Xiaomi).
- [ ] Effacer les données de test de l'appareil du voyage par « Effacer les données » d'Android, le dire au chef de projet. À partir de son annonce, ses données sont vraies (choix 23).

### Task 11 : Vrai voyage et clôture

- [ ] Le chef de projet prépare son prochain voyage avec Baluchon et désinstalle BagPacker (critère 4 du plan).
- [ ] Cocher les critères de la phase 15 dans `docs/PLAN.md` à sa demande, mettre à jour l'état dans `CLAUDE.md`, commit ; fusion et envoi sur main seulement sur son accord.
