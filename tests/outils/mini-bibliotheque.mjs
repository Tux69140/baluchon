// La mini-bibliothèque des tests : 3 groupes, 5 catégories et 17 objets, au format de la bibliothèque
// de départ (structure sans texte + textes français). Elle est connue au mot près : les tests en
// attendent des noms, des règles et des quantités précis, ce que la vraie bibliothèque, qui peut
// évoluer, ne garantit pas. Les tests qui ont besoin d'une bibliothèque installée la déposent par
// graineMini() ; ceux qui ne s'en servent pas partent d'un premier lancement et trouvent la vraie.
import { construireBibliotheque } from '../../src/modele/bibliotheque.js';

export const MINI_DEPART = {
  groupes: [
    { cle: 'activites', etiquettes: ['randonnee', 'camping', 'plage'] },
    { cle: 'climat', etiquettes: ['chaud', 'froid', 'pluie'] },
    { cle: 'hebergement', etiquettes: ['hotel', 'tente', 'chez-l-habitant'] },
  ],
  categories: [
    {
      cle: 'vetements',
      icone: 't-shirt',
      couleur: 'ciel',
      objets: [
        { cle: 't-shirts', regle: 'par_jour', valeur: 1, plafond: 5, parPersonne: true, pourQui: 'tous' },
        { cle: 'sous-vetements', regle: 'par_jour', valeur: 1, parPersonne: true, pourQui: 'tous' },
        { cle: 'pyjama', regle: 'par_nuit', valeur: 1, plafond: 1, parPersonne: true, pourQui: 'tous' },
        { cle: 'maillot-de-bain', regle: 'fixe', valeur: 1, parPersonne: true, pourQui: 'tous', etiquettes: ['plage'] },
        { cle: 'doudoune', regle: 'fixe', valeur: 1, parPersonne: true, pourQui: 'tous', etiquettes: ['froid'] },
        { cle: 'bonnet', regle: 'fixe', valeur: 1, parPersonne: true, pourQui: 'tous', etiquettes: ['froid'] },
        { cle: 'cape-de-pluie', regle: 'fixe', valeur: 1, parPersonne: true, pourQui: 'tous', etiquettes: ['pluie'] },
      ],
    },
    {
      cle: 'toilette',
      icone: 'tooth',
      couleur: 'lagon',
      objets: [
        { cle: 'brosse-a-dents', regle: 'fixe', valeur: 1, parPersonne: true, pourQui: 'tous' },
        { cle: 'dentifrice', regle: 'fixe', valeur: 1, parPersonne: false, pourQui: 'tous' },
        {
          cle: 'creme-solaire',
          regle: 'fixe',
          valeur: 1,
          parPersonne: false,
          pourQui: 'tous',
          etiquettes: ['plage', 'chaud'],
        },
      ],
    },
    {
      cle: 'alimentation',
      icone: 'fork-knife',
      couleur: 'pomme',
      objets: [
        {
          cle: 'repas',
          regle: 'par_jour',
          valeur: 2,
          parPersonne: true,
          pourQui: 'tous',
          consommable: true,
          note: true,
        },
        { cle: 'gourde', regle: 'fixe', valeur: 1, parPersonne: true, pourQui: 'tous' },
      ],
    },
    {
      cle: 'papiers',
      icone: 'identification-card',
      couleur: 'tournesol',
      objets: [
        { cle: 'piece-didentite', regle: 'fixe', valeur: 1, parPersonne: true, pourQui: 'tous', note: true },
        { cle: 'chargeur-de-telephone', regle: 'fixe', valeur: 1, parPersonne: false, pourQui: 'tous', note: true },
      ],
    },
    {
      cle: 'camping-categorie',
      icone: 'tent',
      couleur: 'abricot',
      etiquettes: ['camping', 'tente'],
      objets: [
        { cle: 'lampe-frontale', regle: 'fixe', valeur: 1, parPersonne: true, pourQui: 'tous' },
        { cle: 'sac-de-couchage', regle: 'fixe', valeur: 1, parPersonne: true, pourQui: 'tous' },
        { cle: 'rechaud', regle: 'fixe', valeur: 1, parPersonne: false, pourQui: 'tous' },
      ],
    },
  ],
};

