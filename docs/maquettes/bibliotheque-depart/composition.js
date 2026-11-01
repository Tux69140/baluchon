// Ce que la phase 13 apporte au modèle, imité pour la maquette (conception validée le 2026-11-01,
// docs/superpowers/specs/2026-11-01-phase-13-bibliotheque-traduisible-design.md, « Comportement ») :
// - la composition du voyage (femmes, hommes, enfants) et les groupes de « Pour qui » ;
// - la règle « par semaine », comptée par semaine commencée ;
// - le calcul des quantités et l'aperçu qui en tiennent compte ;
// - les résumés de règle et l'exemple chiffré de la fiche d'un objet modèle ;
// - ce qu'un changement de composition fait entrer ou change dans un voyage (étape « Changements »).
// Brouillon : l'appli en aura sa propre définition, testée, dans src/modele/ (quantites.js, inclusion.js…).
import { CATEGORIES, GROUPES } from './bibliotheque-v5.js';
import { joursEtNuits } from '../../../src/modele/periode.js';
import { TEXTES as T } from './textes.js';

export const GROUPES_COMPOSITION = ['femmes', 'hommes', 'enfants'];
export const POUR_QUI = ['tous', 'adultes', 'femmes', 'hommes', 'enfants'];
// Chaque compteur va de 0 à 20 ; le total de 1 à 20 (choix 16 de la conception).
export const BORNES = Object.freeze({ max: 20, total: 20 });

export const total = c => c.femmes + c.hommes + c.enfants;

// Les personnes que compte un groupe de « Pour qui ».
export const personnes = (pourQui, c) =>
  ({
    tous: total(c),
    adultes: c.femmes + c.hommes,
    femmes: c.femmes,
    hommes: c.hommes,
    enfants: c.enfants,
  })[pourQui];

// « 2 femmes, 1 enfant » : le détail, groupes vides omis (en-tête du voyage, aperçu).
export const detailComposition = c =>
  GROUPES_COMPOSITION.filter(g => c[g] > 0)
    .map(g => T.compte[g](c[g]))
    .join(', ');

// ---------- La bibliothèque, au format de l'appli, plus « pour qui » et « partagé » ----------
const REGLES = { f: 'fixe', j: 'par_jour', n: 'par_nuit', s: 'par_semaine' };

function lireObjet(ligne, categorieId, rang) {
  const [nom, q, p, e = '', a = '', note = ''] = ligne.split(' | ').map(s => s.trim());
  const [, lettre, valeur, plafond] = q.match(/^([fjns])(\d+)(?:\/(\d+))?$/);
  const partage = p.startsWith('~');
  return {
    id: `m-${categorieId.slice(2)}-${rang}`,
    categorieId,
    nom,
    regle: REGLES[lettre],
    valeur: Number(valeur),
    plafond: plafond ? Number(plafond) : null,
    pourQui: p.replace('~', ''),
    partage,
    // Ce que lisent les vrais dessins de l'appli (« partagé » d'une ligne du voyage).
    parPersonne: !partage,
    consommable: a === 'a',
    note,
    toujoursInclus: !e,
    etiquettes: e ? e.split(' ') : [],
  };
}

export function construireBibliotheque() {
  const groupes = GROUPES.map(([nom], ordre) => ({ id: `g-${ordre}`, nom, ordre }));
  const etiquettes = GROUPES.flatMap(([, siennes], g) =>
    siennes.map(([id, nom], ordre) => ({ id, nom, groupeId: `g-${g}`, ordre })),
  );
  const categories = [];
  const objets = [];
  CATEGORIES.forEach(([nom, icone, couleur, siennes, lignes], ordre) => {
    const id = `c-${ordre}`;
    categories.push({ id, nom, icone, couleur, ordre, toujoursIncluse: !siennes, etiquettes: siennes ? siennes.split(' ') : [] });
    lignes
      .trim()
      .split('\n')
      .forEach((ligne, rang) => objets.push(lireObjet(ligne, id, rang)));
  });
  return { groupes, etiquettes, categories, objets };
}

export const trouverObjet = (bibliotheque, nom) => bibliotheque.objets.find(o => o.nom === nom);

// ---------- Les quantités ----------
// Base : × 1, × jours, × nuits ou × semaines commencées ; plafond sur la base ; par personne : × les
// personnes du groupe ; partagé : tel quel.
export function quantite(objet, { jours, nuits }, composition) {
  const semaines = Math.ceil(jours / 7);
  const fois = { fixe: 1, par_jour: jours, par_nuit: nuits, par_semaine: semaines }[objet.regle];
  const base = objet.valeur * fois;
  const parTete = objet.plafond === null ? base : Math.min(base, objet.plafond);
  const n = personnes(objet.pourQui, composition);
  if (!n) return 0;
  return objet.partage ? parTete : parTete * n;
}

