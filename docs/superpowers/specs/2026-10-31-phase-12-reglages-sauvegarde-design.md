# Phase 12 : Réglages : sauvegarde, restauration, thème — conception

> Sources : `docs/PRD.md` (US-31, US-32, US-33, US-34, US-37, critère de succès 5), `docs/PLAN.md`
> (décisions architecturales « Sauvegarde », phase 12), `docs/DESIGN.md`. Étude menée avec le chef de
> projet le 2026-10-30 (session « phase12 »), avant le codage de la phase 11 ; deux décisions prises
> alors. Maquette validée par le chef de projet le 2026-10-31 sans changement (« parfait »),
> `docs/maquettes/reglages/`, servie par `pnpm dev` ; essai jetable sur cinq appareils le même jour.

## Intention

Les données de Baluchon ne vivent que sur l'appareil. La sauvegarde protège de la perte d'une tablette
et sert de passage d'un appareil à l'autre (tablette → ordinateur, tablette → téléphone). La
restauration remplace tout, mais ne doit jamais abîmer les données : un mauvais fichier est refusé sans
rien changer, et une copie de l'état actuel est toujours déposée avant le remplacement.

Le thème se choisit enfin à la main ; par défaut, il suit l'appareil.

Réussite : une sauvegarde faite sur la tablette, restaurée sur l'ordinateur, redonne exactement la
même bibliothèque et les mêmes voyages ; on voit d'un coup d'œil à quand remonte la dernière
sauvegarde.

## Objectifs

- Choisir le thème : Appareil, Clair, Sombre (US-37), réglage propre à l'appareil.
- « Sauvegarder » : un fichier complet et daté, déposé dans Téléchargements (US-31, US-34).
- La date de la dernière sauvegarde, sous le bouton.
- « Restaurer » : choisir un fichier, voir ce qu'il contient, confirmer ; copie de l'état actuel
  d'abord, puis remplacement de tout en une seule opération (US-32, US-34).
- Un fichier invalide est refusé avec un message clair, sans rien modifier (US-33).

## Hors périmètre (ne pas construire)

- Bouton « Partager » ou envoi du fichier vers une autre appli (décision 1).
- Sauvegarde automatique, rappel ou notification de sauvegarde (PRD, hors périmètre).
- Import ou export de la bibliothèque seule, fusion de deux sauvegardes (PRD, hors périmètre).
- Synchronisation entre appareils (évolution future).
- Liste des sauvegardes trouvées dans Téléchargements : on passe par le sélecteur de fichiers.
- Effacer d'anciennes sauvegardes ou copies « avant restauration ».

## Anti-objectifs

- Une base à moitié remplacée, quelle que soit la panne.
- Un remplacement sans copie préalable de l'état actuel.
- Le thème, le filtre « Reste à emballer » ou la date de dernière sauvegarde dans le fichier de
  sauvegarde.
- Une restauration qui modifie le fichier restauré ou la bibliothèque de départ installée ailleurs.

## Décisions du chef de projet (2026-10-30)

1. **Pas de bouton « Partager »** après la sauvegarde (« non ») : le fichier reste seulement dans
   Téléchargements, comme le dit le PRD ; on le transporte soi-même (câble, courriel…).
2. **La date de la dernière sauvegarde** s'affiche dans Réglages, sous « Sauvegarder » (« oui »).
   C'est un réglage de l'appareil, hors base et hors sauvegarde, comme le thème.

## Choix de l'agent (annoncés le 2026-10-30 et le 2026-10-31, acceptés : « ok »)

3. **Choisir le fichier à restaurer** : par le sélecteur de fichiers du système. Seul moyen qui marche
   après une réinstallation ou sur un autre appareil (Android ne laisse pas l'appli relire les fichiers
   qu'elle n'a pas écrits elle-même).
