// Démarrage : textes, stockage, bibliothèque de départ, puis l'écran demandé par l'adresse. Une seule
// page ; chaque écran a son adresse interne (docs/PLAN.md, « Écrans ») et se compose de charger
// (lire les données) puis dessiner.
import './styles/polices.css';
import './styles/jetons.css';
import './styles/socle.css';
import './styles/pave.css';
import './styles/voyages.css';
import './styles/voyage.css';
import './styles/voyage-panneaux.css';
import './styles/nouveau-voyage.css';
import './styles/calendrier.css';
import './styles/fenetre.css';
import './styles/fiche.css';
import './styles/assistant.css';
import './styles/assistant-questions.css';
import './styles/menu.css';
import './styles/bibliotheque.css';
import './styles/fiche-modele.css';
import fr from './i18n/fr.json';
import { creerTraducteur } from './i18n/traduction.js';
import { ecouterRetourSysteme, ouvrirStockage } from './stockage/index.js';
import { construireBibliotheque } from './modele/bibliotheque.js';
import { nouvelId } from './modele/identifiant.js';
import { ecranVoyages, vueErreur } from './ecrans/voyages.js';
import { ecranVoyage } from './ecrans/voyage.js';
import { ecranNouveauVoyage } from './ecrans/nouveau-voyage.js';
import { ecranReglages } from './ecrans/reglages.js';
import { ecranBibliotheque } from './ecrans/bibliotheque.js';
import { retourDansLAppli } from './ecrans/retour-systeme.js';

// Une seule langue pour l'instant ; celle de l'appareil viendra avec les traductions (phase 13).
const LANGUE = 'fr';
const t = creerTraducteur({ fr }, LANGUE);
const app = document.querySelector('#app');

document.documentElement.lang = LANGUE;
document.title = t('appli.nom');

