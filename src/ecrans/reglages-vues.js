// Les deux blocs que la phase 12 ajoute à Réglages, sous la liste Bibliothèque / Étiquettes (maquette
// validée le 2026-10-31, docs/maquettes/reglages/) :
// - « Thème » : trois choix exclusifs, avec les segments des fiches de modèle, un picto devant chaque mot ;
// - « Sauvegarde » : « Sauvegarder » (vert) et la date de la dernière sauvegarde dessous ; « Restaurer une
//   sauvegarde… » (bouton secondaire) et ce qu'il fait dessous.
// Les deux blocs ont la largeur de la liste du dessus ; dès 700 px, chaque carte se partage en deux colonnes
// égales, alignées d'une carte à l'autre (src/styles/reglages.css).
import { echapper } from './html.js';
import { iconeInterface } from './icones.js';
import { segments } from './fiche-modele-vues.js';

const THEMES = ['appareil', 'clair', 'sombre'];

const blocTheme = (t, theme) => `
      <section class="reglages-bloc" aria-labelledby="titre-theme">
        <h2 id="titre-theme">${t('reglages.theme.titre')}</h2>
        <div class="reglages-carte">
          <p class="reglages-aide" id="aide-theme">${echapper(t('reglages.theme.aide'))}</p>${segments(
            'theme',
            t('reglages.theme.legende'),
            THEMES.map(v => [v, t(`reglages.theme.${v}`), iconeInterface(v)]),
            theme,
            {},
            { classe: 'segments-theme', decrit: 'aide-theme' },
          )}
        </div>
      </section>`;

// derniere : la date de la dernière sauvegarde faite d'ici, en toutes lettres, ou null. neuve : elle vient
// d'être faite (un bref fond vert, si l'appareil accepte les animations).
export const ligneDerniere = (t, derniere, neuve = false) =>
  derniere
    ? `<p class="reglages-date" id="date-sauvegarde"${neuve ? ' data-neuve' : ''}>${echapper(t('reglages.sauvegarde.derniere'))} <b>${echapper(derniere)}</b></p>`
    : `<p class="reglages-date" id="date-sauvegarde">${echapper(t('reglages.sauvegarde.aucune'))}</p>`;

// « Restaurer une sauvegarde… » ouvre le sélecteur de fichiers du système par le champ caché dessous : le
// bouton reste le seul point d'entrée, au clavier comme au doigt.
const blocSauvegarde = (t, derniere) => `
      <section class="reglages-bloc" aria-labelledby="titre-sauvegarde">
        <h2 id="titre-sauvegarde">${t('reglages.sauvegarde.titre')}</h2>
        <div class="reglages-carte">
          <p class="reglages-aide reglages-entete">${echapper(t('reglages.sauvegarde.aide'))}</p>
          <div class="reglages-colonne">
            <button type="button" class="bouton bouton-principal" data-geste="sauvegarder" aria-describedby="date-sauvegarde">${iconeInterface('sauvegarder')}${t('reglages.sauvegarde.sauvegarder')}</button>
            ${ligneDerniere(t, derniere)}
          </div>
          <div class="reglages-colonne reglages-colonne-seconde">
            <button type="button" class="bouton bouton-secondaire" data-geste="restaurer" aria-describedby="aide-restaurer">${iconeInterface('restaurer')}${echapper(t('reglages.sauvegarde.restaurer'))}</button>
            <p class="reglages-aide" id="aide-restaurer">${echapper(t('reglages.sauvegarde.restaurerAide'))}</p>
            <input type="file" accept=".json,application/json" data-champ="fichier" hidden tabindex="-1" aria-hidden="true" />
          </div>
        </div>
      </section>`;

export const vueBlocs = (t, { theme, derniere }) => `
      <div class="reglages-blocs">${blocTheme(t, theme)}${blocSauvegarde(t, derniere)}
      </div>`;
