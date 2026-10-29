# Phase 10 : Quand les plans changent — conception

> Sources : `docs/PRD.md` (US-25, US-26, US-27), `docs/PLAN.md` (phase 10, dans sa version retouchée
> par le chef de projet le 2026-10-25, d9baebf), `docs/DESIGN.md`. Décisions du chef de projet du
> 2026-10-29 (session « phase 10 »). Maquette validée le 2026-10-29 sans changement :
> `docs/maquettes/plans-changent/` (servie par `pnpm dev`, puis `http://localhost:1430/docs/maquettes/plans-changent/`).
> Elle ne montre pas le cas « rien ne change » : la règle reste d'enregistrer directement, sans récapitulatif.

## Intention

Un voyage préparé change : un jour de plus, un voyageur de plus, de la pluie annoncée. Cas réel du
chef de projet : la durée avait changé ; il aurait voulu que l'appli lui **propose les nouvelles
quantités calculées et les ajouts ou retraits à faire pour ce qui était déjà dans le sac**. La liste
doit redevenir juste sans retaper le voyage, et sans jamais perdre de vue ce qui est physiquement
dans le sac : rien ne doit se retrouver dans le sac sans que l'appli le sache, ni quitter la liste
alors que la pièce est encore dans le sac.

Réussite : changer la durée, les voyageurs ou les étiquettes d'un voyage se fait en quelques appuis,
chaque changement est vu et accepté avant d'être appliqué, et le sac reste fidèle à l'écran.

## Objectifs

- Modifier un voyage existant : nom, destination, dates, voyageurs, étiquettes (US-25, US-26).
- Un **récapitulatif des changements**, accepté ou refusé **ligne par ligne**, avant tout effet.
- Les **pièces à sortir du sac** : une nouvelle notion, confirmée tout de suite ou plus tard, très
  visible tant qu'elle n'est pas confirmée.
- Retirer une étiquette ne retire rien d'office (US-27), mais propose de retirer les objets qu'elle
  avait apportés.

## Hors périmètre (ne pas construire)

- « Refaire ce voyage » et supprimer un voyage (phase 11), même s'ils réutiliseront l'assistant.
- Sauvegarde et restauration (phase 12). Le format de sauvegarde n'existe pas encore : rien à adapter.
- Toucher la bibliothèque : modifier un voyage ne la change jamais.

## Anti-objectifs

- Une quantité, un ajout ou un retrait appliqué sans que l'utilisateur l'ait vu dans le récapitulatif.
- Un compte « dans le sac » baissé d'office alors que la pièce est encore dans le sac.
- Un objet emballé qui disparaît de la liste avant que sa sortie soit confirmée.
- Un voyage annoncé « Sac bouclé ! », ou une catégorie repliée « Bouclé ! », alors qu'il reste une
  pièce à sortir.
- L'état « à sortir » porté par la seule couleur (DESIGN.md : un mot et une icône, toujours).

## Décisions du chef de projet (2026-10-29)

