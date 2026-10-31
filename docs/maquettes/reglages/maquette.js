// Maquette de la phase 12 (Réglages : thème, sauvegarde, restauration), d'après la conception du 2026-10-31
// (docs/superpowers/specs/2026-10-31-phase-12-reglages-sauvegarde-design.md). Brouillon autonome, servi par
// Vite (`pnpm dev`, puis http://localhost:1430/docs/maquettes/reglages/) : il reprend les vrais styles et les
// vrais dessins de l'appli (écran Réglages, Mes voyages, segments, fenêtres de question, bandeau du bas) et
// n'y ajoute que ce que la phase apporte :
// - les blocs « Thème » et « Sauvegarde » de Réglages (reglages.js) ;
// - le message « Sauvegarde déposée… », la confirmation de restauration, les refus, la panne, le retour à
//   Mes voyages avec « Sauvegarde du … restaurée » (ici).
// Rien n'est écrit ni lu : le fichier « choisi » et l'accès aux fichiers se règlent en bas de page.
// Paramètres : ?etat=… (liste en bas de page) ; ?capture retire cette liste ; ?theme=sombre|clair simule
// le thème de l'appareil.
import '../../../src/styles/polices.css';
import '../../../src/styles/jetons.css';
import '../../../src/styles/socle.css';
import '../../../src/styles/pave.css';
import '../../../src/styles/voyages.css';
import '../../../src/styles/menu.css';
import '../../../src/styles/menu-voyage.css';
import '../../../src/styles/fiche-modele.css';
import '../../../src/styles/fenetre.css';
import '../../../src/styles/annulation.css';
import './maquette.css';
import fr from '../../../src/i18n/fr.json';
import { creerTraducteur } from '../../../src/i18n/traduction.js';
import { montrerAnnulation } from '../../../src/ecrans/annulation.js';
import { demander } from '../../../src/ecrans/fenetre.js';
import { echapper } from '../../../src/ecrans/html.js';
import { ecranReglages } from '../../../src/ecrans/reglages.js';
import { ecranVoyages } from '../../../src/ecrans/voyages.js';
import { AUJOURDHUI, progressions, voyagesRestaures } from './donnees.js';
import { svg } from './icones.js';
import { vueBlocs } from './reglages.js';
import { TEXTES as T } from './textes.js';

const params = new URLSearchParams(location.search);
const ETAT = params.get('etat') ?? 'reglages';
const CAPTURE = params.has('capture');
// Le thème de l'appareil simulé (sinon, celui du navigateur).
const APPAREIL = { sombre: 'dark', clair: 'light' }[params.get('theme')] ?? '';

const t = creerTraducteur({ fr }, 'fr');
const app = document.getElementById('app');

// Ce que la maquette retient : le choix de thème, la date de la dernière sauvegarde, et pour la
// démonstration le fichier « choisi » et la réponse à la demande d'accès d'Android 7 à 9.
const etat = { theme: 'appareil', derniere: null, fichier: 'valide', acces: 'accorde' };
const SAUVEGARDE_PRECEDENTE = '12 octobre 2026, 21 h 15';

// ---------- Le thème : appliqué tout de suite, sur la racine (jetons.css) ----------
function appliquerTheme() {
  const racine = document.documentElement;
  if (etat.theme === 'appareil') {
    delete racine.dataset.theme;
    racine.style.colorScheme = APPAREIL;
  } else {
    racine.dataset.theme = etat.theme === 'sombre' ? 'dark' : 'light';
    racine.style.colorScheme = '';
  }
}

// ---------- Les écrans : les vrais dessins, et les gestes qui mènent d'un écran à l'autre ----------
const contexte = {
  t,
  langue: 'fr',
  stockage: { listerVoyages: async () => voyagesRestaures, etatsDesObjets: async () => [] },
  // Le menu de l'appli : Mes voyages et Réglages mènent aux écrans de la maquette.
  revenirAccueil: () => dessinerVoyages(),
  allerDepuisAccueil: adresse => adresse === '#/reglages' && dessinerReglages(),
  appuisRetour: () => 0,
};
let ecran = 'reglages';

