// Rapport du texte agrandi à 130 % (phase 14, décision 12 du chef de projet) : chaque écran des quatre grilles
// est revu au téléphone et à la tablette en portrait, en clair, avec toutes les tailles de texte agrandies de
// 30 %. Les défauts ne font pas échouer le test : ils sont écrits dans captures-travail/phase-14/rapports/
// (texte-agrandi-<famille>-<format>.txt, une capture par état fautif). Seul le témoin peut le faire échouer :
// le nom d'un objet du voyage doit mesurer 17 px sans la feuille et 22,1 px avec ; sinon la simulation ne
// simule plus rien et le rapport ne dirait plus rien de vrai.
import { chromium } from 'playwright';
import { ETATS as ACCUEIL } from './ecran-grille-accueil.mjs';
import { ETATS as ASSISTANT } from './ecran-grille-assistant.mjs';
import { ETATS as BIBLIOTHEQUE } from './ecran-grille-bibliotheque.mjs';
import { ETATS as VOYAGE } from './ecran-grille-voyage.mjs';
import { parcourirGrille } from './outils/grille.mjs';
import { segmentsBordsNets, segmentsSansDebord } from './outils/grille-fenetres.mjs';
import { FORMATS, attendreEcran, creerJuge, ouvrir } from './outils/page.mjs';
import { demarrerServeur } from './outils/serveur.mjs';
import { DONNEES } from './outils/voyage-essai.mjs';

const FACTEUR = 1.3;
const FORMATS_AGRANDIS = ['telephone', 'tablette-portrait'];

// Pose la feuille d'agrandissement dans la page : elle multiplie par FACTEUR toute taille de police écrite en
// pixels dans les feuilles de style de l'appli, y compris les jetons --taille-* et le raccourci `font`. Elle se
// rejoue à chaque nouveau document (navigation) et à chaque feuille ajoutée plus tard, sans jamais agrandir deux fois.
const agrandirLePage = facteur => {
  const faites = new WeakSet();
  const PX = /(\d+(?:\.\d+)?)px/;
  const mise = valeur => valeur.replace(PX, (_, n) => `${+(n * facteur).toFixed(3)}px`);
  const regle = r => {
    if (r.cssRules) for (const sous of r.cssRules) regle(sous);
    if (!r.style || faites.has(r)) return;
    faites.add(r);
    const s = r.style;
    for (let i = 0; i < s.length; i++) {
      const nom = s[i];
      if (nom.startsWith('--taille-') && PX.test(s.getPropertyValue(nom)))
        s.setProperty(nom, mise(s.getPropertyValue(nom)), s.getPropertyPriority(nom));
    }
    const raccourci = s.getPropertyValue('font');
    if (PX.test(raccourci)) s.setProperty('font', mise(raccourci), s.getPropertyPriority('font'));
    else if (PX.test(s.fontSize)) s.setProperty('font-size', mise(s.fontSize), s.getPropertyPriority('font-size'));
  };
  const tout = () => {
    for (const feuille of document.styleSheets) {
      try {
        for (const r of feuille.cssRules) regle(r);
      } catch {
        /* feuille d'une autre origine : illisible, hors de l'appli */
      }
    }
  };
  tout();
  const estFeuille = n => n.nodeName === 'STYLE' || n.nodeName === 'LINK';
  new MutationObserver(m => m.some(x => [...x.addedNodes].some(estFeuille)) && tout()).observe(document, {
    childList: true,
    subtree: true,
  });
  addEventListener('DOMContentLoaded', tout);
  addEventListener('load', tout);
};

const agrandir = async page => {
  await page.addInitScript(`(${agrandirLePage})(${FACTEUR})`);
  await page.evaluate(`(${agrandirLePage})(${FACTEUR})`);
};

// Chaque état pose la feuille avant sa propre préparation ; les tableaux importés restent intacts.
const agrandis = etats =>
  etats.map(etat => ({
    ...etat,
    preparer: async page => {
      await agrandir(page);
      await (etat.preparer ?? (() => {}))(page);
    },
  }));

