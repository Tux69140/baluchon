// Phase 11, tâche 7 (docs/superpowers/specs/2026-10-30-phase-11-refaire-supprimer-design.md, « Supprimer un
// voyage » ; maquette validée le 2026-10-30, docs/maquettes/refaire/) : supprimer un voyage, puis « Annuler ».
// - depuis le voyage : la question « Supprimer le voyage « … » ? » chiffre sa liste et ce qui est déjà dans
//   le sac (nombres en gras), « Garder » d'abord, « Supprimer » en rouge ; « Garder » ne change rien ;
//   « Supprimer » ramène à Mes voyages, carte absente, bandeau « Voyage « … » supprimé » ; « Annuler » rend la
//   carte à sa place, le focus sur son lien, et le voyage relu égal à celui d'avant (coches, achats,
//   quantités fixées, objet retiré à sortir, écartés) ;
// - depuis une carte : rien dans le sac, pas de « dont » ; « Supprimer » laisse sur Mes voyages, sans
//   changer le défilement, carte absente ; « Annuler » de même ;
// - vigilance 2 : une panne de la suppression dit le message de panne habituel, le voyage reste, on reste
//   sur l'écran ; une panne de « Annuler » le dit, le bandeau reste, un second appui réussit ;
// - vigilance 3 : « Annuler » touché depuis le voyage d'un autre, puis depuis Réglages : la carte est là au
//   retour à Mes voyages ;
// - une écriture de la bibliothèque pendant le bandeau ne le retire pas ;
// - vigilance 5 : un nom long ne fait pas déborder la fenêtre de question au téléphone.
// Captures : la question (depuis le voyage) et le bandeau sur Mes voyages, aux quatre formats × 2 thèmes
// (captures-travail/).
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { chromium } from 'playwright';
import { a, lireBandeau, versMesVoyages } from './outils/annulation.mjs';
import { attendreQue, calme } from './outils/attente.mjs';
import { TOUS_FORMATS, fr, remplir, versBibliotheque, vu } from './outils/bibliotheque.mjs';
import { attendreFermee, enregistrer, ouvrirFicheObjet, saisir } from './outils/fiches.mjs';
import {
  CAPTURES,
  NOMS_THEME,
  attendreEcran,
  creerJuge,
  ecrireStockage,
  lireStockage,
  ouvrir,
  verifierCommandes,
} from './outils/page.mjs';
import { demarrerServeur } from './outils/serveur.mjs';
import { DONNEES as ESSAI, NOM } from './outils/voyage-essai.mjs';

const juge = creerJuge();
const serveur = await demarrerServeur();
const navigateur = await chromium.launch();
const s = fr.suppressionVoyage;
const QUESTION = 'dialog[role="alertdialog"]';
const QUATRE = ['telephone', 'tablette-portrait', 'tablette-paysage', 'ordinateur'];
// L'ordinateur des captures : 1920 × 1080, à la souris.
const APPAREILS = { ...TOUS_FORMATS, ordinateur: { taille: { width: 1920, height: 1080 }, tactile: false } };
const objets = n => remplir(fr.ajustement.choix.objets[n === 1 ? 'one' : 'other'], { n });

// Le voyage d'essai, enrichi de ce qu'« Annuler » doit rendre à l'identique : des achats, une quantité
// fixée à la main, un objet retiré dont une pièce attend d'être sortie du sac, des objets écartés ; et
// assez d'autres voyages pour que la liste défile au téléphone.
const objetV1 = ESSAI.objetsDuVoyage.find(o => o.voyageId === 'v1');
const DONNEES = {
  ...ESSAI,
  toucheRetour: true,
  voyages: [
    ...ESSAI.voyages,
    ...['Lac', 'Mer', 'Neige', 'Ouest', 'Plaine', 'Quai'].map((nom, i) => ({
      ...ESSAI.voyages[1],
      id: `x${i}`,
      nom,
    })),
  ],
  objetsDuVoyage: [
    ...ESSAI.objetsDuVoyage,
    {
      ...objetV1,
      id: 'o-gat',
      categorieId: 'c-ali',
      nom: 'Gâteaux',
      quantite: 3,
      quantiteManuelle: true,
      dansLeSac: 0,
      aAcheter: true,
      achetes: 2,
      consommable: true,
    },
    { ...objetV1, id: 'o-par', categorieId: 'c-vet', modeleId: 'm-par', nom: 'Parapluie', quantite: 0, dansLeSac: 1 },
  ],
  objetsEcartes: [
    { voyageId: 'v1', modeleId: 'm-tente' },
    { voyageId: 'v1', modeleId: 'm-par' },
    { voyageId: 'v2', modeleId: 'm-bonnet' },
  ],
};
// v1 : 15 objets (le Parapluie retiré n'en est plus), dont 11 avec au moins une pièce dans le sac
// (le Parapluie compris) ; v2 : 1 objet, rien dans le sac.
const TEXTE_V1 = remplir(s.texteSac, { compte: objets(15), sac: remplir(s.dansLeSac, { n: 11 }) });
const TEXTE_V2 = remplir(s.texte, { compte: objets(1) });

