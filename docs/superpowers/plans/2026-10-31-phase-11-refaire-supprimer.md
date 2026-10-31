# Phase 11 : Refaire ce voyage et supprimer un voyage — plan de construction

> **Pour les agents :** sous-skill requis : superpowers:subagent-driven-development (recommandé) ou
> superpowers:executing-plans, tâche par tâche. Les étapes se suivent par cases (`- [ ]`).

**But :** chaque voyage retient les objets qu'on y écarte ; « Refaire ce voyage » rouvre l'assistant
avec voyageurs et étiquettes repris et une liste construite sur la bibliothèque actuelle (ajouts à la
main, quantités fixées et objets écartés repris) ; « Supprimer ce voyage » demande une confirmation
chiffrée puis offre « Annuler » pendant 10 s ; un menu « ⋮ » regroupe les actions sur le voyage.

**Architecture :** une nouvelle table `objet_ecarte` (migration 007) lue et écrite avec le voyage
(`contenu.ecartes`, liste triée d'identifiants d'objets modèles) ; le stockage la tient à jour dans la
même opération que chaque retrait ou rétablissement d'objet ; le modèle calcule la liste complète pour
une création et une modification. Un module pur `src/modele/refaire.js` construit l'aperçu du voyage
refait ; `genererVoyage` reste la seule copie de la bibliothèque et accepte cet aperçu. Côté écrans : un
composant `src/ecrans/menu-voyage.js` partagé par l'en-tête du voyage et les cartes, un mode « refaire »
de l'assistant (`src/ecrans/refaire-voyage.js`), et la suppression (`src/ecrans/suppression-voyage.js`).

**Pile :** JavaScript simple + Vite, Tauri 2 / Rust (rusqlite), tests `node --test`, tests d'écran
Playwright (`tests/ecran-*.mjs`, jugés au code de sortie), `cargo test`.

**Conception :** `docs/superpowers/specs/2026-10-30-phase-11-refaire-supprimer-design.md` (fait autorité ;
la lire en entier avant chaque tâche). Maquette validée : `docs/maquettes/refaire/` (`pnpm dev`, puis
`http://localhost:1430/docs/maquettes/refaire/?etat=…`) — ses textes et son dessin sont la référence
visuelle ; `menu-carte.js`, `refaire.js` et `maquette.css` sont de bons points de départ, mais ses
fichiers sont un brouillon : ne pas les importer dans l'appli.

## Contraintes globales

- Lire `AGENTS.md` et `CLAUDE.md` (ne pas les modifier) ; pnpm seulement ; TDD (sortie rouge gardée
  pour le rapport).
- Fichiers d'environ 500 lignes au plus (`pnpm controles` le vérifie : `assistant-controleur.js` en a
  437, `voyage.js` 441 — n'y ajouter que des appels) ; une seule définition par règle ; aucun écran ne
  touche SQLite ni Tauri ; le modèle reste pur.
- Tous les textes d'interface dans `src/i18n/fr.json`, repris de la maquette ; typographie française
  (« … » avec espaces insécables, apostrophe ’). Une clé devenue inutile est retirée.