function dessinerReglages({ neuve = false, focus = null } = {}) {
  ecran = 'reglages';
  ecranReglages.dessiner(app, {}, contexte);
  app.querySelector('main').insertAdjacentHTML('beforeend', vueBlocs({ ...etat, neuve }));
  if (focus) app.querySelector(focus)?.focus({ preventScroll: true });
  dessinerEtats();
}

function dessinerVoyages() {
  ecran = 'voyages';
  ecranVoyages.dessiner(app, { voyages: voyagesRestaures, aujourdhui: AUJOURDHUI, progressions }, contexte);
  dessinerEtats();
}

// ---------- Les fenêtres : celles de l'appli (demander), une seule réponse « Compris » pour un refus ----------
const informer = (titre, paragraphes) =>
  demander({
    t,
    titre,
    texte: paragraphes[0],
    suite: paragraphes.slice(1).map(echapper),
    boutons: [{ cle: 'compris', libelle: T.compris, principal: true }],
  });

// Le bandeau du bas de l'appli, sans « Annuler » : un message de réussite, qui part seul au bout de 10 s.
function annoncer(texteHtml) {
  montrerAnnulation({ t, app, texte: '', annuler: async () => {}, icone: 'boucle' });
  const bandeau = [...document.querySelectorAll('.bandeau-annuler')].at(-1);
  bandeau.classList.add('bandeau-message');
  bandeau.querySelector('.bandeau-action').remove();
  bandeau.querySelector('.icone').innerHTML = svg('reussite');
  bandeau.querySelector('p').innerHTML = texteHtml;
}

// « Sauvegarder » : le fichier est déposé, la date se met à jour, le bandeau dit où. Touché, le bouton
// garde le focus une fois l'écran redessiné ; l'état ouvert d'office (captures) n'en pose pas.
async function sauvegarder({ touche = false } = {}) {
  if (etat.acces === 'refuse') return informer(T.autorisation.titre, [T.autorisation.texte, T.autorisation.comment]);
  etat.derniere = T.maintenant.date;
  dessinerReglages({ neuve: true, focus: touche && '[data-geste="sauvegarder"]' });
  annoncer(`${echapper(T.sauvegarde.deposee)} <b class="nom-fichier">${echapper(T.maintenant.fichier)}</b>`);
}

// « Restaurer une sauvegarde… » : le sélecteur de fichiers du système (simulé), puis le refus ou la
// confirmation ; « Restaurer » remplace tout et ramène à Mes voyages.
async function restaurer() {
  const { fichier } = etat;
  if (['abime', 'format', 'version'].includes(fichier))
    return informer(T.refus.titre, [T.refus[fichier], T.refus.rien]);
  const { date, voyages, objets } = T.fichier;
  const reponse = demander({
    t,
    titre: T.confirmation.titre(date),
    texteHtml: T.confirmation.contenu(voyages, objets),
    suite: [echapper(T.confirmation.remplacement)],
    boutons: [
      { cle: 'garder', libelle: T.confirmation.garder },
      { cle: 'restaurer', libelle: T.confirmation.restaurer, danger: true },
    ],
  });
  // La corbeille des suppressions laisse la place à l'horloge qui revient en arrière.
  document.querySelector('dialog.confirmation [data-cle="restaurer"] .icone').innerHTML = svg('restaurer');
  if ((await reponse) !== 'restaurer') return;
  if (fichier === 'panne') return informer(T.panne.titre, [T.panne.texte]);
  restaurationReussie();
}

function restaurationReussie() {
  dessinerVoyages();
  annoncer(echapper(T.restauree(T.fichier.date)));
}

