-- Phase 4 : étiquettes regroupées (« Activités », « Climat »…), liens vers les catégories et objets
-- modèles, et copie des étiquettes choisies dans chaque voyage. Les liens n'ont pas de modifie_le : ils
-- suivent celui de leur modèle. modele_id de etiquette_du_voyage n'a pas de contrainte, comme pour les
-- catégories du voyage : le voyage est une copie indépendante de la bibliothèque.
CREATE TABLE groupe_etiquettes (
  id TEXT PRIMARY KEY NOT NULL,
  nom TEXT NOT NULL,
  ordre INTEGER NOT NULL,
  modifie_le TEXT NOT NULL
);

CREATE TABLE etiquette (
  id TEXT PRIMARY KEY NOT NULL,
  groupe_id TEXT NOT NULL REFERENCES groupe_etiquettes (id) ON DELETE CASCADE,
  nom TEXT NOT NULL,
  ordre INTEGER NOT NULL,
  modifie_le TEXT NOT NULL
);

CREATE TABLE categorie_modele_etiquette (
  categorie_id TEXT NOT NULL REFERENCES categorie_modele (id) ON DELETE CASCADE,
  etiquette_id TEXT NOT NULL REFERENCES etiquette (id) ON DELETE CASCADE,
  PRIMARY KEY (categorie_id, etiquette_id)
);

CREATE TABLE objet_modele_etiquette (
  objet_id TEXT NOT NULL REFERENCES objet_modele (id) ON DELETE CASCADE,
  etiquette_id TEXT NOT NULL REFERENCES etiquette (id) ON DELETE CASCADE,
  PRIMARY KEY (objet_id, etiquette_id)
);

CREATE TABLE etiquette_du_voyage (
  id TEXT PRIMARY KEY NOT NULL,
  voyage_id TEXT NOT NULL REFERENCES voyage (id) ON DELETE CASCADE,
  modele_id TEXT,
  nom TEXT NOT NULL,
  ordre INTEGER NOT NULL,
  modifie_le TEXT NOT NULL
);
CREATE INDEX etiquette_du_voyage_par_voyage ON etiquette_du_voyage (voyage_id);
