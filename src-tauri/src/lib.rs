mod base;

use base::{Base, Voyage};
use std::fs;
use tauri::{AppHandle, Manager, State};

fn chemin_de_la_base(app: &AppHandle) -> Result<std::path::PathBuf, String> {
    let dossier = app.path().app_data_dir().map_err(|e| e.to_string())?;
    fs::create_dir_all(&dossier).map_err(|e| e.to_string())?;
    Ok(dossier.join("baluchon.sqlite3"))
}

#[tauri::command]
fn lister_voyages(base: State<'_, Base>) -> Result<Vec<Voyage>, String> {
    base.lister_voyages()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let chemin = chemin_de_la_base(app.handle()).map_err(std::io::Error::other)?;
            app.manage(Base::ouvrir(&chemin).map_err(std::io::Error::other)?);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![lister_voyages])
        .run(tauri::generate_context!())
        .expect("Baluchon n'a pas pu démarrer");
}
