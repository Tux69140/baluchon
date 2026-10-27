// Outils des tests d'écran des suppressions d'étiquettes et de groupes
// (tests/ecran-suppressions-etiquettes*.mjs) : la bibliothèque de tests/suppressions.test.js (sur le
// modèle de la maquette validée, docs/maquettes/suppressions/donnees.js), déposée dans le stockage du
// navigateur avec des voyages ; l'écran Étiquettes ouvert dessus ; la fenêtre de refus et la fiche
// ouverte depuis elle, lues et touchées.
import { construireBibliotheque } from '../../src/modele/bibliotheque.js';
import { avecBibliotheque } from './assistant.mjs';
import { attendreQue, calme } from './attente.mjs';
import { DONNEES as DONNEES_BIBLIOTHEQUE, commande, fr } from './bibliotheque.mjs';
import { idEtiquette, idGroupe, lire } from './etiquettes.mjs';
import { attendreFermee, attendreOuverte, bibliothequeStockee } from './fiches.mjs';
import { lireStockage } from './page.mjs';
import { DONNEES as DONNEES_VOYAGE } from './voyage-essai.mjs';

export const REFUS = 'dialog.refus';
// La fiche d'une catégorie ou d'un objet ouverte depuis le refus, par-dessus celle de l'étiquette.
export const MODELE = 'dialog.fiche-modele:not(.fiche-nom)';
export const QUESTION = 'dialog[role="alertdialog"]';
// Les espaces insécables des textes se lisent comme des espaces.
export const net = texte => texte?.replace(/\s+/g, ' ').trim() ?? null;

const objet = (nom, etiquettes = []) => ({ nom, regle: 'fixe', valeur: 1, parPersonne: true, etiquettes });

// Les groupes de départ (Activités, Climat, Hébergement) ; Baignade porte Plage, Camping porte
// Camping et Tente ; un modèle sans étiquette est « toujours inclus ».
export const depart = () => ({
  groupes: structuredClone(fr.bibliothequeDeDepart.groupes),
  categories: [
    {
      nom: 'Vêtements',
      icone: 't-shirt',
      couleur: 'ciel',
      objets: [
        objet('Maillot de bain', ['plage']),
        objet('Tongs', ['plage']),
        objet('Doudoune', ['froid']),
        objet('Bonnet', ['froid']),
        objet('Cape de pluie', ['pluie']),
      ],
    },
    { nom: 'Toilette', icone: 'tooth', couleur: 'lagon', objets: [objet('Crème solaire', ['plage', 'chaud'])] },
    {
      nom: 'Baignade',
      icone: 'person-simple-swim',
      couleur: 'ciel',
      etiquettes: ['plage'],
      objets: [objet('Serviette de plage'), objet('Parasol'), objet('Masque et tuba')],
    },
    {
      nom: 'Camping',
      icone: 'tent',
      couleur: 'abricot',
      etiquettes: ['camping', 'tente'],
      objets: [
        objet('Tente', ['camping']),
        objet('Sac de couchage', ['camping']),
        objet('Lampe frontale', ['camping']),
      ],
    },
  ],
});

// Les groupes de départ ; chaque objet garde une étiquette hors de Climat, sauf Bouillotte (Froid
// seule) : présente, elle fait refuser la suppression de Climat (constat C1 de la relecture finale).
export const climat = ({ bouillotte }) => ({
  groupes: structuredClone(fr.bibliothequeDeDepart.groupes),
  categories: [
    {
      nom: 'Vêtements',
      icone: 't-shirt',
      couleur: 'ciel',
      objets: [
        objet('Doudoune', ['froid', 'randonnee']),
        objet('Cape de pluie', ['pluie', 'randonnee']),
        objet('Crème solaire', ['plage', 'chaud']),
        ...(bouillotte ? [objet('Bouillotte', ['froid'])] : []),
      ],
    },
  ],
});

// Les voyages d'essai, et la bibliothèque décrite par description (depart() par défaut).
export function donnees(description = depart()) {
  let n = 0;
  const bibliotheque = construireBibliotheque(description, { nouvelId: () => `id-${++n}`, maintenant: 'x' });
  return { ...DONNEES_VOYAGE, ...DONNEES_BIBLIOTHEQUE, ...avecBibliotheque(bibliotheque) };
}

// Ce que le stockage garde des voyages : rien ne doit y changer.
export async function voyagesStockes(page) {
  const d = await lireStockage(page);
  return JSON.stringify(['voyages', 'etiquettesDuVoyage', 'categoriesDuVoyage', 'objetsDuVoyage'].map(c => d[c]));
}

// La bibliothèque gardée, objets et étiquettes rangés par id : les modèles n'ont pas de rang, un
// élément rétabli peut revenir à une autre place de lecture.
export async function empreinte(page) {
  const b = await bibliothequeStockee(page);
  const parId = liste => [...liste].sort((x, y) => x.id.localeCompare(y.id));
  return JSON.stringify({ ...b, objets: parId(b.objets), etiquettes: parId(b.etiquettes) });
}

// Les noms des étiquettes d'un objet gardé, dans l'ordre de ses liens.
export async function etiquettesDe(page, nom) {
  const b = await bibliothequeStockee(page);
  const porteur = [...b.objets, ...b.categories].find(x => x.nom === nom);
  return porteur?.etiquettes.map(id => b.etiquettes.find(e => e.id === id)?.nom ?? id) ?? null;
}

