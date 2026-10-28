// Outils des tests d'écran « Ajouter aussi à la bibliothèque ? » de la phase 8
// (tests/ecran-voyage-ajout-bibliotheque*.mjs) : le voyage d'essai et sa bibliothèque, ajouter un objet
// jusqu'à la question, répondre « Oui », toucher les fiches de la bibliothèque, lire le message en haut.
import { attendreQue, calme } from './attente.mjs';
import { attendreQuestion, fr, repondre } from './ajuster.mjs';
import {
  AJOUT,
  CHOIX,
  choisir,
  creerCategorie,
  ouvrirChoix,
  partie,
  remplirEtAjouter,
  toucherAjouter,
} from './ajouter.mjs';
import { FICHE, attendreOuverte } from './fiches.mjs';
import { lireStockage } from './page.mjs';
import { DONNEES } from './voyage-essai.mjs';

export const b = fr.ajustement.bibliotheque;

const categorieModele = (id, nom, icone, couleur, ordre) => ({
  id,
  nom,
  icone,
  couleur,
  ordre,
  toujoursIncluse: true,
  etiquettes: [],
  modifieLe: 'x',
});
const objetModele = (id, categorieId, nom) => ({
  id,
  categorieId,
  nom,
  regle: 'fixe',
  valeur: 1,
  plafond: null,
  parPersonne: true,
  consommable: false,
  toujoursInclus: true,
  note: '',
  etiquettes: [],
  modifieLe: 'x',
});
// Toilette du voyage vient de la bibliothèque (connue) ; Alimentation d'une catégorie supprimée depuis
// (inconnue, comme Vêtements, propre au voyage).
export const ESSAI = {
  ...DONNEES,
  meta: { bibliothequeInstallee: true, langueBibliotheque: 'fr' },
  categoriesDuVoyage: DONNEES.categoriesDuVoyage.map(c => {
    if (c.id === 'c-toi') return { ...c, modeleId: 'b-toi' };
    if (c.id === 'c-ali') return { ...c, modeleId: 'b-disparue' };
    return c;
  }),
  bibliotheque: {
    groupes: [{ id: 'g-act', nom: 'Activités', ordre: 0, modifieLe: 'x' }],
    etiquettes: [
      { id: 'e-pla', groupeId: 'g-act', nom: 'Plage', ordre: 0, modifieLe: 'x' },
      { id: 'e-mon', groupeId: 'g-act', nom: 'Montagne', ordre: 1, modifieLe: 'x' },
    ],
    categories: [
      categorieModele('b-ali', 'Repas', 'fork-knife', 'pomme', 1),
      categorieModele('b-toi', 'Toilette', 'tooth', 'lagon', 0),
    ],
    objets: [
      objetModele('bo-bro', 'b-toi', 'Brosse à dents'),
      objetModele('bo-gou', 'b-ali', 'Gourde'),
      objetModele('bo-caf', 'b-ali', 'Café'),
    ],
  },
};

// Ajoute nom au voyage, dans la catégorie du voyage categorie (un id) ou dans une neuve ({ nom, couleur }),
// avec plus appuis sur + ; attend la question et rend l'objet du voyage écrit.
export async function ajouter(page, { nom, categorie = null, nouvelle = null, plus = 0 }) {
  await toucherAjouter(page);
  if (nouvelle) await creerCategorie(page, nouvelle);
  else if (categorie) {
    await ouvrirChoix(page);
    await choisir(page, categorie);
  }
  await remplirEtAjouter(page, { nom, plus });
  await partie(page, AJOUT);
  await attendreQuestion(page);
  return (await lireStockage(page)).objetsDuVoyage.find(o => o.nom === nom) ?? null;
}

// La liste des catégories de la bibliothèque, après « Oui ».
export async function oui(page) {
  await repondre(page, b.oui);
  await attendreQue(
    page,
    s => [...document.querySelectorAll(s)].some(d => d.matches(':modal') && !('fermeture' in d.dataset)),
    `${CHOIX}, ${FICHE}`,
  );
  await calme(page);
}

const toucherModele = async (page, selecteur) => {
  await page.click(`${FICHE} ${selecteur}`);
  await calme(page);
};
export const etiquette = (page, id) => toucherModele(page, `.puce-etiquette[data-etiquette="${id}"]`);
export const enregistrerModele = page => toucherModele(page, '[data-enregistrer]');

// Le message en haut : son texte, sa sorte, et des balises nées d'un nom.
export const lireMessage = page =>
  page.evaluate(() => {
    const el = document.querySelector('.alerte-haut');
    return el
      ? {
          texte: el.querySelector('p').textContent,
          succes: el.classList.contains('message-succes'),
          role: el.getAttribute('role'),
          balises: el.querySelectorAll('p *').length,
        }
      : null;
  });

// « Nouvelle catégorie » dans la liste de la bibliothèque : sa fiche ouverte.
export async function nouvelleCategorie(page) {
  await page.click(`${CHOIX} [data-choix="nouvelle"]`);
  await attendreOuverte(page);
}

// « Suivant » de la fiche de catégorie : elle part, la fiche d'objet vient.
export async function suivant(page) {
  await enregistrerModele(page);
  await attendreQue(page, () => document.querySelectorAll('dialog.fiche-modele').length === 1);
  await attendreOuverte(page);
}
