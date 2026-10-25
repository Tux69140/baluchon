// Phase 5 (docs/PLAN.md, critères d'acceptation 1, 3, 4 et 5) : la bibliothèque modifiée dans la
// Bibliothèque nourrit les nouveaux voyages, jamais les anciens. Tout par l'interface, le 6 octobre 2026
// (horloge fixée), tablette en portrait, thème clair, bibliothèque de départ installée par l'appli :
// - critère 5, au fil du parcours : un objet sans nom, puis sans valeur, est refusé avec son message ;
// - critère 1 : Alimentation passe de « Toujours incluse » à « Selon les étiquettes » liée à Camping, et
//   reçoit trois objets (5 en tout) ; un voyage avec Camping a Alimentation et ses 5 objets, dans l'aperçu
//   comme une fois créé ; un second voyage sans Camping n'a pas Alimentation ;
// - critère 3 : Repas devient « Repas du soir » : le voyage déjà créé montre toujours « Repas », un
//   nouveau voyage montre « Repas du soir » ;
// - critère 4 : Camping rangée en tête : l'aperçu et le nouveau voyage commencent par Camping, et le
//   voyage déjà créé garde son ordre.
import { chromium } from 'playwright';
import { demarrerServeur } from './outils/serveur.mjs';
import {
  commande,
  fermerEssai,
  fr,
  idDe,
  lire,
  ouvrirBibliotheque,
  versBibliotheque,
  vu,
} from './outils/bibliotheque.mjs';
import {
  attendreFermee,
  bibliothequeStockee,
  enregistrer,
  lireFiche,
  ouvrirFicheCategorie,
  ouvrirFicheObjet,
  ouvrirNouvelObjet,
  saisir,
  segment,
  toucher,
} from './outils/fiches.mjs';
import { attendreEcran, creerJuge } from './outils/page.mjs';
import { attendreQue, calme } from './outils/attente.mjs';
import { creerDepuisLAssistant } from './outils/assistant.mjs';

const m = fr.modele;
const juge = creerJuge();
const serveur = await demarrerServeur();
const navigateur = await chromium.launch();
const MAINTENANT = new Date('2026-10-06T10:00:00');
const DEPART = '2026-11-13';
const RETOUR = '2026-11-15';

// Les catégories avec leurs objets, telles que l'aperçu de l'assistant les montre.
const lireApercu = page =>
  page.evaluate(() =>
    [...document.querySelectorAll('.apercu-categorie')].map(s => ({
      nom: s.querySelector('.categorie-nom b')?.textContent.trim(),
      objets: [...s.querySelectorAll('[data-objet] .objet-nom')].map(o => o.textContent.trim()),
    })),
  );

// Les catégories avec leurs objets, telles que l'écran d'un voyage les montre.
const lireVoyage = page =>
  page.evaluate(() =>
    [...document.querySelectorAll('#app section.categorie')].map(s => ({
      nom: s.querySelector('.categorie-nom b')?.textContent.trim(),
      objets: [...s.querySelectorAll('.objet-nom')].map(o => o.textContent.trim()).toSorted(),
    })),
  );

const noms = vue => vue.map(c => c.nom);
const objetsDe = (vue, nom) => vue.find(c => c.nom === nom)?.objets;

// Menu → Nouveau voyage, le voyage rempli (avec Camping ou non), l'aperçu lu, puis le voyage créé et lu.
async function nouveauVoyage(page, nom, { camping }) {
  await page.click('[data-action="menu"]');
  await attendreQue(page, () => document.querySelector('dialog.tiroir[open]') !== null);
  await calme(page);
  await page.click('dialog.tiroir a.tiroir-lien[href="#/nouveau-voyage"]');
  await attendreEcran(page, 'nouveau-voyage');
  await page.fill('#nom', nom);
  await page.fill('#destination', 'Vercors');
  await page.click('[data-mois="1"]');
  await page.click(`[data-jour="${DEPART}"]`);
  await page.click(`[data-jour="${RETOUR}"]`);
  while ((await page.$eval('.formulaire-corps', c => c.dataset.etape)) !== 'apercu') {
    await page.click('[data-action="suivant"]');
    if (camping)
      for (const puce of await page.locator('.puce-etiquette').all())
        if ((await puce.textContent()).trim() === 'Camping') await puce.click();
  }
  await calme(page);
  const apercu = await lireApercu(page);
  await creerDepuisLAssistant(page);
  await attendreEcran(page, 'voyage');
  return { apercu, voyage: await lireVoyage(page) };
}

