// Les ajustements d'un voyage dans la variante navigateur du stockage (tests d'écran) : mêmes refus et
// même résultat que la base (src-tauri/src/ajustements.rs). Chaque écriture calcule son résultat entier
// avant d'écrire : refusée, elle ne laisse rien.
import {
  ecrire,
  ecritureDe,
  bibliothequeDe,
  verifierEtiquettes,
  remplacerOuAjouter,
  verifierAchetes,
  verifierSac,
  ecartesAvec,
  ecartesSans,
} from './navigateur-outils.js';

const objetsDe = donnees => donnees.objetsDuVoyage ?? [];
const categoriesDe = donnees => donnees.categoriesDuVoyage ?? [];

function objetInconnu(id) {
  return new Error(`Objet inconnu : ${id}`);
}

// La catégorie neuve doit appartenir au voyage de l'objet et être celle qu'il nomme ; sans elle, celle de
// l'objet doit déjà exister dans ce voyage.
function verifierCategorie(donnees, { categorie, objet }) {
  if (!(donnees.voyages ?? []).some(v => v.id === objet.voyageId)) {
    throw new Error(`Voyage inconnu : ${objet.voyageId}`);
  }
  if (categorie) {
    if (categorie.voyageId !== objet.voyageId || categorie.id !== objet.categorieId) {
      throw new Error("La catégorie ne correspond pas à l'objet.");
    }
    if (categoriesDe(donnees).some(c => c.id === categorie.id))
      throw new Error(`Catégorie déjà prise : ${categorie.id}`);
    return;
  }
  const existante = categoriesDe(donnees).find(c => c.id === objet.categorieId);
  if (existante?.voyageId !== objet.voyageId) throw new Error(`Catégorie introuvable : ${objet.categorieId}`);
}

// Ajout et rétablissement ont le même cœur ; deux noms pour que l'écran distingue « Annuler » d'un ajout.
// Un rétablissement fait revenir l'objet : son modèle n'est plus écarté.
async function ecrireAjout(operation, ajout, retablit = false) {
  const donnees = await ecritureDe(operation);
  verifierCategorie(donnees, ajout);
  if (objetsDe(donnees).some(o => o.id === ajout.objet.id)) throw new Error(`Objet déjà pris : ${ajout.objet.id}`);
  ecrire({
    ...donnees,
    categoriesDuVoyage: ajout.categorie ? [...categoriesDe(donnees), ajout.categorie] : categoriesDe(donnees),
    objetsDuVoyage: [...objetsDe(donnees), ajout.objet],
    ...(retablit && { objetsEcartes: ecartesSans(donnees, ajout.objet) }),
  });
}

function modifierObjet(donnees, id, changer) {
  if (!objetsDe(donnees).some(o => o.id === id)) throw objetInconnu(id);
  ecrire({ ...donnees, objetsDuVoyage: objetsDe(donnees).map(o => (o.id === id ? changer(o) : o)) });
}

export const ajustementsNavigateur = {
  ajouterAuVoyage: ajout => ecrireAjout('ajouterAuVoyage', ajout),
  retablirDansLeVoyage: ajout => ecrireAjout('retablirDansLeVoyage', ajout, true),
  async reglerQuantite(id, quantite, dansLeSac, achetes, modifieLe) {
    const donnees = await ecritureDe('reglerQuantite');
    if (!Number.isInteger(quantite) || quantite < 1) throw new Error(`Quantité prévue refusée : ${quantite}`);
    const objet = objetsDe(donnees).find(o => o.id === id);
    if (!objet) throw objetInconnu(id);
    verifierSac(objet, quantite, dansLeSac);
    verifierAchetes(achetes, quantite);
    modifierObjet(donnees, id, o => ({ ...o, quantite, dansLeSac, achetes, quantiteManuelle: true, modifieLe }));
  },
  // La marque « à acheter » et les pièces achetées, ensemble (phase 9).
  async reglerAchats(id, aAcheter, achetes, modifieLe) {
    const donnees = await ecritureDe('reglerAchats');
    const objet = objetsDe(donnees).find(o => o.id === id);
    if (!objet) throw objetInconnu(id);
    verifierAchetes(achetes, objet.quantite);
    modifierObjet(donnees, id, o => ({ ...o, aAcheter, achetes, modifieLe }));
  },
  async renommerObjetDuVoyage(id, nom, modifieLe) {
    const donnees = await ecritureDe('renommerObjetDuVoyage');
    const net = nom.trim();
    if (!net) throw new Error('Le nom ne peut pas être vide.');
    modifierObjet(donnees, id, o => ({ ...o, nom: net, modifieLe }));
  },
  // Retire l'objet, et sa catégorie si elle n'a plus d'objet ; la bibliothèque n'est pas touchée. Son modèle
  // devient écarté du voyage (« Choix de l'agent », conception de la phase 11).
  async retirerDuVoyage(id) {
    const donnees = await ecritureDe('retirerDuVoyage');
    const objet = objetsDe(donnees).find(o => o.id === id);
    if (!objet) throw objetInconnu(id);
    const objets = objetsDe(donnees).filter(o => o.id !== id);
    const vide = !objets.some(o => o.categorieId === objet.categorieId);
    ecrire({
      ...donnees,
      objetsDuVoyage: objets,
      objetsEcartes: ecartesAvec(donnees, objet),
      categoriesDuVoyage: vide ? categoriesDe(donnees).filter(c => c.id !== objet.categorieId) : categoriesDe(donnees),
    });
  },
  // Catégorie neuve éventuelle, objet modèle et liens du voyage en une seule écriture.
  async ajouterALaBibliotheque({ categorie, objet, objetDuVoyage, categorieDuVoyage }) {
    const donnees = await ecritureDe('ajouterALaBibliotheque');
    const bibliotheque = bibliothequeDe(donnees);
    if (!objetsDe(donnees).some(o => o.id === objetDuVoyage)) throw objetInconnu(objetDuVoyage);
    const categories = categorie
      ? remplacerOuAjouter(bibliotheque.categories, categorie, ['ordre'])
      : bibliotheque.categories;
    verifierEtiquettes(bibliotheque, [...(categorie?.etiquettes ?? []), ...objet.etiquettes]);
    if (!categories.some(c => c.id === objet.categorieId) && !bibliotheque.objets.some(o => o.id === objet.id)) {
      throw new Error(`Catégorie inconnue : ${objet.categorieId}`);
    }
    const objets = remplacerOuAjouter(bibliotheque.objets, objet, ['categorieId']);
    ecrire({
      ...donnees,
      bibliotheque: { ...bibliotheque, categories, objets },
      objetsDuVoyage: objetsDe(donnees).map(o => (o.id === objetDuVoyage ? { ...o, modeleId: objet.id } : o)),
      categoriesDuVoyage: categoriesDe(donnees).map(c =>
        c.id === categorieDuVoyage ? { ...c, modeleId: objet.categorieId } : c,
      ),
    });
  },
};
