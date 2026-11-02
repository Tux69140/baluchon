// Grille de la phase 14 : l'écran du voyage (liste, tuiles ou trois colonnes), son menu « ⋮ », la fiche d'objet,
// les ajouts, les pièces à sortir du sac, les Courses, la fiche d'achat et le bandeau « Annuler », à chaque
// format et chaque thème (voir tests/outils/grille.mjs). Les formats bloquants jugent par le code de sortie ;
// telephone-paysage est mis au rapport dans captures-travail/phase-14/rapports/.
// Hors grille, le voyage ouvert dans une fenêtre Debian basse et moyenne (1000 × 560, sans doigt) est jugé
// par ses seules commandes : grand écran par la largeur, pas par la hauteur.
import { chromium } from 'playwright';
import { pathToFileURL } from 'node:url';
import { attendreQue, calme } from './outils/attente.mjs';
import { ESSAI, ajouter, oui } from './outils/ajout-bibliotheque.mjs';
import { toucherAjouter } from './outils/ajouter.mjs';
import { attendreQuestion, fr, ouvrirFiche, repondre, toucherFiche } from './outils/ajuster.mjs';
import { avecMarques } from './outils/courses.mjs';
import { FORMATS_BLOQUANTS, parcourirGrille } from './outils/grille.mjs';
import { creerJuge, attendreEcran, ouvrir, verifierCommandes } from './outils/page.mjs';
import { demarrerServeur } from './outils/serveur.mjs';
import { DONNEES, avecPieces } from './outils/voyage-essai.mjs';

const MAINTENANT = new Date('2026-10-08T10:00:00');
const VOYAGE = '#/voyage/v1';
const COURSES = '#/voyage/v1/courses';
const BANDEAU = '.bandeau-annuler';
const FICHE_ACHAT = 'dialog.fiche-achat';

// Un nom de 60 caractères dont un mot de 30 lettres sans espace.
const LONG = `${'W'.repeat(30)} et des mots qui suivent encore et encore`.slice(0, 60);
const NOMS_LONGS = {
  ...DONNEES,
  voyages: DONNEES.voyages.map(v => (v.id === 'v1' ? { ...v, nom: LONG } : v)),
  etiquettesDuVoyage: DONNEES.etiquettesDuVoyage.map(e => (e.nom === 'Camping' ? { ...e, nom: LONG } : e)),
  categoriesDuVoyage: DONNEES.categoriesDuVoyage.map(c => (c.id === 'c-vet' ? { ...c, nom: LONG } : c)),
  objetsDuVoyage: DONNEES.objetsDuVoyage.map(o => (o.id === 'o-tsh' ? { ...o, nom: LONG, aAcheter: true } : o)),
};

// Tout est emballé, sauf : T-shirts 8 prévus et 9 dans le sac ; Chaussures de marche retirées (0 prévu, 1 dans le sac).
const emballe = avecPieces(o => o.quantite);
const AVEC_EXCEDENT = {
  ...emballe,
  objetsDuVoyage: [
    ...emballe.objetsDuVoyage.map(o => (o.id === 'o-tsh' ? { ...o, dansLeSac: 9 } : o)),
    { ...emballe.objetsDuVoyage[0], id: 'o-chm', nom: 'Chaussures de marche', quantite: 0, dansLeSac: 1 },
  ],
};

const sur = (nom, adresse, donnees, preparer) => ({ nom, adresse, donnees, maintenant: MAINTENANT, preparer });
const voyage = async page => attendreEcran(page, 'voyage');
const courses = async page => attendreEcran(page, 'courses');
const bandeauVenu = page =>
  attendreQue(page, s => document.querySelector(s)?.matches(':popover-open') ?? false, BANDEAU);

// Un manquement jugé dans la page : la grille compte toute erreur de page comme une faute.
const exigerDansLaPage = (page, condition, message) =>
  page.evaluate(([ok, texte]) => ok || console.error(texte), [condition, message]);

