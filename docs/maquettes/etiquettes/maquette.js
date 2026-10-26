// Maquette de la phase 6 (étiquettes modifiables), d'après la conception validée le 2026-10-26
// (docs/superpowers/specs/2026-10-26-phase-6-etiquettes-design.md). Brouillon autonome : il imite
// les gestes sans toucher au code de l'appli, avec les styles de l'appli et les outils de la maquette
// de la bibliothèque. Servir la racine du dépôt (`python3 -m http.server 8645`) et ouvrir
// `/docs/maquettes/etiquettes/`.
import { alerte, chargerIcones, echapper, ic, ouvrir, reduit, svg } from '../bibliotheque/outils.js';
import { ouvrirAssistant } from './assistant.js';
import { ficheEtiquette, ficheGroupe } from './fiches.js';

const params = new URLSearchParams(location.search);
const ETAT = params.get('etat') ?? 'etiquettes';
const CAPTURE = params.has('capture');
const MASCOTTE = '../../../src/images/baluchon.svg';

await chargerIcones();
// Les pictos d'interface propres à cette maquette, en plus de ceux de la bibliothèque.
const lire = nom => fetch(`../../../node_modules/@phosphor-icons/core/assets/bold/${nom}-bold.svg`).then(r => r.text());
for (const nom of ['tag', 'trash', 'list-checks']) svg[nom] = await lire(nom);

let n = 0;
const nouvelId = () => `n${n++}`;
const g = (nom, etiquettes) => ({ id: nouvelId(), nom, etiquettes: etiquettes.map(e => ({ id: nouvelId(), nom: e })) });
// La mini-bibliothèque de départ (src/i18n/fr.json, « bibliothequeDeDepart »).
const groupes = [
  g('Activités', ['Randonnée', 'Camping', 'Plage']),
  g('Climat', ['Chaud', 'Froid', 'Pluie']),
  g('Hébergement', ['Hôtel', 'Tente', 'Chez l’habitant']),
];
if (ETAT === 'groupe-vide') groupes.push(g('Transport', []));

const ui = {
  vue: ETAT === 'reglages' ? 'reglages' : 'etiquettes',
  ranger: ETAT === 'ranger',
  panne: ETAT === 'panne',
  recent: null,
  annonce: '',
};
const panne = () => ui.panne;
const pluriel = (nb, mot) => `${nb} ${mot}${nb > 1 ? 's' : ''}`;
const trouverGroupe = id => groupes.find(x => x.id === id);
const groupeDe = id => groupes.find(x => x.etiquettes.some(e => e.id === id));
const trouverEtiquette = id => groupeDe(id)?.etiquettes.find(e => e.id === id);

// ---------- Morceaux communs ----------
const app = document.getElementById('app');

const barreHaut = retour => `
      <div class="barre-haut">
        <button type="button" class="bouton-icone bouton-menu" data-action="menu" aria-label="Menu" aria-haspopup="dialog">${ic('list')}</button>
        <a class="lien-retour" href="${retour[0]}"${retour[2] ? ` data-action="vers" data-vue="${retour[2]}"` : ''}>${ic('caret-left')}${retour[1]}</a>
      </div>`;

// Le rang de chaque groupe dans « Nouveau voyage » : Informations est l'étape 1, puis un groupe par
// étape, sans les groupes vides.
function etapeDe(groupe) {
  const pleins = groupes.filter(x => x.etiquettes.length);
  const i = pleins.indexOf(groupe);
  return i < 0 ? null : i + 2;
}

function carteGroupe(groupe) {
  const nb = groupe.etiquettes.length;
  const etape = etapeDe(groupe);
  const infos = nb ? `${pluriel(nb, 'étiquette')} · étape ${etape} de « Nouveau voyage »` : 'Aucune étiquette · absent de « Nouveau voyage »';
  const puces = groupe.etiquettes
    .map(
      e => `
          <li><button type="button" class="puce puce-modele" data-action="modifier-etiquette" data-id="${e.id}" aria-label="${echapper(e.nom)}, modifier"${ui.recent === e.id ? ' data-recent' : ''}>${echapper(e.nom)}</button></li>`,
    )
    .join('');
  return `
      <section class="groupe" data-flip="g-${groupe.id}"${ui.recent === groupe.id ? ' data-recent' : ''} aria-labelledby="titre-${groupe.id}">
        <div class="groupe-entete">
          <h2 class="groupe-titre" id="titre-${groupe.id}"><b>${echapper(groupe.nom)}</b><span class="groupe-infos">${infos}</span></h2>
          <button type="button" class="bouton-icone bouton-modifier" data-action="modifier-groupe" data-id="${groupe.id}" aria-label="Modifier le groupe ${echapper(groupe.nom)}">${ic('pencil-simple')}</button>
        </div>
        ${nb ? '' : '<p class="groupe-vide">Ajoutez une étiquette : le groupe deviendra une étape de « Nouveau voyage ».</p>'}
        ${nb ? `<ul class="etiquettes-liste">${puces}
        </ul>` : ''}
        <button type="button" class="groupe-ajout" data-action="nouvelle-etiquette" data-id="${groupe.id}">${ic('plus')}Ajouter une étiquette</button>
      </section>`;
}

