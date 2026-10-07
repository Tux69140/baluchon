# Phase 2 — Créer un voyage simple : conception

> Sources : `docs/PLAN.md` (phase 2, US-9, US-10, US-28), `docs/PRD.md`, `docs/DESIGN.md`.
> Choix produit validés par le chef de projet le 2026-10-06 (échange de conception).

## Ce que voit l'utilisateur

### Mes voyages (`#/voyages`)

- Premier lancement : l'écran vide de la phase 1, inchangé.
- Dès qu'un voyage existe : jusqu'à trois rubriques titrées, **En cours**, **À venir** et **Passés**. Seules les rubriques non vides s'affichent.
  - En cours : départ ≤ aujourd'hui ≤ retour.
  - À venir : du plus proche au plus lointain, par date de départ.
  - Passés : du plus récent au plus ancien, par date de retour.
  - « Aujourd'hui » est la date locale de l'appareil.
- Chaque voyage tient sur une carte : nom, destination (si saisie), dates (« du sam. 10 au mar. 13 oct. 2026 ») et nombre de voyageurs. Toucher la carte ouvre le voyage.
- Un bouton flottant « Nouveau voyage » reste en bas de l'écran, au-dessus de la barre système.

### Nouveau voyage (`#/nouveau-voyage`) : étape Informations

- **Nom** : obligatoire.
- **Destination** : facultative.
- **Dates** : un **calendrier unique**, un mois à la fois, avec des flèches ‹ › pour changer de mois. La semaine commence le lundi et le jour d'aujourd'hui est repéré.
  - Le premier appui fixe le départ, le second fixe le retour, et les jours entre les deux sont grisés.
  - Deux appuis sur le même jour font un aller-retour dans la journée.
  - **Choix A** : si l'on touche un jour antérieur au départ alors que le retour n'est pas encore choisi, ce jour devient le nouveau départ. Aucun message ne s'affiche.
  - Une fois le départ et le retour fixés, un nouvel appui recommence la sélection : ce jour devient le départ.
  - Les jours situés à plus d'un an après le départ sont grisés et ne peuvent pas être choisis. Limite : au plus tard le même jour de l'année suivante ; pour un départ un 29 février, le 28 février.
  - Les dates passées restent choisissables, pour pouvoir noter un voyage déjà fait.
  - Au-dessus du calendrier, un résumé : « Du sam. 10 oct. au mar. 13 oct. · 4 jours, 3 nuits ».
  - Au clavier (ordinateur) : les flèches changent de jour, Entrée ou Espace choisit le jour, et Page préc. / Page suiv. changent de mois.
- **Voyageurs** : 2 par défaut, avec les boutons − / +, bornés de 1 à 20.
- **Créer le voyage** : si le nom ou les dates manquent, un message en toutes lettres s'affiche sous le champ concerné. Chaque message a une place réservée, pour que rien ne bouge à l'écran. Le voyage n'est pas créé.
- Un bouton retour ramène à Mes voyages sans rien créer.
- Les noms des mois et des jours viennent du navigateur, dans la langue de l'appli (aucun texte en dur).

### Le voyage (`#/voyage/:id`) : lecture seule

- En-tête : nom, destination, dates, nombre de voyageurs, et un bouton retour vers Mes voyages.
- Une carte par catégorie, dans l'ordre de la bibliothèque. Chaque carte porte un pavé coloré de 44 px avec l'icône Phosphor Duotone à l'encre marine, puis le nom de la catégorie.
- Dans chaque carte, les objets par ordre alphabétique, chacun avec sa quantité en chiffres tabulaires.
- Aucune coche ni aucune modification (phases 3 et 8).
- Une adresse vers un voyage inconnu affiche un message en toutes lettres et un retour vers Mes voyages.

### Mini-bibliothèque de départ (provisoire, remplacée en phase 13)

Tout y est « toujours inclus ». Les catégories suivent l'ordre ci-dessous.

