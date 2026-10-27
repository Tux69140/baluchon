# Grand écran : règles validées (écran d'un voyage et Bibliothèque)

Validé par le chef de projet le 2026-10-27. Maquette : `docs/maquettes/grand-ecran/` (servir la racine
du dépôt avec `pnpm exec vite --port 8650`, ouvrir `/docs/maquettes/grand-ecran/`, Bibliothèque avec
`?ecran=bibliotheque`, cas de 11 catégories avec `&etat=beaucoup`). Les 16 captures de référence se
refont avec `node docs/maquettes/grand-ecran/captures.mjs` (serveur lancé) dans
`captures-travail/grand-ecran/a-valider/`.

Ce document remplace, pour ces deux écrans, la règle « deux panneaux dès 1000 px de large en paysage »
(`DEUX_PANNEAUX` dans `src/ecrans/disposition.js`, `src/styles/voyage-panneaux.css`).

## 1. Seuils et media queries

| Disposition | Condition | Media query |
|---|---|---|
| Téléphone : accordéon en une colonne, **inchangé** | plus petit côté < 600 px | ce qui ne satisfait pas la suivante |
| Tablette et ordinateur (repli ou trois colonnes) | plus petit côté ≥ 600 px | `(min-width: 600px) and (min-height: 600px)` |
| Repli | idem, et largeur < 1340 px | `(min-width: 600px) and (max-width: 1339.98px) and (min-height: 600px)` |
| Repli : voyage et tuiles côte à côte | repli, et largeur ≥ 720 px | `(min-width: 720px) and (max-width: 1339.98px) and (min-height: 600px)` |
| Trois colonnes | largeur ≥ 1340 px | `(min-width: 1340px) and (min-height: 600px)` |

- 600 px est le seuil de la fenêtre modale (DESIGN.md, 2026-10-07). Les téléphones (360 à 412 px de
  petit côté) restent en accordéon, **même couchés**. Toutes les tablettes, **portrait compris**
  (800 × 1280), quittent l'accordéon. La tablette en paysage (1280 × 800) quitte les deux panneaux.
- L'orientation n'entre plus dans aucune condition.
- Une seule définition par seuil : la même requête doit servir au JS (choix du HTML : cartes du menu
  ou tuiles, titre de la liste visible ou non) et au CSS, comme `DEUX_PANNEAUX` aujourd'hui.
