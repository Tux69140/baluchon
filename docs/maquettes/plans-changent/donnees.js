// Le voyage de la maquette de la phase 10 et les règles qu'elle imite (conception du 2026-10-29,
// docs/superpowers/specs/2026-10-29-phase-10-plans-changent-design.md) : le récapitulatif des
// changements, son application, les pièces à sortir du sac. Brouillon : le modèle de l'appli en aura
// sa propre définition, testée ; seul le calcul des quantités est le vrai (src/modele/quantites.js).
import { calculerQuantite } from '../../../src/modele/quantites.js';
import { joursEtNuits } from '../../../src/modele/periode.js';

// Le scénario : on part un jour plus tard (3 jours au lieu de 4) et deux amis nous rejoignent ;
// « Randonnée » cède la place à « Pluie ». Seule une date raccourcie peut faire baisser une quantité
// pendant qu'une autre monte (Repas 16 → 24, Cartouches de gaz 3 → 2).
export const voyage = {
  id: 'v-quiberon',
  nom: 'Presqu’île de Quiberon',
  destination: 'Bretagne',
  depart: '2026-11-06',
  retour: '2026-11-09',
  voyageurs: 2,
};

export const nouvellesInfos = { ...voyage, depart: '2026-11-07', voyageurs: 4 };

export const groupes = [
  { id: 'g-activites', nom: 'Activités', etiquettes: ['Randonnée', 'Camping', 'Plage', 'Vélo'] },
  { id: 'g-climat', nom: 'Climat', etiquettes: ['Chaud', 'Froid', 'Pluie'] },
];

export const etiquettesDuVoyage = ['Randonnée', 'Camping'];
export const nouvellesEtiquettes = ['Camping', 'Pluie'];

export const categoriesDeLaBibliotheque = [
  { id: 'c-papiers', nom: 'Papiers', icone: 'identification-card', couleur: 'ciel', ordre: 0 },
  { id: 'c-vetements', nom: 'Vêtements', icone: 't-shirt', couleur: 'framboise', ordre: 1 },
  { id: 'c-hygiene', nom: 'Hygiène', icone: 'hand-soap', couleur: 'lagon', ordre: 2 },
  { id: 'c-alimentation', nom: 'Alimentation', icone: 'fork-knife', couleur: 'abricot', ordre: 3 },
  { id: 'c-camping', nom: 'Camping', icone: 'tree-evergreen', couleur: 'pomme', ordre: 4 },
];

const parPers = { regle: 'fixe', valeur: 1, plafond: null, parPersonne: true };
const partage = { regle: 'fixe', valeur: 1, plafond: null, parPersonne: false };

// Les objets modèles de la bibliothèque : etiquette absente = toujours inclus.
export const modeles = [
  { id: 'm-carte', categorieId: 'c-papiers', nom: 'Carte d’identité', ...parPers },
  { id: 'm-permis', categorieId: 'c-papiers', nom: 'Permis de conduire', ...partage },
  { id: 'm-tshirts', categorieId: 'c-vetements', nom: 'T-shirts', ...parPers, regle: 'par_jour', plafond: 2 },
  { id: 'm-pull', categorieId: 'c-vetements', nom: 'Pull', ...parPers },
  { id: 'm-chaussures', categorieId: 'c-vetements', nom: 'Chaussures de marche', ...parPers, etiquette: 'Randonnée' },
  { id: 'm-poncho', categorieId: 'c-vetements', nom: 'Poncho', ...parPers, etiquette: 'Pluie' },
  { id: 'm-bonnet', categorieId: 'c-vetements', nom: 'Bonnet', ...parPers, etiquette: 'Froid' },
  { id: 'm-casquette', categorieId: 'c-vetements', nom: 'Casquette', ...parPers, etiquette: 'Chaud' },
  { id: 'm-maillot', categorieId: 'c-vetements', nom: 'Maillot de bain', ...parPers, etiquette: 'Plage' },
  { id: 'm-casque', categorieId: 'c-vetements', nom: 'Casque de vélo', ...parPers, etiquette: 'Vélo' },
  { id: 'm-brosse', categorieId: 'c-hygiene', nom: 'Brosse à dents', ...parPers },
  { id: 'm-dentifrice', categorieId: 'c-hygiene', nom: 'Dentifrice', ...partage, consommable: true },
  { id: 'm-creme', categorieId: 'c-hygiene', nom: 'Crème solaire', ...partage, etiquette: 'Plage', consommable: true },
  {
    id: 'm-repas',
    categorieId: 'c-alimentation',
    nom: 'Repas',
    ...parPers,
    regle: 'par_jour',
    valeur: 2,
    consommable: true,
  },
  { id: 'm-cafe', categorieId: 'c-alimentation', nom: 'Café', ...partage, consommable: true },
  { id: 'm-tente', categorieId: 'c-camping', nom: 'Tente', ...partage, etiquette: 'Camping' },
  {
    id: 'm-gaz',
    categorieId: 'c-camping',
    nom: 'Cartouches de gaz',
    ...partage,
    regle: 'par_nuit',
    etiquette: 'Camping',
  },
];

