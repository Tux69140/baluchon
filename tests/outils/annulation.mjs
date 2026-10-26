// Outils des tests d'écran du bandeau « Annuler » (tests/ecran-annulation*.mjs) : ouvrir la
// Bibliothèque avec l'horloge de la page simulée, supprimer un objet ou une catégorie depuis sa fiche,
// lire le bandeau (texte, place, cible de « Annuler »), et ce qu'il couvre.
import { attendreQue, calme } from './attente.mjs';
import { DONNEES as DONNEES_BIBLIOTHEQUE, TOUS_FORMATS, fr, versBibliotheque, vu } from './bibliotheque.mjs';
import {
  FICHE,
  attendreFermee,
  bibliothequeStockee,
  ouvrirFicheCategorie,
  ouvrirFicheObjet,
  toucher,
} from './fiches.mjs';
import { attendreEcran, ouvrir } from './page.mjs';
import { DONNEES as DONNEES_VOYAGE } from './voyage-essai.mjs';

export const a = fr.annulation;
const BANDEAU = '.bandeau-annuler';
const QUESTION = 'dialog[role="alertdialog"]';
// Des voyages (l'accueil a son bouton flottant, un voyage à ouvrir) et la bibliothèque de départ,
// installée par l'appli.
export const DONNEES = { ...DONNEES_VOYAGE, ...DONNEES_BIBLIOTHEQUE };

// La Bibliothèque, par Menu → Réglages, l'horloge de la page simulée dès le chargement : elle court
// d'elle-même, et le test l'arrête quand il veut mesurer les 10 s.
export async function ouvrirAvecHorloge(navigateur, url, format, { theme = 'light', donnees = DONNEES } = {}) {
  const { taille, ecran, tactile } = TOUS_FORMATS[format];
  const ouvert = await ouvrir(navigateur, url, {
    taille,
    ecran,
    tactile,
    theme,
    donnees,
    adresse: '#/voyages',
    horloge: true,
  });
  // Une commande attendue qui ne vient pas fait buter l'essai vite, sans attendre 30 s.
  ouvert.page.setDefaultTimeout(5000);
  await attendreEcran(ouvert.page, 'voyages');
  await versBibliotheque(ouvert.page);
  return ouvert;
}

// La bibliothèque gardée, objets et étiquettes rangés par id : un objet rétabli seul peut revenir à
// une autre place de lecture (les modèles n'ont pas de rang ; chaque écran les range par nom).
export async function empreinte(page) {
  const b = await bibliothequeStockee(page);
  const parId = liste => [...liste].sort((x, y) => x.id.localeCompare(y.id));
  return vu({ ...b, objets: parId(b.objets), etiquettes: parId(b.etiquettes) });
}

// Ce que montre le bandeau ; null s'il n'est pas affiché. hote : la page, ou la fenêtre qui
// l'accueille (fiche, question…) ; touchable : le milieu de « Annuler » est bien « Annuler » (rien ne
// le couvre) ; petitTexte : la plus petite taille de texte qu'il affiche.
export const lireBandeau = page =>
  page.evaluate(selecteur => {
    const b = document.querySelector(selecteur);
    if (!b?.matches(':popover-open')) return null;
    const cadre = el => {
      const { left, top, right, bottom, width, height } = el.getBoundingClientRect();
      return { left, top, right, bottom, width, height };
    };
    const bouton = b.querySelector('button');
    const r = bouton.getBoundingClientRect();
    const touche = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    const tailles = [...b.querySelectorAll('*')]
      .filter(el => [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()))
      .map(el => parseFloat(getComputedStyle(el).fontSize));
    const parent = b.parentElement;
    let hote = parent === document.body ? 'page' : 'autre';
    if (parent.matches('dialog.fiche-modele')) hote = 'fiche';
    else if (parent.matches('dialog[role="alertdialog"]')) hote = 'question';
    else if (parent.matches('dialog')) hote = 'fenetre';
    return {
      texte: b.querySelector('p').textContent,
      balises: b.querySelectorAll('p *').length,
      role: b.getAttribute('role'),
      place: b.dataset.place,
      hote,
      cadre: cadre(b),
      largeurEcran: innerWidth,
      hauteurEcran: innerHeight,
      bouton: {
        libelle: bouton.textContent.trim(),
        inactif: bouton.getAttribute('aria-disabled') === 'true',
        ...cadre(bouton),
      },
      touchable: bouton.contains(touche),
      petitTexte: Math.min(...tailles),
    };
  }, BANDEAU);

