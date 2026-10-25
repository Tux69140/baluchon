// Phase 5 (docs/PLAN.md) : les fiches de la Bibliothèque à chaque format de la phase, en clair et en
// sombre (maquette validée le 2026-10-25, docs/maquettes/bibliotheque/) : fiche de Camping, son
// catalogue, fiche de Repas, nouvel objet refusé (sans nom ni quantité), question d'abandon, panne
// d'écriture. Chaque fois : cibles de 44 px (la fiche est dans l'écran), pas de défilement de côté, la
// fiche dans l'écran ; captures fiche-categorie-…, catalogue-…, fiche-objet-…, refus-…, abandon-…,
// panne-… dans captures-travail/.
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { chromium } from 'playwright';
import { calme } from './outils/attente.mjs';
import { attendreQuestion, repondre } from './outils/assistant.mjs';
import { demarrerServeur } from './outils/serveur.mjs';
import {
  DONNEES,
  TOUS_FORMATS,
  fermerEssai,
  ouvrirBibliotheque as ouvrirLaBibliotheque,
  vu,
} from './outils/bibliotheque.mjs';
import {
  CATALOGUE,
  FICHE,
  attendreFermee,
  attendreOuverte,
  enregistrer,
  lireFiche,
  m,
  ouvrirFicheCategorie,
  ouvrirFicheObjet,
  ouvrirNouvelObjet,
  saisir,
  toucher,
} from './outils/fiches.mjs';
import { CAPTURES, NOMS_THEME, creerJuge, verifierCommandes } from './outils/page.mjs';

const juge = creerJuge();
const serveur = await demarrerServeur();
const navigateur = await chromium.launch();
const fermer = (cas, ouvert) => fermerEssai(juge, cas, ouvert);

// La fenêtre du dessus tient dans l'écran.
async function verifierDansLEcran(page, cas, selecteur) {
  const r = await page.evaluate(s => {
    const d = [...document.querySelectorAll(s)].at(-1)?.getBoundingClientRect();
    return d && { haut: d.top, bas: d.bottom, gauche: d.left, droite: d.right, l: innerWidth, h: innerHeight };
  }, selecteur);
  juge.exige(
    r && r.haut >= 0 && r.gauche >= 0 && r.bas <= r.h + 0.5 && r.droite <= r.l + 0.5,
    `${cas} : la fenêtre sort de l'écran ${vu(r)}`,
  );
}

async function capturer(page, nom, format, theme, selecteur = FICHE) {
  const cas = `${nom}, ${format}, ${NOMS_THEME[theme]}`;
  await page.mouse.move(0, 0);
  await calme(page);
  await verifierCommandes(page, juge, cas);
  await verifierDansLEcran(page, cas, selecteur);
  await page.screenshot({ path: join(CAPTURES, `${nom}-${format}-${NOMS_THEME[theme]}.png`) });
}

async function essaiFormat(format, theme) {
  const cas = `${format}, ${NOMS_THEME[theme]}`;
  // La panne n'empêche que l'écriture d'un objet : tout le reste se lit et s'ouvre.
  const ouvert = await ouvrirLaBibliotheque(navigateur, serveur.url, format, {
    theme,
    donnees: { ...DONNEES, pannes: ['enregistrerObjet'] },
  });
  const { page } = ouvert;

  juge.exige(await ouvrirFicheCategorie(page, 'Camping'), `${cas} : fiche de Camping`);
  await capturer(page, 'fiche-categorie', format, theme);
  await toucher(page, '[data-action="catalogue"]');
  juge.exige(await attendreOuverte(page, CATALOGUE), `${cas} : catalogue`);
  await capturer(page, 'catalogue', format, theme, CATALOGUE);
  await page.click(`${CATALOGUE} .bouton-fermer`);
  await attendreFermee(page, CATALOGUE);
  await page.click(`${FICHE} .bouton-fermer`);
  juge.exige(await attendreFermee(page), `${cas} : la fiche de Camping non modifiée reste ouverte`);

  juge.exige(await ouvrirFicheObjet(page, 'Alimentation', 'Repas'), `${cas} : fiche de Repas`);
  await capturer(page, 'fiche-objet', format, theme);
  // Repas modifié, × : la question d'abandon ; « Continuer la saisie ».
  await toucher(page, '[data-pas="valeur"][data-sens="1"]');
  await page.click(`${FICHE} .bouton-fermer`);
  juge.exige((await attendreQuestion(page))?.titre === m.abandon.titre, `${cas} : question d'abandon`);
  await page.mouse.move(0, 0);
  await calme(page);
  await page.screenshot({ path: join(CAPTURES, `abandon-${format}-${NOMS_THEME[theme]}.png`) });
  await repondre(page, m.abandon.continuer);
  // Panne : « Enregistrer » ; le message par-dessus, la fiche ouverte avec sa saisie.
  await enregistrer(page);
  const alerte = await page.evaluate(() => document.querySelector('.alerte-haut')?.matches(':popover-open'));
  juge.exige(alerte && (await lireFiche(page))?.valeur === '3', `${cas} : panne ${vu(alerte)}`);
  await capturer(page, 'panne', format, theme);
  await page.click(`${FICHE} .bouton-fermer`);
  await attendreQuestion(page);
  await repondre(page, m.abandon.abandonner);
  await attendreFermee(page);

  juge.exige(await ouvrirNouvelObjet(page, 'Alimentation'), `${cas} : nouvel objet`);
  await saisir(page, 'input[data-nombre="valeur"]', '');
  await enregistrer(page);
  const refus = await lireFiche(page);
  juge.exige(
    vu(refus?.erreurs) === vu([m.objet.erreurs.nomManquant, m.objet.erreurs.valeurManquante]),
    `${cas} : refus ${vu(refus?.erreurs)}`,
  );
  await capturer(page, 'refus', format, theme);
  ouvert.erreurs.splice(0, Infinity, ...ouvert.erreurs.filter(e => !e.includes('Panne simulée')));
  await fermer(cas, ouvert);
}

try {
  await mkdir(CAPTURES, { recursive: true });
  for (const theme of ['light', 'dark'])
    for (const format of Object.keys(TOUS_FORMATS)) await essaiFormat(format, theme);
} finally {
  await navigateur.close();
  await serveur.fermer();
}
juge.conclure('Fiches, formats', `${Object.keys(TOUS_FORMATS).length} formats × 2 thèmes, captures`);
