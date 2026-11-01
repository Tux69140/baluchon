// Le fichier de sauvegarde (docs/superpowers/specs/2026-10-31-phase-12-reglages-sauvegarde-design.md,
// « Données ») : son nom, sa construction et sa relecture. Pur : ni navigateur ni base.
// Les champs de chaque sorte de ligne sont décrits une seule fois, dans TABLES, calquées sur
// tests/contrat/stockage.json.

import { POUR_QUI, validerComposition } from './composition.js';

export const FORMAT_SAUVEGARDE = 'baluchon-sauvegarde';
export const VERSION_SAUVEGARDE = 2;

const deux = n => String(n).padStart(2, '0');

// Heure locale : baluchon-AAAA-MM-JJ-HHhMM[-N].json ; N à partir de 2 quand le nom existe déjà.
export function nomDeSauvegarde(date, { avantRestauration = false, numero = 1 } = {}) {
  const jour = `${date.getFullYear()}-${deux(date.getMonth() + 1)}-${deux(date.getDate())}`;
  const heure = `${deux(date.getHours())}h${deux(date.getMinutes())}`;
  const prefixe = avantRestauration ? 'baluchon-avant-restauration' : 'baluchon';
  const suffixe = numero > 1 ? `-${numero}` : '';
  return `${prefixe}-${jour}-${heure}${suffixe}.json`;
}

export function construireSauvegarde({ bibliotheque, voyages, langue }, creeLe) {
  return { format: FORMAT_SAUVEGARDE, version: VERSION_SAUVEGARDE, creeLe, langue, bibliotheque, voyages };
}

// Types : t texte, q groupe de « Pour qui », e entier, b booléen, en entier ou null, tn texte ou null, l liste de textes.
const TYPES = {
  t: v => typeof v === 'string',
  q: v => POUR_QUI.includes(v),
  e: v => Number.isInteger(v),
  b: v => typeof v === 'boolean',
  en: v => v === null || Number.isInteger(v),
  tn: v => v === null || typeof v === 'string',
  l: v => Array.isArray(v) && v.every(x => typeof x === 'string'),
};

const REGLE = {
  id: 't',
  nom: 't',
  regle: 't',
  valeur: 'e',
  plafond: 'en',
  parPersonne: 'b',
  pourQui: 'q',
  consommable: 'b',
};
const TABLES = {
  groupe: { id: 't', nom: 't', ordre: 'e', modifieLe: 't' },
  etiquetteModele: { id: 't', groupeId: 't', nom: 't', ordre: 'e', modifieLe: 't' },
  categorieModele: {
    id: 't',
    nom: 't',
    icone: 't',
    couleur: 't',
    ordre: 'e',
    toujoursIncluse: 'b',
    modifieLe: 't',
    etiquettes: 'l',
  },
  objetModele: {
    ...REGLE,
    categorieId: 't',
    toujoursInclus: 'b',
    note: 't',
    modifieLe: 't',
    etiquettes: 'l',
  },
  voyage: {
    id: 't',
    nom: 't',
    destination: 't',
    depart: 't',
    retour: 't',
    femmes: 'e',
    hommes: 'e',
    enfants: 'e',
    modifieLe: 't',
  },
  etiquetteVoyage: { id: 't', voyageId: 't', modeleId: 'tn', nom: 't', ordre: 'e', modifieLe: 't' },
  categorieVoyage: {
    id: 't',
    voyageId: 't',
    modeleId: 'tn',
    nom: 't',
    icone: 't',
    couleur: 't',
    ordre: 'e',
    modifieLe: 't',
  },
  objetVoyage: {
    ...REGLE,
    voyageId: 't',
    categorieId: 't',
    modeleId: 'tn',
    quantite: 'e',
    quantiteManuelle: 'b',
    dansLeSac: 'e',
    aAcheter: 'b',
    achetes: 'e',
    note: 't',
    modifieLe: 't',
  },
};

// Version 1 (avant la phase 13) : des voyageurs, pas de « pour qui ». Même conversion que la migration 008
// de la base : femmes = ⌈voyageurs / 2⌉, hommes = ⌊voyageurs / 2⌋, enfants = 0, et tout objet vise « tous ».
// Ne touche qu'à ce qui est bien formé : le reste reste tel quel et sera refusé par la relecture.
const estObjet = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const avecPourQui = lignes =>
  Array.isArray(lignes) ? lignes.map(l => (estObjet(l) ? { ...l, pourQui: 'tous' } : l)) : lignes;

function enVersion2(donnees) {
  const { bibliotheque, voyages } = donnees;
  return {
    ...donnees,
    version: 2,
    bibliotheque: estObjet(bibliotheque) ? { ...bibliotheque, objets: avecPourQui(bibliotheque.objets) } : bibliotheque,
    voyages: Array.isArray(voyages) ? voyages.map(voyageEnVersion2) : voyages,
  };
}

