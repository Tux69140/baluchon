// Supprimer une catégorie ou un objet modèle, et rétablir un extrait de la bibliothèque (le geste
// « Annuler » du bandeau). Chaque geste est une seule transaction : refusé, il ne laisse rien d'écrit.
// Le schéma ne change pas. Un voyage est une copie indépendante : rien ici ne le touche.
use crate::base::{en_texte, Base};
use crate::bibliotheque::Bibliotheque;
use crate::edition::{ecrire_categorie, ecrire_objet};
use crate::etiquettes::{ecrire_etiquette, ecrire_groupe, supprimer_ligne};

impl Base {
    // `objet_modele.categorie_id` n'a pas de ON DELETE CASCADE : les objets partent d'abord, à la main.
    // Leurs liens d'étiquettes, eux, partent par cascade. Un id inconnu est refusé, et la transaction
    // abandonnée ne laisse alors rien de supprimé.
    pub fn supprimer_categorie(&self, id: &str) -> Result<(), String> {
        let connexion = self.connexion()?;
        let tx = connexion.unchecked_transaction().map_err(en_texte)?;
        tx.execute("DELETE FROM objet_modele WHERE categorie_id = ?1", [id])
            .map_err(en_texte)?;
        let n = tx
            .execute("DELETE FROM categorie_modele WHERE id = ?1", [id])
            .map_err(en_texte)?;
        if n == 0 {
            return Err(format!("Inconnu : {id}"));
        }
        tx.commit().map_err(en_texte)
    }

    pub fn supprimer_objet(&self, id: &str) -> Result<(), String> {
        supprimer_ligne(self, "objet_modele", id)
    }

    // Réécrit l'extrait tel qu'il était avant la suppression (mêmes rangs, mêmes dates, mêmes liens dans
    // le même ordre). Les parents d'abord : groupes, étiquettes, catégories, puis objets. Un lien vers une
    // étiquette absente, ou un objet d'une catégorie absente, est refusé par la base et annule tout.
    pub fn retablir_bibliotheque(&self, extrait: &Bibliotheque) -> Result<(), String> {
        let connexion = self.connexion()?;
        let tx = connexion.unchecked_transaction().map_err(en_texte)?;
        for groupe in &extrait.groupes {
            ecrire_groupe(&tx, groupe)?;
        }
        for etiquette in &extrait.etiquettes {
            ecrire_etiquette(&tx, etiquette)?;
        }
        for categorie in &extrait.categories {
            ecrire_categorie(&tx, categorie)?;
        }
        for objet in &extrait.objets {
            ecrire_objet(&tx, objet)?;
        }
        tx.commit().map_err(en_texte)
    }
}

#[cfg(test)]
mod tests {
    use crate::base::Base;
    use crate::bibliotheque::{Bibliotheque, ObjetModele};
    use crate::essais::{base_jetable, contrat};

    fn base_installee() -> (crate::essais::Dossier, Base) {
        let (dossier, base) = base_jetable();
        base.installer_bibliotheque(&contrat().bibliotheque, "fr")
            .unwrap();
        (dossier, base)
    }

    fn vide() -> Bibliotheque {
        Bibliotheque {
            groupes: vec![],
            etiquettes: vec![],
            categories: vec![],
            objets: vec![],
        }
    }

    fn nombre_de_liens_objet(base: &Base, objet: &str) -> i64 {
        let connexion = base.connexion().unwrap();
        connexion
            .query_row(
                "SELECT COUNT(*) FROM objet_modele_etiquette WHERE objet_id = ?1",
                [objet],
                |r| r.get(0),
            )
            .unwrap()
    }

    #[test]
    fn supprimer_une_categorie_supprime_ses_objets_et_leurs_liens() {
        let (_d, base) = base_installee();
        base.supprimer_categorie("cm-vetements").unwrap();
        let b = base.lire_bibliotheque().unwrap();
        let avant = contrat().bibliotheque;
        assert_eq!(b.categories, vec![avant.categories[1].clone()]);
        assert!(b.objets.iter().all(|o| o.id != "om-tshirts"));
        assert_eq!(b.objets, vec![avant.objets[1].clone()]);
        assert_eq!(nombre_de_liens_objet(&base, "om-tshirts"), 0);
        // Le rang de la survivante ne bouge pas (pas de renumérotation).
        assert_eq!(b.categories[0].ordre, 1);
        assert_eq!(b.groupes, avant.groupes);
        assert_eq!(b.etiquettes, avant.etiquettes);
    }

    #[test]
    fn supprimer_un_objet_ne_touche_que_lui() {
        let (_d, base) = base_installee();
        base.supprimer_objet("om-tshirts").unwrap();
        let b = base.lire_bibliotheque().unwrap();
        let avant = contrat().bibliotheque;
        assert_eq!(b.objets, vec![avant.objets[1].clone()]);
        assert_eq!(b.categories, avant.categories);
        assert_eq!(nombre_de_liens_objet(&base, "om-tshirts"), 0);
    }

