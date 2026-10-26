// Maquette validée par le chef de projet le 2026-10-24 (phase 3) ; servir la racine du dépôt (`python3 -m http.server`) et ouvrir `/docs/maquettes/voyage/`
// Maquette cliquable de l'écran du voyage (phase 3, forme définitive). Brouillon autonome : il
// imite les gestes décidés le 2026-10-24 sans toucher au code de l'appli.
const params = new URLSearchParams(location.search);
const ETAT = params.get('etat') ?? 'en-cours';
const CAPTURE = params.has('capture');
const AVENIR = params.get('avenir') !== 'non';
const DELAI = 1000;
const reduit = matchMedia('(prefers-reduced-motion: reduce)');
const largeMq = matchMedia('(min-width: 1000px) and (orientation: landscape)');

// ---------- Icônes Phosphor (lues dans node_modules) ----------
const ICONES = {
  'identification-card': 'duotone',
  't-shirt': 'duotone',
  tooth: 'duotone',
  'fork-knife': 'duotone',
  tent: 'duotone',
  'battery-charging': 'duotone',
  check: 'bold',
  minus: 'bold',
  plus: 'bold',
  info: 'bold',
  'caret-down': 'bold',
  'caret-right': 'bold',
  'caret-left': 'bold',
  x: 'bold',
  'warning-circle': 'bold',
  'shopping-cart': 'bold',
  funnel: 'bold',
  'pencil-simple': 'bold',
  trash: 'bold',
  'check-circle': 'bold',
};
const svg = {};
await Promise.all(
  Object.entries(ICONES).map(async ([nom, graisse]) => {
    const r = await fetch(`../../../node_modules/@phosphor-icons/core/assets/${graisse}/${nom}-${graisse}.svg`);
    svg[nom] = await r.text();
  }),
);
const ic = nom => `<span class="icone" aria-hidden="true">${svg[nom]}</span>`;
const MASCOTTE = '../../../src/images/baluchon.svg';
const phase = n => (AVENIR ? `<span class="etiquette-phase">phase${String(n).includes(' ') ? 's' : ''} ${n}</span>` : '');

// ---------- Données d'essai ----------
let n = 0;
const o = (nom, quantite, dansLeSac = 0, extra = {}) => ({ id: `o${n++}`, nom, quantite, dansLeSac, ...extra });
function donnees() {
  if (ETAT === 'vide') return [];
  const cats = [
    {
      id: 'papiers',
      nom: 'Papiers',
      icone: 'identification-card',
      couleur: 'ciel',
      objets: [
        o('Pièce d’identité', 2, 2, {
          note: 'Vérifier la date de validité avant de partir : certaines démarches prennent des semaines.',
          regle: '1 par personne',
        }),
        o('Carte bancaire', 1, 1, { partage: true }),
        o('Billets de train', 1, 1, { partage: true }),
      ],
    },
    {
      id: 'vetements',
      nom: 'Vêtements',
      icone: 't-shirt',
      couleur: 'framboise',
      objets: [
        o('T-shirts', 8, 0, { regle: '1 par jour et par personne' }),
        o('Sous-vêtements', 8, 0, { regle: '1 par jour et par personne' }),
        o('Chaussettes', 8, 5, { regle: '1 par jour et par personne' }),
        o('Pantalons', 4, 0, { regle: '2 par personne' }),
        o('Pull', 2, 2),
        o('Veste de pluie', 2, 0, { note: 'La pluie bretonne ne prévient pas : à garder sur le dessus du sac.' }),
        o('Pyjama', 2, 2),
        o('Maillot de bain', 2, 2),
      ],
    },
    {
      id: 'toilette',
      nom: 'Toilette',
      icone: 'tooth',
      couleur: 'lagon',
      objets: [
        o('Brosse à dents', 2, 2),
        o('Dentifrice', 1, 1, { partage: true }),
        o('Gel douche', 1, 1, { partage: true }),
        o('Serviettes', 2, 2),
        o('Trousse de secours', 1, 1, { partage: true, note: 'Pansements, désinfectant, antidouleur, pince à tiques.' }),
        o('Crème solaire', 1, 0, { partage: true, note: 'Indice 50 au bord de l’eau ; en remettre toutes les deux heures.' }),
      ],
    },
    {
      id: 'alimentation',
      nom: 'Alimentation',
      icone: 'fork-knife',
      couleur: 'tournesol',
      objets: [
        o('Repas lyophilisés', 16, 6, {
          aAcheter: true,
          regle: '2 par jour et par personne',
          note: 'Prévoir un repas de secours par personne en plus.',
        }),
        o('Barres énergétiques', 12, 0, { aAcheter: true, regle: '2 par jour et par personne, au plus 6' }),
        o('Café soluble', 1, 0, { partage: true }),
        o('Gourde', 2, 2),
        o('Réchaud', 1, 1, { partage: true }),
        o('Sel et poivre', 1, 0, { partage: true }),
      ],
    },
    {
      id: 'camping',
      nom: 'Camping',
      icone: 'tent',
      couleur: 'pomme',
      objets: [
        o('Tente', 1, 0, { partage: true }),
        o('Sacs de couchage', 2, 0),
        o('Matelas', 2, 0),
        o('Lampes frontales', 2, 0),
        o('Couteau', 1, 0, { partage: true }),
      ],
    },
    {
      id: 'electronique',
      nom: 'Électronique',
      icone: 'battery-charging',
      couleur: 'lilas',
      objets: [o('Chargeur de téléphone', 2, 0), o('Batterie externe', 1, 0, { partage: true }), o('Câbles', 2, 0)],
    },
  ];
  if (ETAT === 'boucle' || ETAT === 'fin')
    for (const c of cats) for (const x of c.objets) x.dansLeSac = x.quantite;
  if (ETAT === 'fin') cats[4].objets[3].dansLeSac = 1;
  if (ETAT === 'tampon') cats[2].objets[5].dansLeSac = 1;
  return cats;
}

