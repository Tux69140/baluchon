# Phase 9 : Courses — conception

> Sources : `docs/PRD.md` (US-23, US-24, critère de succès 4), `docs/PLAN.md` (phase 9), `docs/DESIGN.md`.
> Décisions du chef de projet du 2026-10-29 (session « Phase9 ») ; maquette validée le 2026-10-29 :
> `docs/maquettes/courses/` (servie par `pnpm dev`, puis `http://localhost:1430/docs/maquettes/courses/`).

## Intention

Le couple fait ses courses **au téléphone**, sorti de la poche de magasin en magasin, chacun avec sa
liste (aucun partage prévu). L'écran Courses doit donc se lire et se toucher en un coup d'œil, d'une
main, et pardonner l'appui de trop. Réussite : tous les consommables d'un voyage apparaissent dans
Courses avec leurs quantités, sans aucune saisie (critère de succès 4).

## Objectifs

- La marque « à acheter » : posée d'office sur les consommables à la création du voyage (déjà fait
  depuis la phase 2), visible sur la ligne de l'objet, réglable depuis sa fiche sur n'importe quel objet.
- L'écran Courses (`#/voyage/:id/courses`) : les objets qui restent à acheter, par catégorie, avec leurs
  quantités ; on y note ce qui est acheté, **pièce par pièce**.

## Hors périmètre (ne pas construire)

- Partage de liste entre appareils ; prix, budget (PRD, hors périmètre).
- Tout ce que le plan range plus tard : changer dates, voyageurs ou étiquettes d'un voyage (phase 10),
  refaire ou supprimer un voyage (phase 11), sauvegarde (phase 12).

## Anti-objectifs

- Un objet qui disparaît des Courses sur un appui accidentel sans moyen de le rattraper.
- La marque « à acheter » signalée par la couleur seule (DESIGN.md).
- Toucher la bibliothèque : la marque et les achats n'existent que dans le voyage.

## Décisions du chef de projet (2026-10-29)

1. **Achat partiel noté**, « à l'image de ce qui est partiel dans le sac » : chaque objet du voyage
   compte ses pièces achetées, de 0 à la quantité prévue. **Écart au schéma du PLAN** : `acheté`
   (oui / non) devient un nombre de pièces achetées (décision du chef de projet).
2. Un objet **entièrement acheté quitte l'écran Courses** ; sa marque « à acheter » disparaît en même
   temps de la liste du voyage. Il reste à mettre dans le sac (PRD).
3. Un objet marqué « à acheter » **mis en entier dans le sac** compte comme acheté : il quitte Courses
   de lui-même.
4. Contre l'appui de trop : l'objet tout juste acheté reste **grisé environ une seconde** à sa place,
   puis part, et un **bandeau « Annuler » de 10 secondes** (celui de la phase 7) le rend tel qu'il était.
5. Maquette validée telle quelle, y compris les choix ci-dessous qu'elle montre.

## Règles (choix présentés au chef de projet le 2026-10-29, acceptés « sur ces bases »)

Le modèle les porte, une seule fois (module pur, testable sans navigateur) :

- **Reste à acheter** = quantité − pièces achetées, si l'objet est marqué « à acheter » ; 0 sinon.
  Un objet est dans Courses, et porte la pastille, tant que ce reste est > 0.
- **Mettre l'objet en entier dans le sac** (case, fiche, « Tout dans le sac ») : s'il est marqué « à
  acheter », ses pièces achetées passent à la quantité. Le ressortir du sac ne le remet **pas** dans
  Courses. Un remplissage partiel du sac ne change rien aux achats.
- **Quantité prévue augmentée** (phase 8) sur un objet marqué : il revient dans Courses avec ce qui
  manque (« encore 2 à acheter ») ; baissée, les pièces achetées sont ramenées à la quantité au plus.
- **Interrupteur « À acheter »** : il est allumé quand le reste à acheter est > 0. L'éteindre retire la
  marque (les pièces achetées restent telles quelles). L'allumer sur un objet déjà entièrement acheté
  remet ses pièces achetées à 0 ; sur un objet en partie acheté, il reprend où il en était.
- Un objet ajouté à la main dans le voyage (phase 8) naît sans la marque, comme aujourd'hui.

## Écrans (forme validée par la maquette)

### Liste du voyage

- **Puce « Courses · N »** (icône chariot, Phosphor Bold `shopping-cart`) à côté de « Reste à
  emballer » ; N = nombre d'objets qui restent à acheter ; sans N quand il vaut 0 (la puce reste et
  mène à l'écran vide). Même place au téléphone et dans le bloc du voyage en grand format.
