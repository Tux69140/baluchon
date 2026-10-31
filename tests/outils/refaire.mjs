// Outils des tests d'écran de « Refaire ce voyage » (phase 11 ; tests/ecran-refaire.mjs,
// tests/ecran-refaire-apercu.mjs) : un voyage d'origine réglé à la main, la bibliothèque telle qu'elle est
// devenue depuis, et les gestes qui mènent de ce voyage à l'aperçu du voyage refait.
// Le voyage d'origine « Quiberon » (3 voyageurs, Randonnée et Plongée) a été créé sur une bibliothèque qui
// avait encore l'étiquette Plongée et l'objet Lampe frontale ; on y avait écarté les Chaussures de marche,
// fixé le Pull à 5 (le calcul donne 3) et ajouté à la main un Cerf-volant dans Équipement.
import { genererVoyage } from '../../src/modele/voyage.js';
import { attendreQue, calme } from './attente.mjs';
import { avecBibliotheque } from './assistant.mjs';
import { FORMATS, attendreEcran, lireStockage, ouvrir } from './page.mjs';

const MAINTENANT = new Date('2026-10-06T10:00:00');
// Du 13 au 15 novembre (le mois suivant au calendrier) : 3 jours.
const DATES = { depart: '2026-11-13', retour: '2026-11-15' };
// Les formats des captures ; l'ordinateur se mène à la souris.
export const QUATRE = {
  telephone: { taille: FORMATS.telephone },
  'tablette-portrait': { taille: FORMATS['tablette-portrait'] },
  'tablette-paysage': { taille: FORMATS['tablette-paysage'] },
  ordinateur: { taille: FORMATS.ordinateur, tactile: false },
};

const categorie = (id, nom, icone, couleur, ordre) => ({
  id,
  nom,
  icone,
  couleur,
  ordre,
  toujoursIncluse: true,
  modifieLe: 'x',
  etiquettes: [],
});
const objet = (id, categorieId, nom, regle, valeur, autres = {}) => ({
  id,
  categorieId,
  nom,
  regle,
  valeur,
  plafond: null,
  parPersonne: true,
  consommable: false,
  toujoursInclus: !autres.etiquettes?.length,
  note: '',
  modifieLe: 'x',
  etiquettes: [],
  ...autres,
});

// La bibliothèque d'aujourd'hui : sans Plongée ni Lampe frontale.
const BIBLIOTHEQUE = {
  groupes: [
    { id: 'g-act', nom: 'Activités', ordre: 0, modifieLe: 'x' },
    { id: 'g-cli', nom: 'Climat', ordre: 1, modifieLe: 'x' },
  ],
  etiquettes: [
    { id: 'e-rando', groupeId: 'g-act', nom: 'Randonnée', ordre: 0, modifieLe: 'x' },
    { id: 'e-pluie', groupeId: 'g-cli', nom: 'Pluie', ordre: 0, modifieLe: 'x' },
  ],
  categories: [
    categorie('c-vet', 'Vêtements', 't-shirt', 'ciel', 0),
    categorie('c-ali', 'Alimentation', 'fork-knife', 'pomme', 1),
    categorie('c-equ', 'Équipement', 'backpack', 'lagon', 2),
  ],
  objets: [
    objet('o-pull', 'c-vet', 'Pull', 'fixe', 1),
    objet('o-chaussures', 'c-vet', 'Chaussures de marche', 'fixe', 1, {
      parPersonne: false,
      toujoursInclus: false,
      etiquettes: ['e-rando'],
    }),
    objet('o-poncho', 'c-vet', 'Poncho', 'fixe', 1, { toujoursInclus: false, etiquettes: ['e-pluie'] }),
    objet('o-repas', 'c-ali', 'Repas', 'par_jour', 2, { consommable: true }),
    objet('o-couteau', 'c-equ', 'Couteau', 'fixe', 1, { parPersonne: false }),
  ],
};
// Celle du jour où le voyage d'origine a été créé.
const AVANT = {
  ...BIBLIOTHEQUE,
  etiquettes: [
    ...BIBLIOTHEQUE.etiquettes,
    { id: 'e-plongee', groupeId: 'g-act', nom: 'Plongée', ordre: 1, modifieLe: 'x' },
  ],
  objets: [...BIBLIOTHEQUE.objets, objet('o-lampe', 'c-equ', 'Lampe frontale', 'fixe', 1)],
};

export const NOM_ORIGINE = 'Quiberon <i>&</i>';
let n = 0;
const genere = genererVoyage(
  AVANT,
  { nom: NOM_ORIGINE, destination: 'Bretagne', depart: '2026-07-10', retour: '2026-07-17', voyageurs: 3 },
  { choisies: new Set(['e-rando', 'e-plongee']), ecartes: new Set(['o-chaussures']) },
  { nouvelId: () => `id-${++n}`, maintenant: 'avant' },
);
export const V = genere.voyage.id;
const equipement = genere.categories.find(c => c.modeleId === 'c-equ');
const CERF_VOLANT = {
  ...genere.objets.find(o => o.modeleId === 'o-couteau'),
  id: 'ajout-cerf-volant',
  modeleId: null,
  categorieId: equipement.id,
  nom: 'Cerf-volant',
  quantite: 1,
  dansLeSac: 1,
};
const objetsOrigine = [
  ...genere.objets.map(o =>
    o.modeleId === 'o-pull' ? { ...o, quantite: 5, quantiteManuelle: true, dansLeSac: 2 } : o,
  ),
  CERF_VOLANT,
];