const categories = donnees();
const tous = () => categories.flatMap(c => c.objets);
const complet = x => x.dansLeSac >= x.quantite;
const faits = c => c.objets.filter(complet).length;
const estBouclee = c => c.objets.length > 0 && c.objets.every(complet);
const parNom = (a, b) => a.nom.localeCompare(b.nom, 'fr');
const ordreNaturel = c => [...c.objets.filter(x => !complet(x)).sort(parNom), ...c.objets.filter(complet).sort(parNom)];

// ---------- État de l'écran ----------
const ui = {
  vue: ETAT === 'accueil' ? 'accueil' : 'voyage',
  filtre: ETAT === 'filtre',
  ordre: new Map(categories.map(c => [c.id, ordreNaturel(c).map(x => x.id)])),
  bouclees: new Set(categories.filter(estBouclee).map(c => c.id)),
  poseTampon: new Set(),
  ouvertes: new Set(categories.filter(c => !estBouclee(c)).map(c => c.id)),
  enBas: new Set(),
  masques: new Set(),
  sacBoucle: categories.length > 0 && categories.every(estBouclee),
  poseBandeau: false,
  choisie: null,
  panne: ETAT === 'panne',
};
if (ETAT === 'tampon') {
  ui.ouvertes.add('toilette');
  ui.poseTampon.add('toilette');
}
if (ui.filtre) {
  ui.masques = new Set(tous().filter(complet).map(x => x.id));
  ui.enBas = new Set(ui.bouclees);
}
ui.choisie = (categories.find(c => !ui.bouclees.has(c.id)) ?? categories[0])?.id;
if (ETAT === 'tampon') ui.choisie = 'toilette';

const trouver = id => tous().find(x => x.id === id);
const categorieDe = x => categories.find(c => c.objets.includes(x));

// ---------- Rendu ----------
const app = document.getElementById('app');
const couche = document.getElementById('couche');

function ordreCategories() {
  if (!ui.filtre) return categories;
  return [...categories.filter(c => !ui.enBas.has(c.id)), ...categories.filter(c => ui.enBas.has(c.id))];
}

function compteOuTampon(c) {
  if (ui.bouclees.has(c.id))
    return `<span class="tampon"${ui.poseTampon.has(c.id) ? ' data-pose' : ''}>Bouclé !</span>`;
  return `<span class="compte">${faits(c)} / ${c.objets.length}</span>`;
}