async function mesurerTemoin(navigateur, url, avecFeuille) {
  const { contexte, page } = await ouvrir(navigateur, url, {
    taille: FORMATS.telephone,
    theme: 'light',
    donnees: DONNEES,
    maintenant: new Date('2026-10-08T10:00:00'),
    adresse: '#/voyage/v1',
  });
  try {
    await attendreEcran(page, 'voyage');
    const mesure = () =>
      page.evaluate(() => parseFloat(getComputedStyle(document.querySelector('.objet-nom')).fontSize));
    if (avecFeuille) await agrandir(page);
    const avant = await mesure();
    // La simulation doit survivre à un rechargement (un état qui navigue dans la page).
    await page.reload();
    await attendreEcran(page, 'voyage');
    return [avant, await mesure()];
  } finally {
    await contexte.close();
  }
}

// Le témoin : 17 px sans la feuille, 22,1 px (± 0,1) avec. `avecFeuille` sert à prouver qu'il rougit sans elle.
async function verifierTemoin(juge, { avecFeuille = true } = {}) {
  const serveur = await demarrerServeur();
  const navigateur = await chromium.launch();
  try {
    const [sans] = await mesurerTemoin(navigateur, serveur.url, false);
    const [avec, apres] = await mesurerTemoin(navigateur, serveur.url, avecFeuille);
    juge.exige(
      Math.abs(sans - 17) <= 0.1,
      `témoin : le nom d'un objet mesure ${sans} px sans la feuille (17 attendus)`,
    );
    juge.exige(
      Math.abs(avec - 22.1) <= 0.1,
      `témoin : le nom d'un objet mesure ${avec} px avec la feuille (22,1 attendus)`,
    );
    juge.exige(
      Math.abs(apres - 22.1) <= 0.1,
      `témoin : le nom d'un objet mesure ${apres} px après un rechargement (22,1 attendus)`,
    );
  } finally {
    await navigateur.close();
    await serveur.fermer();
  }
}

// Le juge des familles ne voit rien (aucun format bloquant) : il ne dit rien ; les défauts sont au rapport.
const JUGE_MUET = { exige() {}, conclure() {} };

const juge = creerJuge();
await verifierTemoin(juge);
const FAMILLES = { accueil: ACCUEIL, assistant: ASSISTANT, voyage: VOYAGE, bibliotheque: BIBLIOTHEQUE };
for (const [famille, etats] of Object.entries(FAMILLES))
  await parcourirGrille({
    titre: `texte-agrandi-${famille}`,
    etats: agrandis(etats),
    formats: [],
    rapport: FORMATS_AGRANDIS,
    juge: JUGE_MUET,
  });
// Ruling 11 : deux défauts corrigés restent bloquants au téléphone (clair et sombre), jugés par le vrai juge.
const BLOQUANTS = [
  [ACCUEIL, 'reglages'],
  [BIBLIOTHEQUE, 'noms-longs-fiche-objet'],
];
const bloquants = BLOQUANTS.map(([etats, nom]) => etats.find(e => e.nom === nom));
// Le même état, jugé aussi sur la rangée « Pour qui » : traits nets quand elle passe sur deux lignes, mots dans leur case.
const ficheObjet = bloquants.find(e => e.nom === 'noms-longs-fiche-objet');
const rangeeNette = {
  ...ficheObjet,
  nom: 'noms-longs-fiche-objet-rangee-pour-qui',
  preparer: async page => {
    await ficheObjet.preparer(page);
    await segmentsBordsNets(page, 'dialog.fiche-modele .segments-pour-qui');
    await segmentsSansDebord(page, 'dialog.fiche-modele');
  },
};
await parcourirGrille({
  titre: 'texte-agrandi-bloquant',
  etats: agrandis([...bloquants, rangeeNette]),
  formats: ['telephone'],
  rapport: [],
  juge,
});
juge.conclure('texte agrandi à 130 %', 'témoin tenu ; défauts au rapport');
