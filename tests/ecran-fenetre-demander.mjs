// src/ecrans/fenetre.js : demander() (fenêtre d'alerte à boutons nommés) et poserGardeRetour()
// (le retour système, au lieu de quitter l'écran, appelle surRetour). Page d'essai :
// tests/pages/fenetre.html.
// - demander : la clé du bouton touché ; Échap et retour système rendent null, l'adresse ne change pas ;
//   focus sur le premier bouton ; confirmer garde son comportement (true / false) ;
// - garde : un retour appelle surRetour et l'adresse reste ; surRetour rendant true repose la garde ;
//   rendant false puis retirer(), le retour suivant quitte la page ; une fenêtre ouverte par-dessus
//   se ferme au retour sans appeler surRetour.
import { chromium } from 'playwright';
import { attendreQue } from './outils/attente.mjs';
import { demarrerServeur } from './outils/serveur.mjs';
import { FORMATS, creerJuge, ouvrir } from './outils/page.mjs';

const juge = creerJuge();
const serveur = await demarrerServeur();
const navigateur = await chromium.launch();

const lire = (page, id) => page.evaluate(i => document.querySelector(i).textContent, `#${id}`);
const attendreTexte = (page, id, valeur) =>
  attendreQue(page, ([i, v]) => document.querySelector(i).textContent === v, [`#${id}`, valeur]);

async function ouvrirEssai() {
  const ouvert = await ouvrir(navigateur, serveur.url, {
    taille: FORMATS.telephone,
    theme: 'light',
    adresse: '/tests/pages/fenetre.html#niveau-0',
  });
  // Une étape d'avant, pour que « quitter la page » se voie : le retour mène alors à about:blank.
  return ouvert;
}
const retour = async page => {
  await page.goBack();
};