    #[test]
    fn supprimer_un_inconnu_est_refuse() {
        let (_d, base) = base_installee();
        assert!(base.supprimer_categorie("cm-inconnue").is_err());
        assert!(base.supprimer_objet("om-inconnu").is_err());
        assert_eq!(base.lire_bibliotheque().unwrap(), contrat().bibliotheque);
    }

    #[test]
    fn retablir_une_categorie_rend_la_bibliotheque_identique() {
        let (_d, base) = base_installee();
        let avant = base.lire_bibliotheque().unwrap();
        base.supprimer_categorie("cm-papiers").unwrap();
        let extrait = Bibliotheque {
            categories: vec![avant.categories[1].clone()],
            objets: vec![avant.objets[1].clone()],
            ..vide()
        };
        base.retablir_bibliotheque(&extrait).unwrap();
        assert_eq!(base.lire_bibliotheque().unwrap(), avant);
    }

    #[test]
    fn retablir_une_etiquette_rend_ses_liens_dans_leur_ordre() {
        let (_d, base) = base_installee();
        // Un objet lié à [camping, froid], dans cet ordre.
        let mut lie: ObjetModele = contrat().bibliotheque.objets[0].clone();
        lie.etiquettes = vec!["et-camping".into(), "et-froid".into()];
        base.enregistrer_objet(&lie).unwrap();
        let avant = base.lire_bibliotheque().unwrap();
        base.supprimer_etiquette("et-camping").unwrap();
        let sans = base.lire_bibliotheque().unwrap();
        assert_eq!(sans.objets[0].etiquettes, vec!["et-froid"]);
        let extrait = Bibliotheque {
            etiquettes: vec![avant.etiquettes[0].clone()],
            objets: vec![avant.objets[0].clone()],
            categories: vec![avant.categories[1].clone()],
            ..vide()
        };
        base.retablir_bibliotheque(&extrait).unwrap();
        let apres = base.lire_bibliotheque().unwrap();
        assert_eq!(apres.objets[0].etiquettes, vec!["et-camping", "et-froid"]);
        // Deux groupes différents peuvent partager le rang 0 : leur ordre relatif dans la liste plate
        // dépend alors de l'écriture, et l'écran les range par groupe. On compare donc par id.
        let par_id = |mut b: Bibliotheque| {
            b.etiquettes.sort_by(|a, b| a.id.cmp(&b.id));
            b
        };
        assert_eq!(par_id(apres), par_id(avant));
    }

    #[test]
    fn retablir_un_groupe_rend_ses_etiquettes_et_leurs_liens() {
        let (_d, base) = base_installee();
        let avant = base.lire_bibliotheque().unwrap();
        base.supprimer_groupe("ge-climat").unwrap();
        let extrait = Bibliotheque {
            groupes: vec![avant.groupes[1].clone()],
            etiquettes: vec![avant.etiquettes[1].clone()],
            objets: vec![avant.objets[0].clone()],
            ..vide()
        };
        base.retablir_bibliotheque(&extrait).unwrap();
        assert_eq!(base.lire_bibliotheque().unwrap(), avant);
    }

    #[test]
    fn retablir_refuse_un_lien_vers_une_etiquette_absente_sans_rien_ecrire() {
        let (_d, base) = base_installee();
        base.supprimer_categorie("cm-papiers").unwrap();
        let avant = base.lire_bibliotheque().unwrap();
        let mut categorie = contrat().bibliotheque.categories[1].clone();
        categorie.etiquettes = vec!["et-absente".into()];
        let extrait = Bibliotheque {
            categories: vec![categorie],
            ..vide()
        };
        assert!(base.retablir_bibliotheque(&extrait).is_err());
        // Un objet dont la catégorie manque est refusé de la même façon.
        let orphelin = Bibliotheque {
            objets: vec![contrat().bibliotheque.objets[1].clone()],
            ..vide()
        };
        assert!(base.retablir_bibliotheque(&orphelin).is_err());
        assert_eq!(base.lire_bibliotheque().unwrap(), avant);
    }

    #[test]
    fn supprimer_ou_retablir_ne_touche_pas_un_voyage() {
        let (_d, base) = base_installee();
        base.creer_voyage(&contrat().voyage).unwrap();
        let avant = base.lire_bibliotheque().unwrap();
        base.supprimer_categorie("cm-vetements").unwrap();
        base.supprimer_objet("om-chargeur").unwrap();
        let extrait = Bibliotheque {
            categories: vec![avant.categories[0].clone()],
            objets: avant.objets.clone(),
            ..vide()
        };
        base.retablir_bibliotheque(&extrait).unwrap();
        let id = contrat().voyage.voyage.id;
        assert_eq!(base.lire_voyage(&id).unwrap(), Some(contrat().voyage));
    }
}
