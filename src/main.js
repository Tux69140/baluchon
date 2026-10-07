// Démarrage : textes, stockage, bibliothèque de départ, puis l'écran demandé par l'adresse. Une seule
// page ; chaque écran a son adresse interne (docs/PLAN.md, « Écrans ») et se compose de charger
// (lire les données) puis dessiner.
import './styles/polices.css';
import './styles/jetons.css';
import './styles/socle.css';
import './styles/voyages.css';
import fr from './i18n/fr.json';
import { creerTraducteur } from './i18n/traduction.js';
import { ouvrirStockage } from './stockage/index.js';
import { construireBibliotheque } from './modele/bibliotheque.js';
import { nouvelId } from './modele/identifiant.js';
import { ecranVoyages, vueErreur } from './ecrans/voyages.js';

// Une seule langue pour l'instant ; celle de l'appareil viendra avec les traductions (phase 13).
const LANGUE = 'fr';
const t = creerTraducteur({ fr }, LANGUE);
const app = document.querySelector('#app');

document.documentElement.lang = LANGUE;
document.title = t('appli.nom');

// Une adresse inconnue ramène à l'accueil.
const ACCUEIL = '#/voyages';
const ECRANS = [{ motif: /^#\/voyages$/, ecran: ecranVoyages }];

let stockage;
// Chaque affichage porte un numéro : un écran lent à charger ne recouvre jamais celui demandé après lui.
let dernierAffichage = 0;

function montrerErreur() {
  app.innerHTML = vueErreur({ t });
  app.dataset.ecran = 'erreur';
}

async function afficher() {
  const numero = ++dernierAffichage;
  const route = ECRANS.map(({ motif, ecran }) => ({ ecran, trouve: motif.exec(location.hash) })).find(r => r.trouve);
  if (!route) return location.replace(ACCUEIL);
  // Repère des tests d'écran : retiré pendant le chargement, posé une fois l'écran dessiné.
  delete app.dataset.ecran;
  const contexte = { stockage, t, langue: LANGUE, parametre: route.trouve[1] };
  try {
    const donnees = await route.ecran.charger(contexte);
    if (numero !== dernierAffichage) return;
    route.ecran.dessiner(app, donnees, contexte);
    app.dataset.ecran = route.ecran.nom;
    window.scrollTo(0, 0);
  } catch (erreur) {
    if (numero !== dernierAffichage) return;
    console.error(erreur);
    montrerErreur();
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
  await afficher();
}

demarrer().catch(erreur => {
  console.error(erreur);
  montrerErreur();
});
