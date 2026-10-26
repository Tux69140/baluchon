// Maquette de la phase 7 (suppressions sûres dans la bibliothèque), d'après la conception du
// 2026-10-26 (docs/superpowers/specs/2026-10-26-phase-7-suppressions-design.md). Brouillon autonome :
// il imite les gestes sans toucher au code de l'appli, avec ses styles et les fiches des maquettes des
// phases 5 et 6. Servir la racine du dépôt (`python3 -m http.server 8646 --bind 127.0.0.1`) et ouvrir
// `/docs/maquettes/suppressions/`.
import { ficheCategorie, ficheObjet } from '../bibliotheque/fiches.js';
import { chargerIcones, ic, ouvrir, reduit, svg } from '../bibliotheque/outils.js';
import { confirmerSuppression, ficheEtiquette, ficheGroupe } from '../etiquettes/fiches.js';
import { etatBandeau, montrerBandeau, retirerBandeau } from './bandeau.js';
import {
  bibliothequeDeDepart,
  categorieDe,
  consequences,
  groupeDe,
  groupesPourFiches,
  photographier,
  renommerEtiquette,
  retablir,
  supprimer,
  trouverCategorie,
  trouverEtiquette,
  trouverObjet,
} from './donnees.js';
import { vueAccueil, vueBibliotheque, vueEtiquettes, vueReglages } from './ecrans.js';
import { ouvrirRefus } from './refus.js';
import { bandeau, question } from './textes.js';

const params = new URLSearchParams(location.search);
const ETAT = params.get('etat') ?? 'bibliotheque';
const CAPTURE = params.has('capture');
const largeMq = matchMedia('(min-width: 1000px) and (orientation: landscape)');
const MASCOTTE = '../../../src/images/baluchon.svg';

await chargerIcones();
const lire = nom => fetch(`../../../node_modules/@phosphor-icons/core/assets/bold/${nom}-bold.svg`).then(r => r.text());
for (const nom of ['tag', 'trash']) svg[nom] = await lire(nom);

const biblio = bibliothequeDeDepart();
const ui = {
  vue: ETAT.startsWith('bibliotheque') || /categorie|objet/.test(ETAT) ? 'bibliotheque' : ETAT.includes('reglages') ? 'reglages' : ETAT.includes('accueil') ? 'accueil' : 'etiquettes',
  ouvertes: new Set(),
  choisie: biblio.categories[0].id,
  recent: null,
};
const panne = () => false;

// ---------- Rendu ----------
const app = document.getElementById('app');

function menuMaquette() {
  if (CAPTURE) return '';
  const etats = [
    ['bibliotheque', 'Bibliothèque'],
    ['fiche-categorie', 'Fiche de catégorie (Camping) : « Supprimer »'],
    ['supprimer-categorie', 'Supprimer une catégorie ? (3 objets)'],
    ['bandeau-categorie', 'Catégorie supprimée : bandeau « Annuler »'],
    ['fiche-objet', 'Fiche d’objet (Parasol) : « Supprimer »'],
    ['supprimer-objet', 'Supprimer un objet ?'],
    ['bandeau-objet', 'Objet supprimé : bandeau « Annuler »'],
    ['etiquettes', 'Étiquettes'],
    ['supprimer-etiquette', 'Supprimer « Chaud » ? (1 objet la perd)'],
    ['supprimer-etiquette-libre', 'Supprimer « Hôtel » ? (personne ne la porte)'],
    ['bandeau-etiquette', 'Étiquette supprimée : bandeau « Annuler »'],
    ['refus-etiquette', 'Refus : « Plage » (3 à régler)'],
    ['refus-fiche', 'Refus : fiche ouverte depuis la liste'],
    ['refus-regle', 'Refus : un élément réglé, retour à la liste'],
    ['refus-bandeau', 'Refus : un objet supprimé depuis la liste'],
    ['refus-fini', 'Refus : plus rien ne bloque'],
    ['supprimer-groupe', 'Supprimer « Hébergement » ? (1 catégorie)'],
    ['refus-groupe', 'Refus : groupe « Climat »'],
    ['bandeau-reglages', 'Le bandeau suit : Réglages'],
    ['bandeau-accueil', 'Le bandeau suit : Mes voyages'],
  ];
  const ailleurs = [
    [`../voyage/?etat=en-cours&bandeau=${encodeURIComponent('Objet « Parasol » supprimé')}`, 'Le bandeau suit : un voyage'],
    [`../etiquettes/?etat=assistant-mini&bandeau=${encodeURIComponent('Objet « Parasol » supprimé')}`, 'Le bandeau suit : Nouveau voyage'],
  ];
  return `
    <details class="maquette-menu">
      <summary>Maquette ▾</summary>
      <nav>${etats.map(([e, t]) => `<a href="?etat=${e}"${e === ETAT ? ' aria-current="page"' : ''}>${t}</a>`).join('')}${ailleurs
        .map(([href, t]) => `<a href="${href}">${t}</a>`)
        .join('')}</nav>
    </details>`;
}