const periodeDe = infos => ({ ...joursEtNuits(infos.depart, infos.retour), voyageurs: infos.voyageurs });
export const quantitePour = (regle, infos) => calculerQuantite(regle, periodeDe(infos));

// Un objet du voyage copié de son modèle : la règle est recopiée, le voyage reste indépendant.
function copie(modele, infos, champs = {}) {
  const { id, categorieId, nom, regle, valeur, plafond, parPersonne, consommable = false } = modele;
  const quantite = quantitePour(modele, infos);
  return {
    id: `o-${id.slice(2)}`,
    modeleId: id,
    categorieId,
    nom,
    regle,
    valeur,
    plafond,
    parPersonne,
    quantite,
    dansLeSac: 0,
    aAcheter: consommable,
    achetes: 0,
    quantiteManuelle: false,
    note: '',
    ...champs,
  };
}

const modele = id => modeles.find(m => m.id === id);

// jeu : 'depart' (le voyage avant la modification) ; 'apres' (les changements par défaut appliqués, le
// retrait des chaussures accepté, « Plus tard » choisi, puis tout le reste emballé).
export function objetsDeDepart(jeu = 'depart') {
  const v = voyage;
  const liste = [
    copie(modele('m-carte'), v, { dansLeSac: 2 }),
    copie(modele('m-permis'), v),
    copie(modele('m-tshirts'), v, { dansLeSac: 4 }),
    copie(modele('m-pull'), v, { quantite: 3, quantiteManuelle: true, dansLeSac: 3 }),
    copie(modele('m-chaussures'), v, { dansLeSac: 1 }),
    copie(modele('m-brosse'), v, { dansLeSac: 2 }),
    copie(modele('m-dentifrice'), v, { dansLeSac: 1, achetes: 1 }),
    copie(modele('m-repas'), v, { dansLeSac: 16, achetes: 16 }),
    copie(modele('m-cafe'), v),
    copie(modele('m-tente'), v, { dansLeSac: 1 }),
    copie(modele('m-gaz'), v, { dansLeSac: 3 }),
  ];
  if (jeu === 'depart') return liste;
  const lignes = recapitulatif(liste, { avant: v, apres: nouvellesInfos }, etiquettesDuVoyage, nouvellesEtiquettes);
  const choix = choixParDefaut(lignes);
  choix.set('o-chaussures', true);
  const apres = appliquer(liste, lignes, choix, nouvellesInfos);
  for (const x of apres) {
    if (x.dansLeSac <= x.quantite) x.dansLeSac = x.quantite;
    if (x.aAcheter) x.achetes = x.quantite;
  }
  return apres;
}

// ---------- Les pièces à sortir du sac : la seule définition ----------
export const aSortir = x => Math.max(0, x.dansLeSac - x.quantite);
export const estRetire = x => x.quantite === 0;

// ---------- Le récapitulatif ----------
const inclus = (m, etiquettes) => !m.etiquette || etiquettes.includes(m.etiquette);

