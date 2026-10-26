// Édition des modèles de la bibliothèque (spec de la phase 5) : état d'une fiche, validation,
// préparation des objets écrits en base, rangement des catégories. Les quantités suivent
// docs/PRD.md, « Calcul des quantités » (src/modele/quantites.js, seul endroit du calcul).
import { calculerQuantite } from './quantites.js';

// Les huit couleurs d'une catégorie, dans l'ordre du nuancier (maquette de la phase 5) ; chacune a
// son jeton dans src/styles/jetons.css et son nom dans fr.json (« couleurs »).
export const COULEURS = Object.freeze([
  'corail',
  'tournesol',
  'abricot',
  'pomme',
  'lagon',
  'ciel',
  'framboise',
  'lilas',
]);

export const BORNES_QUANTITE = Object.freeze({ min: 1, max: 999 });
// Période de l'exemple chiffré montré sous la règle d'un objet.
export const PERIODE_EXEMPLE = Object.freeze({ jours: 4, nuits: 3, voyageurs: 2 });

export const saisieDeCategorie = categorie => ({
  nom: categorie?.nom ?? '',
  icone: categorie?.icone ?? 'suitcase-rolling',
  couleur: categorie?.couleur ?? 'corail',
  selonEtiquettes: categorie ? !categorie.toujoursIncluse : false,
  etiquettes: [...(categorie?.etiquettes ?? [])],
});

export const saisieDObjet = objet => ({
  nom: objet?.nom ?? '',
  regle: objet?.regle ?? 'fixe',
  valeur: objet?.valeur ?? 1,
  plafondActif: objet ? objet.plafond !== null : false,
  plafond: objet?.plafond ?? null,
  parPersonne: objet?.parPersonne ?? true,
  consommable: objet?.consommable ?? false,
  selonEtiquettes: objet ? !objet.toujoursInclus : false,
  etiquettes: [...(objet?.etiquettes ?? [])],
  note: objet?.note ?? '',
});

const nomVide = nom => !String(nom ?? '').trim();

// Les erreurs, rangées par champ ; un objet vide quand tout est bon (comme validerInformations).
export function validerCategorie({ nom, selonEtiquettes, etiquettes }) {
  const erreurs = {};
  if (nomVide(nom)) erreurs.nom = 'nomManquant';
  if (selonEtiquettes && !etiquettes.length) erreurs.etiquettes = 'etiquettesManquantes';
  return erreurs;
}

// Le plafond n'a de sens qu'avec « par jour » et « par nuit » : avec « fixe » il est effacé, donc
// jamais jugé.
export const plafondPossible = ({ regle }) => regle !== 'fixe';

export function validerObjet(saisie) {
  const erreurs = {};
  if (nomVide(saisie.nom)) erreurs.nom = 'nomManquant';
  if (saisie.valeur === null || saisie.valeur === undefined) erreurs.valeur = 'valeurManquante';
  if (saisie.plafondActif && plafondPossible(saisie) && (saisie.plafond ?? null) === null)
    erreurs.plafond = 'plafondManquant';
  if (saisie.selonEtiquettes && !saisie.etiquettes.length) erreurs.etiquettes = 'etiquettesManquantes';
  return erreurs;
}

// Une quantité (valeur ou plafond) ramenée entre 1 et 999 : au clavier comme par − / +.
export const bornerQuantite = n => Math.min(BORNES_QUANTITE.max, Math.max(BORNES_QUANTITE.min, n));

// Ce que lireNombre garde d'une saisie : les chiffres seuls.
const chiffres = texte => String(texte ?? '').replace(/\D/g, '');

// Champ numérique au clavier : on ne garde que les chiffres, puis on ramène entre 1 et 999 ; un
// champ vide reste vide (null) pour que la validation le refuse avec son message.
export function lireNombre(texte) {
  const gardes = chiffres(texte);
  if (!gardes) return null;
  return bornerQuantite(Number(gardes));
}

