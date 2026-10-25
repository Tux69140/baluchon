// Données de la maquette de la bibliothèque (phase 5) : la mini-bibliothèque de départ de l'appli
// (src/i18n/fr.json, « bibliothequeDeDepart »), le catalogue des pictos et les huit couleurs.

export const GROUPES = [
  { nom: 'Activités', etiquettes: ['Randonnée', 'Camping', 'Plage'] },
  { nom: 'Climat', etiquettes: ['Chaud', 'Froid', 'Pluie'] },
  { nom: 'Hébergement', etiquettes: ['Hôtel', 'Tente', 'Chez l’habitant'] },
];

let n = 0;
const o = (nom, regle, valeur, extra = {}) => ({
  id: `o${n++}`,
  nom,
  regle,
  valeur,
  plafond: null,
  parPersonne: true,
  consommable: false,
  etiquettes: [],
  note: '',
  ...extra,
});

export const categoriesDeDepart = () => [
  {
    id: 'vetements',
    nom: 'Vêtements',
    icone: 't-shirt',
    couleur: 'ciel',
    etiquettes: [],
    objets: [
      o('T-shirts', 'par_jour', 1, { plafond: 5 }),
      o('Sous-vêtements', 'par_jour', 1),
      o('Pyjama', 'par_nuit', 1, { plafond: 1 }),
      o('Maillot de bain', 'fixe', 1, { etiquettes: ['Plage'] }),
      o('Doudoune', 'fixe', 1, { etiquettes: ['Froid'] }),
      o('Bonnet', 'fixe', 1, { etiquettes: ['Froid'] }),
      o('Cape de pluie', 'fixe', 1, { etiquettes: ['Pluie'] }),
    ],
  },
  {
    id: 'toilette',
    nom: 'Toilette',
    icone: 'tooth',
    couleur: 'lagon',
    etiquettes: [],
    objets: [
      o('Brosse à dents', 'fixe', 1),
      o('Dentifrice', 'fixe', 1, { parPersonne: false }),
      o('Crème solaire', 'fixe', 1, { parPersonne: false, etiquettes: ['Plage', 'Chaud'] }),
    ],
  },
  {
    id: 'alimentation',
    nom: 'Alimentation',
    icone: 'fork-knife',
    couleur: 'pomme',
    etiquettes: [],
    objets: [
      o('Repas', 'par_jour', 2, { consommable: true, note: 'Prévoir un repas de secours par personne en plus.' }),
      o('Gourde', 'fixe', 1),
    ],
  },
  {
    id: 'papiers',
    nom: 'Papiers',
    icone: 'identification-card',
    couleur: 'tournesol',
    etiquettes: [],
    objets: [
      o('Pièce d’identité', 'fixe', 1, {
        note: 'Vérifier la date de validité avant de partir : certaines démarches prennent des semaines.',
      }),
      o('Chargeur de téléphone', 'fixe', 1, {
        parPersonne: false,
        note: 'Une multiprise de voyage dépanne dans les chambres à prise unique.',
      }),
    ],
  },
  {
    id: 'camping',
    nom: 'Camping',
    icone: 'tent',
    couleur: 'abricot',
    etiquettes: ['Camping', 'Tente'],
    objets: [o('Lampe frontale', 'fixe', 1), o('Sac de couchage', 'fixe', 1), o('Réchaud', 'fixe', 1, { parPersonne: false })],
  },
];

export const nouvelId = () => `o${n++}`;

// Les huit couleurs de catégorie (docs/DESIGN.md), dans l'ordre du nuancier.
export const COULEURS = [
  ['corail', 'Corail'],
  ['tournesol', 'Tournesol'],
  ['abricot', 'Abricot'],
  ['pomme', 'Pomme'],
  ['lagon', 'Lagon'],
  ['ciel', 'Ciel'],
  ['framboise', 'Framboise'],
  ['lilas', 'Lilas'],
];

