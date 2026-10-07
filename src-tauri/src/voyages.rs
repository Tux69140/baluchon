// Les voyages : liste, création et lecture d'un voyage complet. Un voyage est une copie
// indépendante de la bibliothèque (docs/PLAN.md, « Schéma ») ; il est créé en une seule opération,
// qui n'écrit rien si une seule ligne est refusée.
use crate::base::{en_texte, lire_lignes, Base};
use rusqlite::{params, OptionalExtension, Row};
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
    pub dans_le_sac: bool,
    pub a_acheter: bool,
    pub achete: bool,
    pub note: String,
    pub modifie_le: String,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct VoyageComplet {
    pub voyage: Voyage,
    pub categories: Vec<CategorieDuVoyage>,
    pub objets: Vec<ObjetDuVoyage>,
}

const COLONNES_VOYAGE: &str = "id, nom, destination, depart, retour, voyageurs, modifie_le";
const COLONNES_CATEGORIE: &str = "id, voyage_id, modele_id, nom, icone, couleur, ordre, modifie_le";
const COLONNES_OBJET: &str = "id, voyage_id, categorie_id, modele_id, nom, regle, valeur, plafond, par_personne,
    consommable, quantite, quantite_manuelle, dans_le_sac, a_acheter, achete, note, modifie_le";

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
        achete: r.get(14)?,
        note: r.get(15)?,
        modifie_le: r.get(16)?,
    })
}

impl Base {
    pub fn lister_voyages(&self) -> Result<Vec<Voyage>, String> {
        let connexion = self.connexion()?;
        lire_lignes(&connexion, &format!("SELECT {COLONNES_VOYAGE} FROM voyage"), [], voyage_depuis)
    }

    pub fn creer_voyage(&self, contenu: &VoyageComplet) -> Result<(), String> {
        let connexion = self.connexion()?;
        let tx = connexion.unchecked_transaction().map_err(en_texte)?;
        let v = &contenu.voyage;
        tx.execute(
            &format!("INSERT INTO voyage ({COLONNES_VOYAGE}) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)"),
            params![v.id, v.nom, v.destination, v.depart, v.retour, v.voyageurs, v.modifie_le],
        )
        .map_err(en_texte)?;
        for c in &contenu.categories {
            tx.execute(
                &format!("INSERT INTO categorie_du_voyage ({COLONNES_CATEGORIE}) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)"),
                params![c.id, c.voyage_id, c.modele_id, c.nom, c.icone, c.couleur, c.ordre, c.modifie_le],
            )
            .map_err(en_texte)?;
        }
        for o in &contenu.objets {
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
                    o.achete,
                    o.note,
                    o.modifie_le
                ],
            )
            .map_err(en_texte)?;
        }
        // Sans ce commit (erreur plus haut), la transaction abandonnée n'a rien écrit.
        tx.commit().map_err(en_texte)
    }

    pub fn lire_voyage(&self, id: &str) -> Result<Option<VoyageComplet>, String> {
        let connexion = self.connexion()?;
        let voyage = connexion
            .query_row(&format!("SELECT {COLONNES_VOYAGE} FROM voyage WHERE id = ?1"), [id], voyage_depuis)
            .optional()
            .map_err(en_texte)?;
        let Some(voyage) = voyage else { return Ok(None) };
        let categories = lire_lignes(
            &connexion,
            &format!("SELECT {COLONNES_CATEGORIE} FROM categorie_du_voyage WHERE voyage_id = ?1 ORDER BY ordre, rowid"),
            [id],
            categorie_depuis,
        )?;
        let objets = lire_lignes(
            &connexion,
            &format!("SELECT {COLONNES_OBJET} FROM objet_du_voyage WHERE voyage_id = ?1 ORDER BY rowid"),
            [id],
            objet_depuis,
        )?;
        Ok(Some(VoyageComplet { voyage, categories, objets }))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::essais::{base_jetable, contrat, Dossier};

    #[test]
    fn une_base_neuve_ne_contient_aucun_voyage() {
        let (_dossier, base) = base_jetable();
        assert_eq!(base.lister_voyages().unwrap(), vec![]);
    }

    #[test]
    fn un_voyage_cree_est_relu_a_l_identique() {
        let (_dossier, base) = base_jetable();
        let contenu = contrat().voyage;
        base.creer_voyage(&contenu).unwrap();
        assert_eq!(base.lire_voyage("v-vercors").unwrap(), Some(contenu.clone()));
        assert_eq!(base.lister_voyages().unwrap(), vec![contenu.voyage]);
    }

    #[test]
    fn un_voyage_inconnu_se_lit_comme_absent() {
        let (_dossier, base) = base_jetable();
        assert_eq!(base.lire_voyage("inconnu").unwrap(), None);
    }

    #[test]
    fn une_creation_refusee_n_ecrit_rien() {
        let (_dossier, base) = base_jetable();
        let mut contenu = contrat().voyage;
        contenu.objets[1].categorie_id = "categorie-inconnue".into();
        assert!(base.creer_voyage(&contenu).is_err());
        assert_eq!(base.lister_voyages().unwrap(), vec![]);
        let categories: i64 = base
            .connexion()
            .unwrap()
            .query_row("SELECT COUNT(*) FROM categorie_du_voyage", [], |r| r.get(0))
            .unwrap();
        assert_eq!(categories, 0);
    }

    #[test]
    fn un_voyage_cree_survit_a_la_fermeture_de_la_base() {
        let dossier = Dossier::nouveau();
        let chemin = dossier.chemin.join("essai.sqlite3");
        let contenu = contrat().voyage;
        Base::ouvrir(&chemin).unwrap().creer_voyage(&contenu).unwrap();
        let rouverte = Base::ouvrir(&chemin).unwrap();
        assert_eq!(rouverte.lire_voyage("v-vercors").unwrap(), Some(contenu));
    }

    #[test]
    fn un_voyage_enregistre_est_relu_tel_quel() {
        let (_dossier, base) = base_jetable();
        base.connexion()
            .unwrap()
            .execute(
                "INSERT INTO voyage (id, nom, destination, depart, retour, voyageurs, modifie_le)
                 VALUES ('v1', 'Vercors', 'Autrans', '2026-10-10', '2026-10-13', 2, '2026-10-06T09:00:00Z')",
                [],
            )
            .unwrap();
        assert_eq!(
            base.lister_voyages().unwrap(),
            vec![Voyage {
                id: "v1".into(),
                nom: "Vercors".into(),
                destination: "Autrans".into(),
                depart: "2026-10-10".into(),
                retour: "2026-10-13".into(),
                voyageurs: 2,
                modifie_le: "2026-10-06T09:00:00Z".into(),
            }]
        );
    }
}