// Une adresse inconnue ramène à l'accueil.
const ACCUEIL = '#/voyages';
const ECRANS = [
  { motif: /^#\/voyages$/, ecran: ecranVoyages },
  { motif: /^#\/voyage\/([\w%-]+)$/, ecran: ecranVoyage },
  { motif: /^#\/nouveau-voyage$/, ecran: ecranNouveauVoyage },
  { motif: /^#\/reglages$/, ecran: ecranReglages },
  { motif: /^#\/bibliotheque$/, ecran: ecranBibliotheque },
];

let stockage;
// Chaque affichage porte un numéro : un écran lent à charger ne recouvre jamais celui demandé après lui.
let dernierAffichage = 0;

// Le retour système d'Android (comme celui du navigateur) remonte l'historique de la page. Chaque
// étape y note sa profondeur (history.state) : l'écran ouvert au démarrage est à 0, chaque lien
// suivi ajoute 1. Un lien vers Mes voyages remonte donc jusqu'à l'accueil au lieu d'empiler une
// étape : sinon, depuis Mes voyages, le retour système rouvrirait l'écran quitté au lieu de fermer
// l'appli. L'accueil ouvre les autres écrans, et Réglages la Bibliothèque ; le menu passe toujours
// par l'accueil (allerDepuisAccueil). L'étape 0 est donc l'accueil, sauf quand l'appli a démarré sur
// un autre écran (ouvert par son adresse) : un retour à l'étape 0 y pose alors l'accueil (remonterPuis).
let profondeur = -1;
// Un retour par history.go ne s'achève qu'à l'affichage suivant : d'ici là, un nouvel appui sur le
// lien remonterait trop loin et quitterait l'appli (double appui sur la tablette).
let retourEnCours = false;
// Ce que montre l'étape 0 une fois atteinte par un retour en cours : l'accueil, ou l'écran demandé
// depuis le menu, ouvert une étape au-dessus de l'accueil.
let destination = null;
// Une fenêtre fermée rend le focus au bouton qui l'a ouverte, une fois l'accueil redessiné.
let focusApresRetour = null;

function noterProfondeur() {
  if (typeof history.state?.profondeur !== 'number') history.replaceState({ profondeur: profondeur + 1 }, '');
  profondeur = history.state.profondeur;
}

// Changer d'adresse sans ajouter d'étape (après une création, depuis une adresse inconnue…).
function remplacerAdresse(adresse) {
  history.replaceState({ profondeur }, '', adresse);
  return afficher();
}

// À l'étape 0 : l'accueil y prend place s'il n'y est pas, sans étape de plus ; puis l'écran demandé
// s'ouvre juste au-dessus, sans que l'accueil soit dessiné entre deux.
function arriverA(adresse) {
  if (adresse === ACCUEIL) return remplacerAdresse(ACCUEIL);
  history.replaceState({ profondeur: 0 }, '', ACCUEIL);
  history.pushState({ profondeur: 1 }, '', adresse);
  return afficher();
}

// Remonter à l'étape 0, puis y montrer l'adresse (l'accueil, ou un écran posé au-dessus de lui).
function remonterPuis(adresse) {
  if (retourEnCours) return;
  if (profondeur > 0) {
    retourEnCours = true;
    destination = adresse;
    history.go(-profondeur);
  } else arriverA(adresse);
}

// Un écran ouvert directement par son adresse (profondeur 0) n'a pas l'accueil derrière lui : l'accueil
// prend alors sa place, sans étape de plus. focus : ce qui reçoit le focus une fois l'accueil dessiné.
function revenirAccueil({ focus = null } = {}) {
  if (retourEnCours) return;
  focusApresRetour = focus;
  remonterPuis(ACCUEIL);
}

// Depuis le menu : Nouveau voyage et Réglages s'ouvrent une étape au-dessus de l'accueil, où que l'on
// soit ; le retour système y ramène donc ensuite, puis quitte l'appli.
const allerDepuisAccueil = adresse => remonterPuis(adresse);

// Le lien de retour d'un écran ouvert depuis un autre que l'accueil (la Bibliothèque, depuis Réglages) :
// une étape en arrière ; ouvert directement par son adresse, l'écran d'avant prend sa place.
function revenir(adresseParDefaut) {
  if (retourEnCours) return;
  if (profondeur > 0) {
    retourEnCours = true;
    history.back();
  } else remplacerAdresse(adresseParDefaut);
}

// avecRetour : hors de l'accueil, l'appli démarrée peut encore ramener à Mes voyages.
function montrerErreur(avecRetour) {
  app.innerHTML = vueErreur({ t, avecRetour });
  app.dataset.ecran = 'erreur';
}

async function afficher() {
  const numero = ++dernierAffichage;
  retourEnCours = false;
  noterProfondeur();
  const voulue = destination;
  destination = null;
  // Un écran autre que l'accueil s'ouvre toujours au-dessus de lui, même si l'étape 0 était déjà le sien.
  if (voulue && profondeur === 0 && (voulue !== ACCUEIL || location.hash !== ACCUEIL)) return arriverA(voulue);
  const route = ECRANS.map(({ motif, ecran }) => ({ ecran, trouve: motif.exec(location.hash) })).find(r => r.trouve);
  if (!route) return remplacerAdresse(ACCUEIL);
  // Repère des tests d'écran : retiré pendant le chargement, posé une fois l'écran dessiné.
  delete app.dataset.ecran;
  const contexte = {
    stockage,
    t,
    langue: LANGUE,
    parametre: route.trouve[1],
    remplacerAdresse,
    revenirAccueil,
    allerDepuisAccueil,
    revenir,
  };
  try {
    const donnees = await route.ecran.charger(contexte);
    if (numero !== dernierAffichage) return;
    route.ecran.dessiner(app, donnees, contexte);
    app.dataset.ecran = route.ecran.nom;
    window.scrollTo(0, 0);
    if (focusApresRetour) app.querySelector(focusApresRetour)?.focus();
    focusApresRetour = null;
  } catch (erreur) {
    if (numero !== dernierAffichage) return;
    console.error(erreur);
    montrerErreur(location.hash !== ACCUEIL);
  }
}

async function demarrer() {
  stockage = await ouvrirStockage();
  // La bibliothèque de départ s'installe une seule fois, dans la langue du premier lancement ; elle
  // appartient ensuite à l'utilisateur (docs/PRD.md, « Données »).
  if (!(await stockage.bibliothequeInstallee()))
    await stockage.installerBibliotheque(
      construireBibliotheque(fr.bibliothequeDeDepart, { nouvelId, maintenant: new Date().toISOString() }),
      LANGUE,
    );
  // La touche retour d'Android remonte l'historique par la page elle-même (src/ecrans/retour-systeme.js) :
  // tout ce qui suit le retour (niveaux, garde de l'assistant, routeur) reste fondé sur popstate.
  // history.back() n'aboutit qu'au popstate suivant : d'ici là, history.state est l'ancien, et un second
  // appui reculerait encore (sur Informations, il menait à Mes voyages sans demander s'il fallait
  // abandonner la saisie). Les appuis reçus pendant un recul sont donc absorbés. Ce popstate-ci est
  // écouté après celui des fenêtres (src/ecrans/fenetre.js, inscrit à son chargement) : l'état est
  // alors celui de l'étape atteinte, garde et question reposées.
  let reculEnCours = false;
  window.addEventListener('popstate', () => (reculEnCours = false));
  ecouterRetourSysteme(() => {
    if (reculEnCours) return true;
    if (!retourDansLAppli(history.state)) return false;
    reculEnCours = true;
    history.back();
    return true;
  }).catch(console.error);
  window.addEventListener('hashchange', afficher);
  // Tout lien vers l'accueil y revient en remontant l'historique, tout autre lien de retour recule
  // d'une étape ; ils restent de vrais liens (clavier). Un écran qui le prend en charge (l'assistant
  // demande d'abord s'il faut abandonner la saisie, le menu ferme son panneau) le marque par preventDefault.
  app.addEventListener('click', evenement => {
    const lien = evenement.target.closest(`a[href="${ACCUEIL}"], a.lien-retour`);
    if (evenement.defaultPrevented || !lien) return;
    evenement.preventDefault();
    const adresse = lien.getAttribute('href');
    if (adresse === ACCUEIL) revenirAccueil();
    else revenir(adresse);
  });
  await afficher();
}

// Un démarrage manqué ne laisse rien qui marche : aucun retour, seul un redémarrage aide.
demarrer().catch(erreur => {
  console.error(erreur);
  montrerErreur(false);
});
