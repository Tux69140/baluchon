// Disposition de Nouveau voyage (décisions du chef de projet et du contrôleur, 2026-10-07 : fenêtre
// modale). Le choix se fait d'après l'écran de l'appareil, pas d'après la fenêtre : plus petit côté
// d'au moins 600 px (tablette, ordinateur) → fenêtre modale ; sinon (téléphone, même tourné) → écran plein.
// - fenêtre modale : ouverte par-dessus Mes voyages, centrée entre les barres système (écarts gauche /
//   droite et haut / bas égaux à 2 px près, au moins 24 px de marge), dont le bouton « Créer le voyage »
//   se voit sans défiler, et la page derrière ne défile pas ;
//   - en paysage d'au moins 800 px de large (1280 × 800 avec et sans les barres de la tablette,
//     1440 × 900) : deux colonnes égales, les champs et les voyageurs à gauche, les dates à droite, le
//     calendrier de la largeur de sa colonne ; la fenêtre fait au plus 880 px de large et tout y tient
//     sans défiler, dans un mois de cinq comme de six semaines ; Créer sans rien : rien ne bouge ;
//     à 800 × 600, le seuil, deux colonnes de jours de 44 px, dont le corps défile ;
//   - la hauteur ne compte pas (un clavier ouvert la divise par deux) : fenêtre d'ordinateur basse
//     (1280 × 500), toujours deux colonnes, c'est le corps de la fenêtre qui défile ; à 1280 × 650 sous
//     les barres de la tablette, les jours gardent 44 px (plancher) ;
//   - en portrait (800 × 1280) : une colonne de 560 px, où le nom, la destination, le calendrier et
//     les voyageurs ont la même largeur, à 1 px près ;
//   - fenêtre d'ordinateur très étroite (360 × 740) : une colonne, toute la largeur moins 8 px de marge ;
// - écran plein : téléphones (393 × 873, 360 × 740), le nom, la destination, le calendrier, les
//   voyageurs et « Créer le voyage » occupent toute la largeur utile ; téléphone tourné (873 × 393),
//   deux colonnes égales qui occupent ensemble la largeur utile ;
// - partout, chaque jour du calendrier est un cercle (largeur = hauteur) d'au moins 44 px qui tient
//   dans sa case, sans chevaucher ses voisins, et la page ne défile pas de côté.
// Captures, en clair et en sombre : 1280 × 800 (vide, messages d'erreur, dates choisies), 1440 × 900,
// 800 × 1280, 393 × 873 et 873 × 393 (dates choisies).
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { chromium } from 'playwright';
import { calme } from './outils/attente.mjs';
import { demarrerServeur } from './outils/serveur.mjs';
import { CAPTURES, NOMS_THEME, attendreEcran, creerJuge, ouvrir } from './outils/page.mjs';

const MAINTENANT = new Date('2026-10-06T10:00:00');
// Barres système relevées sur la tablette SM-X210 en paysage (pixels CSS).
const BARRES_TABLETTE = { haut: 40, bas: 48 };
const MARGE = 24;
const ORDINATEUR = { ecran: { width: 1920, height: 1080 }, tactile: false };
// mode : deux colonnes ou une dans la fenêtre modale, écran plein sur une ou deux colonnes ; ecran :
// l'écran de l'appareil quand il diffère de la fenêtre ; defile : le corps de la fenêtre défile
// (témoin) ; capture : le nom de la capture des dates.
const FORMATS_ESSAYES = {
  'tablette-paysage': { taille: { width: 1280, height: 800 }, mode: 'deux', capture: 'paysage' },
  ordinateur: { taille: { width: 1440, height: 900 }, mode: 'deux', capture: 'ordinateur', ...ORDINATEUR },
  'tablette-portrait': { taille: { width: 800, height: 1280 }, mode: 'une', capture: 'portrait' },
  'ordinateur-bas': { taille: { width: 1280, height: 500 }, mode: 'deux', defile: true, ...ORDINATEUR },
  'ordinateur-petit': { taille: { width: 800, height: 600 }, mode: 'deux', defile: true, ...ORDINATEUR },
  'ordinateur-etroit': { taille: { width: 360, height: 740 }, mode: 'une', marge: 8, ...ORDINATEUR },
  telephone: { taille: { width: 393, height: 873 }, mode: 'plein', capture: 'telephone' },
  'telephone-etroit': { taille: { width: 360, height: 740 }, mode: 'plein' },
  'telephone-tourne': {
    taille: { width: 873, height: 393 },
    ecran: { width: 393, height: 873 },
    mode: 'plein-deux',
    capture: 'telephone-tourne',
  },
};

