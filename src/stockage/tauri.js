// Le stockage de l’appli : chaque fonction de creerStockageTauri relaie une commande de src-tauri/src/lib.rs ;
// plus bas, la touche retour d’Android (ecouterRetourTauri, sortirDeLAppli).
import { exit, onBackButtonPress } from '@tauri-apps/api/app';
import { invoke } from '@tauri-apps/api/core';
import { lireFiltre, ecrireFiltre } from './preferences.js';

export function creerStockageTauri() {
  return Object.freeze({
    listerVoyages: () => invoke('lister_voyages'),
    bibliothequeInstallee: () => invoke('bibliotheque_installee'),
    installerBibliotheque: (bibliotheque, langue) => invoke('installer_bibliotheque', { bibliotheque, langue }),
    lireBibliotheque: () => invoke('lire_bibliotheque'),
    enregistrerCategorie: categorie => invoke('enregistrer_categorie', { categorie }),
    enregistrerObjet: objet => invoke('enregistrer_objet', { objet }),
    rangerCategories: (ids, modifieLe) => invoke('ranger_categories', { ids, modifieLe }),
    enregistrerGroupe: groupe => invoke('enregistrer_groupe', { groupe }),
    enregistrerEtiquette: etiquette => invoke('enregistrer_etiquette', { etiquette }),
    rangerGroupes: (ids, modifieLe) => invoke('ranger_groupes', { ids, modifieLe }),
    rangerEtiquettes: (groupeId, ids, modifieLe) => invoke('ranger_etiquettes', { groupeId, ids, modifieLe }),
    supprimerEtiquette: id => invoke('supprimer_etiquette', { id }),
    supprimerGroupe: id => invoke('supprimer_groupe', { id }),
    supprimerCategorie: id => invoke('supprimer_categorie', { id }),
    supprimerObjet: id => invoke('supprimer_objet', { id }),
    retablirBibliotheque: extrait => invoke('retablir_bibliotheque', { extrait }),
    creerVoyage: contenu => invoke('creer_voyage', { contenu }),
    lireVoyage: id => invoke('lire_voyage', { id }),
    reglerDansLeSac: (id, dansLeSac, achetes, modifieLe) =>
      invoke('regler_dans_le_sac', { id, dansLeSac, achetes, modifieLe }),
    reglerAchats: (id, aAcheter, achetes, modifieLe) => invoke('regler_achats', { id, aAcheter, achetes, modifieLe }),
    etatsDesObjets: () => invoke('etats_des_objets'),
    ajouterAuVoyage: ajout => invoke('ajouter_au_voyage', { ajout }),
    retablirDansLeVoyage: ajout => invoke('retablir_dans_le_voyage', { ajout }),
    reglerQuantite: (id, quantite, dansLeSac, achetes, modifieLe) =>
      invoke('regler_quantite', { id, quantite, dansLeSac, achetes, modifieLe }),
    renommerObjetDuVoyage: (id, nom, modifieLe) => invoke('renommer_objet_du_voyage', { id, nom, modifieLe }),
    retirerDuVoyage: id => invoke('retirer_du_voyage', { id }),
    ajouterALaBibliotheque: ajout => invoke('ajouter_a_la_bibliotheque', { ajout }),
    lireFiltre,
    ecrireFiltre,
  });
}

// Un gestionnaire inscrit, Tauri ne recule ni ne ferme plus de lui-même à l'appui sur la touche retour
// (@tauri-apps/api/app, depuis 2.9) : gerer() décide, et l'appli se quitte quand il rend false.
// Sur l'ordinateur (Debian), la touche n'existe pas : Tauri refuse l'inscription, c'est attendu. Sur
// Android, un refus rendrait la touche à la WebView (étapes sautées) : on le signale. La plateforme se
// lit dans l'identité du moteur de pages (« Android »), sans greffon de plus.
export function ecouterRetourTauri(gerer) {
  return onBackButtonPress(() => {
    if (!gerer()) sortirDeLAppli();
  }).catch(erreur => {
    if (/Android/i.test(navigator.userAgent)) console.warn('Touche retour non prise en charge :', erreur);
  });
}

// Quitter l'appli, c'est la mettre en arrière-plan, comme le fait Android depuis sa version 12 (décision
// du chef de projet, 2026-10-25) : elle se rouvre aussitôt, sur l'accueil. Notre activité en donne le
// moyen à la page (window.BaluchonAndroid, src-tauri/android/java). Sans lui, l'appli se ferme ; exit ne
// peut pas être refusé : la capacité de l'appli l'autorise (core:app:allow-exit,
// src-tauri/capabilities/default.json).
export function sortirDeLAppli(fenetre = window, fermer = exit) {
  if (fenetre.BaluchonAndroid) fenetre.BaluchonAndroid.mettreEnArrierePlan();
  else fermer().catch(console.error);
}
