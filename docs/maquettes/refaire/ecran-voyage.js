// L'écran d'un voyage : le vrai dessin (src/ecrans/voyage-vues.js), plus ce que la phase 11 apporte. Les
// actions sur le voyage entier — « Modifier ce voyage » (phase 10), « Refaire ce voyage », « Supprimer
// ce voyage » — sont rares : elles se rangent dans le menu « ⋮ » posé au bout du titre, le même que sur
// les cartes de Mes voyages, et laissent la place aux catégories et aux objets (demande du chef de
// projet, 2026-10-30, qui remplace le bouton « Modifier le voyage » de l'en-tête et le bouton rouge du bas).
import { listeParCategorie } from '../../../src/modele/voyage.js';
import { GRAND_FORMAT, TROIS_COLONNES } from '../../../src/ecrans/disposition.js';
import { etatInitial } from '../../../src/ecrans/rangement.js';
import { vueVoyage } from '../../../src/ecrans/voyage-vues.js';
import { brancherMenu, vueMenu } from './menu-carte.js';

export const grandFormat = matchMedia(GRAND_FORMAT);
export const troisColonnes = matchMedia(TROIS_COLONNES);

// vu : { ouvertes, choisie } l'état d'affichage, gardé d'un dessin à l'autre ; surChoix(cle) : une
// ligne du menu touchée (modifier, refaire, supprimer).
export function dessinerVoyage(app, contexte, contenu, vu, surChoix) {
  const liste = listeParCategorie(contenu);
  const etat = etatInitial(liste, { filtre: false });
  vu.ouvertes ??= etat.ouvertes;
  vu.choisie ??= etat.choisie;
  const { classe, colonnes, html } = vueVoyage(contexte, {
    contenu,
    liste,
    etat: { ...etat, ouvertes: vu.ouvertes, choisie: vu.choisie },
    poses: { tampons: new Set(), bandeau: false },
    recent: null,
    grandFormat: grandFormat.matches,
    troisColonnes: troisColonnes.matches,
  });
  app.innerHTML = `<main class="${classe}"${colonnes ? ` data-colonnes="${colonnes}"` : ''}>${html}</main>`;
  // Le bouton « Modifier le voyage » de l'en-tête part dans le menu.
  app.querySelector('.voyage-modifier')?.remove();
  // Le titre et son menu sur une même ligne : le « ⋮ » au bout, en haut, même si le nom tient sur deux lignes.
  const titre = app.querySelector('main h1');
  titre.insertAdjacentHTML('beforebegin', '<div class="voyage-titre"></div>');
  const ligne = titre.previousElementSibling;
  ligne.append(titre);
  ligne.insertAdjacentHTML('beforeend', vueMenu(contenu.voyage, ['modifier', 'refaire', 'supprimer'], '-voyage'));
  brancherMenu(ligne, surChoix);
}
