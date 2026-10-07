-- Phase 2 (docs/PLAN.md, « Schéma ») : la bibliothèque (sans étiquettes : phase 4) et le contenu des
-- voyages. Un voyage est une copie indépendante : modele_id garde seulement la trace du modèle
-- d'origine, sans contrainte, pour qu'une suppression dans la bibliothèque ne touche jamais un
-- voyage. Seuls des ajouts : les voyages existants ne changent pas.
CREATE TABLE meta (
  cle TEXT PRIMARY KEY NOT NULL,
  valeur TEXT NOT NULL
);

CREATE TABLE categorie_modele (
  id TEXT PRIMARY KEY NOT NULL,
  nom TEXT NOT NULL,
  icone TEXT NOT NULL,
  couleur TEXT NOT NULL,
  ordre INTEGER NOT NULL,
  toujours_incluse INTEGER NOT NULL CHECK (toujours_incluse IN (0, 1)),
  modifie_le TEXT NOT NULL
);

CREATE TABLE objet_modele (
  id TEXT PRIMARY KEY NOT NULL,
  categorie_id TEXT NOT NULL REFERENCES categorie_modele (id),
  nom TEXT NOT NULL,
  regle TEXT NOT NULL CHECK (regle IN ('fixe', 'par_jour', 'par_nuit')),
  valeur INTEGER NOT NULL CHECK (valeur >= 0),
  plafond INTEGER CHECK (plafond IS NULL OR plafond >= 0),
  par_personne INTEGER NOT NULL CHECK (par_personne IN (0, 1)),
  consommable INTEGER NOT NULL CHECK (consommable IN (0, 1)),
  toujours_inclus INTEGER NOT NULL CHECK (toujours_inclus IN (0, 1)),
  note TEXT NOT NULL DEFAULT '',
  modifie_le TEXT NOT NULL
);

CREATE TABLE categorie_du_voyage (
  id TEXT PRIMARY KEY NOT NULL,
  voyage_id TEXT NOT NULL REFERENCES voyage (id) ON DELETE CASCADE,
  modele_id TEXT,
  nom TEXT NOT NULL,
  icone TEXT NOT NULL,
  couleur TEXT NOT NULL,
  ordre INTEGER NOT NULL,
  modifie_le TEXT NOT NULL
);
CREATE INDEX categorie_du_voyage_par_voyage ON categorie_du_voyage (voyage_id);

CREATE TABLE objet_du_voyage (
  id TEXT PRIMARY KEY NOT NULL,
  voyage_id TEXT NOT NULL REFERENCES voyage (id) ON DELETE CASCADE,
  categorie_id TEXT NOT NULL REFERENCES categorie_du_voyage (id) ON DELETE CASCADE,
  modele_id TEXT,
  nom TEXT NOT NULL,
  regle TEXT NOT NULL CHECK (regle IN ('fixe', 'par_jour', 'par_nuit')),
  valeur INTEGER NOT NULL CHECK (valeur >= 0),
  plafond INTEGER CHECK (plafond IS NULL OR plafond >= 0),
  par_personne INTEGER NOT NULL CHECK (par_personne IN (0, 1)),
  consommable INTEGER NOT NULL CHECK (consommable IN (0, 1)),
  quantite INTEGER NOT NULL CHECK (quantite >= 0),
  quantite_manuelle INTEGER NOT NULL DEFAULT 0 CHECK (quantite_manuelle IN (0, 1)),
  dans_le_sac INTEGER NOT NULL DEFAULT 0 CHECK (dans_le_sac IN (0, 1)),
  a_acheter INTEGER NOT NULL DEFAULT 0 CHECK (a_acheter IN (0, 1)),
  achete INTEGER NOT NULL DEFAULT 0 CHECK (achete IN (0, 1)),
  note TEXT NOT NULL DEFAULT '',
  modifie_le TEXT NOT NULL
);
CREATE INDEX objet_du_voyage_par_voyage ON objet_du_voyage (voyage_id);
