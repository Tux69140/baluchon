// Ouvrir une adresse du web dans le navigateur du système (écran « À propos »). Ordinateur seulement : sur
// Android, la page passe par l'activité (window.BaluchonAndroid.ouvrirLien). Seules les adresses https://
// sont suivies : jamais un fichier local (file://) ni une adresse non chiffrée.
use std::process::{Command, Stdio};

pub fn ouvrir(adresse: &str) -> Result<(), String> {
    ouvrir_avec("xdg-open", adresse)
}

// Le programme est un paramètre pour que les essais n'ouvrent jamais de vrai navigateur.
fn ouvrir_avec(programme: &str, adresse: &str) -> Result<(), String> {
    if !adresse.starts_with("https://") {
        return Err("seules les adresses https:// sont ouvertes".into());
    }
    // Pas de « -- » : xdg-open (Debian) le refuse comme option inconnue. La garde https:// ci-dessus
    // suffit : une adresse ne commence jamais par « - », donc n'est jamais lue comme une option.
    let mut enfant = Command::new(programme)
        .arg(adresse)
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .spawn()
        .map_err(|e| e.to_string())?;
    // Récolté à sa fin, sans bloquer l'appli : pas de processus zombie.
    std::thread::spawn(move || {
        let _ = enfant.wait();
    });
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn refuse_un_fichier_local() {
        assert!(ouvrir_avec("true", "file:///etc/passwd").is_err());
    }

    #[test]
    fn refuse_une_adresse_non_chiffree() {
        assert!(ouvrir_avec("true", "http://baluchon.biovibralyon.fr/").is_err());
    }

    #[test]
    fn refuse_une_adresse_vide_ou_sans_schema() {
        assert!(ouvrir_avec("true", "").is_err());
        assert!(ouvrir_avec("true", "baluchon.biovibralyon.fr").is_err());
    }

    // Témoin positif : une adresse https:// lance bien le programme, qui reçoit exactement l'adresse
    // (xdg-open refuse tout argument « -- » : il ne doit pas y en avoir).
    #[test]
    fn lance_le_programme_avec_la_seule_adresse() {
        use std::os::unix::fs::PermissionsExt;
        let dossier = std::env::temp_dir().join(format!("baluchon-lien-{}", std::process::id()));
        std::fs::create_dir_all(&dossier).unwrap();
        let trace = dossier.join("arguments.txt");
        let faux = dossier.join("faux-programme.sh");
        std::fs::write(
            &faux,
            format!("#!/bin/sh\nprintf '%s\\n' \"$@\" > '{}'\n", trace.display()),
        )
        .unwrap();
        std::fs::set_permissions(&faux, std::fs::Permissions::from_mode(0o755)).unwrap();
        ouvrir_avec(faux.to_str().unwrap(), "https://baluchon.biovibralyon.fr/").unwrap();
        for _ in 0..100 {
            if trace.exists() && std::fs::metadata(&trace).unwrap().len() > 0 {
                break;
            }
            std::thread::sleep(std::time::Duration::from_millis(50));
        }
        let recu = std::fs::read_to_string(&trace).unwrap();
        std::fs::remove_dir_all(&dossier).ok();
        assert_eq!(recu, "https://baluchon.biovibralyon.fr/\n");
    }

    #[test]
    fn echoue_si_le_programme_n_existe_pas() {
        assert!(ouvrir_avec(
            "programme-qui-n-existe-pas",
            "https://baluchon.biovibralyon.fr/"
        )
        .is_err());
    }
}
