// Quelles catégories et quels objets de la bibliothèque entrent dans un voyage, selon les étiquettes
// choisies (docs/PRD.md, « Inclusion »). Seul endroit où cette règle existe : l'aperçu de l'assistant
// et la génération du voyage s'y appuient tous les deux.
import { joursEtNuits } from './periode.js';
import { calculerQuantite } from './quantites.js';

const parOrdre = (a, b) => a.ordre - b.ordre;

// Entre s'il est « toujours inclus », ou si au moins une de ses étiquettes est choisie.
export function estInclus({ toujours, etiquettes }, choisies) {
  return toujours || etiquettes.some(id => choisies.has(id));
}

// Les groupes dans l'ordre, chacun avec ses étiquettes dans l'ordre ; un groupe sans étiquette n'a
// rien à proposer, il n'est donc pas une étape de l'assistant.
export function groupesAvecEtiquettes({ groupes, etiquettes }) {
  return [...groupes]
    .sort(parOrdre)
    .map(groupe => ({ groupe, etiquettes: etiquettes.filter(e => e.groupeId === groupe.id).sort(parOrdre) }))
    .filter(({ etiquettes: siennes }) => siennes.length);
}

// Les étiquettes choisies, dans l'ordre des groupes puis de leurs étiquettes : celui du rappel de
// l'aperçu et des étiquettes copiées dans le voyage.
export const etiquettesChoisies = (bibliotheque, choisies) =>
  groupesAvecEtiquettes(bibliotheque).flatMap(({ etiquettes }) => etiquettes.filter(e => choisies.has(e.id)));

// Ce que le voyage contiendrait : catégories dans l'ordre de la bibliothèque, objets par nom, avec
// leur quantité. Un objet n'entre que si sa catégorie entre ; un objet à 0 n'apparaît pas, ni une
// catégorie restée vide. `infos` est supposée valide (l'assistant l'a vérifiée avant).
export function genererApercu(bibliotheque, { depart, retour, voyageurs }, choisies) {
  const periode = { ...joursEtNuits(depart, retour), voyageurs };
  const apercu = [];
  for (const categorie of [...bibliotheque.categories].sort(parOrdre)) {
    if (!estInclus({ toujours: categorie.toujoursIncluse, etiquettes: categorie.etiquettes }, choisies)) continue;
    const objets = bibliotheque.objets
      .filter(o => o.categorieId === categorie.id)
      .filter(o => estInclus({ toujours: o.toujoursInclus, etiquettes: o.etiquettes }, choisies))
      .map(objet => ({ objet, quantite: calculerQuantite(objet, periode) }))
      .filter(({ quantite }) => quantite > 0)
      .sort((a, b) => a.objet.nom.localeCompare(b.objet.nom));
    if (objets.length) apercu.push({ categorie, objets });
  }
  return apercu;
}