// Ce que le stockage garde d'un voyage, chaque liste rangée par id : un voyage rétabli est réécrit à la fin
// des listes, l'appli le relit à sa place.
async function voyageStocke(page, id) {
  const d = await lireStockage(page);
  const de = cle => (d[cle] ?? []).filter(x => (x.voyageId ?? x.id) === id);
  const parId = liste => [...liste].sort((x, y) => (x.id ?? x.modeleId).localeCompare(y.id ?? y.modeleId));
  const voyage = (d.voyages ?? []).find(v => v.id === id) ?? null;
  return vu({
    voyage,
    etiquettes: parId(de('etiquettesDuVoyage')),
    categories: parId(de('categoriesDuVoyage')),
    objets: parId(de('objetsDuVoyage')),
    ecartes: parId((d.objetsEcartes ?? []).filter(e => e.voyageId === id)),
  });
}
const voyageAbsent = async (page, id) =>
  !(await lireStockage(page)).voyages.some(v => v.id === id) &&
  !(await lireStockage(page)).objetsDuVoyage.some(o => o.voyageId === id);

async function poser(page, cle, valeur) {
  await ecrireStockage(page, { ...(await lireStockage(page)), [cle]: valeur });
}

async function ouvrirAccueil(format, theme = 'light') {
  const { taille, ecran, tactile } = APPAREILS[format];
  const ouvert = await ouvrir(navigateur, serveur.url, {
    taille,
    ecran,
    tactile,
    theme,
    donnees: DONNEES,
    adresse: '#/voyages',
  });
  // Une commande attendue qui ne vient pas fait buter l'essai vite, sans attendre 30 s.
  ouvert.page.setDefaultTimeout(5000);
  await attendreEcran(ouvert.page, 'voyages');
  return ouvert;
}

// La panne simulée est attendue : seule une autre erreur est une faute.
async function fermer(cas, { contexte, erreurs, sorties }) {
  const vraies = erreurs.filter(e => !e.includes('Panne simulée'));
  juge.exige(vraies.length === 0, `${cas} : erreurs dans la page : ${vraies.join(' | ')}`);
  juge.exige(sorties.length === 0, `${cas} : requêtes hors de l’appli : ${sorties.join(', ')}`);
  await contexte.close();
}

const carte = id => `li.carte-avec-actions:has(> a.carte-voyage[href="#/voyage/${id}"])`;
const cartes = page =>
  page.evaluate(() => [...document.querySelectorAll('a.carte-voyage')].map(l => l.getAttribute('href')));

async function ouvrirVoyage(page, id) {
  await page.click(`${carte(id)} > a.carte-voyage`);
  await attendreEcran(page, 'voyage');
}

// La ligne « Supprimer ce voyage » du menu « ⋮ » (du titre du voyage, ou de la carte), puis la question.
async function demanderSuppression(page, id = null) {
  const bouton = id ? `${carte(id)} > .menu-voyage-bouton` : '.voyage-titre .menu-voyage-bouton';
  await page.click(bouton);
  await attendreQue(page, () => document.querySelector('.menu-voyage:popover-open') !== null);
  await calme(page);
  await page.click('.menu-voyage:popover-open [data-menu="supprimer"]');
  await attendreQue(page, q => document.querySelector(`${q}[open]`) !== null, QUESTION);
  await calme(page);
}

