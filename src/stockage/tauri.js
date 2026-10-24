// Le stockage de l’appli : chaque fonction relaie une commande de src-tauri/src/lib.rs.
import { invoke } from '@tauri-apps/api/core';
import { lireFiltre, ecrireFiltre } from './preferences.js';

export function creerStockageTauri() {
  return Object.freeze({
    listerVoyages: () => invoke('lister_voyages'),
    bibliothequeInstallee: () => invoke('bibliotheque_installee'),
    installerBibliotheque: (bibliotheque, langue) => invoke('installer_bibliotheque', { bibliotheque, langue }),
    lireBibliotheque: () => invoke('lire_bibliotheque'),
    creerVoyage: contenu => invoke('creer_voyage', { contenu }),
    lireVoyage: id => invoke('lire_voyage', { id }),
    reglerDansLeSac: (id, dansLeSac, modifieLe) => invoke('regler_dans_le_sac', { id, dansLeSac, modifieLe }),
    etatsDesObjets: () => invoke('etats_des_objets'),
    lireFiltre,
    ecrireFiltre,
  });
}
