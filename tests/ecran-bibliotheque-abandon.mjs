// Phase 5 (docs/PLAN.md) : fermer une fiche de modèle, et ses enregistrements refusés ou répétés
// (maquette validée le 2026-10-25, docs/maquettes/bibliotheque/, états « abandon » et « panne »).
// - Repas modifié : ×, « Annuler », Échap, appui sur le voile, retour système → chaque fois « Abandonner
//   les modifications ? » ; « Continuer la saisie » garde la saisie ; « Abandonner » ferme sans écrire ;
//   fiche non modifiée : ×, retour système → fermeture directe ;
// - Review Focus 2 : catalogue ouvert sur une fiche modifiée, retour système → seul le catalogue se
//   ferme, la saisie reste ; le retour suivant pose la question ;
// - Review Focus 3 : double appui sur « Créer la catégorie » pendant l'écriture → une seule catégorie,
//   bouton inactif tant qu'elle court ; panne d'écriture → message en haut, par-dessus la fiche, qui
//   reste ouverte avec sa saisie, rien d'écrit ; panne levée, second appui → une seule catégorie ;
// - Review Focus 1 : la question d'abandon dit le nom <i>Pâtes</i> & "riz" en texte.
import { chromium } from 'playwright';
import { attendreQue, calme } from './outils/attente.mjs';
import { attendreQuestion, question, repondre } from './outils/assistant.mjs';
import { demarrerServeur } from './outils/serveur.mjs';
import {
  DONNEES,
  fermerEssai,
  fr,
  ouvrirBibliotheque as ouvrirLaBibliotheque,
  remplir,
  toucheRetour,
  vu,
} from './outils/bibliotheque.mjs';
import {
  CATALOGUE,
  FICHE,
  attendreFermee,
  attendreOuverte,
  bibliothequeStockee,
  enregistrer,
  lireFiche,
  m,
  ouvrirFicheCategorie,
  ouvrirFicheObjet,
  ouvrirNouvelObjet,
  ouvrirNouvelleCategorie,
  saisir,
  toucher,
} from './outils/fiches.mjs';
import { creerJuge, ecrireStockage, lireStockage } from './outils/page.mjs';

const juge = creerJuge();
const serveur = await demarrerServeur();
const navigateur = await chromium.launch();
const ouvrirBibliotheque = (format, options) => ouvrirLaBibliotheque(navigateur, serveur.url, format, options);
const fermer = (cas, ouvert) => fermerEssai(juge, cas, ouvert);
const a = m.abandon;
const nombreDe = async (page, nom) => (await bibliothequeStockee(page)).categories.filter(x => x.nom === nom).length;

