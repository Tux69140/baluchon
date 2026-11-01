// Écran « À propos » (#/a-propos), dernière entrée du menu (maquette validée, docs/maquettes/bibliotheque-depart/).
// Une carte d'identité (la mascotte, le nom, la version, ce qu'est l'appli) et les deux liens vers le site,
// qui s'ouvrent dans le navigateur du système ; puis une liste claire au cadre de celle de Réglages : appli
// libre (GPL), hors ligne et sans traceur, traduction, crédits. Au téléphone et en tablette portrait, tout
// s'empile ; dès 900 px de large, l'identité en tête, puis deux colonnes : les liens à gauche, la liste à droite.
// Aucun lien GitHub, aucune mention de BagPacker. La version vient de package.json, seule source du numéro.
import { version } from '../../package.json';
import mascotte from '../images/baluchon.svg';
import { echapper } from './html.js';
import { iconeInterface } from './icones.js';
import { barreHaut, ouvrirMenu } from './menu.js';
import { remplir } from '../i18n/traduction.js';

// Les deux adresses du site, définies ici une seule fois (l'activité et la commande de l'appli refusent
// tout ce qui ne commence pas par https://).
const LIENS = [
  { cle: 'decouvrir', adresse: 'https://baluchon.biovibralyon.fr/' },
  { cle: 'versions', adresse: 'https://baluchon.biovibralyon.fr/telecharger' },
];

// L'adresse en clair sous le nom du lien : sans « https:// » ni « / » final.
const affichee = adresse => adresse.replace(/^https:\/\//, '').replace(/\/$/, '');

// Un lien vers le site : son nom, l'adresse en clair dessous, le picto qui dit qu'il sort de l'appli. Le
// libellé lu à voix haute annonce aussi qu'il ouvre le navigateur.
const lien = (t, { cle, adresse }) => {
  const titre = t(`aPropos.${cle}.titre`);
  const aria = remplir(t('aPropos.lienAria'), {
    titre,
    adresse: affichee(adresse),
    navigateur: t('aPropos.navigateur'),
  });
  return `
          <li>
            <a class="reglage a-propos-lien" href="${adresse}" aria-label="${echapper(aria)}">
              <span class="reglage-picto">${iconeInterface(cle)}</span>
              <span class="reglage-texte"><b>${echapper(titre)}</b><span>${affichee(adresse)}</span></span>
              <span class="a-propos-externe">${iconeInterface('externe')}</span>
            </a>
          </li>`;
};

const ligne = (t, cle, textes) => `
          <li class="reglage a-propos-ligne">
            <span class="reglage-picto">${iconeInterface(cle)}</span>
            <span class="reglage-texte"><b>${echapper(t(`aPropos.${cle}.titre`))}</b>${textes.map(c => `<span>${echapper(t(c))}</span>`).join('')}</span>
          </li>`;

export const ecranAPropos = {
  nom: 'a-propos',
  charger: async () => ({}),
  dessiner(app, _donnees, contexte) {
    const { t, stockage } = contexte;
    app.innerHTML = `
    <main class="ecran a-propos">${barreHaut(contexte, { retour: { adresse: '#/voyages', libelle: t('voyages.titre') } })}
      <h1>${echapper(t('aPropos.titre'))}</h1>
      <section class="a-propos-identite" aria-label="${echapper(t('aPropos.nom'))}">
        <img src="${mascotte}" alt="" width="96" height="96" />
        <div>
          <p class="a-propos-nom">${echapper(t('aPropos.nom'))}</p>
          <p class="a-propos-version">${echapper(remplir(t('aPropos.version'), { version }))}</p>
          <p class="a-propos-slogan">${echapper(t('aPropos.slogan'))}</p>
        </div>
      </section>
      <div class="a-propos-colonnes">
        <section aria-labelledby="titre-liens">
          <h2 class="a-propos-titre" id="titre-liens">${echapper(t('aPropos.liens'))}</h2>
          <ul class="reglages a-propos-liens">${LIENS.map(l => lien(t, l)).join('')}
          </ul>
        </section>
        <section aria-labelledby="titre-bref">
          <h2 class="a-propos-titre" id="titre-bref">${echapper(t('aPropos.bref'))}</h2>
          <ul class="reglages a-propos-liste">${ligne(t, 'libre', ['aPropos.libre.texte'])}${ligne(t, 'horsLigne', ['aPropos.horsLigne.texte'])}${ligne(t, 'traduction', ['aPropos.traduction.texte'])}${ligne(t, 'credits', ['aPropos.credits.pictos', 'aPropos.credits.polices'])}
          </ul>
        </section>
      </div>
    </main>`;
    app
      .querySelector('[data-action="menu"]')
      .addEventListener('click', () => ouvrirMenu(contexte, { courant: 'a-propos' }));
    // Le lien reste un vrai lien (clavier, lecteur d'écran) mais ne mène pas la page : c'est le système
    // qui ouvre l'adresse, dans son navigateur.
    app.querySelector('.a-propos-liens').addEventListener('click', evenement => {
      const cible = evenement.target.closest('a.a-propos-lien');
      if (!cible) return;
      evenement.preventDefault();
      stockage.ouvrirLien(cible.getAttribute('href')).catch(console.error);
    });
  },
};
