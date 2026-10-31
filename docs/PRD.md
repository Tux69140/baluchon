# PRD — Baluchon

## Problème

Un couple qui voyage à une fréquence variable prépare ses sacs avec BagPacker. L'appli génère une liste à partir de la destination, de la durée et des activités, mais ses catégories sont figées dans le code. On peut ajouter une catégorie à la main dans un voyage, par exemple « Alimentation » pour les victuailles, mais pas en faire un modèle réutilisable que les écrans de configuration proposent automatiquement. À chaque voyage, il faut donc ressaisir les mêmes catégories et les mêmes objets, recalculer les quantités de nourriture selon la durée et le nombre de voyageurs, et dresser à part la liste des courses.

Modifier BagPacker n'est pas possible : c'est une appli propriétaire, compilée de façon à rendre toute retouche irréaliste. Le besoin est récurrent, alors que le contournement (dupliquer une ancienne liste) ne tient pas compte de la durée, du nombre de voyageurs ni des activités du nouveau voyage.

## Solution

Baluchon est une appli de listes de bagages libre et hors ligne, dont toute la logique de génération est entre les mains de l'utilisateur :

- une **bibliothèque** de catégories et d'objets modèles, entièrement modifiable, livrée avec une bibliothèque de départ complète ;
- des **groupes d'étiquettes** (Activités, Climat, Transport, Hébergement…) que l'utilisateur crée lui-même. Un objet ou une catégorie entre dans la liste si l'une de ses étiquettes est cochée pour le voyage, ou s'il est « toujours inclus » ;
- des **quantités calculées** : fixes, par jour ou par nuit, avec un plafond, multipliées par le nombre de voyageurs pour les objets « par personne » ;
- un **assistant de création** en étapes, qui se termine par un aperçu à ajuster avant de créer le voyage, et « Refaire ce voyage » pour les séjours qui reviennent ;
- une **liste de voyage** où l'on coche ce qui est « dans le sac », avec un écran **Courses** qui rassemble automatiquement les consommables à acheter.

Chaque voyage est une copie indépendante de la bibliothèque : l'historique des voyages passés reste intact.

## Utilisateur cible

**Utilisateur principal** : un couple francophone qui part en voyage à une fréquence variable, pour des séjours de nature différente (randonnée, camping, week-end en ville, vacances). Il prépare les deux sacs ensemble, surtout sur tablette, la veille ou l'avant-veille du départ. Il connaît ses habitudes et veut que l'appli les retienne une fois pour toutes, y compris ce qu'il faut acheter et emporter à manger.

**Utilisateur secondaire** : toute personne qui installe Baluchon depuis sa page de publication, éventuellement dans une autre langue, et adapte la bibliothèque de départ à ses propres voyages ; ou un contributeur bénévole qui traduit l'interface.

## User Stories

**Bibliothèque**

- **US-1** : En tant qu'utilisateur, je veux trouver au premier lancement une bibliothèque de départ complète (catégories, objets, groupes d'étiquettes, quantités), afin de créer un premier voyage sans rien saisir.
- **US-2** : En tant qu'utilisateur, je veux créer une catégorie modèle « toujours incluse » ou liée à une ou plusieurs étiquettes, afin qu'elle soit proposée automatiquement dans les voyages concernés.
- **US-3** : En tant qu'utilisateur, je veux créer un objet modèle avec son nom, sa règle de quantité (fixe, par jour ou par nuit, plafond facultatif), son caractère « par personne » ou « partagé », sa marque « consommable », ses étiquettes et une note facultative, afin que l'appli calcule et propose cet objet à ma place.
- **US-4** : En tant qu'utilisateur, je veux modifier ou renommer une catégorie ou un objet modèle, afin d'affiner ma bibliothèque au fil des voyages.
- **US-5** : En tant qu'utilisateur, je veux régler l'ordre des catégories avec des flèches monter/descendre, afin que la liste suive mon ordre de préparation.
- **US-6** : En tant qu'utilisateur, je veux créer, renommer et supprimer des groupes d'étiquettes et leurs étiquettes, afin de décrire mes voyages avec mes propres critères.
- **US-7** : En tant qu'utilisateur, je veux qu'une suppression dans la bibliothèque m'annonce sa conséquence chiffrée et puisse être annulée pendant 10 secondes, afin de ne rien perdre par erreur.
- **US-8** : *Retirée le 2026-10-26 (décision du chef de projet) : aucune suppression ne pouvant plus rendre un objet orphelin, le filtre « Jamais proposés » serait toujours vide. Voir « Hors périmètre ».*