| Catégorie (icône, couleur) | Objet | Règle | Valeur | Plafond / pers. | Par personne | Consommable |
|---|---|---|---|---|---|---|
| Vêtements (`t-shirt`, ciel) | T-shirts | par jour | 1 | 5 | oui | non |
| | Sous-vêtements | par jour | 1 | — | oui | non |
| | Pyjama | par nuit | 1 | 1 | oui | non |
| Toilette (`tooth`, lagon) | Brosse à dents | fixe | 1 | — | oui | non |
| | Dentifrice | fixe | 1 | — | non | non |
| Alimentation (`fork-knife`, pomme) | Repas | par jour | 2 | — | oui | oui |
| | Gourde | fixe | 1 | — | oui | non |
| Papiers (`identification-card`, tournesol) | Pièce d'identité | fixe | 1 | — | oui | non |
| | Chargeur de téléphone | fixe | 1 | — | non | non |

La mini-bibliothèque vit dans `src/i18n/fr.json` (clé `bibliothequeDeDepart`). Elle est installée **une seule fois**, au premier lancement, puis elle appartient à l'utilisateur.

## Règles (modèle pur, `src/modele/`)

- **Dates** (`dates.js`) : dates de calendrier `AAAA-MM-JJ`, sans heure, calculées sans fuseau horaire.
  - Jours = dates du départ au retour inclus ; nuits = jours − 1.
  - Date limite = même jour de l'année suivante (29 février → 28 février).
  - Découpage d'un mois en semaines commençant le lundi, pour le calendrier.
- **Quantité** (`quantites.js`) : une seule fonction.
  - Base = valeur (fixe), valeur × jours, ou valeur × nuits.
  - Plafond appliqué à la base, donc par personne.
  - Puis multiplication par le nombre de voyageurs si l'objet est « par personne ».
  - Résultat entier.
- **Validation** (`voyage.js`) : nom non vide après retrait des espaces, dates valides, retour ≥ départ, retour ≤ date limite, voyageurs entier de 1 à 20. Elle renvoie la liste des erreurs, rangées par champ.
- **Génération** (`voyage.js`) : à partir de la bibliothèque et des informations validées (une validation qui échoue bloque la génération), elle produit le voyage, ses catégories et ses objets, chacun **copié** (nom, icône, couleur, ordre, règle, note) avec l'identifiant de son modèle d'origine.
  - Un objet dont la quantité vaut 0 est écarté.
  - Une catégorie restée sans objet est écartée.
  - `a_acheter` reprend « consommable », ce qui prépare la phase 9 sans rien afficher.
- **Classement** (`voyage.js`) : il répartit les voyages en en cours, à venir et passés, dans les ordres ci-dessus, d'après une date « aujourd'hui » reçue en paramètre.
- **Bibliothèque de départ** (`bibliotheque.js`) : elle construit les lignes de la bibliothèque (identifiants, ordre, `modifie_le`) à partir des données du fichier de traduction.
- Les identifiants sont des UUID v4. Ils sont fabriqués par une fonction reçue en paramètre, ce qui rend les tests reproductibles. La fonction réelle s'appuie sur `crypto.getRandomValues`, disponible aussi sur Android.

## Stockage (`src/stockage/`)

La porte d'entrée reste `index.js`. Nouvelles fonctions, dans les variantes Tauri et navigateur, de même forme :

- `bibliothequeInstallee()` → booléen.
- `installerBibliotheque(bibliotheque)` : écrit tout en une seule opération et ne fait rien si la bibliothèque est déjà installée (la vérification se fait dans la même opération).
- `lireBibliotheque()` → catégories et objets modèles, dans l'ordre.
- `creerVoyage({ voyage, categories, objets })` : une seule opération. En cas d'échec, rien n'est écrit.
- `lireVoyage(id)` → `{ voyage, categories, objets }`, ou `null` si le voyage est inconnu.
- `listerVoyages()` : inchangée.

Côté Rust (`src-tauri/src/base.rs`, découpé si le fichier approche des 500 lignes), une commande Tauri relaie chaque fonction.

## Données : migration 002 (impact sur la base)

Seuls des ajouts : aucune donnée existante n'est modifiée.

- `meta (cle, valeur)` : `bibliotheque_installee`, `langue_bibliotheque`.
- `categorie_modele (id, nom, icone, couleur, ordre, toujours_incluse, modifie_le)`.
- `objet_modele (id, categorie_id → categorie_modele, nom, regle CHECK fixe|par_jour|par_nuit, valeur ≥ 0, plafond NULL ou ≥ 0, par_personne, consommable, toujours_inclus, note, modifie_le)`.
- `categorie_du_voyage (id, voyage_id → voyage ON DELETE CASCADE, modele_id facultatif sans contrainte, nom, icone, couleur, ordre, modifie_le)`.
- `objet_du_voyage (id, voyage_id → voyage ON DELETE CASCADE, categorie_id → categorie_du_voyage, modele_id facultatif sans contrainte, nom, regle, valeur, plafond, par_personne, consommable, quantite ≥ 0, quantite_manuelle, dans_le_sac, a_acheter, achete, note, modifie_le)`.

