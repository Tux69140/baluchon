// Les tests des voyages (voyages.rs), à part pour garder chaque fichier court.
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
        .regler_dans_le_sac(&id, 1, 0, "2026-10-24T10:00:00.000Z")
        .unwrap();
    let relu = Base::ouvrir(&chemin)
        .unwrap()
        .lire_voyage("v-vercors")
        .unwrap()
        .unwrap();
    assert_eq!(relu.objets[0].dans_le_sac, 1);
    assert_eq!(relu.objets[0].modifie_le, "2026-10-24T10:00:00.000Z");
}

// Mis en entier dans le sac, un objet à acheter compte comme acheté : les deux s'écrivent ensemble.
#[test]
fn regler_dans_le_sac_ecrit_aussi_les_pieces_achetees() {
    let (_dossier, base) = base_jetable();
    base.creer_voyage(&contrat().voyage).unwrap();
    base.regler_dans_le_sac("ov-repas", 16, 16, "x").unwrap();
    let relu = base.lire_voyage("v-vercors").unwrap().unwrap();
    let repas = relu.objets.iter().find(|o| o.id == "ov-repas").unwrap();
    assert_eq!((repas.dans_le_sac, repas.achetes), (16, 16));
    assert!(base.regler_dans_le_sac("ov-repas", 0, 17, "x").is_err());
}

#[test]
fn regler_dans_le_sac_refuse_hors_bornes_et_objet_inconnu() {
    let (_dossier, base) = base_jetable();
    let contenu = contrat().voyage;
    let objet = contenu.objets[0].clone();
    base.creer_voyage(&contenu).unwrap();
    assert!(base.regler_dans_le_sac(&objet.id, -1, 0, "x").is_err());
    assert!(base
        .regler_dans_le_sac(&objet.id, objet.quantite + 1, 0, "x")
        .is_err());
    assert!(base.regler_dans_le_sac("inconnu", 0, 0, "x").is_err());
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

#[test]
fn un_voyage_cree_relit_ses_ecartes_tries() {
    let (_dossier, base) = base_jetable();
    let mut contenu = contrat().voyage;
    contenu.ecartes = vec!["m-b".into(), "m-a".into()];
    base.creer_voyage(&contenu).unwrap();
    let relu = base.lire_voyage("v-vercors").unwrap().unwrap();
    assert_eq!(relu.ecartes, vec!["m-a".to_string(), "m-b".to_string()]);
}

#[test]
fn un_contenu_sans_la_cle_ecartes_vaut_liste_vide() {
    let mut json = serde_json::to_value(contrat().voyage).unwrap();
    json.as_object_mut().unwrap().remove("ecartes");
    let contenu: VoyageComplet = serde_json::from_value(json).unwrap();
    assert_eq!(contenu.ecartes, Vec::<String>::new());
}

fn compter(base: &Base, table: &str, voyage_id: &str) -> i64 {
    base.connexion()
        .unwrap()
        .query_row(
            &format!("SELECT COUNT(*) FROM {table} WHERE voyage_id = ?1"),
            [voyage_id],
            |r| r.get(0),
        )
        .unwrap()
}

#[test]
fn supprimer_un_voyage_efface_tout_ce_qui_en_depend() {
    let (_dossier, base) = base_jetable();
    let mut contenu = contrat().voyage;
    contenu.ecartes = vec!["om-cartes".into()];
    base.creer_voyage(&contenu).unwrap();
    // Un second voyage, copie du premier sous d'autres identifiants, et la bibliothèque.
    let mut autre = contenu.clone();
    autre.voyage.id = "v-autre".into();
    for e in &mut autre.etiquettes {
        e.id = format!("autre-{}", e.id);
        e.voyage_id = "v-autre".into();
    }
    for c in &mut autre.categories {
        c.id = format!("autre-{}", c.id);
        c.voyage_id = "v-autre".into();
    }
    for o in &mut autre.objets {
        o.id = format!("autre-{}", o.id);
        o.voyage_id = "v-autre".into();
        o.categorie_id = format!("autre-{}", o.categorie_id);
    }
    base.creer_voyage(&autre).unwrap();
    let avant = base.lire_bibliotheque().unwrap();

    base.supprimer_voyage("v-vercors").unwrap();

    for table in [
        "etiquette_du_voyage",
        "categorie_du_voyage",
        "objet_du_voyage",
        "objet_ecarte",
    ] {
        assert_eq!(compter(&base, table, "v-vercors"), 0, "{table}");
        assert!(compter(&base, table, "v-autre") > 0, "{table}");
    }
    assert_eq!(base.lire_voyage("v-vercors").unwrap(), None);
    assert_eq!(base.lire_voyage("v-autre").unwrap(), Some(autre));
    assert_eq!(base.lire_bibliotheque().unwrap(), avant);
}

#[test]
fn supprimer_un_voyage_inconnu_est_refuse() {
    let (_dossier, base) = base_jetable();
    base.creer_voyage(&contrat().voyage).unwrap();
    let erreur = base.supprimer_voyage("inconnu").unwrap_err();
    assert!(erreur.contains("Voyage inconnu : inconnu"), "{erreur}");
    assert_eq!(base.lister_voyages().unwrap().len(), 1);
}

// « Annuler » une suppression recrée le voyage relu avant : rien ne doit se perdre en route.
#[test]
fn recreer_un_voyage_supprime_le_rend_a_l_identique() {
    let (_dossier, base) = base_jetable();
    let mut contenu = contrat().voyage;
    contenu.objets[0].quantite = 3;
    contenu.objets[0].dans_le_sac = 4;
    contenu.objets[0].achetes = 2;
    contenu.objets[0].quantite_manuelle = true;
    contenu.ecartes = vec!["om-cartes".into(), "om-autre".into()];
    base.creer_voyage(&contenu).unwrap();
    let avant = base.lire_voyage("v-vercors").unwrap().unwrap();
    base.supprimer_voyage("v-vercors").unwrap();
    base.creer_voyage(&avant).unwrap();
    assert_eq!(base.lire_voyage("v-vercors").unwrap(), Some(avant));
}
