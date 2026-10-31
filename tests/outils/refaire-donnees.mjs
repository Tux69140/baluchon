// Les données des tests de « Refaire ce voyage » (tests/refaire.test.js, tests/refaire-voyage.test.js) : la
// bibliothèque d'aujourd'hui et le voyage d'origine « Quiberon » de l'été passé, tels que le stockage les
// relit, et les informations du voyage refait.
export const MAINTENANT = '2026-10-31T10:00:00.000Z';
export function compteur(prefixe = 'n') {
  let n = 0;
  return () => `${prefixe}-${++n}`;
}
export const categorie = (id, nom, ordre, etiquettes = []) => ({
  id,
  nom,
  icone: 'package',
  couleur: 'ciel',
  ordre,
  toujoursIncluse: etiquettes.length === 0,
  modifieLe: 'x',
  etiquettes,
});
export const modele = (id, categorieId, nom, regle, valeur, autres = {}) => ({
  id,
  categorieId,
  nom,
  regle,
  valeur,
  plafond: null,
  parPersonne: false,
  consommable: false,
  toujoursInclus: !autres.etiquettes?.length,
  note: '',
  modifieLe: 'x',
  etiquettes: [],
  ...autres,
});
// La bibliothèque d'aujourd'hui : « Rando » s'appelle désormais « Randonnée », « Plage » et la trousse
// de secours ont été supprimées.
export const bibliotheque = () => ({
  groupes: [
    { id: 'g-activites', nom: 'Activités', ordre: 0, modifieLe: 'x' },
    { id: 'g-climat', nom: 'Climat', ordre: 1, modifieLe: 'x' },
  ],
  etiquettes: [
    { id: 'e-rando', groupeId: 'g-activites', nom: 'Randonnée', ordre: 0, modifieLe: 'x' },
    { id: 'e-camping', groupeId: 'g-activites', nom: 'Camping', ordre: 1, modifieLe: 'x' },
    { id: 'e-pluie', groupeId: 'g-climat', nom: 'Pluie', ordre: 0, modifieLe: 'x' },
  ],
  categories: [
    categorie('c-vet', 'Vêtements', 0),
    categorie('c-toil', 'Toilette', 1),
    categorie('c-camp', 'Camping', 2, ['e-camping']),
  ],
  objets: [
    modele('o-tshirts', 'c-vet', 'T-shirts', 'par_jour', 1, { parPersonne: true }),
    modele('o-pull', 'c-vet', 'Pull', 'fixe', 1, { parPersonne: true }),
    modele('o-chaussures', 'c-vet', 'Chaussures de marche', 'fixe', 1, { etiquettes: ['e-rando'] }),
    modele('o-chaussettes', 'c-vet', 'Chaussettes', 'par_jour', 1),
    modele('o-gourde', 'c-vet', 'Gourde', 'fixe', 1),
    modele('o-poncho', 'c-vet', 'Poncho', 'fixe', 1, { etiquettes: ['e-pluie'] }),
    modele('o-brosse', 'c-toil', 'Brosse à dents', 'fixe', 1, { parPersonne: true }),
    modele('o-savon', 'c-toil', 'Savon', 'fixe', 1, { consommable: true }),
    modele('o-lampe', 'c-camp', 'Lampe frontale', 'fixe', 1, { etiquettes: ['e-camping'] }),
  ],
});