function jauge(fait, total, mini = false) {
  const pc = total ? Math.round((100 * fait) / total) : 0;
  return `<span class="jauge${mini ? ' mini' : ''}"${fait === total && total ? ' data-fini' : ''}><i style="width:${pc}%"></i></span>`;
}

function progression() {
  const t = tous().length;
  const f = tous().filter(complet).length;
  if (ui.sacBoucle)
    return `
      <div class="progression" data-boucle${ui.poseBandeau ? ' data-pose' : ''} role="status">
        <img src="${MASCOTTE}" alt="" width="56" height="56" />
        <div class="progression-texte">
          <span class="progression-titre">Sac bouclé !</span>
          <span class="progression-ligne"><span>Tout est dans le sac</span><b>${f} / ${t}</b></span>
          ${jauge(f, t)}
        </div>
      </div>`;
  return `
      <div class="progression">
        <div class="progression-texte">
          <span class="progression-ligne"><span>Dans le sac</span><b>${f} / ${t}</b></span>
          ${jauge(f, t)}
        </div>
      </div>`;
}

function outils() {
  const m = ui.masques.size;
  const masques = ui.filtre && m ? `${m} objet${m > 1 ? 's' : ''} dans le sac, masqué${m > 1 ? 's' : ''}` : '';
  const courses = AVENIR
    ? `<a class="puce" href="#">${ic('shopping-cart')}Courses · 2</a>`
    : '';
  return `
      <div class="outils">
        <button type="button" class="puce" data-action="filtre" aria-pressed="${ui.filtre}">${ic('funnel')}Reste à emballer</button>
        ${courses}
      </div>
      ${masques ? `<p class="masques">${masques}</p>` : ''}`;
}

function entete() {
  return `
      <a class="lien-retour" href="?etat=accueil" data-action="accueil">${ic('caret-left')}Mes voyages</a>
      <h1>Presqu’île de Quiberon</h1>
      <p class="voyage-details">du ven. 9 oct. au lun. 12 oct. 2026 · 2 voyageurs</p>
      ${categories.length ? progression() + outils() : ''}`;
}

function etatObjet(x) {
  if (complet(x)) return 'plein';
  return x.dansLeSac > 0 ? 'entame' : 'vide';
}

function libelleCase(x) {
  if (complet(x)) return `${x.nom} : dans le sac. ${x.quantite > 1 ? 'Vider' : 'Décocher'}`;
  if (x.quantite === 1) return `${x.nom} : pas encore dans le sac. Cocher`;
  return `${x.nom} : ${x.dansLeSac} sur ${x.quantite} dans le sac. Ajouter une pièce`;
}

function ligne(x) {
  const etat = etatObjet(x);
  const quantite =
    etat === 'entame' ? `${x.dansLeSac}<small> / ${x.quantite}</small>` : `${x.quantite}`;
  const sous = [
    x.partage ? '<span>partagé</span>' : '',
    AVENIR && x.aAcheter ? `<span class="pastille-achat">${svg['shopping-cart']}à acheter</span>` : '',
  ].join('');
  return `
          <li class="objet" data-etat="${etat}" data-flip="${x.id}">
            <button type="button" class="case" data-action="case" data-id="${x.id}" aria-label="${libelleCase(x)}">
              <span class="case-boite" aria-hidden="true">${etat === 'plein' ? svg.check : ''}</span>
            </button>
            <button type="button" class="objet-corps" data-action="fiche" data-id="${x.id}">
              <span class="objet-texte">
                <span class="objet-nom">${x.nom}</span>
                ${sous ? `<span class="objet-sous">${sous}</span>` : ''}
              </span>
              <span class="objet-quantite">${quantite}</span>
              <span class="objet-note">${x.note ? `${svg.info}<span hidden>, une note</span>` : ''}</span>
            </button>
          </li>`;
}