try {
  // 1. Un bouton nommé.
  {
    const { page, erreurs } = await ouvrirEssai();
    await page.click('#demander');
    await attendreQue(page, () => Boolean(document.querySelector('dialog[role="alertdialog"][open]')));
    const noms = await page.$$eval('dialog[role="alertdialog"] .fenetre-pied button', b => b.map(x => x.textContent));
    juge.exige(noms.join('|') === 'Bouton A|Bouton B|Bouton C', `boutons dans l'ordre : ${noms}`);
    const focus = await page.evaluate(() => document.activeElement?.textContent);
    juge.exige(focus === 'Bouton A', `focus sur le premier bouton : ${focus}`);
    const croix = await page.$('dialog[role="alertdialog"] .bouton-fermer');
    juge.exige(!croix, 'pas de croix');
    juge.exige((await page.$('dialog[role="alertdialog"] li')) !== null, 'le contenu fourni est dans la fenêtre');
    await page.click('dialog[role="alertdialog"] button:has-text("Bouton B")');
    juge.exige(
      (await attendreTexte(page, 'choix', 'b')) === true,
      `choix = « ${await lire(page, 'choix')} », attendu b`,
    );
    juge.exige((await page.$('dialog[role="alertdialog"]')) === null, 'la fenêtre est retirée après le choix');
    // Aucune étape d'historique ne reste : le retour suivant quitte la page d'essai.
    await retour(page);
    juge.exige(page.url() === 'about:blank', `un retour après le choix quitte la page : ${page.url()}`);
    juge.exige(erreurs.length === 0, `erreurs de page : ${erreurs.join(' ; ')}`);
  }

  // 2. Échap, puis retour système.
  {
    const { page } = await ouvrirEssai();
    await page.click('#demander');
    await attendreQue(page, () => Boolean(document.querySelector('dialog[role="alertdialog"][open]')));
    await page.keyboard.press('Escape');
    juge.exige((await attendreTexte(page, 'choix', 'null')) === true, 'Échap rend null');
    await page.click('#demander');
    await attendreQue(page, () => Boolean(document.querySelector('dialog[role="alertdialog"][open]')));
    await retour(page);
    juge.exige((await attendreTexte(page, 'choix', 'null')) === true, 'le retour système rend null');
    juge.exige(page.url().endsWith('/tests/pages/fenetre.html#niveau-0'), `adresse inchangée : ${page.url()}`);
  }

  // 3. confirmer : comportement inchangé.
  {
    const { page } = await ouvrirEssai();
    await page.click('#confirmer');
    await attendreQue(page, () => Boolean(document.querySelector('dialog[role="alertdialog"][open]')));
    const noms = await page.$$eval('dialog[role="alertdialog"] .fenetre-pied button', b => b.map(x => x.textContent));
    juge.exige(noms.join('|') === 'Annuler|Faire', `confirmer : boutons ${noms}`);
    await page.click('dialog[role="alertdialog"] button:has-text("Faire")');
    juge.exige((await attendreTexte(page, 'choix', 'true')) === true, 'confirmer rend true');
    await page.click('#confirmer');
    await attendreQue(page, () => Boolean(document.querySelector('dialog[role="alertdialog"][open]')));
    await page.click('dialog[role="alertdialog"] button:has-text("Annuler")');
    juge.exige((await attendreTexte(page, 'choix', 'false')) === true, 'confirmer rend false sur Annuler');
  }

  // 4. Garde : surRetour rend true, la garde se repose ; rend false, elle est consommée.
  {
    const { page } = await ouvrirEssai();
    await page.evaluate(() => (window.surRetourRend = true));
    await page.click('#poser');
    await retour(page);
    juge.exige((await attendreTexte(page, 'compteur', '1')) === true, 'un retour appelle surRetour (1)');
    juge.exige(page.url().endsWith('/tests/pages/fenetre.html#niveau-0'), `adresse inchangée : ${page.url()}`);
    await retour(page);
    juge.exige(
      (await attendreTexte(page, 'compteur', '2')) === true,
      `garde reposée : compteur ${await lire(page, 'compteur')}`,
    );
    await page.evaluate(() => (window.surRetourRend = false));
    await retour(page);
    juge.exige((await attendreTexte(page, 'compteur', '3')) === true, 'surRetour appelé une 3e fois');
    await page.click('#retirer');
    await retour(page);
    juge.exige(page.url() === 'about:blank', `garde consommée puis retirée : le retour quitte : ${page.url()}`);
  }

  // 4 bis. retirer() d'une garde encore posée : l'écran reste, le retour suivant quitte.
  {
    const { page } = await ouvrirEssai();
    await page.click('#poser');
    await page.click('#retirer');
    await attendreQue(page, () => history.state?.niveau === undefined || history.state.niveau === 0);
    juge.exige(page.url().endsWith('/tests/pages/fenetre.html#niveau-0'), `retirer ne quitte pas : ${page.url()}`);
    await retour(page);
    juge.exige(page.url() === 'about:blank', `après retirer, le retour quitte : ${page.url()}`);
  }

  // 5. Garde posée, fenêtre par-dessus : le retour ferme la fenêtre, surRetour n'est pas appelé.
  {
    const { page } = await ouvrirEssai();
    await page.click('#poser');
    await page.click('#demander');
    await attendreQue(page, () => Boolean(document.querySelector('dialog[role="alertdialog"][open]')));
    await retour(page);
    juge.exige((await attendreTexte(page, 'choix', 'null')) === true, 'le retour ferme la fenêtre');
    juge.exige((await lire(page, 'compteur')) === '0', `surRetour non appelé : ${await lire(page, 'compteur')}`);
    await retour(page);
    juge.exige((await attendreTexte(page, 'compteur', '1')) === true, 'le retour suivant atteint la garde');
  }
} finally {
  await navigateur.close();
  await serveur.fermer();
}
juge.conclure('fenêtre à boutons nommés et garde du retour', 'demander, confirmer, poserGardeRetour');
