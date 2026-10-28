// Phase 8 (docs/superpowers/specs/2026-10-28-phase-8-ajuster-design.md ; maquette docs/maquettes/ajuster/) :
// « Retirer du voyage » depuis la fiche d'un objet, puis « Annuler ».
// - retirer demande confirmation (ce qui part avec l'objet est dit), retire l'objet, pas la bibliothèque
//   (critère du plan) ; « Garder » ne change rien ; « Annuler » rend l'objet à l'identique, éclairé ;
// - retirer le dernier objet de la catégorie choisie (grand écran) emporte la catégorie, la première qui
//   reste est choisie ; « Annuler » la rend à son rang, choisie, l'objet éclairé (Review Focus 3) ;
// - retirer le dernier objet du voyage montre l'écran vide ; « Annuler » le rend ;
// - « Annuler » touché depuis l'accueil rétablit le voyage, rouvert il montre l'objet (Review Focus 4) ;
// - le bandeau s'en va au bout de 10 s (horloge simulée), le retrait reste ;
// - panne de retirerDuVoyage : rien ne change, pas de bandeau, le message le dit ;
// - double appui sur « Retirer » : un seul retrait ; pendant l'écriture, « Retirer du voyage » ne répond plus ;
// - captures claire et sombre des questions et du bandeau.
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { chromium } from 'playwright';
import { attendreQue, calme } from './outils/attente.mjs';
import {
  BANDEAU,
  FICHE,
  attendreQuestion,
  fr,
  ligne,
  lireFiche,
  lireQuestion,
  objetStocke,
  ouvrirFiche,
  ouvrirVoyage,
  remplir,
  repondre,
  texteBandeau,
  toucherFiche,
  vu,
} from './outils/ajuster.mjs';
import { fermerEssai } from './outils/bibliotheque.mjs';
import { CAPTURES, NOMS_THEME, attendreEcran, creerJuge, ecrireStockage, lireStockage } from './outils/page.mjs';
import { demarrerServeur } from './outils/serveur.mjs';
import { DONNEES } from './outils/voyage-essai.mjs';

const r = fr.ajustement.retrait;
const juge = creerJuge();
const serveur = await demarrerServeur();
const navigateur = await chromium.launch();
const ouvrirEssai = (options = {}) => ouvrirVoyage(navigateur, serveur.url, options);
const capture = (page, nom, format, theme) =>
  page.screenshot({ path: join(CAPTURES, `${nom}-${format}-${NOMS_THEME[theme]}.png`) });
// Dentifrice seul dans Toilette.
const DERNIER = {
  ...DONNEES,
  objetsDuVoyage: DONNEES.objetsDuVoyage.filter(o => !['o-bro', 'o-gel'].includes(o.id)),
};
const original = id => DONNEES.objetsDuVoyage.find(o => o.id === id);
const categorieOriginale = id => DONNEES.categoriesDuVoyage.find(c => c.id === id);
const bandeauVenu = page =>
  attendreQue(page, s => document.querySelector(s)?.matches(':popover-open') ?? false, BANDEAU);
const sansErreurSimulee = ouvert =>
  ouvert.erreurs.splice(0, ouvert.erreurs.length, ...ouvert.erreurs.filter(e => !e.includes('Panne simulée')));

// « Retirer du voyage », puis la réponse ; rend la question lue.
async function retirer(page, id, reponse = r.retirer, options = {}) {
  await ouvrirFiche(page, id);
  await toucherFiche(page, 'retirer');
  await attendreQuestion(page);
  const question = await lireQuestion(page);
  await repondre(page, reponse, options);
  return question;
}

// Le menu des catégories (grand format) : leurs ids dans l'ordre, et la choisie.
const menu = page =>
  page.evaluate(() => {
    const entrees = [...document.querySelectorAll('#app .gf-menu [data-action="choisir"]')];
    return {
      ids: entrees.map(e => e.dataset.id),
      choisie: entrees.find(e => e.getAttribute('aria-current') === 'true')?.dataset.id ?? null,
    };
  });

