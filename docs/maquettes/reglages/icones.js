// Les pictos que la phase 12 ajoute à l'interface (Phosphor Bold, comme src/ecrans/icones.js) : les trois
// thèmes, « Sauvegarder » (la flèche qui descend dans Téléchargements), « Restaurer une sauvegarde… » (l'horloge
// qui revient en arrière), la réussite des bandeaux.
import circleHalf from '@phosphor-icons/core/bold/circle-half-bold.svg?raw';
import sun from '@phosphor-icons/core/bold/sun-bold.svg?raw';
import moon from '@phosphor-icons/core/bold/moon-bold.svg?raw';
import downloadSimple from '@phosphor-icons/core/bold/download-simple-bold.svg?raw';
import clockCounterClockwise from '@phosphor-icons/core/bold/clock-counter-clockwise-bold.svg?raw';
import checkCircle from '@phosphor-icons/core/bold/check-circle-bold.svg?raw';

const PICTOS = {
  appareil: circleHalf,
  clair: sun,
  sombre: moon,
  sauvegarder: downloadSimple,
  restaurer: clockCounterClockwise,
  reussite: checkCircle,
};

export const svg = nom => PICTOS[nom];
export const icone = nom => `<span class="icone" aria-hidden="true">${PICTOS[nom]}</span>`;
