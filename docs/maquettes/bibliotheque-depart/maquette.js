// Maquette de la phase 13 (bibliothèque de départ complète et traduisible), d'après la conception validée le
// 2026-11-01 (docs/superpowers/specs/2026-11-01-phase-13-bibliotheque-traduisible-design.md, « Comportement »).
// Brouillon autonome, servi par Vite (`pnpm dev`, puis http://localhost:1430/docs/maquettes/bibliotheque-depart/) :
// il reprend les vrais styles et les vrais dessins de l'appli (assistant et aperçu, Mes voyages, écran du
// voyage, Bibliothèque et mécanique des fiches, étape « Changements », menu) et n'y ajoute que ce que la phase
// apporte :
// - les trois compteurs Femmes, Hommes, Enfants de Nouveau voyage (compteurs.js) ;
// - la composition dans l'aperçu, l'en-tête du voyage et les cartes (ecrans.js) ;
// - « Par semaine », « Pour qui » et l'exemple chiffré de la fiche d'un objet modèle (fiche.js), le résumé des
//   règles dans la Bibliothèque (composition.js) ;
// - « 1 enfant de plus » à l'étape « Changements » (ecrans.js) ;
// - « À propos », dernière entrée du menu, et son écran (a-propos.js).
// Les données sont la bibliothèque de départ validée (bibliotheque-v5.js). Thème clair seulement (consigne
// du chef de projet). Paramètres : ?etat=… (liste en bas de page) ; ?capture retire cette liste.
import '../../../src/styles/polices.css';
import '../../../src/styles/jetons.css';
import '../../../src/styles/socle.css';
import '../../../src/styles/pave.css';
import '../../../src/styles/voyages.css';
import '../../../src/styles/voyage.css';
import '../../../src/styles/voyage-mouvements.css';
import '../../../src/styles/grand-format.css';
import '../../../src/styles/nouveau-voyage.css';
import '../../../src/styles/calendrier.css';
import '../../../src/styles/fenetre.css';
import '../../../src/styles/fiche.css';
import '../../../src/styles/assistant.css';
import '../../../src/styles/assistant-apercu.css';
import '../../../src/styles/assistant-questions.css';
import '../../../src/styles/menu.css';
import '../../../src/styles/menu-voyage.css';
import '../../../src/styles/reglages.css';
import '../../../src/styles/bibliotheque.css';
import '../../../src/styles/fiche-modele.css';
import '../../../src/styles/etiquettes.css';
import '../../../src/styles/annulation.css';
import '../../../src/styles/courses.css';
import '../../../src/styles/sortir.css';
import '../../../src/styles/changements.css';
import './maquette.css';
import fr from '../../../src/i18n/fr.json';
import { creerTraducteur } from '../../../src/i18n/traduction.js';
import { echapper } from '../../../src/ecrans/html.js';
import { ecranReglages } from '../../../src/ecrans/reglages.js';
import { ecranVoyages } from '../../../src/ecrans/voyages.js';
import { dessinerAPropos, ouvrirMenuComplet } from './a-propos.js';
import { trouverObjet } from './composition.js';
import { AUJOURDHUI, bibliotheque, contenus, progressions, voyages } from './donnees.js';
import {
  dessinerVoyage,
  grandFormat,
  ouvrirBibliotheque,
  ouvrirFicheObjet,
  ouvrirModification,
  ouvrirNouveau,
  troisColonnes,
} from './ecrans.js';
import { TEXTES as T } from './textes.js';

const params = new URLSearchParams(location.search);
const ETAT = params.get('etat') ?? 'infos';
const CAPTURE = params.has('capture');
// Thème clair seulement, quel que soit l'appareil.
document.documentElement.dataset.theme = 'light';
document.documentElement.style.colorScheme = 'light';

const t = creerTraducteur({ fr }, 'fr');
const app = document.getElementById('app');
let ecran = { nom: 'voyages' };

// Ce que les vrais écrans attendent du contexte de l'appli ; rien n'est écrit.
const contexte = {
  t,
  langue: 'fr',
  stockage: {
    listerVoyages: async () => voyages,
    etatsDesObjets: async () => [],
    lireBibliotheque: async () => bibliotheque,
    lireTheme: () => 'clair',
    lireDerniereSauvegarde: () => null,
  },
  revenirAccueil: () => dessinerVoyages(),
  allerDepuisAccueil: adresse => aller(adresse),
  revenir: adresse => aller(adresse),
  remplacerAdresse: async () => {},
  appuisRetour: () => 0,
};

