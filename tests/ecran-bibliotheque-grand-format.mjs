// La Bibliothèque sur tablette et ordinateur (maquette validée le 2026-10-27,
// docs/maquettes/grand-ecran/bibliotheque.js ; règles dans
// docs/superpowers/specs/2026-10-27-grand-ecran-design.md), la même disposition que l'écran d'un voyage :
// - ordinateur et portable : trois colonnes (Bibliothèque 320 px | catégories 360 px | objets), centrées ;
//   le titre de la liste n'est que lu ; chaque carte porte son crayon, avant la flèche, qui ouvre la
//   fiche de sa catégorie ; « Nouvelle catégorie » en bouton sous les cartes ; un long menu défile sans
//   bouger la liste ;
// - tablettes, portrait compris : le repli, tuiles (4 par rangée en 1280 px, 2 en 800 px) avec
//   « Nouvelle catégorie » en dernière tuile, puis la liste et son titre visible, avec « Modifier », qui
//   ouvre la fiche de la catégorie choisie ; avec 11 catégories, la liste commence à l'écran ; à
//   600 × 600, toucher une tuile fait monter la liste jusqu'à 16 px du haut ;
// - aucun bouton flottant ; la catégorie neuve enregistrée devient la choisie ; « Ranger les
//   catégories » remplace le menu par la liste ▲ ▼, « Terminé » le rend ;
// - la catégorie choisie supprimée : la première restante l'est à sa place (Review Focus 2) ; un nom
//   long et piégé reste du texte et ne déborde pas (Review Focus 3) ; le changement de disposition est
//   essayé dans ecran-bibliotheque-grand-format-disposition.mjs ;
// - le « + » de « Nouvelle catégorie » à 3:1 au moins de son fond, en clair comme en sombre.
// 4 formats × 2 thèmes : cibles de 44 px, rien sous 13 px, pas de défilement de côté, rien sous les
// barres système, captures bibliotheque-grand-format-….
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { chromium } from 'playwright';
import { construireBibliotheque } from '../src/modele/bibliotheque.js';
import { supprimerCategorie } from './outils/annulation.mjs';
import { calme } from './outils/attente.mjs';
import { demarrerServeur } from './outils/serveur.mjs';
import { DEPART, DONNEES, fermerEssai, fr, lire, ouvrirBibliotheque, remplir, vu } from './outils/bibliotheque.mjs';
import {
  FICHE,
  attendreFermee,
  attendreOuverte,
  eclaire,
  enregistrer,
  lireFiche,
  montrerCategorie,
  saisir,
} from './outils/fiches.mjs';
import { CAPTURES, NOMS_THEME, contraste, creerJuge, verifierBarres, verifierCommandes } from './outils/page.mjs';
import {
  GRANDS,
  PIEGE,
  SIX,
  focusActuel,
  lire as lireDisposition,
  petitsTextes,
  toucher,
} from './outils/voyage-grand-format.mjs';

const b = fr.bibliotheque;
const juge = creerJuge();
const serveur = await demarrerServeur();
const navigateur = await chromium.launch();
const REPLI = new Set(['tablette-paysage', 'tablette-portrait']);
const PAR_RANGEE = { 'tablette-paysage': 4, 'tablette-portrait': 2 };

// La bibliothèque de départ et des catégories ajoutées après elle : toujours incluses, leurs objets
// « 1 en tout ». [clé, nom, picto, couleur, [[nom…]]], comme les catégories des voyages d'essai.
let numero = 0;
const base = construireBibliotheque(fr.bibliothequeDeDepart, { nouvelId: () => `id-${++numero}`, maintenant: 'x' });
function avec(categories) {
  const ajoutees = categories.map(([cle, nom, icone, couleur], rang) => ({
    id: `c-${cle}`,
    nom,
    icone,
    couleur,
    ordre: base.categories.length + rang,
    toujoursIncluse: true,
    modifieLe: 'x',
    etiquettes: [],
  }));
  const objets = categories.flatMap(([cle, , , , lignes]) =>
    lignes.map(([nom], rang) => ({
      id: `o-${cle}-${rang}`,
      categorieId: `c-${cle}`,
      nom,
      regle: 'fixe',
      valeur: 1,
      plafond: null,
      parPersonne: false,
      consommable: false,
      toujoursInclus: true,
      note: '',
      modifieLe: 'x',
      etiquettes: [],
    })),
  );
  return {
    ...DONNEES,
    meta: { bibliothequeInstallee: true, langueBibliotheque: 'fr' },
    bibliotheque: { ...base, categories: [...base.categories, ...ajoutees], objets: [...base.objets, ...objets] },
  };
}
const ONZE = avec(SIX);
// Pharmacie allongée : sa liste est assez haute pour monter jusqu'en haut de l'écran.
const SOINS = ['Bandes', 'Compresses', 'Désinfectant', 'Sérum', 'Thermomètre', 'Arnica'].map(nom => [nom]);
const ONZE_LONGUE = avec(
  SIX.map(([cle, ...reste]) =>
    cle === 'pha' ? [cle, ...reste.slice(0, 3), [...reste[3], ...SOINS]] : [cle, ...reste],
  ),
);
const AVEC_PIEGE = avec([['pie', PIEGE, 'tent', 'abricot', [['Piquets']]]]);

