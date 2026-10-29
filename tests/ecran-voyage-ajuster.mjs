// Phase 8 (docs/superpowers/specs/2026-10-28-phase-8-ajuster-design.md ; maquette docs/maquettes/ajuster/) :
// « Ajuster cet objet » dans la fiche d'un objet du voyage.
// - la ligne du haut ne dit que la catégorie ; le calcul vit sous « Quantité prévue » ;
// - corriger la quantité la marque fixée manuellement et le reste à la relecture (critère du plan) ;
// - baisser sous le sac demande « Sortir une pièce du sac ? » ; « Garder 2 » ne change rien, « Retirer 1 »
//   fait suivre le sac (un double appui ne baisse qu'une fois) ; témoin : sans pièce de trop, rien n'est demandé ;
// - − inactif à 1, + inactif à 999 ; une quantité calculée au-delà de 999 descend ;
// - sous le filtre, un objet devenu complet en baissant sa quantité se masque comme après une coche ;
// - renommer change le nom dans ce voyage, pas dans la bibliothèque ; un nom vide est refusé ; un nom
//   piégé (<, &, ") se lit tel quel ; panne → la fiche reste ouverte avec sa saisie, message en haut ;
// - panne de reglerQuantite → relecture et message au bas de l'écran ;
// - captures claire et sombre de la fiche aux formats, de la question et de « Renommer ».
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { chromium } from 'playwright';
import { attendreQue, calme } from './outils/attente.mjs';
import {
  FICHE,
  RENOMMER,
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
  toucherFiche,
  vu,
} from './outils/ajuster.mjs';
import { TOUS_FORMATS, fermerEssai } from './outils/bibliotheque.mjs';
import { CAPTURES, NOMS_THEME, creerJuge, ecrireStockage, lireStockage, verifierCommandes } from './outils/page.mjs';
import { demarrerServeur } from './outils/serveur.mjs';
import { DONNEES } from './outils/voyage-essai.mjs';

const f = fr.fiche;
const b = fr.ajustement.baisse;
const juge = creerJuge();
const serveur = await demarrerServeur();
const navigateur = await chromium.launch();
const ouvrirEssai = (options = {}) => ouvrirVoyage(navigateur, serveur.url, options);
const capture = (page, nom, format, theme) =>
  page.screenshot({ path: join(CAPTURES, `${nom}-${format}-${NOMS_THEME[theme]}.png`) });
// Gel douche : une quantité calculée au-delà de la borne (cas extrême).
const AU_DELA = {
  ...DONNEES,
  objetsDuVoyage: DONNEES.objetsDuVoyage.map(o => (o.id === 'o-gel' ? { ...o, quantite: 1000, valeur: 1000 } : o)),
};
const PIEGE = 'Pull <b>laine</b> & "col"';

