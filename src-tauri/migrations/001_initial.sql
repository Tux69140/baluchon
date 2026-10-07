-- Schéma de départ (docs/PLAN.md, « Schéma ») : identifiants UUID en texte et « modifie_le » sur
-- chaque ligne, en prévision de la synchronisation future. Les phases suivantes ajoutent la
-- bibliothèque et le contenu des voyages.
CREATE TABLE schema_migrations (
  version INTEGER PRIMARY KEY
);

CREATE TABLE voyage (
  id TEXT PRIMARY KEY NOT NULL,
  nom TEXT NOT NULL,
  destination TEXT NOT NULL DEFAULT '',
  -- Dates de calendrier locales, sans heure : AAAA-MM-JJ.
  depart TEXT NOT NULL,
  retour TEXT NOT NULL,
  voyageurs INTEGER NOT NULL CHECK (voyageurs BETWEEN 1 AND 20),
  modifie_le TEXT NOT NULL
);
