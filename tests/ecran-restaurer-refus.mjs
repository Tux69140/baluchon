// Phase 12, tâche 6 : « Restaurer une sauvegarde… » de Réglages, ce qui ne remplace rien (le parcours réussi est
// dans tests/ecran-restaurer.mjs ; le décor partagé, dans tests/outils/restaurer.mjs).
// - refus (tronqué, autre format, version 2) : « Restauration impossible » ;
// - copie préalable refusée : « Accès aux fichiers refusé » (texte : « Restaurer une sauvegarde… »), rien remplacé, puis témoin ;
// - pannes (lecture de la copie, remplacement) : « La restauration n'a pas abouti », données inchangées ; la panne levée, elle réussit (témoin) ;
// - fenêtre de confirmation refermée par Échap ou par la touche retour : rien n'est déposé ni remplacé, l'écran
//   reste Réglages, et le même fichier rouvre la fenêtre (témoin).
// Le thème du bureau Debian n'est jamais touché : seul emulateMedia de Playwright change de thème.
import { chromium } from 'playwright';
import { attendreQue } from './outils/attente.mjs';
import { toucheRetour } from './outils/bibliotheque.mjs';
import { FORMATS, attendreEcran, creerJuge, lireStockage } from './outils/page.mjs';
import {
  attendreFenetre,
  attendreSansFenetre,
  attendreTitre,
  choisir,
  COPIE,
  DIALOGUE,
  donneesDe,
  ecran,
  egales,
  fichiers,
  FICHIERS_REFUSES,
  lireFenetre,
  net,
  ouvrirReglages as ouvrirReglagesDe,
  poser,
  Q,
  R,
  restaurerAvec,
  VALIDE,
  vu,
} from './outils/restaurer.mjs';
import { demarrerServeur } from './outils/serveur.mjs';

const juge = creerJuge();
const serveur = await demarrerServeur();
const navigateur = await chromium.launch();
const ouvrirReglages = (taille, options) => ouvrirReglagesDe(navigateur, serveur, taille, options);

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

// 4. La fenêtre de confirmation refermée par Échap ou par la touche retour : c'est « Garder mes données ».
async function essaiFermee() {
  const { page, contexte, erreurs } = await ouvrirReglages(FORMATS['tablette-paysage']);
  const avant = await donneesDe(page);
  for (const [geste, fermer] of [
    ['Échap', () => page.keyboard.press('Escape')],
    ['touche retour', () => toucheRetour(page)],
  ]) {
    await choisir(page, VALIDE);
    await attendreFenetre(page);
    const ouverte = await lireFenetre(page);
    juge.exige(ouverte?.boutons.length === 2, `${geste} : la fenêtre ne s'est pas ouverte ${vu(ouverte)}`);
    await fermer();
    await attendreSansFenetre(page);
    juge.exige(
      (await fichiers(page)).length === 0 && egales(await donneesDe(page), avant) && (await ecran(page)) === 'reglages',
      `${geste} : quelque chose a été déposé ou remplacé`,
    );
  }
  // Témoin : le même fichier rouvre la fenêtre, et « Restaurer » remplace bien (le geste normal agit).
  await restaurerAvec(page, VALIDE, 'restaurer');
  await attendreEcran(page, 'voyages');
  juge.exige((await lireStockage(page)).voyages.length === 4, 'fenêtre refermée : le témoin ne restaure pas');
  juge.exige(erreurs.length === 0, `fenêtre refermée : erreurs dans la page : ${erreurs.join(' | ')}`);
  await contexte.close();
}

try {
  await essaiRefus();
  await essaiEchecs();
  await essaiFermee();
} catch (erreur) {
  juge.exige(false, `exception : ${String(erreur.stack ?? erreur).slice(0, 600)}`);
} finally {
  await navigateur.close();
  await serveur.fermer();
}
juge.conclure('Restaurer, refus', 'refus, accès refusé, pannes, fenêtre refermée par Échap et par la touche retour');
