// Le catalogue des pictos de catégorie (spec de la phase 5) : 80 pictos Phosphor de voyage rangés
// en dix thèmes. Le modèle ne garde que les clés ; noms et mots-clés français vivent dans
// src/i18n/fr.json, et l'appelant les passe à la recherche.
export const CATALOGUE = [
  {
    theme: 'transport',
    pictos: [
      'airplane',
      'train',
      'bus',
      'car-profile',
      'bicycle',
      'sailboat',
      'map-trifold',
      'compass',
      'globe-hemisphere-west',
    ],
  },
  {
    theme: 'bagages',
    pictos: [
      'suitcase-rolling',
      'backpack',
      'identification-card',
      'credit-card',
      'wallet',
      'money',
      'ticket',
      'key',
      'lock',
    ],
  },
  {
    theme: 'vetements',
    pictos: ['t-shirt', 'pants', 'hoodie', 'sneaker', 'boot', 'sock', 'baseball-cap', 'sunglasses'],
  },
  {
    theme: 'toilette',
    pictos: ['tooth', 'shower', 'hand-soap', 'drop', 'toilet-paper', 'scissors', 'pill', 'first-aid-kit', 'bandaids'],
  },
  {
    theme: 'alimentation',
    pictos: ['fork-knife', 'coffee', 'cooking-pot', 'hamburger', 'bread', 'orange', 'carrot', 'wine', 'basket'],
  },
  {
    theme: 'pleinAir',
    pictos: [
      'tent',
      'campfire',
      'mountains',
      'person-simple-hike',
      'tree-evergreen',
      'leaf',
      'flashlight',
      'binoculars',
      'knife',
    ],
  },
  { theme: 'meteo', pictos: ['sun', 'umbrella', 'cloud-rain', 'snowflake', 'wind', 'moon-stars'] },
  {
    theme: 'mer',
    pictos: ['waves', 'person-simple-swim', 'lifebuoy', 'person-simple-ski', 'soccer-ball', 'tennis-ball'],
  },
  {
    theme: 'electronique',
    pictos: [
      'battery-charging',
      'plug',
      'device-mobile',
      'laptop',
      'camera',
      'headphones',
      'music-notes',
      'book-open',
      'cards',
    ],
  },
  { theme: 'maison', pictos: ['baby', 'paw-print', 'gift', 'house', 'bed', 'toolbox'] },
];

// Sans accents ni majuscules : on cherche « ete » pour trouver « été ».
const simplifier = texte => String(texte).normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

// Un mot du nom ou des mots-clés doit COMMENCER par le mot cherché : « ent » ne ramène pas
// « tente ». Un mot vide rend tout le catalogue.
export function chercherPictos(pictos, mot) {
  const cherche = simplifier(mot).trim();
  if (!cherche) return pictos;
  return pictos.filter(({ nom, mots }) =>
    simplifier(`${nom} ${mots}`)
      .split(/[^\p{L}\p{N}]+/u)
      .some(m => m.startsWith(cherche)),
  );
}
