// Phase 12, tâche 6 (docs/superpowers/specs/2026-10-31-phase-12-reglages-sauvegarde-design.md, « Restaurer » ;
// maquette validée le 2026-10-31, docs/maquettes/reglages/) : « Restaurer une sauvegarde… » de Réglages.
// - Fichier valide (4 voyages, 312 objets, créé le 12 octobre 2026 à 21 h 15) : la fenêtre « Restaurer la
//   sauvegarde du 12 octobre 2026, 21 h 15 ? », « Garder mes données » d'abord, « Restaurer » en rouge ;
//   « Garder » ne change rien et ne dépose rien ; choisir le même fichier une seconde fois rouvre la fenêtre
//   (le champ est vidé après lecture) ; annuler le sélecteur ne fait rien ;
// - « Restaurer » : la copie « avant restauration » est déposée d'abord, relue, égale à l'état d'avant ; puis
//   Mes voyages montre les 4 voyages et le bandeau « Sauvegarde du … restaurée. » ; le bandeau « Annuler » d'une
//   suppression de voyage affiché avant a disparu, et rien n'est rétabli ; la date de dernière sauvegarde ne
//   change pas ; la touche retour y quitte l'appli ;
// - restaurer ensuite la copie ramène l'état d'avant (coches, quantités), et Sauvegarder redonne le même contenu ;
// - refus (tronqué, autre format, version 2) : « Restauration impossible » ;
// - copie préalable refusée : « Accès aux fichiers refusé » (texte : « Restaurer une sauvegarde… »), rien remplacé, puis témoin ;
// - pannes (lecture de la copie, remplacement) : « La restauration n'a pas abouti », données inchangées ; la panne levée, elle réussit (témoin) ;
// - disposition : cibles de 44 px, clair et sombre, aux cinq formats ; captures restaurer-….
// Le thème du bureau Debian n'est jamais touché : seul emulateMedia de Playwright change de thème.
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { chromium } from 'playwright';
import contrat from './contrat/stockage.json' with { type: 'json' };
import { construireSauvegarde, lireSauvegarde } from '../src/modele/sauvegarde.js';
import { DONNEES, a, lireBandeau } from './outils/annulation.mjs';
import { attendreQue, calme } from './outils/attente.mjs';
import { fr, remplir, toucheRetour } from './outils/bibliotheque.mjs';
import {
  CAPTURES,
  FORMATS,
  NOMS_THEME,
  attendreEcran,
  creerJuge,
  ecrireStockage,
  lireStockage,
  ouvrir,
  verifierCommandes,
} from './outils/page.mjs';
import { demarrerServeur } from './outils/serveur.mjs';

const R = fr.reglages.sauvegarde;
const Q = R.restauration;
const MAINTENANT = new Date('2026-10-31T18:40:00');
const COPIE = 'baluchon-avant-restauration-2026-10-31-18h40.json';
const DIALOGUE = 'dialog[role="alertdialog"]:not([data-fermeture])';
const CHAMP = '[data-champ="fichier"]';
const vu = e => JSON.stringify(e);
// La page rend les espaces insécables comme des espaces (lecture du texte) : on compare de même.
const net = texte => texte.replace(/\s+/g, ' ');
const copie = x => JSON.parse(JSON.stringify(x));