const menuOuvert = async page => {
  await voyage(page);
  await page.click('.voyage-titre .menu-voyage-bouton');
  await attendreQue(page, () => document.querySelector('.menu-voyage:popover-open') !== null);
};
const filtre = async page => {
  await voyage(page);
  await page.click('#app [data-action="filtre"]');
  await calme(page);
};
const fiche = id => async page => {
  await voyage(page);
  await ouvrirFiche(page, id);
};
// Review Focus 1 : la fiche défilée jusqu'en bas ; son dernier bouton est dans l'écran, hors de la barre du bas.
const ficheDefilee = async page => {
  await fiche('o-rep')(page);
  const dernier = await page.evaluate(() => {
    const d = document.querySelector('dialog.fiche-voyage[open]');
    for (const el of [d, ...d.querySelectorAll('*')])
      if (el.scrollHeight > el.clientHeight && /auto|scroll/.test(getComputedStyle(el).overflowY))
        el.scrollTop = el.scrollHeight;
    const boutons = [...d.querySelectorAll('button')].filter(b => b.getBoundingClientRect().width > 0);
    const bas = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--zone-bas'));
    return { bas: Math.max(...boutons.map(b => b.getBoundingClientRect().bottom)), limite: innerHeight - bas };
  });
  await exigerDansLaPage(
    page,
    dernier.bas <= dernier.limite + 0.5,
    `fiche défilée : le dernier bouton finit à ${dernier.bas} px, sous la barre du bas (${dernier.limite} px)`,
  );
};
// Review Focus 2 : rien de la fenêtre ouverte ne dépasse son bord (la grille ne mesure que la page entière).
const fenetreEntiere = async page => {
  const coupes = await page.evaluate(() => {
    const d = [...document.querySelectorAll('dialog[open]')].at(-1);
    const bord = d.getBoundingClientRect();
    return [...d.querySelectorAll('*')]
      .filter(el => el.getBoundingClientRect().width > 0 && el.getBoundingClientRect().right > bord.right + 0.5)
      .map(el => `${el.tagName.toLowerCase()} « ${el.textContent.trim().slice(0, 20)} »`);
  });
  await exigerDansLaPage(page, coupes.length === 0, `fenêtre : rien ne doit dépasser son bord : ${coupes.join(', ')}`);
};
const ficheNomsLongs = async page => {
  await fiche('o-tsh')(page);
  await fenetreEntiere(page);
};
const ajoutNouvel = async page => {
  await voyage(page);
  await toucherAjouter(page);
};
const ajoutQuestion = async page => {
  await voyage(page);
  await ajouter(page, { nom: 'Gants', categorie: 'c-vet' });
};
const ajoutListe = async page => {
  await ajoutQuestion(page);
  await oui(page);
};
const ficheAchat = id => async page => {
  await courses(page);
  await page.click(`#app .objet[data-id="${id}"] .objet-corps`);
  await attendreQue(page, s => document.querySelector(`${s}[open]`) !== null, FICHE_ACHAT);
  await calme(page);
  if (id === 'o-tsh') await fenetreEntiere(page);
};
// Retirer Dentifrice (rien dans le sac) du voyage : la fiche se ferme, le bandeau « Annuler » vient.
const retirerDentifrice = async page => {
  await voyage(page);
  await ouvrirFiche(page, 'o-den');
  await toucherFiche(page, 'retirer');
  await attendreQuestion(page);
  await repondre(page, fr.ajustement.retrait.retirer);
  await bandeauVenu(page);
  await calme(page);
};
// Review Focus 3 : le bandeau apparu, une fiche s'ouvre ; il reste entier et touchable.
const bandeauFicheOuverte = async page => {
  await retirerDentifrice(page);
  await ouvrirFiche(page, 'o-rep');
  const b = await page.evaluate(selecteur => {
    const el = document.querySelector(selecteur);
    if (!el?.matches(':popover-open')) return null;
    const r = el.getBoundingClientRect();
    const bouton = el.querySelector('button').getBoundingClientRect();
    const touche = document.elementFromPoint(bouton.left + bouton.width / 2, bouton.top + bouton.height / 2);
    const bas = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--zone-bas'));
    const haut = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--zone-haut'));
    return {
      entier: r.left >= 0 && r.right <= innerWidth && r.top >= haut - 0.5 && r.bottom <= innerHeight - bas + 0.5,
      touchable: el.querySelector('button').contains(touche),
    };
  }, BANDEAU);
  await exigerDansLaPage(
    page,
    Boolean(b?.entier && b.touchable),
    `bandeau « Annuler » sous une fiche : ${JSON.stringify(b)}`,
  );
};

export const ETATS = [
  sur('voyage', VOYAGE, DONNEES, voyage),
  sur('voyage-menu', VOYAGE, DONNEES, menuOuvert),
  sur('voyage-reste-a-emballer', VOYAGE, DONNEES, filtre),
  sur('fiche-objet', VOYAGE, DONNEES, fiche('o-rep')),
  sur('fiche-objet-defilee', VOYAGE, DONNEES, ficheDefilee),
  sur('ajout-nouvel-objet', VOYAGE, DONNEES, ajoutNouvel),
  sur('ajout-bibliotheque-question', VOYAGE, ESSAI, ajoutQuestion),
  sur('ajout-bibliotheque-liste', VOYAGE, ESSAI, ajoutListe),
  sur('a-sortir', VOYAGE, AVEC_EXCEDENT, voyage),
  sur('a-sortir-fiche', VOYAGE, AVEC_EXCEDENT, fiche('o-tsh')),
  sur('courses', COURSES, avecMarques(), courses),
  sur('courses-fiche-achat', COURSES, avecMarques(), ficheAchat('o-rep')),
  sur('bandeau-annuler', VOYAGE, DONNEES, retirerDentifrice),
  sur('bandeau-fiche-ouverte', VOYAGE, DONNEES, bandeauFicheOuverte),
  sur('noms-longs', VOYAGE, NOMS_LONGS, voyage),
  sur('noms-longs-fiche', VOYAGE, NOMS_LONGS, ficheNomsLongs),
  sur('noms-longs-courses', COURSES, NOMS_LONGS, courses),
  sur('noms-longs-fiche-achat', COURSES, NOMS_LONGS, ficheAchat('o-tsh')),
];

// Review Focus 5 : une fenêtre Debian de 1000 × 560, à la souris ; le voyage sans défilement de côté et
// avec des cibles de 44 px (verifierCommandes, seule règle jugée ici).
async function fenetreBasse() {
  const juge = creerJuge();
  const serveur = await demarrerServeur();
  const navigateur = await chromium.launch();
  try {
    const { contexte, page } = await ouvrir(navigateur, serveur.url, {
      taille: { width: 1000, height: 560 },
      theme: 'light',
      donnees: DONNEES,
      maintenant: MAINTENANT,
      adresse: VOYAGE,
      tactile: false,
    });
    await attendreEcran(page, 'voyage');
    await verifierCommandes(page, juge, 'voyage · 1000 × 560');
    await contexte.close();
  } finally {
    await navigateur.close();
    await serveur.fermer();
  }
  juge.conclure('fenêtre basse', 'le voyage à 1000 × 560 : cibles de 44 px, rien ne défile de côté');
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  await parcourirGrille({ titre: 'voyage', etats: ETATS, formats: FORMATS_BLOQUANTS });
  await fenetreBasse();
}
