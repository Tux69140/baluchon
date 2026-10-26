// Les écritures de la bibliothèque faites depuis l'écran Bibliothèque : une catégorie, un objet, l'ordre
// des catégories. Chacune est une seule transaction : refusée, elle ne laisse rien d'écrit. Le schéma
// ne change pas. Un voyage est une copie indépendante : rien ici ne le touche.
use crate::base::{en_texte, Base};
use crate::bibliotheque::{CategorieModele, ObjetModele};
use rusqlite::params;

impl Base {
    // Crée la catégorie ou remplace ses champs et ses liens d'étiquettes (effacés puis réécrits dans
    // l'ordre reçu). Son rang ne change qu'à la création : seul `ranger_categories` déplace une
    // catégorie existante, pour qu'une fiche ouverte longtemps ne défasse pas un rangement fait entre-temps.
    pub fn enregistrer_categorie(&self, categorie: &CategorieModele) -> Result<(), String> {
        let connexion = self.connexion()?;
        let tx = connexion.unchecked_transaction().map_err(en_texte)?;
        tx.execute(
            "INSERT INTO categorie_modele (id, nom, icone, couleur, ordre, toujours_incluse, modifie_le)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
             ON CONFLICT(id) DO UPDATE SET nom = excluded.nom, icone = excluded.icone,
               couleur = excluded.couleur, toujours_incluse = excluded.toujours_incluse,
               modifie_le = excluded.modifie_le",
            params![
                categorie.id,
                categorie.nom,
                categorie.icone,
                categorie.couleur,
                categorie.ordre,
                categorie.toujours_incluse,
                categorie.modifie_le
            ],
        )
        .map_err(en_texte)?;
        tx.execute(
            "DELETE FROM categorie_modele_etiquette WHERE categorie_id = ?1",
            [&categorie.id],
        )
        .map_err(en_texte)?;
        for etiquette in &categorie.etiquettes {
            tx.execute(
                "INSERT INTO categorie_modele_etiquette (categorie_id, etiquette_id) VALUES (?1, ?2)",
                params![categorie.id, etiquette],
            )
            .map_err(en_texte)?;
        }
        tx.commit().map_err(en_texte)
    }

    // Crée l'objet ou remplace ses champs et ses liens. La catégorie d'un objet ne se change pas : elle
    // n'est écrite qu'à la création (et doit exister, la base le vérifie).
    pub fn enregistrer_objet(&self, objet: &ObjetModele) -> Result<(), String> {
        let connexion = self.connexion()?;
        let tx = connexion.unchecked_transaction().map_err(en_texte)?;
        tx.execute(
            "INSERT INTO objet_modele (id, categorie_id, nom, regle, valeur, plafond, par_personne,
               consommable, toujours_inclus, note, modifie_le)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)
             ON CONFLICT(id) DO UPDATE SET nom = excluded.nom, regle = excluded.regle,
               valeur = excluded.valeur, plafond = excluded.plafond, par_personne = excluded.par_personne,
               consommable = excluded.consommable, toujours_inclus = excluded.toujours_inclus,
               note = excluded.note, modifie_le = excluded.modifie_le",
            params![
                objet.id,
                objet.categorie_id,
                objet.nom,
                objet.regle,
                objet.valeur,
                objet.plafond,
                objet.par_personne,
                objet.consommable,
                objet.toujours_inclus,
                objet.note,
                objet.modifie_le
            ],
        )
        .map_err(en_texte)?;
        tx.execute(
            "DELETE FROM objet_modele_etiquette WHERE objet_id = ?1",
            [&objet.id],
        )
        .map_err(en_texte)?;
        for etiquette in &objet.etiquettes {
            tx.execute(
                "INSERT INTO objet_modele_etiquette (objet_id, etiquette_id) VALUES (?1, ?2)",
                params![objet.id, etiquette],
            )
            .map_err(en_texte)?;
        }
        tx.commit().map_err(en_texte)
    }

    // `ids` est l'ordre voulu de toutes les catégories : une liste incomplète, inconnue ou avec un
    // doublon est refusée, sinon deux catégories pourraient se retrouver au même rang.
    pub fn ranger_categories(&self, ids: &[String], modifie_le: &str) -> Result<(), String> {
        let connexion = self.connexion()?;
        let tx = connexion.unchecked_transaction().map_err(en_texte)?;
        let mut existantes: Vec<String> = tx
            .prepare("SELECT id FROM categorie_modele")
            .map_err(en_texte)?
            .query_map([], |r| r.get(0))
            .map_err(en_texte)?
            .collect::<Result<_, _>>()
            .map_err(en_texte)?;
        let mut demandees = ids.to_vec();
        existantes.sort();
        demandees.sort();
        if existantes != demandees {
            return Err("La liste ne contient pas exactement les catégories existantes".into());
        }
        for (rang, id) in ids.iter().enumerate() {
            tx.execute(
                "UPDATE categorie_modele SET ordre = ?1, modifie_le = ?2 WHERE id = ?3",
                params![rang as i64, modifie_le, id],
            )
            .map_err(en_texte)?;
        }
        tx.commit().map_err(en_texte)
    }
}

