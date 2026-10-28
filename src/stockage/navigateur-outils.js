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
