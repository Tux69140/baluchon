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
    // Ids des étiquettes liées ; vide = « toujours incluse » côté assistant.
    pub etiquettes: Vec<String>,
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
    pub etiquettes: Vec<String>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GroupeEtiquettes {
    pub id: String,
    pub nom: String,
    pub ordre: i64,
    pub modifie_le: String,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Etiquette {
    pub id: String,
    pub groupe_id: String,
    pub nom: String,
    pub ordre: i64,
    pub modifie_le: String,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Bibliotheque {
    pub groupes: Vec<GroupeEtiquettes>,
    pub etiquettes: Vec<Etiquette>,
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
        etiquettes: vec![],
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
        etiquettes: vec![],
    })
}

fn groupe_depuis(r: &Row<'_>) -> rusqlite::Result<GroupeEtiquettes> {
    Ok(GroupeEtiquettes { id: r.get(0)?, nom: r.get(1)?, ordre: r.get(2)?, modifie_le: r.get(3)? })
}

fn etiquette_depuis(r: &Row<'_>) -> rusqlite::Result<Etiquette> {
    Ok(Etiquette { id: r.get(0)?, groupe_id: r.get(1)?, nom: r.get(2)?, ordre: r.get(3)?, modifie_le: r.get(4)? })
}

// Les liens d'une table (modèle, étiquette) dans l'ordre d'écriture, regroupés par modèle.
fn liens(connexion: &Connection, table: &str, colonne: &str) -> Result<Vec<(String, String)>, String> {
    lire_lignes(
        connexion,
        &format!("SELECT {colonne}, etiquette_id FROM {table} ORDER BY rowid"),
        [],
        |r| Ok((r.get(0)?, r.get(1)?)),
    )
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
        for g in &bibliotheque.groupes {
            tx.execute(
                "INSERT INTO groupe_etiquettes (id, nom, ordre, modifie_le) VALUES (?1, ?2, ?3, ?4)",
                params![g.id, g.nom, g.ordre, g.modifie_le],
            )
            .map_err(en_texte)?;
        }
        for e in &bibliotheque.etiquettes {
            tx.execute(
                "INSERT INTO etiquette (id, groupe_id, nom, ordre, modifie_le) VALUES (?1, ?2, ?3, ?4, ?5)",
                params![e.id, e.groupe_id, e.nom, e.ordre, e.modifie_le],
            )
            .map_err(en_texte)?;
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
        // Les liens viennent après les modèles et les étiquettes qu'ils relient.
        for c in &bibliotheque.categories {
            for etiquette in &c.etiquettes {
                tx.execute(
                    "INSERT INTO categorie_modele_etiquette (categorie_id, etiquette_id) VALUES (?1, ?2)",
                    params![c.id, etiquette],
                )
                .map_err(en_texte)?;
            }
        }
        for o in &bibliotheque.objets {
            for etiquette in &o.etiquettes {
                tx.execute(
                    "INSERT INTO objet_modele_etiquette (objet_id, etiquette_id) VALUES (?1, ?2)",
                    params![o.id, etiquette],
                )
                .map_err(en_texte)?;
            }
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
        let groupes = lire_lignes(
            &connexion,
            "SELECT id, nom, ordre, modifie_le FROM groupe_etiquettes ORDER BY ordre, rowid",
            [],
            groupe_depuis,
        )?;
        let etiquettes = lire_lignes(
            &connexion,
            "SELECT id, groupe_id, nom, ordre, modifie_le FROM etiquette ORDER BY ordre, rowid",
            [],
            etiquette_depuis,
        )?;
        let mut categories = lire_lignes(
            &connexion,
            "SELECT id, nom, icone, couleur, ordre, toujours_incluse, modifie_le
             FROM categorie_modele ORDER BY ordre, rowid",
            [],
            categorie_depuis,
        )?;
        let mut objets = lire_lignes(
            &connexion,
            "SELECT o.id, o.categorie_id, o.nom, o.regle, o.valeur, o.plafond, o.par_personne,
                    o.consommable, o.toujours_inclus, o.note, o.modifie_le
             FROM objet_modele o JOIN categorie_modele c ON c.id = o.categorie_id
             ORDER BY c.ordre, o.rowid",
            [],
            objet_depuis,
        )?;
        for (categorie, etiquette) in liens(&connexion, "categorie_modele_etiquette", "categorie_id")? {
            if let Some(c) = categories.iter_mut().find(|c| c.id == categorie) {
                c.etiquettes.push(etiquette);
            }
        }
        for (objet, etiquette) in liens(&connexion, "objet_modele_etiquette", "objet_id")? {
            if let Some(o) = objets.iter_mut().find(|o| o.id == objet) {
                o.etiquettes.push(etiquette);
            }
        }
        Ok(Bibliotheque { groupes, etiquettes, categories, objets })
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

    #[test]
    fn une_etiquette_inconnue_refuse_l_installation_sans_rien_ecrire() {
        let (_dossier, base) = base_jetable();
        let mut bibliotheque = contrat().bibliotheque;
        bibliotheque.objets[0].etiquettes = vec!["etiquette-inconnue".into()];
        assert!(base.installer_bibliotheque(&bibliotheque, "fr").is_err());
        assert!(!base.bibliotheque_installee().unwrap());
        let connexion = base.connexion().unwrap();
        for table in ["groupe_etiquettes", "etiquette", "categorie_modele_etiquette", "objet_modele_etiquette"] {
            let lignes: i64 = connexion
                .query_row(&format!("SELECT COUNT(*) FROM {table}"), [], |r| r.get(0))
                .unwrap();
            assert_eq!(lignes, 0, "{table} devrait être vide");
        }
    }

    #[test]
    fn les_liens_d_etiquettes_gardent_leur_ordre_d_ecriture() {
        let (_dossier, base) = base_jetable();
        let mut bibliotheque = contrat().bibliotheque;
        bibliotheque.objets[0].etiquettes = vec!["et-froid".into(), "et-camping".into()];
        base.installer_bibliotheque(&bibliotheque, "fr").unwrap();
        assert_eq!(base.lire_bibliotheque().unwrap().objets[0].etiquettes, vec!["et-froid", "et-camping"]);
    }
}
