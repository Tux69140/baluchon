// Phase 8, relecture finale (point 1) : un retrait du voyage qui croise un « Annuler » en cours. Le
// retrait passe par la garde du bandeau (sansAnnuler, src/ecrans/annulation.js) et relit le voyage avant
// d'écrire : ce qu'« Annuler » réécrira vient de la base, pas de l'écran.
// Toilette ne garde que Brosse à dents (A) et Dentifrice (B).
// - « Annuler A » lent pendant qu'on retire B : B attend la fin du rétablissement ; A revient, B part
//   seul, Toilette reste ; jamais A perdu sans rien dire ; « Annuler B » réussit (témoin) ;
// - « Annuler A » fait, mais l'écran n'a pas pu relire le voyage (A pas encore montré) : le bandeau de B
//   n'annonce pas la catégorie, et « Annuler B » réussit sans message d'erreur.
import { attendreQue, calme } from './outils/attente.mjs';
import { chromium } from 'playwright';
import {
  BANDEAU,
  attendreQuestion,
  lireQuestion,
  fr,
  ligne,
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
import { creerJuge, ecrireStockage, lireStockage } from './outils/page.mjs';
import { demarrerServeur } from './outils/serveur.mjs';
import { DONNEES } from './outils/voyage-essai.mjs';

const r = fr.ajustement.retrait;
const juge = creerJuge();
const serveur = await demarrerServeur();
const navigateur = await chromium.launch();
const DEUX = { ...DONNEES, objetsDuVoyage: DONNEES.objetsDuVoyage.filter(o => o.id !== 'o-gel') };
const original = id => DONNEES.objetsDuVoyage.find(o => o.id === id);
const bandeauVenu = page =>
  attendreQue(page, s => document.querySelector(s)?.matches(':popover-open') ?? false, BANDEAU);
const toilette = async page => (await lireStockage(page)).categoriesDuVoyage.some(c => c.id === 'c-toi');
const sansErreurSimulee = ouvert =>
  ouvert.erreurs.splice(0, ouvert.erreurs.length, ...ouvert.erreurs.filter(e => !e.includes('Panne simulée')));
const changerStockage = async (page, champs) => ecrireStockage(page, { ...(await lireStockage(page)), ...champs });

// Retirer tout de suite : « Retirer » pour un objet sans pièce dans le sac ; pour un objet emballé, la
// question propose « Plus tard » et « C’est fait » (phase 10), et c’est « C’est fait » qui le retire.
async function repondreRetrait(page, options = {}) {
  const { boutons } = await lireQuestion(page);
  await repondre(page, boutons.includes(r.retirer) ? r.retirer : fr.sortie.fait, options);
}

// « Retirer du voyage » depuis la fiche, puis « Retirer ».
async function retirer(page, id) {
  await ouvrirFiche(page, id);
  await toucherFiche(page, 'retirer');
  await attendreQuestion(page);
  await repondreRetrait(page);
}

// « Annuler » du bandeau affiché ; rend quand il est parti, l'objet id rétabli dans la base.
async function annuler(page, id) {
  await page.click(`${BANDEAU} button`);
  return attendreQue(
    page,
    id =>
      !document.querySelector('.bandeau-annuler') &&
      JSON.parse(localStorage.getItem('baluchon-essai')).objetsDuVoyage.some(o => o.id === id),
    id,
  );
}

try {
  {
    const cas = 'retirer pendant un « Annuler » lent';
    const ouvert = await ouvrirVoyage(navigateur, serveur.url, { donnees: DEUX });
    const { page } = ouvert;
    await retirer(page, 'o-bro');
    await bandeauVenu(page);
    await changerStockage(page, { lenteurs: ['retablirDansLeVoyage'] });
    await page.click(`${BANDEAU} button`);
    await attendreQue(page, () => typeof window.debloquerStockage === 'function');
    await retirer(page, 'o-den');
    await calme(page);
    await changerStockage(page, { lenteurs: [] });
    await page.evaluate(() => window.debloquerStockage());
    const fini = await attendreQue(page, () => {
      const stocke = JSON.parse(localStorage.getItem('baluchon-essai')).objetsDuVoyage;
      const bandeau = document.querySelector('.bandeau-annuler p')?.textContent;
      return (
        Boolean(document.querySelector('.alerte-haut')) ||
        (stocke.some(o => o.id === 'o-bro') && !stocke.some(o => o.id === 'o-den') && Boolean(bandeau))
      );
    });
    await calme(page);
    juge.exige(
      fini &&
        vu(await objetStocke(page, 'o-bro')) === vu(original('o-bro')) &&
        (await objetStocke(page, 'o-den')) === null &&
        (await toilette(page)) &&
        (await ligne(page, 'o-bro')) !== null &&
        (await texteBandeau(page)) === remplir(r.bandeau, { nom: 'Dentifrice' }),
      `${cas} : Brosse à dents ${vu(await objetStocke(page, 'o-bro'))}, Toilette ${await toilette(page)}, ` +
        `bandeau « ${await texteBandeau(page)} », message ${vu(await page.$eval('body', b => b.querySelector('.alerte-haut')?.textContent ?? null))}`,
    );
    // Témoin : « Annuler B » rend Dentifrice, sans message.
    const rendu = await annuler(page, 'o-den');
    await calme(page);
    juge.exige(
      rendu && vu(await objetStocke(page, 'o-den')) === vu(original('o-den')) && !(await page.$('.alerte-haut')),
      `${cas} : « Annuler » de Dentifrice ${vu(await objetStocke(page, 'o-den'))}`,
    );
    await fermerEssai(juge, cas, ouvert);
  }

  {
    const cas = 'retirer avant que l’écran ait relu « Annuler »';
    const ouvert = await ouvrirVoyage(navigateur, serveur.url, { donnees: DEUX });
    const { page } = ouvert;
    await retirer(page, 'o-bro');
    await bandeauVenu(page);
    // La relecture de l'écran après « Annuler » échoue : Brosse à dents est rendue dans la base, pas à l'écran.
    await changerStockage(page, { pannes: ['lireVoyage'] });
    const retabli = await annuler(page, 'o-bro');
    await calme(page);
    await changerStockage(page, { pannes: [] });
    juge.exige(retabli && (await ligne(page, 'o-bro')) === null, `${cas} : la situation n'est pas en place`);
    await retirer(page, 'o-den');
    await bandeauVenu(page);
    await calme(page);
    juge.exige(
      (await texteBandeau(page)) === remplir(r.bandeau, { nom: 'Dentifrice' }) &&
        (await objetStocke(page, 'o-den')) === null &&
        (await objetStocke(page, 'o-bro')) !== null &&
        (await toilette(page)),
      `${cas} : bandeau « ${await texteBandeau(page)} », Toilette ${await toilette(page)}`,
    );
    const rendu = await annuler(page, 'o-den');
    await calme(page);
    juge.exige(
      rendu && vu(await objetStocke(page, 'o-den')) === vu(original('o-den')) && !(await page.$('.alerte-haut')),
      `${cas} : « Annuler » de Dentifrice ${vu(await objetStocke(page, 'o-den'))}, message ${Boolean(await page.$('.alerte-haut'))}`,
    );
    sansErreurSimulee(ouvert);
    await fermerEssai(juge, cas, ouvert);
  }
} finally {
  await navigateur.close();
  await serveur.fermer();
}
juge.conclure(
  'Retirer pendant un « Annuler »',
  'rétablissement lent puis retrait, retrait avant la relecture, « Annuler » du second',
);
