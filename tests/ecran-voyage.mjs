// Phases 2 et 3 (docs/PLAN.md) : la liste d'un voyage, en une colonne (US-15, US-16, US-28).
// - en-tête : nom (caractères spéciaux affichés tels quels), destination, période, voyageurs, retour
//   vers Mes voyages ;
// - progression : objets complets sur objets du voyage ; filtre « Reste à emballer » éteint ;
// - catégories dans l'ordre de la bibliothèque, chacune avec son pavé coloré, son picto et son compte ;
//   objets par nom, les complets en bas ; chaque case dans son état (vide, entamée, pleine) ; « 6 / 16 »
//   sur une ligne entamée ; ⓘ seulement sur l'objet qui a une note ; « partagé » seulement sous l'objet
//   partagé, et seulement à plusieurs voyageurs ; la case et la ligne nommées pour un lecteur d'écran
//   (état, geste, tout ce que montre la ligne) ; rien d'un autre voyage ;
// - une catégorie bouclée est repliée et porte son tampon « Bouclé ! » ;
// - un voyage sans objet affiche la mascotte, un titre et un texte, sans progression ni filtre ;
// - un voyage inconnu, ou une adresse de voyage mal formée, affiche un titre, un message en toutes
//   lettres et un retour vers Mes voyages ;
// - une panne de lecture affiche l'écran d'erreur ; hors de l'accueil, il offre le retour vers Mes
//   voyages, qui fonctionne ; témoin : sur l'accueil, il n'en offre pas (il mènerait au même écran).
// - sur les tablettes (portrait compris) et l'ordinateur, le grand format : les mêmes catégories dans
//   le menu, en tuiles ou en cartes (nom, pavé, compte ou tampon), et la liste des objets de Vêtements,
//   première non bouclée ; voyage sans objet en une colonne (le reste du grand format :
//   tests/ecran-voyage-grand-format*.mjs).
// Téléphone, tablettes, portable et ordinateur × 2 thèmes : cibles de 44 px, pas de défilement de
// côté (nom très long compris), rien sous les barres système.
import { mkdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { chromium } from 'playwright';
import { demarrerServeur } from './outils/serveur.mjs';
import {
  CAPTURES,
  FORMATS,
  NOMS_THEME,
  RACINE,
  attendreEcran,
  creerJuge,
  ouvrir,
  verifierBarres,
  verifierCommandes,
} from './outils/page.mjs';
import { DONNEES, ETIQUETTES, NOM } from './outils/voyage-essai.mjs';

const fr = JSON.parse(await readFile(join(RACINE, 'src/i18n/fr.json'), 'utf8'));
const remplir = (texte, valeurs) => texte.replace(/\{(\w+)\}/g, (_, nom) => String(valeurs[nom]));
// Le grand format : tout sauf le téléphone (un côté sous 600 px).
const grandFormat = format => format !== 'telephone';

// [nom, couleur du pavé, compte ou tampon, ouverte, [nom, quantité, état de la case, note, partagé]].
const ATTENDU = [
  ['Papiers', 'rgb(255, 201, 60)', fr.voyage.boucle, false, []],
  [
    'Vêtements',
    'rgb(90, 169, 255)',
    '1 / 6',
    true,
    [
      ['Pantalons', '3 / 4', 'entame', false, false],
      ['Pull', '1 / 2', 'entame', false, false],
      ['Pyjama', '1 / 2', 'entame', false, false],
      ['Sous-vêtements', '8', 'vide', false, false],
      ['T-shirts', '8', 'vide', false, false],
      ['Chaussettes', '8', 'plein', false, false],
    ],
  ],
  [
    'Toilette',
    'rgb(43, 191, 176)',
    '2 / 3',
    true,
    [
      ['Dentifrice', '1', 'vide', false, false],
      ['Brosse à dents', '2', 'plein', false, false],
      ['Gel douche', '1', 'plein', false, false],
    ],
  ],
  [
    'Alimentation',
    'rgb(140, 203, 78)',
    '1 / 3',
    true,
    [
      ['Café soluble', '1', 'vide', false, true],
      ['Repas', '6 / 16', 'entame', true, false],
      ['Gourde', '2', 'plein', false, false],
    ],
  ],
];

// Le nom de la case dit l'état et ce que fera l'appui ; celui de la ligne, tout ce qu'elle montre.
const fiche = (nom, quantite) => remplir(fr.voyage.ouvrirFiche, { nom, quantite });
const LIBELLES = {
  'o-rep': [
    remplir(fr.voyage.case.ajouter, { nom: 'Repas', n: 6, total: 16 }),
    fiche('Repas', `6 / 16, ${fr.voyage.avecNote}`),
  ],
  'o-den': [remplir(fr.voyage.case.cocher, { nom: 'Dentifrice' }), fiche('Dentifrice', '1')],
  'o-gou': [remplir(fr.voyage.case.vider, { nom: 'Gourde' }), fiche('Gourde', '2')],
  'o-gel': [remplir(fr.voyage.case.decocher, { nom: 'Gel douche' }), fiche('Gel douche', '1')],
  'o-caf': [remplir(fr.voyage.case.cocher, { nom: 'Café soluble' }), fiche(`Café soluble, ${fr.voyage.partage}`, '1')],
};

const lire = page =>
  page.evaluate(
    partage => ({
      titre: document.querySelector('h1')?.textContent,
      entete: document.querySelector('.voyage-entete')?.textContent ?? '',
      retour: document.querySelector('.lien-retour')?.getAttribute('href'),
      progression: [...document.querySelectorAll('.progression-ligne > *')].map(e => e.textContent.trim()).join(' '),
      boucle: document.querySelector('.progression')?.hasAttribute('data-boucle'),
      filtre: document.querySelector('[data-action="filtre"]')?.getAttribute('aria-pressed'),
      masques: Boolean(document.querySelector('.masques')),
      // Grand format : chaque catégorie du menu (carte ou tuile), puis les objets de la choisie.
      choix: [...document.querySelectorAll('.gf-menu :is(.choix, .gf-tuile)')].map(c => [
        c.querySelector('b')?.textContent,
        getComputedStyle(c.querySelector('.pave')).backgroundColor,
        c.querySelector('.tampon, .gf-tuile-boucle, .compte, .gf-tuile-compte')?.textContent.trim(),
      ]),
      detail: [...document.querySelectorAll('.gf-liste .objet')].map(o => [
        o.querySelector('.objet-nom').textContent,
        o.querySelector('.objet-quantite').textContent,
        o.dataset.etat,
        Boolean(o.querySelector('.objet-note svg')),
        Boolean(o.querySelector('.objet-sous')?.textContent.includes(partage)),
      ]),
      categories: [...document.querySelectorAll('.categorie')].map(c => [
        c.querySelector('.categorie-nom b')?.textContent,
        getComputedStyle(c.querySelector('.pave')).backgroundColor,
        (c.querySelector('.tampon') ?? c.querySelector('.compte'))?.textContent.trim(),
        c.querySelector('.categorie-tete')?.getAttribute('aria-expanded') === 'true',
        [...c.querySelectorAll('.objet')].map(o => [
          o.querySelector('.objet-nom').textContent,
          o.querySelector('.objet-quantite').textContent,
          o.dataset.etat,
          Boolean(o.querySelector('.objet-note svg')),
          Boolean(o.querySelector('.objet-sous')?.textContent.includes(partage)),
        ]),
      ]),
      // Chaque ligne a sa case et son bouton de fiche, tous deux nommés pour un lecteur d'écran.
      libelles: Object.fromEntries(
        [...document.querySelectorAll('.objet')].map(o => [
          o.dataset.id,
          [
            o.querySelector('.case')?.getAttribute('aria-label'),
            o.querySelector('.objet-corps')?.getAttribute('aria-label'),
          ],
        ]),
      ),
      // Les puces d'étiquette : leur liste nommée, leur texte, leur picto, et rien d'interactif dedans.
      puces: {
        liste: document.querySelector('ul.etiquettes-voyage')?.getAttribute('aria-label') ?? null,
        noms: [...document.querySelectorAll('.etiquettes-voyage li')].map(li => li.textContent.trim()),
        pictos: [...document.querySelectorAll('.etiquettes-voyage li')].every(li => li.querySelector('svg')),
        interactifs: document.querySelectorAll('.etiquettes-voyage :is(a, button, input, [tabindex])').length,
        balisesInjectees: document.querySelectorAll('.etiquettes-voyage b').length,
        sousLesDates:
          document
            .querySelector('.voyage-details')
            ?.compareDocumentPosition(document.querySelector('.etiquettes-voyage')) ===
          Node.DOCUMENT_POSITION_FOLLOWING,
        taille: getComputedStyle(document.querySelector('.etiquettes-voyage li')).fontSize,
      },
      picto: [...document.querySelectorAll('.pave')].every(p => p.querySelector('svg')),
    }),
    fr.voyage.partage,
  );

// Ce que montre un écran sans liste : son repère, son titre, son message et son lien de retour.
const lireIssue = page =>
  page.evaluate(() => ({
    ecran: document.querySelector('#app').dataset.ecran,
    titre: document.querySelector('main.ecran > h1')?.textContent.trim(),
    message: document.querySelector('.message')?.textContent.trim(),
    retour: document.querySelector('.lien-retour')?.getAttribute('href'),
  }));

const juge = creerJuge();
const serveur = await demarrerServeur();
const navigateur = await chromium.launch();
try {
  await mkdir(CAPTURES, { recursive: true });
  for (const theme of ['light', 'dark']) {
    for (const [format, taille] of Object.entries(FORMATS)) {
      const cas = `${format}, ${NOMS_THEME[theme]}`;
      const { contexte, page, sorties, erreurs } = await ouvrir(navigateur, serveur.url, {
        taille,
        theme,
        donnees: DONNEES,
        adresse: '#/voyage/v1',
      });
      const m = await lire(page);
      juge.exige(m.titre === NOM, `${cas} : titre « ${m.titre} »`);
      juge.exige(
        m.entete.includes('Autrans') && m.entete.includes(fr.voyages.voyageurs.other.replace('{n}', 2)),
        `${cas} : en-tête « ${m.entete} »`,
      );
      juge.exige(m.retour === '#/voyages', `${cas} : retour ${m.retour}`);
      juge.exige(
        m.puces.liste === fr.voyage.etiquettes &&
          JSON.stringify(m.puces.noms) === JSON.stringify(ETIQUETTES) &&
          m.puces.pictos &&
          m.puces.interactifs === 0 &&
          m.puces.balisesInjectees === 0 &&
          m.puces.sousLesDates &&
          m.puces.taille === '13px',
        `${cas} : étiquettes ${JSON.stringify(m.puces)}`,
      );
      juge.exige(
        m.progression === `${fr.voyage.dansLeSac} ${remplir(fr.voyage.compte, { faits: 6, total: 14 })}` && !m.boucle,
        `${cas} : progression « ${m.progression} »${m.boucle ? ', bouclée' : ''}`,
      );
      juge.exige(m.filtre === 'false' && !m.masques, `${cas} : filtre ${m.filtre}, masqués ${m.masques}`);
      if (grandFormat(format)) {
        const choix = ATTENDU.map(([nom, couleur, compte]) => [nom, couleur, compte]);
        juge.exige(
          m.categories.length === 0 && JSON.stringify(m.choix) === JSON.stringify(choix),
          `${cas} : choix ${JSON.stringify(m.choix)}, ${m.categories.length} cartes`,
        );
        juge.exige(
          JSON.stringify(m.detail) === JSON.stringify(ATTENDU[1][4]),
          `${cas} : détail ${JSON.stringify(m.detail)}`,
        );
      } else
        juge.exige(
          JSON.stringify(m.categories) === JSON.stringify(ATTENDU),
          `${cas} : liste ${JSON.stringify(m.categories)}`,
        );
      // Les lignes de Toilette et d'Alimentation : en grand format, seule Vêtements a sa liste.
      for (const [id, attendus] of grandFormat(format) ? [] : Object.entries(LIBELLES))
        juge.exige(
          JSON.stringify(m.libelles[id]) === JSON.stringify(attendus),
          `${cas} : noms de la ligne ${id} ${JSON.stringify(m.libelles[id])}`,
        );
      juge.exige(
        Object.values(m.libelles).every(([laCase, laFiche]) => laCase && laFiche),
        `${cas} : une case ou un bouton de fiche sans nom`,
      );
      juge.exige(m.picto, `${cas} : un pavé sans picto`);
      await verifierCommandes(page, juge, cas);
      await page.screenshot({
        path: join(CAPTURES, `voyage-liste-${format}-${NOMS_THEME[theme]}.png`),
        fullPage: true,
      });
      await verifierBarres(page, juge, cas);
      juge.exige(sorties.length === 0, `${cas} : requêtes hors de l’appli : ${sorties.join(', ')}`);
      juge.exige(erreurs.length === 0, `${cas} : erreurs dans la page : ${erreurs.join(' | ')}`);
      await contexte.close();

      // Voyage sans objet : mascotte, titre et texte, ni progression ni filtre.
      const vide = await ouvrir(navigateur, serveur.url, { taille, theme, donnees: DONNEES, adresse: '#/voyage/v4' });
      const vu = await vide.page.evaluate(() => ({
        image: Boolean(document.querySelector('.vide-voyage img')),
        titre: document.querySelector('.vide-voyage h2')?.textContent.trim(),
        texte: document.querySelector('.vide-voyage p')?.textContent.trim(),
        autres: document.querySelectorAll('.progression, .outils, .categorie').length,
      }));
      juge.exige(
        vu.image && vu.titre === fr.voyage.vide.titre && vu.texte === fr.voyage.vide.texte && vu.autres === 0,
        `${cas} : voyage sans objet ${JSON.stringify(vu)}`,
      );
      await verifierCommandes(vide.page, juge, `${cas}, voyage sans objet`);
      await vide.page.screenshot({ path: join(CAPTURES, `voyage-vide-${format}-${NOMS_THEME[theme]}.png`) });
      await verifierBarres(vide.page, juge, `${cas}, voyage sans objet`);
      await vide.contexte.close();

      // Un voyage sans étiquette n'affiche pas de liste vide.
      const sans = await ouvrir(navigateur, serveur.url, { taille, theme, donnees: DONNEES, adresse: '#/voyage/v2' });
      const nombre = await sans.page.evaluate(() => document.querySelectorAll('.etiquettes-voyage').length);
      juge.exige(nombre === 0, `${cas} : voyage sans étiquette, ${nombre} liste(s)`);
      await sans.contexte.close();
    }
  }

  // Nom très long sans espace : rien ne défile de côté au téléphone.
  const long = await ouvrir(navigateur, serveur.url, {
    taille: FORMATS.telephone,
    theme: 'light',
    donnees: DONNEES,
    adresse: '#/voyage/v3',
  });
  await verifierCommandes(long.page, juge, 'nom très long');
  await long.contexte.close();

  // Seul en voyage : « partagé » ne veut rien dire, ni sous Café soluble ni dans le nom de sa ligne
  // (le témoin à deux voyageurs, plus haut, le montre).
  const seul = await ouvrir(navigateur, serveur.url, {
    taille: FORMATS.telephone,
    theme: 'light',
    donnees: { ...DONNEES, voyages: DONNEES.voyages.map(v => (v.id === 'v1' ? { ...v, voyageurs: 1 } : v)) },
    adresse: '#/voyage/v1',
  });
  const vuSeul = await lire(seul.page);
  const partages = vuSeul.categories.flatMap(c => c[4]).filter(o => o[4]);
  juge.exige(
    vuSeul.categories.length === ATTENDU.length && partages.length === 0,
    `un seul voyageur : « partagé » affiché sous ${JSON.stringify(partages)}`,
  );
  juge.exige(
    vuSeul.libelles['o-caf']?.[1] === fiche('Café soluble', '1'),
    `un seul voyageur : nom de la ligne Café soluble ${JSON.stringify(vuSeul.libelles['o-caf'])}`,
  );
  await seul.contexte.close();

  // Voyage inconnu, ou adresse mal formée : titre, message et retour.
  for (const [cas, adresse] of [
    ['voyage inconnu', '#/voyage/inconnu'],
    ['adresse mal formée', '#/voyage/%E0%A4%A'],
  ]) {
    const inconnu = await ouvrir(navigateur, serveur.url, {
      taille: FORMATS.telephone,
      theme: 'light',
      donnees: DONNEES,
      adresse,
    });
    const vu = await lireIssue(inconnu.page);
    juge.exige(
      vu.ecran === 'voyage' &&
        Boolean(vu.titre) &&
        vu.titre === fr.voyage.introuvableTitre &&
        vu.message === fr.voyage.introuvable &&
        vu.retour === '#/voyages',
      `${cas} : ${JSON.stringify(vu)}`,
    );
    await inconnu.contexte.close();
  }

  // Panne de lecture hors de l'accueil : écran d'erreur avec un retour qui ramène à Mes voyages.
  const panne = await ouvrir(navigateur, serveur.url, {
    taille: FORMATS.telephone,
    theme: 'light',
    donnees: { ...DONNEES, pannes: ['lireVoyage'] },
    adresse: '#/voyage/v1',
  });
  const vuPanne = await lireIssue(panne.page);
  juge.exige(
    vuPanne.ecran === 'erreur' && vuPanne.message === fr.erreurs.lecture && vuPanne.retour === '#/voyages',
    `panne de lecture : ${JSON.stringify(vuPanne)}`,
  );
  if (vuPanne.retour) {
    await panne.page.click('.lien-retour');
    await attendreEcran(panne.page, 'voyages');
  }
  await panne.contexte.close();

  // Témoin : panne sur l'accueil, l'écran d'erreur n'offre pas de retour.
  const panneAccueil = await ouvrir(navigateur, serveur.url, {
    taille: FORMATS.telephone,
    theme: 'light',
    donnees: { ...DONNEES, pannes: ['listerVoyages'] },
    adresse: '#/voyages',
  });
  const vuAccueil = await lireIssue(panneAccueil.page);
  juge.exige(
    vuAccueil.ecran === 'erreur' && vuAccueil.message === fr.erreurs.lecture && vuAccueil.retour === undefined,
    `panne sur l’accueil : ${JSON.stringify(vuAccueil)}`,
  );
  await panneAccueil.contexte.close();
} finally {
  await navigateur.close();
  await serveur.fermer();
}
juge.conclure(
  'Écran d’un voyage',
  '5 formats (grand format dès la tablette) × 2 thèmes, voyage sans objet, voyageur seul, nom long, voyage inconnu, adresse mal formée et pannes de lecture compris',
);
