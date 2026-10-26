# Phase 6 : Étiquettes modifiables (conception)

Session du 2026-10-26. Ce document complète `docs/PLAN.md` (phase 6) et `docs/PRD.md`, qui font autorité ; il fixe ce que le plan laisse ouvert. « Décision du chef de projet » = tranché par lui ; « choix de l'agent » = proposé par l'agent, à vérifier sur les maquettes.

## Intention

Les étiquettes sont les questions que l'appli pose pour bâtir la liste d'un voyage (« Quelles activités ? », « Quel climat ? ») ; les groupes ne sont que des tiroirs qui les rangent, et chaque groupe devient une étape de l'assistant « Nouveau voyage ». Jusqu'ici, l'utilisateur ne pouvait que choisir parmi les étiquettes de la bibliothèque de départ. La phase 6 lui permet d'écrire ses propres questions (un groupe « Transport » avec Avion, Train, Voiture…), pour décrire ses voyages avec ses propres critères (US-6). Les voyages existants ne changent jamais.

## Objectifs

Ceux du plan, phase 6 (US-6), et ses trois critères d'acceptation :

- un groupe créé apparaît comme une étape de l'assistant, avec ses étiquettes en puces ;
- renommer une étiquette met à jour la bibliothèque, mais pas les voyages existants ;
- un groupe sans étiquette ne crée pas d'étape vide dans l'assistant.

État constaté au départ : l'assistant écarte déjà les groupes sans étiquette, et chaque voyage garde sa propre copie du nom de ses étiquettes. Ces deux critères restent à prouver par des tests. Le seul changement de l'assistant est celui de sa rangée d'étapes quand les groupes sont nombreux (décision 6).

## Hors périmètre (ne rien en préparer)

- Confirmation qui chiffre la conséquence d'une suppression (« 7 objets perdront cette étiquette »), bandeau « Annuler » de 10 secondes, filtre « Jamais proposés » : phase 7 (décision du chef de projet, 2026-10-26).
- Déplacer une étiquette d'un groupe à un autre : le plan ne le prévoit pas.
- Ajouter ou retirer une étiquette d'un voyage existant : phase 10.
- Toute autre entrée de Réglages (thème, sauvegarde) : phase 12.

## À éviter (échec même si « ça marche »)

- Un voyage existant modifié par un changement d'étiquette (nom, ordre, suppression).
- Une suppression sans confirmation.
- Deux étiquettes, ou deux groupes, de même nom.
- Une étape vide dans l'assistant.
- Un écran qui saute ou se décale (message sans place réservée).
- Un élément d'interface qui renvoie vers une fonction des phases suivantes.

## Décisions du chef de projet (2026-10-26)

