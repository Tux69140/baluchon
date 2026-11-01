# Phase 14 : Tous les formats d'écran — conception

> Sources : `docs/PRD.md` (US-36, critère de succès 8, « Accessibilité »), `docs/PLAN.md` (phase 14),
> `docs/DESIGN.md`. Étude menée avec le chef de projet le 2026-11-01 (session « phase14 »), sur `main`,
> alors que la phase 13 attendait encore sa traduction d'essai réelle ; quatre décisions prises alors.

## Intention

La disposition de chaque format existe déjà : une colonne au téléphone, tuiles ou trois colonnes sur
tablette et ordinateur (phase 7). Chaque phase a vérifié ses propres écrans, mais seulement aux formats
qui comptaient pour elle. La phase 14 ne construit rien de nouveau : elle vérifie **tous** les écrans et
tout ce qui s'ouvre par-dessus, à **tous** les formats et dans les deux thèmes, d'une seule façon. Elle
corrige ce qui ne passe pas.

Réussite : quel que soit l'appareil et la façon dont on le tient, aucun bouton n'est hors de portée,
coupé ou caché par une barre du système ou par le clavier, et tourner l'appareil ne fait rien perdre.

## Objectifs

1. **Une grille automatique unique** : chaque écran, et chaque couche qui s'ouvre par-dessus, dans chaque
   format et chaque thème, jugé sur les mêmes règles (bloquantes, sauf au téléphone en paysage : rapport,
   décision 12) :
   - aucune page ne défile de côté ;
   - aucun texte ni aucune commande visible ne passe sous les barres système ;
   - chaque commande offre une cible d'au moins 44 × 44 px ;
   - sur ordinateur, le contenu ne dépasse pas 1544 px de large.
2. **La rotation ne fait rien perdre**, sur tablette comme au téléphone : catégorie choisie, coches,
   saisie en cours, étape de l'assistant, fenêtre ouverte.
