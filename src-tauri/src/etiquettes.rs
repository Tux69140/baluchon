// Les écritures des étiquettes faites depuis l'écran Étiquettes : un groupe, une étiquette, leur ordre,
// leur suppression. Chacune est une seule transaction : refusée, elle ne laisse rien d'écrit. Le schéma
// ne change pas. Un voyage est une copie indépendante : rien ici ne le touche.
use crate::base::{en_texte, Base};
use crate::bibliotheque::{Etiquette, GroupeEtiquettes};
use rusqlite::{params, Transaction};

// `ids` doit être exactement l'ensemble `existants` (sans doublon) : sinon deux éléments pourraient se
// retrouver au même rang, ou un élément d'une autre liste être déplacé.
fn verifier_liste_exacte(
    mut existants: Vec<String>,
    ids: &[String],
    quoi: &str,
) -> Result<(), String> {
    let mut demandees = ids.to_vec();
    existants.sort();
    demandees.sort();
    if existants != demandees {
        return Err(format!("La liste ne contient pas exactement {quoi}"));
    }
    Ok(())
}

fn ids_de(tx: &Transaction, requete: &str, parametres: &[&str]) -> Result<Vec<String>, String> {
    tx.prepare(requete)
        .map_err(en_texte)?
        .query_map(rusqlite::params_from_iter(parametres), |r| r.get(0))
        .map_err(en_texte)?
        .collect::<Result<_, _>>()
        .map_err(en_texte)
}

// Un id inconnu est refusé : l'écran ne doit pas croire avoir supprimé ce qui n'existe plus.
fn supprimer_ligne(base: &Base, table: &str, id: &str) -> Result<(), String> {
    let connexion = base.connexion()?;
    let tx = connexion.unchecked_transaction().map_err(en_texte)?;
    // Les liens (et, pour un groupe, ses étiquettes) partent par ON DELETE CASCADE ; les modèles
    // eux-mêmes ne sont pas modifiés, pas même leur `modifie_le`.
    let n = tx
        .execute(&format!("DELETE FROM {table} WHERE id = ?1"), [id])
        .map_err(en_texte)?;
    if n == 0 {
        return Err(format!("Inconnu : {id}"));
    }
    tx.commit().map_err(en_texte)
}

impl Base {
    // Crée le groupe ou change son nom. Son rang ne change qu'à la création : seul `ranger_groupes`
    // déplace un groupe existant, pour qu'une fiche ouverte longtemps ne défasse pas un rangement.
    pub fn enregistrer_groupe(&self, groupe: &GroupeEtiquettes) -> Result<(), String> {
        let connexion = self.connexion()?;
        let tx = connexion.unchecked_transaction().map_err(en_texte)?;
        tx.execute(
            "INSERT INTO groupe_etiquettes (id, nom, ordre, modifie_le) VALUES (?1, ?2, ?3, ?4)
             ON CONFLICT(id) DO UPDATE SET nom = excluded.nom, modifie_le = excluded.modifie_le",
            params![groupe.id, groupe.nom, groupe.ordre, groupe.modifie_le],
        )
        .map_err(en_texte)?;
        tx.commit().map_err(en_texte)
    }

    // Crée l'étiquette (son groupe doit exister, la base le vérifie) ou change son nom. Une étiquette
    // reste dans son groupe et à son rang : seuls la création et `ranger_etiquettes` les posent.
    pub fn enregistrer_etiquette(&self, etiquette: &Etiquette) -> Result<(), String> {
        let connexion = self.connexion()?;
        let tx = connexion.unchecked_transaction().map_err(en_texte)?;
        tx.execute(
            "INSERT INTO etiquette (id, groupe_id, nom, ordre, modifie_le) VALUES (?1, ?2, ?3, ?4, ?5)
             ON CONFLICT(id) DO UPDATE SET nom = excluded.nom, modifie_le = excluded.modifie_le",
            params![
                etiquette.id,
                etiquette.groupe_id,
                etiquette.nom,
                etiquette.ordre,
                etiquette.modifie_le
            ],
        )
        .map_err(en_texte)?;
        tx.commit().map_err(en_texte)
    }

