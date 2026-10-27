// La disposition des écrans à listes, l'écran d'un voyage et la Bibliothèque : deux panneaux dès que
// l'écran est large et couché, et le glissement des éléments qui changent de place.
//
// La même requête habille la disposition dans src/styles/voyage-panneaux.css : les deux doivent
// rester identiques.
export const DEUX_PANNEAUX = '(min-width: 1000px) and (orientation: landscape)';

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