// Une commande attendue qui ne vient pas fait buter l'essai vite, sans attendre 30 s.
async function ouvrirSur(format, options = {}) {
  const ouvert = await ouvrirBibliotheque(navigateur, serveur.url, format, { appareil: GRANDS[format], ...options });
  ouvert.page.setDefaultTimeout(5000);
  return ouvert;
}
const fermer = (cas, ouvert) => fermerEssai(juge, cas, ouvert);
// Une catégorie choisie dans le menu ; une commande absente est une faute dite, pas un arrêt du test.
const montrer = (page, nom, cas) =>
  montrerCategorie(page, nom).catch(e =>
    juge.exige(false, `${cas} : ${nom} introuvable (${e.message.split('\n')[0]})`),
  );
// Une entrée du menu (carte ou tuile) par le nom de sa catégorie.
const entree = nom => `#app .gf-menu [data-action="choisir"]:has(b:text-is(${JSON.stringify(nom)}))`;

// Les cartes en trois colonnes : le crayon de chacune est dans la carte, avant sa flèche ; « Nouvelle
// catégorie » vient sous la dernière carte.
const lireCartes = page =>
  page.evaluate(() => {
    const cartes = [...document.querySelectorAll('.gf-menu li:has(> .choix)')].map(li => {
      const carte = li.querySelector('.choix').getBoundingClientRect();
      const crayon = li.querySelector('[data-action="modifier-categorie"]')?.getBoundingClientRect();
      // La flèche dessinée : sa boîte de 44 px touche celle du crayon, comme dans la maquette.
      const fleche = li.querySelector('.chevron svg').getBoundingClientRect();
      return Boolean(
        crayon &&
        crayon.left >= carte.left &&
        crayon.right <= fleche.left &&
        crayon.top >= carte.top &&
        crayon.bottom <= carte.bottom,
      );
    });
    const derniere = document.querySelector('.gf-menu li:last-child > .choix')?.getBoundingClientRect();
    const nouvelle = document.querySelector('.gf-menu > .bouton-large[data-action="nouvelle-categorie"]');
    return {
      crayonsDansLaCarte: cartes,
      nouvelleDessous: Boolean(derniere && nouvelle && nouvelle.getBoundingClientRect().top >= derniere.bottom),
    };
  });

// La dernière tuile du repli : « Nouvelle catégorie ».
const derniereTuile = page =>
  page.evaluate(() => {
    const tuile = document.querySelector('.gf-tuiles > li:last-child > button');
    return tuile && { classes: tuile.className, action: tuile.dataset.action, texte: tuile.textContent.trim() };
  });

// Ce que tout écran doit tenir, puis sa capture.
async function verifierEtCapturer(ouvert, cas, nom) {
  const { page } = ouvert;
  await page.mouse.move(0, 0);
  await verifierCommandes(page, juge, cas);
  const petits = await petitsTextes(page);
  juge.exige(petits.length === 0, `${cas} : textes sous 13 px : ${petits.join(', ')}`);
  await calme(page);
  await page.screenshot({ path: join(CAPTURES, nom) });
  await verifierBarres(page, juge, cas);
}