- Fait foi : `maquette.js` (constantes `TABLETTE` et `REPLI`, commentaire d'en-tête) et `maquette.css`.

## 2. Structure commune (tablette et ordinateur)

Éléments, dans l'ordre du HTML :

1. le lien retour (voyage : « ‹ Mes voyages » ; Bibliothèque : la barre du haut, bouton menu
   et « ‹ Réglages »). Il est **seul sur la première ligne** de la grille (`grid-column: 1 / -1`) ;
2. le bloc de gauche :
   - voyage : `h1` (32 px), destination, dates, étiquettes, carte « Dans le sac » (marge haute
     24 px, `--e-lg`), puce « Reste à emballer » ;
   - Bibliothèque : `h1` « Bibliothèque », « N catégories · N objets », puce « Ranger les
     catégories » ;
3. le menu des catégories (`nav`, titre « Catégories » lu par la lecture d'écran seulement) ;
4. la liste des objets de la catégorie choisie : une seule carte (fond `--carte`, bord 1 px
   `--separation`, arrondi `--r-lg`, `overflow: hidden`), lignes **en une seule colonne**,
   inchangées.
   - Voyage : case de 56 px, nom, quantité, ⓘ.
   - Bibliothèque : lignes de modèle, puis « Ajouter un objet ».

Grille : `column-gap: 32px` (`--e-xl`), `row-gap: 4px` (`--e-xs`),
`padding: 24px 32px calc(48px + 80px)`. Le bas garde la place du bandeau « Annuler ».
Fait foi : `maquette.css`, section « Commun aux trois colonnes et au repli ».

## 3. Trois colonnes (largeur ≥ 1340 px)

- **Colonnes :** `grid-template-columns: 320px 360px minmax(0, 800px)`, `justify-content: center`
  (en 1920 px, 188 px de marge de chaque côté ; en 1340 px, la liste a 532 px).
- **Défilement :** `grid-template-rows: auto minmax(0, 1fr)`, et la grille a la hauteur de l'écran
  (`height: calc(100dvh - var(--zone-haut) - var(--zone-bas))`, `padding-bottom: 0`).
- **Chaque colonne défile seule :** voyage, menu et liste ont `align-self: stretch`,
  `min-height: 0` et `overflow-y: auto`. Elles ont `padding-bottom: calc(48px + 80px)` pour le
  bandeau « Annuler », et `margin-inline: -6px; padding-inline: 6px` pour que le contour du focus
  ne soit pas rogné.
  - Un long menu (11 catégories en 1366 × 768) défile **sans pousser la liste**, qui reste en haut
    (capture 08).
- **Menu :** les cartes de choix d'aujourd'hui (`.choix` : pavé, nom, jauge mini, compte ou
  tampon, flèche). La choisie a le fond `--actif`, un bord de 2 px à l'encre et sa flèche visible.
  Les règles `.choix` de `voyage-panneaux.css` doivent valoir sous la nouvelle requête (≥ 600 px de
  petit côté), et plus seulement en paysage dès 1000 px.
- **Liste :** **pas de titre visible.** Le `h2` (nom de la catégorie) reste pour la lecture d'écran
  (classe de type « lecteur ») ; la catégorie choisie dans le menu dit laquelle est ouverte.
- **Bibliothèque :**
  - le crayon de chaque catégorie est **dans sa carte, avant la flèche** : bouton-icône
    `bouton-modifier` en position absolue, `right: 8px + 44px`, centré verticalement, avec une
    place de 44 px réservée avant le chevron ;
  - son nom dit : « Modifier la catégorie {nom} » ;
  - il remplace le bouton « Modifier » de l'ancien en-tête du panneau de droite, qui disparaît ;
  - « Nouvelle catégorie » est un bouton secondaire pleine largeur (`bouton-large`), sous les
    cartes.
- Fait foi : `maquette.css` (sections « Trois colonnes », « Commun », crayon), `vues.js` (`choix`),
  `bibliotheque.js` (`choix`).

## 4. Repli (600 à 1339 px de large)

- **Colonnes :**
  - dès 720 px de large : `grid-template-columns: 320px minmax(0, 1fr)`, le bloc de gauche et les
    tuiles côte à côte ;
  - entre 600 et 719 px : une colonne, les tuiles sous le bloc de gauche (`margin-top: 24px`) ;
  - `column-gap: 24px` ; marges latérales de 24 px (`padding-inline: var(--e-lg)`).
- **Liste :** juste dessous, sur toute la largeur (`grid-column: 1 / -1`), `margin-top: 32px`,
  `scroll-margin-top: 16px`. Avec 11 catégories, elle commence vers 400 px en 1280 × 800 et vers
  510 px en 800 × 1280, donc reste à l'écran sans défiler (captures 05 et 06).
- **Titre de la liste (visible en repli seulement) :** `h2` en Baumans 24 px (`--taille-section`,
  interligne 1,15), marge basse 16 px, dans une rangée `display: flex; flex-wrap: wrap;
  justify-content: space-between; align-items: center; gap: 8px 16px`. Il est utile parce qu'en
  défilant, les tuiles sortent de l'écran.
- **Bibliothèque :** à droite du titre, un bouton secondaire « Modifier » avec le crayon
  (`bibliotheque.modifier`), marge basse 16 px. Il ouvre la fiche de la catégorie choisie.
- Fait foi : `maquette.css`, sections « Repli » et « Les tuiles du repli » (`.ge-liste-tete`) ;
  `bibliotheque.js`.

### Les tuiles

- **Grille :** `grid-template-columns: repeat(auto-fill, minmax(190px, 1fr))`, `gap: 8px`, liste
  sans puces. On obtient 4 tuiles par rangée à côté du voyage en 1280 px, 2 en 800 px.
- **Tuile :** un bouton, en `display: flex` aligné au centre, `gap: 12px`, `min-height: 60px`,
  `height: 100%` (les tuiles d'une rangée ont la même hauteur), `padding: 8px`, bord 1 px
  `--separation`, arrondi `--r-lg`, fond `--carte` (`--releve` au survol), texte aligné à gauche.
  Elle contient :
  - le pavé de 44 px (couleur de la catégorie, icône à l'encre), sans changement ;
  - le nom : Source Sans 3, 600, 15 px (`--taille-libelle`), interligne 1,25, coupé au besoin
    (`overflow-wrap: anywhere`) ;
  - dessous (colonne flex, `gap: 2px`), selon le cas :
    - voyage : le compte « faits / total » (`voyage.compte`) en 600, 13 px, `--encre-douce`,
      chiffres tabulaires ;
    - catégorie bouclée : **« Bouclé ! » en petit** (`voyage.boucle`) : Baumans 13 px,
      interligne 1,35, bord 2 px `--principal`, arrondi 8 px, `padding: 0 6px`, fond `--carte`,
      texte `--principal`, `transform: rotate(-5deg)` ;
    - Bibliothèque : « N objets » (`bibliotheque.objets`) en 600, 13 px, `--encre-douce`.
- **Tuile choisie :** `aria-current="true"`, fond `--actif`, bord 2 px `--encre`, `padding: 7px`
  (le contenu ne bouge pas).
- **Catégorie bouclée sous le filtre « Reste à emballer » :** comme aujourd'hui, elle descend en
  fin de grille, atténuée : bord en pointillés, fond transparent, pavé à 55 % d'opacité.
- **Tuile « Nouvelle catégorie » (Bibliothèque) :**
  - dernière tuile, bord en pointillés, texte `--principal` ;
  - à la place du pavé, un pavé neutre (fond `--releve`) avec l'icône plus de 22 px ;
  - libellé « Nouvelle catégorie » (`bibliotheque.nouvelleCategorie`).
  - Pas de bouton flottant dans cette disposition.
- Fait foi : `maquette.css` (« Les tuiles du repli »), `vues.js` (`tuile`, `infosVoyage`),
  `bibliotheque.js` (`vueBibliotheque`).

### Défilement au toucher (repli)

Toucher une tuile choisit la catégorie et redessine. **Si la liste commence dans la moitié basse de
l'écran** (`top > innerHeight / 2`), elle défile jusqu'au titre de la liste, 16 px sous le haut de
l'écran (`scrollIntoView({ block: 'start' })` avec `scroll-margin-top: 16px`). Le défilement est
doux, ou immédiat si l'appareil demande moins d'animations. Sinon rien ne bouge. Avec les tuiles,
cela n'arrive qu'avec des dizaines de catégories.

L'indice « des objets plus bas », essayé puis retiré, **n'est pas à faire**.

Fait foi : `maquette.js` (`allerALaListe`).

## 5. Bandeau « Annuler » (phase 7)

- Sa place ne change pas : en bas à droite, 16 px des bords, 440 px de large au plus.
- Il n'y a ni bouton flottant ni pied fixe dans ces dispositions : il reste tout en bas.
- Le bas de la page (repli) et le bas de chaque colonne (trois colonnes) lui gardent
  `48px + 80px`. Il ne cache jamais une dernière ligne (capture 07).
- `BAS_FIXE` dans `src/ecrans/annulation.js` est inchangé.

## 6. Ce qui ne change pas

- Le téléphone (petit côté < 600 px) : l'accordéon d'aujourd'hui, à l'identique (capture 16).
- Toutes les briques : en-tête du voyage, carte « Dans le sac » et bandeau « Sac bouclé ! », puce
  « Reste à emballer » et sa ligne « N objets dans le sac, masqués », lignes d'objet (case de
  56 px, entamée, pleine, « partagé », ⓘ), lignes de modèle, tampon « Bouclé ! » des cartes, pavés,
  jauges, couleurs, mode sombre.
- L'ordre et le filtre : objets à emballer d'abord, catégories bouclées en bas sous le filtre.
- Les fiches (objet, catégorie, modèle), les fenêtres, l'assistant « Nouveau voyage » et les autres
  écrans.
- **Mode « Ranger les catégories » (non dessiné dans la maquette) :** comme décidé en phase 5
  (« le mode rangement remplace la colonne des catégories »), sa liste compacte avec ▲ ▼ prend la
  place du menu, cartes ou tuiles ; la liste des objets reste où elle est.

## 7. Textes

**Aucun texte nouveau.** Tout existe déjà dans `src/i18n/fr.json` :

- `voyage.compte`, `voyage.boucle`, `voyage.categories` (titre du menu, lu seulement) ;
- `bibliotheque.objets`, `bibliotheque.modifier`, `bibliotheque.modifierCategorie`,
  `bibliotheque.nouvelleCategorie`, `bibliotheque.ajouterObjet`.

## 8. Fichiers de la maquette qui font foi

| Point | Fichier |
|---|---|
| Seuils, choix du HTML (cartes ou tuiles, titre visible ou non), défilement au toucher, bandeau | `docs/maquettes/grand-ecran/maquette.js` |
| Grilles, largeurs, défilement par colonne, tuiles, titre de la liste, crayon | `docs/maquettes/grand-ecran/maquette.css` |
| HTML de la tuile, du choix, des lignes | `docs/maquettes/grand-ecran/vues.js` |
| Bibliothèque (crayon, tuile « Nouvelle catégorie », « Modifier ») | `docs/maquettes/grand-ecran/bibliotheque.js` |
| Données d'essai (voyage, 11 catégories, catégorie longue) | `docs/maquettes/grand-ecran/donnees.js` |
| Les 16 captures de référence | `docs/maquettes/grand-ecran/captures.mjs` (sortie dans `captures-travail/grand-ecran/a-valider/`) |

Détail propre à la maquette, à ne pas reprendre : `index.html` lie lui-même
`../suppressions/bandeau.css`, parce que servi par Vite, `bandeau.js` cherche sa feuille au mauvais
endroit.
