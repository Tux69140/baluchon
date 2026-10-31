// Le menu « ⋮ » d'un voyage (phase 11, décision 13 ; maquette validée le 2026-10-30,
// docs/maquettes/refaire/) : un bouton à icône qui ouvre un petit menu, au bout du titre de l'écran du
// voyage (« Modifier ce voyage », « Refaire ce voyage », « Supprimer ce voyage ») et dans le coin de
// chaque carte de Mes voyages (« Refaire ce voyage », « Supprimer ce voyage ») : le même dessin et les
// mêmes gestes aux deux endroits. Les actions sur le voyage entier sont rares : regroupées, elles
// laissent la place aux catégories et aux objets (demande du chef de projet, 2026-10-30). La suppression
// vient toujours en dernier, sous un trait, en rouge (src/styles/menu-voyage.css).
// Le menu est un popover (couche du dessus : aucune colonne ne le coupe), placé sous son bouton, ou
// au-dessus s'il manque de place ; il se ferme par Échap, par un appui ailleurs et par le retour système
// (une garde du retour, src/ecrans/fenetre.js), et rend le focus à son bouton. Flèches haut et bas,
// Début et Fin pour aller d'une ligne à l'autre.
import { remplir } from '../i18n/traduction.js';
import { poserGardeRetour } from './fenetre.js';
import { echapper } from './html.js';
import { iconeInterface } from './icones.js';

// L'écart entre le bouton et le menu, et la marge gardée au bord de l'écran.
const ECART = 4;
const MARGE = 8;

// actions : les lignes du menu, dans l'ordre (« modifier », « refaire », « supprimer ») ; « supprimer »
// se dessine en danger. suffixe : distingue l'identifiant du menu du titre de celui d'une carte.
export function vueMenuVoyage(t, voyage, actions, suffixe = '') {
  const id = echapper(`menu-${voyage.id}${suffixe}`);
  const libelle = echapper(remplir(t('menuVoyage.actions'), { nom: voyage.nom }));
  const lignes = actions
    .map(
      cle => `
          <button type="button" class="menu-voyage-ligne${cle === 'supprimer' ? ' menu-voyage-danger' : ''}" role="menuitem" data-menu="${cle}">${iconeInterface(cle)}${t(`menuVoyage.${cle}`)}</button>`,
    )
    .join('');
  return `
        <button type="button" class="bouton-icone menu-voyage-bouton" data-action="actions" popovertarget="${id}" aria-haspopup="menu" aria-expanded="false" aria-label="${libelle}">${iconeInterface('actions')}</button>
        <div class="menu-voyage" id="${id}" popover role="menu" aria-label="${libelle}">${lignes}
        </div>`;
}

// Sous le bouton, bord droit contre son bord droit ; au-dessus quand le bas de l'écran est trop près.
function placer(menu, bouton) {
  const r = bouton.getBoundingClientRect();
  const hauteur = menu.offsetHeight;
  const dessous = r.bottom + ECART + hauteur <= innerHeight - MARGE;
  menu.style.top = `${dessous ? r.bottom + ECART : Math.max(MARGE, r.top - ECART - hauteur)}px`;
  menu.style.right = `${Math.max(MARGE, document.documentElement.clientWidth - r.right)}px`;
}

// Le menu ouvert (un popover ferme l'autre en s'ouvrant) : { menu, garde, ligne, fin } — sa garde du
// retour, la ligne qui avait le focus, et la fin du suivi du défilement. Un redessin de l'écran (la liste
// du voyage qui se range après une coche, l'appareil tourné) retire le menu de la page sans le fermer :
// le nouveau dessin du même menu reprend alors sa place, sa garde et sa ligne (brancherMenuVoyage).
let ouvert = null;
// Le départ de l'étape du menu fermé (garde retirée) : une promesse résolue quand le navigateur a reculé.
let depart = null;

// Le retour système consomme la garde : le menu se ferme sans la retirer.
function fermerAuRetour() {
  const menu = ouvert?.menu;
  ouvert?.fin.abort();
  ouvert = null;
  if (menu?.matches(':popover-open')) menu.hidePopover();
  return false;
}

// Le menu se ferme (Échap, appui ailleurs, ligne choisie) : son étape part. Rend la promesse du départ.
function quitter(menu) {
  if (ouvert?.menu !== menu) return depart ?? Promise.resolve();
  ouvert.fin.abort();
  const partie = ouvert.garde.retirer();
  ouvert = null;
  depart = partie;
  partie.then(() => depart === partie && (depart = null));
  return partie;
}

// Un lien touché menu ouvert, ou pendant que son étape part : un appui ailleurs ferme le menu, mais le
// lien serait suivi avant le départ de l'étape, que le retrait défairait ensuite (le lien « Mes voyages »
// recule même dans l'historique, src/main.js, et ne ferait que retirer l'étape). Il attend donc ce départ,
// puis est suivi tel quel.
addEventListener(
  'click',
  evenement => {
    const lien = evenement.target.closest?.('a[href]');
    if (!lien || ouvert?.menu.contains(lien)) return;
    if (ouvert?.menu.matches(':popover-open')) ouvert.menu.hidePopover();
    if (!depart) return;
    evenement.preventDefault();
    evenement.stopPropagation();
    depart.then(() => lien.isConnected && lien.click());
  },
  { capture: true },
);

// Branche le menu dessiné par vueMenuVoyage dans `conteneur` ; surChoix(cle) est appelé une fois le menu
// fermé et l'étape de sa garde partie (une adresse changée avant reculerait sous l'écran suivant).
export function brancherMenuVoyage(conteneur, surChoix) {
  const bouton = conteneur.querySelector('.menu-voyage-bouton');
  const menu = conteneur.querySelector('.menu-voyage');
  const lignes = [...menu.querySelectorAll('[role="menuitem"]')];

  function montrer() {
    if (ouvert?.menu !== menu)
      ouvert = {
        menu,
        garde: poserGardeRetour({ surRetour: fermerAuRetour }),
        ligne: null,
        fin: new AbortController(),
      };
    // Le bloc du voyage défile seul en trois colonnes : le défilement de toute boîte déplace le bouton.
    const suivre = () => menu.matches(':popover-open') && placer(menu, bouton);
    for (const quand of ['scroll', 'resize'])
      addEventListener(quand, suivre, { passive: true, capture: true, signal: ouvert.fin.signal });
    placer(menu, bouton);
    (lignes.find(l => l.dataset.menu === ouvert.ligne) ?? lignes[0]).focus();
  }

  // Avant la fermeture, aussitôt (l'événement toggle n'arrive qu'après) : l'étape part dès le geste.
  menu.addEventListener('beforetoggle', ({ newState }) => newState === 'closed' && quitter(menu));
  menu.addEventListener('toggle', ({ newState }) => {
    bouton.setAttribute('aria-expanded', newState === 'open');
    if (newState === 'open') montrer();
    else if (menu.contains(document.activeElement) || document.activeElement === document.body) bouton.focus();
  });
  menu.addEventListener('focusin', ({ target }) => {
    if (ouvert?.menu === menu) ouvert.ligne = target.dataset.menu ?? null;
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
    (depart ?? Promise.resolve()).then(() => surChoix(ligne.dataset.menu));
  });

  // Le même menu, ouvert dans le dessin d'avant : il se rouvre, avec sa garde, sans rien rejouer.
  if (ouvert && !ouvert.menu.isConnected && ouvert.menu.id === menu.id) {
    ouvert.fin.abort();
    ouvert = { ...ouvert, menu, fin: new AbortController() };
    menu.showPopover();
    for (const animation of menu.getAnimations()) animation.finish();
  }
}
