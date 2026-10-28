# Phase 8 — Ajuster un voyage : plan de réalisation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal :** dans un voyage, on corrige la quantité prévue d'un objet (« fixée manuellement », confirmation avant de sortir une pièce du sac), on le renomme, on le retire (confirmation, puis « Annuler » 10 s) ; on ajoute un objet, au besoin dans une catégorie propre au voyage, puis « Ajouter aussi à la bibliothèque ? » ouvre la fiche de la bibliothèque préremplie. Rien ne touche la bibliothèque sans « Oui ».

**Architecture :** sans migration, la base reçoit les écritures du voyage (ajouter ou rétablir un objet avec sa catégorie neuve, régler la quantité, renommer, retirer) et une écriture de la bibliothèque qui entre une catégorie et un objet modèles d'un coup en liant l'objet (et la catégorie) du voyage. Le modèle pur (`src/modele/ajustements.js`) fabrique les lignes et décide (bornes, confirmation, extrait d'un retrait, saisies préremplies). Côté écrans : l'écran du voyage gagne un passage commun pour appliquer un changement et l'écrire (`appliquer`), les gestes de la fiche (`fiche.js`), l'ajout (`fiche-ajout.js`, `choix-categorie.js`), la chaîne « Oui » (`ajout-bibliotheque.js`) ; le bandeau de la phase 7 apprend la portée d'un retrait.

**Tech Stack :** Tauri 2, JavaScript simple, Vite 6, rusqlite 0.32, Playwright 1.62 (dont `page.clock`), `node --test`, Phosphor 2.1.1.

**Spec :** `docs/superpowers/specs/2026-10-28-phase-8-ajuster-design.md` (décisions 1 à 5, choix de l'agent, section « Maquettes validées »), `docs/PLAN.md` phase 8, `docs/PRD.md` (US-18 à US-21 ; puce « Ajuster un voyage »), maquette validée `docs/maquettes/ajuster/` (`python3 -m http.server 8647 --bind 127.0.0.1` à la racine, puis `/docs/maquettes/ajuster/?etat=…`). **La maquette fait foi pour l'aspect, les textes et les gestes** : `fiches.js` (fiches, questions et toutes leurs phrases), `maquette.js` (écran, enchaînements, bandeau, message), `maquette.css`, `gestes.mjs` (le parcours attendu).

## Global Constraints

- Lire `AGENTS.md` et `CLAUDE.md` : français partout, commentaires qui disent le *pourquoi*, TDD (garder la sortie rouge dans le rapport), fichiers de 500 lignes au plus (`voyage.js` 252, `voyages.rs` 454, `navigateur.js` 303 : les nouveautés vont dans des fichiers à elles), un nom n'est exporté que s'il est importé ailleurs, aucun texte d'interface hors de `src/i18n/fr.json`.
- Couches : un écran n'importe que `src/stockage/index.js` côté stockage ; le modèle n'importe que le modèle ; seul le stockage touche `localStorage` ou Tauri.
- pnpm uniquement ; `pnpm exec prettier --write <fichiers>` après chaque écriture ; `cargo fmt` pour le Rust.
- **Commits** autorisés sur la branche `phase-8` ; fichiers nommés (`git add <chemins>`, vérifier `git diff --cached --name-only`), message `type(portée): message` en français ; ne jamais ajouter `CLAUDE.md`. Jamais de push. **Aucune migration** (le dire dans les messages des commits de la base).
- **Rien des phases suivantes** : ni « À acheter » ni Courses (phase 9), ni dates, voyageurs ou étiquettes d'un voyage existant (phase 10), ni « Refaire ce voyage » ou suppression d'un voyage (phase 11) ; ni renommer, recolorer, ranger ou supprimer une catégorie du voyage ; ni « revenir au calcul » ; la note reste en lecture seule.
- **Objet ajouté à la main** (ligne `objet_du_voyage`) : `regle 'fixe'`, `valeur` = quantité, `plafond null`, `parPersonne true` (sa ligne ne dit pas « partagé » ; sa quantité, manuelle, n'est jamais recalculée), `consommable false`, `quantiteManuelle true`, `dansLeSac 0`, `aAcheter false`, `achete false`, `note ''`, `modeleId null`.
- **Catégorie ajoutée** : `modeleId null`, `ordre` = rang suivant du voyage (`rangSuivant`, `src/modele/modeles.js`) ; elle naît avec son premier objet, jamais vide.
- **Quantité prévue** : − / + de 1 à `BORNES_QUANTITE.max` (999) ; − inactif à 1 ; + inactif à 999 ou au-delà ; une quantité calculée au-delà de 999 descend normalement. Tout réglage rend `quantiteManuelle` vrai, définitivement. Baisser sous `dansLeSac` demande la confirmation « Sortir une pièce du sac ? », puis `dansLeSac` = nouvelle quantité.
- **Retrait** : supprime l'objet ; sa catégorie aussi si elle devient vide, dans la même opération. « Annuler » réécrit les mêmes lignes à l'identique (mêmes ids, tous les champs, catégorie à son rang). Bandeau : celui de la phase 7, 10 000 ms, un seul à la fois (un retrait remplace un bandeau de la bibliothèque et inversement). Ajouter un objet au **même voyage** rend le retrait définitif ; les autres écritures (cocher, régler, renommer, écrire dans la bibliothèque) le laissent.
- **« Oui »** : rien n'est écrit dans la bibliothèque avant le dernier « Ajouter à la bibliothèque » ; alors catégorie neuve éventuelle, objet modèle et liens du voyage (`modeleId` de l'objet, et de la catégorie du voyage si la catégorie de la bibliothèque vient d'être créée depuis elle) en **une** opération. C'est une écriture de la bibliothèque (`ECRITURES_BIBLIOTHEQUE`).
- **Typographie des nouveaux textes** : espace insécable (U+00A0) après « et avant », et avant `: ; ? !` (règle de la phase 7).
- Panne d'écriture : fiche d'ajout, de renommage ou de la bibliothèque → reste ouverte avec sa saisie, message en haut (mécanique de `ouvrirFicheModele`) ; réglage de quantité → relecture et message au bas de l'écran, comme une coche ; retrait refusé → rien ne change, pas de bandeau.
- Tests d'écran jugés au code de sortie, jamais de pause fixe (`page.clock` pour les 10 s) ; une capture claire et une sombre par écran touché dans `captures-travail/`, aux formats `TOUS_FORMATS` de `tests/outils/bibliotheque.mjs`.

## Review Focus

1. Noms avec `<`, `&`, `"` (objet ajouté ou renommé, catégorie neuve) : rendus en texte dans la ligne, le titre de la fiche, les questions, le bandeau et le message « … est dans la bibliothèque » (tâches 5, 6, 7).
2. Double appui sur « Ajouter », « Retirer », « Prévoir 1 », « Ajouter à la bibliothèque » ou « Annuler » : une seule écriture ; un nouvel essai après une panne réécrit le même id, jamais un second objet (tâches 5, 6, 7).
3. Retirer le dernier objet de la catégorie choisie (grand écran), puis le dernier objet du voyage : la première catégorie restante est choisie, puis l'écran vide avec « Ajouter un objet » ; « Annuler » rend la catégorie à son rang, choisie, l'objet éclairé (tâche 5).
4. « Annuler » touché depuis un autre écran (accueil, Bibliothèque) : le voyage est rétabli sans erreur ; rouvert, il montre l'objet ; sous le filtre « Reste à emballer », un objet devenu complet en baissant sa quantité se masque comme après une coche (tâche 5).
5. Abandonner la chaîne « Oui » à chaque étape (fermer la question, la liste des catégories, la fiche de catégorie « Suivant », la fiche d'objet) : bibliothèque relue identique, objet du voyage sans `modeleId` (tâche 7).

## Ordre et parallélisme

1 (base et stockage), 2 (modèle) et 3 (textes et icônes) en parallèle : aucun fichier commun. 4 après 1. 5 après 2, 3 et 4. 6 après 5. 7 après 6. 8 en dernier, par le contrôleur.

---

### Task 1: Les écritures du voyage et l'ajout à la bibliothèque, dans la base et le stockage

**Files:**
- Create: `src-tauri/src/ajustements.rs`, `tests/stockage-ajustements.test.js`
- Modify: `src-tauri/src/lib.rs`, `src-tauri/src/voyages.rs` (rendre `pub(crate)` ce que `ajustements.rs` réutilise : `COLONNES_*`, l'insertion d'une catégorie et d'un objet du voyage, sorties de `creer_voyage` en `inserer_categorie(tx, &CategorieDuVoyage)` et `inserer_objet(tx, &ObjetDuVoyage)`), `src/stockage/tauri.js`, `src/stockage/navigateur.js` (ou un `navigateur-voyages.js` qui partage ses outils, si `navigateur.js` passe 450 lignes), `src/stockage/index.js` (`ECRITURES_BIBLIOTHEQUE` += `'ajouterALaBibliotheque'`), `tests/ecritures-bibliotheque.test.js` (les noms du voyage ajoutés à la liste des écritures hors bibliothèque)

**Interfaces:**
- Produces (Rust, `impl Base`, dans `ajustements.rs`), chacune en une transaction :
  - `ajouter_au_voyage(&self, ajout: &AjoutAuVoyage) -> Result<(), String>` où `AjoutAuVoyage { categorie: Option<CategorieDuVoyage>, objet: ObjetDuVoyage }` (serde camelCase) : voyage inconnu, catégorie d'un autre voyage ou absente (sans `categorie` neuve), id déjà pris → refusé, rien d'écrit ;
  - `retablir_dans_le_voyage(&self, ajout: &AjoutAuVoyage)` : même cœur (deux commandes, pour que l'écran sache qu'un rétablissement n'est pas un ajout) ;
  - `regler_quantite(&self, id, quantite: i64, dans_le_sac: i64, modifie_le) -> Result<(), String>` : pose `quantite`, `dans_le_sac`, `quantite_manuelle = 1` ; refuse `quantite < 1`, `dans_le_sac` hors de 0..=quantite, objet inconnu ;
  - `renommer_objet_du_voyage(&self, id, nom, modifie_le)` : refuse un nom vide après `trim`, objet inconnu ;
  - `retirer_du_voyage(&self, id) -> Result<(), String>` : supprime l'objet, puis sa catégorie si elle n'a plus d'objet ; objet inconnu refusé ;
  - `ajouter_a_la_bibliotheque(&self, ajout: &AjoutALaBibliotheque)` où `AjoutALaBibliotheque { categorie: Option<CategorieModele>, objet: ObjetModele, objet_du_voyage: String, categorie_du_voyage: Option<String> }` : `ecrire_categorie` puis `ecrire_objet` (de `edition.rs`, phase 7), puis `UPDATE objet_du_voyage SET modele_id` (et `categorie_du_voyage` si donnée) ; objet du voyage inconnu → tout refusé.
- Produces (commandes Tauri de mêmes noms ; stockage JS, mêmes refus des deux côtés) : `ajouterAuVoyage(ajout)`, `retablirDansLeVoyage(ajout)`, `reglerQuantite(id, quantite, dansLeSac, modifieLe)`, `renommerObjetDuVoyage(id, nom, modifieLe)`, `retirerDuVoyage(id)`, `ajouterALaBibliotheque(ajout)`. Pannes et lenteurs simulées sous ces noms.

- [ ] **Step 1: Tests Rust qui échouent** (dans `ajustements.rs`, base jetable avec un voyage créé, comme `voyages.rs`) : `ajouter_un_objet_dans_une_categorie_neuve_est_relu` (catégorie au rang donné, objet relu tel quel) ; `ajouter_dans_la_categorie_d_un_autre_voyage_est_refuse_sans_rien_ecrire` ; `regler_la_quantite_la_rend_manuelle_et_survit_a_la_fermeture` (critère du plan) ; `regler_la_quantite_refuse_zero_et_un_sac_trop_plein` ; `regler_au_dela_de_999_est_permis` ; `renommer_refuse_un_nom_vide` ; `retirer_le_dernier_objet_retire_sa_categorie` ; `retirer_puis_retablir_rend_le_voyage_identique` (`lire_voyage` avant == après, catégorie comprise) ; `retirer_ne_touche_pas_la_bibliotheque` (critère du plan : `lire_bibliotheque` identique) ; `ajouter_a_la_bibliotheque_cree_categorie_objet_et_liens` ; `ajouter_a_la_bibliotheque_refuse_un_objet_du_voyage_inconnu_sans_rien_ecrire`.
- [ ] **Step 2:** `pnpm test:base` → les nouveaux tests échouent.
- [ ] **Step 3:** sortir `inserer_categorie` / `inserer_objet` de `creer_voyage` (sans changement de comportement), écrire `ajustements.rs`, déclarer module et commandes dans `lib.rs`.
- [ ] **Step 4:** `pnpm test:base` → tout vert ; `cargo fmt`.
- [ ] **Step 5: Tests JS qui échouent** (`tests/stockage-ajustements.test.js`) : mêmes cas que l'étape 1 (sans la fermeture), plus `une panne simulée de retirerDuVoyage ne change rien`.
- [ ] **Step 6:** écrire les six fonctions dans le stockage navigateur (résultat entier calculé avant d'écrire) et dans `tauri.js` ; compléter `ECRITURES_BIBLIOTHEQUE` et `tests/ecritures-bibliotheque.test.js`. `pnpm test` → vert.
- [ ] **Step 7: Commit** `feat(base): ajouter, régler, renommer, retirer et rétablir dans un voyage ; ajouter à la bibliothèque depuis un voyage (sans migration)`.

### Task 2: Les règles d'un ajustement (modèle)

**Files:**
- Create: `src/modele/ajustements.js`, `tests/ajustements.test.js`

**Interfaces:**
- Consumes : `BORNES_QUANTITE`, `rangSuivant` (`src/modele/modeles.js`) ; le contenu d'un voyage tel que `lireVoyage` le rend (`{ voyage, etiquettes, categories, objets }`).
- Produces :
  - `validerAjout({ nom, categorie })` → erreurs par champ (`{ nom: 'nomManquant', categorie: 'categorieManquante' }`, `{}` si bon) ; `categorie` est un id ou `{ nouvelle: { nom, icone, couleur } }` ;
  - `validerNouvelleCategorie({ nom })` → `{ nom: 'nomManquant' }` ou `{}` ;
  - `preparerAjout(saisie, contenu, { nouvelId, maintenant })` → `AjoutAuVoyage` (`{ categorie: CategorieDuVoyage | null, objet: ObjetDuVoyage }`, lignes de « Global Constraints ») ; refuse (`refuser`) une saisie invalide ;
  - `boutonsDeQuantite(objet)` → `{ moins: boolean, plus: boolean }` ;
  - `reglerQuantite(objet, quantite)` → `{ quantite, dansLeSac: Math.min(objet.dansLeSac, quantite), confirmer: quantite < objet.dansLeSac }` ;
  - `extraitDuRetrait(contenu, objetId)` → `AjoutAuVoyage` (l'objet tel quel ; sa catégorie seulement s'il en est le dernier objet) ;
  - `saisieObjetPourLaBibliotheque(objet)` → la saisie d'objet modèle préremplie : `{ nom, regle: 'fixe', valeur: Math.min(objet.quantite, BORNES_QUANTITE.max), plafond: null, parPersonne: false, consommable: false, selonEtiquettes: true, etiquettes: [], note: '' }` (forme de `saisieDObjet`) ;
  - `saisieCategoriePourLaBibliotheque(categorie)` → `{ nom, icone, couleur, selonEtiquettes: true, etiquettes: [] }` (forme de `saisieDeCategorie`).

- [ ] **Step 1: Tests qui échouent** : `un objet ajouté est fixé manuellement et ne dit pas partagé` (champs exacts de « Global Constraints ») ; `une catégorie neuve prend le rang suivant et naît avec l'objet` ; `ajouter sans nom ou sans catégorie est refusé` ; `moins est inactif à 1, plus à 999 et au-delà` ; `baisser sous ce qui est dans le sac demande confirmation et fait suivre le sac` ; `monter ne demande rien` ; `le retrait du dernier objet emporte sa catégorie dans l'extrait` ; `les saisies préremplies passent la validation des fiches une fois une étiquette choisie` (avec `validerObjet` / `validerCategorie` : refusées sans étiquette, acceptées avec une).
- [ ] **Step 2:** `node --test tests/ajustements.test.js` → échec (module absent).
- [ ] **Step 3:** écrire `src/modele/ajustements.js`.
- [ ] **Step 4:** `node --test tests/ajustements.test.js` → vert.
- [ ] **Step 5: Commit** `feat(modele): règles d'ajustement d'un voyage (ajout, quantité, retrait, saisies pour la bibliothèque)`.

### Task 3: Textes et icônes

**Files:**
- Modify: `src/i18n/fr.json`, `src/ecrans/icones.js` (au besoin : crayon, livres), `tests/textes-voyage.test.js` (créer s'il n'existe pas, sur le modèle de `tests/textes-suppressions.test.js`)

**Interfaces:**
- Produces : les clés ci-dessous, copie exacte de la maquette (`docs/maquettes/ajuster/fiches.js`, `maquette.js`), pluriels `one`/`other` comme `voyage.masques`, `{nom}`, `{categorie}`, `{n}`, `{quantite}` à remplir ; insécables de la phase 7 :
  - `voyage.ajouter` ; `voyage.vide.texte` remplacé par « Ce voyage ne contient plus aucun objet. Ajoutez-en ici. » ; `voyage.erreurModification` « La modification n'a pas pu être enregistrée. Réessayez. » ;
  - `fiche.ajuster`, `fiche.quantitePrevue`, `fiche.calculee` (« calculée : {regle} »), `fiche.fixeeManuellement`, `fiche.quantiteMoins`, `fiche.quantitePlus`, `fiche.renommer`, `fiche.retirer` ;
  - `ajustement.baisse.{titre, texte, garder, prevoir}` ; `ajustement.retrait.{titre, bibliotheque, pieces (one/other), derniere, garder, retirer, bandeau, bandeauCategorie, erreur}` ; `ajustement.ajout.{titre, voyageSeulement, categorie, objetsDansCeVoyage (one/other), nouvelleSousTitre, aChoisir, aChoisirAide, quantite, pourToutLeVoyage, ajouter, abandon}` ; `ajustement.choix.{titre, objets (one/other), nouvelle, pourCeVoyage}` ; `ajustement.nouvelleCategorie.{texte, choisir}` ; `ajustement.renommer.{titre, abandon}` ; `ajustement.bibliotheque.{question, questionTexte, non, oui, choixTitre, choixTexte, creer, suivant, ajouter, fait}` ; codes d'erreur `categorieManquante` à côté de `nomManquant`.
- Les textes déjà présents (« Nouvelle catégorie », « Enregistrer », messages d'abandon de la bibliothèque) sont repris, pas recopiés.

- [ ] **Step 1: Test qui échoue** : chaque clé ci-dessus existe, et les nouveaux textes respectent les insécables (comme `tests/textes-suppressions.test.js`).
- [ ] **Step 2:** `node --test tests/textes-voyage.test.js` → échec.
- [ ] **Step 3:** écrire les clés, les icônes manquantes.
- [ ] **Step 4:** `pnpm test` et `pnpm controles` → vert.
- [ ] **Step 5: Commit** `feat(textes): textes de la phase 8 (ajuster un voyage)`.

### Task 4: Le bandeau « Annuler » d'un retrait, et le message de réussite

**Files:**
- Modify: `src/ecrans/annulation.js`, `src/ecrans/alerte.js`, `src/styles/bibliotheque.css` (ou la feuille de `.alerte-haut`), `tests/ecran-annulation.mjs` (ou un `tests/ecran-annulation-voyage.mjs`)

**Interfaces:**
- Consumes : `ajouterAuVoyage` (tâche 1).
- Produces :
  - `montrerAnnulation({ t, app, texte, annuler, voyage = null })` : `voyage`, l'id du voyage d'un retrait ; un bandeau sans `voyage` est celui de la bibliothèque ;
  - `surveillerEcritures(stockage)` : une écriture de la bibliothèque ne retire que le bandeau de la bibliothèque ; `ajouterAuVoyage(ajout)` retire le bandeau dont `voyage === ajout.objet.voyageId` ; `retablirDansLeVoyage` ne retire rien ;
  - `annoncerEnHaut(app, texte, signal)` dans `alerte.js` : la même place que `alerterEnHaut`, en `message-succes`, `role="status"`, la coche, `DUREE_ALERTE`.

- [ ] **Step 1: Tests d'écran qui échouent** : `un retrait affiché survit à une écriture de la bibliothèque` ; `ajouter au même voyage retire le bandeau du retrait` ; `ajouter à un autre voyage le laisse` ; `une suppression de la bibliothèque remplace le bandeau d'un retrait` ; `le message de réussite s'affiche en haut et s'efface` (avec son témoin positif : le bandeau de la bibliothèque, lui, part bien à une écriture de la bibliothèque).
- [ ] **Step 2:** lancer ces tests → échec.
- [ ] **Step 3:** écrire la portée et `annoncerEnHaut`.
- [ ] **Step 4:** ces tests et `tests/ecran-annulation*.mjs` → vert.
- [ ] **Step 5: Commit** `feat(annulation): le bandeau d'un retrait du voyage, et le message de réussite en haut`.

### Task 5: La fiche de l'objet : quantité prévue, renommer, retirer et annuler

**Files:**
- Create: `src/ecrans/ajustements.js` (les gestes d'ajustement de l'écran du voyage : régler, renommer, retirer, annuler), `src/styles/ajustements.css`, `tests/ecran-voyage-ajuster.mjs`, `tests/ecran-voyage-retirer.mjs`
- Modify: `src/ecrans/fiche.js` (ligne du haut = catégorie seule ; bloc « Ajuster cet objet » ; « Retirer du voyage » en rouge sous un trait, `zoneSuppression`), `src/ecrans/voyage.js` (passage commun `appliquer`, écoute de `voyage-retabli`), `src/main.js` (feuille), tests de la fiche existants qui lisent la ligne du haut (`tests/ecran-voyage-fiche.mjs`)

**Interfaces:**
- Consumes : `reglerQuantite`, `renommerObjetDuVoyage`, `retirerDuVoyage`, `retablirDansLeVoyage` (tâche 1) ; `boutonsDeQuantite`, `reglerQuantite` (modèle), `extraitDuRetrait` (tâche 2) ; `montrerAnnulation({ …, voyage })` (tâche 4) ; `ouvrirFicheModele` pour « Renommer » (classe `fiche-nom`, `champNom(…, { entree: true })`).
- Produces :
  - dans `voyage.js`, `appliquer(nouveauContenu, ecriture: () => Promise)` : le passage commun de tout changement (coche comprise) : contenu, liste, dessin, répit, puis l'écriture dans la file ; un échec relit et dit `voyage.erreurEnregistrement` pour une coche, `voyage.erreurModification` sinon ;
  - `ouvrirFiche({ …, surQuantite(n), surRenommer(), surRetirer() })` (fiche.js) ; la fiche se repeint par `repeindre(objet, categorie)` ;
  - événement `window` `voyage-retabli` (`detail: { voyageId, objetId, categorieId }`) : l'écran ouvert sur ce voyage relit, choisit la catégorie, déplie et éclaire l'objet (`data-recent`, comme la Bibliothèque).

- [ ] **Step 1: Tests d'écran qui échouent** (`ecran-voyage-ajuster.mjs`) : `corriger la quantité la marque fixée manuellement et le reste à la relecture` (critère du plan) ; `baisser sous le sac demande « Sortir une pièce du sac ? » ; « Garder 2 » ne change rien, « Prévoir 1 » fait suivre le sac` ; `moins inactif à 1` ; `renommer change le nom dans ce voyage, pas dans la bibliothèque` ; `la ligne du haut ne dit que la catégorie` ; panne de `reglerQuantite` → relecture et message ; capture claire et sombre de la fiche aux formats.
- [ ] **Step 2: Tests d'écran qui échouent** (`ecran-voyage-retirer.mjs`) : `retirer demande confirmation, retire l'objet, pas la bibliothèque` (critère du plan) ; `retirer le dernier objet emporte sa catégorie, « Annuler » la rend à son rang` (Review Focus 3) ; `retirer le dernier objet du voyage montre l'écran vide` ; `« Annuler » depuis l'accueil rétablit le voyage` (Review Focus 4) ; `le bandeau disparaît après 10 s` (`page.clock`) ; panne de `retirerDuVoyage` → rien ne change, pas de bandeau ; double appui sur « Retirer » → un seul retrait.
- [ ] **Step 3:** lancer ces deux fichiers → échec.
- [ ] **Step 4:** écrire `appliquer` (la coche y passe, sans changement de comportement), la fiche, `ajustements.js`, la feuille.
- [ ] **Step 5:** ces tests, puis `tests/ecran-voyage*.mjs` → vert.
- [ ] **Step 6: Commit** `feat(voyage): corriger la quantité, renommer et retirer un objet du voyage, avec « Annuler »`.

### Task 6: Ajouter un objet, et la catégorie propre au voyage

**Files:**
- Create: `src/ecrans/fiche-ajout.js` (la fiche « Ajouter un objet » et « Nouvelle catégorie » du voyage), `src/ecrans/choix-categorie.js` (la liste de choix, partagée avec la tâche 7), `tests/ecran-voyage-ajouter.mjs`
- Modify: `src/ecrans/voyage-vues.js` (bouton flottant au téléphone, `ecran-avec-flottant` ; dernière ligne `objet-ajout` de la liste en grand écran ; bouton de l'écran vide), `src/ecrans/voyage.js` ou `ajustements.js` (action `ajouter`), `src/ecrans/fiche-categorie.js` (sortir le picto, la couleur et l'action du catalogue en morceaux partagés, sans changement de comportement), `src/styles/ajustements.css`

**Interfaces:**
- Consumes : `ouvrirFicheModele` ; `validerAjout`, `validerNouvelleCategorie`, `preparerAjout` (tâche 2) ; `ajouterAuVoyage` (tâche 1, par le stockage surveillé de la tâche 4).
- Produces :
  - `choisirCategorie({ t, titre, texte, lignes, choisie, nouvelle, signal, dans })` → `Promise<string | 'nouvelle' | null>` ; `lignes` : `[{ id, nom, icone, couleur, sousTitre }]` ; lignes de la fenêtre de refus (`refus-ligne`), la retenue sur fond actif avec la coche ;
  - `ouvrirAjout({ t, langue, contenu, choisie, signal, dans, ajouter })` → `Promise<{ objet, categorie } | null>` (ce qui a été écrit) ; `ajouter(ajout)` écrit ; l'id de l'objet est tiré à l'ouverture (un nouvel essai réécrit le même) ;
  - `ouvrirNouvelleCategorie({ t, langue, initiale, signal, dans })` → `Promise<{ nom, icone, couleur } | null>` (rien n'est écrit).

- [ ] **Step 1: Tests d'écran qui échouent** : `au téléphone, le bouton flottant ouvre la fiche, partie de la dernière catégorie dépliée` ; `en grand écran, la ligne « Ajouter un objet » part de la catégorie choisie` ; `ajouter dans une catégorie existante : l'objet apparaît à sa place, éclairé, 0 sur N, sans « partagé »` ; `ajouter dans une catégorie neuve : elle naît en dernier avec l'objet` (critère du plan : `lireBibliotheque` inchangée) ; `abandonner l'ajout ne crée rien, pas même la catégorie neuve` ; `sans nom, refusé` ; `un voyage vide propose « Ajouter un objet »` ; `ajouter rend définitif un retrait du même voyage` ; panne → fiche ouverte avec sa saisie, rien dans la liste ; nouvel essai → un seul objet ; captures claire et sombre (écran, fiche, liste, nouvelle catégorie).
- [ ] **Step 2:** lancer → échec.
- [ ] **Step 3:** écrire les vues, `choix-categorie.js`, `fiche-ajout.js`, l'action.
- [ ] **Step 4:** ces tests, puis `tests/ecran-voyage*.mjs` et `tests/ecran-bibliotheque-fiches*.mjs` (le morceau sorti de `fiche-categorie.js`) → vert.
- [ ] **Step 5: Commit** `feat(voyage): ajouter un objet au voyage, au besoin dans une catégorie propre au voyage`.

### Task 7: « Ajouter aussi à la bibliothèque ? »

**Files:**
- Create: `src/ecrans/ajout-bibliotheque.js`, `tests/ecran-voyage-ajout-bibliotheque.mjs`
- Modify: `src/ecrans/fiche-objet.js` et `src/ecrans/fiche-categorie.js` (paramètres facultatifs `prerempli` — la saisie de départ d'un élément neuf — et `bouton` — le libellé du bouton principal), l'appel après l'ajout (tâche 6)

**Interfaces:**
- Consumes : `demander` (`fenetre.js`) ; `choisirCategorie` (tâche 6) ; `saisieObjetPourLaBibliotheque`, `saisieCategoriePourLaBibliotheque` (tâche 2) ; `preparerCategorie`, `preparerObjet` (modèle), `sansAnnuler` (relecture des rangs et écriture ensemble, comme `editerCategorie`) ; `ajouterALaBibliotheque` (tâche 1) ; `annoncerEnHaut` (tâche 4).
- Produces : `proposerBibliotheque({ t, langue, stockage, contenu, objet, categorie, signal, dans })` → `Promise<boolean>` (vrai si l'objet est entré) : la question ; catégorie de la bibliothèque connue (`categorie.modeleId` présent dans la bibliothèque relue) → fiche d'objet préremplie dans celle-ci ; sinon `choisirCategorie` sur la bibliothèque, puis la fiche d'objet, ou « Nouvelle catégorie » → fiche de catégorie préremplie (« Suivant », rien d'écrit) → fiche d'objet ; le dernier bouton, « Ajouter à la bibliothèque », écrit tout par `ajouterALaBibliotheque` ; puis « « Palmes » est dans la bibliothèque. ».

- [ ] **Step 1: Tests d'écran qui échouent** : `« Non » ne touche pas la bibliothèque` (critère du plan) ; `« Oui » dans une catégorie connue crée l'objet modèle dans cette catégorie` (critère du plan, relu par `lireBibliotheque`) ; `sans étiquette, la fiche refuse ; avec, elle enregistre` ; `catégorie propre au voyage : choisir une catégorie existante y range l'objet, la catégorie du voyage n'est pas liée` ; `catégorie propre au voyage : « Nouvelle catégorie » crée catégorie et objet ensemble, et lie la catégorie du voyage` ; `abandonner à chaque étape n'écrit rien` (Review Focus 5) ; `la question n'est jamais posée pour un objet venu de la bibliothèque` (rien ne la déclenche hors de l'ajout) ; panne d'`ajouterALaBibliotheque` → fiche ouverte, rien d'écrit ; captures claire et sombre (question, liste, fiches préremplies, message).
- [ ] **Step 2:** lancer → échec.
- [ ] **Step 3:** écrire `prerempli` et `bouton` dans les deux fiches (sans changement pour leurs usages actuels), puis `ajout-bibliotheque.js`, et l'appeler après un ajout réussi.
- [ ] **Step 4:** ces tests, `tests/ecran-bibliotheque*.mjs` et `tests/ecran-voyage*.mjs` → vert.
- [ ] **Step 5: Commit** `feat(voyage): ajouter aussi à la bibliothèque un objet ajouté au voyage`.

### Task 8: Vérification complète et essais sur les appareils (contrôleur)

- [ ] **Step 1:** `pnpm verif` → tout vert (lint, formatage, contrôles, tests, base, écrans).
- [ ] **Step 2:** regarder soi-même les captures des écrans touchés (téléphone 393 × 873, tablette 800 × 1280 et 1280 × 800, ordinateur ; clair et sombre) contre la maquette.
- [ ] **Step 3:** essais sur la tablette, l'ASUS (Android 7) et le Xiaomi (`pnpm android:essai`), puis Debian (`pnpm tauri dev`), en annonçant l'appareil au moment où on le pilote : ajouter dans une catégorie neuve et à la bibliothèque, corriger une quantité sous le sac, renommer, retirer puis annuler, retour système qui ferme la question puis la fiche ; données de l'appli effaçables (essais).
- [ ] **Step 4:** cocher les critères du plan démontrés, rapport au chef de projet ; « validé » seulement sur sa parole.
