// La bibliothèque de départ : décrite dans le fichier de traduction (src/i18n/fr.json,
// « bibliothequeDeDepart »), elle devient au premier lancement les lignes de la bibliothèque de
// l'utilisateur, qui lui appartiennent ensuite (docs/PRD.md, « Données »). Mini-bibliothèque de la
// phase 2 : tout y est « toujours inclus », les étiquettes arrivent en phase 4.
export function construireBibliotheque(depart, { nouvelId, maintenant }) {
  const categories = [];
  const objets = [];
  depart.categories.forEach(({ nom, icone, couleur, objets: siens }, ordre) => {
    const id = nouvelId();
    categories.push({ id, nom, icone, couleur, ordre, toujoursIncluse: true, modifieLe: maintenant });
    for (const o of siens)
      objets.push({
        id: nouvelId(),
        categorieId: id,
        nom: o.nom,
        regle: o.regle,
        valeur: o.valeur,
        plafond: o.plafond ?? null,
        parPersonne: o.parPersonne,
        consommable: o.consommable ?? false,
        toujoursInclus: true,
        note: o.note ?? '',
        modifieLe: maintenant,
      });
  });
  return { categories, objets };
}
