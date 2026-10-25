# Phase 4 — Étiquettes et assistant complet : plan de réalisation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal :** la bibliothèque reçoit des groupes d'étiquettes ; l'assistant « Nouveau voyage » devient Informations → une étape par groupe → Aperçu décochable, et le voyage créé garde (et montre) ses étiquettes.

**Architecture :** le modèle porte la règle d'inclusion, l'aperçu et la génération (`src/modele/inclusion.js`, `voyage.js`) ; un module d'écran pur (`src/ecrans/assistant.js`, sur le modèle de `rangement.js`) tient l'état de l'assistant (étape, étapes vues, étiquettes choisies, objets écartés, signature du dernier aperçu) et se teste sans navigateur ; `nouveau-voyage.js` ne fait que brancher gestes, fenêtres, retour système et stockage, et `assistant-vues.js` dessine. La base reçoit cinq tables (migration 004).

**Tech Stack :** Tauri 2, JavaScript simple, Vite 6, rusqlite 0.32, Playwright 1.62, `node --test`, Phosphor 2.1.1.

**Spec :** `docs/PRD.md` (US-11, 12, 13 ; « Inclusion » ; « Écrans et gestes », puces « Assistant », « Aperçu », « Retour à l'aperçu », « Aperçu vide », « Les étiquettes copiées »), `docs/PLAN.md` phase 4, `docs/DESIGN.md` (journal du 2026-10-25), maquette validée `docs/maquettes/assistant/` (servie par Vite : `pnpm exec vite --port 8643`, puis `/docs/maquettes/assistant/?etat=infos|activites|nombreuses|apercu|ecartes|tout-ecarte|vide|abandon|voyage`). **La maquette fait foi pour l'aspect** : en cas de doute sur une marge ou une couleur, reprendre `docs/maquettes/assistant/maquette.css` et ses textes (`T` dans `maquette.js`).

## Global Constraints

- Lire `AGENTS.md` et `CLAUDE.md` : français partout, commentaires qui disent le *pourquoi*, TDD (garder la sortie rouge dans le rapport), fichiers de 500 lignes au plus, un nom n'est exporté que s'il est importé ailleurs, aucun texte d'interface hors de `src/i18n/fr.json`.
- Couches : un écran n'importe que `src/stockage/index.js` côté stockage ; le modèle n'importe que le modèle ; seul le stockage touche `localStorage` ou Tauri (contrôle `frontiere-couches`).
- pnpm uniquement. `pnpm exec prettier --write <fichiers>` après chaque écriture (`printWidth` 120, guillemets simples, `arrowParens: avoid`).
- **Commits** : autorisés par le chef de projet sur la branche `phase-4` ; fichiers nommés (`git add <chemins>`, vérifier `git diff --cached --name-only`), message `type(portée): message` en français, toute modification du schéma SQLite signalée dans le message. Jamais de push.
- Champs JS en camelCase, colonnes SQLite en snake_case (serde `rename_all = "camelCase"`).
- **Inclusion** (PRD) : une catégorie ou un objet entre s'il est « toujours inclus » ou si au moins une de ses étiquettes est choisie ; un objet n'entre que si sa catégorie entre ; un objet n'apparaît qu'une fois ; un objet de quantité calculée 0 n'apparaît pas ; une catégorie sans objet retenu n'apparaît pas. Dans la bibliothèque, un modèle **sans étiquette** est « toujours inclus ».
- **Assistant** : étapes = Informations, puis un groupe **qui a au moins une étiquette** par étape (ordre des groupes, puis des étiquettes), puis Aperçu. Une étape est touchable dans la rangée si elle a déjà été vue, ou si c'est l'Aperçu et que les informations sont valides. « Suivant » et « Voir l'aperçu » valident d'abord les informations (messages de la phase 2 sinon, retour à l'étape Informations). Le retour système ramène à l'étape **précédente dans l'ordre** ; depuis Informations, il ferme l'assistant, après « Abandonner ce nouveau voyage ? » si quelque chose a été saisi (nom, destination, une date ou une étiquette).
- **Fenêtre de l'assistant** (tablette et ordinateur, plus petit côté de l'écran ≥ 600 px, comme en phase 2) : même largeur qu'en phase 2 et **même hauteur à chaque étape** — celle de l'étape Informations, mesurée à l'ouverture et à chaque changement de taille, bornée par la hauteur disponible ; le corps défile, la rangée et le pied restent. Au téléphone : écran plein, pied collé en bas (`position: sticky`). Ombre sur le pied tant qu'il reste du contenu à faire défiler dessous (`data-dessous`).
- **Informations** : ordre nom, destination, **voyageurs, puis dates** (décision du 2026-10-25) ; en paysage, voyageurs reste dans la colonne de gauche.
- **Aperçu** : catégories dans l'ordre de la bibliothèque, objets par nom ; une ligne entière est la case (`role="checkbox"`, `aria-checked` `true` / `mixed` / `false`) ; objet écarté barré et atténué, à sa place ; tête de catégorie : écarte tout si elle n'est pas vide, sinon reprend tout ; deux colonnes de catégories si `(orientation: landscape) and (min-width: 800px)`.
- **Objets écartés** : en entrant dans l'aperçu, si la signature (étiquettes choisies, départ, retour, voyageurs) diffère de celle du dernier aperçu vu **et** que des objets écartés y figurent encore, la fenêtre les nomme ; action principale « Les garder écartés », secondaire « Les remettre dans la liste » ; Échap ou retour système = garder. Les objets nouveaux arrivent cochés ; un objet écarté sorti puis revenu reste écarté.
- **Aperçu vide** : `aucunObjet` (rien ne correspond : mascotte, titre, texte, bouton « Revenir aux étiquettes » vers la première étape de groupe, ou Informations s'il n'y en a pas) ; `toutEcarte` (message `.message-info` au-dessus de la liste, `id="raison-vide"`). Dans les deux cas, « Créer le voyage » porte `aria-disabled="true"` et `aria-describedby="raison-vide"`, et un appui ne fait rien.
- **Panne à la création** : bandeau d'alerte au bas de l'écran, par-dessus, comme sur l'écran du voyage (`vueAlerte`, `nouveauVoyage.erreurs.enregistrement`), la saisie reste ; rien ne bouge.
- Animations : passage d'étape 200 ms `cubic-bezier(0.22, 1, 0.36, 1)` (fondu et 6 px), puces 150 ms ; rien si `prefers-reduced-motion: reduce`.
- Hors périmètre : modifier les étiquettes d'un voyage (phase 10), « Refaire ce voyage » (phase 11), écrans Bibliothèque et Étiquettes (phases 5 et 6), effacement des données d'essai des appareils (fait à l'installation, tâche 9).
- Tests d'écran jugés au code de sortie, jamais de pause fixe (`calme()`, `attendreQue()`) ; une capture claire et une sombre par écran touché dans `captures-travail/`.

## Review Focus

1. Bibliothèque sans aucun groupe (appareil non effacé, ancienne mini-bibliothèque) : l'assistant n'a que Informations et Aperçu, l'aperçu montre les « toujours inclus » (tâches 4 et 6).
2. Dates changées depuis l'aperçu en aller-retour dans la journée : Pyjama (par nuit) disparaît ; s'il était écarté, la fenêtre ne le nomme pas ; revenir à trois jours le rend, toujours écarté (tâche 4).
3. Double appui sur « Créer le voyage », ou appui pendant la panne : un seul voyage, aucun voyage partiel (tâche 6).
4. Retour système pendant qu'une fenêtre (objets écartés, abandon) est ouverte : seule la fenêtre se ferme, l'étape ne change pas (tâche 7).
5. Nom de voyage ou d'étiquette avec `<`, `&`, `"` : échappé dans le rappel de l'aperçu, la fenêtre et l'en-tête du voyage (tâches 6 et 8).

## Ordre et parallélisme

1 (base et stockage) d'abord, puis 2 (modèle et bibliothèque de départ). 3 (textes et pictos) après 2 (même `fr.json`). 4 (état de l'assistant) après 2. 5 (fenêtres et garde du retour) en parallèle de 3 et 4 (fichier à part). 6 après 3, 4, 5. 7 après 6 (mêmes fichiers). 8 après 2 et 3, en parallèle de 6. 9 en dernier.

---

### Task 1: Les étiquettes dans la base et le stockage

**Files:**
- Create: `src-tauri/migrations/004_etiquettes.sql`
- Modify: `src-tauri/src/base.rs` (MIGRATIONS → 4, test de migration), `src-tauri/src/bibliotheque.rs`, `src-tauri/src/voyages.rs`, `tests/contrat/stockage.json`, `src/stockage/navigateur.js`, `tests/stockage-navigateur.test.js`

**Interfaces:**
- Produces (contrat JSON, et donc Rust et JS) :
  - `bibliotheque = { groupes: [{ id, nom, ordre, modifieLe }], etiquettes: [{ id, groupeId, nom, ordre, modifieLe }], categories: [{ …, etiquettes: [idEtiquette] }], objets: [{ …, etiquettes: [idEtiquette] }] }`
  - `voyageComplet = { voyage, etiquettes: [{ id, voyageId, modeleId, nom, ordre, modifieLe }], categories, objets }`
- Produces (Rust) : structs `GroupeEtiquettes`, `Etiquette`, `EtiquetteDuVoyage` ; champ `etiquettes: Vec<String>` sur `CategorieModele` et `ObjetModele` ; `Bibliotheque { groupes, etiquettes, categories, objets }` ; `VoyageComplet { voyage, etiquettes, categories, objets }`. Commandes Tauri inchangées (mêmes noms, formes enrichies) : `src/stockage/tauri.js` ne change pas.

- [ ] **Step 1: Contrat** — dans `tests/contrat/stockage.json` : deux groupes (« Activités » : Camping ; « Climat » : Froid), une catégorie liée à Camping (`toujoursIncluse: false`), un objet lié à Froid (`toujoursInclus: false`), les autres `etiquettes: []` ; le voyage reçoit `etiquettes` (une copie de Camping).
- [ ] **Step 2: Tests Rust qui échouent** — les tests existants `une_bibliotheque_installee_est_relue_a_l_identique` et `un_voyage_cree_est_relu_a_l_identique` deviennent rouges avec le nouveau contrat ; ajouter :
  - `une_installation_refusee_n_ecrit_rien` étendu : un objet lié à une étiquette inconnue → Err, et aucune ligne dans `groupe_etiquettes` ni `etiquette` ;
  - `la_migration_004_garde_bibliotheque_et_voyages` : base à la version 3 avec une catégorie, un objet et un voyage ; après `Base::ouvrir`, version 4, tout relu, `groupes` et `etiquettes` vides, le voyage avec `etiquettes: []`.
- [ ] **Step 3:** `pnpm test:base` → rouge (garder la sortie).
- [ ] **Step 4: Migration 004** :

```sql
CREATE TABLE groupe_etiquettes (id TEXT PRIMARY KEY NOT NULL, nom TEXT NOT NULL, ordre INTEGER NOT NULL, modifie_le TEXT NOT NULL);
CREATE TABLE etiquette (id TEXT PRIMARY KEY NOT NULL, groupe_id TEXT NOT NULL REFERENCES groupe_etiquettes (id) ON DELETE CASCADE,
  nom TEXT NOT NULL, ordre INTEGER NOT NULL, modifie_le TEXT NOT NULL);
CREATE TABLE categorie_modele_etiquette (categorie_id TEXT NOT NULL REFERENCES categorie_modele (id) ON DELETE CASCADE,
  etiquette_id TEXT NOT NULL REFERENCES etiquette (id) ON DELETE CASCADE, PRIMARY KEY (categorie_id, etiquette_id));
CREATE TABLE objet_modele_etiquette (objet_id TEXT NOT NULL REFERENCES objet_modele (id) ON DELETE CASCADE,
  etiquette_id TEXT NOT NULL REFERENCES etiquette (id) ON DELETE CASCADE, PRIMARY KEY (objet_id, etiquette_id));
CREATE TABLE etiquette_du_voyage (id TEXT PRIMARY KEY NOT NULL, voyage_id TEXT NOT NULL REFERENCES voyage (id) ON DELETE CASCADE,
  modele_id TEXT, nom TEXT NOT NULL, ordre INTEGER NOT NULL, modifie_le TEXT NOT NULL);
CREATE INDEX etiquette_du_voyage_par_voyage ON etiquette_du_voyage (voyage_id);
```

  En-tête : les liens n'ont pas de `modifie_le` (ils suivent celui de leur modèle) ; `modele_id` sans contrainte, comme pour les catégories du voyage (copie indépendante).
- [ ] **Step 5: Rust** — installation : groupes, étiquettes, catégories, objets, puis les liens, dans la même transaction ; lecture : liens lus par `ORDER BY rowid` et rangés dans `etiquettes` de chaque modèle ; groupes `ORDER BY ordre, rowid`, étiquettes `ORDER BY ordre, rowid`. Voyage : `creer_voyage` écrit `etiquette_du_voyage`, `lire_voyage` la relit (`ORDER BY ordre, rowid`).
- [ ] **Step 6: Stockage navigateur** — `creerVoyage` range `etiquettes` sous `etiquettesDuVoyage` ; `lireVoyage` les rend (`[]` pour un voyage enregistré sans elles) ; test dans `tests/stockage-navigateur.test.js` : un voyage créé avec deux étiquettes est relu avec les deux, un ancien voyage sans clé `etiquettesDuVoyage` est relu avec `etiquettes: []`.
- [ ] **Step 7:** `pnpm test:base && node --test tests/stockage-navigateur.test.js` → vert. (`tests/contrat.test.js` reste rouge jusqu'à la tâche 2, qui suit aussitôt : le dire dans le rapport.)
- [ ] **Step 8: Commit** — `feat(base): groupes d'étiquettes, liens et étiquettes du voyage (migration 004, schéma modifié)`.

---

### Task 2: Inclusion, aperçu et génération ; la mini-bibliothèque

**Files:**
- Create: `src/modele/inclusion.js`, `tests/inclusion.test.js`
- Modify: `src/modele/bibliotheque.js`, `src/modele/voyage.js`, `src/i18n/fr.json` (`bibliothequeDeDepart` seulement), `tests/bibliotheque.test.js`, `tests/voyage.test.js`, `tests/contrat.test.js` (si besoin), `src/ecrans/nouveau-voyage.js` (appel de `genererVoyage` à la nouvelle signature, sans autre changement)

**Interfaces:**
- Consumes : forme du contrat (tâche 1), `calculerQuantite`, `joursEtNuits`.
- Produces :
  - `estInclus({ toujours, etiquettes }, choisies: Set<string>) → boolean`
  - `groupesAvecEtiquettes(bibliotheque) → Array<{ groupe, etiquettes: Etiquette[] }>` (groupes par `ordre`, étiquettes par `ordre`, **groupes sans étiquette omis**)
  - `genererApercu(bibliotheque, infos, choisies: Set<string>) → Array<{ categorie: CategorieModele, objets: Array<{ objet: ObjetModele, quantite: number }> }>` (catégories par `ordre`, objets par nom avec `localeCompare`, quantités > 0, catégories vides omises ; `infos` supposées valides)
  - `genererVoyage(bibliotheque, infos, { choisies, ecartes }, { nouvelId, maintenant })` (`ecartes` : ids d'objets modèles) → `{ voyage, etiquettes, categories, objets }` ; s'appuie sur `genererApercu` (une seule définition de l'inclusion) ; `etiquettes` = les choisies, dans l'ordre de `groupesAvecEtiquettes`, `ordre` = rang 0, 1, 2…
  - `construireBibliotheque(depart, outils) → { groupes, etiquettes, categories, objets }` : `depart.groupes = [{ nom, etiquettes: [{ cle, nom }] }]` ; catégories et objets portent `etiquettes: [cle]` dans `fr.json`, traduites en ids ; `toujoursIncluse` / `toujoursInclus` = aucune étiquette.

- [ ] **Step 1: Tests qui échouent** — `tests/inclusion.test.js`, bibliothèque d'essai écrite dans le test (Vêtements toujours incluse avec T-shirts, Doudoune [froid] ; Camping liée à [camping] avec Lampe frontale et Réchaud partagé ; Plage liée à [plage] avec Parasol [chaud]) :
  - `estInclus({ toujours: true, etiquettes: [] }, new Set())` → true ; `({ toujours: false, etiquettes: ['froid'] }, new Set(['froid']))` → true ; même chose avec `new Set(['pluie'])` → false ;
  - aperçu sans étiquette (10 → 13, 2 voyageurs) : seulement Vêtements / T-shirts 8 ;
  - avec `camping` et `froid` : Vêtements (Doudoune 2, T-shirts 8), puis Camping (Lampe frontale 2, Réchaud 1) ;
  - avec `chaud` seul : pas de Parasol (sa catégorie Plage n'entre pas) ;
  - un objet lié à `camping` **et** `froid`, les deux choisis : une seule ligne ;
  - `groupesAvecEtiquettes` omet un groupe vide et range par `ordre`.
  Dans `tests/voyage.test.js` : `genererVoyage` avec `ecartes` = {Réchaud} → pas de Réchaud ; avec Lampe et Réchaud écartés → pas de catégorie Camping ; `etiquettes` du voyage = copies `{ modeleId, nom, ordre }` des choisies dans l'ordre des groupes, `voyageId` = celui du voyage. Dans `tests/bibliotheque.test.js` : trois groupes (Activités : Randonnée, Camping, Plage ; Climat : Chaud, Froid, Pluie ; Hébergement : Hôtel, Tente, Chez l'habitant), cinq catégories (la cinquième : Camping, `tent`, `abricot`, liée à Camping et Tente, non « toujours incluse »), et les objets ajoutés du PLAN (Maillot de bain [plage], Doudoune [froid], Bonnet [froid], Cape de pluie [pluie] dans Vêtements ; Crème solaire partagée [plage, chaud] dans Toilette ; Lampe frontale, Sac de couchage, Réchaud partagé dans Camping, tous `fixe` 1).
- [ ] **Step 2:** `pnpm test` → rouge.
- [ ] **Step 3:** écrire `inclusion.js` (en-tête : renvoi au PRD « Inclusion ») ; adapter `bibliotheque.js` et `voyage.js` ; compléter `bibliothequeDeDepart` dans `fr.json` (formulation originale, aucune reprise de BagPacker) ; mettre à jour l'appel dans `nouveau-voyage.js` (`{ choisies: new Set(), ecartes: new Set() }`).
- [ ] **Step 4:** `pnpm test && pnpm test:base` → vert (contrat compris).
- [ ] **Step 5: Commit** — `feat(modele): inclusion par étiquettes, aperçu et mini-bibliothèque étiquetée`.

---

### Task 3: Textes de l'assistant et picto Camping

**Files:**
- Create: `tests/textes-assistant.test.js`
- Modify: `src/i18n/fr.json`, `src/ecrans/icones.js`

**Interfaces:**
- Produces (clés, textes repris de la maquette, `T` dans `docs/maquettes/assistant/maquette.js`) : `nouveauVoyage.etapes` « Étapes » ; `.etape.informations` « Informations » ; `.etape.apercu` « Aperçu » ; `.legende` « Étape {n} sur {total} · {nom} » ; `.precedent` « Précédent » ; `.suivant` « Suivant » ; `.voirApercu` « Voir l'aperçu » ; `.aideGroupe` ; `.choisies` `{ one, other }` et `.aucuneChoisie` ; `.retenus` `{ one: "{n} objet retenu sur {total}", other: "{n} objets retenus sur {total}" }` ; `.aideApercu` ; `.vide.titre`, `.vide.texte`, `.vide.revenir` ; `.toutEcarte` ; `.abandon.titre`, `.texte`, `.continuer`, `.abandonner` ; `.ecartes.titre`, `.texte`, `.garder`, `.remettre` ; `.case.objet` « {nom}, {quantite} » ; `.case.categorie` « {nom} : {retenus} sur {total} retenus » ; `voyage.etiquettes` « Étiquettes du voyage ». Apostrophes typographiques (’) comme le reste du fichier.
- Produces (icônes) : `paveCategorie({ icone: 'tent' })` dessine `tent-duotone` ; `iconeInterface('apercu')` = `list-checks-bold` ; `iconeInterface('etiquette')` = `tag-bold`.

- [ ] **Step 1:** test qui échoue, `tests/textes-assistant.test.js` : chaque clé ci-dessus existe dans `fr.json` et est une chaîne (ou un objet `{ one, other }`).
- [ ] **Step 2:** → rouge. **Step 3:** ajouter clés et pictos. **Step 4:** `pnpm test` → vert (le contrôle `exports-inutilises` ne regarde pas les clés).
- [ ] **Step 5: Commit** — `feat(textes): textes de l'assistant complet, picto Camping`.

---

### Task 4: L'état de l'assistant, sans navigateur

**Files:**
- Create: `src/ecrans/assistant.js`, `tests/assistant.test.js`

**Interfaces:**
- Consumes : `groupesAvecEtiquettes`, `genererApercu` (tâche 2).
- Produces (fonctions pures, chacune rend un nouvel état) :
  - `creerAssistant() → { etape: 0, vues: Set([0]), choisies: Set, ecartes: Set, signature: null }`
  - `etapesDe(bibliotheque) → Array<{ type: 'informations' } | { type: 'groupe', groupe, etiquettes } | { type: 'apercu' }>`
  - `etatEtape(etat, indice, { derniere, infosValides }) → 'courante' | 'ouverte' | 'fermee'`
  - `allerA(etat, indice) → etat` (note l'étape vue)
  - `basculerEtiquette(etat, id)`, `basculerObjet(etat, id)`, `basculerCategorie(etat, ids)` (tous écartés → tous repris ; sinon tous écartés)
  - `etatCoche(ids, ecartes) → { retenus, coche: 'plein' | 'entame' | 'vide' }`
  - `signatureDe(infos, choisies) → string`
  - `entrerDansApercu(etat, signature, idsPresents) → { etat, aReconfirmer: string[] }` (ids écartés présents, dans l'ordre de `idsPresents`, seulement si l'ancienne signature existe et diffère)
  - `remettre(etat, ids) → etat`
  - `raisonVide(apercu, ecartes) → null | 'aucunObjet' | 'toutEcarte'`
  - `saisieCommencee(infos, etat) → boolean`

- [ ] **Step 1: Test qui échoue** — `tests/assistant.test.js` :
  - étapes : bibliothèque de départ → `['informations', 'groupe', 'groupe', 'groupe', 'apercu']` ; bibliothèque sans groupe → `['informations', 'apercu']` ; un groupe sans étiquette n'a pas d'étape ;
  - rangée : au départ, seule l'étape 0 est `courante`, les autres `fermee` ; infos valides → l'aperçu `ouverte`, les groupes non vus restent `fermee` ; après `allerA(…, 1)`, l'étape 1 est `courante` et la 0 `ouverte` ;
  - catégorie : `basculerCategorie` sur une catégorie pleine → `vide` ; sur une `entame` → `vide` ; sur une `vide` → `plein` ;
  - écartés : premier aperçu → `aReconfirmer` vide ; même signature → vide ; signature changée avec Gourde écartée et présente → `['gourde']` ; Pyjama écarté mais absent de `idsPresents` → non nommé, et toujours dans `ecartes` ;
  - Review Focus 2 : avec la mini-bibliothèque de départ, Pyjama écarté, dates passées à un seul jour → absent de l'aperçu et de `aReconfirmer` ; dates rendues à trois jours → présent et toujours écarté ;
  - `raisonVide` : aperçu vide → `aucunObjet` ; tout écarté → `toutEcarte` ; sinon `null` ;
  - `saisieCommencee` : faux au départ (voyageurs 2 par défaut ne compte pas), vrai après un nom, une date ou une étiquette.
- [ ] **Step 2:** `node --test tests/assistant.test.js` → rouge. **Step 3:** écrire `assistant.js` (en-tête : renvoi aux décisions du 2026-10-24, PRD « Écrans et gestes »). **Step 4:** → vert ; `pnpm controles` (les tests comptent comme importeurs).
- [ ] **Step 5: Commit** — `feat(ecrans): état de l'assistant (étapes, choix, objets écartés)`.

---

### Task 5: Fenêtres à boutons nommés et garde du retour système

**Files:**
- Modify: `src/ecrans/fenetre.js`, `tests/ecran-voyage-fiche.mjs` (inchangé, doit rester vert)
- Create: `tests/pages/fenetre.html` et `tests/pages/fenetre.js` (page d'essai servie par le serveur Vite des tests, `demarrerServeur()` : boutons qui appellent `demander` et posent la garde, résultats écrits dans la page), `tests/ecran-fenetre-demander.mjs`

**Interfaces:**
- Produces :
  - `demander({ t, titre, texte, contenu = '', boutons: [{ cle, libelle, principal = false }], signal }) → Promise<string | null>` : fenêtre d'alerte (`role="alertdialog"`, sans ×), boutons dans l'ordre donné, focus sur le premier ; rend la `cle` choisie, `null` pour Échap ou le retour système ; `contenu` est du HTML déjà échappé par l'appelant. `confirmer` devient une enveloppe de `demander` (comportement inchangé : « Annuler » puis l'action principale ; `true` / `false`).
  - `poserGardeRetour({ surRetour }) → { retirer() }` : pose une étape d'historique à la même adresse, comme un niveau ; un retour système appelle `surRetour()` au lieu de quitter l'écran ; si `surRetour` rend `true`, la garde se repose aussitôt ; `retirer()` l'enlève (sans quitter l'écran). Une fenêtre ouverte par-dessus (`demander`, `confirmer`) reste le dernier niveau : le retour la ferme, elle, sans appeler `surRetour`.

- [ ] **Step 1: Test d'écran qui échoue** — `tests/ecran-fenetre-demander.mjs` : `demander` avec trois boutons rend la clé du bouton touché ; Échap → `null` ; retour système → `null` et l'adresse ne change pas ; garde posée : un retour appelle `surRetour` (compteur à 1) et l'adresse reste ; `surRetour` rendant `true` → un second retour l'appelle encore (2) ; rendant `false` puis `retirer()` → le retour suivant quitte la page d'essai ; garde posée et `demander` ouvert : un retour ferme la fenêtre, compteur inchangé.
- [ ] **Step 2:** → rouge. **Step 3:** implémenter dans `fenetre.js` en réutilisant la pile des niveaux (même logique de `retraitsEnAttente`) ; garder le fichier sous 500 lignes. **Step 4:** ce test et `tests/ecran-voyage-fiche.mjs`, `tests/ecran-voyage-retour.mjs` → verts.
- [ ] **Step 5: Commit** — `feat(ecrans): fenêtre à boutons nommés et garde du retour système`.

---

### Task 6: L'assistant à l'écran : étapes, puces, aperçu, création

**Files:**
- Create: `src/ecrans/assistant-vues.js`, `src/styles/assistant.css`, `tests/ecran-nouveau-voyage-etapes.mjs`, `tests/ecran-nouveau-voyage-apercu.mjs`
- Modify: `src/ecrans/nouveau-voyage.js` (le formulaire passe dans `assistant-vues.js`), `src/styles/nouveau-voyage.css` (écart sous Voyageurs), `src/main.js` (import de `assistant.css`), `tests/ecran-nouveau-voyage.mjs`, `tests/ecran-nouveau-voyage-fenetre.mjs`, `tests/ecran-nouveau-voyage-disposition.mjs`, `tests/ecran-retour.mjs`, `tests/ecran-focus.mjs` (création désormais par « Voir l'aperçu » puis « Créer le voyage » : un petit outil `creerDepuisLAssistant(page)` dans `tests/outils/`)

**Interfaces:**
- Consumes : tâches 2 à 5 ; `vueAlerte` (`voyage-vues.js`), `creerCalendrier`, `validerInformations`.
- Produces (repères pour les tests) : `nav.etapes` > `.etape[data-etat] button[data-aller]` (`aria-current="step"` sur la courante, `aria-disabled="true"` sur les fermées) ; `.etapes-legende` ; `.formulaire-corps[data-etape="infos|groupe|apercu"]` ; `.puce-etiquette[data-etiquette][aria-pressed]` ; `.etape-compte` ; `[data-categorie][role=checkbox]`, `[data-objet][role=checkbox]` (ids des **modèles**) ; `#titre-etape` (focus à chaque changement d'étape) ; `[data-action="precedent|suivant|apercu|creer|fermer"]` ; `#raison-vide` ; `.apercu-vide` ; `.formulaire-pied[data-dessous]`.

- [ ] **Step 1: Tests d'écran qui échouent** (bibliothèque de départ installée par l'appli, horloge fixée au 2026-10-06) :
  - `ecran-nouveau-voyage-etapes.mjs` : rangée de cinq étapes, noms exacts ; « Suivant » sans informations → messages de la phase 2, on reste ; informations remplies → Activités, puces Randonnée, Camping, Plage ; une puce touchée passe `aria-pressed="true"` avec sa coche, `.etape-compte` « 1 étiquette choisie » ; Climat et Hébergement `fermee` tant que non vus ; l'Aperçu touchable dans la rangée ; « Voir l'aperçu » y mène ; la fenêtre garde sa hauteur d'une étape à l'autre (± 1 px) ; Voyageurs avant les dates dans l'ordre du document et à l'écran ; au téléphone, `.etapes-legende` « Étape 2 sur 5 · Activités », pied collé en bas de l'écran, `data-dessous` présent sur Informations puis absent une fois défilé en bas ; Review Focus 1 : bibliothèque d'essai sans groupe déposée avant le chargement → rangée Informations · Aperçu.
  - `ecran-nouveau-voyage-apercu.mjs` : Randonnée, Camping, Froid et Tente choisis, 13 → 15 novembre, 2 voyageurs → le titre « {n} objets retenus sur {n} » et les lignes de chaque catégorie égalent ce que rend `genererApercu` sur la bibliothèque de départ (calculé dans le test) ; Camping présente ; Crème solaire absente ; tête Alimentation → `false`, puis Repas → `mixed` ; titre recompté ; deux colonnes à 1280×800, une à 800×1280 ; « Créer le voyage » → l'écran du voyage, sans Gourde, avec Camping ; le stockage contient les quatre étiquettes du voyage ; double appui → un seul voyage (Review Focus 3) ; panne `creerVoyage` → `.alerte` en bas, on reste sur l'aperçu, rien ne bouge, un second appui la panne levée crée un seul voyage ; tout écarter → `#raison-vide`, « Créer » `aria-disabled` et sans effet ; bibliothèque d'essai dont rien n'entre → `.apercu-vide`, « Revenir aux étiquettes » mène à Activités ; Review Focus 5 : nom `Vercors <i>&</i> "amis"` rendu en texte dans le rappel.
  - Les tests existants adaptés au nouveau parcours restent sur leurs attendus (calendrier, voyageurs, messages, fenêtre, clavier, focus).
  - 4 formats × 2 thèmes : `verifierCommandes`, `verifierBarres`, captures `assistant-<etat>-<format>-<theme>.png`.
- [ ] **Step 2:** lancer les tests d'écran touchés → rouges (garder la sortie).
- [ ] **Step 3:** écrire `assistant-vues.js` et réécrire `nouveau-voyage.js` (chacun sous 500 lignes) ; reprendre de `docs/maquettes/assistant/maquette.css` les règles de la rangée, des puces, de l'aperçu, du pied et de l'ombre dans `assistant.css` (sans `!important` : sélecteurs plus précis) ; × , « Annuler » et le lien « Mes voyages » ferment encore directement (la confirmation vient en tâche 7).
- [ ] **Step 4:** tous les tests d'écran de l'assistant → verts ; `pnpm test && pnpm controles` → verts.
- [ ] **Step 5:** regarder soi-même les captures aux quatre formats, clair et sombre, contre celles de la maquette.
- [ ] **Step 6: Commit** — `feat(ecrans): assistant en étapes avec étiquettes et aperçu décochable`.

---

### Task 7: Retour système, abandon et objets écartés

**Files:**
- Modify: `src/ecrans/nouveau-voyage.js`, `tests/ecran-retour.mjs`, `tests/ecran-nouveau-voyage-etapes.mjs`, `tests/ecran-nouveau-voyage-apercu.mjs`

**Interfaces:**
- Consumes : `poserGardeRetour`, `demander` (tâche 5) ; `entrerDansApercu`, `remettre`, `saisieCommencee` (tâche 4).

- [ ] **Step 1: Tests qui échouent** :
  - retour système depuis l'Aperçu → Hébergement ; encore → Climat ; jusqu'à Informations ; Informations avec saisie → « Abandonner ce nouveau voyage ? » ; « Continuer la saisie » garde tout (nom, dates, étiquettes, écartés) ; « Abandonner » → Mes voyages, et le retour suivant quitte l'appli comme avant (HORS) ; sans saisie → fermeture directe ;
  - ×, « Annuler », Échap (fenêtre) et « Mes voyages » (téléphone) passent par la même confirmation quand quelque chose est saisi ;
  - objets écartés : aller-retour Aperçu → Activités → Aperçu sans changement → aucune fenêtre, choix gardés ; Randonnée retirée puis Aperçu avec Gourde écartée → fenêtre qui nomme Gourde (et sa catégorie) ; « Les remettre dans la liste » la recoche ; refaire et choisir « Les garder écartés » → reste écartée ; Échap → reste écartée ;
  - Review Focus 4 : fenêtre des objets écartés ouverte, retour système → elle se ferme, on reste sur l'aperçu ; confirmation d'abandon ouverte, retour système → elle se ferme, on reste sur Informations.
- [ ] **Step 2:** → rouges. **Step 3:** brancher la garde (posée tant que l'étape > 0 ou que la saisie a commencé), la confirmation et la fenêtre des objets écartés (contenu : liste `.liste-ecartes`, noms échappés). **Step 4:** → verts ; relancer tous les tests d'écran de l'assistant et `tests/ecran-voyage-retour.mjs`.
- [ ] **Step 5: Commit** — `feat(ecrans): retour à l'étape précédente, abandon confirmé, objets écartés`.

---

### Task 8: Les étiquettes dans l'en-tête du voyage

**Files:**
- Modify: `src/ecrans/voyage-vues.js` (`vueEntete`), `src/styles/voyage.css`, `tests/outils/voyage-essai.mjs` (`etiquettesDuVoyage` pour v1 : Randonnée, Camping, Froid, Tente — et un nom piégé `<b>Pluie & "vent"</b>`), `tests/ecran-voyage.mjs`, `tests/ecran-voyage-panneaux.mjs`

**Interfaces:**
- Consumes : `contenu.etiquettes` (tâche 1), clé `voyage.etiquettes` et `iconeInterface('etiquette')` (tâche 3).
- Produces : `ul.etiquettes-voyage[aria-label]` > `li` (picto + nom), sous les dates, dans l'ordre `ordre` ; rien si le voyage n'a pas d'étiquette.

- [ ] **Step 1: Test qui échoue** — v1 : les cinq puces, dans l'ordre, nom piégé rendu en texte ; v2 sans étiquette : pas de `ul.etiquettes-voyage` ; en une colonne et en deux panneaux ; puces non focalisables (aucun élément interactif dedans).
- [ ] **Step 2:** → rouge. **Step 3:** implémenter (style repris de la maquette : 13 px, 600, fond relevé, encre douce). **Step 4:** → vert.
- [ ] **Step 5: Commit** — `feat(ecrans): étiquettes du voyage dans son en-tête`.

---

### Task 9: Vérification complète et essai sur les appareils

**Files :** aucun nouveau ; `docs/PLAN.md` n'est coché que par le chef de projet.

- [ ] **Step 1:** `pnpm verif` en tâche de fond → tout vert (lint, format, contrôles, tests, base, écrans).
- [ ] **Step 2:** relecture de l'ensemble (une seule) : l'inclusion n'existe que dans `inclusion.js` ; aucun texte en dur ; fichiers sous 500 lignes ; migration 004 relue (aucune table existante touchée).
- [ ] **Step 3:** essai sur la tablette (mémoire « Essai sur la tablette ») et sur l'ASUS : **montrer d'abord au chef de projet la liste des voyages présents** et attendre son accord avant `pm clear fr.biovibralyon.baluchon` (décision du 2026-10-24) ; `pnpm android:essai`, `adb install -r` ; parcours complet en portrait et en paysage, clair et sombre ; remettre rotation et thème d'origine.
- [ ] **Step 4:** compte rendu au chef de projet (une quarantaine de lignes au plus) : ce qui a changé, ce qui est vérifié (commandes et résultats), l'impact sur les données (schéma 004), ce qui reste à valider par lui.
