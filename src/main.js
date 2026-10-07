// Démarrage : textes, stockage, bibliothèque de départ, puis l'écran demandé par l'adresse. Une seule
// page ; chaque écran a son adresse interne (docs/PLAN.md, « Écrans ») et se compose de charger
// (lire les données) puis dessiner.
import './styles/polices.css';
import './styles/jetons.css';
import './styles/socle.css';
import './styles/pave.css';
import './styles/voyages.css';
import './styles/voyage.css';
import './styles/nouveau-voyage.css';
import './styles/calendrier.css';
import fr from './i18n/fr.json';
import { creerTraducteur } from './i18n/traduction.js';
import { ouvrirStockage } from './stockage/index.js';
import { construireBibliotheque } from './modele/bibliotheque.js';
import { nouvelId } from './modele/identifiant.js';
import { ecranVoyages, vueErreur } from './ecrans/voyages.js';
import { ecranVoyage } from './ecrans/voyage.js';
import { ecranNouveauVoyage } from './ecrans/nouveau-voyage.js';

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
];

let stockage;
// Chaque affichage porte un numéro : un écran lent à charger ne recouvre jamais celui demandé après lui.
let dernierAffichage = 0;

// Le retour système d'Android (comme celui du navigateur) remonte l'historique de la page. Chaque
// étape y note sa profondeur (history.state) : l'écran ouvert au démarrage est à 0, chaque lien
// suivi ajoute 1. Un lien vers Mes voyages remonte donc jusqu'à l'accueil au lieu d'empiler une
// étape : sinon, depuis Mes voyages, le retour système rouvrirait l'écran quitté au lieu de fermer
// l'appli. Seul l'accueil ouvre d'autres écrans : sous une étape de profondeur 1 ou plus, l'étape 0
// est donc toujours l'accueil.
let profondeur = -1;
// Un retour par history.go ne s'achève qu'à l'affichage suivant : d'ici là, un nouvel appui sur le
// lien remonterait trop loin et quitterait l'appli (double appui sur la tablette).
let retourEnCours = false;

function noterProfondeur() {
  if (typeof history.state?.profondeur !== 'number') history.replaceState({ profondeur: profondeur + 1 }, '');
  profondeur = history.state.profondeur;
}

// Changer d'adresse sans ajouter d'étape (après une création, depuis une adresse inconnue…).
function remplacerAdresse(adresse) {
  history.replaceState({ profondeur }, '', adresse);
  return afficher();
}

// Un écran ouvert directement par son adresse (profondeur 0) n'a pas l'accueil derrière lui : l'accueil
// prend alors sa place, sans étape de plus.
function revenirAccueil() {
  if (retourEnCours) return;
  if (profondeur > 0) {
    retourEnCours = true;
    history.go(-profondeur);
  } else remplacerAdresse(ACCUEIL);
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
  const route = ECRANS.map(({ motif, ecran }) => ({ ecran, trouve: motif.exec(location.hash) })).find(r => r.trouve);
  if (!route) return remplacerAdresse(ACCUEIL);
  // Repère des tests d'écran : retiré pendant le chargement, posé une fois l'écran dessiné.
  delete app.dataset.ecran;
  const contexte = { stockage, t, langue: LANGUE, parametre: route.trouve[1], remplacerAdresse };
  try {
    const donnees = await route.ecran.charger(contexte);
    if (numero !== dernierAffichage) return;
    route.ecran.dessiner(app, donnees, contexte);
    app.dataset.ecran = route.ecran.nom;
    window.scrollTo(0, 0);
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
  window.addEventListener('hashchange', afficher);
  // Tout lien vers l'accueil y revient en remontant l'historique ; il reste un vrai lien (clavier).
  app.addEventListener('click', evenement => {
    if (!evenement.target.closest(`a[href="${ACCUEIL}"]`)) return;
    evenement.preventDefault();
    revenirAccueil();
  });
  await afficher();
}

// Un démarrage manqué ne laisse rien qui marche : aucun retour, seul un redémarrage aide.
demarrer().catch(erreur => {
  console.error(erreur);
  montrerErreur(false);
});
