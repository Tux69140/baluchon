// Variante navigateur du stockage, pour les tests d’écran : même forme que le stockage Tauri, données
// rangées dans le navigateur sous une seule clé. Un test y dépose son état de départ avant le
// chargement de la page ; « pannes » y simule une erreur de lecture ou d’enregistrement, « lenteurs » une
// écriture (ou une lecture de la bibliothèque) qui n'aboutit que lorsque le test appelle
// window.debloquerStockage(), « toucheRetour » la touche retour d'Android (ecouterRetourNavigateur).
import { lireFiltre, ecrireFiltre } from './preferences.js';
import {
  lire,
  ecrire,
  panne,
  lenteur,
  bibliothequeDe,
  verifierEtiquettes,
  remplacerOuAjouter,
  ecritureDe,
  verifierAchetes,
} from './navigateur-outils.js';
import { ajustementsNavigateur } from './navigateur-voyages.js';

// La base relit par rang puis par ordre de création ; le tri est stable, comme ORDER BY ordre, rowid.
const trierParOrdre = liste => [...liste].sort((a, b) => a.ordre - b.ordre);

const trouver = (liste, id) => liste.find(x => x.id === id);

function verifierListeExacte(existants, ids, quoi) {
  const attendus = existants.map(x => x.id).sort();
  if (JSON.stringify([...ids].sort()) !== JSON.stringify(attendus)) {
    throw new Error(`La liste ne contient pas exactement ${quoi}`);
  }
}

// Supprimer des étiquettes les retire des catégories et objets modèles, sans rien changer d'autre
// (pas même leur `modifieLe`), comme le ON DELETE CASCADE de la base.
function sansEtiquettes(bibliotheque, retirees) {
  const retire = modele => ({ ...modele, etiquettes: modele.etiquettes.filter(id => !retirees.includes(id)) });
  return {
    ...bibliotheque,
    etiquettes: bibliotheque.etiquettes.filter(e => !retirees.includes(e.id)),
    categories: bibliotheque.categories.map(retire),
    objets: bibliotheque.objets.map(retire),
  };
}

