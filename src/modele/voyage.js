// Un voyage : validation des informations saisies, génération depuis la bibliothèque, ordre de sa
// liste et classement des voyages (docs/PLAN.md, phase 2).
import { estDate } from './dates.js';
import { etiquettesChoisies, genererApercu, parOrdre } from './inclusion.js';
import { rangSuivant } from './modeles.js';
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
// porte les objets que l'utilisateur a décochés dans l'aperçu. Les étiquettes choisies sont copiées
// dans l'ordre des groupes. L'aperçu d'un voyage refait (src/modele/refaire.js) y ajoute des lignes
// `ajout` (objets ajoutés à la main), des lignes `manuelle` (quantité fixée gardée) et des catégories
// `origine` (reprises du voyage d'origine).
export function genererVoyage(bibliotheque, infos, { choisies, ecartes, apercu }, { nouvelId, maintenant }) {
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
  const groupes = apercu ?? genererApercu(bibliotheque, infos, choisies);
  for (const { categorie: modele, objets: lignes, origine } of groupes) {
    const retenus = lignes.filter(({ objet }) => !ecartes.has(objet.id));
    if (!retenus.length) continue;
    // Une catégorie du voyage d'origine garde le modèle d'où elle venait (aucun, si elle lui était propre) ;
    // venue en fin d'aperçu, elle prend son rang après celles déjà copiées : son rang d'origine la ferait
    // remonter parmi celles de la bibliothèque.
    const copie = copierCategorie(modele, voyage.id, ids);
    const categorie = origine ? { ...copie, modeleId: modele.modeleId, ordre: rangSuivant(categories) } : copie;
    categories.push(categorie);
    const place = { voyageId: voyage.id, categorieId: categorie.id };
    for (const { objet, quantite, ajout, manuelle } of retenus)
      objets.push(
        ajout
          ? copierAjout(objet, place, ids)
          : copierObjet(objet, { ...place, quantite, quantiteManuelle: Boolean(manuelle) }, ids),
      );
  }
  // La mémoire des écartés (décision 11) : les objets de l'aperçu que l'assistant a décochés, hors ajouts
  // à la main ; un id écarté qui n'y figure plus n'est pas retenu.
  const retenus = groupes
    .flatMap(({ objets: lignes }) => lignes.filter(l => !l.ajout).map(l => l.objet.id))
    .filter(id => ecartes.has(id));
  return { voyage, etiquettes, categories, objets, ecartes: [...new Set(retenus)].sort() };
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

export function copierObjet(
  modele,
  { voyageId, categorieId, quantite, quantiteManuelle = false },
  { nouvelId, maintenant },
) {
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
    quantiteManuelle,
    dansLeSac: 0,
    aAcheter: modele.consommable,
    achetes: 0,
    note: modele.note,
    modifieLe: maintenant,
  };
}

// Un objet ajouté à la main dans un voyage d'origine, repris dans un voyage refait : tel quel (quantité,
// « fixée manuellement », « à acheter »), sauf qu'il n'est encore ni dans le sac ni acheté.
export function copierAjout(objet, { voyageId, categorieId }, { nouvelId, maintenant }) {
  return { ...objet, id: nouvelId(), voyageId, categorieId, dansLeSac: 0, achetes: 0, modifieLe: maintenant };
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
