# Phase 11 : Refaire ce voyage et supprimer un voyage — conception

> Sources : `docs/PRD.md` (US-14, US-30, critère de succès 3), `docs/PLAN.md` (phase 11), `docs/DESIGN.md`.
> Décisions du chef de projet du 2026-10-29 (session « phase11 », questionnement mené pendant la
> construction de la phase 10, récapitulatif accepté : « ok »). Maquette validée par le chef de projet
> le 2026-10-30 (`docs/maquettes/refaire/`, servie par `pnpm dev`).

## Intention

Les séjours du couple reviennent (même maison, même saison). Refaire un voyage doit redonner la liste
**telle qu'on l'avait réglée la dernière fois**, mais construite sur la bibliothèque **actuelle** :
ce qu'on avait ajouté à la main revient, ce qu'on avait écarté revient écarté mais visible. Principe
du chef de projet : « Il est plus facile d'écarter un objet que se souvenir de l'emporter ! » — dans
le doute, un objet est proposé, jamais caché.

Supprimer un voyage sert à faire le ménage dans la liste des voyages, sans risque : confirmation qui
chiffre ce qu'on perd, puis « Annuler » pendant 10 secondes.

Réussite : refaire un voyage depuis la liste ou depuis le voyage, ne rien oublier de ce qu'on avait
ajouté, ne pas avoir à écarter de nouveau ce qu'on n'emporte jamais, et le voyage d'origine reste
intact.

## Objectifs

- « Refaire ce voyage » (US-14), depuis l'écran du voyage **et** depuis un menu sur chaque carte de
  « Mes voyages » (la demande « Dupliquer un voyage » du chef de projet : même fonction, autre porte).
- Chaque voyage **retient les objets de la bibliothèque qu'on y a écartés ou retirés**, pour les
  reproposer écartés quand on le refait.
- « Supprimer ce voyage » (US-30), depuis l'écran du voyage et depuis le menu de la carte.

## Hors périmètre (ne pas construire)

- Sauvegarde et restauration (phase 12). Le format de sauvegarde n'existe pas encore ; il devra
  contenir la nouvelle mémoire des objets écartés (à noter pour la phase 12, rien à faire ici).
- Toucher la bibliothèque : refaire ou supprimer un voyage ne la change jamais.
- Toute autre action dans le menu des cartes (le menu ne contient que les deux actions ci-dessous).

## Anti-objectifs

- Le voyage d'origine modifié de quelque façon que ce soit par « Refaire ».
- Un objet ajouté à la main dans le voyage d'origine qui disparaît sans prévenir du voyage refait.
- Un objet caché parce qu'on n'est pas sûr qu'il avait été écarté (dans le doute, il arrive coché).
- Une suppression de voyage sans confirmation, ou que « Annuler » ne rétablit pas à l'identique
  (coches, pièces dans le sac, achats, quantités, objets ajoutés, mémoire des écartés).
- Des actions rares (modifier, refaire, supprimer le voyage) qui passent avant les catégories et les objets.

## Décisions du chef de projet (2026-10-29)

1. **Contenu du voyage refait** : la liste est générée depuis la bibliothèque actuelle (PLAN), et :
   - les objets **ajoutés à la main** dans le voyage d'origine réapparaissent, marqués comme ajoutés
     à la main ;
   - les objets **écartés ou retirés** dans le voyage d'origine réapparaissent **écartés** (barrés,
     comme un objet décoché de l'aperçu), avec la mention « retiré », et se réintègrent d'un appui.
2. **L'objectif « moins de 30 secondes » est abandonné** (« Au diable les 30 secondes ») : retiré du
   critère de succès 3 du PRD et des critères de la phase 11 ; les 2 minutes de « Nouveau voyage »
   restent.
3. **Chaque voyage retient désormais ce qu'on y écarte** (option A, « a »). Les voyages créés avant
   cette phase n'en ont aucune trace : pour eux, un objet absent arrive coché.