// Où remettre le curseur quand le champ réécrit la saisie texte en lireNombre(texte) : à la même
// distance de la fin, comptée en chiffres gardés. Il reste juste après la frappe, décalé de ce qui
// est retiré avant lui ; ramené dans le champ si la valeur a été bornée.
export function curseurApresLecture(texte, curseur) {
  const affiche = String(lireNombre(texte) ?? '');
  return Math.max(0, affiche.length - chiffres(String(texte).slice(curseur)).length);
}

// La règle de quantité qu'une saisie enregistre : sans plafond avec « Fixe » ou l'interrupteur
// éteint. La phrase et l'exemple de la fiche la lisent, preparerObjet l'écrit.
export const regleDeSaisie = saisie => ({
  regle: saisie.regle,
  valeur: saisie.valeur,
  plafond: saisie.plafondActif && plafondPossible(saisie) ? (saisie.plafond ?? null) : null,
  parPersonne: saisie.parPersonne,
});

// Changer de règle : « Fixe » efface le plafond (spec de la phase 5). Rend une nouvelle saisie.
export const changerRegle = (saisie, regle) =>
  regle === 'fixe' ? { ...saisie, regle, plafondActif: false, plafond: null } : { ...saisie, regle };

// Allumer le plafond propose le nombre déjà choisi (ou 1) ; l'éteindre l'efface. Rend une nouvelle saisie.
export const activerPlafond = (saisie, actif) => ({
  ...saisie,
  plafondActif: actif,
  plafond: actif ? (saisie.plafond ?? saisie.valeur ?? BORNES_QUANTITE.min) : null,
});

export function refuser(erreurs, sujet) {
  throw Object.assign(new Error(`${sujet} refusé : ${Object.values(erreurs).join(', ')}`), { erreurs });
}

export function preparerCategorie(saisie, { existante, categories, nouvelId, maintenant }) {
  const erreurs = validerCategorie(saisie);
  if (Object.keys(erreurs).length) refuser(erreurs, 'Catégorie');
  // Neuve : tout à la fin de la liste ; une catégorie existante garde sa place.
  const suivant = categories.length ? Math.max(...categories.map(c => c.ordre)) + 1 : 0;
  return {
    id: existante?.id ?? nouvelId(),
    nom: saisie.nom.trim(),
    icone: saisie.icone,
    couleur: saisie.couleur,
    ordre: existante?.ordre ?? suivant,
    toujoursIncluse: !saisie.selonEtiquettes,
    modifieLe: maintenant,
    etiquettes: saisie.selonEtiquettes ? [...saisie.etiquettes] : [],
  };
}

export function preparerObjet(saisie, { existant, categorieId, nouvelId, maintenant }) {
  const erreurs = validerObjet(saisie);
  if (Object.keys(erreurs).length) refuser(erreurs, 'Objet');
  return {
    id: existant?.id ?? nouvelId(),
    // La catégorie d'un objet modèle ne change jamais.
    categorieId: existant?.categorieId ?? categorieId,
    nom: saisie.nom.trim(),
    ...regleDeSaisie(saisie),
    consommable: saisie.consommable,
    toujoursInclus: !saisie.selonEtiquettes,
    note: saisie.note ?? '',
    modifieLe: maintenant,
    etiquettes: saisie.selonEtiquettes ? [...saisie.etiquettes] : [],
  };
}

// Rangement des catégories, des groupes et des étiquettes : même échange pour les trois listes.
// Échange avec le voisin (sens −1 ou 1) ; aux bords, une copie identique. Ne modifie pas la liste
// reçue : l'écran compare l'ancien et le nouvel ordre.
export function deplacerDansListe(ids, id, sens) {
  const copie = [...ids];
  const de = copie.indexOf(id);
  const vers = de + sens;
  if (de < 0 || vers < 0 || vers >= copie.length) return copie;
  [copie[de], copie[vers]] = [copie[vers], copie[de]];
  return copie;
}

export const exempleQuantite = objet => calculerQuantite(objet, PERIODE_EXEMPLE);
