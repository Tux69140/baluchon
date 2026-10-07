// Variante navigateur du stockage, pour les tests d'écran : même forme que le stockage Tauri, données
// rangées dans le navigateur sous une seule clé. Un test y dépose son état de départ avant le
// chargement de la page.
const CLE = 'baluchon-essai';

function lire() {
  try {
    return JSON.parse(localStorage.getItem(CLE)) ?? {};
  } catch {
    return {};
  }
}

export function creerStockageNavigateur() {
  return Object.freeze({
    listerVoyages: async () => lire().voyages ?? [],
  });
}
