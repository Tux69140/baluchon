// Maquette de la phase 5 (bibliothèque : catégories et objets), d'après la conception validée le
// 2026-10-25 (docs/superpowers/specs/2026-10-25-phase-5-bibliotheque-design.md). Brouillon autonome :
// il imite les gestes sans toucher au code de l'appli. Servir la racine du dépôt
// (`python3 -m http.server 8644`) et ouvrir `/docs/maquettes/bibliotheque/`.
import { categoriesDeDepart, nouvelId } from './donnees.js';
import { ficheCategorie, ficheObjet, ouvrirCatalogue } from './fiches.js';
import { alerte, chargerIcones, echapper, ic, ouvrir, pave, phraseQuantite, reduit, svg } from './outils.js';

const params = new URLSearchParams(location.search);
const ETAT = params.get('etat') ?? 'bibliotheque';
const CAPTURE = params.has('capture');
const largeMq = matchMedia('(min-width: 1000px) and (orientation: landscape)');
const MASCOTTE = '../../../src/images/baluchon.svg';

await chargerIcones();

const categories = categoriesDeDepart();
const ui = {
  vue: { accueil: 'accueil', menu: 'accueil', reglages: 'reglages' }[ETAT] ?? 'bibliotheque',
  // Écran ouvert sur toutes les catégories repliées : on voit d'un coup d'œil toute la bibliothèque.
  ouvertes: new Set(),
  choisie: categories[0].id,
  ranger: ETAT === 'ranger',
  panne: ETAT === 'panne',
  recent: null,
  annonce: '',
};

const tousLesObjets = () => categories.flatMap(c => c.objets);
const trouverObjet = id => tousLesObjets().find(x => x.id === id);
const categorieDe = x => categories.find(c => c.objets.includes(x));
const trouverCategorie = id => categories.find(c => c.id === id);
const parNom = (a, b) => a.nom.localeCompare(b.nom, 'fr');
const pluriel = (n, mot) => `${n} ${mot}${n > 1 ? 's' : ''}`;

// ---------- Morceaux communs ----------
const app = document.getElementById('app');

function barreHaut(retour) {
  return `
      <div class="barre-haut">
        <button type="button" class="bouton-icone bouton-menu" data-action="menu" aria-label="Menu" aria-haspopup="dialog">${ic('list')}</button>
        ${retour ? `<a class="lien-retour" href="#" data-action="vers" data-vue="${retour[0]}">${ic('caret-left')}${retour[1]}</a>` : ''}
      </div>`;
}

const pucesEtiquettes = etiquettes =>
  `<span class="puces-mini">${etiquettes.map(e => `<span>${e}</span>`).join('')}</span>`;

// Sous le nom : le nombre d'objets, puis « Toujours incluse » ou les étiquettes qui la font proposer.
const inclusionCategorie = c =>
  `<span class="categorie-infos"><span class="inclusion">${pluriel(c.objets.length, 'objet')}${c.etiquettes.length ? '' : ' · Toujours incluse'}</span>${c.etiquettes.length ? pucesEtiquettes(c.etiquettes) : ''}</span>`;