// Le « + » de « Nouvelle catégorie » (tuile ou bouton) et le premier fond derrière lui, en remontant.
const couleursDuPlus = page =>
  page.evaluate(() => {
    const svg = document.querySelector('#app .gf-menu [data-action="nouvelle-categorie"] svg');
    let fond = svg?.parentElement;
    while (fond && getComputedStyle(fond).backgroundColor === 'rgba(0, 0, 0, 0)') fond = fond.parentElement;
    return svg && fond && { picto: getComputedStyle(svg).color, fond: getComputedStyle(fond).backgroundColor };
  });

// Chaque format, chaque thème : la disposition, le menu, la liste de Vêtements, le « + » de « Nouvelle
// catégorie » à 3:1 au moins de son fond (un picto, WCAG 1.4.11), captures.
async function essaiFormat(format, theme) {
  const cas = `${format}, ${NOMS_THEME[theme]}`;
  const ouvert = await ouvrirSur(format, { theme });
  const { page } = ouvert;
  const d = await lireDisposition(page);
  const v = await lire(page);
  juge.exige(
    d.classe === 'grand-format' &&
      v.cartes.length === 0 &&
      vu(v.choix) === vu(DEPART) &&
      v.choisie === 'Vêtements' &&
      v.detail === 'Vêtements' &&
      v.detailObjets.length === 7 &&
      v.detailDerniere?.action === 'nouvel-objet' &&
      !v.flottant,
    `${cas} : ${vu({ classe: d.classe, ...v })}`,
  );
  if (REPLI.has(format)) {
    juge.exige(
      d.colonnes === 'repli' &&
        d.sorte === 'tuiles' &&
        d.parRangee === PAR_RANGEE[format] &&
        d.titreVisible &&
        d.titreTaille === '24px' &&
        v.crayons.length === 0 &&
        v.modifierListe === b.modifier,
      `${cas} : repli ${vu({ ...d, crayons: v.crayons, modifierListe: v.modifierListe })}`,
    );
    const nouvelle = await derniereTuile(page);
    juge.exige(
      nouvelle?.classes === 'gf-tuile gf-tuile-nouvelle' &&
        nouvelle.action === 'nouvelle-categorie' &&
        nouvelle.texte === b.nouvelleCategorie,
      `${cas} : dernière tuile ${vu(nouvelle)}`,
    );
  } else {
    const cartes = await lireCartes(page);
    juge.exige(
      d.colonnes === '3' &&
        d.sorte === 'cartes' &&
        d.pistes.startsWith('320px 360px ') &&
        !d.titreVisible &&
        Math.abs(d.marges[0] - d.marges[1]) <= 1 &&
        vu(v.crayons) === vu(DEPART.map(nom => remplir(b.modifierCategorie, { nom }))) &&
        cartes.crayonsDansLaCarte.length === 5 &&
        cartes.crayonsDansLaCarte.every(Boolean) &&
        cartes.nouvelleDessous &&
        v.modifierListe === null,
      `${cas} : trois colonnes ${vu({ ...d, ...cartes, crayons: v.crayons, modifierListe: v.modifierListe })}`,
    );
  }
  if (format === 'ordinateur') juge.exige(d.pistes === '320px 360px 800px', `${cas} : colonnes ${d.pistes}`);
  await verifierEtCapturer(ouvert, cas, `bibliotheque-grand-format-${format}-${NOMS_THEME[theme]}.png`);
  const plus = await couleursDuPlus(page);
  juge.exige(
    plus && contraste(plus.picto, plus.fond) >= 3,
    `${cas} : « + » de Nouvelle catégorie ${vu(plus)}, contraste ${plus && contraste(plus.picto, plus.fond).toFixed(2)}`,
  );
  await fermer(cas, ouvert);
}