- **Pastille** sous le nom de l'objet, après « partagé » : chariot + « à acheter » ; après un achat
  partiel, « encore N à acheter ». Fond `--fond-attention`, texte `--attention`, coins pleins
  (`.pastille-achat` de la maquette). Le nom accessible de la ligne la reprend.
- **Fiche de l'objet**, bloc « Ajuster cet objet », entre « Quantité prévue » et « Renommer » : ligne
  « À acheter » avec interrupteur (celui des fiches de la bibliothèque) ; sous-texte « apparaît dans les
  Courses », ou « 6 achetés sur 16 » après un achat partiel.

### Écran Courses

- En haut : lien retour au nom du voyage, titre « Courses » précédé du chariot (couleur
  `--attention`), sous-titre « N objets à acheter ».
- Une carte par catégorie qui a quelque chose à acheter, dans l'ordre du voyage ; objets par ordre
  alphabétique ; l'en-tête de carte (pavé + nom) ne se replie pas et n'a pas de compteur.
- Ligne : la **case** (celle du sac, 56 px) ajoute une pièce achetée à chaque appui ; achat partiel
  « 6 / 16 » et trait dans la case ; quantité seule sinon. Le reste de la ligne ouvre la **fiche
  d'achat**.
- Objet terminé : case pleine et nom grisé ~1 s, puis il part ; bandeau « Annuler » (chariot,
  « Café : acheté », « Repas : achetés (16) »). « Annuler » rend le nombre de pièces achetées d'avant.
- **Fiche d'achat** (panneau du bas au téléphone, fenêtre centrée ailleurs, comme la fiche de l'objet) :
  titre = nom, ligne du haut = catégorie ; bloc « Acheté » avec − / nombre / + « sur 16 » et le bouton
  principal « Tout acheté » ; sous un trait, « À acheter » avec interrupteur (« l'éteindre retire l'objet
  des Courses »). Atteindre la quantité, ou éteindre l'interrupteur, ferme la fiche ; l'objet part avec
  le bandeau (« Pain : plus à acheter » pour l'interrupteur, « Annuler » remet la marque).
- **Grand format** (dès 600 px de large et de haut) : cartes en colonnes (2, puis 3 dès 1340 px de large,
  largeur totale 1480 px au plus), jamais une colonne étroite au milieu du vide.
- **Vide** (carte avec la mascotte, comme le voyage vide, bouton « Retour au voyage ») :
  - aucun objet marqué : « Rien à acheter » — « Aucun objet de ce voyage n'est marqué « à acheter ». La
    marque se pose depuis la fiche d'un objet, dans la liste du voyage. » ;
  - tout acheté : « Courses faites ! » — « Tout ce qu'il fallait acheter est acheté. Il reste à le mettre
    dans le sac. »
- Retour système : ferme la fiche ouverte, sinon revient à la liste du voyage.

## Contraintes

- Règles d'`AGENTS.md` : TDD, fichiers ≈ 500 lignes, couches étanches (aucun écran ne parle à SQLite),
  textes dans `src/i18n/fr.json`, une seule définition par règle (la case des Courses partage la
  mécanique de la case du sac plutôt que de la recopier).
- Données : nouvelle migration SQLite (`005_…`) qui transforme `achete` (0/1) en nombre de pièces
  achetées, sans perte (les voyages existants n'ont jamais eu `achete` à 1). Même changement dans la
  variante navigateur du stockage et dans le contrat partagé des deux stockages.
- Tests d'écran Playwright avec une capture claire et une sombre de chaque écran touché ; captures
  regardées aux formats 393 × 873, 800 × 1280, 1280 × 800 et 1920 × 1080.
- Fonctionne sous la WebView d'Android 7 (Chrome 116) : pas de CSS plus récent que ce que le reste de
  l'appli utilise.

## Choix de l'agent (relecture de la conception, 2026-10-29)

- La migration applique la règle « sac plein = acheté » aux objets déjà marqués et déjà entièrement
  dans le sac : ils passent à « tout acheté », pour ne pas réapparaître dans Courses.
- Éteindre « À acheter » depuis la fiche de l'objet, dans la liste du voyage, ne montre pas de bandeau
  « Annuler » : rallumer l'interrupteur, au même endroit, suffit à rattraper l'erreur.

## Laissé au constructeur

- Le découpage en fichiers et le nom des fonctions ; la forme de la nouvelle commande d'écriture (pièces
  achetées, marque « à acheter »).
- La reprise de la mécanique du bandeau « Annuler » (phase 7) pour les achats.

## Documents à mettre à jour

- `docs/PLAN.md` : schéma (`acheté` → nombre de pièces achetées) et phase 9.
- `docs/PRD.md` : règles « à acheter » ci-dessus (achat partiel, sac plein = acheté, retour en Courses).
- `docs/DESIGN.md` : journal des décisions (maquette de la phase 9 validée).
