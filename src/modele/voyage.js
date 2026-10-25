// Un voyage : validation des informations saisies, génération depuis la bibliothèque, ordre de sa
// liste et classement des voyages (docs/PLAN.md, phase 2).
import { estDate } from './dates.js';
import { etiquettesChoisies, genererApercu } from './inclusion.js';
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

const parOrdre = (a, b) => a.ordre - b.ordre;
const parNom = (a, b) => a.nom.localeCompare(b.nom);

// Le voyage est une copie indépendante de la bibliothèque : il ne garde du modèle que son
// identifiant d'origine (modeleId). L'inclusion vient de l'aperçu (une seule définition) ; `ecartes`
// porte les objets modèles que l'utilisateur a décochés dans l'aperçu. Les étiquettes choisies sont
// copiées dans l'ordre des groupes. « À acheter » reprend « consommable » (écran Courses, phase 9).
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
  const etiquettes = etiquettesChoisies(bibliotheque, choisies).map(({ id, nom }, ordre) => ({
    id: nouvelId(),
    voyageId: voyage.id,
    modeleId: id,
    nom,
    ordre,
    modifieLe: maintenant,
  }));
  const categories = [];
  const objets = [];
  for (const { categorie: modele, objets: lignes } of genererApercu(bibliotheque, infos, choisies)) {
    const retenus = lignes.filter(({ objet }) => !ecartes.has(objet.id));
    if (!retenus.length) continue;
    const { nom, icone, couleur, ordre } = modele;
    const categorie = {
      id: nouvelId(),
      voyageId: voyage.id,
      modeleId: modele.id,
      nom,
      icone,
      couleur,
      ordre,
      modifieLe: maintenant,
    };
    categories.push(categorie);
    for (const { objet: o, quantite } of retenus)
      objets.push({
        id: nouvelId(),
        voyageId: voyage.id,
        categorieId: categorie.id,
        modeleId: o.id,
        nom: o.nom,
        regle: o.regle,
        valeur: o.valeur,
        plafond: o.plafond,
        parPersonne: o.parPersonne,
        consommable: o.consommable,
        quantite,
        quantiteManuelle: false,
        dansLeSac: 0,
        aAcheter: o.consommable,
        achete: false,
        note: o.note,
        modifieLe: maintenant,
      });
  }
  return { voyage, etiquettes, categories, objets };
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