// Un bouton ▲ ou ▼ ; au bord, il reste à sa place mais ne fait rien (aria-disabled).
const fleche = (action, id, nom, inactif) =>
  `<button type="button" class="bouton-icone" data-action="${action}" data-id="${id}" aria-label="${action === 'monter' ? 'Monter' : 'Descendre'} ${echapper(nom)}"${inactif ? ' aria-disabled="true"' : ''}>${ic(action === 'monter' ? 'arrow-up' : 'arrow-down')}</button>`;

function rangement() {
  const lignes = groupes
    .map(
      (groupe, i) => `
          <li class="rang-groupe" data-flip="g-${groupe.id}">
            <div class="rang-ligne">
              <span class="rang-picto" aria-hidden="true">${svg.tag}</span>
              <b>${echapper(groupe.nom)}</b>
              ${fleche('monter', groupe.id, groupe.nom, i === 0)}
              ${fleche('descendre', groupe.id, groupe.nom, i === groupes.length - 1)}
            </div>
            ${
              groupe.etiquettes.length
                ? `<ol class="rang-etiquettes" aria-label="Étiquettes de ${echapper(groupe.nom)}">${groupe.etiquettes
                    .map(
                      (e, j) => `
              <li class="rang-ligne" data-flip="e-${e.id}">
                <span>${echapper(e.nom)}</span>
                ${fleche('monter', e.id, e.nom, j === 0)}
                ${fleche('descendre', e.id, e.nom, j === groupe.etiquettes.length - 1)}
              </li>`,
                    )
                    .join('')}
            </ol>`
                : ''
            }
          </li>`,
    )
    .join('');
  return `
      <section class="rangement" aria-labelledby="rangement-titre">
        <div class="rangement-tete">
          <h2 id="rangement-titre">Ranger</h2>
          <button type="button" class="bouton bouton-principal" data-action="terminer">${ic('check')}Terminé</button>
        </div>
        <p class="aide">Cet ordre est celui des étapes de « Nouveau voyage », et des étiquettes dans chaque étape.</p>
        <ol class="rang-arbre">${lignes}
        </ol>
        <p class="lecteur" aria-live="polite">${ui.annonce}</p>
      </section>`;
}

function vueEtiquettes() {
  const nbEtiquettes = groupes.reduce((s, x) => s + x.etiquettes.length, 0);
  return `
    <main class="ecran${ui.ranger ? '' : ' ecran-avec-flottant'}">
      ${barreHaut(['#', 'Réglages', 'reglages'])}
      <h1>Étiquettes</h1>
      <p class="biblio-resume">${pluriel(groupes.length, 'groupe')} · ${pluriel(nbEtiquettes, 'étiquette')}</p>
      ${
        ui.ranger
          ? rangement()
          : `<p class="aide etiquettes-aide">Chaque groupe est une étape de « Nouveau voyage », et ses étiquettes les réponses à toucher. Touchez une étiquette pour la renommer ou la supprimer.</p>
      <div class="outils"><button type="button" class="puce" data-action="ranger">${ic('arrows-down-up')}Ranger</button></div>
      <div class="groupes">${groupes.map(carteGroupe).join('')}</div>`
      }
    </main>
    ${ui.ranger ? '' : `<button type="button" class="bouton bouton-principal bouton-flottant" data-action="nouveau-groupe">${ic('plus')}Nouveau groupe</button>`}`;
}

const ligneReglage = (vue, picto, titre, texte) => `
        <li>
          <a class="reglage" href="#" data-action="vers" data-vue="${vue}">
            <span class="reglage-picto" aria-hidden="true">${svg[picto]}</span>
            <span class="reglage-texte"><b>${titre}</b><span>${texte}</span></span>
            <span class="chevron" aria-hidden="true">${svg['caret-right']}</span>
          </a>
        </li>`;

