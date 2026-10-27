// L'état de l'assistant « Nouveau voyage » : étapes, choix, objets écartés. Fonctions pures, sans
// DOM : chacune rend un nouvel état et ne touche jamais à celui qu'on lui donne (Sets compris).
// Décisions du 2026-10-24, docs/PRD.md, « Écrans et gestes » ; l'écran vit ailleurs.
import { groupesAvecEtiquettes } from '../modele/inclusion.js';

export const creerAssistant = () => ({
  etape: 0,
  vues: new Set([0]),
  choisies: new Set(),
  ecartes: new Set(),
  signature: null,
});

// Informations, un groupe par étape (seulement s'il a des étiquettes), puis l'aperçu.
export const etapesDe = bibliotheque => [
  { type: 'informations' },
  ...groupesAvecEtiquettes(bibliotheque).map(g => ({ type: 'groupe', ...g })),
  { type: 'apercu' },
];

// `derniere` : indice de l'aperçu. Une étape est touchable si elle a déjà été vue, ou si c'est
// l'aperçu et que les informations sont valides.
export function etatEtape(etat, indice, { derniere, infosValides }) {
  if (indice === etat.etape) return 'courante';
  if (indice === derniere && infosValides) return 'ouverte';
  return etat.vues.has(indice) ? 'ouverte' : 'fermee';
}

// Ce qui désigne une étape d'une lecture de la bibliothèque à l'autre : son groupe, ou son type.
const cleEtape = etape => (etape.type === 'groupe' ? `groupe-${etape.groupe.id}` : etape.type);

// La bibliothèque relue pendant l'assistant (« Annuler » a rendu un groupe ou une étiquette) : les
// étapes passent d'anciennes à nouvelles ; l'étape en cours et les étapes vues restent les mêmes, à
// leur nouvelle place ; choix et objets écartés ne changent pas. Une étape disparue (Informations à la
// place de l'étape en cours) n'arrive pas : un rétablissement ne fait qu'ajouter.
export function reprendreEtapes(etat, anciennes, nouvelles) {
  const places = new Map(nouvelles.map((etape, indice) => [cleEtape(etape), indice]));
  const place = indice => places.get(cleEtape(anciennes[indice]));
  const vues = [...etat.vues].map(place).filter(indice => indice !== undefined);
  return { ...etat, etape: place(etat.etape) ?? 0, vues: new Set([0, ...vues]) };
}

export const allerA = (etat, indice) => ({ ...etat, etape: indice, vues: new Set(etat.vues).add(indice) });

const basculer = (ensemble, id) => {
  const suivant = new Set(ensemble);
  if (!suivant.delete(id)) suivant.add(id);
  return suivant;
};

export const basculerEtiquette = (etat, id) => ({ ...etat, choisies: basculer(etat.choisies, id) });
export const basculerObjet = (etat, id) => ({ ...etat, ecartes: basculer(etat.ecartes, id) });

export function etatCoche(ids, ecartes) {
  const retenus = ids.filter(id => !ecartes.has(id)).length;
  return { retenus, coche: retenus === ids.length ? 'plein' : retenus ? 'entame' : 'vide' };
}

// Tout écarté → tout repris ; sinon (plein ou entamé) tout écarté.
export function basculerCategorie(etat, ids) {
  const ecartes = new Set(etat.ecartes);
  const toutEcarte = etatCoche(ids, ecartes).coche === 'vide';
  for (const id of ids) toutEcarte ? ecartes.delete(id) : ecartes.add(id);
  return { ...etat, ecartes };
}

// Ce qui, en changeant, peut faire entrer ou sortir des objets de l'aperçu. Le nom n'y est pour rien.
export const signatureDe = ({ depart, retour, voyageurs }, choisies) =>
  JSON.stringify([[...choisies].sort(), depart, retour, voyageurs]);

// Les objets écartés à nommer : ceux encore présents dans l'aperçu, seulement si les choix ont changé
// depuis le dernier aperçu vu. Un objet écarté qui a quitté l'aperçu reste écarté, sans être nommé.
export function entrerDansApercu(etat, signature, idsPresents) {
  const change = etat.signature !== null && etat.signature !== signature;
  return {
    etat: { ...etat, signature },
    aReconfirmer: change ? idsPresents.filter(id => etat.ecartes.has(id)) : [],
  };
}

export function remettre(etat, ids) {
  const ecartes = new Set(etat.ecartes);
  for (const id of ids) ecartes.delete(id);
  return { ...etat, ecartes };
}

// Les identifiants des objets modèles d'une catégorie de l'aperçu (genererApercu), puis de tout l'aperçu.
export const idsDeCategorie = ({ objets }) => objets.map(({ objet }) => objet.id);
export const idsDeLApercu = apercu => apercu.flatMap(idsDeCategorie);

export function raisonVide(apercu, ecartes) {
  const ids = idsDeLApercu(apercu);
  if (!ids.length) return 'aucunObjet';
  return ids.every(id => ecartes.has(id)) ? 'toutEcarte' : null;
}

// Les voyageurs (2 par défaut) ne comptent pas : rien n'a été saisi tant que l'on n'y a pas touché ailleurs.
export const saisieCommencee = ({ nom, destination, depart }, etat) =>
  Boolean(String(nom ?? '').trim() || String(destination ?? '').trim() || depart || etat.choisies.size);
