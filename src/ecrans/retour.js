// Le lien « Mes voyages » en haut d'un écran de voyage ; partagé par l'écran d'un voyage et par
// l'assistant de création. data-action : un repère pour retrouver le lien après un redessin (rotation),
// et lui rendre le focus ; il ne déclenche rien, le lien reste un vrai lien.
import { iconeInterface } from './icones.js';

export const lienRetour = t =>
  `<a class="lien-retour" href="#/voyages" data-action="retour">${iconeInterface('retour')}${t('voyages.titre')}</a>`;