4. **La confirmation** montre la date et l'heure de la sauvegarde (« Restaurer la sauvegarde du
   12 octobre 2026, 21 h 15 ? », pour distinguer deux sauvegardes du même jour) et ce qu'elle contient (nombre de voyages,
   nombre d'objets de la bibliothèque), rappelle que tout ce qui est sur l'appareil sera remplacé, et
   qu'une copie de l'état actuel sera d'abord déposée dans Téléchargements. Boutons : « Garder mes
   données » / « Restaurer » (rouge : le remplacement efface).
5. **Versions** : une sauvegarde d'une version plus ancienne du format est acceptée (complétée par
   défaut : par exemple, aucun objet écarté connu) ; une version plus récente est refusée, avec un
   message qui invite à mettre Baluchon à jour.
6. **Copies « avant restauration »** : jamais effacées par Baluchon.
7. **Autorisation refusée** (Android 7 à 9, où écrire dans Téléchargements demande l'accord de
   l'utilisateur) : message clair, aucun fichier écrit. Pour une restauration, la copie préalable
   étant impossible, rien n'est remplacé, et le message le dit (« Rien n'a été remplacé. »).
8. **Après une restauration réussie** : retour à « Mes voyages », avec un message de réussite.
9. **La date de dernière sauvegarde** ne compte que les sauvegardes faites avec « Sauvegarder » : ni
   la copie « avant restauration », ni une restauration ne la changent. Jamais de sauvegarde sur cet
   appareil : la ligne le dit (« Aucune sauvegarde depuis cet appareil »).
10. **Deux sauvegardes dans la même minute** : la seconde ne remplace pas la première ; son nom
    reçoit un numéro (`baluchon-2026-10-31-18h40-2.json`).
11. **Thème forcé sur Android 11 et plus** : l'heure, la batterie et les boutons du bas suivent le
    thème de **l'appli**, pas celui de l'appareil (aujourd'hui, ils suivent l'appareil : en sombre
    forcé sur un appareil clair, ils deviendraient illisibles).
12. **Messages de refus**, chacun suivi de « Rien n'a été modifié. » :
    - fichier illisible ou incomplet : « Ce fichier est abîmé ou incomplet. » ;
    - autre format : « Ce fichier n'est pas une sauvegarde de Baluchon. » ;
    - version future : « Cette sauvegarde vient d'une version plus récente de Baluchon. Mettez
      l'appli à jour pour la restaurer. »
    Titre de ces fenêtres : « Restauration impossible » ; un seul bouton, « Compris ».

## Maquette validée (2026-10-31)