4. Une quantité **fixée à la main** dans le voyage d'origine est **gardée par défaut**, avec la mention
   « fixée manuellement » et le choix Garder / Recalculer, comme à l'étape « Changements » de la
   phase 10 (« ok »). Un objet ajouté à la main reprend sa quantité d'origine.
5. Étape Informations : **nom, destination et dates arrivent vides** (« tout arrive vide ») ; le nombre
   de voyageurs et les étiquettes sont repris (PLAN, US-14).
6. Une **étiquette** du voyage d'origine supprimée depuis de la bibliothèque est signalée par une
   phrase en tête de l'aperçu et ignorée (« ok »). Une étiquette renommée depuis est reprise sous son
   nouveau nom.
7. Un **objet** du voyage d'origine venu de la bibliothèque et **supprimé de la bibliothèque** depuis
   n'est pas repris ; il est nommé dans la même phrase en tête de l'aperçu (« ok »).
8. *(Remplacée par la décision 13.)* Accès à « Refaire ce voyage » : un bouton dans l'en-tête de l'écran du voyage, à côté de
   « Modifier le voyage », même style (« ok ») ; **et** un menu « ⋮ » sur chaque carte de « Mes
   voyages », qui propose « Refaire ce voyage » sous ce même nom (« ok »).
9. *(Remplacée par la décision 13.)* « Supprimer le voyage » : un bouton rouge **tout en bas de l'écran du voyage**, après la dernière
   catégorie (au bas du bloc du voyage en grand écran) (« ok ») ; **et** une ligne rouge, en dernier,
   dans le menu « ⋮ » de la carte (« oui »).
10. Confirmation : « Supprimer le voyage « Quiberon » ? Sa liste de **87 objets**, dont **23 déjà dans
    le sac**, disparaîtra. La bibliothèque n'est pas touchée. » La mention du sac n'apparaît que s'il
    contient quelque chose. Boutons « Garder » / « Supprimer » (rouge), nombres en gras, comme en
    phase 7. Supprimé depuis l'écran du voyage, on revient à « Mes voyages », où attend le bandeau
    « Annuler » de 10 secondes, qui rétablit le voyage avec ses coches, ses achats et ses quantités
    (« ok »).

Décisions du 2026-10-30, après la relecture « constructeur » :

11. **« Modifier le voyage » lit aussi cette mémoire** (« ok ») : à l'étape « Changements », un objet
    qu'une étiquette ajoutée ferait entrer, mais qu'on avait écarté ou retiré de ce voyage, apparaît
    **refusé d'office**, avec la mention « retiré », et s'accepte d'un appui. Change un comportement
    validé de la phase 10 (où tout objet entrant est accepté par défaut), avec son accord.
12. Un objet de la bibliothèque **renommé dans le voyage d'origine** garde, dans le voyage refait, le
    **nom donné dans le voyage d'origine**, sans mention à l'aperçu (« ok »). Revers accepté : un nom
    corrigé ensuite dans la bibliothèque ne passe pas dans le voyage refait.
13. **Les actions sur le voyage se regroupent dans un menu « ⋮ »** (demande du 2026-10-30, dessin validé le même jour, « maintenant oui » ; après la maquette : sur
    ordinateur, « Supprimer le voyage » passait avant les catégories et les objets ; « Modifier », « Refaire »
    et « Supprimer » doivent être groupés, « liste déroulante ou menu accordéon ») : un bouton « ⋮ » au
    bout du titre du voyage ouvre « Modifier ce voyage », « Refaire ce voyage », puis, sous un trait, en
    rouge, « Supprimer ce voyage ». Il **remplace** le bouton « Modifier le voyage » de l'en-tête (phase 10)
    et les boutons des décisions 8 et 9 dans l'écran du voyage. Libellés en « ce voyage » (« on est déjà
    DANS le voyage »), aussi dans le menu des cartes. Même dessin et mêmes gestes que le menu des cartes.

## Choix de l'agent (à relire par le chef de projet)

