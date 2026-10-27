// Les voyages d'essai de l'écran d'un voyage sur tablette et ordinateur, repris de la maquette validée
// le 2026-10-27 (docs/maquettes/grand-ecran/donnees.js), avec la bibliothèque de départ installée par
// l'appli (toucheRetour : la touche retour d'Android, comme pour les tests de la Bibliothèque).
// - v1 : les 5 catégories de la maquette (Papiers bouclée, Toilette à une pièce de l'être) ;
// - v2 : les mêmes et 6 de plus, 11 catégories (?etat=beaucoup de la maquette) ;
// - v3 : les 11 catégories, Vêtements et Camping longues (12 objets chacune) : le menu et la liste défilent ;
// - v4 : sans objet ;
// - v5 : une catégorie au nom long et piégé (HTML, guillemets), choisie d'emblée.
import { FORMATS, attendreEcran, ouvrir } from './page.mjs';

export const PIEGE = 'Très très longue <b>catégorie</b> "piégée"';

const partage = { parPersonne: false };
const note = { note: 'Une note.' };

// [clé, nom, picto, couleur, [[nom, quantité, dans le sac, autres champs]]]
const CINQ = [
  [
    'vet',
    'Vêtements',
    't-shirt',
    'ciel',
    [
      ['T-shirts', 8, 3],
      ['Sous-vêtements', 8, 0],
      ['Pyjama', 2, 2],
      ['Maillot de bain', 2, 0],
      ['Doudoune', 2, 0],
      ['Bonnet', 2, 2],
    ],
  ],
  [
    'toi',
    'Toilette',
    'tooth',
    'lagon',
    [
      ['Brosse à dents', 2, 2],
      ['Dentifrice', 1, 1, partage],
      ['Crème solaire', 1, 0, partage],
    ],
  ],
  [
    'ali',
    'Alimentation',
    'fork-knife',
    'pomme',
    [
      ['Repas', 16, 6, note],
      ['Gourde', 2, 2],
    ],
  ],
  [
    'pap',
    'Papiers',
    'identification-card',
    'tournesol',
    [
      ['Pièce d’identité', 2, 2, note],
      ['Chargeur de téléphone', 1, 1, { ...partage, ...note }],
    ],
  ],
  [
    'cam',
    'Camping',
    'tent',
    'abricot',
    [
      ['Lampe frontale', 2, 1],
      ['Sac de couchage', 2, 0],
      ['Réchaud', 1, 0, partage],
    ],
  ],
];

const vides = noms => noms.map(nom => [nom, 1, 0]);
const SIX = [
  ['ele', 'Électronique', 'battery-charging', 'lilas', vides(['Batterie externe', 'Câbles', 'Écouteurs'])],
  ['pha', 'Pharmacie', 'first-aid-kit', 'corail', vides(['Antidouleur', 'Pansements', 'Pince à tiques'])],
  ['cha', 'Chaussures', 'sneaker', 'framboise', vides(['Chaussures de marche', 'Sandales'])],
  ['loi', 'Loisirs', 'book-open', 'ciel', vides(['Jeu de cartes', 'Livre'])],
  ['pla', 'Plage', 'umbrella', 'lagon', vides(['Lunettes de soleil', 'Parasol', 'Serviette de plage'])],
  ['voi', 'Voiture', 'car-profile', 'tournesol', vides(['Carte grise', 'Gilet jaune'])],
];

// Les catégories longues de v3 : celles de la maquette (?etat=longue) pour Vêtements, et Camping
// allongée pour qu'une autre catégorie choisie défile elle aussi.
const allonger = {
  vet: [
    ['Chaussettes', 8, 0],
    ['Pantalons', 4, 2],
    ['Polaire', 2, 0],
    ['Chaussures de marche', 2, 2],
    ['Sandales', 2, 0],
    ['Gants', 2, 0],
  ],
  cam: vides(['Tente', 'Matelas', 'Popote', 'Briquet', 'Couteau', 'Corde', 'Bâche', 'Sardines', 'Gamelle']),
};

const CATEGORIES = {
  v1: CINQ,
  v2: [...CINQ, ...SIX],
  v3: [
    ...CINQ.map(([cle, nom, icone, couleur, objets]) => [
      cle,
      nom,
      icone,
      couleur,
      [...objets, ...(allonger[cle] ?? [])],
    ]),
    ...SIX,
  ],
  v4: [],
  v5: [['pie', PIEGE, 'tent', 'abricot', vides(['Piquets'])], ...CINQ.slice(0, 2)],
};

const voyage = (id, nom) => ({
  id,
  nom,
  destination: 'Crozon, Finistère',
  depart: '2026-11-06',
  retour: '2026-11-09',
  voyageurs: 2,
  modifieLe: 'x',
});

const ETIQUETTES = ['Camping', 'Plage', 'Froid', 'Tente'];

// Les ids portent le voyage : c-v1-vet, o-v1-vet-0…
const categoriesDe = voyageId =>
  CATEGORIES[voyageId].map(([cle, nom, icone, couleur], ordre) => ({
    id: `c-${voyageId}-${cle}`,
    voyageId,
    modeleId: null,
    nom,
    icone,
    couleur,
    ordre,
    modifieLe: 'x',
  }));

const objetsDe = voyageId =>
  CATEGORIES[voyageId].flatMap(([cle, , , , objets]) =>
    objets.map(([nom, quantite, dansLeSac, extra = {}], i) => ({
      id: `o-${voyageId}-${cle}-${i}`,
      voyageId,
      categorieId: `c-${voyageId}-${cle}`,
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
    })),
  );

