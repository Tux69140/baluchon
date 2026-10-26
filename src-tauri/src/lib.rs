mod base;
mod bibliotheque;
mod edition;
#[cfg(test)]
mod essais;
mod voyages;

use base::Base;
use bibliotheque::{Bibliotheque, CategorieModele, ObjetModele};
use std::fs;
use tauri::{AppHandle, Manager, State};
use voyages::{EtatObjet, Voyage, VoyageComplet};

fn chemin_de_la_base(app: &AppHandle) -> Result<std::path::PathBuf, String> {
    let dossier = app.path().app_data_dir().map_err(|e| e.to_string())?;
    fs::create_dir_all(&dossier).map_err(|e| e.to_string())?;
    Ok(dossier.join("baluchon.sqlite3"))
}

#[tauri::command]
fn lister_voyages(base: State<'_, Base>) -> Result<Vec<Voyage>, String> {
    base.lister_voyages()
}

#[tauri::command]
fn bibliotheque_installee(base: State<'_, Base>) -> Result<bool, String> {
    base.bibliotheque_installee()
}

#[tauri::command]
fn installer_bibliotheque(
    base: State<'_, Base>,
    bibliotheque: Bibliotheque,
    langue: String,
) -> Result<bool, String> {
    base.installer_bibliotheque(&bibliotheque, &langue)
}

#[tauri::command]
fn lire_bibliotheque(base: State<'_, Base>) -> Result<Bibliotheque, String> {
    base.lire_bibliotheque()
}

#[tauri::command]
fn enregistrer_categorie(base: State<'_, Base>, categorie: CategorieModele) -> Result<(), String> {
    base.enregistrer_categorie(&categorie)
}

#[tauri::command]
fn enregistrer_objet(base: State<'_, Base>, objet: ObjetModele) -> Result<(), String> {
    base.enregistrer_objet(&objet)
}

#[tauri::command]
fn ranger_categories(
    base: State<'_, Base>,
    ids: Vec<String>,
    modifie_le: String,
) -> Result<(), String> {
    base.ranger_categories(&ids, &modifie_le)
}

#[tauri::command]
fn creer_voyage(base: State<'_, Base>, contenu: VoyageComplet) -> Result<(), String> {
    base.creer_voyage(&contenu)
}

#[tauri::command]
fn lire_voyage(base: State<'_, Base>, id: String) -> Result<Option<VoyageComplet>, String> {
    base.lire_voyage(&id)
}

#[tauri::command]
fn regler_dans_le_sac(
    base: State<'_, Base>,
    id: String,
    dans_le_sac: i64,
    modifie_le: String,
) -> Result<(), String> {
    base.regler_dans_le_sac(&id, dans_le_sac, &modifie_le)
}

#[tauri::command]
fn etats_des_objets(base: State<'_, Base>) -> Result<Vec<EtatObjet>, String> {
    base.etats_des_objets()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let chemin = chemin_de_la_base(app.handle()).map_err(std::io::Error::other)?;
            app.manage(Base::ouvrir(&chemin).map_err(std::io::Error::other)?);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            lister_voyages,
            bibliotheque_installee,
            installer_bibliotheque,
            lire_bibliotheque,
            enregistrer_categorie,
            enregistrer_objet,
            ranger_categories,
            creer_voyage,
            lire_voyage,
            regler_dans_le_sac,
            etats_des_objets
        ])
        .run(tauri::generate_context!())
        .expect("Baluchon n'a pas pu démarrer");
}
