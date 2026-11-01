// « À propos » (conception, décision 10) : la dernière entrée du menu, après Réglages, et son écran. Une
// carte d'identité (la mascotte, le nom, la version, ce qu'est l'appli) et les deux liens vers le site, qui
// s'ouvrent dans le navigateur du système ; puis une liste claire, au cadre de celle de Réglages : appli
// libre (GPL), hors ligne et sans traceur, traduction, crédits. Au téléphone et en tablette portrait, tout
// s'empile ; dès 900 px de large, l'identité en tête, puis deux colonnes : les liens à gauche, la liste à droite.
// Aucun lien GitHub, aucune mention de BagPacker. Le bouton du menu est branché par maquette.js.
import { version } from '../../../package.json';
import { echapper } from '../../../src/ecrans/html.js';
import { barreHaut, ouvrirMenu } from '../../../src/ecrans/menu.js';
import mascotte from '../../../src/images/baluchon.svg';
import { icone } from './icones.js';
import { TEXTES } from './textes.js';

const A = TEXTES.aPropos;

// Le vrai menu de l'appli, plus sa dernière entrée ; courant : 'voyages', 'reglages' ou 'a-propos'.
export function ouvrirMenuComplet(contexte, courant) {
  ouvrirMenu(contexte, { courant });
  const liste = document.querySelector('.tiroir .tiroir-liste');
  liste.insertAdjacentHTML(
    'beforeend',
    `
          <li><a class="tiroir-lien" href="#/a-propos"${courant === 'a-propos' ? ' aria-current="page"' : ''}>${icone('aPropos')}${A.menu}</a></li>`,
  );
}

// Un lien vers le site : son nom, l'adresse en clair dessous, le picto qui dit qu'il sort de l'appli.
const lien = (cle, { titre, adresse, affiche }) => `
          <li>
            <a class="reglage a-propos-lien" href="${adresse}" target="_blank" rel="noopener" aria-label="${echapper(`${titre}, ${affiche}, ${A.navigateur}`)}">
              <span class="reglage-picto">${icone(cle)}</span>
              <span class="reglage-texte"><b>${titre}</b><span>${affiche}</span></span>
              <span class="a-propos-externe">${icone('externe')}</span>
            </a>
          </li>`;

const ligne = (cle, titre, textes) => `
          <li class="reglage a-propos-ligne">
            <span class="reglage-picto">${icone(cle)}</span>
            <span class="reglage-texte"><b>${titre}</b>${textes.map(t => `<span>${echapper(t)}</span>`).join('')}</span>
          </li>`;

export function dessinerAPropos(app, contexte) {
  const { t } = contexte;
  app.innerHTML = `
    <main class="ecran a-propos">${barreHaut(contexte, { retour: { adresse: '#/voyages', libelle: t('voyages.titre') } })}
      <h1>${A.titre}</h1>
      <section class="a-propos-identite" aria-label="${A.nom}">
        <img src="${mascotte}" alt="" width="96" height="96" />
        <div>
          <p class="a-propos-nom">${A.nom}</p>
          <p class="a-propos-version">${A.version(version)}</p>
          <p class="a-propos-slogan">${A.slogan}</p>
        </div>
      </section>
      <div class="a-propos-colonnes">
        <section aria-labelledby="titre-liens">
          <h2 class="a-propos-titre" id="titre-liens">${A.liens}</h2>
          <ul class="reglages a-propos-liens">${lien('decouvrir', A.decouvrir)}${lien('versions', A.versions)}
          </ul>
        </section>
        <section aria-labelledby="titre-bref">
          <h2 class="a-propos-titre" id="titre-bref">${A.bref}</h2>
          <ul class="reglages a-propos-liste">${ligne('libre', A.libre.titre, [A.libre.texte])}${ligne('horsLigne', A.horsLigne.titre, [A.horsLigne.texte])}${ligne('traduction', A.traduction.titre, [A.traduction.texte])}${ligne('credits', A.credits.titre, A.credits.lignes)}
          </ul>
        </section>
      </div>
    </main>`;
}
