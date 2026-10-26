// Les écrans de la maquette de la phase 7, tels que validés aux phases 5 et 6 (docs/maquettes/
// bibliotheque/, docs/maquettes/etiquettes/) : accueil, Réglages, Bibliothèque, Étiquettes. Rien n'y
// change, sinon la place gardée en bas pour le bandeau « Annuler » (maquette.css).
import { echapper, ic, pave, phraseQuantite, svg } from '../bibliotheque/outils.js';
import { pluriel } from './textes.js';

const parNom = (a, b) => a.nom.localeCompare(b.nom, 'fr');
const recent = (ui, cle) => (ui.recent === cle ? ' data-recent' : '');

const barreHaut = retour => `
      <div class="barre-haut">
        <button type="button" class="bouton-icone bouton-menu" data-action="menu" aria-label="Menu" aria-haspopup="dialog">${ic('list')}</button>
        ${retour ? `<a class="lien-retour" href="#" data-action="vers" data-vue="${retour[0]}">${ic('caret-left')}${retour[1]}</a>` : ''}
      </div>`;

// ---------- Accueil ----------
export function vueAccueil() {
  const carte = (nom, details, fait, total) => `
        <li>
          <a class="carte-voyage" href="../voyage/?etat=en-cours" data-action="voyage">
            <span class="carte-voyage-nom">${nom}</span>
            <span class="carte-voyage-details">${details}</span>
            ${total ? `<span class="carte-progression"><span class="jauge jauge-mini"><i style="width:${Math.round((100 * fait) / total)}%"></i></span><span>${fait} / ${total} dans le sac</span></span>` : ''}
          </a>
        </li>`;
  return `
    <main class="ecran ecran-avec-flottant">
      ${barreHaut()}
      <h1>Mes voyages</h1>
      <section class="rubrique"><h2>En cours</h2><ul class="voyages">
        ${carte('Presqu’île de Quiberon', 'du ven. 23 oct. au lun. 26 oct. 2026 · 2 voyageurs', 9, 21)}
      </ul></section>
      <section class="rubrique"><h2>À venir</h2><ul class="voyages">
        ${carte('Traversée du Vercors', 'du jeu. 12 nov. au dim. 15 nov. 2026 · 2 voyageurs', 0, 24)}
      </ul></section>
      <section class="rubrique"><h2>Passés</h2><ul class="voyages">
        ${carte('Week-end à Lyon', 'du sam. 3 oct. au dim. 4 oct. 2026 · 2 voyageurs', 0, 0)}
      </ul></section>
    </main>
    <a class="bouton bouton-principal bouton-flottant" href="../etiquettes/?etat=assistant-mini" data-action="nouveau-voyage">${ic('plus')}Nouveau voyage</a>`;
}

// ---------- Réglages ----------
const ligneReglage = (vue, picto, titre, texte) => `
        <li>
          <a class="reglage" href="#" data-action="vers" data-vue="${vue}">
            <span class="reglage-picto" aria-hidden="true">${svg[picto]}</span>
            <span class="reglage-texte"><b>${titre}</b><span>${texte}</span></span>
            <span class="chevron" aria-hidden="true">${svg['caret-right']}</span>
          </a>
        </li>`;

export const vueReglages = () => `
    <main class="ecran">
      ${barreHaut(['accueil', 'Mes voyages'])}
      <h1>Réglages</h1>
      <ul class="reglages">
        ${ligneReglage('bibliotheque', 'books', 'Bibliothèque', 'Les catégories et les objets proposés à chaque nouveau voyage')}
        ${ligneReglage('etiquettes', 'tag', 'Étiquettes', 'Les questions posées par « Nouveau voyage » pour bâtir la liste')}
      </ul>
    </main>`;

// ---------- Bibliothèque ----------
const pucesEtiquettes = etiquettes =>
  `<span class="puces-mini">${etiquettes.map(e => `<span>${echapper(e)}</span>`).join('')}</span>`;

