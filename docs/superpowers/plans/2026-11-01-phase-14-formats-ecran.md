# Phase 14 : tous les formats d'écran — plan de construction

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** vérifier automatiquement chaque écran et chaque couche ouverte par-dessus, à six formats et dans les deux thèmes, corriger ce qui ne passe pas aux cinq formats bloquants, rapporter le téléphone en paysage et le texte agrandi sans bloquer, et prouver que la rotation ne fait rien perdre.

**Architecture:** une petite mécanique commune (`tests/outils/grille.mjs`) parcourt une liste d'« états » (un écran amené dans une situation donnée) sur tous les formats et thèmes, avec les vérifications existantes de `tests/outils/page.mjs` (étendues, jamais affaiblies). Quatre fichiers de grille, un par famille d'écrans, gardent chacun moins de 500 lignes et tournent en parallèle dans `pnpm test:ecrans`. Les corrections sont du CSS (ou du HTML d'écran) minimal ; la grille rouge sert de test qui échoue d'abord.

**Tech Stack:** Playwright 1.62 (Chromium), Node (modules ES), Vite 6, CSS ; Tauri 2 pour les essais sur appareils. pnpm seulement.

**Spec:** `docs/superpowers/specs/2026-11-01-phase-14-formats-ecran-design.md` (décisions 1–4 et 12 du chef de projet, choix 5–11 de l'agent).

## Global Constraints

- Lire et respecter `AGENTS.md` et `CLAUDE.md` : TDD, fichiers d'environ 500 lignes au plus, une seule définition par règle, textes dans `src/i18n/fr.json`, tests d'écran jugés au code de sortie, jamais de pause fixe.
- pnpm seulement. Commits locaux sur `phase-14` autorisés ; aucun push, aucune fusion ; `git add <chemins>` explicites.
- Formats bloquants (nom dans `FORMATS` → taille) : `telephone` 393×873, `tablette-portrait` 800×1280, `tablette-paysage` 1280×800, `portable` 1366×768, `ordinateur` 1920×1080. Thèmes : `light` et `dark`.
- Format en rapport seulement : `telephone-paysage` 873×393 (décision 12). Texte agrandi : 130 %, `telephone` et `tablette-portrait`, en rapport seulement.
- Règles bloquantes : `verifierCommandes` (cibles ≥ 44 × 44 px, aucun défilement de côté) et `verifierBarres` (rien sous les barres système), plus, à `portable` et `ordinateur`, contenu principal ≤ 1544 px de large.
- Les mesures actuelles des barres simulées (`ZONES` : haut 64, bas 48, gauche 24, droite 24) ne changent pas ; aucune tolérance n'est élargie, aucun test existant n'est retiré ni affaibli (choix 5, 9).
- Grille en français seulement (choix 10). Le plafond de 1544 px vise `#app main` seulement, pas les fenêtres, le menu ouvert ni le bandeau « Annuler » (choix 11).
- Une correction ne change l'allure d'un écran validé que dans la mesure du défaut. Si elle doit aller au-delà (déplacer un bloc, changer une disposition, retirer un élément), ne pas la faire : statut NEEDS_CONTEXT, avec captures avant/après dans `captures-travail/phase-14/`.
- Captures : une paire clair/sombre par écran corrigé, prise par la tâche qui le corrige, dans `captures-travail/phase-14/` (numérotées `NN-ecran-format-theme.png`).
- `pnpm verif` vert à la fin de chaque tâche.

## Review Focus

1. Une fiche ou une fenêtre plus haute que l'écran (tablette en paysage, 800 px de haut ; fiche d'objet modèle complète) : son dernier bouton s'atteint en faisant défiler la fenêtre et ne finit pas sous la barre du bas.
2. Des noms très longs (voyage, catégorie, objet, étiquette de 60 caractères, dont un mot de 30 lettres sans espace) : aucun défilement de côté, rien de coupé hors de l'écran.
3. Le bandeau « Annuler » apparu pendant qu'une fenêtre est ouverte, au format le plus bas (`tablette-paysage`, et `telephone-paysage` en rapport) : il reste entier et touchable.
4. Une rotation pendant l'ouverture animée de la fiche au téléphone : la fiche finit ouverte, à la bonne place, avec son contenu.
5. Une fenêtre Debian basse et moyenne (1000 × 560 : grand écran par la largeur, pas par la hauteur) : écran du voyage et Bibliothèque sans défilement de côté et avec des cibles de 44 px.

Les tests qui fixent ces points sont dans les tâches 4 (points 1, 2, 3, 5), 5 (points 1, 2, 3) et 6 (point 4).

---

### Task 1 : Outillage de la grille

**Files:**
- Modify: `tests/outils/page.mjs`
- Create: `tests/outils/grille.mjs`, `tests/ecran-grille-temoin.mjs`

**Interfaces:**
- Produces (dans `page.mjs`) :
  - `FORMATS['telephone-paysage'] = { width: 873, height: 393 }` ; les autres entrées inchangées.
  - `ZONES_PAR_FORMAT` (exporté, `grille.mjs` l'importe) : `{ 'telephone-paysage': { haut: 32, bas: 24, gauche: 56, droite: 56 } }`, valeurs provisoires remplacées par les mesures du Xiaomi en tâche 8 ; tout autre format prend `ZONES`.
  - `verifierBarres(page, juge, cas, zones = ZONES)` : quatrième paramètre facultatif ; appels existants inchangés.
  - `verifierLargeur(page, juge, cas, plafond = 1544)` : exige `document.querySelector('#app main').getBoundingClientRect().width <= plafond + 0.5`.
  - `creerRapport(titre)` : même interface que `creerJuge()` (`exige(condition, message)`, `conclure(titre, resume)`), mais `conclure` écrit les fautes dans `captures-travail/phase-14/rapports/<titre>.txt`, affiche `⚠ <titre> : N défaut(s) rapporté(s)` et ne touche jamais `process.exitCode`.
- Produces (dans `grille.mjs`) :
  - `FORMATS_BLOQUANTS = ['telephone', 'tablette-portrait', 'tablette-paysage', 'portable', 'ordinateur']`
  - `async parcourirGrille({ titre, etats, formats = FORMATS_BLOQUANTS, rapport = ['telephone-paysage'], juge, fabriquerRapport })` → `void` ; `juge` (par défaut `creerJuge()`, conclu à la fin) et `fabriquerRapport` (par défaut `creerRapport`) ne sont passés que par le témoin. Un état : `{ nom, adresse = '', donnees, composition, maintenant, preparer = async page => {} }`. Pour chaque format de `formats` × thème `light`/`dark` : `ouvrir` (tactile sauf `portable`/`ordinateur`), `preparer(page)`, `verifierCommandes`, `verifierBarres` avec les zones du format, `verifierLargeur` à `portable` et `ordinateur`, et aucune erreur de page ni requête sortante ; tout est jugé par un juge bloquant. Pour chaque format de `rapport` : même parcours en thème clair, jugé par `creerRapport(`${titre}-${format}`)`, et une capture `captures-travail/phase-14/rapports/<titre>-<format>-<etat>.png` de chaque état fautif. Un seul serveur (`demarrerServeur`) et un seul navigateur par appel. Le libellé `cas` de chaque faute : `${etat.nom} · ${format} · ${theme}`.

- [ ] **Step 1 : écrire `tests/ecran-grille-temoin.mjs`, le témoin à deux moitiés**

Deux états sur l'écran Réglages (`adresse: '#/reglages'`) passés à `parcourirGrille` avec un `juge` et un `fabriquerRapport` espions, qui reçoivent les fautes au lieu de les conclure :
- `propre` : rien d'ajouté → aucune faute à aucun format.
- `fautif` : `preparer` ajoute dans `#app main` un `<button style="width:30px;height:30px">x</button>` et un bloc de `width: 2000px` → au moins une faute « cibles de moins de 44 px » et une « défile de côté » à chacun des cinq formats bloquants, et des fautes dans le rapport `telephone-paysage` seulement (pas dans le juge bloquant).
Le test sort en 1 si une de ces attentes manque.

- [ ] **Step 2 : lancer `node tests/ecran-grille-temoin.mjs`** — attendu : échec (`grille.mjs` n'existe pas).

- [ ] **Step 3 : écrire les ajouts de `page.mjs` et `grille.mjs`** selon les interfaces ci-dessus.

- [ ] **Step 4 : prouver chaque moitié du témoin** : rendre `verifierCommandes` muet sur les petites cibles → le témoin rougit sur la moitié « fautif » ; faire passer `telephone-paysage` dans le juge bloquant → il rougit sur « rapport seulement » ; tout rétablir → vert. Garder les trois sorties dans le rapport de tâche.

- [ ] **Step 5 : `pnpm verif`** — attendu : vert.

- [ ] **Step 6 : commit** `test(grille): outillage des vérifications par format` (`tests/outils/page.mjs`, `tests/outils/grille.mjs`, `tests/ecran-grille-temoin.mjs`).

---

Les tâches 2 à 5 suivent toutes le même déroulé ; seuls les états changent. **Déroulé commun :**

1. Écrire le fichier de grille avec ses états (en réutilisant les aides nommées) et lancer `node tests/<fichier>`.
2. Pour chaque faute bloquante : la sortie rouge est le test qui échoue ; faire la plus petite correction (CSS de l'écran concerné, ou son HTML dans `src/ecrans/*-vues.js`) ; relancer le fichier jusqu'au vert ; prendre la paire de captures clair/sombre de l'écran corrigé. Respecter la règle « allure » des contraintes globales.
3. Les fautes du rapport `telephone-paysage` ne se corrigent pas : elles restent dans `captures-travail/phase-14/rapports/`, résumées dans le rapport de tâche (écran, faute, capture).
4. Relancer les tests d'écran existants des écrans corrigés (liste dans la tâche), puis `pnpm verif`.
5. Commit : `test(grille): <famille>` pour le fichier de grille, et `fix(<écran>): <effet>` par correction.

Fichiers des tâches 2 à 5 : chacune crée son seul fichier de grille ; les corrections touchent des CSS d'écrans différents, sauf `src/styles/socle.css`, `fenetre.css`, `fiche.css`, `annulation.css`, communs : une tâche qui doit les modifier le dit dans son rapport et relance aussi la grille des tâches déjà faites.

### Task 2 : Grille de l'accueil, du menu et des Réglages

**Files:** Create `tests/ecran-grille-accueil.mjs` ; corrections éventuelles dans `src/styles/voyages.css`, `menu.css`, `reglages.css`, `a-propos.css`, `fenetre.css`.

**Interfaces:** Consumes `parcourirGrille` (tâche 1) ; aides : `tests/outils/restaurer.mjs` (`versReglages`, `choisir`, `attendreFenetre`, `VALIDE`, `FICHIERS_REFUSES`), données de `tests/ecran-voyages-liste.mjs` et `tests/ecran-alerte.mjs`.

**États :** accueil vide (premier lancement, `composition: null`) ; liste de trois voyages ; menu « ⋮ » d'une carte ouvert ; menu principal ouvert ; « À propos » ; Réglages ; restauration : aperçu du fichier, confirmation, refus d'un fichier invalide ; alerte « Vos voyages n'ont pas pu être lus ».

**Tests existants à relancer après correction :** `ecran-voyages-*.mjs`, `ecran-menu.mjs`, `ecran-a-propos.mjs`, `ecran-reglages.mjs`, `ecran-restaurer*.mjs`, `ecran-alerte.mjs`.

- [ ] Step 1 : écrire la grille, la lancer (sortie gardée).
- [ ] Step 2 : corriger chaque faute bloquante selon le déroulé commun ; relancer jusqu'au vert.
- [ ] Step 3 : relancer les tests existants listés, puis `pnpm verif` — attendu : vert.
- [ ] Step 4 : commits.

### Task 3 : Grille de l'assistant

**Files:** Create `tests/ecran-grille-assistant.mjs` ; corrections éventuelles dans `src/styles/nouveau-voyage.css`, `assistant-apercu.css`, `assistant.css`, `assistant-questions.css`, `calendrier.css`, `changements.css`.

**Interfaces:** Consumes `parcourirGrille` ; aides : `tests/outils/assistant.mjs` (`avecBibliotheque`, `etapeAffichee`, `question`), `tests/outils/refaire.mjs` (`ouvrirEssai`, `donneesOrigine`), données de `tests/ecran-voyage-modifier.mjs`.

**États :** Informations (compteurs à 0, puis remplis avec le calendrier visible) ; chaque groupe d'étiquettes de la bibliothèque de départ (Activités, Destination, Transport, Hébergement) ; Aperçu ; question « Abandonner ce nouveau voyage ? » ; « Modifier le voyage » sur l'étape « Changements » ; « Refaire ce voyage » sur son Aperçu.

**Tests existants à relancer :** `ecran-nouveau-voyage*.mjs`, `ecran-refaire*.mjs`, `ecran-voyage-modifier.mjs`, `ecran-annulation-assistant.mjs`.

- [ ] Step 1 : écrire la grille, la lancer.
- [ ] Step 2 : corriger les fautes bloquantes ; relancer jusqu'au vert.
- [ ] Step 3 : tests existants listés, puis `pnpm verif`.
- [ ] Step 4 : commits.

### Task 4 : Grille du voyage et des Courses

**Files:** Create `tests/ecran-grille-voyage.mjs` ; corrections éventuelles dans `src/styles/voyage.css`, `voyage-mouvements.css`, `grand-format.css`, `fiche.css`, `ajustements.css`, `sortir.css`, `courses.css`, `menu-voyage.css`, `annulation.css`.

**Interfaces:** Consumes `parcourirGrille` ; aides : `tests/outils/voyage-essai.mjs` (`DONNEES`, `avecPieces`), `tests/outils/voyage-grand-format.mjs` (`DONNEES`, `cat`, `obj`), `tests/outils/ajouter.mjs`, `tests/outils/ajout-bibliotheque.mjs`, `tests/outils/courses.mjs` (`avecMarques`), `tests/outils/annulation.mjs` (`supprimerObjet`, `ouvrirAvecHorloge`).

**États :** voyage (liste au téléphone, tuiles ou trois colonnes ailleurs) ; menu « ⋮ » ouvert ; filtre « Reste à emballer » allumé ; fiche d'objet ouverte ; ajout d'un nouvel objet ; ajout depuis la bibliothèque ; objet à sortir du sac (« ! ») et sa fiche ; Courses ; fiche d'achat ; bandeau « Annuler » en bas ; **Review Focus 2** : voyage aux noms longs (nom de voyage, catégorie et objet de 60 caractères dont un mot de 30 lettres) ; **Review Focus 1** : fiche d'objet défilée jusqu'en bas à `tablette-paysage` (le dernier bouton est dans l'écran et hors de la barre du bas) ; **Review Focus 3** : bandeau « Annuler » apparu fiche ouverte.

**Review Focus 5 (bloquant, hors grille) :** dans le même fichier, l'écran du voyage ouvert à 1000 × 560 sans pointeur tactile, jugé par `verifierCommandes` seulement.

**Tests existants à relancer :** `ecran-voyage*.mjs`, `ecran-courses*.mjs`, `ecran-annulation*.mjs`.

- [ ] Step 1 : écrire la grille et le cas 1000 × 560, les lancer.
- [ ] Step 2 : corriger les fautes bloquantes ; relancer jusqu'au vert.
- [ ] Step 3 : tests existants listés, puis `pnpm verif`.
- [ ] Step 4 : commits.

### Task 5 : Grille de la Bibliothèque, des Étiquettes et des suppressions

**Files:** Create `tests/ecran-grille-bibliotheque.mjs` ; corrections éventuelles dans `src/styles/bibliotheque.css`, `fiche-modele.css`, `etiquettes.css`, `refus.css`, `annulation.css`, `grand-format.css`.

**Interfaces:** Consumes `parcourirGrille` ; aides : `tests/outils/bibliotheque.mjs` (`DONNEES`, `remplir`, `commande`), `tests/outils/fiches.mjs`, `tests/outils/etiquettes.mjs` (`DEPART`), `tests/outils/suppressions.mjs` (`donnees`, `lireRefus`), `tests/outils/mini-bibliotheque.mjs`.

**États :** Bibliothèque ; mode « Ranger les catégories » ; fiche de catégorie ; fiche d'objet modèle (règle « par semaine », « Pour qui » ouvert) défilée en bas (**Review Focus 1**) ; Étiquettes ; mode « Ranger » ; fiche de groupe ; fiche d'étiquette ; confirmation chiffrée de suppression d'une catégorie ; refus « N à régler » ; bandeau « Annuler » en bas et rangé dans une fenêtre ouverte (**Review Focus 3**) ; Bibliothèque aux noms longs (**Review Focus 2**, mêmes noms que la tâche 4) ; Bibliothèque à 1000 × 560 (**Review Focus 5**, comme la tâche 4).

**Tests existants à relancer :** `ecran-bibliotheque*.mjs`, `ecran-etiquettes*.mjs`, `ecran-suppressions*.mjs`.

- [ ] Step 1 : écrire la grille, la lancer.
- [ ] Step 2 : corriger les fautes bloquantes ; relancer jusqu'au vert.
- [ ] Step 3 : tests existants listés, puis `pnpm verif`.
- [ ] Step 4 : commits.

### Task 6 : Rotation pendant une saisie

**Files:** Create `tests/ecran-rotation-saisies.mjs` ; corrections éventuelles dans les écrans concernés (`src/ecrans/fiche*.js`, `assistant-controleur.js`, `fenetre.js`, `disposition.js`).

**Interfaces:** Consumes `FORMATS` (tâche 1), `ouvrir`, aides de `tests/outils/fiches.mjs`, `assistant.mjs`, `ajuster.mjs` (`FICHE`, `RENOMMER`), `suppressions.mjs`. Une « rotation » = `page.setViewportSize` de `tablette-portrait` vers `tablette-paysage` puis retour, et de `telephone` vers `telephone-paysage` puis retour, en attendant l'effet (`attendreQue`), jamais une pause.

**Cas (chacun aux deux appareils, dans les deux sens) :**
- fiche d'objet du voyage, champ « Renommer » avec « Gourde isot » tapé et le curseur dedans → après rotation, la fiche est ouverte, le champ vaut « Gourde isot », il a le focus ;
- fiche d'objet modèle de la Bibliothèque en création, nom « Lampe fron » tapé, règle « par jour » choisie → les deux sont conservés ;
- assistant sur l'étape « Activités » avec deux étiquettes cochées → même étape affichée, mêmes coches, rangée d'étapes sur la bonne étape ;
- fenêtre de confirmation « Abandonner ce nouveau voyage ? » ouverte → toujours ouverte, focus dedans ;
- voyage : catégorie choisie et trois coches → conservées (déjà vrai à la tablette ; ajouter `telephone` ↔ `telephone-paysage`) ;
- **Review Focus 4** : au téléphone, rotation lancée pendant l'animation d'ouverture de la fiche (sans attendre sa fin, `prefers-reduced-motion: no-preference`) → la fiche finit ouverte, entière dans l'écran, avec son contenu.

- [ ] Step 1 : écrire le test, le lancer (sortie gardée).
- [ ] Step 2 : corriger chaque cas rouge par la plus petite correction ; relancer jusqu'au vert.
- [ ] Step 3 : relancer `ecran-voyage-grand-format-gestes.mjs`, `ecran-bibliotheque-grand-format-disposition.mjs`, `ecran-nouveau-voyage*.mjs`, puis `pnpm verif`.
- [ ] Step 4 : commits (`test(rotation): …`, `fix(…): …`).

### Task 7 : Rapport du texte agrandi

**Files:** Create `tests/ecran-rapport-texte-agrandi.mjs`.

**Interfaces:** Consumes `parcourirGrille` avec `formats: []` et `rapport: ['telephone', 'tablette-portrait']`, et les états des tâches 2 à 5 : chaque fichier de grille exporte son tableau d'états (`export const ETATS`) et ne lance sa grille que lorsqu'il est exécuté directement (`import.meta.url === pathToFileURL(process.argv[1]).href`).

**Simulation :** avant chaque état, une feuille de style ajoutée agrandit de 30 % toutes les tailles de texte de l'appli (jetons `--taille-*` de `src/styles/jetons.css` et les tailles écrites en pixels ailleurs) ; la façon est au choix du constructeur (spec). **Témoin obligatoire :** le nom d'un objet du voyage mesure 17 px sans la feuille et 22,1 px (± 0,1) avec ; le test sort en 1 sinon.

- [ ] Step 1 : ajouter `export const ETATS` et la garde « exécuté directement » aux quatre fichiers de grille ; relancer l'un d'eux pour vérifier qu'il tourne toujours seul.
- [ ] Step 2 : écrire le rapport et son témoin ; vérifier que le témoin rougit si la feuille n'est pas posée.
- [ ] Step 3 : lancer ; le rapport et ses captures sont dans `captures-travail/phase-14/rapports/`. Aucune correction dans cette tâche.
- [ ] Step 4 : `pnpm verif`, commit `test(texte-agrandi): rapport à 130 %`.

### Task 8 (contrôleur) : rapports, décisions et essais sur appareils

Pas de sous-agent : c'est le contrôleur qui pilote les appareils et parle au chef de projet.

- [ ] Step 1 : relever sur le Xiaomi en paysage la taille réelle des barres (heure, encoche, boutons) ; si elle diffère des valeurs provisoires de `ZONES_PAR_FORMAT`, les remplacer et relancer les grilles (commit `test(grille): barres du téléphone en paysage mesurées`).
- [ ] Step 2 : rassembler les rapports `telephone-paysage` et texte agrandi en une liste numérotée de captures dans un seul dossier, et la montrer au chef de projet ; il choisit ce qu'on corrige (décision 12).
- [ ] Step 3 : chaque défaut retenu devient un état bloquant ordinaire (format `telephone-paysage` ajouté à `formats` pour cet état, ou cas dédié) corrigé par TDD (sous-agent) ; les autres sont écrits dans une section « Défauts acceptés » de la conception.
- [ ] Step 4 : essais sur appareils (annoncer chaque appareil au moment où on le pilote) : SM-X210 tournée dans les deux sens (catégorie, coches, saisies en cours) ; ASUS ; Xiaomi en portrait et en paysage ; clavier champ par champ sur le Xiaomi et la tablette en paysage (nom du voyage, destination, recherche et nom dans l'ajout d'objet, renommer, quantité, nom d'objet modèle, de catégorie, d'étiquette, de groupe) ; texte agrandi à 130 % sur le Xiaomi et la tablette, puis taille rétablie ; Debian : fenêtre rétrécie à la main, thème sombre par Réglages → Thème.
- [ ] Step 5 : défaut trouvé sur appareil seulement → test qui le reproduit si possible, sinon vérification manuelle décrite, puis correction.
- [ ] Step 6 : `pnpm verif` complet ; relecture finale de la branche ; reporter dans `docs/PLAN.md` (phase 14) les critères de la conception et dans la conception les défauts acceptés ; proposer les lignes de `CLAUDE.md` ; attendre la validation du chef de projet.
