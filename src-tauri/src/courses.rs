// Les Courses (phase 9) : la marque « à acheter » d'un objet du voyage et ses pièces achetées, écrites
// ensemble. Les règles (ce qui reste à acheter, l'interrupteur) vivent dans le modèle
// (src/modele/courses.js) ; la base ne fait que refuser ce qui sort des bornes.
use crate::base::{en_texte, Base};
use rusqlite::params;

pub(crate) const ACHATS_HORS_BORNES: &str = "Les pièces achetées dépassent la quantité prévue.";

impl Base {
    pub fn regler_achats(
        &self,
        id: &str,
        a_acheter: bool,
        achetes: i64,
        modifie_le: &str,
    ) -> Result<(), String> {
        let connexion = self.connexion()?;
        let quantite: Option<i64> = connexion
            .query_row(
                "SELECT quantite FROM objet_du_voyage WHERE id = ?1",
                [id],
                |r| r.get(0),
            )
            .ok();
        let Some(quantite) = quantite else {
            return Err("Objet introuvable.".to_owned());
        };
        // Dit ici pour un message clair ; la contrainte de la table le refuserait de toute façon.
        if achetes < 0 || achetes > quantite {
            return Err(ACHATS_HORS_BORNES.to_owned());
        }
        connexion
            .execute(
                "UPDATE objet_du_voyage SET a_acheter = ?2, achetes = ?3, modifie_le = ?4 WHERE id = ?1",
                params![id, a_acheter, achetes, modifie_le],
            )
            .map_err(en_texte)?;
        Ok(())
    }
}

#[cfg(test)]
#[path = "courses_essais.rs"]
mod tests;
