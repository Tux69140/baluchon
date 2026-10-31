// Quand les plans changent (phase 10) : la modification d'un voyage — informations, étiquettes,
// objets et catégories — calculée par le modèle (src/modele/changements.js), écrite en une seule
// transaction : refusée, elle ne laisse rien d'écrit. S'y ajoutent les deux gestes d'un objet retiré
// qui attend la sortie de ses pièces : « Plus tard » (marquer_retire) et « Le garder dans le voyage ».
use crate::ajustements::{ecarter, ne_plus_ecarter, verifier_sac};
use crate::base::{en_texte, Base};
use crate::voyages::{
    inserer_categorie, inserer_etiquette, inserer_objet, CategorieDuVoyage, EtiquetteDuVoyage,
    ObjetDuVoyage, Voyage,
};
use rusqlite::{params, Transaction};
use serde::Deserialize;

#[derive(Debug, Clone, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ModificationDuVoyage {
    pub voyage: Voyage,
    pub etiquettes: Vec<EtiquetteDuVoyage>,
    pub categories_ajoutees: Vec<CategorieDuVoyage>,
    pub objets_ajoutes: Vec<ObjetDuVoyage>,
    pub objets_modifies: Vec<ObjetDuVoyage>,
    pub objets_retires: Vec<String>,
    pub categories_retirees: Vec<String>,
    // La liste complète des modèles écartés après la modification (obligatoire, sans valeur par défaut) :
    // elle remplace celle du voyage (« Choix de l'agent », conception de la phase 11).
    pub ecartes: Vec<String>,
}

fn refus(texte: &str) -> String {
    texte.to_owned()
}

// Une écriture qui devait toucher exactement une ligne.
fn une_ligne(modifiees: usize, texte: &str) -> Result<(), String> {
    if modifiees == 1 {
        Ok(())
    } else {
        Err(refus(texte))
    }
}

// Tout le contenu nommé doit appartenir au voyage modifié ; la base ne vérifie que l'existence.
fn verifier_appartenance(m: &ModificationDuVoyage) -> Result<(), String> {
    let v = &m.voyage.id;
    let a_lui = m.etiquettes.iter().all(|e| &e.voyage_id == v)
        && m.categories_ajoutees.iter().all(|c| &c.voyage_id == v)
        && m.objets_ajoutes.iter().all(|o| &o.voyage_id == v)
        && m.objets_modifies.iter().all(|o| &o.voyage_id == v);
    if a_lui {
        Ok(())
    } else {
        Err(refus("La modification touche un autre voyage."))
    }
}

fn reecrire_objet(tx: &Transaction, o: &ObjetDuVoyage) -> Result<(), String> {
    verifier_sac(tx, &o.id, Some(o.quantite), o.dans_le_sac)?;
    let modifiees = tx
        .execute(
            "UPDATE objet_du_voyage SET categorie_id = ?3, modele_id = ?4, nom = ?5, regle = ?6,
               valeur = ?7, plafond = ?8, par_personne = ?9, consommable = ?10, quantite = ?11,
               quantite_manuelle = ?12, dans_le_sac = ?13, a_acheter = ?14, achetes = ?15, note = ?16,
               modifie_le = ?17
             WHERE id = ?1 AND voyage_id = ?2",
            params![
                o.id,
                o.voyage_id,
                o.categorie_id,
                o.modele_id,
                o.nom,
                o.regle,
                o.valeur,
                o.plafond,
                o.par_personne,
                o.consommable,
                o.quantite,
                o.quantite_manuelle,
                o.dans_le_sac,
                o.a_acheter,
                o.achetes,
                o.note,
                o.modifie_le
            ],
        )
        .map_err(en_texte)?;
    une_ligne(modifiees, "Objet introuvable dans ce voyage.")
}

