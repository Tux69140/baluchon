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
    // L'adresse vient après « -- » : jamais prise pour une option du programme.
    Command::new(programme)
        .args(["--", adresse])
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .spawn()
        .map(|_| ())
        .map_err(|e| e.to_string())
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

    // Témoin positif : une adresse https:// lance bien le programme, qui reçoit « -- » puis l'adresse.
    #[test]
    fn lance_le_programme_pour_une_adresse_https() {
        assert!(ouvrir_avec("true", "https://baluchon.biovibralyon.fr/").is_ok());
        assert!(ouvrir_avec(
            "programme-qui-n-existe-pas",
            "https://baluchon.biovibralyon.fr/"
        )
        .is_err());
    }
}