1. **La version du PLAN du 2026-10-25 fait foi** (« oui ») : un message demande que faire des quantités
   fixées à la main ; retirer une étiquette demande s'il faut retirer ou non les objets liés. Le PRD
   (US-25, US-27, « n'est plus jamais recalculée automatiquement ») et les critères d'acceptation de la
   phase 10 sont à mettre à jour en conséquence (voir « Documents à mettre à jour »).
2. **Récapitulatif avant d'appliquer**, ancienne → nouvelle quantité, avec ce que cela veut dire pour
   le sac (« encore 4 à mettre », « 1 à sortir du sac »). Les quantités fixées à la main y figurent,
   avec le choix de les garder ou de les recalculer.
3. Chaque changement s'**accepte ou se refuse objet par objet** (« objet par objet »).
4. **« Modifier le voyage »**, bouton de l'en-tête du voyage, rouvre l'assistant de création prérempli ;
   sa dernière étape est le récapitulatif (« ok »).
5. **Pièces à sortir confirmées par l'utilisateur, tout de suite ou plus tard** : une baisse acceptée
   sous le nombre déjà dans le sac ne baisse pas le compte du sac d'office (« il serait bien que
   l'utilisateur valide, maintenant ou plus tard, qu'il l'a retiré de son sac »).
6. Tant que la sortie n'est pas confirmée : pastille « N à sortir du sac » **et un « ! » bien visible**
   dans la liste (« il faudrait que le badge soit visible dans la liste des objets du voyage, comme via
   un ! ») ; l'objet reste affiché avec le filtre « Reste à emballer » (« très bien »).
7. Règle acceptée (« oui, cool ») : **un objet avec des pièces à sortir ne compte pas comme emballé** —
   « ! » à la place de la coche, sa catégorie n'est ni « Bouclé ! » ni repliée et porte elle aussi le
   « ! » (tuiles du grand écran comprises), pas de « Sac bouclé ! » tant qu'il en reste un.
8. Un objet **retiré** (étiquette retirée) alors qu'il a des pièces dans le sac **reste affiché, barré**,
   avec le « ! » et « N à sortir du sac » ; il quitte la liste une fois la sortie confirmée. Sans pièce
   dans le sac, il part tout de suite (« oui »).
9. **Les gestes de la phase 8 s'alignent** (« oui ») : baisser à la main la quantité sous le nombre
   déjà dans le sac, et « Retirer du voyage » d'un objet emballé, proposent de confirmer la sortie tout
   de suite ou « Plus tard ». C'est un changement accepté d'un comportement validé en phase 8.

## Choix de l'agent (présentés au chef de projet le 2026-10-29, sans objection)

- Une quantité fixée à la main est **gardée par défaut** dans le récapitulatif ; « Recalculer » est un
  choix explicite.
- Un objet dont la quantité calculée passe de 0 à plus de 0 avec les nouvelles dates (un « par nuit »
  quand un aller-retour devient un séjour) est proposé comme ajout ; l'inverse (tombé à 0) comme retrait.
- Si rien ne change (mêmes dates, voyageurs et étiquettes, ou seulement le nom et la destination),
  pas de récapitulatif : on enregistre directement.
- Un objet « à acheter » dont la quantité monte revient dans Courses pour ce qui manque (règle de la
  phase 9, déjà dans `src/modele/courses.js`).

## Comportement

### L'accès

- Bouton **« Modifier le voyage »** dans l'en-tête de l'écran du voyage (bloc du voyage en grand
  écran). Il ouvre l'assistant de création, **prérempli** : nom, destination, voyageurs, dates,
  étiquettes du voyage déjà choisies. Même fenêtre, mêmes étapes, même navigation que « Nouveau
  voyage » (modale sur tablette et ordinateur, plein écran au téléphone, retour système compris).
- Le titre de l'assistant et le bouton final disent qu'on modifie (« Modifier le voyage »,
  « Appliquer les changements ») ; fermer avec des changements non appliqués demande d'abord
  « Abandonner ces changements ? », comme l'abandon d'un nouveau voyage.
- Les étiquettes du voyage sont présélectionnées d'après l'étiquette de la bibliothèque d'où elles
  viennent. Une étiquette du voyage dont l'origine n'existe plus dans la bibliothèque ne peut pas
  être proposée dans les étapes : elle reste dans le voyage telle quelle.

### Le récapitulatif (dernière étape, à la place de l'aperçu)

Il compare le voyage tel qu'il est à ce que donneraient les nouvelles informations, et liste, par
catégorie, chaque objet qui change. Chaque ligne a sa case, cochée ou non selon le défaut ci-dessous ;
on la touche pour accepter ou refuser ce changement-là. Un compteur dit combien de changements seront
appliqués.

| Cas | Ce que dit la ligne | Défaut |
|---|---|---|
| Quantité calculée qui change | « Repas : 16 → 24 », puis « encore 8 à mettre » ou « 2 à sortir du sac » selon le sac | accepté |
| Quantité fixée à la main dont le calcul donnerait autre chose | « fixée manuellement : 3 · le calcul donne 5 », choix Garder / Recalculer | gardée |
| Objet qui entre (étiquette ajoutée, ou quantité qui passe au-dessus de 0) | « + Poncho : 2 » | accepté |
| Objet qui sortirait (étiquette retirée, ou quantité tombée à 0) | « Chaussures de marche — n'est plus demandé », et « 1 à sortir du sac » s'il y en a | **gardé** (retrait refusé) |

- **Ce qu'on compare (choix de l'agent)** : seulement ce que provoque la modification, jamais la
  bibliothèque entière. On calcule l'inclusion de la bibliothèque **actuelle** avec les anciennes
  étiquettes et avec les nouvelles ; seuls les objets dont l'inclusion change entre les deux sont
  proposés à l'entrée ou au retrait. Un objet décoché dans l'aperçu à la création, retiré en phase 8,
  ajouté à la bibliothèque depuis, ou dont les étiquettes ont changé dans la bibliothèque, n'est donc
  jamais proposé tant qu'on ne touche pas à une étiquette qui le concerne. Les quantités, elles, se
  recalculent pour tous les objets du voyage qui ont une formule. Aucune donnée nouvelle n'est
  gardée (pas de mémoire des objets écartés).
