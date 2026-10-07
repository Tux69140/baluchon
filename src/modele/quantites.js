// Quantité d'un objet pour un voyage (docs/PRD.md, « Calcul des quantités ») : valeur fixe, ou par
// jour, ou par nuit ; le plafond s'applique par personne, puis on multiplie par le nombre de
// voyageurs si l'objet est « par personne ». Seul endroit où ce calcul existe.
const BASES = {
  fixe: () => 1,
  par_jour: ({ jours }) => jours,
  par_nuit: ({ nuits }) => nuits,
};

export function calculerQuantite({ regle, valeur, plafond, parPersonne }, periode) {
  const base = valeur * BASES[regle](periode);
  const parTete = plafond === null || plafond === undefined ? base : Math.min(base, plafond);
  return parPersonne ? parTete * periode.voyageurs : parTete;
}
