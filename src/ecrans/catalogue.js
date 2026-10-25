// Le catalogue des pictos (spec de la phase 5 ; maquette validée le 2026-10-25,
// docs/maquettes/bibliotheque/, états « catalogue… ») : 80 pictos de voyage en dix thèmes, et une
// recherche par nom ou mot-clé. Il s'ouvre par-dessus la fiche d'une catégorie ; une tuile touchée le
// referme et rend son picto. Sa hauteur est fixe (src/styles/fiche-modele.css) : la recherche ne la
// fait pas bouger.
import { remplir } from '../i18n/traduction.js';
import { CATALOGUE, chercherPictos } from '../modele/catalogue.js';
import { ouvrirFenetre, vueFenetre } from './fenetre.js';
import { pluriel } from './format.js';
import { echapper } from './html.js';
import { iconeInterface, paveCategorie } from './icones.js';
import { svgPicto } from './pictos.js';

function vueCatalogue(t) {
  const gabarit = document.createElement('template');
  gabarit.innerHTML = vueFenetre({
    t,
    idTitre: 'catalogue-titre',
    titre: t('catalogue.titre'),
    contenu: `
      <div class="catalogue-recherche">
        <span class="champ-loupe">${iconeInterface('chercher')}<input type="search" aria-label="${t('catalogue.chercher')}" placeholder="${t('catalogue.indication')}" autocomplete="off" /></span>
        <p class="catalogue-compte" aria-live="polite"></p>
      </div>
      <div class="fiche-corps catalogue-corps"></div>`,
  });
  const fenetre = gabarit.content.firstElementChild;
  fenetre.classList.add('fiche', 'catalogue');
  return fenetre;
}

// icone, couleur : le picto courant (sa tuile est pressée, dans le pavé de sa couleur). Rend une
// promesse : la clé du picto touché, ou null (fermé sans choix, ou l'écran parti avec signal).
export function ouvrirCatalogue({ t, langue, icone, couleur, signal, dans }) {
  const pictos = CATALOGUE.flatMap(({ theme, pictos: siens }) =>
    siens.map(cle => ({
      cle,
      theme,
      nom: t(`catalogue.pictos.${cle}.nom`),
      mots: t(`catalogue.pictos.${cle}.mots`),
    })),
  );
  const fenetre = vueCatalogue(t);
  const zone = fenetre.querySelector('.catalogue-corps');
  const compte = fenetre.querySelector('.catalogue-compte');
  const champ = fenetre.querySelector('input');

  const tuile = ({ cle, nom }) => {
    const courant = cle === icone;
    const picto = courant
      ? paveCategorie({ icone: cle, couleur })
      : `<span class="tuile-picto" aria-hidden="true">${svgPicto(cle)}</span>`;
    return `<button type="button" class="tuile" data-picto="${echapper(cle)}" aria-pressed="${courant}">${picto}<span class="tuile-nom">${echapper(nom)}</span></button>`;
  };
  const grille = liste => `<div class="grille-pictos">${liste.map(tuile).join('')}</div>`;

  // Sans mot : tout le catalogue, par thème ; avec : les pictos trouvés, ou le message qui le dit.
  function peindre() {
    const mot = champ.value.trim();
    if (!mot) {
      compte.textContent = pluriel(t, 'catalogue.compte', pictos.length, langue);
      zone.innerHTML = CATALOGUE.map(
        ({ theme }) => `
        <section class="theme"><h3>${t(`catalogue.themes.${theme}`)}</h3>${grille(pictos.filter(p => p.theme === theme))}</section>`,
      ).join('');
      return;
    }
    const trouves = chercherPictos(pictos, mot);
    compte.textContent = trouves.length
      ? remplir(pluriel(t, 'catalogue.trouves', trouves.length, langue), { mot })
      : '';
    zone.innerHTML = trouves.length
      ? grille(trouves)
      : `<p class="catalogue-vide">${echapper(remplir(t('catalogue.aucun'), { mot }))}</p>`;
    zone.scrollTop = 0;
  }

  return new Promise(resoudre => {
    let choisi = null;
    const effacer = () => {
      fenetre.remove();
      resoudre(choisi);
    };
    champ.addEventListener('input', peindre);
    peindre();
    dans.append(fenetre);
    signal.addEventListener('abort', effacer, { once: true });
    const fermer = ouvrirFenetre(fenetre, {
      fermerSurVoile: true,
      fermerAuRetour: true,
      surFermeture: () => {
        signal.removeEventListener('abort', effacer);
        effacer();
      },
    });
    fenetre.addEventListener('click', evenement => {
      const touchee = evenement.target.closest('[data-picto]');
      if (!touchee) return;
      choisi = touchee.dataset.picto;
      fermer();
    });
    // Le picto courant au milieu de la vue : on voit d'abord ce qu'on remplacerait. Seule la grille
    // défile (scrollIntoView ferait aussi bouger la page derrière).
    const courante = zone.querySelector('[aria-pressed="true"]')?.getBoundingClientRect();
    const cadre = zone.getBoundingClientRect();
    if (courante) zone.scrollTop += courante.top - cadre.top - (cadre.height - courante.height) / 2;
    fenetre.querySelector('h2').focus();
  });
}
