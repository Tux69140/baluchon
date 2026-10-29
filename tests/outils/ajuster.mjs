// Outils des tests d'écran de la phase 8 sur la fiche d'un objet du voyage (tests/ecran-voyage-ajuster.mjs,
// tests/ecran-voyage-retirer.mjs) : ouvrir le voyage d'essai, sa fiche, lire ce qu'elle montre, la question
// posée par-dessus, et ce que le stockage garde.
import { attendreQue, calme } from './attente.mjs';
import { TOUS_FORMATS, fr, remplir, vu } from './bibliotheque.mjs';
import { attendreEcran, lireStockage, ouvrir } from './page.mjs';
import { DONNEES, montrerCategorie } from './voyage-essai.mjs';

export { fr, remplir, vu };
export const FICHE = 'dialog.fiche-voyage';
export const QUESTION = 'dialog[role="alertdialog"]';
export const RENOMMER = 'dialog.fiche-nom';
export const BANDEAU = '.bandeau-annuler';

// Le voyage voyageId ouvert dans un format de TOUS_FORMATS. horloge : l'horloge de la page simulée
// (elle court d'elle-même ; le test l'arrête pour mesurer).
export async function ouvrirVoyage(
  navigateur,
  url,
  { format = 'telephone', theme = 'light', donnees = DONNEES, voyageId = 'v1', horloge = false } = {},
) {
  const { taille, ecran, tactile } = TOUS_FORMATS[format];
  const ouvert = await ouvrir(navigateur, url, {
    taille,
    ecran,
    tactile,
    theme,
    donnees,
    adresse: `#/voyage/${voyageId}`,
    horloge,
  });
  ouvert.page.setDefaultTimeout(5000);
  await attendreEcran(ouvert.page, 'voyage');
  return ouvert;
}

// La fiche de l'objet id, ouverte depuis sa ligne (sa catégorie choisie d'abord en grand format).
export async function ouvrirFiche(page, id) {
  const stocke = await lireStockage(page);
  await montrerCategorie(page, stocke.objetsDuVoyage.find(o => o.id === id).categorieId);
  await page.click(`#app .objet[data-id="${id}"] .objet-corps`);
  const ouverte = await attendreQue(page, s => document.querySelector(`${s}[open]`) !== null, FICHE);
  await calme(page);
  return Boolean(ouverte);
}

// Ce que montre la fiche ouverte ; null sans fiche. desactives : les commandes inactives. Les blancs
// sont resserrés, sauf les espaces insécables des textes (comparés tels quels à fr.json).
export const lireFiche = page =>
  page.evaluate(selecteur => {
    const d = [...document.querySelectorAll(selecteur)].find(x => x.open && !('fermeture' in x.dataset));
    if (!d) return null;
    const texte = el => el?.textContent.replace(/[ \t\r\n]+/g, ' ').trim() ?? null;
    return {
      titre: texte(d.querySelector('h2')),
      ligne: texte(d.querySelector('.fiche-regle')),
      sac: texte(d.querySelector('.fiche-bloc:not(.fiche-ajuster) output')),
      sur: texte(d.querySelector('.compteur-total')),
      ajuster: texte(d.querySelector('.fiche-ajuster h3')),
      quantite: texte(d.querySelector('.fiche-ajuster output')),
      calcul: texte(d.querySelector('.fiche-ajuster [data-calcul]')),
      initialement: texte(d.querySelector('.fiche-ajuster [data-initialement]')),
      retirer: texte(d.querySelector('[data-supprimer]')),
      desactives: [...d.querySelectorAll('[aria-disabled="true"]')]
        .map(b => b.dataset.fiche ?? ('supprimer' in b.dataset ? 'retirer' : b.tagName))
        .join(),
      balises: d.querySelectorAll('h2 *, .fiche-regle *').length,
    };
  }, FICHE);

// Un bouton de la fiche ouverte (data-fiche), ou « Retirer du voyage ».
export async function toucherFiche(page, quoi, { force = false, double = false } = {}) {
  const selecteur = quoi === 'retirer' ? `${FICHE} [data-supprimer]` : `${FICHE} [data-fiche="${quoi}"]`;
  if (double) await page.dblclick(selecteur, { force });
  else await page.click(selecteur, { force });
}

// La question ouverte : titre, paragraphes, libellés des boutons ; null sans question.
export const lireQuestion = page =>
  page.evaluate(selecteur => {
    const d = [...document.querySelectorAll(selecteur)].find(x => x.open && !('fermeture' in x.dataset));
    if (!d) return null;
    const texte = el => el.textContent.replace(/[ \t\r\n]+/g, ' ').trim();
    return {
      titre: texte(d.querySelector('h2')),
      textes: [...d.querySelectorAll('p')].map(texte),
      gras: [...d.querySelectorAll('p b')].map(texte),
      boutons: [...d.querySelectorAll('.fenetre-pied button')].map(texte),
      decrit: (d.getAttribute('aria-describedby') ?? '')
        .split(' ')
        .map(id => document.getElementById(id))
        .filter(Boolean)
        .map(texte),
      balises: d.querySelectorAll('h2 *').length,
    };
  }, QUESTION);

export async function attendreQuestion(page) {
  const ouverte = await attendreQue(page, s => document.querySelector(`${s}[open]`) !== null, QUESTION);
  await calme(page);
  return Boolean(ouverte);
}

// Répond à la question par le libellé d'un de ses boutons ; double : deux appuis rapides.
export async function repondre(page, libelle, { double = false } = {}) {
  const bouton = `${QUESTION} .fenetre-pied button:text-is(${JSON.stringify(libelle)})`;
  if (double) await page.dblclick(bouton);
  else await page.click(bouton);
  await attendreQue(page, s => !document.querySelector(s), QUESTION);
}

export const objetStocke = async (page, id) => (await lireStockage(page)).objetsDuVoyage.find(o => o.id === id) ?? null;

// La ligne de l'objet à l'écran : nom et quantité affichés, éclairée ou non ; null si elle n'y est pas.
export const ligne = (page, id) =>
  page.evaluate(id => {
    const li = document.querySelector(`#app .objet[data-id="${CSS.escape(id)}"]`);
    if (!li) return null;
    return {
      nom: li.querySelector('.objet-nom').textContent,
      quantite: li.querySelector('.objet-quantite').textContent,
      recent: li.hasAttribute('data-recent'),
      balises: li.querySelectorAll('.objet-nom *').length,
    };
  }, id);

// Ce que montre le bandeau « Annuler » ; null sans bandeau.
export const texteBandeau = page =>
  page.evaluate(s => {
    const b = document.querySelector(s);
    return b?.matches(':popover-open') ? b.querySelector('p').textContent : null;
  }, BANDEAU);
