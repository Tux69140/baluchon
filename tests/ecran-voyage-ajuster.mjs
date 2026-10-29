// Phase 8 (docs/superpowers/specs/2026-10-28-phase-8-ajuster-design.md ; maquette docs/maquettes/ajuster/) :
// « Ajuster cet objet » dans la fiche d'un objet du voyage.
// - la ligne du haut ne dit que la catégorie ; le calcul vit sous « Quantité prévue » ;
// - corriger la quantité la marque fixée manuellement et le reste à la relecture (critère du plan) ;
// - baisser sous le sac demande « Sortir … du sac ? » à la fermeture de la fiche, pas avant ; « Garder » ne
//   change rien, « Retirer » fait suivre le sac (un double appui ne baisse qu'une fois) ; témoin : sans pièce
//   de trop, rien n'est demandé ; le sac part de ce que la fiche montre pendant l'attente ;
// - − inactif à 1, + inactif à 999 ; une quantité calculée au-delà de 999 descend ;
// - sous le filtre, un objet devenu complet en baissant sa quantité se masque comme après une coche ;
// - renommer change le nom dans ce voyage, pas dans la bibliothèque ; un nom vide est refusé ; un nom
//   piégé (<, &, ") se lit tel quel ; panne → la fiche reste ouverte avec sa saisie, message en haut ;
// - panne de reglerQuantite → relecture et message au bas de l'écran ; un changement touché pendant la
//   relecture d'une coche refusée est dit perdu lui aussi ;
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
const s = fr.sortie;
// La phrase de la phase 10 sous la question : « Plus tard » laisse la pièce signalée par un « ! ».
const suite = n => b.suite[n > 1 ? 'other' : 'one'];
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
        apres.calcul === remplir(f.fixeeAvecFormule, { regle: '2 / jour / personne' }) &&
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
    juge.exige(
      relue?.quantite === '17' && relue.calcul === remplir(f.fixeeAvecFormule, { regle: '2 / jour / personne' }),
      `${cas} : après relance ${vu(relue)}`,
    );
    await fermerEssai(juge, cas, ouvert);
  }

  // Baisser sous ce qui est dans le sac : aucune question pendant les appuis sur −, la fiche montre ce qui est
  // prévu sans rien écrire ; la question vient une fois, à la fermeture, et compte les pièces qui sortent
  // (demande du chef de projet, 2026-10-29). « Garder N » ne change rien ; « Retirer N » (double appui) écrit.
  {
    const cas = 'baisser sous le sac';
    const ouvert = await ouvrirEssai({ format: 'tablette-paysage' });
    const { page } = ouvert;
    const titre = n => remplir(n > 1 ? b.titre.other : b.titre.one, { n });
    const texte = (n, valeurs) => remplir(n > 1 ? b.texte.other : b.texte.one, { n, ...valeurs });
    const fermerLaFiche = async () => {
      await page.keyboard.press('Escape');
      await attendreQuestion(page);
    };
    // Témoin : Pyjama, 1 pièce sur 2 : baisser à 1 ne demande rien, ni tout de suite ni à la fermeture.
    await ouvrirFiche(page, 'o-pyj');
    await toucherFiche(page, 'quantite-moins');
    const pyjama = await attendreQue(page, () => {
      const o = JSON.parse(localStorage.getItem('baluchon-essai')).objetsDuVoyage.find(x => x.id === 'o-pyj');
      return o.quantite === 1 && o;
    });
    await page.keyboard.press('Escape');
    await attendreQue(page, s => !document.querySelector(s), FICHE);
    juge.exige(
      pyjama?.dansLeSac === 1 && pyjama.quantiteManuelle && (await lireQuestion(page)) === null,
      `${cas} : Pyjama sans question ${vu(pyjama)}, question ${vu(await lireQuestion(page))}`,
    );
    // Chaussettes, 8 sur 8 : trois appuis sur −, aucune question, rien d'écrit, la fiche montre 5 sur 5.
    await ouvrirFiche(page, 'o-cha');
    for (let i = 0; i < 3; i++) await toucherFiche(page, 'quantite-moins');
    await calme(page);
    const pendant = await lireFiche(page);
    const avant = await objetStocke(page, 'o-cha');
    juge.exige(
      (await lireQuestion(page)) === null &&
        pendant?.quantite === '5' &&
        pendant.sac === '5' &&
        pendant.sur === remplir(f.sur, { total: 5 }) &&
        avant.quantite === 8 &&
        avant.dansLeSac === 8 &&
        !avant.quantiteManuelle,
      `${cas} : pendant les appuis ${vu(pendant)}, stocké ${vu(avant)}`,
    );
    // À la fermeture, la question : 3 pièces sortent.
    await fermerLaFiche();
    const question = await lireQuestion(page);
    juge.exige(
      question?.titre === titre(3) &&
        vu(question.textes) === vu([texte(3, { compte: '8 pièces', nom: 'Chaussettes', quantite: 5 }), suite(3)]) &&
        vu(question.gras) === vu(['8 pièces']) &&
        vu(question.boutons) === vu([remplir(b.garder, { n: 8 }), s.plusTard, s.fait]),
      `${cas} : question ${vu(question)}`,
    );
    await capture(page, 'voyage-ajuster-baisse', 'tablette-paysage', 'light');
    // « Garder 8 » : rien ne change, la fiche se ferme.
    await repondre(page, remplir(b.garder, { n: 8 }));
    await attendreQue(page, s => !document.querySelector(s), FICHE);
    const garde = await objetStocke(page, 'o-cha');
    juge.exige(
      garde.quantite === 8 &&
        garde.dansLeSac === 8 &&
        !garde.quantiteManuelle &&
        (await ligne(page, 'o-cha'))?.quantite === '8',
      `${cas} : « Garder 8 » ${vu(garde)} ${vu(await ligne(page, 'o-cha'))}`,
    );
    // Brosse à dents, 2 sur 2 : un appui, la fermeture, « C’est fait » (double appui) écrit 1 sur 1.
    await ouvrirFiche(page, 'o-bro');
    await toucherFiche(page, 'quantite-moins');
    await fermerLaFiche();
    const une = await lireQuestion(page);
    juge.exige(
      une?.titre === titre(1) &&
        vu(une.textes) === vu([texte(1, { compte: '2 pièces', nom: 'Brosse à dents', quantite: 1 }), suite(1)]) &&
        vu(une.boutons) === vu([remplir(b.garder, { n: 2 }), s.plusTard, s.fait]),
      `${cas} : question d'une pièce ${vu(une)}`,
    );
    await repondre(page, s.fait, { double: true });
    const retire = await attendreQue(page, () => {
      const o = JSON.parse(localStorage.getItem('baluchon-essai')).objetsDuVoyage.find(x => x.id === 'o-bro');
      return o.quantite === 1 && o;
    });
    await attendreQue(page, s => !document.querySelector(s), FICHE);
    await calme(page);
    juge.exige(
      retire?.dansLeSac === 1 && retire.quantiteManuelle && (await lireQuestion(page)) === null,
      `${cas} : « C’est fait » ${vu(retire)}`,
    );
    // Rouverte : 1 sur 1, − inactif ; forcé, il ne fait rien.
    await ouvrirFiche(page, 'o-bro');
    const rouverte = await lireFiche(page);
    await toucherFiche(page, 'quantite-moins', { force: true });
    await calme(page);
    juge.exige(
      rouverte?.quantite === '1' &&
        rouverte.desactives === 'plus,tout,quantite-moins' &&
        (await objetStocke(page, 'o-bro')).quantite === 1 &&
        (await lireQuestion(page)) === null,
      `${cas} : rouverte ${vu(rouverte)}`,
    );
    // Une baisse remontée avant la fermeture ne demande rien : Chaussettes −, +, fermée.
    await page.keyboard.press('Escape');
    await attendreQue(page, s => !document.querySelector(s), FICHE);
    await ouvrirFiche(page, 'o-cha');
    await toucherFiche(page, 'quantite-moins');
    await toucherFiche(page, 'quantite-plus');
    await page.keyboard.press('Escape');
    await attendreQue(page, s => !document.querySelector(s), FICHE);
    const remonte = await objetStocke(page, 'o-cha');
    juge.exige(
      (await lireQuestion(page)) === null && remonte.quantite === 8 && remonte.dansLeSac === 8,
      `${cas} : baisse remontée ${vu(remonte)}`,
    );
    // Le sac part de ce que la fiche montre : Chaussettes −3 (5 sur 5), puis − du sac : 4 sur 5. Le sac ne
    // dépasse plus la quantité voulue : elle s'écrit, et la fermeture ne demande rien.
    await ouvrirFiche(page, 'o-cha');
    for (let i = 0; i < 3; i++) await toucherFiche(page, 'quantite-moins');
    await toucherFiche(page, 'moins');
    await calme(page);
    const sacBaisse = await lireFiche(page);
    await page.keyboard.press('Escape');
    await attendreQue(page, s => !document.querySelector(s), FICHE);
    const apresSac = await objetStocke(page, 'o-cha');
    juge.exige(
      sacBaisse?.sac === '4' &&
        sacBaisse.quantite === '5' &&
        (await lireQuestion(page)) === null &&
        apresSac.quantite === 5 &&
        apresSac.dansLeSac === 4,
      `${cas} : − du sac sous une baisse en attente ${vu(sacBaisse)}, stocké ${vu(apresSac)}`,
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
        vue.calcul === remplir(f.calculee, { regle: '2 par jour et par personne' }) &&
        (await ligne(page, 'o-rep'))?.quantite === '6 / 16',
      `${cas} : message « ${message} », ${vu(vue)}`,
    );
    await ouvert.contexte.close();
  }

  // Un changement touché pendant la relecture qui suit une coche refusée ne s'écrit pas : le message le dit
  // pour tous deux (« La modification… »), pas seulement pour la coche.
  {
    const cas = 'changement pendant la relecture';
    const ouvert = await ouvrirEssai();
    const { page } = ouvert;
    await ouvrirFiche(page, 'o-cha');
    const donnees = await lireStockage(page);
    await ecrireStockage(page, { ...donnees, pannes: ['reglerDansLeSac'], lenteurs: ['lireVoyage'] });
    await toucherFiche(page, 'moins');
    await attendreQue(page, () => typeof window.debloquerStockage === 'function');
    await toucherFiche(page, 'quantite-plus');
    await page.evaluate(() => window.debloquerStockage());
    const message = await attendreQue(page, () => document.querySelector('.alerte[role="alert"]')?.textContent.trim());
    const stocke = await objetStocke(page, 'o-cha');
    juge.exige(
      message === fr.voyage.erreurModification && stocke.quantite === 8 && stocke.dansLeSac === 8,
      `${cas} : message « ${message} », stocké ${vu(stocke)}`,
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
