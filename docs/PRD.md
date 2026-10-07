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
- **US-8** : En tant qu'utilisateur, je veux un filtre « Jamais proposés » qui montre les objets sans étiquette ni « toujours inclus », afin de repérer ceux que mes suppressions ont rendus orphelins.

**Création d'un voyage**

- **US-9** : En tant qu'utilisateur, je veux saisir le nom, la destination, les dates de départ et de retour et le nombre de voyageurs, afin que l'appli connaisse les jours, les nuits et les personnes.
- **US-10** : En tant qu'utilisateur, je veux qu'une date de retour antérieure au départ soit signalée et bloque la suite, afin de ne jamais obtenir de quantités absurdes.
- **US-11** : En tant qu'utilisateur, je veux choisir mes étiquettes, une étape par groupe, en touchant des puces, afin de décrire le voyage sans formulaire interminable.
- **US-12** : En tant qu'utilisateur, je veux un aperçu de la liste générée, par catégorie et avec les quantités calculées, où je peux décocher ce qui ne me concerne pas, afin de corriger avant la création.
- **US-13** : En tant qu'utilisateur, je veux que l'aperçu m'explique pourquoi il est vide quand aucun objet ne correspond, afin de savoir quoi changer.
- **US-14** : En tant qu'utilisateur, je veux « Refaire ce voyage » à partir d'un voyage existant, avec ses étiquettes et son nombre de voyageurs repris et de nouvelles dates à saisir, afin de préparer en quelques secondes un séjour qui revient.

**Liste d'un voyage**

- **US-15** : En tant qu'utilisateur, je veux cocher un objet « dans le sac » et le voir descendre en bas de sa catégorie environ une seconde après, sans que la liste saute pendant une série de coches, afin de voir en haut ce qu'il reste à faire.
- **US-16** : En tant qu'utilisateur, je veux voir la progression de chaque catégorie et du voyage entier, afin de savoir où j'en suis.
- **US-17** : En tant qu'utilisateur, je veux un filtre « Reste à emballer » qui masque ce qui est coché, afin de boucler le sac sans me perdre dans une longue liste.
- **US-18** : En tant qu'utilisateur, je veux corriger la quantité d'un objet dans un voyage, afin de l'ajuster à ce voyage précis.
- **US-19** : En tant qu'utilisateur, je veux ajouter un objet ponctuel dans un voyage, avec la proposition « Ajouter aussi à la bibliothèque ? », afin de ne pas oublier ce même objet la prochaine fois.
- **US-20** : En tant qu'utilisateur, je veux ajouter une catégorie ponctuelle dans un voyage, afin de traiter un besoin exceptionnel.
- **US-21** : En tant qu'utilisateur, je veux retirer un objet d'un voyage, afin d'alléger la liste sans toucher à la bibliothèque.
- **US-22** : En tant qu'utilisateur, je veux voir une icône ⓘ sur les objets qui ont une note, et la lire d'un appui, afin de profiter des conseils de la bibliothèque.
- **US-23** : En tant qu'utilisateur, je veux que les objets consommables soient marqués « à acheter » d'office, et pouvoir poser ou retirer cette marque sur n'importe quel objet, afin de préparer mes courses.
- **US-24** : En tant qu'utilisateur, je veux un écran Courses qui rassemble les objets « à acheter » du voyage, par catégorie et avec leurs quantités, où j'indique ce qui est acheté, afin de faire mes courses avec une seule liste.
- **US-25** : En tant qu'utilisateur, je veux modifier les dates ou le nombre de voyageurs d'un voyage et voir les quantités calculées se mettre à jour, sauf celles que j'ai corrigées à la main, afin que la liste reste juste quand les plans changent.
- **US-26** : En tant qu'utilisateur, je veux ajouter une étiquette à un voyage existant et me voir proposer, par un aperçu, les objets qui entrent alors dans la liste, afin de m'adapter à un imprévu (pluie, nouvelle activité).
- **US-27** : En tant qu'utilisateur, je veux que retirer une étiquette d'un voyage ne supprime aucun objet, afin de ne jamais perdre ce qui est déjà dans le sac.

**Voyages**

- **US-28** : En tant qu'utilisateur, je veux la liste de mes voyages classée en à venir, en cours et passés, afin de retrouver le voyage du moment et mon historique.
- **US-29** : En tant qu'utilisateur, je veux, au premier lancement, un écran vide qui m'invite à créer mon premier voyage, afin de savoir par où commencer.
- **US-30** : En tant qu'utilisateur, je veux supprimer un voyage après une confirmation, avec « Annuler » pendant 10 secondes, afin de faire le ménage sans risque.

**Données**

