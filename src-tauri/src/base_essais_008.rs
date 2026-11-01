// Les tests de la migration 008 (composition du voyage, « pour qui », règle « par semaine »), à part
// pour garder base.rs court.
use super::*;
use crate::essais::{base_jetable, Dossier};

// Une base arrêtée à la version 7, avec un voyage à 3 voyageurs, deux objets (par personne, partagé),
// des coches, des achats et un objet écarté.
fn base_en_version_7(chemin: &Path) {
    let connexion = Connection::open(chemin).unwrap();
    connexion
        .execute_batch("PRAGMA foreign_keys = ON;")
        .unwrap();
    for (indice, sql) in MIGRATIONS[0..7].iter().enumerate() {
        connexion.execute_batch(sql).unwrap();
        connexion
            .execute(
                "INSERT INTO schema_migrations (version) VALUES (?1)",
                [indice as i64 + 1],
            )
            .unwrap();
    }
    connexion
        .execute_batch(
            "INSERT INTO categorie_modele (id, nom, icone, couleur, ordre, toujours_incluse, modifie_le)
               VALUES ('cm1', 'Vêtements', 'i', 'c', 0, 1, 'x');
             INSERT INTO objet_modele (id, categorie_id, nom, regle, valeur, par_personne, consommable,
               toujours_inclus, modifie_le)
               VALUES ('om1', 'cm1', 'T-shirts', 'par_jour', 1, 1, 0, 0, 'x');
             INSERT INTO groupe_etiquettes (id, nom, ordre, modifie_le) VALUES ('g1', 'Climat', 0, 'x');
             INSERT INTO etiquette (id, groupe_id, nom, ordre, modifie_le) VALUES ('e1', 'g1', 'Froid', 0, 'x');
             INSERT INTO objet_modele_etiquette (objet_id, etiquette_id) VALUES ('om1', 'e1');
             INSERT INTO voyage (id, nom, depart, retour, voyageurs, modifie_le)
               VALUES ('v1', 'Vercors', '2026-10-10', '2026-10-13', 3, 'x');
             INSERT INTO etiquette_du_voyage (id, voyage_id, nom, ordre, modifie_le)
               VALUES ('ev1', 'v1', 'Froid', 0, 'x');
             INSERT INTO categorie_du_voyage (id, voyage_id, nom, icone, couleur, ordre, modifie_le)
               VALUES ('c1', 'v1', 'Vêtements', 'i', 'c', 0, 'x');
             INSERT INTO objet_du_voyage (id, voyage_id, categorie_id, nom, regle, valeur, par_personne,
               consommable, quantite, dans_le_sac, a_acheter, achetes, modifie_le)
               VALUES ('o1', 'v1', 'c1', 'T-shirts', 'par_jour', 1, 1, 0, 9, 4, 1, 2, 'x'),
                      ('o2', 'v1', 'c1', 'Chargeur', 'fixe', 1, 0, 0, 1, 1, 0, 0, 'x');
             INSERT INTO objet_ecarte (voyage_id, modele_id) VALUES ('v1', 'om-cartes');",
        )
        .unwrap();
}

#[test]
fn la_migration_008_garde_les_quantites() {
    let dossier = Dossier::nouveau();
    let chemin = dossier.chemin.join("phase12.sqlite3");
    base_en_version_7(&chemin);
    let base = Base::ouvrir(&chemin).unwrap();
    let contenu = base.lire_voyage("v1").unwrap().unwrap();
    let v = &contenu.voyage;
    assert_eq!((v.femmes, v.hommes, v.enfants), (2, 1, 0));
    assert_eq!(contenu.objets.len(), 2);
    let (o1, o2) = (&contenu.objets[0], &contenu.objets[1]);
    assert_eq!(
        (o1.pour_qui.as_str(), o2.pour_qui.as_str()),
        ("tous", "tous")
    );
    assert_eq!((o1.par_personne, o2.par_personne), (true, false));
    assert_eq!((o1.quantite, o1.dans_le_sac, o1.achetes), (9, 4, 2));
    assert_eq!((o2.quantite, o2.dans_le_sac, o2.achetes), (1, 1, 0));
    assert_eq!(contenu.ecartes, vec!["om-cartes".to_string()]);
    // Rien n'est parti par cascade : étiquette et catégorie du voyage, lien d'étiquette du modèle.
    assert_eq!(contenu.etiquettes.len(), 1);
    assert_eq!(contenu.categories.len(), 1);
    let bibliotheque = base.lire_bibliotheque().unwrap();
    assert_eq!(bibliotheque.objets[0].pour_qui, "tous");
    assert_eq!(bibliotheque.objets[0].etiquettes, vec!["e1".to_string()]);
    // Les clés étrangères sont rétablies après la migration.
    let actives: i64 = base
        .connexion()
        .unwrap()
        .query_row("PRAGMA foreign_keys", [], |r| r.get(0))
        .unwrap();
    assert_eq!(actives, 1);
}

