// Disposition de l'écran Nouveau voyage (décision du chef de projet, 2026-10-07).
// - tablette en paysage et ordinateur (1280 × 800) : deux colonnes, les champs, les voyageurs et
//   « Créer le voyage » à gauche, les dates et le calendrier à droite, qui occupe la largeur de sa
//   colonne ; tout tient sans défiler, dans un mois de cinq comme de six semaines, et encore avec
//   les barres système de la tablette (haut 40 px, bas 48 px) ; le contenu reste centré et ne
//   dépasse pas 1080 px ; Créer sans rien : les messages prennent leur place, rien ne bouge ;
// - tablette en portrait, téléphones (393 et 360 px) et fenêtre d'ordinateur basse (1280 × 500) :
//   une seule colonne, le calendrier sous les champs ;
// - deux colonnes à 1280 × 650 sous les barres de la tablette : les jours gardent 44 px (plancher) ;
// - partout, chaque jour du calendrier est un cercle (largeur = hauteur) d'au moins 44 px qui tient
//   dans sa case, sans chevaucher ses voisins.
// Captures : 1280 × 800 vide, avec les messages d'erreur et après le choix des dates, en clair et
// en sombre.
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { chromium } from 'playwright';
import { calme } from './outils/attente.mjs';
import { demarrerServeur } from './outils/serveur.mjs';
import { CAPTURES, FORMATS, NOMS_THEME, attendreEcran, creerJuge, ouvrir } from './outils/page.mjs';

const MAINTENANT = new Date('2026-10-06T10:00:00');
// Barres système relevées sur la tablette SM-X210 en paysage (pixels CSS).
const BARRES_TABLETTE = { haut: 40, bas: 48 };
// En plus des trois formats communs : un téléphone étroit, et une fenêtre d'ordinateur large mais
// trop basse pour deux colonnes (une seule colonne, qui défile).
const FORMATS_ESSAYES = {
  ...FORMATS,
  'telephone-etroit': { width: 360, height: 740 },
  'ordinateur-bas': { width: 1280, height: 500 },
};

// Les boîtes utiles, relevées en haut de page.
const mesurer = page =>
  page.evaluate(() => {
    window.scrollTo(0, 0);
    const boite = selecteur => document.querySelector(selecteur).getBoundingClientRect().toJSON();
    const ecran = boite('main.ecran');
    // Un jour fautif : ovale, sous 44 px, ou qui déborde de sa case (il chevauche alors son voisin).
    const joursFautifs = [...document.querySelectorAll('.jour')]
      .map(b => [b.getBoundingClientRect(), b.parentElement.getBoundingClientRect()])
      .filter(
        ([r, c]) =>
          Math.abs(r.width - r.height) > 1 ||
          Math.min(r.width, r.height) < 43.5 ||
          r.left < c.left - 0.5 ||
          r.right > c.right + 0.5,
      )
      .map(([r, c]) => `${Math.round(r.width)} × ${Math.round(r.height)} dans ${Math.round(c.width)}`);
    return {
      fenetre: { largeur: window.innerWidth, hauteur: window.innerHeight },
      defilement: {
        vertical: document.documentElement.scrollHeight - window.innerHeight,
        cote: document.documentElement.scrollWidth - window.innerWidth,
      },
      ecran: { ...ecran, contenu: ecran.width, marges: [ecran.left, window.innerWidth - ecran.right] },
      nom: boite('#nom'),
      destination: boite('#destination'),
      dates: boite('fieldset:has(.calendrier)'),
      calendrier: boite('.calendrier'),
      creer: boite('button[type=submit]'),
      semaines: document.querySelectorAll('.calendrier-grille tbody tr').length,
      joursFautifs,
    };
  });

function verifierDeuxColonnes(m, juge, cas, basPermis) {
  juge.exige(m.calendrier.left >= m.nom.right, `${cas} : le calendrier n’est pas à droite des champs`);
  juge.exige(m.calendrier.top < m.creer.bottom, `${cas} : le calendrier n’est pas en face des champs`);
  juge.exige(
    Math.abs(m.calendrier.width - m.dates.width) <= 1,
    `${cas} : le calendrier (${m.calendrier.width} px) n’occupe pas sa colonne (${m.dates.width} px)`,
  );
  juge.exige(m.creer.bottom <= basPermis, `${cas} : « Créer le voyage » finit à ${m.creer.bottom} px (> ${basPermis})`);
  juge.exige(
    m.calendrier.bottom <= basPermis,
    `${cas} : le calendrier finit à ${m.calendrier.bottom} px (> ${basPermis})`,
  );
  juge.exige(m.defilement.vertical <= 0, `${cas} : l’écran défile de ${m.defilement.vertical} px`);
  juge.exige(m.ecran.contenu <= 1080, `${cas} : contenu large de ${m.ecran.contenu} px`);
  juge.exige(Math.abs(m.ecran.marges[0] - m.ecran.marges[1]) <= 1, `${cas} : contenu décentré ${m.ecran.marges}`);
}