async function repondre(page, libelle) {
  await page.click(`${QUESTION} .fenetre-pied button:text-is("${libelle}")`);
  await attendreQue(page, q => !document.querySelector(q), QUESTION);
  await calme(page);
}

// Ce que montre la question : son titre, son texte, les morceaux en gras, ses boutons, et si elle déborde.
const lireQuestion = page =>
  page.evaluate(q => {
    const d = document.querySelector(q);
    if (!d) return null;
    const r = d.getBoundingClientRect();
    return {
      titre: d.querySelector('h2').textContent,
      texte: d.querySelector('#suppression-texte')?.textContent ?? null,
      gras: [...d.querySelectorAll('#suppression-texte b')].map(b => b.textContent),
      balises: [...d.querySelectorAll('#suppression-texte *')].map(e => e.tagName.toLowerCase()),
      boutons: [...d.querySelectorAll('.fenetre-pied button')].map(b => [b.textContent.trim(), b.className]),
      focus: document.activeElement?.textContent.trim() ?? null,
      deborde: r.left < 0 || r.right > innerWidth || d.scrollWidth > d.clientWidth,
      titreDeborde: [...d.querySelectorAll('h2, p')].some(e => e.scrollWidth > e.clientWidth),
    };
  }, QUESTION);

const attendreBandeau = page =>
  attendreQue(page, () => document.querySelector('.bandeau-annuler')?.matches(':popover-open') ?? false);
const annulerBandeau = page => page.click('.bandeau-annuler button');
const alerte = page =>
  page.evaluate(() => {
    const el = document.querySelector('.alerte-haut');
    return el?.matches(':popover-open') ? el.textContent.trim() : null;
  });
const ecran = page => page.evaluate(() => document.querySelector('#app').dataset.ecran);
const focusSur = page => page.evaluate(() => document.activeElement?.getAttribute('href') ?? null);
const bandeauV1 = remplir(a.voyage, { nom: NOM });