**Création d'un voyage**

- **US-9** : En tant qu'utilisateur, je veux saisir le nom, la destination, les dates de départ et de retour et le nombre de voyageurs, afin que l'appli connaisse les jours, les nuits et les personnes.
- **US-10** : En tant qu'utilisateur, je veux qu'une date de retour antérieure au départ soit signalée et bloque la suite, afin de ne jamais obtenir de quantités absurdes.
- **US-11** : En tant qu'utilisateur, je veux choisir mes étiquettes, une étape par groupe, en touchant des puces, afin de décrire le voyage sans formulaire interminable.
- **US-12** : En tant qu'utilisateur, je veux un aperçu de la liste générée, par catégorie et avec les quantités calculées, où je peux décocher ce qui ne me concerne pas, afin de corriger avant la création.
- **US-13** : En tant qu'utilisateur, je veux que l'aperçu m'explique pourquoi il est vide quand aucun objet ne correspond, afin de savoir quoi changer.
- **US-14** : En tant qu'utilisateur, je veux « Refaire ce voyage » à partir d'un voyage existant, depuis ce voyage ou depuis la liste des voyages, avec ses étiquettes et son nombre de voyageurs repris, un nom, une destination et des dates à saisir, et une liste construite sur la bibliothèque actuelle qui reprend les objets ajoutés à la main, les quantités fixées et les objets écartés, afin de retrouver la liste réglée la dernière fois pour un séjour qui revient.

**Liste d'un voyage**

- **US-15** : En tant qu'utilisateur, je veux toucher la case d'un objet à chaque pièce mise dans le sac, et voir l'objet complet descendre en bas de sa catégorie environ une seconde après, sans que la liste saute pendant une série de coches, afin de voir en haut ce qu'il reste à faire.
- **US-16** : En tant qu'utilisateur, je veux voir la progression de chaque catégorie, du voyage entier, et de chaque voyage en cours ou à venir dès la liste des voyages, et voir célébré le sac entièrement bouclé, afin de savoir où j'en suis.
- **US-17** : En tant qu'utilisateur, je veux un filtre « Reste à emballer » qui masque ce qui est entièrement dans le sac, afin de boucler le sac sans me perdre dans une longue liste.
- **US-18** : En tant qu'utilisateur, je veux corriger la quantité d'un objet dans un voyage, afin de l'ajuster à ce voyage précis.
- **US-19** : En tant qu'utilisateur, je veux ajouter un objet ponctuel dans un voyage, avec la proposition « Ajouter aussi à la bibliothèque ? », afin de ne pas oublier ce même objet la prochaine fois.
- **US-20** : En tant qu'utilisateur, je veux ajouter une catégorie ponctuelle dans un voyage, afin de traiter un besoin exceptionnel.
- **US-21** : En tant qu'utilisateur, je veux retirer un objet d'un voyage, afin d'alléger la liste sans toucher à la bibliothèque.
- **US-22** : En tant qu'utilisateur, je veux voir une icône ⓘ sur les objets qui ont une note, et la lire dans la fiche de l'objet, afin de profiter des conseils de la bibliothèque.
- **US-40** : En tant qu'utilisateur, je veux indiquer qu'une partie seulement d'un objet est dans le sac (6 repas sur 16), afin de savoir ce qu'il manque pour terminer les préparatifs.
- **US-23** : En tant qu'utilisateur, je veux que les objets consommables soient marqués « à acheter » d'office, et pouvoir poser ou retirer cette marque sur n'importe quel objet, afin de préparer mes courses.
- **US-24** : En tant qu'utilisateur, je veux un écran Courses qui rassemble les objets « à acheter » du voyage, par catégorie et avec leurs quantités, où j'indique ce qui est acheté, afin de faire mes courses avec une seule liste.
- **US-25** : En tant qu'utilisateur, je veux modifier les dates ou le nombre de voyageurs d'un voyage et voir les quantités calculées se mettre à jour, en choisissant pour celles que j'ai corrigées à la main de les garder ou de les recalculer, afin que la liste reste juste quand les plans changent.
- **US-26** : En tant qu'utilisateur, je veux ajouter une étiquette à un voyage existant et me voir proposer, par un aperçu, les objets qui entrent alors dans la liste, afin de m'adapter à un imprévu (pluie, nouvelle activité).
- **US-27** : En tant qu'utilisateur, je veux que retirer une étiquette d'un voyage ne supprime aucun objet d'office, mais me demande si je retire ou non les objets qu'elle avait apportés, afin de ne jamais perdre ce qui est déjà dans le sac.

