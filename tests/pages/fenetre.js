// Page d'essai de src/ecrans/fenetre.js : chaque bouton appelle une fonction du module, et les
// résultats s'écrivent dans la page pour que le test les lise. window.surRetourRend règle ce que
// rend surRetour (true : la garde se repose).
import '../../src/styles/polices.css';
import '../../src/styles/jetons.css';
import '../../src/styles/socle.css';
import '../../src/styles/fenetre.css';
import fr from '../../src/i18n/fr.json';
import { creerTraducteur } from '../../src/i18n/traduction.js';
import { confirmer, demander, poserGardeRetour } from '../../src/ecrans/fenetre.js';

const t = creerTraducteur({ fr }, 'fr');
const choix = document.querySelector('#choix');
const compteur = document.querySelector('#compteur');
let garde = null;

document.querySelector('#demander').addEventListener('click', async () => {
  choix.textContent = 'attente';
  const cle = await demander({
    t,
    titre: 'Titre',
    texte: 'Texte',
    contenu: '<ul><li>un</li></ul>',
    boutons: [
      { cle: 'a', libelle: 'Bouton A' },
      { cle: 'b', libelle: 'Bouton B' },
      { cle: 'c', libelle: 'Bouton C', principal: true },
    ],
  });
  choix.textContent = String(cle);
});

document.querySelector('#confirmer').addEventListener('click', async () => {
  choix.textContent = 'attente';
  choix.textContent = String(await confirmer({ t, titre: 'Titre', texte: 'Texte', action: 'Faire' }));
});

document.querySelector('#poser').addEventListener('click', () => {
  garde = poserGardeRetour({
    surRetour: () => {
      compteur.textContent = String(Number(compteur.textContent) + 1);
      return window.surRetourRend === true;
    },
  });
});

document.querySelector('#retirer').addEventListener('click', () => garde?.retirer());
