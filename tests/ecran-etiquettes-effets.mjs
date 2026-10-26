// Phase 6 (docs/PLAN.md, critères d'acceptation 1 à 3, et Review Focus 3) : ce que les étiquettes
// créées, renommées ou supprimées changent à l'assistant, à la Bibliothèque et aux voyages. Tout par
// l'interface, le 6 octobre 2026 (horloge fixée), tablette en portrait, thème clair, bibliothèque de
// départ installée par l'appli :
// - critère 1 : le groupe « Transport » (Voiture, Train), rangé entre Climat et Hébergement, devient
//   l'étape « Transport » de l'assistant avec ses deux puces ; le groupe vide « Saison » n'en fait pas ;
// - critère 2 : un voyage créé avec Camping, puis Camping renommée « Bivouac » : l'en-tête du voyage
//   montre toujours « Camping », la fiche de la catégorie Camping (Bibliothèque) montre la puce « Bivouac » ;
// - Review Focus 3 : Bivouac et Tente supprimées (la catégorie Camping est liée à ces deux seules
//   étiquettes) : elle n'entre plus dans l'aperçu d'un nouveau voyage, sa fiche reste « Selon les
//   étiquettes » sans puce cochée et refuse d'enregistrer ; le voyage créé avant reste identique.
import { chromium } from 'playwright';
import { demarrerServeur } from './outils/serveur.mjs';
import {
  TOUS_FORMATS,
  commande,
  fermerEssai,
  fr,
  DONNEES,
  lire as lireBibliotheque,
  versBibliotheque,
  vu,
} from './outils/bibliotheque.mjs';
import {
  attendreFermee,
  attendreOuverte,
  enregistrer,
  lireFiche,
  ouvrirFicheCategorie,
  saisir,
  toucher,
} from './outils/fiches.mjs';
import { arbreDe, arbreStocke, idEtiquette, idGroupe, lire } from './outils/etiquettes.mjs';
import { attendreEcran, creerJuge, ouvrir } from './outils/page.mjs';
import { attendreQue, calme } from './outils/attente.mjs';
import { creerDepuisLAssistant, etapeAffichee } from './outils/assistant.mjs';

const m = fr.modele;
const juge = creerJuge();
const serveur = await demarrerServeur();
const navigateur = await chromium.launch();
const QUESTION = 'dialog[role="alertdialog"]';

async function viaMenu(page, adresse) {
  await page.click('[data-action="menu"]');
  await attendreQue(page, () => document.querySelector('dialog.tiroir[open]') !== null);
  await calme(page);
  await page.click(`dialog.tiroir a.tiroir-lien[href="${adresse}"]`);
}

async function versEtiquettes(page) {
  await viaMenu(page, '#/reglages');
  await attendreEcran(page, 'reglages');
  await page.click('#app a.reglage[href="#/etiquettes"]');
  await attendreEcran(page, 'etiquettes');
}

// Ouvrir la fiche par sa commande, y taper un nom, l'enregistrer ; rend vrai si elle s'est fermée.
async function nommer(page, selecteur, nom) {
  await page.click(selecteur);
  juge.exige(await attendreOuverte(page), `la fiche de ${selecteur} s'ouvre`);
  await saisir(page, '#f-nom', nom);
  await enregistrer(page);
  return attendreFermee(page);
}

async function supprimer(page, selecteur) {
  await page.click(selecteur);
  juge.exige(await attendreOuverte(page), `la fiche de ${selecteur} s'ouvre`);
  await toucher(page, '[data-supprimer]');
  await attendreQue(page, q => document.querySelector(`${q}[open]`) !== null, QUESTION);
  await calme(page);
  await page.click(`${QUESTION} .fenetre-pied button:text-is("${fr.suppression.supprimer}")`);
  return attendreFermee(page);
}

// Les étapes de la rangée de l'assistant (nom de chacune) et la page des puces affichée.
const lireEtapes = page => page.$$eval('.etapes-liste .etape-nom', l => l.map(n => n.textContent.trim()));
const lirePuces = page => page.$$eval('.puce-etiquette', l => l.map(p => p.textContent.trim()));

// Menu → Nouveau voyage, informations remplies, jusqu'à l'étape voulue (null = l'aperçu).
async function ouvrirAssistant(page, nom) {
  await viaMenu(page, '#/nouveau-voyage');
  await attendreEcran(page, 'nouveau-voyage');
  await page.fill('#nom', nom);
  await page.fill('#destination', 'Vercors');
  await page.click('[data-mois="1"]');
  await page.click('[data-jour="2026-11-13"]');
  await page.click('[data-jour="2026-11-15"]');
}