Les tables d'étiquettes arrivent en phase 4, avec leur propre migration.

## Écrans (`src/ecrans/`) et aiguillage

- `main.js` gagne un aiguillage sur l'adresse (`#/voyages`, `#/nouveau-voyage`, `#/voyage/:id`). Une adresse inconnue mène à `#/voyages`.
- Au démarrage, `main.js` installe la bibliothèque de départ si elle est absente.
- Un fichier par écran : `voyages.js` (étendu), `nouveau-voyage.js`, `voyage.js`. Le calendrier forme un composant à part (`calendrier.js`), réutilisable pour « Refaire ce voyage » (phase 11) et la modification des dates (phase 10).
- Icônes : la dépendance `@phosphor-icons/core` (licence MIT, déjà retenue par DESIGN.md) est importée icône par icône, si bien que seules les icônes utilisées sont embarquées. Un registre unique (`src/ecrans/icones.js`) associe un nom d'icône à son dessin.
- Feuilles de style : une par écran, plus une pour le calendrier.
- Tous les textes vont dans `fr.json`.

## Tests

- **Modèle** (`node --test`) :
  - Critère 2 : du 10 au 13 à 2 voyageurs, Repas = 16 et un objet partagé fixe à 1 = 1.
  - Le plafond s'applique avant la multiplication.
  - Un objet « par nuit » sur un aller-retour dans la journée vaut 0 et est écarté.
  - Une catégorie vide est écartée.
  - Validation : retour avant le départ refusé, durée d'un an pile acceptée, un jour de plus refusé (29 février compris), voyageurs 0 et 21 refusés, nom vide refusé.
  - Classement : un voyage en cours, deux à venir et deux passés, dans le bon ordre, y compris aux limites (départ ou retour aujourd'hui).
  - Construction de la bibliothèque de départ depuis `fr.json`.
- **Base** (`cargo test`) :
  - L'installation de la bibliothèque est faite une seule fois, même rappelée.
  - Un voyage créé est relu à l'identique, puis encore après réouverture de la base.
  - Une création qui échoue en cours de route ne laisse rien.
  - La migration 002 s'applique sur une base de la phase 1 qui contient déjà un voyage, sans le perdre.
- **Écrans** (Playwright, jugés au code de sortie, date du jour fixée par le test) :
  - Parcours complet : bouton flottant → formulaire → deux appuis sur le calendrier → résumé « 4 jours, 3 nuits » et jours grisés → Créer.
  - La liste du voyage montre Repas 16 et Dentifrice 1, et le Pyjama n'apparaît pas sur un aller-retour dans la journée.
  - Le voyage est toujours là après rechargement de la page.
  - Choix A : un appui antérieur devient le nouveau départ.
  - Un jour à plus d'un an n'est pas choisissable.
  - Nom manquant : le message s'affiche à sa place réservée, et rien d'autre ne bouge à l'écran.
  - Navigation au clavier dans le calendrier.
  - Mes voyages : les trois rubriques sont dans le bon ordre.
  - Cibles de 44 px, aucun défilement de côté, rien sous les barres système, aucune requête hors de l'appli.
  - Une paire de captures clair/sombre par écran touché.
- **Tablette** (essai manuel, mode avion) : créer un voyage, fermer l'appli, la rouvrir et retrouver le voyage. Vérifier aussi l'icône de l'appli installée.

## Écart avec le plan validé

Le critère de PLAN.md « Un retour avant le départ affiche une erreur en toutes lettres et bloque l'étape suivante » devient, d'après le choix A : « Un appui sur un jour antérieur au départ en fait le nouveau départ ; un voyage dont le retour précède le départ est refusé par l'appli. Une durée au-delà d'un an est refusée (jours grisés). » PLAN.md sera mis à jour en ce sens. L'intention d'US-10, ne jamais obtenir de quantités absurdes, reste tenue.
