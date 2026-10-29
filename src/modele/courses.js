// Les Courses : ce qui reste à acheter, les pièces achetées comptées comme celles du sac (docs/PRD.md,
// US-23, US-24 ; décisions du chef de projet du 2026-10-29,
// docs/superpowers/specs/2026-10-29-phase-9-courses-design.md). Chaque règle n'est écrite qu'ici.
import { etatDePieces } from './sac.js';

// Un objet marqué reste à acheter tant que toutes ses pièces ne le sont pas ; il quitte alors les Courses
// et sa pastille s'efface, mais il garde sa marque : une quantité augmentée l'y ramène pour ce qui manque.
export const resteAAcheter = objet => (objet.aAcheter ? Math.max(0, objet.quantite - objet.achetes) : 0);

export const estAAcheter = objet => resteAAcheter(objet) > 0;

export const etatAchat = objet => etatDePieces(objet.achetes, objet.quantite);

export function bornerAchetes(objet, valeur) {
  return Math.min(Math.max(Math.trunc(valeur), 0), objet.quantite);
}

// Mis en entier dans le sac, un objet marqué a forcément été acheté (ou trouvé à la maison) : il compte
// comme acheté, et le ressortir du sac ne le remet pas dans les Courses.
export const achetesApresSac = (objet, dansLeSac) =>
  objet.aAcheter && dansLeSac >= objet.quantite ? objet.quantite : objet.achetes;

export const achetesApresQuantite = (objet, quantite) => Math.min(objet.achetes, quantite);

// L'interrupteur « À acheter » est allumé tant qu'il reste à acheter. L'éteindre garde les pièces achetées ;
// le rallumer sur un objet tout acheté repart de zéro, sinon il reprend où il en était.
export function basculerAAcheter(objet) {
  if (estAAcheter(objet)) return { aAcheter: false, achetes: objet.achetes };
  return { aAcheter: true, achetes: objet.achetes >= objet.quantite ? 0 : objet.achetes };
}

// Les catégories dans l'ordre du voyage, sans celles qui n'ont rien à acheter ; les objets par nom.
// retenus : les objets tout juste achetés, gardés le temps de leur seconde de répit.
export function listeDesCourses({ categories, objets }, retenus = new Set()) {
  const parNom = (a, b) => a.nom.localeCompare(b.nom, 'fr');
  return [...categories]
    .sort((a, b) => a.ordre - b.ordre)
    .map(categorie => ({
      categorie,
      objets: objets.filter(o => o.categorieId === categorie.id && (estAAcheter(o) || retenus.has(o.id))).sort(parNom),
    }))
    .filter(c => c.objets.length);
}

// « rien » : aucun objet marqué ; « faites » : tout ce qui était marqué est acheté.
export function etatDesCourses(objets) {
  if (!objets.some(o => o.aAcheter)) return 'rien';
  return objets.some(estAAcheter) ? 'a-faire' : 'faites';
}
