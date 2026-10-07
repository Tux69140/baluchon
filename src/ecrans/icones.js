// Les pictos Phosphor (MIT, docs/DESIGN.md « Iconography »), Bold dans l'interface. Seuls les
// fichiers importés ici sont embarqués dans l'appli. Les pictos Duotone des pavés de catégorie
// s'ajoutent ici avec l'écran qui les affiche.
import caretLeft from '@phosphor-icons/core/bold/caret-left-bold.svg?raw';
import caretRight from '@phosphor-icons/core/bold/caret-right-bold.svg?raw';
import plus from '@phosphor-icons/core/bold/plus-bold.svg?raw';
import minus from '@phosphor-icons/core/bold/minus-bold.svg?raw';
import warningCircle from '@phosphor-icons/core/bold/warning-circle-bold.svg?raw';

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
