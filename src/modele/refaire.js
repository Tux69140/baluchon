// « Refaire ce voyage » (docs/PLAN.md, phase 11) : un voyage neuf construit sur la bibliothèque
// actuelle, qui reprend du voyage d'origine ses voyageurs et ses étiquettes, ses objets ajoutés à la
// main, ses quantités fixées, ses objets écartés et les noms qu'on y avait donnés. Décisions 1 à 7 et 12
// du chef de projet ; docs/superpowers/specs/2026-10-30-phase-11-refaire-supprimer-design.md. Règles
// pures : le voyage d'origine n'est jamais touché, et genererVoyage (src/modele/voyage.js) reste la
// seule à copier.
import { choisiesDuVoyage } from './changements.js';
import { genererApercu, parOrdre } from './inclusion.js';
import { estRetire } from './sac.js';

// Ce que le voyage d'origine contient encore : un objet retiré qui attend la sortie de ses pièces n'en
// fait plus partie (ni repris, ni signalé, ni « fixé manuellement : 0 »).
const restants = origine => origine.objets.filter(objet => !estRetire(objet));

// Les objets de la bibliothèque écartés ou retirés dans le voyage d'origine ; aucun pour un voyage créé
// avant la phase 11 (décision 3).
const ecartesDe = origine => new Set(origine.ecartes ?? []);

const lignesParNom = (a, b) => a.objet.nom.localeCompare(b.objet.nom);

// Les étiquettes présélectionnées (celles de la bibliothèque d'où viennent celles du voyage), les objets
// écartés d'entrée, et ce qui a disparu de la bibliothèque depuis : les étiquettes, et les objets venus
// d'un modèle supprimé, dans l'ordre du voyage (catégories dans l'ordre, puis par nom). Une étiquette
// renommée depuis est reprise sous son nouveau nom : elle n'a pas disparu.
export function repriseDe(origine, bibliotheque) {
  const choisies = choisiesDuVoyage(bibliotheque, origine.etiquettes);
  const modeles = new Set(bibliotheque.objets.map(modele => modele.id));
  const rang = new Map(origine.categories.map(c => [c.id, c.ordre]));
  const objets = restants(origine)
    .filter(objet => objet.modeleId && !modeles.has(objet.modeleId))
    .sort((a, b) => rang.get(a.categorieId) - rang.get(b.categorieId) || a.nom.localeCompare(b.nom))
    .map(objet => objet.nom);
  const etiquettes = [...origine.etiquettes]
    .sort(parOrdre)
    .filter(e => !choisies.has(e.modeleId))
    .map(e => e.nom);
  return { choisies, ecartes: ecartesDe(origine), disparues: { etiquettes, objets } };
}

// L'aperçu du voyage refait, à la forme de genererApercu : la bibliothèque actuelle, sous les noms donnés
// dans le voyage d'origine (décision 12), avec ses quantités fixées gardées sauf « Recalculer »
// (`recalculer` : les modèles concernés ; décision 4) ; puis les objets ajoutés à la main, avec leur
// quantité d'origine, dans la catégorie de l'aperçu issue du même modèle, sinon dans leur catégorie
// d'origine, en fin d'aperçu (marquée `origine`). Rend aussi de quoi dessiner les mentions : les ajouts,
// les objets « retirés » la dernière fois (décision 1 : seulement ceux que la bibliothèque propose), et
// les quantités fixées que le calcul ne retrouve pas.
export function apercuRefait(origine, bibliotheque, infos, choisies, recalculer) {
  const presents = restants(origine);
  const parModele = new Map(presents.filter(o => o.modeleId).map(o => [o.modeleId, o]));
  const manuelles = new Map();
  const reprendre = ({ objet: modele, quantite }) => {
    const avant = parModele.get(modele.id);
    if (!avant) return { objet: modele, quantite };
    const objet = { ...modele, nom: avant.nom };
    // Un calcul qui retrouve la quantité fixée : rien à choisir, rien à signaler.
    if (!avant.quantiteManuelle || avant.quantite === quantite) return { objet, quantite };
    manuelles.set(modele.id, { gardee: avant.quantite, calcul: quantite });
    return recalculer.has(modele.id) ? { objet, quantite } : { objet, quantite: avant.quantite, manuelle: true };
  };
  const apercu = genererApercu(bibliotheque, infos, choisies).map(({ categorie, objets }) => ({
    categorie,
    objets: objets.map(reprendre),
  }));

  const categories = new Map(origine.categories.map(c => [c.id, c]));
  const venues = [];
  for (const objet of presents.filter(o => !o.modeleId)) {
    const sienne = categories.get(objet.categorieId);
    let groupe = apercu.find(g => g.categorie.id === sienne.modeleId) ?? venues.find(g => g.categorie.id === sienne.id);
    if (!groupe) {
      groupe = { categorie: sienne, objets: [], origine: true };
      venues.push(groupe);
    }
    groupe.objets.push({ objet, quantite: objet.quantite, ajout: true });
  }
  const groupes = [...apercu, ...venues.sort((a, b) => parOrdre(a.categorie, b.categorie))];
  // Par nom, celui du voyage d'origine compris.
  for (const groupe of groupes) groupe.objets.sort(lignesParNom);

  const lignes = groupes.flatMap(g => g.objets);
  const ecartes = ecartesDe(origine);
  return {
    apercu: groupes,
    ajouts: new Set(lignes.filter(l => l.ajout).map(l => l.objet.id)),
    retires: new Set(lignes.filter(l => !l.ajout && ecartes.has(l.objet.id)).map(l => l.objet.id)),
    manuelles,
  };
}
