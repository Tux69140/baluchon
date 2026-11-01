// La bibliothèque de départ : sa structure (src/modele/depart/, sans aucun texte) et ses mots (la
// branche « depart » du dictionnaire de la langue, src/i18n/fr.json pour le français). Au premier
// lancement, les deux se combinent en lignes de la bibliothèque de l’utilisateur, qui lui appartiennent
// ensuite (docs/PRD.md, « Données »). Un modèle sans étiquette est « toujours inclus » (docs/PRD.md,
// « Inclusion »).

// Une bibliothèque n'est livrée dans une langue que si tous ses mots y sont : tout nom, et toute
// note que la structure annonce, présents et non vides. Sinon l'installation retomberait sur des
// trous, et la langue de l'appareil cède la place au français.
export function bibliothequeComplete(depart, textes) {
  const present = valeur => typeof valeur === 'string' && valeur.trim() !== '';
  if (!textes) return false;
  const etiquettes = depart.groupes.flatMap(g => g.etiquettes);
  const objets = depart.categories.flatMap(c => c.objets);
  return (
    depart.groupes.every(g => present(textes.groupes?.[g.cle])) &&
    etiquettes.every(cle => present(textes.etiquettes?.[cle])) &&
    depart.categories.every(c => present(textes.categories?.[c.cle])) &&
    objets.every(o => present(textes.objets?.[o.cle]?.nom) && (!o.note || present(textes.objets[o.cle].note)))
  );
}

// La langue dans laquelle installer la bibliothèque : celle de l'appareil si sa bibliothèque est
// complète, le français sinon (le français est la langue de référence, toujours complète).
export const langueDeLaBibliotheque = (langue, dictionnaires, depart) =>
  bibliothequeComplete(depart, dictionnaires[langue]?.depart) ? langue : 'fr';

export function construireBibliotheque(depart, textes, { nouvelId, maintenant }) {
  const groupes = [];
  const etiquettes = [];
  const idDeCle = new Map();
  depart.groupes.forEach(({ cle: cleGroupe, etiquettes: siennes }, ordre) => {
    const groupeId = nouvelId();
    groupes.push({ id: groupeId, nom: textes.groupes[cleGroupe], ordre, modifieLe: maintenant });
    siennes.forEach((cle, rang) => {
      const id = nouvelId();
      idDeCle.set(cle, id);
      etiquettes.push({ id, groupeId, nom: textes.etiquettes[cle], ordre: rang, modifieLe: maintenant });
    });
  });
  const ids = cles => (cles ?? []).map(cle => idDeCle.get(cle));

  const categories = [];
  const objets = [];
  depart.categories.forEach(({ cle: cleCategorie, icone, couleur, etiquettes: ses, objets: siens }, ordre) => {
    const id = nouvelId();
    const liees = ids(ses);
    categories.push({
      id,
      nom: textes.categories[cleCategorie],
      icone,
      couleur,
      ordre,
      toujoursIncluse: liees.length === 0,
      modifieLe: maintenant,
      etiquettes: liees,
    });
    for (const o of siens) {
      const siennes = ids(o.etiquettes);
      objets.push({
        id: nouvelId(),
        categorieId: id,
        nom: textes.objets[o.cle].nom,
        regle: o.regle,
        valeur: o.valeur,
        plafond: o.plafond ?? null,
        parPersonne: o.parPersonne,
        pourQui: o.pourQui,
        consommable: o.consommable ?? false,
        toujoursInclus: siennes.length === 0,
        note: o.note ? textes.objets[o.cle].note : '',
        modifieLe: maintenant,
        etiquettes: siennes,
      });
    }
  });
  return { groupes, etiquettes, categories, objets };
}
