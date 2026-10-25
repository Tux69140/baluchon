// Le lien de retour en haut d'un écran (« ‹ Mes voyages », « ‹ Réglages ») ; partagé par l'écran d'un
// voyage, l'assistant de création, Réglages et la barre du haut (src/ecrans/menu.js). data-action : un
// repère pour retrouver le lien après un redessin (rotation), et lui rendre le focus ; le lien reste
// un vrai lien, suivi par le routeur (src/main.js), sauf dans l'assistant, qui le prend en charge pour
// demander d'abord s'il faut abandonner la saisie. Par défaut, il mène à Mes voyages.
import { iconeInterface } from './icones.js';

export const lienRetour = (t, { adresse = '#/voyages', libelle = t('voyages.titre') } = {}) =>
  `<a class="lien-retour" href="${adresse}" data-action="retour">${iconeInterface('retour')}${libelle}</a>`;