function voyageEnVersion2(contenu) {
  if (!estObjet(contenu) || !estObjet(contenu.voyage)) return contenu;
  const { voyageurs, ...voyage } = contenu.voyage;
  if (Number.isInteger(voyageurs))
    Object.assign(voyage, { femmes: Math.ceil(voyageurs / 2), hommes: Math.floor(voyageurs / 2), enfants: 0 });
  return { ...contenu, voyage, objets: avecPourQui(contenu.objets) };
}

const estListe = v => Array.isArray(v);

function ligneValide(ligne, table) {
  return estObjet(ligne) && Object.entries(table).every(([cle, type]) => TYPES[type](ligne[cle]));
}

// Liste de lignes de cette sorte, identifiants tous différents ; renvoie les lignes ou null.
function lignesValides(lignes, table, ids) {
  if (!estListe(lignes) || !lignes.every(l => ligneValide(l, table))) return null;
  for (const l of lignes) {
    if (ids.has(l.id)) return null;
    ids.add(l.id);
  }
  return lignes;
}

function bibliothequeValide(b) {
  if (!estObjet(b)) return false;
  const ids = { groupes: new Set(), etiquettes: new Set(), categories: new Set(), objets: new Set() };
  const groupes = lignesValides(b.groupes, TABLES.groupe, ids.groupes);
  const etiquettes = lignesValides(b.etiquettes, TABLES.etiquetteModele, ids.etiquettes);
  const categories = lignesValides(b.categories, TABLES.categorieModele, ids.categories);
  const objets = lignesValides(b.objets, TABLES.objetModele, ids.objets);
  if (!groupes || !etiquettes || !categories || !objets) return false;
  return (
    etiquettes.every(e => ids.groupes.has(e.groupeId)) &&
    objets.every(o => ids.categories.has(o.categorieId)) &&
    [...categories, ...objets].every(l => l.etiquettes.every(id => ids.etiquettes.has(id)))
  );
}

// `vus` : identifiants déjà rencontrés dans les autres voyages, par table.
function voyageValide(contenu, vus) {
  if (!estObjet(contenu) || !ligneValide(contenu.voyage, TABLES.voyage)) return false;
  if (Object.keys(validerComposition(contenu.voyage)).length > 0) return false;
  const id = contenu.voyage.id;
  if (vus.voyages.has(id)) return false;
  const ecartes = contenu.ecartes === undefined ? [] : contenu.ecartes;
  if (!TYPES.l(ecartes)) return false;
  const etiquettes = lignesValides(contenu.etiquettes, TABLES.etiquetteVoyage, vus.etiquettes);
  const categories = lignesValides(contenu.categories, TABLES.categorieVoyage, vus.categories);
  const objets = lignesValides(contenu.objets, TABLES.objetVoyage, vus.objets);
  if (!etiquettes || !categories || !objets) return false;
  const categoriesIds = new Set(categories.map(c => c.id));
  vus.voyages.add(id);
  return (
    [...etiquettes, ...categories, ...objets].every(l => l.voyageId === id) &&
    objets.every(o => categoriesIds.has(o.categorieId))
  );
}

function formeValide(donnees) {
  if (!TYPES.t(donnees.creeLe) || !TYPES.t(donnees.langue)) return false;
  if (Number.isNaN(Date.parse(donnees.creeLe))) return false;
  if (!bibliothequeValide(donnees.bibliotheque) || !estListe(donnees.voyages)) return false;
  const vus = { voyages: new Set(), etiquettes: new Set(), categories: new Set(), objets: new Set() };
  return donnees.voyages.every(v => voyageValide(v, vus));
}

export function lireSauvegarde(texte) {
  let donnees;
  try {
    donnees = JSON.parse(texte);
  } catch {
    return { ok: false, raison: 'abime' };
  }
  if (donnees === null) return { ok: false, raison: 'abime' };
  if (!estObjet(donnees) || donnees.format !== FORMAT_SAUVEGARDE) return { ok: false, raison: 'format' };
  if (!Number.isInteger(donnees.version) || donnees.version < 1) return { ok: false, raison: 'abime' };
  if (donnees.version > VERSION_SAUVEGARDE) return { ok: false, raison: 'version' };
  if (donnees.version === 1) donnees = enVersion2(donnees);
  if (!formeValide(donnees)) return { ok: false, raison: 'abime' };
  const voyages = donnees.voyages.map(v => ({ ...v, ecartes: v.ecartes ?? [] }));
  return {
    ok: true,
    contenu: { bibliotheque: donnees.bibliotheque, voyages, langue: donnees.langue },
    resume: { creeLe: donnees.creeLe, voyages: voyages.length, objets: donnees.bibliotheque.objets.length },
  };
}
