// Les pictos Phosphor (MIT, docs/DESIGN.md « Iconography ») : Duotone dans les pavés de catégorie
// (le catalogue de 80 pictos vit dans pictos.js), Bold dans l'interface. Seuls les fichiers importés
// sont embarqués dans l'appli.
import caretLeft from '@phosphor-icons/core/bold/caret-left-bold.svg?raw';
import caretRight from '@phosphor-icons/core/bold/caret-right-bold.svg?raw';
import plus from '@phosphor-icons/core/bold/plus-bold.svg?raw';
import minus from '@phosphor-icons/core/bold/minus-bold.svg?raw';
import warningCircle from '@phosphor-icons/core/bold/warning-circle-bold.svg?raw';
import check from '@phosphor-icons/core/bold/check-bold.svg?raw';
import info from '@phosphor-icons/core/bold/info-bold.svg?raw';
import caretDown from '@phosphor-icons/core/bold/caret-down-bold.svg?raw';
import funnel from '@phosphor-icons/core/bold/funnel-bold.svg?raw';
import checkCircle from '@phosphor-icons/core/bold/check-circle-bold.svg?raw';
import x from '@phosphor-icons/core/bold/x-bold.svg?raw';
import listChecks from '@phosphor-icons/core/bold/list-checks-bold.svg?raw';
import tag from '@phosphor-icons/core/bold/tag-bold.svg?raw';
import list from '@phosphor-icons/core/bold/list-bold.svg?raw';
import pencilSimple from '@phosphor-icons/core/bold/pencil-simple-bold.svg?raw';
import arrowsDownUp from '@phosphor-icons/core/bold/arrows-down-up-bold.svg?raw';
import arrowUp from '@phosphor-icons/core/bold/arrow-up-bold.svg?raw';
import arrowDown from '@phosphor-icons/core/bold/arrow-down-bold.svg?raw';
import magnifyingGlass from '@phosphor-icons/core/bold/magnifying-glass-bold.svg?raw';
import books from '@phosphor-icons/core/bold/books-bold.svg?raw';
import gearSix from '@phosphor-icons/core/bold/gear-six-bold.svg?raw';
import suitcaseRolling from '@phosphor-icons/core/bold/suitcase-rolling-bold.svg?raw';
import plusCircle from '@phosphor-icons/core/bold/plus-circle-bold.svg?raw';
import { svgPicto } from './pictos.js';
import { echapper } from './html.js';

const INTERFACE = {
  retour: caretLeft,
  precedent: caretLeft,
  suivant: caretRight,
  plus,
  moins: minus,
  erreur: warningCircle,
  fermer: x,
  coche: check,
  info,
  deplier: caretDown,
  filtre: funnel,
  boucle: checkCircle,
  apercu: listChecks,
  etiquette: tag,
  menu: list,
  modifier: pencilSimple,
  ranger: arrowsDownUp,
  monter: arrowUp,
  descendre: arrowDown,
  chercher: magnifyingGlass,
  bibliotheque: books,
  reglages: gearSix,
  voyages: suitcaseRolling,
  nouveau: plusCircle,
};

// Un picto est décoratif : le texte voisin (ou l'aria-label du bouton) dit ce qu'il signifie.
const enveloppe = svg => `<span class="icone" aria-hidden="true">${svg}</span>`;

export const iconeInterface = nom => enveloppe(INTERFACE[nom]);

// Le pavé coloré qui identifie une catégorie (docs/DESIGN.md, « Le pavé identifie ») : la couleur
// vient du nom de la couleur (jetons.css), l'icône est à l'encre marine. Une icône inconnue laisse
// le pavé vide plutôt que de casser l'écran.
export const paveCategorie = ({ icone, couleur }) =>
  `<span class="pave" data-couleur="${echapper(couleur)}" aria-hidden="true">${svgPicto(icone)}</span>`;
