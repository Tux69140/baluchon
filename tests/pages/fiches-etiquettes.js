// Page d'essai de src/ecrans/fiche-etiquette.js : chaque bouton ouvre une fiche sur une bibliothèque
// d'essai, et ce que la fiche demande à l'écran s'écrit dans la page pour que le test le lise :
// #enregistrements (les saisies), #suppressions, #fermetures. La case #panne fait échouer ces
// écritures ; window.retenir les tient en cours jusqu'à window.liberer().
import '../../src/styles/polices.css';
import '../../src/styles/jetons.css';
import '../../src/styles/socle.css';
import '../../src/styles/nouveau-voyage.css';
import '../../src/styles/fenetre.css';
import '../../src/styles/fiche.css';
import '../../src/styles/bibliotheque.css';
import '../../src/styles/fiche-modele.css';
import '../../src/styles/etiquettes.css';
import fr from '../../src/i18n/fr.json';
import { creerTraducteur } from '../../src/i18n/traduction.js';
import { ouvrirFicheEtiquette, ouvrirFicheGroupe } from '../../src/ecrans/fiche-etiquette.js';

const t = creerTraducteur({ fr }, 'fr');
const langue = 'fr';
const app = document.querySelector('#app');
const fin = new AbortController();

const groupes = [
  { id: 'g-act', nom: 'Activités', ordre: 0 },
  { id: 'g-cli', nom: 'Climat', ordre: 1 },
  { id: 'g-vide', nom: 'Saison', ordre: 2 },
  { id: 'g-bizarre', nom: '<b>&"x', ordre: 3 },
];
const etiquettes = [
  ['e-rando', 'g-act', 'Randonnée'],
  ['e-camping', 'g-act', 'Camping'],
  ['e-plage', 'g-act', 'Plage'],
  ['e-chaud', 'g-cli', 'Chaud'],
  ['e-froid', 'g-cli', 'Froid'],
  ['e-pluie', 'g-cli', 'Pluie'],
  ['e-bizarre', 'g-bizarre', '<i>&"y'],
].map(([id, groupeId, nom], ordre) => ({ id, groupeId, nom, ordre }));
const bibliotheque = { groupes, etiquettes };

const compter = id => {
  const sortie = document.querySelector(`#${id}`);
  sortie.textContent = String(Number(sortie.textContent) + 1);
};

// Une écriture de l'écran : notée, puis tenue (window.retenir) ou refusée (case « panne »).
let liberer = () => {};
window.liberer = () => liberer();
async function ecrire(noter) {
  if (window.retenir) await new Promise(r => (liberer = r));
  if (document.querySelector('#panne').checked) throw new Error('Panne simulée');
  noter();
}

const enregistrer = saisie =>
  ecrire(() => {
    const sortie = document.querySelector('#enregistrements');
    sortie.textContent = JSON.stringify([...JSON.parse(sortie.textContent), saisie]);
  });
const supprimer = () => ecrire(() => compter('suppressions'));
const commun = {
  t,
  langue,
  enregistrer,
  supprimer,
  surFermeture: () => compter('fermetures'),
  signal: fin.signal,
  dans: app,
};

const OUVRIR = {
  'nouvelle-etiquette': id =>
    ouvrirFicheEtiquette({ ...commun, etiquette: null, groupe: groupes.find(g => g.id === id), bibliotheque }),
  etiquette: id => {
    const etiquette = etiquettes.find(e => e.id === id);
    ouvrirFicheEtiquette({
      ...commun,
      etiquette,
      groupe: groupes.find(g => g.id === etiquette.groupeId),
      bibliotheque,
    });
  },
  'nouveau-groupe': () => ouvrirFicheGroupe({ ...commun, groupe: null, groupes, etiquettesDuGroupe: [] }),
  groupe: id =>
    ouvrirFicheGroupe({
      ...commun,
      groupe: groupes.find(g => g.id === id),
      groupes,
      etiquettesDuGroupe: etiquettes.filter(e => e.groupeId === id),
    }),
};

app.addEventListener('click', ({ target }) => {
  const bouton = target.closest('[data-ouvrir]');
  if (bouton) OUVRIR[bouton.dataset.ouvrir](bouton.dataset.id);
});