#[test]
fn la_migration_008_arrondit_la_moitie_des_voyageurs() {
    let dossier = Dossier::nouveau();
    let chemin = dossier.chemin.join("phase12.sqlite3");
    base_en_version_7(&chemin);
    Connection::open(&chemin)
        .unwrap()
        .execute_batch(
            "INSERT INTO voyage (id, nom, depart, retour, voyageurs, modifie_le)
               VALUES ('v2', 'Seul', '2026-10-10', '2026-10-13', 1, 'x'),
                      ('v3', 'Groupe', '2026-10-10', '2026-10-13', 20, 'x');",
        )
        .unwrap();
    let base = Base::ouvrir(&chemin).unwrap();
    let compo = |id: &str| {
        let v = base.lire_voyage(id).unwrap().unwrap().voyage;
        (v.femmes, v.hommes, v.enfants)
    };
    assert_eq!(compo("v2"), (1, 0, 0));
    assert_eq!(compo("v3"), (10, 10, 0));
}

#[test]
fn la_composition_reste_entre_1_et_20() {
    let (_dossier, base) = base_jetable();
    let inserer = |femmes: i64, hommes: i64, enfants: i64| {
        base.connexion().unwrap().execute(
            "INSERT INTO voyage (id, nom, depart, retour, femmes, hommes, enfants, modifie_le)
             VALUES (?1, 'V', '2026-10-10', '2026-10-13', ?2, ?3, ?4, 'x')",
            rusqlite::params![
                format!("v{femmes}-{hommes}-{enfants}"),
                femmes,
                hommes,
                enfants
            ],
        )
    };
    assert!(inserer(0, 0, 0).is_err());
    assert!(inserer(8, 7, 6).is_err());
    assert!(inserer(8, 7, 5).is_ok());
    assert!(inserer(0, 0, 1).is_ok());
    assert!(inserer(21, 0, 0).is_err());
    assert!(inserer(0, 21, 0).is_err());
    assert!(inserer(1, 0, 21).is_err());
    assert!(inserer(-1, 2, 0).is_err());
}

fn inserer_objet_du_voyage(base: &Base, regle: &str, pour_qui: &str) -> rusqlite::Result<usize> {
    let connexion = base.connexion().unwrap();
    connexion
        .execute_batch(
            "INSERT OR IGNORE INTO voyage (id, nom, depart, retour, femmes, hommes, enfants, modifie_le)
               VALUES ('v1', 'V', '2026-10-10', '2026-10-13', 1, 1, 0, 'x');
             INSERT OR IGNORE INTO categorie_du_voyage (id, voyage_id, nom, icone, couleur, ordre, modifie_le)
               VALUES ('c1', 'v1', 'C', 'i', 'c', 0, 'x');",
        )
        .unwrap();
    connexion.execute(
        "INSERT INTO objet_du_voyage (id, voyage_id, categorie_id, nom, regle, valeur, par_personne,
           pour_qui, consommable, quantite, modifie_le)
         VALUES (?1, 'v1', 'c1', 'O', ?2, 1, 1, ?3, 0, 1, 'x')",
        rusqlite::params![format!("o-{regle}-{pour_qui}"), regle, pour_qui],
    )
}

#[test]
fn la_regle_par_semaine_est_acceptee() {
    let (_dossier, base) = base_jetable();
    assert!(inserer_objet_du_voyage(&base, "par_semaine", "tous").is_ok());
    assert!(inserer_objet_du_voyage(&base, "par_mois", "tous").is_err());
    let connexion = base.connexion().unwrap();
    connexion
        .execute_batch(
            "INSERT INTO categorie_modele (id, nom, icone, couleur, ordre, toujours_incluse, modifie_le)
               VALUES ('cm1', 'C', 'i', 'c', 0, 0, 'x');",
        )
        .unwrap();
    let modele = |regle: &str| {
        connexion.execute(
            "INSERT INTO objet_modele (id, categorie_id, nom, regle, valeur, par_personne, pour_qui,
               consommable, toujours_inclus, modifie_le)
             VALUES (?1, 'cm1', 'O', ?1, 1, 1, 'tous', 0, 0, 'x')",
            [regle],
        )
    };
    assert!(modele("par_semaine").is_ok());
    assert!(modele("par_mois").is_err());
}

#[test]
fn pour_qui_inconnu_refuse() {
    let (_dossier, base) = base_jetable();
    for groupe in ["tous", "adultes", "femmes", "hommes", "enfants"] {
        assert!(inserer_objet_du_voyage(&base, "fixe", groupe).is_ok());
    }
    assert!(inserer_objet_du_voyage(&base, "fixe", "chiens").is_err());
    assert!(inserer_objet_du_voyage(&base, "fixe", "").is_err());
    let connexion = base.connexion().unwrap();
    assert!(connexion
        .execute(
            "INSERT INTO objet_modele (id, categorie_id, nom, regle, valeur, par_personne, pour_qui,
               consommable, toujours_inclus, modifie_le)
             VALUES ('om', 'cm1', 'O', 'fixe', 1, 1, 'chiens', 0, 0, 'x')",
            [],
        )
        .is_err());
}
