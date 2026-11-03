# Fabriquer et installer les paquets de Baluchon

Ce document explique comment obtenir les fichiers à installer sur les appareils. Fabriquer et distribuer des paquets se fait seulement sur demande du chef de projet : aucune commande ci-dessous ne se lance de sa propre initiative.

## Où arrivent les paquets

Tous les fichiers fabriqués se déposent dans le dossier `artifacts/` du projet (il n'est pas envoyé sur GitHub). Leur nom contient le numéro de version (noté V ici), lu dans `package.json`.

## Sur l'ordinateur Debian de travail : `pnpm paquets`

Une seule commande fabrique tout ce qui se construit sur cet ordinateur :

| Fichier | Pour quoi faire |
| --- | --- |
| `baluchon-V.apk` | Android récent (64 bits) : tablettes et téléphones actuels |
| `baluchon-V-anciens-appareils.apk` | Android ancien (32 bits), par exemple la tablette SM-T550 |
| `baluchon-V-amd64.deb` | Debian et dérivés |
| `baluchon-V.x86_64.rpm` | Fedora et dérivés |
| `baluchon-V-x86_64.AppImage` | Linux en un seul fichier, sans installation |

Quel paquet Android prendre : toujours le normal (`baluchon-V.apk`) d'abord. Si Android refuse de l'installer, prendre celui des « anciens appareils ».

Au lancement, elle demande le mot de passe de la clé de signature, sans l'afficher (Ctrl-C abandonne). Elle refuse de démarrer tout de suite si la clé est introuvable ou si le mot de passe ne l'ouvre pas (voir plus bas). Elle demande ensuite un peu de temps : plusieurs constructions se suivent.

## Sous Windows : `pnpm paquets:windows`

Le paquet Windows ne se fabrique que sous Windows. Il donne `baluchon-V-x64-setup.exe`, un installateur en français. La commande refuse de fabriquer si la copie locale du projet est en retard sur GitHub : il faut donc que tout ce qui doit y figurer y soit déjà publié.

Ce qu'il faut installer une fois sur la machine Windows :

1. Git.
2. Node.
3. pnpm.
4. Rust avec la chaîne « MSVC » (les outils de compilation C++ de Visual Studio).

Puis, à chaque fabrication :

1. Cloner le projet depuis GitHub sur la branche à fabriquer (une première fois : `git clone`, puis se placer sur la branche voulue).
2. Lancer `pnpm install`.
3. Lancer `pnpm paquets:windows`.

Les fois suivantes, dans le dossier déjà cloné : `git pull`, puis `pnpm install`, puis `pnpm paquets:windows`.

Le fichier arrive dans `artifacts/`.

## La clé de signature Android

Un paquet Android doit être signé, et toutes les versions doivent l'être avec la même clé : sans elle, aucune mise à jour ne pourra s'installer par-dessus une version existante. Ne jamais la perdre, ne jamais la mettre dans le projet.

Elle vit hors du projet, dans deux fichiers :

- `~/.local/share/baluchon/baluchon.jks` : la clé elle-même (alias `baluchon`) ;
- `~/.local/share/baluchon/cle.properties` : deux lignes, `storeFile` (emplacement de `baluchon.jks`) et `keyAlias`.

Le mot de passe n'est écrit nulle part ailleurs que dans KeePass : `pnpm paquets` le demande à chaque fabrication et refuse un `cle.properties` qui contiendrait une ligne `password`. Il ne peut contenir que des lettres sans accent, des chiffres et les signes du clavier américain, sans `\` ni espace au début ou à la fin.

Ces deux fichiers doivent être joints à l'entrée KeePass qui garde le mot de passe. Pour les remettre en place sur un autre ordinateur : créer le dossier `~/.local/share/baluchon/`, y enregistrer les deux pièces jointes de l'entrée, puis restreindre les droits (`chmod 600` sur chacun) et vérifier que `storeFile` dans `cle.properties` désigne bien l'emplacement de `baluchon.jks`. Pour utiliser une clé rangée ailleurs, indiquer le chemin du fichier `cle.properties` (et non du `.jks`) dans la variable `BALUCHON_CLE`. Dans `cle.properties`, `storeFile` doit être un chemin absolu.

## Les essais de développement, à part des vraies données

- `pnpm bureau` : ouvre sur l'ordinateur « Baluchon essai », avec ses propres données (dossier `~/.local/share/fr.biovibralyon.baluchon.essai/`). C'est la seule façon de lancer la version de développement sur l'ordinateur ; `pnpm tauri dev` refuse de démarrer, pour ne jamais toucher aux vraies données.
- `pnpm android:essai` : fabrique « Baluchon essai », qui s'installe à côté de la vraie appli Android, sans l'écraser ni toucher à ses données.
