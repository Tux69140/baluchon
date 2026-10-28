// Le HTML de l'écran Bibliothèque (src/ecrans/bibliotheque.js), d'après les maquettes validées le
// 2026-10-25 (docs/maquettes/bibliotheque/) et le 2026-10-27 (docs/maquettes/grand-ecran/) : en-tête,
// cartes de catégorie en accordéon (téléphone) ou grand format (la Bibliothèque, le menu des
// catégories en cartes ou en tuiles, les objets de la choisie), lignes d'objet modèle, rangement des
// catégories. Rien ne vit ici que du dessin : l'ordre, les dépliées et la choisie viennent de l'écran.
import { remplir } from '../i18n/traduction.js';
import { decrireRegle, pluriel } from './format.js';
import { colonnesGrandFormat, tuileCategorie } from './grand-format-vues.js';
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
  const { t, recent } = vue;
  const consommable = objet.consommable ? `<span>${t('bibliotheque.consommable')}</span>` : '';
  const siennes = objet.toujoursInclus ? '' : puces(vue, objet.etiquettes);
  const note = objet.note ? `${iconeInterface('info')}<span class="lecteur">, ${t('voyage.avecNote')}</span>` : '';
  return `
          <li class="objet objet-modele"${recent === objet.id ? ' data-recent' : ''}>
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

// Ce qui vient d'être enregistré s'éclaire un instant (src/styles/bibliotheque.css) : la carte, le
// choix ou la tuile d'une catégorie (recent = « cat-<id> », comme data-flip), la ligne d'un objet (son
// id).
const estRecente = ({ recent }, categorie) => recent === `cat-${categorie.id}`;
const eclaire = (vue, categorie) => (estRecente(vue, categorie) ? ' data-recent' : '');

// Le nom accessible du crayon d'une catégorie : « Modifier la catégorie Camping ».
const nomDuCrayon = ({ t }, categorie) =>
  echapper(remplir(t('bibliotheque.modifierCategorie'), { nom: categorie.nom }));

function carteCategorie(vue, rangee) {
  const { ouvertes } = vue;
  const { categorie } = rangee;
  const id = echapper(categorie.id);
  const ouverte = ouvertes.has(categorie.id);
  return `
      <section class="categorie" data-categorie="${id}" data-flip="cat-${id}"${eclaire(vue, categorie)}>
        <div class="categorie-entete">
          <h2 class="categorie-titre">
            <button type="button" class="categorie-tete" data-action="accordeon" data-id="${id}" aria-expanded="${ouverte}">
              ${paveCategorie(categorie)}
              <span class="categorie-nom"><b>${echapper(categorie.nom)}</b>${infosCategorie(vue, rangee)}</span>
              <span class="chevron" aria-hidden="true">${iconeInterface('deplier')}</span>
            </button>
          </h2>
          <button type="button" class="bouton-icone bouton-modifier" data-action="modifier-categorie" data-id="${id}" aria-label="${nomDuCrayon(vue, categorie)}">${iconeInterface('modifier')}</button>
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

// Le titre, les comptes et « Ranger les catégories » (absent pendant le rangement).
function entete(vue) {
  const { t, langue, rangees, nombreObjets, ranger } = vue;
  const resume = `${pluriel(t, 'bibliotheque.categories', rangees.length, langue)} · ${pluriel(t, 'bibliotheque.objets', nombreObjets, langue)}`;
  const outils = ranger
    ? ''
    : `
      <div class="outils">
        <button type="button" class="puce" data-action="ranger">${iconeInterface('ranger')}${t('bibliotheque.ranger')}</button>
      </div>`;
  return `
      <h1>${t('bibliotheque.titre')}</h1>
      <p class="biblio-resume">${resume}</p>${outils}`;
}

const barre = vue => barreHaut(vue, { retour: { adresse: '#/reglages', libelle: vue.t('reglages.titre') } });

// Trois colonnes : la carte d'une catégorie se choisit ; son crayon est dans la carte, avant la flèche,
// posé par-dessus une place qu'elle lui garde (un bouton ne peut pas en contenir un autre).
function choix(vue, rangee) {
  const { categorie } = rangee;
  const id = echapper(categorie.id);
  return `
          <li class="gf-choix-modifiable" data-flip="cat-${id}"${eclaire(vue, categorie)}>
            <button type="button" class="choix" data-action="choisir" data-id="${id}" aria-current="${vue.choisie === categorie.id}">
              ${paveCategorie(categorie)}
              <span class="categorie-nom"><b>${echapper(categorie.nom)}</b>${infosCategorie(vue, rangee)}</span>
              <span class="gf-place-crayon"></span>
              <span class="chevron" aria-hidden="true">${iconeInterface('suivant')}</span>
            </button>
            <button type="button" class="bouton-icone bouton-modifier gf-crayon" data-action="modifier-categorie" data-id="${id}" aria-label="${nomDuCrayon(vue, categorie)}">${iconeInterface('modifier')}</button>
          </li>`;
}

