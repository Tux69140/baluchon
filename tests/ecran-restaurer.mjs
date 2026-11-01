// Phase 12, tâche 6 (docs/superpowers/specs/2026-10-31-phase-12-reglages-sauvegarde-design.md, « Restaurer » ;
// maquette validée le 2026-10-31, docs/maquettes/reglages/) : « Restaurer une sauvegarde… » de Réglages,
// parcours réussis (les refus et les pannes sont dans tests/ecran-restaurer-refus.mjs).
// - Fichier valide (4 voyages, 312 objets, créé le 12 octobre 2026 à 21 h 15) : la fenêtre « Restaurer la
//   sauvegarde du 12 octobre 2026, 21 h 15 ? », « Garder mes données » d'abord, « Restaurer » en rouge ;
//   « Garder » ne change rien et ne dépose rien ; choisir le même fichier une seconde fois rouvre la fenêtre
//   (le champ est vidé après lecture) ; annuler le sélecteur ne fait rien ;
// - « Restaurer » : la copie « avant restauration » est déposée d'abord, relue, égale à l'état d'avant ; puis
//   Mes voyages montre les 4 voyages et le bandeau « Sauvegarde du … restaurée. » ; le bandeau « Annuler » d'une
//   suppression de voyage affiché avant a disparu, et rien n'est rétabli ; la date de dernière sauvegarde ne
//   change pas ; la touche retour y quitte l'appli ;
// - restaurer ensuite la copie ramène l'état d'avant (coches, quantités), et Sauvegarder redonne le même contenu ;
// - disposition : cibles de 44 px, clair et sombre, aux cinq formats ; captures restaurer-….
// Le thème du bureau Debian n'est jamais touché : seul emulateMedia de Playwright change de thème.
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { chromium } from 'playwright';
import { lireSauvegarde } from '../src/modele/sauvegarde.js';
import { a, lireBandeau } from './outils/annulation.mjs';
import { attendreQue, calme } from './outils/attente.mjs';
import { remplir, toucheRetour } from './outils/bibliotheque.mjs';
import {
  CAPTURES,
  FORMATS,
  NOMS_THEME,
  attendreEcran,
  creerJuge,
  lireStockage,
  verifierCommandes,
} from './outils/page.mjs';
import {
  attendreFenetre,
  attendreSansFenetre,
  cartes,
  CHAMP,
  choisir,
  COPIE,
  derniere,
  DIALOGUE,
  donneesDe,
  ecran,
  egales,
  fichiers,
  FICHIERS_REFUSES,
  lireFenetre,
  lireMessage,
  net,
  NOMS,
  ouvrirReglages as ouvrirReglagesDe,
  Q,
  restaurerAvec,
  SUPPRIMER_VOYAGE,
  supprimerVoyageDeCarte,
  VALIDE,
  versReglages,
  vu,
} from './outils/restaurer.mjs';
import { demarrerServeur } from './outils/serveur.mjs';

const juge = creerJuge();
const serveur = await demarrerServeur();
const navigateur = await chromium.launch();
const ouvrirReglages = (taille, options) => ouvrirReglagesDe(navigateur, serveur, taille, options);

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
  for (const theme of ['light', 'dark']) for (const format of Object.keys(FORMATS)) await essaiFormat(format, theme);
} catch (erreur) {
  juge.exige(false, `exception : ${String(erreur.stack ?? erreur).slice(0, 600)}`);
} finally {
  await navigateur.close();
  await serveur.fermer();
}
juge.conclure(
  'Restaurer',
  'confirmation, copie préalable, remplacement, bandeau « Annuler » retiré, aller-retour ; 5 formats × 2 thèmes',
);
