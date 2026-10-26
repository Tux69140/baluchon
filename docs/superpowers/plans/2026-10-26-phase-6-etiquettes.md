# Phase 6 — Étiquettes modifiables : plan de réalisation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal :** depuis Réglages, l'écran Étiquettes permet de créer, renommer, ranger et supprimer les groupes d'étiquettes et leurs étiquettes. L'assistant « Nouveau voyage » suit ces changements, et sa rangée d'étapes défile quand les groupes sont nombreux. Les voyages existants ne bougent jamais.

**Architecture :** la base reçoit six écritures (groupe, étiquette, deux rangements, deux suppressions), sans migration ; le modèle porte la validation, dont l'unicité des noms (`src/modele/etiquettes.js`) ; l'écran suit le découpage de la Bibliothèque (`etiquettes.js` branche gestes et stockage, `etiquettes-vues.js` dessine), avec deux mécaniques partagées : la fiche de modèle (`fiche-modele.js`, qui gagne « Supprimer ») et la file des déplacements ▲ ▼, extraite de `bibliotheque.js` vers `file-ordre.js`. La rangée d'étapes de l'assistant reçoit son défilement dans `rangee-etapes.js`.

**Tech Stack :** Tauri 2, JavaScript simple, Vite 6, rusqlite 0.32, Playwright 1.62, `node --test`, Phosphor 2.1.1.

**Spec :** `docs/superpowers/specs/2026-10-26-phase-6-etiquettes-design.md` (conception validée, section « Maquettes validées »), `docs/PLAN.md` phase 6, `docs/PRD.md` (US-6 ; « Écrans et gestes », puce « Étiquettes »), maquette validée `docs/maquettes/etiquettes/` (`python3 -m http.server 8645` à la racine, puis `/docs/maquettes/etiquettes/?etat=…`). **La maquette fait foi pour l'aspect et les textes** : règles de `maquette.css`, textes de `maquette.js` et `fiches.js`, mécanique de la rangée dans `assistant.js`.

## Global Constraints

- Lire `AGENTS.md` et `CLAUDE.md` : français partout, commentaires qui disent le *pourquoi*, TDD (garder la sortie rouge dans le rapport), fichiers de 500 lignes au plus, un nom n'est exporté que s'il est importé ailleurs, aucun texte d'interface hors de `src/i18n/fr.json`.
- Couches : un écran n'importe que `src/stockage/index.js` côté stockage ; le modèle n'importe que le modèle ; seul le stockage touche `localStorage` ou Tauri.
- pnpm uniquement ; `pnpm exec prettier --write <fichiers>` après chaque écriture ; `cargo fmt` pour le Rust.
- **Commits** autorisés sur la branche `phase-6` ; fichiers nommés (`git add <chemins>`, vérifier `git diff --cached --name-only`), message `type(portée): message` en français. Jamais de push. **Aucune migration** : le schéma ne change pas (le dire dans les messages des commits de la base).
- **Rien des phases suivantes** : ni chiffrage des conséquences d'une suppression (« 7 objets perdront… »), ni bandeau « Annuler », ni filtre « Jamais proposés », ni déplacement d'une étiquette vers un autre groupe, ni place réservée pour eux.
- **Noms** : nettoyés des espaces au début et à la fin, obligatoires, 60 caractères au plus (`maxlength="60"`, comme les objets). **Uniques** sans tenir compte des majuscules (`toLocaleLowerCase(langue)` sur le nom nettoyé) ; **les accents comptent** (« Ete » ≠ « Été ») : étiquettes entre elles (tous groupes confondus), groupes entre eux ; une étiquette peut porter le nom d'un groupe. Un élément renommé ne se compare pas à lui-même (« plage » → « Plage » est permis).
- **Une étiquette appartient à un seul groupe**, qui ne se change pas. Supprimer un groupe supprime ses étiquettes ; supprimer une étiquette la retire des catégories et objets modèles, **sans rien changer d'autre** (« Selon les étiquettes » reste, même sans étiquette ; `modifieLe` des modèles inchangé). Aucune écriture ne touche une table du voyage.
- **Ordre** : groupes par `ordre`, étiquettes par `ordre` dans leur groupe ; un groupe ou une étiquette neufs prennent le plus grand rang de leur liste + 1 (0 si vide) ; seul un rangement déplace un élément existant.
- **Assistant** : un groupe sans étiquette n'est pas une étape (déjà le cas, `groupesAvecEtiquettes`). La rangée défile dès que les étapes ne tiennent plus à **52 px** chacune au téléphone (`max-width: 599px`, ronds seuls) et **104 px** ailleurs ; elle montre alors un nombre entier d'étapes qui se partagent la largeur, l'étape en cours au milieu sans dépasser les bords ; traits au gris des contours (`--contour`), trait prolongé jusqu'au bord de la fenêtre (de l'écran au téléphone) du côté des étapes cachées ; pas de barre de défilement visible. Tant que tout tient, rien ne change par rapport à la phase 4.
- **Panne d'écriture** : message en haut de l'écran, par-dessus la fiche (`alerterEnHaut`), 6 s ; la fiche reste ouverte avec sa saisie ; rien ne change à l'écran ni dans la base. Une panne pendant le rangement laisse l'ordre d'avant.
- Animations : déplacement d'une ligne 220 ms `cubic-bezier(0.22, 1, 0.36, 1)` ; éclairage de ce qui vient d'être enregistré 1 600 ms ; défilement de la rangée doux ; rien si `prefers-reduced-motion: reduce`.
- Tests d'écran jugés au code de sortie, jamais de pause fixe ; formats : `TOUS_FORMATS` de `tests/outils/bibliotheque.mjs` (dont 360 × 640, 640 × 360 et l'ordinateur) ; une capture claire et une sombre par écran touché dans `captures-travail/`.