function rendre() {
  const focus = document.activeElement?.closest('[data-action]');
  const cle = focus && app.contains(focus) && { action: focus.dataset.action, id: focus.dataset.id };
  const defilement = [...app.querySelectorAll('.panneau')].map(p => p.scrollTop);
  const vues = {
    accueil: vueAccueil,
    reglages: vueReglages,
    bibliotheque: () => vueBibliotheque(biblio, ui, largeMq.matches),
    etiquettes: () => vueEtiquettes(biblio, ui),
  };
  app.innerHTML = vues[ui.vue]() + menuMaquette();
  app.querySelectorAll('.panneau').forEach((p, i) => (p.scrollTop = defilement[i] ?? 0));
  if (cle) app.querySelector(`[data-action="${cle.action}"]${cle.id ? `[data-id="${cle.id}"]` : ''}`)?.focus({ preventScroll: true });
  const eclaire = app.querySelector('[data-recent]');
  if (eclaire && !reduit.matches) eclaire.scrollIntoView({ block: 'nearest' });
  ui.recent = null;
}

// ---------- Écritures ----------
// Toute autre écriture dans la bibliothèque rend la suppression en cours définitive (choix de
// l'agent, conception de la phase 7) : le bandeau s'en va.
const ecrire = action => {
  retirerBandeau();
  action();
  rendre();
  document.dispatchEvent(new Event('biblio-changee'));
};

const cleEclairee = cible => (cible.type === 'categorie' ? `cat-${cible.id}` : cible.id);

function faireSuppression(cible, nom) {
  const photo = photographier(biblio);
  const csq = supprimer(biblio, cible);
  rendre();
  document.dispatchEvent(new Event('biblio-changee'));
  montrerBandeau({
    texte: bandeau(cible, nom, csq),
    duree: CAPTURE ? Infinity : 10000,
    annuler: () => {
      retablir(biblio, photo);
      ui.recent = cleEclairee(cible);
      if (cible.type === 'categorie') ui.choisie = cible.id;
      if (cible.type === 'objet') ui.choisie = categorieDe(biblio, cible.id).id;
      rendre();
      document.dispatchEvent(new Event('biblio-changee'));
    },
  });
}

// La question chiffrée, ou le refus s'il resterait un orphelin. Rend true une fois la suppression faite.
async function demanderSuppression(cible, nom) {
  const csq = consequences(biblio, cible);
  if (csq.bloquent.categories.length || csq.bloquent.objets.length)
    return ouvrirRefus({
      cible,
      nom,
      calculer: () => consequences(biblio, cible),
      ouvrirFiche: (element, type) => (type === 'categorie' ? modifierCategorie(trouverCategorie(biblio, element.id)) : modifierObjet(trouverObjet(biblio, element.id))),
      supprimer: () => faireSuppression(cible, nom),
    });
  const oui = await confirmerSuppression(question(cible, nom, csq));
  if (oui) faireSuppression(cible, nom);
  return oui;
}