// avec : des retouches au voyage d'origine (son nom…) ; bibliotheque : celle d'aujourd'hui.
export function donneesOrigine({ nom = NOM_ORIGINE, bibliotheque = BIBLIOTHEQUE } = {}) {
  return {
    ...avecBibliotheque(bibliotheque),
    voyages: [{ ...genere.voyage, nom }],
    etiquettesDuVoyage: genere.etiquettes,
    categoriesDuVoyage: genere.categories,
    objetsDuVoyage: objetsOrigine,
    objetsEcartes: genere.ecartes.map(modeleId => ({ voyageId: V, modeleId })),
  };
}

// Une bibliothèque dont les étiquettes reprises n'appellent plus rien : toutes ses catégories attendent
// Pluie, que le voyage d'origine n'avait pas (Vigilance 4).
export const RIEN_N_ENTRE = {
  ...BIBLIOTHEQUE,
  categories: BIBLIOTHEQUE.categories.map(c => ({ ...c, toujoursIncluse: false, etiquettes: ['e-pluie'] })),
};

export function ouvrirEssai(navigateur, url, { format = 'telephone', theme = 'light', donnees, adresse }) {
  const { taille, tactile } = QUATRE[format];
  return ouvrir(navigateur, url, {
    taille,
    tactile,
    theme,
    maintenant: MAINTENANT,
    donnees: donnees ?? donneesOrigine(),
    adresse: adresse ?? `#/voyage/${V}`,
  });
}

// « Refaire ce voyage », dans le menu « ⋮ » du titre du voyage ouvert.
export async function refaireDepuisLeVoyage(page) {
  await page.click('.voyage-titre .menu-voyage-bouton');
  await page.click('.voyage-titre .menu-voyage [data-menu="refaire"]');
  await attendreEcran(page, 'refaire-voyage');
}

export const carte = id => `li.carte-avec-actions:has(> a.carte-voyage[href="#/voyage/${id}"])`;

// « Refaire ce voyage », dans le menu « ⋮ » de sa carte de Mes voyages.
export async function refaireDepuisLaCarte(page, id) {
  await page.click(`${carte(id)} > .menu-voyage-bouton`);
  await page.click(`${carte(id)} .menu-voyage [data-menu="refaire"]`);
  await attendreEcran(page, 'refaire-voyage');
}

// Nom et dates (13 au 15 novembre), à l'étape Informations.
export async function remplirInfos(page, nom = 'Quiberon 2027') {
  await page.fill('#nom', nom);
  await page.click('[data-mois="1"]');
  await page.click(`[data-jour="${DATES.depart}"]`);
  await page.click(`[data-jour="${DATES.retour}"]`);
}

export async function versApercu(page) {
  const apercu = page.locator('.assistant [data-action="apercu"]');
  await ((await apercu.count()) ? apercu : page.locator('.assistant [data-action="suivant"]')).click();
  await page.waitForSelector('.formulaire-corps[data-etape="apercu"]');
  await calme(page);
}

// Ce que montre l'aperçu : la phrase en tête, le message « tout écarté », « Créer le voyage », et chaque
// ligne (case, nom de la case, quantité, texte dessous, mentions, barré, choix d'une quantité fixée).
export const lireApercu = page =>
  page.evaluate(() => {
    const texte = el => el?.textContent.replace(/[ \t\r\n]+/g, ' ').trim() ?? null;
    const creer = document.querySelector('[data-action="creer"]');
    return {
      titre: texte(document.querySelector('#titre-etape')),
      phrase: texte(document.querySelector('.apercu .refaire-disparus')),
      phraseApres: document.querySelector('.apercu-tete + .refaire-disparus') !== null,
      balises: document.querySelectorAll('.refaire-disparus > span:last-child *').length,
      raison: texte(document.querySelector('#raison-vide')),
      grise: creer?.getAttribute('aria-disabled') ?? null,
      lignes: [...document.querySelectorAll('.apercu [data-objet]')].map(b => {
        const li = b.closest('li');
        const segments = [...li.querySelectorAll('input[data-manuelle]')];
        return {
          id: b.dataset.objet,
          nom: texte(b.querySelector('.objet-nom')),
          coche: b.getAttribute('aria-checked'),
          case: b.getAttribute('aria-label'),
          quantite: texte(b.querySelector('.objet-quantite')),
          sous: texte(b.querySelector('.objet-sous')),
          mentions: [...b.querySelectorAll('.pastille-mention')].map(texte),
          barre: getComputedStyle(b.querySelector('.objet-nom')).textDecorationLine,
          segments: segments.map(s => `${texte(s.nextElementSibling)}${s.checked ? ' ✓' : ''}`),
        };
      }),
    };
  });

export const ligne = (vue, nom) => vue.lignes.find(l => l.nom === nom) ?? null;

// Tout ce que le stockage garde d'un voyage, pour le comparer avant et après.
export async function contenuStocke(page, id) {
  const s = await lireStockage(page);
  const siens = cle => (s[cle] ?? []).filter(x => x.voyageId === id);
  return {
    voyage: (s.voyages ?? []).find(v => v.id === id) ?? null,
    etiquettes: siens('etiquettesDuVoyage'),
    categories: siens('categoriesDuVoyage'),
    objets: siens('objetsDuVoyage'),
    ecartes: siens('objetsEcartes'),
  };
}

// L'identifiant du voyage ouvert à l'écran (son adresse), une fois l'écran du voyage dessiné.
export async function voyageOuvert(page) {
  await attendreEcran(page, 'voyage');
  return attendreQue(page, () => /^#\/voyage\/([^/]+)$/.exec(location.hash)?.[1] ?? null);
}