function verifierUneColonne(m, juge, cas) {
  juge.exige(m.calendrier.top >= m.destination.bottom, `${cas} : le calendrier n’est pas sous les champs`);
  juge.exige(Math.abs(m.calendrier.left - m.nom.left) <= 1, `${cas} : le calendrier n’est pas aligné sur les champs`);
}

async function poserBarres(page) {
  await page.evaluate(({ haut, bas }) => {
    document.documentElement.style.setProperty('--zone-haut', `${haut}px`);
    document.documentElement.style.setProperty('--zone-bas', `${bas}px`);
  }, BARRES_TABLETTE);
  await calme(page);
}

const juge = creerJuge();
const serveur = await demarrerServeur();
const navigateur = await chromium.launch();
try {
  await mkdir(CAPTURES, { recursive: true });
  for (const theme of ['light', 'dark']) {
    for (const [format, taille] of Object.entries(FORMATS_ESSAYES)) {
      const cas = `${format}, ${NOMS_THEME[theme]}`;
      const { contexte, page } = await ouvrir(navigateur, serveur.url, {
        taille,
        theme,
        maintenant: MAINTENANT,
        adresse: '#/nouveau-voyage',
      });
      await attendreEcran(page, 'nouveau-voyage');
      const paysage = format === 'tablette-paysage';
      const capture = async etape =>
        paysage &&
        (await page.screenshot({ path: join(CAPTURES, `nouveau-voyage-paysage-${etape}-${NOMS_THEME[theme]}.png`) }));
      await capture('vide');
      let m = await mesurer(page);
      juge.exige(
        m.joursFautifs.length === 0,
        `${cas} : jours ovales, trop petits ou hors de leur case : ${[...new Set(m.joursFautifs)].join(', ')}`,
      );
      juge.exige(m.defilement.cote <= 0, `${cas} : la page défile de côté (${m.defilement.cote} px)`);
      if (!paysage) {
        await page.screenshot({
          path: join(CAPTURES, `nouveau-voyage-${format}-${NOMS_THEME[theme]}.png`),
          fullPage: true,
        });
        verifierUneColonne(m, juge, cas);
        await contexte.close();
        continue;
      }
      verifierDeuxColonnes(m, juge, `${cas}, octobre`, m.fenetre.hauteur);
      // Créer sans rien : les messages prennent leur place réservée, rien ne bouge.
      const places = () =>
        page.evaluate(() =>
          ['.calendrier', '.compteur', 'button[type=submit]', '#destination'].map(s => {
            const r = document.querySelector(s).getBoundingClientRect();
            return `${r.left},${r.top + window.scrollY}`;
          }),
        );
      const avant = await places();
      await page.click('button[type=submit]');
      await calme(page);
      juge.exige(
        (await page.textContent('#erreur-dates')).trim() !== '',
        `${cas} : témoin, le message des dates n’est pas apparu`,
      );
      const apres = await places();
      juge.exige(avant.join(' ') === apres.join(' '), `${cas} : l’écran a bougé ${avant} → ${apres}`);
      await capture('erreurs');
      await page.fill('#nom', 'Vercors');
      await page.click('[data-jour="2026-10-10"]');
      await page.click('[data-jour="2026-10-13"]');
      await calme(page);
      await capture('dates');
      // Novembre 2026 s'étale sur six semaines : le cas le plus haut.
      await page.click('[data-mois="1"]');
      await calme(page);
      m = await mesurer(page);
      juge.exige(m.semaines === 6, `${cas} : témoin, novembre compte ${m.semaines} semaines`);
      verifierDeuxColonnes(m, juge, `${cas}, novembre`, m.fenetre.hauteur);
      await poserBarres(page);
      m = await mesurer(page);
      verifierDeuxColonnes(m, juge, `${cas}, novembre, barres de la tablette`, m.fenetre.hauteur - BARRES_TABLETTE.bas);
      await contexte.close();
    }
  }

  // Deux colonnes, mais si peu de hauteur sous les barres que le calcul donnerait des jours de
  // moins de 44 px : le plancher les garde ronds, à 44 px, dans leur case.
  {
    const cas = 'ordinateur à 1280 × 650 avec les barres de la tablette';
    const { contexte, page } = await ouvrir(navigateur, serveur.url, {
      taille: { width: 1280, height: 650 },
      theme: 'light',
      maintenant: MAINTENANT,
      adresse: '#/nouveau-voyage',
    });
    await attendreEcran(page, 'nouveau-voyage');
    await poserBarres(page);
    const m = await mesurer(page);
    juge.exige(m.calendrier.left >= m.nom.right, `${cas} : témoin, pas de deux colonnes`);
    juge.exige(m.joursFautifs.length === 0, `${cas} : jours fautifs ${[...new Set(m.joursFautifs)].join(', ')}`);
    juge.exige(m.defilement.cote <= 0, `${cas} : la page défile de côté (${m.defilement.cote} px)`);
    await contexte.close();
  }
} finally {
  await navigateur.close();
  await serveur.fermer();
}
juge.conclure(
  'Disposition de Nouveau voyage',
  'deux colonnes en paysage, une en portrait, au téléphone et en fenêtre basse, jours ronds d’au moins 44 px, 2 thèmes',
);