3. **Un essai avec le texte agrandi** (taille de police d'Android à environ 130 %), en rapport (décision 12).
4. **Un passage sur les vrais appareils**, avec le clavier d'Android contrôlé champ par champ.
5. Les défauts trouvés sont corrigés dans la phase, chacun par un test qui échoue d'abord.

## Formats

| Nom                  | Taille      | Pointeur | Remarque                                     |
| -------------------- | ----------- | -------- | -------------------------------------------- |
| Téléphone            | 393 × 873   | doigt    | critère de succès 8                          |
| Téléphone paysage    | 873 × 393   | doigt    | ajouté (décision 1), sans creuser            |
| Tablette portrait    | 800 × 1280  | doigt    | critère de succès 8                          |
| Tablette paysage     | 1280 × 800  | doigt    | critère de succès 8                          |
| Portable             | 1366 × 768  | souris   | « ordinateur » (choix 6)                     |
| Ordinateur           | 1920 × 1080 | souris   | « ordinateur » (choix 6) ; plafond 1544 px   |

Thèmes : clair et sombre pour chaque format.

## Écrans et couches à couvrir

La liste à tenir à jour vit dans le test, pas ici ; elle part de celle-ci (choix 8) :

- Accueil : écran vide du premier lancement, liste des voyages, menu « ⋮ » d'une carte.
- Menu principal ouvert ; « À propos ».
- Assistant : Informations (compteurs, calendrier), chaque groupe d'étiquettes, Aperçu ; « Changements »
  (Modifier le voyage) ; « Refaire ce voyage » ; question « Abandonner ce nouveau voyage ? ».
- Voyage : liste (téléphone) ou colonnes/tuiles (grand écran), menu « ⋮ », filtre « Reste à emballer »,
  fiche d'objet, ajout d'objet (nouveau et depuis la bibliothèque), objet à sortir du sac.
- Courses : liste, fiche d'achat, bandeau « Annuler ».
- Réglages : thème, sauvegarde, restauration (aperçu du fichier, confirmation, refus).
- Bibliothèque : liste, mode « Ranger les catégories », fiche de catégorie, fiche d'objet modèle.
- Étiquettes : liste, mode « Ranger », fiches de groupe et d'étiquette.
- Suppressions : confirmation chiffrée, fenêtre de refus « N à régler », bandeau « Annuler » (en bas, et
  rangé dans une fenêtre ouverte).
- Alerte « Vos voyages n'ont pas pu être lus ».

## Décisions du chef de projet (2026-11-01)

1. **Téléphone en paysage ajouté** aux formats vérifiés : « testons mais on ne creusera peut-être pas
   trop, on verra ». On essaie ; la profondeur des corrections se décide au vu des résultats, avec lui.
2. **Texte agrandi vérifié une fois**, à environ 130 %, au téléphone et sur tablette en portrait
   seulement ; même traitement que le paysage (essai, puis décision).
3. **Clavier d'Android vérifié sur les vrais appareils**, sur le téléphone Xiaomi et la tablette en
   paysage : chaque champ ouvert un par un ; le champ saisi et le bouton qui enregistre restent visibles.
4. **Rotation étendue aux saisies en cours et au téléphone** : une fiche ouverte avec un nom à moitié
   tapé, l'étape de l'assistant et une fenêtre de confirmation restent telles quelles après la rotation ;
   vérifié en partie automatiquement, et à la main sur la tablette.
12. **Téléphone en paysage et texte agrandi : un rapport, pas un blocage** (« ok », après relecture de la
    conception). Ces deux essais dressent la liste des défauts sans faire échouer `pnpm verif` ; le chef
    de projet choisit ce qu'on corrige. Ce qu'il laisse de côté est écrit, défaut par défaut, dans cette
    conception (section « Défauts acceptés », à créer alors), jamais caché. Les autres formats du tableau
    restent bloquants. Un défaut qu'il choisit de corriger passe dans un test bloquant ordinaire.

## Choix de l'agent annoncés pendant l'étude

(Numérotation commune avec les décisions du chef de projet : 1–4 et 12 sont à lui, 5–11 sont de l'agent.)

5. La grille réutilise les vérifications existantes (`verifierCommandes`, `verifierBarres` de
   `tests/outils/page.mjs`) ; elle ne les affaiblit pas.
6. « Sur ordinateur » = portable 1366 × 768 et grand écran 1920 × 1080, déjà présents dans `FORMATS`,
   plus une fenêtre rétrécie à la main sous Debian pendant l'essai.
7. Sous Debian, le thème sombre se juge par le réglage de Baluchon (Réglages → Thème), jamais en
   changeant le thème du bureau, qui fait planter la machine.
8. La liste « Écrans et couches à couvrir » ci-dessus, dressée par l'agent à partir du plan et des
   tests existants.

## Choix de l'agent après relecture de la conception

9. **Barres système simulées** : les mesures actuelles (64 px en haut, 48 en bas, 24 de chaque côté)
   restent partout, ordinateur compris (plus strictes que la réalité, donc sans risque). Le téléphone en
   paysage reçoit en plus ses propres mesures de côté (encoche de la caméra et barre des boutons sur un
   bord), relevées sur le Xiaomi.
10. **Langue** : la grille tourne en français seulement. Les textes plus longs d'une autre langue
    relèvent de la traduction de la phase 13.
11. **« Contenu » du plafond de 1544 px** : la partie principale de chaque écran (trois colonnes du
    voyage et de la Bibliothèque, colonne unique ailleurs). Les fenêtres, le menu ouvert et le bandeau
    « Annuler » ne sont pas concernés : leur largeur est déjà bornée et validée.

## Hors périmètre (ne pas construire)

- Nouvelle disposition, nouvel écran, nouvelle fonction (règle de la phase courante).
- Réglage de la taille du texte dans Baluchon.
- Formats au-delà de ceux du tableau (montre, pliable, écran 4K) et texte agrandi au-delà de 130 %.
- Paquets installables et ancienne tablette SM-T550 (phase 15).
- Traduction d'essai réelle (reste de la phase 13, sur sa propre branche).

## Anti-objectifs

- Un test affaibli, sauté ou une tolérance élargie pour obtenir du vert.
- Une correction qui change l'allure d'un écran validé au-delà de ce que le défaut exige ; tout
  changement visible notable est montré au chef de projet avant d'être gardé.
- Un chantier sans fin sur le téléphone en paysage ou le texte agrandi : on rapporte d'abord, il décide.

## Ce qui est laissé au constructeur

- La forme de la grille : un ou plusieurs fichiers de test, la façon d'amener chaque écran dans son état,
  le partage du temps de calcul (la suite d'écrans est déjà longue).
- La simulation du texte agrandi dans les tests (Android agrandit toutes les tailles de texte, même en
  pixels) ; l'essai sur l'appareil fait foi.
- La façon d'automatiser la rotation pendant une saisie (changement de taille de la fenêtre).

## Critères d'acceptation

- [ ] La grille passe : tous les écrans et couches, aux cinq formats bloquants, en clair et en sombre,
      sans défilement de côté, rien sous les barres système, cibles d'au moins 44 × 44 px.
- [ ] Le rapport du téléphone en paysage est montré au chef de projet ; ce qu'il fait corriger passe,
      ce qu'il laisse est écrit dans « Défauts acceptés ».
- [ ] Sur ordinateur, le contenu ne dépasse pas 1544 px de large.
- [ ] Tourner la tablette ou le téléphone conserve la catégorie choisie, les coches, la saisie en
      cours, l'étape de l'assistant et la fenêtre ouverte.
- [ ] Texte agrandi à 130 % essayé au téléphone et sur tablette en portrait ; rapport montré au chef de
      projet ; même suite que le paysage.
- [ ] Essais sur SM-X210 (deux sens), ASUS, Xiaomi et Debian (fenêtre rétrécie, thème sombre par le
      réglage de l'appli) ; clavier vérifié champ par champ sur le Xiaomi et la tablette en paysage.
