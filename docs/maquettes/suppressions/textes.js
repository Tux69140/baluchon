// Les phrases de la maquette de la phase 7 : la question chiffrée avant une suppression, et le bandeau
// « Annuler » qui suit. Les chiffres viennent de `consequences` (donnees.js), jamais d'un autre calcul.
import { enToutesLettres } from '../etiquettes/fiches.js';
import { echapper } from '../bibliotheque/outils.js';

export const pluriel = (nb, mot, pl = `${mot}s`) => `${nb} ${nb > 1 ? pl : mot}`;

// Espaces insécables du français : « Plage » ne se coupe plus en fin de ligne, ni un « ? » ou un
// « : » ne part seul à la ligne suivante.
export const typo = texte => texte.replace(/« /g, '«\u00a0').replace(/ ([»:;?!])/g, '\u00a0$1');
const typoTout = o => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, typo(v)]));

// « 2 objets et 1 catégorie » ; vide si rien n'est touché.
const compte = ({ categories, objets }) =>
  enToutesLettres([
    ...(objets.length ? [pluriel(objets.length, 'objet')] : []),
    ...(categories.length ? [pluriel(categories.length, 'catégorie')] : []),
  ]);
const plusieurs = ({ categories, objets }) => categories.length + objets.length > 1;

const VOYAGES = 'Les voyages déjà créés ne changent pas.';

// Rend { titre, texte } ; texte en HTML, les chiffres en gras.
export const question = (cible, nom, csq) => typoTout(questionBrute(cible, nom, csq));
function questionBrute(cible, nom, csq) {
  const n = echapper(nom);
  if (cible.type === 'objet')
    return { titre: `Supprimer l’objet « ${n} » ?`, texte: `Il ne sera plus proposé dans « Nouveau voyage ». ${VOYAGES}` };
  if (cible.type === 'categorie') {
    const objets = csq.objets.length
      ? `${csq.objets.length > 1 ? 'Ses' : 'Son'} <b>${pluriel(csq.objets.length, 'objet')}</b> ${csq.objets.length > 1 ? 'seront supprimés' : 'sera supprimé'} aussi. `
      : '';
    return { titre: `Supprimer la catégorie « ${n} » ?`, texte: `${objets}Elle ne sera plus proposée dans « Nouveau voyage ». ${VOYAGES}` };
  }
  const touches = compte(csq.perdent);
  // Un seul élément touché : « il » pour un objet, « elle » pour une catégorie.
  const lui = csq.perdent.categories.length ? 'elle' : 'il';
  if (cible.type === 'etiquette') {
    const perte = touches
      ? plusieurs(csq.perdent)
        ? `<b>${touches}</b> perdront cette étiquette ; ils gardent leurs autres étiquettes. `
        : `<b>${touches}</b> perdra cette étiquette ; ${lui} garde ses autres étiquettes. `
      : '';
    return { titre: `Supprimer l’étiquette « ${n} » ?`, texte: `Elle ne sera plus proposée dans « Nouveau voyage ». ${perte}${VOYAGES}` };
  }
  const noms = csq.etiquettes.map(echapper);
  const etiquettes = noms.length
    ? `${noms.length > 1 ? 'Ses étiquettes' : 'Son étiquette'} ${enToutesLettres(noms)} ${noms.length > 1 ? 'seront supprimées' : 'sera supprimée'} aussi, et son étape disparaîtra de « Nouveau voyage ». `
    : '';
  const perte = touches
    ? plusieurs(csq.perdent)
      ? `<b>${touches}</b> perdront une de leurs étiquettes ; ils gardent les autres. `
      : `<b>${touches}</b> perdra une de ses étiquettes ; ${lui} garde les autres. `
    : '';
  return { titre: `Supprimer le groupe « ${n} » ?`, texte: `${etiquettes}${perte}${VOYAGES}` };
}

// Ce que dit le bandeau « Annuler ».
export const bandeau = (cible, nom, csq) => typo(bandeauBrut(cible, nom, csq));
function bandeauBrut(cible, nom, csq) {
  const n = echapper(nom);
  if (cible.type === 'objet') return `Objet « ${n} » supprimé`;
  if (cible.type === 'categorie')
    return csq.objets.length ? `Catégorie « ${n} » et ${pluriel(csq.objets.length, 'objet')} supprimés` : `Catégorie « ${n} » supprimée`;
  if (cible.type === 'etiquette') return `Étiquette « ${n} » supprimée`;
  return csq.etiquettes.length ? `Groupe « ${n} » et ${pluriel(csq.etiquettes.length, 'étiquette')} supprimés` : `Groupe « ${n} » supprimé`;
}

// Le refus : pourquoi, et quoi faire.
export const refus = (cible, nom, csq) => typoTout(refusBrut(cible, nom, csq));
function refusBrut(cible, nom, csq) {
  const n = echapper(nom);
  const nb = csq.bloquent.categories.length + csq.bloquent.objets.length;
  const groupe = cible.type === 'groupe';
  const sans = groupe ? 'Sans ses étiquettes' : 'Sans elle';
  const texte =
    nb > 1
      ? `${sans}, ces éléments ne seraient plus jamais proposés. Touchez-les un par un : donnez-leur une autre étiquette ou « Toujours inclus », ou supprimez-les.`
      : `${sans}, cet élément ne serait plus jamais proposé. Touchez-le : donnez-lui une autre étiquette ou « Toujours inclus », ou supprimez-le.`;
  return {
    titre: `Impossible de supprimer « ${n} » pour l’instant`,
    texte,
    reste: `${nb} à régler`,
  };
}