const inclusionCategorie = c =>
  `<span class="categorie-infos"><span class="inclusion">${pluriel(c.objets.length, 'objet')}${c.etiquettes.length ? '' : ' · Toujours incluse'}</span>${c.etiquettes.length ? pucesEtiquettes(c.etiquettes) : ''}</span>`;

function ligneObjet(ui, x) {
  const sous = [
    `<span>${phraseQuantite(x)}</span>`,
    x.consommable ? '<span>consommable</span>' : '',
    x.etiquettes.length ? pucesEtiquettes(x.etiquettes) : '',
  ].join('');
  return `
          <li class="objet objet-modele"${recent(ui, x.id)}>
            <button type="button" class="objet-corps" data-action="modifier-objet" data-id="${x.id}">
              <span class="objet-texte">
                <span class="objet-nom">${echapper(x.nom)}</span>
                <span class="objet-sous">${sous}</span>
              </span>
              <span class="objet-note">${x.note ? `${svg.info}<span class="lecteur">, une note</span>` : ''}</span>
              <span class="chevron" aria-hidden="true">${svg['caret-right']}</span>
            </button>
          </li>`;
}

const lignes = (ui, c) => `
        <ul class="objets">${[...c.objets].sort(parNom).map(x => ligneObjet(ui, x)).join('')}
          <li class="objet objet-ajout">
            <button type="button" class="objet-corps" data-action="sans-effet">${ic('plus')}Ajouter un objet</button>
          </li>
        </ul>`;

function carteCategorie(ui, c) {
  const ouverte = ui.ouvertes.has(c.id);
  return `
      <section class="categorie"${recent(ui, `cat-${c.id}`)}>
        <div class="categorie-entete">
          <h2 class="categorie-titre">
            <button type="button" class="categorie-tete" data-action="accordeon" data-id="${c.id}" aria-expanded="${ouverte}">
              ${pave(c.icone, c.couleur)}
              <span class="categorie-nom"><b>${echapper(c.nom)}</b>${inclusionCategorie(c)}</span>
              <span class="chevron" aria-hidden="true">${svg['caret-down']}</span>
            </button>
          </h2>
          <button type="button" class="bouton-icone bouton-modifier" data-action="modifier-categorie" data-id="${c.id}" aria-label="Modifier la catégorie ${echapper(c.nom)}">${ic('pencil-simple')}</button>
        </div>
        ${ouverte ? lignes(ui, c) : ''}
      </section>`;
}

const enteteBibliotheque = biblio => `
      ${barreHaut(['reglages', 'Réglages'])}
      <h1>Bibliothèque</h1>
      <p class="biblio-resume">${pluriel(biblio.categories.length, 'catégorie')} · ${pluriel(biblio.categories.reduce((s, c) => s + c.objets.length, 0), 'objet')}</p>
      <div class="outils"><button type="button" class="puce" data-action="sans-effet">${ic('arrows-down-up')}Ranger les catégories</button></div>`;

