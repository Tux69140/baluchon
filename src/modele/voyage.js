// Un voyage : validation des informations saisies, génération depuis la bibliothèque, ordre de sa
// liste et classement des voyages (docs/PLAN.md, phase 2).
import { estDate } from './dates.js';
import { etiquettesChoisies, genererApercu, parOrdre } from './inclusion.js';
import { dateLimite } from './periode.js';
import { ordreDansLeSac } from './sac.js';

export const VOYAGEURS = Object.freeze({ min: 1, max: 20, parDefaut: 2 });

// Les erreurs, rangées par champ ; un objet vide quand tout est bon. Chaque code a son texte dans
// fr.json (nouveauVoyage.erreurs.*). L'écran rend la plupart impossibles (calendrier, − / +), mais
// la règle vit ici : c'est elle qui refuse un voyage absurde, d'où qu'il vienne.
export function validerInformations({ nom, depart, retour, voyageurs }) {
  const erreurs = {};
  if (!String(nom ?? '').trim()) erreurs.nom = 'nomManquant';
  if (!depart || !retour) erreurs.dates = 'datesManquantes';
  else if (!estDate(depart) || !estDate(retour)) erreurs.dates = 'datesInvalides';
  else if (retour < depart) erreurs.dates = 'retourAvantDepart';
  else if (retour > dateLimite(depart)) erreurs.dates = 'tropLong';
  if (!Number.isInteger(voyageurs) || voyageurs < VOYAGEURS.min || voyageurs > VOYAGEURS.max)
    erreurs.voyageurs = 'voyageursHorsLimites';
  return erreurs;
}

const parNom = (a, b) => a.nom.localeCompare(b.nom);

// Le voyage est une copie indépendante de la bibliothèque : il ne garde du modèle que son
// identifiant d'origine (modeleId). L'inclusion vient de l'aperçu (une seule définition) ; `ecartes`
// porte les objets modèles que l'utilisateur a décochés dans l'aperçu. Les étiquettes choisies sont
// copiées dans l'ordre des groupes.
export function genererVoyage(bibliotheque, infos, { choisies, ecartes }, { nouvelId, maintenant }) {
  const erreurs = validerInformations(infos);
  if (Object.keys(erreurs).length)
    throw Object.assign(new Error(`Voyage refusé : ${Object.values(erreurs).join(', ')}`), { erreurs });
  const { depart, retour, voyageurs } = infos;
  const voyage = {
    id: nouvelId(),
    nom: infos.nom.trim(),
    destination: String(infos.destination ?? '').trim(),
    depart,
    retour,
    voyageurs,
    modifieLe: maintenant,
  };
  const ids = { nouvelId, maintenant };
  const etiquettes = etiquettesChoisies(bibliotheque, choisies).map((etiquette, ordre) =>
    copierEtiquette(etiquette, voyage.id, ordre, ids),
  );
  const categories = [];
  const objets = [];
  for (const { categorie: modele, objets: lignes } of genererApercu(bibliotheque, infos, choisies)) {
    const retenus = lignes.filter(({ objet }) => !ecartes.has(objet.id));
    if (!retenus.length) continue;
    const categorie = copierCategorie(modele, voyage.id, ids);
    categories.push(categorie);
    for (const { objet, quantite } of retenus)
      objets.push(copierObjet(objet, { voyageId: voyage.id, categorieId: categorie.id, quantite }, ids));
  }
  return { voyage, etiquettes, categories, objets, ecartes: [...ecartes].sort() };
}

// Une étiquette, une catégorie et un objet de la bibliothèque copiés dans un voyage : à la création
// comme quand les plans changent (src/modele/changements.js). « À acheter » reprend « consommable »
// (écran Courses, phase 9) ; rien n'est encore dans le sac ni acheté.
export function copierEtiquette({ id, nom }, voyageId, ordre, { nouvelId, maintenant }) {
  return { id: nouvelId(), voyageId, modeleId: id, nom, ordre, modifieLe: maintenant };
}

export function copierCategorie({ id, nom, icone, couleur, ordre }, voyageId, { nouvelId, maintenant }) {
  return { id: nouvelId(), voyageId, modeleId: id, nom, icone, couleur, ordre, modifieLe: maintenant };
}

export function copierObjet(modele, { voyageId, categorieId, quantite }, { nouvelId, maintenant }) {
  return {
    id: nouvelId(),
    voyageId,
    categorieId,
    modeleId: modele.id,
    nom: modele.nom,
    regle: modele.regle,
    valeur: modele.valeur,
    plafond: modele.plafond,
    parPersonne: modele.parPersonne,
    consommable: modele.consommable,
    quantite,
    quantiteManuelle: false,
    dansLeSac: 0,
    aAcheter: modele.consommable,
    achetes: 0,
    note: modele.note,
    modifieLe: maintenant,
  };
}

// La liste d'un voyage à l'écran : catégories dans l'ordre de la bibliothèque, objets par nom,
// les complets en bas (ordreDansLeSac ; docs/PRD.md, « Écrans et gestes »).
export function listeParCategorie({ categories, objets }) {
  return [...categories]
    .sort(parOrdre)
    .map(categorie => ({ categorie, objets: ordreDansLeSac(objets.filter(o => o.categorieId === categorie.id)) }));
}

// En cours (départ ≤ aujourd'hui ≤ retour), puis à venir du plus proche au plus lointain, puis
// passés du plus récent au plus ancien (docs/PRD.md, « Liste des voyages »).
const parDepart = (a, b) => a.depart.localeCompare(b.depart) || parNom(a, b);
const parRetourRecent = (a, b) => b.retour.localeCompare(a.retour) || parNom(a, b);

export function classerVoyages(voyages, aujourdhui) {
  const enCours = [];
  const aVenir = [];
  const passes = [];
  for (const v of voyages) (v.retour < aujourdhui ? passes : v.depart > aujourdhui ? aVenir : enCours).push(v);
  return { enCours: enCours.sort(parDepart), aVenir: aVenir.sort(parDepart), passes: passes.sort(parRetourRecent) };
}