function lignes(c) {
  const visibles = ui.ordre
    .get(c.id)
    .map(trouver)
    .filter(x => !ui.masques.has(x.id));
  if (!visibles.length) {
    const nb = c.objets.length;
    return `<p class="ligne-info">Catégorie bouclée : ${nb > 1 ? `ses ${nb} objets sont` : 'son objet est'} dans le sac, masqué${nb > 1 ? 's' : ''} par le filtre.</p>`;
  }
  return `<ul class="objets">${visibles.map(ligne).join('')}
        </ul>`;
}

function carteCategorie(c) {
  const ouverte = ui.ouvertes.has(c.id);
  return `
      <section class="categorie" data-flip="cat-${c.id}"${ui.filtre && ui.enBas.has(c.id) ? ' data-attenuee' : ''}>
        <h2 style="font: inherit; margin: 0">
          <button type="button" class="categorie-tete" data-action="accordeon" data-id="${c.id}" aria-expanded="${ouverte}">
            <span class="pave" data-couleur="${c.couleur}" aria-hidden="true">${svg[c.icone]}</span>
            <span class="categorie-nom"><b>${c.nom}</b>${jauge(faits(c), c.objets.length, true)}</span>
            ${compteOuTampon(c)}
            <span class="chevron" aria-hidden="true">${svg['caret-down']}</span>
          </button>
        </h2>
        ${ouverte ? lignes(c) : ''}
      </section>`;
}

function choixCategorie(c) {
  return `
          <li data-flip="cat-${c.id}">
            <button type="button" class="choix" data-action="choisir" data-id="${c.id}" aria-current="${ui.choisie === c.id}"${ui.filtre && ui.enBas.has(c.id) ? ' data-attenuee' : ''}>
              <span class="pave" data-couleur="${c.couleur}" aria-hidden="true">${svg[c.icone]}</span>
              <span class="categorie-nom"><b>${c.nom}</b>${jauge(faits(c), c.objets.length, true)}</span>
              ${compteOuTampon(c)}
              <span class="chevron" aria-hidden="true">${svg['caret-right']}</span>
            </button>
          </li>`;
}

function vueVide() {
  return `
      <section class="vide-voyage">
        <img src="${MASCOTTE}" alt="" width="88" height="88" />
        <h2>Rien à emballer pour l’instant</h2>
        <p>Aucun objet de la bibliothèque ne correspondait à ce voyage. Ajoutez-en ici, ou marquez dans la bibliothèque ceux qui partent à chaque fois.</p>
        ${AVENIR ? `<button type="button" class="bouton bouton-principal">${ic('plus')}Ajouter un objet</button>` : ''}
      </section>`;
}

const flottant = () =>
  AVENIR && categories.length
    ? `<button type="button" class="bouton bouton-principal bouton-flottant">${ic('plus')}Ajouter un objet</button>`
    : '';

function vueVoyage() {
  if (!categories.length || !largeMq.matches)
    return `
    <main class="ecran${flottant() ? ' ecran-avec-flottant' : ''}">
      ${entete()}
      ${categories.length ? `<div class="categories">${ordreCategories().map(carteCategorie).join('')}</div>` : vueVide()}
    </main>${flottant()}`;
  const c = categories.find(x => x.id === ui.choisie);
  return `
    <main class="panneaux">
      <div class="panneau panneau-gauche">
        ${entete()}
        <nav aria-label="Catégories">
          <ul class="choix-liste">${ordreCategories().map(choixCategorie).join('')}
          </ul>
        </nav>
      </div>
      <section class="panneau panneau-droit${flottant() ? ' ecran-avec-flottant' : ''}" aria-labelledby="detail-titre">
        <div class="detail">
          <div class="detail-tete">
            <span class="pave" data-couleur="${c.couleur}" aria-hidden="true">${svg[c.icone]}</span>
            <h2 id="detail-titre">${c.nom}</h2>
            ${compteOuTampon(c)}
          </div>
          ${lignes(c)}
        </div>
      </section>
    </main>${flottant()}`;
}

