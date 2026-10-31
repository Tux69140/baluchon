// La modification d'un voyage dans la variante navigateur du stockage (tests d'écran) : mêmes refus et
// même résultat que la base (src-tauri/src/modification.rs). Le résultat entier est calculé avant
// d'écrire : refusée, la modification ne laisse rien.
import { ecrire, ecritureDe, verifierAchetes, verifierSac, ecartesAvec, ecartesSans } from './navigateur-outils.js';

const refus = texte => new Error(texte);

// Les objets modifiés réécrits à leur place, les retirés enlevés, les ajoutés à la fin.
function objetsApres(donnees, m) {
  const v = m.voyage.id;
  const objets = donnees.objetsDuVoyage ?? [];
  const parId = new Map(objets.map(o => [o.id, o]));
  for (const o of m.objetsModifies) {
    const avant = parId.get(o.id);
    if (avant?.voyageId !== v) throw refus('Objet introuvable dans ce voyage.');
    verifierSac(avant, o.quantite, o.dansLeSac);
    verifierAchetes(o.achetes, o.quantite);
  }
  for (const id of m.objetsRetires) if (parId.get(id)?.voyageId !== v) throw refus('Objet introuvable dans ce voyage.');
  for (const o of m.objetsAjoutes) if (parId.has(o.id)) throw refus(`Objet déjà pris : ${o.id}`);
  const modifies = new Map(m.objetsModifies.map(o => [o.id, o]));
  const retires = new Set(m.objetsRetires);
  return [...objets.filter(o => !retires.has(o.id)).map(o => modifies.get(o.id) ?? o), ...m.objetsAjoutes];
}

function categoriesApres(donnees, m, objets) {
  const v = m.voyage.id;
  const categories = [...(donnees.categoriesDuVoyage ?? []), ...m.categoriesAjoutees];
  const retirees = new Set(m.categoriesRetirees);
  for (const id of retirees) {
    if (categories.find(c => c.id === id)?.voyageId !== v || objets.some(o => o.categorieId === id))
      throw refus('Cette catégorie contient encore des objets.');
  }
  const restantes = categories.filter(c => !retirees.has(c.id));
  // Un objet du voyage ne peut être rangé que dans une catégorie de ce voyage.
  for (const o of objets.filter(x => x.voyageId === v))
    if (restantes.find(c => c.id === o.categorieId)?.voyageId !== v)
      throw refus("Un objet est rangé dans la catégorie d'un autre voyage.");
  return restantes;
}

export const modificationNavigateur = {
  async modifierVoyage(m) {
    const donnees = await ecritureDe('modifierVoyage');
    const v = m.voyage.id;
    // Même contrat que la base : la liste complète des écartés est obligatoire.
    if (!Array.isArray(m.ecartes)) throw refus('La liste des objets écartés est absente.');
    const nomme = [...m.etiquettes, ...m.categoriesAjoutees, ...m.objetsAjoutes, ...m.objetsModifies];
    if (nomme.some(x => x.voyageId !== v)) throw refus('La modification touche un autre voyage.');
    if (!(donnees.voyages ?? []).some(x => x.id === v)) throw refus('Voyage introuvable.');
    const objets = objetsApres(donnees, m);
    const categories = categoriesApres(donnees, m, objets);
    ecrire({
      ...donnees,
      voyages: donnees.voyages.map(x => (x.id === v ? m.voyage : x)),
      etiquettesDuVoyage: [...(donnees.etiquettesDuVoyage ?? []).filter(e => e.voyageId !== v), ...m.etiquettes],
      categoriesDuVoyage: categories,
      objetsDuVoyage: objets,
      // La liste complète remplace celle du voyage (« Choix de l'agent », conception de la phase 11).
      objetsEcartes: [
        ...(donnees.objetsEcartes ?? []).filter(e => e.voyageId !== v),
        ...[...new Set(m.ecartes)].map(modeleId => ({ voyageId: v, modeleId })),
      ],
    });
  },
  // « Retirer du voyage », puis « Plus tard » : plus demandé ni à acheter, ses pièces restent dans le sac.
  // Son modèle devient écarté du voyage (« Choix de l'agent », conception de la phase 11).
  async marquerRetire(id, modifieLe) {
    const donnees = await ecritureDe('marquerRetire');
    const objets = donnees.objetsDuVoyage ?? [];
    if (!(objets.find(o => o.id === id)?.dansLeSac > 0)) throw refus("Aucune pièce de cet objet n'est dans le sac.");
    ecrire({
      ...donnees,
      objetsDuVoyage: objets.map(o => (o.id === id ? { ...o, quantite: 0, achetes: 0, modifieLe } : o)),
      objetsEcartes: ecartesAvec(
        donnees,
        objets.find(o => o.id === id),
      ),
    });
  },
  // Il revient dans le voyage : son modèle n'est plus écarté (même conception).
  async garderDansLeVoyage(id, quantite, quantiteManuelle, achetes, modifieLe) {
    const donnees = await ecritureDe('garderDansLeVoyage');
    const objets = donnees.objetsDuVoyage ?? [];
    if (!Number.isInteger(quantite) || quantite < 1) throw refus('La quantité prévue est au moins de 1.');
    if (!objets.some(o => o.id === id)) throw refus('Objet introuvable.');
    verifierAchetes(achetes, quantite);
    ecrire({
      ...donnees,
      objetsDuVoyage: objets.map(o => (o.id === id ? { ...o, quantite, quantiteManuelle, achetes, modifieLe } : o)),
      objetsEcartes: ecartesSans(
        donnees,
        objets.find(o => o.id === id),
      ),
    });
  },
};
