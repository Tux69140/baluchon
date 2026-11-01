// Les outils communs des deux fichiers de la variante navigateur du stockage (navigateur.js et
// navigateur-voyages.js) : lecture et écriture de l'état unique, pannes et lenteurs simulées.
const CLE = 'baluchon-essai';

export function lire() {
  try {
    return JSON.parse(localStorage.getItem(CLE)) ?? {};
  } catch {
    return {};
  }
}

export const ecrire = donnees => localStorage.setItem(CLE, JSON.stringify(donnees));

// Une panne simulée fait échouer l’opération nommée, comme une base illisible ou pleine.
export function panne(donnees, operation) {
  if (donnees.pannes?.includes(operation)) throw new Error(`Panne simulée : ${operation}`);
}

// Un refus simulé : l'appareil refuse l'autorisation que l'opération demande (écrire dans Téléchargements,
// Android 7 à 9). Même mécanisme que les pannes : une marque « refus » dans les données du navigateur.
export const refusee = (donnees, operation) => Boolean(donnees.refus?.includes(operation));

// Une opération lente reste en attente jusqu'à ce que le test la libère : de quoi toucher l'écran pendant
// l'enregistrement, sans pause fixe.
export async function lenteur(donnees, operation) {
  if (!donnees.lenteurs?.includes(operation)) return;
  await new Promise(debloquer => {
    window.debloquerStockage = debloquer;
  });
}

// Les écritures de la bibliothèque calculent le résultat entier avant d'écrire : refusées, elles ne
// laissent rien. Mêmes refus que la base (src-tauri/src/edition.rs).
export function bibliothequeDe(donnees) {
  return donnees.bibliotheque ?? { groupes: [], etiquettes: [], categories: [], objets: [] };
}

export function verifierEtiquettes(bibliotheque, ids) {
  const inconnue = ids.find(id => !bibliotheque.etiquettes.some(e => e.id === id));
  if (inconnue) throw new Error(`Étiquette inconnue : ${inconnue}`);
}

// Remplace l'élément de même id, ou l'ajoute à la fin ; `garder` liste les champs qu'une modification ne touche pas.
export function remplacerOuAjouter(liste, element, garder) {
  const existant = liste.find(x => x.id === element.id);
  if (!existant) return [...liste, element];
  const fusion = { ...element, ...Object.fromEntries(garder.map(champ => [champ, existant[champ]])) };
  return liste.map(x => (x === existant ? fusion : x));
}

// Comme la base : lenteur simulée, puis panne simulée, puis état relu au dernier moment (un autre appui a
// pu écrire pendant l'attente).
export async function ecritureDe(operation) {
  await lenteur(lire(), operation);
  const donnees = lire();
  panne(donnees, operation);
  return donnees;
}

// La mémoire des écartés d'un voyage (src-tauri/src/ajustements.rs) : un objet issu d'un modèle qui sort du
// voyage entre dans la liste, un objet qui y revient en sort ; un objet ajouté à la main (sans modèle) n'y
// entre jamais. Voir « Choix de l'agent », conception de la phase 11. Renvoient la nouvelle liste.
export function ecartesAvec(donnees, objet) {
  const liste = donnees.objetsEcartes ?? [];
  if (!objet.modeleId || liste.some(e => e.voyageId === objet.voyageId && e.modeleId === objet.modeleId)) return liste;
  return [...liste, { voyageId: objet.voyageId, modeleId: objet.modeleId }];
}

export const ecartesSans = (donnees, objet) =>
  (donnees.objetsEcartes ?? []).filter(e => !(e.voyageId === objet.voyageId && e.modeleId === objet.modeleId));

// Même refus que la base (src-tauri/src/courses.rs) : un nombre entier de pièces achetées, de 0 à la quantité.
export function verifierAchetes(achetes, quantite) {
  if (!Number.isInteger(achetes) || achetes < 0 || achetes > quantite)
    throw new Error('Les pièces achetées dépassent la quantité prévue.');
}

// Même borne que la base (verifier_sac, src-tauri/src/ajustements.rs) : de 0 à la quantité prévue, ou
// jusqu'à ce qui est déjà dans le sac quand des pièces de trop attendent leur sortie (phase 10).
export function verifierSac(objet, quantite, dansLeSac) {
  if (!Number.isInteger(dansLeSac) || dansLeSac < 0 || dansLeSac > Math.max(quantite, objet.dansLeSac))
    throw new Error(`Pièces dans le sac hors bornes : ${dansLeSac}`);
}

// La base relit par rang puis par ordre de création ; le tri est stable, comme ORDER BY ordre, rowid.
export const trierParOrdre = liste => [...liste].sort((a, b) => a.ordre - b.ordre);

// Un voyage complet tel que la base le relit (lire_voyage_de, src-tauri/src/voyages.rs), ou null.
export function voyageComplet(donnees, id) {
  const voyage = (donnees.voyages ?? []).find(v => v.id === id);
  if (!voyage) return null;
  return {
    voyage,
    // Un voyage enregistré avant les étiquettes n'a pas la clé : liste vide.
    etiquettes: (donnees.etiquettesDuVoyage ?? []).filter(e => e.voyageId === id),
    // Par rang, puis par création, comme la base : une catégorie rétablie retrouve sa place.
    categories: trierParOrdre((donnees.categoriesDuVoyage ?? []).filter(c => c.voyageId === id)),
    objets: (donnees.objetsDuVoyage ?? []).filter(o => o.voyageId === id),
    // Un voyage d'avant la phase 11 n'a pas la clé : liste vide.
    ecartes: (donnees.objetsEcartes ?? [])
      .filter(e => e.voyageId === id)
      .map(e => e.modeleId)
      .sort(),
  };
}