    pub fn ranger_groupes(&self, ids: &[String], modifie_le: &str) -> Result<(), String> {
        let connexion = self.connexion()?;
        let tx = connexion.unchecked_transaction().map_err(en_texte)?;
        let existants = ids_de(&tx, "SELECT id FROM groupe_etiquettes", &[])?;
        verifier_liste_exacte(existants, ids, "les groupes existants")?;
        for (rang, id) in ids.iter().enumerate() {
            tx.execute(
                "UPDATE groupe_etiquettes SET ordre = ?1, modifie_le = ?2 WHERE id = ?3",
                params![rang as i64, modifie_le, id],
            )
            .map_err(en_texte)?;
        }
        tx.commit().map_err(en_texte)
    }

    pub fn ranger_etiquettes(
        &self,
        groupe_id: &str,
        ids: &[String],
        modifie_le: &str,
    ) -> Result<(), String> {
        let connexion = self.connexion()?;
        let tx = connexion.unchecked_transaction().map_err(en_texte)?;
        if ids_de(
            &tx,
            "SELECT id FROM groupe_etiquettes WHERE id = ?1",
            &[groupe_id],
        )?
        .is_empty()
        {
            return Err(format!("Groupe inconnu : {groupe_id}"));
        }
        let existants = ids_de(
            &tx,
            "SELECT id FROM etiquette WHERE groupe_id = ?1",
            &[groupe_id],
        )?;
        verifier_liste_exacte(existants, ids, "les étiquettes de ce groupe")?;
        for (rang, id) in ids.iter().enumerate() {
            tx.execute(
                "UPDATE etiquette SET ordre = ?1, modifie_le = ?2 WHERE id = ?3",
                params![rang as i64, modifie_le, id],
            )
            .map_err(en_texte)?;
        }
        tx.commit().map_err(en_texte)
    }

    pub fn supprimer_etiquette(&self, id: &str) -> Result<(), String> {
        supprimer_ligne(self, "etiquette", id)
    }

    pub fn supprimer_groupe(&self, id: &str) -> Result<(), String> {
        supprimer_ligne(self, "groupe_etiquettes", id)
    }
}

#[cfg(test)]
mod tests {
    use crate::base::Base;
    use crate::bibliotheque::{Etiquette, GroupeEtiquettes};
    use crate::essais::{base_jetable, contrat};

    const MAINTENANT: &str = "2026-10-26T09:00:00.000Z";

    fn base_installee() -> (crate::essais::Dossier, Base) {
        let (dossier, base) = base_jetable();
        base.installer_bibliotheque(&contrat().bibliotheque, "fr")
            .unwrap();
        (dossier, base)
    }

    fn ids(liste: &[&str]) -> Vec<String> {
        liste.iter().map(|s| s.to_string()).collect()
    }

    #[test]
    fn un_groupe_neuf_puis_renomme_est_relu() {
        let (_d, base) = base_installee();
        let neuf = GroupeEtiquettes {
            id: "ge-neuf".into(),
            nom: "Saison".into(),
            ordre: 2,
            modifie_le: MAINTENANT.into(),
        };
        base.enregistrer_groupe(&neuf).unwrap();
        let groupes = base.lire_bibliotheque().unwrap().groupes;
        assert_eq!(groupes.len(), 3);
        assert_eq!(groupes[2], neuf);
        // L'écran peut envoyer un rang périmé après un rangement : le rang de création fait foi.
        let renomme = GroupeEtiquettes {
            nom: "Saisons".into(),
            ordre: 9,
            modifie_le: "2026-10-27T09:00:00.000Z".into(),
            ..neuf.clone()
        };
        base.enregistrer_groupe(&renomme).unwrap();
        let groupes = base.lire_bibliotheque().unwrap().groupes;
        assert_eq!(groupes.len(), 3);
        assert_eq!(groupes[2].nom, "Saisons");
        assert_eq!(groupes[2].ordre, 2);
        assert_eq!(groupes[2].modifie_le, "2026-10-27T09:00:00.000Z");
    }

