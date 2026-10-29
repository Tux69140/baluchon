// Phase 9, relecture finale : l'écran Courses ne perd ni une pièce achetée ni son « Annuler ».
// - « Annuler » d'un autre objet pendant qu'une écriture attend : la relecture ne ramène pas le compte en
//   arrière (constat M1) ;
// - un objet tout acheté dont on quitte l'écran pendant sa seconde de répit, ou dont le répit est coupé
//   par une panne sur un autre objet, part quand même avec son bandeau « Annuler » (constat M2).
import { chromium } from 'playwright';
import { attendreQue, calme } from './outils/attente.mjs';
import { BANDEAU, fr, remplir, vu } from './outils/ajuster.mjs';
import { fermerEssai } from './outils/bibliotheque.mjs';
import { attendreStocke, caseDe, lireCourses, objetsVus, ouvrirCourses, texteBandeau } from './outils/courses.mjs';
import { attendreEcran, creerJuge, ecrireStockage, lireStockage } from './outils/page.mjs';
import { demarrerServeur } from './outils/serveur.mjs';

const juge = creerJuge();
const serveur = await demarrerServeur();
const navigateur = await chromium.launch();
const ouvrirEssai = (options = {}) => ouvrirCourses(navigateur, serveur.url, options);
const cafeAchete = remplir(fr.annulation.achete.one, { nom: 'Café soluble' });
const bandeauOuvert = page =>
  attendreQue(page, s => document.querySelector(s)?.matches(':popover-open'), BANDEAU, { max: 3000 });

try {
  // Une écriture de Repas attend ; « Annuler » d'un autre objet relit : Repas reste à 7.
  {
    const cas = 'relecture pendant une écriture';
    const ouvert = await ouvrirEssai();
    const { page } = ouvert;
    await ecrireStockage(page, { ...(await lireStockage(page)), lenteurs: ['reglerAchats'] });
    await page.click(caseDe('o-rep'));
    await attendreQue(page, () => typeof window.debloquerStockage === 'function');
    await page.evaluate(() =>
      window.dispatchEvent(new CustomEvent('achat-retabli', { detail: { voyageId: 'v1', objetId: 'o-caf' } })),
    );
    await calme(page);
    const pendant = objetsVus(await lireCourses(page)).find(o => o.id === 'o-rep');
    await page.evaluate(() => window.debloquerStockage());
    const stocke = await attendreStocke(page, 'o-rep', 'o.achetes === 7');
    juge.exige(pendant?.quantite === '7 / 16' && stocke, `${cas} : ${vu(pendant)} ${vu(stocke)}`);
    await fermerEssai(juge, cas, ouvert);
  }

  // Quitter l'écran pendant le répit : le bandeau vient quand même.
  {
    const cas = 'quitter pendant le répit';
    const ouvert = await ouvrirEssai();
    const { page } = ouvert;
    await page.click(caseDe('o-caf'));
    await attendreStocke(page, 'o-caf', 'o.achetes === 1');
    await page.click('#app .lien-retour');
    await attendreEcran(page, 'voyage');
    const bandeau = await bandeauOuvert(page);
    juge.exige(bandeau && (await texteBandeau(page))?.texte === cafeAchete, `${cas} : ${vu(await texteBandeau(page))}`);
    await fermerEssai(juge, cas, ouvert);
  }

  // Une panne sur Repas pendant le répit de Café : Café, bien écrit, part avec son bandeau.
  {
    const cas = 'panne pendant le répit';
    const ouvert = await ouvrirEssai();
    const { page } = ouvert;
    await page.click(caseDe('o-caf'));
    await attendreStocke(page, 'o-caf', 'o.achetes === 1');
    await ecrireStockage(page, { ...(await lireStockage(page)), pannes: ['reglerAchats'] });
    await page.click(caseDe('o-rep'));
    await attendreQue(page, () => document.querySelector('#app .alerte'));
    const bandeau = await bandeauOuvert(page);
    juge.exige(
      bandeau &&
        (await texteBandeau(page))?.texte === cafeAchete &&
        !objetsVus(await lireCourses(page)).some(o => o.id === 'o-caf'),
      `${cas} : ${vu(await texteBandeau(page))}`,
    );
    ouvert.erreurs.splice(0, ouvert.erreurs.length, ...ouvert.erreurs.filter(e => !e.includes('Panne simulée')));
    await fermerEssai(juge, cas, ouvert);
  }
} finally {
  await navigateur.close();
  await serveur.fermer();
}

juge.conclure('Les Courses ne perdent rien', 'relecture pendant une écriture, répit quitté, répit coupé par une panne');
