// Les tests des Courses (courses.rs), à part pour garder chaque fichier court.
use super::*;
use crate::essais::{base_jetable, contrat, Dossier};

const MAINTENANT: &str = "2026-10-29T10:00:00.000Z";

fn base_avec_voyage() -> (Dossier, Base) {
    let (dossier, base) = base_jetable();
    base.creer_voyage(&contrat().voyage).unwrap();
    (dossier, base)
}

fn repas(base: &Base) -> crate::voyages::ObjetDuVoyage {
    let relu = base.lire_voyage("v-vercors").unwrap().unwrap();
    relu.objets
        .into_iter()
        .find(|o| o.id == "ov-repas")
        .unwrap()
}

#[test]
fn regler_les_achats_est_relu() {
    let (_dossier, base) = base_avec_voyage();
    base.regler_achats("ov-repas", true, 6, MAINTENANT).unwrap();
    let objet = repas(&base);
    assert_eq!((objet.a_acheter, objet.achetes), (true, 6));
    assert_eq!(objet.modifie_le, MAINTENANT);
    base.regler_achats("ov-repas", false, 6, MAINTENANT)
        .unwrap();
    assert!(!repas(&base).a_acheter);
}

#[test]
fn regler_les_achats_refuse_hors_bornes_et_objet_inconnu() {
    let (_dossier, base) = base_avec_voyage();
    let avant = repas(&base);
    assert_eq!(
        base.regler_achats("ov-repas", true, 17, MAINTENANT),
        Err("Les pièces achetées dépassent la quantité prévue.".to_owned())
    );
    assert!(base
        .regler_achats("ov-repas", true, -1, MAINTENANT)
        .is_err());
    assert_eq!(
        base.regler_achats("inconnu", true, 0, MAINTENANT),
        Err("Objet introuvable.".to_owned())
    );
    assert_eq!(repas(&base), avant);
}