1. **Accès.** L'écran Étiquettes (`#/etiquettes`) s'ouvre depuis Réglages, par une seconde ligne sous « Bibliothèque » (déjà décidé le 2026-10-25 : les étiquettes se rangent dans Réglages).
2. **Allure : comme la Bibliothèque.** Une carte par groupe, avec ses étiquettes en puces ; une petite fiche pour créer, renommer ou supprimer un groupe ou une étiquette, le bouton de suppression étant dans la fiche ; un bouton « Nouveau groupe » en bas ; un mode « Ranger » avec ▲ ▼ pour l'ordre des groupes et celui des étiquettes dans leur groupe (« parfait »).
3. **Suppression en phase 6 : simple confirmation.** Supprimer une étiquette ou un groupe demande une confirmation (« Supprimer l'étiquette Plage ? »). Pour un groupe qui contient des étiquettes, la confirmation les nomme (« Supprimer le groupe Climat et ses étiquettes Chaud, Froid, Pluie ? »). Le chiffrage et « Annuler » viennent en phase 7.
4. **Une étiquette appartient à un seul groupe.** Supprimer un groupe supprime ses étiquettes ; aucune ne peut servir ailleurs.
5. **Noms uniques, chacun de son côté.** Un nom d'étiquette déjà pris dans n'importe quel groupe est refusé avec un message ; un nom de groupe déjà pris parmi les groupes aussi. La comparaison ne tient pas compte des majuscules (« plage » = « Plage »). Une étiquette peut porter le nom d'un groupe, et inversement (groupe « Camping », étiquette « Camping »).
6. **Aucune limite au nombre de groupes ; la rangée d'étapes de l'assistant défile.** Aujourd'hui, la rangée partage sa largeur à parts égales : au-delà d'environ 5 groupes, au téléphone de 360 points, ses ronds passeraient sous 44 px. Quand les étapes ne tiennent plus, la rangée défile de côté, l'étape en cours restant visible, et chaque étape reste touchable pour y revenir. On doit savoir **de façon certaine** que des étapes sont cachées : le trait gris qui relie les ronds se prolonge jusqu'au bord de la fenêtre (ou de l'écran au téléphone) du côté où des étapes sont cachées. Tant que les étapes tiennent, la rangée reste telle que validée en phase 4.

## Choix de l'agent (à confirmer sur les maquettes)

- **Nom vide** refusé avec un message à une place réservée sous le champ ; noms nettoyés des espaces au début et à la fin, comme pour les objets (phase 5). Le contrôle d'unicité porte sur le nom nettoyé. Les accents comptent (« Ete » ≠ « Été »).
- **Longueur des noms** : 60 caractères au plus, comme le nom d'un objet ou d'une catégorie (phase 5).
- **Supprimer une étiquette** la retire des catégories et des objets qui la portaient. Une catégorie ou un objet « Selon les étiquettes » qui n'en a plus aucune n'est plus proposé, sans être modifié autrement (il ne passe pas en « toujours inclus ») : c'est ce que prévoit le plan, dont la phase 7 fait apparaître ces orphelins dans « Jamais proposés » (critère « Après la suppression d'une étiquette, ses objets orphelins apparaissent dans « Jamais proposés » »), et le chef de projet n'a pas objecté au résumé qui le disait. Si l'on rouvre sa fiche, elle montre « Selon les étiquettes » sans puce cochée, et la règle de la phase 5 (refus d'enregistrer sans étiquette) s'applique telle quelle.
- **Ordre.** L'assistant prend l'ordre réglé pour ses étapes et pour les puces de chaque étape ; les fiches de catégorie et d'objet de la Bibliothèque aussi. Un groupe ou une étiquette neufs se placent en dernier.
- **Création.** « Nouveau groupe » en bas de l'écran ; « Ajouter une étiquette » dans chaque carte de groupe (l'étiquette naît dans ce groupe). Un groupe peut être créé vide ; il n'apparaît dans l'assistant qu'une fois qu'il a une étiquette.
- **Mode « Ranger ».** Comme « Ranger les catégories » (phase 5) : chaque appui sur ▲ / ▼ est enregistré aussitôt, ▲ grisé en tête et ▼ en fin, la ligne déplacée garde le focus et reste visible, la nouvelle place est annoncée à la lecture d'écran. Que les groupes et les étiquettes se rangent dans un même mode ou dans deux est fixé par les maquettes.
- **Fiches, fermeture, erreurs, navigation.** Comme la phase 5 : panneau qui monte du bas au téléphone, fenêtre centrée sur tablette et ordinateur ; « Abandonner les modifications ? » si l'on ferme une fiche modifiée sans enregistrer ; une erreur d'écriture laisse la fiche ouverte avec sa saisie et le bandeau d'erreur existant ; bouton retour et bouton menu en haut de l'écran, entrée « Réglages » active dans le menu ; retour système dans l'ordre « question, fiche, panneau, écran ».
- **Grands formats.** Une colonne de cartes au téléphone et en portrait ; en paysage dès 1000 px, la disposition est fixée par les maquettes (deux panneaux comme la Bibliothèque, ou cartes sur plusieurs colonnes), sans colonne étroite perdue dans un grand écran.

## Contraintes

- Règles d'`AGENTS.md` : TDD, fichiers d'environ 500 lignes, couches étanches (la validation, dont l'unicité des noms, vit dans le modèle ; les écrans passent par le stockage), textes dans `src/i18n/fr.json`, accessibilité (44 px, 4,5:1, focus visible, clavier), tests d'écran jugés au code de sortie, captures clair/sombre de chaque écran touché.
- Méthode des phases 3 à 5 : **maquettes cliquables validées par le chef de projet avant tout code** (skill impeccable, `docs/PRODUCT.md`), au téléphone, à la tablette en portrait et en paysage et à l'ordinateur, en clair et en sombre.
- Données : le schéma actuel suffit (`groupe_etiquettes`, `etiquette` rattachée à un seul groupe, liens supprimés en cascade avec l'étiquette ; `etiquette_du_voyage` sans contrainte vers la bibliothèque). **Aucune migration** ; rien n'est effacé ni converti sur les appareils. Il faut des écritures nouvelles (créer, renommer, ranger, supprimer un groupe ou une étiquette) dans le stockage Tauri (commandes Rust testées) comme dans le stockage navigateur des tests d'écran. Aucune ne touche une table du voyage. L'unicité des noms est vérifiée par le modèle avant écriture ; la base n'en reçoit pas de contrainte (choix de l'agent, pour éviter une migration).
- La bibliothèque de départ ne contient aucun doublon de nom : rien à corriger.
- Appareils : tablette SM-X210, ASUS (Android 7, 360 points de large), Xiaomi (Android 15), Debian.
- Pas de dépendance nouvelle.

## Suite des travaux

1. Inscrire les décisions dans `docs/PRD.md` (« Écrans et gestes » : écran Étiquettes, unicité des noms, suppression en phase 6, rangée d'étapes qui défile) et préciser la phase 6 dans `docs/PLAN.md`.
2. Maquettes (skill impeccable) : Réglages avec la ligne Étiquettes, écran Étiquettes, fiche de groupe, fiche d'étiquette, confirmations de suppression, mode « Ranger », messages de refus (nom vide, nom déjà pris), et rangée d'étapes de l'assistant avec beaucoup de groupes (décision 6), au téléphone de 360 points comme sur les grands formats. Une fois validées, elles font foi sur ce document pour tout ce qui se voit.
3. Après validation des maquettes : plan d'implémentation (superpowers:writing-plans), construction sur une branche `phase-6`, essais sur les appareils, validation par le chef de projet.

## Laissé au constructeur

Découpage des fichiers et des tâches, noms des commandes de stockage, détail des animations (réduites si l'appareil le demande).
