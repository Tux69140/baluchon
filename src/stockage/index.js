// Porte d'entrée de la couche de stockage : les écrans n'en connaissent que ceci. Dans l'appli,
// le stockage est la base SQLite (par Tauri) ; dans un simple navigateur — tests d'écran —, une
// variante en mémoire du navigateur, de même forme.
const dansTauri = () => typeof window.__TAURI_INTERNALS__?.invoke === 'function';

export async function ouvrirStockage() {
  if (dansTauri()) {
    const { creerStockageTauri } = await import('./tauri.js');
    return creerStockageTauri();
  }
  const { creerStockageNavigateur } = await import('./navigateur.js');
  return creerStockageNavigateur();
}

// La touche retour d'Android, seul passage de la page vers l'appareil hors des données. gerer() est
// appelé à chaque appui : il rend true s'il a pris l'appui en charge (recul dans la page), false pour
// quitter l'appli (mise en arrière-plan). Sur Android, par Tauri ; ailleurs (Debian, navigateur), il n'y a pas de touche.
export async function ecouterRetourSysteme(gerer) {
  if (dansTauri()) {
    const { ecouterRetourTauri } = await import('./tauri.js');
    return ecouterRetourTauri(gerer);
  }
  const { ecouterRetourNavigateur } = await import('./navigateur.js');
  return ecouterRetourNavigateur(gerer);
}
