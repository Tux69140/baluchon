// Porte d'entrée de la couche de stockage : les écrans n'en connaissent que ceci. Dans l'appli,
// le stockage est la base SQLite (par Tauri) ; dans un simple navigateur — tests d'écran —, une
// variante en mémoire du navigateur, de même forme.
export async function ouvrirStockage() {
  if (typeof window.__TAURI_INTERNALS__?.invoke === 'function') {
    const { creerStockageTauri } = await import('./tauri.js');
    return creerStockageTauri();
  }
  const { creerStockageNavigateur } = await import('./navigateur.js');
  return creerStockageNavigateur();
}
