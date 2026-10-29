// Quand les plans changent (docs/PLAN.md, phase 10) : ce que la modification d'un voyage (dates,
// voyageurs, étiquettes) entraîne pour ses objets, ligne par ligne, puis ce qu'écrit l'application des
// lignes acceptées. Décisions du chef de projet du 2026-10-29 ;
// docs/superpowers/specs/2026-10-29-phase-10-plans-changent-design.md. Règles pures.
import { aUneFormuleInitiale } from './ajustements.js';
import { achetesApresQuantite, achetesApresSac } from './courses.js';
import { etiquettesChoisies, genererApercu, parOrdre } from './inclusion.js';
import { refuser } from './modeles.js';
import { joursEtNuits } from './periode.js';
import { calculerQuantite } from './quantites.js';
import { estRetire, piecesASortir } from './sac.js';
import { copierCategorie, copierEtiquette, copierObjet, validerInformations } from './voyage.js';

// Les étiquettes de la bibliothèque d'où viennent celles du voyage, quand elles y sont encore : ce
// que l'assistant présélectionne, et l'état « avant » de la comparaison.
export function choisiesDuVoyage(bibliotheque, etiquettesDuVoyage) {
  const existantes = new Set(bibliotheque.etiquettes.map(e => e.id));
  return new Set(etiquettesDuVoyage.map(e => e.modeleId).filter(id => existantes.has(id)));
}

// Les objets modèles qu'inclurait la bibliothèque actuelle, avec leur quantité.
const inclus = (bibliotheque, infos, choisies) =>
  new Map(
    genererApercu(bibliotheque, infos, choisies).flatMap(({ objets }) =>
      objets.map(({ objet, quantite }) => [objet.id, { modele: objet, quantite }]),
    ),
  );

// L'étiquette ajoutée (ou retirée) qui fait entrer (ou sortir) un objet modèle : la première, dans
// l'ordre des groupes, parmi les siennes et celles de sa catégorie ; null si ce sont les dates (une
// quantité tombée à 0, ou revenue).
function raisonDe(bibliotheque, modeleId, changees) {
  const modele = bibliotheque.objets.find(o => o.id === modeleId);
  const categorie = bibliotheque.categories.find(c => c.id === modele?.categorieId);
  const siennes = new Set([...(modele?.etiquettes ?? []), ...(categorie?.etiquettes ?? [])]);
  return etiquettesChoisies(bibliotheque, changees).find(e => siennes.has(e.id))?.nom ?? null;
}

const difference = (a, b) => new Set([...a].filter(x => !b.has(x)));

const recalculer = (objet, { depart, retour, voyageurs }) =>
  calculerQuantite(objet, { ...joursEtNuits(depart, retour), voyageurs });

