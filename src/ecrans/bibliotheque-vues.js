// Le HTML de l'écran Bibliothèque (src/ecrans/bibliotheque.js), d'après la maquette validée le
// 2026-10-25 (docs/maquettes/bibliotheque/) : en-tête, cartes de catégorie en accordéon ou deux
// panneaux (choix à gauche, détail à droite), lignes d'objet modèle, rangement des catégories. Rien ne
// vit ici que du dessin : l'ordre, les dépliées et la choisie viennent de l'écran.
import { remplir } from '../i18n/traduction.js';
import { decrireRegle, pluriel } from './format.js';
import { echapper } from './html.js';
import { iconeInterface, paveCategorie } from './icones.js';
import { barreHaut } from './menu.js';

// Les étiquettes d'un modèle en petites puces, sans geste ; rien s'il n'en a pas.
function puces({ etiquettes }, ids) {
  const noms = ids.map(id => etiquettes.get(id)).filter(nom => nom !== undefined);
  if (!noms.length) return '';
  return `<span class="puces-mini">${noms.map(nom => `<span>${echapper(nom)}</span>`).join('')}</span>`;
}

// Sous le nom : le nombre d'objets, puis « Toujours incluse » ou les étiquettes qui la font proposer.
function infosCategorie(vue, { categorie, objets }) {
  const { t, langue } = vue;
  const nombre = pluriel(t, 'bibliotheque.objets', objets.length, langue);
  const inclusion = categorie.toujoursIncluse ? `${nombre} · ${t('bibliotheque.toujoursIncluse')}` : nombre;
  const siennes = categorie.toujoursIncluse ? '' : puces(vue, categorie.etiquettes);
  return `<span class="categorie-infos"><span class="inclusion">${inclusion}</span>${siennes}</span>`;
}

// La ligne d'un objet modèle : son nom, sa règle de quantité, « consommable », ses étiquettes, ⓘ s'il
// a une note ; toute la ligne ouvre sa fiche.
function ligneObjet(vue, objet) {
  const { t } = vue;
  const consommable = objet.consommable ? `<span>${t('bibliotheque.consommable')}</span>` : '';
  const siennes = objet.toujoursInclus ? '' : puces(vue, objet.etiquettes);
  const note = objet.note ? `${iconeInterface('info')}<span class="lecteur">, ${t('voyage.avecNote')}</span>` : '';
  return `
          <li class="objet objet-modele">
            <button type="button" class="objet-corps" data-action="modifier-objet" data-id="${echapper(objet.id)}">
              <span class="objet-texte">
                <span class="objet-nom">${echapper(objet.nom)}</span>
                <span class="objet-sous"><span>${echapper(decrireRegle(t, objet))}</span>${consommable}${siennes}</span>
              </span>
              <span class="objet-note">${note}</span>
              <span class="chevron" aria-hidden="true">${iconeInterface('suivant')}</span>
            </button>
          </li>`;
}

const lignes = (vue, rangee) => `
        <ul class="objets">${rangee.objets.map(o => ligneObjet(vue, o)).join('')}
          <li class="objet objet-ajout">
            <button type="button" class="objet-corps" data-action="nouvel-objet" data-id="${echapper(rangee.categorie.id)}">${iconeInterface('plus')}${vue.t('bibliotheque.ajouterObjet')}</button>
          </li>
        </ul>`;

function carteCategorie(vue, rangee) {
  const { t, ouvertes } = vue;
  const { categorie } = rangee;
  const id = echapper(categorie.id);
  const ouverte = ouvertes.has(categorie.id);
  return `
      <section class="categorie" data-categorie="${id}" data-flip="cat-${id}">
        <div class="categorie-entete">
          <h2 class="categorie-titre">
            <button type="button" class="categorie-tete" data-action="accordeon" data-id="${id}" aria-expanded="${ouverte}">
              ${paveCategorie(categorie)}
              <span class="categorie-nom"><b>${echapper(categorie.nom)}</b>${infosCategorie(vue, rangee)}</span>
              <span class="chevron" aria-hidden="true">${iconeInterface('deplier')}</span>
            </button>
          </h2>
          <button type="button" class="bouton-icone bouton-modifier" data-action="modifier-categorie" data-id="${id}" aria-label="${echapper(remplir(t('bibliotheque.modifierCategorie'), { nom: categorie.nom }))}">${iconeInterface('modifier')}</button>
        </div>
        ${ouverte ? lignes(vue, rangee) : ''}
      </section>`;
}

// Un bouton ▲ ou ▼ ; au bord de la liste, il reste à sa place mais ne fait rien (aria-disabled).
function boutonDeplacer({ t }, action, categorie, inactif) {
  const nom = echapper(remplir(t(`bibliotheque.${action}`), { nom: categorie.nom }));
  return `<button type="button" class="bouton-icone" data-action="${action}" data-id="${echapper(categorie.id)}" aria-label="${nom}"${inactif ? ' aria-disabled="true"' : ''}>${iconeInterface(action)}</button>`;
}

