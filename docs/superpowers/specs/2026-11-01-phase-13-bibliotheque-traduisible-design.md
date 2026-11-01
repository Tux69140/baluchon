# Phase 13 : Bibliothèque de départ complète et traduisible — conception

> Sources : `docs/PRD.md` (US-1, US-9, US-38, US-39, « Calcul des quantités », « Langue »),
> `docs/PLAN.md` (phase 13), `docs/DESIGN.md`. Étude menée avec le chef de projet du 2026-10-30 au
> 2026-11-01 (session « phase13 »), avant le codage des phases 11 et 12, sans rien écrire dans le
> dépôt. Le contenu de la bibliothèque a été relu en cinq tours sur une page en ligne,
> https://baluchon.biovibralyon.fr/ (5e version, référence du contenu). Une copie des données de
> cette page est dans le dossier temporaire de la session (`scratchpad/relecture/bibliotheque-v5.json`) ;
> la page en ligne fait foi. Conception validée par le chef de projet le 2026-11-01 (« je valide la
> conception »), choix 16 à 22 compris. Maquette validée le 2026-11-01 sans changement (« validée »),
> `docs/maquettes/bibliotheque-depart/`, servie par `pnpm dev`.

## Intention

Aujourd'hui, Baluchon s'installe avec une mini-bibliothèque d'essai : il faut tout saisir avant le
premier vrai voyage. La phase 13 livre une bibliothèque de départ complète, de la même étendue que
celle de BagPacker mais rédigée à neuf, avec laquelle on crée un voyage sans rien saisir (US-1).

La relecture du contenu a fait apparaître deux besoins que le modèle actuel ne sait pas exprimer :

- **qui emporte quoi** : un voyage à « 3 voyageurs » ne dit pas s'il y a des enfants, alors que la
  culotte, le rasoir, le carnet de santé ou l'autorisation de sortie du territoire en dépendent ;
- **les objets qui se comptent par semaine** : lessive, mouchoirs.

L'appli devient aussi traduisible : un contributeur traduit l'interface et la bibliothèque par un seul
fichier de langue, sans toucher au code (US-38) ; l'appli suit la langue de l'appareil (US-39).

Réussite : sur un appareil neuf, on crée « Week-end à la mer, 2 femmes et 1 enfant, Plage, Train,
Location » et la liste proposée est juste sans retouche ; un fichier de langue d'essai ajouté seul
fait passer toute l'appli et la bibliothèque dans cette langue.

## Objectifs

1. **Bibliothèque de départ complète** : 4 groupes d'étiquettes, 16 catégories, 171 objets, 47 notes,
   telle que validée sur la page de relecture (5e version).
2. **Composition du voyage** : trois compteurs Femmes, Hommes, Enfants remplacent « Voyageurs ».
3. **« Pour qui »** sur chaque objet modèle : tous, adultes, femmes, hommes ou enfants, par personne
   ou partagé.
4. **Règle de quantité « par semaine »**, à côté de « une fois », « par jour » et « par nuit ».
5. **Traduction** : structure de la bibliothèque séparée de ses textes ; tout fichier de langue chargé
   seul ; langue de l'appareil ; pluriels, tri et dates selon la langue ; contrôle des fichiers de
   langue dans `pnpm verif` ; guide pour les contributeurs.
6. **« À propos »**, dernière entrée du menu.

## Hors périmètre (ne pas construire)

- Une traduction livrée dans une autre langue (décision 9) : seulement le mécanisme, une traduction
  d'essai dans les tests et le guide.
- Un réglage de langue dans l'appli (décision 7).
- Les langues écrites de droite à gauche.
- Les astuces de BagPacker (94) : non reprises.
- Une combinaison « ET » entre étiquettes : elles restent en « OU » (décision de cadrage n° 8).
- Une règle « par semaine complète » (décision 6) ; un compteur « Adultes » séparé (décision 2).
- Les voyageurs nommés, la répartition de qui porte quoi (PRD, hors périmètre).
- Un lien vers GitHub ou une mention de BagPacker dans l'appli (décision 10).
- Les messages d'erreur du code Rust : jamais affichés (console seulement), ils restent hors
  traduction.

## Anti-objectifs

- Un texte, une image ou un code de BagPacker dans Baluchon.
- Une bibliothèque déjà installée qui change quand la langue de l'appareil change.
- Un trou à l'écran (clé brute, accolade, texte vide) avec une traduction incomplète.
- Une bibliothèque installée à moitié traduite : elle l'est entièrement, sinon en français.
- Les quantités d'un voyage existant qui changent du seul fait de la mise à jour.
- Un objet proposé pour un groupe absent du voyage (le rasoir pour un voyage sans homme).

