# Product

> Rédigé le 2026-10-07 à partir de `docs/PRD.md` et `docs/DESIGN.md` (validés) et des retours du chef de projet ;
> sert de contexte aux outils de design. En cas d'écart, PRD.md et DESIGN.md font autorité.

## Register

product

## Users

Un couple francophone qui voyage à une fréquence variable (randonnée, camping, week-end en ville, vacances). Il prépare
les deux sacs ensemble, surtout sur une tablette Samsung tenue en paysage comme en portrait, la veille ou l'avant-veille
du départ ; il utilise aussi l'appli sur un ordinateur Debian et un téléphone. Il veut que l'appli retienne ses habitudes
une fois pour toutes. Secondairement : toute personne qui installe Baluchon dans sa langue, et les contributeurs qui
traduisent.

## Product Purpose

Générer la liste des bagages d'un voyage depuis une bibliothèque de catégories et d'objets modèles entièrement
configurable (étiquettes, quantités par jour, par nuit ou par personne), cocher ce qui est dans le sac et préparer les
courses. Entièrement hors ligne, sans compte ni traceur. Réussite : le prochain voyage réel est préparé entièrement avec
Baluchon, et BagPacker est désinstallé.

## Brand Personality

Gai, fiable, calme. « Le départ commence ici : préparer son sac devient un petit plaisir, pas une corvée. » Un compagnon
de départ : calme pendant une longue liste, joyeux quand une catégorie est bouclée. La joie vient des pavés de catégorie
colorés et des réussites, jamais des fonds.

## Anti-references

- BagPacker : s'en inspirer pour la disposition, ne jamais en copier ni texte, ni image, ni code.
- Une page de formulaire étirée, alignée à gauche, qui laisse la moitié de l'écran vide sur tablette ou ordinateur
  (rejetée par le chef de projet le 2026-10-07) ; des éléments de largeurs disparates dans une même colonne (calendrier
  plus étroit que les champs) ; des jours de calendrier ovales.
- Ce que le chef de projet apprécie, dans sa propre appli (références montrées le 2026-10-07) : contenu centré et
  équilibré, listes et sections en pleine largeur de leur conteneur, réglages en liste claire, rien de perdu à l'écran.

## Design Principles

1. **Chaque format est un format de première classe.** Tablette en paysage et en portrait, téléphone, ordinateur : on
   conçoit et on vérifie chacun ; aucune colonne étroite perdue dans un grand écran.
2. **Équilibre et alignement.** Un bloc a une largeur cohérente avec ses voisins ; le contenu est centré dans l'espace
   disponible ; rien ne flotte.
3. **Le doigt d'abord.** Cibles de 44 px, gestes simples, rien ne bouge à l'écran sans raison.
4. **Calme dans la tâche, joie dans la réussite.** Interface sobre pendant la préparation, couleur et mascotte réservées
   aux catégories et aux moments réussis.
5. **Familiarité gagnée.** Des composants standards et cohérents d'un écran à l'autre (mêmes boutons, mêmes champs,
   mêmes retours).

## Accessibility & Inclusion

Contraste d'au moins 4,5:1 pour le texte et 3:1 pour les repères, cibles tactiles de 44 px, focus visible, navigation au
clavier, aucune information portée par la seule couleur, animations réduites quand l'appareil le demande, rien sous les
barres système Android. Interface en français, traduisible.
