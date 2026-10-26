# Phase 7 : Suppressions sûres dans la bibliothèque (conception)

Session du 2026-10-26. Ce document complète `docs/PLAN.md` (phase 7) et `docs/PRD.md`, qui font autorité ; il fixe ce que le plan laisse ouvert. « Décision du chef de projet » = tranché par lui ; « choix de l'agent » = proposé par l'agent, à vérifier sur les maquettes.

## Intention

Jusqu'ici, on ne pouvait rien supprimer dans la Bibliothèque, et une étiquette ou un groupe se supprimait après une simple confirmation (phase 6). La phase 7 rend toute suppression de la bibliothèque sûre : elle dit ce qu'elle va emporter, chiffres à l'appui, elle peut être annulée pendant 10 secondes, et elle ne peut jamais faire disparaître en silence un objet des futurs voyages (US-7). Les voyages existants ne changent jamais.

## Objectifs

Ceux du plan, phase 7 (US-7), et ses critères d'acceptation :

- les chiffres annoncés correspondent exactement à ce qui est supprimé ou modifié ;
- « Annuler » dans les 10 secondes rétablit tout à l'identique, liens d'étiquettes compris ;
- une suppression qui laisserait un objet ou une catégorie sans aucune étiquette est refusée, et la fenêtre de refus mène à chacun d'eux (remplace le critère « orphelins dans Jamais proposés », décision 1) ;
- un voyage créé avant la suppression est inchangé ;
- le bandeau a une place réservée et ne fait rien bouger à l'écran.

État constaté au départ : la Bibliothèque n'a aucune suppression (phase 5) ; les fiches d'étiquette et de groupe ont « Supprimer » avec une simple confirmation (phase 6), qui retire l'étiquette des catégories et des objets qui la portaient, même si c'était leur seule.

## Hors périmètre (ne rien en préparer)

- Le filtre « Jamais proposés » (US-8) : retiré du projet (décision 2).
- Retirer un objet d'un voyage, avec son propre « Annuler » : phase 8.
- Supprimer un voyage : phase 11.
- Corbeille : hors périmètre du PRD.

## À éviter (échec même si « ça marche »)

