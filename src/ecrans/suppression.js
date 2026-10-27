// Supprimer dans la bibliothèque (docs/PRD.md, « Toute suppression » ; spec de la phase 7, maquette
// validée, docs/maquettes/suppressions/) : une catégorie, un objet modèle, une étiquette ou un groupe.
// La question dit en chiffres ce que la suppression emporte (consequences(), src/modele/suppressions.js),
// « Garder » d'abord, « Supprimer » en rouge ; puis une seule écriture, faite par le stockage, et le
// bandeau « Annuler » de 10 s (src/ecrans/annulation.js). Une étiquette ou un groupe dont la suppression
// laisserait des catégories ou des objets sans aucune étiquette est refusé : la fenêtre de refus
// (src/ecrans/refus-suppression.js) les montre, et devient la question une fois tout réglé.
import { consequences, estBloquee, extraitAvant, memesConsequences } from '../modele/suppressions.js';
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

// L'écriture, puis le bandeau. bibliotheque : celle qui vient d'être relue, et chiffres ce qu'elle
// emporte ; « Annuler » réécrit l'extrait tiré de cette même lecture, d'avant l'écriture, puis le dit
// aux écrans (événement « bibliotheque-retablie ») : la Bibliothèque, les Étiquettes, le refus et
// « Nouveau voyage » relisent, et l'éclairent.
async function ecrire({ t, langue, stockage, cible, dans }, bibliotheque, chiffres, nom) {
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

// La seule revérification, partagée par la question et le refus (« Plus rien ne bloque ») : entre
// l'annonce et l'appui sur « Supprimer », « Annuler » du bandeau a pu rendre un élément. La
// bibliothèque est relue au moment d'écrire (après un rétablissement en cours) : si la suppression
// emporte, fait perdre et bloque les mêmes éléments que ceux annoncés, elle s'écrit sur cette lecture
// fraîche, d'où vient aussi l'extrait d'« Annuler » ; sinon rien n'est écrit, et PERIMEE le dit.
// Rend true, ou PERIMEE ; une écriture refusée lève.
const PERIMEE = 'perimee';
async function ecrireSiInchangee(contexte, annoncees, nom) {
  const { stockage, cible, langue } = contexte;
  const fraiche = await stockage.lireBibliotheque();
  const chiffres = consequences(fraiche, cible, langue);
  if (!memesConsequences(annoncees, chiffres)) return PERIMEE;
  await ecrire(contexte, fraiche, chiffres, nom);
  return true;
}

// cible : { type, id }. La bibliothèque est relue : le chiffre annoncé est celui de ce que le stockage
// garde à cet instant. Rend true une fois l'écriture faite, false pour « Garder » (ou Échap, retour
// système, écran parti) ; une écriture refusée lève, et la fiche dit la panne (pas de bandeau).
// Les chiffres ont changé avant l'écriture : rien n'est écrit, la question est reposée (ou le refus
// ouvert) sur ce que le stockage garde maintenant.
// signal : la fin de l'écran, qui retire la question ; dans : la racine de l'appli. ouvrirFiche(element,
// type) : ouvre la fiche d'une catégorie ou d'un objet que le refus montre, et rend une promesse résolue
// à sa fermeture (une étiquette ou un groupe seulement : rien d'autre ne peut être refusé).
export async function supprimerDeLaBibliotheque(contexte) {
  const { t, langue, stockage, cible, signal, dans, ouvrirFiche } = contexte;
  const bibliotheque = await stockage.lireBibliotheque();
  const nom = bibliotheque[LISTES[cible.type]].find(x => x.id === cible.id)?.nom ?? '';
  const chiffres = consequences(bibliotheque, cible, langue);
  const supprimer = annoncees => ecrireSiInchangee(contexte, annoncees, nom);
  let issue;
  if (estBloquee(chiffres))
    issue = await ouvrirRefus({
      t,
      langue,
      cible,
      nom,
      lire: () => stockage.lireBibliotheque(),
      ouvrirFiche,
      supprimer,
      signal,
      dans,
    });
  else {
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
    issue = reponse === 'supprimer' && (await supprimer(chiffres));
  }
  if (issue !== PERIMEE) return issue;
  return !signal.aborted && supprimerDeLaBibliotheque(contexte);
}