- Un objet ajouté à la main et marqué « à acheter » dans le voyage d'origine revient « à acheter »
  (rien d'acheté) ; un objet ajouté à la main sans la marque revient sans elle.

- Une **catégorie propre au voyage d'origine** (créée dans ce voyage seulement) revient avec les objets
  ajoutés à la main qu'elle contient, avec son nom, son icône et sa couleur.
- Un objet ajouté à la main dans une catégorie venue de la bibliothèque revient dans cette catégorie si
  elle est dans l'aperçu ; sinon (catégorie non retenue par les étiquettes, ou supprimée de la
  bibliothèque), sa catégorie revient telle que copiée dans le voyage d'origine.
- Un objet ajouté à la main arrive **coché** dans l'aperçu ; on peut le décocher comme un autre.
- Un objet ajouté à la main puis « ajouté aussi à la bibliothèque » (phase 8) est désormais un objet de
  la bibliothèque : il suit les règles de la bibliothèque, sans mention « ajouté à la main ».
- Un objet ajouté à la main puis **retiré** du voyage d'origine ne revient pas : il n'existe nulle part
  ailleurs.
- Sont « écartés » dans un voyage, et donc retenus : les objets décochés à l'aperçu de sa création
  (« Nouveau voyage » comme « Refaire ») ; ceux retirés avec « Retirer du voyage » (phase 8) ; ceux
  retirés ou refusés à l'entrée à l'étape « Changements » (phase 10) ; un objet retiré qui attend la
  sortie de ses pièces. Un objet écarté qui revient dans le voyage (« Annuler » d'un retrait, « Le
  garder dans le voyage », réintégré par « Modifier le voyage ») n'est plus écarté.
- La mention « retiré » ne vise que les objets que la bibliothèque actuelle **propose** avec les
  étiquettes choisies : un objet écarté que les étiquettes n'appellent plus n'apparaît pas.
- Un objet du voyage d'origine venu de la bibliothèque, qui existe encore dans la bibliothèque mais que
  ses règles n'incluent plus avec les étiquettes choisies, ne revient pas et n'est pas signalé : c'est
  la « bibliothèque actuelle ».
- « Fixée manuellement » : le choix Garder / Recalculer n'apparaît que si le calcul actuel donne autre
  chose que la quantité fixée ; sinon l'objet arrive avec la quantité calculée, sans mention. Une
  quantité gardée reste « fixée manuellement » dans le nouveau voyage.
- « Dans le sac » compte, dans la confirmation de suppression, les **objets** qui ont au moins une pièce
  dans le sac (pas les pièces).
- Le menu « ⋮ » existe sur toutes les cartes, passées comprises.

## Comportement

### Refaire ce voyage

- **Accès** : ligne « Refaire ce voyage » du menu « ⋮ » au bout du titre du voyage (décision 13) et du
  menu « ⋮ » de chaque carte de « Mes voyages ». L'assistant s'ouvre par-dessus l'écran d'où l'on part (voyage ou Mes voyages), comme
  « Nouveau voyage » et « Modifier le voyage » : fenêtre modale sur tablette et ordinateur, plein écran
  au téléphone, retour système compris.
- **Préremplissage** : nom, destination et dates vides ; voyageurs repris ; étiquettes du voyage
  d'origine présélectionnées d'après l'étiquette de la bibliothèque d'où elles viennent (règle déjà
  utilisée par « Modifier le voyage »). L'assistant s'ouvre sur l'étape Informations.
