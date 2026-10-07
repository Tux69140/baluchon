// Phase 2 (docs/PLAN.md) : un voyage s'ouvre en lecture (US-28).
// - en-tête : nom (caractères spéciaux affichés tels quels), destination, période, voyageurs, retour
//   vers Mes voyages ;
// - catégories dans l'ordre de la bibliothèque, chacune avec son pavé coloré et son picto ; objets par
//   ordre alphabétique avec leur quantité ; rien d'un autre voyage ;
// - un voyage inconnu affiche un message en toutes lettres et un retour vers Mes voyages.
// 3 formats × 2 thèmes : cibles de 44 px, pas de défilement de côté (nom très long compris), rien
// sous les barres système.
import { mkdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { chromium } from 'playwright';
import { demarrerServeur } from './outils/serveur.mjs';
import {
  CAPTURES,
  FORMATS,
  NOMS_THEME,
  RACINE,
  creerJuge,
  ouvrir,
  verifierBarres,
  verifierCommandes,
} from './outils/page.mjs';

const fr = JSON.parse(await readFile(join(RACINE, 'src/i18n/fr.json'), 'utf8'));
const NOM = 'Vercors <i>&</i> "amis"';
const voyage = (id, nom) => ({
  id,
  nom,
  destination: 'Autrans',
  depart: '2026-10-10',
  retour: '2026-10-13',
  voyageurs: 2,
  modifieLe: 'x',
});
const categorie = (id, voyageId, nom, icone, couleur, ordre) => ({
  id,
  voyageId,
  modeleId: null,
  nom,
  icone,
  couleur,
  ordre,
  modifieLe: 'x',
});
const objet = (id, voyageId, categorieId, nom, quantite) => ({
  id,
  voyageId,
  categorieId,
  modeleId: null,
  nom,
  regle: 'fixe',
  valeur: quantite,
  plafond: null,
  parPersonne: false,
  consommable: false,
  quantite,
  quantiteManuelle: false,
  dansLeSac: false,
  aAcheter: false,
  achete: false,
  note: '',
  modifieLe: 'x',
});
// Rangés dans le désordre, avec un second voyage dont rien ne doit apparaître.
const DONNEES = {
  voyages: [voyage('v1', NOM), voyage('v2', 'Autre'), voyage('v3', 'B'.repeat(120))],
  categoriesDuVoyage: [
    categorie('c-pap', 'v1', 'Papiers', 'identification-card', 'tournesol', 3),
    categorie('c-vet', 'v1', 'Vêtements', 't-shirt', 'ciel', 0),
    categorie('c-ali', 'v1', 'Alimentation', 'fork-knife', 'pomme', 2),
    categorie('c-autre', 'v2', 'Ski', 'tooth', 'lilas', 1),
  ],
  objetsDuVoyage: [
    objet('o1', 'v1', 'c-vet', 'T-shirts', 8),
    objet('o2', 'v1', 'c-vet', 'Pyjama', 2),
    objet('o3', 'v1', 'c-vet', 'Sous-vêtements', 8),
    objet('o4', 'v1', 'c-ali', 'Repas', 16),
    objet('o5', 'v1', 'c-ali', 'Gourde', 2),
    objet('o6', 'v1', 'c-pap', 'Pièce d’identité', 2),
    objet('o7', 'v1', 'c-pap', 'Chargeur de téléphone', 1),
    objet('o8', 'v2', 'c-autre', 'Skis', 2),
  ],
};
const ATTENDU = [
  [
    'Vêtements',
    'rgb(90, 169, 255)',
    [
      ['Pyjama', '2'],
      ['Sous-vêtements', '8'],
      ['T-shirts', '8'],
    ],
  ],
  [
    'Alimentation',
    'rgb(140, 203, 78)',
    [
      ['Gourde', '2'],
      ['Repas', '16'],
    ],
  ],
  [
    'Papiers',
    'rgb(255, 201, 60)',
    [
      ['Chargeur de téléphone', '1'],
      ['Pièce d’identité', '2'],
    ],
  ],
];

const lire = page =>
  page.evaluate(() => ({
    titre: document.querySelector('h1')?.textContent,
    entete: document.querySelector('.voyage-entete')?.textContent ?? '',
    retour: document.querySelector('.lien-retour')?.getAttribute('href'),
    categories: [...document.querySelectorAll('.categorie')].map(c => [
      c.querySelector('h2').textContent.trim(),
      getComputedStyle(c.querySelector('.pave')).backgroundColor,
      [...c.querySelectorAll('.objet')].map(o => [
        o.querySelector('.objet-nom').textContent,
        o.querySelector('.objet-quantite').textContent,
      ]),
    ]),
    picto: [...document.querySelectorAll('.pave')].every(p => p.querySelector('svg')),
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
        JSON.stringify(m.categories) === JSON.stringify(ATTENDU),
        `${cas} : liste ${JSON.stringify(m.categories)}`,
      );
      juge.exige(m.picto, `${cas} : un pavé sans picto`);
      await verifierCommandes(page, juge, cas);
      if (format === 'tablette-portrait')
        await page.screenshot({ path: join(CAPTURES, `voyage-${NOMS_THEME[theme]}.png`), fullPage: true });
      await verifierBarres(page, juge, cas);
      juge.exige(sorties.length === 0, `${cas} : requêtes hors de l’appli : ${sorties.join(', ')}`);
      juge.exige(erreurs.length === 0, `${cas} : erreurs dans la page : ${erreurs.join(' | ')}`);
      await contexte.close();
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

  // Voyage inconnu : message et retour.
  const inconnu = await ouvrir(navigateur, serveur.url, {
    taille: FORMATS.telephone,
    theme: 'light',
    donnees: DONNEES,
    adresse: '#/voyage/inconnu',
  });
  const vu = await inconnu.page.evaluate(() => ({
    ecran: document.querySelector('#app').dataset.ecran,
    message: document.querySelector('.message')?.textContent.trim(),
    retour: document.querySelector('.lien-retour')?.getAttribute('href'),
  }));
  juge.exige(
    vu.ecran === 'voyage' && vu.message === fr.voyage.introuvable && vu.retour === '#/voyages',
    `voyage inconnu : ${JSON.stringify(vu)}`,
  );
  await inconnu.contexte.close();
} finally {
  await navigateur.close();
  await serveur.fermer();
}
juge.conclure('Écran d’un voyage', '3 formats × 2 thèmes, nom long et voyage inconnu compris');
