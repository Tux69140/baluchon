# Phase 15 : Paquets installables et vrai voyage — conception

> Sources : `docs/PRD.md` (critères de succès 6 et 7, « Dépendance » des notes complémentaires),
> `docs/PLAN.md` (phase 15 et sa section « À traiter »). Étude menée avec le chef de projet le
> 2026-11-02 (session « Phase15 »), pendant le codage de la phase 14 ; décisions complétées le
> 2026-11-03 sur la branche `phase-15`.

## Intention

Jusqu'ici, Baluchon n'existe qu'en version d'essai : un paquet Android de développement d'environ
280 Mo, qui ne tourne que sur les appareils 64 bits et n'est pas signé pour être diffusé, et un paquet
Debian. La phase 15 fabrique les **vrais paquets**, légers et signés, par des scripts qui donnent
toujours le même résultat. Elle vérifie qu'une mise à jour ne perd rien, fait une recette complète en
mode avion, puis le couple prépare son prochain voyage réel avec Baluchon et désinstalle BagPacker.

Réussite : le chef de projet installe Baluchon sur la tablette ou le Xiaomi, y saisit ses vraies
données, installe plus tard une version suivante par-dessus sans rien perdre, et part en voyage avec.

## Objectifs

1. **Paquets légers** (priorité du chef de projet, « 270 Mo ! à gerber ») : jamais de version de
   développement diffusée ; réglages de construction qui réduisent le poids ; chaque paquet pesé et le
   poids annoncé au chef de projet.
2. **Paquets fabriqués par des scripts reproductibles** : Android signé, Debian, rpm, AppImage, Windows.
3. **Clé de signature Android propre à Baluchon**, rangée dans le KeePass du chef de projet.
4. **Mise à jour sans perte** vérifiée sur Android, Debian et Windows.
5. **Recette en mode avion** : une liste de contrôle, une ligne par user story (US-1 à US-40).
6. **Défaut de la SM-T550 compris** (base non ouverte au premier lancement), puis décision sur le
   32 bits.
7. **Vrai voyage** préparé avec Baluchon (critère de succès 7).

## Déroulement

1. **Essai jetable** (décision 8), juste après l'accord sur cette conception et avant le plan : une
   version finale avec les réglages de poids, fabriquée, pesée paquet par paquet (Android 64 bits seul,
   Android 64 + 32 bits, Debian, rpm, AppImage), installée sur les cinq appareils (SM-X210, Xiaomi,
   ASUS, SM-T550, PC Debian) pour vérifier qu'elle se comporte comme la version d'essai, puis retirée
   (rien de commité, `git restore`). Les résultats sont donnés au chef de projet et nourrissent le plan.
   La version finale passe par un réducteur de code (R8) que la version d'essai n'utilise pas : le pont
   `window.BaluchonAndroid` (Téléchargements, liens, barres système) est le premier suspect si quelque
   chose cesse de marcher.
2. **Enquête sur la SM-T550** (décision 2) : faite pendant l'essai, le défaut ne se reproduit pas
   avec la version finale (voir « Résultats de l'essai jetable ») ; la SM-T550 reste visée avec le
   paquet de secours (décision 1). Reste à rendre visible et à rattraper l'erreur si elle survenait
   (choix 30).
3. **Plan** (superpowers:writing-plans), puis construction : scripts, clé, données de développement à
   part, recette.
4. **Mise à jour sans perte**, **recette en mode avion**, puis **vrai voyage**.

## Résultats de l'essai jetable (2026-11-03)

Version finale avec les réglages de poids (choix 14), signée d'une clé jetable, puis tout retiré.

| Paquet                                | Poids                 |
| ------------------------------------- | --------------------- |
| Android 64 bits seuls                 | 7,0 Mo                |
| Android 32 bits seuls                 | 5,5 Mo                |
| Android commun 64 + 32 bits           | 11,0 Mo               |
| Debian (.deb)                         | 2,3 Mo                |
| rpm                                   | 2,3 Mo                |
| AppImage (telle que Tauri la fabrique) | 103,4 Mo              |
| AppImage recompressée (choix 15)      | 95,9 Mo               |

- Sur la SM-X210, le Xiaomi, l'ASUS (Android 7, 64 bits) et la SM-T550 (Android 7, 32 bits) : ouverture,
  sauvegarde dans Téléchargements (autorisation d'Android 7 comprise), sélecteur de fichiers pour
  restaurer, liens d'« À propos » vers le navigateur : tout fonctionne. Le réducteur de code de la
  version finale n'a rien cassé.
- **SM-T550** : le défaut de premier lancement ne s'est pas reproduit (cinq premiers lancements,
  données effacées à chaque fois). Il ne touchait peut-être que la version de développement, bien plus
  lente ; l'erreur reste toutefois avalée si elle survient (choix 30).
- **AppImage** : remplacer les copies en double ne gagne rien (le format les fusionne déjà) ; seule une
  compression plus forte (zstd au plus haut niveau, blocs de 1 Mo) réduit le poids, sans ralentir le
  démarrage (1 à 2 s dans les deux cas). Le reste est le moteur d'affichage, indispensable.
- La 0.1.0 des tablettes d'essai a été désinstallée ; la SM-T550, débranchée avant le nettoyage, garde
  la version de l'essai et une sauvegarde du 2026-11-03 dans Téléchargements, à retirer.

## Décisions du chef de projet

Étude du 2026-11-02 :

1. **Android, 32 bits** : un paquet commun (64 + 32 bits) seulement s'il ne coûte que quelques Mo de
   plus. L'essai l'a pesé à 11,0 Mo contre 7,0 Mo : chaque appareil garderait environ 4 Mo inutiles.
   **Décision du 2026-11-03 : deux paquets Android**, la SM-T550 restant visée :
   - le paquet **normal**, 64 bits (`baluchon-<version>.apk`), pour presque tous les appareils ;
   - le paquet **de secours**, 32 bits (`baluchon-<version>-anciens-appareils.apk`), pour les
     appareils anciens comme la SM-T550 ; on le prend seulement si Android refuse le normal.
2. **Le défaut de la SM-T550 s'investigue d'abord** ; son résultat décidera du point 1.
3. **Clé de signature** : nouvelle, propre à Baluchon (pas celle de Paré), rangée dans **KeePass**
   avec ses mots de passe.
4. **Désinstaller une fois** les versions d'essai sur chaque appareil avant d'installer la version
   signée (signatures différentes) : accepté ; les données de ces appareils ne sont que des essais.
5. **Numéro de version** : la première version signée est **0.1.0** (« on est en dév ») ; on passera
   en 1.x à la publication de l'appli.
6. **Windows** : le paquet se fabrique **sur un ordinateur Windows**, comme pour Paré.
7. **Données de développement à part** des vraies données sur l'ordinateur.
8. **Essai jetable** en ouverture de la phase.
9. **AppImage gardée** (« beaucoup de logiciels sont distribués comme cela »), allégée.
10. **Recette en mode avion** : liste de contrôle exécutée par l'agent par câble sur les tablettes et
    le Xiaomi, puis refaite à la main par le chef de projet sur l'appareil du voyage réel (**la
    tablette SM-X210 ou le Xiaomi**).
