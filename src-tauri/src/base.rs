// La base locale SQLite : ouverture, migrations, lectures. Seul endroit qui parle SQL ; les
// commandes Tauri (lib.rs) ne font que relayer.
use rusqlite::Connection;
use serde::Serialize;
use std::{path::Path, sync::Mutex};

const MIGRATIONS: [&str; 1] = [include_str!("../migrations/001_initial.sql")];

pub struct Base(Mutex<Connection>);

#[derive(Debug, PartialEq, Serialize)]
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

    pub fn lister_voyages(&self) -> Result<Vec<Voyage>, String> {
        let connexion = self.0.lock().map_err(|_| "La base locale est verrouillée.".to_owned())?;
        let mut requete = connexion
            .prepare("SELECT id, nom, destination, depart, retour, voyageurs, modifie_le FROM voyage")
            .map_err(|e| e.to_string())?;
        let lignes = requete
            .query_map([], |r| {
                Ok(Voyage {
                    id: r.get(0)?,
                    nom: r.get(1)?,
                    destination: r.get(2)?,
                    depart: r.get(3)?,
                    retour: r.get(4)?,
                    voyageurs: r.get(5)?,
                    modifie_le: r.get(6)?,
                })
            })
            .map_err(|e| e.to_string())?;
        lignes.collect::<Result<_, _>>().map_err(|e| e.to_string())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn base_jetable() -> (tempfile_maison::Dossier, Base) {
        let dossier = tempfile_maison::Dossier::nouveau();
        let base = Base::ouvrir(&dossier.chemin.join("essai.sqlite3")).unwrap();
        (dossier, base)
    }

    fn version(base: &Base) -> i64 {
        let connexion = base.0.lock().unwrap();
        connexion
            .query_row("SELECT MAX(version) FROM schema_migrations", [], |r| r.get(0))
            .unwrap()
    }

    #[test]
    fn une_base_neuve_ne_contient_aucun_voyage() {
        let (_dossier, base) = base_jetable();
        assert_eq!(base.lister_voyages().unwrap(), vec![]);
        assert_eq!(version(&base), MIGRATIONS.len() as i64);
    }

    #[test]
    fn un_voyage_enregistre_est_relu_tel_quel() {
        let (_dossier, base) = base_jetable();
        base.0
            .lock()
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
    fn rouvrir_une_base_garde_ses_donnees_sans_rejouer_les_migrations() {
        let dossier = tempfile_maison::Dossier::nouveau();
        let chemin = dossier.chemin.join("essai.sqlite3");
        {
            let base = Base::ouvrir(&chemin).unwrap();
            base.0
                .lock()
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
            base.0.lock().unwrap().execute(
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

    // Un dossier temporaire effacé en fin de test, sans dépendance de plus.
    mod tempfile_maison {
        use std::path::PathBuf;
        use std::sync::atomic::{AtomicU32, Ordering};

        static COMPTEUR: AtomicU32 = AtomicU32::new(0);

        pub struct Dossier {
            pub chemin: PathBuf,
        }

        impl Dossier {
            pub fn nouveau() -> Dossier {
                let numero = COMPTEUR.fetch_add(1, Ordering::SeqCst);
                let chemin = std::env::temp_dir().join(format!("baluchon-essai-{}-{numero}", std::process::id()));
                std::fs::create_dir_all(&chemin).unwrap();
                Dossier { chemin }
            }
        }

        impl Drop for Dossier {
            fn drop(&mut self) {
                let _ = std::fs::remove_dir_all(&self.chemin);
            }
        }
    }
}
