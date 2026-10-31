-- Phase 11 : « Refaire ce voyage » doit retrouver les objets de la bibliothèque que l'utilisateur avait
-- écartés (décochés dans l'aperçu) en créant le voyage. La base les retient désormais, par voyage.
-- modele_id n'a pas de contrainte vers la bibliothèque, comme objet_du_voyage.modele_id : l'objet modèle
-- peut disparaître sans toucher aux voyages.
-- Rien n'est reconstruit pour les voyages existants (décision 3 de la conception) : ils n'ont aucun
-- objet écarté connu, et se relisent avec une liste vide.
CREATE TABLE objet_ecarte (
  voyage_id TEXT NOT NULL REFERENCES voyage (id) ON DELETE CASCADE,
  modele_id TEXT NOT NULL,
  PRIMARY KEY (voyage_id, modele_id)
);
