// Les deux blocs que la phase 12 ajoute à Réglages, sous la liste Bibliothèque / Étiquettes (inchangée,
// dessinée par le vrai écran, src/ecrans/reglages.js) :
// - « Thème » : trois choix exclusifs, avec les segments des fiches de modèle (src/styles/fiche-modele.css),
//   un picto devant chaque mot ;
// - « Sauvegarde » : « Sauvegarder » (vert) et la date de la dernière sauvegarde dessous ; « Restaurer une
//   sauvegarde… » (bouton secondaire) et ce qu'il fait dessous.
// Les deux blocs ont la largeur de la liste du dessus ; dès que la place le permet, chaque carte se partage
// en deux colonnes égales, alignées d'une carte à l'autre (maquette.css).
import { echapper } from '../../../src/ecrans/html.js';
import { icone } from './icones.js';
import { TEXTES } from './textes.js';

const T = TEXTES;

// Un segment : un vrai bouton radio, invisible, sur toute la surface (comme segments() de l'appli).
const segment = (valeur, courant) => `
            <label class="segment">
              <input type="radio" name="theme" value="${valeur}" data-theme-choix${valeur === courant ? ' checked' : ''} />
              <span>${icone(valeur)}${echapper(T.theme.choix[valeur])}</span>
            </label>`;

const blocTheme = theme => `
      <section class="reglages-bloc" aria-labelledby="titre-theme">
        <h2 id="titre-theme">${T.theme.titre}</h2>
        <div class="reglages-carte">
          <p class="reglages-aide" id="aide-theme">${echapper(T.theme.aide)}</p>
          <div class="segments segments-theme" role="radiogroup" aria-label="${echapper(T.theme.legende)}" aria-describedby="aide-theme">${['appareil', 'clair', 'sombre'].map(v => segment(v, theme)).join('')}
          </div>
        </div>
      </section>`;

// derniere : la date de la dernière sauvegarde faite d'ici, en toutes lettres, ou null. neuve : elle vient
// d'être faite (un bref fond vert, si l'appareil accepte les animations).
const ligneDerniere = (derniere, neuve) =>
  derniere
    ? `<p class="reglages-date" id="date-sauvegarde"${neuve ? ' data-neuve' : ''}>${echapper(T.sauvegarde.derniere)} <b>${echapper(derniere)}</b></p>`
    : `<p class="reglages-date" id="date-sauvegarde">${echapper(T.sauvegarde.aucune)}</p>`;

const blocSauvegarde = (derniere, neuve) => `
      <section class="reglages-bloc" aria-labelledby="titre-sauvegarde">
        <h2 id="titre-sauvegarde">${T.sauvegarde.titre}</h2>
        <div class="reglages-carte">
          <p class="reglages-aide reglages-entete">${echapper(T.sauvegarde.aide)}</p>
          <div class="reglages-colonne">
            <button type="button" class="bouton bouton-principal" data-geste="sauvegarder" aria-describedby="date-sauvegarde">${icone('sauvegarder')}${T.sauvegarde.sauvegarder}</button>
            ${ligneDerniere(derniere, neuve)}
          </div>
          <div class="reglages-colonne reglages-colonne-seconde">
            <button type="button" class="bouton bouton-secondaire" data-geste="restaurer" aria-describedby="aide-restaurer">${icone('restaurer')}${echapper(T.sauvegarde.restaurer)}</button>
            <p class="reglages-aide" id="aide-restaurer">${echapper(T.sauvegarde.restaurerAide)}</p>
          </div>
        </div>
      </section>`;

export const vueBlocs = ({ theme, derniere, neuve = false }) => `
      <div class="reglages-blocs">${blocTheme(theme)}${blocSauvegarde(derniere, neuve)}
      </div>`;