try {
  await mkdir(CAPTURES, { recursive: true });

  // La ligne du haut, le calcul, puis + : fixée manuellement, et gardée à la relecture.
  {
    const cas = 'quantité corrigée';
    const ouvert = await ouvrirEssai();
    const { page } = ouvert;
    await ouvrirFiche(page, 'o-rep');
    const avant = await lireFiche(page);
    juge.exige(
      avant?.ligne === 'Alimentation' &&
        avant.ajuster === f.ajuster &&
        avant.quantite === '16' &&
        avant.calcul === remplir(f.calculee, { regle: '2 par jour et par personne' }) &&
        avant.initialement === '' &&
        avant.retirer === f.retirer &&
        avant.desactives === '',
      `${cas} : fiche de Repas ${vu(avant)}`,
    );
    await toucherFiche(page, 'quantite-plus');
    await attendreQue(
      page,
      () => document.querySelector('dialog.fiche-voyage .fiche-ajuster output')?.textContent === '17',
    );
    const apres = await lireFiche(page);
    const stocke = await attendreQue(page, () => {
      const o = JSON.parse(localStorage.getItem('baluchon-essai')).objetsDuVoyage.find(x => x.id === 'o-rep');
      return o.quantite === 17 && o.quantiteManuelle && o;
    });
    juge.exige(
      apres?.quantite === '17' &&
        apres.calcul === f.fixeeManuellement &&
        apres.initialement === remplir(f.initialement, { regle: '2 par jour et par personne' }) &&
        apres.sur === remplir(f.sur, { total: 17 }) &&
        apres.sac === '6' &&
        (await ligne(page, 'o-rep'))?.quantite === '6 / 17' &&
        stocke?.dansLeSac === 6,
      `${cas} : après + ${vu(apres)}, ligne ${vu(await ligne(page, 'o-rep'))}, stocké ${vu(stocke)}`,
    );
    // L'appli relancée : la quantité et sa mention restent.
    await page.reload();
    await attendreQue(page, () => document.querySelector('#app')?.dataset.ecran === 'voyage');
    await calme(page);
    await ouvrirFiche(page, 'o-rep');
    const relue = await lireFiche(page);
    juge.exige(relue?.quantite === '17' && relue.calcul === f.fixeeManuellement, `${cas} : après relance ${vu(relue)}`);
    await fermerEssai(juge, cas, ouvert);
  }

  // Baisser sous ce qui est dans le sac : la question, « Garder 2 », puis « Retirer 1 » (double appui).
  {
    const cas = 'baisser sous le sac';
    const ouvert = await ouvrirEssai({ format: 'tablette-paysage' });
    const { page } = ouvert;
    // Témoin : Pyjama, 1 pièce sur 2 : baisser à 1 ne demande rien.
    await ouvrirFiche(page, 'o-pyj');
    await toucherFiche(page, 'quantite-moins');
    const pyjama = await attendreQue(page, () => {
      const o = JSON.parse(localStorage.getItem('baluchon-essai')).objetsDuVoyage.find(x => x.id === 'o-pyj');
      return o.quantite === 1 && o;
    });
    juge.exige(
      pyjama?.dansLeSac === 1 && pyjama.quantiteManuelle && (await lireQuestion(page)) === null,
      `${cas} : Pyjama sans question ${vu(pyjama)}, question ${vu(await lireQuestion(page))}`,
    );
    await page.keyboard.press('Escape');
    await attendreQue(page, s => !document.querySelector(s), FICHE);
    // Brosse à dents, 2 sur 2.
    await ouvrirFiche(page, 'o-bro');
    await toucherFiche(page, 'quantite-moins');
    await attendreQuestion(page);
    const question = await lireQuestion(page);
    juge.exige(
      question?.titre === b.titre &&
        vu(question.textes) === vu([remplir(b.texte, { compte: '2 pièces', nom: 'Brosse à dents', quantite: 1 })]) &&
        vu(question.gras) === vu(['2 pièces']) &&
        vu(question.boutons) === vu([remplir(b.garder, { n: 2 }), remplir(b.retirer, { n: 1 })]),
      `${cas} : question ${vu(question)}`,
    );
    await capture(page, 'voyage-ajuster-baisse', 'tablette-paysage', 'light');
    await repondre(page, remplir(b.garder, { n: 2 }));
    await calme(page);
    const garde = await objetStocke(page, 'o-bro');
    const vueGarde = await lireFiche(page);
    juge.exige(
      garde.quantite === 2 && garde.dansLeSac === 2 && !garde.quantiteManuelle && vueGarde?.quantite === '2',
      `${cas} : « Garder 2 » ${vu(garde)} ${vu(vueGarde)}`,
    );
    await toucherFiche(page, 'quantite-moins');
    await attendreQuestion(page);
    await repondre(page, remplir(b.retirer, { n: 1 }), { double: true });
    const prevu = await attendreQue(page, () => {
      const o = JSON.parse(localStorage.getItem('baluchon-essai')).objetsDuVoyage.find(x => x.id === 'o-bro');
      return o.quantite === 1 && o;
    });
    await calme(page);
    const vuePrevue = await lireFiche(page);
    juge.exige(
      prevu?.dansLeSac === 1 &&
        prevu.quantiteManuelle &&
        vuePrevue?.quantite === '1' &&
        vuePrevue.sac === '1' &&
        vuePrevue.sur === remplir(f.sur, { total: 1 }) &&
        vuePrevue.desactives === 'plus,tout,quantite-moins' &&
        (await lireQuestion(page)) === null,
      `${cas} : « Retirer 1 » ${vu(prevu)} ${vu(vuePrevue)}`,
    );
    // − inactif à 1 : forcé, il ne fait rien.
    await toucherFiche(page, 'quantite-moins', { force: true });
    await calme(page);
    juge.exige(
      (await objetStocke(page, 'o-bro')).quantite === 1 && (await lireQuestion(page)) === null,
      `${cas} : − inactif à 1 a agi`,
    );
    await fermerEssai(juge, cas, ouvert);
  }

  // Au-delà de 999 : + inactif, − descend.
  {
    const cas = 'au-delà de 999';
    const ouvert = await ouvrirEssai({ donnees: AU_DELA });
    const { page } = ouvert;
    await ouvrirFiche(page, 'o-gel');
    const vue = await lireFiche(page);
    juge.exige(vue?.desactives === 'quantite-plus', `${cas} : + actif au-delà de 999 ${vu(vue)}`);
    await toucherFiche(page, 'quantite-plus', { force: true });
    await toucherFiche(page, 'quantite-moins');
    const stocke = await attendreQue(page, () => {
      const o = JSON.parse(localStorage.getItem('baluchon-essai')).objetsDuVoyage.find(x => x.id === 'o-gel');
      return o.quantite !== 1000 && o;
    });
    juge.exige(stocke?.quantite === 999 && stocke.quantiteManuelle, `${cas} : − ${vu(stocke)}`);
    await calme(page);
    juge.exige((await lireFiche(page))?.desactives === 'quantite-plus', `${cas} : à 999 ${vu(await lireFiche(page))}`);
    await fermerEssai(juge, cas, ouvert);
  }

  // Sous le filtre : Pyjama devenu complet en baissant sa quantité se masque après la seconde de répit.
  {
    const cas = 'filtre';
    const ouvert = await ouvrirEssai({ horloge: true });
    const { page } = ouvert;
    await page.click('#app [data-action="filtre"]');
    await calme(page);
    await ouvrirFiche(page, 'o-pyj');
    await page.clock.pauseAt((await page.evaluate(() => Date.now())) + 10);
    await toucherFiche(page, 'quantite-moins');
    await attendreQue(
      page,
      () => document.querySelector('dialog.fiche-voyage .fiche-ajuster output')?.textContent === '1',
    );
    const pendant = await ligne(page, 'o-pyj');
    await page.clock.runFor(1100);
    const apres = await attendreQue(page, () => !document.querySelector('#app .objet[data-id="o-pyj"]'));
    juge.exige(pendant !== null && apres, `${cas} : ligne pendant le répit ${vu(pendant)}, masquée ensuite ${apres}`);
    await page.clock.resume();
    await fermerEssai(juge, cas, ouvert);
  }

  // Renommer : nom vide refusé, nom piégé, la bibliothèque intacte ; panne : la fiche reste avec sa saisie.
  {
    const cas = 'renommer';
    const ouvert = await ouvrirEssai({ format: 'ordinateur' });
    const { page } = ouvert;
    const bibliotheque = vu((await lireStockage(page)).bibliotheque);
    await ouvrirFiche(page, 'o-pul');
    await toucherFiche(page, 'renommer');
    await attendreQue(page, s => document.querySelector(`${s}[open]`) !== null, RENOMMER);
    await calme(page);
    const fiche = await page.evaluate(
      s => ({
        titre: document.querySelector(`${s} h2`)?.textContent.trim(),
        sousTitre: document.querySelector(`${s} .fiche-regle`)?.textContent.trim(),
        nom: document.querySelector(`${s} #f-nom`)?.value,
        // Le champ prend le focus, son texte sélectionné : le clavier sort, on tape le nouveau nom.
        focus: document.activeElement?.id,
        selection: [document.activeElement?.selectionStart, document.activeElement?.selectionEnd],
        bouton: document.querySelector(`${s} .fenetre-pied .bouton-principal`)?.textContent.trim(),
      }),
      RENOMMER,
    );
    juge.exige(
      fiche.titre === fr.ajustement.renommer.titre &&
        fiche.sousTitre === fr.ajustement.ajout.voyageSeulement &&
        fiche.nom === 'Pull' &&
        fiche.focus === 'f-nom' &&
        vu(fiche.selection) === vu([0, 4]) &&
        fiche.bouton === fr.modele.enregistrer,
      `${cas} : fiche ${vu(fiche)}`,
    );
    await page.fill(`${RENOMMER} #f-nom`, '   ');
    await page.click(`${RENOMMER} .fenetre-pied .bouton-principal`);
    await calme(page);
    const refus = await page.evaluate(s => document.querySelector(`${s} .erreur-champ`)?.textContent.trim(), RENOMMER);
    juge.exige(refus === fr.modele.objet.erreurs.nomManquant, `${cas} : nom vide « ${refus} »`);
    // Panne : la fiche reste, avec sa saisie, et le message en haut.
    await ecrireStockage(page, { ...(await lireStockage(page)), pannes: ['renommerObjetDuVoyage'] });
    await page.fill(`${RENOMMER} #f-nom`, PIEGE);
    await page.press(`${RENOMMER} #f-nom`, 'Enter');
    const message = await attendreQue(page, () => document.querySelector('.alerte-haut')?.textContent.trim());
    const garde = await page.evaluate(s => document.querySelector(`${s}[open] #f-nom`)?.value, RENOMMER);
    juge.exige(
      message === fr.bibliotheque.erreurEnregistrement &&
        garde === PIEGE &&
        (await objetStocke(page, 'o-pul')).nom === 'Pull' &&
        (await ligne(page, 'o-pul'))?.nom === 'Pull',
      `${cas} : panne, message « ${message} », saisie ${garde}, ligne ${vu(await ligne(page, 'o-pul'))}`,
    );
    const stocke = await lireStockage(page);
    await ecrireStockage(page, { ...stocke, pannes: [] });
    await page.click(`${RENOMMER} .fenetre-pied .bouton-principal`);
    await attendreQue(page, s => !document.querySelector(s), RENOMMER);
    await calme(page);
    const apres = await lireFiche(page);
    const ligneApres = await ligne(page, 'o-pul');
    juge.exige(
      apres?.titre === PIEGE &&
        apres.balises === 0 &&
        ligneApres?.nom === PIEGE &&
        ligneApres.balises === 0 &&
        (await objetStocke(page, 'o-pul')).nom === PIEGE &&
        vu((await lireStockage(page)).bibliotheque) === bibliotheque,
      `${cas} : après ${vu(apres)}, ligne ${vu(ligneApres)}`,
    );
    // Renommé, un objet reprend sa place alphabétique (après la seconde de répit, comme une coche).
    await page.keyboard.press('Escape');
    await attendreQue(page, s => !document.querySelector(s), FICHE);
    await ouvrirFiche(page, 'o-tsh');
    await toucherFiche(page, 'renommer');
    await attendreQue(page, s => document.querySelector(`${s}[open]`) !== null, RENOMMER);
    await page.fill(`${RENOMMER} #f-nom`, 'Anorak');
    await page.press(`${RENOMMER} #f-nom`, 'Enter');
    await attendreQue(page, s => !document.querySelector(s), RENOMMER);
    await page.keyboard.press('Escape');
    const ordre = await attendreQue(page, () => {
      const ids = [...document.querySelectorAll('#app .gf-liste .objet')].map(li => li.dataset.id);
      return ids[0] === 'o-tsh' && ids;
    });
    juge.exige(ordre, `${cas} : « Anorak » n'a pas pris la première place`);
    // Les erreurs attendues sont celles de la panne simulée.
    ouvert.erreurs.splice(0, ouvert.erreurs.length, ...ouvert.erreurs.filter(e => !e.includes('Panne simulée')));
    await fermerEssai(juge, cas, ouvert);
  }

  // Panne de reglerQuantite : relecture et message au bas de l'écran.
  {
    const cas = 'panne de quantité';
    const ouvert = await ouvrirEssai();
    const { page } = ouvert;
    await ouvrirFiche(page, 'o-rep');
    await ecrireStockage(page, { ...(await lireStockage(page)), pannes: ['reglerQuantite'] });
    await toucherFiche(page, 'quantite-plus');
    const message = await attendreQue(page, () => document.querySelector('.alerte[role="alert"]')?.textContent.trim());
    await attendreQue(
      page,
      () => document.querySelector('dialog.fiche-voyage .fiche-ajuster output')?.textContent === '16',
    );
    const vue = await lireFiche(page);
    juge.exige(
      message === fr.voyage.erreurModification &&
        vue?.quantite === '16' &&
        vue.calcul !== f.fixeeManuellement &&
        (await ligne(page, 'o-rep'))?.quantite === '6 / 16',
      `${cas} : message « ${message} », ${vu(vue)}`,
    );
    await ouvert.contexte.close();
  }

  // Captures : la fiche (quantité fixée manuellement) à chaque format, clair et sombre.
  for (const theme of ['light', 'dark'])
    for (const format of Object.keys(TOUS_FORMATS)) {
      const cas = `fiche, ${format}, ${NOMS_THEME[theme]}`;
      const ouvert = await ouvrirEssai({ format, theme });
      const { page } = ouvert;
      await ouvrirFiche(page, 'o-tsh');
      await toucherFiche(page, 'quantite-moins');
      await attendreQue(page, () =>
        document.querySelector('dialog.fiche-voyage [data-calcul]')?.textContent.includes('manuellement'),
      );
      await calme(page);
      await verifierCommandes(page, juge, cas);
      await capture(page, 'voyage-ajuster-fiche', format, theme);
      if (format === 'telephone-etroit') {
        // Le bas de la fiche, défilée : « Retirer du voyage ».
        await page.evaluate(s => document.querySelector(`${s} .fiche-corps`).scrollTo(0, 99999), FICHE);
        await calme(page);
        await capture(page, 'voyage-ajuster-fiche-bas', format, theme);
        await page.evaluate(s => document.querySelector(`${s} .fiche-corps`).scrollTo(0, 0), FICHE);
        await ouvrirQuestionBaisse(page);
        await capture(page, 'voyage-ajuster-baisse', format, theme);
      }
      await fermerEssai(juge, cas, ouvert);
    }

  // Captures : « Renommer », au téléphone étroit et à l'ordinateur, clair et sombre.
  for (const theme of ['light', 'dark'])
    for (const format of ['telephone-etroit', 'ordinateur']) {
      const cas = `renommer, ${format}, ${NOMS_THEME[theme]}`;
      const ouvert = await ouvrirEssai({ format, theme });
      const { page } = ouvert;
      await ouvrirFiche(page, 'o-pul');
      await toucherFiche(page, 'renommer');
      await attendreQue(page, s => document.querySelector(`${s}[open]`) !== null, RENOMMER);
      await calme(page);
      await verifierCommandes(page, juge, cas);
      await capture(page, 'voyage-ajuster-renommer', format, theme);
      await fermerEssai(juge, cas, ouvert);
    }
} finally {
  await navigateur.close();
  await serveur.fermer();
}

// La question « Sortir une pièce du sac ? » sur la fiche ouverte : tout dans le sac, puis −.
async function ouvrirQuestionBaisse(page) {
  await toucherFiche(page, 'tout');
  await toucherFiche(page, 'quantite-moins');
  await attendreQuestion(page);
}

juge.conclure(
  'Ajuster un objet du voyage',
  'ligne du haut, quantité fixée et relue, baisse sous le sac, bornes, filtre, renommer, pannes, captures',
);
