// Écran Voyages (#/voyages), l'accueil : la liste des voyages ou, au premier lancement, l'écran
// vide qui invite à créer le premier (US-29). Le classement des voyages arrive en phase 2.
import { echapper } from './html.js';
import mascotte from '../images/baluchon.svg';

function vueVide(t) {
  return `
    <section class="vide">
      <img src="${mascotte}" alt="" width="96" height="96" />
      <h2>${t('voyages.vide.titre')}</h2>
      <p>${t('voyages.vide.texte')}</p>
      <a class="bouton bouton-principal" href="#/nouveau-voyage">${t('voyages.nouveau')}</a>
    </section>`;
}

const vueListe = voyages => `
    <ul class="voyages">
      ${voyages.map(v => `<li>${echapper(v.nom)}</li>`).join('')}
    </ul>`;

export const ecranVoyages = {
  nom: 'voyages',
  charger: async ({ stockage }) => ({ voyages: await stockage.listerVoyages() }),
  dessiner(app, { voyages }, { t }) {
    app.innerHTML = `
    <main class="ecran">
      <h1>${t('voyages.titre')}</h1>
      ${voyages.length ? vueListe(voyages) : vueVide(t)}
    </main>`;
  },
};

export function vueErreur({ t }) {
  return `
    <main class="ecran">
      <h1>${t('voyages.titre')}</h1>
      <p class="message message-erreur" role="alert">${t('erreurs.lecture')}</p>
    </main>`;
}
