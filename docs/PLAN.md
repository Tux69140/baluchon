# Plan : Baluchon

> PRD source : `docs/PRD.md` (validé le 2026-10-06) ; design : `docs/DESIGN.md`.

## Décisions architecturales

Décisions durables qui s'appliquent à toutes les phases :

- **Pile** : Tauri 2 + JavaScript simple + Vite + SQLite, sur le modèle de Paré (`~/Documents/Evacuation/App_V2/appli`). Aucun service en ligne, aucun traceur.
- **Couches** : le **modèle** est pur et regroupe le calcul des quantités, l'inclusion par étiquettes, la génération d'un voyage, la validation, les dates et le format de sauvegarde. Il se teste sans navigateur. La **couche de stockage** est la seule à parler à SQLite et à Tauri ; elle a aussi une variante navigateur pour les tests d'écran. Les **écrans** ne connaissent que le modèle et le stockage.
- **Écrans (adresses internes, une seule page)** :
  - `#/voyages` : accueil ; liste des voyages, ou écran vide du premier lancement.
  - `#/nouveau-voyage` : assistant en étapes (Informations → un groupe d'étiquettes par étape → Aperçu). « Refaire ce voyage » ouvre le même assistant, prérempli.
  - `#/voyage/:id` : liste du voyage.
  - `#/voyage/:id/courses` : écran Courses.
  - `#/bibliotheque` : catégories et objets modèles, filtre « Jamais proposés ».
  - `#/etiquettes` : groupes d'étiquettes et leurs étiquettes.
  - `#/reglages` : thème, sauvegarde et restauration.
- **Schéma** (identifiants UUID en texte, `modifie_le` sur chaque ligne, en prévision de la synchronisation future) :
  - Bibliothèque :
    - `groupe_etiquettes` (nom, ordre) ;
    - `etiquette` (groupe, nom, ordre) ;
    - `categorie_modele` (nom, icône, couleur, ordre, toujours_incluse) et ses étiquettes ;
    - `objet_modele` (catégorie, nom, règle de quantité `fixe | par_jour | par_nuit`, valeur, plafond par personne facultatif, par_personne, consommable, toujours_inclus, note) et ses étiquettes.
  - Voyages, **copies indépendantes** de la bibliothèque, qui gardent seulement l'identifiant du modèle d'origine (facultatif, sans contrainte) :
    - `voyage` (nom, destination, départ, retour, voyageurs) ;
    - `etiquette_du_voyage` (identifiant d'origine, nom copié) ;
    - `categorie_du_voyage` (nom, icône, couleur, ordre copiés) ;
    - `objet_du_voyage` (nom, règle copiée, quantité, quantité_manuelle, dans_le_sac, à_acheter, acheté, note copiée).
  - Méta : version du schéma, langue de la bibliothèque de départ, bibliothèque de départ installée.
  - Le thème est un réglage de l'appareil, hors base et hors sauvegarde.
- **Modèles clés** : Bibliothèque, GroupeEtiquettes, Etiquette, CategorieModele, ObjetModele, Voyage, CategorieDuVoyage, ObjetDuVoyage, Sauvegarde.
- **Dates** : dates de calendrier locales sans heure (`AAAA-MM-JJ`). Jours = dates du départ au retour inclus ; nuits = jours − 1.
- **Sauvegarde** :
  - Un fichier JSON versionné (`format: "baluchon-sauvegarde"`, `version`), qui contient la bibliothèque et tous les voyages. Nom : `baluchon-AAAA-MM-JJ-HHhMM.json`, déposé dans Téléchargements.
  - La restauration valide tout le fichier avant de toucher la base. Elle écrit d'abord une copie de l'état actuel (`baluchon-avant-restauration-….json`), puis remplace tout en une seule opération.
- **Traduction** : un fichier par langue, le français servant de référence. Il contient les textes de l'interface **et** la bibliothèque de départ. On repasse au français quand une traduction manque.
- **Icônes** : Phosphor (Duotone dans les pavés de catégorie, Bold dans l'interface). Seules les icônes utilisées sont embarquées.
- **Tests** : tests du modèle sans navigateur ; tests d'écran Playwright jugés au code de sortie, avec une capture claire et une sombre par écran touché.
- **Contrôles automatiques dès la phase 1** : ESLint et Prettier, taille des fichiers (environ 500 lignes), textes écrits hors des fichiers de traduction, exports inutilisés, frontière entre les couches.

---

## Phase 1 : Squelette qui tourne

**User stories** : US-29, US-35, US-37 (suivre l'appareil)

### Ce qu'on livre

Baluchon s'ouvre sur Debian et sur la tablette Android. Il affiche l'écran Voyages vide, avec la mascotte et l'invitation « Créez votre premier voyage ». Cet écran est lu depuis la base locale, qui ne contient aucun voyage. Le thème clair ou sombre suit l'appareil, les polices sont intégrées et tous les textes viennent du fichier de traduction français. Les contrôles automatiques de qualité tournent, et le premier test d'écran passe.

### Critères d'acceptation

- [x] L'appli démarre sur l'ordinateur Debian et sur la tablette SM-X210, en mode avion.
- [x] Premier lancement : l'écran vide s'affiche avec un bouton « Nouveau voyage ».
- [x] Le thème suit le réglage clair ou sombre de l'appareil.
- [x] Rien ne passe sous les barres système Android.
- [x] Lint, formatage, taille des fichiers, textes hors traduction, exports inutilisés et frontière des couches : tous les contrôles passent et chacun rougit sur un exemple fautif.
- [x] Le test d'écran Playwright de l'écran vide passe, en clair et en sombre.

## Bloquée par

Aucune — démarrable immédiatement.

---

## Phase 2 : Créer un voyage simple

**User stories** : US-9, US-10, US-28

### Ce qu'on livre

Une mini-bibliothèque de départ (quelques catégories et objets « toujours inclus », sans étiquettes) est installée au premier lancement. Le bouton « Nouveau voyage » ouvre l'étape Informations : nom, destination, dates de départ et de retour choisies sur un calendrier unique, voyageurs de 1 à 20. Un retour antérieur au départ ne peut pas être choisi, et l'appli refuse un tel voyage. La création copie dans le voyage les catégories et objets inclus, avec leurs quantités calculées ; un objet dont la quantité vaut 0 est écarté. La liste des voyages montre les voyages en cours, puis à venir, puis passés, et chacun s'ouvre en lecture.

### Critères d'acceptation

- [x] Du 10 au 13 à 2 voyageurs, « Repas : 2 par jour, par personne » vaut 16, et un objet partagé fixe à 1 vaut 1 (critère de succès 2).
- [x] Le plafond s'applique par personne, avant la multiplication par le nombre de voyageurs.
- [x] Sur un aller-retour dans la journée, un objet « par nuit » n'apparaît pas.
- [x] Les dates se choisissent sur un calendrier unique (départ puis retour, durée grisée). Un appui sur un jour antérieur au départ en fait le nouveau départ ; un voyage dont le retour précède le départ est refusé par l'appli. Une durée au-delà d'un an est refusée (jours grisés). (Décision du chef de projet, 2026-10-06.)
- [x] La liste des voyages classe correctement un voyage en cours, deux à venir et deux passés.
- [x] Un voyage créé survit à la fermeture de l'appli.

## Bloquée par

- Phase 1

---

## Phase 3 : Cocher dans le sac

**User stories** : US-15, US-16, US-17, US-22

### Ce qu'on livre

Dans la liste du voyage, on coche un objet « dans le sac ». Il reste barré environ une seconde puis descend en bas de sa catégorie, et plusieurs coches rapides ne déplacent la liste qu'une fois. Chaque catégorie et le voyage entier affichent leur progression avec un compteur. Une catégorie entièrement cochée reçoit le tampon « Bouclé ! » et se replie ; un appui la rouvre. Le filtre « Reste à emballer » masque ce qui est coché. L'icône ⓘ ouvre la note d'un objet, en lecture seule.

### Critères d'acceptation

- [ ] Les objets sont classés par ordre alphabétique, les cochés en bas ; les catégories suivent l'ordre de la bibliothèque.
- [ ] Trois coches en moins d'une seconde ne provoquent qu'un seul déplacement.
- [ ] Les compteurs « cochés / total » sont justes pour chaque catégorie et pour le voyage.
- [ ] Quand l'appareil demande moins d'animations, rien ne glisse et le tampon apparaît fixe.
- [ ] Les coches survivent à la fermeture de l'appli.
- [ ] Chaque commande offre une cible de 44 × 44 px au moins.

## Bloquée par

- Phase 2

---

## Phase 4 : Étiquettes et assistant complet

**User stories** : US-11, US-12, US-13

### Ce qu'on livre

La mini-bibliothèque reçoit des groupes d'étiquettes, et des catégories et objets liés à des étiquettes. L'assistant ajoute une étape par groupe, où l'on touche des puces. On revient en arrière à toute étape sans rien perdre. L'aperçu final montre la liste par catégorie avec ses quantités ; on peut y décocher ce qui ne convient pas avant de créer le voyage. Un aperçu vide explique pourquoi et propose de revenir aux étiquettes. Le voyage garde une copie de ses étiquettes.

### Critères d'acceptation

- [ ] Un objet entre s'il est « toujours inclus » ou si au moins une de ses étiquettes est cochée, et seulement si sa catégorie entre aussi.
- [ ] Un objet désigné par deux étiquettes cochées n'apparaît qu'une fois.
- [ ] Un objet décoché dans l'aperçu est absent du voyage créé.
- [ ] Revenir de l'aperçu à l'étape Informations puis avancer à nouveau conserve tous les choix.
- [ ] L'aperçu vide affiche son explication et un moyen de revenir aux étiquettes.

## Bloquée par

- Phase 2

---

## Phase 5 : Bibliothèque : catégories et objets

**User stories** : US-2, US-3, US-4, US-5

### Ce qu'on livre

L'écran Bibliothèque liste les catégories modèles dans leur ordre, avec leurs objets. On crée ou modifie une catégorie : nom, icône choisie dans le catalogue d'environ 80 pictos avec recherche, une des 8 couleurs, « toujours incluse » ou des étiquettes. On crée ou modifie un objet : nom, règle de quantité, plafond, par personne ou partagé, consommable, toujours inclus ou étiquettes, note. Des flèches monter et descendre règlent l'ordre des catégories. Les voyages existants ne changent jamais.

### Critères d'acceptation

- [ ] Une catégorie « Alimentation » de 5 objets, liée à Camping, apparaît d'elle-même dans le premier voyage créé avec Camping cochée (critère de succès 1).
- [ ] La recherche du catalogue trouve un picto par un mot français (« tente », « soleil »).
- [ ] Renommer un objet modèle ne change pas son nom dans un voyage déjà créé.
- [ ] L'ordre réglé par les flèches est repris dans l'aperçu et les nouveaux voyages.
- [ ] Un objet sans nom ou sans valeur de quantité est refusé avec un message clair.

## Bloquée par

- Phase 4

---

## Phase 6 : Étiquettes modifiables

**User stories** : US-6

### Ce qu'on livre

L'écran Étiquettes permet de créer, renommer, réordonner et supprimer les groupes d'étiquettes et leurs étiquettes. L'assistant suit ces changements : un nouveau groupe devient une nouvelle étape.

### Critères d'acceptation

- [ ] Un groupe créé apparaît comme une étape de l'assistant, avec ses étiquettes en puces.
- [ ] Renommer une étiquette met à jour la bibliothèque, mais pas les voyages existants.
- [ ] Un groupe sans étiquette ne crée pas d'étape vide dans l'assistant.

## Bloquée par

- Phase 4

---

## Phase 7 : Suppressions sûres dans la bibliothèque

**User stories** : US-7, US-8

### Ce qu'on livre

Supprimer une catégorie, un objet, un groupe ou une étiquette demande une confirmation qui chiffre la conséquence (« 12 objets seront supprimés », « 7 objets perdront cette étiquette »). Un bandeau « Annuler » reste ensuite affiché 10 secondes. Le filtre « Jamais proposés » montre les objets sans étiquette ni « toujours inclus ». Aucune suppression ne touche les voyages existants.

### Critères d'acceptation

- [ ] Les chiffres annoncés correspondent exactement à ce qui est supprimé ou modifié.
- [ ] « Annuler » dans les 10 secondes rétablit tout à l'identique, liens d'étiquettes compris.
- [ ] Après la suppression d'une étiquette, ses objets orphelins apparaissent dans « Jamais proposés ».
- [ ] Un voyage créé avant la suppression est inchangé.
- [ ] Le bandeau a une place réservée et ne fait rien bouger à l'écran.

## Bloquée par

- Phase 5
- Phase 6

---

## Phase 8 : Ajuster un voyage

**User stories** : US-18, US-19, US-20, US-21

### Ce qu'on livre

Dans un voyage, les boutons − / + corrigent une quantité, qui devient alors « manuelle ». On ajoute un objet ponctuel, puis l'appli propose « Ajouter aussi à la bibliothèque ? ». On ajoute une catégorie ponctuelle, avec une icône et une couleur. On retire un objet, avec une confirmation et un « Annuler » de 10 s.

### Critères d'acceptation

- [ ] Une quantité corrigée est marquée comme manuelle et le reste après la fermeture de l'appli.
- [ ] « Ajouter aussi à la bibliothèque » crée l'objet modèle dans la catégorie correspondante ; « Non » ne touche pas la bibliothèque.
- [ ] Une catégorie ponctuelle existe dans ce voyage seulement.
- [ ] Retirer un objet ne touche pas la bibliothèque.

## Bloquée par

- Phase 3
- Phase 5

---

## Phase 9 : Courses

**User stories** : US-23, US-24

### Ce qu'on livre

À la création d'un voyage, les objets consommables sont marqués « à acheter » ; la marque se pose ou se retire sur n'importe quel objet. L'écran Courses rassemble ces objets par catégorie, avec leurs quantités. Un objet indiqué acheté perd sa marque « à acheter », mais reste à mettre dans le sac.

### Critères d'acceptation

- [ ] L'écran Courses liste tous les consommables du voyage avec leurs quantités, sans aucune saisie (critère de succès 4).
- [ ] La marque « à acheter » est une pastille avec un mot et une icône, jamais une couleur seule.
- [ ] Un objet acheté reste non coché dans la liste du voyage.
- [ ] Un voyage sans rien à acheter affiche un écran Courses vide explicite.

## Bloquée par

- Phase 3

---

## Phase 10 : Quand les plans changent

**User stories** : US-25, US-26, US-27

### Ce qu'on livre

On modifie les dates ou le nombre de voyageurs d'un voyage, et les quantités calculées se mettent à jour, sauf celles corrigées à la main. Ajouter une étiquette à un voyage ouvre un aperçu des objets de la bibliothèque qui entreraient alors ; on y décoche ce qu'on ne veut pas. Retirer une étiquette ne supprime aucun objet.

### Critères d'acceptation

- [ ] Passer de 2 à 3 voyageurs fait passer « Repas » de 16 à 24, mais une quantité manuelle ne bouge pas.
- [ ] L'aperçu d'ajout ne propose aucun objet déjà présent dans le voyage.
- [ ] Les objets ajoutés par l'étiquette prennent les quantités calculées pour ce voyage.
- [ ] Après le retrait d'une étiquette, tous les objets et leurs coches restent.

## Bloquée par

- Phase 4
- Phase 8

---

## Phase 11 : Refaire ce voyage et supprimer un voyage

**User stories** : US-14, US-30

### Ce qu'on livre

« Refaire ce voyage » ouvre l'assistant prérempli avec les étiquettes et le nombre de voyageurs du voyage d'origine. On saisit les nouvelles dates, et la liste est générée depuis la bibliothèque **actuelle**. Supprimer un voyage demande une confirmation chiffrée, suivie d'un « Annuler » de 10 s.

### Critères d'acceptation

- [ ] De « Refaire ce voyage » à la liste créée : moins de 30 secondes. De « Nouveau voyage » à la liste créée : moins de 2 minutes (critère de succès 3).
- [ ] Le voyage d'origine reste intact.
- [ ] Une étiquette du voyage d'origine qui n'existe plus dans la bibliothèque est signalée et ignorée.
- [ ] « Annuler » rétablit le voyage supprimé avec ses coches et ses quantités.

## Bloquée par

- Phase 4
- Phase 7

---

## Phase 12 : Réglages : sauvegarde, restauration, thème

**User stories** : US-31, US-32, US-33, US-34, US-37 (choix manuel)

### Ce qu'on livre

L'écran Réglages permet de choisir le thème (appareil, clair, sombre), un réglage propre à chaque appareil. Il crée une sauvegarde complète datée dans Téléchargements. Il restaure une sauvegarde après confirmation, en écrivant d'abord une copie automatique de l'état actuel. Un fichier invalide est refusé avec un message clair, et rien n'est modifié.

### Critères d'acceptation

- [ ] Une sauvegarde créée sur la tablette puis restaurée sur l'ordinateur reproduit à l'identique la bibliothèque et tous les voyages, coches, quantités manuelles et marques comprises (critère de succès 5).
- [ ] La copie « avant restauration » existe avant tout remplacement, et sa restauration ramène l'état précédent.
- [ ] Un fichier tronqué, d'un autre format ou d'une version future est refusé, sans aucune modification de la base.
- [ ] Une erreur en pleine restauration laisse la base dans son état d'avant.
- [ ] Le thème choisi persiste sur l'appareil et ne voyage pas dans la sauvegarde.

## Bloquée par

- Phase 8
- Phase 9

---

## Phase 13 : Bibliothèque de départ complète et traduisible

**User stories** : US-1, US-38, US-39

### Ce qu'on livre

Une bibliothèque de départ complète remplace la mini-bibliothèque : groupes d'étiquettes (Activités, Climat, Transport, Hébergement…), catégories et objets courants, quantités et notes. Elle a la même étendue que celle de BagPacker, mais sa rédaction est originale. Elle vit dans le fichier de traduction ; un contributeur peut traduire l'interface et la bibliothèque sans toucher au code. Au premier lancement, l'appli prend la langue de l'appareil si une traduction existe, sinon le français. La bibliothèque est installée une fois, puis appartient à l'utilisateur.

### Critères d'acceptation

- [ ] Au premier lancement, un voyage se crée sans aucune saisie dans la bibliothèque.
- [ ] Aucun texte, aucune image ni aucun code de BagPacker n'est repris.
- [ ] Avec une traduction d'essai ajoutée par le seul fichier de langue, l'interface et la bibliothèque s'affichent dans cette langue sur un appareil réglé ainsi.
- [ ] Sur un appareil dans une langue non traduite, tout s'affiche en français.
- [ ] Changer la langue de l'appareil après le premier lancement ne modifie pas la bibliothèque déjà installée.

## Bloquée par

- Phase 5

---

## Phase 14 : Deux panneaux et tous les formats d'écran

**User stories** : US-36

### Ce qu'on livre

Sur la tablette en paysage et sur l'ordinateur, la liste d'un voyage et la bibliothèque s'affichent en deux panneaux : les catégories à gauche, les objets de la catégorie choisie à droite. Sur téléphone et tablette en portrait, tout reste en une colonne. On vérifie tous les écrans à chaque format.

### Critères d'acceptation

- [ ] À 393×873, 800×1280, 1280×800 et sur ordinateur, en clair comme en sombre, aucun écran ne défile de côté, rien ne passe sous les barres système et chaque commande fait au moins 44×44 px (critère de succès 8).
- [ ] Tourner la tablette conserve la catégorie choisie et les coches.
- [ ] Le contenu ne dépasse pas 1080 px de large sur ordinateur.

## Bloquée par

- Phase 3

---

## Phase 15 : Paquets installables et vrai voyage

**User stories** : aucune nouvelle (critères de succès 6 et 7)

### Ce qu'on livre

Un paquet Android signé (tablette et téléphone) et un paquet Debian sont construits par des scripts reproductibles. La clé de signature est conservée en lieu sûr. On fait une recette complète en mode avion, puis le couple prépare son prochain voyage réel avec Baluchon. La construction et la diffusion n'ont lieu que sur demande explicite du chef de projet.

### Critères d'acceptation

- [ ] En mode avion, toutes les user stories s'exécutent sans erreur (critère de succès 6).
- [ ] Une mise à jour installée par-dessus une version précédente conserve toutes les données.
- [ ] La clé de signature est sauvegardée hors de l'ordinateur de travail, et le chef de projet sait où.
- [ ] Le prochain voyage réel est préparé entièrement avec Baluchon, et BagPacker est désinstallé (critère de succès 7).

## Bloquée par

- Phase 12
- Phase 13