#[cfg(test)]
mod tests {
    use crate::base::Base;
    use crate::essais::{base_jetable, contrat};

    fn base_installee() -> (crate::essais::Dossier, Base) {
        let (dossier, base) = base_jetable();
        base.installer_bibliotheque(&contrat().bibliotheque, "fr")
            .unwrap();
        (dossier, base)
    }

    #[test]
    fn une_categorie_neuve_est_relue_avec_ses_etiquettes() {
        let (_d, base) = base_installee();
        let mut neuve = contrat().bibliotheque.categories[0].clone();
        neuve.id = "cm-neuve".into();
        neuve.nom = "Plage".into();
        neuve.ordre = 2;
        neuve.toujours_incluse = false;
        neuve.etiquettes = vec!["et-froid".into(), "et-camping".into()];
        base.enregistrer_categorie(&neuve).unwrap();
        let relue = base.lire_bibliotheque().unwrap().categories;
        assert_eq!(relue.len(), 3);
        assert_eq!(relue[2], neuve);
    }

    #[test]
    fn une_categorie_modifiee_remplace_ses_liens() {
        let (_d, base) = base_installee();
        let mut c = contrat().bibliotheque.categories[1].clone();
        assert_eq!(c.etiquettes, vec!["et-camping"]);
        c.nom = "Documents".into();
        c.icone = "suitcase-rolling".into();
        c.couleur = "corail".into();
        c.toujours_incluse = true;
        c.modifie_le = "2026-10-26T09:00:00.000Z".into();
        c.etiquettes = vec!["et-froid".into()];
        base.enregistrer_categorie(&c).unwrap();
        let relue = base.lire_bibliotheque().unwrap().categories;
        assert_eq!(relue.len(), 2);
        assert_eq!(relue[1], c);
    }

    #[test]
    fn un_objet_neuf_puis_modifie_est_relu_a_l_identique() {
        let (_d, base) = base_installee();
        let mut o = contrat().bibliotheque.objets[0].clone();
        o.id = "om-neuf".into();
        o.nom = "Pull".into();
        o.plafond = None;
        o.etiquettes = vec!["et-camping".into(), "et-froid".into()];
        base.enregistrer_objet(&o).unwrap();
        assert_eq!(base.lire_bibliotheque().unwrap().objets[1], o);
        o.nom = "Gros pull".into();
        o.regle = "par_nuit".into();
        o.valeur = 2;
        o.plafond = Some(4);
        o.consommable = true;
        o.note = "Laine".into();
        o.modifie_le = "2026-10-26T09:00:00.000Z".into();
        o.etiquettes = vec!["et-froid".into()];
        base.enregistrer_objet(&o).unwrap();
        let objets = base.lire_bibliotheque().unwrap().objets;
        assert_eq!(objets.len(), 3);
        assert_eq!(objets[1], o);
    }

    #[test]
    fn une_categorie_modifiee_garde_son_rang() {
        let (_d, base) = base_installee();
        let mut c = contrat().bibliotheque.categories[0].clone();
        let rang = c.ordre;
        // L'écran peut envoyer un rang périmé après un rangement : le rang stocké fait foi.
        c.ordre = rang + 7;
        c.nom = "Renommée".into();
        base.enregistrer_categorie(&c).unwrap();
        let relue = base.lire_bibliotheque().unwrap().categories;
        assert_eq!(relue[0].nom, "Renommée");
        assert_eq!(relue[0].ordre, rang);
    }

