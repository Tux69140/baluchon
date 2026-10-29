// Le sac : compter les pièces, mesurer l'avancement, ordonner la liste (docs/PRD.md, « Écrans et
// gestes », US-15, US-16, US-17 et US-40). Chaque règle n'est écrite qu'ici.

// Des pièces de trop dans le sac attendent que l'utilisateur confirme les avoir sorties : quantité
// baissée sous ce qui était emballé, ou objet retiré (quantité 0) avec des pièces dedans (décisions du
// chef de projet, 2026-10-29, docs/superpowers/specs/2026-10-29-phase-10-plans-changent-design.md).
export const piecesASortir = objet => Math.max(0, objet.dansLeSac - objet.quantite);

// Un objet retiré du voyage n'y reste que le temps de sortir ses pièces du sac.
export const estRetire = objet => objet.quantite === 0;

// Complet (emballé) : exactement les pièces demandées. Une pièce de trop ne compte pas comme emballée :
// tant qu'elle n'est pas sortie, ni la catégorie ni le sac ne sont bouclés.
export const estComplet = objet => objet.dansLeSac === objet.quantite;

// Des pièces comptées sur une quantité : celles du sac, ou celles achetées (src/modele/courses.js).
export function etatDePieces(n, quantite) {
  if (n >= quantite) return 'plein';
  return n > 0 ? 'entame' : 'vide';
}

export const etatDansLeSac = objet =>
  piecesASortir(objet) > 0 ? 'a-sortir' : etatDePieces(objet.dansLeSac, objet.quantite);

// Un appui sur la case ajoute une pièce ; sur un objet plein, il vide tout, et l'écran demande
// d'abord confirmation (sauf pour une seule pièce : rien à perdre). Avec des pièces de trop, il en sort
// une, comme un appui en met une.
export function appuiSurCase(objet) {
  if (piecesASortir(objet) > 0) return { dansLeSac: objet.dansLeSac - 1, confirmer: false };
  if (!estComplet(objet)) return { dansLeSac: objet.dansLeSac + 1, confirmer: false };
  return { dansLeSac: 0, confirmer: viderDemandeConfirmation(objet) };
}

// Jamais au-delà de la quantité, sauf un excédent déjà là, qui ne fait que décroître (la même borne
// que le stockage).
export function bornerDansLeSac(objet, valeur) {
  return Math.min(Math.max(Math.trunc(valeur), 0), Math.max(objet.quantite, objet.dansLeSac));
}

export const viderDemandeConfirmation = objet => objet.dansLeSac > 1;

// Les compteurs comptent des objets complets, pas des pièces : Repas 6/16 ne fait rien avancer.
export function progression(objets) {
  return { faits: objets.filter(estComplet).length, total: objets.length };
}

// Fini : tout ce qui est compté est complet ; sans rien à compter (catégorie ou voyage vide), rien
// n'est jamais fini. Une catégorie bouclée, une jauge pleine, un sac bouclé : la même règle.
export const estFini = ({ faits, total }) => total > 0 && faits === total;

export const estBouclee = objets => estFini(progression(objets));

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