## Décisions du chef de projet (étude, 2026-10-30 au 2026-11-01)

1. **Contenu de la bibliothèque** : celui de la page de relecture, 5e version, après quatre tours de
   remarques. Groupes d'étiquettes :
   - **Activités** : Randonnée, Itinérance sac au dos, Plage, Ville, Sports d'hiver, Sport, Festival,
     Soirées, Détente, Thalasso ou thermalisme, Travail, Photo et vidéo ;
   - **Destination** : Chaud, Froid, Pluie, À l'étranger (« Tempéré » écarté) ;
   - **Transport** : Avion, Train ou car, Voiture ;
   - **Hébergement** : Hôtel, Location ou gîte, Chez l'habitant, Camping.

   Choix assumés : étiquettes larges (Travail, Photo et vidéo), quantités de sous-vêtements (culottes
   5, slips 4, enfants 7), veste de pluie et poncho tous deux proposés.
2. **Composition du voyage** (« solution B ») : trois compteurs Femmes, Hommes, Enfants dans
   « Nouveau voyage », au moins une personne en tout. Pas de quatrième compteur « Adultes » (« non »).
3. **« Pour qui »** : chaque objet modèle dit pour qui il est (tous, adultes, femmes, hommes,
   enfants), combiné avec « par personne » ou « partagé ». Un objet dont le groupe est vide dans le
   voyage n'est pas proposé. Les enfants comptent dans « tous ».
4. **Règle « par semaine »**, comptée par semaine commencée : 1 à 7 jours = 1 semaine, 8 à 14 jours =
   2 semaines. Valeurs entières de 1 à 999, plafond possible comme par jour et par nuit.
5. **Lessive** : « 5 par semaine », sans plafond ; pour un voyage court, on la décoche à l'aperçu.
6. Pas de règle « par semaine complète ».
7. **Langue de l'interface** : celle de l'appareil, relue à chaque démarrage, sans réglage dans
   l'appli. Une variante régionale (fr-CA, en-GB) prend la langue de base. Sans traduction : français.
8. **Langue de la bibliothèque** : celle du premier lancement, seulement si sa traduction de la
   bibliothèque est complète ; sinon, français. Elle ne change plus ensuite (PRD, « Langue »).
9. **Pas de traduction anglaise livrée** (« non »).
10. **« À propos »** : mascotte, nom et version ; licence GPL ; « hors ligne, sans traceur » ;
    crédits (pictos Phosphor, licence MIT ; polices, licence OFL) ; une ligne « Traduction : … »
    remplie par chaque traducteur. Deux liens vers le site du chef de projet : « Découvrir Baluchon »
    (page de présentation) et « Nouvelles versions » (page de téléchargement, sur le modèle de
    https://lumosphere.org/telecharger, qui renvoie au code source comme l'exige la GPL). Pas de
    lien GitHub, pas de mention de BagPacker.
11. **Validation du contenu** : faite sur la page de relecture en ligne.

## Choix de l'agent (annoncés pendant l'étude, sans objection)

12. **Composition proposée** dans « Nouveau voyage » : 0 femme, 0 homme, 0 enfant après l'installation
    (décision du chef de projet, 2026-11-01, après essai : « 1 femme et 1 homme » imposait un couple
    par défaut), puis la composition du dernier voyage créé. « Refaire ce voyage » reprend celle du
    voyage d'origine (phase 11). Un réglage de la composition proposée est une idée du chef de projet
    pour plus tard, hors de cette phase.
13. **Affichage** : le total sur les cartes de « Mes voyages » (« 3 voyageurs ») ; le détail dans
    l'en-tête du voyage et dans l'aperçu (« 2 femmes, 1 enfant », les groupes vides omis).
14. **Mise en page des compteurs**, de « Pour qui » et de « À propos » : fixée par une maquette
    (`docs/maquettes/bibliotheque-depart/`), faite après la validation de cette conception et
    validée avant le plan, comme pour la phase 12. Elle fixe aussi les résumés de règle, l'exemple
    chiffré de la fiche d'objet modèle et la ligne « Changements » d'une composition modifiée.
15. **Semaine qui commence le lundi** dans le calendrier, quelle que soit la langue.

## Choix de l'agent (dans cette conception, validés avec elle le 2026-11-01)

16. **Bornes** : chaque compteur va de 0 à 20 ; le total de 1 à 20 (borne actuelle du PRD).
17. **Anciens voyages** (conversion sommaire, faite une fois à la mise à jour) : N voyageurs
    deviennent N adultes, répartis moitié femmes, moitié hommes (une femme de plus si N est impair),
    sans enfant. Les objets modèles et les objets des voyages existants deviennent « tous », par
    personne ou partagés comme avant. Ainsi aucune quantité ne change. Le chef de projet effacera les
    données de l'appli sur ses appareils pour voir la nouvelle bibliothèque (rien de réel avant la
    phase 15).