11. **Pas de contrainte de calendrier** pour le voyage réel.

Décisions du 2026-11-03 :

12. **Pages web** de présentation et de téléchargement : **phase 16**, avec les dons. D'ici là, le
    lien « Nouvelles versions » d'« À propos » peut mener à une page qui n'existe pas encore (déjà
    accepté en phase 13, choix 21).
13. **Flatpak, F-Droid et Play Store** : pour le futur, dans les évolutions du PRD. Le code et les
    composants sont compatibles (tous libres, ni service Google ni traceur, Android récent visé,
    64 bits présent) ; ne rien faire qui leur ferme la porte.
28. **La branche `phase-15` peut être envoyée sur GitHub pendant la phase**, sans fusion dans main,
    pour que l'ordinateur Windows fabrique son paquet (réponse à la relecture). L'agent annonce chaque
    envoi et ce qui part ; la fusion reste soumise à l'accord du chef de projet.

## Choix de l'agent

14. **Réglages de poids** (Rust, profil de version finale) : suppression des symboles, optimisation
    pour la taille, optimisation à l'édition des liens, une seule unité de compilation. Vérifier en
    plus qu'aucune image, police ni icône inutile n'est embarquée.
15. **AppImage allégée** : compression plus forte (l'essai a montré que les copies en double sont déjà
    fusionnées par le format). Le moteur d'affichage et ce qu'il exige au démarrage (synthèse vocale, vidéo, formats
    d'image récents) restent : sans eux il ne démarre pas.
16. **Données de développement à part** : la version de développement sur ordinateur (`tauri dev`) et
    la version d'essai Android (`pnpm android:essai`) prennent un **identifiant distinct**
    (`fr.biovibralyon.baluchon.essai`), donc leur propre dossier de données et leurs propres réglages
    d'appareil. Sur Android, elles s'installent alors **à côté** de la version signée, sans jamais la
    remplacer ni l'effacer : les vraies données du chef de projet restent hors d'atteinte des essais.
    Le nom affiché de l'essai le distingue (« Baluchon essai »).
17. **Clé** : créée par l'agent sur l'ordinateur de travail, puis remise au chef de projet (fichier et
    mots de passe) pour KeePass. Elle n'entre jamais dans git (`.gitignore` l'exclut déjà). Le script
    refuse de fabriquer un paquet Android signé si la clé manque, avec un message qui dit où la
    reposer. Le chef de projet confirme qu'il sait la retrouver (critère 3 du plan).
18. **Le projet Android reste régénéré** : la signature et tout réglage de construction s'ajoutent par
    nos retouches copiées et vérifiées à chaque construction (`scripts/projet-android.mjs`), comme le
    correctif Android 7 actuel.
19. **Paquets déposés dans `artifacts/`** (hors git), nommés avec le numéro de version et
    l'architecture.
