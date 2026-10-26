// Le menu de l'appli (maquette validée le 2026-10-25, docs/maquettes/bibliotheque/) : un bouton en haut
// à gauche de l'accueil, de Réglages et de la Bibliothèque, qui ouvre un panneau depuis la gauche
// (src/styles/menu.css). L'écran d'un voyage et l'assistant n'en ont pas : leur lien de retour suffit.
import { ouvrirFenetre } from './fenetre.js';
import { iconeInterface } from './icones.js';
import { lienRetour } from './retour.js';
import mascotte from '../images/baluchon.svg';

// La barre du haut : le bouton du menu, puis, hors de l'accueil, le lien de retour (retour = { adresse,
// libelle }). Un lien vers Mes voyages remonte à l'accueil, un autre recule d'une étape (src/main.js).
export const barreHaut = ({ t }, { retour } = {}) => `
      <div class="barre-haut">
        <button type="button" class="bouton-icone bouton-menu" data-action="menu" aria-label="${t('menu.ouvrir')}" aria-haspopup="dialog">${iconeInterface('menu')}</button>${retour ? lienRetour(t, retour) : ''}
      </div>`;

const entrees = t => [
  { adresse: '#/voyages', icone: 'voyages', libelle: t('voyages.titre'), cle: 'voyages' },
  { adresse: '#/nouveau-voyage', icone: 'nouveau', libelle: t('voyages.nouveau'), cle: 'nouveau' },
  { adresse: '#/reglages', icone: 'reglages', libelle: t('menu.reglages'), cle: 'reglages' },
];

const vueMenu = (t, courant) => `
    <dialog class="tiroir" aria-labelledby="titre-menu">
      <header class="tiroir-tete">
        <img src="${mascotte}" alt="" width="40" height="40" />
        <h2 id="titre-menu" tabindex="-1">${t('appli.nom')}</h2>
        <button type="button" class="bouton-icone bouton-fermer" data-fermer aria-label="${t('menu.fermer')}">${iconeInterface('fermer')}</button>
      </header>
      <nav aria-label="${t('menu.ouvrir')}">
        <ul class="tiroir-liste">${entrees(t)
          .map(
            ({ adresse, icone, libelle, cle }) => `
          <li><a class="tiroir-lien" href="${adresse}"${cle === courant ? ' aria-current="page"' : ''}>${iconeInterface(icone)}${libelle}</a></li>`,
          )
          .join('')}
        </ul>
      </nav>
    </dialog>`;

// courant : l'entrée de l'écran ouvert, sur fond actif ('voyages', ou 'reglages' pour Réglages et la
// Bibliothèque). Le menu se ferme par ×, le voile, Échap ou le retour système (un niveau, comme une
// fiche). Une entrée ferme d'abord le menu et attend que son étape d'historique soit partie (sinon ce
// retrait reculerait sous l'écran suivant), puis : Mes voyages remonte à l'accueil ; Nouveau voyage et
// Réglages passent par l'accueil, pour que le retour système y ramène ensuite ; l'écran déjà ouvert
// ne fait que fermer le menu. Un retour survenu pendant la fermeture (touche d'Android, ou retour du
// navigateur) abandonne le choix : seul le retour compte, l'appli ne repart pas là où il l'a ôtée.
export function ouvrirMenu({ t, revenirAccueil, allerDepuisAccueil, appuisRetour }, { courant }) {
  const gabarit = document.createElement('template');
  gabarit.innerHTML = vueMenu(t, courant);
  const tiroir = gabarit.content.firstElementChild;
  // Dans l'écran, pas dans document.body : il part avec lui, et les vérifications de l'écran le voient.
  document.querySelector('#app').append(tiroir);
  const fermer = ouvrirFenetre(tiroir, {
    fermerSurVoile: true,
    fermerAuRetour: true,
    surFermeture: () => tiroir.remove(),
  });
  // Un second appui pendant la fermeture ne mène nulle part de plus.
  let choisie = false;
  tiroir.addEventListener('click', async evenement => {
    const lien = evenement.target.closest('.tiroir-lien');
    if (!lien) return;
    // Le lien vers Mes voyages ne passe pas par le routeur (src/main.js) : le menu s'en charge.
    evenement.preventDefault();
    if (choisie) return;
    choisie = true;
    const adresse = lien.getAttribute('href');
    // L'étape du menu partie, on attend la même adresse et la même profondeur qu'à son ouverture ; la
    // touche d'Android à l'accueil, elle, ne change rien à l'historique : on compte ses appuis.
    const avant = { href: location.href, profondeur: history.state?.profondeur, appuis: appuisRetour() };
    await fermer();
    const retour =
      location.href !== avant.href || history.state?.profondeur !== avant.profondeur || appuisRetour() !== avant.appuis;
    if (retour || adresse === location.hash) return;
    if (adresse === '#/voyages') revenirAccueil();
    else allerDepuisAccueil(adresse);
  });
  tiroir.querySelector('h2').focus();
}
