// Ce qu'emporte une suppression dans la bibliothèque, et de quoi l'annuler. Seul endroit où vit la
// règle des orphelins : l'écran la montre (question, refus) et la base ne la connaît pas, c'est le
// modèle qui refuse avant d'écrire.
// cible : { type: 'categorie' | 'objet' | 'etiquette' | 'groupe', id }.
// Ce qu'emporte la suppression d'un voyage entier (phase 11) : consequencesVoyage.
import { parOrdre } from './inclusion.js';
import { estRetire } from './sac.js';

// Les étiquettes que la cible supprime, par rang (celles du groupe, ou l'étiquette seule).
function etiquettesSupprimees({ etiquettes }, cible) {
  if (cible.type === 'groupe') return etiquettes.filter(e => e.groupeId === cible.id).sort(parOrdre);
  if (cible.type === 'etiquette') return etiquettes.filter(e => e.id === cible.id);
  return [];
}

// Orphelin : ni « toujours inclus », ni autre étiquette que celles qui partent. « Perd » : il en
// porte une qui part mais garde de quoi entrer dans un voyage. Un modèle déjà sans étiquette n'est
// touché par rien : il ne bloque pas et ne perd rien.
function classer(element, toujours, supprimees, resultat) {
  const touchees = element.etiquettes.filter(id => supprimees.has(id));
  if (!touchees.length) return;
  const bloque = !toujours && touchees.length === element.etiquettes.length;
  resultat[bloque ? 'bloquent' : 'perdent'].push(element);
}

export function consequences(bibliotheque, cible, langue) {
  const resultat = {
    objets: [],
    etiquettes: etiquettesSupprimees(bibliotheque, cible),
    perdent: { categories: [], objets: [] },
    bloquent: { categories: [], objets: [] },
  };
  if (cible.type === 'categorie') {
    resultat.objets = bibliotheque.objets
      .filter(o => o.categorieId === cible.id)
      .sort((a, b) => a.nom.localeCompare(b.nom, langue));
    return resultat;
  }
  const supprimees = new Set(resultat.etiquettes.map(e => e.id));
  if (!supprimees.size) return resultat;

  const parCategorie = { perdent: [], bloquent: [] };
  const categories = [...bibliotheque.categories].sort(parOrdre);
  const rangs = new Map(categories.map(c => [c.id, c.ordre]));
  for (const categorie of categories) classer(categorie, categorie.toujoursIncluse, supprimees, parCategorie);
  const objets = { perdent: [], bloquent: [] };
  const parRangPuisNom = (a, b) =>
    rangs.get(a.categorieId) - rangs.get(b.categorieId) || a.nom.localeCompare(b.nom, langue);
  for (const objet of [...bibliotheque.objets].sort(parRangPuisNom)) {
    classer(objet, objet.toujoursInclus, supprimees, objets);
  }
  resultat.perdent = { categories: parCategorie.perdent, objets: objets.perdent };
  resultat.bloquent = { categories: parCategorie.bloquent, objets: objets.bloquent };
  return resultat;
}

export const estBloquee = ({ bloquent }) => bloquent.categories.length > 0 || bloquent.objets.length > 0;

// Les identifiants de tout ce que dit consequences(), chaque liste triée : deux lectures se comparent
// sans dépendre de l'ordre d'affichage.
const ids = liste => liste.map(x => x.id).sort();
const empreinte = ({ objets, etiquettes, perdent, bloquent }) =>
  JSON.stringify(
    [objets, etiquettes, perdent.categories, perdent.objets, bloquent.categories, bloquent.objets].map(ids),
  );

// Deux résultats de consequences() emportent, font perdre et bloquent les mêmes éléments. Entre la
// question et l'écriture, « Annuler » a pu rendre un élément : la suppression n'écrit que si ce
// qu'elle emporte est bien ce qu'elle a annoncé (constat C1 de la relecture finale de la phase 7).
export const memesConsequences = (annoncees, actuelles) => empreinte(annoncees) === empreinte(actuelles);

// Les lignes entières, telles qu'avant, de tout ce que la suppression enlève ou modifie : c'est ce
// qu'« Annuler » remet, à l'identique (mêmes rangs, mêmes dates, mêmes liens dans le même ordre).
export function extraitAvant(bibliotheque, cible) {
  const { type, id } = cible;
  const supprimees = new Set(etiquettesSupprimees(bibliotheque, cible).map(e => e.id));
  const portent = element => element.etiquettes.some(e => supprimees.has(e));
  const extrait = { groupes: [], etiquettes: [], categories: [], objets: [] };
  if (type === 'categorie') {
    extrait.categories = bibliotheque.categories.filter(c => c.id === id);
    extrait.objets = bibliotheque.objets.filter(o => o.categorieId === id);
  } else if (type === 'objet') {
    extrait.objets = bibliotheque.objets.filter(o => o.id === id);
  } else {
    if (type === 'groupe') extrait.groupes = bibliotheque.groupes.filter(g => g.id === id);
    extrait.etiquettes = bibliotheque.etiquettes.filter(e => supprimees.has(e.id));
    extrait.categories = bibliotheque.categories.filter(portent);
    extrait.objets = bibliotheque.objets.filter(portent);
  }
  // Copie profonde : l'écran ne doit pas voir l'extrait changer quand la bibliothèque change.
  return structuredClone(extrait);
}

// Ce que la question avant de supprimer un voyage chiffre (décision 10 de la phase 11) : objets, ceux de sa
// liste (un objet retiré, même avec des pièces encore à sortir, n'en fait plus partie) ; dansLeSac, les
// objets qui ont au moins une pièce dans le sac, retirés compris (on compte des objets, pas des pièces).
export const consequencesVoyage = ({ objets }) => ({
  objets: objets.filter(o => !estRetire(o)).length,
  dansLeSac: objets.filter(o => o.dansLeSac > 0).length,
});
