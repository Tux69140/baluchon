// Les tests des ajustements (ajustements.rs), à part pour garder chaque fichier court.
use super::*;
use crate::essais::{base_jetable, contrat, Dossier};
use crate::voyages::VoyageComplet;

const MAINTENANT: &str = "2026-10-28T10:00:00.000Z";

fn base_avec_voyage() -> (Dossier, Base, VoyageComplet) {
    let (dossier, base) = base_jetable();
    let contenu = contrat().voyage;
    base.creer_voyage(&contenu).unwrap();
    (dossier, base, contenu)
}

// Un objet ajouté à la main : quantité manuelle, jamais recalculée.
fn objet_a_la_main(id: &str, categorie_id: &str) -> ObjetDuVoyage {
    ObjetDuVoyage {
        id: id.into(),
        voyage_id: "v-vercors".into(),
        categorie_id: categorie_id.into(),
        modele_id: None,
        nom: "Gourde".into(),
        regle: "fixe".into(),
        valeur: 2,
        plafond: None,
        par_personne: true,
        consommable: false,
        quantite: 2,
        quantite_manuelle: true,
        dans_le_sac: 0,
        a_acheter: false,
        achetes: 0,
        note: String::new(),
        modifie_le: MAINTENANT.into(),
    }
}

fn categorie_neuve(id: &str, voyage_id: &str, ordre: i64) -> CategorieDuVoyage {
    CategorieDuVoyage {
        id: id.into(),
        voyage_id: voyage_id.into(),
        modele_id: None,
        nom: "Outils".into(),
        icone: "wrench".into(),
        couleur: "ciel".into(),
        ordre,
        modifie_le: MAINTENANT.into(),
    }
}

#[test]
fn ajouter_un_objet_dans_une_categorie_neuve_est_relu() {
    let (_dossier, base, avant) = base_avec_voyage();
    let ajout = AjoutAuVoyage {
        categorie: Some(categorie_neuve("cv-outils", "v-vercors", 3)),
        objet: objet_a_la_main("ov-gourde", "cv-outils"),
    };
    base.ajouter_au_voyage(&ajout).unwrap();
    let relu = base.lire_voyage("v-vercors").unwrap().unwrap();
    assert_eq!(relu.categories.len(), avant.categories.len() + 1);
    assert_eq!(relu.categories.last(), ajout.categorie.as_ref());
    assert_eq!(relu.objets.last(), Some(&ajout.objet));
    assert_eq!(relu.objets.len(), avant.objets.len() + 1);
}

#[test]
fn ajouter_dans_une_categorie_existante_ne_cree_pas_de_categorie() {
    let (_dossier, base, avant) = base_avec_voyage();
    let ajout = AjoutAuVoyage {
        categorie: None,
        objet: objet_a_la_main("ov-gourde", "cv-vetements"),
    };
    base.ajouter_au_voyage(&ajout).unwrap();
    let relu = base.lire_voyage("v-vercors").unwrap().unwrap();
    assert_eq!(relu.categories, avant.categories);
    assert_eq!(relu.objets.last(), Some(&ajout.objet));
}

#[test]
fn ajouter_dans_la_categorie_d_un_autre_voyage_est_refuse_sans_rien_ecrire() {
    let (_dossier, base, avant) = base_avec_voyage();
    let mut autre = contrat().voyage;
    autre.voyage.id = "v-autre".into();
    autre.etiquettes.clear();
    autre.categories.truncate(1);
    autre.categories[0].id = "cv-autre".into();
    autre.categories[0].voyage_id = "v-autre".into();
    autre.objets.clear();
    base.creer_voyage(&autre).unwrap();
    // Catégorie d'un autre voyage, ou absente : refusé.
    for categorie in ["cv-autre", "cv-absente"] {
        let ajout = AjoutAuVoyage {
            categorie: None,
            objet: objet_a_la_main("ov-gourde", categorie),
        };
        assert!(base.ajouter_au_voyage(&ajout).is_err(), "{categorie}");
    }
    // Voyage inconnu, ou catégorie neuve qui n'est pas celle de l'objet : refusé.
    let mut inconnu = objet_a_la_main("ov-gourde", "cv-nouvelle");
    inconnu.voyage_id = "v-inconnu".into();
    let ajout = AjoutAuVoyage {
        categorie: Some(categorie_neuve("cv-nouvelle", "v-inconnu", 0)),
        objet: inconnu,
    };
    assert!(base.ajouter_au_voyage(&ajout).is_err());
    let ajout = AjoutAuVoyage {
        categorie: Some(categorie_neuve("cv-nouvelle", "v-vercors", 3)),
        objet: objet_a_la_main("ov-gourde", "cv-vetements"),
    };
    assert!(base.ajouter_au_voyage(&ajout).is_err());
    assert_eq!(base.lire_voyage("v-vercors").unwrap().unwrap(), avant);
    let categories: i64 = base
        .connexion()
        .unwrap()
        .query_row("SELECT COUNT(*) FROM categorie_du_voyage", [], |r| r.get(0))
        .unwrap();
    assert_eq!(categories, 3);
}

