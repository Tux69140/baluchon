// Message d'une écriture refusée, en haut de l'écran (maquette validée le 2026-10-25,
// docs/maquettes/bibliotheque/) : un élément « popover » manuel, posé dans la couche du dessus, reste
// visible par-dessus une fiche ouverte sans couvrir ses boutons ni rien pousser. Partagé par la
// Bibliothèque et ses fiches. Il s'efface seul au bout de DUREE_ALERTE ; un nouveau message remplace
// l'ancien.
import { echapper } from './html.js';
import { iconeInterface } from './icones.js';

// Le temps de lecture d'un message d'écriture refusée, en haut ou en bas de l'écran (écran d'un voyage,
// assistant « Nouveau voyage », Bibliothèque).
export const DUREE_ALERTE = 6000;

// app : la racine de l'appli. La fenêtre modale du dessus (qui n'est pas en train de se fermer)
// accueille le message, sinon il serait inerte derrière elle et ne serait pas lu ; elle peut être hors
// de app (une question est posée dans document.body), d'où la recherche dans toute la page. signal :
// la fin de l'écran, qui retire le message et sa minuterie.
export function alerterEnHaut(app, texte, signal) {
  for (const ancienne of document.querySelectorAll('.alerte-haut')) ancienne.remove();
  const hote = [...document.querySelectorAll('dialog:modal:not([data-fermeture])')].at(-1) ?? app;
  const alerte = document.createElement('div');
  alerte.className = 'message message-erreur alerte-haut';
  alerte.setAttribute('popover', 'manual');
  alerte.setAttribute('role', 'alert');
  alerte.innerHTML = `${iconeInterface('erreur')}<p>${echapper(texte)}</p>`;
  hote.append(alerte);
  alerte.showPopover();
  const minuterie = setTimeout(() => alerte.remove(), DUREE_ALERTE);
  signal.addEventListener(
    'abort',
    () => {
      clearTimeout(minuterie);
      alerte.remove();
    },
    { once: true },
  );
}