// Ce qui ne dépend que des informations du voyage : on ne compare que ce que la modification change,
// jamais la bibliothèque entière (un objet décoché à la création, ou ajouté depuis à la bibliothèque,
// n'est pas proposé tant qu'on ne touche pas à une étiquette qui le concerne).
function lignesDesChangements({ contenu, bibliotheque, infos, choisies }) {
  const choisiesAvant = choisiesDuVoyage(bibliotheque, contenu.etiquettes);
  const avant = inclus(bibliotheque, contenu.voyage, choisiesAvant);
  const apres = inclus(bibliotheque, infos, choisies);
  const ajoutees = difference(choisies, choisiesAvant);
  const retirees = difference(choisiesAvant, choisies);
  const modeles = new Set(bibliotheque.objets.map(o => o.id));
  const parModele = new Map(contenu.objets.filter(o => o.modeleId).map(o => [o.modeleId, o]));
  const lignes = [];
  const ajouter = (genre, nom, avantN, apresN, defaut, champs) =>
    lignes.push({ genre, nom, avant: avantN, apres: apresN, defaut, ...champs });

  for (const objet of contenu.objets) {
    const connu = objet.modeleId && modeles.has(objet.modeleId);
    const cle = objet.id;
    if (estRetire(objet)) {
      // Retiré, il attend sa sortie : il revient si la modification l'inclut de nouveau, avec sa formule
      // copiée, ou celle de la bibliothèque si la sienne donne 0.
      if (connu && apres.has(objet.modeleId) && !avant.has(objet.modeleId)) {
        const quantite = recalculer(objet, infos) || apres.get(objet.modeleId).quantite;
        ajouter('retour', objet.nom, 0, quantite, true, {
          cle,
          objet,
          raison: raisonDe(bibliotheque, objet.modeleId, ajoutees),
        });
      }
      continue;
    }
    if (connu && avant.has(objet.modeleId) && !apres.has(objet.modeleId)) {
      const raison = raisonDe(bibliotheque, objet.modeleId, retirees);
      ajouter('sortie', objet.nom, objet.quantite, 0, false, { cle, objet, raison });
      continue;
    }
    if (!aUneFormuleInitiale(objet)) continue;
    const calcul = recalculer(objet, infos);
    if (calcul === 0 || calcul === objet.quantite) continue;
    // Une quantité fixée manuellement n'est reproposée que si le calcul lui-même change (dates, voyageurs).
    if (objet.quantiteManuelle) {
      if (calcul !== recalculer(objet, contenu.voyage))
        ajouter('manuelle', objet.nom, objet.quantite, calcul, false, { cle, objet });
    } else ajouter('quantite', objet.nom, objet.quantite, calcul, true, { cle, objet });
  }
  for (const [id, { modele, quantite }] of apres)
    if (!avant.has(id) && !parModele.has(id))
      ajouter('entree', modele.nom, 0, quantite, true, {
        cle: `entree:${id}`,
        modele,
        raison: raisonDe(bibliotheque, id, ajoutees),
      });
  return lignes;
}

// Les changements par catégorie (dans l'ordre), les lignes par nom. Une entrée va dans la catégorie
// du voyage issue du même modèle, sinon dans la catégorie de la bibliothèque, marquée neuve.
export function calculerChangements(entree) {
  const { contenu, bibliotheque } = entree;
  const groupes = new Map();
  for (const ligne of lignesDesChangements(entree)) {
    const categorie = ligne.objet
      ? contenu.categories.find(c => c.id === ligne.objet.categorieId)
      : (contenu.categories.find(c => c.modeleId === ligne.modele.categorieId) ?? {
          ...bibliotheque.categories.find(c => c.id === ligne.modele.categorieId),
          neuve: true,
        });
    const groupe = groupes.get(categorie.id) ?? { categorie, lignes: [] };
    groupe.lignes.push(ligne);
    groupes.set(categorie.id, groupe);
  }
  return [...groupes.values()]
    .sort((a, b) => parOrdre(a.categorie, b.categorie))
    .map(({ categorie, lignes }) => ({ categorie, lignes: lignes.sort((a, b) => a.nom.localeCompare(b.nom)) }));
}

// Les étiquettes choisies, copiées comme à la création (une étiquette déjà dans le voyage garde son
// identifiant), puis celles du voyage dont l'origine a disparu de la bibliothèque : gardées telles quelles.
function etiquettesApres({ contenu, bibliotheque, choisies }, ids) {
  const parModele = new Map(contenu.etiquettes.map(e => [e.modeleId, e]));
  const copiees = etiquettesChoisies(bibliotheque, choisies).map((etiquette, ordre) => {
    const deja = parModele.get(etiquette.id);
    return deja
      ? { ...deja, nom: etiquette.nom, ordre, modifieLe: ids.maintenant }
      : copierEtiquette(etiquette, contenu.voyage.id, ordre, ids);
  });
  const existantes = new Set(bibliotheque.etiquettes.map(e => e.id));
  const orphelines = contenu.etiquettes
    .filter(e => !existantes.has(e.modeleId))
    .map((e, i) => ({ ...e, ordre: copiees.length + i }));
  return [...copiees, ...orphelines];
}