// ---------- Les écrans ----------
function dessinerVoyages() {
  ecran = { nom: 'voyages' };
  ecranVoyages.dessiner(app, { voyages, aujourdhui: AUJOURDHUI, progressions }, contexte);
  dessinerEtats();
}

const vu = { voyageId: null, ouvertes: null, choisie: null };
function montrerVoyage(contenu = contenus.mer) {
  if (vu.voyageId !== contenu.voyage.id) Object.assign(vu, { voyageId: contenu.voyage.id, ouvertes: null, choisie: null });
  ecran = { nom: 'voyage', contenu };
  dessinerVoyage(app, contexte, contenu, vu, cle => {
    if (cle === 'modifier') modifier(contenu, { ...contenu.voyage });
  });
  dessinerEtats();
}

// infos : ce qui est déjà saisi ; etape : celle où l'on arrive (0 : Informations, 5 : l'aperçu).
function nouveauVoyage(infos = {}, { choisies = [], etape = 0 } = {}) {
  ecran = { nom: 'nouveau' };
  ouvrirNouveau(app, contexte, {
    bibliotheque,
    infos: { nom: '', destination: '', depart: '', retour: '', femmes: 1, hommes: 1, enfants: 0, ...infos },
    choisies: new Set(choisies),
    etape,
    aujourdhui: AUJOURDHUI,
    fond: fondVoyages,
    quitter: dessinerVoyages,
  });
  dessinerEtats();
}
const fondVoyages = conteneur => ecranVoyages.dessiner(conteneur, { voyages, aujourdhui: AUJOURDHUI, progressions }, contexte);

function modifier(contenu, composition) {
  ecran = { nom: 'modifier' };
  ouvrirModification(app, contexte, {
    contenu,
    bibliotheque,
    composition,
    aujourdhui: AUJOURDHUI,
    fond: () => montrerVoyage(contenu),
  });
  dessinerEtats();
}

function bibliothequeOuverte(ouverte = 'Toilette') {
  ecran = { nom: 'bibliotheque' };
  ouvrirBibliotheque(app, contexte, { bibliotheque, ouverte });
  dessinerEtats();
}

function reglages() {
  ecran = { nom: 'reglages' };
  ecranReglages.dessiner(app, {}, contexte);
  dessinerEtats();
}

function aPropos() {
  ecran = { nom: 'a-propos' };
  dessinerAPropos(app, contexte);
  dessinerEtats();
}

// Les adresses de l'appli, menées aux écrans de la maquette.
function aller(adresse) {
  if (adresse === '#/voyages') dessinerVoyages();
  else if (adresse === '#/nouveau-voyage') nouveauVoyage();
  else if (adresse === '#/reglages') reglages();
  else if (adresse === '#/bibliotheque') bibliothequeOuverte();
  else if (adresse === '#/a-propos') aPropos();
  else if (adresse.startsWith('#/voyage/')) {
    const contenu = Object.values(contenus).find(c => `#/voyage/${c.voyage.id}` === adresse);
    if (contenu) montrerVoyage(contenu);
  }
}

// ---------- Les gestes ----------
// Le bouton du menu, sur chaque écran qui en a un : le vrai menu, plus « À propos ».
const COURANT = { voyages: 'voyages', reglages: 'reglages', bibliotheque: 'reglages', 'a-propos': 'a-propos' };
app.addEventListener(
  'click',
  evenement => {
    if (!evenement.target.closest('main [data-action="menu"]')) return;
    evenement.stopPropagation();
    ouvrirMenuComplet(contexte, COURANT[ecran.nom] ?? 'voyages');
  },
  true,
);
// Les liens de l'appli (cartes, retours, Réglages) ; l'assistant garde les siens.
app.addEventListener('click', evenement => {
  const lien = evenement.target.closest('main a[href^="#"]');
  if (!lien || evenement.defaultPrevented || lien.closest('.assistant')) return;
  evenement.preventDefault();
  aller(lien.getAttribute('href'));
});
// L'écran du voyage : accordéon et catégorie choisie.
app.addEventListener('click', evenement => {
  if (ecran.nom !== 'voyage') return;
  const cible = evenement.target.closest('[data-action="accordeon"], [data-action="choisir"]');
  if (!cible) return;
  const { action, id } = cible.dataset;
  if (action === 'accordeon' && !vu.ouvertes.delete(id)) vu.ouvertes.add(id);
  if (action === 'choisir') vu.choisie = id;
  montrerVoyage(ecran.contenu);
});
for (const requete of [grandFormat, troisColonnes])
  requete.addEventListener('change', () => ecran.nom === 'voyage' && montrerVoyage(ecran.contenu));

