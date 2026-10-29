// Les ajustements d'un voyage déjà créé : ajouter, rétablir, régler la quantité, renommer et retirer un
// objet, et ajouter à la bibliothèque un objet né dans un voyage. Chacun est une seule transaction :
// refusé, il ne laisse rien d'écrit. Le schéma ne change pas.
use crate::base::{en_texte, Base};
use crate::bibliotheque::{CategorieModele, ObjetModele};
use crate::edition::{ecrire_categorie, ecrire_objet};
use crate::voyages::{inserer_categorie, inserer_objet, CategorieDuVoyage, ObjetDuVoyage};
use rusqlite::{params, Connection, OptionalExtension, Transaction};
use serde::Deserialize;

// L'objet à écrire, avec sa catégorie quand elle est neuve : une catégorie ne naît que de son premier objet.
#[derive(Debug, Clone, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AjoutAuVoyage {
    pub categorie: Option<CategorieDuVoyage>,
    pub objet: ObjetDuVoyage,
}

// Ce qu'écrit le dernier « Ajouter à la bibliothèque » : catégorie neuve éventuelle, objet modèle, et les
// liens du voyage (l'objet, et sa catégorie quand la catégorie de la bibliothèque vient d'être créée).
#[derive(Debug, Clone, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AjoutALaBibliotheque {
    pub categorie: Option<CategorieModele>,
    pub objet: ObjetModele,
    pub objet_du_voyage: String,
    pub categorie_du_voyage: Option<String>,
}

fn objet_inconnu() -> String {
    "Objet introuvable.".to_owned()
}

pub(crate) const SAC_HORS_BORNES: &str = "Les pièces dans le sac dépassent la quantité prévue.";

// La borne du sac, commune à toutes les écritures (phase 10) : de 0 à la quantité prévue, ou jusqu'à
// ce qui est déjà dans le sac quand des pièces de trop attendent leur sortie — un excédent ne fait que
// décroître. `quantite` : la nouvelle quantité prévue, ou celle de la base si elle ne change pas.
pub(crate) fn verifier_sac(
    connexion: &Connection,
    id: &str,
    quantite: Option<i64>,
    dans_le_sac: i64,
) -> Result<(), String> {
    let (quantite_lue, deja): (i64, i64) = connexion
        .query_row(
            "SELECT quantite, dans_le_sac FROM objet_du_voyage WHERE id = ?1",
            [id],
            |r| Ok((r.get(0)?, r.get(1)?)),
        )
        .optional()
        .map_err(en_texte)?
        .ok_or_else(objet_inconnu)?;
    if dans_le_sac < 0 || dans_le_sac > quantite.unwrap_or(quantite_lue).max(deja) {
        return Err(SAC_HORS_BORNES.to_owned());
    }
    Ok(())
}

// La catégorie neuve doit appartenir au voyage de l'objet et être celle qu'il nomme ; sans catégorie
// neuve, celle de l'objet doit déjà exister dans ce voyage (la base ne vérifie que l'existence).
fn verifier_categorie(tx: &Transaction, ajout: &AjoutAuVoyage) -> Result<(), String> {
    let objet = &ajout.objet;
    if let Some(categorie) = &ajout.categorie {
        if categorie.voyage_id != objet.voyage_id || categorie.id != objet.categorie_id {
            return Err("La catégorie ne correspond pas à l'objet.".to_owned());
        }
        return Ok(());
    }
    let voyage_de_la_categorie: Option<String> = tx
        .query_row(
            "SELECT voyage_id FROM categorie_du_voyage WHERE id = ?1",
            [&objet.categorie_id],
            |r| r.get(0),
        )
        .optional()
        .map_err(en_texte)?;
    if voyage_de_la_categorie.as_deref() != Some(objet.voyage_id.as_str()) {
        return Err("Catégorie introuvable dans ce voyage.".to_owned());
    }
    Ok(())
}

impl Base {
    fn ecrire_ajout(&self, ajout: &AjoutAuVoyage) -> Result<(), String> {
        let connexion = self.connexion()?;
        let tx = connexion.unchecked_transaction().map_err(en_texte)?;
        verifier_categorie(&tx, ajout)?;
        if let Some(categorie) = &ajout.categorie {
            inserer_categorie(&tx, categorie)?;
        }
        inserer_objet(&tx, &ajout.objet)?;
        tx.commit().map_err(en_texte)
    }

    pub fn ajouter_au_voyage(&self, ajout: &AjoutAuVoyage) -> Result<(), String> {
        self.ecrire_ajout(ajout)
    }

