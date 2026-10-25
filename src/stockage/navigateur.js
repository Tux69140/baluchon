// Variante navigateur du stockage, pour les tests d’écran : même forme que le stockage Tauri, données
// rangées dans le navigateur sous une seule clé. Un test y dépose son état de départ avant le
// chargement de la page ; « pannes » y simule une erreur de lecture ou d’enregistrement.
import { lireFiltre, ecrireFiltre } from './preferences.js';

const CLE = 'baluchon-essai';

function lire() {
  try {
    return JSON.parse(localStorage.getItem(CLE)) ?? {};
  } catch {
    return {};
  }
}

const ecrire = donnees => localStorage.setItem(CLE, JSON.stringify(donnees));

// Une panne simulée fait échouer l’opération nommée, comme une base illisible ou pleine.
function panne(donnees, operation) {
  if (donnees.pannes?.includes(operation)) throw new Error(`Panne simulée : ${operation}`);
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
    lireBibliotheque: async () => lire().bibliotheque ?? { groupes: [], etiquettes: [], categories: [], objets: [] },
    async creerVoyage({ voyage, etiquettes, categories, objets }) {
      const donnees = lire();
      panne(donnees, 'creerVoyage');
      ecrire({
        ...donnees,
        voyages: [...(donnees.voyages ?? []), voyage],
        etiquettesDuVoyage: [...(donnees.etiquettesDuVoyage ?? []), ...etiquettes],
        categoriesDuVoyage: [...(donnees.categoriesDuVoyage ?? []), ...categories],
        objetsDuVoyage: [...(donnees.objetsDuVoyage ?? []), ...objets],
      });
    },
    async lireVoyage(id) {
      const donnees = lire();
      panne(donnees, 'lireVoyage');
      const voyage = (donnees.voyages ?? []).find(v => v.id === id);
      if (!voyage) return null;
      return {
        voyage,
        // Un voyage enregistré avant les étiquettes n'a pas la clé : liste vide.
        etiquettes: (donnees.etiquettesDuVoyage ?? []).filter(e => e.voyageId === id),
        categories: (donnees.categoriesDuVoyage ?? []).filter(c => c.voyageId === id),
        objets: (donnees.objetsDuVoyage ?? []).filter(o => o.voyageId === id),
      };
    },
    async reglerDansLeSac(id, dansLeSac, modifieLe) {
      const donnees = lire();
      panne(donnees, 'reglerDansLeSac');
      const objets = donnees.objetsDuVoyage ?? [];
      const objet = objets.find(o => o.id === id);
      if (!objet) throw new Error(`Objet inconnu : ${id}`);
      // Même refus que la base : un nombre entier de pièces, de 0 à la quantité de l’objet.
      if (!Number.isInteger(dansLeSac) || dansLeSac < 0 || dansLeSac > objet.quantite) {
        throw new Error(`Pièces dans le sac hors bornes : ${dansLeSac}`);
      }
      ecrire({ ...donnees, objetsDuVoyage: objets.map(o => (o.id === id ? { ...o, dansLeSac, modifieLe } : o)) });
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
    lireFiltre,
    ecrireFiltre,
  });
}
