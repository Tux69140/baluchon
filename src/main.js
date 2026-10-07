// Démarrage : textes, stockage, puis premier écran. Une seule page ; les écrans suivants
// (#/nouveau-voyage, #/voyage/:id…) s'ajoutent à l'aiguillage au fil des phases (docs/PLAN.md).
import './styles/polices.css';
import './styles/jetons.css';
import './styles/socle.css';
import './styles/voyages.css';
import fr from './i18n/fr.json';
import { creerTraducteur } from './i18n/traduction.js';
import { ouvrirStockage } from './stockage/index.js';
import { vueErreur, vueVoyages } from './ecrans/voyages.js';

// Une seule langue pour l'instant ; celle de l'appareil viendra avec les traductions (phase 13).
const LANGUE = 'fr';
const t = creerTraducteur({ fr }, LANGUE);
const app = document.querySelector('#app');

document.documentElement.lang = LANGUE;
document.title = t('appli.nom');

async function afficherVoyages() {
  try {
    const stockage = await ouvrirStockage();
    app.innerHTML = vueVoyages({ voyages: await stockage.listerVoyages(), t });
  } catch (erreur) {
    console.error(erreur);
    app.innerHTML = vueErreur({ t });
  }
  // Repère des tests d'écran : le premier écran est dessiné.
  app.dataset.ecran = 'voyages';
}

afficherVoyages();