const IDS = Object.keys(CATEGORIES);
export const DONNEES = {
  toucheRetour: true,
  voyages: IDS.map(id => voyage(id, id === 'v4' ? 'Sans objet' : 'Presqu’île de Crozon')),
  etiquettesDuVoyage: IDS.flatMap(voyageId =>
    ETIQUETTES.map((nom, ordre) => ({ id: `e-${voyageId}-${ordre}`, voyageId, modeleId: null, nom, ordre })),
  ),
  categoriesDuVoyage: IDS.flatMap(categoriesDe),
  objetsDuVoyage: IDS.flatMap(objetsDe),
};

// L'id d'une catégorie ou d'un objet d'un voyage : cat('v2', 'cam'), obj('v1', 'toi', 2).
export const cat = (voyageId, cle) => `c-${voyageId}-${cle}`;
export const obj = (voyageId, cle, rang) => `o-${voyageId}-${cle}-${rang}`;

// ---------- Ouvrir et lire l'écran ----------
// Les formats du grand format : à la souris pour l'ordinateur et le portable, au doigt pour les tablettes.
export const GRANDS = {
  ordinateur: { taille: FORMATS.ordinateur, tactile: false },
  portable: { taille: FORMATS.portable, tactile: false },
  'tablette-paysage': { taille: FORMATS['tablette-paysage'], tactile: true },
  'tablette-portrait': { taille: FORMATS['tablette-portrait'], tactile: true },
};

// horloge : l'horloge de la page arrêtée, que seul le test fait avancer (seconde de répit, tampon).
export async function ouvrirVoyage(navigateur, url, voyageId, { format, theme = 'light', taille, horloge = false }) {
  const ouvert = await ouvrir(navigateur, url, {
    taille: taille ?? GRANDS[format].taille,
    tactile: GRANDS[format].tactile,
    theme,
    donnees: DONNEES,
    adresse: `#/voyage/${voyageId}`,
    horloge,
  });
  // L'écran d'abord : l'horloge arrêtée arrête aussi les images (requestAnimationFrame) qu'on attend.
  await attendreEcran(ouvert.page, 'voyage');
  if (horloge) await ouvert.page.clock.pauseAt((await ouvert.page.evaluate(() => Date.now())) + 10);
  return ouvert;
}

// Ce que montre l'écran : sa disposition, le menu (cartes ou tuiles), la liste et son titre.
export const lire = page =>
  page.evaluate(() => {
    const main = document.querySelector('#app main');
    const menu = [...document.querySelectorAll('.gf-menu :is(.choix, .gf-tuile)')];
    const titre = document.querySelector('#liste-titre');
    const rt = titre?.getBoundingClientRect();
    const haut = el => Math.round(el.getBoundingClientRect().top);
    // Les bords de ce qui est dessiné : de la première colonne à la dernière, ou la page entière.
    const debut = (document.querySelector('.gf-gauche') ?? main).getBoundingClientRect();
    const fin = (document.querySelector('.gf-liste') ?? main).getBoundingClientRect();
    const ids = filtre => menu.filter(filtre).map(b => b.dataset.id);
    return {
      classe: main?.className,
      colonnes: main?.dataset.colonnes ?? null,
      pistes: main && getComputedStyle(main).gridTemplateColumns,
      marges: [Math.round(debut.left), Math.round(innerWidth - fin.right)],
      menu: menu.map(b => b.dataset.id),
      sorte: menu[0]?.classList.contains('gf-tuile') ? 'tuiles' : menu.length ? 'cartes' : null,
      courant: ids(b => b.getAttribute('aria-current') === 'true'),
      attenuees: ids(b => b.hasAttribute('data-attenuee')),
      tampons: ids(b => b.querySelector('.tampon, .gf-tuile-boucle') !== null),
      parRangee: menu.filter(b => menu[0] && haut(b) === haut(menu[0])).length,
      titre: titre?.textContent.trim() ?? null,
      titreVisible: Boolean(rt && rt.width > 1 && rt.height > 1),
      titreTaille: titre && getComputedStyle(titre).fontSize,
      objets: [...document.querySelectorAll('.gf-liste .objet')].map(o => o.dataset.id),
      info: document.querySelector('.gf-liste .ligne-info')?.textContent.trim() ?? null,
      hautListe: document.querySelector('.gf-liste') && haut(document.querySelector('.gf-liste')),
      hauteur: innerHeight,
      defilement: Math.round(scrollY),
      categories: document.querySelectorAll('.categorie').length,
      vide: document.querySelector('.vide-voyage') !== null,
    };
  });

// Ce qui a le focus : une commande visible (action et id), ou la page elle-même.
export const focusActuel = page =>
  page.evaluate(() => {
    const el = document.activeElement;
    if (!el || el === document.body) return 'body';
    const visible = el.getBoundingClientRect().width > 0;
    return `${el.dataset.action ?? el.tagName.toLowerCase()}:${el.dataset.id ?? ''}${visible ? '' : ' (invisible)'}`;
  });

// Les textes visibles sous 13 px (aucun, docs/DESIGN.md).
export const petitsTextes = page =>
  page.evaluate(() =>
    [...document.querySelectorAll('#app *')]
      .filter(el => [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()))
      .filter(el => el.getBoundingClientRect().width > 1 && parseFloat(getComputedStyle(el).fontSize) < 13)
      .map(el => `« ${el.textContent.trim().slice(0, 30)} »`),
  );

// Une commande absente est une faute dite, pas un arrêt du test : la suite juge ce qui en découle.
// doigt : un toucher (tablette), sinon un clic.
export const toucher = (juge, page, selecteur, { doigt = false } = {}) =>
  (doigt ? page.tap(selecteur, { timeout: 2000 }) : page.click(selecteur, { timeout: 2000 })).catch(() =>
    juge.exige(false, `commande absente : ${selecteur}`),
  );
