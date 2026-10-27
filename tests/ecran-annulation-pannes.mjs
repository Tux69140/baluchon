// Phase 7, relecture finale (constats M1 et M2) : le bandeau « Annuler » face aux pannes, l'horloge de
// la page simulée (page.clock). Téléphone étroit, Bibliothèque de départ.
// - M1 : « Annuler » touché à 9,9 s, rétablissement lent qui tombe en panne : le bandeau ne s'en va pas
//   pendant le rétablissement (« Annuler » inactif) ; la panne dite, il reste encore le temps de lire
//   le message (6 s), « Annuler » de nouveau actif, puis s'en va ;
// - M2 : une suppression qui tombe en panne laisse le bandeau de la précédente, actif, posé sous le
//   message de la panne (capture dans captures-travail/), et son « Annuler » rend l'élément ; pendant une suppression lente, « Annuler » est inactif ; réussie, son
//   bandeau remplace le précédent.
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { chromium } from 'playwright';
import {
  a,
  annuler,
  attendreSansBandeau,
  empreinte,
  lireBandeau,
  ouvrirAvecHorloge,
  supprimerObjet,
} from './outils/annulation.mjs';
import { attendreQue, calme } from './outils/attente.mjs';
import { fermerEssai, fr, remplir, vu } from './outils/bibliotheque.mjs';
import { libererEcritures } from './outils/etiquettes.mjs';
import { attendreFermee, ouvrirFicheObjet, toucher } from './outils/fiches.mjs';
import { CAPTURES, creerJuge, ecrireStockage, lireStockage } from './outils/page.mjs';
import { demarrerServeur } from './outils/serveur.mjs';

const juge = creerJuge();
const serveur = await demarrerServeur();
const navigateur = await chromium.launch();
const FORMAT = 'telephone-etroit';
const QUESTION = 'dialog[role="alertdialog"]';
const CREME = remplir(a.objet, { nom: 'Crème solaire' });

async function poser(page, cle, valeur) {
  await ecrireStockage(page, { ...(await lireStockage(page)), [cle]: valeur });
}

// La panne simulée est attendue : seule une autre erreur est une faute.
function fermer(cas, ouvert) {
  ouvert.erreurs.splice(0, Infinity, ...ouvert.erreurs.filter(e => !e.includes('Panne simulée')));
  return fermerEssai(juge, cas, ouvert);
}

const alerte = page =>
  page.evaluate(() => {
    const el = document.querySelector('.alerte-haut');
    return el?.matches(':popover-open') ? el.textContent.trim() : null;
  });

// Sans attendre que l'écran se calme : l'horloge arrêtée tient les images.
const bandeauParti = page => page.evaluate(() => document.querySelector('.bandeau-annuler') === null);

// M1. « Annuler » touché à 9,9 s, rétablissement lent puis refusé.
async function essaiFinDuDelai() {
  const cas = 'rétablissement en fin de délai';
  const ouvert = await ouvrirAvecHorloge(navigateur, serveur.url, FORMAT);
  const { page } = ouvert;
  await page.evaluate(() => {
    new MutationObserver(() => {
      if (document.querySelector('.bandeau-annuler') && !window.arriveeBandeau) window.arriveeBandeau = Date.now();
    }).observe(document.body, { childList: true, subtree: true });
  });
  await supprimerObjet(page, 'Toilette', 'Crème solaire');
  const sansCreme = await empreinte(page);
  await poser(page, 'lenteurs', ['retablirBibliotheque']);
  await poser(page, 'pannes', ['retablirBibliotheque']);
  const maintenant = (await page.evaluate(() => Date.now())) + 20;
  await page.clock.pauseAt(maintenant);
  const ecoule = maintenant - (await page.evaluate(() => window.arriveeBandeau));
  juge.exige(ecoule < 9000, `${cas} : le parcours a pris ${ecoule} ms, trop pour juger les 10 s`);
  await page.clock.runFor(Math.max(0, 9900 - ecoule));
  await annuler(page);
  await attendreQue(page, () => typeof window.debloquerStockage === 'function');
  await page.clock.runFor(600);
  const pendant = await lireBandeau(page);
  juge.exige(pendant?.texte === CREME && pendant.bouton.inactif, `${cas} : à 10,5 s ${vu(pendant)}`);
  await libererEcritures(page);
  await attendreQue(page, () => document.querySelector('.alerte-haut') !== null);
  const apres = await lireBandeau(page);
  juge.exige(
    (await alerte(page)) === a.erreur &&
      apres?.texte === CREME &&
      !apres.bouton.inactif &&
      (await empreinte(page)) === sansCreme,
    `${cas} : panne ${vu({ alerte: await alerte(page), bandeau: apres })}`,
  );
  await page.clock.runFor(5900);
  juge.exige((await lireBandeau(page))?.texte === CREME, `${cas} : parti avant la fin du message`);
  await page.clock.runFor(300);
  juge.exige(
    (await bandeauParti(page)) && (await alerte(page)) === null,
    `${cas} : encore là 6,2 s après la panne ${vu({ bandeau: await lireBandeau(page), alerte: await alerte(page) })}`,
  );
  await page.clock.resume();
  await fermer(cas, ouvert);
}