// Les lignes par catégorie : quantité qui change, quantité fixée à la main que le calcul changerait,
// objet qui entre, objet qui sortirait. Seul ce que provoque la modification est comparé.
export function recapitulatif(objets, { apres }, etiquettesAvant, etiquettesApres) {
  const lignes = [];
  for (const x of objets) {
    const m = modele(x.modeleId);
    const sort = m && inclus(m, etiquettesAvant) && !inclus(m, etiquettesApres);
    const calcul = quantitePour(x, apres);
    if (sort || (calcul === 0 && x.quantite > 0))
      lignes.push({
        type: 'sortie',
        id: x.id,
        categorieId: x.categorieId,
        nom: x.nom,
        avant: x.quantite,
        apres: 0,
        dansLeSac: x.dansLeSac,
        etiquette: m?.etiquette,
      });
    else if (x.quantiteManuelle) {
      if (calcul !== x.quantite)
        lignes.push({
          type: 'manuelle',
          id: x.id,
          categorieId: x.categorieId,
          nom: x.nom,
          avant: x.quantite,
          apres: calcul,
          dansLeSac: x.dansLeSac,
        });
    } else if (calcul !== x.quantite)
      lignes.push({
        type: 'quantite',
        id: x.id,
        categorieId: x.categorieId,
        nom: x.nom,
        avant: x.quantite,
        apres: calcul,
        dansLeSac: x.dansLeSac,
      });
  }
  const presents = new Set(objets.map(x => x.modeleId));
  for (const m of modeles) {
    if (presents.has(m.id) || !inclus(m, etiquettesApres) || inclus(m, etiquettesAvant)) continue;
    const quantite = quantitePour(m, apres);
    if (quantite > 0)
      lignes.push({
        type: 'entree',
        id: m.id,
        categorieId: m.categorieId,
        nom: m.nom,
        avant: 0,
        apres: quantite,
        dansLeSac: 0,
        etiquette: m.etiquette,
      });
  }
  return categoriesDeLaBibliotheque
    .map(categorie => ({
      categorie,
      lignes: lignes.filter(l => l.categorieId === categorie.id).sort((a, b) => a.nom.localeCompare(b.nom, 'fr')),
    }))
    .filter(c => c.lignes.length);
}

// Le défaut de chaque ligne : accepté, sauf la quantité fixée à la main (gardée) et le retrait (refusé).
export function choixParDefaut(parCategorie) {
  const choix = new Map();
  for (const { lignes } of parCategorie)
    for (const l of lignes) choix.set(l.id, l.type === 'quantite' || l.type === 'entree');
  return choix;
}

export const nombreAcceptes = (parCategorie, choix) =>
  parCategorie.flatMap(c => c.lignes).filter(l => choix.get(l.id)).length;

// Les lignes acceptées appliquées à une copie du voyage, sans rien écrire. Le sac ne baisse jamais
// d'office : ce qui dépasse la quantité prévue devient « à sortir ».
export function appliquer(objets, parCategorie, choix, infos) {
  const resultat = objets.map(x => ({ ...x }));
  for (const l of parCategorie.flatMap(c => c.lignes)) {
    if (!choix.get(l.id)) continue;
    if (l.type === 'entree') {
      resultat.push(copie(modele(l.id), infos));
      continue;
    }
    const x = resultat.find(o => o.id === l.id);
    x.quantite = l.apres;
    x.achetes = Math.min(x.achetes, l.apres);
    if (l.type === 'manuelle') x.quantiteManuelle = false;
    if (l.type === 'sortie') x.aAcheter = false;
  }
  // Un objet retiré sans pièce dans le sac part tout de suite.
  return resultat.filter(x => !(estRetire(x) && !x.dansLeSac));
}

// Pour l'écran de l'appli, qui ne connaît pas encore l'état « à sortir » : un objet qui a des pièces à
// sortir ne compte pas comme emballé (décision 7 du chef de projet). On le lui montre vide ; la maquette
// pose ensuite le « ! », la pastille et le trait du retrait.
export const pourLEcran = x =>
  aSortir(x) ? { ...x, dansLeSac: 0, quantite: Math.max(1, x.quantite), aAcheter: x.aAcheter && !estRetire(x) } : x;

export const categoriesDuVoyage = objets =>
  categoriesDeLaBibliotheque.filter(c => objets.some(x => x.categorieId === c.id));