`docs/maquettes/reglages/`, douze états. Le code reprend ses textes (`textes.js`) et sa disposition :
- Thème et Sauvegarde : titres de bloc en Baumans 24 px, puis une carte au cadre de la liste
  Bibliothèque / Étiquettes, de même largeur. Dès 700 px de large, chaque carte se partage en deux
  colonnes égales alignées d'une carte à l'autre : Thème = phrase d'aide | segments ; Sauvegarde =
  « Sauvegarder » (vert, flèche vers le bas) et la date | « Restaurer une sauvegarde… » (bord, horloge
  qui tourne à l'envers) et sa phrase, séparés d'un trait vertical. Au téléphone, tout s'empile.
- Segments Appareil (demi-cercle) · Clair (soleil) · Sombre (lune), composant `.segments` existant.
- Après « Sauvegarder » : bandeau du bas (celui d'« Annuler », sans bouton, coche verte, 10 s) qui
  nomme le fichier en entier ; la date reçoit un bref fond vert (sauf mouvements réduits).
- Confirmation « Garder mes données » / « Restaurer » (rouge, horloge) ; refus, accès refusé
  (« Accès aux fichiers refusé », comment autoriser dans les Paramètres d'Android) et panne
  (« La restauration n'a pas abouti ») dans la même fenêtre, bouton vert « Compris ».
- Après une restauration : Mes voyages et le bandeau « Sauvegarde du … restaurée. »

## Comportement

### Écran Réglages

Après les lignes Bibliothèque et Étiquettes (inchangées), deux blocs :

- **Thème** : trois choix exclusifs, Appareil (par défaut), Clair, Sombre. Le changement est immédiat
  et retenu sur l'appareil. Au lancement, le thème retenu s'applique avant le premier affichage, sans
  éclair de l'autre thème.
- **Sauvegarde** :
  - « Sauvegarder » : dépose le fichier, puis dit où (« Sauvegarde déposée dans Téléchargements :
    baluchon-2026-10-31-18h40.json ») ; la ligne « Dernière sauvegarde : 31 octobre 2026, 18 h 40 »
    se met à jour.
  - « Restaurer une sauvegarde… » : ouvre le sélecteur de fichiers. Fichier refusé : message
    (décision 12), on reste sur Réglages. Fichier valide : la confirmation (décision 4).

La disposition exacte (téléphone, tablette, ordinateur ; clair et sombre) se décide sur la maquette.

### Restaurer

1. Lire et valider **tout** le fichier, sans toucher à la base.
2. Confirmation. « Garder mes données » : rien ne se passe.
3. « Restaurer » : écrire la copie `baluchon-avant-restauration-AAAA-MM-JJ-HHhMM.json` de l'état
   actuel dans Téléchargements. Échec : message, rien n'est remplacé.
4. Remplacer toute la bibliothèque et tous les voyages en une seule opération. Échec : la base reste
   telle qu'avant, message de panne.
5. Retour à « Mes voyages », message de réussite. Un bandeau « Annuler » d'une suppression antérieure
   ne survit pas à la restauration.

Restaurer la copie « avant restauration » ramène l'état d'avant (critère du PLAN).

## Données

- **Fichier** (PLAN, « Sauvegarde ») : JSON, `format: "baluchon-sauvegarde"`, `version: 1`, date de
  création, puis toute la bibliothèque (groupes d'étiquettes, étiquettes, catégories et objets modèles
  avec leurs étiquettes) et tous les voyages (étiquettes, catégories, objets avec coches, quantités
  manuelles, marques « à acheter », achats, pièces à sortir, et la mémoire des objets écartés de la
  phase 11), identifiants et `modifie_le` compris. La langue de la bibliothèque de départ et le fait
  qu'elle soit installée voyagent aussi (sinon l'appareil restauré la réinstallerait).
- **Hors fichier** : thème, filtres « Reste à emballer », date de dernière sauvegarde (réglages de
  l'appareil, `src/stockage/preferences.js`).
- **Aucune migration** : la phase n'ajoute rien au schéma.
- Le remplacement efface puis réécrit toutes les tables de la bibliothèque et des voyages dans une
  seule transaction ; le numéro de version du schéma n'est pas touché.

## Règles à placer dans le modèle (pur, une seule définition chacune)

- Construire le contenu d'une sauvegarde à partir de ce que lit le stockage (format, version, date).
- Le nom du fichier, à partir d'une date (et d'un numéro en cas de doublon) — sauvegarde et copie
  « avant restauration ».
- Valider un fichier : JSON lisible, format, version (passée acceptée, future refusée), présence et
  type de chaque champ, identifiants uniques, références internes cohérentes (un objet pointe vers une
  catégorie du même voyage ou de la bibliothèque, etc.). Rend soit le contenu prêt à restaurer, soit
  la raison du refus (décision 12).
- Le résumé de la confirmation (date, nombre de voyages, nombre d'objets).
- Les écrans montrent et transmettent ; le stockage lit tout, écrit un fichier, remplace tout.

## Risques techniques : levés par un essai jetable (2026-10-31)

Essai retiré ensuite, jamais commité. Appareils : ordinateur (Debian), tablette SM-X210 (Android 16),
Xiaomi (HyperOS 2, Android 15), ASUS et ancienne tablette SM-T550 (Android 7.1). Résultat : écrire
puis rouvrir le fichier marche partout, avec la recette suivante.

- **Ordinateur** : écriture dans le dossier Téléchargements de l'utilisateur, donné par Tauri ; le
  sélecteur de fichiers de la page le retrouve.
- **Android 10 et plus** : écriture par le magasin de fichiers du système (`MediaStore.Downloads`),
  sans autorisation, par le passage déjà ouvert entre la page et l'activité (`window.BaluchonAndroid`,
  `src-tauri/android/java/.../MainActivity.kt`). Le sélecteur de la page (Android ou Xiaomi) montre
  le fichier sous « Téléchargements ».
- **Android 7 à 9** : écriture directe dans le dossier, après l'autorisation d'écrire demandée à la
  première sauvegarde (décision 7). **Indispensable** : déclarer ensuite le fichier à Android comme
  téléchargement terminé (`DownloadManager.addCompletedDownload`, sans notification), sinon le
  raccourci « Téléchargements » du sélecteur ne le montre pas (ASUS : retrouvable en fouillant ;
  SM-T550 : introuvable). Le manifeste doit porter `WRITE_EXTERNAL_STORAGE` (jusqu'à Android 9) et
  `DOWNLOAD_WITHOUT_NOTIFICATION` (sans elle : `SecurityException`) : retouche à ajouter à
  `scripts/projet-android.mjs`, le manifeste étant régénéré. Dans l'essai, il fallait réappuyer après
  avoir accordé l'autorisation ; la vraie version enchaîne d'elle-même après l'accord.
- **Barres système** (décision 11) : changer leurs couleurs selon le thème de l'appli marche à partir
  d'Android 11 (SM-X210, Xiaomi). Sous Android 11, les barres restent noires à icônes claires : n'y
  jamais toucher (sinon l'heure disparaît, vu sur l'ASUS et la SM-T550).
- **Hors phase 12, découvert pendant l'essai** : la SM-T550 n'accepte que les applis 32 bits
  (`pnpm android:essai` ne construit qu'en 64 bits ; l'essai a été construit pour les deux), et
  Baluchon n'y ouvre pas sa base au premier lancement (« Vos voyages n'ont pas pu être lus »).

## Laissé au constructeur

- Le découpage de l'écran Réglages (aujourd'hui 37 lignes) et du stockage Rust.
- La forme exacte du fichier, pourvu qu'elle respecte « Données » et que l'aller-retour
  sauvegarder → restaurer → sauvegarder donne un contenu identique (test automatique).
- La variante navigateur du stockage (tests d'écran) : un « Téléchargements » simulé.

## Critères d'acceptation (PLAN, phase 12, complétés)

- Sauvegarde tablette → restauration ordinateur : bibliothèque et voyages identiques, coches,
  quantités manuelles, marques et objets écartés compris (critère de succès 5).
- La copie « avant restauration » existe avant tout remplacement ; la restaurer ramène l'état d'avant.
- Fichier tronqué, d'un autre format ou d'une version future : refusé, base inchangée.
- Erreur en pleine restauration : base dans son état d'avant.
- Le thème choisi persiste sur l'appareil, s'applique dès le lancement, et ne voyage pas dans la
  sauvegarde ; sur Android 11 et plus, les barres système restent lisibles dans les trois choix.
- La date de la dernière sauvegarde s'affiche sous « Sauvegarder » et ne voyage pas.

## Documents à mettre à jour (avec la conception)

- `docs/PRD.md`, « Écrans et gestes », puces sauvegarde : la date de la dernière sauvegarde dans
  Réglages ; pas d'envoi direct vers une autre appli.
- `docs/PLAN.md` :
  - décisions architecturales : la date de dernière sauvegarde rejoint le thème et le filtre parmi
    les réglages de l'appareil ; une sauvegarde d'une version plus ancienne est acceptée ;
  - phase 12 : livrable (date de dernière sauvegarde) et critères ci-dessus ; lien vers cette
    conception.
- `docs/DESIGN.md` : journal, à la validation de la maquette.