    #[test]
    fn une_etiquette_neuve_puis_renommee_est_relue() {
        let (_d, base) = base_installee();
        let neuve = Etiquette {
            id: "et-neuve".into(),
            groupe_id: "ge-climat".into(),
            nom: "Chaud".into(),
            ordre: 1,
            modifie_le: MAINTENANT.into(),
        };
        base.enregistrer_etiquette(&neuve).unwrap();
        let etiquettes = base.lire_bibliotheque().unwrap().etiquettes;
        assert_eq!(etiquettes.len(), 3);
        assert!(etiquettes.contains(&neuve));
        // Le groupe et le rang ne changent pas, même si l'écran en envoie d'autres.
        let renommee = Etiquette {
            nom: "Canicule".into(),
            groupe_id: "ge-activites".into(),
            ordre: 9,
            modifie_le: "2026-10-27T09:00:00.000Z".into(),
            ..neuve.clone()
        };
        base.enregistrer_etiquette(&renommee).unwrap();
        let relue = base
            .lire_bibliotheque()
            .unwrap()
            .etiquettes
            .into_iter()
            .find(|e| e.id == "et-neuve")
            .unwrap();
        assert_eq!(relue.nom, "Canicule");
        assert_eq!(relue.groupe_id, "ge-climat");
        assert_eq!(relue.ordre, 1);
        assert_eq!(relue.modifie_le, "2026-10-27T09:00:00.000Z");
    }

    #[test]
    fn une_etiquette_d_un_groupe_inconnu_est_refusee_sans_rien_ecrire() {
        let (_d, base) = base_installee();
        let neuve = Etiquette {
            id: "et-neuve".into(),
            groupe_id: "ge-inconnu".into(),
            nom: "Chaud".into(),
            ordre: 0,
            modifie_le: MAINTENANT.into(),
        };
        assert!(base.enregistrer_etiquette(&neuve).is_err());
        assert_eq!(base.lire_bibliotheque().unwrap(), contrat().bibliotheque);
    }

    #[test]
    fn ranger_les_groupes_suit_l_ordre_donne() {
        let (_d, base) = base_installee();
        base.ranger_groupes(&ids(&["ge-climat", "ge-activites"]), MAINTENANT)
            .unwrap();
        let groupes = base.lire_bibliotheque().unwrap().groupes;
        assert_eq!(groupes[0].id, "ge-climat");
        assert_eq!(groupes[0].ordre, 0);
        assert_eq!(groupes[1].id, "ge-activites");
        assert_eq!(groupes[1].ordre, 1);
        assert_eq!(groupes[1].modifie_le, MAINTENANT);
    }

    #[test]
    fn ranger_les_etiquettes_suit_l_ordre_donne() {
        let (_d, base) = base_installee();
        for (id, ordre) in [("et-b", 1), ("et-c", 2)] {
            base.enregistrer_etiquette(&Etiquette {
                id: id.into(),
                groupe_id: "ge-activites".into(),
                nom: id.into(),
                ordre,
                modifie_le: MAINTENANT.into(),
            })
            .unwrap();
        }
        base.ranger_etiquettes(
            "ge-activites",
            &ids(&["et-c", "et-camping", "et-b"]),
            MAINTENANT,
        )
        .unwrap();
        let etiquettes = base.lire_bibliotheque().unwrap().etiquettes;
        let du_groupe: Vec<(&str, i64)> = etiquettes
            .iter()
            .filter(|e| e.groupe_id == "ge-activites")
            .map(|e| (e.id.as_str(), e.ordre))
            .collect();
        assert_eq!(du_groupe, vec![("et-c", 0), ("et-camping", 1), ("et-b", 2)]);
        // L'autre groupe n'est pas touché.
        assert!(etiquettes.contains(&contrat().bibliotheque.etiquettes[1]));
    }

