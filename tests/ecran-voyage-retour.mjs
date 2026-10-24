// Phase 3 (docs/PRD.md, « Écrans et gestes ») : sur la liste d'un voyage ouverte depuis Mes voyages,
// le retour système (page.goBack, comme le retour d'Android) ferme le dernier niveau ouvert.
// - confirmation « Vider » posée sur la fiche de Gourde : un retour ferme la confirmation (rien n'est
//   vidé), la fiche reste ; un deuxième ferme la fiche (focus rendu à la ligne) ; un troisième quitte
//   le voyage ;
// - fiche seule (Repas) : un retour la ferme, focus sur la ligne, l'écran reste ; un second quitte ;
// - confirmation depuis la case de Gourde : un retour la ferme (rien n'est vidé), focus sur la case ;
//   un second quitte ;
// - un niveau fermé autrement (fiche par « × », Échap ou le voile ; confirmation par « Annuler » ou
//   « Vider ») ne laisse aucune étape derrière lui : un seul retour quitte alors le voyage (témoin) ;
// - sans animation, fiche fermée par « × » puis rouverte aussitôt, avant que son étape ne soit
//   retirée : la nouvelle fiche reste ouverte, un retour la ferme, un second quitte le voyage ;
// - en une colonne (téléphone) et en deux panneaux (tablette en paysage).
import { chromium } from 'playwright';
import { attendreQue, calme } from './outils/attente.mjs';
import { demarrerServeur } from './outils/serveur.mjs';
import { FORMATS, attendreEcran, creerJuge, lireStockage, ouvrir } from './outils/page.mjs';
import { DONNEES } from './outils/voyage-essai.mjs';

const juge = creerJuge();
const serveur = await demarrerServeur();
const navigateur = await chromium.launch();

// Le voyage ouvert depuis Mes voyages, Alimentation en vue (choisie à gauche en deux panneaux).
async function ouvrirVoyage(format) {
  const ouvert = await ouvrir(navigateur, serveur.url, {
    taille: FORMATS[format],
    theme: 'light',
    donnees: DONNEES,
    adresse: '#/voyages',
  });
  await ouvert.page.click('a.carte-voyage[href="#/voyage/v1"]');
  await attendreEcran(ouvert.page, 'voyage');
  if (format === 'tablette-paysage') {
    await ouvert.page.click('.choix[data-id="c-ali"]');
    await calme(ouvert.page);
  }
  return ouvert;
}

// Ce que l'on voit : l'écran, la fiche et la confirmation ouvertes, et ce qui a le focus.
const etat = page =>
  page.evaluate(() => {
    const el = document.activeElement;
    return {
      ecran: document.querySelector('#app')?.dataset.ecran ?? null,
      fiche: Boolean(document.querySelector('dialog.fiche[open]')),
      confirmation: Boolean(document.querySelector('dialog[role="alertdialog"][open]')),
      focus:
        el && el !== document.body ? `${el.dataset.action ?? el.tagName.toLowerCase()}:${el.dataset.id ?? ''}` : 'body',
    };
  });

// Un retour système, puis l'écran une fois calmé : la fenêtre fermée ou l'écran suivant dessiné ;
// « hors de l'appli » si le retour l'a quittée.
async function retour(page) {
  await page.goBack({ timeout: 3000 }).catch(() => null);
  if (!page.url().startsWith(serveur.url)) return { ecran: 'hors de l’appli' };
  await calme(page);
  return etat(page);
}

const ouvrirFiche = async (page, id) => {
  await page.click(`.objet[data-id="${id}"] .objet-corps`);
  await attendreQue(page, () => document.querySelector('dialog.fiche[open]') !== null);
  await calme(page);
};
const ouvrirConfirmation = async (page, selecteur) => {
  await page.click(selecteur);
  await attendreQue(page, () => document.querySelector('dialog[role="alertdialog"][open]') !== null);
  await calme(page);
};
const gourde = async page => (await lireStockage(page)).objetsDuVoyage.find(o => o.id === 'o-gou').dansLeSac;
const vu = e => JSON.stringify(e);

// Les façons de fermer un niveau sans le retour : chacune part du voyage et y revient, niveau fermé.
const AUTRES_FERMETURES = {
  'fiche, « × »': async page => {
    await ouvrirFiche(page, 'o-rep');
    await page.click('dialog.fiche .bouton-fermer');
  },
  'fiche, Échap': async page => {
    await ouvrirFiche(page, 'o-rep');
    await page.keyboard.press('Escape');
  },
  'fiche, voile': async page => {
    await ouvrirFiche(page, 'o-rep');
    await page.mouse.click(8, 100);
  },
  'confirmation, « Annuler »': async page => {
    await ouvrirConfirmation(page, '.objet[data-id="o-gou"] .case');
    await page.click('dialog[role="alertdialog"] .bouton-secondaire');
  },
  'confirmation sur la fiche, « Vider » puis « × »': async page => {
    await ouvrirFiche(page, 'o-gou');
    await ouvrirConfirmation(page, 'dialog.fiche [data-fiche="vider"]');
    await page.click('dialog[role="alertdialog"] [data-confirmer]');
    await attendreQue(page, () => !document.querySelector('dialog[role="alertdialog"]'));
    await page.click('dialog.fiche .bouton-fermer');
  },
};

