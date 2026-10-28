// Outils des tests d'écran de la Bibliothèque (tests/ecran-bibliotheque*.mjs) : ouvrir l'écran par
// Menu → Réglages → Bibliothèque, lire ce qu'il montre, l'ordre gardé par le stockage.
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { remplir } from '../../src/i18n/traduction.js';
import { attendreQue, calme } from './attente.mjs';
import { FORMATS, RACINE, attendreEcran, lireStockage, ouvrir } from './page.mjs';

export const fr = JSON.parse(await readFile(join(RACINE, 'src/i18n/fr.json'), 'utf8'));
export const compter = (cle, n) => remplir(fr.bibliotheque[cle][n === 1 ? 'one' : 'other'], { n });
export { remplir };
export const vu = e => JSON.stringify(e);
// La bibliothèque de départ, dans son ordre.
export const DEPART = ['Vêtements', 'Toilette', 'Alimentation', 'Papiers', 'Camping'];
export const DONNEES = { toucheRetour: true };
// Les formats de cette phase : ceux de tous les écrans, plus le téléphone étroit et son paysage, et
// l'ordinateur (à la souris).
export const TOUS_FORMATS = {
  'telephone-etroit': { taille: { width: 360, height: 640 } },
  'telephone-etroit-paysage': { taille: { width: 640, height: 360 }, ecran: { width: 360, height: 640 } },
  ...Object.fromEntries(Object.entries(FORMATS).map(([nom, taille]) => [nom, { taille }])),
  ordinateur: { taille: { width: 1440, height: 900 }, tactile: false },
};

// La disposition de l'écran : l'accordéon au téléphone, le repli (tuiles, la liste dessous) ou les trois
// colonnes (tablettes et ordinateur, docs/superpowers/specs/2026-10-27-grand-ecran-design.md).
export const disposition = page =>
  page.evaluate(() => {
    const main = document.querySelector('#app main');
    if (!main?.classList.contains('grand-format')) return 'telephone';
    return main.dataset.colonnes === '3' ? 'trois' : 'repli';
  });

// Ce que l'écran montre. Au téléphone : cartes ; en grand format : choix (les catégories du menu, cartes
// ou tuiles), choisie, crayons (le nom de chaque crayon des cartes), puis la liste de la choisie :
// detail (son titre), detailObjets, detailDerniere (« Ajouter un objet »), modifierListe (« Modifier »
// à côté du titre, en repli).
export const lire = async page => ({
  disposition: await disposition(page),
  ...(await page.evaluate(() => {
    const texte = el => el?.textContent.replace(/\s+/g, ' ').trim() ?? null;
    const puces = el => [...(el?.querySelectorAll('.puces-mini > span') ?? [])].map(texte);
    const objets = racine =>
      [...racine.querySelectorAll('li.objet-modele')].map(li => ({
        nom: texte(li.querySelector('.objet-nom')),
        sous: [...li.querySelectorAll('.objet-sous > span:not(.puces-mini)')].map(texte),
        puces: puces(li),
        note: Boolean(li.querySelector('.objet-note svg')),
        action: li.querySelector('button')?.dataset.action,
      }));
    const derniere = racine => {
      const li = racine?.querySelector('.objets > li:last-child');
      const bouton = li?.querySelector('button');
      return li && { texte: texte(li), action: bouton?.dataset.action, id: bouton?.dataset.id };
    };
    const liste = document.querySelector('.gf-liste');
    return {
      ecran: document.querySelector('#app')?.dataset.ecran ?? null,
      adresse: location.hash,
      titre: texte(document.querySelector('#app h1')),
      resume: texte(document.querySelector('.biblio-resume')),
      retour: texte(document.querySelector('#app a.lien-retour')),
      menu: Boolean(document.querySelector('#app [data-action="menu"]')),
      ranger: Boolean(document.querySelector('[data-action="ranger"]')),
      nouvelle: Boolean(document.querySelector('[data-action="nouvelle-categorie"]')),
      flottant: Boolean(document.querySelector('#app .bouton-flottant')),
      cartes: [...document.querySelectorAll('#app section.categorie')].map(s => ({
        id: s.dataset.categorie,
        nom: texte(s.querySelector('.categorie-nom b')),
        inclusion: texte(s.querySelector('.categorie-tete .inclusion')),
        puces: puces(s.querySelector('.categorie-tete')),
        ouverte: s.querySelector('[data-action="accordeon"]')?.getAttribute('aria-expanded'),
        modifier: s.querySelector('[data-action="modifier-categorie"]')?.getAttribute('aria-label'),
        objets: objets(s),
        derniere: derniere(s),
      })),
      choix: [...document.querySelectorAll('.gf-menu [data-action="choisir"]')].map(c => texte(c.querySelector('b'))),
      choisie: texte(document.querySelector('.gf-menu [data-action="choisir"][aria-current="true"] b')),
      crayons: [...document.querySelectorAll('.gf-menu [data-action="modifier-categorie"]')].map(c =>
        c.getAttribute('aria-label'),
      ),
      detail: texte(document.querySelector('#liste-titre')),
      detailObjets: liste ? objets(liste).map(o => o.nom) : [],
      detailDerniere: derniere(liste),
      modifierListe: texte(document.querySelector('.gf-liste-tete [data-action="modifier-categorie"]')),
      rangement: [...document.querySelectorAll('.rangement-liste > li')].map(li => ({
        nom: texte(li.querySelector('b')),
        monter: li.querySelector('[data-action="monter"]')?.getAttribute('aria-label'),
        descendre: li.querySelector('[data-action="descendre"]')?.getAttribute('aria-label'),
        monterInactif: li.querySelector('[data-action="monter"]')?.getAttribute('aria-disabled') === 'true',
        descendreInactif: li.querySelector('[data-action="descendre"]')?.getAttribute('aria-disabled') === 'true',
      })),
      annonce: texte(document.querySelector('#app [aria-live]')),
      focus: { action: document.activeElement?.dataset.action, id: document.activeElement?.dataset.id },
      sorties: window.sortiesDemandees ?? null,
    };
  })),
});

