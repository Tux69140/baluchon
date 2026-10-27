// Phase 7, relecture finale (constat I1) : « Annuler » touché pendant « Nouveau voyage » (le bandeau
// suit d'un écran à l'autre) rend l'élément à l'assistant ouvert, sans perdre aucune réponse déjà
// donnée (nom, dates, étiquettes choisies, étape en cours).
// - catégorie Papiers supprimée dans la Bibliothèque, « Nouveau voyage », nom et dates, Randonnée
//   choisie à l'étape Activités, « Annuler » : on reste sur Activités, Randonnée choisie, et l'aperçu
//   montre Papiers ; le voyage créé la contient (téléphone étroit, tablette en paysage) ;
// - groupe Hébergement supprimé dans les Étiquettes, « Nouveau voyage » jusqu'à l'étape Climat, Plage
//   et Chaud choisies, « Annuler » : l'étape Hébergement revient dans la rangée, on reste sur Climat,
//   Chaud choisie ; Activités garde Plage ; le nom reste (capture dans captures-travail/).
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { chromium } from 'playwright';
import { attendreSansBandeau, lireBandeau, ouvrirAvecHorloge, supprimerCategorie } from './outils/annulation.mjs';
import { attendreQue, calme } from './outils/attente.mjs';
import { creerDepuisLAssistant, etapeAffichee, ligneObjet } from './outils/assistant.mjs';
import { fermerEssai, fr, vu } from './outils/bibliotheque.mjs';
import { ouvrirEtiquettes } from './outils/etiquettes.mjs';
import { attendreFermee } from './outils/fiches.mjs';
import { CAPTURES, attendreEcran, creerJuge, lireStockage } from './outils/page.mjs';
import { demarrerServeur } from './outils/serveur.mjs';
import { QUESTION, attendreQuestion, ouvrirFicheDe, repondre, toucherSupprimer } from './outils/suppressions.mjs';

const juge = creerJuge();
const serveur = await demarrerServeur();
const navigateur = await chromium.launch();
const NOM = 'Vercors';

// Menu → Nouveau voyage, puis le nom et deux dates du mois affiché.
async function versAssistant(page) {
  await page.click('#app [data-action="menu"]');
  await attendreQue(page, () => document.querySelector('dialog.tiroir[open]') !== null);
  await calme(page);
  await page.click('dialog.tiroir a.tiroir-lien[href="#/nouveau-voyage"]');
  await attendreEcran(page, 'nouveau-voyage');
  await page.fill('#nom', NOM);
  const jours = page.locator('.calendrier [data-jour]:not([aria-disabled="true"])');
  await jours.nth(0).click();
  await jours.nth(2).click();
}

// « Suivant » : l'étape d'après, l'écran calmé.
async function suivant(page) {
  await page.click('[data-action="suivant"]');
  await calme(page);
}

// L'assistant tel qu'on le voit : la rangée des étapes, l'étape en cours, ce qui y est choisi, le nom.
const lireAssistant = page =>
  page.evaluate(() => {
    const texte = el => el?.textContent.replace(/\s+/g, ' ').trim() ?? null;
    return {
      rangee: [...document.querySelectorAll('.etapes [data-aller]')].map(texte),
      titre: texte(document.querySelector('#titre-etape')),
      choisies: [...document.querySelectorAll('[data-etiquette][aria-pressed="true"]')].map(texte),
      nom: document.querySelector('#nom')?.value ?? null,
    };
  });

async function annuler(page) {
  await page.click('.bandeau-annuler button');
  return attendreSansBandeau(page);
}

