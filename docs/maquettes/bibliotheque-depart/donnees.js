// Les voyages de la maquette de la phase 13, copiés de la bibliothèque de départ (bibliotheque-v5.js) par le
// vrai modèle (genererVoyage), l'aperçu étant celui de la composition (composition.js). « Week-end à la
// mer, 2 femmes et 1 enfant, Plage, Train, Location » est le voyage de la réussite de la conception.
import { genererVoyage } from '../../../src/modele/voyage.js';
import { progression } from '../../../src/modele/sac.js';
import { apercu, construireBibliotheque, total } from './composition.js';

export const AUJOURDHUI = '2026-11-01';
const MAINTENANT = '2026-11-01T09:00:00.000Z';

export const bibliotheque = construireBibliotheque();

// dansLeSac : { nom de l'objet: pièces déjà emballées } (ou true : toutes).
function creer(id, nom, destination, [depart, retour], composition, choisies, dansLeSac = {}) {
  const infos = { nom, destination, depart, retour, ...composition, voyageurs: total(composition) };
  const etiquettes = new Set(choisies);
  let n = 0;
  const nouvelId = () => (n++ ? `${id}-${n}` : id);
  const contenu = genererVoyage(
    bibliotheque,
    infos,
    { choisies: etiquettes, ecartes: new Set(), apercu: apercu(bibliotheque, infos, etiquettes) },
    { nouvelId, maintenant: MAINTENANT },
  );
  Object.assign(contenu.voyage, composition);
  for (const objet of contenu.objets)
    if (objet.nom in dansLeSac) objet.dansLeSac = dansLeSac[objet.nom] === true ? objet.quantite : dansLeSac[objet.nom];
  return contenu;
}

const COMPOSITION = (femmes, hommes, enfants) => ({ femmes, hommes, enfants });

export const contenus = {
  mer: creer('v-mer', 'Week-end à la mer', 'Saint-Malo', ['2026-11-13', '2026-11-15'], COMPOSITION(2, 0, 1), ['plage', 'train', 'location'], {
    'Carte d’identité': true,
    'Carnet de santé': true,
    'Billets et réservations': true,
    'Carte bancaire': true,
    'Clés de la maison': true,
    'T-shirts': 4,
    Culottes: true,
    'Maillot de bain': true,
    'Brosse à dents': true,
    'Crème solaire': true,
    Doudou: true,
  }),
  lyon: creer('v-lyon', 'Week-end à Lyon', 'Lyon', ['2026-11-20', '2026-11-22'], COMPOSITION(1, 1, 0), ['ville', 'train', 'hotel'], {
    'Brosse à dents': true,
    'T-shirts': 2,
  }),
  jura: creer('v-jura', 'Noël dans le Jura', 'Les Rousses', ['2026-12-21', '2026-12-27'], COMPOSITION(2, 2, 1), ['ski', 'froid', 'voiture', 'location']),
  quiberon: creer('v-quiberon', 'Quiberon', 'Bretagne', ['2026-07-12', '2026-07-19'], COMPOSITION(1, 1, 0), ['plage', 'chaud', 'voiture', 'camping']),
};

export const voyages = Object.values(contenus).map(c => c.voyage);
export const progressions = new Map(Object.values(contenus).map(c => [c.voyage.id, progression(c.objets)]));
