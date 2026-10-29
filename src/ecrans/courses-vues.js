// Le HTML de l'écran Courses (src/ecrans/courses.js), d'après la maquette validée le 2026-10-29
// (docs/maquettes/courses/) : le lien retour au voyage, le titre au chariot, le nombre d'objets à acheter,
// une carte par catégorie (sans repli ni compteur) avec la case du sac qui compte les pièces achetées, ou
// l'un des deux écrans vides. Les colonnes du grand format ne tiennent qu'aux styles (courses.css).
import { remplir } from '../i18n/traduction.js';
import { estAAcheter, etatAchat, etatDesCourses } from '../modele/courses.js';
import { pluriel } from './format.js';
import { echapper } from './html.js';
import { iconeInterface, paveCategorie } from './icones.js';
import { lienRetour } from './retour.js';
import mascotte from '../images/baluchon.svg';

// Le nom de la case dit l'état et ce que fera l'appui ; un objet tout juste acheté (sa seconde de répit)
// ne fait plus rien.
function libelleCase(t, objet) {
  const valeurs = { nom: objet.nom, n: objet.achetes, total: objet.quantite };
  if (objet.achetes >= objet.quantite) return remplir(t('courses.case.achete'), valeurs);
  return remplir(t(`courses.case.${objet.quantite === 1 ? 'cocher' : 'ajouter'}`), valeurs);
}

function vueObjet(t, objet) {
  const etat = etatAchat(objet);
  const quantite = etat === 'entame' ? `${objet.achetes}<small> / ${objet.quantite}</small>` : `${objet.quantite}`;
  const quantiteDite = etat === 'entame' ? `${objet.achetes} / ${objet.quantite}` : `${objet.quantite}`;
  const id = echapper(objet.id);
  return `
          <li class="objet" data-id="${id}" data-etat="${etat}">
            <button type="button" class="case" data-action="case-achat" data-id="${id}" aria-label="${echapper(libelleCase(t, objet))}">
              <span class="case-boite" aria-hidden="true">${etat === 'plein' ? iconeInterface('coche') : ''}</span>
            </button>
            <button type="button" class="objet-corps" data-action="fiche-achat" data-id="${id}" aria-label="${echapper(remplir(t('courses.ouvrirFiche'), { nom: objet.nom, quantite: quantiteDite }))}">
              <span class="objet-texte"><span class="objet-nom">${echapper(objet.nom)}</span></span>
              <span class="objet-quantite">${quantite}</span>
              <span class="objet-note"></span>
            </button>
          </li>`;
}

const vueCarte = (t, { categorie, objets }) => `
      <section class="categorie courses-categorie" data-id="${echapper(categorie.id)}">
        <h2 class="categorie-titre">
          <span class="categorie-tete courses-tete">
            ${paveCategorie(categorie)}
            <span class="categorie-nom"><b>${echapper(categorie.nom)}</b></span>
          </span>
        </h2>
        <ul class="objets">${objets.map(o => vueObjet(t, o)).join('')}
        </ul>
      </section>`;

// Aucun objet marqué, ou tout est acheté : la mascotte, ce qu'il en est, et le retour au voyage.
function vueVide(t, quoi, voyageId) {
  return `
      <section class="vide-voyage courses-vide">
        <img src="${mascotte}" alt="" width="88" height="88" />
        <h2>${t(`courses.vide.${quoi}.titre`)}</h2>
        <p>${t(`courses.vide.${quoi}.texte`)}</p>
        <a class="bouton bouton-secondaire" href="#/voyage/${encodeURIComponent(voyageId)}" data-action="retour-voyage">${iconeInterface('retour')}${t('courses.retourVoyage')}</a>
      </section>`;
}

// liste : listeDesCourses (src/modele/courses.js), objets en répit compris.
export function vueCourses({ t, langue }, { contenu, liste }) {
  const { voyage, objets } = contenu;
  const n = objets.filter(estAAcheter).length;
  const lien = lienRetour(t, { adresse: `#/voyage/${encodeURIComponent(voyage.id)}`, libelle: echapper(voyage.nom) });
  const details = n ? `\n      <p class="courses-details">${pluriel(t, 'courses.compte', n, langue)}</p>` : '';
  const corps = liste.length
    ? `
      <div class="courses-cartes">${liste.map(c => vueCarte(t, c)).join('')}
      </div>`
    : vueVide(t, etatDesCourses(objets) === 'faites' ? 'faites' : 'rien', voyage.id);
  return `
      ${lien}
      <h1>${iconeInterface('courses')}${t('courses.titre')}</h1>${details}${corps}`;
}
