# Phase 5 : Bibliothèque, catégories et objets (conception)

Session « Phase5 » du 2026-10-25. Ce document complète `docs/PLAN.md` (phase 5) et `docs/PRD.md`, qui font autorité ; il fixe ce que le plan laisse ouvert. « Décision du chef de projet » = tranché par lui ; « choix de l'agent » = proposé par l'agent, à vérifier sur les maquettes.

## Intention

Le chef de projet a lancé Baluchon parce qu'aucune appli essayée ne permet de se constituer une liste personnelle réutilisable d'un déplacement à l'autre (décision de cadrage 1, catégorie « Alimentation »). La phase 5 lui donne enfin la main sur cette liste : l'écran Bibliothèque, où il crée et modifie ses catégories et objets modèles, et règle l'ordre des catégories. Les voyages créés ensuite en tiennent compte ; les voyages existants ne changent jamais.

## Objectifs

Ceux du plan, phase 5 (US-2, US-3, US-4, US-5), et ses cinq critères d'acceptation :

- une catégorie « Alimentation » de 5 objets, liée à Camping, apparaît d'elle-même dans le premier voyage créé avec Camping cochée ;
- la recherche du catalogue trouve un picto par un mot français (« tente », « soleil ») ;
- renommer un objet modèle ne change pas son nom dans un voyage déjà créé ;
- l'ordre réglé par les flèches est repris dans l'aperçu et les nouveaux voyages ;
- un objet sans nom ou sans valeur de quantité est refusé avec un message clair.

## Hors périmètre (ne rien en préparer)

Décision du chef de projet : la phase 5 ne construit que ce que le plan lui donne, **sans réserver ni annoncer les accès des phases suivantes**.

- Écran Étiquettes et toute modification des groupes et étiquettes : phase 6. En phase 5, on se contente de **choisir** parmi les étiquettes existantes.
- Suppressions, bandeau « Annuler », filtre « Jamais proposés » : phase 7. Aucune suppression en phase 5.
- Ajout d'un objet depuis la liste d'un voyage, avec « Ajouter aussi à la bibliothèque ? » : phase 8, **sans l'avancer** (décision du chef de projet).
- Thème, sauvegarde, restauration dans Réglages : phase 12.
- « À propos » : dernière phase du plan (décision du chef de projet) ; à inscrire dans la phase 13 du PLAN.

## À éviter (échec même si « ça marche »)

- Un voyage existant modifié par un changement dans la bibliothèque.
- Un écran qui saute ou se décale (message sans place réservée).
- Une barre de navigation en bas ou une colonne de boutons sur le côté : refusées par le chef de projet (« ne rentreront jamais » sur petit écran, la hauteur manque en paysage au téléphone).
- Un élément d'interface qui renvoie vers une fonction des phases suivantes.

## Décisions du chef de projet (2026-10-25)

1. **Menu.** Un bouton menu en haut de l'écran ouvre une liste : Mes voyages, Nouveau voyage, Réglages. Les autres entrées (« À propos »…) viendront dans leurs phases.
2. **Réglages.** L'écran Réglages contient en phase 5 une seule entrée : Bibliothèque. On atteint donc la bibliothèque par Menu → Réglages → Bibliothèque. Les étiquettes y seront rangées aussi (phase 6).
3. **Écran Bibliothèque : même allure que la liste d'un voyage.** Catégories en cartes dépliables (pavé icône + couleur, nom), dans l'ordre de la bibliothèque ; leurs objets dedans, par ordre alphabétique ; un appui sur une catégorie ou un objet ouvre sa fiche pour la modifier.
4. **Ordre des catégories : mode « Ranger les catégories ».** Un bouton ouvre une liste compacte des seules catégories, chaque ligne avec ▲ et ▼ (pas de glisser-déposer, décision de cadrage 22). Pas de flèches sur les cartes de l'écran principal.

## Choix de l'agent (à confirmer sur les maquettes)