// Le catalogue : environ 80 pictos Phosphor de voyage, rangés par thème. Chacun a un nom et des
// mots-clés français (dans l'appli, ils iront dans le fichier de traduction) ; la recherche les lit
// sans tenir compte des accents ni des majuscules.
export const CATALOGUE = [
  ['Transport', [
    ['airplane', 'Avion', 'avion vol aéroport'],
    ['train', 'Train', 'train gare'],
    ['bus', 'Car', 'bus car autocar'],
    ['car-profile', 'Voiture', 'voiture auto route'],
    ['bicycle', 'Vélo', 'vélo bicyclette'],
    ['sailboat', 'Bateau', 'bateau voile mer croisière'],
    ['map-trifold', 'Carte', 'carte plan itinéraire'],
    ['compass', 'Boussole', 'boussole orientation'],
    ['globe-hemisphere-west', 'Étranger', 'monde étranger international'],
  ]],
  ['Bagages et papiers', [
    ['suitcase-rolling', 'Valise', 'valise bagage'],
    ['backpack', 'Sac à dos', 'sac dos'],
    ['identification-card', 'Papiers', 'papiers identité passeport carte'],
    ['credit-card', 'Carte bancaire', 'carte bancaire paiement'],
    ['wallet', 'Portefeuille', 'portefeuille argent'],
    ['money', 'Argent', 'argent billets espèces devises'],
    ['ticket', 'Billets', 'billet ticket réservation'],
    ['key', 'Clés', 'clés clé maison'],
    ['lock', 'Cadenas', 'cadenas antivol sécurité'],
  ]],
  ['Vêtements', [
    ['t-shirt', 'Vêtements', 'vêtements habits t-shirt'],
    ['pants', 'Pantalon', 'pantalon'],
    ['hoodie', 'Pull', 'pull sweat polaire'],
    ['sneaker', 'Chaussures', 'chaussures baskets'],
    ['boot', 'Bottes', 'bottes chaussures marche'],
    ['sock', 'Chaussettes', 'chaussettes'],
    ['baseball-cap', 'Casquette', 'casquette chapeau'],
    ['sunglasses', 'Lunettes de soleil', 'lunettes soleil'],
  ]],
  ['Toilette et santé', [
    ['tooth', 'Toilette', 'toilette dents hygiène'],
    ['shower', 'Douche', 'douche'],
    ['hand-soap', 'Savon', 'savon lavage'],
    ['drop', 'Eau', 'eau goutte'],
    ['toilet-paper', 'Papier toilette', 'papier toilette'],
    ['scissors', 'Ciseaux', 'ciseaux couture'],
    ['pill', 'Médicaments', 'médicaments pilule santé'],
    ['first-aid-kit', 'Trousse de secours', 'secours santé pharmacie trousse'],
    ['bandaids', 'Pansements', 'pansements blessure'],
  ]],
  ['Alimentation', [
    ['fork-knife', 'Repas', 'repas manger alimentation nourriture'],
    ['coffee', 'Café', 'café thé boisson petit-déjeuner'],
    ['cooking-pot', 'Popote', 'cuisine casserole popote'],
    ['hamburger', 'Pique-nique', 'pique-nique sandwich'],
    ['bread', 'Pain', 'pain boulangerie'],
    ['orange', 'Fruits', 'fruits orange'],
    ['carrot', 'Légumes', 'légumes carotte'],
    ['wine', 'Vin', 'vin apéritif boisson'],
    ['basket', 'Panier', 'panier courses marché'],
  ]],
  ['Plein air', [
    ['tent', 'Camping', 'tente camping bivouac'],
    ['campfire', 'Feu de camp', 'feu camp bivouac'],
    ['mountains', 'Montagne', 'montagne randonnée sommet'],
    ['person-simple-hike', 'Randonnée', 'randonnée marche trek'],
    ['tree-evergreen', 'Forêt', 'forêt sapin arbre'],
    ['leaf', 'Nature', 'nature feuille'],
    ['flashlight', 'Lampe', 'lampe torche frontale'],
    ['binoculars', 'Jumelles', 'jumelles observation'],
    ['knife', 'Couteau', 'couteau canif'],
  ]],
  ['Météo', [
    ['sun', 'Soleil', 'soleil été chaud'],
    ['umbrella', 'Parapluie', 'parapluie pluie'],
    ['cloud-rain', 'Pluie', 'pluie nuage averse'],
    ['snowflake', 'Neige', 'neige froid hiver'],
    ['wind', 'Vent', 'vent'],
    ['moon-stars', 'Nuit', 'nuit dormir étoiles'],
  ]],
  ['Mer et sport', [
    ['waves', 'Mer', 'mer plage vagues océan'],
    ['person-simple-swim', 'Baignade', 'baignade nage maillot piscine'],
    ['lifebuoy', 'Bouée', 'bouée sécurité'],
    ['person-simple-ski', 'Ski', 'ski hiver neige'],
    ['soccer-ball', 'Ballon', 'ballon foot sport jeux'],
    ['tennis-ball', 'Tennis', 'tennis raquette sport'],
  ]],
  ['Électronique et loisirs', [
    ['battery-charging', 'Électronique', 'électronique batterie charge'],
    ['plug', 'Prise', 'prise adaptateur chargeur'],
    ['device-mobile', 'Téléphone', 'téléphone portable mobile'],
    ['laptop', 'Ordinateur', 'ordinateur portable travail'],
    ['camera', 'Appareil photo', 'photo appareil caméra'],
    ['headphones', 'Casque audio', 'casque écouteurs musique'],
    ['music-notes', 'Musique', 'musique'],
    ['book-open', 'Lecture', 'livre lecture'],
    ['cards', 'Jeux', 'jeux cartes société'],
  ]],
  ['Maison et famille', [
    ['baby', 'Bébé', 'bébé enfant'],
    ['paw-print', 'Animaux', 'animal chien chat'],
    ['gift', 'Cadeaux', 'cadeau'],
    ['house', 'Maison', 'maison logement'],
    ['bed', 'Couchage', 'lit dormir couchage'],
    ['toolbox', 'Outils', 'outils bricolage'],
  ]],
];

export const PICTOS = CATALOGUE.flatMap(([, liste]) => liste);