export const ordreStocke = async page =>
  ((await lireStockage(page)).bibliotheque?.categories ?? []).toSorted((x, y) => x.ordre - y.ordre).map(c => c.nom);
export const idDe = (vue, nom) => vue.cartes.find(c => c.nom === nom)?.id ?? null;
export const commande = (action, id) => `#app [data-action="${action}"][data-id="${id}"]`;

export async function toucheRetour(page) {
  await page.evaluate(() => window.toucheRetour());
  await calme(page);
}

// Menu → Réglages → Bibliothèque, depuis l'accueil. appareil : la taille et le pointeur, s'ils ne sont
// pas ceux du format (les formats du grand format, à 1920 px pour l'ordinateur) ; taille : une autre
// fenêtre (600 × 600).
export async function ouvrirBibliotheque(
  navigateur,
  url,
  format = 'telephone',
  { theme = 'light', donnees = DONNEES, maintenant, appareil = TOUS_FORMATS[format], taille: autreTaille } = {},
) {
  const { taille, ecran, tactile } = appareil;
  const ouvert = await ouvrir(navigateur, url, {
    taille: autreTaille ?? taille,
    ecran,
    tactile,
    theme,
    donnees,
    maintenant,
    adresse: '#/voyages',
  });
  const { page } = ouvert;
  await attendreEcran(page, 'voyages');
  await versBibliotheque(page);
  return ouvert;
}

// Depuis l'accueil (ou Réglages) : Menu → Réglages → Bibliothèque.
export async function versBibliotheque(page) {
  await page.click('[data-action="menu"]');
  await attendreQue(page, () => document.querySelector('dialog.tiroir[open]') !== null);
  await calme(page);
  await page.click(`dialog.tiroir .tiroir-lien:text-is("${fr.menu.reglages}")`);
  await attendreEcran(page, 'reglages');
  await page.click('#app a.reglage[href="#/bibliotheque"]');
  await attendreEcran(page, 'bibliotheque');
}

// Fin d'un essai : ni erreur dans la page, ni requête hors de l'appli.
export async function fermerEssai(juge, cas, { contexte, erreurs, sorties }) {
  juge.exige(erreurs.length === 0, `${cas} : erreurs dans la page : ${erreurs.join(' | ')}`);
  juge.exige(sorties.length === 0, `${cas} : requêtes hors de l’appli : ${sorties.join(', ')}`);
  await contexte.close();
}

// Attend que la liste du rangement montre cet ordre ; rend ce qu'on voit alors.
export async function attendreOrdre(page, attendu) {
  await attendreQue(
    page,
    noms =>
      [...document.querySelectorAll('.rangement-liste > li b')].map(el => el.textContent.trim()).join('|') === noms,
    attendu.join('|'),
  );
  await calme(page);
  return lire(page);
}
