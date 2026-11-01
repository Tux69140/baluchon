// Lire et remplacer toutes les données dans la variante navigateur du stockage (tests d'écran) : même
// résultat et mêmes refus que la base (src-tauri/src/sauvegarde.rs). Le résultat entier est calculé et
// vérifié avant d'écrire : refusé, le remplacement ne laisse rien.
import {
  lire,
  ecrire,
  panne,
  refusee,
  lenteur,
  ecritureDe,
  bibliothequeDe,
  voyageComplet,
} from './navigateur-outils.js';

const refus = texte => new Error(texte);

// Les mêmes liens que la base contraint : un objet vit dans une catégorie de son voyage ou de la bibliothèque.
function verifierContenu({ bibliotheque, voyages }) {
  for (const o of bibliotheque.objets) {
    if (!bibliotheque.categories.some(c => c.id === o.categorieId))
      throw refus(`Catégorie inconnue : ${o.categorieId}`);
  }
  for (const { categories, objets } of voyages) {
    for (const o of objets) {
      if (!categories.some(c => c.id === o.categorieId)) throw refus(`Catégorie inconnue : ${o.categorieId}`);
    }
  }
}

export const sauvegardeNavigateur = {
  async lireTout() {
    await lenteur(lire(), 'lireTout');
    const donnees = lire();
    panne(donnees, 'lireTout');
    return {
      bibliotheque: bibliothequeDe(donnees),
      voyages: (donnees.voyages ?? []).map(v => voyageComplet(donnees, v.id)),
      langue: donnees.meta?.langueBibliotheque ?? 'fr',
    };
  },
  async remplacerTout(contenu) {
    const donnees = await ecritureDe('remplacerTout');
    verifierContenu(contenu);
    const { bibliotheque, voyages, langue } = contenu;
    ecrire({
      ...donnees,
      bibliotheque,
      meta: { ...donnees.meta, bibliothequeInstallee: true, langueBibliotheque: langue },
      voyages: voyages.map(v => v.voyage),
      etiquettesDuVoyage: voyages.flatMap(v => v.etiquettes),
      categoriesDuVoyage: voyages.flatMap(v => v.categories),
      objetsDuVoyage: voyages.flatMap(v => v.objets),
      objetsEcartes: voyages.flatMap(v => v.ecartes.map(modeleId => ({ voyageId: v.voyage.id, modeleId }))),
    });
  },
  // Un « Téléchargements » simulé : les fichiers déposés restent lisibles par les tests d'écran. Comme
  // l'appareil, il ne remplace jamais un fichier de même nom.
  async deposerFichier(nom, texte) {
    const donnees = await ecritureDe('deposerFichier');
    if (refusee(donnees, 'deposerFichier')) return 'refuse';
    const telechargements = donnees.telechargements ?? [];
    if (telechargements.some(f => f.nom === nom)) return 'existe';
    ecrire({ ...donnees, telechargements: [...telechargements, { nom, texte }] });
    return 'depose';
  },
};
