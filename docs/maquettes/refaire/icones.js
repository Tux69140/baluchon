// Les pictos que la phase 11 ajoute à l'interface (Phosphor Bold, comme src/ecrans/icones.js) : le « ⋮ »
// des cartes, « Refaire ce voyage », et les mentions « retiré » et « ajouté à la main » de l'aperçu.
import dotsThreeVertical from '@phosphor-icons/core/bold/dots-three-vertical-bold.svg?raw';
import copy from '@phosphor-icons/core/bold/copy-bold.svg?raw';
import minusCircle from '@phosphor-icons/core/bold/minus-circle-bold.svg?raw';
import hand from '@phosphor-icons/core/bold/hand-bold.svg?raw';

const PICTOS = { actions: dotsThreeVertical, refaire: copy, retire: minusCircle, aLaMain: hand };

export const icone = nom => `<span class="icone" aria-hidden="true">${PICTOS[nom]}</span>`;

// Une mention de l'aperçu : un mot et une icône, jamais la couleur seule (docs/DESIGN.md).
export const pastille = (nom, texte) => `<span class="pastille-mention">${icone(nom)}${texte}</span>`;
