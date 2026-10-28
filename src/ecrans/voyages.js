// Écran Voyages (#/voyages), l'accueil : les voyages en cours, à venir puis passés (US-28) ou, au
// premier lancement, l'écran vide qui invite à créer le premier (US-29).
import { echapper } from './html.js';
import { detailsVoyage } from './format.js';
import { iconeInterface } from './icones.js';
import { jauge } from './jauge.js';
import { barreHaut, ouvrirMenu } from './menu.js';
import { suivreFin } from './mode-rangement.js';
import { lienRetour } from './retour.js';
import { remplir } from '../i18n/traduction.js';
import { dateDuJour } from '../modele/dates.js';
import { estFini, progressionParVoyage } from '../modele/sac.js';
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

// Seuls les voyages en cours ou à venir et qui ont des objets montrent leur avancement.
function vueProgression(avancement, t) {
  if (!avancement) return '';
  if (estFini(avancement))
    return `
            <span class="carte-progression"><span class="pastille-boucle">${iconeInterface('boucle')}${t('voyages.sacBoucle')}</span></span>`;
  return `
            <span class="carte-progression">${jauge(avancement, true)}<span>${remplir(t('voyages.progression'), avancement)}</span></span>`;
}

function carte(voyage, { t, langue }, avancement) {
  const destination = voyage.destination
    ? `<span class="carte-voyage-destination">${echapper(voyage.destination)}</span>`
    : '';
  return `
        <li>
          <a class="carte-voyage" href="#/voyage/${encodeURIComponent(voyage.id)}">
            <span class="carte-voyage-nom">${echapper(voyage.nom)}</span>
            ${destination}
            <span class="carte-voyage-details">${echapper(detailsVoyage(t, voyage, langue))}</span>${vueProgression(avancement, t)}
          </a>
        </li>`;
}

// L'avancement que montre la carte d'un voyage de cette rubrique : aucun pour un voyage passé.
const avancementDe = (rubrique, progressions, id) => (rubrique === 'passes' ? undefined : progressions.get(id));

function vueListe(voyages, aujourdhui, progressions, contexte) {
  const classes = classerVoyages(voyages, aujourdhui);
  const rubriques = RUBRIQUES.filter(rubrique => classes[rubrique].length).map(
    rubrique => `
      <section class="rubrique" aria-labelledby="rubrique-${rubrique}">
        <h2 id="rubrique-${rubrique}">${contexte.t(`voyages.rubriques.${rubrique}`)}</h2>
        <ul class="voyages">${classes[rubrique].map(v => carte(v, contexte, avancementDe(rubrique, progressions, v.id))).join('')}
        </ul>
      </section>`,
  );
  return `${rubriques.join('')}
      <a class="bouton bouton-principal bouton-flottant" href="#/nouveau-voyage">${iconeInterface('plus')}${contexte.t('voyages.nouveau')}</a>`;
}

// La progression est un plus : sans elle, la liste s'affiche quand même ; la panne reste au journal.
const lireProgressions = async stockage =>
  progressionParVoyage(
    await stockage.etatsDesObjets().catch(erreur => {
      console.error(erreur);
      return [];
    }),
  );

// « Annuler » d'un retrait touché d'ici (le bandeau suit d'un écran à l'autre, src/ecrans/annulation.js) :
// la carte du voyage rendu relit son avancement (événement « voyage-retabli »), comme Nouveau voyage
// relit la bibliothèque à « bibliotheque-retablie ». Rien d'autre ne bouge.
function suivreRetablissements(app, { voyages, aujourdhui }, contexte) {
  const { signal, parti } = suivreFin(app, app.firstElementChild);
  window.addEventListener(
    'voyage-retabli',
    async ({ detail: { voyageId } }) => {
      const progressions = await lireProgressions(contexte.stockage);
      const classes = classerVoyages(voyages, aujourdhui);
      const rubrique = RUBRIQUES.find(r => classes[r].some(v => v.id === voyageId));
      const lien = app.querySelector(`a.carte-voyage[href="#/voyage/${CSS.escape(encodeURIComponent(voyageId))}"]`);
      if (parti() || !rubrique || !lien) return;
      lien.querySelector('.carte-progression')?.remove();
      lien
        .querySelector('.carte-voyage-details')
        .insertAdjacentHTML('afterend', vueProgression(avancementDe(rubrique, progressions, voyageId), contexte.t));
    },
    { signal },
  );
}

export const ecranVoyages = {
  nom: 'voyages',
  charger: async ({ stockage }) => ({
    voyages: await stockage.listerVoyages(),
    progressions: await lireProgressions(stockage),
    aujourdhui: dateDuJour(new Date()),
  }),
  dessiner(app, donnees, contexte) {
    const { voyages, aujourdhui, progressions } = donnees;
    app.innerHTML = `
    <main class="ecran${voyages.length ? ' ecran-avec-flottant' : ''}">${barreHaut(contexte)}
      <h1>${contexte.t('voyages.titre')}</h1>
      ${voyages.length ? vueListe(voyages, aujourdhui, progressions, contexte) : vueVide(contexte.t)}
    </main>`;
    app
      .querySelector('[data-action="menu"]')
      .addEventListener('click', () => ouvrirMenu(contexte, { courant: 'voyages' }));
    suivreRetablissements(app, donnees, contexte);
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
