// La période d'un voyage : jours et nuits, durée maximale, et le choix des dates sur le calendrier
// unique (docs/superpowers/specs/2026-10-06-phase-2-design.md).
import { ajouterMois, ecartEnJours } from './dates.js';

// Du 10 au 13 : 4 jours, 3 nuits ; un aller-retour dans la journée : 1 jour, 0 nuit.
export function joursEtNuits(depart, retour) {
  const nuits = ecartEnJours(depart, retour);
  return { jours: nuits + 1, nuits };
}

// Un voyage dure au plus un an : retour au plus tard le même jour de l'année suivante (le 28 février
// pour un départ un 29 février).
export const dateLimite = depart => ajouterMois(depart, 12);

// Un appui sur le calendrier. Premier appui : le départ ; second : le retour. Un jour antérieur au
// départ en devient le nouveau départ (choix A du chef de projet, 2026-10-06) ; une fois les deux
// fixés, un appui recommence la sélection. Un jour au-delà d'un an ne change rien.
export function choisirJour({ depart, retour }, jour) {
  if (!depart || retour || jour < depart) return { depart: jour, retour: null };
  if (jour > dateLimite(depart)) return { depart, retour: null };
  return { depart, retour: jour };
}

// Ce que le calendrier montre d'un jour : bornes, période grisée, jours trop lointains.
export function etatDuJour({ depart, retour }, jour) {
  return {
    depart: jour === depart,
    retour: jour === retour,
    entre: Boolean(depart && retour) && jour > depart && jour < retour,
    horsLimite: Boolean(depart) && !retour && jour > dateLimite(depart),
  };
}
