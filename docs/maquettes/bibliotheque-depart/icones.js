// Les pictos que la phase 13 ajoute à l'interface (Phosphor Bold, comme src/ecrans/icones.js) : l'entrée
// « À propos » du menu, et les lignes de son écran (licence, hors ligne, traduction, crédits, liens vers le
// site qui s'ouvrent dans le navigateur).
import info from '@phosphor-icons/core/bold/info-bold.svg?raw';
import certificate from '@phosphor-icons/core/bold/certificate-bold.svg?raw';
import wifiSlash from '@phosphor-icons/core/bold/wifi-slash-bold.svg?raw';
import translate from '@phosphor-icons/core/bold/translate-bold.svg?raw';
import handHeart from '@phosphor-icons/core/bold/hand-heart-bold.svg?raw';
import globe from '@phosphor-icons/core/bold/globe-bold.svg?raw';
import downloadSimple from '@phosphor-icons/core/bold/download-simple-bold.svg?raw';
import arrowSquareOut from '@phosphor-icons/core/bold/arrow-square-out-bold.svg?raw';

const PICTOS = {
  aPropos: info,
  libre: certificate,
  horsLigne: wifiSlash,
  traduction: translate,
  credits: handHeart,
  decouvrir: globe,
  versions: downloadSimple,
  externe: arrowSquareOut,
};

export const icone = nom => `<span class="icone" aria-hidden="true">${PICTOS[nom]}</span>`;
