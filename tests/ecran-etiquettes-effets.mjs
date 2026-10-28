// Phase 6 (docs/PLAN.md, critères d'acceptation 1 à 3, et Review Focus 3) : ce que les étiquettes
// créées, renommées ou supprimées changent à l'assistant, à la Bibliothèque et aux voyages. Tout par
// l'interface, le 6 octobre 2026 (horloge fixée), tablette en portrait, thème clair, bibliothèque de
// départ installée par l'appli :
// - critère 1 : le groupe « Transport » (Voiture, Train), rangé entre Climat et Hébergement, devient
//   l'étape « Transport » de l'assistant avec ses deux puces ; le groupe vide « Saison » n'en fait pas ;
// - critère 2 : un voyage créé avec Camping, puis Camping renommée « Bivouac » : l'en-tête du voyage
//   montre toujours « Camping », la fiche de la catégorie Camping (Bibliothèque) montre la puce « Bivouac » ;
// - Review Focus 3 : la catégorie Camping est liée aux deux seules étiquettes Bivouac et Tente.
//   Bivouac se supprime (Camping garde Tente) ; supprimer Tente la laisserait sans étiquette : c'est
//   refusé (règle changée par le chef de projet le 2026-10-26, phase 7 : aucun orphelin), et Camping
//   reste proposée dans l'aperçu d'un nouveau voyage, sa fiche avec la seule puce Tente ; le voyage
//   créé avant reste identique.
import { chromium } from 'playwright';
import { demarrerServeur } from './outils/serveur.mjs';
import { TOUS_FORMATS, commande, fermerEssai, fr, DONNEES, versBibliotheque, vu } from './outils/bibliotheque.mjs';
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
import { attendreEcran, creerJuge, lireStockage, ouvrir } from './outils/page.mjs';
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

// Ouvrir la fiche, toucher « Supprimer » ; rend la fenêtre qui s'ouvre : 'question' ou 'refus'.
async function demanderSuppression(page, selecteur) {
  await page.click(selecteur);
  juge.exige(await attendreOuverte(page), `la fiche de ${selecteur} s'ouvre`);
  await toucher(page, '[data-supprimer]');
  const fenetre = await attendreQue(
    page,
    q => {
      if (document.querySelector('dialog.refus[open]')) return 'refus';
      return document.querySelector(`${q}[open]`) ? 'question' : null;
    },
    QUESTION,
  );
  await calme(page);
  return fenetre;
}

async function supprimer(page, selecteur) {
  juge.exige((await demanderSuppression(page, selecteur)) === 'question', `${selecteur} : pas de question`);
  await page.click(`${QUESTION} .fenetre-pied button:text-is("${fr.suppression.supprimer}")`);
  return attendreFermee(page);
}

// Les étapes de la rangée de l'assistant (nom de chacune) et la page des puces affichée.
const lireEtapes = page => page.$$eval('.etapes-liste .etape-nom', l => l.map(n => n.textContent.trim()));
const lirePuces = page => page.$$eval('.puce-etiquette', l => l.map(p => p.textContent.trim()));

// Menu → Nouveau voyage, informations remplies : l'assistant est prêt à passer à l'étape suivante.
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
// Sur tablette, une seule catégorie montre ses objets : chaque entrée du menu est choisie à son tour,
// pour lire les objets de toutes (au téléphone, l'accordéon d'aujourd'hui les montre déjà).
async function lireVoyage(page) {
  const etiquettes = await page.$$eval('.etiquettes-voyage li', l => l.map(li => li.textContent.trim()));
  if (!(await page.$('.gf-menu')))
    return {
      etiquettes,
      categories: await page.$$eval('#app section.categorie', sections =>
        sections.map(s => ({
          nom: s.querySelector('.categorie-nom b')?.textContent.trim(),
          objets: [...s.querySelectorAll('.objet-nom')].map(o => o.textContent.trim()).toSorted(),
        })),
      ),
    };
  const categories = [];
  for (const id of await page.$$eval('.gf-menu [data-action="choisir"]', l => l.map(b => b.dataset.id))) {
    const entree = `.gf-menu [data-action="choisir"][data-id="${id}"]`;
    await page.click(entree);
    await calme(page);
    categories.push({
      nom: (await page.textContent(`${entree} b`)).trim(),
      objets: await page.$$eval('.gf-liste .objet-nom', l => l.map(o => o.textContent.trim()).toSorted()),
    });
  }
  return { etiquettes, categories };
}