// Les catégories de l'aperçu de l'assistant, et celles de l'écran d'un voyage.
const lireApercu = page => page.$$eval('.apercu-categorie .categorie-nom b', l => l.map(b => b.textContent.trim()));
const lireVoyage = page =>
  page.evaluate(() => ({
    etiquettes: [...document.querySelectorAll('.etiquettes-voyage li')].map(li => li.textContent.trim()),
    categories: [...document.querySelectorAll('#app section.categorie')].map(s => ({
      nom: s.querySelector('.categorie-nom b')?.textContent.trim(),
      objets: [...s.querySelectorAll('.objet-nom')].map(o => o.textContent.trim()).toSorted(),
    })),
  }));

// Avance l'assistant jusqu'à l'aperçu en pressant, dans chaque étape de groupe, les puces voulues.
async function jusqu_a_lApercu(page, cochees) {
  while ((await etapeAffichee(page)).etape !== 'apercu') {
    for (const puce of await page.locator('.puce-etiquette').all())
      if (cochees.includes((await puce.textContent()).trim()) && (await puce.getAttribute('aria-pressed')) !== 'true')
        await puce.click();
    await page.click('[data-action="suivant"]');
  }
  await calme(page);
}

try {
  const { taille, ecran, tactile } = TOUS_FORMATS['tablette-portrait'];
  const ouvert = await ouvrir(navigateur, serveur.url, {
    taille,
    ecran,
    tactile,
    theme: 'light',
    donnees: DONNEES,
    maintenant: new Date('2026-10-06T10:00:00'),
    adresse: '#/voyages',
  });
  const { page } = ouvert;
  page.setDefaultTimeout(5000);
  await attendreEcran(page, 'voyages');
  await versEtiquettes(page);

  // Critère 1 : « Transport » (Voiture, Train) et « Saison » (vide), puis Transport remonté d'un cran.
  juge.exige(await nommer(page, '#app [data-action="nouveau-groupe"]', 'Transport'), 'Transport : fiche fermée');
  let vue = await lire(page);
  const transport = idGroupe(vue, 'Transport');
  for (const nom of ['Voiture', 'Train'])
    juge.exige(await nommer(page, commande('nouvelle-etiquette', transport), nom), `${nom} : fiche fermée`);
  juge.exige(await nommer(page, '#app [data-action="nouveau-groupe"]', 'Saison'), 'Saison : fiche fermée');
  await page.click('#app [data-action="ranger"]');
  await calme(page);
  await page.click(commande('monter', transport));
  await calme(page);
  await page.click('#app [data-action="terminer"]');
  await calme(page);
  juge.exige(
    (await arbreStocke(page)) ===
      arbreDe({
        Activités: ['Randonnée', 'Camping', 'Plage'],
        Climat: ['Chaud', 'Froid', 'Pluie'],
        Transport: ['Voiture', 'Train'],
        Hébergement: ['Hôtel', 'Tente', 'Chez l’habitant'],
        Saison: [],
      }),
    `rangement : ${await arbreStocke(page)}`,
  );

  await ouvrirAssistant(page, 'Premier');
  const etapes = await lireEtapes(page);
  const noms = ['Activités', 'Climat', 'Transport', 'Hébergement'];
  juge.exige(
    vu(etapes.slice(1, 5)) === vu(noms) && etapes.length === 6 && !etapes.includes('Saison'),
    `critère 1 : étapes ${vu(etapes)}`,
  );
  // Aller à l'étape « Transport » (la troisième après les informations) : titre et puces.
  for (let i = 0; i < 3; i++) await page.click('[data-action="suivant"]');
  const etape = await etapeAffichee(page);
  juge.exige(
    etape.titre?.includes('Transport') && vu(await lirePuces(page)) === vu(['Voiture', 'Train']),
    `critère 1 : étape ${vu(etape)} puces ${vu(await lirePuces(page))}`,
  );

  // Critère 2 : voyage avec Camping, puis Camping renommée Bivouac.
  await page.click('[data-aller="1"]');
  await calme(page);
  await jusqu_a_lApercu(page, ['Camping']);
  const apercuAvant = await lireApercu(page);
  juge.exige(apercuAvant.includes('Camping'), `voyage avec Camping : aperçu ${vu(apercuAvant)}`);
  await creerDepuisLAssistant(page);
  await attendreEcran(page, 'voyage');
  const avant = await lireVoyage(page);
  juge.exige(vu(avant.etiquettes) === vu(['Camping']), `voyage : en-tête ${vu(avant.etiquettes)}`);

  await page.click('#app a.lien-retour');
  await attendreEcran(page, 'voyages');
  await versEtiquettes(page);
  vue = await lire(page);
  juge.exige(
    await nommer(page, commande('modifier-etiquette', idEtiquette(vue, 'Camping')), 'Bivouac'),
    'renommer Camping : fiche fermée',
  );
  await viaMenu(page, '#/voyages');
  await attendreEcran(page, 'voyages');
  await page.click('#app a:has-text("Premier")');
  await attendreEcran(page, 'voyage');
  const apres = await lireVoyage(page);
  juge.exige(vu(apres) === vu(avant), `critère 2 : le voyage a changé ${vu(apres)} au lieu de ${vu(avant)}`);

  await page.click('#app a.lien-retour');
  await attendreEcran(page, 'voyages');
  await versBibliotheque(page);
  const fiche = await (async () => {
    await ouvrirFicheCategorie(page, 'Camping');
    return lireFiche(page);
  })();
  juge.exige(
    vu(fiche?.etiquettes) === vu(['Bivouac', 'Tente']) && vu(fiche.choix) === vu([m.selonEtiquettes]),
    `critère 2 : fiche de Camping ${vu(fiche)}`,
  );
  await page.keyboard.press('Escape');
  await attendreFermee(page);

  // Review Focus 3 : Bivouac et Tente supprimées (la catégorie n'a pas d'autre étiquette).
  await page.click('#app a.lien-retour');
  await attendreEcran(page, 'reglages');
  await page.click('#app a.reglage[href="#/etiquettes"]');
  await attendreEcran(page, 'etiquettes');
  vue = await lire(page);
  for (const nom of ['Bivouac', 'Tente']) {
    juge.exige(await supprimer(page, commande('modifier-etiquette', idEtiquette(vue, nom))), `${nom} : supprimée`);
    vue = await lire(page);
  }

  await ouvrirAssistant(page, 'Second');
  await jusqu_a_lApercu(page, []);
  const apercuSans = await lireApercu(page);
  juge.exige(
    !apercuSans.includes('Camping') && apercuSans.length > 0,
    `Review Focus 3 : l'aperçu garde Camping ${vu(apercuSans)}`,
  );
  await creerDepuisLAssistant(page);
  await attendreEcran(page, 'voyage');
  await page.click('#app a.lien-retour');
  await attendreEcran(page, 'voyages');
  await viaMenu(page, '#/reglages');
  await attendreEcran(page, 'reglages');
  await page.click('#app a.reglage[href="#/bibliotheque"]');
  await attendreEcran(page, 'bibliotheque');
  const carte = (await lireBibliotheque(page)).cartes.find(c => c.nom === 'Camping');
  await ouvrirFicheCategorie(page, 'Camping');
  const sans = await lireFiche(page);
  juge.exige(
    vu(sans?.choix) === vu([m.selonEtiquettes]) && sans.etiquettes.length === 0,
    `Review Focus 3 : fiche ${vu(sans)} carte ${vu(carte)}`,
  );
  await enregistrer(page);
  const refus = await lireFiche(page);
  juge.exige(
    vu(refus?.erreurs) === vu([m.categorie.erreurs.etiquettesManquantes]),
    `Review Focus 3 : refus ${vu(refus?.erreurs)}`,
  );

  // Le refus ne change rien : on ferme la fiche (aucune saisie, donc aucune question d'abandon).
  await page.keyboard.press('Escape');
  juge.exige(await attendreFermee(page), 'Review Focus 3 : la fiche se ferme');

  // Le voyage créé avant la suppression est identique, en-tête comprise.
  await viaMenu(page, '#/voyages');
  await attendreEcran(page, 'voyages');
  await page.click('#app a:has-text("Premier")');
  await attendreEcran(page, 'voyage');
  const final = await lireVoyage(page);
  juge.exige(vu(final) === vu(avant), `Review Focus 3 : le voyage a changé ${vu(final)} au lieu de ${vu(avant)}`);

  await fermerEssai(juge, 'parcours', ouvert);
} finally {
  await navigateur.close();
  await serveur.fermer();
}
juge.conclure('Effets des étiquettes', 'étapes, voyages existants, Bibliothèque et suppression de la seule étiquette');
