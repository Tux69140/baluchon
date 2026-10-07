// Fenêtre modale (src/styles/fenetre.css) : un <dialog> ouvert par showModal(), qui garde le focus en
// lui, rend inerte l'écran derrière et répond à Échap. Ce module y ajoute le reste : un en-tête avec
// son titre et son « × », la fermeture par tout bouton [data-fermer] et par un appui sur le voile,
// et l'animation de fermeture avant de rendre la main. Partagé par les écrans qui s'ouvrent
// par-dessus un autre (Nouveau voyage, décision du chef de projet, 2026-10-07).
import { iconeInterface } from './icones.js';

export const vueFenetre = ({ t, idTitre, titre }) => `
    <dialog class="fenetre" aria-labelledby="${idTitre}">
      <header class="fenetre-entete">
        <h2 id="${idTitre}">${titre}</h2>
        <button type="button" class="bouton-icone bouton-fermer" data-fermer aria-label="${t('fenetre.fermer')}">${iconeInterface('fermer')}</button>
      </header>
    </dialog>`;

// Un appui sur le voile atteint la fenêtre elle-même, hors de sa boîte.
function surLeVoile(fenetre, { target, clientX: x, clientY: y }) {
  const r = fenetre.getBoundingClientRect();
  return target === fenetre && (x < r.left || x > r.right || y < r.top || y > r.bottom);
}

// surFermeture est appelé une seule fois, la fenêtre effacée : appuis répétés, Échap pendant
// l'animation ou fermeture par le navigateur n'en font pas une seconde.
export function ouvrirFenetre(fenetre, { surFermeture }) {
  let fermeture = false;
  async function fermer() {
    if (fermeture) return;
    fermeture = true;
    fenetre.dataset.fermeture = '';
    // Aucune animation si l'appareil en demande moins : la liste est vide, on ferme aussitôt.
    await Promise.allSettled(fenetre.getAnimations({ subtree: true }).map(a => a.finished));
    if (fenetre.open) fenetre.close();
    surFermeture();
  }

  // Un appui commencé dans la fenêtre et relâché sur le voile (texte sélectionné à la souris) ne la
  // ferme pas : il faut que l'appui commence aussi sur le voile.
  let appuiSurLeVoile = false;
  fenetre.addEventListener('pointerdown', evenement => (appuiSurLeVoile = surLeVoile(fenetre, evenement)));
  fenetre.addEventListener('click', evenement => {
    if (evenement.target.closest('[data-fermer]') || (appuiSurLeVoile && surLeVoile(fenetre, evenement))) fermer();
  });
  // Échap : on ferme nous-mêmes, pour animer. Sans geste préalable de la personne, le navigateur
  // ferme la fenêtre sans attendre (événement close) : on suit. Une fenêtre retirée de la page avec
  // l'écran qu'elle couvrait (voyage créé, format changé) n'est pas une fermeture.
  fenetre.addEventListener('cancel', evenement => {
    evenement.preventDefault();
    fermer();
  });
  fenetre.addEventListener('close', () => fenetre.isConnected && fermer());
  fenetre.showModal();
}
