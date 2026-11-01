// Nouveau voyage, étape Informations : les trois compteurs Femmes, Hommes, Enfants remplacent
// « Voyageurs », au même endroit, avant le calendrier (décision du chef de projet, 2026-10-25 : ils restent
// visibles au téléphone sans défiler). Un compteur par ligne, dans un cadre de liste ; dès que le champ a la
// place (fenêtre en une colonne), les trois côte à côte, le nom au-dessus (maquette.css). Le total s'écrit au
// bout de la légende ; la ligne du message, réservée, dit l'erreur (personne) ou la limite (20 atteint).
// Le moteur de l'assistant est le vrai (src/ecrans/assistant-controleur.js) : son compteur « Voyageurs » reste
// dans la page, caché, et le total lui est transmis (infos.voyageurs) pour que ses règles s'appliquent.
import { iconeInterface } from '../../../src/ecrans/icones.js';
import { BORNES, GROUPES_COMPOSITION, total } from './composition.js';
import { TEXTES as T } from './textes.js';

const C = T.composition;

function vueLigne(groupe, n, plein) {
  const bouton = (sens, picto, libelle, inactif) =>
    `<button type="button" class="bouton-icone" data-composition="${groupe}" data-sens="${sens}" aria-label="${libelle}"${inactif ? ' aria-disabled="true"' : ''}>${iconeInterface(picto)}</button>`;
  return `
              <li class="composition-ligne">
                <span class="composition-nom" id="nom-${groupe}">${C.groupes[groupe]}</span>
                <span class="compteur" role="group" aria-labelledby="nom-${groupe}">
                  ${bouton(-1, 'moins', C.moins[groupe], n <= 0)}
                  <output class="compteur-valeur" aria-live="polite">${n}</output>
                  ${bouton(1, 'plus', C.plus[groupe], plein || n >= BORNES.max)}
                </span>
              </li>`;
}

// Le message de la ligne réservée : l'erreur (aucune personne) en rouge, la limite atteinte en encre douce ;
// chacun avec son picto, jamais la couleur seule.
function vueMessage(n) {
  if (n === 0) return `${iconeInterface('erreur')}<span>${C.aucun}</span>`;
  if (n >= BORNES.total) return `${iconeInterface('info')}<span>${C.max}</span>`;
  return '';
}

export function vueComposition(c) {
  const n = total(c);
  const plein = n >= BORNES.total;
  return `
          <fieldset class="champ champ-composition" aria-describedby="message-composition">
            <legend><span>${C.legende}</span><span class="composition-total">${C.total(n)}</span></legend>
            <ul class="composition">${GROUPES_COMPOSITION.map(g => vueLigne(g, c[g], plein)).join('')}
            </ul>
            <p class="erreur-champ composition-message" id="message-composition" data-etat="${n === 0 ? 'erreur' : plein ? 'limite' : ''}" aria-live="polite">${vueMessage(n)}</p>
          </fieldset>`;
}

// Pose les compteurs dans l'assistant ouvert (racine : sa fenêtre ou son écran) ; infos : celles du moteur,
// qui reçoivent femmes, hommes, enfants et leur total. Un appui redessine le champ et prévient le moteur
// (il relit les informations à chaque saisie : la rangée d'étapes suit).
export function poserCompteurs(racine, infos) {
  const ancien = racine.querySelector('.champ-voyageurs');
  ancien.style.display = 'none';
  ancien.insertAdjacentHTML('afterend', '<div class="place-composition"></div>');
  const place = ancien.nextElementSibling;
  const peindre = () => (place.innerHTML = vueComposition(infos));
  peindre();
  place.addEventListener('click', evenement => {
    const bouton = evenement.target.closest('[data-composition]');
    if (!bouton || bouton.getAttribute('aria-disabled') === 'true') return;
    const { composition: groupe, sens } = bouton.dataset;
    infos[groupe] = Math.max(0, Math.min(BORNES.max, infos[groupe] + Number(sens)));
    if (total(infos) > BORNES.total) infos[groupe] -= 1;
    infos.voyageurs = total(infos);
    peindre();
    // Le bouton garde le focus ; arrivé à sa borne, le focus passe à son voisin.
    const meme = place.querySelector(`[data-composition="${groupe}"][data-sens="${sens}"]`);
    const voisin = place.querySelector(`[data-composition="${groupe}"][data-sens="${-sens}"]`);
    (meme.getAttribute('aria-disabled') === 'true' ? voisin : meme).focus();
    racine.querySelector('#nom').dispatchEvent(new Event('input', { bubbles: true }));
  });
}
