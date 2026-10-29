// Outils du test d'écran « Ajouter un objet » de la phase 8 (tests/ecran-voyage-ajouter.mjs) : la fiche
// d'ajout, la liste de choix d'une catégorie, la fiche « Nouvelle catégorie » du voyage, lues et touchées.
import { attendreQue, calme } from './attente.mjs';
import { vu } from './bibliotheque.mjs';
import { DONNEES } from './voyage-essai.mjs';

export const AJOUT = 'dialog.fiche-ajout';
export const CHOIX = 'dialog.choix-categorie';
export const NOUVELLE = 'dialog.fiche-nouvelle-categorie';

// Une bibliothèque déposée, pour vérifier qu'aucun ajout au voyage n'y touche.
export const AVEC_BIBLIOTHEQUE = {
  ...DONNEES,
  bibliotheque: {
    groupes: [],
    etiquettes: [],
    categories: [
      {
        id: 'b-toi',
        nom: 'Toilette',
        icone: 'tooth',
        couleur: 'lagon',
        ordre: 0,
        toujoursIncluse: true,
        etiquettes: [],
      },
    ],
    objets: [],
  },
};
export const FLOTTANT = '#app .bouton-flottant[data-action="ajouter"]';
const trie = objet => Object.fromEntries(Object.entries(objet).sort(([x], [y]) => x.localeCompare(y)));
export const pareil = (x, y) => vu(trie(x)) === vu(trie(y));
// Ce qu'un objet ajouté à la main porte (contraintes de la phase 8) ; valeur 0 : il n'a jamais eu de formule.
export const ajoute = (categorieId, nom, quantite) => ({
  voyageId: 'v1',
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
});
export const sansIdNiDate = ({ id, modifieLe, ...reste }) => (id && modifieLe ? reste : null);
// Ce qui a le focus : la ligne d'un objet (son id), sinon l'action de la commande.
export const focusSur = page =>
  page.evaluate(() => {
    const el = document.activeElement;
    return el?.closest('.objet')?.dataset.id ?? el?.dataset.action ?? el?.tagName ?? null;
  });

const ouverte = (page, selecteur) =>
  attendreQue(
    page,
    s => [...document.querySelectorAll(s)].some(d => d.matches(':modal') && !('fermeture' in d.dataset)),
    selecteur,
  );
export const partie = (page, selecteur) => attendreQue(page, s => !document.querySelector(s), selecteur);

// Touche une commande « Ajouter un objet » de l'écran (bouton flottant, ligne du grand écran, écran vide)
// et attend la fiche ; rend vrai si elle est venue.
export async function toucherAjouter(page, selecteur = '#app [data-action="ajouter"]') {
  await page.click(selecteur);
  const venue = await ouverte(page, AJOUT);
  await calme(page);
  return Boolean(venue);
}

// Ce que montre la fiche d'ajout ouverte ; null sans fiche.
export const lireAjout = page =>
  page.evaluate(selecteur => {
    const d = [...document.querySelectorAll(selecteur)].find(x => x.open && !('fermeture' in x.dataset));
    if (!d) return null;
    const texte = el => el?.textContent.replace(/[ \t\r\n]+/g, ' ').trim() ?? null;
    const champ = d.querySelector('[data-action="categorie"]');
    const actif = document.activeElement;
    return {
      titre: texte(d.querySelector('h2')),
      sousTitre: texte(d.querySelector('.fiche-regle')),
      nom: d.querySelector('#f-nom')?.value ?? null,
      categorie: texte(champ?.querySelector('.refus-texte b')),
      sous: texte(champ?.querySelector('.refus-texte > span')),
      couleur: champ?.querySelector('.pave')?.dataset.couleur ?? null,
      quantite: d.querySelector('input[data-nombre="quantite"]')?.value ?? null,
      quantiteAide: texte(d.querySelector('.ligne-seule small')),
      bouton: texte(d.querySelector('.fenetre-pied .bouton-principal')),
      erreurs: [...d.querySelectorAll('.erreur-champ')].map(texte).filter(Boolean),
      invalides: [...d.querySelectorAll('[aria-invalid="true"]')].map(el => el.id || el.dataset.action),
      focus: d.contains(actif) ? actif.id || actif.dataset.action || actif.tagName : null,
      balises: d.querySelectorAll('h2 *, .fiche-regle *, .refus-texte b *').length,
    };
  }, AJOUT);