// Ce que montre la fenêtre de refus ; null si elle n'est pas ouverte (ou se ferme).
export const lireRefus = page =>
  page.evaluate(selecteur => {
    const d = document.querySelector(`${selecteur}[open]:not([data-fermeture])`);
    if (!d) return null;
    const texte = el => el?.textContent.replace(/\s+/g, ' ').trim() ?? null;
    const actif = document.activeElement;
    return {
      role: d.getAttribute('role'),
      titre: texte(d.querySelector('h2')),
      explication: texte(d.querySelector('.refus-explication')),
      reste: texte(d.querySelector('.refus-reste')),
      lignes: [...d.querySelectorAll('.refus-ligne')].map(b => texte(b.querySelector('.refus-texte b'))),
      details: [...d.querySelectorAll('.refus-ligne')].map(b => texte(b.querySelector('.refus-texte span'))),
      paves: [...d.querySelectorAll('.refus-ligne .pave')].map(p => p.dataset.couleur),
      libre: texte(d.querySelector('.message-succes')),
      question: texte(d.querySelector('#suppression-texte')),
      decrit: d.getAttribute('aria-describedby'),
      gras: [...d.querySelectorAll('#suppression-texte b')].map(texte),
      boutons: [...d.querySelectorAll('.fenetre-pied button')].map(
        b => `${texte(b)}:${b.classList.contains('bouton-danger') ? 'danger' : 'autre'}`,
      ),
      croix: d.querySelector('.fenetre-entete .bouton-fermer')?.checkVisibility() ?? false,
      // Des balises nées d'un nom (Review Focus 1).
      balises: d.querySelectorAll('h2 *, .refus-texte b *, .refus-texte span *, .message-succes > span:not(.icone) *')
        .length,
      annonce: texte(d.querySelector('[aria-live]')),
      focus: actif && d.contains(actif) ? texte(actif) : null,
      ombre: d.querySelector('.fenetre-pied').hasAttribute('data-ombre'),
      defilement: d.querySelector('.fiche-corps').scrollTop,
    };
  }, REFUS);

// Le refus ouvert et calmé ; rend ce qu'il montre.
export async function attendreRefus(page) {
  await attendreQue(page, s => document.querySelector(`${s}[open]:not([data-fermeture])`) !== null, REFUS);
  await calme(page);
  return lireRefus(page);
}

// Attend que le refus montre ces lignes (noms, dans l'ordre) ; rend ce qu'il montre alors.
export async function attendreLignes(page, noms) {
  await attendreQue(
    page,
    ({ s, voulu }) =>
      JSON.stringify(
        [...document.querySelectorAll(`${s}[open] .refus-ligne .refus-texte b`)].map(b => b.textContent.trim()),
      ) === voulu,
    { s: REFUS, voulu: JSON.stringify(noms) },
  );
  await calme(page);
  return lireRefus(page);
}

// La fiche de l'étiquette (ou du groupe) nommée, depuis l'écran Étiquettes.
export async function ouvrirFicheDe(page, sorte, nom) {
  const vue = await lire(page);
  const id = sorte === 'groupe' ? idGroupe(vue, nom) : idEtiquette(vue, nom);
  await page.click(commande(`modifier-${sorte}`, id));
  return attendreOuverte(page);
}

// « Supprimer » de la fiche du dessus (étiquette, groupe ou modèle).
export async function toucherSupprimer(page, fiche = 'dialog.fiche-nom') {
  await page.click(`${fiche} [data-supprimer]`);
  await calme(page);
}

// Une question (chiffrée) ouverte : son texte, ce qui est en gras.
export async function attendreQuestion(page) {
  await attendreQue(page, q => document.querySelector(`${q}[open]`) !== null, QUESTION);
  await calme(page);
  return page.evaluate(q => {
    const d = document.querySelector(`${q}[open]`);
    const texte = el => el?.textContent.replace(/\s+/g, ' ').trim() ?? null;
    return {
      titre: texte(d.querySelector('h2')),
      texte: texte(d.querySelector('#suppression-texte')),
      gras: [...d.querySelectorAll('#suppression-texte b')].map(texte),
    };
  }, QUESTION);
}

// Touche un bouton du pied de la fenêtre du dessus qui le porte, par son libellé.
export async function repondre(page, fenetre, libelle) {
  await page.click(`${fenetre}[open] .fenetre-pied button:text-is("${libelle}")`);
  await calme(page);
}

// La ligne du refus nommée : sa fiche s'ouvre par-dessus.
export async function ouvrirLigne(page, nom) {
  await page.click(`${REFUS} .refus-ligne:has(.refus-texte b:text-is(${JSON.stringify(nom)}))`);
  return attendreOuverte(page, MODELE);
}

// Dans la fiche ouverte depuis le refus : « Toujours inclus », ou une étiquette pressée, puis
// « Enregistrer » ; rend vrai si elle s'est fermée.
export async function rendreToujoursInclus(page, libelle) {
  await page.click(`${MODELE} label.segment:has(span:text-is(${JSON.stringify(libelle)}))`);
  await page.click(`${MODELE} [data-enregistrer]`);
  return attendreFermee(page, MODELE);
}

export async function ajouterEtiquette(page, nom) {
  await page.click(`${MODELE} .puce-etiquette:has-text(${JSON.stringify(nom)})`);
  await page.click(`${MODELE} [data-enregistrer]`);
  return attendreFermee(page, MODELE);
}

// Supprimer le modèle de la fiche ouverte depuis le refus : sa question, puis « Supprimer ».
export async function supprimerModele(page) {
  await toucherSupprimer(page, MODELE);
  await attendreQuestion(page);
  await repondre(page, QUESTION, fr.suppression.supprimer);
  return attendreFermee(page, MODELE);
}
