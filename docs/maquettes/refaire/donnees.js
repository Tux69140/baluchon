// Les voyages et la bibliothèque de la maquette de la phase 11 (conception du 2026-10-30,
// docs/superpowers/specs/2026-10-30-phase-11-refaire-supprimer-design.md), au format de l'appli : les
// voyages sont copiés de la bibliothèque par le vrai modèle (genererVoyage), les changements de
// « Modifier le voyage » calculés par le vrai modèle (calculerChangements). Seul ce que la phase 11
// apporte est imité ici — ce que reprend « Refaire ce voyage », la mémoire des objets écartés, le
// chiffrage de la suppression — : brouillon, le modèle de l'appli en aura sa propre définition, testée.
import { calculerChangements } from '../../../src/modele/changements.js';
import { genererApercu } from '../../../src/modele/inclusion.js';
import { joursEtNuits } from '../../../src/modele/periode.js';
import { calculerQuantite } from '../../../src/modele/quantites.js';
import { genererVoyage } from '../../../src/modele/voyage.js';

export const AUJOURDHUI = '2026-10-30';
const MAINTENANT = '2026-10-30T09:00:00.000Z';

// ---------- La bibliothèque actuelle ----------
const groupes = [
  { id: 'g-activites', nom: 'Activités', ordre: 0 },
  { id: 'g-climat', nom: 'Climat', ordre: 1 },
];
const etiquette = (id, nom, groupeId, ordre) => ({ id, nom, groupeId, ordre });
const etiquettes = [
  etiquette('e-rando', 'Randonnée', 'g-activites', 0),
  etiquette('e-camping', 'Camping', 'g-activites', 1),
  etiquette('e-plage', 'Plage', 'g-activites', 2),
  etiquette('e-velo', 'Vélo', 'g-activites', 3),
  etiquette('e-chaud', 'Chaud', 'g-climat', 0),
  etiquette('e-froid', 'Froid', 'g-climat', 1),
  etiquette('e-pluie', 'Pluie', 'g-climat', 2),
];
// « Plongée » a été supprimée de la bibliothèque depuis Quiberon (décision 6).
const plongee = etiquette('e-plongee', 'Plongée', 'g-activites', 4);

const categorie = (id, nom, icone, couleur, ordre, siennes = null) => ({
  id,
  nom,
  icone,
  couleur,
  ordre,
  toujoursIncluse: !siennes,
  etiquettes: siennes ?? [],
});
const categories = [
  categorie('c-papiers', 'Papiers', 'identification-card', 'ciel', 0),
  categorie('c-vetements', 'Vêtements', 't-shirt', 'framboise', 1),
  categorie('c-hygiene', 'Hygiène', 'hand-soap', 'lagon', 2),
  categorie('c-pharmacie', 'Pharmacie', 'first-aid-kit', 'corail', 3),
  categorie('c-alimentation', 'Alimentation', 'fork-knife', 'abricot', 4),
  categorie('c-camping', 'Camping', 'tent', 'pomme', 5, ['e-camping']),
  categorie('c-plage', 'Plage', 'umbrella', 'tournesol', 6, ['e-plage']),
  categorie('c-velo', 'Vélo', 'bicycle', 'lilas', 7, ['e-velo']),
  categorie('c-electronique', 'Électronique', 'battery-charging', 'ciel', 8),
];