#[test]
fn ajouter_avec_un_id_deja_pris_est_refuse_sans_rien_ecrire() {
    let (_dossier, base, avant) = base_avec_voyage();
    let ajout = AjoutAuVoyage {
        categorie: Some(categorie_neuve("cv-outils", "v-vercors", 3)),
        objet: objet_a_la_main("ov-tshirts", "cv-outils"),
    };
    assert!(base.ajouter_au_voyage(&ajout).is_err());
    assert_eq!(base.lire_voyage("v-vercors").unwrap().unwrap(), avant);
}

#[test]
fn regler_la_quantite_la_rend_manuelle_et_survit_a_la_fermeture() {
    let dossier = Dossier::nouveau();
    let chemin = dossier.chemin.join("essai.sqlite3");
    Base::ouvrir(&chemin)
        .unwrap()
        .creer_voyage(&contrat().voyage)
        .unwrap();
    Base::ouvrir(&chemin)
        .unwrap()
        .regler_quantite("ov-tshirts", 5, 2, 0, MAINTENANT)
        .unwrap();
    let relu = Base::ouvrir(&chemin)
        .unwrap()
        .lire_voyage("v-vercors")
        .unwrap()
        .unwrap();
    let objet = &relu.objets[0];
    assert_eq!(objet.id, "ov-tshirts");
    assert_eq!(
        (objet.quantite, objet.dans_le_sac, objet.quantite_manuelle),
        (5, 2, true)
    );
    assert_eq!(objet.modifie_le, MAINTENANT);
}

#[test]
fn regler_la_quantite_refuse_zero_et_un_sac_trop_plein() {
    let (_dossier, base, avant) = base_avec_voyage();
    assert!(base
        .regler_quantite("ov-tshirts", 0, 0, 0, MAINTENANT)
        .is_err());
    assert!(base
        .regler_quantite("ov-tshirts", 4, 5, 0, MAINTENANT)
        .is_err());
    assert!(base
        .regler_quantite("ov-tshirts", 4, -1, 0, MAINTENANT)
        .is_err());
    assert!(base
        .regler_quantite("inconnu", 4, 0, 0, MAINTENANT)
        .is_err());
    assert_eq!(base.lire_voyage("v-vercors").unwrap().unwrap(), avant);
}

#[test]
fn regler_quantite_refuse_des_pieces_achetees_au_dela() {
    let (_dossier, base, _) = base_avec_voyage();
    assert!(base
        .regler_quantite("ov-repas", 4, 0, 5, MAINTENANT)
        .is_err());
    base.regler_quantite("ov-repas", 4, 0, 4, MAINTENANT)
        .unwrap();
    let relu = base.lire_voyage("v-vercors").unwrap().unwrap();
    let repas = relu.objets.iter().find(|o| o.id == "ov-repas").unwrap();
    assert_eq!((repas.quantite, repas.achetes), (4, 4));
}

#[test]
fn regler_au_dela_de_999_est_permis() {
    let (_dossier, base, _) = base_avec_voyage();
    base.regler_quantite("ov-tshirts", 1500, 0, 0, MAINTENANT)
        .unwrap();
    let relu = base.lire_voyage("v-vercors").unwrap().unwrap();
    assert_eq!(relu.objets[0].quantite, 1500);
}

