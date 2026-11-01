// Quantité d'un objet pour un voyage (docs/PRD.md, « Calcul des quantités ») : valeur fixe, ou par
// jour, par nuit ou par semaine commencée ; le plafond s'applique par personne, puis on multiplie par
// les personnes du groupe « Pour qui » de l'objet s'il est « par personne ». Seul endroit de ce calcul.
import { personnes } from './composition.js';

// Une semaine commencée compte pour une : 8 jours font 2 semaines. Seule définition (le calcul et l'exemple
// de la fiche d'un objet).
export const semainesCommencees = jours => Math.ceil(jours / 7);

const BASES = {
  fixe: () => 1,
  par_jour: ({ jours }) => jours,
  par_nuit: ({ nuits }) => nuits,
  par_semaine: ({ jours }) => semainesCommencees(jours),
};

export function calculerQuantite({ regle, valeur, plafond, parPersonne, pourQui }, periode) {
  // Un groupe sans personne n'a rien à emporter, même pour un objet partagé : 0, donc l'objet
  // n'apparaît pas (inclusion.js).
  const concernes = personnes(pourQui, periode);
  if (concernes === 0) return 0;
  const base = valeur * BASES[regle](periode);
  const parTete = plafond === null || plafond === undefined ? base : Math.min(base, plafond);
  return parPersonne ? parTete * concernes : parTete;
}