18. **Mémoire de la dernière composition** : retenue sur l'appareil (comme le thème), hors base et
    hors sauvegarde, mise à jour à chaque voyage créé.
19. **Format de sauvegarde, version 2** : la composition du voyage, « Pour qui » et la règle « par
    semaine » y entrent. Une sauvegarde de version 1 reste acceptée et convertie comme au choix 17.
20. **Guide des contributeurs** : `docs/TRADUIRE.md`, en français : copier `fr.json`, traduire,
    vérifier avec `pnpm verif`, remplir la ligne « Traduction ».
21. **Les deux pages web** (présentation et téléchargement, avec le lien vers le code source) ne
    font pas partie de cette phase : elles relèvent de la publication (phase 15). L'appli n'a besoin
    que de leurs adresses, qui peuvent ne pas encore répondre.
22. **Essai de la langue sur les appareils** : je change moi-même la langue de la SM-X210 et de
    l'ASUS, puis je la remets comme avant (comme le thème) ; sous Debian, l'appli est lancée avec
    une autre langue par une variable d'environnement, sans jamais toucher au réglage du bureau.

## Comportement

### Composition et « Pour qui »

Le voyage porte trois nombres : femmes (F), hommes (H), enfants (E). Chaque groupe compte :

| Pour qui | Personnes comptées |
|---|---|
| tous | F + H + E |
| adultes | F + H |
| femmes | F |
| hommes | H |
| enfants | E |

Un objet est proposé dans un voyage s'il l'aurait été jusqu'ici (étiquettes en « OU », ou toujours
inclus, dans une catégorie elle-même incluse) **et** si son groupe compte au moins une personne.

### Calcul des quantités (une seule définition : `src/modele/quantites.js`)

1. Base : valeur × 1 (une fois), × jours, × nuits ou × semaines commencées (`⌈jours ÷ 7⌉`).
2. Plafond, s'il existe : appliqué à la base (par personne, comme aujourd'hui).
3. Par personne : × nombre de personnes du groupe. Partagé : tel quel.

Exemple (critère 2 du PRD, inchangé) : du 10 au 13, 1 femme et 1 homme, « Repas : 2 par jour, pour
tous, par personne » → 16 ; un objet partagé de quantité fixe 1 → 1. Avec 1 enfant de plus, « Carnet
de santé : 1, enfants, par personne » → 1, et rien sans enfant.

### Où la composition apparaît

- **Nouveau voyage, étape Informations** : les trois compteurs remplacent « Voyageurs », au même
  endroit (avant le calendrier). Erreur si le total vaut 0 ou dépasse 20.
- **Assistant** : six étapes avec les quatre groupes (Informations, Activités, Destination,
  Transport, Hébergement, Aperçu).
- **Cartes de « Mes voyages »** : total. **En-tête du voyage et aperçu** : détail.
- **Modifier le voyage** (phase 10) : changer la composition fait entrer ou sortir des objets ;
  l'étape « Changements » les présente comme pour un changement d'étiquettes, et la ligne de résumé
  dit ce qui a changé (« 1 enfant de plus »).
- **Refaire ce voyage** (phase 11) : composition reprise.
- **Fiche d'un objet modèle** (Bibliothèque) : « Pour qui » et « par personne / partagé » à la place
  de l'actuel choix « par personne » ; l'exemple chiffré sous la règle tient compte du groupe ; le
  résumé de la règle le nomme (« 1 par enfant », « 5 par semaine, partagé »). Libellés exacts : par la
  maquette.
- **Fiche d'un objet du voyage** : la règle s'y affiche avec le même résumé.

### Bibliothèque de départ

- **Structure et textes séparés** : la structure (groupes, catégories, objets, clés, pictos,
  couleurs, règles, « pour qui », « à acheter », étiquettes) vit dans un fichier neutre du modèle,
  découpé par catégorie ; les fichiers de langue ne portent que les noms et les notes, rangés par clé.
  Aujourd'hui tout est dans `src/i18n/fr.json` (`bibliothequeDeDepart`), lu par
  `construireBibliotheque` (`src/modele/bibliotheque.js`).
