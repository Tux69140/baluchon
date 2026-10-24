// Préférences de l’appareil, hors base et hors sauvegarde : pour l’instant le filtre « Reste à
// emballer », retenu voyage par voyage. Défini ici une seule fois, les deux variantes du stockage
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
