// La bibliothèque de l'utilisateur : installée une seule fois depuis la bibliothèque de départ
// (construite par le modèle, src/modele/bibliotheque.js), puis lue pour générer les voyages.
use crate::base::{en_texte, lire_lignes, Base};
use rusqlite::{params, Connection, Row};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CategorieModele {
    pub id: String,
    pub nom: String,
    pub icone: String,
    pub couleur: String,
    pub ordre: i64,
    pub toujours_incluse: bool,
    pub modifie_le: String,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ObjetModele {
    pub id: String,
    pub categorie_id: String,
    pub nom: String,
    pub regle: String,
    pub valeur: i64,
    pub plafond: Option<i64>,
    pub par_personne: bool,
    pub consommable: bool,
    pub toujours_inclus: bool,
    pub note: String,
    pub modifie_le: String,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Bibliotheque {
    pub categories: Vec<CategorieModele>,
    pub objets: Vec<ObjetModele>,
}

const INSTALLEE: &str = "bibliotheque_installee";

fn est_installee(connexion: &Connection) -> Result<bool, String> {
    connexion
        .query_row("SELECT COUNT(*) FROM meta WHERE cle = ?1", [INSTALLEE], |r| r.get::<_, i64>(0))
        .map(|n| n > 0)
        .map_err(en_texte)
}

fn categorie_depuis(r: &Row<'_>) -> rusqlite::Result<CategorieModele> {
    Ok(CategorieModele {
        id: r.get(0)?,
        nom: r.get(1)?,
        icone: r.get(2)?,
        couleur: r.get(3)?,
        ordre: r.get(4)?,
        toujours_incluse: r.get(5)?,
        modifie_le: r.get(6)?,
    })
}

fn objet_depuis(r: &Row<'_>) -> rusqlite::Result<ObjetModele> {
    Ok(ObjetModele {
        id: r.get(0)?,
        categorie_id: r.get(1)?,
        nom: r.get(2)?,
        regle: r.get(3)?,
        valeur: r.get(4)?,
        plafond: r.get(5)?,
        par_personne: r.get(6)?,
        consommable: r.get(7)?,
        toujours_inclus: r.get(8)?,
        note: r.get(9)?,
        modifie_le: r.get(10)?,
    })
}

impl Base {
    pub fn bibliotheque_installee(&self) -> Result<bool, String> {
        let connexion = self.connexion()?;
        est_installee(&connexion)
    }

    // Vérification et écriture dans une seule opération : une erreur ne laisse jamais une
    // bibliothèque à moitié installée, et un second appel ne l'installe pas deux fois.
    // Renvoie false si elle était déjà là (rien n'est écrit).
    pub fn installer_bibliotheque(&self, bibliotheque: &Bibliotheque, langue: &str) -> Result<bool, String> {
        let connexion = self.connexion()?;
        let tx = connexion.unchecked_transaction().map_err(en_texte)?;
        if est_installee(&tx)? {
            return Ok(false);
        }
        for c in &bibliotheque.categories {
            tx.execute(
                "INSERT INTO categorie_modele (id, nom, icone, couleur, ordre, toujours_incluse, modifie_le)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
                params![c.id, c.nom, c.icone, c.couleur, c.ordre, c.toujours_incluse, c.modifie_le],
            )
            .map_err(en_texte)?;
        }
        for o in &bibliotheque.objets {
            tx.execute(
                "INSERT INTO objet_modele (id, categorie_id, nom, regle, valeur, plafond, par_personne,
                   consommable, toujours_inclus, note, modifie_le)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)",
                params![
                    o.id,
                    o.categorie_id,
                    o.nom,
                    o.regle,
                    o.valeur,
                    o.plafond,
                    o.par_personne,
                    o.consommable,
                    o.toujours_inclus,
                    o.note,
                    o.modifie_le
                ],
            )
            .map_err(en_texte)?;
        }
        tx.execute(
            "INSERT INTO meta (cle, valeur) VALUES (?1, '1'), ('langue_bibliotheque', ?2)",
            params![INSTALLEE, langue],
        )
        .map_err(en_texte)?;
        tx.commit().map_err(en_texte)?;
        Ok(true)
    }

    pub fn lire_bibliotheque(&self) -> Result<Bibliotheque, String> {
        let connexion = self.connexion()?;
        let categories = lire_lignes(
            &connexion,
            "SELECT id, nom, icone, couleur, ordre, toujours_incluse, modifie_le
             FROM categorie_modele ORDER BY ordre, rowid",
            [],
            categorie_depuis,
        )?;
        let objets = lire_lignes(
            &connexion,
            "SELECT o.id, o.categorie_id, o.nom, o.regle, o.valeur, o.plafond, o.par_personne,
                    o.consommable, o.toujours_inclus, o.note, o.modifie_le
             FROM objet_modele o JOIN categorie_modele c ON c.id = o.categorie_id
             ORDER BY c.ordre, o.rowid",
            [],
            objet_depuis,
        )?;
        Ok(Bibliotheque { categories, objets })
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::essais::{base_jetable, contrat};

    fn langue(base: &Base) -> Option<String> {
        base.connexion()
            .unwrap()
            .query_row("SELECT valeur FROM meta WHERE cle = 'langue_bibliotheque'", [], |r| r.get(0))
            .ok()
    }

    #[test]
    fn une_bibliotheque_installee_est_relue_a_l_identique() {
        let (_dossier, base) = base_jetable();
        assert!(!base.bibliotheque_installee().unwrap());
        let bibliotheque = contrat().bibliotheque;
        assert!(base.installer_bibliotheque(&bibliotheque, "fr").unwrap());
        assert!(base.bibliotheque_installee().unwrap());
        assert_eq!(base.lire_bibliotheque().unwrap(), bibliotheque);
        assert_eq!(langue(&base).as_deref(), Some("fr"));
    }

    #[test]
    fn la_bibliotheque_ne_s_installe_qu_une_fois() {
        let (_dossier, base) = base_jetable();
        let premiere = contrat().bibliotheque;
        base.installer_bibliotheque(&premiere, "fr").unwrap();
        let mut seconde = contrat().bibliotheque;
        seconde.categories[0].nom = "Autre".into();
        seconde.categories[0].id = "autre".into();
        seconde.objets.clear();
        assert!(!base.installer_bibliotheque(&seconde, "en").unwrap());
        assert_eq!(base.lire_bibliotheque().unwrap(), premiere);
        assert_eq!(langue(&base).as_deref(), Some("fr"));
    }

    #[test]
    fn une_installation_refusee_n_ecrit_rien() {
        let (_dossier, base) = base_jetable();
        let mut bibliotheque = contrat().bibliotheque;
        bibliotheque.objets[1].categorie_id = "categorie-inconnue".into();
        assert!(base.installer_bibliotheque(&bibliotheque, "fr").is_err());
        assert!(!base.bibliotheque_installee().unwrap());
        assert_eq!(base.lire_bibliotheque().unwrap().categories, vec![]);
    }
}
