// Les pictos Phosphor (MIT, docs/DESIGN.md « Iconography ») : Duotone dans les pavés de catégorie,
// Bold dans l'interface. Seuls les fichiers importés ici sont embarqués dans l'appli. Le catalogue
// complet des catégories (environ 80 pictos) arrive en phase 5.
import tShirt from '@phosphor-icons/core/duotone/t-shirt-duotone.svg?raw';
import tooth from '@phosphor-icons/core/duotone/tooth-duotone.svg?raw';
import forkKnife from '@phosphor-icons/core/duotone/fork-knife-duotone.svg?raw';
import identificationCard from '@phosphor-icons/core/duotone/identification-card-duotone.svg?raw';
import caretLeft from '@phosphor-icons/core/bold/caret-left-bold.svg?raw';
import caretRight from '@phosphor-icons/core/bold/caret-right-bold.svg?raw';
import plus from '@phosphor-icons/core/bold/plus-bold.svg?raw';
import minus from '@phosphor-icons/core/bold/minus-bold.svg?raw';
import warningCircle from '@phosphor-icons/core/bold/warning-circle-bold.svg?raw';
import { echapper } from './html.js';

const CATEGORIES = { 't-shirt': tShirt, tooth, 'fork-knife': forkKnife, 'identification-card': identificationCard };

const INTERFACE = {
  retour: caretLeft,
  precedent: caretLeft,
  suivant: caretRight,
  plus,
  moins: minus,
  erreur: warningCircle,
};

// Un picto est décoratif : le texte voisin (ou l'aria-label du bouton) dit ce qu'il signifie.
const enveloppe = svg => `<span class="icone" aria-hidden="true">${svg}</span>`;

export const iconeInterface = nom => enveloppe(INTERFACE[nom]);

// Le pavé coloré qui identifie une catégorie (docs/DESIGN.md, « Le pavé identifie ») : la couleur
// vient du nom de la couleur (jetons.css), l'icône est à l'encre marine. Une icône inconnue laisse
// le pavé vide plutôt que de casser l'écran.
export const paveCategorie = ({ icone, couleur }) =>
  `<span class="pave" data-couleur="${echapper(couleur)}" aria-hidden="true">${CATEGORIES[icone] ?? ''}</span>`;
