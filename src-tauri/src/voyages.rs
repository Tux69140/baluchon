// Les voyages : liste, création et lecture d'un voyage complet. Un voyage est une copie
// indépendante de la bibliothèque (docs/PLAN.md, « Schéma ») ; il est créé en une seule opération,
// qui n'écrit rien si une seule ligne est refusée.
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
    pub achete: bool,
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
}

const COLONNES_VOYAGE: &str = "id, nom, destination, depart, retour, voyageurs, modifie_le";
const COLONNES_ETIQUETTE: &str = "id, voyage_id, modele_id, nom, ordre, modifie_le";
const COLONNES_CATEGORIE: &str = "id, voyage_id, modele_id, nom, icone, couleur, ordre, modifie_le";
pub(crate) const COLONNES_OBJET: &str =
    "id, voyage_id, categorie_id, modele_id, nom, regle, valeur, plafond, par_personne,
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
        achete: r.get(14)?,
        note: r.get(15)?,
        modifie_le: r.get(16)?,
    })
}

// Les insertions d'une catégorie et d'un objet du voyage, partagées avec ajustements.rs : un objet
// ajouté ou rétabli s'écrit exactement comme à la création du voyage.
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
            o.achete,
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
            tx.execute(
                &format!("INSERT INTO etiquette_du_voyage ({COLONNES_ETIQUETTE}) VALUES (?1, ?2, ?3, ?4, ?5, ?6)"),
                params![e.id, e.voyage_id, e.modele_id, e.nom, e.ordre, e.modifie_le],
            )
            .map_err(en_texte)?;
        }
        for c in &contenu.categories {
            inserer_categorie(&tx, c)?;
        }
        for o in &contenu.objets {
            inserer_objet(&tx, o)?;
        }
        // Sans ce commit (erreur plus haut), la transaction abandonnée n'a rien écrit.
        tx.commit().map_err(en_texte)
    }

    // La base refuse toute valeur hors de 0..=quantité (contrainte de la table) ; aucune ligne
    // modifiée veut dire objet inconnu.
    pub fn regler_dans_le_sac(
        &self,
        id: &str,
        dans_le_sac: i64,
        modifie_le: &str,
    ) -> Result<(), String> {
        let modifiees = self
            .connexion()?
            .execute(
                "UPDATE objet_du_voyage SET dans_le_sac = ?2, modifie_le = ?3 WHERE id = ?1",
                params![id, dans_le_sac, modifie_le],
            )
            .map_err(en_texte)?;
        if modifiees == 0 {
            return Err("Objet introuvable.".to_owned());
        }
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
        Ok(Some(VoyageComplet {
            voyage,
            etiquettes,
            categories,
            objets,
        }))
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
        assert_eq!(
            base.lire_voyage("v-vercors").unwrap(),
            Some(contenu.clone())
        );
        assert_eq!(base.lister_voyages().unwrap(), vec![contenu.voyage]);
    }

    #[test]
    fn les_etiquettes_du_voyage_sont_relues_dans_l_ordre() {
        let (_dossier, base) = base_jetable();
        let mut contenu = contrat().voyage;
        let mut seconde = contenu.etiquettes[0].clone();
        seconde.id = "ev-froid".into();
        seconde.modele_id = None;
        seconde.nom = "Froid".into();
        seconde.ordre = 1;
        contenu.etiquettes.push(seconde);
        base.creer_voyage(&contenu).unwrap();
        let relu = base.lire_voyage("v-vercors").unwrap().unwrap();
        assert_eq!(relu.etiquettes, contenu.etiquettes);
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
        Base::ouvrir(&chemin)
            .unwrap()
            .creer_voyage(&contenu)
            .unwrap();
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

    #[test]
    fn regler_dans_le_sac_est_relu_et_survit_a_la_fermeture() {
        let dossier = Dossier::nouveau();
        let chemin = dossier.chemin.join("essai.sqlite3");
        let contenu = contrat().voyage;
        let id = contenu.objets[0].id.clone();
        Base::ouvrir(&chemin)
            .unwrap()
            .creer_voyage(&contenu)
            .unwrap();
        Base::ouvrir(&chemin)
            .unwrap()
            .regler_dans_le_sac(&id, 1, "2026-10-24T10:00:00.000Z")
            .unwrap();
        let relu = Base::ouvrir(&chemin)
            .unwrap()
            .lire_voyage("v-vercors")
            .unwrap()
            .unwrap();
        assert_eq!(relu.objets[0].dans_le_sac, 1);
        assert_eq!(relu.objets[0].modifie_le, "2026-10-24T10:00:00.000Z");
    }

    #[test]
    fn regler_dans_le_sac_refuse_hors_bornes_et_objet_inconnu() {
        let (_dossier, base) = base_jetable();
        let contenu = contrat().voyage;
        let objet = contenu.objets[0].clone();
        base.creer_voyage(&contenu).unwrap();
        assert!(base.regler_dans_le_sac(&objet.id, -1, "x").is_err());
        assert!(base
            .regler_dans_le_sac(&objet.id, objet.quantite + 1, "x")
            .is_err());
        assert!(base.regler_dans_le_sac("inconnu", 0, "x").is_err());
        let relu = base.lire_voyage("v-vercors").unwrap().unwrap();
        assert_eq!(relu.objets[0].dans_le_sac, objet.dans_le_sac);
        assert_eq!(relu.objets[0].modifie_le, objet.modifie_le);
    }

    #[test]
    fn etats_des_objets_donne_quantite_et_pieces_de_chaque_objet() {
        let (_dossier, base) = base_jetable();
        let contenu = contrat().voyage;
        base.creer_voyage(&contenu).unwrap();
        let etats = base.etats_des_objets().unwrap();
        assert_eq!(etats.len(), contenu.objets.len());
        assert!(etats.iter().all(|e| e.voyage_id == "v-vercors"));
        let quantites: Vec<_> = etats.iter().map(|e| (e.quantite, e.dans_le_sac)).collect();
        let attendues: Vec<_> = contenu
            .objets
            .iter()
            .map(|o| (o.quantite, o.dans_le_sac))
            .collect();
        assert_eq!(quantites, attendues);
    }
}
