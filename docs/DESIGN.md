# Design System — Baluchon

## Product Context
- **Quoi** : appli libre et hors ligne de listes de bagages, générées depuis une bibliothèque de catégories et d'objets modèles entièrement configurable.
- **Pour qui** : un couple qui voyage à une fréquence variable et prépare ses sacs sur tablette ; secondairement, tout utilisateur public et les contributeurs qui traduisent.
- **Espace** : applis de « packing list » (BagPacker, PackPoint, Packr). Inspiration d'ambiance : Packlane, pour son côté coloré et joyeux.
- **Type** : appli mobile (tablette d'abord, téléphone, ordinateur Debian).
- **Memorable thing** : « Le départ commence ici : préparer son sac devient un petit plaisir, pas une corvée. »

## Aesthetic Direction
- **Direction** : Playful/Toy-like apprivoisé — la bagagerie colorée sur le sable de Paré. La joie vient des catégories et des réussites, jamais des fonds.
- **Décoration** : intentionnel — pavés de catégorie colorés, icônes au trait arrondi, une mascotte (« le Baluchon ») réservée aux écrans vides et aux réussites.
- **Mood** : un compagnon de départ gai et fiable ; calme pendant une longue liste, joyeux quand une catégorie est bouclée.
- **Références** : disposition de BagPacker (cartes de catégorie en accordéon, − / +, ⓘ, bouton flottant), restylée ; fonds et règles d'accessibilité de Paré ; encre marine, icônes dessinées et mascotte de Packlane (https://packlane.com, https://ixd.prattsi.org/2020/11/design-critique-packlane-com/).

## Typography
- **Display/Hero** : Baumans — titres d'écran et de section, tampon « Bouclé ! » ; signature partagée avec Paré.
- **Body** : Source Sans 3 — tout le reste (objets, libellés, boutons, champs, explications) ; même visage sur Android et Debian, même famille que Paré.
- **Data/Tables** : Source Sans 3 en chiffres tabulaires — quantités, compteurs « 6 / 14 », dates.
- **Code** : sans objet (aucun code affiché à l'utilisateur).
- **Loading** : polices embarquées dans l'appli (fonctionnement hors ligne) ; jamais chargées depuis un service en ligne.
- **Scale** : 13 / 15 / 17 / 24 / 32 / 48 px. Titres d'écran en Baumans 30–32 px, de section 24 px ; objets 16–17 px ; libellés et boutons 15–16 px ; mentions 13 px.
- **Plancher lisible** : aucun texte sous 13 px, nulle part. Un manque de place se règle en retirant du contenu, jamais en réduisant le texte.

## Color
- **Approche** : balanced — socle calme (sable, encre marine), un vert d'action, huit couleurs de bagagerie réservées aux catégories.
- **Primary** : `#007232` « Vert départ » — boutons principaux, bouton flottant, cases cochées, confirmations, progression d'une catégorie bouclée. Texte blanc dessus (6:1).
- **Secondary** : `#1A263C` « Encre marine » — texte, icônes dans les pavés, barres de progression en cours, puce active.
- **Neutrals** (clair) : `#FEFDFB` carte → `#F7F6F1` sable (fond) → `#F1EEE7` surface relevée → `#E7E2D2` surface active / piste des jauges → `#D3D1CA` séparations → `#817D71` contour des commandes (4:1 sur carte) → `#4D586C` encre douce → `#1A263C` encre.
- **Couleurs de catégorie** : Corail `#FF7A5C`, Tournesol `#FFC93C`, Abricot `#FF9F45`, Pomme `#8CCB4E`, Lagon `#2BBFB0`, Ciel `#5AA9FF`, Framboise `#F0598A`, Lilas `#A98BF0`. Chacune porte l'icône à l'encre marine à plus de 4,5:1.
- **Semantic** : success `#007232`, warning `#9C6400` (« à acheter »), error `#A82E27`, info `#006599` ; fonds de message `#E1F2E6`, `#FBF0DA`, `#F9E3E0`, `#DFEEF7`.
- **Dark mode** : nuit marine (et non violette) — fond `#0D1624`, carte `#162131`, relevée `#1F2C3F`, active `#273952`, séparations `#414E60`, contour `#7F8BA0`, encre `#F4F2EA`, encre douce `#B4BFCE`, vert départ `#6EC083` (texte `#0D1624` dessus), warning `#F2C36A`, error `#F38E81`, info `#82C3EE`. Les couleurs de catégorie restent identiques. Suit l'appareil par défaut, réglage propre à chaque appareil.

### Règles de couleur
- **Le pavé identifie.** La couleur d'une catégorie ne vit que dans son pavé de 44 px, avec l'icône à l'encre. Elle ne remplit jamais une carte et ne colore jamais un texte.
- **Jamais la couleur seule.** Une erreur s'écrit en toutes lettres avec une icône ; « à acheter » est une pastille avec un mot et une icône ; une progression s'accompagne toujours de son compteur. Corail et Tournesol, proches de l'erreur et de l'attention, ne signalent rien.
- **Le vert confirme.** Le vert plein est réservé aux actions principales et à ce qui est réellement fait (case cochée, catégorie bouclée, sauvegarde réussie).
- **Contrastes** : texte à 4,5:1 au moins sur son fond réel ; contour d'une commande à 3:1 au moins.

## Iconography
- **Bibliothèque** : Phosphor (https://phosphoricons.com, licence MIT, compatible GPL) ; seules les icônes utilisées sont embarquées, pour rester léger et hors ligne.
- **Pavés de catégorie** : graisse Duotone, à l'encre marine. Le second ton (l'encre en transparence) teinte la couleur du pavé et donne du relief, contre l'effet « plat » de la graisse simple.
- **Interface** (retour, − / +, ⓘ, panier, chevrons…) : graisse Bold, à l'encre ou à l'encre douce.
- **Catalogue de catégorie** : environ 80 pictos de voyage, avec une recherche par mot, proposés avec les 8 couleurs de catégorie à la création ou à la modification d'une catégorie.
- **Création maison** : seul le Baluchon (logo, icône de l'appli, mascotte des écrans vides et des réussites) est dessiné pour Baluchon. Un picto absent de Phosphor se dessine sur sa grille (24 px), dans son style.

## Spacing
- **Base** : 8px
- **Densité** : confortable — chaque commande (case, − / +, ⓘ, puce, chevron) offre une cible d'au moins 44 × 44 px ; une ligne d'objet fait 56 px.
- **Scale** : 2xs(2) xs(4) sm(8) md(16) lg(24) xl(32) 2xl(48) 3xl(64)

## Layout
- **Approche** : grid-disciplined — une carte par catégorie, en accordéon ; objets en lignes (case, nom, pastilles, − quantité +, ⓘ).
- **Grid** : téléphone et tablette en portrait : une colonne, marges de 16–18 px ; tablette en paysage et ordinateur : deux panneaux (catégories à gauche, objets à droite).
- **Max content width** : 1080px sur ordinateur ; textes d'explication limités à 62 caractères par ligne.
- **Border radius** : sm:8px (champs), md:12px (boutons, pavés, messages), lg:16px (cartes, bouton flottant), full:9999px (puces, pastilles, jauges).
- **Zones système** : rien ne passe sous les barres Android ; une bande du fond de page couvre les zones système.

## Motion
- **Approche** : intentionnel — le mouvement explique ce qui change et célèbre ce qui est fini.
- **Easing** : enter(ease-out) exit(ease-in) move(ease-in-out) ; rebond léger pour le tampon.
- **Duration** : micro(50-100ms) court(150-250ms) moyen(250-400ms) long(400-700ms)
- **Gestes clés** : un objet coché reste barré environ 1 s puis glisse en bas de sa catégorie (moyen) ; plusieurs coches rapides ne déplacent la liste qu'une fois ; catégorie bouclée → tampon « Bouclé ! » posé avec un rebond (long) ; accordéon (court).
- **Réduction** : si l'appareil demande moins d'animations, tout se pose sans mouvement (le tampon apparaît fixe, l'objet change de place sans glisser).

## Decisions Log
| Date | Décision | Rationale |
|------|----------|-----------|
| 2026-10-06 | Création initiale | /design — appli de listes de bagages pour un couple ; disposition BagPacker restylée, socle et règles de Paré, joie de Packlane en accents (pavés de catégorie colorés, mascotte, tampon « Bouclé ! »), mode sombre marine. Aperçu validé : `docs/design-preview.html`. |
| 2026-10-06 | Pictos Phosphor ; Duotone dans les pavés, Bold dans l'interface ; catalogue d'environ 80 pictos pour les catégories | Une bibliothèque libre garantit 120 icônes cohérentes, ce qu'une création maison ne peut pas assurer ; le Duotone répond au reproche « un peu plate » du chef de projet ; seul le Baluchon est dessiné sur mesure. |