// La liste compacte du rangement. La zone d'annonce (data-annonce) est remplacée par l'écran par la
// sienne, qui reste la même d'un dessin à l'autre : un lecteur d'écran n'annonce que les changements
// d'une zone qu'il connaît déjà.
function rangement(vue) {
  const { t, rangees } = vue;
  const dernier = rangees.length - 1;
  const liste = rangees
    .map(
      ({ categorie }, rang) => `
          <li data-flip="cat-${echapper(categorie.id)}">
            ${paveCategorie(categorie)}
            <b>${echapper(categorie.nom)}</b>
            ${boutonDeplacer(vue, 'monter', categorie, rang === 0)}
            ${boutonDeplacer(vue, 'descendre', categorie, rang === dernier)}
          </li>`,
    )
    .join('');
  return `
      <section class="rangement" aria-labelledby="rangement-titre">
        <div class="rangement-tete">
          <h2 id="rangement-titre">${t('bibliotheque.ranger')}</h2>
          <button type="button" class="bouton bouton-principal" data-action="terminer">${iconeInterface('coche')}${t('bibliotheque.termine')}</button>
        </div>
        <p class="aide">${t('bibliotheque.rangerAide')}</p>
        <ol class="rangement-liste">${liste}
        </ol>
        <p data-annonce></p>
      </section>`;
}

function entete(vue) {
  const { t, langue, rangees, nombreObjets, ranger } = vue;
  const resume = `${pluriel(t, 'bibliotheque.categories', rangees.length, langue)} · ${pluriel(t, 'bibliotheque.objets', nombreObjets, langue)}`;
  const outils = ranger
    ? ''
    : `
      <div class="outils">
        <button type="button" class="puce" data-action="ranger">${iconeInterface('ranger')}${t('bibliotheque.ranger')}</button>
      </div>`;
  return `${barreHaut(vue, { retour: { adresse: '#/reglages', libelle: t('reglages.titre') } })}
      <h1>${t('bibliotheque.titre')}</h1>
      <p class="biblio-resume">${resume}</p>${outils}`;
}

function choix(vue, rangee) {
  const { categorie } = rangee;
  const id = echapper(categorie.id);
  return `
          <li data-flip="cat-${id}">
            <button type="button" class="choix" data-action="choisir" data-id="${id}" aria-current="${vue.choisie === categorie.id}">
              ${paveCategorie(categorie)}
              <span class="categorie-nom"><b>${echapper(categorie.nom)}</b>${infosCategorie(vue, rangee)}</span>
              <span class="chevron" aria-hidden="true">${iconeInterface('suivant')}</span>
            </button>
          </li>`;
}

// Deux panneaux : à droite, la catégorie choisie, « Modifier », puis ses objets.
function detail(vue, rangee) {
  if (!rangee) return '';
  const { categorie } = rangee;
  return `
      <section class="panneau panneau-droit" aria-labelledby="detail-titre">
        <div class="detail">
          <div class="detail-tete">
            ${paveCategorie(categorie)}
            <div class="detail-titre"><h2 id="detail-titre">${echapper(categorie.nom)}</h2>${infosCategorie(vue, rangee)}</div>
            <button type="button" class="bouton bouton-secondaire" data-action="modifier-categorie" data-id="${echapper(categorie.id)}">${iconeInterface('modifier')}${vue.t('bibliotheque.modifier')}</button>
          </div>
          ${lignes(vue, rangee)}
        </div>
      </section>`;
}

function vuePanneaux(vue) {
  const { t, rangees, ranger } = vue;
  const gauche = ranger
    ? rangement(vue)
    : `
      <nav aria-label="${t('voyage.categories')}">
        <ul class="choix-liste">${rangees.map(r => choix(vue, r)).join('')}
        </ul>
      </nav>
      <button type="button" class="bouton bouton-secondaire bouton-large" data-action="nouvelle-categorie">${iconeInterface('plus')}${t('bibliotheque.nouvelleCategorie')}</button>`;
  const choisie = rangees.find(r => r.categorie.id === vue.choisie);
  return `
      <div class="panneau panneau-gauche">${entete(vue)}${gauche}
      </div>${detail(vue, choisie)}`;
}

// Le contenu de l'écran et sa disposition (la classe de <main>). vue : le contexte de l'appli, plus
// rangees (chaque catégorie dans l'ordre, ses objets par nom), etiquettes (nom par identifiant),
// nombreObjets, ouvertes, choisie, ranger, deuxPanneaux.
export function vueBibliotheque(vue) {
  if (vue.deuxPanneaux) return { classe: 'panneaux', html: vuePanneaux(vue) };
  const { t, rangees, ranger } = vue;
  if (ranger) return { classe: 'ecran', html: `${entete(vue)}${rangement(vue)}` };
  return {
    classe: 'ecran ecran-avec-flottant',
    html: `${entete(vue)}
      <div class="categories">${rangees.map(r => carteCategorie(vue, r)).join('')}
      </div>
      <button type="button" class="bouton bouton-principal bouton-flottant" data-action="nouvelle-categorie">${iconeInterface('plus')}${t('bibliotheque.nouvelleCategorie')}</button>`,
  };
}