// La liste de choix ouverte : son titre, ses lignes (id, nom, sous-titre, retenue, coche), ses boutons.
export const lireChoix = page =>
  page.evaluate(selecteur => {
    const d = [...document.querySelectorAll(selecteur)].find(x => x.open && !('fermeture' in x.dataset));
    if (!d) return null;
    const texte = el => el?.textContent.replace(/[ \t\r\n]+/g, ' ').trim() ?? null;
    return {
      titre: texte(d.querySelector('h2')),
      lignes: [...d.querySelectorAll('.refus-ligne')].map(l => ({
        id: l.dataset.choix,
        nom: texte(l.querySelector('.refus-texte b')),
        sous: texte(l.querySelector('.refus-texte > span')),
        retenue: l.getAttribute('aria-current') === 'true',
        coche: Boolean(l.querySelector('.choix-marque svg')),
      })),
      boutons: [...d.querySelectorAll('.fenetre-pied button')].map(texte),
      balises: d.querySelectorAll('.refus-texte b *').length,
    };
  }, CHOIX);

// Ouvre la liste depuis la fiche d'ajout ; rend vrai si elle est venue.
export async function ouvrirChoix(page) {
  await page.click(`${AJOUT} [data-action="categorie"]`);
  const venue = await ouverte(page, CHOIX);
  await calme(page);
  return Boolean(venue);
}

// Choisit une ligne de la liste ouverte (un id, ou 'nouvelle').
export async function choisir(page, id) {
  await page.click(`${CHOIX} [data-choix="${id}"]`);
  await partie(page, CHOIX);
  if (id === 'nouvelle') await ouverte(page, NOUVELLE);
  await calme(page);
}

// Crée une catégorie neuve pour ce voyage, depuis la fiche d'ajout : liste, « Nouvelle catégorie », nom,
// couleur, « Choisir ».
export async function creerCategorie(page, { nom, couleur }) {
  await ouvrirChoix(page);
  await choisir(page, 'nouvelle');
  await page.fill(`${NOUVELLE} input[data-texte="nom"]`, nom);
  await page.click(`${NOUVELLE} .teinte[data-valeur="${couleur}"]`);
  await page.click(`${NOUVELLE} [data-enregistrer]`);
  await partie(page, NOUVELLE);
  await calme(page);
}

// Ce que montre la fiche « Nouvelle catégorie » ouverte ; null sans elle.
export const lireNouvelle = page =>
  page.evaluate(selecteur => {
    const d = [...document.querySelectorAll(selecteur)].find(x => x.open && !('fermeture' in x.dataset));
    if (!d) return null;
    const texte = el => el?.textContent.replace(/[ \t\r\n]+/g, ' ').trim() ?? null;
    const champ = d.querySelector('input[data-texte="nom"]');
    return {
      titre: texte(d.querySelector('h2')),
      sousTitre: texte(d.querySelector('.fiche-regle')),
      nom: champ?.value ?? null,
      // Le libellé du champ est bien le sien, même sous la fiche d'ajout qui a aussi un champ « Nom ».
      libelle: champ?.labels?.[0]?.closest('dialog') === d,
      pave: d.querySelector('.apparence .pave')?.dataset.couleur ?? null,
      picto: texte(d.querySelector('.apparence-nom')),
      teintes: d.querySelectorAll('.teinte').length,
      bouton: texte(d.querySelector('.fenetre-pied .bouton-principal')),
      erreurs: [...d.querySelectorAll('.erreur-champ')].map(texte).filter(Boolean),
    };
  }, NOUVELLE);

// Remplit la fiche d'ajout (nom, et autant d'appuis sur + que voulu) puis touche « Ajouter ».
export async function remplirEtAjouter(page, { nom, plus = 0, valider = true }) {
  await page.fill(`${AJOUT} #f-nom`, nom);
  for (let i = 0; i < plus; i++) await page.click(`${AJOUT} [data-pas="quantite"][data-sens="1"]`);
  if (valider) await page.click(`${AJOUT} [data-enregistrer]`);
}

// Les lignes d'une catégorie, dans l'ordre affiché : ids des objets (la ligne « Ajouter un objet » à part).
export const lignesDe = (page, categorieId) =>
  page.evaluate(id => {
    const carte =
      document.querySelector(`#app .categorie[data-id="${CSS.escape(id)}"]`) ??
      document.querySelector('#app .gf-carte-objets');
    return [...(carte?.querySelectorAll('.objet') ?? [])].map(li =>
      li.classList.contains('objet-ajout') ? `ajout:${li.querySelector('button')?.dataset.id ?? ''}` : li.dataset.id,
    );
  }, categorieId);

// La fiche d'ajout fermée par Échap, sans rien changer.
export async function fermerAjout(page) {
  await page.keyboard.press('Escape');
  await partie(page, AJOUT);
  await calme(page);
}