- Un objet ou une catégorie qui ne sera plus jamais proposé à cause d'une suppression.
- Un chiffre annoncé qui diffère de ce qui est réellement supprimé ou modifié.
- Un « Annuler » qui rend un élément à moitié (sans ses étiquettes, sans ses objets, à une autre place dans l'ordre).
- Un voyage existant modifié par une suppression ou par son annulation.
- Une suppression sans confirmation.
- Un écran qui saute ou se décale à l'arrivée ou au départ du bandeau.
- Un élément d'interface qui renvoie vers une fonction des phases suivantes.

## Décisions du chef de projet (2026-10-26)

1. **Aucun orphelin.** Supprimer une étiquette est refusé si un objet ou une catégorie de la bibliothèque, réglé « Selon les étiquettes », se retrouverait sans aucune étiquette (« il faut déjà interdire la suppression d'une étiquette qui contient des objets ! Ne pas rendre des objets orphelins ! »). Elle est permise si chacun garde au moins une autre étiquette (ou est « toujours inclus ») : la confirmation dit alors combien la perdent. Même règle pour un groupe, en considérant toutes ses étiquettes ensemble : un objet dont toutes les étiquettes sont dans ce groupe bloque la suppression. Cette règle remplace la simple confirmation de la phase 6.
2. **US-8 retirée.** Puisque plus rien ne peut créer d'orphelin (la phase 5 refuse déjà d'enregistrer « Selon les étiquettes » sans étiquette, et supprimer une catégorie supprime ses objets), le filtre « Jamais proposés » serait toujours vide : il passe en hors périmètre du PRD.
3. **Refus : une liste qui mène aux fiches.** La fenêtre de refus nomme les objets et les catégories qui bloquent ; un appui sur l'un d'eux ouvre sa fiche. Une fois la fiche enregistrée (autre étiquette, « toujours inclus ») ou l'élément supprimé, on revient à la liste, d'où il a disparu (« lorsque l'objet est [réglé] il faut être ramené à la vue de liste des objets à gérer pour pouvoir supprimer le groupe »).
4. **Liste vide : la suppression est proposée aussitôt.** Quand le dernier élément est réglé, la fenêtre devient la confirmation chiffrée (« Plus rien ne bloque : vous pouvez supprimer Plage. », « Garder » / « Supprimer »).
5. **Le bandeau suit.** Le bandeau « Annuler » reste affiché 10 secondes même si l'on change d'écran entre-temps ; « Annuler » rétablit l'élément dans la bibliothèque depuis n'importe quel écran. Chaque écran lui réserve donc sa place.
6. **Seule la dernière suppression s'annule.** Une seconde suppression pendant les 10 secondes remplace le bandeau (« Tongs supprimé · Annuler », 10 secondes de nouveau) ; la précédente devient définitive.

Déjà décidé par le plan et le PRD, rappelé ici : on supprime une catégorie, un objet, un groupe ou une étiquette ; supprimer une catégorie supprime ses objets, et supprimer un groupe ses étiquettes ; confirmation qui chiffre la conséquence, puis bandeau « Annuler » pendant 10 secondes ; maquettes validées avant tout code ; les voyages existants ne changent jamais.

## Choix de l'agent (à confirmer sur les maquettes)

- **Où l'on supprime.** Comme en phase 6 : « Supprimer la catégorie » / « Supprimer l'objet » en rouge, sous un trait, en bas de la fiche d'un élément existant ; jamais dans une fiche neuve.
- **Textes de confirmation** (« Garder » d'abord, « Supprimer » en rouge avec la corbeille ; une ligne chiffrée n'apparaît que si son nombre n'est pas nul ; pluriels exacts, « 1 objet ») :
  - objet : « Supprimer « Parasol » ? Il ne sera plus proposé dans « Nouveau voyage ». Les voyages déjà créés ne changent pas. » ;
  - catégorie : « Ses 12 objets seront supprimés aussi. » ;
  - étiquette : « 7 objets et 2 catégories perdront cette étiquette ; ils gardent leurs autres étiquettes. » ;
  - groupe : « Ses étiquettes Chaud, Froid et Pluie seront supprimées aussi, et son étape disparaîtra de « Nouveau voyage ». 12 objets et 1 catégorie perdront une étiquette. ».
  Chaque objet ou catégorie compte une fois, même s'il porte plusieurs étiquettes du groupe.
- **Fenêtre de refus.** Titre « Impossible de supprimer « Plage » pour l'instant », phrase « C'est la seule étiquette de ces objets : donnez-leur une autre étiquette ou « toujours inclus », ou supprimez-les. », puis la liste : catégories d'abord, puis objets, chacun avec le picto et le nom de sa catégorie ; bouton « Fermer ». Pour un groupe, « … la seule étiquette de ces objets dans ce groupe ».
- **Fiches ouvertes depuis la liste.** La fiche de catégorie ou d'objet de la Bibliothèque s'ouvre par-dessus l'écran Étiquettes, sans changer d'écran, pour que le retour à la liste soit immédiat. Fermer la fiche sans rien changer ramène aussi à la liste. Les règles de la fiche s'appliquent telles quelles (« Selon les étiquettes » sans étiquette reste refusé).
- **Un orphelin déjà là ne bloque pas.** Seuls comptent les éléments que la suppression rendrait orphelins ; un élément déjà sans étiquette (reste d'un essai de la phase 6) ne bloque rien.
- **Annuler « à l'identique ».** L'élément revient à sa place dans l'ordre, avec ses étiquettes (et, pour une catégorie, ses objets et leurs étiquettes ; pour un groupe, ses étiquettes et leurs liens), sous ses identifiants d'origine. Le bandeau dit ce qu'il annule (« Catégorie « Plongée » supprimée », « Étiquette « Plage » supprimée ») ; après « Annuler », il disparaît, et l'écran ouvert montre l'élément revenu.
- **Autre modification pendant les 10 secondes.** Toute autre écriture dans la bibliothèque (enregistrer une fiche, ranger) rend la suppression en cours définitive et retire le bandeau : un retour après coup pourrait heurter la modification (nom repris entre-temps, ordre changé). Cocher dans un voyage ou créer un voyage n'y touchent pas.
- **Fermer l'appli pendant les 10 secondes** rend la suppression définitive.
- **Bandeau.** En bas de l'écran, au-dessus du pied ou du bouton flottant, sans rien cacher de touchable ni rien pousser ; texte et « Annuler » lisibles (44 px, 4,5:1) ; annoncé à la lecture d'écran ; la place et l'allure exactes sur chaque écran (accueil, voyage, Réglages, Bibliothèque, Étiquettes, et par-dessus « Nouveau voyage ») sont fixées par les maquettes. Le décompte n'est pas montré (choix à vérifier sur maquettes).

## Contraintes

- Règles d'`AGENTS.md` : TDD, fichiers d'environ 500 lignes, couches étanches (le calcul de ce qu'une suppression emporte, et de qui deviendrait orphelin, vit dans le modèle ; les écrans passent par le stockage), textes dans `src/i18n/fr.json`, accessibilité (44 px, 4,5:1, focus visible, clavier), tests d'écran jugés au code de sortie, captures clair/sombre de chaque écran touché.
- Une seule définition par règle : le chiffrage annoncé et la suppression faite reposent sur le même calcul, pour que le critère « les chiffres correspondent exactement » ne puisse pas diverger.
- Données : le schéma actuel devrait suffire (**aucune migration**, à confirmer par le plan d'implémentation). Il faut des écritures nouvelles (supprimer une catégorie, un objet ; rétablir ce qui a été supprimé) dans le stockage Tauri (commandes Rust testées) comme dans le stockage navigateur des tests d'écran. Aucune ne touche une table du voyage. Une suppression, comme son annulation, se fait en une seule opération : jamais à moitié en cas de panne.
- Méthode des phases 3 à 6 : **maquettes cliquables validées par le chef de projet avant tout code** (skill impeccable, `docs/PRODUCT.md`), au téléphone de 360 points, à la tablette en portrait et en paysage et à l'ordinateur, en clair et en sombre.
- Appareils : tablette SM-X210, ASUS (Android 7, 360 points de large), Xiaomi (Android 15), Debian.
- Pas de dépendance nouvelle.

## Maquettes validées (2026-10-26)

`docs/maquettes/suppressions/` (servir la racine du dépôt : `python3 -m http.server 8646 --bind 127.0.0.1`, puis `/docs/maquettes/suppressions/?etat=…`), validée par le chef de projet le 2026-10-26 sans changement (« oui »). Elle fait foi pour tout ce qui se voit. Choix qu'elle fixe en plus de ce document :

- « Supprimer la catégorie » / « Supprimer l'objet » en rouge sous un trait, au bas des fiches de la bibliothèque, comme pour les étiquettes ;
- confirmation : la phrase chiffrée met le nombre en gras (« Ses **3 objets** seront supprimés aussi. », « **1 objet** perdra cette étiquette ; il garde ses autres étiquettes. », « **2 objets et 1 catégorie** perdront cette étiquette ; ils gardent leurs autres étiquettes. », « **1 catégorie** perdra une de ses étiquettes ; elle garde les autres. ») ;
- fenêtre de refus (520 px, panneau du bas au téléphone) : titre « Impossible de supprimer « Plage » pour l'instant », × ; texte « Sans elle (Sans ses étiquettes), ces éléments ne seraient plus jamais proposés. Touchez-les un par un : donnez-leur une autre étiquette ou « Toujours inclus », ou supprimez-les. » (au singulier s'il n'y en a qu'un) ; « N à régler » ; une liste encadrée de lignes de 64 px (pavé de la catégorie, nom, « Catégorie · 3 objets » ou « Objet · dans « Vêtements » », chevron), catégories d'abord ; pied « Fermer », ombré tant qu'il reste à défiler ; la fiche ouverte depuis une ligne se pose par-dessus, et un élément réglé quitte la liste (annoncé à la lecture d'écran) ;
- liste vide : titre « Supprimer l'étiquette « Plage » ? », message vert avec coche « Plus rien ne bloque : vous pouvez supprimer « Plage ». », la phrase chiffrée, pied « Garder » / « Supprimer » (rouge) ;
- bandeau « Annuler » : fond à l'encre, texte au fond (inversé en sombre), corbeille, texte (« Objet « Parasol » supprimé », « Catégorie « Camping » et 3 objets supprimés », « Étiquette « Plage » supprimée », « Groupe « Climat » et 3 étiquettes supprimés »), bouton « Annuler » avec la flèche de retour, au vert départ de l'autre thème ; 56 px de haut, 440 px au plus (toute la largeur au téléphone) ; en bas à droite, juste au-dessus du bouton flottant s'il y en a un ; en haut, centré, quand une fenêtre est ouverte, rangé dans la fenêtre du dessus pour que « Annuler » reste touchable ; entrée en glissé court (rien si l'appareil demande moins d'animations) ; aucun décompte affiché ;
- place réservée : le bas de chaque écran (et de chaque panneau en paysage) garde la hauteur du bandeau, pour qu'il ne cache jamais une dernière ligne ;
- « Annuler » éclaire l'élément revenu, comme un élément neuf ;
- espaces insécables dans les guillemets et devant « : ; ? ! » des textes de la phase 7 (« Plage » ne se coupe plus en fin de ligne).

## Suite des travaux

1. Inscrire les décisions dans `docs/PRD.md` (US-8 retirée et passée en hors périmètre ; « Écrans et gestes » : aucun orphelin, refus qui mène aux fiches, bandeau qui suit) et préciser la phase 7 dans `docs/PLAN.md`. Fait le 2026-10-26.
2. Maquettes (skill impeccable) : boutons « Supprimer » des fiches de catégorie et d'objet, confirmations chiffrées (objet, catégorie, étiquette, groupe), fenêtre de refus et son passage à la confirmation, fiche ouverte depuis la liste, bandeau « Annuler » sur chaque écran (dont « Nouveau voyage »), au téléphone de 360 points comme sur les grands formats. Faites et validées le 2026-10-26 (voir ci-dessus).
3. Après validation des maquettes : plan d'implémentation (superpowers:writing-plans), construction sur une branche `phase-7`, essais sur les appareils, validation par le chef de projet.

## Laissé au constructeur

Découpage des fichiers et des tâches, noms des commandes de stockage, façon de garder de quoi rétablir pendant 10 secondes, détail des animations (réduites si l'appareil le demande).
