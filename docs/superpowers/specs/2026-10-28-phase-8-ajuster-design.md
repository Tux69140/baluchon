# Phase 8 : Ajuster un voyage (conception)

Questions posées le 2026-10-27, document écrit le 2026-10-28. Ce document complète `docs/PLAN.md`
(phase 8) et `docs/PRD.md`, qui font autorité ; il fixe ce que le plan laisse ouvert. « Décision du
chef de projet » = tranché par lui ; « choix de l'agent » = proposé par l'agent, à vérifier sur les
maquettes.

## Intention

Jusqu'ici, un voyage est la copie figée de ce que la bibliothèque proposait à sa création : on y
coche, rien de plus. La phase 8 permet de l'ajuster à ce voyage précis, sans jamais toucher la
bibliothèque par surprise : corriger la quantité prévue d'un objet (US-18), ajouter un objet qui
n'y était pas (US-19), le ranger au besoin dans une catégorie propre à ce voyage (US-20), renommer
ou retirer un objet (US-21). Un objet ajouté peut, si on le veut, entrer aussi dans la bibliothèque,
« afin de ne pas oublier ce même objet la prochaine fois » : on dit alors tout de suite quand il
reviendra.

## Objectifs

Ceux du plan, phase 8 (US-18 à US-21), et ses critères d'acceptation :

- une quantité corrigée est marquée comme manuelle et le reste après la fermeture de l'appli ;
- « Ajouter aussi à la bibliothèque » crée l'objet modèle dans la catégorie correspondante ; « Non »
  ne touche pas la bibliothèque ;
- une catégorie ponctuelle existe dans ce voyage seulement ;
- retirer un objet ne touche pas la bibliothèque.

État constaté au départ :

- la fiche d'un objet du voyage (`src/ecrans/fiche.js`) a « Dans le sac » − / +, « Tout dans le
  sac », « Vider », la note ;