export function vueBibliotheque(biblio, ui, large) {
  if (!large)
    return `
    <main class="ecran ecran-avec-flottant">
      ${enteteBibliotheque(biblio)}
      <div class="categories">${biblio.categories.map(c => carteCategorie(ui, c)).join('')}</div>
    </main>
    <button type="button" class="bouton bouton-principal bouton-flottant" data-action="sans-effet">${ic('plus')}Nouvelle catégorie</button>`;
  const c = biblio.categories.find(x => x.id === ui.choisie) ?? biblio.categories[0];
  const choix = x => `
          <li${recent(ui, `cat-${x.id}`)}>
            <button type="button" class="choix" data-action="choisir" data-id="${x.id}" aria-current="${x.id === c.id}">
              ${pave(x.icone, x.couleur)}
              <span class="categorie-nom"><b>${echapper(x.nom)}</b>${inclusionCategorie(x)}</span>
              <span class="chevron" aria-hidden="true">${svg['caret-right']}</span>
            </button>
          </li>`;
  return `
    <main class="panneaux">
      <div class="panneau panneau-gauche">
        ${enteteBibliotheque(biblio)}
        <nav aria-label="Catégories"><ul class="choix-liste">${biblio.categories.map(choix).join('')}</ul></nav>
        <button type="button" class="bouton bouton-secondaire bouton-large" data-action="sans-effet">${ic('plus')}Nouvelle catégorie</button>
      </div>
      <section class="panneau panneau-droit" aria-labelledby="detail-titre">
        <div class="detail">
          <div class="detail-tete">
            ${pave(c.icone, c.couleur)}
            <div class="detail-titre"><h2 id="detail-titre">${echapper(c.nom)}</h2>${inclusionCategorie(c)}</div>
            <button type="button" class="bouton bouton-secondaire" data-action="modifier-categorie" data-id="${c.id}">${ic('pencil-simple')}Modifier</button>
          </div>
          ${lignes(ui, c)}
        </div>
      </section>
    </main>`;
}

// ---------- Étiquettes ----------
function carteGroupe(biblio, ui, groupe) {
  const nb = groupe.etiquettes.length;
  const pleins = biblio.groupes.filter(x => x.etiquettes.length);
  const infos = nb
    ? `${pluriel(nb, 'étiquette')} · étape ${pleins.indexOf(groupe) + 2} de « Nouveau voyage »`
    : 'Aucune étiquette · absent de « Nouveau voyage »';
  const puces = groupe.etiquettes
    .map(
      e => `
          <li><button type="button" class="puce puce-modele" data-action="modifier-etiquette" data-id="${e.id}" aria-label="${echapper(e.nom)}, modifier"${recent(ui, e.id)}>${echapper(e.nom)}</button></li>`,
    )
    .join('');
  return `
      <section class="groupe"${recent(ui, groupe.id)} aria-labelledby="titre-${groupe.id}">
        <div class="groupe-entete">
          <h2 class="groupe-titre" id="titre-${groupe.id}"><b>${echapper(groupe.nom)}</b><span class="groupe-infos">${infos}</span></h2>
          <button type="button" class="bouton-icone bouton-modifier" data-action="modifier-groupe" data-id="${groupe.id}" aria-label="Modifier le groupe ${echapper(groupe.nom)}">${ic('pencil-simple')}</button>
        </div>
        ${nb ? '' : '<p class="groupe-vide">Ajoutez une étiquette : le groupe deviendra une étape de « Nouveau voyage ».</p>'}
        ${nb ? `<ul class="etiquettes-liste">${puces}\n        </ul>` : ''}
        <button type="button" class="groupe-ajout" data-action="sans-effet">${ic('plus')}Ajouter une étiquette</button>
      </section>`;
}

export function vueEtiquettes(biblio, ui) {
  const nbEtiquettes = biblio.groupes.reduce((s, x) => s + x.etiquettes.length, 0);
  return `
    <main class="ecran ecran-avec-flottant">
      ${barreHaut(['reglages', 'Réglages'])}
      <h1>Étiquettes</h1>
      <p class="biblio-resume">${pluriel(biblio.groupes.length, 'groupe')} · ${pluriel(nbEtiquettes, 'étiquette')}</p>
      <p class="aide etiquettes-aide">Chaque groupe est une étape de « Nouveau voyage », et ses étiquettes les réponses à toucher. Touchez une étiquette pour la renommer ou la supprimer.</p>
      <div class="outils"><button type="button" class="puce" data-action="sans-effet">${ic('arrows-down-up')}Ranger</button></div>
      <div class="groupes">${biblio.groupes.map(g => carteGroupe(biblio, ui, g)).join('')}</div>
    </main>
    <button type="button" class="bouton bouton-principal bouton-flottant" data-action="sans-effet">${ic('plus')}Nouveau groupe</button>`;
}