export function creerStockageNavigateur() {
  return Object.freeze({
    async listerVoyages() {
      const donnees = lire();
      panne(donnees, 'listerVoyages');
      return donnees.voyages ?? [];
    },
    bibliothequeInstallee: async () => Boolean(lire().meta?.bibliothequeInstallee),
    async installerBibliotheque(bibliotheque, langue) {
      const donnees = lire();
      if (donnees.meta?.bibliothequeInstallee) return false;
      ecrire({ ...donnees, bibliotheque, meta: { bibliothequeInstallee: true, langueBibliotheque: langue } });
      return true;
    },
    // Lente, elle rend l'état lu à l'appel, comme une réponse de la base qui tarde à revenir.
    async lireBibliotheque() {
      const donnees = lire();
      panne(donnees, 'lireBibliotheque');
      await lenteur(donnees, 'lireBibliotheque');
      return bibliothequeDe(donnees);
    },
    async enregistrerCategorie(categorie) {
      const donnees = await ecritureDe('enregistrerCategorie');
      const bibliotheque = bibliothequeDe(donnees);
      verifierEtiquettes(bibliotheque, categorie.etiquettes);
      // Le rang ne change qu'à la création : seul rangerCategories déplace une catégorie existante.
      const categories = remplacerOuAjouter(bibliotheque.categories, categorie, ['ordre']);
      ecrire({ ...donnees, bibliotheque: { ...bibliotheque, categories } });
    },
    async enregistrerObjet(objet) {
      const donnees = await ecritureDe('enregistrerObjet');
      const bibliotheque = bibliothequeDe(donnees);
      verifierEtiquettes(bibliotheque, objet.etiquettes);
      const existant = bibliotheque.objets.find(o => o.id === objet.id);
      if (!existant && !bibliotheque.categories.some(c => c.id === objet.categorieId)) {
        throw new Error(`Catégorie inconnue : ${objet.categorieId}`);
      }
      // La catégorie d'un objet ne se change pas.
      const objets = remplacerOuAjouter(bibliotheque.objets, objet, ['categorieId']);
      ecrire({ ...donnees, bibliotheque: { ...bibliotheque, objets } });
    },
    async rangerCategories(ids, modifieLe) {
      const donnees = await ecritureDe('rangerCategories');
      const bibliotheque = bibliothequeDe(donnees);
      verifierListeExacte(bibliotheque.categories, ids, 'les catégories existantes');
      const categories = ids.map((id, ordre) => ({
        ...bibliotheque.categories.find(c => c.id === id),
        ordre,
        modifieLe,
      }));
      ecrire({ ...donnees, bibliotheque: { ...bibliotheque, categories } });
    },
    // Étiquettes : mêmes refus que la base (src-tauri/src/etiquettes.rs).
    async enregistrerGroupe(groupe) {
      const donnees = await ecritureDe('enregistrerGroupe');
      const bibliotheque = bibliothequeDe(donnees);
      // Le rang ne change qu'à la création : seul rangerGroupes déplace un groupe existant.
      const groupes = trierParOrdre(remplacerOuAjouter(bibliotheque.groupes, groupe, ['ordre']));
      ecrire({ ...donnees, bibliotheque: { ...bibliotheque, groupes } });
    },
    async enregistrerEtiquette(etiquette) {
      const donnees = await ecritureDe('enregistrerEtiquette');
      const bibliotheque = bibliothequeDe(donnees);
      if (
        !bibliotheque.groupes.some(g => g.id === etiquette.groupeId) &&
        !trouver(bibliotheque.etiquettes, etiquette.id)
      ) {
        throw new Error(`Groupe inconnu : ${etiquette.groupeId}`);
      }
      // Une étiquette reste dans son groupe et à son rang.
      const etiquettes = trierParOrdre(remplacerOuAjouter(bibliotheque.etiquettes, etiquette, ['groupeId', 'ordre']));
      ecrire({ ...donnees, bibliotheque: { ...bibliotheque, etiquettes } });
    },
    async rangerGroupes(ids, modifieLe) {
      const donnees = await ecritureDe('rangerGroupes');
      const bibliotheque = bibliothequeDe(donnees);
      verifierListeExacte(bibliotheque.groupes, ids, 'les groupes existants');
      const groupes = ids.map((id, ordre) => ({ ...trouver(bibliotheque.groupes, id), ordre, modifieLe }));
      ecrire({ ...donnees, bibliotheque: { ...bibliotheque, groupes } });
    },
    async rangerEtiquettes(groupeId, ids, modifieLe) {
      const donnees = await ecritureDe('rangerEtiquettes');
      const bibliotheque = bibliothequeDe(donnees);
      if (!trouver(bibliotheque.groupes, groupeId)) throw new Error(`Groupe inconnu : ${groupeId}`);
      verifierListeExacte(
        bibliotheque.etiquettes.filter(e => e.groupeId === groupeId),
        ids,
        'les étiquettes de ce groupe',
      );
      const rangees = new Map(ids.map((id, ordre) => [id, ordre]));
      const etiquettes = trierParOrdre(
        bibliotheque.etiquettes.map(e => (rangees.has(e.id) ? { ...e, ordre: rangees.get(e.id), modifieLe } : e)),
      );
      ecrire({ ...donnees, bibliotheque: { ...bibliotheque, etiquettes } });
    },
    async supprimerEtiquette(id) {
      const donnees = await ecritureDe('supprimerEtiquette');
      const bibliotheque = bibliothequeDe(donnees);
      if (!trouver(bibliotheque.etiquettes, id)) throw new Error(`Étiquette inconnue : ${id}`);
      ecrire({ ...donnees, bibliotheque: sansEtiquettes(bibliotheque, [id]) });
    },
    async supprimerGroupe(id) {
      const donnees = await ecritureDe('supprimerGroupe');
      const bibliotheque = bibliothequeDe(donnees);
      if (!trouver(bibliotheque.groupes, id)) throw new Error(`Groupe inconnu : ${id}`);
      const parties = bibliotheque.etiquettes.filter(e => e.groupeId === id).map(e => e.id);
      const groupes = bibliotheque.groupes.filter(g => g.id !== id);
      ecrire({ ...donnees, bibliotheque: { ...sansEtiquettes(bibliotheque, parties), groupes } });
    },
    async supprimerCategorie(id) {
      const donnees = await ecritureDe('supprimerCategorie');
      const bibliotheque = bibliothequeDe(donnees);
      if (!trouver(bibliotheque.categories, id)) throw new Error(`Catégorie inconnue : ${id}`);
      // Comme la base : les objets de la catégorie partent avec elle.
      const categories = bibliotheque.categories.filter(c => c.id !== id);
      const objets = bibliotheque.objets.filter(o => o.categorieId !== id);
      ecrire({ ...donnees, bibliotheque: { ...bibliotheque, categories, objets } });
    },
    async supprimerObjet(id) {
      const donnees = await ecritureDe('supprimerObjet');
      const bibliotheque = bibliothequeDe(donnees);
      if (!trouver(bibliotheque.objets, id)) throw new Error(`Objet inconnu : ${id}`);
      const objets = bibliotheque.objets.filter(o => o.id !== id);
      ecrire({ ...donnees, bibliotheque: { ...bibliotheque, objets } });
    },
    // Réécrit l'extrait tel qu'il était (src-tauri/src/suppressions.rs) : parents d'abord, un lien vers une
    // étiquette absente ou un objet d'une catégorie absente fait tout refuser.
    async retablirBibliotheque(extrait) {
      const donnees = await ecritureDe('retablirBibliotheque');
      let { groupes, etiquettes, categories, objets } = bibliothequeDe(donnees);
      for (const groupe of extrait.groupes) groupes = remplacerOuAjouter(groupes, groupe, ['ordre']);
      for (const etiquette of extrait.etiquettes) {
        if (!trouver(groupes, etiquette.groupeId)) throw new Error(`Groupe inconnu : ${etiquette.groupeId}`);
        etiquettes = remplacerOuAjouter(etiquettes, etiquette, ['groupeId', 'ordre']);
      }
      const connues = { ...bibliothequeDe(donnees), groupes, etiquettes };
      for (const categorie of extrait.categories) {
        verifierEtiquettes(connues, categorie.etiquettes);
        categories = remplacerOuAjouter(categories, categorie, ['ordre']);
      }
      for (const objet of extrait.objets) {
        verifierEtiquettes(connues, objet.etiquettes);
        if (!trouver(categories, objet.categorieId) && !trouver(objets, objet.id)) {
          throw new Error(`Catégorie inconnue : ${objet.categorieId}`);
        }
        objets = remplacerOuAjouter(objets, objet, ['categorieId']);
      }
      // La base relit les catégories par rang et les objets par rang de catégorie, puis par création.
      const rangDe = id => trouver(categories, id).ordre;
      const bibliotheque = {
        groupes: trierParOrdre(groupes),
        etiquettes: trierParOrdre(etiquettes),
        categories: trierParOrdre(categories),
        objets: [...objets].sort((a, b) => rangDe(a.categorieId) - rangDe(b.categorieId)),
      };
      ecrire({ ...donnees, bibliotheque });
    },
    async creerVoyage({ voyage, etiquettes, categories, objets }) {
      const donnees = lire();
      panne(donnees, 'creerVoyage');
      await lenteur(donnees, 'creerVoyage');
      ecrire({
        ...donnees,
        voyages: [...(donnees.voyages ?? []), voyage],
        etiquettesDuVoyage: [...(donnees.etiquettesDuVoyage ?? []), ...etiquettes],
        categoriesDuVoyage: [...(donnees.categoriesDuVoyage ?? []), ...categories],
        objetsDuVoyage: [...(donnees.objetsDuVoyage ?? []), ...objets],
      });
    },
    async lireVoyage(id) {
      await lenteur(lire(), 'lireVoyage');
      const donnees = lire();
      panne(donnees, 'lireVoyage');
      const voyage = (donnees.voyages ?? []).find(v => v.id === id);
      if (!voyage) return null;
      return {
        voyage,
        // Un voyage enregistré avant les étiquettes n'a pas la clé : liste vide.
        etiquettes: (donnees.etiquettesDuVoyage ?? []).filter(e => e.voyageId === id),
        // Par rang, puis par création, comme la base : une catégorie rétablie retrouve sa place.
        categories: trierParOrdre((donnees.categoriesDuVoyage ?? []).filter(c => c.voyageId === id)),
        objets: (donnees.objetsDuVoyage ?? []).filter(o => o.voyageId === id),
      };
    },
    async reglerDansLeSac(id, dansLeSac, achetes, modifieLe) {
      const donnees = lire();
      panne(donnees, 'reglerDansLeSac');
      const objets = donnees.objetsDuVoyage ?? [];
      const objet = objets.find(o => o.id === id);
      if (!objet) throw new Error(`Objet inconnu : ${id}`);
      // Même refus que la base : un nombre entier de pièces, de 0 à la quantité de l’objet.
      if (!Number.isInteger(dansLeSac) || dansLeSac < 0 || dansLeSac > objet.quantite) {
        throw new Error(`Pièces dans le sac hors bornes : ${dansLeSac}`);
      }
      verifierAchetes(achetes, objet.quantite);
      ecrire({
        ...donnees,
        objetsDuVoyage: objets.map(o => (o.id === id ? { ...o, dansLeSac, achetes, modifieLe } : o)),
      });
    },
    async etatsDesObjets() {
      const donnees = lire();
      panne(donnees, 'etatsDesObjets');
      return (donnees.objetsDuVoyage ?? []).map(({ voyageId, quantite, dansLeSac }) => ({
        voyageId,
        quantite,
        dansLeSac,
      }));
    },
    ...ajustementsNavigateur,
    lireFiltre,
    ecrireFiltre,
  });
}

// Un navigateur n'a pas de touche retour d'Android : rien à écouter. Un test d'écran qui la simule le
// demande (« toucheRetour ») : window.toucheRetour() joue un appui, et une sortie de l'appli
// demandée (mise en arrière-plan sous Android) se compte dans window.sortiesDemandees.
export function ecouterRetourNavigateur(gerer) {
  if (!lire().toucheRetour) return;
  window.sortiesDemandees = 0;
  window.toucheRetour = () => {
    if (!gerer()) window.sortiesDemandees += 1;
  };
}
