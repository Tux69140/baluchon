// Fenêtre modale (src/styles/fenetre.css) : un <dialog> ouvert par showModal(), qui garde le focus en
// lui, rend inerte l'écran derrière et répond à Échap. Ce module y ajoute le reste : un en-tête avec
// son titre et son « × », la fermeture par tout bouton [data-fermer], et l'animation de fermeture
// avant de rendre la main. Par défaut, un appui sur le voile ne ferme rien : un geste accidentel
// perdrait la saisie (décision du contrôleur, 2026-10-07). Partagé par les écrans qui s'ouvrent
// par-dessus un autre (Nouveau voyage, décision du chef de projet, 2026-10-07 ; fiche d'un objet).
import { echapper } from './html.js';
import { iconeInterface } from './icones.js';

// Le titre peut recevoir le focus (sans être atteint par Tab) : à l'ouverture au doigt, c'est lui qui
// le prend, plutôt qu'un champ qui ferait surgir le clavier. croix : le « × » de fermeture, absent
// d'une confirmation, où « Annuler » dit déjà la même chose (maquette du 2026-10-24).
export const vueFenetre = ({ t, idTitre, titre, contenu, croix = true }) => `
    <dialog class="fenetre" aria-labelledby="${idTitre}">
      <header class="fenetre-entete">
        <h2 id="${idTitre}" tabindex="-1">${titre}</h2>${
          croix
            ? `
        <button type="button" class="bouton-icone bouton-fermer" data-fermer aria-label="${t('fenetre.fermer')}">${iconeInterface('fermer')}</button>`
            : ''
        }
      </header>${contenu}
    </dialog>`;

// Glissé de plus de 80 px vers le bas : la fenêtre se ferme ; en deçà, elle revient à sa place.
const SEUIL_GLISSE = 80;

// Un appui sur le voile, pas dans la fenêtre : le clic vise la fenêtre elle-même (son voile en fait
// partie), en dehors de son cadre.
function surLeVoile(fenetre, evenement) {
  if (evenement.target !== fenetre) return false;
  const r = fenetre.getBoundingClientRect();
  const { clientX: x, clientY: y } = evenement;
  return x < r.left || x > r.right || y < r.top || y > r.bottom;
}

// La fenêtre suit le doigt (ou la souris) posé sur son en-tête, vers le bas seulement. Le décalage
// passe par « translate », qui s'ajoute à l'animation de fermeture (« transform ») : lâchée au-delà
// du seuil, la fenêtre continue de descendre depuis là où on l'a laissée. Un appui sur un bouton de
// l'en-tête (« × ») reste un appui : la capture du pointeur lui volerait son clic.
function glisserPourFermer(fenetre, fermer) {
  const entete = fenetre.querySelector('.fenetre-entete');
  let depart = null;
  entete.addEventListener('pointerdown', evenement => {
    if (!evenement.isPrimary || evenement.button !== 0 || evenement.target.closest('button')) return;
    depart = evenement.clientY;
    entete.setPointerCapture(evenement.pointerId);
    fenetre.dataset.glisse = '';
  });
  entete.addEventListener('pointermove', evenement => {
    if (depart !== null) fenetre.style.translate = `0 ${Math.max(0, evenement.clientY - depart)}px`;
  });
  const lacher = evenement => {
    if (depart === null) return;
    const ecart = evenement.type === 'pointerup' ? evenement.clientY - depart : 0;
    depart = null;
    delete fenetre.dataset.glisse;
    if (ecart > SEUIL_GLISSE) fermer();
    else fenetre.style.translate = '';
  };
  entete.addEventListener('pointerup', lacher);
  entete.addEventListener('pointercancel', lacher);
}

// surFermeture est appelé une seule fois, la fenêtre effacée : appuis répétés, Échap pendant
// l'animation ou fermeture par le navigateur n'en font pas une seconde. fermerSurVoile : une fenêtre
// sans saisie à perdre (fiche d'un objet) se ferme aussi d'un appui sur le voile ou d'un glissé de
// son en-tête vers le bas.
export function ouvrirFenetre(fenetre, { surFermeture, fermerSurVoile = false }) {
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

  fenetre.addEventListener('click', evenement => {
    if (evenement.target.closest('[data-fermer]') || (fermerSurVoile && surLeVoile(fenetre, evenement))) fermer();
  });
  if (fermerSurVoile) glisserPourFermer(fenetre, fermer);
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

// Avant un geste qui défait quelque chose (vider un objet du sac) : une fenêtre d'alerte avec
// « Annuler » et le bouton de l'action. La promesse rend true si l'action est choisie, false pour
// « Annuler » ou Échap, une fois la fenêtre effacée : l'écran derrière reprend alors la main.
// Le focus va d'abord à « Annuler », le geste sans perte. signal (AbortSignal) : l'écran qui a posé
// la question s'en va ; la fenêtre disparaît aussitôt et la réponse est non (sinon elle resterait
// par-dessus l'écran suivant, posée dans document.body).
export function confirmer({ t, titre, texte, action, signal }) {
  const gabarit = document.createElement('template');
  gabarit.innerHTML = vueFenetre({
    t,
    idTitre: 'titre-confirmation',
    titre: echapper(titre),
    croix: false,
    contenu: `
      <p id="texte-confirmation">${echapper(texte)}</p>
      <div class="fenetre-pied">
        <button type="button" class="bouton bouton-secondaire" data-fermer autofocus>${t('fenetre.annuler')}</button>
        <button type="button" class="bouton bouton-principal" data-fermer data-confirmer>${echapper(action)}</button>
      </div>`,
  });
  const fenetre = gabarit.content.firstElementChild;
  fenetre.classList.add('confirmation');
  fenetre.setAttribute('role', 'alertdialog');
  fenetre.setAttribute('aria-describedby', 'texte-confirmation');
  document.body.append(fenetre);
  return new Promise(resoudre => {
    let choisie = false;
    const retirer = () => {
      fenetre.remove();
      resoudre(choisie);
    };
    fenetre.querySelector('[data-confirmer]').addEventListener('click', () => (choisie = true));
    ouvrirFenetre(fenetre, { surFermeture: retirer });
    signal?.addEventListener('abort', retirer, { once: true });
    if (signal?.aborted) retirer();
  });
}
