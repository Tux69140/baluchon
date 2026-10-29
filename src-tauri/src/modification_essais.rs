// Les tests de la modification d'un voyage (modification.rs), à part pour garder chaque fichier court.
use super::*;
use crate::essais::{base_jetable, contrat, Dossier};
use crate::voyages::VoyageComplet;

const MAINTENANT: &str = "2026-10-29T10:00:00.000Z";

fn base_avec_voyage() -> (Dossier, Base, VoyageComplet) {
    let (dossier, base) = base_jetable();
    let contenu = contrat().voyage;
    base.creer_voyage(&contenu).unwrap();
    (dossier, base, contenu)
}

#[test]
fn une_modification_complete_est_relue_a_l_identique() {
    let (_dossier, base, _avant) = base_avec_voyage();
    let m = contrat().modification;
    base.modifier_voyage(&m).unwrap();
    let relu = base.lire_voyage("v-vercors").unwrap().unwrap();
    assert_eq!(relu.voyage, m.voyage);
    assert_eq!(relu.etiquettes, m.etiquettes);
    assert_eq!(relu.categories.len(), 2);
    assert!(relu.categories.contains(&m.categories_ajoutees[0]));
    assert!(!relu.categories.iter().any(|c| c.id == "cv-vetements"));
    assert_eq!(relu.objets.len(), 2);
    assert!(relu.objets.contains(&m.objets_ajoutes[0]));
    assert!(relu.objets.contains(&m.objets_modifies[0]));
}

#[test]
fn une_modification_qui_touche_un_autre_voyage_n_ecrit_rien() {
    let (_dossier, base, avant) = base_avec_voyage();
    let mut m = contrat().modification;
    m.objets_modifies[0].voyage_id = "v-autre".into();
    assert!(base.modifier_voyage(&m).is_err());
    assert_eq!(base.lire_voyage("v-vercors").unwrap().unwrap(), avant);
}

#[test]
fn une_categorie_retiree_encore_occupee_est_refusee_sans_rien_ecrire() {
    let (_dossier, base, avant) = base_avec_voyage();
    let mut m = contrat().modification;
    m.objets_retires.clear();
    assert!(base.modifier_voyage(&m).is_err());
    assert_eq!(base.lire_voyage("v-vercors").unwrap().unwrap(), avant);
}

#[test]
fn une_modification_ne_cree_pas_de_pieces_de_trop() {
    let (_dossier, base, avant) = base_avec_voyage();
    let mut m = contrat().modification;
    m.objets_modifies[0].dans_le_sac = 25;
    assert!(base.modifier_voyage(&m).is_err());
    assert_eq!(base.lire_voyage("v-vercors").unwrap().unwrap(), avant);
}

#[test]
fn marquer_retire_garde_le_sac_et_vide_la_quantite() {
    let (_dossier, base, _avant) = base_avec_voyage();
    base.marquer_retire("ov-tshirts", MAINTENANT).unwrap();
    let relu = base.lire_voyage("v-vercors").unwrap().unwrap();
    let tshirts = relu.objets.iter().find(|o| o.id == "ov-tshirts").unwrap();
    assert_eq!(
        (tshirts.quantite, tshirts.dans_le_sac, tshirts.achetes),
        (0, 3, 0)
    );
    assert!(base.marquer_retire("ov-repas", MAINTENANT).is_err());
}

#[test]
fn garder_dans_le_voyage_rend_une_quantite_et_garde_le_sac() {
    let (_dossier, base, _avant) = base_avec_voyage();
    base.marquer_retire("ov-tshirts", MAINTENANT).unwrap();
    assert!(base
        .garder_dans_le_voyage("ov-tshirts", 0, false, MAINTENANT)
        .is_err());
    base.garder_dans_le_voyage("ov-tshirts", 8, false, MAINTENANT)
        .unwrap();
    let relu = base.lire_voyage("v-vercors").unwrap().unwrap();
    let tshirts = relu.objets.iter().find(|o| o.id == "ov-tshirts").unwrap();
    assert_eq!(
        (
            tshirts.quantite,
            tshirts.dans_le_sac,
            tshirts.quantite_manuelle
        ),
        (8, 3, false)
    );
}