const inclus = ({ toujours, etiquettes }, choisies) => toujours || etiquettes.some(id => choisies.has(id));

// L'aperçu, au format de genererApercu (src/modele/inclusion.js) : un objet n'est proposé que si son
// groupe compte au moins une personne.
export function apercu(bibliotheque, infos, choisies) {
  const periode = joursEtNuits(infos.depart, infos.retour);
  const resultat = [];
  for (const categorie of bibliotheque.categories) {
    if (!inclus({ toujours: categorie.toujoursIncluse, etiquettes: categorie.etiquettes }, choisies)) continue;
    const objets = bibliotheque.objets
      .filter(o => o.categorieId === categorie.id)
      .filter(o => inclus({ toujours: o.toujoursInclus, etiquettes: o.etiquettes }, choisies))
      .map(objet => ({ objet, quantite: quantite(objet, periode, infos) }))
      .filter(({ quantite: q }) => q > 0)
      .sort((a, b) => a.objet.nom.localeCompare(b.objet.nom, 'fr'));
    if (objets.length) resultat.push({ categorie, objets });
  }
  return resultat;
}

// ---------- Résumé de règle et exemple chiffré ----------
// « 1 par enfant », « 2 par jour, au plus 7, par personne », « 1 par semaine et par personne »,
// « 5 par semaine, partagé », « 1, partagé entre les enfants ».
export function resumeRegle({ regle, valeur, plafond, pourQui, partage }) {
  const base = regle === 'fixe' ? `${valeur}` : `${valeur} ${T.regle[regle]}`;
  const auPlus = plafond !== null && regle !== 'fixe' ? `, ${T.regle.auPlus} ${plafond}` : '';
  if (partage) return `${base}${auPlus}, ${T.regle.partage[pourQui]}`;
  const unite = `par ${T.regle.unite[pourQui]}`;
  if (regle === 'fixe') return `${base} ${unite}`;
  return auPlus ? `${base}${auPlus}, ${unite}` : `${base} et ${unite}`;
}

// La composition et la période de l'exemple : chaque groupe y compte une personne, aucun objet n'y
// disparaît, et 10 jours font 2 semaines commencées.
export const EXEMPLE = Object.freeze({ jours: 10, nuits: 9, femmes: 1, hommes: 1, enfants: 1 });

export function exempleChiffre(objet) {
  const semaines = objet.regle === 'par_semaine' ? T.exemple.semaines(Math.ceil(EXEMPLE.jours / 7)) : '';
  const phrase = T.exemple.phrase({
    jours: `${EXEMPLE.jours}${' '}jours${semaines}`,
    nuits: `${EXEMPLE.nuits}${' '}nuits`,
    composition: T.exemple.composition(EXEMPLE),
    quantite: quantite(objet, EXEMPLE, EXEMPLE),
  });
  const absent = objet.pourQui === 'tous' ? null : T.exemple.absent[objet.pourQui];
  return { phrase, absent };
}

// ---------- « Modifier le voyage » : ce qu'une nouvelle composition fait entrer ou change ----------
// Au format de calculerChangements (src/modele/changements.js) : par catégorie, lignes par nom ; une
// entrée porte pour raison le groupe qui la fait entrer (« les enfants »).
export function changementsDeComposition(bibliotheque, contenu, infos, choisies) {
  const avant = new Map(apercu(bibliotheque, contenu.voyage, choisies).flatMap(c => c.objets.map(l => [l.objet.id, l])));
  const parModele = new Map(contenu.objets.map(o => [o.modeleId, o]));
  const groupes = [];
  for (const { categorie, objets } of apercu(bibliotheque, infos, choisies)) {
    const lignes = [];
    for (const { objet: modele, quantite: apres } of objets) {
      const objet = parModele.get(modele.id);
      if (!avant.has(modele.id))
        lignes.push({ genre: 'entree', cle: `entree:${modele.id}`, nom: modele.nom, avant: 0, apres, defaut: true, retire: false, modele, raison: T.regle.raison[modele.pourQui] });
      else if (objet && objet.quantite !== apres)
        lignes.push({ genre: 'quantite', cle: objet.id, nom: objet.nom, avant: objet.quantite, apres, defaut: true, retire: false, objet });
    }
    if (lignes.length) groupes.push({ categorie, lignes: lignes.sort((a, b) => a.nom.localeCompare(b.nom, 'fr')) });
  }
  return groupes;
}
