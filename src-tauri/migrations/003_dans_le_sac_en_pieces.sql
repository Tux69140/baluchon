-- Phase 3 : « dans le sac » devient un nombre de pièces (0 à la quantité prévue) au lieu d'une
-- coche 0/1. SQLite ne sait pas modifier une contrainte CHECK : la table est reconstruite. Une coche
-- de l'ancien format devient « toutes les pièces » (dans_le_sac = quantite) ; aucune autre table ne
-- référence objet_du_voyage, la reconstruction ne touche donc ni les voyages ni les catégories.
CREATE TABLE objet_du_voyage_neuf (
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
  dans_le_sac INTEGER NOT NULL DEFAULT 0,
  a_acheter INTEGER NOT NULL DEFAULT 0 CHECK (a_acheter IN (0, 1)),
  achete INTEGER NOT NULL DEFAULT 0 CHECK (achete IN (0, 1)),
  note TEXT NOT NULL DEFAULT '',
  modifie_le TEXT NOT NULL,
  CHECK (dans_le_sac >= 0 AND dans_le_sac <= quantite)
);

INSERT INTO objet_du_voyage_neuf
  SELECT id, voyage_id, categorie_id, modele_id, nom, regle, valeur, plafond, par_personne,
         consommable, quantite, quantite_manuelle,
         CASE WHEN dans_le_sac = 1 THEN quantite ELSE 0 END,
         a_acheter, achete, note, modifie_le
  FROM objet_du_voyage;

DROP TABLE objet_du_voyage;
ALTER TABLE objet_du_voyage_neuf RENAME TO objet_du_voyage;
CREATE INDEX objet_du_voyage_par_voyage ON objet_du_voyage (voyage_id);
