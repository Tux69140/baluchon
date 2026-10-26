// Groupes et étiquettes de la bibliothèque (spec de la phase 6, décision 5) : noms nettoyés,
// obligatoires et uniques sans tenir compte des majuscules, mais en tenant compte des accents
// (« Ete » ≠ « Été »). Les étiquettes se comparent entre elles tous groupes confondus, les groupes
// entre eux ; une étiquette peut porter le nom d'un groupe. Un élément renommé ne se compare pas à
// lui-même. Le rangement des listes est `deplacerDansListe` (modeles.js).
import { refuser } from './modeles.js';

const nomVide = nom => !String(nom ?? '').trim();
// La forme comparée : nettoyée et en minuscules selon la langue de l'appli.
const cle = (nom, langue) =>
  String(nom ?? '')
    .trim()
    .toLocaleLowerCase(langue);

export const homonymeDeGroupe = (groupes, nom, { exclu, langue } = {}) =>
  groupes.find(g => g.id !== exclu && cle(g.nom, langue) === cle(nom, langue)) ?? null;

export function homonymeDEtiquette({ groupes, etiquettes }, nom, { exclu, langue } = {}) {
  const etiquette = etiquettes.find(e => e.id !== exclu && cle(e.nom, langue) === cle(nom, langue));
  if (!etiquette) return null;
  return { etiquette, groupe: groupes.find(g => g.id === etiquette.groupeId) ?? null };
}

export function validerGroupe({ nom }, { groupes, existant, langue }) {
  if (nomVide(nom)) return { nom: 'nomManquant' };
  if (homonymeDeGroupe(groupes, nom, { exclu: existant?.id, langue })) return { nom: 'nomPris' };
  return {};
}

// « nomPrisIci » : l'homonyme est dans le groupe même de l'étiquette, le message peut être plus court.
export function validerEtiquette({ nom }, { bibliotheque, existante, groupeId, langue }) {
  if (nomVide(nom)) return { nom: 'nomManquant' };
  const trouve = homonymeDEtiquette(bibliotheque, nom, { exclu: existante?.id, langue });
  if (!trouve) return {};
  // Une étiquette existante ne change jamais de groupe.
  const sienne = existante?.groupeId ?? groupeId;
  return { nom: trouve.etiquette.groupeId === sienne ? 'nomPrisIci' : 'nomPris' };
}

// Neuf : tout à la fin de sa liste ; un existant garde sa place.
const rangSuivant = liste => (liste.length ? Math.max(...liste.map(x => x.ordre)) + 1 : 0);

export function preparerGroupe(saisie, { existant, groupes, nouvelId, maintenant, langue }) {
  const erreurs = validerGroupe(saisie, { groupes, existant, langue });
  if (Object.keys(erreurs).length) refuser(erreurs, 'Groupe');
  return {
    id: existant?.id ?? nouvelId(),
    nom: saisie.nom.trim(),
    ordre: existant?.ordre ?? rangSuivant(groupes),
    modifieLe: maintenant,
  };
}

export function preparerEtiquette(saisie, { existante, groupeId, bibliotheque, nouvelId, maintenant, langue }) {
  const erreurs = validerEtiquette(saisie, { bibliotheque, existante, groupeId, langue });
  if (Object.keys(erreurs).length) refuser(erreurs, 'Étiquette');
  const sienne = existante?.groupeId ?? groupeId;
  return {
    id: existante?.id ?? nouvelId(),
    groupeId: sienne,
    nom: saisie.nom.trim(),
    ordre: existante?.ordre ?? rangSuivant(bibliotheque.etiquettes.filter(e => e.groupeId === sienne)),
    modifieLe: maintenant,
  };
}
