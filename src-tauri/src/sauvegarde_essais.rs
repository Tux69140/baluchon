// Les tests de la lecture et du remplacement de toutes les données (sauvegarde.rs).
use super::*;
use crate::essais::{base_jetable, contrat};

// Le voyage du contrat sous d'autres identifiants, avec des coches différentes.
fn second_voyage() -> VoyageComplet {
    let mut v = contrat().voyage;
    v.voyage.id = "v-alpes".into();
    v.voyage.nom = "Alpes".into();
    for e in &mut v.etiquettes {
        e.id = format!("{}-2", e.id);
        e.voyage_id = "v-alpes".into();
    }
    for c in &mut v.categories {
        c.id = format!("{}-2", c.id);
        c.voyage_id = "v-alpes".into();
    }
    for o in &mut v.objets {
        o.id = format!("{}-2", o.id);
        o.voyage_id = "v-alpes".into();
        o.categorie_id = format!("{}-2", o.categorie_id);
    }
    v.objets[0].dans_le_sac = 5;
    v.objets[0].quantite = 6;
    v.objets[0].quantite_manuelle = true;
    v.objets[1].a_acheter = true;
    v.objets[1].achetes = 3;
    v.ecartes = vec!["om-chargeur".into(), "om-tshirts".into()];
    v
}

fn contenu_a_deux_voyages() -> ContenuComplet {
    ContenuComplet {
        bibliotheque: contrat().bibliotheque,
        voyages: vec![contrat().voyage, second_voyage()],
        langue: "en".into(),
    }
}

fn base_remplie() -> (crate::essais::Dossier, Base) {
    let (dossier, base) = base_jetable();
    base.installer_bibliotheque(&contrat().bibliotheque, "fr")
        .unwrap();
    base.creer_voyage(&contrat().voyage).unwrap();
    (dossier, base)
}

#[test]
fn lire_tout_rend_bibliotheque_voyages_et_langue() {
    let (_dossier, base) = base_remplie();
    let tout = base.lire_tout().unwrap();
    assert_eq!(tout.bibliotheque, contrat().bibliotheque);
    assert_eq!(tout.voyages, vec![contrat().voyage]);
    assert_eq!(tout.langue, "fr");
}

#[test]
fn remplacer_puis_lire_rend_le_meme_contenu() {
    let (_dossier, base) = base_remplie();
    let contenu = contenu_a_deux_voyages();
    base.remplacer_tout(&contenu).unwrap();
    assert_eq!(base.lire_tout().unwrap(), contenu);
}

#[test]
fn remplacer_efface_ce_qui_n_est_pas_dans_le_contenu() {
    let (_dossier, base) = base_remplie();
    let mut bibliotheque = contrat().bibliotheque;
    bibliotheque.etiquettes.retain(|e| e.id != "et-froid");
    for o in &mut bibliotheque.objets {
        o.etiquettes.retain(|e| e != "et-froid");
    }
    let contenu = ContenuComplet {
        bibliotheque,
        voyages: vec![second_voyage()],
        langue: "fr".into(),
    };
    base.remplacer_tout(&contenu).unwrap();
    assert_eq!(base.lire_voyage("v-vercors").unwrap(), None);
    let relu = base.lire_tout().unwrap();
    assert_eq!(relu, contenu);
    assert!(relu
        .bibliotheque
        .etiquettes
        .iter()
        .all(|e| e.id != "et-froid"));
}

#[test]
fn remplacer_pose_installee_et_langue() {
    let (_dossier, base) = base_jetable();
    assert!(!base.bibliotheque_installee().unwrap());
    base.remplacer_tout(&contenu_a_deux_voyages()).unwrap();
    assert!(base.bibliotheque_installee().unwrap());
    assert_eq!(base.lire_tout().unwrap().langue, "en");
}

#[test]
fn une_ligne_refusee_ne_change_rien() {
    let (_dossier, base) = base_remplie();
    let avant = base.lire_tout().unwrap();
    let mut contenu = contenu_a_deux_voyages();
    contenu.bibliotheque.objets[1].categorie_id = "categorie-inconnue".into();
    assert!(base.remplacer_tout(&contenu).is_err());
    assert_eq!(base.lire_tout().unwrap(), avant);
}
