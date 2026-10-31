// Le menu « ⋮ » d'un voyage (phase 11) : un bouton à icône qui ouvre un petit menu, sur chaque carte de
// Mes voyages comme dans l'en-tête du voyage — le même dessin et les mêmes gestes aux deux endroits.
// Sur la carte, le bouton est posé à part (la carte reste un lien vers le voyage) : « Refaire ce voyage »,
// puis « Supprimer ce voyage ». Dans le voyage, il regroupe les trois actions sur le voyage entier,
// rares, pour laisser la place aux catégories et aux objets (demande du chef de projet, 2026-10-30) :
// « Modifier ce voyage », « Refaire ce voyage », puis « Supprimer ce voyage ». La suppression vient
// toujours en dernier, sous un trait, en rouge. Le menu est un popover (couche du dessus : rien ne le
// coupe), placé sous son bouton, ou au-dessus s'il manque de place ; il se ferme par Échap, par un appui
// ailleurs, et rend le focus à son bouton. Flèches haut et bas, Début et Fin pour aller d'une ligne à
// l'autre. Dans l'appli, le retour système le fermera aussi.
import { echapper } from '../../../src/ecrans/html.js';
import { iconeInterface } from '../../../src/ecrans/icones.js';
import { icone } from './icones.js';

const ECART = 4;
const MARGE = 8;

const LIGNES = {
  modifier: () => `${iconeInterface('modifier')}Modifier ce voyage`,
  refaire: () => `${icone('refaire')}Refaire ce voyage`,
  supprimer: () => `${iconeInterface('supprimer')}Supprimer ce voyage`,
};

const libelle = voyage => echapper(`Actions du voyage « ${voyage.nom} »`);

// actions : les clés de LIGNES, dans l'ordre ; « supprimer » se dessine en danger.
export const vueMenu = (voyage, actions, suffixe = '') => `
        <button type="button" class="bouton-icone menu-voyage-bouton" popovertarget="menu-${echapper(voyage.id)}${suffixe}" aria-haspopup="menu" aria-expanded="false" aria-label="${libelle(voyage)}">${icone('actions')}</button>
        <div class="menu-voyage" id="menu-${echapper(voyage.id)}${suffixe}" popover role="menu" aria-label="${libelle(voyage)}">${actions
          .map(
            cle =>
              `
          <button type="button" class="menu-voyage-ligne${cle === 'supprimer' ? ' menu-voyage-danger' : ''}" role="menuitem" data-menu="${cle}">${LIGNES[cle]()}</button>`,
          )
          .join('')}
        </div>`;

// Sous le bouton, bord droit contre son bord droit ; au-dessus quand le bas de l'écran est trop près.
function placer(menu, bouton) {
  const r = bouton.getBoundingClientRect();
  const hauteur = menu.offsetHeight;
  const dessous = r.bottom + ECART + hauteur <= innerHeight - MARGE;
  menu.style.top = `${dessous ? r.bottom + ECART : Math.max(MARGE, r.top - ECART - hauteur)}px`;
  menu.style.right = `${Math.max(MARGE, document.documentElement.clientWidth - r.right)}px`;
}

// Branche le menu dessiné par vueMenu dans `conteneur` ; surChoix(cle) après la fermeture du menu.
export function brancherMenu(conteneur, surChoix) {
  const bouton = conteneur.querySelector('.menu-voyage-bouton');
  const menu = conteneur.querySelector('.menu-voyage');
  const lignes = [...menu.querySelectorAll('[role="menuitem"]')];
  menu.addEventListener('toggle', ({ newState }) => {
    const ouvert = newState === 'open';
    bouton.setAttribute('aria-expanded', ouvert);
    if (ouvert) {
      placer(menu, bouton);
      lignes[0].focus();
    } else if (menu.contains(document.activeElement) || document.activeElement === document.body) bouton.focus();
  });
  menu.addEventListener('keydown', evenement => {
    const i = lignes.indexOf(document.activeElement);
    const vers = { ArrowDown: i + 1, ArrowUp: i - 1, Home: 0, End: lignes.length - 1 }[evenement.key];
    if (vers === undefined) return;
    evenement.preventDefault();
    lignes[(vers + lignes.length) % lignes.length].focus();
  });
  menu.addEventListener('click', evenement => {
    const ligne = evenement.target.closest('[data-menu]');
    if (!ligne) return;
    menu.hidePopover();
    surChoix(ligne.dataset.menu);
  });
  for (const quand of ['scroll', 'resize'])
    addEventListener(quand, () => menu.matches(':popover-open') && placer(menu, bouton), { passive: true });
}

// voyages : ceux dont la carte est à l'écran ; surRefaire(id), surSupprimer(id) : après la fermeture du menu.
export function poserMenus(app, voyages, { surRefaire, surSupprimer }) {
  for (const voyage of voyages) {
    const lien = app.querySelector(`a.carte-voyage[href="#/voyage/${CSS.escape(encodeURIComponent(voyage.id))}"]`);
    if (!lien) continue;
    const li = lien.parentElement;
    li.classList.add('carte-avec-actions');
    li.insertAdjacentHTML('beforeend', vueMenu(voyage, ['refaire', 'supprimer']));
    brancherMenu(li, cle => (cle === 'refaire' ? surRefaire : surSupprimer)(voyage.id));
  }
}