const MINI_TEXTES = {
  groupes: { activites: 'Activités', climat: 'Climat', hebergement: 'Hébergement' },
  etiquettes: {
    randonnee: 'Randonnée',
    camping: 'Camping',
    plage: 'Plage',
    chaud: 'Chaud',
    froid: 'Froid',
    pluie: 'Pluie',
    hotel: 'Hôtel',
    tente: 'Tente',
    'chez-l-habitant': 'Chez l’habitant',
  },
  categories: {
    vetements: 'Vêtements',
    toilette: 'Toilette',
    alimentation: 'Alimentation',
    papiers: 'Papiers',
    'camping-categorie': 'Camping',
  },
  objets: {
    't-shirts': { nom: 'T-shirts' },
    'sous-vetements': { nom: 'Sous-vêtements' },
    pyjama: { nom: 'Pyjama' },
    'maillot-de-bain': { nom: 'Maillot de bain' },
    doudoune: { nom: 'Doudoune' },
    bonnet: { nom: 'Bonnet' },
    'cape-de-pluie': { nom: 'Cape de pluie' },
    'brosse-a-dents': { nom: 'Brosse à dents' },
    dentifrice: { nom: 'Dentifrice' },
    'creme-solaire': { nom: 'Crème solaire' },
    repas: { nom: 'Repas', note: 'Prévoir un repas de secours par personne en plus.' },
    gourde: { nom: 'Gourde' },
    'piece-didentite': {
      nom: 'Pièce d’identité',
      note: 'Vérifier la date de validité avant de partir : certaines démarches prennent des semaines.',
    },
    'chargeur-de-telephone': {
      nom: 'Chargeur de téléphone',
      note: 'Une multiprise de voyage dépanne dans les chambres à prise unique.',
    },
    'lampe-frontale': { nom: 'Lampe frontale' },
    'sac-de-couchage': { nom: 'Sac de couchage' },
    rechaud: { nom: 'Réchaud' },
  },
};

// Des identifiants lisibles et prévisibles (« id-1 », « id-2 »…), sauf si le test fournit les siens.
export function miniBibliotheque(options) {
  let numero = 0;
  return construireBibliotheque(
    MINI_DEPART,
    MINI_TEXTES,
    options ?? { nouvelId: () => `id-${++numero}`, maintenant: 'x' },
  );
}

// Les mêmes données sous la forme « avec les noms » (groupes, catégories et objets portent leur nom,
// les objets leur note en toutes lettres) : la plus commode pour un test qui retouche un nom, retire
// un groupe ou ajoute un objet piégé avant de bâtir sa bibliothèque par bibliothequeDeNoms.
export const miniAvecNoms = () => ({
  groupes: MINI_DEPART.groupes.map(g => ({
    nom: MINI_TEXTES.groupes[g.cle],
    etiquettes: g.etiquettes.map(cle => ({ cle, nom: MINI_TEXTES.etiquettes[cle] })),
  })),
  categories: MINI_DEPART.categories.map(c => ({
    nom: MINI_TEXTES.categories[c.cle],
    icone: c.icone,
    couleur: c.couleur,
    ...(c.etiquettes && { etiquettes: c.etiquettes }),
    objets: c.objets.map(({ cle, note, ...o }) => ({
      nom: MINI_TEXTES.objets[cle].nom,
      ...o,
      ...(note && { note: MINI_TEXTES.objets[cle].note }),
    })),
  })),
});

// Le chemin inverse : une description « avec les noms » devient structure et textes, puis
// bibliothèque. Les clés de groupe, de catégorie et d'objet n'y servent qu'à relier les deux.
export function bibliothequeDeNoms(description, options) {
  const textes = { groupes: {}, etiquettes: {}, categories: {}, objets: {} };
  const depart = {
    groupes: description.groupes.map(({ nom, etiquettes }, i) => {
      textes.groupes[`g${i}`] = nom;
      for (const e of etiquettes) textes.etiquettes[e.cle] = e.nom;
      return { cle: `g${i}`, etiquettes: etiquettes.map(e => e.cle) };
    }),
    categories: description.categories.map(({ nom, objets, ...categorie }, i) => {
      textes.categories[`c${i}`] = nom;
      return {
        ...categorie,
        cle: `c${i}`,
        objets: objets.map(({ nom: nomObjet, note, ...o }, j) => {
          textes.objets[`c${i}-o${j}`] = { nom: nomObjet, ...(note && { note }) };
          return { ...o, cle: `c${i}-o${j}`, pourQui: o.pourQui ?? 'tous', ...(note && { note: true }) };
        }),
      };
    }),
  };
  return construireBibliotheque(depart, textes, options);
}

// L'état du stockage du navigateur (src/stockage/navigateur.js) juste après l'installation de la
// mini-bibliothèque en français, à passer en « donnees » à ouvrir().
export const graineMini = (bibliotheque = miniBibliotheque()) => ({
  bibliotheque,
  meta: { bibliothequeInstallee: true, langueBibliotheque: 'fr' },
});
