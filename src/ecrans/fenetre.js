// Fenêtre modale (src/styles/fenetre.css) : un <dialog> ouvert par showModal(), qui garde le focus en
// lui, rend inerte l'écran derrière et répond à Échap. Ce module y ajoute le reste : un en-tête avec
// son titre et son « × », la fermeture par tout bouton [data-fermer], et l'animation de fermeture
// avant de rendre la main. Un appui sur le voile ne ferme rien : un geste accidentel perdrait la
// saisie (décision du contrôleur, 2026-10-07). Partagé par les écrans qui s'ouvrent par-dessus un
// autre (Nouveau voyage, décision du chef de projet, 2026-10-07).
import { iconeInterface } from './icones.js';

// Le titre peut recevoir le focus (sans être atteint par Tab) : à l'ouverture au doigt, c'est lui qui
// le prend, plutôt qu'un champ qui ferait surgir le clavier.
export const vueFenetre = ({ t, idTitre, titre, contenu }) => `
    <dialog class="fenetre" aria-labelledby="${idTitre}">
      <header class="fenetre-entete">
        <h2 id="${idTitre}" tabindex="-1">${titre}</h2>
        <button type="button" class="bouton-icone bouton-fermer" data-fermer aria-label="${t('fenetre.fermer')}">${iconeInterface('fermer')}</button>
      </header>${contenu}
    </dialog>`;

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

  fenetre.addEventListener('click', evenement => evenement.target.closest('[data-fermer]') && fermer());
  // Échap : on ferme nous-mêmes, pour animer. Sans geste préalable de la personne, le navigateur
  // ferme la fenêtre sans attendre (événement close) : on suit. Une fenêtre retirée de la page avec
  // l'écran qu'elle couvrait (voyage créé) n'est pas une fermeture.
  fenetre.addEventListener('cancel', evenement => {
    evenement.preventDefault();
    fermer();
  });
  fenetre.addEventListener('close', () => fenetre.isConnected && fermer());
  fenetre.showModal();
}