// Du voyage à la Bibliothèque : le lien de retour mène à l'accueil, d'où Menu → Réglages → Bibliothèque.
async function retourBibliotheque(page) {
  await page.click('#app a.lien-retour');
  await attendreEcran(page, 'voyages');
  await versBibliotheque(page);
}

// Voyage déjà créé, rouvert depuis l'accueil (sa carte) ; on y arrive du voyage par son lien de retour,
// ou de la Bibliothèque par le menu.
async function rouvrir(page, nom) {
  if ((await page.getAttribute('#app', 'data-ecran')) === 'voyage') await page.click('#app a.lien-retour');
  else {
    await page.click('[data-action="menu"]');
    await attendreQue(page, () => document.querySelector('dialog.tiroir[open]') !== null);
    await calme(page);
    await page.click('dialog.tiroir a.tiroir-lien[href="#/voyages"]');
  }
  await attendreEcran(page, 'voyages');
  await page.click(`#app a:has-text(${JSON.stringify(nom)})`);
  await attendreEcran(page, 'voyage');
  return lireVoyage(page);
}

const ALIMENTATION_5 = ['Gourde', 'Pâtes', 'Repas', 'Riz', 'Thé'];

try {
  const ouvert = await ouvrirBibliotheque(navigateur, serveur.url, 'tablette-portrait', { maintenant: MAINTENANT });
  const { page } = ouvert;

  // Critère 5 : un objet sans nom, puis sans valeur, est refusé avec son message ; rien n'est écrit.
  await ouvrirNouvelObjet(page, 'Alimentation');
  await enregistrer(page);
  const sansNom = await lireFiche(page);
  juge.exige(vu(sansNom?.erreurs) === vu([m.objet.erreurs.nomManquant]), `sans nom : ${vu(sansNom)}`);
  await saisir(page, '#f-nom', 'Pâtes');
  await saisir(page, 'input[data-nombre="valeur"]', '');
  await enregistrer(page);
  const sansValeur = await lireFiche(page);
  juge.exige(vu(sansValeur?.erreurs) === vu([m.objet.erreurs.valeurManquante]), `sans valeur : ${vu(sansValeur)}`);
  juge.exige(
    (await bibliothequeStockee(page)).objets.every(o => o.nom !== 'Pâtes'),
    'refus : un objet a été écrit malgré le refus',
  );

  // Critère 1 : trois objets en tout (Pâtes, Riz, Thé), Alimentation liée à Camping.
  await saisir(page, 'input[data-nombre="valeur"]', '1');
  await enregistrer(page);
  juge.exige(await attendreFermee(page), 'Pâtes : la fiche reste ouverte');
  for (const nom of ['Riz', 'Thé']) {
    await ouvrirNouvelObjet(page, 'Alimentation');
    await saisir(page, '#f-nom', nom);
    await enregistrer(page);
    juge.exige(await attendreFermee(page), `${nom} : la fiche reste ouverte`);
  }
  await ouvrirFicheCategorie(page, 'Alimentation');
  await segment(page, m.selonEtiquettes);
  await toucher(page, '.puce-etiquette:has-text("Camping")');
  await enregistrer(page);
  juge.exige(await attendreFermee(page), 'Alimentation : la fiche reste ouverte');
  const biblio = await lire(page);
  const alim = biblio.cartes.find(c => c.nom === 'Alimentation');
  juge.exige(
    vu(alim?.objets.map(o => o.nom)) === vu(ALIMENTATION_5) && vu(alim.puces) === vu(['Camping']),
    `bibliothèque : Alimentation ${vu(alim)}`,
  );

  // Premier voyage, Camping cochée : Alimentation et ses 5 objets, à l'aperçu et dans le voyage.
  await page.click('#app a.lien-retour');
  await attendreEcran(page, 'reglages');
  const un = await nouveauVoyage(page, 'Avec camping', { camping: true });
  for (const [lieu, vue] of [
    ['aperçu', un.apercu],
    ['voyage', un.voyage],
  ])
    juge.exige(
      vu(objetsDe(vue, 'Alimentation')?.toSorted()) === vu(ALIMENTATION_5),
      `critère 1, ${lieu} avec Camping : ${vu(vue)}`,
    );

  // Second voyage, sans Camping : pas d'Alimentation.
  await retourBibliotheque(page);
  const deux = await nouveauVoyage(page, 'Sans camping', { camping: false });
  juge.exige(
    !noms(deux.apercu).includes('Alimentation') && !noms(deux.voyage).includes('Alimentation'),
    `critère 1, sans Camping : ${vu(deux)}`,
  );

  // Critère 3 : Repas renommé « Repas du soir ». Le voyage déjà créé garde « Repas ».
  await retourBibliotheque(page);
  await ouvrirFicheObjet(page, 'Alimentation', 'Repas');
  await saisir(page, '#f-nom', 'Repas du soir');
  await enregistrer(page);
  juge.exige(await attendreFermee(page), 'Repas : la fiche reste ouverte');
  const ancien = await rouvrir(page, 'Avec camping');
  juge.exige(
    vu(objetsDe(ancien, 'Alimentation')?.toSorted()) === vu(ALIMENTATION_5),
    `critère 3, voyage existant : ${vu(ancien)}`,
  );
  await retourBibliotheque(page);
  const trois = await nouveauVoyage(page, 'Troisième', { camping: true });
  juge.exige(
    vu(objetsDe(trois.apercu, 'Alimentation')) === vu(['Gourde', 'Pâtes', 'Repas du soir', 'Riz', 'Thé']) &&
      vu(objetsDe(trois.voyage, 'Alimentation')) === vu(['Gourde', 'Pâtes', 'Repas du soir', 'Riz', 'Thé']),
    `critère 3, nouveau voyage : ${vu(trois)}`,
  );

  // Critère 4 : Camping rangée en tête, quatre fois ▲ (elle était dernière) ; le nouvel
  // ordre ouvre l'aperçu et le voyage créé, le voyage déjà créé garde le sien.
  await retourBibliotheque(page);
  const camping = idDe(await lire(page), 'Camping');
  await page.click('[data-action="ranger"]');
  await calme(page);
  for (let i = 0; i < 4; i++) {
    await page.click(commande('monter', camping));
    await calme(page);
  }
  await page.click('[data-action="terminer"]');
  await calme(page);
  const ordre = (await lire(page)).cartes.map(c => c.nom);
  juge.exige(ordre[0] === 'Camping', `critère 4, bibliothèque : ordre ${vu(ordre)}`);
  const quatre = await nouveauVoyage(page, 'Quatrième', { camping: true });
  juge.exige(
    noms(quatre.apercu)[0] === 'Camping' && noms(quatre.voyage)[0] === 'Camping',
    `critère 4, nouveau voyage : ${vu({ apercu: noms(quatre.apercu), voyage: noms(quatre.voyage) })}`,
  );
  const avant = await rouvrir(page, 'Avec camping');
  juge.exige(
    noms(avant)[0] !== 'Camping' && vu(noms(avant)) === vu(noms(un.voyage)),
    `critère 4, voyage existant : ${vu(noms(avant))} au lieu de ${vu(noms(un.voyage))}`,
  );

  await fermerEssai(juge, 'parcours', ouvert);
} finally {
  await navigateur.close();
  await serveur.fermer();
}
juge.conclure('Bibliothèque et voyages', 'la bibliothèque modifiée nourrit les nouveaux voyages, pas les anciens');