const V = 'v-origine';
const categorieDuVoyage = (id, modeleId, nom, ordre) => ({
  id,
  voyageId: V,
  modeleId,
  nom,
  icone: modeleId ? 'package' : 'puzzle',
  couleur: modeleId ? 'ciel' : 'lavande',
  ordre,
  modifieLe: 'avant',
});
// Un objet du voyage d'origine : venu d'un modèle (modeleId), ou ajouté à la main (modeleId null).
export const objetDuVoyage = (id, categorieId, modeleId, nom, quantite, autres = {}) => ({
  id,
  voyageId: V,
  categorieId,
  modeleId,
  nom,
  regle: 'fixe',
  valeur: modeleId ? 1 : 0,
  plafond: null,
  parPersonne: !modeleId,
  consommable: false,
  quantite,
  quantiteManuelle: !modeleId,
  dansLeSac: 0,
  aAcheter: false,
  achetes: 0,
  note: '',
  modifieLe: 'avant',
  ...autres,
});
// Le voyage d'origine, tel que le stockage le relit, avec l'été passé dans le sac.
export const origine = (autres = {}) => ({
  voyage: {
    id: V,
    nom: 'Quiberon',
    destination: 'Bretagne',
    depart: '2026-07-10',
    retour: '2026-07-13',
    voyageurs: 2,
    modifieLe: 'avant',
  },
  etiquettes: [
    { id: 'ev-rando', voyageId: V, modeleId: 'e-rando', nom: 'Rando', ordre: 0, modifieLe: 'avant' },
    { id: 'ev-plage', voyageId: V, modeleId: 'e-plage', nom: 'Plage', ordre: 1, modifieLe: 'avant' },
  ],
  categories: [
    categorieDuVoyage('cv-vet', 'c-vet', 'Vêtements', 0),
    categorieDuVoyage('cv-toil', 'c-toil', 'Toilette', 1),
    categorieDuVoyage('cv-camp', 'c-camp', 'Camping', 2),
    categorieDuVoyage('cv-loisirs', null, 'Loisirs', 3),
  ],
  objets: [
    objetDuVoyage('ov-tshirts', 'cv-vet', 'o-tshirts', 'T-shirts', 8, { dansLeSac: 8 }),
    objetDuVoyage('ov-chaussures', 'cv-vet', 'o-chaussures', 'Chaussures de rando', 1, { dansLeSac: 1 }),
    objetDuVoyage('ov-chaussettes', 'cv-vet', 'o-chaussettes', 'Chaussettes', 3, { quantiteManuelle: true }),
    // Retiré, fixé à la main, une pièce encore dans le sac : il attend sa sortie.
    objetDuVoyage('ov-gourde', 'cv-vet', 'o-gourde', 'Gourde 1 L', 0, { quantiteManuelle: true, dansLeSac: 1 }),
    objetDuVoyage('ov-brosse', 'cv-toil', 'o-brosse', 'Brosse à dents', 2, { quantiteManuelle: true }),
    objetDuVoyage('ov-trousse', 'cv-toil', 'o-trousse', 'Trousse de secours', 1),
    // Son modèle a disparu, mais il était retiré : rien à signaler.
    objetDuVoyage('ov-crampons', 'cv-vet', 'o-crampons', 'Crampons', 0, { dansLeSac: 2 }),
    objetDuVoyage('ov-bouchons', 'cv-toil', null, 'Bouchons d’oreille', 4, { dansLeSac: 4 }),
    objetDuVoyage('ov-creme', 'cv-toil', null, 'Crème solaire bio', 1, { aAcheter: true, achetes: 1, dansLeSac: 1 }),
    objetDuVoyage('ov-hamac', 'cv-camp', null, 'Hamac', 1),
    objetDuVoyage('ov-livres', 'cv-loisirs', null, 'Livres', 3, { note: 'Un chacun.' }),
    objetDuVoyage('ov-jeux', 'cv-loisirs', null, 'Jeux de cartes', 2),
    // Ajouté à la main puis retiré : il n'existe nulle part ailleurs, il ne revient pas.
    objetDuVoyage('ov-parapluie', 'cv-vet', null, 'Parapluie pliant', 0, { dansLeSac: 1 }),
  ],
  ecartes: ['o-gourde', 'o-lampe', 'o-savon'],
  ...autres,
});
// L'été suivant : du 10 au 16, 7 jours, à deux.
export const infos = (autres = {}) => ({
  nom: 'Quiberon 2027',
  destination: '',
  depart: '2027-07-10',
  retour: '2027-07-16',
  voyageurs: 2,
  ...autres,
});
