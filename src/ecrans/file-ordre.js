// La file des déplacements ▲ ▼ d'un rangement, partagée par la Bibliothèque (les catégories) et
// l'écran Étiquettes (les groupes, et les étiquettes de chaque groupe). Chaque liste rangée a sa clé
// ('categories', 'groupes', ou l'id d'un groupe) et son ordre voulu, en avance sur l'ordre affiché
// tant que des écritures attendent : chaque appui part de lui, pour que des appuis rapides
// s'additionnent. Les écritures passent une à une, dans l'ordre des appuis, toutes listes confondues ;
// l'écran ne montre que l'ordre que le stockage a confirmé. Après un échec, les écritures d'avant
// (génération dépassée) sont abandonnées et les appuis attendent la relecture : l'ordre affiché reste
// toujours l'ordre enregistré (Review Focus 4 des phases 5 et 6).
import { deplacerDansListe } from '../modele/modeles.js';

// ecrire(cle, ids) : l'écriture d'un ordre ; confirme(cle, ids, id) : l'ordre écrit, à afficher (id :
// l'élément déplacé) ; echec(erreur) : relire ce que le stockage garde et le redonner par definir ;
// parti() : vrai si l'écran est parti, plus rien à afficher.
export function creerFileOrdre({ ecrire, confirme, echec, parti }) {
  const voulus = new Map();
  let file = Promise.resolve();
  let generation = 0;
  let relecture = false;

  // L'ordre lu (ouverture, relecture) : les déplacements en attente restent, un élément neuf vient en
  // dernier, un élément parti s'efface.
  function definir(cle, ids) {
    const avant = voulus.get(cle) ?? [];
    voulus.set(cle, [...avant.filter(id => ids.includes(id)), ...ids.filter(id => !avant.includes(id))]);
  }

  // L'écriture refusée : plus rien de voulu ne tient, l'écran relit et redonne chaque ordre.
  async function apresEchec(erreur) {
    console.error(erreur);
    generation += 1;
    relecture = true;
    voulus.clear();
    try {
      await echec(erreur);
    } finally {
      relecture = false;
    }
  }

  function deplacer(cle, id, sens) {
    const voulu = voulus.get(cle);
    if (relecture || !voulu) return;
    const ids = deplacerDansListe(voulu, id, sens);
    if (ids.every((x, i) => x === voulu[i])) return;
    voulus.set(cle, ids);
    const sienne = generation;
    file = file
      .then(async () => {
        // L'écran quitté entre-temps n'arrête pas l'écriture : chaque appui reçu est enregistré.
        if (sienne !== generation) return;
        await ecrire(cle, ids);
        if (sienne === generation && !parti()) confirme(cle, ids, id);
      })
      .catch(erreur => sienne === generation && apresEchec(erreur))
      // Un échec qui échoue lui-même ne doit pas bloquer la file pour toujours.
      .catch(erreur => console.error(erreur));
  }

  return { definir, deplacer };
}
