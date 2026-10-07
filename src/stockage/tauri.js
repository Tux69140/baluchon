// Le stockage de l'appli : chaque fonction relaie une commande de src-tauri/src/lib.rs.
import { invoke } from '@tauri-apps/api/core';

export function creerStockageTauri() {
  return Object.freeze({
    listerVoyages: () => invoke('lister_voyages'),
  });
}