## Review Focus

1. Noms avec `<`, `&`, `"` : rendus en texte sur les cartes, les puces, les titres de fiche, les confirmations, les libellés ▲ ▼, la rangée et le titre d'étape de l'assistant (tâches 4, 5, 6).
2. Unicité aux limites : « ␣Plage␣ » contre « Plage » refusé ; « plage » pour l'étiquette « Plage » elle-même accepté ; « Ete » à côté de « Été » accepté ; « Camping » comme étiquette d'un groupe « Camping » accepté (tâche 2).
3. Suppression de la seule étiquette d'une catégorie « Selon les étiquettes » : la catégorie n'entre plus dans l'aperçu ; sa fiche montre « Selon les étiquettes » sans puce cochée et refuse d'enregistrer en l'état ; un voyage créé avant est identique (tâche 7).
4. Appuis rapides sur ▲ / ▼ mêlant groupes et étiquettes, et panne au milieu : l'ordre affiché égale toujours l'ordre enregistré ; double appui sur « Créer le groupe » ou nouvel essai après panne : un seul groupe (tâches 4 et 5).
5. Assistant à 7 groupes, téléphone tourné (portrait ↔ paysage), retour à Informations puis à l'aperçu : la rangée se recalcule, l'étape en cours reste visible, chaque étape fait au moins 44 px, la page ne défile jamais de côté (tâche 6).

## Ordre et parallélisme