- Titre de l'assistant : il dit qu'on refait ce voyage (le nom du voyage d'origine y figure) ; bouton
  final « Créer le voyage ». Fermer avec une saisie demande « Abandonner ce nouveau voyage ? », comme
  pour une création.
- **Aperçu** (dernière étape, celui de « Nouveau voyage », avec ses gestes) :
  - les objets que la bibliothèque actuelle retient, avec leurs quantités calculées ;
  - les objets **retirés la dernière fois** : écartés d'entrée (barrés, atténués), avec la mention
    « retiré », recochables d'un appui ;
  - les objets **ajoutés à la main** dans le voyage d'origine : cochés, avec la mention « ajouté à la
    main », et leur quantité d'origine ;
  - les objets de la bibliothèque renommés dans le voyage d'origine, sous ce nom-là (décision 12) ;
  - les quantités **fixées manuellement** : mention « fixée manuellement : 3 · le calcul donne 7 » et
    le choix Garder / Recalculer (même dessin qu'à l'étape « Changements »), Garder par défaut ;
  - **en tête**, si besoin, une phrase qui nomme les étiquettes et les objets du voyage d'origine qui
    n'existent plus dans la bibliothèque et ne sont pas repris ;
  - le compteur, la case de catégorie, la fenêtre « objets écartés » au retour à l'aperçu et l'aperçu
    vide suivent les règles existantes ; les objets « retirés » comptent comme écartés.
- « Créer le voyage » crée un voyage neuf : rien dans le sac, rien d'acheté, « à acheter » d'après
  « consommable » (objets de la bibliothèque) ; il retient ses propres objets écartés ; l'appli ouvre
  sa liste. Le voyage d'origine n'est pas touché.

### Supprimer un voyage

- **Accès** : ligne rouge « Supprimer ce voyage », en dernier, sous un trait, dans le menu « ⋮ » du
  voyage et dans celui de sa carte (décision 13).
- **Confirmation** (décision 10) : nombre d'objets du voyage, et nombre d'objets ayant au moins une
  pièce dans le sac s'il y en a. « Garder » / « Supprimer ».
- **Après** : depuis le voyage, retour à « Mes voyages » ; la carte disparaît ; bandeau « Annuler » de
  10 secondes, à la place et au dessin du bandeau de la phase 7. Il suit d'un écran à l'autre ; une
  nouvelle suppression le remplace, la précédente devenant définitive (règle de la phase 7).
- **« Annuler »** rétablit le voyage à l'identique : informations, étiquettes, catégories, objets,
  pièces dans le sac (pièces à sortir comprises), achats, quantités et leur mention manuelle, objets
  écartés retenus. La carte revient à sa place dans « Mes voyages ».

### Le menu « ⋮ » d'un voyage

- Un seul composant, à deux endroits : le bouton à icône de l'appli (bord, 44 px), libellé accessible
  « Actions du voyage « Quiberon » ».
- **Au bout du titre de l'écran du voyage** (téléphone, tablette, bloc du voyage en grand écran), calé sur
  la première ligne du titre : « Modifier ce voyage », « Refaire ce voyage », puis « Supprimer ce
  voyage ». Le bouton « Modifier le voyage » de l'en-tête disparaît.
- **Dans le coin haut droit de chaque carte de « Mes voyages »**, posé à part (il n'ouvre pas le voyage ;
  la carte reste un lien) : « Refaire ce voyage », puis « Supprimer ce voyage ».
- Le menu s'ouvre sous son bouton (au-dessus s'il manque de place) ; il se ferme par Échap, par le retour
  système et par un appui ailleurs, et rend le focus à son bouton ; flèches, Début et Fin au clavier.

## Données

- **Impact sur le schéma (migration 007)** : chaque voyage retient la liste des objets de la
  bibliothèque qu'on y a écartés (identifiant de l'objet modèle, sans contrainte vers la bibliothèque,
  comme `modele_id`), effacée avec le voyage. Rien n'est rempli pour les voyages existants : aucune
  trace ne peut être reconstruite (décision 3).
- Le stockage écrit cette liste aux moments décrits dans « Choix de l'agent » (création, retrait,
  changements, rétablissements), dans la même opération que l'écriture qui la provoque.
- Supprimer un voyage efface le voyage et tout ce qui en dépend en une seule opération ; le rétablir le
  réécrit tel qu'il était, en une seule opération. Une erreur d'enregistrement laisse les données
  telles qu'elles étaient, avec le message de panne habituel.
