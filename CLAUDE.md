# CLAUDE.md

**Lire et respecter `AGENTS.md` à la racine.** Points essentiels : répondre en français à un chef de projet non-programmeur (effet concret, pas de mécanique interne), TDD obligatoire, code maintenable (fichiers d'environ 500 lignes au plus, une seule définition par règle, couches étanches), une seule question à la fois, jamais de commit, de publication ni de paquet sans demande explicite, test visuel automatisé après toute modification visible.

## Vue d'ensemble

**Baluchon** (`fr.biovibralyon.baluchon`) : appli de listes de bagages, libre (GPL-3.0-or-later), hors ligne, pour Android (tablette, téléphone) et Debian. Inspirée de BagPacker, avec une bibliothèque de catégories et d'objets modèles entièrement configurable : étiquettes regroupées, quantités par jour ou par personne, voyages copiés de la bibliothèque.

Technique : Tauri 2 + JavaScript simple + Vite + SQLite, sur le modèle de Paré (`~/Documents/Evacuation/App_V2/appli`). Gestionnaire de paquets : **pnpm** (jamais npm/npx).

Commandes : `pnpm verif` (lint, formatage, contrôles, tests, tests d'écran — tout doit être vert avant livraison), `pnpm tauri dev` (appli de bureau), `pnpm android:essai` (version d'essai Android), `pnpm icones` (régénère les icônes depuis `src-tauri/icons/source/`). Le projet Android (`src-tauri/gen/`) est régénéré : nos retouches (icônes, `MainActivity.kt`) vivent dans `src-tauri/icons/android` et `src-tauri/android/`, copiées et vérifiées à chaque construction.

## État

PRD, design et plan validés (`docs/PRD.md`, `docs/DESIGN.md`, `docs/PLAN.md`, 2026-10-06) ; ils font autorité. Phase 1 (squelette qui tourne) validée le 2026-10-06 ; phase 2 (créer un voyage simple) validée par le chef de projet le 2026-10-07, avec « Nouveau voyage » en fenêtre modale sur tablette et ordinateur. Prochaine étape : phase 3 du plan (cocher dans le sac). Contexte de design pour les outils : `docs/PRODUCT.md`.