// Le menu des catégories : en trois colonnes, les cartes puis « Nouvelle catégorie » en bouton ; en
// repli, les tuiles (pavé, nom, nombre d'objets) et « Nouvelle catégorie » en dernière tuile.
function menu(vue) {
  const { t, langue, rangees, choisie, troisColonnes } = vue;
  const nouvelle = t('bibliotheque.nouvelleCategorie');
  if (troisColonnes)
    return `<ul class="choix-liste">${rangees.map(r => choix(vue, r)).join('')}
        </ul>
        <button type="button" class="bouton bouton-secondaire bouton-large" data-action="nouvelle-categorie">${iconeInterface('plus')}${nouvelle}</button>`;
  const tuiles = rangees.map(({ categorie, objets }) =>
    tuileCategorie(categorie, {
      choisie,
      infos: `<span class="gf-tuile-compte">${pluriel(t, 'bibliotheque.objets', objets.length, langue)}</span>`,
      recent: estRecente(vue, categorie),
    }),
  );
  return `<ul class="gf-tuiles">${tuiles.join('')}
          <li>
            <button type="button" class="gf-tuile gf-tuile-nouvelle" data-action="nouvelle-categorie"><span class="pave">${iconeInterface('plus')}</span><span class="gf-tuile-texte"><b>${nouvelle}</b></span></button>
          </li>
        </ul>`;
}

// La liste des objets de la choisie (aucune s'il n'y a pas de catégorie). En repli, « Modifier »
// accompagne son titre ; en trois colonnes, ce sont les crayons des cartes.
function liste(vue, rangee) {
  if (!rangee) return null;
  const { t, troisColonnes } = vue;
  const modifier = `
          <button type="button" class="bouton bouton-secondaire" data-action="modifier-categorie" data-id="${echapper(rangee.categorie.id)}">${iconeInterface('modifier')}${t('bibliotheque.modifier')}</button>`;
  return {
    titre: echapper(rangee.categorie.nom),
    apresLeTitre: troisColonnes ? '' : modifier,
    lignes: lignes(vue, rangee),
  };
}

// Tablette et ordinateur (src/styles/grand-format.css) : la Bibliothèque, le menu des catégories (ou,
// pendant le rangement, sa liste ▲ ▼ à sa place), puis les objets de la choisie.
function vueGrandFormat(vue) {
  const { t, rangees, ranger, troisColonnes } = vue;
  const choisie = rangees.find(r => r.categorie.id === vue.choisie);
  const colonnes = colonnesGrandFormat({
    t,
    debut: entete(vue),
    menu: ranger ? null : menu(vue),
    enPlaceDuMenu: ranger ? rangement(vue) : null,
    liste: liste(vue, choisie),
    troisColonnes,
  });
  return `${barre(vue)}${colonnes}`;
}

// Le contenu de l'écran, sa disposition (la classe de <main>) et ses colonnes (son data-colonnes) : une
// colonne de cartes au téléphone ; le grand format si grandFormat (tablettes, ordinateur), en trois
// colonnes si troisColonnes, sinon en repli. vue : le contexte de l'appli, plus rangees (chaque
// catégorie dans l'ordre, ses objets par nom), etiquettes (nom par identifiant), nombreObjets,
// ouvertes, choisie, ranger, recent (ce qui vient d'être enregistré).
export function vueBibliotheque(vue) {
  if (vue.grandFormat)
    return { classe: 'grand-format', colonnes: vue.troisColonnes ? 3 : 'repli', html: vueGrandFormat(vue) };
  const { t, rangees, ranger } = vue;
  if (ranger) return { classe: 'ecran', html: `${barre(vue)}${entete(vue)}${rangement(vue)}` };
  return {
    classe: 'ecran ecran-avec-flottant',
    html: `${barre(vue)}${entete(vue)}
      <div class="categories">${rangees.map(r => carteCategorie(vue, r)).join('')}
      </div>
      <button type="button" class="bouton bouton-principal bouton-flottant" data-action="nouvelle-categorie">${iconeInterface('plus')}${t('bibliotheque.nouvelleCategorie')}</button>`,
  };
}