const attendreBandeau = page =>
  attendreQue(page, s => document.querySelector(s)?.matches(':popover-open') ?? false, BANDEAU);

export async function attendreSansBandeau(page) {
  const parti = await attendreQue(page, s => !document.querySelector(s), BANDEAU);
  await calme(page);
  return Boolean(parti);
}

// « Supprimer » de la fiche ouverte, puis « Supprimer » de la question ; rend quand la fiche est fermée
// et le bandeau affiché.
async function supprimerDepuisFiche(page) {
  await toucher(page, '[data-supprimer]');
  await attendreQue(page, q => document.querySelector(`${q}[open]`) !== null, QUESTION);
  await calme(page);
  await page.click(`${QUESTION} .fenetre-pied button:text-is("${fr.suppression.supprimer}")`);
  await attendreFermee(page, FICHE);
  await attendreBandeau(page);
  await calme(page);
}

export async function supprimerObjet(page, categorie, objet) {
  await ouvrirFicheObjet(page, categorie, objet);
  await supprimerDepuisFiche(page);
}

export async function supprimerCategorie(page, nom) {
  await ouvrirFicheCategorie(page, nom);
  await supprimerDepuisFiche(page);
}

export async function annuler(page, { double = false } = {}) {
  const bouton = `${BANDEAU} button`;
  if (double) await page.dblclick(bouton);
  else await page.click(bouton);
}

// Menu → Mes voyages.
export async function versMesVoyages(page) {
  await page.click('#app [data-action="menu"]');
  await attendreQue(page, () => document.querySelector('dialog.tiroir[open]') !== null);
  await calme(page);
  await page.click('dialog.tiroir a.tiroir-lien[href="#/voyages"]');
  await attendreEcran(page, 'voyages');
}

// Ce que le bandeau couvre. Fenêtre ouverte : les commandes qu'il rend intouchables (leur milieu est
// sous lui) ; sinon, tout ce qui est fixé au bas de l'écran (bouton flottant, boutons collés de
// l'assistant) et, la page et chaque panneau défilés jusqu'en bas, les lignes et commandes de l'écran
// qu'il touche, même d'un pixel (ou seulement ce que désigne seulement). Un panneau entier, qui va
// jusqu'au bas de l'écran, n'est pas une ligne.
export const couvert = (page, seulement = null) =>
  page.evaluate(
    ({ selecteur, seulement }) => {
      const b = document.querySelector(selecteur)?.getBoundingClientRect();
      if (!b) return ['pas de bandeau'];
      const fenetre = [...document.querySelectorAll('dialog:modal:not([data-fermeture])')].at(-1);
      if (!fenetre) {
        window.scrollTo(0, document.documentElement.scrollHeight);
        for (const el of document.querySelectorAll('#app *'))
          if (el.scrollHeight > el.clientHeight && /auto|scroll/.test(getComputedStyle(el).overflowY))
            el.scrollTop = el.scrollHeight;
      }
      const racine = fenetre ?? document.querySelector('#app');
      const quoi = seulement ?? (fenetre ? 'a, button, input' : 'a, button, input, li, h1, h2, p, section');
      const dedans = (x, y) => x > b.left && x < b.right && y > b.top && y < b.bottom;
      return [...racine.querySelectorAll(quoi)]
        .filter(el => !el.closest(selecteur) && !el.closest('dialog:not(:modal)') && !el.matches('.panneau'))
        .filter(el => {
          const r = el.getBoundingClientRect();
          if (!r.width || !r.height) return false;
          if (fenetre) return dedans(r.left + r.width / 2, r.top + r.height / 2);
          return !(r.right <= b.left || r.left >= b.right || r.bottom <= b.top || r.top >= b.bottom);
        })
        .map(
          el =>
            `${el.tagName.toLowerCase()} « ${(el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 30)} »`,
        );
    },
    { selecteur: BANDEAU, seulement },
  );