- **Fiches.** La fiche d'une catégorie ou d'un objet se présente comme la fiche d'objet du voyage : panneau qui monte du bas au téléphone, fenêtre centrée sur tablette et ordinateur. Elle sert à la création comme à la modification, avec « Enregistrer ».
- **Ajouts.** Bouton « Nouvelle catégorie » en bas de l'écran Bibliothèque, à la manière de « Nouveau voyage » à l'accueil ; ligne « Ajouter un objet » au bas de chaque catégorie dépliée (l'objet naît dans cette catégorie).
- **Valeurs par défaut.** Un objet neuf est « toujours inclus » (proposé dès que sa catégorie l'est), règle « fixe », valeur 1, sans plafond, par personne, non consommable, note vide. Une catégorie neuve est « toujours incluse », avec la première couleur et un picto générique, modifiables.
- **Inclusion dans les fiches.** Choix exclusif « Toujours inclus(e) » / « Selon les étiquettes » ; dans le second cas, les étiquettes existantes en puces, regroupées par groupe (même allure que les étapes de l'assistant). Refus avec message si « Selon les étiquettes » est choisi sans aucune étiquette, pour ne pas créer en silence un objet jamais proposé.
- **Quantité.** Règle (fixe, par jour, par nuit) + valeur entière + plafond facultatif (par personne, docs/PRD.md « Calcul des quantités ») ; valeur et plafond de 1 à 999. Une phrase de lecture sous la règle dit ce que cela donne (« 1 par nuit, au plus 5, par personne »).
- **Validation.** Nom vide ou valeur absente : enregistrement refusé, message à une place réservée sous le champ fautif, rien ne bouge à l'écran. Les noms sont nettoyés des espaces au début et à la fin.
- **Fermer une fiche modifiée sans enregistrer** (retour système, croix, appui à côté) : question « Abandonner les modifications ? », comme l'abandon de l'assistant.
- **Catalogue de pictos.** Environ 80 pictos Phosphor de voyage (Duotone dans les pavés, DESIGN.md), choisis par l'agent ; une grille avec un champ de recherche ; chaque picto porte quelques mots-clés français rangés dans le fichier de traduction (traduisibles). Seuls les pictos du catalogue sont embarqués. Les 8 couleurs sont celles déjà définies pour les catégories.
- **Rangement.** Chaque appui sur ▲ / ▼ est enregistré aussitôt ; ▲ grisé sur la première ligne, ▼ sur la dernière ; la ligne déplacée garde le focus (clavier) et reste visible.
- **Navigation.** Réglages et Bibliothèque ont un bouton retour en haut, comme l'écran du voyage (indispensable sur Debian, sans touche retour), et le bouton menu. Le menu est un panneau qui glisse depuis la gauche, sur tous les formats ; il se ferme par un appui à côté ou par le retour système (un niveau de plus dans l'ordre « question, fiche, panneau, écran »).
- **Enregistrement.** Toute modification est écrite dans la base dès « Enregistrer » ; une erreur d'écriture laisse la fiche ouverte avec sa saisie et le bandeau d'erreur déjà utilisé par l'écran du voyage.
- **Changer un objet de catégorie** : non prévu en phase 5 (le plan ne le cite pas) ; la fiche montre la catégorie sans permettre de la changer.
- **Grands formats.** « Comme la liste du voyage » vaut aussi pour la disposition : une colonne de cartes dépliables au téléphone et en portrait, deux panneaux dès 1000 px de large en paysage (catégories à gauche, objets de la catégorie choisie à droite), comme l'écran du voyage. En deux panneaux, « Nouvelle catégorie » et « Ranger les catégories » vont sous la colonne des catégories, « Ajouter un objet » au bas du panneau des objets ; le mode rangement remplace la colonne des catégories.
- **Où est le menu.** À l'accueil, dans Réglages et dans Bibliothèque seulement. L'écran du voyage et l'assistant, validés aux phases 3 et 4, ne changent pas. « Nouveau voyage » ouvert depuis le menu ouvre l'assistant comme depuis l'accueil ; le voyage créé s'ouvre, et le retour ramène à l'accueil, comme aujourd'hui.
- **Noms en double.** Aucune règle nouvelle : deux catégories ou deux objets peuvent porter le même nom (le PRD n'en dit rien, et la phase 5 n'ajoute pas de règle produit).
- **Scénario « Alimentation » du critère 1.** La bibliothèque de départ contient déjà « Alimentation » (toujours incluse, 2 objets) : l'essai modifie cette catégorie (liée à Camping au lieu de « toujours incluse ») et lui ajoute 3 objets, pour atteindre 5.
- **Règles laissées au constructeur, avec ces bornes.** Le plafond reste possible avec la règle « fixe » (sans effet si la valeur est en dessous) ; repasser à « toujours inclus » efface les liens d'étiquettes de ce modèle ; la recherche du catalogue ignore les accents et les majuscules.

## Contraintes

- Règles d'`AGENTS.md` : TDD, fichiers d'environ 500 lignes, couches étanches (les écrans passent par le stockage, la validation vit dans le modèle), textes dans `src/i18n/fr.json`, accessibilité (44 px, 4,5:1, focus visible, clavier), tests d'écran jugés au code de sortie, captures clair/sombre de chaque écran touché.
- Méthode des phases 3 et 4 : **maquettes cliquables validées par le chef de projet avant tout code** (skill impeccable), aux quatre formats (téléphone et tablette, portrait et paysage) et au format ordinateur, en clair et en sombre.
- Données : le schéma actuel contient déjà tout ce qu'il faut (`categorie_modele`, `objet_modele`, liens d'étiquettes) : aucune migration attendue. Il faut des écritures nouvelles (créer, modifier une catégorie ou un objet, régler l'ordre), dans le stockage Tauri (commandes Rust testées) comme dans le stockage navigateur des tests d'écran. Une modification d'un modèle ne touche aucune table du voyage.
- Appareils : tablette SM-X210, ASUS (Android 7, 360 points de large), Xiaomi (Android 15), Debian.
- Pas de dépendance nouvelle prévue (les pictos Phosphor sont déjà la bibliothèque retenue).

## Suite des travaux

1. Inscrire les décisions dans `docs/PRD.md` (« Écrans et gestes » : menu, Réglages, bibliothèque, rangement) et `docs/PLAN.md` (phase 5 précisée, « À propos » en phase 13).
2. Maquettes (skill impeccable) : accueil avec menu, menu ouvert, Réglages, Bibliothèque, fiche de catégorie avec catalogue de pictos, fiche d'objet, mode rangement, messages de refus.
Les maquettes ne sont pas encore faites. Une fois validées, elles font foi sur ce document pour tout ce qui se voit ; le plan d'implémentation s'écrit seulement après.
3. Après validation des maquettes : plan d'implémentation (superpowers:writing-plans), construction, essais sur les appareils, validation par le chef de projet.

## Laissé au constructeur

Découpage des fichiers et des tâches, noms des commandes de stockage, liste exacte des 80 pictos et de leurs mots-clés, détail des animations (réduites si l'appareil le demande).
