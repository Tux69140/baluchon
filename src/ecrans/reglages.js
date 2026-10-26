// Écran Réglages (#/reglages), ouvert depuis le menu : la Bibliothèque (maquette validée le 2026-10-25,
// docs/maquettes/bibliotheque/), puis les Étiquettes (maquette de la phase 6, docs/maquettes/etiquettes/).
// Rien à lire : tout est dans les textes.
import { iconeInterface } from './icones.js';
import { barreHaut, ouvrirMenu } from './menu.js';

// Une ligne : son picto, son titre et sa phrase d'aide.
const ligne = (adresse, picto, titre, aide) => `
        <li>
          <a class="reglage" href="${adresse}">
            <span class="reglage-picto">${iconeInterface(picto)}</span>
            <span class="reglage-texte"><b>${titre}</b><span>${aide}</span></span>
            <span class="chevron">${iconeInterface('suivant')}</span>
          </a>
        </li>`;

export const ecranReglages = {
  nom: 'reglages',
  charger: async () => ({}),
  dessiner(app, _donnees, contexte) {
    const { t } = contexte;
    const lignes = [
      ligne('#/bibliotheque', 'bibliotheque', t('reglages.bibliotheque'), t('reglages.bibliothequeAide')),
      ligne('#/etiquettes', 'etiquette', t('reglages.etiquettes'), t('reglages.etiquettesAide')),
    ];
    app.innerHTML = `
    <main class="ecran">${barreHaut(contexte, { retour: { adresse: '#/voyages', libelle: t('voyages.titre') } })}
      <h1>${t('reglages.titre')}</h1>
      <ul class="reglages">${lignes.join('')}
      </ul>
    </main>`;
    app
      .querySelector('[data-action="menu"]')
      .addEventListener('click', () => ouvrirMenu(contexte, { courant: 'reglages' }));
  },
};
