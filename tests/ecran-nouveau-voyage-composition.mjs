// Phase 13 (spec 2026-11-01, « Maquette validée ») : les trois compteurs Femmes, Hommes, Enfants de
// l'étape Informations. Le 6 octobre 2026 (horloge fixée), bibliothèque de départ installée par l'appli :
// - au premier voyage : 0, 0, 0 et « 0 en tout », sans message d'erreur ; chaque bouton est nommé (« Un enfant de plus »…) ;
// - tout à 0 : le message « Ajoutez au moins une personne. » n'apparaît qu'après un « Suivant » refusé,
//   dans sa ligne réservée (rien ne bouge sous lui) ; le focus va et le focus va au « + » de la première ligne ; témoin : une
//   personne de plus, le message part et « Suivant » mène à l'étape suivante ;
// - à 20 en tout : les trois « + » sont inactifs (aria-disabled), le message dit la limite, les « − »
//   restent actifs ; Playwright tient un bouton aria-disabled pour inactif : les appuis qui doivent être
//   refusés sont forcés ;
// - un voyage créé avec 2 femmes et 1 enfant : le « Nouveau voyage » suivant propose 2, 0, 1 ; le voyage
//   est écrit avec ces trois nombres ; l'aperçu dit « 2 femmes, 1 enfant » ; sa carte dit « 3 voyageurs » ;
// - retour depuis Informations avec les seuls compteurs touchés : aucune question « Abandonner » ;
// - disposition : au téléphone, un compteur par ligne ; en paysage (champ large), les trois côte à côte ;
// 2 formats × 2 thèmes : cibles de 44 px, pas de défilement de côté, rien sous les barres système ;
// captures nouveau-voyage-composition-<format>-<thème>.png.
import { mkdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { chromium } from 'playwright';
import { attendreQue, calme } from './outils/attente.mjs';
import { attendreQuestion, creerDepuisLAssistant, question } from './outils/assistant.mjs';
import { demarrerServeur } from './outils/serveur.mjs';
import {
  CAPTURES,
  FORMATS,
  NOMS_THEME,
  RACINE,
  attendreEcran,
  creerJuge,
  lireStockage,
  ouvrir,
  verifierBarres,
  verifierCommandes,
} from './outils/page.mjs';

const fr = JSON.parse(await readFile(join(RACINE, 'src/i18n/fr.json'), 'utf8'));
const c = fr.nouveauVoyage.composition;
const MAINTENANT = new Date('2026-10-06T10:00:00');
const GROUPES = ['femmes', 'hommes', 'enfants'];
const bouton = (groupe, pas) => `[data-groupe="${groupe}"][data-pas="${pas}"]`;

const valeurs = page =>
  page.evaluate(() => [...document.querySelectorAll('.composition-ligne .compteur-valeur')].map(o => o.textContent));
const message = page =>
  page.evaluate(() => {
    const m = document.querySelector('.composition-message');
    return {
      texte: m.textContent.trim(),
      etat: m.dataset.etat,
      haut: document.querySelector('.champ-dates').getBoundingClientRect().top,
    };
  });
const inactifs = page =>
  page.$$eval('[data-groupe]', bs =>
    bs.filter(b => b.getAttribute('aria-disabled') === 'true').map(b => `${b.dataset.groupe}${b.dataset.pas}`),
  );
// Appuis forcés : un bouton inactif ne doit rien faire (Playwright l'attendrait sinon).
const appuyer = async (page, groupe, pas, fois = 1) => {
  for (let i = 0; i < fois; i++) await page.click(bouton(groupe, pas), { force: true });
};

async function ouvrirNouveau(navigateur, url, options = {}) {
  const ouvert = await ouvrir(navigateur, url, {
    composition: null,
    taille: FORMATS.telephone,
    theme: 'light',
    maintenant: MAINTENANT,
    adresse: '#/nouveau-voyage',
    ...options,
  });
  await attendreEcran(ouvert.page, 'nouveau-voyage');
  return ouvert;
}

const juge = creerJuge();
const serveur = await demarrerServeur();
const navigateur = await chromium.launch();
try {
  await mkdir(CAPTURES, { recursive: true });

  // Premier voyage : 0, 0, 0 sans erreur ; boutons nommés ; « Suivant » refusé révèle le message ; le témoin.
  {
    const { contexte, page } = await ouvrirNouveau(navigateur, serveur.url);
    juge.exige(JSON.stringify(await valeurs(page)) === '["0","0","0"]', `départ : ${await valeurs(page)}`);
    const total = await page.textContent('.composition-total');
    juge.exige(total === c.total.replace('{n}', 0), `départ : total « ${total} »`);
    for (const g of GROUPES)
      for (const [pas, cle] of [
        [-1, 'moins'],
        [1, 'plus'],
      ]) {
        const nom = await page.getAttribute(bouton(g, pas), 'aria-label');
        juge.exige(nom === c[cle][g], `boutons : « ${nom} » au lieu de « ${c[cle][g]} »`);
      }
    juge.exige((await message(page)).texte === '', 'départ : un message inutile');
    await page.fill('#nom', 'Vercors');
    await page.click('[data-jour="2026-10-10"]');
    await page.click('[data-jour="2026-10-13"]');
    const avant = await message(page);
    juge.exige(avant.texte === '' && avant.etat === '', `départ : message avant essai ${JSON.stringify(avant)}`);
    juge.exige(
      (await inactifs(page)).join() === 'femmes-1,hommes-1,enfants-1',
      `zéro : inactifs ${await inactifs(page)}`,
    );
    await page.click('[data-action="suivant"]');
    await calme(page);
    const zero = await message(page);
    juge.exige(
      zero.texte === c.aucun && zero.etat === 'erreur' && JSON.stringify(await valeurs(page)) === '["0","0","0"]',
      `zéro : ${JSON.stringify(zero)}`,
    );
    juge.exige(zero.haut === avant.haut, `zéro : les dates ont bougé ${avant.haut} → ${zero.haut}`);
    juge.exige(
      (await page.evaluate(() => document.querySelector('.formulaire-corps').dataset.etape)) === 'infos',
      'zéro : « Suivant » n’a pas été refusé',
    );
    const focus = await page.evaluate(
      () => `${document.activeElement?.dataset.groupe}${document.activeElement?.dataset.pas}`,
    );
    juge.exige(focus === 'femmes1', `zéro : focus ${focus}`);
    await appuyer(page, 'enfants', 1);
    const un = await message(page);
    juge.exige(un.texte === '' && un.etat === '', `une personne : message ${JSON.stringify(un)}`);
    await page.click('[data-action="suivant"]');
    await calme(page);
    juge.exige(
      (await page.evaluate(() => document.querySelector('.formulaire-corps').dataset.etape)) !== 'infos',
      'une personne : « Suivant » devrait passer',
    );
    await contexte.close();
  }

  // 20 en tout : les « + » s'éteignent, le message dit la limite, les « − » restent.
  {
    const { contexte, page } = await ouvrirNouveau(navigateur, serveur.url);
    await appuyer(page, 'femmes', 1, 30);
    await appuyer(page, 'hommes', 1, 3);
    const v = await valeurs(page);
    juge.exige(JSON.stringify(v) === '["20","0","0"]', `limite : valeurs ${v}`);
    const m = await message(page);
    juge.exige(m.texte === c.max && m.etat === 'limite', `limite : message ${JSON.stringify(m)}`);
    // Les trois « + » sont inactifs ; les « − » des groupes à 0 le sont aussi.
    const hors = (await inactifs(page)).join();
    juge.exige(hors === 'femmes1,hommes-1,hommes1,enfants-1,enfants1', `limite : inactifs ${hors}`);
    await appuyer(page, 'femmes', -1);
    juge.exige((await message(page)).texte === '', 'limite : le message devrait partir après un « − »');
    await contexte.close();
  }

  // Un voyage à 2 femmes et 1 enfant : la composition est retenue pour le suivant.
  {
    const { contexte, page } = await ouvrirNouveau(navigateur, serveur.url);
    await appuyer(page, 'femmes', 1, 2);
    await appuyer(page, 'enfants', 1);
    await page.fill('#nom', 'Vercors');
    await page.click('[data-jour="2026-10-10"]');
    await page.click('[data-jour="2026-10-13"]');
    await page.click('[data-action="apercu"]');
    await page.waitForSelector('.formulaire-corps[data-etape="apercu"]');
    const rappel = await page.textContent('.apercu-rappel');
    juge.exige(rappel.includes('2 femmes, 1 enfant'), `aperçu : rappel « ${rappel} »`);
    await creerDepuisLAssistant(page);
    await attendreEcran(page, 'voyage');
    const voyage = (await lireStockage(page)).voyages[0];
    juge.exige(
      voyage.femmes === 2 && voyage.hommes === 0 && voyage.enfants === 1 && !('voyageurs' in voyage),
      `création : voyage ${JSON.stringify(voyage)}`,
    );
    const entete = await page.textContent('.voyage-details');
    juge.exige(entete.includes('2 femmes, 1 enfant'), `en-tête : « ${entete} »`);
    await page.evaluate(() => (location.hash = '#/'));
    await attendreEcran(page, 'voyages');
    const carte = await page.textContent('.carte-voyage-details');
    juge.exige(carte.includes('3 voyageurs'), `carte : « ${carte} »`);
    await page.evaluate(() => (location.hash = '#/nouveau-voyage'));
    await attendreEcran(page, 'nouveau-voyage');
    const suivant = await valeurs(page);
    juge.exige(JSON.stringify(suivant) === '["2","0","1"]', `suivant : ${suivant}`);
    await contexte.close();
  }

  // Retour depuis Informations avec les seuls compteurs touchés (fenêtre de la tablette) : aucune question.
  {
    const { contexte, page } = await ouvrirNouveau(navigateur, serveur.url, { taille: FORMATS['tablette-portrait'] });
    await appuyer(page, 'hommes', 1);
    await page.click('[data-action="fermer"]');
    await attendreQue(page, () => location.hash !== '#/nouveau-voyage');
    juge.exige((await question(page)) === null, 'abandon : une question est posée pour de simples compteurs');
    await contexte.close();
  }
  // Témoin : un nom saisi fait poser la question.
  {
    const { contexte, page } = await ouvrirNouveau(navigateur, serveur.url, { taille: FORMATS['tablette-portrait'] });
    await page.fill('#nom', 'Vercors');
    await page.click('[data-action="fermer"]');
    juge.exige((await attendreQuestion(page)) !== null, 'abandon : témoin, la question devrait être posée');
    await contexte.close();
  }

  // Dispositions et thèmes.
  for (const theme of ['light', 'dark']) {
    for (const format of ['telephone', 'tablette-paysage']) {
      const cas = `${format}, ${NOMS_THEME[theme]}`;
      const { contexte, page, sorties, erreurs } = await ouvrirNouveau(navigateur, serveur.url, {
        taille: FORMATS[format],
        theme,
      });
      await appuyer(page, 'enfants', 1);
      const boites = await page.$$eval('.composition-ligne', l => l.map(e => e.getBoundingClientRect().toJSON()));
      const cote = boites.every(b => Math.abs(b.top - boites[0].top) < 2);
      const empile = boites.every((b, i) => i === 0 || b.top >= boites[i - 1].bottom - 1);
      // Au téléphone, une ligne par groupe ; sur tablette en paysage, la fenêtre est en deux colonnes :
      // le champ des voyageurs n'a pas la place des trois côte à côte, il garde une ligne par groupe.
      juge.exige(
        format === 'telephone' ? empile : cote || empile,
        `${cas} : disposition ${JSON.stringify(boites.map(b => [b.top, b.left]))}`,
      );
      await verifierCommandes(page, juge, cas);
      await verifierBarres(page, juge, cas);
      await page.screenshot({ path: join(CAPTURES, `nouveau-voyage-composition-${format}-${NOMS_THEME[theme]}.png`) });
      juge.exige(sorties.length === 0, `${cas} : requêtes hors de l’appli : ${sorties.join(', ')}`);
      juge.exige(erreurs.length === 0, `${cas} : erreurs dans la page : ${erreurs.join(' | ')}`);
      await contexte.close();
    }
  }
} finally {
  await navigateur.close();
  await serveur.fermer();
}
juge.conclure('Écran Nouveau voyage, composition', 'trois compteurs, bornes, mémoire, 2 formats × 2 thèmes');