try {
  await mkdir(CAPTURES, { recursive: true });

  // Pantalons, 3 pièces sur 4 dans le sac : la question, « Garder », puis « Retirer » et « Annuler ».
  {
    const cas = 'retirer puis annuler';
    const ouvert = await ouvrirEssai();
    const { page } = ouvert;
    const bibliotheque = vu((await lireStockage(page)).bibliotheque);
    const question = await retirer(page, 'o-pan', r.garder);
    const attendus = [r.bibliotheque, remplir(r.pieces.other, { compte: '3 pièces' })];
    juge.exige(
      question?.titre === remplir(r.titre, { nom: 'Pantalons' }) &&
        vu(question.textes) === vu(attendus) &&
        vu(question.gras) === vu(['3 pièces']) &&
        vu(question.decrit) === vu(attendus) &&
        vu(question.boutons) === vu([r.garder, r.retirer]),
      `${cas} : question ${vu(question)}`,
    );
    juge.exige(
      (await objetStocke(page, 'o-pan')) !== null && (await lireFiche(page))?.titre === 'Pantalons',
      `${cas} : « Garder » a changé quelque chose`,
    );
    await toucherFiche(page, 'retirer');
    await attendreQuestion(page);
    await repondre(page, r.retirer);
    await bandeauVenu(page);
    await attendreQue(page, s => !document.querySelector(s), FICHE);
    await calme(page);
    juge.exige(
      (await ligne(page, 'o-pan')) === null &&
        (await objetStocke(page, 'o-pan')) === null &&
        vu((await lireStockage(page)).bibliotheque) === bibliotheque &&
        (await texteBandeau(page)) === remplir(r.bandeau, { nom: 'Pantalons' }),
      `${cas} : retiré ? ligne ${vu(await ligne(page, 'o-pan'))}, bandeau « ${await texteBandeau(page)} »`,
    );
    await page.click(`${BANDEAU} button`);
    await attendreQue(page, () => !document.querySelector('.bandeau-annuler'));
    await attendreQue(page, () => document.querySelector('#app .objet[data-id="o-pan"]') !== null);
    juge.exige(
      vu(await objetStocke(page, 'o-pan')) === vu(original('o-pan')) && (await ligne(page, 'o-pan'))?.recent,
      `${cas} : « Annuler » ${vu(await objetStocke(page, 'o-pan'))}, ligne ${vu(await ligne(page, 'o-pan'))}`,
    );
    // Pull, une seule pièce dans le sac.
    const pull = await retirer(page, 'o-pul', r.garder);
    juge.exige(
      vu(pull?.textes) === vu([r.bibliotheque, remplir(r.pieces.one, { compte: '1 pièce' })]) &&
        vu(pull.gras) === vu(['1 pièce']),
      `${cas} : question de Pull ${vu(pull)}`,
    );
    await fermerEssai(juge, cas, ouvert);
  }

  // Grand écran : Dentifrice, dernier de Toilette, la catégorie choisie.
  for (const format of ['ordinateur', 'tablette-paysage']) {
    const cas = `dernier de sa catégorie (${format})`;
    const ouvert = await ouvrirEssai({ format, donnees: DERNIER });
    const { page } = ouvert;
    const avant = await menu(page);
    const question = await retirer(page, 'o-den', r.retirer);
    juge.exige(
      vu(question?.textes) === vu([r.bibliotheque, remplir(r.derniere, { categorie: 'Toilette' })]),
      `${cas} : question ${vu(question)}`,
    );
    await bandeauVenu(page);
    await calme(page);
    const retire = await menu(page);
    const stocke = await lireStockage(page);
    juge.exige(
      !retire.ids.includes('c-toi') &&
        retire.choisie === retire.ids[0] &&
        !stocke.categoriesDuVoyage.some(c => c.id === 'c-toi') &&
        (await texteBandeau(page)) === remplir(r.bandeauCategorie, { nom: 'Dentifrice', categorie: 'Toilette' }),
      `${cas} : après le retrait ${vu(retire)}, bandeau « ${await texteBandeau(page)} »`,
    );
    await page.click(`${BANDEAU} button`);
    await attendreQue(page, () => document.querySelector('#app .objet[data-id="o-den"]') !== null);
    // Éclairé au dessin qui le rend (la seconde de répit du retrait peut redessiner ensuite).
    const dentifrice = await ligne(page, 'o-den');
    await calme(page);
    const rendu = await menu(page);
    const relu = await lireStockage(page);
    juge.exige(
      vu(rendu.ids) === vu(avant.ids) &&
        rendu.choisie === 'c-toi' &&
        vu(relu.categoriesDuVoyage.find(c => c.id === 'c-toi')) === vu(categorieOriginale('c-toi')) &&
        vu(relu.objetsDuVoyage.find(o => o.id === 'o-den')) === vu(original('o-den')) &&
        dentifrice?.recent,
      `${cas} : « Annuler » menu ${vu(rendu)} au lieu de ${vu(avant)}, ligne ${vu(dentifrice)}`,
    );
    await fermerEssai(juge, cas, ouvert);
  }

  // Le dernier objet du voyage : l'écran vide, puis « Annuler ».
  {
    const cas = 'dernier objet du voyage';
    const ouvert = await ouvrirEssai({ voyageId: 'v2' });
    const { page } = ouvert;
    await retirer(page, 'o-ski');
    await bandeauVenu(page);
    const vide = await attendreQue(page, () => document.querySelector('#app .vide-voyage') !== null);
    juge.exige(vide, `${cas} : pas d'écran vide`);
    await page.click(`${BANDEAU} button`);
    const rendu = await attendreQue(page, () => document.querySelector('#app .objet[data-id="o-ski"]') !== null);
    juge.exige(rendu && !(await page.$('#app .vide-voyage')), `${cas} : « Annuler » ne rend pas Skis`);
    await fermerEssai(juge, cas, ouvert);
  }

  // « Annuler » depuis l'accueil.
  {
    const cas = 'annuler depuis l’accueil';
    const ouvert = await ouvrirEssai();
    const { page } = ouvert;
    await retirer(page, 'o-pul');
    await bandeauVenu(page);
    await page.click('#app a.lien-retour');
    await attendreEcran(page, 'voyages');
    juge.exige((await texteBandeau(page)) === remplir(r.bandeau, { nom: 'Pull' }), `${cas} : bandeau perdu`);
    await page.click(`${BANDEAU} button`);
    const rendu = await attendreQue(page, () =>
      JSON.parse(localStorage.getItem('baluchon-essai')).objetsDuVoyage.some(o => o.id === 'o-pul'),
    );
    await calme(page);
    juge.exige(rendu && vu(await objetStocke(page, 'o-pul')) === vu(original('o-pul')), `${cas} : pas rétabli`);
    await page.click('#app a.carte-voyage[href="#/voyage/v1"]');
    await attendreEcran(page, 'voyage');
    juge.exige((await ligne(page, 'o-pul'))?.nom === 'Pull', `${cas} : rouvert, Pull absent`);
    await fermerEssai(juge, cas, ouvert);
  }

  // « Annuler » après le répit du retrait : l'objet rendu est aussitôt à sa place (non complets par nom,
  // puis complets), éclairé ; touché avant la fin du répit, il reste éclairé après lui.
  {
    const cas = 'place et éclairage de l’objet rendu';
    const ouvert = await ouvrirEssai({ horloge: true });
    const { page } = ouvert;
    const ordreVetements = () =>
      page.evaluate(() =>
        [...document.querySelectorAll('#app .categorie[data-id="c-vet"] .objet')].map(li => li.dataset.id),
      );
    const avant = await ordreVetements();
    await retirer(page, 'o-pan');
    await bandeauVenu(page);
    // L'horloge arrêtée, puis menée au-delà du répit du retrait.
    await page.clock.pauseAt((await page.evaluate(() => Date.now())) + 10);
    await page.clock.runFor(1100);
    await page.click(`${BANDEAU} button`);
    await attendreQue(page, () => document.querySelector('#app .objet[data-id="o-pan"]') !== null);
    const apres = await ordreVetements();
    juge.exige(
      vu(apres) === vu(avant) && vu(avant) === vu(['o-pan', 'o-pul', 'o-pyj', 'o-sou', 'o-tsh', 'o-cha']),
      `${cas} : ordre ${vu(apres)} au lieu de ${vu(avant)}`,
    );
    // Avant la fin du répit : l'éclairage survit au rangement qui suit.
    await page.clock.resume();
    await ouvrirFiche(page, 'o-pul');
    await toucherFiche(page, 'retirer');
    await attendreQuestion(page);
    await page.clock.pauseAt((await page.evaluate(() => Date.now())) + 10);
    await repondre(page, r.retirer);
    await bandeauVenu(page);
    await page.click(`${BANDEAU} button`);
    await attendreQue(page, () => document.querySelector('#app .objet[data-id="o-pul"]') !== null);
    await page.clock.runFor(1100);
    juge.exige((await ligne(page, 'o-pul'))?.recent, `${cas} : éclairage coupé par le répit`);
    // Témoin : l'éclairage finit par s'éteindre (fin de son animation).
    await page.clock.resume();
    const eteint = await attendreQue(page, () => !document.querySelector('#app [data-recent]'));
    juge.exige(eteint, `${cas} : l'éclairage ne s'éteint pas`);
    await fermerEssai(juge, cas, ouvert);
  }

  // Une coche, puis un retrait et « Annuler » : l'objet revient tel que la base le gardait (modifieLe compris).
  {
    const cas = 'annuler après une coche';
    const ouvert = await ouvrirEssai();
    const { page } = ouvert;
    await page.click('#app .case[data-id="o-pan"]');
    const coche = await attendreQue(page, () => {
      const o = JSON.parse(localStorage.getItem('baluchon-essai')).objetsDuVoyage.find(x => x.id === 'o-pan');
      return o.dansLeSac === 4 && o;
    });
    await calme(page);
    await retirer(page, 'o-pan');
    await bandeauVenu(page);
    await page.click(`${BANDEAU} button`);
    await attendreQue(page, () => document.querySelector('#app .objet[data-id="o-pan"]') !== null);
    const rendu = await objetStocke(page, 'o-pan');
    juge.exige(coche && vu(rendu) === vu(coche), `${cas} : ${vu(rendu)} au lieu de ${vu(coche)}`);
    await fermerEssai(juge, cas, ouvert);
  }

  // Les 10 s du bandeau.
  {
    const cas = 'dix secondes';
    const ouvert = await ouvrirEssai({ horloge: true });
    const { page } = ouvert;
    await page.evaluate(() => {
      new MutationObserver((_, observateur) => {
        if (!document.querySelector('.bandeau-annuler')) return;
        window.arriveeBandeau = Date.now();
        observateur.disconnect();
      }).observe(document.body, { childList: true, subtree: true });
    });
    await retirer(page, 'o-tsh');
    await bandeauVenu(page);
    const maintenant = (await page.evaluate(() => Date.now())) + 20;
    await page.clock.pauseAt(maintenant);
    const ecoule = maintenant - (await page.evaluate(() => window.arriveeBandeau));
    juge.exige(ecoule < 9000, `${cas} : le parcours a pris ${ecoule} ms`);
    await page.clock.runFor(Math.max(0, 9000 - ecoule));
    juge.exige((await texteBandeau(page)) !== null, `${cas} : parti avant 9 s`);
    await page.clock.runFor(1100);
    juge.exige(
      (await page.$(BANDEAU)) === null && (await objetStocke(page, 'o-tsh')) === null,
      `${cas} : encore là à 10,1 s, ou objet revenu`,
    );
    await page.clock.resume();
    await fermerEssai(juge, cas, ouvert);
  }

  // Panne : rien ne change, pas de bandeau.
  {
    const cas = 'panne du retrait';
    const ouvert = await ouvrirEssai();
    const { page } = ouvert;
    await ouvrirFiche(page, 'o-tsh');
    await ecrireStockage(page, { ...(await lireStockage(page)), pannes: ['retirerDuVoyage'] });
    await toucherFiche(page, 'retirer');
    await attendreQuestion(page);
    await repondre(page, r.retirer);
    const message = await attendreQue(page, () => document.querySelector('.alerte-haut')?.textContent.trim());
    await calme(page);
    juge.exige(
      message === r.erreur &&
        (await lireFiche(page))?.titre === 'T-shirts' &&
        (await ligne(page, 'o-tsh')) !== null &&
        (await objetStocke(page, 'o-tsh')) !== null &&
        (await page.$(BANDEAU)) === null &&
        (await lireFiche(page))?.desactives === 'moins,vider',
      `${cas} : message « ${message} », fiche ${vu(await lireFiche(page))}, bandeau ${await texteBandeau(page)}`,
    );
    sansErreurSimulee(ouvert);
    await fermerEssai(juge, cas, ouvert);
  }

  // Double appui sur « Retirer », l'écriture lente : un seul retrait.
  {
    const cas = 'double appui';
    const ouvert = await ouvrirEssai();
    const { page } = ouvert;
    await ouvrirFiche(page, 'o-tsh');
    await ecrireStockage(page, { ...(await lireStockage(page)), lenteurs: ['retirerDuVoyage'] });
    await toucherFiche(page, 'retirer');
    await attendreQuestion(page);
    const question = await lireQuestion(page);
    juge.exige(vu(question?.textes) === vu([r.bibliotheque]), `${cas} : question de T-shirts ${vu(question)}`);
    await repondre(page, r.retirer, { double: true });
    await attendreQue(page, () => typeof window.debloquerStockage === 'function');
    const pendant = await lireFiche(page);
    await toucherFiche(page, 'retirer', { force: true });
    // Les autres gestes de la fiche ne comptent plus : une pièce de plus viserait un objet retiré.
    await toucherFiche(page, 'plus', { force: true });
    await toucherFiche(page, 'quantite-plus', { force: true });
    await calme(page);
    const secondeQuestion = await lireQuestion(page);
    const stocke = await lireStockage(page);
    await ecrireStockage(page, { ...stocke, lenteurs: [] });
    await page.evaluate(() => window.debloquerStockage());
    await bandeauVenu(page);
    await calme(page);
    juge.exige(
      pendant?.desactives.includes('retirer') && secondeQuestion === null,
      `${cas} : pendant l'écriture ${vu(pendant)}, seconde question ${vu(secondeQuestion)}`,
    );
    juge.exige(
      (await objetStocke(page, 'o-tsh')) === null &&
        (await page.$('.alerte-haut')) === null &&
        (await page.$('.alerte')) === null &&
        (await lireStockage(page)).objetsDuVoyage.length === DONNEES.objetsDuVoyage.length - 1,
      `${cas} : après le retrait`,
    );
    await fermerEssai(juge, cas, ouvert);
  }

  // Captures : les questions (avec pièces, dernier de sa catégorie) et le bandeau.
  for (const theme of ['light', 'dark'])
    for (const format of ['telephone-etroit', 'tablette-portrait', 'ordinateur']) {
      const cas = `captures, ${format}, ${NOMS_THEME[theme]}`;
      const ouvert = await ouvrirEssai({ format, theme, donnees: DERNIER });
      const { page } = ouvert;
      await ouvrirFiche(page, 'o-den');
      await toucherFiche(page, 'retirer');
      await attendreQuestion(page);
      await capture(page, 'voyage-retirer-dernier', format, theme);
      await repondre(page, r.garder);
      await page.keyboard.press('Escape');
      await attendreQue(page, s => !document.querySelector(s), FICHE);
      await ouvrirFiche(page, 'o-pan');
      await toucherFiche(page, 'retirer');
      await attendreQuestion(page);
      await capture(page, 'voyage-retirer', format, theme);
      await repondre(page, r.retirer);
      await bandeauVenu(page);
      await attendreQue(page, s => !document.querySelector(s), FICHE);
      await calme(page);
      await capture(page, 'voyage-retirer-bandeau', format, theme);
      await fermerEssai(juge, cas, ouvert);
    }
} finally {
  await navigateur.close();
  await serveur.fermer();
}
juge.conclure(
  'Retirer un objet du voyage',
  'question, bibliothèque intacte, « Annuler », dernier de sa catégorie, voyage vide, depuis l’accueil, 10 s, panne, double appui, captures',
);
