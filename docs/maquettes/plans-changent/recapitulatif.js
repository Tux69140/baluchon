// Le récapitulatif des changements, dernière étape de l'assistant « Modifier le voyage » (à la place de
// l'aperçu). Il reprend le dessin de l'aperçu (src/ecrans/assistant-vues.js, src/styles/assistant-apercu.css) :
// une carte par catégorie, une ligne-case par objet ; ce qui est neuf : la colonne « avant → après », ce que
// le changement veut dire pour le sac, le choix Garder / Recalculer d'une quantité fixée à la main.
import { echapper } from '../../../src/ecrans/html.js';
import { iconeInterface, paveCategorie } from '../../../src/ecrans/icones.js';
import { nombreAcceptes } from './donnees.js';
import { pastilleSortir } from './sortir.js';

const boite = coche => `<span class="case-boite" aria-hidden="true">${coche ? iconeInterface('coche') : ''}</span>`;
const fleche = (a, b) => `${a}<span class="recap-fleche" aria-hidden="true">→</span>${b}`;
const plusieurs = (n, un, autres) => (n > 1 ? autres : un);

// Ce que le changement veut dire pour le sac, quand il est accepté.
function effetSurLeSac(apres, dansLeSac) {
  if (!dansLeSac) return '';
  const ecart = apres - dansLeSac;
  if (ecart > 0) return `<span>encore ${ecart} à mettre</span>`;
  if (ecart < 0) return pastilleSortir(-ecart);
  return '<span>déjà tout dans le sac</span>';
}

function sousTexte(l, accepte) {
  if (l.type === 'quantite') return accepte ? effetSurLeSac(l.apres, l.dansLeSac) : `<span>reste à ${l.avant}</span>`;
  if (l.type === 'entree')
    return accepte ? `<span>nouveau · pour « ${echapper(l.etiquette)} »</span>` : '<span>ne sera pas ajouté</span>';
  // Sortie : rien n'est retiré d'office (US-27) ; coché, l'objet sort de la liste, ou reste barré tant
  // que ses pièces sont dans le sac.
  const raison = l.etiquette ? `« ${echapper(l.etiquette)} » retirée` : 'plus aucune pièce prévue';
  if (!accepte) return `<span>${raison} · reste dans le voyage</span>`;
  return `<span>${raison} · sera retiré</span>${l.dansLeSac ? pastilleSortir(l.dansLeSac) : ''}`;
}

function valeur(l) {
  if (l.type === 'entree') return `+&#8239;${l.apres}`;
  return fleche(l.avant, l.apres);
}

// Le nom de la case reprend tout ce que la ligne dit, et ce que fera l'appui.
function nomDeLaCase(l, accepte) {
  const quoi = {
    quantite: `${l.nom} : ${l.avant} → ${l.apres}`,
    entree: `${l.nom} : ajouter ${l.apres}`,
    sortie: `${l.nom} : retirer du voyage`,
  }[l.type];
  return `${quoi}, ${accepte ? 'sera appliqué' : 'ne sera pas appliqué'}`;
}

function ligneACocher(l, accepte) {
  return `
              <li><button type="button" class="apercu-objet recap-ligne" role="checkbox" aria-checked="${accepte}" aria-label="${echapper(nomDeLaCase(l, accepte))}" data-coche="${accepte ? 'plein' : 'vide'}" data-ligne="${l.id}" data-type="${l.type}">
                ${boite(accepte)}<span class="objet-texte"><span class="objet-nom">${echapper(l.nom)}</span><span class="objet-sous">${sousTexte(l, accepte)}</span></span><span class="recap-valeur">${valeur(l)}</span>
              </button></li>`;
}

// Une quantité fixée à la main : gardée par défaut ; « Recalculer » est un choix explicite (deux
// segments, comme ceux des fiches de modèle).
function ligneManuelle(l, recalculer) {
  const nom = `m-${l.id}`;
  const effet = recalculer ? effetSurLeSac(l.apres, l.dansLeSac) : '';
  return `
              <li class="recap-manuelle" data-ligne-manuelle="${l.id}">
                <div class="recap-ligne-fixe">
                  <span class="recap-signe">${iconeInterface('modifier')}</span><span class="objet-texte"><span class="objet-nom">${echapper(l.nom)}</span><span class="objet-sous"><span>fixée manuellement : ${l.avant} · le calcul donne ${l.apres}</span>${effet}</span></span><span class="recap-valeur">${recalculer ? fleche(l.avant, l.apres) : l.avant}</span>
                </div>
                <div class="segments recap-segments" role="radiogroup" aria-label="${echapper(l.nom)} : quantité">
                  <label class="segment"><input type="radio" name="${nom}" value="garder" data-manuelle="${l.id}"${recalculer ? '' : ' checked'} /><span>Garder ${l.avant}</span></label>
                  <label class="segment"><input type="radio" name="${nom}" value="recalculer" data-manuelle="${l.id}"${recalculer ? ' checked' : ''} /><span>Recalculer : ${l.apres}</span></label>
                </div>
              </li>`;
}

function carte({ categorie, lignes }, choix) {
  const items = lignes.map(l =>
    l.type === 'manuelle' ? ligneManuelle(l, choix.get(l.id)) : ligneACocher(l, choix.get(l.id)),
  );
  return `
            <section class="categorie apercu-categorie recap-categorie">
              <h4 class="categorie-titre recap-tete">${paveCategorie(categorie)}<span class="categorie-nom"><b>${echapper(categorie.nom)}</b></span></h4>
              <ul class="objets">${items.join('')}
              </ul>
            </section>`;
}

// modifs : ce qui a changé dans les informations, en petites puces (« 3 jours au lieu de 4 »…).
export function vueRecapitulatif({ parCategorie, choix, rappel, modifs }) {
  const total = parCategorie.flatMap(c => c.lignes).length;
  const n = nombreAcceptes(parCategorie, choix);
  const titre = total ? `${n} changement${plusieurs(n, '', 's')} à appliquer sur ${total}` : 'Aucun objet ne change';
  const puces = modifs.map(m => `<li>${m}</li>`).join('');
  return `
          <section class="apercu recapitulatif" aria-labelledby="titre-etape">
            <div class="apercu-tete">
              <h3 class="etape-titre" id="titre-etape" tabindex="-1" aria-live="polite">${titre}</h3>
              <p class="apercu-rappel">${rappel}</p>
              <ul class="recap-modifs" aria-label="Ce qui change">${puces}</ul>
              <p class="etape-aide">Cochez les changements à appliquer : ce qui n’est pas coché reste tel quel. Rien n’est enregistré avant « Appliquer les changements ».</p>
            </div>
            ${
              total
                ? `<div class="apercu-categories">${parCategorie.map(c => carte(c, choix)).join('')}
            </div>`
                : '<p class="message message-info" role="status"><span>Aucun objet ne change : « Appliquer les changements » enregistre seulement les nouvelles informations.</span></p>'
            }
          </section>`;
}