// Les boîtes utiles ; la page est d'abord poussée vers le bas, pour voir si elle défile.
const mesurer = page =>
  page.evaluate(() => {
    // Page bloquée derrière la fenêtre : ni le doigt ni la molette ne la font défiler (un scrollTo
    // le pourrait encore, il ne compte pas).
    const bloquee = getComputedStyle(document.documentElement).overflowY === 'hidden';
    window.scrollTo(0, document.documentElement.scrollHeight);
    const defilementPage = bloquee ? 0 : window.scrollY;
    window.scrollTo(0, 0);
    const boite = selecteur => document.querySelector(selecteur)?.getBoundingClientRect().toJSON();
    const zone = cote => {
      const sonde = document.createElement('div');
      sonde.style.cssText = `position: fixed; width: var(--zone-${cote})`;
      document.body.append(sonde);
      const largeur = sonde.getBoundingClientRect().width;
      sonde.remove();
      return largeur;
    };
    const fenetre = document.querySelector('dialog');
    const corps = document.querySelector('.formulaire-corps');
    const creer = document.querySelector('button[type=submit]');
    const c = creer.getBoundingClientRect();
    const ecran = document.querySelector('main.ecran:has(.formulaire)');
    const s = ecran && getComputedStyle(ecran);
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
      zones: { haut: zone('haut'), bas: zone('bas'), gauche: zone('gauche'), droite: zone('droite') },
      defilementPage,
      defilementCote: document.documentElement.scrollWidth - window.innerWidth,
      ouverte: Boolean(fenetre?.open),
      modale: Boolean(fenetre?.matches(':modal')),
      boiteFenetre: fenetre?.getBoundingClientRect().toJSON(),
      corpsDefile: corps ? corps.scrollHeight - corps.clientHeight : 0,
      // Le contenu de l'écran plein du téléphone : sa largeur, marges intérieures ôtées.
      contenu: ecran && ecran.getBoundingClientRect().width - parseFloat(s.paddingLeft) - parseFloat(s.paddingRight),
      nom: boite('#nom'),
      champNom: boite('.champ:has(#nom)'),
      destination: boite('#destination'),
      dates: boite('fieldset:has(.calendrier)'),
      calendrier: boite('.calendrier'),
      voyageurs: boite('fieldset:has(.compteur)'),
      creer: c.toJSON(),
      // « Créer le voyage » se voit : c'est bien lui qu'on touche en son milieu.
      creerVisible: creer.contains(document.elementFromPoint(c.left + c.width / 2, c.top + c.height / 2)),
      semaines: document.querySelectorAll('.calendrier-grille tbody tr').length,
      joursFautifs,
    };
  });

const ecart = (a, b) => Math.abs(a - b);

function verifierFenetre(m, juge, cas, marge = MARGE) {
  juge.exige(m.ouverte && m.modale, `${cas} : pas de fenêtre modale ouverte`);
  if (!m.boiteFenetre) return;
  const f = m.boiteFenetre;
  const { haut, bas, gauche, droite } = m.zones;
  const [aGauche, aDroite] = [f.left - gauche, m.fenetre.largeur - droite - f.right];
  const [enHaut, enBas] = [f.top - haut, m.fenetre.hauteur - bas - f.bottom];
  juge.exige(ecart(aGauche, aDroite) <= 2, `${cas} : fenêtre décentrée de côté (${aGauche} / ${aDroite})`);
  juge.exige(ecart(enHaut, enBas) <= 2, `${cas} : fenêtre décentrée en hauteur (${enHaut} / ${enBas})`);
  juge.exige(
    Math.min(aGauche, aDroite, enHaut, enBas) >= marge - 0.5,
    `${cas} : marge de moins de ${marge} px (${[aGauche, aDroite, enHaut, enBas].map(Math.round)})`,
  );
  juge.exige(m.creerVisible, `${cas} : « Créer le voyage » ne se voit pas sans défiler`);
  juge.exige(m.defilementPage === 0, `${cas} : la page défile derrière la fenêtre (${m.defilementPage} px)`);
}