// Onze catégories. Portable : le menu défile seul, la liste ne bouge pas (témoin : il a défilé).
// Tablettes : la liste commence à l'écran, sans défiler.
async function essaiOnze() {
  const portable = await ouvrirSur('portable', { donnees: ONZE });
  const avant = await lireDisposition(portable.page);
  const defile = await portable.page.evaluate(() => {
    const menu = document.querySelector('.gf-menu');
    if (menu) menu.scrollTop = menu.scrollHeight;
    return menu?.scrollTop ?? 0;
  });
  const apres = await lireDisposition(portable.page);
  juge.exige(
    (await lire(portable.page)).choix.length === 11 && defile > 0 && apres.hautListe === avant.hautListe,
    `portable, 11 catégories : menu défilé de ${defile} px, liste de ${avant.hautListe} à ${apres.hautListe}`,
  );
  await portable.page.screenshot({
    path: join(CAPTURES, 'bibliotheque-grand-format-portable-11-categories-menu-defile.png'),
  });
  await fermer('portable, 11 catégories', portable);

  for (const format of REPLI) {
    const cas = `${format}, 11 catégories`;
    const ouvert = await ouvrirSur(format, { donnees: ONZE });
    const d = await lireDisposition(ouvert.page);
    juge.exige(
      (await lire(ouvert.page)).choix.length === 11 && d.defilement === 0 && d.hautListe < d.hauteur - 100,
      `${cas} : liste à ${d.hautListe} px sur ${d.hauteur}`,
    );
    await verifierEtCapturer(ouvert, cas, `bibliotheque-grand-format-${format}-11-categories.png`);
    await fermer(cas, ouvert);
  }

  // 600 × 600, une colonne : la liste commence dans la moitié basse ; toucher Pharmacie la fait monter à
  // 16 px du haut (immédiatement : l'appareil demande moins d'animations), le focus reste à la tuile.
  const cas = '600 × 600';
  const ouvert = await ouvrirSur('tablette-portrait', { donnees: ONZE_LONGUE, taille: { width: 600, height: 600 } });
  const { page } = ouvert;
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const avantToucher = await lireDisposition(page);
  await toucher(juge, page, entree('Pharmacie'), { doigt: true });
  await calme(page);
  const apresToucher = await lireDisposition(page);
  const focus = await focusActuel(page);
  juge.exige(
    avantToucher.hautListe > avantToucher.hauteur / 2 &&
      Math.abs(apresToucher.hautListe - 16) <= 1 &&
      apresToucher.titre === 'Pharmacie' &&
      focus === 'choisir:c-pha',
    `${cas} : liste de ${avantToucher.hautListe} à ${apresToucher.hautListe} px, « ${apresToucher.titre} », focus ${focus}`,
  );
  await fermer(cas, ouvert);
}

// Les fiches : le crayon de Camping (cartes) ou « Modifier » de Camping choisie (tuiles), puis
// « Nouvelle catégorie », enregistrée : elle devient la choisie, éclairée.
async function essaiFiches(format) {
  const cas = `fiches (${format})`;
  const ouvert = await ouvrirSur(format);
  const { page } = ouvert;
  const doigt = REPLI.has(format);
  if (doigt) {
    await toucher(juge, page, entree('Camping'), { doigt });
    await calme(page);
    await toucher(juge, page, '#app .gf-liste-tete [data-action="modifier-categorie"]', { doigt });
  } else await toucher(juge, page, '#app .gf-menu li:has(b:text-is("Camping")) [data-action="modifier-categorie"]');
  juge.exige(await attendreOuverte(page), `${cas} : la fiche de Camping ne s'ouvre pas`);
  const camping = await lireFiche(page);
  juge.exige(camping?.titre === 'Camping', `${cas} : fiche ${vu(camping?.titre)}`);
  await toucher(juge, page, `${FICHE} .bouton-fermer`);
  await attendreFermee(page);

  await toucher(juge, page, '#app [data-action="nouvelle-categorie"]', { doigt });
  juge.exige(await attendreOuverte(page), `${cas} : la fiche neuve ne s'ouvre pas`);
  const neuve = await lireFiche(page);
  juge.exige(neuve?.titre === fr.modele.categorie.nouvelle, `${cas} : fiche neuve ${vu(neuve?.titre)}`);
  await saisir(page, '#f-nom', 'Courses');
  await enregistrer(page);
  juge.exige(await attendreFermee(page), `${cas} : la fiche neuve reste ouverte`);
  const v = await lire(page);
  juge.exige(
    v.choix.at(-1) === 'Courses' &&
      v.choisie === 'Courses' &&
      v.detail === 'Courses' &&
      v.detailObjets.length === 0 &&
      v.detailDerniere?.action === 'nouvel-objet' &&
      (await eclaire(page)) === 'Courses',
    `${cas} : Courses enregistrée ${vu({ ...v, eclaire: await eclaire(page) })}`,
  );
  await fermer(cas, ouvert);
}

