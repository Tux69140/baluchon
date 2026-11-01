// Préférences de l’appareil, hors base et hors sauvegarde : pour l’instant le filtre « Reste à
// emballer » (retenu voyage par voyage), le thème choisi et la date de la dernière sauvegarde. Défini ici une seule fois, les deux variantes du stockage
// le reprennent. Un navigateur qui refuse l’accès est un filtre éteint : l’écran bascule quand même.
const CLE_FILTRE = 'baluchon-filtre-reste';

function lireFiltres() {
  try {
    return JSON.parse(localStorage.getItem(CLE_FILTRE)) ?? {};
  } catch {
    return {};
  }
}

export const lireFiltre = voyageId => lireFiltres()[voyageId] === true;

export function ecrireFiltre(voyageId, actif) {
  try {
    const filtres = { ...lireFiltres() };
    if (actif) filtres[voyageId] = true;
    else delete filtres[voyageId];
    localStorage.setItem(CLE_FILTRE, JSON.stringify(filtres));
  } catch {
    // Écriture impossible : le filtre ne sera pas retenu, sans gêner l’usage en cours.
  }
}

// Le thème : « appareil » (défaut, et toute valeur inconnue), « clair » ou « sombre ».
const CLE_THEME = 'baluchon-theme';
const THEMES = ['appareil', 'clair', 'sombre'];

export function lireTheme() {
  try {
    const choix = localStorage.getItem(CLE_THEME);
    return THEMES.includes(choix) ? choix : 'appareil';
  } catch {
    return 'appareil';
  }
}

export function ecrireTheme(choix) {
  if (!THEMES.includes(choix)) return;
  try {
    localStorage.setItem(CLE_THEME, choix);
  } catch {
    // Écriture impossible : le choix ne sera pas retenu pour le prochain lancement.
  }
}

// La date (ISO) de la dernière sauvegarde réussie, ou null.
const CLE_SAUVEGARDE = 'baluchon-derniere-sauvegarde';

export function lireDerniereSauvegarde() {
  try {
    return localStorage.getItem(CLE_SAUVEGARDE) || null;
  } catch {
    return null;
  }
}

export function ecrireDerniereSauvegarde(iso) {
  try {
    localStorage.setItem(CLE_SAUVEGARDE, iso);
  } catch {
    // Écriture impossible : la date ne sera pas montrée, la sauvegarde, elle, a eu lieu.
  }
}
