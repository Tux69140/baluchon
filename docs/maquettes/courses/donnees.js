// Le voyage de la maquette de la phase 9 et les règles « à acheter » qu'elle imite (choix du
// 2026-10-29, à valider) : ce qui reste à acheter, l'achat partiel compté comme le sac.
const o = (id, categorieId, nom, quantite, champs = {}) => ({
  id,
  categorieId,
  nom,
  quantite,
  dansLeSac: 0,
  aAcheter: false,
  achetes: 0,
  parPersonne: true,
  regle: 'fixe',
  valeur: quantite,
  plafond: null,
  quantiteManuelle: false,
  note: '',
  ...champs,
});

export const voyage = {
  id: 'v-quiberon',
  nom: 'Presqu’île de Quiberon',
  destination: 'Bretagne',
  depart: '2026-11-06',
  retour: '2026-11-09',
  voyageurs: 2,
};

export const categories = [
  { id: 'c-papiers', nom: 'Papiers', icone: 'identification-card', couleur: 'ciel', ordre: 0 },
  { id: 'c-vetements', nom: 'Vêtements', icone: 't-shirt', couleur: 'framboise', ordre: 1 },
  { id: 'c-hygiene', nom: 'Hygiène', icone: 'tooth', couleur: 'lagon', ordre: 2 },
  { id: 'c-alimentation', nom: 'Alimentation', icone: 'fork-knife', couleur: 'abricot', ordre: 3 },
  { id: 'c-camping', nom: 'Camping', icone: 'tent', couleur: 'pomme', ordre: 4 },
  { id: 'c-energie', nom: 'Énergie', icone: 'battery-charging', couleur: 'lilas', ordre: 5 },
];

export function objetsDeDepart(etat) {
  const a = { aAcheter: true };
  const liste = [
    o('o-carte', 'c-papiers', 'Carte d’identité', 2, { dansLeSac: 2 }),
    o('o-billets', 'c-papiers', 'Billets de train', 1),
    o('o-tshirts', 'c-vetements', 'T-shirts', 8, { regle: 'par_jour', valeur: 1, dansLeSac: 3 }),
    o('o-chaussettes', 'c-vetements', 'Chaussettes', 8, { regle: 'par_jour', valeur: 1 }),
    o('o-pull', 'c-vetements', 'Pull', 2),
    o('o-brosse', 'c-hygiene', 'Brosse à dents', 2, { dansLeSac: 2 }),
    o('o-dentifrice', 'c-hygiene', 'Dentifrice', 1, { ...a, parPersonne: false }),
    o('o-creme', 'c-hygiene', 'Crème solaire', 1, { ...a, parPersonne: false }),
    o('o-repas', 'c-alimentation', 'Repas', 16, { ...a, regle: 'par_jour', valeur: 2 }),
    o('o-barres', 'c-alimentation', 'Barres énergétiques', 12, { ...a, regle: 'par_jour', valeur: 2, plafond: 6 }),
    o('o-cafe', 'c-alimentation', 'Café', 1, { ...a, parPersonne: false }),
    o('o-pain', 'c-alimentation', 'Pain', 4, { ...a, parPersonne: false, regle: 'par_jour', valeur: 1 }),
    o('o-tente', 'c-camping', 'Tente', 1, { parPersonne: false }),
    o('o-gaz', 'c-camping', 'Cartouches de gaz', 2, { ...a, parPersonne: false }),
    o('o-allumettes', 'c-camping', 'Allumettes', 1, { ...a, parPersonne: false, dansLeSac: 1, achetes: 1 }),
    o('o-piles', 'c-energie', 'Piles', 4, { ...a, parPersonne: false }),
    o('o-chargeur', 'c-energie', 'Chargeur', 1, { parPersonne: false }),
  ];
  if (etat === 'partiel' || etat === 'faites') {
    const achete = { 'o-repas': 6, 'o-piles': 2, 'o-cafe': 0 };
    for (const x of liste) if (x.id in achete) x.achetes = achete[x.id];
  }
  if (etat === 'faites') for (const x of liste) if (x.aAcheter) x.achetes = x.quantite;
  if (etat === 'vide') for (const x of liste) x.aAcheter = false;
  return liste;
}

// Ce qui reste à acheter : marqué et pas tout acheté (un objet mis en entier dans le sac compte comme acheté).
export const resteAAcheter = x => (x.aAcheter ? Math.max(0, x.quantite - x.achetes) : 0);
export const estAAcheter = x => resteAAcheter(x) > 0;

// Le sac rempli compte comme acheté : le ressortir ne le remet pas dans les Courses.
export function mettreDansLeSac(x, n) {
  x.dansLeSac = n;
  if (x.aAcheter && n >= x.quantite) x.achetes = x.quantite;
}

// Rallumer « À acheter » sur un objet déjà acheté repart de zéro.
export function basculerAAcheter(x) {
  if (estAAcheter(x)) {
    x.aAcheter = false;
    return;
  }
  x.aAcheter = true;
  if (x.achetes >= x.quantite) x.achetes = 0;
}