    #[test]
    fn ranger_refuse_une_liste_incomplete_inconnue_ou_d_un_autre_groupe() {
        let (_d, base) = base_installee();
        let groupes: [Vec<String>; 4] = [
            ids(&["ge-climat"]),
            ids(&["ge-climat", "ge-inconnu"]),
            ids(&["ge-climat", "ge-climat"]),
            ids(&["ge-climat", "ge-activites", "ge-climat"]),
        ];
        for liste in groupes {
            assert!(base.ranger_groupes(&liste, MAINTENANT).is_err());
        }
        let etiquettes: [Vec<String>; 4] = [
            ids(&[]),
            ids(&["et-camping", "et-inconnue"]),
            ids(&["et-camping", "et-camping"]),
            // et-froid est dans l'autre groupe.
            ids(&["et-camping", "et-froid"]),
        ];
        for liste in etiquettes {
            assert!(base
                .ranger_etiquettes("ge-activites", &liste, MAINTENANT)
                .is_err());
        }
        assert!(base
            .ranger_etiquettes("ge-inconnu", &ids(&[]), MAINTENANT)
            .is_err());
        assert_eq!(base.lire_bibliotheque().unwrap(), contrat().bibliotheque);
    }

    #[test]
    fn supprimer_une_etiquette_la_retire_des_modeles() {
        let (_d, base) = base_installee();
        base.supprimer_etiquette("et-camping").unwrap();
        let bibliotheque = base.lire_bibliotheque().unwrap();
        assert!(bibliotheque.etiquettes.iter().all(|e| e.id != "et-camping"));
        let papiers = bibliotheque
            .categories
            .iter()
            .find(|c| c.id == "cm-papiers")
            .unwrap();
        assert!(papiers.etiquettes.is_empty());
        // « Selon les étiquettes » reste tel quel : seul le lien part, le modèle n'est pas modifié.
        let avant = &contrat().bibliotheque.categories[1];
        assert!(!papiers.toujours_incluse);
        assert_eq!(papiers.modifie_le, avant.modifie_le);
    }

    #[test]
    fn supprimer_un_groupe_supprime_ses_etiquettes() {
        let (_d, base) = base_installee();
        base.supprimer_groupe("ge-climat").unwrap();
        let bibliotheque = base.lire_bibliotheque().unwrap();
        assert_eq!(
            bibliotheque.groupes,
            vec![contrat().bibliotheque.groupes[0].clone()]
        );
        assert_eq!(
            bibliotheque.etiquettes,
            vec![contrat().bibliotheque.etiquettes[0].clone()]
        );
        let tshirts = bibliotheque
            .objets
            .iter()
            .find(|o| o.id == "om-tshirts")
            .unwrap();
        assert!(tshirts.etiquettes.is_empty());
        let papiers = bibliotheque
            .categories
            .iter()
            .find(|c| c.id == "cm-papiers")
            .unwrap();
        assert_eq!(papiers.etiquettes, vec!["et-camping"]);
    }

    #[test]
    fn supprimer_un_inconnu_est_refuse() {
        let (_d, base) = base_installee();
        assert!(base.supprimer_etiquette("et-inconnue").is_err());
        assert!(base.supprimer_groupe("ge-inconnu").is_err());
        assert_eq!(base.lire_bibliotheque().unwrap(), contrat().bibliotheque);
    }

    #[test]
    fn modifier_ou_supprimer_ne_touche_pas_un_voyage() {
        let (_d, base) = base_installee();
        base.creer_voyage(&contrat().voyage).unwrap();
        base.enregistrer_etiquette(&Etiquette {
            nom: "Renommée".into(),
            ..contrat().bibliotheque.etiquettes[0].clone()
        })
        .unwrap();
        base.supprimer_etiquette("et-camping").unwrap();
        base.supprimer_groupe("ge-activites").unwrap();
        let id = contrat().voyage.voyage.id;
        assert_eq!(base.lire_voyage(&id).unwrap(), Some(contrat().voyage));
    }
}