// Un objet modèle : « fixe, 1, partagé, toujours inclus » sauf mention contraire. pp : par personne.
const PP = { parPersonne: true };
function o(categorieId, id, nom, champs = {}) {
  const { pour, ...reste } = champs;
  return {
    id: `m-${id}`,
    categorieId,
    nom,
    regle: 'fixe',
    valeur: 1,
    plafond: null,
    parPersonne: false,
    consommable: false,
    note: '',
    toujoursInclus: !pour,
    etiquettes: pour ? [pour] : [],
    ...reste,
  };
}
const objets = [
  o('c-papiers', 'carte', 'Carte d’identité', PP),
  o('c-papiers', 'vitale', 'Carte Vitale', PP),
  o('c-papiers', 'permis', 'Permis de conduire'),
  o('c-papiers', 'cb', 'Carte bancaire'),
  o('c-papiers', 'especes', 'Espèces'),
  o('c-papiers', 'assurance', 'Attestation d’assurance'),
  o('c-papiers', 'cles', 'Clés de la maison'),
  o('c-papiers', 'guide', 'Guide de voyage'),
  o('c-vetements', 'tshirts', 'T-shirts', { ...PP, regle: 'par_jour', plafond: 4 }),
  o('c-vetements', 'sous-vetements', 'Sous-vêtements', { ...PP, regle: 'par_jour', plafond: 5 }),
  o('c-vetements', 'chaussettes', 'Chaussettes', { ...PP, regle: 'par_jour', plafond: 5 }),
  o('c-vetements', 'pantalons', 'Pantalons', PP),
  o('c-vetements', 'shorts', 'Shorts', { ...PP, valeur: 2 }),
  o('c-vetements', 'pull', 'Pull', PP),
  o('c-vetements', 'pyjama', 'Pyjama', PP),
  o('c-vetements', 'veste', 'Veste', PP),
  o('c-vetements', 'baskets', 'Baskets', PP),
  o('c-vetements', 'sandales', 'Sandales', PP),
  o('c-vetements', 'maillot', 'Maillot de bain', { ...PP, pour: 'e-plage' }),
  o('c-vetements', 'chaussures-marche', 'Chaussures de marche', { ...PP, pour: 'e-rando' }),
  o('c-vetements', 'poncho', 'Poncho', { ...PP, pour: 'e-pluie' }),
  o('c-vetements', 'sur-pantalon', 'Sur-pantalon imperméable', { ...PP, pour: 'e-pluie' }),
  o('c-vetements', 'parapluie', 'Parapluie', { pour: 'e-pluie' }),
  o('c-vetements', 'bonnet', 'Bonnet', { ...PP, pour: 'e-froid' }),
  o('c-vetements', 'casquette', 'Casquette', { ...PP, pour: 'e-chaud' }),
  o('c-hygiene', 'brosse', 'Brosse à dents', PP),
  o('c-hygiene', 'dentifrice', 'Dentifrice', { consommable: true }),
  o('c-hygiene', 'gel-douche', 'Gel douche', { consommable: true }),
  o('c-hygiene', 'shampoing', 'Shampoing', { consommable: true }),
  o('c-hygiene', 'deodorant', 'Déodorant', PP),
  o('c-hygiene', 'serviette', 'Serviette de toilette', PP),
  o('c-hygiene', 'peigne', 'Peigne'),
  o('c-hygiene', 'mouchoirs', 'Mouchoirs', { consommable: true }),
  o('c-hygiene', 'coupe-ongles', 'Coupe-ongles'),
  o('c-hygiene', 'creme-hydratante', 'Crème hydratante'),
  o('c-hygiene', 'coton-tiges', 'Coton-tiges', { consommable: true }),
  o('c-pharmacie', 'pansements', 'Pansements'),
  o('c-pharmacie', 'paracetamol', 'Paracétamol'),
  o('c-pharmacie', 'desinfectant', 'Désinfectant'),
  o('c-pharmacie', 'tiques', 'Tire-tique'),
  o('c-pharmacie', 'antimoustique', 'Antimoustique', { consommable: true }),
  o('c-pharmacie', 'medicaments', 'Médicaments habituels', PP),
  o('c-pharmacie', 'thermometre', 'Thermomètre'),
  o('c-pharmacie', 'serum', 'Sérum physiologique', { consommable: true }),
  o('c-alimentation', 'repas', 'Repas', { ...PP, regle: 'par_jour', valeur: 2, consommable: true }),
  o('c-alimentation', 'cafe', 'Café', { consommable: true }),
  o('c-alimentation', 'the', 'Thé', { consommable: true }),
  o('c-alimentation', 'sel', 'Sel et poivre'),
  o('c-alimentation', 'huile', 'Huile d’olive'),
  o('c-alimentation', 'biscuits', 'Biscuits', { consommable: true }),
  o('c-alimentation', 'fruits-secs', 'Fruits secs', { consommable: true }),
  o('c-alimentation', 'gourdes', 'Gourdes', PP),
  o('c-alimentation', 'pates', 'Pâtes', { consommable: true }),
  o('c-alimentation', 'riz', 'Riz', { consommable: true }),
  o('c-camping', 'tente', 'Tente'),
  o('c-camping', 'duvets', 'Sacs de couchage', PP),
  o('c-camping', 'matelas', 'Matelas gonflables', PP),
  o('c-camping', 'rechaud', 'Réchaud'),
  o('c-camping', 'gaz', 'Cartouches de gaz', { regle: 'par_nuit', plafond: 4 }),
  o('c-camping', 'casserole', 'Casserole'),
  o('c-camping', 'vaisselle', 'Vaisselle', PP),
  o('c-camping', 'couverts', 'Couverts', PP),
  o('c-camping', 'torche', 'Lampe torche'),
  o('c-camping', 'sacs-poubelle', 'Sacs poubelle', { regle: 'par_nuit' }),
  o('c-camping', 'chaises', 'Chaises pliantes', PP),
  o('c-camping', 'glaciere', 'Glacière'),
  o('c-camping', 'liquide-vaisselle', 'Liquide vaisselle', { consommable: true }),
  o('c-camping', 'corde', 'Corde à linge'),
  o('c-camping', 'maillet', 'Maillet'),
  o('c-camping', 'table', 'Table pliante'),
  o('c-camping', 'eponge', 'Éponge'),
  o('c-plage', 'serviettes-plage', 'Serviettes de plage', PP),
  o('c-plage', 'parasol', 'Parasol'),
  o('c-plage', 'creme', 'Crème solaire', { consommable: true }),
  o('c-plage', 'lunettes', 'Lunettes de soleil', PP),
  o('c-plage', 'jeux', 'Jeux de plage'),
  o('c-plage', 'masque', 'Masque et tuba', PP),
  o('c-velo', 'casque', 'Casque', PP),
  o('c-velo', 'antivol', 'Antivol'),
  o('c-velo', 'reparation', 'Kit de réparation'),
  o('c-velo', 'pompe', 'Pompe'),
  o('c-velo', 'gilet', 'Gilet réfléchissant', PP),
  o('c-velo', 'sacoches', 'Sacoches'),
  o('c-electronique', 'chargeurs', 'Chargeurs de téléphone', PP),
  o('c-electronique', 'batterie', 'Batterie externe'),
  o('c-electronique', 'ecouteurs', 'Écouteurs', PP),
  o('c-electronique', 'liseuse', 'Liseuse'),
  o('c-electronique', 'appareil-photo', 'Appareil photo'),
  o('c-electronique', 'multiprise', 'Multiprise'),
  o('c-electronique', 'cables', 'Câbles USB'),
];
// La « Lampe frontale » a été supprimée de la bibliothèque depuis Quiberon (décision 7).
const lampeFrontale = o('c-camping', 'lampe-frontale', 'Lampe frontale');

