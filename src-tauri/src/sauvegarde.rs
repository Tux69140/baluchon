// Lire toutes les données et les remplacer toutes en une seule opération : c'est ce que la
// sauvegarde et la restauration (phase 12) demandent à la base.
use crate::base::{en_texte, lire_lignes, Base};
use crate::bibliotheque::{
    inserer_bibliotheque, lire_bibliotheque_de, poser_installee, Bibliotheque, INSTALLEE, LANGUE,
};
use crate::voyages::{inserer_voyage, lire_voyage_de, VoyageComplet};
use rusqlite::OptionalExtension;
use serde::{Deserialize, Serialize};
use std::io::{ErrorKind, Write};
use std::path::Path;

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ContenuComplet {
    pub bibliotheque: Bibliotheque,
    pub voyages: Vec<VoyageComplet>,
    pub langue: String,
}

impl Base {
    // Tout est lu sous une seule connexion : les voyages et la bibliothèque forment un même instant.
    pub fn lire_tout(&self) -> Result<ContenuComplet, String> {
        let connexion = self.connexion()?;
        let bibliotheque = lire_bibliotheque_de(&connexion)?;
        let ids: Vec<String> = lire_lignes(
            &connexion,
            "SELECT id FROM voyage ORDER BY rowid",
            [],
            |r| r.get(0),
        )?;
        let mut voyages = vec![];
        for id in ids {
            voyages.extend(lire_voyage_de(&connexion, &id)?);
        }
        // Une base où rien n'est encore installé n'a pas de langue retenue : celle de départ.
        let langue = connexion
            .query_row("SELECT valeur FROM meta WHERE cle = ?1", [LANGUE], |r| {
                r.get(0)
            })
            .optional()
            .map_err(en_texte)?
            .unwrap_or_else(|| "fr".to_owned());
        Ok(ContenuComplet {
            bibliotheque,
            voyages,
            langue,
        })
    }

    // Efface tout puis réécrit le contenu, dans une seule transaction : une ligne refusée laisse
    // les données telles qu'elles étaient. schema_migrations n'est jamais touchée.
    pub fn remplacer_tout(&self, contenu: &ContenuComplet) -> Result<(), String> {
        let connexion = self.connexion()?;
        let tx = connexion.unchecked_transaction().map_err(en_texte)?;
        // Les cascades emportent ce qui dépend d'un voyage ; objet_modele ne cascade pas depuis
        // categorie_modele, d'où cet ordre : liens, objets, catégories, étiquettes, groupes.
        for table in [
            "voyage",
            "objet_modele_etiquette",
            "categorie_modele_etiquette",
            "objet_modele",
            "categorie_modele",
            "etiquette",
            "groupe_etiquettes",
        ] {
            tx.execute(&format!("DELETE FROM {table}"), [])
                .map_err(en_texte)?;
        }
        tx.execute(
            "DELETE FROM meta WHERE cle IN (?1, ?2)",
            [INSTALLEE, LANGUE],
        )
        .map_err(en_texte)?;
        inserer_bibliotheque(&tx, &contenu.bibliotheque)?;
        for voyage in &contenu.voyages {
            inserer_voyage(&tx, voyage)?;
        }
        poser_installee(&tx, &contenu.langue)?;
        tx.commit().map_err(en_texte)
    }
}

// Dépose un fichier texte dans un dossier sans jamais en remplacer un autre : create_new refuse net un
// nom déjà pris (« existe »), et l'appelant choisit un autre nom. Sur ordinateur, le dossier est
// Téléchargements ; sur Android, l'activité fait ce travail (MainActivity.kt), d'où le dead_code permis.
#[cfg_attr(mobile, allow(dead_code))]
pub fn deposer(dossier: &Path, nom: &str, texte: &str) -> Result<&'static str, String> {
    deposer_avec(dossier, nom, |f| f.write_all(texte.as_bytes()))
}

// L'écriture est passée en paramètre pour pouvoir essayer son échec. Un fichier laissé à moitié écrit
// serait pris pour une vraie sauvegarde : on le retire avant de rendre l'erreur.
#[cfg_attr(mobile, allow(dead_code))]
fn deposer_avec(
    dossier: &Path,
    nom: &str,
    ecrire: impl FnOnce(&mut std::fs::File) -> std::io::Result<()>,
) -> Result<&'static str, String> {
    // Le nom vient de la page : jamais un chemin, qui sortirait du dossier.
    if nom.is_empty() || nom.contains(['/', '\\']) || nom.contains("..") {
        return Err("nom de fichier refusé".to_owned());
    }
    let chemin = dossier.join(nom);
    let ouverture = std::fs::OpenOptions::new()
        .write(true)
        .create_new(true)
        .open(&chemin);
    match ouverture {
        Ok(mut fichier) => {
            if let Err(e) = ecrire(&mut fichier) {
                drop(fichier);
                let _ = std::fs::remove_file(&chemin);
                return Err(e.to_string());
            }
            Ok("depose")
        }
        Err(e) if e.kind() == ErrorKind::AlreadyExists => Ok("existe"),
        Err(e) => Err(e.to_string()),
    }
}

#[cfg(test)]
#[path = "sauvegarde_essais.rs"]
mod tests;