1 (base et stockage), 2 (modèle), 3 (textes et icônes) et 6 (rangée de l'assistant) en parallèle : aucun fichier commun. 4 (fiches) après 2 et 3. 5 (écran Étiquettes) après 1, 2 et 4. 7 (effets et critères) après 5 et 6. 8 en dernier.

---

### Task 1: Écrire les étiquettes dans la base et le stockage

**Files:**
- Create: `src-tauri/src/etiquettes.rs` (`edition.rs` est déjà proche de 270 lignes)
- Modify: `src-tauri/src/lib.rs`, `src/stockage/tauri.js`, `src/stockage/navigateur.js`, `tests/stockage-navigateur.test.js`

**Interfaces:**
- Produces (Rust, `impl Base`, types existants `GroupeEtiquettes`, `Etiquette`) :
  - `enregistrer_groupe(&self, groupe: &GroupeEtiquettes) -> Result<(), String>` : crée, ou change `nom` et `modifie_le` (le rang ne change qu'à la création) ;
  - `enregistrer_etiquette(&self, etiquette: &Etiquette) -> Result<(), String>` : crée (le groupe doit exister), ou change `nom` et `modifie_le` (groupe et rang inchangés) ;
  - `ranger_groupes(&self, ids: &[String], modifie_le: &str)` : `ids` = exactement tous les groupes ;
  - `ranger_etiquettes(&self, groupe_id: &str, ids: &[String], modifie_le: &str)` : `ids` = exactement les étiquettes de ce groupe ;
  - `supprimer_etiquette(&self, id: &str)` et `supprimer_groupe(&self, id: &str)` : un id inconnu est refusé ; les liens et les étiquettes du groupe partent par `ON DELETE CASCADE` (`PRAGMA foreign_keys = ON` déjà posé).
- Produces (commandes Tauri `enregistrer_groupe`, `enregistrer_etiquette`, `ranger_groupes`, `ranger_etiquettes`, `supprimer_etiquette`, `supprimer_groupe` ; stockage JS) : `enregistrerGroupe(groupe)`, `enregistrerEtiquette(etiquette)`, `rangerGroupes(ids, modifieLe)`, `rangerEtiquettes(groupeId, ids, modifieLe)`, `supprimerEtiquette(id)`, `supprimerGroupe(id)`. Pannes et lenteurs simulées du stockage navigateur sous ces six noms. Contrat `tests/contrat/stockage.json` inchangé.

- [ ] **Step 1: Tests Rust qui échouent** (dans `etiquettes.rs`, base jetable, contrat installé : groupes `ge-activites`, `ge-climat` ; étiquettes `et-camping`, `et-froid` ; `cm-papiers` liée à `et-camping`, `om-tshirts` à `et-froid`) :
  - `un_groupe_neuf_puis_renomme_est_relu` (rang de création gardé quand l'écran envoie un rang périmé) ;
  - `une_etiquette_neuve_puis_renommee_est_relue` (groupe et rang inchangés malgré un `groupe_id` différent envoyé) ; `une_etiquette_d_un_groupe_inconnu_est_refusee_sans_rien_ecrire` ;
  - `ranger_les_groupes_suit_l_ordre_donne` ; `ranger_les_etiquettes_suit_l_ordre_donne` ; `ranger_refuse_une_liste_incomplete_inconnue_ou_d_un_autre_groupe` (bibliothèque égale au contrat) ;
  - `supprimer_une_etiquette_la_retire_des_modeles` : `et-camping` supprimée → `cm-papiers.etiquettes` vide, `toujours_incluse` toujours `false`, son `modifie_le` inchangé ;
  - `supprimer_un_groupe_supprime_ses_etiquettes` : `ge-climat` → plus de `et-froid`, `om-tshirts.etiquettes` vide, `ge-activites` intact ;
  - `supprimer_un_inconnu_est_refuse` ; `modifier_ou_supprimer_ne_touche_pas_un_voyage` (voyage du contrat créé, `et-camping` renommée puis supprimée, `ge-activites` supprimé : `lire_voyage` rend exactement le voyage du contrat, dont son étiquette « Camping »).
- [ ] **Step 2:** `pnpm test:base` → rouge (garder la sortie).
- [ ] **Step 3:** écrire `etiquettes.rs` (une transaction par écriture, comme `edition.rs`), brancher les six commandes dans `lib.rs` et `tauri.js`.
- [ ] **Step 4: Stockage navigateur** : mêmes six opérations, mêmes refus ; supprimer retire l'id des `etiquettes` de chaque catégorie et objet modèle. Tests dans `tests/stockage-navigateur.test.js` : chaque opération relue par `lireBibliotheque` ; panne `supprimerGroupe` → rien d'écrit ; témoin : sans panne, le groupe et ses étiquettes partent.
- [ ] **Step 5:** `pnpm test:base && node --test tests/stockage-navigateur.test.js` → vert.
- [ ] **Step 6: Commit** — `feat(base): créer, renommer, ranger et supprimer groupes et étiquettes (sans changement de schéma)`.

---

### Task 2: Le modèle : valider et préparer groupes et étiquettes

**Files:**
- Create: `src/modele/etiquettes.js`, `tests/etiquettes.test.js`
- Modify: `src/modele/modeles.js` (`deplacerCategorie` devient `deplacerDansListe`), `src/ecrans/bibliotheque.js` (import), `tests/modeles.test.js`

**Interfaces:**
- Produces (`modeles.js`) : `deplacerDansListe(ids, id, sens) → ids` (même comportement que l'actuel `deplacerCategorie`, renommé : il sert aux trois listes).
- Produces (`etiquettes.js`), saisie = `{ nom }` :
  - `homonymeDeGroupe(groupes, nom, { exclu, langue }) → groupe | null` ; `homonymeDEtiquette(bibliotheque, nom, { exclu, langue }) → { etiquette, groupe } | null` (`exclu` : l'id de l'élément modifié) ;
  - `validerGroupe(saisie, { groupes, existant, langue }) → { nom?: 'nomManquant' | 'nomPris' }` ;
  - `validerEtiquette(saisie, { bibliotheque, existante, groupeId, langue }) → { nom?: 'nomManquant' | 'nomPris' | 'nomPrisIci' }` (`nomPrisIci` : l'homonyme est dans le même groupe) ;
  - `preparerGroupe(saisie, { existant, groupes, nouvelId, maintenant, langue }) → GroupeEtiquettes` et `preparerEtiquette(saisie, { existante, groupeId, bibliotheque, nouvelId, maintenant, langue }) → Etiquette` : lèvent une erreur `{ erreurs }` si la saisie n'est pas valide (comme `preparerCategorie`) ; nom nettoyé ; rang de création = plus grand rang de la liste + 1 (0 si vide) ; un existant garde `id`, `ordre` (et `groupeId`).

- [ ] **Step 1: Tests qui échouent** (`tests/etiquettes.test.js`, bibliothèque d'essai Activités [Randonnée, Camping, Plage], Climat [Chaud, Froid, Pluie], et une étiquette « Été ») :
  - nom « » ou « ␣␣ » → `nomManquant` ; « ␣plage␣ » dans Climat → `nomPris`, et `homonymeDEtiquette` rend Plage et Activités ; « PLAGE » dans Activités → `nomPrisIci` ; « plage » pour Plage elle-même → `{}` ; « Ete » → `{}` ; « Climat » comme étiquette → `{}` ;
  - groupe « climat » → `nomPris` ; « Climat » pour Climat lui-même → `{}` ; « Plage » comme groupe → `{}` ;
  - `preparerEtiquette({ nom: '␣Neige␣' }, { groupeId: Climat … })` → nom « Neige », `ordre` 3, `groupeId` de Climat ; existante renommée garde `id`, `ordre`, `groupeId` ; saisie invalide → lève, avec `erreurs` ;
  - `preparerGroupe` neuf → `ordre` 2 ; dans une bibliothèque sans groupe → 0 ;
  - `deplacerDansListe(['a','b','c'], 'c', -1)` → `['a','c','b']` ; `('a', -1)` → inchangé.
- [ ] **Step 2:** `node --test tests/etiquettes.test.js tests/modeles.test.js` → rouge.
- [ ] **Step 3:** écrire `etiquettes.js` (en-tête : renvoi à la spec de la phase 6, décision 5) ; renommer `deplacerCategorie` partout.
- [ ] **Step 4:** → vert ; `tests/ecran-bibliotheque-rangement.mjs` reste vert ; `pnpm controles`.
- [ ] **Step 5: Commit** — `feat(modele): groupes et étiquettes, noms uniques`.

---

### Task 3: Textes et icônes

**Files:**
- Create: `tests/textes-etiquettes.test.js`
- Modify: `src/i18n/fr.json`, `src/ecrans/icones.js`

**Interfaces:**
- Produces (textes, mot pour mot de la maquette ; apostrophes typographiques) :
  - `reglages.etiquettes` « Étiquettes », `reglages.etiquettesAide` « Les questions posées par « Nouveau voyage » pour bâtir la liste » ;
  - `etiquettes.{titre, groupes {one, other}, etiquettes {one, other}, aide, ranger « Ranger », rangerAide, termine, infos « {etiquettes} · étape {n} de « Nouveau voyage » », absent « Aucune étiquette · absent de « Nouveau voyage » », vide, ajouter « Ajouter une étiquette », nouveauGroupe, modifierGroupe « Modifier le groupe {nom} », modifierEtiquette « {nom}, modifier », monter, descendre, place « {nom} : place {n} sur {total} », listeEtiquettes « Étiquettes de {nom} », erreurOrdre}` ;
  - `modele.groupe.{nouveau, creer « Créer le groupe », sousTitreNeuf « Ses étiquettes s’ajoutent ensuite, dans sa carte. », aucune « Aucune étiquette », aide « Ce nom est le titre de son étape dans « Nouveau voyage ». », abandonTexte, abandonNouveau, supprimer « Supprimer le groupe », erreurs.{nomManquant « Donnez un nom à ce groupe. », nomPris « Le groupe « {nom} » existe déjà. »}}` ;
  - `modele.etiquette.{nouvelle, ajouter « Ajouter l’étiquette », dans « Dans le groupe « {groupe} » », aide, abandonTexte, abandonNouvelle, supprimer « Supprimer l’étiquette », erreurs.{nomManquant, nomPris « L’étiquette « {nom} » existe déjà, dans le groupe {groupe}. », nomPrisIci « L’étiquette « {nom} » existe déjà dans ce groupe. »}}` ;
  - `suppression.{garder « Garder », supprimer « Supprimer », etiquetteTitre « Supprimer l’étiquette « {nom} » ? », etiquetteTexte, groupeTitre « Supprimer le groupe « {nom} » ? », groupeTexte {one « Son étiquette {etiquettes} sera supprimée aussi, et son étape disparaîtra de « Nouveau voyage ». Les voyages déjà créés ne changent pas. », other « Ses étiquettes {etiquettes} seront supprimées aussi, … »}, groupeVide « Les voyages déjà créés ne changent pas. », erreur « La suppression n’a pas pu être enregistrée. Rien n’a changé ; réessayez. »}`.
- Produces (`iconeInterface`) : `supprimer` (`trash`, Bold). `etiquette` (`tag`) existe déjà.

- [ ] **Step 1: Test qui échoue** — `tests/textes-etiquettes.test.js` : chaque clé ci-dessus existe (chaîne, ou `{ one, other }`) ; `src/ecrans/icones.js` importe `trash-bold.svg`.
- [ ] **Step 2:** → rouge. **Step 3:** écrire. **Step 4:** `node --test tests/textes-etiquettes.test.js && pnpm controles` → vert.
- [ ] **Step 5: Commit** — `feat(textes): textes de l'écran Étiquettes et de ses fiches`.

---

### Task 4: Fiches de groupe et d'étiquette, « Supprimer » et sa question

**Files:**
- Create: `src/ecrans/fiche-etiquette.js`, `src/styles/etiquettes.css` (styles de l'écran et des fiches, repris de `maquette.css`), `tests/ecran-etiquettes-fiches.mjs`, `tests/pages/fiches-etiquettes.html`, `tests/pages/fiches-etiquettes.js`
- Modify: `src/ecrans/fiche-modele.js`, `src/ecrans/fenetre.js`, `src/styles/socle.css` (`.bouton-danger`), `src/main.js` (importe `etiquettes.css`)

**Interfaces:**
- Consumes : tâche 2 (`validerGroupe`, `validerEtiquette`, `homonymeDeGroupe`, `homonymeDEtiquette`), tâche 3 (textes, icône `supprimer`).
- Produces (`fiche-modele.js`) : option `supprimer: (() => Promise<boolean>) | null`. Le corps dessiné par la fiche appelante porte un bouton `[data-supprimer]` ; son appui appelle `supprimer()` (« Enregistrer » et ce bouton inactifs pendant ce temps) : `true` ferme la fiche sans question d'abandon, `false` la laisse ; une erreur levée la laisse ouverte avec `alerterEnHaut(dans, t('suppression.erreur'), signal)`.
- Produces (`fenetre.js`) : dans `demander`, un bouton `{ …, danger: true }` reçoit `class="bouton bouton-danger"` et l'icône `supprimer` devant son libellé.
- Produces (`fiche-etiquette.js`) : `ouvrirFicheGroupe({ t, langue, groupe | null, groupes, etiquettesDuGroupe, enregistrer(saisie), supprimer(), surFermeture, signal, dans })` et `ouvrirFicheEtiquette({ t, langue, etiquette | null, groupe, bibliotheque, enregistrer(saisie), supprimer(), surFermeture, signal, dans })`. Chacune : titre (le nom, ou « Nouveau groupe » / « Nouvelle étiquette »), sous-titre (spec, « Maquettes validées »), `champNom`, aide, et pour un existant la zone `.zone-suppression` ; « Entrée » dans le champ vaut « Enregistrer ». La fiche pose elle-même la question par `demander` (« Garder » d'abord, « Supprimer » `danger`, textes `suppression.*`, étiquettes d'un groupe nommées par `Intl.ListFormat(langue, { type: 'conjunction' })`) ; « Garder » rend `false` à `fiche-modele` ; « Supprimer » appelle le `supprimer()` reçu de l'écran (l'écriture, tâche 5), puis rend `true`.
- Le message `nomPris` / `nomPrisIci` se remplit avec le nom **existant** (sa casse) et son groupe, lus par `homonyme…`.

- [ ] **Step 1: Test d'écran qui échoue** — `tests/ecran-etiquettes-fiches.mjs`, sur une page d'essai `tests/pages/fiches-etiquettes.html` + `.js` (comme `tests/pages/fenetre.html`, l'écran Étiquettes n'existant pas encore) : boutons qui ouvrent chaque fiche sur une bibliothèque d'essai (Activités [Randonnée, Camping, Plage], Climat [Chaud, Froid, Pluie], un groupe vide), `enregistrer` et `supprimer` notés dans la page, une case « panne » qui les fait échouer :
  - « Nouvelle étiquette » dans Climat : « Ajouter l’étiquette » sans nom → « Donnez un nom à cette étiquette. », focus dans le champ ; « plage » → « L’étiquette « Plage » existe déjà, dans le groupe Activités. » ; le message suit chaque correction ; Entrée enregistre ;
  - fiche de Plage : « Supprimer l’étiquette » → question « Supprimer l’étiquette « Plage » ? », « Garder » la ferme et la fiche reste avec sa saisie ; « Supprimer » ferme question et fiche sans « Abandonner les modifications ? » ; panne → message en haut, fiche ouverte ;
  - fiche de Climat : la question nomme « Chaud, Froid et Pluie » ; groupe vide : seulement « Les voyages déjà créés ne changent pas. » ;
  - retour système sur la question : seule la question se ferme ; sur une fiche modifiée : « Abandonner les modifications ? » ;
  - Review Focus 1 : un groupe « <b>&"x » s'affiche en texte dans le titre de fiche et la question ;
  - formats `TOUS_FORMATS`, clair et sombre : `verifierCommandes`, `verifierBarres`, ombre du pied quand « Supprimer » est sous le pli (640 × 360) ; captures `fiche-etiquette-…`, `fiche-groupe-…`, `supprimer-…`.
- [ ] **Step 2:** → rouge. **Step 3:** implémenter. **Step 4:** ce test et `tests/ecran-bibliotheque-fiches*.mjs`, `tests/ecran-fenetre-demander.mjs` → verts.
- [ ] **Step 5: Commit** — `feat(ecrans): fiches de groupe et d'étiquette, suppression confirmée`.

---

### Task 5: L'écran Étiquettes

**Files:**
- Create: `src/ecrans/file-ordre.js`, `src/ecrans/etiquettes.js`, `src/ecrans/etiquettes-vues.js`, `tests/outils/etiquettes.mjs`, `tests/ecran-etiquettes.mjs`, `tests/ecran-etiquettes-rangement.mjs`
- Modify: `src/ecrans/bibliotheque.js` (utilise `file-ordre.js`), `src/ecrans/reglages.js`, `src/main.js` (route `#/etiquettes`)

**Interfaces:**
- Consumes : tâches 1, 2, 4 ; `etapesDe` (`src/ecrans/assistant.js`, seule définition des étapes : le rang d'un groupe dans l'assistant est sa place dans `etapesDe(bibliotheque)` + 1).
- Produces (`file-ordre.js`), la file des déplacements ▲ ▼ aujourd'hui écrite dans `bibliotheque.js` (ordre voulu en avance sur l'affiché, écritures une à une dans l'ordre des appuis, génération abandonnée après un échec, appuis ignorés pendant la relecture) :
  `creerFileOrdre({ ecrire: (cle, ids) => Promise, confirme: (cle, ids, id) => void, echec: erreur => Promise, parti: () => boolean }) → { definir(cle, ids), deplacer(cle, id, sens) }`. `definir` donne l'ordre lu (ouverture, relecture) en gardant les déplacements en attente et en ajoutant les nouveaux à la fin ; `cle` : `'categories'` pour la Bibliothèque ; `'groupes'` ou l'id d'un groupe pour les Étiquettes.
- Produces : `ecranEtiquettes` (`nom: 'etiquettes'`, adresse `#/etiquettes`), menu courant `reglages`, lien retour « Réglages » (`revenir('#/reglages')`) ; Réglages gagne la ligne `a.reglage[href="#/etiquettes"]` (picto `etiquette`).
- Vue (classes de la maquette) : `h1`, `.biblio-resume`, `p.aide.etiquettes-aide`, puce `[data-action="ranger"]`, `.groupes` > `section.groupe[data-groupe]` (`.groupe-titre b`, `.groupe-infos`, `[data-action="modifier-groupe"]`, `.groupe-vide`, `.etiquettes-liste .puce-modele[data-action="modifier-etiquette"]`, `.groupe-ajout[data-action="nouvelle-etiquette"]`), bouton flottant `[data-action="nouveau-groupe"]` ; rangement : `.rangement` > `ol.rang-arbre` > `li.rang-groupe` (ligne du groupe, puis `ol.rang-etiquettes`), boutons `[data-action="monter"|"descendre"][data-id]`, « Terminé ».

- [ ] **Step 1: Extraire la file** : `file-ordre.js` reprend la mécanique de `bibliotheque.js`, que la Bibliothèque utilise désormais. `tests/ecran-bibliotheque-rangement.mjs` (dont Review Focus 4 de la phase 5) reste vert sans changement : c'est le test de cette étape.
- [ ] **Step 2: Tests d'écran qui échouent** — `tests/ecran-etiquettes.mjs` :
  - Menu → Réglages → « Étiquettes » : titre, « 3 groupes · 9 étiquettes », trois cartes dans l'ordre avec « 3 étiquettes · étape 2 de « Nouveau voyage » », 3, 4 ; retour système → Réglages → accueil → sortie ;
  - « Nouveau groupe » « Transport » : carte en dernier, « Aucune étiquette · absent de « Nouveau voyage » », éclairée, focus sur son « Ajouter une étiquette » ; y ajouter « Train » → « étape 5 » ; double appui sur « Créer le groupe » (lenteur `enregistrerGroupe`) → un seul groupe (Review Focus 4) ;
  - renommer Plage en « Plage et baignade » : la puce change ; supprimer Pluie : la puce part, le stockage ne l'a plus ; supprimer Climat : la carte part, Hébergement passe « étape 3 » ;
  - Review Focus 1 : étiquette « <b>&"x » rendue en texte (puce, libellé de la puce, ▲ ▼) ;
  - formats `TOUS_FORMATS`, clair et sombre : cartes sur deux colonnes dès 2 × 340 px (tablette, ordinateur), une au téléphone ; `verifierCommandes`, `verifierBarres` ; captures `etiquettes-…`, `reglages-…`.
  `tests/ecran-etiquettes-rangement.mjs` : « Ranger » : ▲ du premier groupe et de la première étiquette de chaque groupe inactifs, ▼ des derniers aussi ; ▲ Hébergement puis ▲ Plage : ordre affiché et stocké, annonce « Plage : place 2 sur 3 », focus gardé ; « Terminé » rend les cartes dans le nouvel ordre ; retour système = « Terminé » ; six appuis rapides mêlés (lenteurs) puis panne : affiché = stocké, message `etiquettes.erreurOrdre` (Review Focus 4) ; capture `ranger-…`.
- [ ] **Step 3:** → rouge. **Step 4:** implémenter (`etiquettes.js` sur le modèle de `bibliotheque.js` : ids des neufs tirés à l'ouverture de la fiche, relecture après écriture, `recent` éclairé ; vues dans `etiquettes-vues.js`).
- [ ] **Step 5:** ces tests, `tests/ecran-bibliotheque*.mjs`, `tests/ecran-menu.mjs`, `tests/ecran-retour*.mjs` → verts ; `pnpm controles`.
- [ ] **Step 6: Commit** — `feat(ecrans): écran Étiquettes, création, renommage, rangement et suppression`.

---

### Task 6: La rangée d'étapes de l'assistant qui défile

**Files:**
- Create: `src/ecrans/rangee-etapes.js`, `tests/rangee-etapes.test.js`, `tests/ecran-nouveau-voyage-rangee.mjs`
- Modify: `src/ecrans/assistant-vues.js` (`vueEtapes` : `.etapes-cadre`, deux `.etapes-suite[data-cote="avant"|"apres"]`), `src/ecrans/nouveau-voyage.js` (quelques lignes : brancher la rangée), `src/styles/assistant.css`

**Interfaces:**
- Produces (`rangee-etapes.js`) :
  - `LARGEUR_MINI = { etroit: 52, large: 104 }` ;
  - `fenetreDEtapes({ nombre, courante, place, mini }) → { defile: boolean, tiennent, part, premiere }` (pure) : `tiennent = max(1, floor(place / mini))`, `defile = nombre > tiennent`, `part = place / tiennent`, `premiere = clamp(courante − floor((tiennent − 1) / 2), 0, nombre − tiennent)` (0 sans défilement) ;
  - `suivreRangee(nav, { signal }) → { centrer(courante, { doux }) }` : mesure la liste, pose `data-defile` sur `.etapes` et `--part` sur la liste, fait défiler jusqu'à `premiere * part` (instantané si `doux` est faux ou si l'appareil réduit les animations), allume `data-visible` sur la suite de chaque côté caché ; se recalcule au défilement et au changement de taille (`ResizeObserver`), s'arrête avec `signal`.
- CSS (repris de `maquette.css`, section « Assistant ») : `.fenetre .etapes { --bord: var(--retrait-fenetre) }`, `.assistant-plein .etapes` pleine largeur de l'écran (`--bord: var(--e-md)`), `.etapes[data-defile]` (liste défilante `overflow: auto hidden`, `scroll-snap-type: x mandatory`, barre masquée, `.etape { flex: 0 0 var(--part) }`, traits `--contour`), `.etapes-suite`.

- [ ] **Step 1: Tests qui échouent** — `tests/rangee-etapes.test.js` : 9 étapes, place 328, mini 52 → `tiennent` 6, `defile`, `premiere` 1 pour la courante 3, 0 pour 0, 3 pour 8 ; 5 étapes → pas de défilement, `premiere` 0 ; place 30 → `tiennent` 1.
  `tests/ecran-nouveau-voyage-rangee.mjs` (bibliothèque d'essai à 7 groupes, dont un nom « <b>&"x ») : au téléphone 360 × 640, à l'étape 1 : suite « après » seule ; après quatre « Suivant » : les deux suites, l'étape en cours visible et centrée, chaque bouton d'étape ≥ 44 px, pas de défilement de la page ; dernière étape : suite « avant » seule ; téléphone tourné en 640 × 360 puis rendu : recalcul, étape en cours visible (Review Focus 5) ; tablette 800 × 1280 et ordinateur : mêmes constats dans la fenêtre, suites touchant son bord ; bibliothèque de départ (3 groupes) : ni `data-defile` ni suite visible ; captures `assistant-rangee-…`.
- [ ] **Step 2:** → rouge. **Step 3:** implémenter. **Step 4:** ces tests et `tests/ecran-nouveau-voyage*.mjs`, `tests/assistant.test.js` → verts ; `nouveau-voyage.js` reste sous 500 lignes.
- [ ] **Step 5: Commit** — `feat(assistant): la rangée d'étapes défile quand les groupes sont nombreux`.

---

### Task 7: Les effets sur l'assistant, la bibliothèque et les voyages

**Files:**
- Create: `tests/ecran-etiquettes-effets.mjs`

**Interfaces:**
- Consumes : tout ce qui précède ; aucun code nouveau attendu (sinon, le signaler dans le rapport avant de l'écrire).

- [ ] **Step 1: Test d'écran** (critères du PLAN, Review Focus 3) :
  - créer « Transport » avec Voiture, Train : l'assistant a une étape « Transport » entre Climat et Hébergement après rangement, avec ses deux puces (critère 1) ;
  - créer un groupe vide « Saison » : aucune étape « Saison » (critère 3) ;
  - créer un voyage avec Camping, puis renommer Camping en « Bivouac » : l'en-tête du voyage montre toujours « Camping » ; la fiche d'une catégorie de la Bibliothèque montre la puce « Bivouac » (critère 2) ;
  - supprimer Camping, seule étiquette de la catégorie Camping : l'aperçu d'un nouveau voyage n'a plus la catégorie ; sa fiche montre « Selon les étiquettes » sans puce cochée et refuse d'enregistrer avec « Choisissez au moins une étiquette, ou « Toujours incluse ». » ; le voyage créé avant est identique (Review Focus 3).
- [ ] **Step 2:** → vert attendu ; un rouge révèle un défaut d'une tâche précédente : le corriger là, en TDD.
- [ ] **Step 3: Commit** — `test(ecrans): effets des étiquettes modifiées sur l'assistant et les voyages`.

---

### Task 8: Vérification d'ensemble et essais sur les appareils

- [ ] **Step 1:** `pnpm verif` → tout vert (une seule fois, en fin de travail).
- [ ] **Step 2:** captures clair/sombre relues aux formats de la phase ; comparaison avec la maquette.
- [ ] **Step 3:** `pnpm android:essai` sur la tablette SM-X210, l'ASUS (Android 7, 360 points) et le Xiaomi (données effaçables sans demander) ; Debian par `pnpm tauri dev` si le chef de projet le souhaite : créer un groupe, ses étiquettes, ranger, supprimer ; assistant à 7 groupes, portrait et paysage ; appareils remis dans leur état d'origine.
- [ ] **Step 4:** compte rendu au chef de projet (ce qui a changé, ce qui a été vérifié, ce qui reste à valider) ; critères du PLAN cochés **seulement après sa validation**.
