// Outils communs des tests de la base : dossier temporaire effacé en fin de test (sans dépendance
// de plus), base jetable, et données d'essai lues dans tests/contrat/stockage.json — le fichier que
// vérifie aussi tests/contrat.test.js côté modèle : les deux côtés parlent la même forme.
use crate::base::Base;
use crate::bibliotheque::Bibliotheque;
use crate::voyages::VoyageComplet;
use serde::Deserialize;
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

pub fn base_jetable() -> (Dossier, Base) {
    let dossier = Dossier::nouveau();
    let base = Base::ouvrir(&dossier.chemin.join("essai.sqlite3")).unwrap();
    (dossier, base)
}

#[derive(Deserialize)]
pub struct Contrat {
    pub bibliotheque: Bibliotheque,
    pub voyage: VoyageComplet,
}

pub fn contrat() -> Contrat {
    serde_json::from_str(include_str!("../../tests/contrat/stockage.json")).unwrap()
}
