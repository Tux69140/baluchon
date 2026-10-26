// Modifier, créer ou supprimer une catégorie ou un objet modèle depuis sa fiche
// (src/ecrans/fiche-categorie.js, fiche-objet.js) : la fiche, puis l'écriture par le stockage. Partagé
// par les écrans qui ouvrent ces fiches (la Bibliothèque ; la fenêtre de refus d'une suppression).
// Chaque fonction rend une promesse résolue quand la fiche est effacée, ou quand l'écran s'en va avec
// elle. apresEcriture({ cible, neuve, supprimee }) : appelée une fois l'écriture faite, avant que la
// fiche ne se ferme ; l'écran y relit la bibliothèque. cible : { type, id }.
import { nouvelId } from '../modele/identifiant.js';
import { groupesAvecEtiquettes } from '../modele/inclusion.js';
import { preparerCategorie, preparerObjet } from '../modele/modeles.js';
import { ouvrirFicheCategorie } from './fiche-categorie.js';
import { ouvrirFicheObjet } from './fiche-objet.js';
import { supprimerDeLaBibliotheque } from './suppression.js';

// La fiche ouverte par ouvrir(rappels), avec ce qui est commun aux deux : son effacement attendu, et
// « Supprimer » pour un élément existant. Un élément neuf a son id dès l'ouverture de la fiche : un
// nouvel essai après une panne écrit le même, jamais un second (Review Focus 3 de la phase 5).
function editer({ type, existant, contexte, ouvrir, ecrire }) {
  const { t, langue, stockage, signal, dans, surFermeture = () => {}, apresEcriture } = contexte;
  const cible = { type, id: existant?.id ?? nouvelId() };
  return new Promise(resoudre => {
    signal.addEventListener('abort', () => resoudre(), { once: true });
    ouvrir({
      t,
      langue,
      groupes: groupesAvecEtiquettes(contexte.bibliotheque),
      signal,
      dans,
      surFermeture() {
        surFermeture();
        resoudre();
      },
      async enregistrer(saisie) {
        await ecrire(saisie, cible.id, new Date().toISOString());
        await apresEcriture({ cible, neuve: !existant, supprimee: false });
      },
      supprimer:
        existant &&
        (async () => {
          const fait = await supprimerDeLaBibliotheque({ t, langue, stockage, cible, signal, dans });
          if (fait) await apresEcriture({ cible, neuve: false, supprimee: true });
          return fait;
        }),
    });
  });
}

// categorie : celle à modifier, ou null pour une nouvelle ; nombreObjets : les siens, dits sous le
// titre ; bibliotheque : telle que lue (les rangs, les étiquettes proposées).
export function editerCategorie({ categorie, nombreObjets, ...contexte }) {
  const { stockage, bibliotheque } = contexte;
  return editer({
    type: 'categorie',
    existant: categorie,
    contexte,
    ouvrir: rappels => ouvrirFicheCategorie({ ...rappels, categorie, nombreObjets }),
    ecrire: (saisie, id, maintenant) =>
      stockage.enregistrerCategorie(
        preparerCategorie(saisie, {
          existante: categorie,
          categories: bibliotheque.categories,
          nouvelId: () => id,
          maintenant,
        }),
      ),
  });
}

// objet : celui à modifier, ou null pour un nouvel objet de categorie.
export function editerObjet({ objet, categorie, ...contexte }) {
  const { stockage } = contexte;
  return editer({
    type: 'objet',
    existant: objet,
    contexte,
    ouvrir: rappels => ouvrirFicheObjet({ ...rappels, objet, categorie }),
    ecrire: (saisie, id, maintenant) =>
      stockage.enregistrerObjet(
        preparerObjet(saisie, { existant: objet, categorieId: categorie.id, nouvelId: () => id, maintenant }),
      ),
  });
}
