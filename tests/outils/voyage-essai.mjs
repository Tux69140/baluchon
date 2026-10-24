// Le voyage d'essai des tests de l'écran d'un voyage (liste, gestes, et plus tard fiche et deux
// panneaux) : un seul jeu de données, pour que chaque test parle des mêmes objets. Les catégories sont
// rangées dans le désordre et un second voyage ne doit rien laisser paraître.
// Papiers (ordre 0) est bouclée ; Repas en est à 6 pièces sur 16 et porte la seule note ; Café soluble
// est le seul objet partagé ; Dentifrice est la dernière pièce de Toilette.
export const NOM = 'Vercors <i>&</i> "amis"';

const voyage = (id, nom) => ({
  id,
  nom,
  destination: 'Autrans',
  depart: '2026-10-10',
  retour: '2026-10-13',
  voyageurs: 2,
  modifieLe: 'x',
});

const categorie = (id, voyageId, nom, icone, couleur, ordre) => ({
  id,
  voyageId,
  modeleId: null,
  nom,
  icone,
  couleur,
  ordre,
  modifieLe: 'x',
});

const objet = (id, categorieId, nom, quantite, dansLeSac, extra = {}) => ({
  id,
  voyageId: 'v1',
  categorieId,
  modeleId: null,
  nom,
  regle: 'fixe',
  valeur: quantite,
  plafond: null,
  parPersonne: true,
  consommable: false,
  quantite,
  quantiteManuelle: false,
  dansLeSac,
  aAcheter: false,
  achete: false,
  note: '',
  modifieLe: 'x',
  ...extra,
});

export const DONNEES = {
  voyages: [voyage('v1', NOM), voyage('v2', 'Autre'), voyage('v3', 'B'.repeat(120)), voyage('v4', 'Sans objet')],
  categoriesDuVoyage: [
    categorie('c-ali', 'v1', 'Alimentation', 'fork-knife', 'pomme', 3),
    categorie('c-vet', 'v1', 'Vêtements', 't-shirt', 'ciel', 1),
    categorie('c-pap', 'v1', 'Papiers', 'identification-card', 'tournesol', 0),
    categorie('c-toi', 'v1', 'Toilette', 'tooth', 'lagon', 2),
    categorie('c-autre', 'v2', 'Ski', 'tooth', 'lilas', 1),
  ],
  objetsDuVoyage: [
    objet('o-tsh', 'c-vet', 'T-shirts', 8, 0),
    objet('o-cha', 'c-vet', 'Chaussettes', 8, 8),
    objet('o-pan', 'c-vet', 'Pantalons', 4, 3),
    objet('o-sou', 'c-vet', 'Sous-vêtements', 8, 0),
    objet('o-pyj', 'c-vet', 'Pyjama', 2, 1),
    objet('o-pul', 'c-vet', 'Pull', 2, 1),
    objet('o-bro', 'c-toi', 'Brosse à dents', 2, 2),
    objet('o-den', 'c-toi', 'Dentifrice', 1, 0),
    objet('o-gel', 'c-toi', 'Gel douche', 1, 1),
    objet('o-rep', 'c-ali', 'Repas', 16, 6, {
      regle: 'par_jour',
      valeur: 2,
      note: 'Prévoir un repas de secours par personne en plus.',
    }),
    objet('o-gou', 'c-ali', 'Gourde', 2, 2),
    objet('o-caf', 'c-ali', 'Café soluble', 1, 0, { parPersonne: false }),
    objet('o-pie', 'c-pap', 'Pièce d’identité', 2, 2),
    objet('o-bil', 'c-pap', 'Billets de train', 1, 1),
    { ...objet('o-ski', 'c-autre', 'Skis', 2, 0), voyageId: 'v2' },
  ],
};

// Le même voyage avec d'autres pièces dans le sac : { 'o-rep': 0 }, ou une fonction de l'objet.
export function avecPieces(pieces) {
  const nombre = o => (typeof pieces === 'function' ? pieces(o) : (pieces[o.id] ?? o.dansLeSac));
  return { ...DONNEES, objetsDuVoyage: DONNEES.objetsDuVoyage.map(o => ({ ...o, dansLeSac: nombre(o) })) };
}