- **US-31** : En tant qu'utilisateur, je veux créer une sauvegarde complète (bibliothèque et voyages) dans un fichier, afin de me protéger d'une perte de l'appareil.
- **US-32** : En tant qu'utilisateur, je veux restaurer une sauvegarde, avec une copie automatique de l'état actuel juste avant, afin de pouvoir revenir en arrière après une mauvaise manipulation.
- **US-33** : En tant qu'utilisateur, je veux qu'un fichier de sauvegarde invalide soit refusé avec un message clair sans rien changer, afin de ne jamais abîmer mes données.
- **US-34** : En tant qu'utilisateur, je veux transférer mes données de la tablette vers le téléphone ou l'ordinateur par le même fichier de sauvegarde, afin d'utiliser Baluchon sur chaque appareil.

**Général**

- **US-35** : En tant qu'utilisateur, je veux que toutes les fonctions marchent sans connexion, afin de m'en servir en voyage.
- **US-36** : En tant qu'utilisateur sur tablette en paysage, je veux les catégories à gauche et les objets à droite, afin de profiter de la largeur de l'écran.
- **US-37** : En tant qu'utilisateur, je veux un thème clair et un thème sombre, qui suivent l'appareil par défaut et se changent dans les réglages, afin de lire confortablement à toute heure.
- **US-38** : En tant que contributeur, je veux traduire tous les textes de l'interface et de la bibliothèque de départ sans toucher au reste de l'appli, afin de rendre Baluchon disponible dans ma langue.
- **US-39** : En tant qu'utilisateur public, je veux que l'appli et la bibliothèque de départ s'affichent dans la langue de mon appareil quand une traduction existe, sinon en français, afin de l'utiliser sans effort.

## Critères de succès

1. Une catégorie modèle « Alimentation » de 5 objets, liée à l'étiquette Camping, apparaît d'elle-même dans le premier voyage créé avec Camping cochée, sans aucune saisie dans ce voyage.
2. Pour un voyage du 10 au 13 à 2 voyageurs, « Repas : 2 par jour, par personne » affiche 16, et un objet partagé de quantité fixe 1 affiche 1.
3. De l'appui sur « Nouveau voyage » à la liste créée : moins de 2 minutes ; avec « Refaire ce voyage » : moins de 30 secondes.
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

## Décisions d'implémentation

**Calcul des quantités**

- Jours = nombre de dates du départ au retour inclus ; nuits = jours − 1 (du 10 au 13 : 4 jours, 3 nuits). Un aller-retour dans la journée compte 1 jour et 0 nuit.
- Quantité d'un objet : valeur fixe, ou valeur × jours, ou valeur × nuits. Le plafond s'applique **par personne**, puis le résultat est multiplié par le nombre de voyageurs si l'objet est « par personne ».
- Les quantités sont des nombres entiers. Un objet dont la quantité calculée vaut 0 (par exemple « par nuit » sur un aller-retour dans la journée) n'apparaît pas dans l'aperçu.
- Une quantité corrigée à la main dans un voyage n'est plus jamais recalculée automatiquement.

**Inclusion**

- Un objet ou une catégorie entre dans la liste s'il est « toujours inclus » ou si au moins une de ses étiquettes est cochée. Un objet n'entre que si sa catégorie entre aussi.
- Un même objet n'apparaît qu'une fois, même si plusieurs étiquettes le désignent.

**Écrans et gestes**

- À la création d'une catégorie (dans la bibliothèque ou ponctuellement dans un voyage), choix d'une icône dans un catalogue d'environ 80 pictos de voyage, avec une recherche par mot, et d'une des 8 couleurs de catégorie. L'icône et la couleur restent modifiables.
- Création d'un voyage en étapes : informations (nom, destination, dates, voyageurs), puis un groupe d'étiquettes par étape, puis l'aperçu. On peut revenir en arrière à toute étape sans rien perdre.
- Nombre de voyageurs de 1 à 20 ; durée d'un voyage de 1 jour à 1 an.
- Catégories dans l'ordre réglé dans la bibliothèque ; objets par ordre alphabétique dans leur catégorie, les objets cochés en bas.
- Un objet coché reste barré à sa place environ une seconde avant de descendre ; plusieurs coches rapides ne déplacent la liste qu'une fois.
- Catégorie entièrement cochée : repliée automatiquement, et rouvrable d'un appui.
- La marque « à acheter » disparaît quand l'objet est indiqué acheté dans Courses ; l'objet reste à mettre dans le sac.
- Note d'un objet : en lecture seule dans le voyage, modifiable seulement dans la bibliothèque.
- Liste des voyages : en cours en premier, puis à venir (du plus proche au plus lointain), puis passés (du plus récent au plus ancien).
- Tablette en paysage et ordinateur : deux panneaux (catégories à gauche, objets à droite) ; téléphone et tablette en portrait : une colonne.
- Toute suppression : confirmation qui chiffre la conséquence, puis bandeau « Annuler » pendant 10 secondes. Supprimer dans la bibliothèque ne touche jamais les voyages existants.

**Données**

- Sauvegarde : un seul fichier, daté dans son nom, déposé dans le dossier Téléchargements de l'appareil.
- Restauration : remplace tout, après confirmation, et après une copie automatique de l'état actuel au même endroit.
- Thème clair et sombre, qui suit l'appareil par défaut ; ce réglage reste propre à chaque appareil.
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