function vueAccueil() {
  const carte = (nom, destination, details, prog) => `
        <li>
          <a class="carte-voyage" href="?etat=en-cours" data-action="ouvrir">
            <span class="carte-voyage-nom">${nom}</span>
            ${destination ? `<span class="carte-voyage-destination">${destination}</span>` : ''}
            <span class="carte-voyage-details">${details}</span>
            ${prog}
          </a>
        </li>`;
  const prog = (f, t) =>
    f === t
      ? `<span class="carte-progression"><span class="pastille-boucle">${svg['check-circle']}Sac bouclé</span></span>`
      : `<span class="carte-progression">${jauge(f, t, true)}<span>${f} / ${t} dans le sac</span></span>`;
  const t = tous().length;
  const f = tous().filter(complet).length;
  return `
    <main class="ecran ecran-avec-flottant">
      <h1>Mes voyages</h1>
      <section class="rubrique"><h2>En cours</h2><ul class="voyages">
        ${carte('Presqu’île de Quiberon', 'Quiberon', 'du ven. 9 oct. au lun. 12 oct. 2026 · 2 voyageurs', prog(f, t))}
      </ul></section>
      <section class="rubrique"><h2>À venir</h2><ul class="voyages">
        ${carte('Week-end à Lyon', 'Lyon', 'du sam. 7 nov. au dim. 8 nov. 2026 · 2 voyageurs', prog(0, 18))}
        ${carte('Traversée du Vercors', 'Vercors', 'du jeu. 12 nov. au dim. 15 nov. 2026 · 2 voyageurs', prog(24, 24))}
      </ul></section>
      <section class="rubrique"><h2>Passés</h2><ul class="voyages">
        ${carte('Noël à Annecy', '', 'du jeu. 24 déc. au dim. 27 déc. 2026 · 4 voyageurs', '')}
      </ul></section>
    </main>
    <a class="bouton bouton-principal bouton-flottant" href="#">${ic('plus')}Nouveau voyage</a>`;
}

function menuMaquette() {
  if (CAPTURE) return '';
  const lien = (etat, texte) => `<a href="?etat=${etat}${AVENIR ? '' : '&avenir=non'}">${texte}</a>`;
  return `
    <details class="maquette-menu">
      <summary>Maquette ▾</summary>
      <nav>
        ${lien('en-cours', 'Liste en cours')}
        ${lien('tampon', 'Catégorie qui vient d’être bouclée')}
        ${lien('filtre', 'Filtre « Reste à emballer » actif')}
        ${lien('fin', 'Plus qu’une lampe frontale')}
        ${lien('boucle', 'Sac bouclé')}
        ${lien('vide', 'Voyage sans objet')}
        ${lien('fiche', 'Fiche ouverte (Repas)')}
        ${lien('confirmation', 'Confirmation « Vider »')}
        ${lien('panne', 'Panne d’enregistrement')}
        ${lien('accueil', 'Accueil, avec progression')}
        <a href="?etat=${ETAT}${AVENIR ? '&avenir=non' : ''}">${AVENIR ? 'Masquer' : 'Montrer'} les éléments des phases 8 et 9</a>
      </nav>
    </details>`;
}

// Rend l'écran ; les éléments [data-flip] glissent de leur ancienne place à la nouvelle.
function rendre({ glisser = false } = {}) {
  const avant = new Map();
  if (glisser) for (const el of app.querySelectorAll('[data-flip]')) avant.set(el.dataset.flip, el.getBoundingClientRect().top);
  const focus = document.activeElement?.closest('[data-action]');
  const cle = focus && { action: focus.dataset.action, id: focus.dataset.id };
  const defilement = [...app.querySelectorAll('.panneau')].map(p => p.scrollTop);
  app.innerHTML = (ui.vue === 'accueil' ? vueAccueil() : vueVoyage()) + menuMaquette();
  app.querySelectorAll('.panneau').forEach((p, i) => (p.scrollTop = defilement[i] ?? 0));
  if (cle) app.querySelector(`[data-action="${cle.action}"]${cle.id ? `[data-id="${cle.id}"]` : ''}`)?.focus({ preventScroll: true });
  ui.poseTampon.clear();
  ui.poseBandeau = false;
  if (!glisser || reduit.matches) return;
  for (const el of app.querySelectorAll('[data-flip]')) {
    const ancien = avant.get(el.dataset.flip);
    if (ancien === undefined) continue;
    const delta = ancien - el.getBoundingClientRect().top;
    if (Math.abs(delta) > 1)
      el.animate([{ transform: `translateY(${delta}px)` }, { transform: 'none' }], {
        duration: 320,
        easing: 'cubic-bezier(0.65, 0, 0.35, 1)',
      });
  }
}