- la maquette validée de l'écran du voyage (`docs/maquettes/voyage/`, 2026-10-24) dessine déjà, en
  « phases à venir », le bouton flottant « Ajouter un objet » (et le même bouton dans l'écran vide)
  et le bloc « Ajuster cet objet » de la fiche (quantité prévue − / +, « Renommer », « Retirer du
  voyage ») ;
- le grand écran (`docs/superpowers/specs/2026-10-27-grand-ecran-design.md`) n'a ni bouton
  flottant ni pied fixe ;
- le schéma a déjà `objet_du_voyage.quantite_manuelle` et `modele_id` (objet comme catégorie du
  voyage).

## Hors périmètre (ne rien en préparer)

- La marque « à acheter » et l'écran Courses : phase 9 (le bloc « Ajuster cet objet » de la
  maquette de la phase 3 la montre ; elle n'est pas construite ici).
- Dates, voyageurs ou étiquettes d'un voyage existant, et ce qu'il advient alors des quantités
  fixées manuellement : phase 10.
- « Refaire ce voyage », supprimer un voyage : phase 11.
- Renommer, changer d'icône ou de couleur, ranger ou supprimer une catégorie du voyage : rien de
  tel n'est prévu par le PRD.
- Revenir à la quantité calculée après l'avoir fixée manuellement : rien de tel n'est prévu par le
  PRD (on la remet à la main avec − / +).
- Modifier la note d'un objet dans le voyage : elle reste en lecture seule (PRD).

## À éviter (échec même si « ça marche »)

- Un geste dans un voyage qui modifie la bibliothèque sans que l'utilisateur l'ait demandé, ou un
  geste dans la bibliothèque qui modifie un voyage.
- Un objet entré dans la bibliothèque qui ne reviendrait jamais, ou dans tous les voyages sans que
  l'utilisateur l'ait voulu (des étiquettes prises d'office).
- Une catégorie vide affichée dans un voyage.
- Un « Annuler » qui rend un objet à moitié (sans ses pièces dans le sac, avec une autre quantité,
  sans sa catégorie).
- Un nombre dans le sac supérieur à la quantité prévue.
- Un élément d'interface qui renvoie vers une fonction des phases suivantes.

## Décisions du chef de projet (2026-10-27)

1. **« Oui » ouvre la fiche de la bibliothèque, préremplie.** Répondre « Oui » à « Ajouter aussi à
   la bibliothèque ? » ouvre la fiche habituelle d'objet de la bibliothèque, remplie avec le nom, la
   catégorie et la quantité ; on y choisit les étiquettes et le calcul de la quantité avant
   d'enregistrer (réponse « ok » à cette recommandation, préférée à des étiquettes prises d'office
   dans le voyage).
2. **Catégorie absente de la bibliothèque : choisir, ou créer.** Quand la catégorie de l'objet n'existe
   pas dans la bibliothèque (catégorie propre au voyage, ou supprimée de la bibliothèque depuis),
   « Oui » fait « choisir une catégorie ou en créer une nouvelle si aucune ne convient ».
3. **La catégorie ponctuelle naît depuis « Ajouter un objet ».** Dans le choix de la catégorie où
   ranger l'objet, une dernière ligne « Nouvelle catégorie » ; pas de bouton à part. Une catégorie du
   voyage n'est donc jamais vide à sa naissance.
4. **« fixée manuellement ».** Sous « Quantité prévue », une quantité corrigée porte la mention
   « fixée manuellement », à la place du calcul (« corrigée à la main » refusé : « pas top »).
5. **Baisser sous ce qui est dans le sac se confirme** (2026-10-28). « Si elle descend sous le
   nombre de pièces déjà dans le sac, ce nombre la suit » « n'est pas optimal, il faudrait une
   fenêtre de confirmation validant que l'on retire bien une fourniture déjà présente dans le
   baluchon ». Précise le plan, qui disait seulement que le nombre dans le sac suit.

Le reste de la description jouée au chef de projet le 2026-10-27 (ci-dessous, « choix de l'agent »)
n'a pas soulevé d'objection ; il reste à vérifier sur les maquettes.

Déjà décidé par le plan et le PRD, rappelé ici : la quantité prévue se corrige avec − / + dans la
fiche et devient « manuelle », n'est plus jamais recalculée automatiquement, et le nombre dans le
sac la suit si elle passe dessous (après confirmation, décision 5) ; renommer et retirer passent par la fiche ; on ajoute une
catégorie ponctuelle avec une icône et une couleur, choisies dans le catalogue et le nuancier de la
bibliothèque ; retirer demande une confirmation, puis un « Annuler » de 10 s ; les voyages sont des
copies indépendantes de la bibliothèque ; maquettes validées avant tout code.

## Choix de l'agent (à confirmer sur les maquettes)

### Ajouter un objet

- **Où.** Au téléphone, le bouton flottant « Ajouter un objet » de la maquette de la phase 3, en bas
  à droite. Sur tablette et ordinateur (grand écran, sans bouton flottant), une dernière ligne
  « Ajouter un objet » au bas de la liste des objets de la catégorie choisie, comme dans la
  Bibliothèque. Dans un voyage vide, le bouton « Ajouter un objet » de l'écran vide, à tous les
  formats. « Nouveau voyage » ne crée jamais de voyage vide : un voyage n'est vide que si l'on en a
  retiré tous les objets. La phrase de l'écran vide devient donc « Ce voyage ne contient plus aucun
  objet. Ajoutez-en ici. » (au lieu de la phrase de la maquette de la phase 3, qui renvoyait à la
  bibliothèque, alors qu'elle ne touche plus ce voyage).
- **La fiche « Ajouter un objet ».** Même allure que les autres fiches (panneau du bas au
  téléphone, fenêtre centrée ailleurs, pied fixe « Annuler » / « Ajouter ») :
  - **Nom** (obligatoire) ;
  - **Catégorie** : une ligne qui montre le pavé et le nom de la catégorie retenue, et ouvre la liste
    des catégories du voyage (dans l'ordre du voyage), terminée par « Nouvelle catégorie ». Elle part
    de la catégorie choisie (grand écran) ; au téléphone, de la dernière catégorie dépliée touchée,
    sinon de la première ;
  - **Quantité** : un nombre, − / + et saisie, de 1 à 999, 1 au départ. Pas de calcul par jour ou
    par nuit : il ne servirait qu'à la bibliothèque, où on le règle si on y ajoute l'objet.
- **« Nouvelle catégorie ».** Une fiche à trois réglages, ceux de la fiche de catégorie de la
  bibliothèque sans « Dans quels voyages ? » : nom (obligatoire), picto (le catalogue de 80 pictos,
  avec recherche), couleur (le nuancier de 8). Son bouton « Choisir » revient à la fiche « Ajouter un
  objet », la nouvelle catégorie retenue ; rien n'est encore écrit. La catégorie naît avec l'objet,
  au toucher de « Ajouter » ; abandonner l'ajout ne crée rien. Elle se range à la fin de la liste du
  voyage.
- **Après « Ajouter ».** La fiche se ferme ; l'objet apparaît à sa place (ordre alphabétique,
  catégorie dépliée ou choisie), éclairé comme un élément neuf ; il n'est pas dans le sac (0 sur N).
  Sa quantité est **fixée manuellement** dès sa naissance (il n'a pas de calcul). Sa ligne ne
  montre ni « partagé » ni aucune règle : la quantité saisie vaut pour tout le voyage (la façon de
  l'écrire dans la base est laissée au constructeur).
- **Noms.** Aucune règle nouvelle : deux objets ou deux catégories d'un voyage peuvent porter le
  même nom, comme dans la bibliothèque (phase 5).

### « Ajouter aussi à la bibliothèque ? »

- **La question.** Aussitôt après l'ajout, une fenêtre de question : « Ajouter aussi « Masque » à la
  bibliothèque ? », « Il pourra revenir dans vos prochains voyages : vous choisirez lesquels. »,
  « Non » / « Oui, l'ajouter ». Elle ne se pose que pour un objet ajouté à la main, jamais pour un
  objet venu de la bibliothèque. « Non », ou fermer la fenêtre, ne touche pas la bibliothèque.
- **« Oui », catégorie connue de la bibliothèque** (catégorie du voyage copiée d'une catégorie qui
  existe encore) : la fiche d'objet de la bibliothèque s'ouvre, celle de la phase 5, préremplie :
  nom, catégorie, quantité « fixe » égale à la quantité du voyage, partagé, non consommable, sans
  note, et « Selon les étiquettes » **sans aucune étiquette cochée** : il faut en choisir une, ou
  passer à « Toujours inclus », pour enregistrer (décision 1 ; la fiche refuse déjà « Selon les
  étiquettes » sans étiquette).
- **« Oui », catégorie inconnue de la bibliothèque** (décision 2) : d'abord une fenêtre « Dans quelle
  catégorie de la bibliothèque ? » : « « Plongée » n'existe que dans ce voyage. Choisissez où ranger
  « Masque » dans la bibliothèque, ou créez-y une catégorie. » ; la liste des catégories de la
  bibliothèque (pavé, nom, nombre d'objets), dans son ordre, terminée par « Nouvelle catégorie ».
  - Une catégorie choisie : la fiche d'objet préremplie s'ouvre, dans cette catégorie.
  - « Nouvelle catégorie » : la fiche de catégorie de la bibliothèque s'ouvre, préremplie avec le
    nom, le picto et la couleur de la catégorie du voyage, « Selon les étiquettes » sans étiquette ;
    son bouton est « Suivant » ; puis la fiche d'objet préremplie, dans cette catégorie à venir.
- **Une seule écriture, à la fin.** Rien n'est écrit dans la bibliothèque avant le dernier
  « Enregistrer » : la catégorie nouvelle et l'objet y entrent ensemble. Abandonner en chemin
  (fermer une fenêtre, « Annuler ») laisse l'objet dans le voyage et la bibliothèque intacte.
- **Après l'enregistrement.** L'objet du voyage garde son nom, sa quantité et sa catégorie du
  voyage ; il devient lié à son nouveau modèle (`modele_id`), comme un objet copié de la
  bibliothèque ; la catégorie du voyage est liée à la catégorie de la bibliothèque créée depuis
  elle (pas à une catégorie existante choisie). Un court message le confirme (« « Masque » est
  dans la bibliothèque. »), à la place réservée aux messages. Le voyage, lui, ne change pas.
- C'est une écriture dans la bibliothèque : comme toute autre (phase 7), elle rend définitive une
  suppression de la bibliothèque encore annulable.

### Ajuster un objet (bloc « Ajuster cet objet » de la fiche)

Sous ce que la fiche montre déjà, un trait, puis le bloc « Ajuster cet objet » de la maquette de la
phase 3, sans la ligne « À acheter » (phase 9) :

- **Quantité prévue** : − / + de 1 à 999 (jamais 0 : pour s'en passer, on le retire). Sous le titre,
  en petit : le calcul (« 2 par jour et par personne », la phrase de quantité de partout), ou
  **« fixée manuellement »** (décision 4). Chaque appui s'enregistre aussitôt, comme le nombre dans
  le sac. Le premier appui la rend manuelle, définitivement. Une quantité calculée au-delà de 999
  (cas extrême) descend normalement avec − ; + reste inactif au-delà de 999.
- **Baisser sous ce qui est dans le sac** (décision 5) : quand − ferait passer la quantité prévue
  sous le nombre de pièces déjà dans le sac, une confirmation le demande d'abord : « Sortir une
  pièce du sac ? », « 3 pièces de « T-shirts » sont déjà dans le sac. En prévoir 2 en sort une. »,
  « Garder 3 » / « Prévoir 2 ». « Prévoir 2 » baisse la quantité et le nombre dans le sac ensemble
  (le compteur « Dans le sac » suit) ; « Garder 3 », ou fermer, ne change rien. Quand rien n'est
  dans le sac au-delà, − ne demande rien. Une ligne qui devient complète, ou cesse de l'être,
  change de place comme après une coche (environ 1 s après).
- **La ligne du haut de la fiche** dit seulement la catégorie (« Toilette ») : le calcul, ou
  « fixée manuellement », vit désormais sous « Quantité prévue », pour ne jamais se lire deux fois
  ni se contredire. Retouche de la fiche de la phase 3.
- **« Renommer »** : une petite fiche à un seul champ, comme celles des étiquettes (« Renommer
  l'objet », champ « Nom » prérempli, « Annuler » / « Enregistrer »), nom obligatoire. Elle change le
  nom dans ce voyage seulement ; l'objet reprend sa place alphabétique.
- **« Retirer du voyage »** (bouton rouge) : une confirmation, « Retirer « Crème solaire » de ce
  voyage ? », « La bibliothèque ne change pas. », plus, s'il y en a, « Ses 2 pièces déjà dans le sac
  sortent de la liste. », et, s'il est le dernier de sa catégorie, « C'est le dernier objet de
  « Plongée » : la catégorie disparaît aussi de ce voyage. » ; « Garder » / « Retirer » (rouge).
  Une catégorie qui perd son dernier objet disparaît du voyage.
- **Rien de ce bloc ne touche la bibliothèque**, même pour un objet lié à un modèle.

### Retirer et « Annuler »

- **Le bandeau de la phase 7, tel quel** : même allure, même place, 10 s, il suit d'un écran à
  l'autre. Texte : « « Crème solaire » retiré du voyage », ou « « Masque » et la catégorie
  « Plongée » retirés du voyage ».
- **« Annuler »** rend l'objet à l'identique (même identifiant, quantité, quantité manuelle, nombre
  dans le sac, note, lien au modèle) et, si elle avait disparu, sa catégorie à sa place dans l'ordre
  du voyage, sous son identifiant. Depuis un autre écran, le voyage est simplement rétabli ; ouvert,
  il montre l'objet revenu, éclairé.
- **Un seul bandeau à la fois** : un retrait remplace le bandeau d'une suppression de la
  bibliothèque (qui devient définitive), et inversement, comme deux suppressions de la phase 7.
- **Pendant les 10 s**, ajouter un objet à ce même voyage rend le retrait définitif et retire le
  bandeau (une catégorie revenue à côté d'une homonyme créée entre-temps prêterait à confusion) ;
  cocher, corriger une quantité, renommer, ou écrire dans la bibliothèque n'y touchent pas. Fermer
  l'appli rend le retrait définitif.

### Pour tout ce qui s'écrit

- Tout s'enregistre aussitôt dans la base et survit à la fermeture de l'appli.
- Une écriture refusée (panne) : le message d'erreur d'enregistrement habituel, à sa place réservée ;
  la fiche reste ouverte avec ce qui était saisi, pour réessayer ; l'écran montre l'état réellement
  enregistré.
- Le retour système ferme le dernier niveau ouvert (règle de la phase 3) : la fenêtre du dessus,
  puis la fiche. Une fiche « Ajouter un objet » où quelque chose a été saisi demande « Abandonner
  cet objet ? » avant de se fermer, comme les fiches de la bibliothèque.
- Les mêmes gestes valent pour un voyage passé, en cours ou à venir.

## Contraintes

- Règles d'`AGENTS.md` : TDD, fichiers d'environ 500 lignes, couches étanches (règles de quantité,
  de retrait et de ce qu'emporte un retrait dans le modèle ; écrans par le stockage), textes dans
  `src/i18n/fr.json`, accessibilité (44 px, 4,5:1, focus visible, clavier), tests d'écran jugés au
  code de sortie, captures clair et sombre de chaque écran touché.
- Une seule définition par règle : la phrase de quantité (`decrireRegle`), les bornes de quantité
  (`BORNES_QUANTITE`), la borne du nombre dans le sac (`bornerDansLeSac`), le catalogue de pictos et
  le nuancier, les fiches de la bibliothèque et le bandeau « Annuler » (`src/ecrans/annulation.js`)
  sont repris, jamais recopiés.
- Données : le schéma actuel devrait suffire (**aucune migration**, à confirmer par le plan
  d'implémentation). Il faut des écritures nouvelles dans les deux stockages (commandes Rust testées
  et variante navigateur) : ajouter un objet au voyage (avec, au besoin, sa catégorie neuve), régler
  la quantité prévue (avec le nombre dans le sac qui la suit), renommer, retirer (avec la catégorie
  devenue vide), rétablir ce qui a été retiré, lier un objet et une catégorie du voyage à leur
  nouveau modèle, et enregistrer ensemble une catégorie et un objet de la bibliothèque. Chacune se
  fait en une seule opération : jamais à moitié en cas de panne. Aucune ne touche la bibliothèque,
  sauf la dernière.
- Méthode des phases 3 à 7 : **maquettes cliquables validées par le chef de projet avant tout code**
  (skill impeccable, `docs/PRODUCT.md`), au téléphone de 360 points, à la tablette en portrait et en
  paysage et à l'ordinateur, en clair et en sombre, dans la disposition grand écran du 2026-10-27.
- Appareils : tablette SM-X210, ASUS (Android 7, 360 points de large), Xiaomi (Android 15), Debian.
- Pas de dépendance nouvelle.

## Maquettes validées (2026-10-28)

`docs/maquettes/ajuster/`, validée sans changement. Choix qu'elle fixe en plus de ce document :

- fiche de l'objet : la ligne du haut ne dit que la catégorie ; sous un trait, « Ajuster cet objet »
  (« Quantité prévue », le calcul ou « fixée manuellement » en petit, − nombre +, puis « Renommer »
  en bouton secondaire) ; « Retirer du voyage » en rouge, sous un second trait, au bas de la fiche,
  comme « Supprimer » dans la bibliothèque ;
- « Ajouter un objet » : bouton flottant au téléphone ; dernière ligne verte de la liste sur
  tablette et ordinateur ; bouton sous la phrase de l'écran vide ;
- fiche « Ajouter un objet » : « Dans ce voyage seulement : la bibliothèque ne change pas. », champ
  Nom, champ Catégorie (pavé, nom, « 3 objets dans ce voyage » ou « Nouvelle, pour ce voyage »,
  chevron) qui ouvre la liste, « Quantité / pour tout le voyage » avec saisie ; pied « Annuler » /
  « + Ajouter » ;
- listes de choix de catégorie (voyage et bibliothèque) : lignes de la fenêtre de refus de la
  phase 7, la retenue sur fond actif avec une coche, « Nouvelle catégorie » en dernier avec un pavé
  neutre et un + vert ; pied « Annuler » ;
- « Nouvelle catégorie » (voyage) : « Pour ce voyage seulement : la bibliothèque ne change pas. »,
  Nom, Picto et couleur ; pied « Annuler » / « Choisir » ;
- fiches de la bibliothèque préremplies : titres « Nouvelle catégorie » / « Nouvel objet », boutons
  « Suivant » et « Ajouter à la bibliothèque » ;
- message de réussite vert, avec sa coche, en haut de l'écran : « « Palmes » est dans la
  bibliothèque. » ;
- questions : « Sortir une pièce du sac ? » (« Garder 2 » / « Prévoir 1 », vert) ; « Retirer … de ce
  voyage ? » (« Garder » / « Retirer » rouge avec la corbeille) ; « Ajouter aussi … à la
  bibliothèque ? » (« Non » / « Oui, l'ajouter » avec les livres) ;
- bandeau « Annuler » de la phase 7, au-dessus du bouton flottant au téléphone.

## Suite des travaux

1. Inscrire les décisions dans `docs/PRD.md` (« Écrans et gestes ») et renvoyer la phase 8 de
   `docs/PLAN.md` à ce document. Fait le 2026-10-28.
2. Maquettes (skill impeccable) dans `docs/maquettes/ajuster/` : écran du voyage avec « Ajouter un
   objet » (téléphone, repli, trois colonnes, voyage vide), fiche « Ajouter un objet », choix de la
   catégorie, « Nouvelle catégorie », question « Ajouter aussi à la bibliothèque ? », choix de la
   catégorie de la bibliothèque, fiches de la bibliothèque préremplies, fiche de l'objet avec
   « Ajuster cet objet » (calculée, fixée manuellement, nombre dans le sac qui suit), « Renommer »,
   confirmation de retrait (simple, avec pièces, dernier de sa catégorie), bandeau « Annuler ».
   Faites le 2026-10-28, validées par le chef de projet le même jour sans changement (« je valide
   les maquettes ») ; elles font foi pour tout ce qui se voit. Servir la racine du dépôt
   (`python3 -m http.server 8647 --bind 127.0.0.1`) et ouvrir `/docs/maquettes/ajuster/` (menu
   « Maquette » en haut à droite) ; `captures.mjs` (22 états, 5 formats, clair et sombre, dans
   `captures-travail/ajuster/`) et `gestes.mjs` se jugent au code de sortie.
3. Après validation des maquettes : plan d'implémentation (superpowers:writing-plans), construction
   sur la branche `phase-8`, essais sur les appareils, validation par le chef de projet.

## Laissé au constructeur

Découpage des fichiers et des tâches, noms des commandes de stockage, façon de garder de quoi
rétablir pendant 10 secondes, mécanique de l'enchaînement des fiches, détail des animations
(réduites si l'appareil le demande).