// Avance l'assistant jusqu'à l'aperçu en pressant, dans chaque étape de groupe, les puces voulues
// (cochees = null : toutes). Rend les noms de toutes les puces proposées en route.
async function jusquALApercu(page, cochees) {
  const offertes = [];
  while ((await etapeAffichee(page)).etape !== 'apercu') {
    for (const puce of await page.locator('.puce-etiquette').all()) {
      const nom = (await puce.textContent()).trim();
      offertes.push(nom);
      if ((!cochees || cochees.includes(nom)) && (await puce.getAttribute('aria-pressed')) !== 'true')
        await puce.click();
    }
    await page.click('[data-action="suivant"]');
  }
  await calme(page);
  return offertes;
}

// Ce que le stockage garde d'un voyage : le voyage, ses étiquettes copiées, ses catégories, ses objets
// (quantités et état dans le sac compris), pour comparer avant et après sans passer par l'affichage.
async function voyageStocke(page, nom) {
  const d = await lireStockage(page);
  const voyage = d.voyages.find(v => v.nom === nom);
  const sien = x => x.voyageId === voyage.id;
  return {
    voyage,
    etiquettes: (d.etiquettesDuVoyage ?? []).filter(sien),
    categories: (d.categoriesDuVoyage ?? []).filter(sien),
    objets: (d.objetsDuVoyage ?? []).filter(sien),
  };
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
  await jusquALApercu(page, ['Camping']);
  const apercuAvant = await lireApercu(page);
  juge.exige(apercuAvant.includes('Camping'), `voyage avec Camping : aperçu ${vu(apercuAvant)}`);
  await creerDepuisLAssistant(page);
  await attendreEcran(page, 'voyage');
  const avant = await lireVoyage(page);
  const stockeAvant = await voyageStocke(page, 'Premier');
  juge.exige(vu(avant.etiquettes) === vu(['Camping']), `voyage : en-tête ${vu(avant.etiquettes)}`);
  juge.exige(
    vu(stockeAvant.etiquettes.map(e => e.nom)) === vu(['Camping']) && stockeAvant.objets.length > 0,
    `voyage : données gardées ${vu(stockeAvant)}`,
  );

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
  juge.exige(
    vu(await voyageStocke(page, 'Premier')) === vu(stockeAvant),
    'critère 2 : les données gardées du voyage ont changé',
  );

  await page.click('#app a.lien-retour');
  await attendreEcran(page, 'voyages');
  await versBibliotheque(page);
  await ouvrirFicheCategorie(page, 'Camping');
  const fiche = await lireFiche(page);
  juge.exige(
    vu(fiche?.etiquettes) === vu(['Bivouac', 'Tente']) && vu(fiche.choix) === vu([m.selonEtiquettes]),
    `critère 2 : fiche de Camping ${vu(fiche)}`,
  );
  await page.keyboard.press('Escape');
  juge.exige(await attendreFermee(page), 'critère 2 : la fiche de Camping se ferme');

  // Témoin : tant que Bivouac et Tente existent, « tout presser » fait entrer Camping. La même
  // épreuve après le refus dit que Tente, gardée, la fait toujours entrer.
  await viaMenu(page, '#/voyages');
  await attendreEcran(page, 'voyages');
  await ouvrirAssistant(page, 'Témoin');
  const offertesAvant = await jusquALApercu(page, null);
  juge.exige(
    (await lireApercu(page)).includes('Camping') &&
      offertesAvant.includes('Bivouac') &&
      offertesAvant.includes('Tente'),
    `Review Focus 3, témoin : ${vu(await lireApercu(page))} ${vu(offertesAvant)}`,
  );
  await creerDepuisLAssistant(page);
  await attendreEcran(page, 'voyage');
  await page.click('#app a.lien-retour');
  await attendreEcran(page, 'voyages');
  await versBibliotheque(page);

  // Review Focus 3 : Bivouac se supprime (Camping garde Tente) ; Tente, sa dernière étiquette, est
  // refusée : le refus nomme Camping, « Fermer » rend la fiche de Tente, qui reste.
  await page.click('#app a.lien-retour');
  await attendreEcran(page, 'reglages');
  await page.click('#app a.reglage[href="#/etiquettes"]');
  await attendreEcran(page, 'etiquettes');
  vue = await lire(page);
  juge.exige(await supprimer(page, commande('modifier-etiquette', idEtiquette(vue, 'Bivouac'))), 'Bivouac : supprimée');
  vue = await lire(page);
  const tente = commande('modifier-etiquette', idEtiquette(vue, 'Tente'));
  juge.exige((await demanderSuppression(page, tente)) === 'refus', 'Review Focus 3 : Tente supprimée sans refus');
  const refus = await page.$$eval('dialog.refus .refus-texte b', l => l.map(b => b.textContent.trim()));
  juge.exige(vu(refus) === vu(['Camping']), `Review Focus 3 : refus ${vu(refus)}`);
  await page.click(`dialog.refus .fenetre-pied button:text-is("${fr.refus.fermer}")`);
  juge.exige(await attendreFermee(page, 'dialog.refus'), 'Review Focus 3 : le refus reste ouvert');
  await page.keyboard.press('Escape');
  juge.exige(await attendreFermee(page), 'Review Focus 3 : la fiche de Tente se ferme');
  juge.exige(
    vu((await lire(page)).cartes.find(c => c.nom === 'Hébergement')?.puces.map(p => p.nom)) ===
      vu(['Hôtel', 'Tente', 'Chez l’habitant']),
    'Review Focus 3 : Tente a quitté l’écran',
  );

  await ouvrirAssistant(page, 'Second');
  const offertes = await jusquALApercu(page, null);
  const apercuAvec = await lireApercu(page);
  juge.exige(
    !offertes.includes('Bivouac') && offertes.includes('Tente') && offertes.includes('Voiture'),
    `Review Focus 3 : puces offertes ${vu(offertes)}`,
  );
  juge.exige(
    apercuAvec.includes('Camping'),
    `Review Focus 3 : toutes les puces pressées, Camping n'est plus proposée ${vu(apercuAvec)}`,
  );
  await creerDepuisLAssistant(page);
  await attendreEcran(page, 'voyage');
  const second = await lireVoyage(page);
  juge.exige(
    second.categories.some(c => c.nom === 'Camping') && !second.etiquettes.includes('Bivouac'),
    `Review Focus 3 : « Second » sans la catégorie Camping ${vu(second)}`,
  );
  await page.click('#app a.lien-retour');
  await attendreEcran(page, 'voyages');
  await viaMenu(page, '#/reglages');
  await attendreEcran(page, 'reglages');
  await page.click('#app a.reglage[href="#/bibliotheque"]');
  await attendreEcran(page, 'bibliotheque');
  await ouvrirFicheCategorie(page, 'Camping');
  const avecTente = await lireFiche(page);
  juge.exige(
    vu(avecTente?.choix) === vu([m.selonEtiquettes]) && vu(avecTente.etiquettes) === vu(['Tente']),
    `Review Focus 3 : fiche de Camping ${vu(avecTente)}`,
  );
  await page.keyboard.press('Escape');
  juge.exige(await attendreFermee(page), 'Review Focus 3 : la fiche de Camping se ferme');

  // Le voyage créé avant la suppression est identique, en-tête comprise.
  await viaMenu(page, '#/voyages');
  await attendreEcran(page, 'voyages');
  await page.click('#app a:has-text("Premier")');
  await attendreEcran(page, 'voyage');
  const final = await lireVoyage(page);
  juge.exige(vu(final) === vu(avant), `Review Focus 3 : le voyage a changé ${vu(final)} au lieu de ${vu(avant)}`);
  juge.exige(
    vu(await voyageStocke(page, 'Premier')) === vu(stockeAvant),
    'Review Focus 3 : les données gardées du voyage ont changé',
  );

  await fermerEssai(juge, 'parcours', ouvert);
} finally {
  await navigateur.close();
  await serveur.fermer();
}
juge.conclure(
  'Effets des étiquettes',
  'étapes, voyages existants, Bibliothèque et refus de supprimer la seule étiquette',
);