**Voyages**

- **US-28** : En tant qu'utilisateur, je veux la liste de mes voyages classée en à venir, en cours et passés, afin de retrouver le voyage du moment et mon historique.
- **US-29** : En tant qu'utilisateur, je veux, au premier lancement, un écran vide qui m'invite à créer mon premier voyage, afin de savoir par où commencer.
- **US-30** : En tant qu'utilisateur, je veux supprimer un voyage, depuis ce voyage ou depuis la liste des voyages, après une confirmation, avec « Annuler » pendant 10 secondes, afin de faire le ménage sans risque.

**Données**

- **US-31** : En tant qu'utilisateur, je veux créer une sauvegarde complète (bibliothèque et voyages) dans un fichier, afin de me protéger d'une perte de l'appareil.
- **US-32** : En tant qu'utilisateur, je veux restaurer une sauvegarde, avec une copie automatique de l'état actuel juste avant, afin de pouvoir revenir en arrière après une mauvaise manipulation.
- **US-33** : En tant qu'utilisateur, je veux qu'un fichier de sauvegarde invalide soit refusé avec un message clair sans rien changer, afin de ne jamais abîmer mes données.
- **US-34** : En tant qu'utilisateur, je veux transférer mes données de la tablette vers le téléphone ou l'ordinateur par le même fichier de sauvegarde, afin d'utiliser Baluchon sur chaque appareil.

**Général**

- **US-35** : En tant qu'utilisateur, je veux que toutes les fonctions marchent sans connexion, afin de m'en servir en voyage.
- **US-36** : En tant qu'utilisateur sur tablette ou ordinateur, je veux voir en même temps le voyage, ses catégories et les objets de la catégorie choisie, afin de profiter de la largeur de l'écran.
- **US-37** : En tant qu'utilisateur, je veux un thème clair et un thème sombre, qui suivent l'appareil par défaut et se changent dans les réglages, afin de lire confortablement à toute heure.
- **US-38** : En tant que contributeur, je veux traduire tous les textes de l'interface et de la bibliothèque de départ sans toucher au reste de l'appli, afin de rendre Baluchon disponible dans ma langue.
- **US-39** : En tant qu'utilisateur public, je veux que l'appli et la bibliothèque de départ s'affichent dans la langue de mon appareil quand une traduction existe, sinon en français, afin de l'utiliser sans effort.

## Critères de succès

1. Une catégorie modèle « Alimentation » de 5 objets, liée à l'étiquette Camping, apparaît d'elle-même dans le premier voyage créé avec Camping cochée, sans aucune saisie dans ce voyage.
2. Pour un voyage du 10 au 13 à 2 voyageurs, « Repas : 2 par jour, par personne » affiche 16, et un objet partagé de quantité fixe 1 affiche 1.
3. De l'appui sur « Nouveau voyage » à la liste créée : moins de 2 minutes.
4. L'écran Courses d'un voyage liste tous ses objets consommables avec leurs quantités, sans saisie supplémentaire.
5. Une sauvegarde créée sur la tablette puis restaurée sur l'ordinateur reproduit à l'identique la bibliothèque et tous les voyages, coches et quantités comprises.
6. En mode avion, toutes les user stories ci-dessus s'exécutent sans erreur.
7. Le prochain voyage réel du couple est préparé entièrement avec Baluchon, et BagPacker est désinstallé de la tablette.
8. À 393×873 (téléphone), 800×1280 et 1280×800 (tablette) et sur ordinateur, en thème clair comme sombre : aucun écran ne défile de côté, aucun élément ne passe sous les barres système, et chaque commande offre une cible d'au moins 44×44 px. Aucun texte d'interface n'existe en dehors des fichiers traduisibles.

