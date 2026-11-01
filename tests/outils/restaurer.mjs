// Ce que partagent les tests d'écran de « Restaurer une sauvegarde… » (tests/ecran-restaurer.mjs : parcours
// réussis et formats ; tests/ecran-restaurer-refus.mjs : refus, pannes, fenêtre refermée) : la sauvegarde à
// restaurer, l'état de l'appareil au départ et les gestes sur la fenêtre de confirmation.
import assert from 'node:assert/strict';
import contrat from '../contrat/stockage.json' with { type: 'json' };
import { construireSauvegarde, lireSauvegarde } from '../../src/modele/sauvegarde.js';
import { DONNEES } from './annulation.mjs';
import { attendreQue, calme } from './attente.mjs';
import { fr } from './bibliotheque.mjs';
import { attendreEcran, ecrireStockage, lireStockage, ouvrir } from './page.mjs';

export const R = fr.reglages.sauvegarde;
export const Q = R.restauration;
const MAINTENANT = new Date('2026-10-31T18:40:00');
export const COPIE = 'baluchon-avant-restauration-2026-10-31-18h40.json';
export const DIALOGUE = 'dialog[role="alertdialog"]:not([data-fermeture])';
export const CHAMP = '[data-champ="fichier"]';
export const vu = e => JSON.stringify(e);
// La page rend les espaces insécables comme des espaces (lecture du texte) : on compare de même.
export const net = texte => texte.replace(/\s+/g, ' ');
const copie = x => JSON.parse(JSON.stringify(x));

// La sauvegarde à restaurer : 4 voyages d'autres noms et d'autres identifiants que ceux de l'appareil,
// et une bibliothèque de 312 objets.
export const NOMS = ['Alpes', 'Corse', 'Bretagne', 'Vosges'];
function sauvegardeAvecQuatreVoyages() {
  const bibliotheque = copie(contrat.bibliotheque);
  for (let i = 0; bibliotheque.objets.length < 312; i += 1)
    bibliotheque.objets.push({ ...copie(bibliotheque.objets[0]), id: `om-x${i}`, nom: `Objet ${i}` });
  const voyages = NOMS.map((nom, k) => {
    const v = JSON.parse(
      JSON.stringify(contrat.voyage)
        .replaceAll('v-vercors', `v-r${k}`)
        .replaceAll('"ev-', `"ev${k}-`)
        .replaceAll('"cv-', `"cv${k}-`)
        .replaceAll('"ov-', `"ov${k}-`),
    );
    v.voyage.nom = nom;
    return v;
  });
  return construireSauvegarde({ bibliotheque, voyages, langue: 'fr' }, '2026-10-12T21:15');
}
const SAUVEGARDE = sauvegardeAvecQuatreVoyages();
export const VALIDE = JSON.stringify(SAUVEGARDE);
export const FICHIERS_REFUSES = {
  abime: VALIDE.slice(0, VALIDE.length / 2),
  format: JSON.stringify({ format: 'autre-chose', version: 1 }),
  version: JSON.stringify({ ...SAUVEGARDE, version: 3 }),
};
const resume = lireSauvegarde(VALIDE);
assert.ok(resume.ok && resume.resume.voyages === 4 && resume.resume.objets === 312, 'la sauvegarde de l’essai');

// L'état de l'appareil au départ : les données de l'essai des annulations, dont les étiquettes de voyage reçoivent
// la date de modification que l'appli écrit toujours (sans elle, la copie serait refusée à la relecture).
const DEPART = {
  ...DONNEES,
  toucheRetour: true,
  etiquettesDuVoyage: DONNEES.etiquettesDuVoyage.map(e => ({ ...e, modifieLe: 'x' })),
};

export async function ouvrirReglages(navigateur, serveur, taille, { theme = 'light', adresse = '#/reglages' } = {}) {
  const ouvert = await ouvrir(navigateur, serveur.url, {
    taille,
    theme,
    maintenant: MAINTENANT,
    donnees: DEPART,
    adresse,
  });
  ouvert.page.setDefaultTimeout(6000);
  await attendreEcran(ouvert.page, adresse === '#/reglages' ? 'reglages' : 'voyages');
  return ouvert;
}