    // Même écriture qu'un ajout, sous un autre nom : l'écran distingue ainsi « Annuler » d'un ajout
    // (un rétablissement ne rend pas définitif un autre retrait).
    pub fn retablir_dans_le_voyage(&self, ajout: &AjoutAuVoyage) -> Result<(), String> {
        self.ecrire_ajout(ajout)
    }

    // Un réglage à la main est définitif : la quantité n'est plus jamais recalculée. Le sac garde ses
    // pièces de trop quand on remet leur sortie à plus tard (verifier_sac).
    pub fn regler_quantite(
        &self,
        id: &str,
        quantite: i64,
        dans_le_sac: i64,
        achetes: i64,
        modifie_le: &str,
    ) -> Result<(), String> {
        if quantite < 1 {
            return Err("La quantité prévue est au moins de 1.".to_owned());
        }
        if achetes < 0 || achetes > quantite {
            return Err(crate::courses::ACHATS_HORS_BORNES.to_owned());
        }
        let connexion = self.connexion()?;
        verifier_sac(&connexion, id, Some(quantite), dans_le_sac)?;
        let modifiees = connexion
            .execute(
                "UPDATE objet_du_voyage SET quantite = ?2, dans_le_sac = ?3, achetes = ?4,
                   quantite_manuelle = 1, modifie_le = ?5 WHERE id = ?1",
                params![id, quantite, dans_le_sac, achetes, modifie_le],
            )
            .map_err(en_texte)?;
        if modifiees == 0 {
            return Err(objet_inconnu());
        }
        Ok(())
    }

    pub fn renommer_objet_du_voyage(
        &self,
        id: &str,
        nom: &str,
        modifie_le: &str,
    ) -> Result<(), String> {
        let nom = nom.trim();
        if nom.is_empty() {
            return Err("Le nom ne peut pas être vide.".to_owned());
        }
        let modifiees = self
            .connexion()?
            .execute(
                "UPDATE objet_du_voyage SET nom = ?2, modifie_le = ?3 WHERE id = ?1",
                params![id, nom, modifie_le],
            )
            .map_err(en_texte)?;
        if modifiees == 0 {
            return Err(objet_inconnu());
        }
        Ok(())
    }

    // Retire l'objet, et sa catégorie si elle n'a plus d'objet : une catégorie vide n'a pas de sens
    // dans un voyage. La bibliothèque n'est pas touchée.
    pub fn retirer_du_voyage(&self, id: &str) -> Result<(), String> {
        let connexion = self.connexion()?;
        let tx = connexion.unchecked_transaction().map_err(en_texte)?;
        let categorie: Option<String> = tx
            .query_row(
                "SELECT categorie_id FROM objet_du_voyage WHERE id = ?1",
                [id],
                |r| r.get(0),
            )
            .optional()
            .map_err(en_texte)?;
        let categorie = categorie.ok_or_else(objet_inconnu)?;
        tx.execute("DELETE FROM objet_du_voyage WHERE id = ?1", [id])
            .map_err(en_texte)?;
        tx.execute(
            "DELETE FROM categorie_du_voyage WHERE id = ?1
               AND NOT EXISTS (SELECT 1 FROM objet_du_voyage WHERE categorie_id = ?1)",
            [&categorie],
        )
        .map_err(en_texte)?;
        tx.commit().map_err(en_texte)
    }

    pub fn ajouter_a_la_bibliotheque(&self, ajout: &AjoutALaBibliotheque) -> Result<(), String> {
        let connexion = self.connexion()?;
        let tx = connexion.unchecked_transaction().map_err(en_texte)?;
        if let Some(categorie) = &ajout.categorie {
            ecrire_categorie(&tx, categorie)?;
        }
        ecrire_objet(&tx, &ajout.objet)?;
        // Le lien ne contraint rien (modele_id n'est pas une clé étrangère) : seul un objet du voyage
        // inconnu, qui ne change aucune ligne, fait tout refuser.
        let liees = tx
            .execute(
                "UPDATE objet_du_voyage SET modele_id = ?2 WHERE id = ?1",
                params![ajout.objet_du_voyage, ajout.objet.id],
            )
            .map_err(en_texte)?;
        if liees == 0 {
            return Err(objet_inconnu());
        }
        if let Some(categorie_du_voyage) = &ajout.categorie_du_voyage {
            tx.execute(
                "UPDATE categorie_du_voyage SET modele_id = ?2 WHERE id = ?1",
                params![categorie_du_voyage, ajout.objet.categorie_id],
            )
            .map_err(en_texte)?;
        }
        tx.commit().map_err(en_texte)
    }
}

#[cfg(test)]
#[path = "ajustements_essais.rs"]
mod tests;
