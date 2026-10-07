// Écran d'un voyage (#/voyage/:id), en lecture seule pour la phase 2 : ses catégories dans l'ordre de
// la bibliothèque, chacune avec son pavé, et ses objets par ordre alphabétique avec leur quantité.
// Les coches arrivent en phase 3, les corrections en phase 8.
import { echapper } from './html.js';
import { detailsVoyage } from './format.js';
import { paveCategorie } from './icones.js';
import { lienRetour } from './retour.js';
import { listeParCategorie } from '../modele/voyage.js';

function vueCategorie({ categorie, objets }) {
  const id = `categorie-${echapper(categorie.id)}`;
  return `
      <section class="categorie" data-id="${echapper(categorie.id)}" aria-labelledby="${id}">
        <div class="categorie-entete">
          ${paveCategorie(categorie)}
          <h2 id="${id}">${echapper(categorie.nom)}</h2>
        </div>
        <ul class="objets">${objets
          .map(
            o => `
          <li class="objet"><span class="objet-nom">${echapper(o.nom)}</span><span class="objet-quantite">${o.quantite}</span></li>`,
          )
          .join('')}
        </ul>
      </section>`;
}

export const ecranVoyage = {
  nom: 'voyage',
  charger: async ({ stockage, parametre }) => ({ contenu: await stockage.lireVoyage(decodeURIComponent(parametre)) }),
  dessiner(app, { contenu }, { t, langue }) {
    if (!contenu) {
      app.innerHTML = `
    <main class="ecran">
      ${lienRetour(t)}
      <p class="message message-erreur" role="alert">${t('voyage.introuvable')}</p>
    </main>`;
      return;
    }
    const { voyage } = contenu;
    const destination = voyage.destination ? `<p>${echapper(voyage.destination)}</p>` : '';
    app.innerHTML = `
    <main class="ecran">
      ${lienRetour(t)}
      <h1>${echapper(voyage.nom)}</h1>
      <div class="voyage-entete">
        ${destination}
        <p class="voyage-details">${echapper(detailsVoyage(t, voyage, langue))}</p>
      </div>
      <div class="categories">${listeParCategorie(contenu).map(vueCategorie).join('')}
      </div>
    </main>`;
  },
};