try {
  for (const format of ['telephone', 'tablette-paysage']) {
    // Trois appuis : confirmation, puis fiche, puis l'écran.
    {
      const { contexte, page, erreurs } = await ouvrirVoyage(format);
      await ouvrirFiche(page, 'o-gou');
      await ouvrirConfirmation(page, 'dialog.fiche [data-fiche="vider"]');
      const un = await retour(page);
      juge.exige(
        un.ecran === 'voyage' && un.fiche && !un.confirmation && (await gourde(page)) === 2,
        `${format}, confirmation sur la fiche, 1er retour : ${vu(un)}, gourde ${await gourde(page)}`,
      );
      const deux = await retour(page);
      juge.exige(
        deux.ecran === 'voyage' && !deux.fiche && deux.focus === 'fiche:o-gou',
        `${format}, confirmation sur la fiche, 2e retour : ${vu(deux)}`,
      );
      const trois = await retour(page);
      juge.exige(trois.ecran === 'voyages', `${format}, confirmation sur la fiche, 3e retour : ${vu(trois)}`);
      juge.exige(erreurs.length === 0, `${format}, trois appuis : erreurs dans la page : ${erreurs.join(' | ')}`);
      await contexte.close();
    }

    // Fiche seule.
    {
      const { contexte, page, erreurs } = await ouvrirVoyage(format);
      await ouvrirFiche(page, 'o-rep');
      const un = await retour(page);
      juge.exige(
        un.ecran === 'voyage' && !un.fiche && un.focus === 'fiche:o-rep',
        `${format}, fiche seule, 1er retour : ${vu(un)}`,
      );
      const deux = await retour(page);
      juge.exige(deux.ecran === 'voyages', `${format}, fiche seule, 2e retour : ${vu(deux)}`);
      juge.exige(erreurs.length === 0, `${format}, fiche seule : erreurs dans la page : ${erreurs.join(' | ')}`);
      await contexte.close();
    }

    // Confirmation depuis la case.
    {
      const { contexte, page, erreurs } = await ouvrirVoyage(format);
      await ouvrirConfirmation(page, '.objet[data-id="o-gou"] .case');
      const un = await retour(page);
      juge.exige(
        un.ecran === 'voyage' && !un.confirmation && un.focus === 'case:o-gou' && (await gourde(page)) === 2,
        `${format}, confirmation depuis la case, 1er retour : ${vu(un)}, gourde ${await gourde(page)}`,
      );
      const deux = await retour(page);
      juge.exige(deux.ecran === 'voyages', `${format}, confirmation depuis la case, 2e retour : ${vu(deux)}`);
      juge.exige(erreurs.length === 0, `${format}, case : erreurs dans la page : ${erreurs.join(' | ')}`);
      await contexte.close();
    }

    // Témoin : un niveau fermé autrement, puis un seul retour quitte le voyage.
    for (const [geste, fermer] of Object.entries(AUTRES_FERMETURES)) {
      const { contexte, page, erreurs } = await ouvrirVoyage(format);
      await fermer(page);
      await attendreQue(page, () => !document.querySelector('dialog'));
      await calme(page);
      const avant = await etat(page);
      const apres = await retour(page);
      juge.exige(
        avant.ecran === 'voyage' && !avant.fiche && !avant.confirmation && apres.ecran === 'voyages',
        `${format}, ${geste} : avant le retour ${vu(avant)}, après ${vu(apres)}`,
      );
      juge.exige(erreurs.length === 0, `${format}, ${geste} : erreurs dans la page : ${erreurs.join(' | ')}`);
      await contexte.close();
    }

    // Sans animation, fiche fermée puis rouverte dans la foulée.
    {
      const { contexte, page, erreurs } = await ouvrirVoyage(format);
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await ouvrirFiche(page, 'o-rep');
      await page.evaluate(async () => {
        document.querySelector('dialog.fiche .bouton-fermer').click();
        // Quelques micro-tâches, le temps que la fiche s'efface ; l'historique, lui, n'a pas encore reculé.
        for (let i = 0; i < 20 && document.querySelector('dialog.fiche'); i++) await Promise.resolve();
        document.querySelector('.objet[data-id="o-gou"] .objet-corps').click();
      });
      await calme(page);
      const rouverte = await etat(page);
      const un = await retour(page);
      const deux = await retour(page);
      juge.exige(
        rouverte.fiche && un.ecran === 'voyage' && !un.fiche && deux.ecran === 'voyages',
        `${format}, fiche rouverte aussitôt : ${vu(rouverte)}, 1er retour ${vu(un)}, 2e retour ${vu(deux)}`,
      );
      juge.exige(erreurs.length === 0, `${format}, fiche rouverte : erreurs dans la page : ${erreurs.join(' | ')}`);
      await contexte.close();
    }
  }
} finally {
  await navigateur.close();
  await serveur.fermer();
}
juge.conclure(
  'Retour sur la liste d’un voyage',
  'confirmation, fiche puis écran ; fiche seule ; case ; cinq autres fermetures sans étape fantôme ; fiche rouverte aussitôt ; une colonne et deux panneaux',
);