    #[test]
    fn un_objet_modifie_garde_sa_categorie() {
        let (_d, base) = base_installee();
        let mut o = contrat().bibliotheque.objets[0].clone();
        let categorie = o.categorie_id.clone();
        o.categorie_id = contrat().bibliotheque.categories[1].id.clone();
        assert_ne!(o.categorie_id, categorie);
        o.nom = "Renommé".into();
        base.enregistrer_objet(&o).unwrap();
        let relu = &base.lire_bibliotheque().unwrap().objets[0];
        assert_eq!(relu.nom, "Renommé");
        assert_eq!(relu.categorie_id, categorie);
    }

    #[test]
    fn un_objet_d_une_categorie_inconnue_est_refuse_sans_rien_ecrire() {
        let (_d, base) = base_installee();
        let mut o = contrat().bibliotheque.objets[0].clone();
        o.id = "om-neuf".into();
        o.categorie_id = "cm-inconnue".into();
        assert!(base.enregistrer_objet(&o).is_err());
        assert_eq!(base.lire_bibliotheque().unwrap(), contrat().bibliotheque);
    }

    #[test]
    fn une_etiquette_inconnue_est_refusee_sans_rien_ecrire() {
        let (_d, base) = base_installee();
        let mut o = contrat().bibliotheque.objets[0].clone();
        o.nom = "Changé".into();
        o.etiquettes = vec!["et-camping".into(), "et-inconnue".into()];
        assert!(base.enregistrer_objet(&o).is_err());
        let mut c = contrat().bibliotheque.categories[1].clone();
        c.nom = "Changée".into();
        c.etiquettes = vec!["et-inconnue".into()];
        assert!(base.enregistrer_categorie(&c).is_err());
        // L'objet d'avant et ses liens, la catégorie d'avant et ses liens, sont intacts.
        assert_eq!(base.lire_bibliotheque().unwrap(), contrat().bibliotheque);
    }

    #[test]
    fn ranger_suit_l_ordre_donne() {
        let (_d, base) = base_installee();
        let ids = vec!["cm-papiers".to_string(), "cm-vetements".to_string()];
        base.ranger_categories(&ids, "2026-10-26T09:00:00.000Z")
            .unwrap();
        let categories = base.lire_bibliotheque().unwrap().categories;
        assert_eq!(categories[0].id, "cm-papiers");
        assert_eq!(categories[0].ordre, 0);
        assert_eq!(categories[1].id, "cm-vetements");
        assert_eq!(categories[1].ordre, 1);
        assert_eq!(categories[1].modifie_le, "2026-10-26T09:00:00.000Z");
    }

    #[test]
    fn ranger_refuse_une_liste_incomplete_ou_inconnue() {
        let (_d, base) = base_installee();
        let listes: [Vec<String>; 4] = [
            vec!["cm-papiers".into()],
            vec!["cm-papiers".into(), "cm-inconnue".into()],
            vec!["cm-papiers".into(), "cm-papiers".into()],
            vec![
                "cm-papiers".into(),
                "cm-vetements".into(),
                "cm-papiers".into(),
            ],
        ];
        for ids in listes {
            assert!(base
                .ranger_categories(&ids, "2026-10-26T09:00:00.000Z")
                .is_err());
        }
        assert_eq!(base.lire_bibliotheque().unwrap(), contrat().bibliotheque);
    }

    #[test]
    fn modifier_un_modele_ne_touche_pas_un_voyage() {
        let (_d, base) = base_installee();
        base.creer_voyage(&contrat().voyage).unwrap();
        let mut c = contrat().bibliotheque.categories[0].clone();
        c.nom = "Renommée".into();
        base.enregistrer_categorie(&c).unwrap();
        let mut o = contrat().bibliotheque.objets[0].clone();
        o.nom = "Renommé".into();
        base.enregistrer_objet(&o).unwrap();
        let id = contrat().voyage.voyage.id;
        assert_eq!(base.lire_voyage(&id).unwrap(), Some(contrat().voyage));
    }
}
