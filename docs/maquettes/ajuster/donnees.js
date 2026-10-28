// Le voyage d'essai de la maquette de la phase 8 : celui de la maquette « grand écran » (Crozon, 4 jours,
// 3 nuits, 2 voyageurs), avec, pour chaque objet, la règle copiée de la bibliothèque (de quoi écrire
// « calculée : 1 par jour et par personne »), le lien à son modèle et la marque « fixée manuellement ».
// La bibliothèque est celle de la maquette de la phase 5 (docs/maquettes/bibliotheque/donnees.js).
import { categoriesDeDepart } from '../bibliotheque/donnees.js';

let n = 0;
export const nouvelId = () => `v${n++}`;
// regle : { regle, valeur, plafond, parPersonne }, ou null pour un objet ajouté à la main.
const o = (nom, quantite, dansLeSac, regle, extra = {}) => ({
  id: nouvelId(),
  nom,
  quantite,
  dansLeSac,
  regle,
  manuelle: regle === null,
  modele: regle ? nom : null,
  note: '',
  ...extra,
});
const r = (regle, valeur, parPersonne = true, plafond = null) => ({ regle, valeur, plafond, parPersonne });

export const voyage = {
  nom: 'Presqu’île de Crozon',
  destination: 'Crozon, Finistère',
  details: 'du ven. 6 nov. au lun. 9 nov. 2026 · 2 voyageurs',
  etiquettes: ['Camping', 'Plage', 'Froid', 'Tente'],
};

// etat : 'vide' (aucun objet), 'plongee' (avec une catégorie propre au voyage), sinon le voyage seul.
export function categoriesDuVoyage(etat) {
  if (etat === 'vide') return [];
  const categories = [
    {
      id: 'vetements',
      modele: 'vetements',
      nom: 'Vêtements',
      icone: 't-shirt',
      couleur: 'ciel',
      objets: [
        o('T-shirts', 8, 3, r('par_jour', 1, true, 5)),
        o('Sous-vêtements', 8, 0, r('par_jour', 1)),
        o('Pyjama', 2, 2, r('par_nuit', 1, true, 1)),
        o('Maillot de bain', 2, 0, r('fixe', 1)),
        o('Doudoune', 2, 0, r('fixe', 1)),
        o('Bonnet', 2, 2, r('fixe', 1)),
      ],
    },
    {
      id: 'toilette',
      modele: 'toilette',
      nom: 'Toilette',
      icone: 'tooth',
      couleur: 'lagon',
      objets: [
        o('Brosse à dents', 2, 2, r('fixe', 1)),
        o('Dentifrice', 1, 1, r('fixe', 1, false)),
        o('Crème solaire', 1, 0, r('fixe', 1, false)),
      ],
    },
    {
      id: 'alimentation',
      modele: 'alimentation',
      nom: 'Alimentation',
      icone: 'fork-knife',
      couleur: 'pomme',
      objets: [
        o('Repas', 16, 6, r('par_jour', 2), { note: 'Prévoir un repas de secours par personne en plus.' }),
        o('Gourde', 2, 2, r('fixe', 1)),
      ],
    },
    {
      id: 'papiers',
      modele: 'papiers',
      nom: 'Papiers',
      icone: 'identification-card',
      couleur: 'tournesol',
      objets: [
        o('Pièce d’identité', 2, 2, r('fixe', 1), {
          note: 'Vérifier la date de validité avant de partir : certaines démarches prennent des semaines.',
        }),
        o('Chargeur de téléphone', 1, 1, r('fixe', 1, false), {
          note: 'Une multiprise de voyage dépanne dans les chambres à prise unique.',
        }),
      ],
    },
    {
      id: 'camping',
      modele: 'camping',
      nom: 'Camping',
      icone: 'tent',
      couleur: 'abricot',
      objets: [
        o('Lampe frontale', 2, 1, r('fixe', 1)),
        o('Sac de couchage', 2, 0, r('fixe', 1)),
        o('Réchaud', 1, 0, r('fixe', 1, false)),
      ],
    },
  ];
  // Une catégorie propre au voyage, créée depuis « Ajouter un objet », avec un objet ajouté à la main.
  if (etat === 'plongee')
    categories.push({
      id: 'plongee',
      modele: null,
      nom: 'Plongée',
      icone: 'waves',
      couleur: 'lilas',
      objets: [o('Masque et tuba', 2, 0, null)],
    });
  return categories;
}

// La bibliothèque : ses catégories (sans les objets, seuls leurs nombres servent ici).
export const bibliotheque = categoriesDeDepart();

export const complet = x => x.dansLeSac >= x.quantite;
export const faits = c => c.objets.filter(complet).length;
export const estBouclee = c => c.objets.length > 0 && c.objets.every(complet);
const parNom = (a, b) => a.nom.localeCompare(b.nom, 'fr');
// Ce qui reste à emballer d'abord, par nom ; ce qui est dans le sac ensuite (forme validée du 2026-10-24).
export const ordreNaturel = c => [
  ...c.objets.filter(x => !complet(x)).sort(parNom),
  ...c.objets.filter(complet).sort(parNom),
];

// La phrase de quantité de l'appli (src/i18n/fr.json, « regle »).
export function phraseRegle({ regle, valeur, plafond, parPersonne }) {
  const base = {
    fixe: parPersonne ? `${valeur} par personne` : `${valeur} en tout`,
    par_jour: `${valeur} par jour${parPersonne ? ' et par personne' : ''}`,
    par_nuit: `${valeur} par nuit${parPersonne ? ' et par personne' : ''}`,
  }[regle];
  return plafond ? `${base}, au plus ${plafond}${parPersonne ? ' par personne' : ''}` : base;
}
