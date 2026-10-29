// Sortir du sac les pièces de trop (phase 10 ; décisions du chef de projet du 2026-10-29,
// docs/superpowers/specs/2026-10-29-phase-10-plans-changent-design.md ; maquette validée
// docs/maquettes/plans-changent/) : ce que font « C'est fait » et « Le garder dans le voyage ». Les
// règles (pièces à sortir, objet retiré, quantité reprise) viennent du modèle ; l'écran du voyage prête
// son contenu et sa file d'écriture, comme aux gestes d'ajustement (src/ecrans/ajustements.js).
import { quantiteGardee } from '../modele/ajustements.js';
import { achetesApresSac } from '../modele/courses.js';
import { estRetire, piecesASortir } from '../modele/sac.js';
import { avecObjet } from './ajustements.js';

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

  return { faire, garder };
}