20. **Mise à jour sans perte**, protocole : installer la 0.1.0, y saisir un jeu de données qui touche
    tout (voyages, coches, achats, objets écartés, bibliothèque et étiquettes modifiées, thème),
    fabriquer une version suivante (0.1.1), l'installer par-dessus, comparer. Sur Android (SM-X210 et
    Xiaomi), Debian (agent) et Windows (chef de projet). Une sauvegarde faite avant permet de comparer
    le contenu exact.
21. **Liste de la recette** : `docs/RECETTE.md`, une ligne par user story, avec appareil, date et
    résultat. Mode avion vérifié en vrai (réseau coupé), pas seulement supposé.
22. **Windows** : le script tourne sous Windows et refuse de fabriquer depuis un dépôt en retard,
    comme chez Paré. Le paquet Windows n'a pas de signature Windows (payante) : l'avertissement à
    l'installation est accepté.

## Choix de l'agent après relecture de la conception

23. **Quand les données deviennent vraies.** La 0.1.1 fabriquée pour l'essai de mise à jour est une
    vraie version (numéro changé, commitée), car Android refuse de revenir à un numéro plus bas. Après
    la recette, l'agent efface les données de test de l'appareil du voyage par le réglage d'Android
    « Effacer les données » (sans désinstaller) et le dit au chef de projet. À partir du moment où le
    chef de projet annonce qu'il commence ses vraies données, la règle « données des appareils
    effaçables sans demander » cesse de s'appliquer **à la version signée** de cet appareil ; elle
    reste valable pour la version d'essai, qui est à part (choix 16).
24. **Rangement de la clé** : hors du dépôt, dans `~/.local/share/baluchon/` (comme Paré), avec le
    fichier de ses mots de passe, lisibles par le seul utilisateur. Le chef de projet joint les deux à
    une entrée KeePass ; l'agent ne recopie jamais les mots de passe dans la conversation.
25. **L'essai jetable utilise une clé jetable**, effacée avec lui : la vraie clé naît pendant la
    construction, après l'accord sur le plan. Les versions de l'essai sont désinstallées des appareils
    à la fin de l'essai.
26. **Données déjà présentes sur l'ordinateur** : le dossier actuel de Baluchon ne contient que des
    essais ; il devient celui de la version installée. Avant la première installation du paquet
    Debian 0.1.0, l'agent en fait une copie de côté (hors dépôt), puis le vide.
27. **rpm et AppImage** : l'AppImage est lancée et essayée sur le PC Debian, mise à jour comprise. Le
    rpm est fabriqué, pesé et son contenu inspecté (dépendances, fichiers) ; aucun appareil Fedora ne
    sert d'essai.

## Choix de l'agent après l'essai jetable

29. **Numéro interne par architecture** : les deux paquets Android d'une même version portent des
    numéros internes (versionCode) différents, dérivés du numéro affiché, celui du 64 bits plus élevé.
    Une mise à jour reste reconnue comme plus récente, et F-Droid pourra un jour proposer les deux côte
    à côte. Le numéro affiché reste le même (0.1.0).
30. **Erreur de démarrage rendue visible et rattrapée** : si la base ne s'ouvre pas au démarrage, la
    cause est écrite dans le journal d'Android (et du bureau) au lieu d'être avalée, et l'ouverture est
    retentée une fois avant d'afficher le message d'erreur. Test qui échoue d'abord.
31. **L'enquête sur la SM-T550 se réduit à cela** : le défaut ne se reproduit pas avec la version
    finale ; la SM-T550 reçoit le paquet de secours et passe par la recette comme les autres appareils.

## Hors périmètre (ne pas construire)

- Pages web de présentation et de téléchargement, dons : phase 16.
- Publication sur Flathub, F-Droid, Play Store ; paquet Flatpak.
- Signature Windows payante ; mise à jour automatique dans l'appli.
- Diffusion des paquets : seulement sur demande explicite du chef de projet.

## Anti-objectifs

- Diffuser ou installer chez le chef de projet une version de développement.
- Un essai qui écrase ou efface les vraies données du chef de projet.
- Une clé de signature perdue, ou présente dans git.
- Présenter les chiffres d'un autre projet comme ceux de Baluchon : chaque poids annoncé est mesuré
  sur Baluchon.

## Ce qui est laissé au constructeur

- Les noms des commandes `pnpm`, la forme exacte des scripts et la façon d'injecter la signature.
- Le réglage précis de la compression de l'AppImage, s'il ne ralentit pas sensiblement le démarrage.
- La façon de rendre visible l'erreur de démarrage (journal Android, message à l'écran).
- Les dépendances déclarées du paquet Debian (Paré a dû les corriger pour Debian 13).

## Critères d'acceptation

Ceux du plan, plus :

- [ ] Chaque paquet est fabriqué par une seule commande, et son poids est annoncé au chef de projet.
- [ ] Aucune version d'essai ne peut remplacer ni effacer la version signée, sur Android comme sur
      ordinateur.
- [ ] Une base qui ne s'ouvre pas au démarrage laisse sa cause dans le journal et l'ouverture est
      retentée une fois (choix 30) ; la SM-T550 passe la recette avec le paquet de secours.
