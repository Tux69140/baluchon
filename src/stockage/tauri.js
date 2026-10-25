// Le stockage de l’appli : chaque fonction de creerStockageTauri relaie une commande de src-tauri/src/lib.rs ;
// plus bas, la touche retour d’Android (ecouterRetourTauri).
import { exit, onBackButtonPress } from '@tauri-apps/api/app';
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

// Un gestionnaire inscrit, Tauri ne recule ni ne ferme plus de lui-même à l'appui sur la touche retour
// (@tauri-apps/api/app, depuis 2.9) : gerer() décide, et l'appli se ferme quand il rend false.
// Sur l'ordinateur (Debian), la touche n'existe pas : Tauri refuse l'inscription, c'est attendu. Sur
// Android, un refus rendrait la touche à la WebView (étapes sautées) : on le signale. La plateforme se
// lit dans l'identité du moteur de pages (« Android »), sans greffon de plus.
export function ecouterRetourTauri(gerer) {
  return onBackButtonPress(() => {
    // exit ne peut pas être refusé : la capacité de l'appli l'autorise (core:app:allow-exit,
    // src-tauri/capabilities/default.json). Un appui à l'accueil ferme donc toujours l'appli.
    if (!gerer()) exit().catch(console.error);
  }).catch(erreur => {
    if (/Android/i.test(navigator.userAgent)) console.warn('Touche retour non prise en charge :', erreur);
  });
}