function verifierDeuxColonnes(m, juge, cas) {
  verifierFenetre(m, juge, cas);
  verifierColonnes(m, juge, cas);
  juge.exige(m.boiteFenetre?.width <= 880.5, `${cas} : fenêtre large de ${m.boiteFenetre?.width} px (> 880)`);
}

// Deux colonnes égales : le calendrier à droite, en face du nom ; à gauche, les champs et les voyageurs.
function verifierColonnes(m, juge, cas) {
  juge.exige(m.calendrier.left >= m.nom.right + 16, `${cas} : le calendrier n’est pas à droite des champs`);
  juge.exige(ecart(m.dates.top, m.champNom.top) <= 1, `${cas} : les dates ne commencent pas en face du nom`);
  juge.exige(
    ecart(m.calendrier.width, m.nom.width) <= 1 && ecart(m.calendrier.width, m.dates.width) <= 1,
    `${cas} : colonnes inégales (nom ${m.nom.width}, calendrier ${m.calendrier.width}, dates ${m.dates.width})`,
  );
  juge.exige(
    ecart(m.voyageurs.width, m.nom.width) <= 1 && ecart(m.voyageurs.left, m.nom.left) <= 1,
    `${cas} : les voyageurs ne sont pas alignés sur les champs`,
  );
}

function verifierUneColonne(m, juge, cas, marge) {
  verifierFenetre(m, juge, cas, marge);
  const largeurs = [m.nom, m.destination, m.calendrier, m.voyageurs].map(b => b.width);
  juge.exige(
    Math.max(...largeurs) - Math.min(...largeurs) <= 1 &&
      [m.destination, m.calendrier].every(b => ecart(b.left, m.nom.left) <= 1),
    `${cas} : nom, destination, calendrier et voyageurs de largeurs ou d’alignements différents (${largeurs})`,
  );
  juge.exige(m.calendrier.top >= m.destination.bottom, `${cas} : le calendrier n’est pas sous les champs`);
}

// Téléphone tourné : deux colonnes égales qui, ensemble, occupent la largeur utile ; « Créer le voyage »
// sous les voyageurs, de la largeur de sa colonne.
function verifierEcranPleinDeuxColonnes(m, juge, cas) {
  juge.exige(!m.ouverte, `${cas} : une fenêtre modale s’est ouverte au téléphone`);
  verifierColonnes(m, juge, cas);
  juge.exige(
    ecart(m.calendrier.right - m.nom.left, m.contenu) <= 1,
    `${cas} : les colonnes n’occupent pas la largeur utile (${m.calendrier.right - m.nom.left} / ${m.contenu})`,
  );
  juge.exige(
    ecart(m.creer.width, m.nom.width) <= 1 && ecart(m.creer.left, m.nom.left) <= 1 && m.creer.top > m.voyageurs.bottom,
    `${cas} : « Créer le voyage » n’est pas sous les voyageurs, à leur largeur`,
  );
}