impl Base {
    pub fn modifier_voyage(&self, m: &ModificationDuVoyage) -> Result<(), String> {
        verifier_appartenance(m)?;
        let connexion = self.connexion()?;
        let tx = connexion.unchecked_transaction().map_err(en_texte)?;
        let v = &m.voyage;
        let modifiees = tx
            .execute(
                "UPDATE voyage SET nom = ?2, destination = ?3, depart = ?4, retour = ?5,
                   voyageurs = ?6, modifie_le = ?7 WHERE id = ?1",
                params![
                    v.id,
                    v.nom,
                    v.destination,
                    v.depart,
                    v.retour,
                    v.voyageurs,
                    v.modifie_le
                ],
            )
            .map_err(en_texte)?;
        une_ligne(modifiees, "Voyage introuvable.")?;
        tx.execute(
            "DELETE FROM etiquette_du_voyage WHERE voyage_id = ?1",
            [&v.id],
        )
        .map_err(en_texte)?;
        for e in &m.etiquettes {
            inserer_etiquette(&tx, e)?;
        }
        for c in &m.categories_ajoutees {
            inserer_categorie(&tx, c)?;
        }
        for o in &m.objets_ajoutes {
            inserer_objet(&tx, o)?;
        }
        for o in &m.objets_modifies {
            reecrire_objet(&tx, o)?;
        }
        for id in &m.objets_retires {
            let retires = tx
                .execute(
                    "DELETE FROM objet_du_voyage WHERE id = ?1 AND voyage_id = ?2",
                    params![id, v.id],
                )
                .map_err(en_texte)?;
            une_ligne(retires, "Objet introuvable dans ce voyage.")?;
        }
        for id in &m.categories_retirees {
            let retirees = tx
                .execute(
                    "DELETE FROM categorie_du_voyage WHERE id = ?1 AND voyage_id = ?2
                       AND NOT EXISTS (SELECT 1 FROM objet_du_voyage WHERE categorie_id = ?1)",
                    params![id, v.id],
                )
                .map_err(en_texte)?;
            une_ligne(retirees, "Cette catégorie contient encore des objets.")?;
        }
        tx.execute("DELETE FROM objet_ecarte WHERE voyage_id = ?1", [&v.id])
            .map_err(en_texte)?;
        for modele_id in &m.ecartes {
            tx.execute(
                "INSERT OR IGNORE INTO objet_ecarte (voyage_id, modele_id) VALUES (?1, ?2)",
                params![v.id, modele_id],
            )
            .map_err(en_texte)?;
        }
        // Un objet ajouté ou modifié ne peut être rangé que dans une catégorie de son voyage.
        let egares: i64 = tx
            .query_row(
                "SELECT COUNT(*) FROM objet_du_voyage o JOIN categorie_du_voyage c ON c.id = o.categorie_id
                 WHERE o.voyage_id = ?1 AND c.voyage_id <> ?1",
                [&v.id],
                |r| r.get(0),
            )
            .map_err(en_texte)?;
        if egares > 0 {
            return Err(refus(
                "Un objet est rangé dans la catégorie d'un autre voyage.",
            ));
        }
        // Sans ce commit (erreur plus haut), la transaction abandonnée n'a rien écrit.
        tx.commit().map_err(en_texte)
    }

    // « Retirer du voyage », puis « Plus tard » : l'objet garde ses pièces dans le sac, n'est plus
    // demandé (quantité 0) ni à acheter. Sans pièce dans le sac, il n'a rien à attendre : refusé.
    // Son modèle devient écarté du voyage (« Choix de l'agent », conception de la phase 11).
    pub fn marquer_retire(&self, id: &str, modifie_le: &str) -> Result<(), String> {
        let connexion = self.connexion()?;
        let tx = connexion.unchecked_transaction().map_err(en_texte)?;
        let modifiees = tx
            .execute(
                "UPDATE objet_du_voyage SET quantite = 0, achetes = 0, modifie_le = ?2
                 WHERE id = ?1 AND dans_le_sac > 0",
                params![id, modifie_le],
            )
            .map_err(en_texte)?;
        une_ligne(modifiees, "Aucune pièce de cet objet n'est dans le sac.")?;
        ecarter(&tx, id)?;
        tx.commit().map_err(en_texte)
    }

    // « Le garder dans le voyage » : il reprend une quantité, ses pièces restent dans le sac ; tout entier
    // dans le sac, un objet à acheter compte comme acheté (le modèle donne les pièces achetées).
    pub fn garder_dans_le_voyage(
        &self,
        id: &str,
        quantite: i64,
        quantite_manuelle: bool,
        achetes: i64,
        modifie_le: &str,
    ) -> Result<(), String> {
        if quantite < 1 {
            return Err(refus("La quantité prévue est au moins de 1."));
        }
        if achetes < 0 || achetes > quantite {
            return Err(crate::courses::ACHATS_HORS_BORNES.to_owned());
        }
        let connexion = self.connexion()?;
        let tx = connexion.unchecked_transaction().map_err(en_texte)?;
        let modifiees = tx
            .execute(
                "UPDATE objet_du_voyage SET quantite = ?2, quantite_manuelle = ?3, achetes = ?4, modifie_le = ?5
                 WHERE id = ?1",
                params![id, quantite, quantite_manuelle, achetes, modifie_le],
            )
            .map_err(en_texte)?;
        une_ligne(modifiees, "Objet introuvable.")?;
        // Il revient dans le voyage : son modèle n'est plus écarté (même conception).
        ne_plus_ecarter(&tx, id)?;
        tx.commit().map_err(en_texte)
    }
}

#[cfg(test)]
#[path = "modification_essais.rs"]
mod tests;
