// La bibliothèque de départ : décrite dans le fichier de traduction (src/i18n/fr.json,
// « bibliothequeDeDepart »), elle devient au premier lancement les lignes de la bibliothèque de
// l’utilisateur, qui lui appartiennent ensuite (docs/PRD.md, « Données »). Les groupes y portent
// leurs étiquettes sous une clé de départ ; catégories et objets citent ces clés, traduites ici en
// identifiants. Un modèle sans étiquette est « toujours inclus » (docs/PRD.md, « Inclusion »).
export function construireBibliotheque(depart, { nouvelId, maintenant }) {
  const groupes = [];
  const etiquettes = [];
  const idDeCle = new Map();
  depart.groupes.forEach(({ nom, etiquettes: siennes }, ordre) => {
    const groupeId = nouvelId();
    groupes.push({ id: groupeId, nom, ordre, modifieLe: maintenant });
    siennes.forEach(({ cle, nom: nomEtiquette }, rang) => {
      const id = nouvelId();
      idDeCle.set(cle, id);
      etiquettes.push({ id, groupeId, nom: nomEtiquette, ordre: rang, modifieLe: maintenant });
    });
  });
  const ids = cles => (cles ?? []).map(cle => idDeCle.get(cle));

  const categories = [];
  const objets = [];
  depart.categories.forEach(({ nom, icone, couleur, etiquettes: ses, objets: siens }, ordre) => {
    const id = nouvelId();
    const liees = ids(ses);
    categories.push({
      id,
      nom,
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
        nom: o.nom,
        regle: o.regle,
        valeur: o.valeur,
        plafond: o.plafond ?? null,
        parPersonne: o.parPersonne,
        consommable: o.consommable ?? false,
        toujoursInclus: siennes.length === 0,
        note: o.note ?? '',
        modifieLe: maintenant,
        etiquettes: siennes,
      });
    }
  });
  return { groupes, etiquettes, categories, objets };
}