export const bibliotheque = { groupes, etiquettes, categories, objets };

// ---------- Les voyages ----------
let compteur = 0;
const ids = prefixe => ({ nouvelId: () => `${prefixe}-${++compteur}`, maintenant: MAINTENANT });

// Quiberon : copié d'une bibliothèque d'alors (avec « Plongée » et la lampe frontale), le parasol et le
// guide décochés à l'aperçu ; puis, pendant le voyage, des objets ajoutés à la main (dont une catégorie
// à lui) et une quantité fixée manuellement.
const quiberonInfos = {
  nom: 'Quiberon',
  destination: 'Bretagne',
  depart: '2026-07-11',
  retour: '2026-07-18',
  voyageurs: 3,
};
const QUIBERON_ETIQUETTES = ['e-camping', 'e-plage', 'e-velo', 'e-plongee'];
const QUIBERON_ECARTES = ['m-parasol', 'm-guide'];

function construireQuiberon() {
  const alors = {
    ...bibliotheque,
    etiquettes: [...etiquettes, plongee],
    objets: [...objets, lampeFrontale],
  };
  const contenu = genererVoyage(
    alors,
    quiberonInfos,
    { choisies: new Set(QUIBERON_ETIQUETTES), ecartes: new Set(QUIBERON_ECARTES) },
    ids('q'),
  );
  contenu.voyage.id = 'v-quiberon';
  const plage = contenu.categories.find(c => c.modeleId === 'c-plage');
  const peche = { id: 'q-peche', voyageId: 'v-quiberon', modeleId: null, nom: 'Pêche à pied' };
  contenu.categories.push({ ...peche, icone: 'waves', couleur: 'lagon', ordre: 9, modifieLe: MAINTENANT });
  // Ajouté à la main (phase 8) : sans modèle, valeur 0, quantité fixée.
  const aLaMain = (id, nom, categorieId, quantite) => ({
    id: `q-${id}`,
    voyageId: 'v-quiberon',
    categorieId,
    modeleId: null,
    nom,
    regle: 'fixe',
    valeur: 0,
    plafond: null,
    parPersonne: true,
    consommable: false,
    quantite,
    quantiteManuelle: true,
    dansLeSac: 0,
    aAcheter: false,
    achetes: 0,
    note: '',
    modifieLe: MAINTENANT,
  });
  contenu.objets.push(
    aLaMain('cerf-volant', 'Cerf-volant', plage.id, 1),
    aLaMain('seaux', 'Seaux', peche.id, 2),
    aLaMain('epuisettes', 'Épuisettes', peche.id, 3),
    aLaMain('bottes', 'Bottes en caoutchouc', peche.id, 3),
  );
  const sacs = contenu.objets.find(x => x.modeleId === 'm-sacs-poubelle');
  Object.assign(sacs, { quantite: 3, quantiteManuelle: true });
  // 23 objets ont au moins une pièce dans le sac : Papiers, Vêtements, puis une partie de l'Hygiène.
  const ordre = ['c-papiers', 'c-vetements', 'c-hygiene'].map(m => contenu.categories.find(c => c.modeleId === m).id);
  const aEmballer = contenu.objets
    .filter(x => ordre.includes(x.categorieId))
    .sort((a, b) => ordre.indexOf(a.categorieId) - ordre.indexOf(b.categorieId) || a.nom.localeCompare(b.nom))
    .slice(0, 23);
  for (const [i, x] of aEmballer.entries()) {
    x.dansLeSac = i % 6 === 5 ? Math.ceil(x.quantite / 2) : x.quantite;
    if (x.aAcheter) x.achetes = x.quantite;
  }
  // La mémoire des objets écartés (nouvelle, phase 11) : les modèles décochés à l'aperçu.
  return { ...contenu, ecartes: new Set(QUIBERON_ECARTES) };
}