// ---------- Fiches ----------
const modifierCategorie = c =>
  ficheCategorie({
    categorie: c,
    groupes: groupesPourFiches(biblio),
    panne,
    surEnregistrer: b => ecrire(() => (Object.assign(c, b), (ui.recent = `cat-${c.id}`))),
    supprimer: () => demanderSuppression({ type: 'categorie', id: c.id }, c.nom),
  });

const modifierObjet = x =>
  ficheObjet({
    objet: x,
    categorie: categorieDe(biblio, x.id),
    groupes: groupesPourFiches(biblio),
    panne,
    surEnregistrer: b => ecrire(() => (Object.assign(x, b), (ui.recent = x.id))),
    supprimer: () => demanderSuppression({ type: 'objet', id: x.id }, x.nom),
  });

const modifierEtiquette = e =>
  ficheEtiquette({
    etiquette: e,
    groupe: groupeDe(biblio, e.id),
    groupes: biblio.groupes,
    panne,
    surEnregistrer: nom => ecrire(() => (renommerEtiquette(biblio, e.id, nom), (ui.recent = e.id))),
    demanderSuppression: () => demanderSuppression({ type: 'etiquette', id: e.id }, e.nom),
  });

const modifierGroupe = g =>
  ficheGroupe({
    groupe: g,
    groupes: biblio.groupes,
    panne,
    surEnregistrer: nom => ecrire(() => ((g.nom = nom), (ui.recent = g.id))),
    demanderSuppression: () => demanderSuppression({ type: 'groupe', id: g.id }, g.nom),
  });

// ---------- Navigation ----------
// Vers une autre maquette (voyage, assistant) : le bandeau suit, avec le temps qui lui reste.
function quitter(href) {
  const b = etatBandeau();
  location.href = b ? `${href}${href.includes('?') ? '&' : '?'}bandeau=${encodeURIComponent(b.texte)}&reste=${b.reste}` : href;
}

function allerVers(vue) {
  ui.vue = vue;
  rendre();
  scrollTo(0, 0);
}