try {
  await mkdir(CAPTURES, { recursive: true });

  // 1. Depuis le voyage, aux quatre formats × 2 thèmes : question, « Garder », « Supprimer », bandeau,
  // « Annuler ».
  for (const theme of ['light', 'dark'])
    for (const format of QUATRE) {
      const cas = `depuis le voyage, ${format}, ${NOMS_THEME[theme]}`;
      const capture = nom => page.screenshot({ path: join(CAPTURES, `${nom}-${format}-${NOMS_THEME[theme]}.png`) });
      const ouvert = await ouvrirAccueil(format, theme);
      const { page } = ouvert;
      const avant = await voyageStocke(page, 'v1');
      const ordre = await cartes(page);
      await ouvrirVoyage(page, 'v1');
      await demanderSuppression(page);
      const q = await lireQuestion(page);
      juge.exige(
        q?.titre === remplir(s.titre, { nom: NOM }) &&
          q.texte === TEXTE_V1 &&
          vu(q.gras) === vu([objets(15), remplir(s.dansLeSac, { n: 11 })]) &&
          vu(q.balises) === vu(['b', 'b']) &&
          vu(q.boutons.map(([l]) => l)) === vu([fr.suppression.garder, fr.suppression.supprimer]) &&
          q.boutons[1][1].includes('bouton-danger') &&
          !q.boutons[0][1].includes('bouton-danger') &&
          q.focus === fr.suppression.garder &&
          !q.deborde,
        `${cas} : question ${vu(q)}`,
      );
      await verifierCommandes(page, juge, `${cas}, question`);
      await capture('voyage-supprimer-question');

      await repondre(page, fr.suppression.garder);
      juge.exige(
        (await ecran(page)) === 'voyage' && (await voyageStocke(page, 'v1')) === avant && !(await lireBandeau(page)),
        `${cas} : « Garder » a changé quelque chose`,
      );

      await demanderSuppression(page);
      await repondre(page, fr.suppression.supprimer);
      await attendreEcran(page, 'voyages');
      await attendreBandeau(page);
      await calme(page);
      const b = await lireBandeau(page);
      const sans = await cartes(page);
      juge.exige(
        b?.texte === bandeauV1 && b.touchable && b.balises === 0 && b.hote === 'page',
        `${cas} : bandeau ${vu(b)}`,
      );
      juge.exige(
        vu(sans) === vu(ordre.filter(h => h !== '#/voyage/v1')) && (await voyageAbsent(page, 'v1')),
        `${cas} : après la suppression, cartes ${vu(sans)}`,
      );
      await verifierCommandes(page, juge, `${cas}, bandeau`);
      await capture('voyages-supprime-bandeau');

      await annulerBandeau(page);
      await attendreQue(page, () => !document.querySelector('.bandeau-annuler'));
      await attendreQue(page, () => document.querySelector('a.carte-voyage[href="#/voyage/v1"]') !== null);
      await calme(page);
      juge.exige(vu(await cartes(page)) === vu(ordre), `${cas} : après « Annuler », cartes ${vu(await cartes(page))}`);
      juge.exige((await voyageStocke(page, 'v1')) === avant, `${cas} : le voyage rétabli n'est pas celui d'avant`);
      juge.exige((await focusSur(page)) === '#/voyage/v1', `${cas} : focus après « Annuler » ${await focusSur(page)}`);
      await fermer(cas, ouvert);
    }

  // 2. Depuis une carte, défilement en cours : rien dans le sac, pas de « dont » ; on reste sur Mes voyages.
  {
    const cas = 'depuis une carte';
    const ouvert = await ouvrirAccueil('telephone');
    const { page } = ouvert;
    const avant = await voyageStocke(page, 'v2');
    const ordre = await cartes(page);
    await page.evaluate(() => scrollTo(0, 150));
    await calme(page);
    const defilement = await page.evaluate(() => scrollY);
    juge.exige(defilement === 150, `${cas} : la liste ne défile pas (${defilement})`);
    await demanderSuppression(page, 'v2');
    const q = await lireQuestion(page);
    juge.exige(
      q?.titre === remplir(s.titre, { nom: 'Autre' }) && q.texte === TEXTE_V2 && vu(q.gras) === vu([objets(1)]),
      `${cas} : question ${vu(q)}`,
    );
    await repondre(page, fr.suppression.garder);
    juge.exige(
      (await ecran(page)) === 'voyages' && vu(await cartes(page)) === vu(ordre) && !(await lireBandeau(page)),
      `${cas} : « Garder » a changé quelque chose`,
    );
    await demanderSuppression(page, 'v2');
    await repondre(page, fr.suppression.supprimer);
    await attendreBandeau(page);
    await attendreQue(page, () => !document.querySelector('a.carte-voyage[href="#/voyage/v2"]'));
    await calme(page);
    const b = await lireBandeau(page);
    juge.exige(
      (await ecran(page)) === 'voyages' &&
        (await page.evaluate(() => location.hash)) === '#/voyages' &&
        b?.texte === remplir(a.voyage, { nom: 'Autre' }) &&
        vu(await cartes(page)) === vu(ordre.filter(h => h !== '#/voyage/v2')) &&
        (await voyageAbsent(page, 'v2')),
      `${cas} : après la suppression ${vu({ b, cartes: await cartes(page) })}`,
    );
    juge.exige(
      (await page.evaluate(() => scrollY)) === defilement,
      `${cas} : défilement après la suppression ${await page.evaluate(() => scrollY)}`,
    );
    // La liste défilée tout en bas, la carte rendue (la première) hors de la vue : la focaliser ne fait pas
    // défiler.
    await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
    await calme(page);
    const enBas = await page.evaluate(() => scrollY);
    juge.exige(enBas > defilement, `${cas} : la liste ne défile pas jusqu’en bas (${enBas})`);
    await annulerBandeau(page);
    await attendreQue(page, () => document.querySelector('a.carte-voyage[href="#/voyage/v2"]') !== null);
    await calme(page);
    juge.exige(
      vu(await cartes(page)) === vu(ordre) && (await voyageStocke(page, 'v2')) === avant,
      `${cas} : après « Annuler » ${vu(await cartes(page))}`,
    );
    juge.exige(
      (await page.evaluate(() => scrollY)) === enBas,
      `${cas} : défilement après « Annuler » ${await page.evaluate(() => scrollY)}`,
    );
    juge.exige((await focusSur(page)) === '#/voyage/v2', `${cas} : focus après « Annuler » ${await focusSur(page)}`);
    await fermer(cas, ouvert);
  }

  // 3. Vigilance 2 : panne de la suppression (depuis le voyage, puis depuis une carte).
  for (const depuis of ['voyage', 'voyages']) {
    const cas = `panne de la suppression, depuis ${depuis === 'voyage' ? 'le voyage' : 'une carte'}`;
    const ouvert = await ouvrirAccueil('telephone');
    const { page } = ouvert;
    const avant = await voyageStocke(page, 'v1');
    if (depuis === 'voyage') await ouvrirVoyage(page, 'v1');
    await poser(page, 'pannes', ['supprimerVoyage']);
    await demanderSuppression(page, depuis === 'voyage' ? null : 'v1');
    await repondre(page, fr.suppression.supprimer);
    await attendreQue(page, () => document.querySelector('.alerte-haut') !== null);
    await calme(page);
    juge.exige(
      (await alerte(page)) === fr.suppression.erreur &&
        (await ecran(page)) === depuis &&
        !(await lireBandeau(page)) &&
        (await voyageStocke(page, 'v1')) === avant,
      `${cas} : ${vu({ alerte: await alerte(page), ecran: await ecran(page), bandeau: await lireBandeau(page) })}`,
    );
    if (depuis === 'voyages') juge.exige((await cartes(page)).includes('#/voyage/v1'), `${cas} : la carte est partie`);
    await fermer(cas, ouvert);
  }

  // 3 bis. Vigilance 2 : panne de « Annuler » : le message, le bandeau reste ; un second appui réussit.
  {
    const cas = 'panne de « Annuler »';
    const ouvert = await ouvrirAccueil('telephone');
    const { page } = ouvert;
    const avant = await voyageStocke(page, 'v1');
    const ordre = await cartes(page);
    await demanderSuppression(page, 'v1');
    await repondre(page, fr.suppression.supprimer);
    await attendreBandeau(page);
    await poser(page, 'pannes', ['creerVoyage']);
    await annulerBandeau(page);
    await attendreQue(page, () => document.querySelector('.alerte-haut') !== null);
    await calme(page);
    const reste = await lireBandeau(page);
    juge.exige(
      (await alerte(page)) === a.erreur &&
        reste?.texte === bandeauV1 &&
        !reste.bouton.inactif &&
        !(await cartes(page)).includes('#/voyage/v1') &&
        (await voyageAbsent(page, 'v1')),
      `${cas} : ${vu({ alerte: await alerte(page), reste })}`,
    );
    await poser(page, 'pannes', []);
    await annulerBandeau(page);
    await attendreQue(page, () => document.querySelector('a.carte-voyage[href="#/voyage/v1"]') !== null);
    await calme(page);
    juge.exige(
      vu(await cartes(page)) === vu(ordre) && (await voyageStocke(page, 'v1')) === avant && !(await lireBandeau(page)),
      `${cas} : second appui ${vu(await cartes(page))}`,
    );
    await fermer(cas, ouvert);
  }

  // 4. Vigilance 3 : « Annuler » touché depuis le voyage d'un autre, puis depuis Réglages.
  {
    const cas = '« Annuler » depuis un autre écran';
    const ouvert = await ouvrirAccueil('telephone');
    const { page } = ouvert;
    const avant = await voyageStocke(page, 'v1');
    const ordre = await cartes(page);
    await demanderSuppression(page, 'v1');
    await repondre(page, fr.suppression.supprimer);
    await attendreBandeau(page);
    await ouvrirVoyage(page, 'v2');
    await annulerBandeau(page);
    await attendreQue(page, () => !document.querySelector('.bandeau-annuler'));
    juge.exige((await voyageStocke(page, 'v1')) === avant, `${cas} : depuis le voyage d'un autre, pas rétabli`);
    await page.click('#app a.lien-retour[href="#/voyages"]');
    await attendreEcran(page, 'voyages');
    juge.exige(vu(await cartes(page)) === vu(ordre), `${cas} : retour du voyage d'un autre ${vu(await cartes(page))}`);

    await demanderSuppression(page, 'v1');
    await repondre(page, fr.suppression.supprimer);
    await attendreBandeau(page);
    await page.click('#app [data-action="menu"]');
    await attendreQue(page, () => document.querySelector('dialog.tiroir[open]') !== null);
    await calme(page);
    await page.click(`dialog.tiroir .tiroir-lien:text-is("${fr.menu.reglages}")`);
    await attendreEcran(page, 'reglages');
    await attendreBandeau(page);
    await annulerBandeau(page);
    await attendreQue(page, () => !document.querySelector('.bandeau-annuler'));
    juge.exige((await voyageStocke(page, 'v1')) === avant, `${cas} : depuis Réglages, pas rétabli`);
    await versMesVoyages(page);
    juge.exige(vu(await cartes(page)) === vu(ordre), `${cas} : retour de Réglages ${vu(await cartes(page))}`);
    await fermer(cas, ouvert);
  }

  // 5. Une écriture de la bibliothèque (Réglages) pendant le bandeau ne le retire pas.
  {
    const cas = 'écriture de la bibliothèque pendant le bandeau';
    const ouvert = await ouvrirAccueil('telephone');
    const { page } = ouvert;
    const avant = await voyageStocke(page, 'v1');
    await demanderSuppression(page, 'v1');
    await repondre(page, fr.suppression.supprimer);
    await attendreBandeau(page);
    await versBibliotheque(page);
    await ouvrirFicheObjet(page, 'Toilette', 'Brosse à dents');
    await saisir(page, '#f-nom', 'Brosse à dents souple');
    await enregistrer(page);
    await attendreFermee(page);
    const ecrit = (await lireStockage(page)).bibliotheque.objets.some(o => o.nom === 'Brosse à dents souple');
    const b = await lireBandeau(page);
    juge.exige(ecrit && b?.texte === bandeauV1, `${cas} : ${vu({ ecrit, b })}`);
    await annulerBandeau(page);
    await attendreQue(page, () => !document.querySelector('.bandeau-annuler'));
    juge.exige((await voyageStocke(page, 'v1')) === avant, `${cas} : pas rétabli`);
    await fermer(cas, ouvert);
  }

  // 6. Vigilance 5 : un nom long, depuis le voyage et depuis sa carte, ne fait pas déborder la question.
  for (const depuis of ['voyage', 'voyages']) {
    const cas = `nom long, depuis ${depuis === 'voyage' ? 'le voyage' : 'la carte'}`;
    const ouvert = await ouvrirAccueil('telephone');
    const { page } = ouvert;
    const long = ESSAI.voyages.find(v => v.id === 'v3').nom;
    if (depuis === 'voyage') await ouvrirVoyage(page, 'v3');
    await demanderSuppression(page, depuis === 'voyage' ? null : 'v3');
    const q = await lireQuestion(page);
    juge.exige(
      q?.titre === remplir(s.titre, { nom: long }) && !q.deborde && !q.titreDeborde,
      `${cas} : question ${vu(q)}`,
    );
    await verifierCommandes(page, juge, cas);
    await repondre(page, fr.suppression.supprimer);
    await attendreBandeau(page);
    await calme(page);
    const b = await lireBandeau(page);
    juge.exige(b && b.cadre.left >= 0 && b.cadre.right <= b.largeurEcran && b.touchable, `${cas} : bandeau ${vu(b)}`);
    await verifierCommandes(page, juge, `${cas}, bandeau`);
    if (depuis === 'voyage')
      await page.screenshot({ path: join(CAPTURES, 'voyage-supprimer-bandeau-long-telephone-clair.png') });
    await fermer(cas, ouvert);
  }
} finally {
  await navigateur.close();
  await serveur.fermer();
}

juge.conclure(
  'Supprimer un voyage',
  'question chiffrée, Garder, Supprimer depuis le voyage et la carte, Annuler à l’identique, pannes, autre écran, bibliothèque, nom long',
);
