// Ajuster un voyage déjà créé : ajouter un objet, régler sa quantité, le retirer, et préremplir les
// fiches de la bibliothèque depuis ce qu'on vient d'ajouter (docs/PLAN.md, phase 8). Règles pures :
// le stockage n'y est pour rien.
import { BORNES_QUANTITE, bornerQuantite, nomVide, rangSuivant, refuser } from './modeles.js';
import { joursEtNuits } from './periode.js';
import { calculerQuantite } from './quantites.js';

// Un nom seul, obligatoire : celui d'une catégorie neuve du voyage, ou le nouveau nom d'un objet du voyage.
const validerNom = ({ nom }) => (nomVide(nom) ? { nom: 'nomManquant' } : {});
export const validerNouvelleCategorie = validerNom;
export const validerRenommage = validerNom;

// `categorie` est l'id d'une catégorie du voyage, ou { nouvelle: { nom, icone, couleur } }.
export function validerAjout({ nom, categorie }) {
  const erreurs = {};
  if (nomVide(nom)) erreurs.nom = 'nomManquant';
  if (!categorie || (categorie.nouvelle && Object.keys(validerNouvelleCategorie(categorie.nouvelle)).length))
    erreurs.categorie = 'categorieManquante';
  return erreurs;
}

// Un objet ajouté à la main est fixé : sa quantité est la sienne et n'est jamais recalculée
// (quantiteManuelle). Il ne dit pas « partagé » (parPersonne vrai) et n'a pas de modèle. Sa valeur 0, qu'aucun
// modèle ne peut avoir (au moins 1), dit qu'il n'a jamais eu de formule (aUneFormuleInitiale).
// Une catégorie neuve naît avec cet objet, à la fin du voyage : jamais vide.
export function preparerAjout(saisie, { voyage, categories }, { nouvelId, maintenant }) {
  const erreurs = validerAjout(saisie);
  if (Object.keys(erreurs).length) refuser(erreurs, 'Ajout');
  let nouvelle = null;
  if (saisie.categorie.nouvelle) {
    const { nom, icone, couleur } = saisie.categorie.nouvelle;
    nouvelle = {
      id: nouvelId(),
      voyageId: voyage.id,
      modeleId: null,
      nom: nom.trim(),
      icone,
      couleur,
      ordre: rangSuivant(categories),
      modifieLe: maintenant,
    };
  }
  const quantite = bornerQuantite(saisie.quantite ?? BORNES_QUANTITE.min);
  const objet = {
    id: nouvelId(),
    voyageId: voyage.id,
    categorieId: nouvelle ? nouvelle.id : saisie.categorie,
    modeleId: null,
    nom: saisie.nom.trim(),
    regle: 'fixe',
    valeur: 0,
    plafond: null,
    parPersonne: true,
    consommable: false,
    quantite,
    quantiteManuelle: true,
    dansLeSac: 0,
    aAcheter: false,
    achetes: 0,
    note: '',
    modifieLe: maintenant,
  };
  return { categorie: nouvelle, objet };
}

// − s'arrête à 1 ; + s'arrête à 999, et au-delà si un calcul a dépassé la borne.
export const boutonsDeQuantite = ({ quantite }) => ({
  moins: quantite > BORNES_QUANTITE.min,
  plus: quantite < BORNES_QUANTITE.max,
});

// Une quantité fixée manuellement rappelle la formule d'où elle venait, sauf pour un objet ajouté à la main
// (preparerAjout, valeur 0) : il n'a jamais eu de formule, même mis ensuite dans la bibliothèque.
export const aUneFormuleInitiale = ({ valeur }) => valeur > 0;

// Baisser sous ce qui est déjà dans le sac demande une confirmation, puis le sac suit la quantité ; avec
// « Plus tard » (phase 10), les pièces de trop restent dans le sac et attendent leur sortie.
export const reglageDeQuantite = (objet, quantite, { plusTard = false } = {}) => ({
  quantite,
  dansLeSac: plusTard ? objet.dansLeSac : Math.min(objet.dansLeSac, quantite),
  confirmer: quantite < objet.dansLeSac,
});

// « Le garder dans le voyage », pour un objet retiré qui attend la sortie de ses pièces (phase 10) : la
// quantité que donne sa formule pour ce voyage ; sans formule (ajouté à la main), ou si elle donne 0, ses
// pièces dans le sac, fixées manuellement.
export function quantiteGardee(objet, { depart, retour, voyageurs }) {
  const calcul = aUneFormuleInitiale(objet)
    ? calculerQuantite(objet, { ...joursEtNuits(depart, retour), voyageurs })
    : 0;
  return calcul > 0
    ? { quantite: calcul, quantiteManuelle: false }
    : { quantite: objet.dansLeSac, quantiteManuelle: true };
}

// Ce que « Annuler » réécrira : l'objet tel quel, et sa catégorie seulement si elle disparaît avec lui.
export function extraitDuRetrait({ categories, objets }, objetId) {
  const objet = objets.find(o => o.id === objetId);
  const dernier = !objets.some(o => o.categorieId === objet.categorieId && o.id !== objetId);
  return { categorie: dernier ? categories.find(c => c.id === objet.categorieId) : null, objet };
}

// « Oui » à la bibliothèque : la fiche s'ouvre préremplie, mais sans étiquette (à choisir) ;
// « selon les étiquettes » est donc coché d'office.
export const saisieObjetPourLaBibliotheque = objet => ({
  nom: objet.nom,
  regle: 'fixe',
  valeur: Math.min(objet.quantite, BORNES_QUANTITE.max),
  plafond: null,
  parPersonne: false,
  consommable: false,
  selonEtiquettes: true,
  etiquettes: [],
  note: '',
});

export const saisieCategoriePourLaBibliotheque = ({ nom, icone, couleur }) => ({
  nom,
  icone,
  couleur,
  selonEtiquettes: true,
  etiquettes: [],
});