// ---------- Gestes ----------
let minuteur = null;
function planifierRangement() {
  clearTimeout(minuteur);
  minuteur = setTimeout(ranger, DELAI);
}

async function ranger() {
  const aMasquer = ui.filtre ? tous().filter(x => complet(x) && !ui.masques.has(x.id)) : [];
  if (aMasquer.length && !reduit.matches) {
    const els = aMasquer.map(x => app.querySelector(`[data-flip="${x.id}"]`)).filter(Boolean);
    await Promise.all(els.map(el => el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 160, fill: 'forwards' }).finished));
  }
  for (const c of categories) ui.ordre.set(c.id, ordreNaturel(c).map(x => x.id));
  ui.masques = ui.filtre ? new Set(tous().filter(complet).map(x => x.id)) : new Set();
  const nouvelles = categories.filter(c => estBouclee(c) && !ui.bouclees.has(c.id));
  for (const c of categories)
    if (ui.bouclees.has(c.id) && !estBouclee(c)) {
      ui.bouclees.delete(c.id);
      ui.enBas.delete(c.id);
    }
  for (const c of nouvelles) {
    ui.bouclees.add(c.id);
    ui.poseTampon.add(c.id);
  }
  const sac = categories.every(estBouclee);
  if (sac && !ui.sacBoucle) ui.poseBandeau = true;
  ui.sacBoucle = sac;
  rendre({ glisser: true });
  if (!nouvelles.length) return;
  // Une seconde de tampon, puis la catégorie se replie (une colonne) ou cède la place à la suivante
  // (deux panneaux) ; sous le filtre, elle descend en bas, atténuée.
  setTimeout(() => {
    for (const c of nouvelles) {
      if (!ui.bouclees.has(c.id)) continue;
      ui.ouvertes.delete(c.id);
      if (ui.filtre) ui.enBas.add(c.id);
    }
    if (nouvelles.some(c => c.id === ui.choisie)) {
      const ordre = ordreCategories();
      const i = ordre.findIndex(c => c.id === ui.choisie);
      const suivante = [...ordre.slice(i + 1), ...ordre.slice(0, i)].find(c => !ui.bouclees.has(c.id));
      if (suivante) ui.choisie = suivante.id;
    }
    rendre({ glisser: true });
  }, DELAI);
}

let alerteMinuteur = null;
function alerte(texte) {
  couche.querySelector('.alerte')?.remove();
  couche.insertAdjacentHTML(
    'beforeend',
    `<div class="message message-erreur alerte" role="alert">${ic('warning-circle')}<span>${texte}</span></div>`,
  );
  clearTimeout(alerteMinuteur);
  alerteMinuteur = setTimeout(() => couche.querySelector('.alerte')?.remove(), 6000);
}

// Toute modification passe par ici : en panne simulée, rien ne change et un message le dit.
function enregistrer(x, valeur) {
  if (ui.panne) {
    alerte('La coche n’a pas pu être enregistrée. Rien n’a changé ; réessayez.');
    return false;
  }
  x.dansLeSac = Math.max(0, Math.min(x.quantite, valeur));
  return true;
}

function toucherCase(x) {
  if (complet(x)) {
    if (x.quantite > 1) return confirmerVider(x);
    if (!enregistrer(x, 0)) return;
  } else if (!enregistrer(x, x.dansLeSac + 1)) return;
  rendre();
  const nouvelle = app.querySelector(`.case[data-id="${x.id}"]`);
  if (nouvelle) {
    nouvelle.dataset.pulse = '';
    nouvelle.focus({ preventScroll: true });
  }
  planifierRangement();
}