function verifierEcranPlein(m, juge, cas) {
  juge.exige(!m.ouverte, `${cas} : une fenêtre modale s’est ouverte au téléphone`);
  const blocs = {
    nom: m.nom,
    destination: m.destination,
    calendrier: m.calendrier,
    voyageurs: m.voyageurs,
    creer: m.creer,
  };
  const etroits = Object.entries(blocs).filter(
    ([, b]) => ecart(b.width, m.contenu) > 1 || ecart(b.left, m.nom.left) > 1,
  );
  juge.exige(
    etroits.length === 0,
    `${cas} : blocs qui n’occupent pas toute la largeur utile (${m.contenu} px) : ${etroits.map(([n, b]) => `${n} ${b.width}`).join(', ')}`,
  );
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
    for (const [format, { taille, ecran, tactile, mode, defile, marge, capture }] of Object.entries(FORMATS_ESSAYES)) {
      const cas = `${format}, ${NOMS_THEME[theme]}`;
      const { contexte, page, erreurs } = await ouvrir(navigateur, serveur.url, {
        taille,
        ecran,
        tactile,
        theme,
        maintenant: MAINTENANT,
        adresse: '#/nouveau-voyage',
      });
      await attendreEcran(page, 'nouveau-voyage');
      const photo = etape =>
        page.screenshot({
          path: join(CAPTURES, `nouveau-voyage-${capture}-${etape}-${NOMS_THEME[theme]}.png`),
          fullPage: mode.startsWith('plein'),
        });
      const verifier = {
        deux: verifierDeuxColonnes,
        une: verifierUneColonne,
        plein: verifierEcranPlein,
        'plein-deux': verifierEcranPleinDeuxColonnes,
      }[mode];
      let m = await mesurer(page);
      juge.exige(
        m.joursFautifs.length === 0,
        `${cas} : jours ovales, trop petits ou hors de leur case : ${[...new Set(m.joursFautifs)].join(', ')}`,
      );
      juge.exige(m.defilementCote <= 0, `${cas} : la page défile de côté (${m.defilementCote} px)`);
      verifier(m, juge, cas, marge);
      if (defile) juge.exige(m.corpsDefile > 0, `${cas} : témoin, le corps de la fenêtre devrait défiler`);
      if (mode === 'deux' && !defile) {
        juge.exige(m.corpsDefile <= 0, `${cas}, octobre : le corps de la fenêtre défile de ${m.corpsDefile} px`);
        if (capture === 'paysage') await photo('vide');
        // Créer sans rien : les messages prennent leur place réservée, rien ne bouge.
        const places = () =>
          page.evaluate(() =>
            ['dialog', '.calendrier', '.compteur', 'button[type=submit]', '#destination'].map(s => {
              const r = document.querySelector(s)?.getBoundingClientRect() ?? {};
              return `${r.left},${r.top},${r.height}`;
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
        if (capture === 'paysage') await photo('erreurs');
      }
      if (capture) {
        await page.fill('#nom', 'Vercors');
        await page.click('[data-jour="2026-10-10"]');
        await page.click('[data-jour="2026-10-13"]');
        await calme(page);
        await photo('dates');
      }
      if (mode === 'deux') {
        // Novembre 2026 s'étale sur six semaines : le cas le plus haut.
        await page.click('[data-mois="1"]');
        await calme(page);
        m = await mesurer(page);
        juge.exige(m.semaines === 6, `${cas} : témoin, novembre compte ${m.semaines} semaines`);
        verifierDeuxColonnes(m, juge, `${cas}, novembre`);
        if (!defile)
          juge.exige(m.corpsDefile <= 0, `${cas}, novembre : le corps de la fenêtre défile de ${m.corpsDefile} px`);
        await poserBarres(page);
        m = await mesurer(page);
        verifierDeuxColonnes(m, juge, `${cas}, novembre, barres de la tablette`);
        juge.exige(
          m.joursFautifs.length === 0,
          `${cas}, novembre, barres de la tablette : jours fautifs ${[...new Set(m.joursFautifs)].join(', ')}`,
        );
        if (format === 'tablette-paysage')
          juge.exige(
            m.corpsDefile <= 0,
            `${cas}, novembre, barres de la tablette : le corps de la fenêtre défile de ${m.corpsDefile} px`,
          );
      }
      juge.exige(erreurs.length === 0, `${cas} : erreurs dans la page : ${erreurs.join(' | ')}`);
      await contexte.close();
    }
  }

  // Deux colonnes, mais si peu de hauteur sous les barres que le calcul donnerait des jours de
  // moins de 44 px : le plancher les garde ronds, à 44 px, dans leur case ; le corps défile.
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
    verifierFenetre(m, juge, cas);
    juge.exige(m.joursFautifs.length === 0, `${cas} : jours fautifs ${[...new Set(m.joursFautifs)].join(', ')}`);
    juge.exige(m.defilementCote <= 0, `${cas} : la page défile de côté (${m.defilementCote} px)`);
    await contexte.close();
  }
} finally {
  await navigateur.close();
  await serveur.fermer();
}
juge.conclure(
  'Disposition de Nouveau voyage',
  'fenêtre modale selon l’écran de l’appareil, une ou deux colonnes, écran plein au téléphone même tourné, 2 thèmes',
);