#[test]
fn renommer_refuse_un_nom_vide() {
    let (_dossier, base, avant) = base_avec_voyage();
    assert!(base
        .renommer_objet_du_voyage("ov-tshirts", "   ", MAINTENANT)
        .is_err());
    assert!(base
        .renommer_objet_du_voyage("inconnu", "Chaussettes", MAINTENANT)
        .is_err());
    assert_eq!(base.lire_voyage("v-vercors").unwrap().unwrap(), avant);
    base.renommer_objet_du_voyage("ov-tshirts", "  Chaussettes ", MAINTENANT)
        .unwrap();
    let relu = base.lire_voyage("v-vercors").unwrap().unwrap();
    assert_eq!(relu.objets[0].nom, "Chaussettes");
    assert_eq!(relu.objets[0].modifie_le, MAINTENANT);
}

#[test]
fn retirer_le_dernier_objet_retire_sa_categorie() {
    let (_dossier, base, avant) = base_avec_voyage();
    base.retirer_du_voyage("ov-repas").unwrap();
    let relu = base.lire_voyage("v-vercors").unwrap().unwrap();
    assert_eq!(relu.objets.len(), avant.objets.len() - 1);
    assert!(relu.categories.iter().all(|c| c.id != "cv-alimentation"));
    assert!(base.retirer_du_voyage("ov-repas").is_err());
}

#[test]
fn retirer_un_objet_garde_sa_categorie_s_il_en_reste_un_autre() {
    let (_dossier, base, avant) = base_avec_voyage();
    let ajout = AjoutAuVoyage {
        categorie: None,
        objet: objet_a_la_main("ov-gourde", "cv-vetements"),
    };
    base.ajouter_au_voyage(&ajout).unwrap();
    base.retirer_du_voyage("ov-gourde").unwrap();
    assert_eq!(base.lire_voyage("v-vercors").unwrap().unwrap(), avant);
}

#[test]
fn retirer_puis_retablir_rend_le_voyage_identique() {
    let (_dossier, base, avant) = base_avec_voyage();
    // Le dernier objet, qui est seul de sa catégorie : l'ordre de lecture (rang de création) est
    // alors celui d'avant.
    let objet = avant.objets.last().unwrap().clone();
    let categorie = avant
        .categories
        .iter()
        .find(|c| c.id == objet.categorie_id)
        .unwrap()
        .clone();
    base.retirer_du_voyage(&objet.id).unwrap();
    assert_ne!(base.lire_voyage("v-vercors").unwrap().unwrap(), avant);
    base.retablir_dans_le_voyage(&AjoutAuVoyage {
        categorie: Some(categorie),
        objet,
    })
    .unwrap();
    assert_eq!(base.lire_voyage("v-vercors").unwrap().unwrap(), avant);
}

#[test]
fn retirer_ne_touche_pas_la_bibliotheque() {
    let (_dossier, base) = base_jetable();
    let contenu = contrat();
    base.installer_bibliotheque(&contenu.bibliotheque, "fr")
        .unwrap();
    base.creer_voyage(&contenu.voyage).unwrap();
    let avant = base.lire_bibliotheque().unwrap();
    base.retirer_du_voyage("ov-tshirts").unwrap();
    base.retirer_du_voyage("ov-repas").unwrap();
    assert_eq!(base.lire_bibliotheque().unwrap(), avant);
}

fn modeles_neufs() -> (CategorieModele, ObjetModele) {
    let categorie = CategorieModele {
        id: "cm-outils".into(),
        nom: "Outils".into(),
        icone: "wrench".into(),
        couleur: "ciel".into(),
        ordre: 5,
        toujours_incluse: true,
        modifie_le: MAINTENANT.into(),
        etiquettes: vec![],
    };
    let objet = ObjetModele {
        id: "om-gourde".into(),
        categorie_id: "cm-outils".into(),
        nom: "Gourde".into(),
        regle: "fixe".into(),
        valeur: 2,
        plafond: None,
        par_personne: true,
        consommable: false,
        toujours_inclus: true,
        note: String::new(),
        modifie_le: MAINTENANT.into(),
        etiquettes: vec![],
    };
    (categorie, objet)
}

fn base_avec_bibliotheque_et_voyage() -> (Dossier, Base) {
    let (dossier, base) = base_jetable();
    let contenu = contrat();
    base.installer_bibliotheque(&contenu.bibliotheque, "fr")
        .unwrap();
    base.creer_voyage(&contenu.voyage).unwrap();
    (dossier, base)
}

