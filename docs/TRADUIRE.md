# Traduire Baluchon

Une langue de plus, c'est un fichier de plus : aucun code à écrire.

1. **Copier** `src/i18n/fr.json` en `src/i18n/<code>.json`, avec le code de la langue (`en`, `de`, `pt-BR`…).
2. **Traduire les textes**, sans toucher aux clés (le mot avant les deux-points) ni aux `{valeurs}` entre
   accolades : `{n}`, `{nom}`… sont remplacées par l'appli, elles doivent rester telles quelles.
3. **Pluriels** : un texte qui dépend d'un nombre a une forme par catégorie de la langue (`one`, `other`, et
   selon la langue `few`, `many`, `zero`, `two`). Donner toutes celles que la langue emploie ; `other` est
   obligatoire. Une forme peut se passer de `{n}` (« 1 étiquette choisie »).
4. **Bibliothèque de départ** : la branche `depart` porte les noms de la bibliothèque (groupes, étiquettes,
   catégories, objets et leurs notes). La traduire **en entier**, ou la retirer : l'appli ne mélange jamais
   deux langues. Sans `depart`, un appareil dans cette langue reçoit l'interface traduite et la bibliothèque
   en français.
5. **Remplir `aPropos.traduction.texte`** : « Traduction : votre nom » (dans la langue traduite), pour que
   l'écran « À propos » vous cite.
6. **Lancer `pnpm verif`** : le contrôle « Fichiers de langue » signale une clé inventée, une `{valeur}`
   oubliée ou changée, une forme de pluriel manquante, un texte vide ou une bibliothèque à moitié traduite.

Une traduction peut rester partielle : un texte non traduit s'affiche en français, jamais vide. L'appli choisit
la langue de l'appareil à chaque lancement (la forme exacte, `pt-BR`, puis sa base, `pt`) et le français sinon ;
la bibliothèque, elle, est installée une fois, dans la langue du premier lancement.