- Le filtre « Reste à emballer » du voyage (réglage de l'appareil) n'a pas à survivre à une suppression
  devenue définitive ; il peut rester tant que « Annuler » est possible.

## Règles à placer dans le modèle (pur, une seule définition chacune)

- Ce qu'un voyage refait reprend d'un voyage d'origine et de la bibliothèque : étiquettes
  présélectionnées et étiquettes disparues, objets disparus, objets écartés d'entrée, objets ajoutés à
  la main et leurs catégories, quantités fixées et leur calcul actuel. La génération du voyage
  (`genererVoyage`) reste la seule à copier la bibliothèque ; elle accueille les ajouts à la main et
  les quantités gardées.
- Quand un objet devient écarté ou cesse de l'être (création, retrait, changements, rétablissement).
- Le défaut d'un objet entrant à l'étape « Changements » : refusé s'il est écarté dans ce voyage
  (décision 11), accepté sinon — dans `src/modele/changements.js`, sans règle en double.
- Le chiffrage de la confirmation de suppression.
- Les écrans ne font que montrer et transmettre les choix ; le stockage n'écrit que ce que le modèle a
  calculé.

## Laissé au constructeur

- Le découpage pour accueillir le mode « refaire » : `src/ecrans/assistant-controleur.js` compte déjà
  437 lignes, `src/ecrans/voyage.js` 441.
- La forme de la mémoire des objets écartés (table à part ou autre), pourvu qu'elle respecte
  « Données ».
- Le comportement du bandeau « Annuler » d'un voyage vis-à-vis des écritures dans d'autres voyages ou
  dans la bibliothèque, pourvu que « Annuler » ne rétablisse jamais un état faux.

## Documents à mettre à jour (avec la conception)

- `docs/PRD.md` :
  - US-14 : depuis le voyage ou depuis la liste des voyages ; voyageurs et étiquettes repris, nom,
    destination et dates à saisir ; liste construite sur la bibliothèque actuelle en reprenant les
    objets ajoutés à la main, les quantités fixées et les objets écartés ; « afin de retrouver la liste
    réglée la dernière fois » (au lieu de « en quelques secondes ») ;
  - US-30 : depuis le voyage ou depuis la liste des voyages ;
  - puce « Quand les plans changent » : « Modifier ce voyage » est dans le menu « ⋮ » du voyage, et non
    plus un bouton de l'en-tête (décision 13) ;
  - critère de succès 3 : supprimer « avec « Refaire ce voyage » : moins de 30 secondes » ;
  - puce « Quand les plans changent » : un objet écarté de ce voyage qu'une étiquette ajoutée ferait
    entrer arrive refusé, avec « retiré » (décision 11) ;
  - « Écrans et gestes » : une puce « Refaire ce voyage et supprimer un voyage » qui résume les
    décisions ci-dessus.
- `docs/PLAN.md`, phase 11 : livrable et critères d'acceptation —
  - « Refaire ce voyage » s'ouvre depuis le voyage et depuis le menu de sa carte, voyageurs et
    étiquettes repris, nom, destination et dates vides ;
  - le voyage d'origine reste intact ;
  - une étiquette ou un objet du voyage d'origine qui n'existe plus dans la bibliothèque est signalé et
    ignoré ;
  - un objet ajouté à la main revient, marqué ; un objet écarté revient écarté, avec « retiré » ; pour
    un voyage antérieur à cette phase, tout arrive coché ;
  - une quantité fixée à la main est gardée par défaut et ne change que si l'on choisit « Recalculer » ;
  - de « Nouveau voyage » à la liste créée : moins de 2 minutes ;
  - « Annuler » rétablit le voyage supprimé avec ses coches, ses achats et ses quantités ;
  - schéma : la mémoire des objets écartés d'un voyage.
- `docs/DESIGN.md` : une ligne au journal (maquette validée le 2026-10-30).