// La sauvegarde à restaurer : 4 voyages d'autres noms et d'autres identifiants que ceux de l'appareil,
// et une bibliothèque de 312 objets.
const NOMS = ['Alpes', 'Corse', 'Bretagne', 'Vosges'];
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
const VALIDE = JSON.stringify(SAUVEGARDE);
const FICHIERS_REFUSES = {
  abime: VALIDE.slice(0, VALIDE.length / 2),
  format: JSON.stringify({ format: 'autre-chose', version: 1 }),
  version: JSON.stringify({ ...SAUVEGARDE, version: 2 }),
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

const juge = creerJuge();
const serveur = await demarrerServeur();
const navigateur = await chromium.launch();

async function ouvrirReglages(taille, { theme = 'light', adresse = '#/reglages' } = {}) {
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

const choisir = (page, texte, nom = 'sauvegarde.json') =>
  page.setInputFiles(CHAMP, { name: nom, mimeType: 'application/json', buffer: Buffer.from(texte) });
const attendreFenetre = page =>
  attendreQue(page, q => document.querySelector(`${q}[open]`) !== null, DIALOGUE).then(() => calme(page));
// La fenêtre qui suit une autre prend sa place : on attend son titre.
const attendreTitre = (page, titre) =>
  attendreQue(
    page,
    t =>
      [...document.querySelectorAll('dialog[role="alertdialog"]:not([data-fermeture])')].some(
        d => d.querySelector('h2')?.textContent.trim() === t,
      ),
    titre,
  ).then(() => calme(page));
const attendreSansFenetre = page =>
  attendreQue(page, q => !document.querySelector(q), DIALOGUE).then(() => calme(page));

// Ce que dit la fenêtre ouverte.
const lireFenetre = page =>
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

const fichiers = async page => (await lireStockage(page)).telechargements ?? [];
const poser = async (page, cle, valeur) => ecrireStockage(page, { ...(await lireStockage(page)), [cle]: valeur });
// Ce que les données de l'appareil contiennent (sans les fichiers déposés ni les pannes simulées).
async function donneesDe(page) {
  const donnees = await lireStockage(page);
  for (const cle of ['telechargements', 'pannes', 'refus']) delete donnees[cle];
  return donnees;
}
const ecran = page => page.evaluate(() => document.querySelector('#app').dataset.ecran);
const cartes = page =>
  page.evaluate(() =>
    [...document.querySelectorAll('a.carte-voyage')].map(l => l.querySelector('.carte-voyage-nom')?.textContent),
  );
const derniere = page => page.evaluate(() => localStorage.getItem('baluchon-derniere-sauvegarde'));
const lireMessage = page =>
  page.evaluate(() => {
    const b = document.querySelector('.bandeau-annuler');
    return b?.matches(':popover-open')
      ? {
          texte: b.querySelector('p').textContent.replace(/\s+/g, ' ').trim(),
          bouton: Boolean(b.querySelector('button')),
        }
      : null;
  });
const egales = (x, y) => {
  try {
    assert.deepEqual(x, y);
    return true;
  } catch {
    return false;
  }
};

// Choisit le fichier, attend la confirmation, répond.
async function restaurerAvec(page, texte, cle) {
  await choisir(page, texte);
  await attendreFenetre(page);
  await page.click(`${DIALOGUE} button[data-cle="${cle}"]`);
  await attendreSansFenetre(page);
}

const SUPPRIMER_VOYAGE = 'v2';
// Supprime un voyage depuis sa carte : le bandeau « Annuler » de la phase 11 reste affiché.
async function supprimerVoyageDeCarte(page, id) {
  await page.click(`li.carte-avec-actions:has(> a.carte-voyage[href="#/voyage/${id}"]) > .menu-voyage-bouton`);
  await attendreQue(page, () => document.querySelector('.menu-voyage:popover-open') !== null);
  await page.click('.menu-voyage:popover-open [data-menu="supprimer"]');
  await attendreFenetre(page);
  await page.click(`${DIALOGUE} .fenetre-pied button:text-is("${fr.suppression.supprimer}")`);
  await attendreSansFenetre(page);
  await attendreQue(page, () => document.querySelector('.bandeau-annuler')?.matches(':popover-open') ?? false);
}
const versReglages = async page => {
  await page.evaluate(() => (location.hash = '#/reglages'));
  await attendreEcran(page, 'reglages');
};

// 1. Le parcours complet.
async function essaiParcours(format, taille) {
  const cas = `parcours (${format})`;
  const { page, contexte, erreurs, sorties } = await ouvrirReglages(taille, { adresse: '#/voyages' });
  const avantTout = await donneesDe(page);
  await supprimerVoyageDeCarte(page, SUPPRIMER_VOYAGE);
  const bandeauAvant = await lireBandeau(page);
  juge.exige(
    bandeauAvant?.texte === remplir(a.voyage, { nom: avantTout.voyages.find(v => v.id === SUPPRIMER_VOYAGE).nom }),
    `${cas} : bandeau de suppression ${vu(bandeauAvant)}`,
  );
  await versReglages(page);
  const avant = await donneesDe(page);
  const dateAvant = await derniere(page);

  // Le fichier valide : la confirmation.
  const champ = await page.$eval(CHAMP, c => ({ accept: c.accept, type: c.type, cache: c.offsetParent === null }));
  juge.exige(
    champ.accept === '.json,application/json' && champ.type === 'file' && champ.cache,
    `${cas} : champ ${vu(champ)}`,
  );
  await choisir(page, VALIDE);
  await attendreFenetre(page);
  const f = await lireFenetre(page);
  juge.exige(
    f.titre === net(remplir(Q.titre, { date: '12 octobre 2026, 21 h 15' })) &&
      f.titre === 'Restaurer la sauvegarde du 12 octobre 2026, 21 h 15 ?' &&
      f.texte.includes('Elle contient 4 voyages et une bibliothèque de 312 objets.') &&
      f.html[0].includes('<b>4&nbsp;voyages</b>') &&
      f.html[0].includes('<b>312&nbsp;objets</b>') &&
      f.texte.includes(net(Q.remplacement)) &&
      vu(f.boutons.map(b => b.libelle)) === vu([Q.garder, Q.restaurer]) &&
      f.boutons[1].classe.includes('bouton-danger') &&
      f.boutons[1].icone &&
      !f.boutons[0].classe.includes('bouton-danger'),
    `${cas} : confirmation ${vu(f)}`,
  );
  const vide = await page.$eval(CHAMP, c => c.value === '' && c.files.length === 0);
  juge.exige(vide, `${cas} : le champ fichier n'est pas vidé après lecture`);
  const focus = await page.evaluate(() => document.activeElement.textContent.trim());
  juge.exige(focus === Q.garder, `${cas} : le focus est sur « ${focus} », pas sur « ${Q.garder} »`);

  // « Garder mes données » : rien ne change.
  await page.click(`${DIALOGUE} button[data-cle="garder"]`);
  await attendreSansFenetre(page);
  juge.exige(
    (await fichiers(page)).length === 0 && egales(await donneesDe(page), avant) && (await ecran(page)) === 'reglages',
    `${cas} : « Garder » a changé quelque chose`,
  );
  const gardee = await lireBandeau(page);
  juge.exige(gardee !== null, `${cas} : « Garder » a retiré le bandeau « Annuler »`);

  // Annuler le sélecteur ne fait rien ; le même fichier une seconde fois rouvre la fenêtre.
  await page.setInputFiles(CHAMP, []);
  await calme(page);
  juge.exige(
    (await page.$(`${DIALOGUE}[open]`)) === null && erreurs.length === 0,
    `${cas} : annuler le sélecteur a fait quelque chose`,
  );
  await choisir(page, VALIDE);
  await attendreFenetre(page);
  juge.exige((await lireFenetre(page))?.titre === f.titre, `${cas} : la seconde fois, la fenêtre ne revient pas`);

  // « Restaurer ».
  await page.click(`${DIALOGUE} button[data-cle="restaurer"]`);
  await attendreSansFenetre(page);
  await attendreEcran(page, 'voyages');
  await attendreQue(
    page,
    () => document.querySelector('.bandeau-annuler p')?.textContent.includes('restaurée') ?? false,
  );
  await calme(page);
  const depots = await fichiers(page);
  const lue = depots.length === 1 ? lireSauvegarde(depots[0].texte) : null;
  juge.exige(
    depots.length === 1 && depots[0].nom === COPIE && lue?.ok === true,
    `${cas} : fichiers déposés ${vu(depots.map(d => d.nom))} ; lecture ${vu(depots[0] ? lireSauvegarde(depots[0].texte) : null).slice(0, 200)}`,
  );
  juge.exige(
    lue?.contenu?.voyages
      .map(v => v.voyage.id)
      .sort()
      .join() === 'v1,v3,v4' &&
      lue.contenu.voyages.find(v => v.voyage.id === 'v1').objets.find(o => o.id === 'o-rep').dansLeSac === 6,
    `${cas} : la copie n'est pas l'état d'avant (voyage supprimé compris)`,
  );
  const apres = await lireStockage(page);
  juge.exige(
    vu((await cartes(page)).sort()) === vu([...NOMS].sort()) &&
      apres.voyages.length === 4 &&
      apres.bibliotheque.objets.length === 312,
    `${cas} : Mes voyages ${vu(await cartes(page))}`,
  );
  const message = await lireMessage(page);
  juge.exige(
    message?.texte === 'Sauvegarde du 12 octobre 2026, 21 h 15 restaurée.' && message.bouton === false,
    `${cas} : bandeau ${vu(message)}`,
  );
  await toucheRetour(page);
  const quittees = await page.evaluate(() => window.sortiesDemandees);
  juge.exige(quittees === 1 && (await ecran(page)) === 'voyages', `${cas} : touche retour : ${quittees} sortie(s)`);
  juge.exige(
    (await derniere(page)) === dateAvant,
    `${cas} : la date de dernière sauvegarde a changé : ${dateAvant} -> ${await derniere(page)}`,
  );
  // Le bandeau « Annuler » d'avant n'est plus là : le temps qu'il lui restait ne le fait pas revenir, et
  // la suppression ne se défait pas (le voyage supprimé n'est pas dans les données restaurées).
  juge.exige(
    !(await cartes(page)).includes(avantTout.voyages.find(v => v.id === SUPPRIMER_VOYAGE).nom),
    `${cas} : le voyage supprimé est revenu`,
  );

  // Restaurer la copie « avant restauration » ramène l'état d'avant.
  await versReglages(page);
  await restaurerAvec(page, depots[0].texte, 'restaurer');
  await attendreEcran(page, 'voyages');
  await attendreQue(
    page,
    () => document.querySelector('.bandeau-annuler p')?.textContent.includes('restaurée') ?? false,
  );
  await calme(page);
  const retour = await donneesDe(page);
  juge.exige(
    egales(retour.objetsDuVoyage, avant.objetsDuVoyage) &&
      egales(retour.voyages.map(v => v.id).sort(), ['v1', 'v3', 'v4']) &&
      egales(retour.bibliotheque.objets.length, avant.bibliotheque.objets.length),
    `${cas} : la copie n'a pas ramené l'état d'avant`,
  );
  const deux = await fichiers(page);
  juge.exige(
    vu(deux.map(d => d.nom)) === vu([COPIE, COPIE.replace('.json', '-2.json')]) &&
      lireSauvegarde(deux[1].texte).ok &&
      lireSauvegarde(deux[1].texte).resume.voyages === 4,
    `${cas} : seconde copie ${vu(deux.map(d => d.nom))}`,
  );
  // Aller-retour : sauvegarder redonne le contenu de la copie, hors date de création.
  await versReglages(page);
  await page.click('[data-geste="sauvegarder"]');
  await attendreQue(page, () => document.querySelectorAll('.bandeau-annuler, .alerte-haut').length > 0);
  await attendreQue(page, () =>
    /\.json/.test(document.querySelector('.bandeau-annuler, .alerte-haut')?.textContent ?? ''),
  );
  const trois = await fichiers(page);
  const ancien = lireSauvegarde(depots[0].texte).contenu;
  const nouveau = lireSauvegarde(trois[2].texte).contenu;
  juge.exige(egales(nouveau, ancien), `${cas} : l'aller-retour n'est pas identique`);
  juge.exige(vu(sorties) === '[]', `${cas} : requêtes hors de l’appli : ${sorties.join(', ')}`);
  juge.exige(erreurs.length === 0, `${cas} : erreurs dans la page : ${erreurs.join(' | ')}`);
  await contexte.close();
}

// 2. Refus : tronqué, autre format, version 2.
async function essaiRefus() {
  const { page, contexte, erreurs } = await ouvrirReglages(FORMATS['tablette-paysage']);
  const avant = await donneesDe(page);
  for (const raison of ['abime', 'format', 'version']) {
    const cas = `refus ${raison}`;
    await choisir(page, FICHIERS_REFUSES[raison]);
    await attendreFenetre(page);
    const f = await lireFenetre(page);
    juge.exige(
      f.titre === Q.refus.titre &&
        f.texte.includes(net(Q.refus[raison])) &&
        f.texte.includes(Q.refus.rien) &&
        vu(f.boutons.map(b => b.libelle)) === vu([R.compris]) &&
        f.boutons[0].classe.includes('bouton-principal'),
      `${cas} : fenêtre ${vu(f)}`,
    );
    await page.click(`${DIALOGUE} button[data-cle="compris"]`);
    await attendreSansFenetre(page);
    juge.exige(
      (await fichiers(page)).length === 0 && egales(await donneesDe(page), avant) && (await ecran(page)) === 'reglages',
      `${cas} : quelque chose a changé`,
    );
  }
  juge.exige(erreurs.length === 0, `refus : erreurs dans la page : ${erreurs.join(' | ')}`);
  await contexte.close();
}

// 3. Copie préalable refusée, puis pannes : rien n'est remplacé ; la gêne levée, la restauration réussit.
async function essaiEchecs() {
  const { page, contexte, erreurs } = await ouvrirReglages(FORMATS['tablette-paysage']);
  const avant = await donneesDe(page);
  const intact = async cas => {
    juge.exige(
      egales(await donneesDe(page), avant) && (await fichiers(page)).length === 0 && (await ecran(page)) === 'reglages',
      `${cas} : les données ont changé ou un fichier est déposé`,
    );
  };

  await poser(page, 'refus', ['deposerFichier']);
  await choisir(page, VALIDE);
  await attendreFenetre(page);
  await page.click(`${DIALOGUE} button[data-cle="restaurer"]`);
  await attendreTitre(page, R.autorisation.titre);
  const refus = await lireFenetre(page);
  juge.exige(
    refus?.titre === R.autorisation.titre &&
      refus.texte.includes(net(R.autorisation.texte)) &&
      refus.texte.includes(net(Q.autorisationComment)) &&
      refus.texte.includes(Q.refusee) &&
      vu(refus.boutons.map(b => b.libelle)) === vu([R.compris]),
    `copie refusée : fenêtre ${vu(refus)}`,
  );
  await page.click(`${DIALOGUE} button[data-cle="compris"]`);
  await attendreSansFenetre(page);
  await intact('copie refusée');

  // Panne de la lecture de l'état actuel (la copie ne peut pas être faite) : rien n'est remplacé.
  await poser(page, 'refus', []);
  await poser(page, 'pannes', ['lireTout']);
  await choisir(page, VALIDE);
  await attendreFenetre(page);
  await page.click(`${DIALOGUE} button[data-cle="restaurer"]`);
  await attendreTitre(page, Q.panne.titre);
  let panne = await lireFenetre(page);
  juge.exige(
    panne?.titre === Q.panne.titre &&
      panne.texte.includes(net(Q.panne.texte)) &&
      vu(panne.boutons.map(b => b.libelle)) === vu([R.compris]),
    `panne de lecture : fenêtre ${vu(panne)}`,
  );
  await page.click(`${DIALOGUE} button[data-cle="compris"]`);
  await attendreSansFenetre(page);
  await intact('panne de lecture');

  // Panne du remplacement : la copie est déposée, mais les données restent celles d'avant.
  await poser(page, 'pannes', ['remplacerTout']);
  await choisir(page, VALIDE);
  await attendreFenetre(page);
  await page.click(`${DIALOGUE} button[data-cle="restaurer"]`);
  await attendreTitre(page, Q.panne.titre);
  panne = await lireFenetre(page);
  juge.exige(panne?.titre === Q.panne.titre, `panne du remplacement : fenêtre ${vu(panne)}`);
  await page.click(`${DIALOGUE} button[data-cle="compris"]`);
  await attendreSansFenetre(page);
  const depots = await fichiers(page);
  juge.exige(
    depots.length === 1 && depots[0].nom === COPIE && egales(await donneesDe(page), avant),
    `panne du remplacement : ${vu(depots.map(d => d.nom))}, données ${egales(await donneesDe(page), avant) ? 'intactes' : 'changées'}`,
  );

  // Témoin : tout levé, la même restauration réussit.
  await poser(page, 'pannes', []);
  await restaurerAvec(page, VALIDE, 'restaurer');
  await attendreEcran(page, 'voyages');
  await attendreQue(
    page,
    () => document.querySelector('.bandeau-annuler p')?.textContent.includes('restaurée') ?? false,
  );
  juge.exige(
    (await lireStockage(page)).voyages.length === 4,
    'témoin : la restauration ne reprend pas après les pannes',
  );
  const inattendues = erreurs.filter(e => !e.includes('Panne simulée'));
  juge.exige(inattendues.length === 0, `échecs : erreurs dans la page : ${inattendues.join(' | ')}`);
  await contexte.close();
}

// 4. Chaque format, chaque thème : cibles, captures du refus, de la confirmation et du retour.
async function essaiFormat(format, theme) {
  const cas = `${format}, ${NOMS_THEME[theme]}`;
  const { page, contexte, erreurs } = await ouvrirReglages(FORMATS[format], { theme });
  await verifierCommandes(page, juge, cas);
  const vers = nom => join(CAPTURES, `restaurer-${format}-${NOMS_THEME[theme]}-${nom}.png`);
  await choisir(page, FICHIERS_REFUSES.version);
  await attendreFenetre(page);
  await page.screenshot({ path: vers('refus') });
  await page.click(`${DIALOGUE} button[data-cle="compris"]`);
  await attendreSansFenetre(page);
  await choisir(page, VALIDE);
  await attendreFenetre(page);
  await verifierCommandes(page, juge, `${cas} (confirmation)`);
  await page.screenshot({ path: vers('confirmation') });
  await page.click(`${DIALOGUE} button[data-cle="restaurer"]`);
  await attendreSansFenetre(page);
  await attendreEcran(page, 'voyages');
  await attendreQue(
    page,
    () => document.querySelector('.bandeau-annuler p')?.textContent.includes('restaurée') ?? false,
  );
  await calme(page);
  await page.mouse.move(0, 0);
  await page.screenshot({ path: vers('restauree') });
  juge.exige(erreurs.length === 0, `${cas} : erreurs dans la page : ${erreurs.join(' | ')}`);
  await contexte.close();
}

try {
  await mkdir(CAPTURES, { recursive: true });
  await essaiParcours('tablette-paysage', FORMATS['tablette-paysage']);
  await essaiParcours('telephone', FORMATS.telephone);
  await essaiRefus();
  await essaiEchecs();
  for (const theme of ['light', 'dark']) for (const format of Object.keys(FORMATS)) await essaiFormat(format, theme);
} catch (erreur) {
  juge.exige(false, `exception : ${String(erreur.stack ?? erreur).slice(0, 600)}`);
} finally {
  await navigateur.close();
  await serveur.fermer();
}
juge.conclure(
  'Restaurer',
  'confirmation, copie préalable, remplacement, bandeau « Annuler » retiré, refus, accès refusé, pannes, aller-retour ; 5 formats × 2 thèmes',
);