- **Recalcul** : avec la règle copiée dans l'objet du voyage (règle, valeur, plafond, par personne),
  pas avec la bibliothèque : le voyage reste une copie indépendante. Les objets ajoutés à la main
  (phase 8) n'ont pas de formule : ils ne figurent jamais dans le récapitulatif.
- **Objets qui entrent** : ceux que la bibliothèque inclut avec les nouvelles étiquettes et pas avec
  les anciennes (ou dont la quantité calculée passe de 0 à plus de 0), dont le modèle n'est pas déjà
  dans le voyage (critère : aucun objet déjà présent n'est proposé). Ils
  prennent les quantités calculées pour ce voyage, « à acheter » s'ils sont consommables, rien dans
  le sac. Une catégorie absente du voyage est copiée de la bibliothèque avec eux, et disparaît de la
  proposition si tous ses objets sont refusés.
- **Objets qui sortiraient** : ceux du voyage dont le modèle existe encore dans la bibliothèque, que
  la règle d'inclusion incluait avec les anciennes étiquettes et n'inclut plus avec les nouvelles (y
  compris parce que leur catégorie n'entre plus), ou dont la quantité calculée tombe à 0.
- **Objet retiré qui revient** : un objet barré qui attend sa sortie (quantité 0) et que la
  modification inclut de nouveau est proposé comme « 0 → N », accepté par défaut ; il redevient un
  objet normal. Un objet sans modèle, ou dont le modèle a été supprimé de la
  bibliothèque, n'est jamais proposé au retrait.
- **Rien à montrer** (aucun objet ne change) : le récapitulatif ne s'affiche pas, l'assistant
  enregistre directement.
- « Appliquer les changements » enregistre **en une seule fois** les nouvelles informations, les
  étiquettes, et les seules lignes acceptées. Puis, s'il y a des pièces à sortir (voir plus bas),
  la question de la sortie est posée **une fois** pour l'ensemble.

### Les pièces à sortir du sac

Nombre de pièces à sortir d'un objet = pièces dans le sac − quantité prévue, quand c'est positif.
C'est la seule définition ; elle couvre les deux cas :

- **baisse** : « T-shirts » passe de 4 à 3 avec 4 dans le sac → 1 à sortir ;
- **retrait** : l'objet retiré garde ses pièces dans le sac et une quantité prévue de 0 → toutes à sortir.

La question, posée après l'application du récapitulatif (une fenêtre pour tous les objets
concernés, en les nommant avec leur nombre), après une baisse à la main dans la fiche, ou après
« Retirer du voyage » d'un objet emballé :

- **« C'est fait »** (principal) : le compte du sac descend à la quantité prévue ; un objet retiré
  quitte alors la liste (avec le bandeau « Annuler » de la phase 7 pour un retrait).
- **« Plus tard »** : l'objet garde ses pièces à sortir.
- Pour la baisse à la main seulement, **« Garder N »** reste possible : la baisse est annulée,
  comme aujourd'hui.

Tant qu'un objet a des pièces à sortir :

- sa ligne montre un **« ! »** à la place de la coche, et la pastille **« N à sortir du sac »** (icône
  et mot) sous son nom ; un objet retiré est en plus **barré** ;
- il **ne compte pas comme emballé** : il compte dans le total de « cochés / total » et des jauges
  sans être coché (un objet retiré aussi : 9 / 10 tant qu'il attend sa sortie — choix de l'agent), il
  reste en haut de sa catégorie, il reste affiché avec « Reste à emballer » ;
- sa catégorie n'est ni « Bouclé ! » ni repliée d'office, et porte le **« ! »** dans son en-tête et dans
  sa tuile du grand écran ;
- le voyage n'affiche pas « Sac bouclé ! » ;
- **un appui sur sa case sort une pièce** (comme un appui en met une), sans confirmation ; la dernière
  pièce sortie d'un objet retiré le fait quitter la liste, avec « Annuler » ;
- sa **fiche** rappelle « N à sortir du sac » avec le bouton « C'est fait » ; le − du « dans le sac »
  sort une pièce à la fois.
- La fiche d'un **objet retiré** qui attend sa sortie propose aussi **« Le garder dans le voyage »**
  (choix de l'agent) : il reprend la quantité que donne sa formule pour ce voyage, ou, sans formule,
  le nombre de pièces dans le sac (fixé manuellement) ; ses pièces restent dans le sac.

Un objet retiré qui attend sa sortie n'a plus rien à acheter (quantité 0) : il quitte Courses.

### La fiche de l'objet et « Retirer du voyage » (phase 8 alignée)

- Baisser la quantité prévue sous le nombre dans le sac : la question existante « Sortir une pièce du
  sac ? » propose « Garder N », « Plus tard », « C'est fait ».
- « Retirer du voyage » d'un objet emballé : la confirmation existante chiffre ses pièces dans le sac
  et propose de retirer avec « C'est fait » (il part, avec « Annuler ») ou « Plus tard » (il reste
  barré avec le « ! »). Sans pièce dans le sac, rien ne change par rapport à la phase 8.

## Données

- **Impact sur le schéma (migration 006)** : la contrainte qui empêche d'avoir plus de pièces dans le
  sac que la quantité prévue (`dans_le_sac <= quantite`) disparaît : un excédent est désormais l'état
  « à sortir ». Comme en 003 et 005, SQLite oblige à reconstruire la table `objet_du_voyage` ; les
  données existantes sont reprises telles quelles (aucune n'a d'excédent). Une quantité prévue de 0 avec
  des pièces dans le sac marque un objet retiré qui attend sa sortie (le schéma accepte déjà 0).
- La contrainte `achetes <= quantite` reste : une baisse ramène les achats à la quantité (règle de la
  phase 9), un retrait les ramène à 0.
- Les étiquettes du voyage sont remplacées par les nouvelles, copiées comme à la création (nom, ordre,
  identifiant d'origine) ; celles dont l'origine a disparu de la bibliothèque sont gardées.
- Tout le changement (voyage, étiquettes, catégories, objets) s'écrit en une seule opération : une
  erreur d'enregistrement laisse le voyage tel qu'il était, avec le message de panne habituel.

## Règles à placer dans le modèle (pur, une seule définition chacune)

- Pièces à sortir d'un objet ; « emballé » (complet **et** rien à sortir) — `estComplet`,
  `progression`, `estBouclee`, `ordreDansLeSac` et `appuiSurCase` de `src/modele/sac.js` en tiennent
  compte, pour que toutes les jauges et tous les écrans suivent sans règle en double.
- Le récapitulatif : à partir du voyage, de la bibliothèque et des nouvelles informations, la liste des
  changements par catégorie avec leur défaut ; puis l'application des lignes acceptées, qui rend le
  voyage modifié (sans rien écrire).
- La question de la sortie : quels objets ont des pièces à sortir après un changement ; ce que « C'est
  fait » produit.
- Les écrans ne font que montrer et transmettre les choix ; le stockage n'écrit que ce que le modèle a
  calculé.

## Laissé au constructeur

- Le découpage de l'assistant pour accueillir le mode « modifier » sans dépasser 500 lignes par fichier
  (`src/ecrans/nouveau-voyage.js` en compte déjà 490).

## Documents à mettre à jour (avec la conception)

- `docs/PRD.md` : US-25 (« sauf celles que j'ai corrigées à la main » → avec un choix pour celles-ci),
  US-27 (rien n'est retiré d'office, l'appli propose de retirer les objets liés), la règle « Une
  quantité corrigée à la main… n'est plus jamais recalculée automatiquement » (sauf si l'utilisateur
  le choisit dans le récapitulatif), et une puce « Quand les plans changent » dans « Écrans et gestes ».
- `docs/PLAN.md`, phase 10 : critères d'acceptation ajustés —
  - passer de 2 à 3 voyageurs propose « Repas : 16 → 24 » ; une quantité fixée à la main est gardée
    par défaut et ne change que si l'on choisit « Recalculer » ;
  - l'aperçu d'ajout ne propose aucun objet déjà présent dans le voyage ;
  - les objets ajoutés par l'étiquette prennent les quantités calculées pour ce voyage ;
  - après le retrait d'une étiquette, sans autre choix, tous les objets et leurs coches restent ;
  - une pièce en trop dans le sac est signalée par un « ! » et « N à sortir du sac » tant que sa sortie
    n'est pas confirmée, et le sac n'est pas « bouclé » ;
  - schéma : `dans_le_sac` peut dépasser la quantité (pièces à sortir).
- `docs/DESIGN.md` : une ligne au journal (faite, 2026-10-29).