// La ligne acceptée appliquée à son objet : null quand l'objet quitte le voyage sur-le-champ (retiré
// sans pièce dans le sac). Une baisse garde le sac tel quel : l'excédent attend sa sortie.
function objetApres(ligne, maintenant) {
  const { objet } = ligne;
  if (ligne.genre === 'sortie')
    return objet.dansLeSac > 0 ? { ...objet, quantite: 0, achetes: 0, modifieLe: maintenant } : null;
  const quantite = ligne.apres;
  // Un objet qui revient, tout entier dans le sac, compte comme acheté (règle de la phase 9).
  const achetes =
    ligne.genre === 'retour'
      ? achetesApresSac({ ...objet, quantite }, objet.dansLeSac)
      : achetesApresQuantite(objet, quantite);
  const change = { ...objet, quantite, achetes, modifieLe: maintenant };
  return ligne.genre === 'manuelle' ? { ...change, quantiteManuelle: false } : change;
}

// La modification à écrire en une fois (stockage.modifierVoyage), et les objets qui ont désormais des
// pièces à sortir du sac (la question posée après l'application). `acceptes` : les clés des lignes à
// appliquer ; pour une quantité fixée manuellement, présente veut dire « Recalculer ».
export function appliquerChangements(entree, ids) {
  const { contenu, infos, changements, acceptes } = entree;
  const erreurs = validerInformations(infos);
  if (Object.keys(erreurs).length) refuser(erreurs, 'Modification');
  const voyage = {
    ...contenu.voyage,
    nom: infos.nom.trim(),
    destination: String(infos.destination ?? '').trim(),
    depart: infos.depart,
    retour: infos.retour,
    voyageurs: infos.voyageurs,
    modifieLe: ids.maintenant,
  };
  const modification = {
    voyage,
    etiquettes: etiquettesApres(entree, ids),
    categoriesAjoutees: [],
    objetsAjoutes: [],
    objetsModifies: [],
    objetsRetires: [],
    categoriesRetirees: [],
  };
  const copiees = new Map();
  for (const { categorie, lignes } of changements)
    for (const ligne of lignes.filter(l => acceptes.has(l.cle))) {
      if (ligne.genre !== 'entree') {
        const apres = objetApres(ligne, ids.maintenant);
        if (apres) modification.objetsModifies.push(apres);
        else modification.objetsRetires.push(ligne.objet.id);
        continue;
      }
      if (categorie.neuve && !copiees.has(categorie.id)) {
        const copie = copierCategorie(categorie, voyage.id, ids);
        copiees.set(categorie.id, copie);
        modification.categoriesAjoutees.push(copie);
      }
      const categorieId = categorie.neuve ? copiees.get(categorie.id).id : categorie.id;
      modification.objetsAjoutes.push(
        copierObjet(ligne.modele, { voyageId: voyage.id, categorieId, quantite: ligne.apres }, ids),
      );
    }
  // Une catégorie que les retraits ont vidée disparaît, comme avec « Retirer du voyage ».
  // Une catégorie qui reçoit un objet ajouté reste (une étiquette remplacée par une autre).
  const partis = new Set(modification.objetsRetires);
  const touchees = new Set(contenu.objets.filter(o => partis.has(o.id)).map(o => o.categorieId));
  const recoivent = new Set(modification.objetsAjoutes.map(o => o.categorieId));
  modification.categoriesRetirees = [...touchees].filter(
    id => !recoivent.has(id) && !contenu.objets.some(o => o.categorieId === id && !partis.has(o.id)),
  );
  const nomDe = id => contenu.categories.find(c => c.id === id)?.nom;
  const aSortir = modification.objetsModifies
    .filter(o => piecesASortir(o) > 0)
    .map(o => ({
      id: o.id,
      nom: o.nom,
      categorie: nomDe(o.categorieId),
      pieces: piecesASortir(o),
      retire: estRetire(o),
    }));
  return { modification, aSortir };
}
