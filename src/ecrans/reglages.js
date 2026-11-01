// Écran Réglages (#/reglages), ouvert depuis le menu : la Bibliothèque (maquette validée le 2026-10-25,
// docs/maquettes/bibliotheque/), les Étiquettes (maquette de la phase 6, docs/maquettes/etiquettes/), puis,
// depuis la phase 12, le Thème et la Sauvegarde (maquette docs/maquettes/reglages/, disposition dans
// reglages-vues.js). Le thème choisi s'applique aussitôt et se retient sur l'appareil ; « Sauvegarder »
// dépose un fichier dans Téléchargements (src/ecrans/sauvegarde.js) et la date de la dernière sauvegarde se
// met à jour.
import { formaterInstant } from './format.js';
import { iconeInterface } from './icones.js';
import { barreHaut, ouvrirMenu } from './menu.js';
import { suivreFin } from './mode-rangement.js';
import { ligneDerniere, vueBlocs } from './reglages-vues.js';
import { sauvegarder } from './sauvegarde.js';
import { appliquerTheme } from './theme.js';

// Une ligne : son picto, son titre et sa phrase d'aide.
const ligne = (adresse, picto, titre, aide) => `
        <li>
          <a class="reglage" href="${adresse}">
            <span class="reglage-picto">${iconeInterface(picto)}</span>
            <span class="reglage-texte"><b>${titre}</b><span>${aide}</span></span>
            <span class="chevron">${iconeInterface('suivant')}</span>
          </a>
        </li>`;

// La date de la dernière sauvegarde de cet appareil, en toutes lettres, ou null.
function derniereSauvegarde({ stockage, t, langue }) {
  const iso = stockage.lireDerniereSauvegarde();
  return iso ? formaterInstant(t, iso, langue) : null;
}

export const ecranReglages = {
  nom: 'reglages',
  charger: async () => ({}),
  dessiner(app, _donnees, contexte) {
    const { t, stockage } = contexte;
    const lignes = [
      ligne('#/bibliotheque', 'bibliotheque', t('reglages.bibliotheque'), t('reglages.bibliothequeAide')),
      ligne('#/etiquettes', 'etiquette', t('reglages.etiquettes'), t('reglages.etiquettesAide')),
    ];
    app.innerHTML = `
    <main class="ecran">${barreHaut(contexte, { retour: { adresse: '#/voyages', libelle: t('voyages.titre') } })}
      <h1>${t('reglages.titre')}</h1>
      <ul class="reglages">${lignes.join('')}
      </ul>${vueBlocs(t, { theme: stockage.lireTheme(), derniere: derniereSauvegarde(contexte) })}
    </main>`;
    const main = app.querySelector('main');
    const { signal } = suivreFin(app, main);
    app
      .querySelector('[data-action="menu"]')
      .addEventListener('click', () => ouvrirMenu(contexte, { courant: 'reglages' }));
    // Le thème : posé aussitôt, retenu sur l'appareil.
    main.addEventListener('change', evenement => {
      if (!evenement.target.matches('[data-choix="theme"]')) return;
      stockage.ecrireTheme(evenement.target.value);
      appliquerTheme(stockage);
    });
    // Un seul dépôt à la fois ; la date se met à jour (avec un bref fond vert) si elle a changé, sans
    // redessiner l'écran : le bouton garde le focus.
    let enCours = false;
    main.querySelector('[data-geste="sauvegarder"]').addEventListener('click', async () => {
      if (enCours) return;
      enCours = true;
      try {
        const avant = stockage.lireDerniereSauvegarde();
        await sauvegarder(contexte, { app, signal });
        if (!main.isConnected || stockage.lireDerniereSauvegarde() === avant) return;
        main.querySelector('#date-sauvegarde').outerHTML = ligneDerniere(t, derniereSauvegarde(contexte), true);
      } finally {
        enCours = false;
      }
    });
  },
};
