// La rangée d'étapes de l'assistant « Nouveau voyage » quand les groupes sont nombreux (phase 6,
// décision du chef de projet, 2026-10-26 ; maquette docs/maquettes/etiquettes/assistant.js). Tant que
// les étapes tiennent, la rangée reste celle de la phase 4. Sinon elle défile de côté, par étapes
// entières qui se partagent la largeur, l'étape en cours gardée au milieu ; un trait gris prolongé
// jusqu'au bord de la fenêtre (de l'écran au téléphone) dit de quel côté des étapes sont cachées.
// Le dessin de la rangée : vueEtapes (src/ecrans/assistant-vues.js) ; son style : assistant.css.

// Largeur d'une étape en dessous de laquelle la rangée défile : au téléphone, le rond seul (cible de
// 44 px et un bout de trait de chaque côté) ; ailleurs, le rond et son nom dessous.
export const LARGEUR_MINI = { etroit: 52, large: 104 };
// Le téléphone, où seuls les ronds s'écrivent (même seuil qu'assistant.css).
const ETROIT = '(max-width: 599px)';

// Combien d'étapes entières tiennent dans la place, et laquelle se montre la première : l'étape en
// cours au milieu, sans laisser de vide au bout de la rangée.
export function fenetreDEtapes({ nombre, courante, place, mini }) {
  const tiennent = Math.max(1, Math.floor(place / mini));
  const defile = nombre > tiennent;
  const premiere = defile ? Math.min(Math.max(0, courante - Math.floor((tiennent - 1) / 2)), nombre - tiennent) : 0;
  return { defile, tiennent, part: place / tiennent, premiere };
}

// Suit la rangée posée dans nav (redessinée à chaque changement : on relit la liste à chaque fois).
// centrer() mesure, pose le défilement et fait venir l'étape en cours ; la rangée se recalcule
// d'elle-même quand sa largeur change (téléphone tourné, fenêtre redimensionnée), et ses traits
// suivent un défilement au doigt.
export function suivreRangee(nav, { signal }) {
  let courante = 0;
  let liste = null;
  // La position de la liste précédente : une liste redessinée part de là, pour glisser jusqu'à la
  // nouvelle étape au lieu de repartir du début.
  let position = 0;
  let largeur = 0;

  // Le trait de chaque côté où des étapes sont cachées.
  function suites() {
    const l = nav.querySelector('.etapes-liste');
    if (!l) return;
    if (l === liste) position = l.scrollLeft;
    const defile = nav.hasAttribute('data-defile');
    const avant = defile && l.scrollLeft > 1;
    const apres = defile && l.scrollLeft + l.clientWidth < l.scrollWidth - 1;
    nav.querySelector('[data-cote="avant"]')?.toggleAttribute('data-visible', avant);
    nav.querySelector('[data-cote="apres"]')?.toggleAttribute('data-visible', apres);
  }

  function centrer(indice, { doux = false } = {}) {
    courante = indice;
    const l = nav.querySelector('.etapes-liste');
    // Rien à mesurer tant que la fenêtre n'est pas ouverte : son ouverture changera la largeur.
    if (!l || !l.clientWidth) return;
    const nombre = l.children.length;
    const mini = matchMedia(ETROIT).matches ? LARGEUR_MINI.etroit : LARGEUR_MINI.large;
    // La largeur se mesure sans défilement : une liste qui défile garde la même largeur.
    const { defile, part, premiere } = fenetreDEtapes({ nombre, courante, place: l.clientWidth, mini });
    nav.toggleAttribute('data-defile', defile);
    l.style.setProperty('--part', defile ? `${part}px` : '');
    if (l !== liste) {
      liste = l;
      l.scrollLeft = defile ? position : 0;
    }
    largeur = nav.clientWidth;
    const lent = doux && !matchMedia('(prefers-reduced-motion: reduce)').matches;
    l.scrollTo({ left: premiere * part, behavior: lent ? 'smooth' : 'instant' });
    if (!lent) position = l.scrollLeft;
    suites();
  }

  // Le défilement ne remonte pas : on l'écoute à la descente, pour toutes les listes successives.
  nav.addEventListener('scroll', suites, { capture: true, passive: true, signal });
  // Seule la largeur compte : un changement de hauteur (légende) ne doit pas couper un glissement.
  // Le recalcul attend l'image suivante : centrer() bascule data-defile, donc la hauteur de la rangée
  // (4 px de marge) et celle de la fenêtre. Fait dans la même image, il relancerait les observateurs
  // déjà passés et le navigateur signalerait « ResizeObserver loop completed with undelivered
  // notifications ».
  let image = 0;
  const tailles = new ResizeObserver(() => {
    if (nav.clientWidth === largeur) return;
    cancelAnimationFrame(image);
    image = requestAnimationFrame(() => {
      if (nav.clientWidth !== largeur) centrer(courante);
    });
  });
  tailles.observe(nav);
  signal.addEventListener('abort', () => {
    tailles.disconnect();
    cancelAnimationFrame(image);
  });
  return { centrer };
}
