// Le sac : compter les pièces, mesurer l'avancement, ordonner la liste (docs/PRD.md, « Écrans et
// gestes », US-15, US-16, US-17 et US-40). Chaque règle n'est écrite qu'ici.

// Complet : toutes les pièces demandées sont dans le sac (une quantité modifiée après coup peut
// repasser un objet en incomplet, d'où « au moins » plutôt que « exactement »).
export const estComplet = objet => objet.dansLeSac >= objet.quantite;

export function etatDansLeSac(objet) {
  if (estComplet(objet)) return 'plein';
  return objet.dansLeSac > 0 ? 'entame' : 'vide';
}

// Un appui sur la case ajoute une pièce ; sur un objet plein, il vide tout, et l'écran demande
// d'abord confirmation (sauf pour une seule pièce : rien à perdre).
export function appuiSurCase(objet) {
  if (!estComplet(objet)) return { dansLeSac: objet.dansLeSac + 1, confirmer: false };
  // Un objet complet a dansLeSac === quantite (la base interdit de dépasser), d'où la même règle.
  return { dansLeSac: 0, confirmer: viderDemandeConfirmation(objet) };
}

export function bornerDansLeSac(objet, valeur) {
  return Math.min(Math.max(Math.trunc(valeur), 0), objet.quantite);
}

export const viderDemandeConfirmation = objet => objet.dansLeSac > 1;

// Les compteurs comptent des objets complets, pas des pièces : Repas 6/16 ne fait rien avancer.
export function progression(objets) {
  return { faits: objets.filter(estComplet).length, total: objets.length };
}

// Une catégorie vide n'est jamais « bouclée » : il n'y a rien à avoir fini.
export function estBouclee(objets) {
  return objets.length > 0 && objets.every(estComplet);
}

// Alphabétique, les complets au fond de la liste pour garder le reste à faire en haut.
export function ordreDansLeSac(objets) {
  const parNom = (a, b) => a.nom.localeCompare(b.nom);
  return [...objets.filter(o => !estComplet(o)).sort(parNom), ...objets.filter(estComplet).sort(parNom)];
}

// Pour l'écran d'accueil : l'avancement de chaque voyage, calculé depuis les états de la base.
export function progressionParVoyage(etats) {
  const parVoyage = new Map();
  for (const etat of etats) {
    const compte = parVoyage.get(etat.voyageId) ?? { faits: 0, total: 0 };
    compte.total += 1;
    if (estComplet(etat)) compte.faits += 1;
    parVoyage.set(etat.voyageId, compte);
  }
  return parVoyage;
}

// Après avoir bouclé une catégorie : la suivante encore à faire, en reprenant au début de la liste.
export function categorieSuivante(ids, choisie, estBoucleeParId) {
  const depart = ids.indexOf(choisie);
  for (let i = 1; i <= ids.length; i++) {
    const id = ids[(depart + i) % ids.length];
    if (id !== choisie && !estBoucleeParId(id)) return id;
  }
  return null;
}
