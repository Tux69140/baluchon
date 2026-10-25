// Phase 2 : le retour système d'Android remonte l'historique de la page, comme le retour du
// navigateur (page.goBack). Il ne doit jamais tourner en rond :
// - depuis Mes voyages, atteint par le lien « Mes voyages », il quitte l'appli : un voyage quitté,
//   un formulaire abandonné ou un voyage tout juste créé ne se rouvrent pas ;
// - une adresse ouverte directement (un voyage) : le lien mène à Mes voyages, et le retour quitte
//   l'appli ;
// - le lien reste un vrai lien : il s'active au clavier (Entrée) ;
// - trois appuis immédiats sur le lien ne remontent pas plus loin que l'accueil.
// Témoins : depuis un voyage ou le formulaire ouverts depuis Mes voyages, et depuis un voyage tout
// juste créé, le retour ramène bien à Mes voyages.
// Nouveau voyage en fenêtre modale (tablette, 2026-10-07) : sans saisie, la fermer par Échap, « × »
// ou « Annuler » (fermeture directe, focus rendu au bouton « Nouveau voyage ») mène à Mes voyages, d'où le retour quitte l'appli, comme le lien « Mes voyages » ; un
// appui sur le voile ne la ferme pas (un geste accidentel perdrait la saisie) ; trois appuis immédiats
// sur « × » ne remontent pas plus loin que l'accueil ; ouverte directement par son adresse, elle se
// ferme sur Mes voyages, et le retour quitte l'appli. Témoin : le retour système ferme la fenêtre ouverte
// depuis Mes voyages et ramène à Mes voyages.
// Phase 4 (docs/PRD.md, « Écrans et gestes », puce « Assistant ») : le retour système ramène à l'étape
// précédente, de l'aperçu jusqu'à Informations ; là, avec une saisie, il demande « Abandonner ce
// nouveau voyage ? ». Un retour pendant la question ne ferme qu'elle (Review Focus 4) ; « Continuer la
// saisie » garde tout (nom, dates, étiquettes, objets écartés) ; « Abandonner » mène à Mes voyages, et
// le retour suivant quitte l'appli. Saisie effacée : fermeture directe. Échap, « × », « Annuler » et le
// lien « Mes voyages » (téléphone) posent la même question ; le focus revient au bouton qui a ouvert la
// fenêtre. Échap répété au clavier, sans autre geste : au 5e appui, le navigateur ferme la fenêtre de
// lui-même (cancel non annulable) ; elle se rouvre, la question au-dessus d'elle, le focus rendu au
// champ du nom après « Continuer la saisie ». Captures de la question, téléphone et tablette, 2 thèmes.
import { mkdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { chromium } from 'playwright';
import { calme } from './outils/attente.mjs';
import {
  attendreQuestion,
  creerDepuisLAssistant,
  etapeAffichee,
  ligneObjet,
  question,
  repondre,
  retourDansLAssistant,
  verifierQuestion,
} from './outils/assistant.mjs';
import { demarrerServeur } from './outils/serveur.mjs';
import { CAPTURES, FORMATS, NOMS_THEME, RACINE, attendreEcran, creerJuge, ouvrir } from './outils/page.mjs';

const fr = JSON.parse(await readFile(join(RACINE, 'src/i18n/fr.json'), 'utf8'));
const { abandon } = fr.nouveauVoyage;

const HORS = 'hors de l’appli';
const MAINTENANT = new Date('2026-10-06T10:00:00');
const DONNEES = {
  voyages: [
    {
      id: 'v1',
      nom: 'Vercors',
      destination: '',
      depart: '2026-10-10',
      retour: '2026-10-13',
      voyageurs: 2,
      modifieLe: 'x',
    },
  ],
};

// L'écran affiché, une fois dessiné celui que demande l'adresse ; HORS si l'on a quitté l'appli.
async function ecranAffiche(page, url) {
  await page.waitForFunction(u => {
    if (!location.href.startsWith(u)) return true;
    const ecran = document.querySelector('#app')?.dataset.ecran;
    return Boolean(ecran) && (location.hash === `#/${ecran}` || location.hash.startsWith(`#/${ecran}/`));
  }, url);
  return page.url().startsWith(url) ? page.evaluate(() => document.querySelector('#app').dataset.ecran) : HORS;
}

async function retourSysteme(page, url) {
  await page.goBack();
  return ecranAffiche(page, url);
}

// Les façons de fermer l'assistant : trois dans la fenêtre de la tablette, le lien au téléphone (le
// retour système est le témoin).
const FERMETURES = [
  ['Échap', 'tablette-paysage', page => page.keyboard.press('Escape')],
  ['×', 'tablette-paysage', page => page.click('.bouton-fermer')],
  ['Annuler', 'tablette-paysage', page => page.click('[data-action="fermer"]')],
  ['Mes voyages', 'telephone', page => page.click('.lien-retour')],
];
const questionAbandon = q =>
  q?.titre === abandon.titre &&
  JSON.stringify(q.boutons) ===
    JSON.stringify([
      { texte: abandon.continuer, principal: false },
      { texte: abandon.abandonner, principal: true },
    ]);
const lireSaisie = page =>
  page.evaluate(() => ({
    adresse: location.hash,
    nom: document.querySelector('#nom')?.value,
    fenetre: Boolean(document.querySelector('dialog.assistant[open]')),
    dates: document.querySelector('#resume-dates')?.textContent,
  }));

async function depuisMesVoyages(navigateur, url, taille = FORMATS.telephone) {
  const ouvert = await ouvrir(navigateur, url, {
    taille,
    theme: 'light',
    maintenant: MAINTENANT,
    donnees: DONNEES,
    adresse: '#/voyages',
  });
  await attendreEcran(ouvert.page, 'voyages');
  return ouvert;
}

// Aller d'un écran à l'autre par un lien de l'appli, et attendre le nouvel écran.
async function suivre(page, selecteur, ecran) {
  await page.click(selecteur);
  await attendreEcran(page, ecran);
}

const enClair = valeur => JSON.stringify(valeur);

const juge = creerJuge();
const serveur = await demarrerServeur();
const navigateur = await chromium.launch();
try {
  // Un voyage ouvert depuis Mes voyages.
  {
    const { contexte, page, erreurs } = await depuisMesVoyages(navigateur, serveur.url);
    await suivre(page, '.carte-voyage', 'voyage');
    const temoin = await retourSysteme(page, serveur.url);
    juge.exige(temoin === 'voyages', `voyage : témoin, le retour mène à « ${temoin} »`);
    await page.goForward();
    await attendreEcran(page, 'voyage');
    await suivre(page, '.lien-retour', 'voyages');
    const vu = await retourSysteme(page, serveur.url);
    juge.exige(vu === HORS, `voyage puis « Mes voyages » : le retour mène à « ${vu} »`);
    juge.exige(erreurs.length === 0, `voyage : erreurs dans la page : ${erreurs.join(' | ')}`);
    await contexte.close();
  }

  // Trois appuis immédiats sur « Mes voyages », avant la fin du premier retour.
  {
    const { contexte, page } = await depuisMesVoyages(navigateur, serveur.url);
    await suivre(page, '.carte-voyage', 'voyage');
    await page.evaluate(() => {
      const lien = document.querySelector('.lien-retour');
      for (let i = 0; i < 3; i++) lien.click();
    });
    await page.waitForFunction(() => !location.href.includes('#/voyage/'));
    const vu = await ecranAffiche(page, serveur.url);
    juge.exige(vu === 'voyages', `trois appuis sur « Mes voyages » : on arrive à « ${vu} »`);
    await contexte.close();
  }

  // Le formulaire, ouvert puis abandonné par « Mes voyages ».
  {
    const { contexte, page } = await depuisMesVoyages(navigateur, serveur.url);
    await suivre(page, '.bouton-flottant', 'nouveau-voyage');
    const temoin = await retourSysteme(page, serveur.url);
    juge.exige(temoin === 'voyages', `formulaire : témoin, le retour mène à « ${temoin} »`);
    await suivre(page, '.bouton-flottant', 'nouveau-voyage');
    await suivre(page, '.lien-retour', 'voyages');
    const vu = await retourSysteme(page, serveur.url);
    juge.exige(vu === HORS, `formulaire abandonné : le retour mène à « ${vu} »`);
    await contexte.close();
  }

  // Un voyage tout juste créé, quitté par « Mes voyages » activé au clavier.
  {
    const { contexte, page } = await depuisMesVoyages(navigateur, serveur.url);
    await suivre(page, '.bouton-flottant', 'nouveau-voyage');
    await page.fill('#nom', 'Toussaint');
    await page.click('[data-jour="2026-10-24"]');
    await page.click('[data-jour="2026-10-27"]');
    await creerDepuisLAssistant(page);
    await attendreEcran(page, 'voyage');
    const temoin = await retourSysteme(page, serveur.url);
    juge.exige(temoin === 'voyages', `création : témoin, le retour mène à « ${temoin} »`);
    await page.goForward();
    await attendreEcran(page, 'voyage');
    await page.focus('.lien-retour');
    await page.keyboard.press('Enter');
    await attendreEcran(page, 'voyages');
    const vu = await retourSysteme(page, serveur.url);
    juge.exige(vu === HORS, `création puis « Mes voyages » : le retour mène à « ${vu} »`);
    await contexte.close();
  }

  // La fenêtre de Nouveau voyage, en tablette : témoin, puis chaque façon de la fermer.
  {
    const { contexte, page } = await depuisMesVoyages(navigateur, serveur.url, FORMATS['tablette-paysage']);
    await suivre(page, '.bouton-flottant', 'nouveau-voyage');
    const temoin = await retourSysteme(page, serveur.url);
    const fenetre = await page.evaluate(() => Boolean(document.querySelector('dialog')));
    juge.exige(temoin === 'voyages' && !fenetre, `fenêtre : témoin, le retour mène à « ${temoin} » (${fenetre})`);
    await contexte.close();
  }
  // Sans saisie, « Annuler » ferme tout de suite : pas de question, le focus revient au bouton « Nouveau voyage ».
  {
    const { contexte, page } = await depuisMesVoyages(navigateur, serveur.url, FORMATS['tablette-paysage']);
    await suivre(page, '.bouton-flottant', 'nouveau-voyage');
    await page.click('[data-action="fermer"]');
    await attendreEcran(page, 'voyages');
    const direct = await page.evaluate(() => ({
      fenetre: Boolean(document.querySelector('dialog')),
      focus: document.activeElement?.classList.contains('bouton-flottant'),
    }));
    juge.exige(!direct.fenetre && direct.focus, `« Annuler » sans saisie : ${JSON.stringify(direct)}`);
    await contexte.close();
  }
  // Avec une saisie, chaque geste pose la question : « Continuer la saisie » garde tout, « Abandonner »
  // ferme.
  for (const [geste, format, fermer] of FERMETURES) {
    const { contexte, page, erreurs } = await depuisMesVoyages(navigateur, serveur.url, FORMATS[format]);
    await suivre(page, '.bouton-flottant', 'nouveau-voyage');
    await page.fill('#nom', 'Abandonné');
    await fermer(page);
    juge.exige(
      questionAbandon(await attendreQuestion(page)),
      `${geste} avec saisie : ${enClair(await question(page))}`,
    );
    await repondre(page, abandon.continuer);
    const garde = await lireSaisie(page);
    juge.exige(
      garde.adresse === '#/nouveau-voyage' && garde.nom === 'Abandonné' && garde.fenetre === (format !== 'telephone'),
      `${geste}, « Continuer la saisie » : ${enClair(garde)}`,
    );
    await fermer(page);
    juge.exige(questionAbandon(await attendreQuestion(page)), `${geste}, seconde fois : pas de question`);
    await repondre(page, abandon.abandonner);
    await attendreEcran(page, 'voyages');
    const apres = await page.evaluate(() => ({
      fenetre: Boolean(document.querySelector('dialog')),
      focus: document.activeElement?.classList.contains('bouton-flottant'),
    }));
    juge.exige(!apres.fenetre, `fenêtre fermée par ${geste} : elle est restée`);
    if (format !== 'telephone')
      juge.exige(apres.focus, `fenêtre fermée par ${geste} : le focus ne revient pas au bouton flottant`);
    const retour = await retourSysteme(page, serveur.url);
    juge.exige(retour === HORS, `fenêtre fermée par ${geste} : le retour mène à « ${retour} »`);
    juge.exige(erreurs.length === 0, `fenêtre fermée par ${geste} : erreurs dans la page : ${erreurs.join(' | ')}`);
    await contexte.close();
  }

  // Échap répété au clavier : la question reste au-dessus de l'assistant, et elle répond.
  {
    const { contexte, page, erreurs } = await depuisMesVoyages(navigateur, serveur.url, FORMATS['tablette-paysage']);
    await suivre(page, '.bouton-flottant', 'nouveau-voyage');
    await page.fill('#nom', 'Clavier');
    // Témoin : le navigateur a bien envoyé un cancel non annulable à l'assistant.
    await page.evaluate(() => {
      window.nonAnnulables = 0;
      document
        .querySelector('dialog.assistant')
        .addEventListener('cancel', e => (window.nonAnnulables += e.cancelable ? 0 : 1));
    });
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Escape');
      await calme(page);
    }
    const dessus = await page.evaluate(() => {
      const q = document.querySelector('dialog[role="alertdialog"][open]');
      const r = q?.getBoundingClientRect();
      return {
        nonAnnulables: window.nonAnnulables,
        assistant: Boolean(document.querySelector('dialog.assistant[open]')),
        question: Boolean(q),
        dessus: Boolean(q?.contains(document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2))),
      };
    });
    juge.exige(dessus.nonAnnulables > 0, `Échap répété : témoin, aucun cancel non annulable ${enClair(dessus)}`);
    juge.exige(
      dessus.assistant && dessus.question && dessus.dessus,
      `Échap répété : la question n’est pas au-dessus ${enClair(dessus)}`,
    );
    await repondre(page, abandon.continuer);
    const garde = await page.evaluate(() => ({
      assistant: Boolean(document.querySelector('dialog.assistant[open]')),
      nom: document.querySelector('#nom').value,
      focus: document.activeElement?.id,
    }));
    juge.exige(
      garde.assistant && garde.nom === 'Clavier' && garde.focus === 'nom',
      `Échap répété, « Continuer la saisie » : ${enClair(garde)}`,
    );
    await page.click('.bouton-fermer');
    juge.exige(questionAbandon(await attendreQuestion(page)), 'Échap répété, puis × : pas de question');
    await repondre(page, abandon.abandonner);
    await attendreEcran(page, 'voyages');
    const fin = await retourSysteme(page, serveur.url);
    juge.exige(fin === HORS, `Échap répété, « Abandonner » : le retour mène à « ${fin} »`);
    juge.exige(erreurs.length === 0, `Échap répété : erreurs dans la page : ${erreurs.join(' | ')}`);
    await contexte.close();
  }

  // Le retour système, étape par étape jusqu'à Informations, puis la question d'abandon.
  for (const format of ['telephone', 'tablette-paysage']) {
    const cas = `retour, ${format}`;
    const { contexte, page, erreurs } = await depuisMesVoyages(navigateur, serveur.url, FORMATS[format]);
    await suivre(page, '.bouton-flottant', 'nouveau-voyage');
    await page.fill('#nom', 'Vercors');
    await page.click('[data-jour="2026-10-10"]');
    await page.click('[data-jour="2026-10-13"]');
    await page.click('[data-action="suivant"]');
    await page.click('.puce-etiquette:has-text("Randonnée")');
    await page.click('.etape:last-child button');
    await ligneObjet(page, 'Gourde').click();
    const avant = await lireSaisie(page);
    const titres = [];
    for (let i = 0; i < 4; i++) {
      await retourDansLAssistant(page);
      const { etape, titre } = await etapeAffichee(page);
      titres.push(etape === 'infos' ? 'Informations' : titre);
    }
    juge.exige(
      titres.join(',') === 'Hébergement,Climat,Activités,Informations' && !(await question(page)),
      `${cas} : étapes ${titres}`,
    );
    await retourDansLAssistant(page);
    juge.exige(questionAbandon(await question(page)), `${cas}, Informations : ${enClair(await question(page))}`);
    // Review Focus 4 : le retour ferme la question, et elle seule.
    await retourDansLAssistant(page);
    const apres = await lireSaisie(page);
    juge.exige(
      !(await question(page)) && (await etapeAffichee(page)).etape === 'infos' && enClair(apres) === enClair(avant),
      `${cas}, retour sur la question : ${enClair(await question(page))} ${enClair(apres)}`,
    );
    await retourDansLAssistant(page);
    juge.exige(questionAbandon(await question(page)), `${cas} : la question ne revient pas`);
    await repondre(page, abandon.continuer);
    juge.exige(
      enClair(await lireSaisie(page)) === enClair(avant),
      `${cas}, « Continuer la saisie » : ${enClair(await lireSaisie(page))}`,
    );
    await page.click('.etape:last-child button');
    await calme(page);
    const rappel = await page.$eval('.apercu-rappel', p => p.textContent);
    juge.exige(
      !(await question(page)) &&
        rappel.includes('Randonnée') &&
        (await ligneObjet(page, 'Gourde').getAttribute('aria-checked')) === 'false',
      `${cas}, l’aperçu gardé : rappel « ${rappel} », question ${enClair(await question(page))}`,
    );
    await page.click('.etape:first-child button');
    await calme(page);
    await retourDansLAssistant(page);
    juge.exige(questionAbandon(await question(page)), `${cas} : pas de question la dernière fois`);
    await repondre(page, abandon.abandonner);
    await attendreEcran(page, 'voyages');
    const fin = await retourSysteme(page, serveur.url);
    juge.exige(fin === HORS, `${cas}, « Abandonner » : le retour mène à « ${fin} »`);
    juge.exige(erreurs.length === 0, `${cas} : erreurs dans la page : ${erreurs.join(' | ')}`);
    await contexte.close();
  }

  // Saisie effacée : rien à perdre, le retour ferme sans question.
  {
    const { contexte, page } = await depuisMesVoyages(navigateur, serveur.url);
    await suivre(page, '.bouton-flottant', 'nouveau-voyage');
    await page.fill('#nom', 'Effacé');
    await page.fill('#nom', '');
    await calme(page);
    const vuApres = await retourSysteme(page, serveur.url);
    juge.exige(vuApres === 'voyages', `saisie effacée : le retour mène à « ${vuApres} »`);
    const fin = await retourSysteme(page, serveur.url);
    juge.exige(fin === HORS, `saisie effacée : le retour suivant mène à « ${fin} »`);
    await contexte.close();
  }

  // La question d'abandon : téléphone et tablette, claire et sombre.
  await mkdir(CAPTURES, { recursive: true });
  for (const theme of ['light', 'dark'])
    for (const format of ['telephone', 'tablette-paysage']) {
      const { contexte, page } = await ouvrir(navigateur, serveur.url, {
        taille: FORMATS[format],
        theme,
        maintenant: MAINTENANT,
        donnees: DONNEES,
        adresse: '#/voyages',
      });
      await attendreEcran(page, 'voyages');
      await suivre(page, '.bouton-flottant', 'nouveau-voyage');
      await page.fill('#nom', 'Week-end au Vercors');
      await page.fill('#destination', 'Vercors');
      await page.click('[data-mois="1"]');
      await page.click('[data-jour="2026-11-13"]');
      await page.click('[data-jour="2026-11-15"]');
      await retourDansLAssistant(page);
      await attendreQuestion(page);
      await page.mouse.move(0, 0);
      await page.screenshot({ path: join(CAPTURES, `assistant-abandon-${format}-${NOMS_THEME[theme]}.png`) });
      await verifierQuestion(page, juge, `abandon, ${format}, ${NOMS_THEME[theme]}`);
      await contexte.close();
    }

  // Un appui sur le voile, à gauche de la fenêtre, ne la ferme pas : la saisie reste.
  {
    const { contexte, page } = await depuisMesVoyages(navigateur, serveur.url, FORMATS['tablette-paysage']);
    await suivre(page, '.bouton-flottant', 'nouveau-voyage');
    await page.fill('#nom', 'Gardé');
    await page.mouse.click(8, 400);
    await page.touchscreen.tap(8, 400);
    await calme(page);
    const vu = await page.evaluate(() => ({
      ouverte: Boolean(document.querySelector('dialog')?.matches(':modal')),
      nom: document.querySelector('#nom')?.value,
      adresse: location.hash,
    }));
    juge.exige(
      vu.ouverte && vu.nom === 'Gardé' && vu.adresse === '#/nouveau-voyage',
      `voile touché : la fenêtre s’est fermée ou la saisie est perdue (${JSON.stringify(vu)})`,
    );
    await contexte.close();
  }

  // Trois appuis immédiats sur « × », avant la fin de la fermeture.
  {
    const { contexte, page } = await depuisMesVoyages(navigateur, serveur.url, FORMATS['tablette-paysage']);
    await suivre(page, '.bouton-flottant', 'nouveau-voyage');
    await page.evaluate(() => {
      const croix = document.querySelector('.bouton-fermer');
      for (let i = 0; i < 3; i++) croix.click();
    });
    await page.waitForFunction(() => !location.href.includes('#/nouveau-voyage'));
    const vu = await ecranAffiche(page, serveur.url);
    juge.exige(vu === 'voyages', `trois appuis sur « × » : on arrive à « ${vu} »`);
    await contexte.close();
  }

  // La fenêtre ouverte directement par son adresse, fermée par Échap.
  {
    const { contexte, page } = await ouvrir(navigateur, serveur.url, {
      taille: FORMATS['tablette-paysage'],
      theme: 'light',
      maintenant: MAINTENANT,
      donnees: DONNEES,
      adresse: '#/nouveau-voyage',
    });
    await attendreEcran(page, 'nouveau-voyage');
    await page.keyboard.press('Escape');
    await attendreEcran(page, 'voyages');
    const vu = await retourSysteme(page, serveur.url);
    juge.exige(vu === HORS, `fenêtre ouverte par son adresse, fermée : le retour mène à « ${vu} »`);
    await contexte.close();
  }

  // Un voyage ouvert directement par son adresse.
  {
    const { contexte, page } = await ouvrir(navigateur, serveur.url, {
      taille: FORMATS.telephone,
      theme: 'light',
      donnees: DONNEES,
      adresse: '#/voyage/v1',
    });
    await attendreEcran(page, 'voyage');
    await suivre(page, '.lien-retour', 'voyages');
    const vu = await retourSysteme(page, serveur.url);
    juge.exige(vu === HORS, `adresse directe puis « Mes voyages » : le retour mène à « ${vu} »`);
    await contexte.close();
  }
} finally {
  await navigateur.close();
  await serveur.fermer();
}
juge.conclure(
  'Retour système',
  'voyage, formulaire, fenêtre, création, adresse directe, appuis répétés, assistant (étapes, abandon confirmé), témoins',
);
