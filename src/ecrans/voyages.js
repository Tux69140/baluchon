// Écran Voyages (#/voyages), l'accueil : les voyages en cours, à venir puis passés (US-28) ou, au
// premier lancement, l'écran vide qui invite à créer le premier (US-29).
import { echapper } from './html.js';
import { detailsVoyage } from './format.js';
import { iconeInterface } from './icones.js';
import { lienRetour } from './retour.js';
import { dateDuJour } from '../modele/dates.js';
import { classerVoyages } from '../modele/voyage.js';
import mascotte from '../images/baluchon.svg';

const RUBRIQUES = ['enCours', 'aVenir', 'passes'];

function vueVide(t) {
  return `
    <section class="vide">
      <img src="${mascotte}" alt="" width="96" height="96" />
      <h2>${t('voyages.vide.titre')}</h2>
      <p>${t('voyages.vide.texte')}</p>
      <a class="bouton bouton-principal" href="#/nouveau-voyage">${t('voyages.nouveau')}</a>
    </section>`;
}

function carte(voyage, { t, langue }) {
  const destination = voyage.destination
    ? `<span class="carte-voyage-destination">${echapper(voyage.destination)}</span>`
    : '';
  return `
        <li>
          <a class="carte-voyage" href="#/voyage/${encodeURIComponent(voyage.id)}">
            <span class="carte-voyage-nom">${echapper(voyage.nom)}</span>
            ${destination}
            <span class="carte-voyage-details">${echapper(detailsVoyage(t, voyage, langue))}</span>
          </a>
        </li>`;
}

function vueListe(voyages, aujourdhui, contexte) {
  const classes = classerVoyages(voyages, aujourdhui);
  const rubriques = RUBRIQUES.filter(rubrique => classes[rubrique].length).map(
    rubrique => `
      <section class="rubrique" aria-labelledby="rubrique-${rubrique}">
        <h2 id="rubrique-${rubrique}">${contexte.t(`voyages.rubriques.${rubrique}`)}</h2>
        <ul class="voyages">${classes[rubrique].map(v => carte(v, contexte)).join('')}
        </ul>
      </section>`,
  );
  return `${rubriques.join('')}
      <a class="bouton bouton-principal bouton-flottant" href="#/nouveau-voyage">${iconeInterface('plus')}${contexte.t('voyages.nouveau')}</a>`;
}

export const ecranVoyages = {
  nom: 'voyages',
  charger: async ({ stockage }) => ({ voyages: await stockage.listerVoyages(), aujourdhui: dateDuJour(new Date()) }),
  dessiner(app, { voyages, aujourdhui }, contexte) {
    app.innerHTML = `
    <main class="ecran${voyages.length ? ' ecran-avec-flottant' : ''}">
      <h1>${contexte.t('voyages.titre')}</h1>
      ${voyages.length ? vueListe(voyages, aujourdhui, contexte) : vueVide(contexte.t)}
    </main>`;
  },
};

// Hors de l'accueil, l'écran d'erreur garde le retour vers Mes voyages : sans lui, il faudrait
// fermer l'appli (sur Debian, aucun bouton système ne ramène en arrière).
export function vueErreur({ t, avecRetour }) {
  return `
    <main class="ecran">
      ${avecRetour ? lienRetour(t) : ''}
      <h1>${t('voyages.titre')}</h1>
      <p class="message message-erreur" role="alert">${t('erreurs.lecture')}</p>
    </main>`;
}
