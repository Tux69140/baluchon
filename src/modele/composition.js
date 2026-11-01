// Qui voyage (docs/superpowers/specs/2026-11-01-phase-13-bibliotheque-traduisible-design.md,
// « Comportement ») : la composition d'un voyage en trois groupes, et les cinq groupes de « Pour qui »
// qu'un objet peut viser. Seul endroit où l'on compte des personnes.
const GROUPES_COMPOSITION = Object.freeze(['femmes', 'hommes', 'enfants']);
export const POUR_QUI = Object.freeze(['tous', 'adultes', 'femmes', 'hommes', 'enfants']);

// Chaque compteur va de 0 à 20 ; le total, de 1 à 20.
export const BORNES_COMPOSITION = Object.freeze({ min: 0, max: 20, total: 20 });
export const COMPOSITION_INITIALE = Object.freeze({ femmes: 1, hommes: 1, enfants: 0 });

// Les trois nombres d'un objet qui les porte (informations saisies, voyage, période).
export const composition = ({ femmes, hommes, enfants }) => ({ femmes, hommes, enfants });

export const totalVoyageurs = ({ femmes, hommes, enfants }) => femmes + hommes + enfants;

// Les personnes que compte un groupe de « Pour qui » ; les enfants sont comptés dans « tous ».
export const personnes = (pourQui, c) =>
  ({
    tous: totalVoyageurs(c),
    adultes: c.femmes + c.hommes,
    femmes: c.femmes,
    hommes: c.hommes,
    enfants: c.enfants,
  })[pourQui];

const compteurValide = n => Number.isInteger(n) && n >= BORNES_COMPOSITION.min && n <= BORNES_COMPOSITION.max;

// Un objet vide quand tout est bon ; sinon l'erreur `composition` (code traduit dans fr.json). Un
// compteur absurde (négatif, fractionnaire, en texte) vaut « aucun voyageur » ; au-delà de 20, « trop ».
export function validerComposition(c) {
  const comptes = GROUPES_COMPOSITION.map(g => c[g]);
  if (comptes.every(compteurValide)) {
    const total = totalVoyageurs(c);
    if (total < 1) return { composition: 'aucunVoyageur' };
    if (total > BORNES_COMPOSITION.total) return { composition: 'tropDeVoyageurs' };
    return {};
  }
  return {
    composition: comptes.some(n => Number.isInteger(n) && n > BORNES_COMPOSITION.max)
      ? 'tropDeVoyageurs'
      : 'aucunVoyageur',
  };
}

// Les groupes dont le nombre change, dans l'ordre des groupes : de quoi dire « 1 enfant de plus ».
export const ecartsDeComposition = (avant, apres) =>
  GROUPES_COMPOSITION.map(groupe => ({ groupe, ecart: apres[groupe] - avant[groupe] })).filter(
    ({ ecart }) => ecart !== 0,
  );