// ---------- Les gestes ----------
app.addEventListener('click', evenement => {
  const geste = evenement.target.closest('[data-geste]')?.dataset.geste;
  if (geste === 'sauvegarder') return sauvegarder({ touche: true });
  if (geste === 'restaurer') return restaurer();
  // Les liens de l'appli : le retour vers Mes voyages mène à l'écran de la maquette ; les autres
  // (Bibliothèque, Étiquettes, un voyage, Nouveau voyage) sont hors de la phase et ne mènent nulle part.
  const lien = evenement.target.closest('main a[href^="#"]');
  if (!lien) return;
  evenement.preventDefault();
  if (lien.getAttribute('href') === '#/voyages') dessinerVoyages();
});
// Le menu « ⋮ » des cartes (phase 11) n'appartient pas à la maquette : ses lignes ne font rien.
app.addEventListener('click', evenement => evenement.target.closest('[data-menu]') && evenement.stopPropagation(), true);
app.addEventListener('change', evenement => {
  const cible = evenement.target;
  if (cible.matches('[data-theme-choix]')) {
    etat.theme = cible.value;
    appliquerTheme();
  }
  if (cible.matches('[data-demo]')) etat[cible.dataset.demo] = cible.value;
});

// ---------- Les états de la maquette, et les réglages de la démonstration ----------
const ETATS = [
  ['reglages', '1. Réglages, aucune sauvegarde'],
  ['reglages-sauvegarde', '1 bis. Réglages, dernière sauvegarde datée'],
  ['sauvegarde-faite', '2. Sauvegarde faite'],
  ['theme-sombre', '3. Thème sombre choisi'],
  ['theme-clair', '3 bis. Thème clair choisi'],
  ['confirmation', '4. Confirmer la restauration'],
  ['refus-abime', '5. Refus : fichier abîmé'],
  ['refus-format', '5 bis. Refus : autre format'],
  ['refus-version', '5 ter. Refus : version plus récente'],
  ['autorisation-refusee', '6. Accès aux fichiers refusé (Android 7 à 9)'],
  ['restauration-reussie', '7. Restauration réussie'],
  ['panne', '8. Panne pendant la restauration'],
];

const choixDemo = (cle, legende, options) => `
    <fieldset class="maquette-demo"><legend>${echapper(legende)}</legend>${Object.entries(options)
      .map(
        ([valeur, libelle]) =>
          `<label><input type="radio" name="demo-${cle}" value="${valeur}" data-demo="${cle}"${etat[cle] === valeur ? ' checked' : ''} />${echapper(libelle)}</label>`,
      )
      .join('')}</fieldset>`;

function dessinerEtats() {
  if (CAPTURE) return;
  const theme = params.get('theme') ? `&theme=${params.get('theme')}` : '';
  const autre = params.get('theme') === 'sombre' ? 'clair' : 'sombre';
  const liens = ETATS.map(
    ([cle, nom]) => `<a href="?etat=${cle}${theme}"${cle === ETAT ? ' aria-current="page"' : ''}>${echapper(nom)}</a>`,
  ).join('');
  app.insertAdjacentHTML(
    'beforeend',
    `<nav class="maquette-etats" aria-label="États de la maquette"><b>${T.maquette.titre}</b>${liens}<a href="?etat=${ETAT}&theme=${autre}">${echapper(T.maquette.autreTheme(autre))}</a>${choixDemo('fichier', T.maquette.fichier, T.maquette.fichiers)}${choixDemo('acces', T.maquette.acces, T.maquette.accesChoix)}</nav>`,
  );
}

// ---------- Mise en place de l'état demandé ----------
if (ETAT === 'theme-sombre') etat.theme = 'sombre';
if (ETAT === 'theme-clair') etat.theme = 'clair';
if (['reglages-sauvegarde', 'sauvegarde-faite', 'confirmation', 'restauration-reussie'].includes(ETAT))
  etat.derniere = SAUVEGARDE_PRECEDENTE;
if (ETAT.startsWith('refus-')) etat.fichier = ETAT.slice('refus-'.length);
if (ETAT === 'autorisation-refusee') etat.acces = 'refuse';
appliquerTheme();

if (ETAT === 'restauration-reussie') restaurationReussie();
else {
  dessinerReglages();
  if (ETAT === 'sauvegarde-faite' || ETAT === 'autorisation-refusee') sauvegarder();
  if (ETAT === 'confirmation' || ETAT.startsWith('refus-')) restaurer();
  if (ETAT === 'panne') informer(T.panne.titre, [T.panne.texte]);
}
