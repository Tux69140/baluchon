// Les trois compteurs Femmes, Hommes, Enfants de l'étape Informations (maquette validée le 2026-11-01,
// docs/maquettes/bibliotheque-depart/) : un compteur par ligne, dans un cadre de liste ; dès que le champ a
// la place, les trois côte à côte (src/styles/nouveau-voyage.css). Le total s'écrit au bout de la légende ;
// la ligne du message, toujours réservée, dit l'erreur (personne) ou la limite (20 atteint). Rien que du
// dessin : les bornes et le total viennent du modèle (src/modele/composition.js).
import { BORNES_COMPOSITION, GROUPES_COMPOSITION, totalVoyageurs } from '../modele/composition.js';
import { remplir } from '../i18n/traduction.js';
import { iconeInterface } from './icones.js';

const k = cle => `nouveauVoyage.composition.${cle}`;

function vueLigne(t, groupe, n, plein) {
  const bouton = (sens, picto, libelle, inactif) =>
    `<button type="button" class="bouton-icone" data-groupe="${groupe}" data-pas="${sens}" aria-label="${libelle}"${inactif ? ' aria-disabled="true"' : ''}>${iconeInterface(picto)}</button>`;
  return `
              <li class="composition-ligne">
                <span class="composition-nom" id="nom-${groupe}">${t(k(`groupes.${groupe}`))}</span>
                <span class="compteur" role="group" aria-labelledby="nom-${groupe}">
                  ${bouton(-1, 'moins', t(k(`moins.${groupe}`)), n <= BORNES_COMPOSITION.min)}
                  <output class="compteur-valeur" aria-live="polite">${n}</output>
                  ${bouton(1, 'plus', t(k(`plus.${groupe}`)), plein || n >= BORNES_COMPOSITION.max)}
                </span>
              </li>`;
}

// Le message : l'erreur (aucune personne) en rouge, la limite atteinte en encre douce ; chacun avec son
// picto, jamais la couleur seule.
// L'erreur n'est dite qu'une fois le passage à l'étape suivante tenté (`essaye`), comme celles du nom
// et des dates : un départ à 0 n'est pas une faute.
function vueMessage(t, n, essaye) {
  if (n < 1) return !essaye ? '' : `${iconeInterface('erreur')}<span>${t(k('aucun'))}</span>`;
  if (n >= BORNES_COMPOSITION.total) return `${iconeInterface('info')}<span>${t(k('max'))}</span>`;
  return '';
}

export function vueComposition(t, c, essaye) {
  const n = totalVoyageurs(c);
  const plein = n >= BORNES_COMPOSITION.total;
  const etat = n < 1 ? (essaye ? 'erreur' : '') : plein ? 'limite' : '';
  return `
          <fieldset class="champ champ-composition" aria-describedby="message-composition">
            <legend><span>${t(k('legende'))}</span><span class="composition-total">${remplir(t(k('total')), { n })}</span></legend>
            <ul class="composition">${GROUPES_COMPOSITION.map(g => vueLigne(t, g, c[g], plein)).join('')}
            </ul>
            <p class="erreur-champ composition-message" id="message-composition" data-etat="${etat}" aria-live="polite">${vueMessage(t, n, essaye)}</p>
          </fieldset>`;
}
