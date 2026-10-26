// Supprimer dans la bibliothèque (docs/PRD.md, « Toute suppression » ; spec de la phase 7, maquette
// validée, docs/maquettes/suppressions/) : une catégorie, un objet modèle, une étiquette ou un groupe.
// La question dit en chiffres ce que la suppression emporte (consequences(), src/modele/suppressions.js),
// « Garder » d'abord, « Supprimer » en rouge ; puis une seule écriture, faite par le stockage, et le
// bandeau « Annuler » de 10 s (src/ecrans/annulation.js).
import { consequences, extraitAvant } from '../modele/suppressions.js';
import { montrerAnnulation } from './annulation.js';
import { demander } from './fenetre.js';
import { question, texteBandeau } from './suppression-textes.js';

// Où chercher le nom de la cible, et quelle écriture la supprime.
const LISTES = { categorie: 'categories', objet: 'objets', etiquette: 'etiquettes', groupe: 'groupes' };
const ECRITURES = {
  categorie: 'supprimerCategorie',
  objet: 'supprimerObjet',
  etiquette: 'supprimerEtiquette',
  groupe: 'supprimerGroupe',
};

// La catégorie à montrer une fois l'élément rétabli : la cible elle-même, ou celle de l'objet ; aucune
// pour une étiquette ou un groupe.
function categorieAMontrer({ type, id }, extrait) {
  if (type === 'categorie') return id;
  return type === 'objet' ? (extrait.objets[0]?.categorieId ?? null) : null;
}

// cible : { type, id }. La bibliothèque est relue : le chiffre annoncé est celui de ce que le stockage
// garde à cet instant. Rend true une fois l'écriture faite, false pour « Garder » (ou Échap, retour
// système, écran parti) ; une écriture refusée lève, et la fiche dit la panne (pas de bandeau).
// signal : la fin de l'écran, qui retire la question ; dans : la racine de l'appli.
// « Annuler » réécrit l'extrait tiré de cette même lecture, d'avant l'écriture, puis le dit aux écrans
// (événement « bibliotheque-retablie ») : la Bibliothèque et les Étiquettes relisent et l'éclairent.
export async function supprimerDeLaBibliotheque({ t, langue, stockage, cible, signal, dans }) {
  const bibliotheque = await stockage.lireBibliotheque();
  const nom = bibliotheque[LISTES[cible.type]].find(x => x.id === cible.id)?.nom ?? '';
  const chiffres = consequences(bibliotheque, cible, langue);
  const extrait = extraitAvant(bibliotheque, cible);
  const { titre, texte } = question(t, langue, cible, nom, chiffres);
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
  montrerAnnulation({
    t,
    app: dans,
    texte: texteBandeau(t, langue, cible, nom, chiffres),
    async annuler() {
      await stockage.retablirBibliotheque(extrait);
      const categorieId = categorieAMontrer(cible, extrait);
      window.dispatchEvent(new CustomEvent('bibliotheque-retablie', { detail: { cible, categorieId } }));
    },
  });
  return true;
}