## Hors périmètre

- Synchronisation entre appareils, compte utilisateur.
- Partage d'une liste entre deux téléphones, coches à deux en temps réel.
- Voyageurs nommés, répartition de qui porte quoi.
- Notifications et rappels.
- Version iPhone, publication sur le Play Store et sur F-Droid.
- Météo, cartes, tout service en ligne lié à la destination.
- Règles combinées entre étiquettes (« froid ET camping »).
- Lien vivant entre bibliothèque et voyages, bouton « Mettre à jour depuis la bibliothèque ».
- Import ou export de la bibliothèque seule, fusion de bibliothèques.
- Ordre manuel des objets, glisser-déposer.
- Note propre à un voyage.
- Poids des objets et poids total du sac.
- Photos des objets.
- Budget, prix des courses.
- Check-list du retour.
- Conseils automatiques ou suggestions par intelligence artificielle.
- Publicité, statistiques d'usage, traceurs sous quelque forme que ce soit.
- Corbeille.
- Filtre « Jamais proposés » dans la bibliothèque (ancienne US-8) : sans objet, puisqu'une suppression ne peut plus rendre un objet orphelin (décision du chef de projet, 2026-10-26).

## Décisions d'implémentation

**Calcul des quantités**

- Jours = nombre de dates du départ au retour inclus ; nuits = jours − 1 (du 10 au 13 : 4 jours, 3 nuits). Un aller-retour dans la journée compte 1 jour et 0 nuit.
- Quantité d'un objet : valeur fixe, ou valeur × jours, ou valeur × nuits. Le plafond s'applique **par personne**, puis le résultat est multiplié par le nombre de voyageurs si l'objet est « par personne ».
- Les quantités sont des nombres entiers. Un objet dont la quantité calculée vaut 0 (par exemple « par nuit » sur un aller-retour dans la journée) n'apparaît pas dans l'aperçu.
- Une quantité corrigée à la main dans un voyage n'est plus jamais recalculée automatiquement ; quand les plans changent, l'utilisateur peut choisir de la recalculer (décision du chef de projet, 2026-10-29).

**Inclusion**

- Un objet ou une catégorie entre dans la liste s'il est « toujours inclus » ou si au moins une de ses étiquettes est cochée. Un objet n'entre que si sa catégorie entre aussi.
- Un même objet n'apparaît qu'une fois, même si plusieurs étiquettes le désignent.

**Écrans et gestes**