// ---------- Fenêtres : fiche et confirmation ----------
function ouvrir(dialog, { surFermeture } = {}) {
  let ferme = false;
  async function fermer() {
    if (ferme) return;
    ferme = true;
    dialog.dataset.fermeture = '';
    await Promise.allSettled(dialog.getAnimations().map(a => a.finished));
    dialog.close();
    dialog.remove();
    surFermeture?.();
  }
  dialog.addEventListener('click', e => {
    if (e.target === dialog || e.target.closest('[data-fermer]')) fermer();
  });
  dialog.addEventListener('cancel', e => {
    e.preventDefault();
    fermer();
  });
  // Au doigt, un glissé vers le bas referme la fiche.
  const tete = dialog.querySelector('.fenetre-entete');
  let depart = null;
  tete?.addEventListener('pointerdown', e => (depart = e.clientY));
  tete?.addEventListener('pointermove', e => {
    if (depart === null) return;
    const dy = Math.max(0, e.clientY - depart);
    dialog.style.transform = `translateY(${dy}px)`;
  });
  tete?.addEventListener('pointerup', e => {
    const dy = depart === null ? 0 : e.clientY - depart;
    depart = null;
    dialog.style.transform = '';
    if (dy > 80) fermer();
  });
  couche.append(dialog);
  dialog.showModal();
  dialog.querySelector('h2')?.focus();
  return fermer;
}

function contenuFiche(x) {
  const c = categorieDe(x);
  const regle = [c.nom, x.regle ?? (x.partage ? 'partagé' : null)].filter(Boolean).join(' · ');
  const venir = AVENIR
    ? `
        <div class="fiche-venir">
          <h3>Ajuster cet objet ${phase('8 et 9')}</h3>
          <div class="ligne-reglage">
            <span>Quantité prévue<small>calculée : ${x.regle ?? 'fixe'}</small></span>
            <span class="compteur">
              <button type="button" class="bouton-icone" aria-label="Un de moins">${ic('minus')}</button>
              <output style="font-size: 22px">${x.quantite}</output>
              <button type="button" class="bouton-icone" aria-label="Un de plus">${ic('plus')}</button>
            </span>
          </div>
          <div class="ligne-reglage">
            <span>À acheter<small>apparaît dans les Courses</small></span>
            <span class="interrupteur" role="switch" aria-checked="${Boolean(x.aAcheter)}" aria-label="À acheter"></span>
          </div>
          <div class="fiche-actions">
            <button type="button" class="bouton bouton-secondaire">${ic('pencil-simple')}Renommer</button>
            <button type="button" class="bouton bouton-danger">${ic('trash')}Retirer du voyage</button>
          </div>
        </div>`
    : '';
  return `
      <div class="fiche-corps">
        <p class="fiche-regle">${regle}</p>
        <section class="fiche-bloc" aria-labelledby="fiche-sac">
          <h3 id="fiche-sac">Dans le sac</h3>
          <div class="compteur">
            <button type="button" class="bouton-icone" data-fiche="moins" aria-label="Une pièce de moins"${x.dansLeSac === 0 ? ' aria-disabled="true"' : ''}>${ic('minus')}</button>
            <output aria-live="polite">${x.dansLeSac}</output>
            <button type="button" class="bouton-icone" data-fiche="plus" aria-label="Une pièce de plus"${complet(x) ? ' aria-disabled="true"' : ''}>${ic('plus')}</button>
            <span>sur ${x.quantite}</span>
          </div>
          <div class="fiche-actions">
            <button type="button" class="bouton bouton-principal" data-fiche="tout"${complet(x) ? ' aria-disabled="true"' : ''}>${ic('check')}Tout dans le sac</button>
            <button type="button" class="bouton bouton-secondaire" data-fiche="vider"${x.dansLeSac === 0 ? ' aria-disabled="true"' : ''}>Vider</button>
          </div>
        </section>
        ${x.note ? `<section class="fiche-bloc" aria-labelledby="fiche-note"><h3 id="fiche-note">Note</h3><p class="fiche-note">${ic('info')}<span>${x.note}</span></p></section>` : ''}
        ${venir}
      </div>`;
}