// « Ranger les catégories » prend la place du menu ; « Terminé » le rend. Puis Camping choisie et
// supprimée : la première restante, Vêtements, l'est à sa place (Review Focus 2).
async function essaiRangerEtSupprimer(format) {
  const cas = `ranger et supprimer (${format})`;
  const ouvert = await ouvrirSur(format);
  const { page } = ouvert;
  const doigt = REPLI.has(format);
  await toucher(juge, page, '#app [data-action="ranger"]', { doigt });
  await calme(page);
  const rangement = await lire(page);
  const dansLeMenu = await page.evaluate(() => document.querySelectorAll('.gf-menu .rangement-liste > li').length);
  juge.exige(
    rangement.choix.length === 0 &&
      dansLeMenu === 5 &&
      vu(rangement.rangement.map(l => l.nom)) === vu(DEPART) &&
      rangement.detail === 'Vêtements',
    `${cas} : rangement ${vu({ ...rangement, dansLeMenu })}`,
  );
  await page.screenshot({ path: join(CAPTURES, `bibliotheque-grand-format-${format}-ranger.png`) });
  await toucher(juge, page, '#app [data-action="terminer"]', { doigt });
  await calme(page);
  const termine = await lire(page);
  juge.exige(
    vu(termine.choix) === vu(DEPART) && termine.rangement.length === 0 && termine.focus.action === 'ranger',
    `${cas} : Terminé ${vu(termine)}`,
  );

  await montrer(page, 'Camping', cas);
  const avant = await lire(page);
  await supprimerCategorie(page, 'Camping').catch(e => juge.exige(false, `${cas} : suppression ${e.message}`));
  const apres = await lire(page);
  const focus = await focusActuel(page);
  juge.exige(
    avant.choisie === 'Camping' &&
      vu(apres.choix) === vu(DEPART.slice(0, 4)) &&
      apres.choisie === 'Vêtements' &&
      apres.detail === 'Vêtements' &&
      apres.detailObjets.length === 7 &&
      focus !== 'body' &&
      !focus.endsWith('(invisible)'),
    `${cas} : Camping supprimée ${vu({ avant: avant.choisie, ...apres, focus })}`,
  );
  await fermer(cas, ouvert);
}

// Un nom long et piégé, en tuiles et en cartes : rien d'interprété, rien qui déborde (Review Focus 3).
async function essaiNomPiege(format) {
  const cas = `${format}, nom piégé`;
  const ouvert = await ouvrirSur(format, { donnees: AVEC_PIEGE });
  const { page } = ouvert;
  await montrer(page, PIEGE, cas);
  const m = await page.evaluate(() => {
    const entree = document.querySelector('.gf-menu [data-id="c-pie"]');
    const nom = entree?.querySelector('b');
    const titre = document.querySelector('#liste-titre');
    const r = entree?.getBoundingClientRect();
    const colonne = document.querySelector('.gf-menu')?.getBoundingClientRect();
    return {
      nom: nom?.textContent,
      titre: titre?.textContent,
      balises: (nom?.children.length ?? 1) + (titre?.children.length ?? 1),
      deborde: !entree || entree.scrollWidth > entree.clientWidth || r.right > colonne.right + 0.5,
      defileDeCote: document.documentElement.scrollWidth > innerWidth,
    };
  });
  juge.exige(
    m.nom === PIEGE && m.titre === PIEGE && m.balises === 0 && !m.deborde && !m.defileDeCote,
    `${cas} : ${vu(m)}`,
  );
  await fermer(cas, ouvert);
}

try {
  await mkdir(CAPTURES, { recursive: true });
  for (const theme of ['light', 'dark']) for (const format of Object.keys(GRANDS)) await essaiFormat(format, theme);
  await essaiOnze();
  for (const format of ['ordinateur', 'tablette-paysage']) {
    await essaiFiches(format);
    await essaiRangerEtSupprimer(format);
  }
  for (const format of ['ordinateur', 'tablette-paysage', 'tablette-portrait']) await essaiNomPiege(format);
} finally {
  await navigateur.close();
  await serveur.fermer();
}
juge.conclure(
  'Bibliothèque sur tablette et ordinateur',
  '4 formats × 2 thèmes, trois colonnes et repli, 11 catégories, fiches, nouvelle catégorie, rangement, suppression, nom piégé',
);