#[test]
fn ajouter_a_la_bibliotheque_cree_categorie_objet_et_liens() {
    let (_dossier, base) = base_avec_bibliotheque_et_voyage();
    let (categorie, objet) = modeles_neufs();
    base.ajouter_a_la_bibliotheque(&AjoutALaBibliotheque {
        categorie: Some(categorie.clone()),
        objet: objet.clone(),
        objet_du_voyage: "ov-repas".into(),
        categorie_du_voyage: Some("cv-alimentation".into()),
    })
    .unwrap();
    let bibliotheque = base.lire_bibliotheque().unwrap();
    assert!(bibliotheque.categories.contains(&categorie));
    assert!(bibliotheque.objets.contains(&objet));
    let voyage = base.lire_voyage("v-vercors").unwrap().unwrap();
    let repas = voyage.objets.iter().find(|o| o.id == "ov-repas").unwrap();
    assert_eq!(repas.modele_id.as_deref(), Some("om-gourde"));
    let alimentation = voyage
        .categories
        .iter()
        .find(|c| c.id == "cv-alimentation")
        .unwrap();
    assert_eq!(alimentation.modele_id.as_deref(), Some("cm-outils"));
}

#[test]
fn ajouter_a_la_bibliotheque_dans_une_categorie_existante_ne_lie_que_l_objet() {
    let (_dossier, base) = base_avec_bibliotheque_et_voyage();
    let (_, mut objet) = modeles_neufs();
    objet.categorie_id = "cm-vetements".into();
    base.ajouter_a_la_bibliotheque(&AjoutALaBibliotheque {
        categorie: None,
        objet,
        objet_du_voyage: "ov-repas".into(),
        categorie_du_voyage: None,
    })
    .unwrap();
    let voyage = base.lire_voyage("v-vercors").unwrap().unwrap();
    let alimentation = voyage
        .categories
        .iter()
        .find(|c| c.id == "cv-alimentation")
        .unwrap();
    assert_eq!(alimentation.modele_id, None);
}

#[test]
fn ajouter_a_la_bibliotheque_refuse_un_objet_du_voyage_inconnu_sans_rien_ecrire() {
    let (_dossier, base) = base_avec_bibliotheque_et_voyage();
    let avant = base.lire_bibliotheque().unwrap();
    let voyage_avant = base.lire_voyage("v-vercors").unwrap();
    let (categorie, objet) = modeles_neufs();
    let resultat = base.ajouter_a_la_bibliotheque(&AjoutALaBibliotheque {
        categorie: Some(categorie),
        objet,
        objet_du_voyage: "ov-inconnu".into(),
        categorie_du_voyage: None,
    });
    assert!(resultat.is_err());
    assert_eq!(base.lire_bibliotheque().unwrap(), avant);
    assert_eq!(base.lire_voyage("v-vercors").unwrap(), voyage_avant);
}

// Phase 10 : « Plus tard » après une baisse garde les pièces de trop ; on ne peut pas en ajouter.
#[test]
fn regler_quantite_garde_un_excedent_deja_la() {
    let (_dossier, base, _avant) = base_avec_voyage();
    base.regler_quantite("ov-tshirts", 2, 3, 0, MAINTENANT)
        .unwrap();
    let relu = base.lire_voyage("v-vercors").unwrap().unwrap();
    assert_eq!(
        (relu.objets[0].quantite, relu.objets[0].dans_le_sac),
        (2, 3)
    );
    assert!(base
        .regler_quantite("ov-tshirts", 2, 4, 0, MAINTENANT)
        .is_err());
}

// Phase 10 : un excédent ne fait que décroître ; sans excédent, le sac reste borné par la quantité.
#[test]
fn regler_dans_le_sac_refuse_de_creer_un_excedent() {
    let (_dossier, base, _avant) = base_avec_voyage();
    base.regler_dans_le_sac("ov-tshirts", 8, 0, "x").unwrap();
    assert!(base.regler_dans_le_sac("ov-tshirts", 9, 0, "x").is_err());
    base.regler_quantite("ov-tshirts", 6, 8, 0, "x").unwrap();
    base.regler_dans_le_sac("ov-tshirts", 7, 0, "x").unwrap();
    assert!(base.regler_dans_le_sac("ov-tshirts", 8, 0, "x").is_err());
    let relu = base.lire_voyage("v-vercors").unwrap().unwrap();
    assert_eq!(
        (relu.objets[0].quantite, relu.objets[0].dans_le_sac),
        (6, 7)
    );
}