// Belle-Île : la randonnée seule ; « Pluie » avait été choisie un temps, le poncho retiré, puis la
// pluie ôtée. On la rajoute (état « changements-retire ») : le poncho entre refusé (décision 11).
const belleIleInfos = {
  nom: 'Belle-Île',
  destination: 'Morbihan',
  depart: '2026-11-13',
  retour: '2026-11-15',
  voyageurs: 2,
};
function construireBelleIle() {
  const contenu = genererVoyage(
    bibliotheque,
    belleIleInfos,
    { choisies: new Set(['e-rando']), ecartes: new Set() },
    ids('b'),
  );
  contenu.voyage.id = 'v-belle-ile';
  return { ...contenu, ecartes: new Set(['m-poncho']) };
}

export const quiberon = construireQuiberon();
export const belleIle = construireBelleIle();

// Les autres voyages de Mes voyages, copiés eux aussi de la bibliothèque, pour qu'on puisse tous les
// ouvrir ; « emballe » : la part de chaque objet déjà dans le sac (voyages en cours). Le tour de Bretagne
// éprouve un nom long, au bout duquel se pose le menu « ⋮ ».
function construire(id, infos, choisies, emballe = 0) {
  const contenu = genererVoyage(bibliotheque, infos, { choisies: new Set(choisies), ecartes: new Set() }, ids(id));
  contenu.voyage.id = id;
  for (const [i, x] of contenu.objets.entries()) if (i / contenu.objets.length < emballe) x.dansLeSac = x.quantite;
  return { ...contenu, ecartes: new Set() };
}