// « Supprimer » de la fiche de Dentifrice, puis de sa question.
async function supprimerDentifrice(page) {
  await ouvrirFicheObjet(page, 'Toilette', 'Dentifrice');
  await toucher(page, '[data-supprimer]');
  await attendreQue(page, q => document.querySelector(`${q}[open]`) !== null, QUESTION);
  await calme(page);
  await page.click(`${QUESTION} .fenetre-pied button:text-is("${fr.suppression.supprimer}")`);
}

// M2. Une suppression en panne garde le bandeau de la précédente ; une suppression lente le rend
// inactif, puis le remplace.
async function essaiPanneSuivante() {
  const cas = 'suppression suivante en panne';
  const ouvert = await ouvrirAvecHorloge(navigateur, serveur.url, FORMAT);
  const { page } = ouvert;
  const avant = await empreinte(page);
  await supprimerObjet(page, 'Toilette', 'Crème solaire');
  await poser(page, 'pannes', ['supprimerObjet']);
  await supprimerDentifrice(page);
  await attendreQue(page, () => document.querySelector('.alerte-haut') !== null);
  await calme(page);
  const reste = await lireBandeau(page);
  juge.exige(
    (await alerte(page)) === fr.suppression.erreur &&
      reste?.texte === CREME &&
      !reste.bouton.inactif &&
      reste.touchable,
    `${cas} : après la panne ${vu({ alerte: await alerte(page), bandeau: reste })}`,
  );
  await mkdir(CAPTURES, { recursive: true });
  await page.screenshot({ path: join(CAPTURES, `annulation-sous-le-message-${FORMAT}.png`) });
  await poser(page, 'pannes', []);
  if (!reste) return fermer(cas, ouvert);
  await annuler(page);
  juge.exige(
    (await attendreSansBandeau(page)) && (await empreinte(page)) === avant,
    `${cas} : « Annuler » ne rend pas Crème solaire`,
  );
  await toucher(page, '.bouton-fermer');
  await attendreFermee(page);

  await supprimerObjet(page, 'Toilette', 'Crème solaire');
  await poser(page, 'lenteurs', ['supprimerObjet']);
  await supprimerDentifrice(page);
  await attendreQue(page, () => typeof window.debloquerStockage === 'function');
  const pendant = await lireBandeau(page);
  juge.exige(pendant?.texte === CREME && pendant.bouton.inactif, `${cas} : pendant l'écriture ${vu(pendant)}`);
  await libererEcritures(page);
  await poser(page, 'lenteurs', []);
  await attendreFermee(page);
  await attendreQue(page, () => document.querySelector('.bandeau-annuler p')?.textContent.includes('Dentifrice'));
  const remplace = await lireBandeau(page);
  juge.exige(
    remplace?.texte === remplir(a.objet, { nom: 'Dentifrice' }) && !remplace.bouton.inactif,
    `${cas} : bandeau de Dentifrice ${vu(remplace)}`,
  );
  await fermer(cas, ouvert);
}

try {
  await essaiFinDuDelai();
  await essaiPanneSuivante();
} finally {
  await navigateur.close();
  await serveur.fermer();
}
juge.conclure(
  'Bandeau « Annuler » et pannes',
  'pas de fin de délai pendant un rétablissement, panne dite ; une suppression en panne garde le bandeau précédent',
);
