// Les voyages : liste, création et lecture d'un voyage complet. Un voyage est une copie
// indépendante de la bibliothèque (docs/PLAN.md, « Schéma ») ; il est créé en une seule opération,
// qui n'écrit rien si une seule ligne est refusée.
use crate::ajustements::verifier_sac;
use crate::base::{en_texte, lire_lignes, Base};
use rusqlite::{params, OptionalExtension, Row, Transaction};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Voyage {
    pub id: String,
    pub nom: String,
    pub destination: String,
    pub depart: String,
    pub retour: String,
    pub voyageurs: i64,
    pub modifie_le: String,
}

// Copie d'une étiquette de la bibliothèque, propre au voyage ; modele_id garde l'origine sans lien contraint.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EtiquetteDuVoyage {
    pub id: String,
    pub voyage_id: String,
    pub modele_id: Option<String>,
    pub nom: String,
    pub ordre: i64,
    pub modifie_le: String,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CategorieDuVoyage {
    pub id: String,
    pub voyage_id: String,
    pub modele_id: Option<String>,
    pub nom: String,
    pub icone: String,
    pub couleur: String,
    pub ordre: i64,
    pub modifie_le: String,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ObjetDuVoyage {
    pub id: String,
    pub voyage_id: String,
    pub categorie_id: String,
    pub modele_id: Option<String>,
    pub nom: String,
    pub regle: String,
    pub valeur: i64,
    pub plafond: Option<i64>,
    pub par_personne: bool,
    pub consommable: bool,
    pub quantite: i64,
    pub quantite_manuelle: bool,
    pub dans_le_sac: i64,
    pub a_acheter: bool,
    // Les pièces achetées, de 0 à la quantité (phase 9), comptées comme celles du sac.
    pub achetes: i64,
    pub note: String,
    pub modifie_le: String,
}

// Ce qu'il faut pour compter l'avancement de tous les voyages sans lire leur contenu.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EtatObjet {
    pub voyage_id: String,
    pub quantite: i64,
    pub dans_le_sac: i64,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct VoyageComplet {
    pub voyage: Voyage,
    pub etiquettes: Vec<EtiquetteDuVoyage>,
    pub categories: Vec<CategorieDuVoyage>,
    pub objets: Vec<ObjetDuVoyage>,
    // Les objets modèles écartés à la création (phase 11), triés ; absents d'un contenu d'avant : vide.
    #[serde(default)]
    pub ecartes: Vec<String>,
}

const COLONNES_VOYAGE: &str = "id, nom, destination, depart, retour, voyageurs, modifie_le";
const COLONNES_ETIQUETTE: &str = "id, voyage_id, modele_id, nom, ordre, modifie_le";
const COLONNES_CATEGORIE: &str = "id, voyage_id, modele_id, nom, icone, couleur, ordre, modifie_le";
const COLONNES_OBJET: &str =
    "id, voyage_id, categorie_id, modele_id, nom, regle, valeur, plafond, par_personne,
    consommable, quantite, quantite_manuelle, dans_le_sac, a_acheter, achetes, note, modifie_le";

fn voyage_depuis(r: &Row<'_>) -> rusqlite::Result<Voyage> {
    Ok(Voyage {
        id: r.get(0)?,
        nom: r.get(1)?,
        destination: r.get(2)?,
        depart: r.get(3)?,
        retour: r.get(4)?,
        voyageurs: r.get(5)?,
        modifie_le: r.get(6)?,
    })
}

fn etiquette_depuis(r: &Row<'_>) -> rusqlite::Result<EtiquetteDuVoyage> {
    Ok(EtiquetteDuVoyage {
        id: r.get(0)?,
        voyage_id: r.get(1)?,
        modele_id: r.get(2)?,
        nom: r.get(3)?,
        ordre: r.get(4)?,
        modifie_le: r.get(5)?,
    })
}

fn categorie_depuis(r: &Row<'_>) -> rusqlite::Result<CategorieDuVoyage> {
    Ok(CategorieDuVoyage {
        id: r.get(0)?,
        voyage_id: r.get(1)?,
        modele_id: r.get(2)?,
        nom: r.get(3)?,
        icone: r.get(4)?,
        couleur: r.get(5)?,
        ordre: r.get(6)?,
        modifie_le: r.get(7)?,
    })
}

fn objet_depuis(r: &Row<'_>) -> rusqlite::Result<ObjetDuVoyage> {
    Ok(ObjetDuVoyage {
        id: r.get(0)?,
        voyage_id: r.get(1)?,
        categorie_id: r.get(2)?,
        modele_id: r.get(3)?,
        nom: r.get(4)?,
        regle: r.get(5)?,
        valeur: r.get(6)?,
        plafond: r.get(7)?,
        par_personne: r.get(8)?,
        consommable: r.get(9)?,
        quantite: r.get(10)?,
        quantite_manuelle: r.get(11)?,
        dans_le_sac: r.get(12)?,
        a_acheter: r.get(13)?,
        achetes: r.get(14)?,
        note: r.get(15)?,
        modifie_le: r.get(16)?,
    })
}

// Les insertions d'une étiquette, d'une catégorie et d'un objet du voyage, partagées avec
// ajustements.rs et modification.rs : ce qui est ajouté ou rétabli s'écrit comme à la création.
pub(crate) fn inserer_etiquette(tx: &Transaction, e: &EtiquetteDuVoyage) -> Result<(), String> {
    tx.execute(
        &format!("INSERT INTO etiquette_du_voyage ({COLONNES_ETIQUETTE}) VALUES (?1, ?2, ?3, ?4, ?5, ?6)"),
        params![e.id, e.voyage_id, e.modele_id, e.nom, e.ordre, e.modifie_le],
    )
    .map_err(en_texte)?;
    Ok(())
}

pub(crate) fn inserer_categorie(tx: &Transaction, c: &CategorieDuVoyage) -> Result<(), String> {
    tx.execute(
        &format!("INSERT INTO categorie_du_voyage ({COLONNES_CATEGORIE}) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)"),
        params![c.id, c.voyage_id, c.modele_id, c.nom, c.icone, c.couleur, c.ordre, c.modifie_le],
    )
    .map_err(en_texte)?;
    Ok(())
}

pub(crate) fn inserer_objet(tx: &Transaction, o: &ObjetDuVoyage) -> Result<(), String> {
    tx.execute(
        &format!(
            "INSERT INTO objet_du_voyage ({COLONNES_OBJET})
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17)"
        ),
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
    Ok(())
}

impl Base {
    pub fn lister_voyages(&self) -> Result<Vec<Voyage>, String> {
        let connexion = self.connexion()?;
        lire_lignes(
            &connexion,
            &format!("SELECT {COLONNES_VOYAGE} FROM voyage"),
            [],
            voyage_depuis,
        )
    }

    pub fn creer_voyage(&self, contenu: &VoyageComplet) -> Result<(), String> {
        let connexion = self.connexion()?;
        let tx = connexion.unchecked_transaction().map_err(en_texte)?;
        let v = &contenu.voyage;
        tx.execute(
            &format!("INSERT INTO voyage ({COLONNES_VOYAGE}) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)"),
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
        for e in &contenu.etiquettes {
            inserer_etiquette(&tx, e)?;
        }
        for c in &contenu.categories {
            inserer_categorie(&tx, c)?;
        }
        for o in &contenu.objets {
            inserer_objet(&tx, o)?;
        }
        for modele_id in &contenu.ecartes {
            tx.execute(
                "INSERT INTO objet_ecarte (voyage_id, modele_id) VALUES (?1, ?2)",
                params![v.id, modele_id],
            )
            .map_err(en_texte)?;
        }
        // Sans ce commit (erreur plus haut), la transaction abandonnée n'a rien écrit.
        tx.commit().map_err(en_texte)
    }

    // Le sac reste dans ses bornes (verifier_sac : un excédent ne fait que décroître). Les pièces
    // achetées s'écrivent avec : un objet à acheter mis en entier dans le sac compte comme acheté
    // (règle du modèle, src/modele/courses.js).
    pub fn regler_dans_le_sac(
        &self,
        id: &str,
        dans_le_sac: i64,
        achetes: i64,
        modifie_le: &str,
    ) -> Result<(), String> {
        let connexion = self.connexion()?;
        verifier_sac(&connexion, id, None, dans_le_sac)?;
        connexion
            .execute(
                "UPDATE objet_du_voyage SET dans_le_sac = ?2, achetes = ?3, modifie_le = ?4 WHERE id = ?1",
                params![id, dans_le_sac, achetes, modifie_le],
            )
            .map_err(en_texte)?;
        Ok(())
    }

    pub fn etats_des_objets(&self) -> Result<Vec<EtatObjet>, String> {
        let connexion = self.connexion()?;
        lire_lignes(
            &connexion,
            "SELECT voyage_id, quantite, dans_le_sac FROM objet_du_voyage ORDER BY rowid",
            [],
            |r| {
                Ok(EtatObjet {
                    voyage_id: r.get(0)?,
                    quantite: r.get(1)?,
                    dans_le_sac: r.get(2)?,
                })
            },
        )
    }

    pub fn lire_voyage(&self, id: &str) -> Result<Option<VoyageComplet>, String> {
        let connexion = self.connexion()?;
        let voyage = connexion
            .query_row(
                &format!("SELECT {COLONNES_VOYAGE} FROM voyage WHERE id = ?1"),
                [id],
                voyage_depuis,
            )
            .optional()
            .map_err(en_texte)?;
        let Some(voyage) = voyage else {
            return Ok(None);
        };
        let etiquettes = lire_lignes(
            &connexion,
            &format!("SELECT {COLONNES_ETIQUETTE} FROM etiquette_du_voyage WHERE voyage_id = ?1 ORDER BY ordre, rowid"),
            [id],
            etiquette_depuis,
        )?;
        let categories = lire_lignes(
            &connexion,
            &format!("SELECT {COLONNES_CATEGORIE} FROM categorie_du_voyage WHERE voyage_id = ?1 ORDER BY ordre, rowid"),
            [id],
            categorie_depuis,
        )?;
        let objets = lire_lignes(
            &connexion,
            &format!(
                "SELECT {COLONNES_OBJET} FROM objet_du_voyage WHERE voyage_id = ?1 ORDER BY rowid"
            ),
            [id],
            objet_depuis,
        )?;
        let ecartes = lire_lignes(
            &connexion,
            "SELECT modele_id FROM objet_ecarte WHERE voyage_id = ?1 ORDER BY modele_id",
            [id],
            |r| r.get(0),
        )?;
        Ok(Some(VoyageComplet {
            voyage,
            etiquettes,
            categories,
            objets,
            ecartes,
        }))
    }

    // Efface le voyage ; les ON DELETE CASCADE emportent ses étiquettes, catégories, objets et écartés.
    // La bibliothèque n'est pas touchée.
    pub fn supprimer_voyage(&self, id: &str) -> Result<(), String> {
        let connexion = self.connexion()?;
        let lignes = connexion
            .execute("DELETE FROM voyage WHERE id = ?1", [id])
            .map_err(en_texte)?;
        if lignes == 0 {
            return Err(format!("Voyage inconnu : {id}"));
        }
        Ok(())
    }
}

#[cfg(test)]
#[path = "voyages_essais.rs"]
mod tests;
