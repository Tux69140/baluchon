// Écran Réglages (#/reglages), ouvert depuis le menu : pour l'instant une seule ligne, la Bibliothèque
// (maquette validée le 2026-10-25, docs/maquettes/bibliotheque/). Rien à lire : tout est dans les textes.
import { iconeInterface } from './icones.js';
import { barreHaut, ouvrirMenu } from './menu.js';

export const ecranReglages = {
  nom: 'reglages',
  charger: async () => ({}),
  dessiner(app, _donnees, contexte) {
    const { t } = contexte;
    app.innerHTML = `
    <main class="ecran">${barreHaut(contexte, { retour: { adresse: '#/voyages', libelle: t('voyages.titre') } })}
      <h1>${t('reglages.titre')}</h1>
      <ul class="reglages">
        <li>
          <a class="reglage" href="#/bibliotheque">
            <span class="reglage-picto">${iconeInterface('bibliotheque')}</span>
            <span class="reglage-texte"><b>${t('reglages.bibliotheque')}</b><span>${t('reglages.bibliothequeAide')}</span></span>
            <span class="chevron">${iconeInterface('suivant')}</span>
          </a>
        </li>
      </ul>
    </main>`;
    app
      .querySelector('[data-action="menu"]')
      .addEventListener('click', () => ouvrirMenu(contexte, { courant: 'reglages' }));
  },
};