- À la création d'une catégorie (dans la bibliothèque ou ponctuellement dans un voyage), choix d'une icône dans un catalogue d'environ 80 pictos de voyage, avec une recherche par mot, et d'une des 8 couleurs de catégorie. L'icône et la couleur restent modifiables.
- Création d'un voyage en étapes : informations (nom, destination, voyageurs, dates — les voyageurs avant le calendrier, pour rester visibles au téléphone : décision du chef de projet, 2026-10-25), puis un groupe d'étiquettes par étape, puis l'aperçu. On peut revenir en arrière à toute étape sans rien perdre.
- Assistant (décisions du chef de projet, 2026-10-24) : « Précédent » et « Suivant » en bas, et en haut une rangée d'étapes qu'on touche pour revenir à une étape déjà vue ; dès que les informations sont valides, on peut sauter directement à l'aperçu. Aucun groupe n'oblige à cocher une étiquette. Le retour système ramène à l'étape précédente ; depuis l'étape Informations, il ferme l'assistant, après la confirmation « Abandonner ce nouveau voyage ? » si quelque chose a été saisi.
- Aperçu : catégories dans l'ordre de la bibliothèque, objets par ordre alphabétique avec leurs quantités. On décoche un objet, ou une catégorie entière d'un appui sur sa case (qui montre un trait quand une partie seulement de ses objets est retenue) ; un objet décoché reste visible, barré et atténué, pour être recoché d'un appui ; un compteur donne le nombre d'objets retenus.
- Retour à l'aperçu après un changement d'étiquettes, de dates ou de voyageurs : si des objets avaient été écartés, une fenêtre les nomme et propose « Les garder écartés » ou « Les remettre dans la liste ». Sans changement, aucune fenêtre. Les objets nouveaux apportés par le changement arrivent cochés ; les quantités se recalculent.
- Aperçu vide : si aucune règle ne retient d'objet, la mascotte et un message l'expliquent, avec un bouton « Revenir aux étiquettes » ; si l'utilisateur a tout écarté, un message le dit et la liste reste affichée pour recocher. Dans les deux cas, « Créer le voyage » est grisé et un mot dit pourquoi.
- Les étiquettes copiées dans un voyage s'affichent dans l'en-tête de son écran, sous les dates, en petites puces non touchables ; les cartes de la liste des voyages n'en montrent pas.
- Nombre de voyageurs de 1 à 20 ; durée d'un voyage de 1 jour à 1 an.
- Catégories dans l'ordre réglé dans la bibliothèque ; objets par ordre alphabétique dans leur catégorie, les objets cochés en bas.
- Liste d'un voyage : une vue unique. La case d'un objet compte les pièces mises dans le sac : chaque appui en ajoute une. Un objet est **coché** quand toutes ses pièces sont dans le sac ; un objet en partie rempli affiche « 6 / 16 », sa case montre un état intermédiaire (un trait), et il reste à sa place. Sur un objet coché, la case remet le compte à 0, après confirmation s'il compte plus d'une pièce.
- Le reste de la ligne ouvre la **fiche de l'objet** : nombre dans le sac (− / +, jamais au-delà de la quantité prévue), « Tout dans le sac », « Vider » (après confirmation s'il y a plus d'une pièce dans le sac), note en lecture seule, puis quantité prévue, renommer, retirer (phase 8) et « à acheter » (phase 9). Au téléphone, la fiche monte du bas de l'écran ; sur tablette et ordinateur, c'est une fenêtre centrée.
- Retour système (Android, ou retour du navigateur) : un appui ferme le dernier niveau ouvert — la fenêtre de confirmation, sinon la fiche, sinon l'écran (décision du chef de projet, 2026-10-24). À l'accueil, rien d'ouvert, il met l'appli en arrière-plan au lieu de la fermer, comme Android le fait depuis sa version 12 : elle se rouvre aussitôt sur l'accueil (décision du chef de projet, 2026-10-25).
- Un objet coché reste barré à sa place environ une seconde avant de descendre, et un objet décoché remonte après le même délai ; plusieurs coches rapides ne déplacent la liste qu'une fois.
- Compteurs « cochés / total » : ils comptent les objets (une ligne), pas les pièces ; un objet en partie rempli ne compte pas encore.
- À l'ouverture d'un voyage, toutes les catégories sont dépliées, sauf les bouclées ; une catégorie repliée à la main le reste jusqu'à ce qu'on quitte le voyage.
- Catégorie entièrement cochée (« bouclée ») : tampon « Bouclé ! », repliée automatiquement, rouvrable d'un appui. Sans filtre, elle reste à sa place ; avec le filtre « Reste à emballer », elle descend en bas de la liste, atténuée (texte toujours lisible à 4,5:1).
- Voyage entièrement coché : la jauge passe au vert et un bandeau avec la mascotte annonce « Sac bouclé ! », tant que tout reste coché.
- Liste des voyages : une jauge de progression sur chaque voyage en cours ou à venir, pas sur les voyages passés.
- Courses (décisions du chef de projet, 2026-10-29) : la case compte les pièces achetées, comme celle du sac (« 6 / 16 ») ; la pastille de la liste dit ce qui reste (« encore 10 à acheter »). Un objet entièrement acheté quitte l'écran Courses après une seconde, avec un bandeau « Annuler » de 10 secondes, et sa marque « à acheter » disparaît ; l'objet reste à mettre dans le sac. Un objet marqué mis en entier dans le sac compte comme acheté, même si on le ressort ensuite ; une quantité augmentée le ramène dans Courses pour ce qui manque ; rallumer « À acheter » sur un objet acheté repart de zéro.
- Note d'un objet : en lecture seule dans le voyage, modifiable seulement dans la bibliothèque.
- Liste des voyages : en cours en premier, puis à venir (du plus proche au plus lointain), puis passés (du plus récent au plus ancien).
- Grand écran (décisions du chef de projet, 2026-10-27) : dès 600 px de large et de haut (toutes les tablettes, portrait compris, et l'ordinateur), le voyage et la Bibliothèque montrent dès 1340 px de large trois colonnes : le bloc du voyage, les catégories et les objets de la catégorie choisie ; plus étroit, les catégories passent en tuiles à côté du bloc du voyage, avec la liste dessous. Au téléphone : une colonne, catégories dépliables.
- Navigation (décisions du chef de projet, 2026-10-25) : un bouton menu, en haut de l'accueil, de Réglages et de la Bibliothèque, ouvre la liste Mes voyages, Nouveau voyage, Réglages ; ni barre de boutons en bas ni colonne sur le côté, qui ne tiennent pas sur un téléphone. La Bibliothèque, puis les Étiquettes, se rangent dans Réglages. « À propos » s'ajoute au menu en dernière phase.
- Bibliothèque : même allure que la liste d'un voyage (cartes de catégories dépliables, objets par ordre alphabétique, même disposition que le voyage sur tablette et ordinateur) ; un appui sur une catégorie ou un objet ouvre sa fiche, qui sert à créer comme à modifier. L'ordre des catégories se règle dans un mode « Ranger les catégories », liste compacte avec ▲ ▼ sur chaque ligne.
- Étiquettes (décisions du chef de projet, 2026-10-26) : écran ouvert depuis Réglages, de même allure que la Bibliothèque (une carte par groupe avec ses étiquettes en puces, une fiche pour créer, renommer ou supprimer, « Nouveau groupe » en bas, mode « Ranger » avec ▲ ▼ pour l'ordre des groupes et des étiquettes dans leur groupe). Une étiquette appartient à un seul groupe ; supprimer un groupe supprime ses étiquettes. Un nom d'étiquette est unique parmi les étiquettes, un nom de groupe parmi les groupes, sans tenir compte des majuscules ; une étiquette peut porter le nom d'un groupe. Le nombre de groupes n'est pas limité : quand les étapes de l'assistant ne tiennent plus dans la largeur, leur rangée défile de côté, et le trait gris qui relie les ronds se prolonge jusqu'au bord du côté où des étapes sont cachées.
- Ajuster un voyage (décisions du chef de projet, 2026-10-27 et 2026-10-28) : « Ajouter un objet » demande un nom, une catégorie du voyage (la dernière ligne, « Nouvelle catégorie », en crée une pour ce voyage seulement, avec une icône et une couleur) et une quantité ; l'appli propose ensuite « Ajouter aussi à la bibliothèque ? ». « Oui » ouvre la fiche d'objet de la bibliothèque, préremplie, où l'on choisit ses étiquettes et le calcul de sa quantité ; si la catégorie n'existe pas dans la bibliothèque, on en choisit une, ou on en crée une si aucune ne convient. Une quantité corrigée porte la mention « fixée manuellement » ; la baisser sous le nombre de pièces déjà dans le sac demande une confirmation.
- Quand les plans changent (décisions du chef de projet, 2026-10-29) : « Modifier ce voyage », dans le menu « ⋮ » au bout du titre du voyage (2026-10-30), rouvre l'assistant prérempli ; sa dernière étape, « Changements », liste ce que la modification entraîne, à accepter ou refuser ligne par ligne : quantités recalculées (ancienne → nouvelle, avec ce qu'il faut mettre dans le sac ou en sortir), quantités fixées manuellement (gardées par défaut, ou recalculées), objets qu'apporte une étiquette ajoutée (acceptés par défaut, sauf ceux déjà écartés de ce voyage, qui arrivent refusés avec la mention « retiré », 2026-10-30), objets que n'appelle plus une étiquette retirée (gardés par défaut). Une pièce de trop dans le sac (quantité baissée, objet retiré) n'est jamais sortie du compte d'office : on confirme sa sortie tout de suite (« C'est fait ») ou « Plus tard » ; d'ici là, l'objet porte un « ! » et « N à sortir du sac », ne compte pas comme emballé, sa catégorie n'est pas bouclée et le sac non plus ; un objet retiré reste affiché, barré, jusqu'à sa sortie. La baisse à la main et « Retirer du voyage » d'un objet emballé suivent la même règle.
- Refaire ce voyage et supprimer un voyage (décisions du chef de projet, 2026-10-29 et 2026-10-30) : les actions sur un voyage entier sont rares et ne passent pas avant ses catégories et ses objets ; un menu « ⋮ » au bout du titre du voyage les regroupe (« Modifier ce voyage », « Refaire ce voyage », puis, sous un trait et en rouge, « Supprimer ce voyage ») ; chaque carte de « Mes voyages » a le sien (« Refaire ce voyage », « Supprimer ce voyage »). « Refaire ce voyage » ouvre l'assistant avec les voyageurs et les étiquettes du voyage d'origine, nom, destination et dates vides ; son aperçu part de la bibliothèque actuelle : les objets ajoutés à la main reviennent cochés, marqués « ajouté à la main », avec leur quantité ; les objets écartés ou retirés la dernière fois reviennent écartés, marqués « retiré », et se réintègrent d'un appui (« il est plus facile d'écarter un objet que se souvenir de l'emporter ») ; une quantité fixée à la main est gardée par défaut, avec « Garder » / « Recalculer » si le calcul diffère ; un objet renommé dans le voyage d'origine garde ce nom ; une phrase en tête nomme les étiquettes et les objets disparus de la bibliothèque, qui ne sont pas repris. Le voyage d'origine n'est jamais touché ; pour un voyage créé avant cette fonction, tout arrive coché. Supprimer un voyage demande « Supprimer le voyage « X » ? Sa liste de N objets, dont M déjà dans le sac, disparaîtra. La bibliothèque n'est pas touchée. » (« Garder » / « Supprimer »), puis ramène à « Mes voyages » avec « Annuler » pendant 10 secondes, qui rétablit tout.
- Toute suppression : confirmation qui chiffre la conséquence, puis bandeau « Annuler » pendant 10 secondes. Supprimer dans la bibliothèque ne touche jamais les voyages existants.
- Suppressions dans la bibliothèque (décisions du chef de projet, 2026-10-26) : aucun orphelin. Supprimer une étiquette, ou un groupe, est refusé si un objet ou une catégorie se retrouverait sans aucune étiquette ; la fenêtre de refus les liste, chacun ouvre sa fiche, on revient à la liste une fois l'élément réglé, et quand elle est vide la suppression est proposée aussitôt. Le bandeau « Annuler » suit d'un écran à l'autre jusqu'au bout des 10 secondes ; une nouvelle suppression le remplace, la précédente devenant définitive.

**Données**

- Sauvegarde : un seul fichier, daté dans son nom, déposé dans le dossier Téléchargements de l'appareil.
- Restauration : remplace tout, après confirmation, et après une copie automatique de l'état actuel au même endroit.
- Thème clair et sombre, qui suit l'appareil par défaut ; ce réglage reste propre à chaque appareil.
- Le filtre « Reste à emballer » est retenu voyage par voyage, sur l'appareil, hors base et hors sauvegarde.
- Langue : celle de l'appareil si une traduction existe, sinon le français. La bibliothèque de départ est installée une fois, dans la langue du premier lancement, puis devient la propriété de l'utilisateur.

**Identité**

- Nom affiché : Baluchon. Disposition inspirée de BagPacker et restylée, palette de Paré, titres en police Baumans, intégrée à l'appli pour fonctionner hors ligne.
- Accessibilité : contraste de 4,5:1 au minimum, cibles tactiles de 44 px, aucune information portée par la couleur seule, animations réduites quand l'appareil le demande.

## Notes complémentaires

- **Risque juridique** : BagPacker est propriétaire. La bibliothèque de départ reprend l'étendue de son contenu (catégories, objets courants) mais est rédigée de façon originale, et l'interface est redessinée. Aucun texte, aucune image ni aucun code n'est copié.
- **Licence** : GPL-3.0-or-later ; dépôt public GitHub ; versions publiées sous forme de paquets installables à télécharger. L'AGPL est envisagée pour le futur serveur de synchronisation.
- **Dépendance** : les paquets publiés doivent être signés. La clé de signature doit être conservée en lieu sûr : la perdre empêche toute mise à jour des installations existantes.
- **Hypothèse** : le navigateur intégré d'Android sur la tablette Samsung offre une fluidité suffisante, comme pour Paré sur le même type d'appareil.
- **Évolutions futures** : synchronisation avec le serveur du chef de projet (le format des données est prévu pour), notifications, F-Droid, voyageurs nommés, nouvelles langues apportées par des contributeurs.
- **Référence** : Paré, modèle technique et de règles de qualité.