- **Correspondance avec la page de relecture** : `q` = règle (`f` une fois, `j` par jour, `n` par
  nuit, `s` par semaine) et valeur, `/plafond` facultatif ; `p` = pour qui, `~` devant = partagé ;
  `e` = étiquettes ; `a` = à acheter (consommable) ; `note` = note ; une catégorie peut avoir ses
  étiquettes. Les pictos des catégories sont tous dans le catalogue actuel de 80 pictos.
- **La mini-bibliothèque** devient un jeu d'essai des tests (14 tests d'écran et
  `tests/contrat.test.js` s'en servent). La bibliothèque complète a ses propres tests : chaque
  étiquette citée existe, chaque picto est au catalogue, chaque couleur au nuancier, aucun doublon de
  clé ni de nom dans une catégorie, chaque nom et chaque note présents en français.
- Installation inchangée : une fois, au premier lancement, puis elle appartient à l'utilisateur. La
  langue installée est déjà retenue en base (`meta.langue_bibliotheque`).

### Langue et traduction

- Tout fichier `src/i18n/<langue>.json` est chargé sans modifier le code. La langue est choisie à
  chaque démarrage d'après les langues préférées de l'appareil, dans l'ordre : langue exacte, puis
  langue de base, puis français. Aujourd'hui elle est fixée en dur (`src/main.js`, `LANGUE = 'fr'`).
  À vérifier sur la SM-X210, sous Android 7 (ASUS) et sous Debian.
- Clé absente d'une traduction : lue en français (déjà le cas, `src/i18n/traduction.js`).
- **Pluriels** : toutes les formes de la langue (`Intl.PluralRules` : zero, one, two, few, many,
  other), au lieu de « one / other » (`src/ecrans/format.js`, `pluriel`).
- **Tri par nom** : une seule définition, selon la langue. Aujourd'hui : sans langue dans `sac.js`,
  `voyage.js`, `changements.js`, `inclusion.js` ; `'fr'` en dur dans `courses.js` ; avec la langue
  dans `bibliotheque.js` et `suppressions.js`.
- **Dates** : écrites selon la langue de l'interface ; semaine commençant le lundi.
- **Contrôle dans `pnpm verif`** : pour chaque fichier de langue, aucune clé inconnue du français,
  les mêmes `{valeurs}` que le français, les formes de pluriel attendues par la langue, et une
  bibliothèque soit complète soit absente.
- **Traduction d'essai** : un fichier de langue factice dans les tests seulement, pour prouver
  l'interface et la bibliothèque traduites (critère 3).

### « À propos »

Dernière entrée du menu, après Réglages. Contenu : décision 10. Les liens s'ouvrent dans le
navigateur du système : il faut un petit ajout côté ordinateur et dans le pont Android
(`MainActivity.kt`). Adresses (accord du chef de projet, 2026-11-01) : « Découvrir Baluchon » →
`https://baluchon.biovibralyon.fr/`, « Nouvelles versions » → `https://baluchon.biovibralyon.fr/telecharger`. La version affichée est celle de l'appli.

## Maquette validée (2026-11-01)

`docs/maquettes/bibliotheque-depart/`, seize états, en thème clair. Le code reprend ses textes et sa
disposition :
- **Compteurs** : légende « Voyageurs » avec le total au bout (« 2 en tout ») ; liste encadrée, une
  ligne par groupe (nom à gauche, − nombre + à droite) ; côte à côte, nom au-dessus, dès que le champ
  a 540 px. Ligne de message réservée sous la liste : « Ajoutez au moins une personne. » (rouge, picto, montré seulement après un essai d'aller plus loin
  avec 0 personne, comme les autres erreurs de l'étape)
  ou, à 20, « Un voyage compte au plus 20 voyageurs. » (gris, ⓘ, les + grisés).
- **Résumés de règle**, mêmes textes dans la Bibliothèque et sous chaque objet de l'aperçu :
  « valeur + rythme, au plus N, pour qui » : « 1 par enfant », « 1 par adulte », « 1 par personne »,
  « 1 par semaine et par personne », « 1 par jour, au plus 5, par femme » ; partagé : « 5 par semaine,
  partagé », « 1, partagé », « 4, partagé entre les adultes », « 1, partagé entre les enfants ». Le
  « 1 en tout » actuel devient « 1, partagé ».
- **Fiche d'un objet modèle** : quantité Fixe | Par jour | Par nuit | Par semaine (le mot « Fixe » est
  gardé), compteur « Chaque semaine » ; sous le titre « Pour qui » : Tous | Adultes | Femmes | Hommes |
  Enfants, puis « Par … » (nommé d'après le groupe : Par personne, Par femme…) | « Partagé » ; plafond
  « au plus, par femme » ; encadré : résumé en gras, puis l'exemple (« Pour 10 jours (2 semaines) et
  9 nuits, avec 1 femme, 1 homme et 1 enfant : 10. »), et pour un groupe restreint « Sans enfant dans
  le voyage, il n'est pas proposé. »
