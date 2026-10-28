// La disposition des écrans à listes, l'écran d'un voyage et la Bibliothèque (maquette validée le
// 2026-10-27, docs/maquettes/grand-ecran/), et le glissement des éléments qui changent de place.
//
// Les trois dispositions du grand format (tablettes et ordinateur ; le téléphone garde l'accordéon) :
// - téléphone : le plus petit côté < 600 px, rien ici ;
// - repli : GRAND_FORMAT et largeur < 1340 px (voyage, tuiles de catégories, liste dessous) ;
// - trois colonnes : TROIS_COLONNES (voyage | menu | liste).
// Les mêmes requêtes habillent les dispositions dans src/styles/grand-format.css (un test vérifie
// qu'elles restent identiques). Le seuil de 720 px, côté CSS seulement, ne change que la mise en page.
export const GRAND_FORMAT = '(min-width: 600px) and (min-height: 600px)';
export const TROIS_COLONNES = '(min-width: 1340px) and (min-height: 600px)';

// Relu à chaque appel : le module reste importable sans navigateur (le test des seuils).
const moinsDAnimations = () => matchMedia('(prefers-reduced-motion: reduce)');

// Les colonnes qui défilent chacune (trois colonnes) ; en repli, c'est la page qui défile.
const COLONNES = '.gf-gauche, .gf-menu, .gf-liste';

// Pose un dessin dans main : sa classe, ses colonnes (data-colonnes : 3 ou « repli », rien hors du grand
// format) et son HTML. Un dessin dans la même disposition laisse chaque colonne là où on l'avait menée ;
// une autre disposition repart du haut.
export function poserDessin(main, { classe, colonnes, html }) {
  const memeDisposition = classe === main.className && String(colonnes) === String(main.dataset.colonnes);
  const defilements = memeDisposition ? [...main.querySelectorAll(COLONNES)].map(c => c.scrollTop) : [];
  main.className = classe;
  if (colonnes) main.dataset.colonnes = colonnes;
  else delete main.dataset.colonnes;
  main.innerHTML = html;
  main.querySelectorAll(COLONNES).forEach((c, i) => (c.scrollTop = defilements[i] ?? 0));
}

// Repli : toucher une tuile montre sa liste ; si elle commence dans la moitié basse de l'écran (des
// dizaines de catégories, ou un écran de 600 px), elle monte jusqu'à son titre, 16 px sous le haut
// (scroll-margin-top, grand-format.css), en douceur sauf si l'appareil demande moins d'animations.
// Le focus reste sur la tuile.
export function allerALaListe(main) {
  if (main.dataset.colonnes !== 'repli') return;
  const section = main.querySelector('.gf-liste');
  if (section && section.getBoundingClientRect().top > innerHeight / 2)
    section.scrollIntoView({ block: 'start', behavior: moinsDAnimations().matches ? 'auto' : 'smooth' });
}

// La place de chaque élément mobile ([data-flip]), relevée par rapport à l'élément mobile qui le
// contient : une ligne qui descend avec sa carte ne glisse qu'une fois, avec elle. Rien (null) si
// l'appareil demande moins d'animations : il n'y aura pas de glissement.
export function places(racine) {
  if (moinsDAnimations().matches) return null;
  const resultat = new Map();
  for (const el of racine.querySelectorAll('[data-flip]')) {
    const parent = el.parentElement.closest('[data-flip]');
    resultat.set(el.dataset.flip, el.getBoundingClientRect().top - (parent?.getBoundingClientRect().top ?? 0));
  }
  return resultat;
}

// Chaque élément part de son ancienne place (relevée par places avant le dessin) et glisse jusqu'à la
// nouvelle (technique « FLIP ») ; animation : la durée et la courbe propres à chaque écran.
export function glisser(racine, avant, animation) {
  const apres = avant && places(racine);
  if (!apres) return;
  for (const el of racine.querySelectorAll('[data-flip]')) {
    // Un élément qui vient d'apparaître (filtre retiré) n'a pas d'ancienne place : il est là, simplement.
    if (!avant.has(el.dataset.flip)) continue;
    const delta = avant.get(el.dataset.flip) - apres.get(el.dataset.flip);
    if (Math.abs(delta) > 1) el.animate([{ transform: `translateY(${delta}px)` }, { transform: 'none' }], animation);
  }
}