// 1. Une catégorie revenue : l'aperçu la montre, le voyage la contient.
async function essaiCategorie(format) {
  const cas = `catégorie Papiers revenue (${format})`;
  const ouvert = await ouvrirAvecHorloge(navigateur, serveur.url, format);
  const { page } = ouvert;
  await supprimerCategorie(page, 'Papiers');
  await versAssistant(page);
  await suivant(page);
  await page.click('[data-etiquette]:has-text("Randonnée")');
  await calme(page);
  const avant = await lireAssistant(page);
  juge.exige(
    (await lireBandeau(page)) !== null && vu(avant.choisies) === vu(['Randonnée']),
    `${cas} : avant ${vu(avant)}`,
  );
  juge.exige(await annuler(page), `${cas} : le bandeau reste`);
  await attendreQue(page, () =>
    JSON.parse(localStorage.getItem('baluchon-essai')).bibliotheque.categories.some(c => c.nom === 'Papiers'),
  );
  await calme(page);
  const apres = await lireAssistant(page);
  juge.exige(vu(apres) === vu(avant), `${cas} : réponses perdues ${vu({ avant, apres })}`);
  await page.click('[data-action="apercu"]');
  await page.waitForSelector('.formulaire-corps[data-etape="apercu"]');
  await calme(page);
  const montre = await ligneObjet(page, 'Pièce d’identité').count();
  juge.exige(montre === 1, `${cas} : l'aperçu ne montre pas Papiers`);
  await creerDepuisLAssistant(page);
  await attendreEcran(page, 'voyage');
  const d = await lireStockage(page);
  const voyage = d.voyages.find(v => v.nom === NOM);
  const categories = d.categoriesDuVoyage.filter(c => c.voyageId === voyage?.id).map(c => c.nom);
  juge.exige(categories.includes('Papiers'), `${cas} : le voyage n'a pas Papiers ${vu(categories)}`);
  await fermerEssai(juge, cas, ouvert);
}

// 2. Un groupe revenu : son étape revient dans la rangée, les réponses restent.
async function essaiGroupe() {
  const cas = 'groupe Hébergement revenu';
  const ouvert = await ouvrirEtiquettes(navigateur, serveur.url, 'telephone-etroit');
  const { page } = ouvert;
  await ouvrirFicheDe(page, 'groupe', 'Hébergement');
  await toucherSupprimer(page);
  await attendreQuestion(page);
  await repondre(page, QUESTION, fr.suppression.supprimer);
  await attendreFermee(page, 'dialog.fiche-nom');
  await versAssistant(page);
  await suivant(page);
  await page.click('[data-etiquette]:has-text("Plage")');
  await suivant(page);
  await page.click('[data-etiquette]:has-text("Chaud")');
  await calme(page);
  const avant = await lireAssistant(page);
  juge.exige(
    avant.titre === 'Climat' && !avant.rangee.some(e => e.includes('Hébergement')),
    `${cas} : avant ${vu(avant)}`,
  );
  juge.exige(await annuler(page), `${cas} : le bandeau reste`);
  await attendreQue(page, () => document.querySelectorAll('.etapes [data-aller]').length === 5);
  await calme(page);
  const apres = await lireAssistant(page);
  juge.exige(
    apres.titre === 'Climat' &&
      vu(apres.choisies) === vu(['Chaud']) &&
      apres.nom === NOM &&
      apres.rangee.length === 5 &&
      apres.rangee.some(e => e.includes('Hébergement')),
    `${cas} : après ${vu(apres)}`,
  );
  await mkdir(CAPTURES, { recursive: true });
  await page.screenshot({ path: join(CAPTURES, 'assistant-groupe-revenu-telephone-etroit.png') });
  await page.click('[data-action="precedent"]');
  await calme(page);
  const activites = await lireAssistant(page);
  const etape = await etapeAffichee(page);
  juge.exige(
    etape.titre === 'Activités' && vu(activites.choisies) === vu(['Plage']),
    `${cas} : Activités ${vu(activites)}`,
  );
  await fermerEssai(juge, cas, ouvert);
}

try {
  for (const format of ['telephone-etroit', 'tablette-paysage']) await essaiCategorie(format);
  await essaiGroupe();
} finally {
  await navigateur.close();
  await serveur.fermer();
}
juge.conclure(
  '« Annuler » pendant « Nouveau voyage »',
  'catégorie et groupe revenus dans l’assistant ouvert, sans perdre nom, dates, étiquettes choisies ni étape',
);