- **Aperçu, en-tête du voyage, étape « Changements »** : composition détaillée dans la ligne de résumé
  (« 2 femmes, 1 enfant ») ; total sur les cartes (« 3 voyageurs ») ; dans « Changements », puce
  « 1 enfant de plus » (au lieu de « 3 voyageurs au lieu de 2 »), objets entrants « +1 » marqués
  « nouveau · pour les enfants ».
- **À propos** : dernière entrée du menu, picto ⓘ ; en tête la mascotte, « Baluchon » en Baumans,
  « Version 0.1.0 » et « Listes de bagages, libre et hors ligne. » ; « Sur le web » : deux lignes de
  lien (adresse en clair, picto de sortie) ; « Bon à savoir » : Appli libre (GPL-3.0-or-later), Hors
  ligne sans traceur, Traduction (« Texte original en français. »), Crédits (Phosphor Icons, MIT ;
  Baumans et Source Sans 3, SIL Open Font License). Deux colonnes dès 900 px.
- Au passage : le texte « Proposé dès que la catégorie « … » l'est. » de `fr.json` reçoit des espaces
  insécables (il coupait la ligne avant le guillemet fermant).

## Points techniques

- **Migration 008** : SQLite ne sait pas modifier une contrainte ; il faut reconstruire
  `objet_modele` et `objet_du_voyage` (règle `par_semaine` permise, colonne « pour qui ») et `voyage`
  (femmes, hommes, enfants à la place de `voyageurs`, total de 1 à 20), avec la conversion du
  choix 17, en une transaction.
- `voyageurs` apparaît dans 21 fichiers ; « par personne » est aujourd'hui un booléen
  (`par_personne`, `parPersonne`) : il devient « pour qui » + « partagé ».
- Règles et validation des modèles : `src/modele/modeles.js` ; exemple chiffré :
  `PERIODE_EXEMPLE`.
- Restauration et sauvegarde : `src/modele/sauvegarde.js` (`VERSION_SAUVEGARDE` passe à 2) et le
  remplacement côté Rust.

## Critères d'acceptation

- [ ] Au premier lancement, un voyage se crée sans aucune saisie dans la bibliothèque (US-1).
- [ ] Aucun texte, aucune image ni aucun code de BagPacker n'est repris.
- [ ] La bibliothèque installée contient exactement le contenu de la 5e relecture (16 catégories,
      171 objets, 47 notes).
- [ ] Pour 2 femmes et 1 enfant, les objets « hommes » ne sont pas proposés, les objets « enfants »
      le sont, et les quantités suivent le tableau des groupes.
- [ ] Pour 10 jours, « 5 par semaine » donne 10 ; pour 7 jours, 5.
- [ ] Les voyages créés avant la mise à jour gardent toutes leurs quantités.
- [ ] Ajouter un enfant à un voyage par « Modifier le voyage » propose les objets « enfants » dans
      « Changements ».
- [ ] Une sauvegarde de la phase 12 se restaure.
- [ ] Avec une traduction d'essai ajoutée par le seul fichier de langue, l'interface et la
      bibliothèque s'affichent dans cette langue sur un appareil réglé ainsi.
- [ ] Sur un appareil dans une langue non traduite, tout s'affiche en français.
- [ ] Changer la langue de l'appareil après le premier lancement ne modifie pas la bibliothèque déjà
      installée.
- [ ] « À propos » s'ouvre depuis le menu, et ses deux liens ouvrent le navigateur, sur ordinateur
      comme sur Android.
- [ ] `pnpm verif` refuse un fichier de langue avec une clé inconnue ou une `{valeur}` manquante.

## Laissé au constructeur

- Le nom des clés de la bibliothèque et le découpage exact des fichiers de structure.
- La forme du contrôle des fichiers de langue et sa place dans `pnpm verif`.
- Le moyen d'ouvrir un lien sur ordinateur (greffon Tauri ou commande).
- L'ordre des tâches, à fixer dans le plan.