function ouvrirMenu() {
  const courant = ui.vue === 'accueil' ? 'accueil' : 'reglages';
  const lien = (vue, icone, texte) =>
    `<li><a class="tiroir-lien" href="#" data-vue="${vue}"${vue === courant ? ' aria-current="page"' : ''}>${ic(icone)}${texte}</a></li>`;
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
          ${lien('nouveau', 'plus-circle', 'Nouveau voyage')}
          ${lien('reglages', 'gear-six', 'Réglages')}
        </ul>
      </nav>`;
  const { fermer } = ouvrir(d);
  d.addEventListener('click', e => {
    const a = e.target.closest('[data-vue]');
    if (!a) return;
    e.preventDefault();
    if (a.dataset.vue === 'nouveau') return quitter('../etiquettes/?etat=assistant-mini');
    fermer();
    allerVers(a.dataset.vue);
  });
}

// ---------- Gestes ----------
app.addEventListener('click', e => {
  const b = e.target.closest('[data-action]');
  if (!b) return;
  const { action, id } = b.dataset;
  if (action === 'sans-effet') return;
  if (action === 'menu') ouvrirMenu();
  else if (action === 'vers') {
    e.preventDefault();
    allerVers(b.dataset.vue);
  } else if (action === 'voyage' || action === 'nouveau-voyage') {
    e.preventDefault();
    quitter(action === 'voyage' ? '../voyage/?etat=en-cours' : '../etiquettes/?etat=assistant-mini');
  } else if (action === 'accordeon') {
    ui.ouvertes.has(id) ? ui.ouvertes.delete(id) : ui.ouvertes.add(id);
    rendre();
  } else if (action === 'choisir') {
    ui.choisie = id;
    rendre();
  } else if (action === 'modifier-categorie') modifierCategorie(trouverCategorie(biblio, id));
  else if (action === 'modifier-objet') modifierObjet(trouverObjet(biblio, id));
  else if (action === 'modifier-etiquette') modifierEtiquette(trouverEtiquette(biblio, id));
  else if (action === 'modifier-groupe') modifierGroupe(biblio.groupes.find(g => g.id === id));
});

largeMq.addEventListener('change', () => rendre());

// ---------- États de départ ----------
const objetNomme = nom => biblio.categories.flatMap(c => c.objets).find(x => x.nom === nom);
const etiquetteNommee = nom => biblio.groupes.flatMap(g => g.etiquettes).find(e => e.nom === nom);
const groupeNomme = nom => biblio.groupes.find(g => g.nom === nom);
const cliquer = selecteur => document.querySelector(selecteur).click();
const attendre = () => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));

if (/objet/.test(ETAT)) {
  ui.ouvertes.add('baignade');
  ui.choisie = 'baignade';
}
if (/categorie/.test(ETAT)) ui.choisie = 'camping';
rendre();

if (ETAT === 'fiche-categorie' || ETAT === 'supprimer-categorie') {
  modifierCategorie(trouverCategorie(biblio, 'camping'));
  if (ETAT === 'supprimer-categorie') cliquer('.fiche-modele [data-f="supprimer"]');
}
if (ETAT === 'bandeau-categorie') faireSuppression({ type: 'categorie', id: 'camping' }, 'Camping');
if (ETAT === 'fiche-objet' || ETAT === 'supprimer-objet') {
  modifierObjet(objetNomme('Parasol'));
  if (ETAT === 'supprimer-objet') cliquer('.fiche-modele [data-f="supprimer"]');
}
if (ETAT === 'bandeau-objet') faireSuppression({ type: 'objet', id: objetNomme('Parasol').id }, 'Parasol');
for (const [etat, nom] of [
  ['supprimer-etiquette', 'Chaud'],
  ['supprimer-etiquette-libre', 'Hôtel'],
]) {
  if (ETAT !== etat) continue;
  modifierEtiquette(etiquetteNommee(nom));
  cliquer('.fiche-nom [data-f="supprimer"]');
}
if (ETAT === 'bandeau-etiquette') faireSuppression({ type: 'etiquette', id: etiquetteNommee('Hôtel').id }, 'Hôtel');
if (ETAT.startsWith('refus-') && ETAT !== 'refus-groupe') {
  modifierEtiquette(etiquetteNommee('Plage'));
  cliquer('.fiche-nom [data-f="supprimer"]');
  await attendre();
  const changer = action => (action(), document.dispatchEvent(new Event('biblio-changee')));
  if (ETAT === 'refus-fiche') cliquer('.refus [data-i="1"]');
  if (ETAT === 'refus-regle') changer(() => objetNomme('Maillot de bain').etiquettes.push('Chaud'));
  if (ETAT === 'refus-bandeau') faireSuppression({ type: 'objet', id: objetNomme('Tongs').id }, 'Tongs');
  if (ETAT === 'refus-fini')
    changer(() => {
      trouverCategorie(biblio, 'baignade').etiquettes.push('Chaud');
      objetNomme('Maillot de bain').etiquettes = [];
      objetNomme('Tongs').etiquettes.push('Chaud');
    });
}
if (ETAT === 'supprimer-groupe' || ETAT === 'refus-groupe') {
  modifierGroupe(groupeNomme(ETAT === 'refus-groupe' ? 'Climat' : 'Hébergement'));
  cliquer('.fiche-nom [data-f="supprimer"]');
}
if (ETAT === 'bandeau-reglages' || ETAT === 'bandeau-accueil') {
  const vue = ui.vue;
  ui.vue = 'bibliotheque';
  faireSuppression({ type: 'objet', id: objetNomme('Parasol').id }, 'Parasol');
  allerVers(vue);
}
await attendre();
document.documentElement.dataset.pret = '';
