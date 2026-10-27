// La Bibliothèque dans la mise en page validée le 2026-10-27 (?ecran=bibliotheque) : « les différentes vues doivent être
// cohérentes sur une version donnée » (chef de projet, 2026-10-27). À gauche, la Bibliothèque (titre,
// comptes, « Ranger les catégories ») ; au milieu, les catégories, chacune avec son crayon, et
// « Nouvelle catégorie » ; à droite, les objets de la catégorie choisie et « Ajouter un objet ». Les
// éléments sont ceux de l'appli (src/ecrans/bibliotheque-vues.js, src/styles/bibliotheque.css).
// Données : la bibliothèque de départ (src/i18n/fr.json, « bibliothequeDeDepart »).
import { CATEGORIES_ESSAI } from './donnees.js';
import { ic, pave, svg, tuile } from './vues.js';

const fr = await (await fetch('../../../src/i18n/fr.json')).json();
const depart = fr.bibliothequeDeDepart;
const nomEtiquette = new Map(depart.groupes.flatMap(g => g.etiquettes.map(e => [e.cle, e.nom])));
const categories = depart.categories.map((c, i) => ({
  ...c,
  id: `c${i}`,
  objets: [...c.objets].sort((a, b) => a.nom.localeCompare(b.nom, 'fr')),
}));
if (new URLSearchParams(location.search).get('etat') === 'beaucoup')
  for (const c of CATEGORIES_ESSAI)
    categories.push({
      ...c,
      objets: c.objets.map(nom => ({ nom, regle: 'fixe', valeur: 1, parPersonne: false })),
    });
const nombreObjets = categories.reduce((s, c) => s + c.objets.length, 0);
const pluriel = (n, mot) => `${n} ${mot}${n > 1 ? 's' : ''}`;

// « 1 par jour et par personne, au plus 5 par personne » (src/ecrans/format.js, decrireRegle).
function regle(o) {
  const parP = o.parPersonne ? ' par personne' : '';
  const base = {
    fixe: o.parPersonne ? `${o.valeur} par personne` : `${o.valeur} en tout`,
    par_jour: `${o.valeur} par jour${o.parPersonne ? ' et par personne' : ''}`,
    par_nuit: `${o.valeur} par nuit${o.parPersonne ? ' et par personne' : ''}`,
  }[o.regle];
  return o.plafond ? `${base}, au plus ${o.plafond}${parP}` : base;
}

const puces = cles =>
  cles?.length
    ? `<span class="puces-mini">${cles.map(k => `<span>${nomEtiquette.get(k)}</span>`).join('')}</span>`
    : '';

function infos(c) {
  const nombre = pluriel(c.objets.length, 'objet');
  const toujours = !c.etiquettes?.length;
  return `<span class="categorie-infos"><span class="inclusion">${toujours ? `${nombre} · Toujours incluse` : nombre}</span>${toujours ? '' : puces(c.etiquettes)}</span>`;
}

function ligne(o) {
  return `
          <li class="objet objet-modele">
            <button type="button" class="objet-corps">
              <span class="objet-texte">
                <span class="objet-nom">${o.nom}</span>
                <span class="objet-sous"><span>${regle(o)}</span>${o.consommable ? '<span>consommable</span>' : ''}${puces(o.etiquettes)}</span>
              </span>
              <span class="objet-note">${o.note ? svg.info : ''}</span>
              <span class="chevron" aria-hidden="true">${svg['caret-right']}</span>
            </button>
          </li>`;
}

// Le choix d'une catégorie, avec son crayon (trois colonnes) : il prend la place du « Modifier » de
// l'en-tête du panneau de droite, qui n'existe plus (la liste n'y a pas de titre visible).
function choix(c, choisie) {
  return `
          <li class="ge-choix-modifiable">
            <button type="button" class="choix" data-action="choisir" data-id="${c.id}" aria-current="${choisie === c.id}">
              ${pave(c)}
              <span class="categorie-nom"><b>${c.nom}</b>${infos(c)}</span>
              <span class="ge-place-crayon"></span>
              <span class="chevron" aria-hidden="true">${svg['caret-right']}</span>
            </button>
            <button type="button" class="bouton-icone bouton-modifier ge-crayon" aria-label="Modifier la catégorie ${c.nom}">${ic('pencil-simple')}</button>
          </li>`;
}

export const premiere = categories[0].id;

// repli : les catégories en tuiles (pavé, nom, nombre d'objets), « Nouvelle catégorie » en dernière
// tuile ; le crayon de la catégorie choisie passe en « Modifier », à côté du titre de la liste.
export function vueBibliotheque(choisie, { repli }) {
  const c = categories.find(x => x.id === choisie);
  const menu = repli
    ? `<ul class="ge-tuiles">${categories
        .map(x =>
          tuile(x, { choisie, infos: `<span class="ge-tuile-compte">${pluriel(x.objets.length, 'objet')}</span>` }),
        )
        .join('')}
          <li>
            <button type="button" class="ge-tuile ge-tuile-ajout"><span class="pave">${ic('plus')}</span><span class="ge-tuile-texte"><b>Nouvelle catégorie</b></span></button>
          </li></ul>`
    : `<ul class="choix-liste">${categories.map(x => choix(x, choisie)).join('')}</ul>
        <button type="button" class="bouton bouton-secondaire bouton-large">${ic('plus')}Nouvelle catégorie</button>`;
  const tete = repli
    ? `<div class="ge-liste-tete"><h2 id="detail-titre">${c.nom}</h2><button type="button" class="bouton bouton-secondaire">${ic('pencil-simple')}Modifier</button></div>`
    : `<div class="ge-liste-tete"><h2 id="detail-titre" class="ge-cache">${c.nom}</h2></div>`;
  return `
    <main class="ge-ecran ge-biblio">
      <div class="barre-haut">
        <button type="button" class="bouton-icone bouton-menu" aria-label="Ouvrir le menu">${ic('list')}</button>
        <a class="lien-retour" href="#">${ic('caret-left')}Réglages</a>
      </div>
      <div class="ge-voyage">
        <h1>Bibliothèque</h1>
        <p class="biblio-resume">${pluriel(categories.length, 'catégorie')} · ${pluriel(nombreObjets, 'objet')}</p>
        <div class="outils">
          <button type="button" class="puce">${ic('arrows-down-up')}Ranger les catégories</button>
        </div>
      </div>
      <nav class="ge-menu" aria-labelledby="menu-titre">
        <h2 id="menu-titre" class="ge-cache">Catégories</h2>
        ${menu}
      </nav>
      <section class="ge-liste" aria-labelledby="detail-titre">
        ${tete}
        <div class="ge-carte-objets">
          <ul class="objets">${c.objets.map(ligne).join('')}
            <li class="objet objet-ajout">
              <button type="button" class="objet-corps">${ic('plus')}Ajouter un objet</button>
            </li>
          </ul>
        </div>
      </section>
    </main>`;
}
