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
import { chromium } from 'playwright';
import { demarrerServeur } from './outils/serveur.mjs';
import { FORMATS, attendreEcran, creerJuge, ouvrir } from './outils/page.mjs';

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

async function depuisMesVoyages(navigateur, url) {
  const ouvert = await ouvrir(navigateur, url, {
    taille: FORMATS.telephone,
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
    await suivre(page, 'button[type=submit]', 'voyage');
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
juge.conclure('Retour système', 'voyage, formulaire, création, adresse directe et appuis répétés, témoins compris');
