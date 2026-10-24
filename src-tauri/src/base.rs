// La base locale SQLite : ouverture et migrations. Les lectures et écritures vivent par sujet
// (bibliotheque.rs, voyages.rs) ; les commandes Tauri (lib.rs) ne font que relayer.
use rusqlite::{Connection, Params, Row};
use std::{
    path::Path,
    sync::{Mutex, MutexGuard},
};

const MIGRATIONS: [&str; 3] = [
    include_str!("../migrations/001_initial.sql"),
    include_str!("../migrations/002_bibliotheque_et_voyages.sql"),
    include_str!("../migrations/003_dans_le_sac_en_pieces.sql"),
];

pub struct Base(Mutex<Connection>);

// Les erreurs SQLite remontent à l'écran sous forme de texte : les commandes Tauri renvoient String.
pub fn en_texte(erreur: rusqlite::Error) -> String {
    erreur.to_string()
}

// Toutes les lignes d'une requête, lues par `lire`.
pub fn lire_lignes<T, P: Params>(
    connexion: &Connection,
    sql: &str,
    parametres: P,
    lire: fn(&Row<'_>) -> rusqlite::Result<T>,
) -> Result<Vec<T>, String> {
    let mut requete = connexion.prepare(sql).map_err(en_texte)?;
    let lignes = requete.query_map(parametres, lire).map_err(en_texte)?;
    lignes.collect::<Result<_, _>>().map_err(en_texte)
}

// Version du schéma déjà appliquée ; 0 pour une base neuve, où la table n'existe pas encore (la
// requête échoue alors avec une erreur SQLite, pas seulement « aucune ligne »).
fn version_du_schema(connexion: &Connection) -> i64 {
    connexion
        .query_row("SELECT COALESCE(MAX(version), 0) FROM schema_migrations", [], |r| r.get(0))
        .unwrap_or(0)
}

// Chaque migration s'applique en une seule opération avec son numéro : interrompue, elle ne laisse
// rien de partiel, et elle sera rejouée entière au lancement suivant.
fn migrer(connexion: &Connection) -> Result<(), String> {
    for (indice, sql) in MIGRATIONS.iter().enumerate() {
        let version = indice as i64 + 1;
        if version_du_schema(connexion) >= version {
            continue;
        }
        let tx = connexion.unchecked_transaction().map_err(|e| e.to_string())?;
        tx.execute_batch(sql).map_err(|e| e.to_string())?;
        tx.execute("INSERT INTO schema_migrations (version) VALUES (?1)", [version])
            .map_err(|e| e.to_string())?;
        tx.commit().map_err(|e| e.to_string())?;
    }
    Ok(())
}

impl Base {
    pub fn ouvrir(chemin: &Path) -> Result<Base, String> {
        let connexion = Connection::open(chemin).map_err(|e| e.to_string())?;
        connexion
            .execute_batch("PRAGMA foreign_keys = ON;")
            .map_err(|e| e.to_string())?;
        migrer(&connexion)?;
        Ok(Base(Mutex::new(connexion)))
    }

    pub fn connexion(&self) -> Result<MutexGuard<'_, Connection>, String> {
        self.0.lock().map_err(|_| "La base locale est verrouillée.".to_owned())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::essais::{base_jetable, Dossier};

    fn version(base: &Base) -> i64 {
        base.connexion()
            .unwrap()
            .query_row("SELECT MAX(version) FROM schema_migrations", [], |r| r.get(0))
            .unwrap()
    }

    #[test]
    fn une_base_neuve_est_a_la_derniere_version() {
        let (_dossier, base) = base_jetable();
        assert_eq!(version(&base), MIGRATIONS.len() as i64);
    }

    #[test]
    fn rouvrir_une_base_garde_ses_donnees_sans_rejouer_les_migrations() {
        let dossier = Dossier::nouveau();
        let chemin = dossier.chemin.join("essai.sqlite3");
        {
            let base = Base::ouvrir(&chemin).unwrap();
            base.connexion()
                .unwrap()
                .execute(
                    "INSERT INTO voyage (id, nom, depart, retour, voyageurs, modifie_le)
                     VALUES ('v1', 'Vercors', '2026-10-10', '2026-10-13', 2, '2026-10-06T09:00:00Z')",
                    [],
                )
                .unwrap();
        }
        let base = Base::ouvrir(&chemin).unwrap();
        assert_eq!(base.lister_voyages().unwrap().len(), 1);
        assert_eq!(version(&base), MIGRATIONS.len() as i64);
    }

    #[test]
    fn le_nombre_de_voyageurs_reste_entre_1_et_20() {
        let (_dossier, base) = base_jetable();
        let inserer = |voyageurs: i64| {
            base.connexion().unwrap().execute(
                "INSERT INTO voyage (id, nom, depart, retour, voyageurs, modifie_le)
                 VALUES (?1, 'V', '2026-10-10', '2026-10-13', ?2, 'x')",
                rusqlite::params![format!("v{voyageurs}"), voyageurs],
            )
        };
        assert!(inserer(1).is_ok());
        assert!(inserer(20).is_ok());
        assert!(inserer(0).is_err());
        assert!(inserer(21).is_err());
    }

    #[test]
    fn la_migration_002_garde_les_voyages_de_la_phase_1() {
        let dossier = Dossier::nouveau();
        let chemin = dossier.chemin.join("phase1.sqlite3");
        {
            let connexion = Connection::open(&chemin).unwrap();
            connexion.execute_batch(MIGRATIONS[0]).unwrap();
            connexion
                .execute("INSERT INTO schema_migrations (version) VALUES (1)", [])
                .unwrap();
            connexion
                .execute(
                    "INSERT INTO voyage (id, nom, destination, depart, retour, voyageurs, modifie_le)
                     VALUES ('v1', 'Vercors', 'Autrans', '2026-10-10', '2026-10-13', 2, 'x')",
                    [],
                )
                .unwrap();
        }
        let base = Base::ouvrir(&chemin).unwrap();
        assert_eq!(version(&base), MIGRATIONS.len() as i64);
        assert_eq!(base.lister_voyages().unwrap()[0].nom, "Vercors");
        assert!(!base.bibliotheque_installee().unwrap());
    }

    #[test]
    fn la_migration_003_convertit_les_coches_en_pieces() {
        let dossier = Dossier::nouveau();
        let chemin = dossier.chemin.join("phase2.sqlite3");
        {
            let connexion = Connection::open(&chemin).unwrap();
            connexion.execute_batch("PRAGMA foreign_keys = ON;").unwrap();
            for (indice, sql) in MIGRATIONS[0..2].iter().enumerate() {
                connexion.execute_batch(sql).unwrap();
                connexion
                    .execute("INSERT INTO schema_migrations (version) VALUES (?1)", [indice as i64 + 1])
                    .unwrap();
            }
            connexion
                .execute_batch(
                    "INSERT INTO voyage (id, nom, depart, retour, voyageurs, modifie_le)
                       VALUES ('v1', 'Vercors', '2026-10-10', '2026-10-13', 2, 'x');
                     INSERT INTO categorie_du_voyage (id, voyage_id, nom, icone, couleur, ordre, modifie_le)
                       VALUES ('c1', 'v1', 'Repas', 'i', 'c', 1, 'x');
                     INSERT INTO objet_du_voyage (id, voyage_id, categorie_id, nom, regle, valeur, par_personne,
                       consommable, quantite, dans_le_sac, modifie_le)
                       VALUES ('o1', 'v1', 'c1', 'Repas', 'fixe', 16, 0, 1, 16, 1, 'x'),
                              ('o2', 'v1', 'c1', 'Thé', 'fixe', 2, 0, 1, 2, 0, 'x');",
                )
                .unwrap();
        }
        let base = Base::ouvrir(&chemin).unwrap();
        assert_eq!(version(&base), 3);
        let voyage = base.lire_voyage("v1").unwrap().unwrap();
        assert_eq!(voyage.voyage.nom, "Vercors");
        assert_eq!(voyage.categories.len(), 1);
        let pieces: Vec<_> = voyage.objets.iter().map(|o| (o.id.as_str(), o.dans_le_sac)).collect();
        assert_eq!(pieces, vec![("o1", 16), ("o2", 0)]);
    }
}
