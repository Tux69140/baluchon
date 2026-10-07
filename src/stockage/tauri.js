// Le stockage de l’appli : chaque fonction relaie une commande de src-tauri/src/lib.rs.
import { invoke } from '@tauri-apps/api/core';

export function creerStockageTauri() {
  return Object.freeze({
    listerVoyages: () => invoke('lister_voyages'),
    bibliothequeInstallee: () => invoke('bibliotheque_installee'),
    installerBibliotheque: (bibliotheque, langue) => invoke('installer_bibliotheque', { bibliotheque, langue }),
    lireBibliotheque: () => invoke('lire_bibliotheque'),
    creerVoyage: contenu => invoke('creer_voyage', { contenu }),
    lireVoyage: id => invoke('lire_voyage', { id }),
  });
}