export const choisir = (page, texte, nom = 'sauvegarde.json') =>
  page.setInputFiles(CHAMP, { name: nom, mimeType: 'application/json', buffer: Buffer.from(texte) });
export const attendreFenetre = page =>
  attendreQue(page, q => document.querySelector(`${q}[open]`) !== null, DIALOGUE).then(() => calme(page));
// La fenêtre qui suit une autre prend sa place : on attend son titre.
export const attendreTitre = (page, titre) =>
  attendreQue(
    page,
    t =>
      [...document.querySelectorAll('dialog[role="alertdialog"]:not([data-fermeture])')].some(
        d => d.querySelector('h2')?.textContent.trim() === t,
      ),
    titre,
  ).then(() => calme(page));
export const attendreSansFenetre = page =>
  attendreQue(page, q => !document.querySelector(q), DIALOGUE).then(() => calme(page));

// Ce que dit la fenêtre ouverte.
export const lireFenetre = page =>
  page.evaluate(q => {
    const f = document.querySelector(q);
    if (!f) return null;
    return {
      titre: f.querySelector('h2')?.textContent.replace(/\s+/g, ' ').trim(),
      texte: f.textContent.replace(/\s+/g, ' '),
      html: [...f.querySelectorAll('p')].map(p => p.innerHTML),
      boutons: [...f.querySelectorAll('.fenetre-pied button')].map(b => ({
        libelle: b.textContent.trim(),
        classe: b.className,
        icone: Boolean(b.querySelector('svg')),
      })),
    };
  }, DIALOGUE);

export const fichiers = async page => (await lireStockage(page)).telechargements ?? [];
export const poser = async (page, cle, valeur) =>
  ecrireStockage(page, { ...(await lireStockage(page)), [cle]: valeur });
// Ce que les données de l'appareil contiennent (sans les fichiers déposés ni les pannes simulées).
export async function donneesDe(page) {
  const donnees = await lireStockage(page);
  for (const cle of ['telechargements', 'pannes', 'refus']) delete donnees[cle];
  return donnees;
}
export const ecran = page => page.evaluate(() => document.querySelector('#app').dataset.ecran);
export const cartes = page =>
  page.evaluate(() =>
    [...document.querySelectorAll('a.carte-voyage')].map(l => l.querySelector('.carte-voyage-nom')?.textContent),
  );
export const derniere = page => page.evaluate(() => localStorage.getItem('baluchon-derniere-sauvegarde'));
export const lireMessage = page =>
  page.evaluate(() => {
    const b = document.querySelector('.bandeau-annuler');
    return b?.matches(':popover-open')
      ? {
          texte: b.querySelector('p').textContent.replace(/\s+/g, ' ').trim(),
          bouton: Boolean(b.querySelector('button')),
        }
      : null;
  });
export const egales = (x, y) => {
  try {
    assert.deepEqual(x, y);
    return true;
  } catch {
    return false;
  }
};

// Choisit le fichier, attend la confirmation, répond.
export async function restaurerAvec(page, texte, cle) {
  await choisir(page, texte);
  await attendreFenetre(page);
  await page.click(`${DIALOGUE} button[data-cle="${cle}"]`);
  await attendreSansFenetre(page);
}

export const SUPPRIMER_VOYAGE = 'v2';
// Supprime un voyage depuis sa carte : le bandeau « Annuler » de la phase 11 reste affiché.
export async function supprimerVoyageDeCarte(page, id) {
  await page.click(`li.carte-avec-actions:has(> a.carte-voyage[href="#/voyage/${id}"]) > .menu-voyage-bouton`);
  await attendreQue(page, () => document.querySelector('.menu-voyage:popover-open') !== null);
  await page.click('.menu-voyage:popover-open [data-menu="supprimer"]');
  await attendreFenetre(page);
  await page.click(`${DIALOGUE} .fenetre-pied button:text-is("${fr.suppression.supprimer}")`);
  await attendreSansFenetre(page);
  await attendreQue(page, () => document.querySelector('.bandeau-annuler')?.matches(':popover-open') ?? false);
}
export const versReglages = async page => {
  await page.evaluate(() => (location.hash = '#/reglages'));
  await attendreEcran(page, 'reglages');
};