- Chaque fonction ajoutée au stockage existe dans **les deux** stockages (`src/stockage/tauri.js`,
  `src/stockage/navigateur.js` ou ses voisins) et est rangée dans `AUTRES` de
  `tests/ecritures-bibliotheque.test.js` (écritures d'un voyage).
- La forme des données échangées est figée par `tests/contrat/stockage.json` (relu par les tests Rust).
- La bibliothèque n'est jamais écrite par cette phase.
- Commits locaux sur `phase-11`, fichiers nommés (`git add <chemins>`), messages `type(portée): …` en
  français, terminés par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Jamais de push.
- Tests d'écran : pas de pause fixe, on attend l'effet ; une paire de captures clair / sombre par écran
  touché, aux formats 393 × 873, 800 × 1280, 1280 × 800, 1920 × 1080, regardées avant de rendre.
- Pendant une tâche, seulement les tests touchés ; `pnpm verif` complet une fois, en tâche 10.

## Points de vigilance (chacun reçoit son test dans la tâche indiquée)

1. Un voyage d'origine qui contient un objet **retiré en attente de sortie** (quantité 0) : il n'est
   ni repris comme « ajouté à la main », ni proposé « fixé manuellement : 0 » (tâche 4).
2. Une **panne** pendant la suppression : rien n'est supprimé, le message de panne habituel s'affiche,
   on reste sur l'écran ; une panne pendant « Annuler » : le bandeau reste pour un nouvel essai (tâche 7).
3. « Annuler » touché **depuis un autre écran** que Mes voyages (le voyage d'un autre, Réglages) : le
   voyage revient, et Mes voyages le montre à sa place au retour (tâche 7).
4. Un voyage d'origine dont **seuls les ajouts à la main** restent (étiquettes qui n'appellent plus
   rien) : l'aperçu les montre et « Créer le voyage » marche ; décochés tous, l'aperçu dit « tout
   écarté » comme d'habitude (tâche 4, tâche 8).
5. Un **nom de voyage long** dans le titre du voyage, dans le titre « Refaire « … » » de l'assistant et
   dans la confirmation : jamais de débordement horizontal au téléphone (tâche 6, tâche 8).

---

### Tâche 1 : la base retient les objets écartés, et sait supprimer un voyage (migration 007)

**Fichiers :**
- Créer : `src-tauri/migrations/007_objets_ecartes.sql`
- Modifier : `src-tauri/src/base.rs` (liste des migrations, test), `src-tauri/src/voyages.rs`
  (`VoyageComplet`, `creer_voyage`, `lire_voyage`, nouveau `supprimer_voyage`), `src-tauri/src/lib.rs`
  (commande), `src/stockage/tauri.js`, `src/stockage/navigateur.js`, `tests/contrat/stockage.json`,
  `tests/ecritures-bibliotheque.test.js` (`AUTRES`)
- Tests : `src-tauri/src/base.rs`, `src-tauri/src/voyages.rs`, `tests/stockage-navigateur.test.js`

**Interfaces :**
- Produit : `VoyageComplet` porte `ecartes: string[]` (identifiants d'objets modèles, **triés**) ; en
  Rust `#[serde(default)] pub ecartes: Vec<String>` (un contenu sans la clé vaut liste vide).
  `creerVoyage(contenu)` écrit `contenu.ecartes` ; `lireVoyage(id)` les rend (vide pour un voyage
  d'avant cette phase). `supprimerVoyage(id) → Promise<void>` efface le voyage et tout ce qui en dépend
  en une opération ; un id inconnu est refusé (`Voyage inconnu : <id>`), sans rien écrire.
- « Annuler » une suppression = `creerVoyage(contenu relu avant la suppression)` : aucune autre écriture.

- [ ] **Étape 1 : tests rouges.** Rust : `la_migration_007_garde_les_voyages_sans_ecartes` (une base en
  version 6 avec un voyage se rouvre en version 7, `lire_voyage` rend `ecartes: []`) ;
  `un_voyage_cree_relit_ses_ecartes_tries` (`["m-b", "m-a"]` → `["m-a", "m-b"]`) ;
  `supprimer_un_voyage_efface_tout_ce_qui_en_depend` (étiquettes, catégories, objets, écartés : plus
  aucune ligne pour ce voyage ; l'autre voyage et la bibliothèque intacts) ;
  `supprimer_un_voyage_inconnu_est_refuse` ;
  `recreer_un_voyage_supprime_le_rend_a_l_identique` (un objet `quantite 3, dans_le_sac 4, achetes 2,
  quantite_manuelle true` et ses écartés : `lire_voyage` après suppression puis `creer_voyage` égale la
  lecture d'avant). JS : les mêmes trois derniers cas sur le stockage navigateur, plus
  `supprimerVoyage` en panne (`panne(donnees, 'supprimerVoyage')`) ne retire rien.
- [ ] **Étape 2 :** `pnpm test:base` et `node --test tests/stockage-navigateur.test.js
  tests/ecritures-bibliotheque.test.js tests/contrat.test.js` : rouges pour la raison attendue.
- [ ] **Étape 3 :** migration 007, commentaire d'en-tête qui dit pourquoi (décision 3 de la conception :
  rien n'est reconstruit pour les voyages existants) :
  ```sql
  CREATE TABLE objet_ecarte (
    voyage_id TEXT NOT NULL REFERENCES voyage (id) ON DELETE CASCADE,
    modele_id TEXT NOT NULL,
    PRIMARY KEY (voyage_id, modele_id)
  );
  ```
  `modele_id` sans contrainte vers la bibliothèque, comme `objet_du_voyage.modele_id`. Lecture
  `ORDER BY modele_id` ; navigateur : clé `objetsEcartes` (`{ voyageId, modeleId }`), `sort()`.
  `supprimer_voyage` : `DELETE FROM voyage WHERE id = ?1` (les `ON DELETE CASCADE` font le reste ;
  vérifier qu'aucune table ne l'empêche), 0 ligne → refus. Commande `supprimer_voyage` dans `lib.rs`,
  `supprimerVoyage: id => invoke('supprimer_voyage', { id })`. Contrat : `ecartes` dans l'exemple de
  voyage complet.
- [ ] **Étape 4 :** les mêmes commandes, vertes.
- [ ] **Étape 5 :** commit `feat(base): objets écartés d'un voyage et suppression d'un voyage
  (migration 007)` — le message signale l'impact sur le schéma.

### Tâche 2 : les écritures d'un objet tiennent la mémoire des écartés à jour

**Fichiers :** Modifier `src-tauri/src/ajustements.rs` (`retirer_du_voyage`, `retablir_dans_le_voyage`),
`src-tauri/src/modification.rs` (`ModificationDuVoyage`, `modifier_voyage`, `marquer_retire`,
`garder_dans_le_voyage`), `src/stockage/navigateur-voyages.js`, `src/stockage/navigateur-modification.js`,
`tests/contrat/stockage.json` ; Tests `src-tauri/src/ajustements_essais.rs`,
`src-tauri/src/modification_essais.rs`, `tests/stockage-ajustements.test.js`,
`tests/stockage-modification.test.js`.

**Interfaces :**
- Consomme : la table et `contenu.ecartes` de la tâche 1.
- Produit (aucune signature ne change, sauf la modification) :
  - `retirerDuVoyage(id)` et `marquerRetire(id, modifieLe)` : si l'objet a un `modeleId`, il entre dans
    les écartés de son voyage (`INSERT OR IGNORE`), dans la même transaction ;
  - `retablirDansLeVoyage(ajout)` et `garderDansLeVoyage(id, …)` : le `modeleId` de l'objet en sort ;
  - `ModificationDuVoyage.ecartes: string[]` (**obligatoire**, sans valeur par défaut) : la liste
    complète après la modification, qui remplace celle du voyage dans la même transaction.
  Un objet ajouté à la main (`modeleId` null) n'entre jamais dans la liste.

- [ ] **Étape 1 : tests rouges**, Rust et JS, mêmes cas : retirer un objet issu du modèle `m-1` →
  `ecartes` du voyage `["m-1"]` ; le rétablir → `[]` ; retirer un objet ajouté à la main → `[]` ;
  `marquerRetire` puis `garderDansLeVoyage` → `["m-1"]` puis `[]` ; retirer deux fois deux objets du
  même modèle (voyages différents) → chacun dans son voyage ; `modifierVoyage` avec `ecartes: ["m-2"]`
  sur un voyage qui avait `["m-1"]` → `["m-2"]` ; une modification refusée (objet d'un autre voyage) ne
  touche pas les écartés ; une modification sans la clé `ecartes` est refusée en Rust (désérialisation).
- [ ] **Étape 2 :** `pnpm test:base` et `node --test tests/stockage-ajustements.test.js
  tests/stockage-modification.test.js tests/contrat.test.js` : rouges.
- [ ] **Étape 3 :** les écritures ci-dessus ; dans chaque fonction, un commentaire renvoie à « Choix de
  l'agent » de la conception (ce qui est « écarté »). Contrat : `ecartes` dans l'exemple de modification.
- [ ] **Étape 4 :** les mêmes commandes, vertes ; `pnpm test:base` entier vert.
- [ ] **Étape 5 :** commit `feat(stockage): retraits et rétablissements tiennent la mémoire des écartés`.

### Tâche 3 : la génération et les changements lisent et écrivent les écartés (décision 11)

**Fichiers :** Modifier `src/modele/voyage.js` (`genererVoyage`), `src/modele/changements.js`,
`src/ecrans/changements-vues.js`, `src/i18n/fr.json` ; Tests `tests/voyage.test.js`,
`tests/changements.test.js`, `tests/ecran-voyage-modifier.mjs`.

**Interfaces :**
- Consomme : `contenu.ecartes` (tâche 1), `ModificationDuVoyage.ecartes` (tâche 2).
- Produit :
  - `genererVoyage(bibliotheque, infos, { choisies, ecartes, apercu? }, ids)` rend en plus
    `ecartes: string[]` (triés) : les objets de **l'aperçu** dont l'id est dans `ecartes` et qui ne
    sont pas des ajouts à la main (`ligne.ajout`, tâche 4). `apercu` (facultatif) remplace
    `genererApercu(bibliotheque, infos, choisies)` ; son usage complet vient en tâche 4.
  - Dans `calculerChangements`, une ligne `entree` dont le modèle est dans `contenu.ecartes` a
    `defaut: false` et `retire: true` ; les autres ont `retire: false`.
  - `appliquerChangements` rend `modification.ecartes` = (`contenu.ecartes` ∪ modèles des `sortie`
    acceptées ∪ modèles des `entree` refusées) − modèles des `entree` et `retour` acceptés ; triés,
    sans les objets sans modèle.

- [ ] **Étape 1 : tests rouges.** `genererVoyage` : décocher `m-parasol` dans l'aperçu →
  `contenu.ecartes` vaut `['m-parasol']` ; un id écarté absent de l'aperçu n'y est pas. Changements :
  une étiquette ajoutée qui fait entrer `m-guide`, déjà dans `contenu.ecartes` → ligne refusée,
  `retire: true` ; accepter la ligne → `m-guide` sort de `modification.ecartes` ; refuser une entrée
  neuve `m-carte` → elle entre ; accepter la sortie de `m-tente` → elle entre ; accepter le retour d'un
  objet retiré de `m-pelle` → il sort. Témoin : sans `contenu.ecartes`, les entrées restent acceptées.
  Écran (`tests/ecran-voyage-modifier.mjs`, cas nouveau) : la ligne de l'objet déjà écarté dit
  « retiré », valeur barrée, nom de case terminé par « , retiré de ce voyage ».
- [ ] **Étape 2 :** `node --test tests/voyage.test.js tests/changements.test.js` rouge ; le test
  d'écran rouge.
- [ ] **Étape 3 :** les règles ci-dessus ; dans `changements-vues.js`, la mention « retiré » sous le
  nom d'une entrée `retire` : icône `retire` (`minus-circle-bold`, ajoutée ici à `INTERFACE` de
  `src/ecrans/icones.js`), dessin `.pastille-mention` de la maquette (styles dans `changements.css`).
  Textes : `modifierVoyage.ligne.retire` « retiré », `modifierVoyage.case.retire`
  « {quoi}, retiré de ce voyage ».
- [ ] **Étape 4 :** les mêmes tests verts, plus `tests/textes-voyage.test.js` ; captures de l'étape
  « Changements » (état de la maquette `changements-retire`).
- [ ] **Étape 5 :** commit `feat(voyage): un objet déjà écarté arrive refusé à l'étape « Changements »`.

### Tâche 4 : le modèle du voyage refait

**Fichiers :** Créer `src/modele/refaire.js` ; Modifier `src/modele/voyage.js` ; Test
`tests/refaire.test.js`.

**Interfaces :**
- Consomme : `choisiesDuVoyage` (`src/modele/changements.js`), `genererApercu`, `calculerQuantite`,
  `joursEtNuits`, `estRetire` (`src/modele/sac.js`), `genererVoyage` (tâche 3).
- Produit, dans `src/modele/refaire.js` :
  - `repriseDe(origine, bibliotheque) → { choisies: Set, ecartes: Set, disparues: { etiquettes:
    string[], objets: string[] } }` — `choisies` = `choisiesDuVoyage` ; `ecartes` = `origine.ecartes` ;
    `disparues` : noms des étiquettes du voyage dont le modèle n'est plus dans la bibliothèque, et des
    objets du voyage (non retirés) dont le modèle n'y est plus, dans l'ordre du voyage.
  - `apercuRefait(origine, bibliotheque, infos, choisies, recalculer: Set) → { apercu, ajouts: Set,
    retires: Set, manuelles: Map<id, { gardee, calcul }> }`, où `apercu` a la forme de `genererApercu`
    avec, en plus :
    - un objet de la bibliothèque que le voyage d'origine contenait (non retiré) garde **son nom
      d'origine** (`objet: { ...modele, nom }`, décision 12) ;
    - si l'origine l'avait `quantiteManuelle` et que le calcul diffère : `manuelles.set(id, { gardee,
      calcul })` ; la ligne vaut `gardee` avec `manuelle: true`, sauf si `recalculer.has(id)` (alors
      `calcul`, sans `manuelle`) ; un calcul égal : ni mention ni `manuelle` ;
    - un objet **ajouté à la main** (`modeleId` null) et non retiré de l'origine : ligne `{ objet:
      objetDOrigine, quantite: objetDOrigine.quantite, ajout: true }` (son id est celui de l'objet
      d'origine), rangée par nom dans la catégorie de l'aperçu issue du modèle de sa catégorie
      d'origine ; sinon, dans sa catégorie d'origine, ajoutée **en fin d'aperçu** avec `origine: true`
      (une seule fois pour plusieurs ajouts) ;
    - `retires` : les ids de l'aperçu qui sont dans `origine.ecartes` ; `ajouts` : les ids des lignes
      `ajout`.
- Dans `genererVoyage`, une ligne `ajout` se copie par `copierAjout(objet, { voyageId, categorieId },
  ids)` (nouvelle, exportée de `voyage.js`) : l'objet d'origine avec nouvel id, nouveau voyage et
  catégorie, `dansLeSac: 0`, `achetes: 0`, `modifieLe` ; `aAcheter`, quantité et `quantiteManuelle`
  repris. Une ligne `manuelle` donne `quantiteManuelle: true`. Une catégorie `origine` se copie avec
  nouvel id et nouveau voyage, **son `modeleId` gardé**.

- [ ] **Étape 1 : tests rouges** dans `tests/refaire.test.js`, sur une petite bibliothèque et un voyage
  d'origine écrits dans le test : étiquette disparue et étiquette renommée (reprise sous son nouveau
  nom, absente de `disparues`) ; objet disparu nommé ; objet renommé dans l'origine ; quantité fixée
  3 / calcul 7 → `manuelles` `{gardee 3, calcul 7}`, ligne 3, puis 7 avec `recalculer` ; calcul égal →
  pas de mention ; ajout à la main dans une catégorie retenue, dans une catégorie non retenue, dans
  une catégorie propre au voyage (deux ajouts, une seule carte en fin) ; ajout à la main « à acheter »
  → copié `aAcheter: true, achetes: 0` ; écarté de l'origine présent → dans `retires` ; écarté que les
  étiquettes n'appellent plus → absent ; voyage d'avant la phase (`ecartes: []`) → rien d'écarté.
  Vigilance 1 : un ajout à la main retiré (quantité 0, `dansLeSac 1`) et un objet de modèle retiré
  fixé à la main → ni ajout, ni `manuelles`. Vigilance 4 : étiquettes qui n'appellent plus rien →
  l'aperçu ne contient que les ajouts. `genererVoyage` avec cet aperçu : le voyage refait a les
  quantités, noms, `quantiteManuelle`, catégories et `ecartes` attendus ; le voyage d'origine (objet
  gelé par `structuredClone` + comparaison) n'a pas bougé.
- [ ] **Étape 2 :** `node --test tests/refaire.test.js` rouge.
- [ ] **Étape 3 :** `src/modele/refaire.js` et `copierAjout` ; en-tête qui renvoie aux décisions 1 à 7
  et 12 de la conception.
- [ ] **Étape 4 :** `node --test tests/refaire.test.js tests/voyage.test.js tests/changements.test.js`
  verts.
- [ ] **Étape 5 :** commit `feat(modele): le voyage refait, construit sur la bibliothèque actuelle`.

### Tâche 5 : textes de la phase

**Fichiers :** Modifier `src/i18n/fr.json`, `tests/textes-voyage.test.js`.

Les textes, repris tels quels de la maquette (`docs/maquettes/refaire/`) :
- `menuVoyage.actions` « Actions du voyage « {nom} » », `menuVoyage.modifier` « Modifier ce voyage »,
  `menuVoyage.refaire` « Refaire ce voyage », `menuVoyage.supprimer` « Supprimer ce voyage » ;
- `refaireVoyage.titre` « Refaire « {nom} » », `refaireVoyage.ajoute` « ajouté à la main »,
  `refaireVoyage.retire` « retiré », `refaireVoyage.retireLu` « retiré la dernière fois », et la phrase
  des disparus (`refaireVoyage.disparus.*`, singulier et pluriel, étiquette « elle n’est pas reprise »,
  objet « il n’est pas repris », plusieurs « ils ne sont pas repris » : formes de `phraseDisparus`
  dans `docs/maquettes/refaire/refaire.js`) ;
- `suppressionVoyage.titre` « Supprimer le voyage « {nom} » ? », `suppressionVoyage.texte` (pluriel
  sur les objets) et `suppressionVoyage.texteSac` (avec « dont {sac} déjà dans le sac »), suivis de
  « La bibliothèque n’est pas touchée. » ; `annulation.voyage` « Voyage « {nom} » supprimé ».

- [ ] **Étape 1 :** test rouge dans `tests/textes-voyage.test.js` : chaque clé existe, sans guillemet
  droit ni espace ordinaire dans « … ».
- [ ] **Étape 2 :** rouge ; **Étape 3 :** les textes ; **Étape 4 :** vert.
- [ ] **Étape 5 :** commit `feat(textes): textes de Refaire et de la suppression d'un voyage`.

### Tâche 6 : le menu « ⋮ » d'un voyage, au bout du titre et sur les cartes

**Fichiers :** Créer `src/ecrans/menu-voyage.js`, `src/styles/menu-voyage.css` ; Modifier
`src/ecrans/icones.js` (`actions` : `dots-three-vertical-bold`, `refaire` : `copy-bold`, `aLaMain` :
`hand-bold`), `src/ecrans/voyage-vues.js` (`vueEntete`), `src/ecrans/voyage.js` (branchement),
`src/ecrans/voyages.js` (`carte`, branchement), `src/main.js` (feuille de style) ; Tests créer
`tests/ecran-voyage-menu.mjs`, `tests/ecran-voyages-menu.mjs` ; modifier `tests/ecran-voyage-modifier.mjs`
et `tests/ecran-voyage-grand-format-gestes.mjs` (ils ouvrent « Modifier » par le menu).

**Interfaces :**
- Consomme : textes de la tâche 5 ; `poserGardeRetour` (`src/ecrans/fenetre.js`).
- Produit : `vueMenuVoyage(t, voyage, actions: ('modifier'|'refaire'|'supprimer')[], suffixe = '') →
  HTML` et `brancherMenuVoyage(conteneur, surChoix: cle => void)` (dessin et gestes de
  `docs/maquettes/refaire/menu-carte.js` : popover, placé sous le bouton ou au-dessus faute de place,
  Échap, appui ailleurs, focus rendu au bouton, flèches / Début / Fin), plus le **retour système** :
  une garde `poserGardeRetour({ surRetour })` posée à l'ouverture, qui ferme le menu, retirée à toute
  autre fermeture. `surChoix` est appelé après la fermeture.
  - En-tête du voyage : `h1` et bouton dans `.voyage-titre` (« ⋮ » calé sur la première ligne), actions
    `['modifier', 'refaire', 'supprimer']` ; `.voyage-modifier` disparaît. `modifier` →
    `location.hash = '#/voyage/<id>/modifier'` ; `refaire` → `'#/voyage/<id>/refaire'` (tâche 8) ;
    `supprimer` → `supprimerVoyage` (tâche 7 ; d'ici là, rien). La clé `modifierVoyage.bouton` est
    retirée de `fr.json` avec le bouton.
  - Carte de Mes voyages : `li.carte-avec-actions` contenant le lien (inchangé) et le bouton, actions
    `['refaire', 'supprimer']` ; `refaire` → `'#/voyages/refaire/<id>'` (tâche 8).

- [ ] **Étape 1 : tests d'écran rouges.** `ecran-voyage-menu.mjs` : aux quatre formats, le bouton
  « Actions du voyage « … » » est dans le bloc du titre, en haut à droite de la première ligne ; ouvert,
  trois lignes dans l'ordre, « Supprimer ce voyage » en dernier ; Échap le ferme et rend le focus ; le
  retour système (`page.goBack()`) le ferme sans quitter le voyage ; « Modifier ce voyage » ouvre
  l'assistant de modification ; plus aucun `.voyage-modifier`. Vigilance 5 : voyage nommé « Tour de
  Bretagne à vélo, de Saint-Malo à Quiberon par la côte sauvage » → `scrollWidth ≤ clientWidth` de la
  page à 393 px, et le bouton reste sur la première ligne. `ecran-voyages-menu.mjs` : chaque carte a son
  bouton, passés compris, l'appui sur le bouton n'ouvre pas le voyage, l'appui sur la carte l'ouvre toujours ; menu à
  deux lignes ; près du bas de l'écran, le menu s'ouvre au-dessus.
- [ ] **Étape 2 :** `node tests/ecran-voyage-menu.mjs` et `node tests/ecran-voyages-menu.mjs` rouges.
- [ ] **Étape 3 :** le composant, les styles (repris de `maquette.css` : `.menu-voyage*`,
  `.carte-avec-actions`, `.voyage-titre`, avec la taille de titre de l'écran) et les branchements.
- [ ] **Étape 4 :** ces deux tests, `ecran-voyage-modifier.mjs`, `ecran-voyage-grand-format-gestes.mjs`,
  `ecran-voyage.mjs` et `ecran-voyages-liste.mjs` verts ; captures (menu fermé et ouvert, voyage et
  Mes voyages, nom long) regardées.
- [ ] **Étape 5 :** commit `feat(voyage): menu « ⋮ » des actions du voyage, au titre et sur les cartes`.

### Tâche 7 : supprimer un voyage, et « Annuler »

**Fichiers :** Créer `src/ecrans/suppression-voyage.js` ; Modifier `src/modele/suppressions.js`,
`src/ecrans/voyage.js`, `src/ecrans/voyages.js` (`suivreRetablissements`) ; Tests
`tests/suppressions.test.js`, créer `tests/ecran-voyage-supprimer.mjs`.

**Interfaces :**
- Consomme : `supprimerVoyage`, `lireVoyage`, `creerVoyage` (tâche 1) ; `demander` (`fenetre.js`) ;
  `montrerAnnulation`, `sansAnnuler` (`annulation.js`) ; menu (tâche 6).
- Produit :
  - `consequencesVoyage({ objets }) → { objets: number, dansLeSac: number }` dans
    `src/modele/suppressions.js` : `objets` = objets du voyage non retirés (`!estRetire`) ;
    `dansLeSac` = objets ayant au moins une pièce dans le sac (retirés compris).
  - `supprimerVoyage(contexte, voyage, { depuis: 'voyage' | 'voyages' }) → Promise<void>` dans
    `src/ecrans/suppression-voyage.js` : la question (« Garder » d'abord, « Supprimer » en rouge,
    nombres en gras, mention du sac seulement si `dansLeSac > 0`) ; « Supprimer » → sous `sansAnnuler`,
    relit le voyage, `stockage.supprimerVoyage(id)`, puis `montrerAnnulation({ …, voyage: id, texte:
    annulation.voyage })` ; depuis le voyage, `revenirAccueil()` ; depuis Mes voyages, la carte
    disparaît (liste relue et redessinée, par la même fonction que pour « Annuler »). « Annuler » : `creerVoyage(contenu relu)`, puis l'événement
    `voyage-retabli` `{ voyageId, entier: true }`.
  - Mes voyages, à `voyage-retabli` avec `entier` : relit la liste (`ecranVoyages.charger`), redessine
    sans changer de défilement, focus sur le lien de la carte rendue.

- [ ] **Étape 1 : tests rouges.** `consequencesVoyage` : 87 objets dont 23 avec au moins une pièce →
  `{ objets: 87, dansLeSac: 23 }` ; un objet retiré en attente de sortie ne compte que dans `dansLeSac`.
  Écran : depuis le voyage, la question dit « Sa liste de **N objets**, dont **M déjà dans le sac**,
  disparaîtra. La bibliothèque n’est pas touchée. » ; sans rien dans le sac, pas de « dont » ;
  « Garder » ne change rien ; « Supprimer » ramène à Mes voyages, carte absente, bandeau
  « Voyage « … » supprimé » ; « Annuler » rend la carte à sa place et le voyage relu égal à celui
  d'avant (coches, achats, quantités, écartés). Depuis une carte : même chose, on reste sur Mes
  voyages. Vigilance 2 : panne de `supprimerVoyage` → message de panne, le voyage reste ; panne de
  `creerVoyage` à « Annuler » → message, bandeau toujours là, second appui réussit. Vigilance 3 :
  supprimer, ouvrir un autre voyage, « Annuler », revenir → la carte est là. Vigilance 5 : nom long →
  pas de débordement de la fenêtre de question à 393 px. Une écriture de la bibliothèque (Réglages)
  pendant le bandeau ne le retire pas.
- [ ] **Étape 2 :** `node --test tests/suppressions.test.js` et `node tests/ecran-voyage-supprimer.mjs`
  rouges.
- [ ] **Étape 3 :** la règle, le module d'écran, le branchement dans le menu (tâche 6) des deux écrans.
- [ ] **Étape 4 :** ces tests, `ecran-annulation-voyage.mjs` et `ecran-voyages-liste.mjs` verts ;
  captures (question, bandeau sur Mes voyages).
- [ ] **Étape 5 :** commit `feat(voyage): supprimer un voyage, avec « Annuler »`.

### Tâche 8 : « Refaire ce voyage »

**Fichiers :** Créer `src/ecrans/refaire-voyage.js`, `src/ecrans/refaire-vues.js` ; Modifier
`src/ecrans/assistant-vues.js` (`vueApercu`), `src/main.js` (routes), `src/styles/assistant-apercu.css`
(mentions, segments, phrase, repris de `maquette.css`) ; Tests créer `tests/ecran-refaire.mjs`,
`tests/ecran-refaire-apercu.mjs`.

**Interfaces :**
- Consomme : `repriseDe`, `apercuRefait` (tâche 4), `genererVoyage` (tâche 3), `ouvrirAssistant` et les
  fonctions de `assistant.js` (comme `nouveau-voyage.js`), `ecranVoyage`, `ecranVoyages`, menu (tâche 6).
- Produit :
  - Routes : `#/voyage/:id/refaire` (le voyage derrière la fenêtre ; quitter → `revenir(adresse du
    voyage)`) et `#/voyages/refaire/:id` (Mes voyages derrière ; quitter → `revenirAccueil({ focus:
    bouton « ⋮ » de la carte })`). Un id inconnu → `vueIntrouvable`. `ecranRefaireVoyage` (charger :
    voyage, bibliothèque, filtre, Mes voyages si besoin, `aujourdhui`).
  - Le mode (forme de `docs/maquettes/refaire/refaire.js`, `ouvrirRefaire`) : titre
    `refaireVoyage.titre` ; infos `{ nom: '', destination: '', depart: '', retour: '', voyageurs:
    origine.voyageurs }` ; `etat.choisies` = `reprise.choisies`, `etat.ecartes` = `reprise.ecartes`,
    étapes d'étiquettes déjà vues ; `saisieCommencee` : nom, destination ou départ saisis, ou
    étiquettes changées (ce qui est repris ne compte pas) ; abandon : textes de la création ;
    `terminer` : `genererVoyage(biblio, infos, { choisies, ecartes, apercu }, ids)` avec l'aperçu de
    `apercuRefait`, `creerVoyage`, puis l'adresse du voyage créé (elle remplace celle de l'assistant).
    Clic sur un segment `input[data-manuelle]` : `recalculer` mis à jour, repeint.
  - `vueApercu(t, langue, { …, enTete = '', ligne = () => null })` : `enTete` (HTML) se pose après
    `.apercu-tete` ; `ligne(objet, ecarte) → { sous?, dire?, apres? } | null` remplace la description de
    la règle (`sous`), complète le nom de la case (`dire`, après une virgule) et ajoute `apres` après le
    bouton dans le `li`. Sans ces options, l'aperçu de la création est inchangé (octet pour octet).
  - `src/ecrans/refaire-vues.js` : `vuePhraseDisparus(t, langue, disparues) → HTML` et
    `ligneRefaite(t, donnees, { ecartes, recalculer })`, qui rend la fonction `ligne` ci-dessus : pastilles « ajouté à la main » (main) et
    « retiré » (tant que l'objet reste écarté), texte « fixée manuellement : 3 · le calcul donne 7 » et
    segments « Garder 3 | Recalculer : 7 » (mêmes classes et textes que `changements-vues.js`, absents
    si l'objet est écarté).

- [ ] **Étape 1 : tests d'écran rouges.** `ecran-refaire.mjs` : depuis le menu du voyage, l'assistant
  s'ouvre en fenêtre (téléphone : plein écran) titré « Refaire « … » », nom, destination et dates vides,
  voyageurs repris, étiquettes reprises cochées ; fermer sans rien saisir ne demande rien, après une
  saisie demande « Abandonner ce nouveau voyage ? » ; depuis la carte, Mes voyages derrière ; le retour
  système recule d'une étape ; « Créer le voyage » ouvre le nouveau voyage, le retour mène au voyage
  d'origine (ou à Mes voyages), qui n'a pas changé (relu égal). Vigilance 5 : titre long, pas de
  débordement à 393 px. `ecran-refaire-apercu.mjs` (voyage d'essai avec un ajout à la main, un objet
  retiré, une quantité fixée, une étiquette et un objet supprimés de la bibliothèque) : phrase en tête
  qui les nomme ; « ajouté à la main » coché ; « retiré » barré, recoché d'un appui (la mention
  s'efface) ; « Garder 3 » choisi, « Recalculer : 7 » change la quantité ; le voyage créé a 3 (ou 7),
  l'ajout à la main, pas l'objet retiré, et le relancer en « Refaire » le montre de nouveau retiré.
  Vigilance 4 : tout décoché → message « tout écarté », « Créer le voyage » grisé.
- [ ] **Étape 2 :** les deux tests rouges.
- [ ] **Étape 3 :** les fichiers ci-dessus ; `ecran-nouveau-voyage-apercu.mjs` doit rester vert sans
  retouche.
- [ ] **Étape 4 :** ces tests, `ecran-nouveau-voyage*.mjs`, `ecran-voyage-modifier.mjs` verts ;
  captures (Informations, étiquettes, aperçu, aux quatre formats, clair et sombre) regardées.
- [ ] **Étape 5 :** commit `feat(voyage): refaire ce voyage`.

### Tâche 9 : relecture des écrans par le skill impeccable

**Fichiers :** ceux des tâches 6 à 8, seulement si la relecture y trouve à redire.

- [ ] **Étape 1 :** comparer les captures de l'appli à celles de la maquette, état par état (menu
  fermé et ouvert, nom long, cartes, question, bandeau, Refaire en trois étapes, Changements avec
  « retiré ») ; noter tout écart.
- [ ] **Étape 2 :** corriger, test d'écran d'abord quand l'écart est mesurable ; commit
  `fix(voyage): retouches de la relecture des écrans de la phase 11`.

### Tâche 10 : vérification complète

**Fichiers :** `docs/superpowers/specs/2026-10-30-phase-11-refaire-supprimer-design.md` seulement si la
construction a dû trancher autrement (le dire au rapport).

- [ ] **Étape 1 :** `pnpm verif` en tâche de fond ; tout vert (un test instable sous charge se relance
  seul : il doit être vert seul, le noter).
- [ ] **Étape 2 :** pour chaque critère d'acceptation de la phase 11 (`docs/PLAN.md`), nommer le test qui
  le prouve ; « moins de 2 minutes » de « Nouveau voyage » : parcours chronométré à la main au rapport.
  Ne **pas** cocher le PLAN : c'est après la validation du chef de projet.
- [ ] **Étape 3 :** commit des retouches éventuelles.

---

## Ce qui peut avancer en parallèle

| Tâche | Fichiers principaux | Dépend de |
|---|---|---|
| 1 | migration 007, `base.rs`, `voyages.rs`, `lib.rs`, `tauri.js`, `navigateur.js`, contrat | — |
| 2 | `ajustements.rs`, `modification.rs`, `navigateur-voyages.js`, `navigateur-modification.js` | 1 |
| 3 | `voyage.js`, `changements.js`, `changements-vues.js` | 1 (forme), 2 (modification) |
| 4 | `src/modele/refaire.js`, `voyage.js` | 3 |
| 5 | `fr.json` | — |
| 6 | `menu-voyage.js`, `voyage-vues.js`, `voyage.js`, `voyages.js`, styles | 5 |
| 7 | `suppression-voyage.js`, `suppressions.js`, `voyages.js` | 1, 6 |
| 8 | `refaire-voyage.js`, `refaire-vues.js`, `assistant-vues.js`, `main.js` | 4, 6 |
| 9 | écrans des tâches 6 à 8 | 6, 7, 8 |
| 10 | — | toutes |

Départ possible ensemble : 1 et 5 ; puis 2 et 6 ; puis 3 et 7 ; puis 4 ; puis 8 ; puis 9 et 10.