const vueReglages = () => `
    <main class="ecran">
      ${barreHaut(['../bibliotheque/?etat=accueil', 'Mes voyages'])}
      <h1>Réglages</h1>
      <ul class="reglages">
        ${ligneReglage('bibliotheque', 'books', 'Bibliothèque', 'Les catégories et les objets proposés à chaque nouveau voyage')}
        ${ligneReglage('etiquettes', 'tag', 'Étiquettes', 'Les questions posées par « Nouveau voyage » pour bâtir la liste')}
      </ul>
    </main>`;

function menuMaquette() {
  if (CAPTURE) return '';
  const etats = [
    ['reglages', 'Réglages, ligne Étiquettes'],
    ['etiquettes', 'Étiquettes'],
    ['groupe-vide', 'Un groupe sans étiquette'],
    ['ranger', 'Ranger'],
    ['fiche-etiquette', 'Fiche d’étiquette (Plage)'],
    ['nouvelle-etiquette', 'Nouvelle étiquette (Climat)'],
    ['fiche-groupe', 'Fiche de groupe (Climat)'],
    ['nouveau-groupe', 'Nouveau groupe'],
    ['refus-vide', 'Refus : nom vide'],
    ['refus-pris', 'Refus : « plage » déjà prise'],
    ['refus-groupe', 'Refus : groupe « climat » déjà pris'],
    ['supprimer-etiquette', 'Supprimer une étiquette ?'],
    ['supprimer-groupe', 'Supprimer un groupe ?'],
    ['abandon', 'Abandonner les modifications ?'],
    ['panne', 'Panne d’enregistrement'],
    ['assistant', 'Assistant : 7 groupes, étape 4'],
    ['assistant-debut', 'Assistant : 7 groupes, étape 1'],
    ['assistant-fin', 'Assistant : 7 groupes, aperçu'],
    ['assistant-mini', 'Assistant : 3 groupes (inchangé)'],
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
  app.innerHTML = { reglages: vueReglages, etiquettes: vueEtiquettes }[ui.vue]() + menuMaquette();
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
  const lien = (vue, icone, texte, href) =>
    `<li><a class="tiroir-lien" href="${href}"${vue === 'reglages' ? ' aria-current="page"' : ''}>${ic(icone)}${texte}</a></li>`;
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
          ${lien('accueil', 'suitcase-rolling', 'Mes voyages', '../bibliotheque/?etat=accueil')}
          ${lien('nouveau', 'plus-circle', 'Nouveau voyage', '?etat=assistant-debut')}
          ${lien('reglages', 'gear-six', 'Réglages', '?etat=reglages')}
        </ul>
      </nav>`;
  ouvrir(d);
}

function allerVers(vue) {
  if (vue === 'bibliotheque') return (location.href = '../bibliotheque/?etat=bibliotheque');
  ui.vue = vue;
  ui.ranger = false;
  rendre();
  scrollTo(0, 0);
}

// ---------- Fiches ----------
const eclairer = id => {
  ui.recent = id;
  rendre();
  app.querySelector(`[data-recent]`)?.scrollIntoView({ block: 'nearest' });
};

const modifierEtiquette = e =>
  ficheEtiquette({
    etiquette: e,
    groupe: groupeDe(e.id),
    groupes,
    panne,
    surEnregistrer: nom => ((e.nom = nom), eclairer(e.id)),
    surSupprimer: () => {
      const groupe = groupeDe(e.id);
      groupe.etiquettes.splice(groupe.etiquettes.indexOf(e), 1);
      rendre();
    },
  });

const nouvelleEtiquette = groupe =>
  ficheEtiquette({
    etiquette: null,
    groupe,
    groupes,
    panne,
    surEnregistrer: nom => {
      const e = { id: nouvelId(), nom };
      groupe.etiquettes.push(e);
      eclairer(e.id);
    },
  });

const modifierGroupe = groupe =>
  ficheGroupe({
    groupe,
    groupes,
    panne,
    surEnregistrer: nom => ((groupe.nom = nom), eclairer(groupe.id)),
    surSupprimer: () => {
      groupes.splice(groupes.indexOf(groupe), 1);
      rendre();
    },
  });

const nouveauGroupe = () =>
  ficheGroupe({
    groupe: null,
    groupes,
    panne,
    surEnregistrer: nom => {
      const groupe = { id: nouvelId(), nom, etiquettes: [] };
      groupes.push(groupe);
      eclairer(groupe.id);
      app.querySelector(`[data-action="nouvelle-etiquette"][data-id="${groupe.id}"]`)?.focus({ preventScroll: true });
    },
  });

// ---------- Ranger ----------
function deplacer(id, sens) {
  const groupe = trouverGroupe(id);
  const liste = groupe ? groupes : groupeDe(id).etiquettes;
  const i = liste.findIndex(x => x.id === id);
  const j = i + sens;
  if (j < 0 || j >= liste.length) return;
  if (ui.panne) return alerte('Le nouvel ordre n’a pas pu être enregistré. Rien n’a changé ; réessayez.');
  [liste[i], liste[j]] = [liste[j], liste[i]];
  ui.annonce = `${liste[j].nom} : ${j + 1}e sur ${liste.length}`.replace(': 1e', ': 1re');
  rendre({ glisser: true });
  app.querySelector(`[data-flip="${groupe ? 'g' : 'e'}-${id}"]`)?.scrollIntoView({ block: 'nearest' });
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
  } else if (action === 'ranger' || action === 'terminer') {
    ui.ranger = action === 'ranger';
    ui.annonce = '';
    rendre();
    app.querySelector(ui.ranger ? '.rang-arbre .bouton-icone:not([aria-disabled])' : '[data-action="ranger"]')?.focus();
  } else if (action === 'monter') deplacer(id, -1);
  else if (action === 'descendre') deplacer(id, 1);
  else if (action === 'modifier-etiquette') modifierEtiquette(trouverEtiquette(id));
  else if (action === 'nouvelle-etiquette') nouvelleEtiquette(trouverGroupe(id));
  else if (action === 'modifier-groupe') modifierGroupe(trouverGroupe(id));
  else if (action === 'nouveau-groupe') nouveauGroupe();
});

// ---------- États de départ ----------
const attendre = () => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
const nommee = nom => groupes.flatMap(x => x.etiquettes).find(e => e.nom === nom);
const groupeNomme = nom => groupes.find(x => x.nom === nom);
const cliquer = selecteur => document.querySelector(selecteur).click();

if (ETAT.startsWith('assistant')) {
  ouvrirAssistant({ app, etat: ETAT, ic });
} else {
  rendre();
  if (ETAT === 'fiche-etiquette' || ETAT === 'panne' || ETAT === 'abandon' || ETAT === 'supprimer-etiquette') {
    const { saisir } = modifierEtiquette(nommee('Plage'));
    if (ETAT === 'panne' || ETAT === 'abandon') saisir('Plage et baignade');
    if (ETAT === 'panne') cliquer('.fiche-nom [data-f="enregistrer"]');
    if (ETAT === 'abandon') cliquer('.fiche-nom .bouton-fermer');
    if (ETAT === 'supprimer-etiquette') cliquer('.fiche-nom [data-f="supprimer"]');
  }
  if (ETAT === 'nouvelle-etiquette' || ETAT === 'refus-vide' || ETAT === 'refus-pris') {
    const { saisir } = nouvelleEtiquette(groupeNomme('Climat'));
    if (ETAT === 'refus-pris') saisir('plage');
    if (ETAT !== 'nouvelle-etiquette') cliquer('.fiche-nom [data-f="enregistrer"]');
  }
  if (ETAT === 'fiche-groupe' || ETAT === 'supprimer-groupe') {
    modifierGroupe(groupeNomme('Climat'));
    if (ETAT === 'supprimer-groupe') cliquer('.fiche-nom [data-f="supprimer"]');
  }
  if (ETAT === 'nouveau-groupe' || ETAT === 'refus-groupe') {
    const { saisir } = nouveauGroupe();
    if (ETAT === 'refus-groupe') {
      saisir('climat');
      cliquer('.fiche-nom [data-f="enregistrer"]');
    }
  }
}
await attendre();
document.documentElement.dataset.pret = '';

// Phase 7 : le bandeau « Annuler » qui suit d'un écran à l'autre (docs/maquettes/suppressions/).
if (params.has('bandeau'))
  import('../suppressions/bandeau.js').then(({ montrerBandeau }) => {
    const reste = params.get('reste');
    montrerBandeau({ texte: params.get('bandeau'), duree: CAPTURE || !reste || reste === 'toujours' ? Infinity : Number(reste) });
    document.documentElement.dataset.bandeau = '';
  });