// Chaque geste de fermeture d'une fiche modifiée pose la question ; « Continuer la saisie » la garde.
async function essaiAbandon() {
  const cas = 'abandon';
  const ouvert = await ouvrirBibliotheque('telephone');
  const { page } = ouvert;
  await ouvrirFicheObjet(page, 'Alimentation', 'Repas');
  await toucher(page, '[data-pas="valeur"][data-sens="1"]');
  const gestes = {
    '×': () => page.click(`${FICHE} .bouton-fermer`),
    Annuler: () => page.click(`${FICHE} .fenetre-pied .bouton-secondaire`),
    Échap: () => page.keyboard.press('Escape'),
    voile: () => page.touchscreen.tap(200, 20),
    'retour système': () => toucheRetour(page),
  };
  for (const [nom, geste] of Object.entries(gestes)) {
    await geste();
    const q = await attendreQuestion(page);
    juge.exige(
      q?.titre === a.titre &&
        vu(q.boutons) ===
          vu([
            { texte: a.continuer, principal: false },
            { texte: a.abandonner, principal: true },
          ]),
      `${cas}, ${nom} : question ${vu(q)}`,
    );
    const texte = await page.evaluate(() => document.querySelector('#texte-confirmation')?.textContent);
    juge.exige(texte === remplir(m.objet.abandonTexte, { nom: 'Repas' }), `${cas}, ${nom} : texte ${vu(texte)}`);
    await repondre(page, a.continuer);
    const fiche = await lireFiche(page);
    juge.exige(fiche?.valeur === '3', `${cas}, ${nom} : après « Continuer la saisie » ${vu(fiche)}`);
  }
  await page.click(`${FICHE} .bouton-fermer`);
  await attendreQuestion(page);
  await repondre(page, a.abandonner);
  juge.exige(await attendreFermee(page), `${cas} : « Abandonner » ne ferme pas la fiche`);
  const repas = (await bibliothequeStockee(page)).objets.find(x => x.nom === 'Repas');
  juge.exige(repas?.valeur === 2, `${cas} : écrit malgré l'abandon ${vu(repas)}`);

  // Non modifiée : × et retour système ferment sans rien demander.
  for (const [nom, geste] of [
    ['×', () => page.click(`${FICHE} .bouton-fermer`)],
    ['retour système', () => toucheRetour(page)],
  ]) {
    await ouvrirFicheObjet(page, 'Alimentation', 'Gourde');
    await geste();
    juge.exige(await attendreFermee(page), `${cas}, non modifiée, ${nom} : la fiche reste ouverte`);
    juge.exige((await question(page)) === null, `${cas}, non modifiée, ${nom} : question posée`);
  }
  // Le retour suivant quitte la Bibliothèque : aucune étape de fiche n'est restée dans l'historique.
  await toucheRetour(page);
  await attendreQue(page, () => document.querySelector('#app')?.dataset.ecran === 'reglages');
  juge.exige(
    (await page.evaluate(() => document.querySelector('#app').dataset.ecran)) === 'reglages',
    `${cas} : le retour après les fiches ne mène pas à Réglages`,
  );
  await fermer(cas, ouvert);
}

// Review Focus 2 : le retour ferme le catalogue seul, puis demande pour la fiche.
async function essaiCatalogueEtRetour() {
  const cas = 'catalogue et retour';
  const ouvert = await ouvrirBibliotheque('telephone');
  const { page } = ouvert;
  await ouvrirFicheCategorie(page, 'Camping');
  await saisir(page, '#f-nom', 'Bivouac');
  await toucher(page, '[data-action="catalogue"]');
  await attendreOuverte(page, CATALOGUE);
  await toucheRetour(page);
  juge.exige(await attendreFermee(page, CATALOGUE), `${cas} : le catalogue reste ouvert`);
  const fiche = await lireFiche(page);
  juge.exige(
    fiche?.nom === 'Bivouac' && (await question(page)) === null,
    `${cas} : la fiche ${vu(fiche)}, question ${vu(await question(page))}`,
  );
  await toucheRetour(page);
  const q = await attendreQuestion(page);
  juge.exige(q?.titre === a.titre, `${cas} : second retour ${vu(q)}`);
  const texte = await page.evaluate(() => document.querySelector('#texte-confirmation')?.textContent);
  juge.exige(texte === remplir(m.categorie.abandonTexte, { nom: 'Camping' }), `${cas} : texte ${vu(texte)}`);
  await repondre(page, a.continuer);
  juge.exige((await lireFiche(page))?.nom === 'Bivouac', `${cas} : saisie perdue`);
  await fermer(cas, ouvert);
}