function ligneObjet(x) {
  const sous = [
    `<span>${phraseQuantite(x)}</span>`,
    x.consommable ? '<span>consommable</span>' : '',
    x.etiquettes.length ? pucesEtiquettes(x.etiquettes) : '',
  ].join('');
  return `
          <li class="objet objet-modele"${ui.recent === x.id ? ' data-recent' : ''}>
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

const lignes = c => `
        <ul class="objets">${[...c.objets].sort(parNom).map(ligneObjet).join('')}
          <li class="objet objet-ajout">
            <button type="button" class="objet-corps" data-action="nouvel-objet" data-id="${c.id}">${ic('plus')}Ajouter un objet</button>
          </li>
        </ul>`;

function carteCategorie(c) {
  const ouverte = ui.ouvertes.has(c.id);
  return `
      <section class="categorie" data-flip="cat-${c.id}"${ui.recent === `cat-${c.id}` ? ' data-recent' : ''}>
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
        ${ouverte ? lignes(c) : ''}
      </section>`;
}

function rangement() {
  const dernier = categories.length - 1;
  return `
      <section class="rangement" aria-labelledby="rangement-titre">
        <div class="rangement-tete">
          <h2 id="rangement-titre">Ranger les catégories</h2>
          <button type="button" class="bouton bouton-principal" data-action="terminer">${ic('check')}Terminé</button>
        </div>
        <p class="aide">Cet ordre est repris dans l’aperçu et dans les nouveaux voyages.</p>
        <ol class="rangement-liste">
          ${categories
            .map(
              (c, i) => `
          <li data-flip="cat-${c.id}">
            ${pave(c.icone, c.couleur)}
            <b>${echapper(c.nom)}</b>
            <button type="button" class="bouton-icone" data-action="monter" data-id="${c.id}" aria-label="Monter ${echapper(c.nom)}"${i === 0 ? ' aria-disabled="true"' : ''}>${ic('arrow-up')}</button>
            <button type="button" class="bouton-icone" data-action="descendre" data-id="${c.id}" aria-label="Descendre ${echapper(c.nom)}"${i === dernier ? ' aria-disabled="true"' : ''}>${ic('arrow-down')}</button>
          </li>`,
            )
            .join('')}
        </ol>
        <p class="lecteur" aria-live="polite">${ui.annonce}</p>
      </section>`;
}

const entete = () => `
      ${barreHaut(['reglages', 'Réglages'])}
      <h1>Bibliothèque</h1>
      <p class="biblio-resume">${pluriel(categories.length, 'catégorie')} · ${pluriel(tousLesObjets().length, 'objet')}</p>
      ${ui.ranger ? '' : `<div class="outils"><button type="button" class="puce" data-action="ranger">${ic('arrows-down-up')}Ranger les catégories</button></div>`}`;

// ---------- Écrans ----------
function vueBibliotheque() {
  if (!largeMq.matches)
    return `
    <main class="ecran${ui.ranger ? '' : ' ecran-avec-flottant'}">
      ${entete()}
      ${ui.ranger ? rangement() : `<div class="categories">${categories.map(carteCategorie).join('')}</div>`}
    </main>
    ${ui.ranger ? '' : `<button type="button" class="bouton bouton-principal bouton-flottant" data-action="nouvelle-categorie">${ic('plus')}Nouvelle catégorie</button>`}`;
  const c = trouverCategorie(ui.choisie);
  const choix = x => `
          <li data-flip="cat-${x.id}"${ui.recent === `cat-${x.id}` ? ' data-recent' : ''}>
            <button type="button" class="choix" data-action="choisir" data-id="${x.id}" aria-current="${x.id === c.id}">
              ${pave(x.icone, x.couleur)}
              <span class="categorie-nom"><b>${echapper(x.nom)}</b>${inclusionCategorie(x)}</span>
              <span class="chevron" aria-hidden="true">${svg['caret-right']}</span>
            </button>
          </li>`;
  return `
    <main class="panneaux">
      <div class="panneau panneau-gauche">
        ${entete()}
        ${
          ui.ranger
            ? rangement()
            : `<nav aria-label="Catégories"><ul class="choix-liste">${categories.map(choix).join('')}</ul></nav>
        <button type="button" class="bouton bouton-secondaire bouton-large" data-action="nouvelle-categorie">${ic('plus')}Nouvelle catégorie</button>`
        }
      </div>
      <section class="panneau panneau-droit" aria-labelledby="detail-titre">
        <div class="detail">
          <div class="detail-tete">
            ${pave(c.icone, c.couleur)}
            <div class="detail-titre"><h2 id="detail-titre">${echapper(c.nom)}</h2>${inclusionCategorie(c)}</div>
            <button type="button" class="bouton bouton-secondaire" data-action="modifier-categorie" data-id="${c.id}">${ic('pencil-simple')}Modifier</button>
          </div>
          ${lignes(c)}
        </div>
      </section>
    </main>`;
}

const vueReglages = () => `
    <main class="ecran">
      ${barreHaut(['accueil', 'Mes voyages'])}
      <h1>Réglages</h1>
      <ul class="reglages">
        <li>
          <a class="reglage" href="#" data-action="vers" data-vue="bibliotheque">
            <span class="reglage-picto" aria-hidden="true">${svg.books}</span>
            <span class="reglage-texte"><b>Bibliothèque</b><span>Les catégories et les objets proposés à chaque nouveau voyage</span></span>
            <span class="chevron" aria-hidden="true">${svg['caret-right']}</span>
          </a>
        </li>
      </ul>
    </main>`;

function vueAccueil() {
  const carte = (nom, details, fait, total) => `
        <li>
          <a class="carte-voyage" href="#">
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
    <a class="bouton bouton-principal bouton-flottant" href="../assistant/">${ic('plus')}Nouveau voyage</a>`;
}

function menuMaquette() {
  if (CAPTURE) return '';
  const etats = [
    ['accueil', 'Accueil avec le bouton menu'],
    ['menu', 'Menu ouvert'],
    ['reglages', 'Réglages'],
    ['bibliotheque', 'Bibliothèque'],
    ['bibliotheque-ouverte', 'Bibliothèque, une catégorie dépliée'],
    ['ranger', 'Ranger les catégories'],
    ['fiche-categorie', 'Fiche de catégorie (Camping)'],
    ['nouvelle-categorie', 'Nouvelle catégorie'],
    ['catalogue', 'Catalogue des pictos'],
    ['catalogue-recherche', 'Catalogue : recherche « sol »'],
    ['catalogue-vide', 'Catalogue : aucun picto trouvé'],
    ['fiche-objet', 'Fiche d’objet (Repas)'],
    ['objet-etiquettes', 'Objet selon les étiquettes (Crème solaire)'],
    ['nouvel-objet', 'Nouvel objet'],
    ['refus', 'Objet refusé : sans nom ni quantité'],
    ['abandon', 'Abandonner les modifications ?'],
    ['panne', 'Panne d’enregistrement'],
  ];
  return `
    <details class="maquette-menu">
      <summary>Maquette ▾</summary>
      <nav>${etats.map(([e, t]) => `<a href="?etat=${e}"${e === ETAT ? ' aria-current="page"' : ''}>${t}</a>`).join('')}</nav>
    </details>`;
}

// Rend l'écran ; les éléments [data-flip] glissent de leur ancienne place à la nouvelle.
function rendre({ glisser = false } = {}) {
  const avant = new Map();
  if (glisser) for (const el of app.querySelectorAll('[data-flip]')) avant.set(el.dataset.flip, el.getBoundingClientRect().top);
  const focus = document.activeElement?.closest('[data-action]');
  const cle = focus && app.contains(focus) && { action: focus.dataset.action, id: focus.dataset.id };
  const defilement = [...app.querySelectorAll('.panneau')].map(p => p.scrollTop);
  app.innerHTML = { accueil: vueAccueil, reglages: vueReglages, bibliotheque: vueBibliotheque }[ui.vue]() + menuMaquette();
  app.querySelectorAll('.panneau').forEach((p, i) => (p.scrollTop = defilement[i] ?? 0));
  if (cle) app.querySelector(`[data-action="${cle.action}"]${cle.id ? `[data-id="${cle.id}"]` : ''}`)?.focus({ preventScroll: true });
  ui.recent = null;
  if (!glisser || reduit.matches) return;
  for (const el of app.querySelectorAll('[data-flip]')) {
    const ancien = avant.get(el.dataset.flip);
    if (ancien === undefined) continue;
    const delta = ancien - el.getBoundingClientRect().top;
    if (Math.abs(delta) > 1)
      el.animate([{ transform: `translateY(${delta}px)` }, { transform: 'none' }], { duration: 220, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' });
  }
}

// ---------- Menu ----------
function ouvrirMenu() {
  const courant = ui.vue === 'accueil' ? 'accueil' : 'reglages';
  const lien = (vue, icone, texte, href = '#') =>
    `<li><a class="tiroir-lien" href="${href}" data-vue="${vue}"${vue === courant ? ' aria-current="page"' : ''}>${ic(icone)}${texte}</a></li>`;
  const d = document.createElement('dialog');
  d.className = 'tiroir';
  d.setAttribute('aria-labelledby', 'tiroir-titre');
  d.innerHTML = `
      <header class="tiroir-tete">
        <img src="${MASCOTTE}" alt="" width="40" height="40" />
        <h2 id="tiroir-titre" tabindex="-1">Baluchon</h2>
        <button type="button" class="bouton-icone bouton-fermer" data-fermer aria-label="Fermer le menu">${ic('x')}</button>
      </header>
      <nav aria-label="Menu">
        <ul class="tiroir-liste">
          ${lien('accueil', 'suitcase-rolling', 'Mes voyages')}
          ${lien('nouveau', 'plus-circle', 'Nouveau voyage', '../assistant/')}
          ${lien('reglages', 'gear-six', 'Réglages')}
        </ul>
      </nav>`;
  const { fermer } = ouvrir(d);
  d.addEventListener('click', e => {
    const a = e.target.closest('[data-vue]');
    if (!a || a.dataset.vue === 'nouveau') return;
    e.preventDefault();
    fermer();
    allerVers(a.dataset.vue);
  });
}

function allerVers(vue) {
  ui.vue = vue;
  ui.ranger = false;
  rendre();
  scrollTo(0, 0);
  app.querySelector('h1')?.focus?.();
}

// ---------- Enregistrements ----------
const panne = () => ui.panne;

function modifierCategorie(c) {
  ficheCategorie({ categorie: c, panne, surEnregistrer: b => (Object.assign(c, b), (ui.recent = `cat-${c.id}`), rendre()) });
}

function nouvelleCategorie() {
  ficheCategorie({
    categorie: null,
    panne,
    surEnregistrer: b => {
      const c = { id: nouvelId(), ...b, objets: [] };
      categories.push(c);
      ui.ouvertes.add(c.id);
      ui.choisie = c.id;
      ui.recent = `cat-${c.id}`;
      rendre();
      app.querySelector(`[data-flip="cat-${c.id}"]`)?.scrollIntoView({ block: 'center' });
    },
  });
}

function modifierObjet(x) {
  ficheObjet({ objet: x, categorie: categorieDe(x), panne, surEnregistrer: b => (Object.assign(x, b), (ui.recent = x.id), rendre()) });
}

function nouvelObjet(c) {
  ficheObjet({
    objet: null,
    categorie: c,
    panne,
    surEnregistrer: b => {
      const x = { id: nouvelId(), ...b };
      c.objets.push(x);
      ui.recent = x.id;
      rendre();
    },
  });
}

function deplacer(id, sens) {
  const i = categories.findIndex(c => c.id === id);
  const j = i + sens;
  if (j < 0 || j >= categories.length) return;
  [categories[i], categories[j]] = [categories[j], categories[i]];
  if (ui.panne) {
    [categories[i], categories[j]] = [categories[j], categories[i]];
    return alerte('Le nouvel ordre n’a pas pu être enregistré. Rien n’a changé ; réessayez.');
  }
  ui.annonce = `${categories[j].nom} : ${j + 1}e sur ${categories.length}`.replace(': 1e', ': 1re');
  rendre({ glisser: true });
  app.querySelector(`[data-flip="cat-${id}"]`)?.scrollIntoView({ block: 'nearest' });
}

// ---------- Gestes ----------
app.addEventListener('click', e => {
  const b = e.target.closest('[data-action]');
  if (!b || b.getAttribute('aria-disabled') === 'true') return;
  const { action, id } = b.dataset;
  if (action === 'menu') ouvrirMenu();
  else if (action === 'vers') {
    e.preventDefault();
    allerVers(b.dataset.vue);
  } else if (action === 'accordeon') {
    ui.ouvertes.has(id) ? ui.ouvertes.delete(id) : ui.ouvertes.add(id);
    rendre();
  } else if (action === 'choisir') {
    ui.choisie = id;
    rendre();
    app.querySelector('.panneau-droit')?.scrollTo(0, 0);
  } else if (action === 'ranger' || action === 'terminer') {
    ui.ranger = action === 'ranger';
    ui.annonce = '';
    rendre();
    app.querySelector(ui.ranger ? '.rangement-liste .bouton-icone:not([aria-disabled])' : '[data-action="ranger"]')?.focus();
  } else if (action === 'monter') deplacer(id, -1);
  else if (action === 'descendre') deplacer(id, 1);
  else if (action === 'modifier-categorie') modifierCategorie(trouverCategorie(id));
  else if (action === 'nouvelle-categorie') nouvelleCategorie();
  else if (action === 'modifier-objet') modifierObjet(trouverObjet(id));
  else if (action === 'nouvel-objet') nouvelObjet(trouverCategorie(id));
});

largeMq.addEventListener('change', () => rendre());

// ---------- États de départ ----------
if (ETAT === 'bibliotheque-ouverte' || ETAT === 'refus' || ETAT === 'nouvel-objet') ui.ouvertes.add('alimentation');
if (largeMq.matches && ['bibliotheque-ouverte', 'fiche-objet', 'nouvel-objet', 'refus', 'abandon', 'panne'].includes(ETAT)) ui.choisie = 'alimentation';
if (largeMq.matches && ['fiche-categorie', 'catalogue', 'catalogue-recherche', 'catalogue-vide'].includes(ETAT)) ui.choisie = 'camping';
if (largeMq.matches && ETAT === 'objet-etiquettes') ui.choisie = 'toilette';
rendre();

const objetNomme = nom => tousLesObjets().find(x => x.nom === nom);
const repas = objetNomme('Repas');
const attendre = () => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
if (ETAT === 'menu') ouvrirMenu();
if (ETAT === 'fiche-categorie') modifierCategorie(trouverCategorie('camping'));
if (ETAT === 'nouvelle-categorie') nouvelleCategorie();
if (ETAT.startsWith('catalogue')) {
  const c = trouverCategorie('camping');
  modifierCategorie(c);
  const brouillon = { icone: c.icone, couleur: c.couleur };
  const { chercher } = ouvrirCatalogue(brouillon, () => {});
  if (ETAT === 'catalogue-recherche') chercher('sol');
  if (ETAT === 'catalogue-vide') chercher('xyz');
}
if (ETAT === 'fiche-objet' || ETAT === 'panne') modifierObjet(repas);
if (ETAT === 'objet-etiquettes') modifierObjet(objetNomme('Crème solaire'));
if (ETAT === 'nouvel-objet' || ETAT === 'refus') nouvelObjet(trouverCategorie('alimentation'));
if (ETAT === 'refus') {
  const f = document.querySelector('.fiche-modele');
  const valeur = f.querySelector('input[data-f="valeur"]');
  valeur.value = '';
  valeur.dispatchEvent(new Event('input', { bubbles: true }));
  f.querySelector('[data-f="enregistrer"]').click();
}
if (ETAT === 'abandon') {
  modifierObjet(repas);
  const f = document.querySelector('.fiche-modele');
  f.querySelector('[data-f="valeur-plus"]').click();
  f.querySelector('.bouton-fermer').click();
}
if (ETAT === 'panne') document.querySelector('.fiche-modele [data-f="enregistrer"]').click();
await attendre();
document.documentElement.dataset.pret = '';
