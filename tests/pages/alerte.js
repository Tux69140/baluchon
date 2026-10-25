// Page d'essai de src/ecrans/alerte.js : « fiche » ouvre une fenêtre modale dans #app (comme une fiche
// de la bibliothèque), « demander » une question par-dessus (posée dans document.body, comme toute
// question), et window.alerter() pose le message en haut. Rien n'est attendu des boutons de la
// question : le test la laisse ouverte.
import '../../src/styles/polices.css';
import '../../src/styles/jetons.css';
import '../../src/styles/socle.css';
import '../../src/styles/fenetre.css';
import '../../src/styles/bibliotheque.css';
import fr from '../../src/i18n/fr.json';
import { creerTraducteur } from '../../src/i18n/traduction.js';
import { alerterEnHaut } from '../../src/ecrans/alerte.js';
import { demander, ouvrirFenetre, vueFenetre } from '../../src/ecrans/fenetre.js';

const t = creerTraducteur({ fr }, 'fr');
const app = document.querySelector('#app');
const fin = new AbortController();

document.querySelector('#fiche').addEventListener('click', () => {
  app.insertAdjacentHTML(
    'beforeend',
    vueFenetre({ t, idTitre: 'titre-fiche', titre: 'Fiche', contenu: '<p>corps</p>' }),
  );
  const fiche = app.lastElementChild;
  ouvrirFenetre(fiche, { surFermeture: () => fiche.remove() });
});

document
  .querySelector('#demander')
  .addEventListener('click', () =>
    demander({ t, titre: 'Question', texte: 'Texte', boutons: [{ cle: 'a', libelle: 'Bouton A' }] }),
  );

window.alerter = () => alerterEnHaut(app, t('bibliotheque.erreurEnregistrement'), fin.signal);
