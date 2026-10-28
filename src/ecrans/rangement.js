// L'état d'affichage de l'écran d'un voyage. Les pièces sont comptées au fil des appuis, mais la
// liste ne doit pas bouger sous le doigt (docs/PRD.md, US-15) : on la fige ici, et elle ne se
// range qu'après une seconde sans appui (apresRepit), puis les catégories bouclées se replient
// une seconde après leur tampon (apresTampon). Fonctions pures : chacune rend un nouvel état,
// sans toucher ni au navigateur ni aux minuteries, qui vivent dans l'écran.
import { categorieSuivante, estBouclee, estComplet, ordreDansLeSac } from '../modele/sac.js';

const idsDeLaListe = liste => liste.map(c => c.categorie.id);
const tousLesObjets = liste => liste.flatMap(c => c.objets);

function bouclees(liste) {
  return new Set(liste.filter(c => estBouclee(c.objets)).map(c => c.categorie.id));
}

function ordres(liste) {
  return new Map(liste.map(c => [c.categorie.id, ordreDansLeSac(c.objets).map(o => o.id)]));
}

// Sous le filtre « Reste à emballer », les objets complets disparaissent de la liste.
function masquesPour(liste, filtre) {
  return new Set(
    filtre
      ? tousLesObjets(liste)
          .filter(estComplet)
          .map(o => o.id)
      : [],
  );
}

// Un sac vide n'est pas « bouclé » (même règle que pour une catégorie vide).
function sacEstBoucle(liste) {
  return estBouclee(tousLesObjets(liste));
}

// Les bouclées vont au fond sous le filtre seulement ; hors filtre, elles restent à leur place.
const enBasPour = (bouclee, filtre) => new Set(filtre ? bouclee : []);

export function etatInitial(liste, { filtre }) {
  const bouclee = bouclees(liste);
  const ids = idsDeLaListe(liste);
  return {
    filtre,
    ordre: ordres(liste),
    bouclees: bouclee,
    ouvertes: new Set(ids.filter(id => !bouclee.has(id))),
    enBas: enBasPour(bouclee, filtre),
    masques: masquesPour(liste, filtre),
    sacBoucle: sacEstBoucle(liste),
    choisie: ids.find(id => !bouclee.has(id)) ?? ids[0] ?? null,
  };
}

// La seconde de répit est passée : on range. Les nouvelles bouclées restent ouvertes jusqu'au
// tampon ; celles qu'un décochage a rouvertes reprennent leur place et s'ouvrent.
export function apresRepit(etat, liste) {
  const maintenant = bouclees(liste);
  const nouvelles = [...maintenant].filter(id => !etat.bouclees.has(id));
  const rouvertes = [...etat.bouclees].filter(id => !maintenant.has(id));
  const sacBoucle = sacEstBoucle(liste);
  const enBas = new Set([...etat.enBas].filter(id => maintenant.has(id)));
  return {
    etat: {
      ...etat,
      ordre: ordres(liste),
      bouclees: maintenant,
      ouvertes: new Set([...etat.ouvertes, ...rouvertes]),
      enBas,
      masques: masquesPour(liste, etat.filtre),
      sacBoucle,
    },
    nouvelles,
    sacVientDeBoucler: sacBoucle && !etat.sacBoucle,
  };
}

// Une seconde après le tampon : on replie les nouvelles encore bouclées (une décochée entre-temps
// reste ouverte) et, si l'une était la catégorie choisie, la sélection passe à la suivante.
export function apresTampon(etat, nouvelles, liste) {
  // On juge sur les pièces de maintenant : une décochée entre le répit et le tampon n'est plus bouclée.
  const encoreBouclee = id => estBouclee(liste.find(c => c.categorie.id === id)?.objets ?? []);
  const aReplier = nouvelles.filter(encoreBouclee);
  const replie = {
    ...etat,
    ouvertes: new Set([...etat.ouvertes].filter(id => !aReplier.includes(id))),
    enBas: etat.filtre ? new Set([...etat.enBas, ...aReplier]) : new Set(etat.enBas),
  };
  if (!aReplier.includes(etat.choisie)) return replie;
  // La suivante se cherche dans l'ordre affiché, une fois les bouclées descendues.
  const affichees = categoriesAffichees(replie, liste).map(c => c.categorie.id);
  return { ...replie, choisie: categorieSuivante(affichees, etat.choisie, encoreBouclee) ?? etat.choisie };
}

