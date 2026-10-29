-- Phase 10 : une pièce de trop dans le sac attend que l'utilisateur confirme l'avoir sortie (quantité
-- baissée, objet retiré : décisions du chef de projet, 2026-10-29). dans_le_sac peut donc dépasser la
-- quantité ; c'est le stockage qui interdit d'en ajouter au-delà (un excédent ne fait que décroître).
-- SQLite ne sait pas modifier une contrainte CHECK : la table est reconstruite, comme en 003 et 005,
-- et les données reprises telles quelles. Les achats restent bornés par la quantité.
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
  dans_le_sac INTEGER NOT NULL DEFAULT 0 CHECK (dans_le_sac >= 0),
  a_acheter INTEGER NOT NULL DEFAULT 0 CHECK (a_acheter IN (0, 1)),
  achetes INTEGER NOT NULL DEFAULT 0,
  note TEXT NOT NULL DEFAULT '',
  modifie_le TEXT NOT NULL,
  CHECK (achetes >= 0 AND achetes <= quantite)
);

INSERT INTO objet_du_voyage_neuf
  SELECT id, voyage_id, categorie_id, modele_id, nom, regle, valeur, plafond, par_personne,
         consommable, quantite, quantite_manuelle, dans_le_sac, a_acheter, achetes, note, modifie_le
  FROM objet_du_voyage;

DROP TABLE objet_du_voyage;
ALTER TABLE objet_du_voyage_neuf RENAME TO objet_du_voyage;
CREATE INDEX objet_du_voyage_par_voyage ON objet_du_voyage (voyage_id);
