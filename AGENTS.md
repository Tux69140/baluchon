# AGENTS.md — Baluchon

Ces règles s'appliquent à tout agent IA intervenant dans ce dossier. Elles complètent les éventuelles règles plus précises présentes dans un sous-dossier ; ces dernières priment dans leur périmètre.

## Communication avec le chef de projet

- L'interlocuteur est **chef de projet, pas programmeur**. Expliquer l'effet concret, les conséquences et la décision attendue, jamais la mécanique interne sauf demande explicite.
- Répondre **en français**, en langage courant, en **quelques phrases** (dix lignes maximum par défaut). Ne donner ni récit des essais, ni chemins de fichiers, ni noms techniques inutiles.
- Poser **une seule question à la fois** lorsqu'une décision du chef de projet est indispensable, puis attendre sa réponse. Ne pas demander de validation si une vérification locale permet de trouver la réponse sans risque.
- Ne marquer une étape, une fonction ou une recette comme validée qu'après la **validation explicite** du chef de projet. Distinguer clairement « testé » de « validé par le chef de projet ».

## Références et périmètre

- Avant toute modification, lire les documents produit pertinents (`docs/PRD.md`, `docs/PLAN.md`, `docs/DESIGN.md` dès qu'ils existent).
- En cas de contradiction entre les documents, signaler le point au chef de projet et demander une décision avant de choisir. Ne pas déduire une nouvelle règle produit.
- Ne modifier que ce qui est explicitement demandé. Toute conséquence connexe — interface, comportement, données, format de sauvegarde, autres appareils — doit être soumise à approbation avant application.
- `apk/` contient l'APK de l'appli BagPacker d'origine (propriétaire, Nils Egbers) : matériau d'étude seulement. Ne jamais en copier de texte, d'image ni de code dans Baluchon.

## Méthode de travail : TDD obligatoire

Pour toute correction ou évolution du code :

1. Décrire en termes simples le comportement attendu et le cas à vérifier.
2. Écrire ou adapter d'abord un test qui échoue pour la situation demandée.
3. Apporter la correction la plus petite permettant de faire réussir ce test.
4. Lancer le test concerné, puis les vérifications adaptées pour s'assurer qu'aucune fonction existante n'est cassée.

- Si un test automatisé n'est pas possible, expliquer brièvement pourquoi et préparer une vérification manuelle précise avant de modifier le code.
- Ne jamais masquer, supprimer ou affaiblir un test pour obtenir un résultat vert. Toute exception à cette méthode demande l'accord explicite du chef de projet.

## Code maintenable à long terme

Le code doit pouvoir être repris dans plusieurs années, par un autre agent ou un contributeur, sans relire tout le dépôt.

- **Fichiers courts : environ 500 lignes au plus.** Au-delà, découper par zone de responsabilité — un fichier par écran, un par sujet du modèle. Un module découpé garde un fichier **porte d'entrée** qui réexporte ce que les autres utilisent, pour que les imports existants ne bougent pas.
- **Une seule définition par règle.** Une règle métier (calcul des quantités, inclusion par étiquettes…) ou une fonction utilitaire vit à un seul endroit et s'importe partout ailleurs. Un nouveau module part de la base commune, jamais de la copie d'un voisin : une règle écrite deux fois finit par diverger.
- **Couches étanches.** Aucun écran n'accède directement à SQLite ni à l'API Tauri : tout passe par la couche de stockage. Les règles métier, la validation et les migrations appartiennent au modèle, jamais au stockage ni aux écrans. Le modèle est pur (sans affichage ni stockage), donc testable sans navigateur.
- **Exports utiles seulement.** Un nom n'est exporté que si un autre fichier l'importe. Pas de code mort, pas de dépendance que plus rien n'importe ; toute nouvelle dépendance est justifiée dans le rapport.
- **Une source de vérité par information.** Le numéro de version ne vit que dans `package.json` ; tout le reste s'en déduit à la construction. Même principe pour toute liste de référence (préférences, étiquettes de départ…).
- **Textes d'interface dans les fichiers de traduction**, jamais écrits en dur dans le code.
- **Nommage.** Noms en français pour le vocabulaire métier (voyage, bibliothèque, catégorie, objet, étiquette…), idiomes techniques du langage tels quels. Ne pas mélanger les deux langues pour un même type de nom dans un fichier : suivre le fichier où l'on écrit.
- **Commentaires en français**, qui disent le *pourquoi* (décision, piège évité, provenance), avec la densité du fichier voisin.
- **Chaque règle mesurable a son contrôle automatique** : taille des fichiers, textes hors fichiers de traduction, exports inutilisés, frontière des couches. Une règle sans contrôle finit par ne plus être suivie.
- **Lint et formatage** (ESLint, Prettier) passent avant toute livraison.

## Données, sécurité et fiabilité

- Préserver les données locales : aucune suppression définitive, migration, restauration qui remplace des données, ni écrasement de sauvegarde sans confirmation explicite et vérification préalable.
- Les sauvegardes et exports doivent rester récupérables. Une erreur de stockage ou d'import ne doit jamais faire perdre le dernier état local valide.
- Ne jamais inscrire de secret, mot de passe, jeton ou adresse privée dans le code, les journaux, les tests ou les exports.
- Baluchon fonctionne entièrement hors ligne, sans traceur. Ne jamais ajouter d'échange de données extérieur sans décision du chef de projet.
- Ne pas modifier à la main les fichiers Android générés ou les éléments de construction dérivés, sauf demande explicite. Préférer les sources et scripts reproductibles.

## Rythme de travail (tâches parallèles ou sous-agents)

- **Paralléliser ce qui ne se touche pas.** Au moment de planifier plusieurs tâches, noter pour chacune les fichiers qu'elle modifie. Deux tâches sans fichier commun partent ensemble, pas l'une après l'autre.
- **Tests ciblés pendant, suite complète une seule fois.** Pendant une tâche, lancer seulement les tests des fichiers touchés. La suite complète tourne une fois, en fin de travail, toujours avant toute livraison — jamais sautée parce qu'elle est longue. Ne jamais attendre en boucle (`sleep`) : lancer en tâche de fond.
- **Ce qui coûte, c'est le nombre d'allers-retours** (rondes de correction, relectures répétées, exploration du code), pas la durée des tests. Économiser là, pas sur les vérifications.
- **Un filet neuf s'arme du premier coup.** Un test écrit pour protéger une garde comporte, dès sa première version, son **témoin positif** — la preuve que le geste normal produit bien son effet — et non seulement la preuve que le geste fautif est refusé. Le prouver en dégradant chaque moitié séparément et en vérifiant que chacune rougit pour sa propre raison.
- **Pendant les rondes de correction, ne relancer que les tests couvrant le code amendé.**
- **Un sous-agent se détache dès son rapport rendu.**
- **Une relecture par groupe de tâches, pas par tâche.** Réserver une seconde relecture aux points critiques (perte de données, format de sauvegarde).
- **Comptes rendus courts.** Une quarantaine de lignes : ce qui a changé, ce qui a été vérifié (commande + résultat), ce qui reste. Pas de récit des tentatives.
- **Les captures se prennent pendant, pas en campagne finale** : une paire clair/sombre par écran réellement touché, prise par la tâche qui le modifie.

## Règles impératives de chaque tâche d'agent

- Lire `AGENTS.md` et `CLAUDE.md` à la racine. Réponses et commentaires en français ; le code suit le style du fichier touché.
- **TDD** : un test qui échoue d'abord (garder la sortie rouge comme preuve dans le rapport), puis la plus petite correction, puis le test vert.
- Rien ne se déplace à l'écran de façon inattendue : un message a une place réservée.
- Tests d'écran : se jugent au **code de sortie**, jamais par un grep du texte ; jamais de pause fixe, on attend l'effet.
- Git : plusieurs agents peuvent travailler en même temps. Ne committer **que ses propres fichiers**, nommés explicitement (`git add <chemins>`, vérifier `git diff --cached --name-only`), jamais `git add -A` ni `git commit -a`. **Jamais de `git push`**, de changement de branche, ni de `git stash`/`reset`/`checkout` sur des fichiers d'autrui. Brouillons dans un dossier `*-travail/` (ignoré par git).
- Messages de commit en français, au format `type(portée): message` (`feat`, `fix`, `docs`, `refactor`, `test`, `chore`). Signaler tout impact sur les données (schéma SQLite, migration, format de sauvegarde).
- Ne pas toucher `CLAUDE.md` ni `AGENTS.md` : proposer dans le rapport les lignes à ajouter (le contrôleur les intègre).
- Ne lancer aucun sous-agent.

## Qualité et livraison

- Préserver l'accessibilité : navigation au clavier, libellés clairs, focus visible, contraste d'au moins 4,5:1, cibles tactiles de 44 px, information non portée par la seule couleur, animations réduites quand l'appareil le demande.
- Vérifier les comportements importants sur les supports touchés : téléphone, tablette (portrait et paysage), Debian, thème clair et sombre, barres système Android.
- Après toute modification visible, réaliser un test visuel automatisé (Playwright) avant la livraison : l'écran modifié, ses états importants, l'absence de régression évidente. Si c'est impossible, le dire avant toute livraison et documenter une vérification manuelle.
- Signaler simplement ce qui a été modifié, ce qui a été testé et ce qui reste à valider par le chef de projet.
- Ne jamais créer de commit, pousser du code, publier une version, construire ou diffuser un paquet destinable à un utilisateur sans demande explicite.
- Ne jamais versionner : fichiers de compilation ou de distribution (APK, paquets Debian, dossiers de sortie), fichiers de signature, secrets, `node_modules/`, et le dossier `apk/` (appli d'origine, propriétaire).