export function basculerFiltre(etat, liste) {
  const filtre = !etat.filtre;
  return {
    ...etat,
    filtre,
    masques: masquesPour(liste, filtre),
    enBas: enBasPour(etat.bouclees, filtre),
  };
}

// Accordéon : en une colonne, chaque catégorie s'ouvre et se replie à la main.
export function basculerCategorie(etat, categorieId) {
  const ouvertes = new Set(etat.ouvertes);
  if (!ouvertes.delete(categorieId)) ouvertes.add(categorieId);
  return { ...etat, ouvertes };
}

export const choisirCategorie = (etat, categorieId) => ({ ...etat, choisie: categorieId });

// Un objet rendu par « Annuler » (retrait du voyage) : il prend aussitôt sa place dans sa catégorie, sans
// attendre de répit (aucun appui ne l'a déplacé sous le doigt), et se masque sous le filtre s'il est
// complet ; sa catégorie est choisie et dépliée pour qu'on le voie, et comptée bouclée ou non selon ses
// pièces de maintenant (rendue complète, elle ne recevra pas de tampon à la coche suivante, ailleurs).
// Le reste de la liste ne bouge pas.
export function rendreObjet(etat, liste, { categorieId, objetId }) {
  const objets = liste.find(c => c.categorie.id === categorieId)?.objets ?? [];
  const objet = objets.find(o => o.id === objetId);
  // Les autres gardent leur ordre figé ; lui se glisse devant le premier qui le suit dans l'ordre voulu.
  const voulu = ordreDansLeSac(objets).map(o => o.id);
  const suivants = voulu.slice(voulu.indexOf(objetId) + 1);
  const figes = (etat.ordre.get(categorieId) ?? []).filter(id => id !== objetId && voulu.includes(id));
  const rang = figes.findIndex(id => suivants.includes(id));
  figes.splice(rang < 0 ? figes.length : rang, 0, objetId);
  const masques = new Set(etat.masques);
  if (etat.filtre && objet && estComplet(objet)) masques.add(objetId);
  const bouclee = new Set(etat.bouclees);
  if (estBouclee(objets)) bouclee.add(categorieId);
  else bouclee.delete(categorieId);
  return {
    ...etat,
    ordre: new Map(etat.ordre).set(categorieId, figes),
    masques,
    bouclees: bouclee,
    choisie: categorieId,
    ouvertes: new Set([...etat.ouvertes, categorieId]),
  };
}

// Ce que l'écran dessine : les catégories dans l'ordre de la bibliothèque (celles du fond à la
// fin), chacune avec ses objets dans l'ordre figé, les pièces à jour, sans les masqués.
export function categoriesAffichees(etat, liste) {
  const rangees = liste.map(({ categorie, objets }) => {
    const parId = new Map(objets.map(o => [o.id, o]));
    const figes = etat.ordre.get(categorie.id) ?? [];
    // Un objet apparu depuis le dernier rangement s'ajoute en queue plutôt que de disparaître.
    const ids = [...figes.filter(id => parId.has(id)), ...objets.map(o => o.id).filter(id => !figes.includes(id))];
    return {
      categorie,
      objets: ids.filter(id => !etat.masques.has(id)).map(id => parId.get(id)),
    };
  });
  const enHaut = rangees.filter(c => !etat.enBas.has(c.categorie.id));
  return [...enHaut, ...rangees.filter(c => etat.enBas.has(c.categorie.id))];
}