const autres = [
  construire(
    'v-lyon',
    { nom: 'Week-end à Lyon', destination: 'Lyon', depart: '2026-10-30', retour: '2026-11-01', voyageurs: 2 },
    ['e-froid'],
    0.8,
  ),
  construire(
    'v-bretagne',
    {
      nom: 'Tour de Bretagne à vélo, de Saint-Malo à Quiberon par la côte sauvage',
      destination: 'Côtes-d’Armor, Finistère et Morbihan',
      depart: '2026-11-20',
      retour: '2026-11-29',
      voyageurs: 2,
    },
    ['e-camping', 'e-velo', 'e-pluie'],
  ),
  construire(
    'v-jura',
    { nom: 'Noël dans le Jura', destination: 'Les Rousses', depart: '2026-12-21', retour: '2026-12-27', voyageurs: 4 },
    ['e-rando', 'e-froid'],
  ),
  construire(
    'v-verdon',
    { nom: 'Gorges du Verdon', destination: 'Provence', depart: '2026-05-01', retour: '2026-05-04', voyageurs: 2 },
    ['e-rando', 'e-camping', 'e-chaud'],
  ),
  construire(
    'v-bruxelles',
    { nom: 'Bruxelles', destination: '', depart: '2026-03-06', retour: '2026-03-08', voyageurs: 2 },
    [],
  ),
];

// Tous les voyages de la maquette, par identifiant ; Mes voyages les classe lui-même.
export const contenus = Object.fromEntries([quiberon, belleIle, ...autres].map(c => [c.voyage.id, c]));

// L'avancement que montre une carte : les objets entièrement dans le sac, sur le total.
export const avancementDe = contenu => ({
  faits: contenu.objets.filter(x => x.dansLeSac === x.quantite).length,
  total: contenu.objets.length,
});

// ---------- Supprimer un voyage : le chiffrage de la confirmation ----------
// Les objets du voyage, et ceux qui ont au moins une pièce dans le sac (pas les pièces).
export const chiffrage = contenu => ({
  objets: contenu.objets.length,
  dansLeSac: contenu.objets.filter(x => x.dansLeSac > 0).length,
});

// ---------- Refaire ce voyage ----------
const periodeDe = ({ depart, retour, voyageurs }) => ({ ...joursEtNuits(depart, retour), voyageurs });

// Ce qu'un voyage refait reprend du voyage d'origine et de la bibliothèque actuelle : les étiquettes
// présélectionnées et celles qui ont disparu, les objets disparus, les objets écartés d'entrée, les
// objets ajoutés à la main (avec leur catégorie), les quantités fixées et leur calcul actuel, les noms
// donnés dans le voyage d'origine (décision 12).
export function reprise(origine, biblio) {
  const etiquettesConnues = new Set(biblio.etiquettes.map(e => e.id));
  const modeles = new Set(biblio.objets.map(m => m.id));
  return {
    choisies: new Set(origine.etiquettes.map(e => e.modeleId).filter(id => etiquettesConnues.has(id))),
    disparues: {
      etiquettes: origine.etiquettes.filter(e => !etiquettesConnues.has(e.modeleId)).map(e => e.nom),
      objets: origine.objets.filter(x => x.modeleId && !modeles.has(x.modeleId)).map(x => x.nom),
    },
    ecartes: origine.ecartes,
    ajouts: origine.objets.filter(x => !x.modeleId),
    parModele: new Map(origine.objets.filter(x => x.modeleId).map(x => [x.modeleId, x])),
  };
}

// L'aperçu du voyage refait, au format de genererApercu : la bibliothèque actuelle d'abord, puis les
// objets ajoutés à la main, dans leur catégorie si elle est dans l'aperçu, sinon dans celle du voyage
// d'origine, en fin de liste. recalculer : les modèles dont on a choisi « Recalculer ». Rend aussi ce
// qu'il faut pour dessiner les mentions : les ajoutés, les écartés d'entrée, les quantités fixées.
export function apercuRefait(origine, biblio, infos, choisies, recalculer) {
  const r = reprise(origine, biblio);
  const apercu = genererApercu(biblio, infos, choisies).map(({ categorie: c, objets: lignes }) => ({
    categorie: c,
    objets: lignes.map(({ objet, quantite }) => {
      const avant = r.parModele.get(objet.id);
      const renomme = avant && avant.nom !== objet.nom ? { ...objet, nom: avant.nom } : objet;
      const fixee = avant?.quantiteManuelle && avant.quantite !== quantite;
      return { objet: renomme, quantite: fixee && !recalculer.has(objet.id) ? avant.quantite : quantite };
    }),
  }));
  const manuelles = new Map();
  for (const { objets: lignes } of apercu)
    for (const { objet } of lignes) {
      const avant = r.parModele.get(objet.id);
      const calcul = calculerQuantite(objet, periodeDe(infos));
      if (avant?.quantiteManuelle && avant.quantite !== calcul)
        manuelles.set(objet.id, { gardee: avant.quantite, calcul });
    }
  const categoriesOrigine = new Map(origine.categories.map(c => [c.id, c]));
  for (const x of r.ajouts) {
    const sienne = categoriesOrigine.get(x.categorieId);
    // Une catégorie propre au voyage d'origine (sans modèle) se retrouve par son identifiant.
    let place = apercu.find(l => l.categorie.id === (sienne.modeleId ?? sienne.id));
    if (!place) {
      place = { categorie: sienne, objets: [] };
      apercu.push(place);
    }
    place.objets.push({ objet: x, quantite: x.quantite });
    place.objets.sort((a, b) => a.objet.nom.localeCompare(b.objet.nom));
  }
  const presents = new Set(apercu.flatMap(l => l.objets.map(({ objet }) => objet.id)));
  return {
    apercu,
    ajouts: new Set(r.ajouts.map(x => x.id)),
    retires: new Set([...r.ecartes].filter(id => presents.has(id))),
    manuelles,
    disparues: r.disparues,
  };
}