function ouvrirFiche(x) {
  const d = document.createElement('dialog');
  d.className = 'fenetre fiche';
  d.setAttribute('aria-labelledby', 'fiche-titre');
  const peindre = () => {
    d.innerHTML = `
      <header class="fenetre-entete">
        <h2 id="fiche-titre" tabindex="-1">${x.nom}</h2>
        <button type="button" class="bouton-icone bouton-fermer" data-fermer aria-label="Fermer">${ic('x')}</button>
      </header>${contenuFiche(x)}`;
  };
  peindre();
  d.addEventListener('click', e => {
    const b = e.target.closest('[data-fiche]');
    if (!b || b.getAttribute('aria-disabled') === 'true') return;
    // Vider plus d'une pièce demande confirmation, comme la case (décision du 2026-10-24).
    if (b.dataset.fiche === 'vider' && x.dansLeSac > 1) return confirmerVider(x, peindre);
    const valeur = { moins: x.dansLeSac - 1, plus: x.dansLeSac + 1, tout: x.quantite, vider: 0 }[b.dataset.fiche];
    if (!enregistrer(x, valeur)) return;
    const quoi = b.dataset.fiche;
    peindre();
    d.querySelector(`[data-fiche="${quoi}"]`)?.focus();
    rendre();
    planifierRangement();
  });
  ouvrir(d);
}

function confirmerVider(x, apres) {
  const d = document.createElement('dialog');
  d.className = 'fenetre confirmation';
  d.setAttribute('role', 'alertdialog');
  d.setAttribute('aria-labelledby', 'confirmation-titre');
  d.innerHTML = `
      <header class="fenetre-entete">
        <h2 id="confirmation-titre" tabindex="-1">Vider « ${x.nom} » ?</h2>
      </header>
      <p>Les ${x.dansLeSac} pièces repartent hors du sac.</p>
      <div class="fenetre-pied">
        <button type="button" class="bouton bouton-secondaire" data-fermer>Annuler</button>
        <button type="button" class="bouton bouton-principal" data-vider>Vider</button>
      </div>`;
  const fermer = ouvrir(d);
  d.querySelector('[data-vider]').addEventListener('click', () => {
    if (enregistrer(x, 0)) {
      rendre();
      apres?.();
      planifierRangement();
    }
    fermer();
  });
}

app.addEventListener('click', e => {
  const b = e.target.closest('[data-action]');
  if (!b) return;
  const { action, id } = b.dataset;
  if (action === 'accueil' || action === 'ouvrir') {
    e.preventDefault();
    ui.vue = action === 'accueil' ? 'accueil' : 'voyage';
    rendre();
    scrollTo(0, 0);
  } else if (action === 'case') toucherCase(trouver(id));
  else if (action === 'fiche') ouvrirFiche(trouver(id));
  else if (action === 'accordeon') {
    ui.ouvertes.has(id) ? ui.ouvertes.delete(id) : ui.ouvertes.add(id);
    rendre();
  } else if (action === 'choisir') {
    ui.choisie = id;
    rendre();
    app.querySelector('.panneau-droit')?.scrollTo(0, 0);
  } else if (action === 'filtre') {
    ui.filtre = !ui.filtre;
    ui.masques = ui.filtre ? new Set(tous().filter(complet).map(x => x.id)) : new Set();
    ui.enBas = ui.filtre ? new Set(ui.bouclees) : new Set();
    rendre({ glisser: true });
  }
});

largeMq.addEventListener('change', () => rendre());
rendre();
document.documentElement.dataset.pret = '';

// États qui s'ouvrent sur une fenêtre ou un message.
if (ETAT === 'fiche') ouvrirFiche(trouver('o17'));
if (ETAT === 'confirmation') confirmerVider(trouver('o20'));
if (ETAT === 'tampon' && !largeMq.matches) document.querySelector('[data-flip="cat-toilette"]')?.scrollIntoView({ block: 'center' });
if (ETAT === 'panne') alerte('La coche n’a pas pu être enregistrée. Rien n’a changé ; réessayez.');

// Phase 7 : le bandeau « Annuler » qui suit d'un écran à l'autre (docs/maquettes/suppressions/).
if (params.has('bandeau'))
  import('../suppressions/bandeau.js').then(({ montrerBandeau }) => {
    const reste = params.get('reste');
    montrerBandeau({ texte: params.get('bandeau'), duree: CAPTURE || !reste || reste === 'toujours' ? Infinity : Number(reste) });
    document.documentElement.dataset.bandeau = '';
  });
