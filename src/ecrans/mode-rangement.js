// Ce que partagent les écrans à rangement, la Bibliothèque (src/ecrans/bibliotheque.js) et les
// Étiquettes (src/ecrans/etiquettes.js) : la fin de l'écran, et le mode « Ranger », où ▲ et ▼
// déplacent une ligne. Pendant le rangement, la touche retour vaut « Terminé » ; quitter l'écran
// (lien de retour, menu) le termine d'abord. Les déplacements eux-mêmes passent par
// src/ecrans/file-ordre.js.
import { poserGardeRetour } from './fenetre.js';
import { ouvrirMenu } from './menu.js';

// Le glissement d'une ligne déplacée (maquette de la Bibliothèque, reprise par les Étiquettes).
export const GLISSEMENT = { duration: 220, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' };

// La fin de l'écran, quel que soit le chemin (autre écran dessiné dans app) : signal s'arrête et
// parti() devient vrai ; le constat suffit à tout arrêter.
export function suivreFin(app, main) {
  const fin = new AbortController();
  function parti() {
    if (!fin.signal.aborted && !main.isConnected) fin.abort();
    return fin.signal.aborted;
  }
  const observateur = new MutationObserver(() => parti() && observateur.disconnect());
  observateur.observe(app, { childList: true });
  return { signal: fin.signal, parti };
}

// ui.ranger : vrai pendant le rangement, lu par le dessin. peindre() : redessine l'écran (il y pose
// annonce à la place de [data-annonce]) ; premier : la commande qui prend le focus à l'ouverture du
// rangement. gerer(evenement, commande) rend vrai s'il a pris en charge la commande touchée (lien de
// retour, menu, « Ranger », « Terminé »).
export function creerModeRangement({ main, ui, peindre, premier, parti, contexte }) {
  // La zone d'annonce du rangement : la même d'un dessin à l'autre, car un lecteur d'écran n'annonce
  // que les changements d'une zone qu'il connaît déjà.
  const annonce = document.createElement('p');
  annonce.className = 'lecteur';
  annonce.setAttribute('aria-live', 'polite');
  // La garde du retour système pendant le rangement. La poser et la retirer touchent l'historique :
  // chaque changement attend la fin du précédent.
  let garde = null;
  let gardeSuivie = Promise.resolve();

  function surRetour() {
    // Consommée par ce retour : il n'y a plus rien à retirer.
    garde = null;
    terminer();
    return false;
  }

  function suivreGarde() {
    gardeSuivie = gardeSuivie.then(async () => {
      if (ui.ranger && !garde && !parti()) garde = poserGardeRetour({ surRetour });
      else if (!ui.ranger && garde) {
        const partante = garde;
        garde = null;
        await partante.retirer();
      }
    });
    return gardeSuivie;
  }

  function commencer() {
    ui.ranger = true;
    annonce.textContent = '';
    peindre();
    main.querySelector(premier)?.focus();
    suivreGarde();
  }

  function terminer() {
    ui.ranger = false;
    annonce.textContent = '';
    peindre();
    main.querySelector('[data-action="ranger"]')?.focus();
    return suivreGarde();
  }

  // Quitter l'écran (menu, lien de retour) pendant le rangement : on le termine d'abord, et son étape
  // d'historique part avant que l'écran suivant ne s'ouvre.
  async function sortir() {
    if (ui.ranger) await terminer();
    else await gardeSuivie;
  }

  function gerer(evenement, commande) {
    const { action } = commande.dataset;
    if (action === 'retour') {
      // Le lien reste un vrai lien (clavier) ; on le suit nous-mêmes, une fois le rangement terminé.
      evenement.preventDefault();
      sortir().then(() => !parti() && contexte.revenir(commande.getAttribute('href')));
    } else if (action === 'menu') sortir().then(() => !parti() && ouvrirMenu(contexte, { courant: 'reglages' }));
    else if (action === 'ranger') commencer();
    else if (action === 'terminer') terminer();
    else return false;
    return true;
  }

  return { annonce, gerer };
}