export const refaireInfosVides = { nom: '', destination: '', depart: '', retour: '', voyageurs: 3 };
export const refaireInfosSaisies = {
  nom: 'Quiberon 2027',
  destination: 'Bretagne',
  depart: '2027-07-10',
  retour: '2027-07-17',
  voyageurs: 3,
};

// ---------- Modifier le voyage : la mémoire lue à l'étape « Changements » (décision 11) ----------
export const belleIleNouvelles = new Set(['e-rando', 'e-pluie']);
export function changementsBelleIle() {
  const entree = { contenu: belleIle, bibliotheque, infos: belleIleInfos, choisies: belleIleNouvelles };
  const changements = calculerChangements(entree);
  const lignes = changements.flatMap(c => c.lignes);
  // Le défaut d'une entrée : refusée si son modèle a été écarté de ce voyage, acceptée sinon.
  const retirees = new Set(lignes.filter(l => l.modele && belleIle.ecartes.has(l.modele.id)).map(l => l.cle));
  const acceptes = new Set(lignes.filter(l => l.defaut && !retirees.has(l.cle)).map(l => l.cle));
  return { entree, changements, acceptes, retirees };
}

// « Créer le voyage » d'un voyage refait, à la façon de l'appli (imitation de brouillon) : la
// bibliothèque actuelle copiée par genererVoyage, puis les noms donnés dans le voyage d'origine, les
// quantités fixées gardées, et les objets ajoutés à la main retenus, dans leur catégorie.
export function creerRefait(origine, biblio, infos, { choisies, ecartes }, recalculer, nouvelId) {
  const r = reprise(origine, biblio);
  const contenu = genererVoyage(biblio, infos, { choisies, ecartes }, { nouvelId, maintenant: MAINTENANT });
  for (const x of contenu.objets) {
    const avant = r.parModele.get(x.modeleId);
    if (!avant) continue;
    x.nom = avant.nom;
    if (avant.quantiteManuelle && avant.quantite !== x.quantite && !recalculer.has(x.modeleId))
      Object.assign(x, { quantite: avant.quantite, quantiteManuelle: true });
  }
  const categoriesOrigine = new Map(origine.categories.map(c => [c.id, c]));
  for (const ajout of r.ajouts.filter(x => !ecartes.has(x.id))) {
    const sienne = categoriesOrigine.get(ajout.categorieId);
    let categorie = contenu.categories.find(c => sienne.modeleId && c.modeleId === sienne.modeleId);
    if (!categorie) {
      categorie = contenu.categories.find(c => c.copieDe === sienne.id);
      if (!categorie) {
        categorie = { ...sienne, id: nouvelId(), voyageId: contenu.voyage.id, copieDe: sienne.id };
        contenu.categories.push(categorie);
      }
    }
    contenu.objets.push({
      ...ajout,
      id: nouvelId(),
      voyageId: contenu.voyage.id,
      categorieId: categorie.id,
      dansLeSac: 0,
      achetes: 0,
    });
  }
  return { ...contenu, ecartes: new Set([...ecartes].filter(id => !r.ajouts.some(x => x.id === id))) };
}