// Review Focus 3 : écriture lente et double appui, puis panne et nouvel essai.
async function essaiDoubleAppuiEtPanne() {
  const cas = 'double appui';
  const lent = await ouvrirBibliotheque('telephone', { donnees: { ...DONNEES, lenteurs: ['enregistrerCategorie'] } });
  {
    const { page } = lent;
    await ouvrirNouvelleCategorie(page);
    await saisir(page, '#f-nom', 'Courses');
    await page.click(`${FICHE} .fenetre-pied .bouton-principal`);
    // Le second appui touche le bouton devenu inactif (Playwright le refuserait sans force).
    await page.click(`${FICHE} .fenetre-pied .bouton-principal`, { force: true });
    const pendant = await lireFiche(page);
    juge.exige(pendant?.boutonInactif, `${cas} : bouton actif pendant l'écriture ${vu(pendant)}`);
    // L'écriture lente attend d'être libérée : toutes celles qui attendent le sont.
    await attendreQue(page, () => typeof window.debloquerStockage === 'function');
    await page.evaluate(() => window.debloquerStockage());
    juge.exige(await attendreFermee(page), `${cas} : la fiche reste ouverte`);
    juge.exige(
      (await nombreDe(page, 'Courses')) === 1,
      `${cas} : ${await nombreDe(page, 'Courses')} catégories Courses`,
    );
  }
  await fermer(cas, lent);

  const casPanne = 'panne';
  const enPanne = await ouvrirBibliotheque('telephone', {
    donnees: { ...DONNEES, pannes: ['enregistrerCategorie'] },
  });
  {
    const { page } = enPanne;
    await ouvrirNouvelleCategorie(page);
    await saisir(page, '#f-nom', 'Courses');
    await enregistrer(page);
    const alerte = await page.evaluate(() => {
      const el = document.querySelector('.alerte-haut');
      return (
        el && {
          texte: el.textContent.trim(),
          ouverte: el.matches(':popover-open'),
          dansLaFiche: Boolean(el.closest('dialog.fiche-modele')),
        }
      );
    });
    juge.exige(
      alerte?.texte === fr.bibliotheque.erreurEnregistrement && alerte.ouverte && alerte.dansLaFiche,
      `${casPanne} : message ${vu(alerte)}`,
    );
    const fiche = await lireFiche(page);
    juge.exige(fiche?.nom === 'Courses' && !fiche.boutonInactif, `${casPanne} : fiche ${vu(fiche)}`);
    juge.exige((await nombreDe(page, 'Courses')) === 0, `${casPanne} : écrite malgré la panne`);
    // La panne levée, un second appui crée la catégorie, une seule fois.
    await ecrireStockage(page, { ...(await lireStockage(page)), pannes: [] });
    await enregistrer(page);
    juge.exige(await attendreFermee(page), `${casPanne} : la fiche reste ouverte après la panne levée`);
    juge.exige(
      (await nombreDe(page, 'Courses')) === 1,
      `${casPanne} : ${await nombreDe(page, 'Courses')} catégories Courses après la panne levée`,
    );
    enPanne.erreurs.splice(0, Infinity, ...enPanne.erreurs.filter(e => !e.includes('Panne simulée')));
  }
  await fermer(casPanne, enPanne);
}

// Review Focus 1 : la question d'abandon d'un objet au nom piégé.
async function essaiNomPiege() {
  const cas = 'nom piégé, abandon';
  const nom = '<i>Pâtes</i> & "riz"';
  const ouvert = await ouvrirBibliotheque('telephone');
  const { page } = ouvert;
  await ouvrirNouvelObjet(page, 'Alimentation');
  await saisir(page, '#f-nom', nom);
  await enregistrer(page);
  await attendreFermee(page);
  await ouvrirFicheObjet(page, 'Alimentation', nom);
  await toucher(page, '[data-pas="valeur"][data-sens="1"]');
  await page.click(`${FICHE} .bouton-fermer`);
  await attendreQuestion(page);
  const vue = await page.evaluate(() => ({
    texte: document.querySelector('#texte-confirmation')?.textContent,
    balises: document.querySelectorAll('dialog[role="alertdialog"] i').length,
  }));
  juge.exige(vue.texte === remplir(m.objet.abandonTexte, { nom }) && vue.balises === 0, `${cas} : ${vu(vue)}`);
  await repondre(page, a.abandonner);
  await calme(page);
  await fermer(cas, ouvert);
}

try {
  await essaiAbandon();
  await essaiCatalogueEtRetour();
  await essaiDoubleAppuiEtPanne();
  await essaiNomPiege();
} finally {
  await navigateur.close();
  await serveur.fermer();
}
juge.conclure('Fermer une fiche', 'question d’abandon, catalogue et retour, double appui, panne, nom piégé');
