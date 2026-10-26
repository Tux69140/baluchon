// Données et règles de la maquette de la phase 7 (suppressions sûres) : la mini-bibliothèque de départ
// (docs/maquettes/bibliotheque/donnees.js), plus une catégorie « Baignade » et des objets de plage
// pour montrer un refus qui touche une catégorie et plusieurs objets.
// Une seule règle, `consequences`, sert à la fois aux chiffres annoncés, au refus et à la suppression
// (critère « les chiffres annoncés correspondent exactement à ce qui est supprimé ou modifié »).
import { categoriesDeDepart, nouvelId } from '../bibliotheque/donnees.js';

let n = 0;
const gid = () => `g${n++}`;
const groupe = (nom, etiquettes) => ({ id: gid(), nom, etiquettes: etiquettes.map(e => ({ id: gid(), nom: e })) });
const objet = (nom, etiquettes = [], extra = {}) => ({
  id: nouvelId(),
  nom,
  regle: 'fixe',
  valeur: 1,
  plafond: null,
  parPersonne: true,
  consommable: false,
  etiquettes,
  note: '',
  ...extra,
});

// Dans la maquette, une liste d'étiquettes vide veut dire « toujours inclus » : la phase 5 refuse
// déjà « Selon les étiquettes » sans étiquette, et la phase 7 interdit d'en arriver là.
export function bibliothequeDeDepart() {
  const categories = categoriesDeDepart();
  const vetements = categories.find(c => c.id === 'vetements');
  vetements.objets.push(objet('Tongs', ['Plage']));
  categories.splice(3, 0, {
    id: 'baignade',
    nom: 'Baignade',
    icone: 'person-simple-swim',
    couleur: 'ciel',
    etiquettes: ['Plage'],
    objets: [objet('Serviette de plage'), objet('Parasol', [], { parPersonne: false }), objet('Masque et tuba')],
  });
  return {
    groupes: [
      groupe('Activités', ['Randonnée', 'Camping', 'Plage']),
      groupe('Climat', ['Chaud', 'Froid', 'Pluie']),
      groupe('Hébergement', ['Hôtel', 'Tente', 'Chez l’habitant']),
    ],
    categories,
  };
}

const parNom = (a, b) => a.nom.localeCompare(b.nom, 'fr');

// Ce qu'emporte une suppression. cible : { type: 'categorie' | 'objet', id } ou
// { type: 'etiquette' | 'groupe', id }.
// - objets : les objets supprimés avec une catégorie ;
// - etiquettes : les étiquettes supprimées (une, ou toutes celles du groupe) ;
// - perdent : catégories et objets qui perdent une étiquette mais en gardent une autre ;
// - bloquent : ceux qui n'en garderaient aucune, et rendent la suppression impossible.
// Chaque élément compte une fois, même s'il porte plusieurs étiquettes du groupe.
export function consequences(biblio, cible) {
  const vide = { objets: [], etiquettes: [], perdent: { categories: [], objets: [] }, bloquent: { categories: [], objets: [] } };
  if (cible.type === 'categorie') return { ...vide, objets: trouverCategorie(biblio, cible.id).objets };
  if (cible.type === 'objet') return vide;
  const etiquettes =
    cible.type === 'groupe'
      ? biblio.groupes.find(g => g.id === cible.id).etiquettes.map(e => e.nom)
      : [trouverEtiquette(biblio, cible.id).nom];
  const res = { ...vide, etiquettes };
  const trier = (liste, element, cle) => {
    const touchees = element.etiquettes.filter(e => etiquettes.includes(e));
    if (!touchees.length) return;
    res[touchees.length === element.etiquettes.length ? 'bloquent' : 'perdent'][cle].push(liste);
  };
  for (const c of biblio.categories) {
    trier(c, c, 'categories');
    for (const x of [...c.objets].sort(parNom)) trier({ ...x, categorie: c }, x, 'objets');
  }
  return res;
}

export const trouverCategorie = (biblio, id) => biblio.categories.find(c => c.id === id);
export const categorieDe = (biblio, id) => biblio.categories.find(c => c.objets.some(x => x.id === id));
export const trouverObjet = (biblio, id) => categorieDe(biblio, id)?.objets.find(x => x.id === id);
export const groupeDe = (biblio, id) => biblio.groupes.find(g => g.etiquettes.some(e => e.id === id));
export const trouverEtiquette = (biblio, id) => groupeDe(biblio, id)?.etiquettes.find(e => e.id === id);

// Supprime ce que `consequences` annonce, rien de plus.
export function supprimer(biblio, cible) {
  const csq = consequences(biblio, cible);
  if (csq.bloquent.categories.length || csq.bloquent.objets.length) throw new Error('suppression refusée');
  if (cible.type === 'categorie') biblio.categories.splice(biblio.categories.findIndex(c => c.id === cible.id), 1);
  else if (cible.type === 'objet') {
    const c = categorieDe(biblio, cible.id);
    c.objets.splice(c.objets.findIndex(x => x.id === cible.id), 1);
  } else {
    const sans = element => (element.etiquettes = element.etiquettes.filter(e => !csq.etiquettes.includes(e)));
    for (const c of biblio.categories) [c, ...c.objets].forEach(sans);
    if (cible.type === 'groupe') biblio.groupes.splice(biblio.groupes.findIndex(g => g.id === cible.id), 1);
    else {
      const g = groupeDe(biblio, cible.id);
      g.etiquettes.splice(g.etiquettes.findIndex(e => e.id === cible.id), 1);
    }
  }
  return csq;
}

// Renommer une étiquette suit son nom dans les catégories et les objets qui la portent.
export function renommerEtiquette(biblio, id, nom) {
  const e = trouverEtiquette(biblio, id);
  for (const c of biblio.categories)
    for (const x of [c, ...c.objets]) x.etiquettes = x.etiquettes.map(v => (v === e.nom ? nom : v));
  e.nom = nom;
}

// « Annuler » : la bibliothèque revient telle qu'elle était, à l'identique (ordre, liens, identifiants).
export const photographier = biblio => structuredClone(biblio);
export function retablir(biblio, photo) {
  const copie = structuredClone(photo);
  biblio.groupes.splice(0, Infinity, ...copie.groupes);
  biblio.categories.splice(0, Infinity, ...copie.categories);
}

// Les fiches de la bibliothèque lisent les groupes par leurs noms.
export const groupesPourFiches = biblio => biblio.groupes.map(g => ({ nom: g.nom, etiquettes: g.etiquettes.map(e => e.nom) }));
