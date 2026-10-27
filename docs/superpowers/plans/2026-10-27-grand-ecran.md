# Grand écran (voyage et Bibliothèque) — plan de réalisation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sur tablette (portrait et paysage) et ordinateur, l'écran d'un voyage et la Bibliothèque passent de
« accordéon / deux panneaux » à la disposition validée le 2026-10-27 : trois colonnes dès 1340 px de large,
sinon le bloc de gauche et les catégories en tuiles compactes, la liste dessous ; téléphone inchangé.

**Architecture:** Deux requêtes, définies une seule fois dans `src/ecrans/disposition.js`
(`GRAND_FORMAT`, `TROIS_COLONNES`), choisissent le HTML (cartes de choix ou tuiles, titre de la liste
visible ou non) ; une nouvelle feuille `src/styles/grand-format.css` remplace `voyage-panneaux.css` et
porte les mêmes requêtes (un test vérifie l'égalité). Les vues produisent trois blocs communs aux deux
écrans : `.gf-gauche`, `.gf-menu`, `.gf-liste`, dans un `<main class="grand-format">`.

**Tech Stack:** JavaScript simple, Vite, CSS (grid, media queries), Playwright pour les tests d'écran,
`node --test` pour les tests unitaires, pnpm.

**Spec:** `docs/superpowers/specs/2026-10-27-grand-ecran-design.md` ; maquette validée qui fait foi :
`docs/maquettes/grand-ecran/` (`maquette.css`, `maquette.js`, `vues.js`, `bibliotheque.js`).

## Global Constraints

- Requêtes exactes : grand format `(min-width: 600px) and (min-height: 600px)` ; trois colonnes
  `(min-width: 1340px) and (min-height: 600px)` ; dans le repli, bloc de gauche et tuiles côte à côte
  `(min-width: 720px)` (CSS seulement). L'orientation n'entre plus dans aucune condition.
- Une seule définition par seuil (JS et CSS identiques, vérifié par test).
- Téléphone (petit côté < 600 px) : accordéon d'aujourd'hui, à l'identique.
- Trois colonnes : `320px 360px minmax(0, 800px)`, centrées, `column-gap: 32px` ; chaque colonne défile
  seule ; bas de chaque colonne `calc(48px + 80px)` pour le bandeau « Annuler ».
- Repli : `320px minmax(0, 1fr)` dès 720 px (une colonne entre 600 et 719), `column-gap: 24px`, marges
  latérales 24 px ; tuiles `repeat(auto-fill, minmax(190px, 1fr))`, `gap: 8px`, `min-height: 60px` ;
  liste sur toute la largeur, `margin-top: 32px`, `scroll-margin-top: 16px`.
- Liste d'objets en une seule colonne ; `h2` de la liste visible en repli seulement (Baumans 24 px),
  lu seulement (classe `lecteur`) en trois colonnes.
- Cibles de 44 px, aucun texte sous 13 px, contraste 4,5:1, clair et sombre, rien sous les barres système.
- Aucun texte nouveau (tout existe dans `src/i18n/fr.json`) ; aucun texte d'interface hors de `fr.json`.
- Fichiers d'environ 500 lignes au plus ; couches étanches ; un nom exporté est importé ailleurs.
- TDD ; pnpm seulement ; commits `type(portée): message` en français, fichiers nommés, jamais
  `CLAUDE.md` ; pas de push.

## Review Focus

1. Passer d'une disposition à l'autre dans la même page (fenêtre redimensionnée sur Debian, tablette
   tournée) garde la catégorie choisie, le filtre, les coches, et rend le focus à une commande visible.
2. Une catégorie choisie qui disparaît (supprimée, ou bouclée et descendue sous le filtre) : la première
   catégorie restante devient choisie, en tuiles comme en cartes, sans liste vide ni erreur.
3. Noms longs ou piégés (`<b>`, guillemets) dans une tuile : coupés sans déborder ni défilement de côté,
   jamais interprétés comme du HTML.
4. Clavier : Tab suit l'ordre bloc de gauche → menu → liste ; choisir une tuile au clavier garde le focus
   sur elle ; le défilement automatique du repli ne vole pas le focus.
5. Le bandeau « Annuler » ne cache jamais la dernière ligne d'une colonne (trois colonnes) ni de la page
   (repli) ; un voyage sans objet reste l'écran vide d'aujourd'hui, centré.

---

### Task 1: Requêtes communes, feuille du grand format et formats de test

**Files:**
- Modify: `src/ecrans/disposition.js` (ajoute les deux requêtes ; `DEUX_PANNEAUX` reste jusqu'à la tâche 3)
- Create: `src/styles/grand-format.css`, importé par `src/main.js` à côté de `voyage-panneaux.css` (qui
  part à la tâche 3) ; ses règles sont toutes sous `main.grand-format`, pour ne rien changer aux
  écrans encore en deux panneaux
- Create: `tests/disposition.test.js`
- Modify: `tests/outils/page.mjs` (`FORMATS`)

**Interfaces:**
- Produces: `export const GRAND_FORMAT = '(min-width: 600px) and (min-height: 600px)'` et
  `export const TROIS_COLONNES = '(min-width: 1340px) and (min-height: 600px)'` dans `disposition.js`
  (`places`, `glisser` inchangés) ; classes CSS `main.grand-format`, `.gf-gauche`, `.gf-menu`,
  `.gf-liste`, `.gf-liste-tete`, `.tuiles`, `.tuile`, `.tuile-nouvelle`, et les règles `.choix`
  (reprises de `voyage-panneaux.css`) sous `main.grand-format` ; `main.grand-format[data-colonnes="3"]`
  pour les trois colonnes (attribut posé par les vues, voir tâches 2 et 3).
- Produces (tests) : `FORMATS` gagne `portable: { width: 1366, height: 768 }` et
  `ordinateur: { width: 1920, height: 1080 }` (les trois formats existants inchangés).

- [ ] **Step 1: Test rouge** `tests/disposition.test.js` : lit `src/styles/grand-format.css` et
  vérifie que chaque `@media` qui y figure est exactement `GRAND_FORMAT`, `TROIS_COLONNES`, ou
  `${GRAND_FORMAT} and (max-width: 1339.98px)` / `... and (min-width: 720px) and (max-width: 1339.98px)` ;
  que `GRAND_FORMAT` et `TROIS_COLONNES` ont les valeurs ci-dessus. `pnpm test` → rouge (fichier
  absent, constantes absentes).
- [ ] **Step 2: Écrire** `disposition.js` (commentaire d'en-tête : les trois dispositions, les seuils,
  « mêmes requêtes dans grand-format.css ») et `grand-format.css` d'après les sections « Trois colonnes »,
  « Repli », « Les tuiles du repli », « Commun » de `docs/maquettes/grand-ecran/maquette.css`
  (valeurs des Global Constraints ; classes `ge-*` de la maquette renommées en `gf-*`).
- [ ] **Step 3:** `pnpm test` vert ; `pnpm lint`, `pnpm format:verif`, `pnpm controles` verts (le
  contrôle des exports inutilisés : les deux constantes sont importées par le test). Aucun écran ne
  change encore.
- [ ] **Step 4: Commit** `feat(disposition): requêtes et feuille du grand format, une seule définition par seuil`.

### Task 2: Écran d'un voyage en grand format

**Files:**
- Modify: `src/ecrans/voyage-vues.js` (remplace `vuePanneaux`/`vueDetail` ; ajoute la tuile)
- Modify: `src/ecrans/voyage.js` (deux `matchMedia`, défilement au toucher, focus)
- Create: `tests/ecran-voyage-grand-format.mjs` (remplace `tests/ecran-voyage-panneaux.mjs`, supprimé ;
  y reporter ses cas encore valables : tampon dans la liste, filtre, fiche et focus, coche qui ne fait pas
  remonter, rotation)
- Modify: `tests/ecran-voyage.mjs` (la tablette en portrait n'est plus en accordéon)

**Interfaces:**
- Consumes: `GRAND_FORMAT`, `TROIS_COLONNES` (tâche 1) ; classes de `grand-format.css`.
- Produces: `vueVoyage(contexte, { contenu, liste, etat, poses, grandFormat, troisColonnes })` rend
  `{ classe: 'grand-format', colonnes: 3 | 'repli', html }` en grand format (le paramètre `deuxPanneaux`
  disparaît) ; `voyage.js` pose `data-colonnes` sur `<main>`. Dans le HTML : `.gf-gauche` (en-tête,
  progression, filtre), `nav.gf-menu` contenant `ul.choix-liste > li > button.choix` (trois colonnes) ou
  `ul.tuiles > li > button.tuile` (repli), chacun `data-action="choisir" data-id aria-current` ;
  `section.gf-liste[aria-labelledby="liste-titre"]` avec `h2#liste-titre` (classe `lecteur` en trois
  colonnes) puis les lignes d'aujourd'hui.

- [ ] **Step 1: Test rouge** `tests/ecran-voyage-grand-format.mjs` (Playwright, formats `ordinateur`,
  `portable`, `tablette-paysage`, `tablette-portrait`, clair et sombre), avec la bibliothèque de départ et
  un voyage de 11 catégories (données d'essai comme `docs/maquettes/grand-ecran/donnees.js`) :
  - `ordinateur` : `main.grand-format[data-colonnes="3"]` ; trois colonnes de 320, 360 et 800 px,
    centrées (marges gauche et droite égales à 1 px près) ; `h2#liste-titre` non visible ; un seul `.choix`
    porte `aria-current="true"`, celui de la liste affichée ;
  - `portable` + 11 catégories : faire défiler `.gf-menu` jusqu'en bas ne change pas
    `getBoundingClientRect().top` de `.gf-liste` ;
  - `tablette-paysage` et `tablette-portrait` : `data-colonnes="repli"` ; tuiles (4 par rangée en
    1280, 2 en 800, mesurées par leurs `top`) ; `h2#liste-titre` visible et égal au nom choisi ; avec 11
    catégories, le haut de `.gf-liste` est dans l'écran sans défiler ;
  - toucher la tuile « Camping » : la liste montre ses objets ; `aria-current` passe à Camping ; le
    focus reste sur la tuile ;
  - Review Focus 1 : cocher, puis passer de `ordinateur` à `tablette-portrait` puis à `telephone`
    (`page.setViewportSize`) : coche gardée, catégorie choisie gardée, au téléphone l'accordéon
    d'aujourd'hui ; retour en `ordinateur` : même catégorie choisie ;
  - Review Focus 2 : sous « Reste à emballer », boucler la catégorie choisie : la suivante non bouclée
    devient choisie (tuiles et cartes) ;
  - Review Focus 3 : une catégorie nommée `Très très longue <b>catégorie</b> "piégée"` : aucune
    balise née du nom, pas de défilement de côté, tuile pas plus large que sa colonne ;
  - Review Focus 4 : en `tablette-paysage`, Tab depuis « Mes voyages » atteint le filtre, puis les
    tuiles dans l'ordre, puis la première case de la liste ;
  - Review Focus 5 : bandeau « Annuler » affiché (supprimer un objet de la bibliothèque puis revenir au
    voyage, ou `montrerAnnulation` comme dans `tests/ecran-annulation-place.mjs`), défilé en bas :
    la dernière ligne de chaque colonne (trois colonnes) et de la page (repli) n'est pas sous lui ; voyage
    sans objet : l'écran vide d'aujourd'hui ;
  - cibles de 44 px, rien sous 13 px, pas de défilement de côté (`verifierCommandes`, `verifierBarres`),
    captures dans `captures-travail/`.
  Lancer `node tests/ecran-voyage-grand-format.mjs` → rouge.
- [ ] **Step 2: Vues** dans `voyage-vues.js` : `vueTuile(contexte, affichee, toute, etat, poses)`
  (pavé, nom, compte `voyage.compte` ou petit tampon `voyage.boucle`, `data-attenuee` sous le filtre) et
  `vueGrandFormat(contexte, { liste, etat, poses }, debut, troisColonnes)` d'après
  `docs/maquettes/grand-ecran/vues.js` ; `vueChoix` reste pour les trois colonnes. Le fichier reste
  sous ~500 lignes (sinon sortir le grand format dans `src/ecrans/voyage-grand-format.js`).
- [ ] **Step 3: Écran** `voyage.js` : `matchMedia(GRAND_FORMAT)` et `matchMedia(TROIS_COLONNES)`
  redessinent au changement (comme le `DEUX_PANNEAUX` d'aujourd'hui) en gardant l'état et le focus ;
  en repli, après un choix au toucher, `allerALaListe()` : si le haut de `.gf-liste` est sous la moitié
  de l'écran, `scrollIntoView({ block: 'start', behavior })`, `behavior` à `'auto'` si l'appareil
  demande moins d'animations, sans déplacer le focus (maquette : `maquette.js`, `allerALaListe`).
- [ ] **Step 4:** adapter `tests/ecran-voyage.mjs` (tablette en portrait : tuiles et liste, plus
  d'accordéon) ; `node tests/ecran-voyage-grand-format.mjs` et `node tests/ecran-voyage.mjs` verts ;
  regarder les captures `ordinateur` et `tablette-paysage` et les comparer à
  `captures-travail/grand-ecran/a-valider/01…07` (refaites avec `node docs/maquettes/grand-ecran/captures.mjs`).
- [ ] **Step 5: Commit** `feat(voyage): trois colonnes sur grand écran, tuiles et liste dessous sur tablette`.

### Task 3: Bibliothèque en grand format

**Files:**
- Modify: `src/ecrans/bibliotheque-vues.js`, `src/ecrans/bibliotheque.js`, `src/styles/bibliotheque.css`
- Create: `tests/ecran-bibliotheque-grand-format.mjs`
- Modify: les tests de la Bibliothèque qui supposent deux panneaux ou l'accordéon en tablette portrait
  (`tests/ecran-bibliotheque*.mjs`, `tests/outils/bibliotheque.mjs`, `tests/outils/fiches.mjs` :
  `enPanneaux`, `montrerCategorie`, `ouvrirFicheCategorie`, `ouvrirNouvelleCategorie`, `ouvrirNouvelObjet`)

**Interfaces:**
- Consumes: tâche 1 ; même structure que la tâche 2 (`grand-format`, `data-colonnes`, `.gf-gauche`,
  `.gf-menu`, `.gf-liste`, `h2#liste-titre`, `.tuile`).
- Produces: `vueBibliotheque({ ...vue, grandFormat, troisColonnes })` ; en trois colonnes, chaque
  `.choix` porte dans sa carte un bouton `data-action="modifier-categorie" data-id` (nom accessible
  `bibliotheque.modifierCategorie`) avant la flèche, puis « Nouvelle catégorie » en `bouton-large` sous
  les cartes ; en repli, dernière tuile `button.tuile.tuile-nouvelle[data-action="nouvelle-categorie"]`
  et, dans `.gf-liste-tete`, le bouton « Modifier » (`bibliotheque.modifier`,
  `data-action="modifier-categorie"`) ; pas de bouton flottant en grand format ; en mode « Ranger », la
  liste de rangement d'aujourd'hui remplace `.gf-menu`.
- Produces (tests) : `tests/outils/fiches.mjs` sait ouvrir les fiches dans les trois dispositions
  (une fonction `disposition(page)` → `'telephone' | 'repli' | 'trois'` remplace `enPanneaux`).

- [ ] **Step 1: Test rouge** `tests/ecran-bibliotheque-grand-format.mjs` (formats `ordinateur`,
  `portable`, `tablette-paysage`, `tablette-portrait`, clair et sombre ; bibliothèque de départ et 11
  catégories) : mêmes mesures que la tâche 2 (colonnes, tuiles, titre, liste visible avec 11
  catégories, menu qui défile seul) ; crayon dans la carte en trois colonnes, qui ouvre la fiche de sa
  catégorie ; « Modifier » au titre de la liste en repli, qui ouvre la fiche de la catégorie choisie ;
  tuile « Nouvelle catégorie » en repli et bouton sous les cartes en trois colonnes, qui ouvrent la fiche
  neuve ; la catégorie neuve enregistrée devient choisie ; aucun `.bouton-flottant` ; « Ranger les
  catégories » remplace le menu par la liste ▲ ▼ et « Terminé » le rend ; Review Focus 2 (supprimer la
  catégorie choisie : la première restante choisie) et 3 (nom piégé) ; cibles, tailles, captures.
  → rouge.
- [ ] **Step 2: Vues et écran** d'après `docs/maquettes/grand-ecran/bibliotheque.js` et la section
  « Bibliothèque » de la spec ; `bibliotheque.js` suit les deux `matchMedia` comme la tâche 2 et le
  défilement au toucher en repli. Plus personne n'utilise les deux panneaux : supprimer `DEUX_PANNEAUX`,
  `src/styles/voyage-panneaux.css` (et son import) et la section « Deux panneaux » de
  `bibliotheque.css` ; `tests/disposition.test.js` vérifie en plus que `voyage-panneaux.css` n'existe
  plus et qu'aucun fichier de `src/` ne contient `orientation: landscape` pour ces écrans.
- [ ] **Step 3:** adapter les outils et tests de la Bibliothèque listés ci-dessus ; tous verts ;
  comparer les captures aux `a-valider/09…13`.
- [ ] **Step 4: Commit** `feat(bibliotheque): même disposition que le voyage sur tablette et ordinateur`.

### Task 4: Les autres tests d'écran, et la vérification entière

**Files:**
- Modify: les tests d'écran restants qui supposent deux panneaux ou l'accordéon sur tablette
  (`grep -l "panneaux\|tablette-portrait\|choix-liste\|panneau-droit" tests/*.mjs tests/outils/*.mjs`),
  notamment `ecran-suppressions-*.mjs`, `ecran-annulation*.mjs`, `ecran-retour*.mjs`, `ecran-menu.mjs`,
  `tests/outils/voyage-essai.mjs`.
- Modify: commentaires et documents qui décrivent encore les deux panneaux (`src/` et
  `docs/PRODUCT.md` si besoin ; pas `CLAUDE.md`).

- [ ] **Step 1:** `pnpm test:ecrans` → lister les échecs ; chacun doit venir du changement de
  disposition décidé (sinon c'est un défaut : test rouge d'abord, puis correction dans le fichier
  concerné).
- [ ] **Step 2:** adapter chaque test à la disposition validée, sans affaiblir ce qu'il vérifie.
- [ ] **Step 3:** `pnpm verif` entier vert (un échec `net::ERR_ABORTED` isolé de
  `ecran-bibliotheque-abandon.mjs` : relancer `pnpm verif` et noter les deux résultats).
- [ ] **Step 4: Commit** `test(ecrans): les écrans suivent la disposition grand format`.

### Task 5: Essais sur les appareils (contrôleur)

- [ ] Construire (`pnpm android:essai`) et installer sur la tablette SM-X210 (portrait et paysage),
  l'ASUS et le Xiaomi (téléphones : accordéon inchangé, couchés compris) ; Debian (`pnpm tauri dev`) :
  fenêtre maximisée en 1920×1080 (trois colonnes), puis rétrécie (repli, puis téléphone). Sur chacun :
  choisir une catégorie, cocher, filtre, fiche, Bibliothèque (crayon / « Modifier », nouvelle catégorie,
  Ranger), bandeau « Annuler ». Juger le thème sombre sans liaison de pilotage.
- [ ] Compte rendu au chef de projet.
