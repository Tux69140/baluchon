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
        .garder_dans_le_voyage("ov-tshirts", 0, false, 0, MAINTENANT)
        .is_err());
    assert!(base
        .garder_dans_le_voyage("ov-tshirts", 3, true, 4, MAINTENANT)
        .is_err());
    base.garder_dans_le_voyage("ov-tshirts", 3, true, 3, MAINTENANT)
        .unwrap();
    let relu = base.lire_voyage("v-vercors").unwrap().unwrap();
    let tshirts = relu.objets.iter().find(|o| o.id == "ov-tshirts").unwrap();
    assert_eq!(
        (
            tshirts.quantite,
            tshirts.dans_le_sac,
            tshirts.quantite_manuelle,
            tshirts.achetes
        ),
        (3, 3, true, 3)
    );
}

fn ecartes_de(base: &Base) -> Vec<String> {
    base.lire_voyage("v-vercors").unwrap().unwrap().ecartes
}

#[test]
fn marquer_retire_ecarte_le_modele_et_le_garder_dans_le_voyage_le_fait_revenir() {
    let (_dossier, base, _avant) = base_avec_voyage();
    base.marquer_retire("ov-tshirts", MAINTENANT).unwrap();
    assert_eq!(ecartes_de(&base), ["om-cartes", "om-tshirts"]);
    base.garder_dans_le_voyage("ov-tshirts", 3, false, 0, MAINTENANT)
        .unwrap();
    assert_eq!(ecartes_de(&base), ["om-cartes"]);
}

#[test]
fn une_modification_remplace_la_liste_des_ecartes_du_voyage() {
    let (_dossier, base, _avant) = base_avec_voyage();
    let mut m = contrat().modification;
    m.ecartes = vec!["om-autre".into()];
    base.modifier_voyage(&m).unwrap();
    assert_eq!(ecartes_de(&base), ["om-autre"]);
}

#[test]
fn une_modification_sans_la_liste_des_ecartes_est_refusee() {
    let mut json: serde_json::Value =
        serde_json::from_str(include_str!("../../tests/contrat/stockage.json")).unwrap();
    json["modification"]
        .as_object_mut()
        .unwrap()
        .remove("ecartes");
    assert!(serde_json::from_value::<ModificationDuVoyage>(json["modification"].clone()).is_err());
}

#[test]
fn une_modification_refusee_ne_touche_pas_les_ecartes() {
    // Trois refus, de plus en plus tardifs ; dans chacun la liste proposée diffère de celle du voyage.
    let (_dossier, base, avant) = base_avec_voyage();
    // Un second voyage, avec sa propre catégorie.
    let mut autre = avant.clone();
    autre.voyage.id = "v-autre".into();
    autre.etiquettes.clear();
    autre.ecartes.clear();
    for c in &mut autre.categories {
        c.id = format!("{}-b", c.id);
        c.voyage_id = "v-autre".into();
    }
    for o in &mut autre.objets {
        o.id = format!("{}-b", o.id);
        o.categorie_id = format!("{}-b", o.categorie_id);
        o.voyage_id = "v-autre".into();
    }
    base.creer_voyage(&autre).unwrap();
    let avant_autre = base.lire_voyage("v-autre").unwrap().unwrap();
    let neuve = || {
        let mut m = contrat().modification;
        m.ecartes = vec!["om-autre".into()];
        m
    };
    // 1. Refusée avant toute écriture : un objet modifié appartient à un autre voyage.
    let mut autre_voyage = neuve();
    autre_voyage.objets_modifies[0].voyage_id = "v-autre".into();
    // 2. Refusée à l'insertion d'un objet (avant la réécriture des écartés) : catégorie inconnue.
    let mut categorie_inconnue = neuve();
    categorie_inconnue.objets_ajoutes[0].categorie_id = "cv-inconnue".into();
    // 3. Refusée APRÈS la réécriture des écartés, par le dernier contrôle : l'objet modifié est rangé
    // dans une catégorie existante, mais d'un autre voyage.
    let mut categorie_d_un_autre = neuve();
    categorie_d_un_autre.objets_modifies[0].categorie_id = "cv-alimentation-b".into();
    for m in [autre_voyage, categorie_inconnue, categorie_d_un_autre] {
        assert!(base.modifier_voyage(&m).is_err());
        assert_eq!(ecartes_de(&base), ["om-cartes"]);
        assert_eq!(base.lire_voyage("v-vercors").unwrap().unwrap(), avant);
        assert_eq!(base.lire_voyage("v-autre").unwrap().unwrap(), avant_autre);
    }
}
