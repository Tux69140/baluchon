// Le bandeau « Annuler » de la phase 7 (maquette). Autonome : il charge sa feuille et ses pictos, pour
// s'afficher aussi dans les maquettes du voyage et de l'assistant (« il vous suit d'un écran à
// l'autre », décision du chef de projet, 2026-10-26).
// Sa place : en bas à droite, juste au-dessus du bouton flottant s'il y en a un (il ne le cache
// jamais, et l'écran lui garde la place en bas de sa liste) ; quand une fenêtre est ouverte, en haut,
// comme le message d'erreur d'enregistrement, pour ne pas couvrir les boutons de la fenêtre.
const ici = new URL('.', import.meta.url);
const lien = document.createElement('link');
lien.rel = 'stylesheet';
lien.href = new URL('bandeau.css', ici).href;
document.head.append(lien);

const lire = nom =>
  fetch(new URL(`../../../node_modules/@phosphor-icons/core/assets/bold/${nom}-bold.svg`, ici)).then(r => r.text());
const [corbeille, retour] = await Promise.all([lire('trash'), lire('arrow-counter-clockwise')]);

let courant = null;
let minuteur = null;
let fin = 0;

// Une fenêtre ouverte rend tout le reste de la page intouchable : le bandeau se range alors dans la
// fenêtre du dessus (il s'affiche toujours au-dessus de tout, mais « Annuler » répond au doigt), et
// revient dans la page quand elle se ferme.
function placer() {
  if (!courant) return;
  const fenetre = [...document.querySelectorAll('dialog[open]')].at(-1);
  const parent = fenetre ?? document.body;
  if (courant.parentElement !== parent) {
    parent.append(courant);
    if (!courant.matches(':popover-open')) courant.showPopover();
  }
  courant.dataset.place = fenetre ? 'haut' : 'bas';
  const flottant = document.querySelector('.bouton-flottant');
  const r = flottant && !fenetre ? flottant.getBoundingClientRect() : null;
  courant.style.setProperty('--au-dessus', r?.height ? `${innerHeight - r.top + 8}px` : '');
}

new MutationObserver(placer).observe(document.body, { subtree: true, childList: true, attributeFilter: ['open'] });
addEventListener('resize', placer);

export function retirerBandeau() {
  clearTimeout(minuteur);
  courant?.remove();
  courant = null;
}

// texte : ce qui vient d'être supprimé ; annuler() rétablit. duree : 10 s, sauf pour les captures.
export function montrerBandeau({ texte, annuler, duree = 10000 }) {
  retirerBandeau();
  const el = document.createElement('div');
  el.className = 'bandeau-annuler';
  el.setAttribute('popover', 'manual');
  el.setAttribute('role', 'status');
  el.innerHTML = `
    <span class="bandeau-picto" aria-hidden="true">${corbeille}</span>
    <p>${texte}</p>
    <button type="button" class="bandeau-action">${retour}Annuler</button>`;
  el.querySelector('button').addEventListener('click', () => {
    retirerBandeau();
    annuler?.();
  });
  courant = el;
  el.dataset.entree = '';
  el.addEventListener('animationend', () => delete el.dataset.entree, { once: true });
  (([...document.querySelectorAll('dialog[open]')].at(-1)) ?? document.body).append(el);
  el.showPopover();
  placer();
  fin = Date.now() + duree;
  if (Number.isFinite(duree)) minuteur = setTimeout(retirerBandeau, duree);
  return el;
}

// Pour passer d'une maquette à l'autre en gardant le bandeau : son texte et le temps qui lui reste.
export const etatBandeau = () =>
  courant && { texte: courant.querySelector('p').textContent, reste: Number.isFinite(fin) ? Math.max(0, fin - Date.now()) : 'toujours' };
