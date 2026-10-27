// Le voyage d'essai de la maquette « grand écran » (validée le 2026-10-27) : la bibliothèque de départ (src/i18n/fr.json,
// « bibliothequeDeDepart »), avec les étiquettes Camping, Plage, Froid et Tente : 5 catégories et
// 16 objets (seule la « Cape de pluie » est écartée). Quantités calculées pour 4 jours, 3 nuits et
// 2 voyageurs ; quelques objets cochés ou entamés, et Papiers bouclée.
let n = 0;
const o = (nom, quantite, dansLeSac, extra = {}) => ({ id: `o${n++}`, nom, quantite, dansLeSac, ...extra });

export const voyage = {
  nom: 'Presqu’île de Crozon',
  destination: 'Crozon, Finistère',
  details: 'du ven. 6 nov. au lun. 9 nov. 2026 · 2 voyageurs',
  etiquettes: ['Camping', 'Plage', 'Froid', 'Tente'],
};

// Six catégories d'essai, pour un voyage et une bibliothèque qui en comptent onze (?etat=beaucoup) :
// la liste des objets passe alors sous le bas de l'écran de la tablette en paysage.
export const CATEGORIES_ESSAI = [
  {
    id: 'electronique',
    nom: 'Électronique',
    icone: 'battery-charging',
    couleur: 'lilas',
    objets: ['Batterie externe', 'Câbles', 'Écouteurs'],
  },
  {
    id: 'pharmacie',
    nom: 'Pharmacie',
    icone: 'first-aid-kit',
    couleur: 'corail',
    objets: ['Antidouleur', 'Pansements', 'Pince à tiques'],
  },
  {
    id: 'chaussures',
    nom: 'Chaussures',
    icone: 'sneaker',
    couleur: 'framboise',
    objets: ['Chaussures de marche', 'Sandales'],
  },
  { id: 'loisirs', nom: 'Loisirs', icone: 'book-open', couleur: 'ciel', objets: ['Jeu de cartes', 'Livre'] },
  {
    id: 'plage',
    nom: 'Plage',
    icone: 'umbrella',
    couleur: 'lagon',
    objets: ['Lunettes de soleil', 'Parasol', 'Serviette de plage'],
  },
  { id: 'voiture', nom: 'Voiture', icone: 'car', couleur: 'tournesol', objets: ['Carte grise', 'Gilet jaune'] },
];

export function categoriesDuVoyage(etat) {
  const categories = [
    {
      id: 'vetements',
      nom: 'Vêtements',
      icone: 't-shirt',
      couleur: 'ciel',
      objets: [
        o('T-shirts', 8, 3),
        o('Sous-vêtements', 8, 0),
        o('Pyjama', 2, 2),
        o('Maillot de bain', 2, 0),
        o('Doudoune', 2, 0),
        o('Bonnet', 2, 2),
      ],
    },
    {
      id: 'toilette',
      nom: 'Toilette',
      icone: 'tooth',
      couleur: 'lagon',
      objets: [
        o('Brosse à dents', 2, 2),
        o('Dentifrice', 1, 1, { partage: true }),
        o('Crème solaire', 1, 0, { partage: true }),
      ],
    },
    {
      id: 'alimentation',
      nom: 'Alimentation',
      icone: 'fork-knife',
      couleur: 'pomme',
      objets: [o('Repas', 16, 6, { note: true }), o('Gourde', 2, 2)],
    },
    {
      id: 'papiers',
      nom: 'Papiers',
      icone: 'identification-card',
      couleur: 'tournesol',
      objets: [
        o('Pièce d’identité', 2, 2, { note: true }),
        o('Chargeur de téléphone', 1, 1, { partage: true, note: true }),
      ],
    },
    {
      id: 'camping',
      nom: 'Camping',
      icone: 'tent',
      couleur: 'abricot',
      objets: [o('Lampe frontale', 2, 1), o('Sac de couchage', 2, 0), o('Réchaud', 1, 0, { partage: true })],
    },
  ];
  // Une catégorie longue (12 objets), pour voir la liste en deux colonnes bien remplie.
  if (etat === 'longue')
    categories[0].objets.push(
      o('Chaussettes', 8, 0),
      o('Pantalons', 4, 2),
      o('Polaire', 2, 0),
      o('Chaussures de marche', 2, 2),
      o('Sandales', 2, 0),
      o('Gants', 2, 0),
    );
  if (etat === 'beaucoup')
    for (const c of CATEGORIES_ESSAI) categories.push({ ...c, objets: c.objets.map(nom => o(nom, 1, 0)) });
  if (etat === 'boucle') for (const c of categories) for (const x of c.objets) x.dansLeSac = x.quantite;
  return categories;
}

export const complet = x => x.dansLeSac >= x.quantite;
export const faits = c => c.objets.filter(complet).length;
export const estBouclee = c => c.objets.length > 0 && c.objets.every(complet);
const parNom = (a, b) => a.nom.localeCompare(b.nom, 'fr');
// Ce qui reste à emballer d'abord, par nom ; ce qui est dans le sac ensuite (forme validée du 2026-10-24).
export const ordreNaturel = c => [
  ...c.objets.filter(x => !complet(x)).sort(parNom),
  ...c.objets.filter(complet).sort(parNom),
];
