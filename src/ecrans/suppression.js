// Supprimer dans la bibliothèque (docs/PRD.md, « Toute suppression » ; spec de la phase 7, maquette
// validée, docs/maquettes/suppressions/) : une catégorie, un objet modèle, une étiquette ou un groupe.
// La question dit en chiffres ce que la suppression emporte (consequences(), src/modele/suppressions.js),
// « Garder » d'abord, « Supprimer » en rouge ; puis une seule écriture, faite par le stockage.
import { consequences } from '../modele/suppressions.js';
import { demander } from './fenetre.js';
import { question } from './suppression-textes.js';

// Où chercher le nom de la cible, et quelle écriture la supprime.
const LISTES = { categorie: 'categories', objet: 'objets', etiquette: 'etiquettes', groupe: 'groupes' };
const ECRITURES = {
  categorie: 'supprimerCategorie',
  objet: 'supprimerObjet',
  etiquette: 'supprimerEtiquette',
  groupe: 'supprimerGroupe',
};

// cible : { type, id }. La bibliothèque est relue : le chiffre annoncé est celui de ce que le stockage
// garde à cet instant. Rend true une fois l'écriture faite, false pour « Garder » (ou Échap, retour
// système, écran parti) ; une écriture refusée lève, et la fiche dit la panne. signal : la fin de
// l'écran, qui retire la question.
export async function supprimerDeLaBibliotheque({ t, langue, stockage, cible, signal }) {
  const bibliotheque = await stockage.lireBibliotheque();
  const nom = bibliotheque[LISTES[cible.type]].find(x => x.id === cible.id)?.nom ?? '';
  const { titre, texte } = question(t, langue, cible, nom, consequences(bibliotheque, cible, langue));
  const reponse = await demander({
    t,
    titre,
    texteHtml: texte,
    idTexte: 'suppression-texte',
    signal,
    boutons: [
      { cle: 'garder', libelle: t('suppression.garder') },
      { cle: 'supprimer', libelle: t('suppression.supprimer'), danger: true },
    ],
  });
  if (reponse !== 'supprimer') return false;
  await stockage[ECRITURES[cible.type]](cible.id);
  return true;
}
