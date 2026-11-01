-- Phase 13 : qui voyage (femmes, hommes, enfants), « pour qui » sur chaque objet et la règle « par semaine ».
-- SQLite ne sait pas modifier une contrainte : voyage, objet_modele et objet_du_voyage sont reconstruites,
-- comme en 003, 005 et 006. Les clés étrangères sont suspendues par l'appelant (base.rs) le temps de la
-- reconstruction, sans quoi supprimer l'ancien voyage emporterait ses catégories, objets et étiquettes ;
-- il les revérifie avant de valider.
-- Conversion (même règle que la sauvegarde de version 1) : femmes = ⌈voyageurs / 2⌉, hommes = ⌊voyageurs / 2⌋,
-- enfants = 0 ; tout objet reçoit pour_qui = 'tous' ; par_personne est gardé.
CREATE TABLE voyage_neuf (
  id TEXT PRIMARY KEY NOT NULL,
  nom TEXT NOT NULL,
  destination TEXT NOT NULL DEFAULT '',
  -- Dates de calendrier locales, sans heure : AAAA-MM-JJ.
  depart TEXT NOT NULL,
  retour TEXT NOT NULL,
  femmes INTEGER NOT NULL CHECK (femmes BETWEEN 0 AND 20),
  hommes INTEGER NOT NULL CHECK (hommes BETWEEN 0 AND 20),
  enfants INTEGER NOT NULL CHECK (enfants BETWEEN 0 AND 20),
  modifie_le TEXT NOT NULL,
  CHECK (femmes + hommes + enfants BETWEEN 1 AND 20)
);

INSERT INTO voyage_neuf
  SELECT id, nom, destination, depart, retour, (voyageurs + 1) / 2, voyageurs / 2, 0, modifie_le
  FROM voyage;

DROP TABLE voyage;
ALTER TABLE voyage_neuf RENAME TO voyage;

CREATE TABLE objet_modele_neuf (
  id TEXT PRIMARY KEY NOT NULL,
  categorie_id TEXT NOT NULL REFERENCES categorie_modele (id),
  nom TEXT NOT NULL,
  regle TEXT NOT NULL CHECK (regle IN ('fixe', 'par_jour', 'par_nuit', 'par_semaine')),
  valeur INTEGER NOT NULL CHECK (valeur >= 0),
  plafond INTEGER CHECK (plafond IS NULL OR plafond >= 0),
  par_personne INTEGER NOT NULL CHECK (par_personne IN (0, 1)),
  pour_qui TEXT NOT NULL CHECK (pour_qui IN ('tous', 'adultes', 'femmes', 'hommes', 'enfants')),
  consommable INTEGER NOT NULL CHECK (consommable IN (0, 1)),
  toujours_inclus INTEGER NOT NULL CHECK (toujours_inclus IN (0, 1)),
  note TEXT NOT NULL DEFAULT '',
  modifie_le TEXT NOT NULL
);

INSERT INTO objet_modele_neuf
  SELECT id, categorie_id, nom, regle, valeur, plafond, par_personne, 'tous', consommable,
         toujours_inclus, note, modifie_le
  FROM objet_modele;

DROP TABLE objet_modele;
ALTER TABLE objet_modele_neuf RENAME TO objet_modele;

CREATE TABLE objet_du_voyage_neuf (
  id TEXT PRIMARY KEY NOT NULL,
  voyage_id TEXT NOT NULL REFERENCES voyage (id) ON DELETE CASCADE,
  categorie_id TEXT NOT NULL REFERENCES categorie_du_voyage (id) ON DELETE CASCADE,
  modele_id TEXT,
  nom TEXT NOT NULL,
  regle TEXT NOT NULL CHECK (regle IN ('fixe', 'par_jour', 'par_nuit', 'par_semaine')),
  valeur INTEGER NOT NULL CHECK (valeur >= 0),
  plafond INTEGER CHECK (plafond IS NULL OR plafond >= 0),
  par_personne INTEGER NOT NULL CHECK (par_personne IN (0, 1)),
  pour_qui TEXT NOT NULL CHECK (pour_qui IN ('tous', 'adultes', 'femmes', 'hommes', 'enfants')),
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
  SELECT id, voyage_id, categorie_id, modele_id, nom, regle, valeur, plafond, par_personne, 'tous',
         consommable, quantite, quantite_manuelle, dans_le_sac, a_acheter, achetes, note, modifie_le
  FROM objet_du_voyage;

DROP TABLE objet_du_voyage;
ALTER TABLE objet_du_voyage_neuf RENAME TO objet_du_voyage;
CREATE INDEX objet_du_voyage_par_voyage ON objet_du_voyage (voyage_id);
