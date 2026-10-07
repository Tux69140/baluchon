// Le lien « Mes voyages » en haut d'un écran de voyage ; partagé par l'écran d'un voyage et par
// l'assistant de création.
import { iconeInterface } from './icones.js';

export const lienRetour = t =>
  `<a class="lien-retour" href="#/voyages">${iconeInterface('retour')}${t('voyages.titre')}</a>`;
