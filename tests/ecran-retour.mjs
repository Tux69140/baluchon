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
// Nouveau voyage en fenêtre modale (tablette, 2026-10-07) : la fermer par Échap, « × » ou « Annuler »
// mène à Mes voyages, d'où le retour quitte l'appli, comme le lien « Mes voyages » ; un appui sur le
// voile ne la ferme pas (un geste accidentel perdrait la saisie) ; le focus revient au bouton qui l'a
// ouverte ; trois appuis immédiats sur « × » ne remontent pas plus loin que l'accueil ; ouverte
// directement par son adresse, elle se ferme sur Mes voyages, et le retour quitte l'appli. Témoin : le
// retour système ferme la fenêtre ouverte depuis Mes voyages et ramène à Mes voyages.
import { chromium } from 'playwright';
import { calme } from './outils/attente.mjs';
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

// Les trois façons de fermer la fenêtre de Nouveau voyage (le retour système est le témoin).
const FERMETURES = {
  Échap: page => page.keyboard.press('Escape'),
  '×': page => page.click('.bouton-fermer'),
  Annuler: page => page.click('[data-fermer].bouton-secondaire'),
};

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

  // La fenêtre de Nouveau voyage, en tablette : témoin, puis chaque façon de la fermer.
  {
    const { contexte, page } = await depuisMesVoyages(navigateur, serveur.url, FORMATS['tablette-paysage']);
    await suivre(page, '.bouton-flottant', 'nouveau-voyage');
    const temoin = await retourSysteme(page, serveur.url);
    const fenetre = await page.evaluate(() => Boolean(document.querySelector('dialog')));
    juge.exige(temoin === 'voyages' && !fenetre, `fenêtre : témoin, le retour mène à « ${temoin} » (${fenetre})`);
    await contexte.close();
  }
  for (const [geste, fermer] of Object.entries(FERMETURES)) {
    const { contexte, page, erreurs } = await depuisMesVoyages(navigateur, serveur.url, FORMATS['tablette-paysage']);
    await suivre(page, '.bouton-flottant', 'nouveau-voyage');
    await page.fill('#nom', 'Abandonné');
    await fermer(page);
    await attendreEcran(page, 'voyages');
    const apres = await page.evaluate(() => ({
      fenetre: Boolean(document.querySelector('dialog')),
      focus: document.activeElement?.classList.contains('bouton-flottant'),
    }));
    juge.exige(!apres.fenetre, `fenêtre fermée par ${geste} : elle est restée`);
    juge.exige(apres.focus, `fenêtre fermée par ${geste} : le focus ne revient pas au bouton flottant`);
    const vu = await retourSysteme(page, serveur.url);
    juge.exige(vu === HORS, `fenêtre fermée par ${geste} : le retour mène à « ${vu} »`);
    juge.exige(erreurs.length === 0, `fenêtre fermée par ${geste} : erreurs dans la page : ${erreurs.join(' | ')}`);
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
  'voyage, formulaire, fenêtre (3 fermetures, voile sans effet), création, adresse directe, appuis répétés, témoins',
);
