// Écran Voyages (#/voyages), l'accueil : les voyages en cours, à venir puis passés (US-28) ou, au
// premier lancement, l'écran vide qui invite à créer le premier (US-29). Chaque carte a son menu « ⋮ »
// (phase 11) : « Refaire ce voyage », « Supprimer ce voyage » (src/ecrans/suppression-voyage.js).
import { echapper } from './html.js';
import { detailsVoyage } from './format.js';
import { iconeInterface } from './icones.js';
import { jauge } from './jauge.js';
import { barreHaut, ouvrirMenu } from './menu.js';
import { brancherMenuVoyage, vueMenuVoyage } from './menu-voyage.js';
import { suivreFin } from './mode-rangement.js';
import { lienRetour } from './retour.js';
import { supprimerVoyage } from './suppression-voyage.js';
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
        <li class="carte-avec-actions">
          <a class="carte-voyage" href="#/voyage/${encodeURIComponent(voyage.id)}">
            <span class="carte-voyage-nom">${echapper(voyage.nom)}</span>
            ${destination}
            <span class="carte-voyage-details">${echapper(detailsVoyage(t, voyage, langue))}</span>${vueProgression(avancement, t)}
          </a>${vueMenuVoyage(t, voyage, ['refaire', 'supprimer'])}
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

// Le lien de la carte d'un voyage.
const lienDeCarte = id => `a.carte-voyage[href="#/voyage/${CSS.escape(encodeURIComponent(id))}"]`;

// Relit la liste et la redessine, sans changer de défilement (le contenu est remplacé d'un seul coup : la page
// garde sa place) : après une suppression, et quand « Annuler » rend un voyage entier. focus : ce qui prend
// ensuite le focus, sans faire défiler. Une relecture refusée laisse la liste telle qu'elle est (la panne
// reste au journal).
async function redessiner(app, contexte, parti, focus) {
  let donnees;
  try {
    donnees = await ecranVoyages.charger(contexte);
  } catch (erreur) {
    console.error(erreur);
    return;
  }
  if (parti()) return;
  ecranVoyages.dessiner(app, donnees, contexte);
  app.querySelector(focus)?.focus({ preventScroll: true });
}

// Ce qui prend le focus une fois la carte de ce voyage partie : la carte d'après, sinon celle d'avant, sinon
// « Nouveau voyage » (la liste vide, ou le bouton flottant).
function apresDepart(app, id) {
  const liens = [...app.querySelectorAll('a.carte-voyage')].map(l => l.getAttribute('href'));
  const rang = liens.indexOf(`#/voyage/${encodeURIComponent(id)}`);
  const voisin = liens[rang + 1] ?? liens[rang - 1];
  return voisin ? `a.carte-voyage[href="${CSS.escape(voisin)}"]` : 'a[href="#/nouveau-voyage"]';
}

// Le menu « ⋮ » de chaque carte (src/ecrans/menu-voyage.js), posé à part du lien : la carte ouvre toujours
// le voyage.
function brancherMenus(app, voyages, contexte, { signal, parti }) {
  for (const voyage of voyages) {
    const li = app.querySelector(`#${CSS.escape(`menu-${voyage.id}`)}`)?.parentElement;
    if (!li) continue;
    brancherMenuVoyage(li, cle => {
      if (cle === 'refaire') location.hash = `#/voyages/refaire/${encodeURIComponent(voyage.id)}`;
      else if (cle === 'supprimer') {
        const relire = () => redessiner(app, contexte, parti, apresDepart(app, voyage.id));
        supprimerVoyage({ ...contexte, app, signal, relire }, voyage, { depuis: 'voyages' });
      }
    });
  }
}

// La progression est un plus : sans elle, la liste s'affiche quand même ; la panne reste au journal.
const lireProgressions = async stockage =>
  progressionParVoyage(
    await stockage.etatsDesObjets().catch(erreur => {
      console.error(erreur);
      return [];
    }),
  );

// « Annuler » touché d'ici (le bandeau suit d'un écran à l'autre, src/ecrans/annulation.js), événement
// « voyage-retabli » : un voyage supprimé revient entier (entier), la liste est relue et redessinée, le focus
// sur sa carte ; un retrait d'objet, la carte du voyage rendu relit son avancement, comme Nouveau voyage relit
// la bibliothèque à « bibliotheque-retablie », et rien d'autre ne bouge.
function suivreRetablissements(app, { voyages, aujourdhui }, contexte, { signal, parti }) {
  window.addEventListener(
    'voyage-retabli',
    async ({ detail: { voyageId, entier } }) => {
      if (entier) return redessiner(app, contexte, parti, lienDeCarte(voyageId));
      const progressions = await lireProgressions(contexte.stockage);
      const classes = classerVoyages(voyages, aujourdhui);
      const rubrique = RUBRIQUES.find(r => classes[r].some(v => v.id === voyageId));
      const lien = app.querySelector(lienDeCarte(voyageId));
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
    // La fin de l'écran (un autre écran, ou ce même écran redessiné) retire ses écouteurs et ses questions.
    const fin = suivreFin(app, app.firstElementChild);
    brancherMenus(app, voyages, contexte, fin);
    suivreRetablissements(app, donnees, contexte, fin);
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
