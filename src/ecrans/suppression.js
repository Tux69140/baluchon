// Supprimer dans la bibliothèque (docs/PRD.md, « Toute suppression » ; spec de la phase 7, maquette
// validée, docs/maquettes/suppressions/) : une catégorie, un objet modèle, une étiquette ou un groupe.
// La question dit en chiffres ce que la suppression emporte (consequences(), src/modele/suppressions.js),
// « Garder » d'abord, « Supprimer » en rouge ; puis une seule écriture, faite par le stockage, et le
// bandeau « Annuler » de 10 s (src/ecrans/annulation.js). Une étiquette ou un groupe dont la suppression
// laisserait des catégories ou des objets sans aucune étiquette est refusé : la fenêtre de refus
// (src/ecrans/refus-suppression.js) les montre, et devient la question une fois tout réglé.
import { consequences, estBloquee, extraitAvant } from '../modele/suppressions.js';
import { montrerAnnulation } from './annulation.js';
import { demander } from './fenetre.js';
import { ouvrirRefus } from './refus-suppression.js';
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

// L'écriture, puis le bandeau. bibliotheque : celle dont la question a dit les chiffres ; « Annuler »
// réécrit l'extrait tiré de cette même lecture, d'avant l'écriture, puis le dit aux écrans (événement
// « bibliotheque-retablie ») : la Bibliothèque, les Étiquettes et le refus relisent et l'éclairent.
async function ecrire({ t, langue, stockage, cible, dans }, bibliotheque, nom) {
  const chiffres = consequences(bibliotheque, cible, langue);
  const extrait = extraitAvant(bibliotheque, cible);
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
}

// cible : { type, id }. La bibliothèque est relue : le chiffre annoncé est celui de ce que le stockage
// garde à cet instant. Rend true une fois l'écriture faite, false pour « Garder » (ou Échap, retour
// système, écran parti) ; une écriture refusée lève, et la fiche dit la panne (pas de bandeau).
// signal : la fin de l'écran, qui retire la question ; dans : la racine de l'appli. ouvrirFiche(element,
// type) : ouvre la fiche d'une catégorie ou d'un objet que le refus montre, et rend une promesse résolue
// à sa fermeture (une étiquette ou un groupe seulement : rien d'autre ne peut être refusé).
export async function supprimerDeLaBibliotheque(contexte) {
  const { t, langue, stockage, cible, signal, dans, ouvrirFiche } = contexte;
  const bibliotheque = await stockage.lireBibliotheque();
  const nom = bibliotheque[LISTES[cible.type]].find(x => x.id === cible.id)?.nom ?? '';
  const chiffres = consequences(bibliotheque, cible, langue);
  if (estBloquee(chiffres))
    return ouvrirRefus({
      t,
      langue,
      cible,
      nom,
      lire: () => stockage.lireBibliotheque(),
      ouvrirFiche,
      supprimer: lue => ecrire(contexte, lue, nom),
      signal,
      dans,
    });
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
  await ecrire(contexte, bibliotheque, nom);
  return true;
}