// ---------- Les états de la maquette ----------
const ETATS = [
  ['infos', '1. Nouveau voyage : 1 femme, 1 homme'],
  ['infos-aucun', '1 bis. Aucun voyageur'],
  ['infos-max', '1 ter. 20 voyageurs atteints'],
  ['apercu', '2. Aperçu : 2 femmes, 1 enfant'],
  ['voyages', '3. Mes voyages : le total'],
  ['voyage', '4. Voyage : la composition dans l’en-tête'],
  ['bibliotheque', '5. Bibliothèque : Toilette'],
  ['bibliotheque-papiers', '5 bis. Bibliothèque : Papiers et argent'],
  ['fiche-lessive', '6. Fiche : Lessive de voyage'],
  ['fiche-carnet', '6 bis. Fiche : Carnet de santé'],
  ['fiche-rasoir', '6 ter. Fiche : Rasoir'],
  ['fiche-culottes', '6 quater. Fiche : Culottes'],
  ['fiche-creme', '6 quinquies. Fiche : Crème solaire'],
  ['changements', '7. Modifier : 1 enfant de plus'],
  ['menu', '8. Menu : À propos'],
  ['a-propos', '9. À propos'],
];

function dessinerEtats() {
  if (CAPTURE || app.querySelector('.maquette-etats')) return;
  const liens = ETATS.map(
    ([cle, nom]) => `<a href="?etat=${cle}"${cle === ETAT ? ' aria-current="page"' : ''}>${echapper(nom)}</a>`,
  ).join('');
  app.insertAdjacentHTML(
    'beforeend',
    `<nav class="maquette-etats" aria-label="États de la maquette"><b>${T.maquette.titre}</b>${liens}</nav>`,
  );
}

const FICHES = {
  'fiche-lessive': ['Bagages et rangement', 'Lessive de voyage'],
  'fiche-carnet': ['Papiers et argent', 'Carnet de santé'],
  'fiche-rasoir': ['Toilette', 'Rasoir'],
  'fiche-culottes': ['Vêtements', 'Culottes'],
  'fiche-creme': ['Toilette', 'Crème solaire'],
};
const SAISIE = { nom: 'Week-end à la mer', destination: 'Saint-Malo', depart: '2026-11-13', retour: '2026-11-15' };

if (ETAT === 'infos') nouveauVoyage();
else if (ETAT === 'infos-aucun') nouveauVoyage({ ...SAISIE, femmes: 0, hommes: 0, enfants: 0 });
else if (ETAT === 'infos-max')
  nouveauVoyage({ nom: 'Cousinade en Ardèche', destination: 'Vallon-Pont-d’Arc', depart: '2026-07-04', retour: '2026-07-11', femmes: 8, hommes: 7, enfants: 5 });
else if (ETAT === 'apercu')
  nouveauVoyage({ ...SAISIE, femmes: 2, hommes: 0, enfants: 1 }, { choisies: ['plage', 'train', 'location'], etape: 5 });
else if (ETAT === 'voyage') montrerVoyage(contenus.mer);
else if (ETAT === 'bibliotheque') bibliothequeOuverte('Toilette');
else if (ETAT === 'bibliotheque-papiers') bibliothequeOuverte('Papiers et argent');
else if (FICHES[ETAT]) {
  const [categorie, nom] = FICHES[ETAT];
  bibliothequeOuverte(categorie);
  ouvrirFicheObjet(app, contexte, bibliotheque, trouverObjet(bibliotheque, nom));
} else if (ETAT === 'changements') {
  montrerVoyage(contenus.lyon);
  modifier(contenus.lyon, { femmes: 1, hommes: 1, enfants: 1 });
} else if (ETAT === 'a-propos') aPropos();
else {
  dessinerVoyages();
  if (ETAT === 'menu') ouvrirMenuComplet(contexte, 'voyages');
}
