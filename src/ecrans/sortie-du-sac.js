// Sortir du sac les pièces de trop (phase 10 ; décisions du chef de projet du 2026-10-29,
// docs/superpowers/specs/2026-10-29-phase-10-plans-changent-design.md ; maquette validée
// docs/maquettes/plans-changent/) : la question posée après « Appliquer les changements », et ce que font
// « C'est fait » et « Le garder dans le voyage ». Les
// règles (pièces à sortir, objet retiré, quantité reprise) viennent du modèle ; l'écran du voyage prête
// son contenu et sa file d'écriture, comme aux gestes d'ajustement (src/ecrans/ajustements.js).
import { remplir } from '../i18n/traduction.js';
import { quantiteGardee } from '../modele/ajustements.js';
import { achetesApresSac } from '../modele/courses.js';
import { estRetire, piecesASortir } from '../modele/sac.js';
import { vueEcartes } from './assistant-vues.js';
import { avecObjet } from './ajustements.js';
import { demander } from './fenetre.js';
import { pluriel } from './format.js';

// Les pièces à sortir qu'« Appliquer les changements » vient de laisser (src/ecrans/modifier-voyage.js) :
// l'assistant s'en va, et l'écran du voyage, redessiné, pose la question (sortieAnnoncee). Une seule
// annonce à la fois ; elle ne vaut que pour son voyage.
let annonce = null;
export const annoncerSortie = (voyageId, objets) => (annonce = objets.length ? { voyageId, objets } : null);
export function sortieAnnoncee(voyageId) {
  const objets = annonce?.voyageId === voyageId ? annonce.objets : null;
  annonce = null;
  return objets;
}

// « Sortir N pièces du sac ? » pour tous les objets concernés à la fois, nommés avec leur nombre de pièces
// (objets : { nom, pieces, retire, categorie }). Rend 'fait', 'plus-tard', ou null (fermée sans réponse :
// comme « Plus tard », rien ne sort).
function demanderSortie({ t, langue, objets, signal }) {
  const total = objets.reduce((somme, o) => somme + o.pieces, 0);
  const lignes = objets.map(o => ({
    nom: o.nom,
    categorie: o.retire
      ? pluriel(t, 'sortie.ligneRetire', o.pieces, langue)
      : remplir(pluriel(t, 'sortie.ligne', o.pieces, langue), { categorie: o.categorie }),
  }));
  return demander({
    t,
    titre: pluriel(t, 'ajustement.baisse.titre', total, langue),
    texte: t('sortie.texte'),
    contenu: vueEcartes(lignes),
    suite: [t('sortie.suite')],
    signal,
    boutons: [
      { cle: 'plus-tard', libelle: t('sortie.plusTard') },
      { cle: 'fait', libelle: t('sortie.fait'), principal: true },
    ],
  });
}

// ecran : { stockage, contenu, appliquer } de l'écran du voyage, et retirerSansQuestion(ids) des gestes
// d'ajustement. Rend les gestes de sortie.
export function gestesDeSortie(ecran, { retirerSansQuestion }) {
  const { stockage } = ecran;
  const objetDe = id => ecran.contenu().objets.find(o => o.id === id);

  // « C'est fait » : le sac revient à la quantité prévue ; un objet retiré quitte le voyage (avec
  // « Annuler »). Mis en entier dans le sac, un objet à acheter compte comme acheté (src/modele/courses.js).
  async function faire(ids) {
    const objets = ids.map(objetDe).filter(o => o && piecesASortir(o) > 0);
    for (const objet of objets.filter(o => !estRetire(o))) {
      const dansLeSac = objet.quantite;
      const achetes = achetesApresSac(objet, dansLeSac);
      const modifieLe = new Date().toISOString();
      ecran.appliquer(avecObjet(ecran.contenu(), objet.id, { dansLeSac, achetes, modifieLe }), () =>
        stockage.reglerDansLeSac(objet.id, dansLeSac, achetes, modifieLe),
      );
    }
    const retires = objets.filter(estRetire).map(o => o.id);
    if (retires.length) await retirerSansQuestion(retires);
  }

  // « Le garder dans le voyage » : un objet retiré reprend une quantité (src/modele/ajustements.js), ses
  // pièces restent dans le sac.
  function garder(id) {
    const objet = objetDe(id);
    if (!objet || !estRetire(objet)) return;
    const { quantite, quantiteManuelle } = quantiteGardee(objet, ecran.contenu().voyage);
    const modifieLe = new Date().toISOString();
    ecran.appliquer(avecObjet(ecran.contenu(), id, { quantite, quantiteManuelle, modifieLe }), () =>
      stockage.garderDansLeVoyage(id, quantite, quantiteManuelle, modifieLe),
    );
  }

  // La question de l'annonce, puis « C'est fait » pour tous, ou rien (« Plus tard », fermée sans réponse).
  async function demander({ t, langue, objets, signal }) {
    const reponse = await demanderSortie({ t, langue, objets, signal });
    if (reponse === 'fait' && !signal.aborted) await faire(objets.map(o => o.id));
  }

  return { faire, garder, demander };
}
