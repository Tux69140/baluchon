// Phase 6 (décision du chef de projet, 2026-10-26 ; maquette docs/maquettes/etiquettes/, état
// « assistant ») : la rangée d'étapes de l'assistant « Nouveau voyage » quand les groupes sont
// nombreux. Le 6 octobre 2026 (horloge fixée), bibliothèque d'essai à 7 groupes (9 étapes), dont un
// nommé « <b>&"x » :
// - au téléphone 360 × 640, à Informations : la rangée défile, le trait continue jusqu'au bord de
//   l'écran du côté des étapes cachées (après) seulement ; après quatre « Suivant » : des deux côtés,
//   l'étape en cours visible et au milieu, des étapes entières, chaque bouton d'étape d'au moins
//   44 px, la page ne défile pas de côté ; à l'aperçu : le trait d'avant seul ;
// - le défilement est doux, et instantané si l'appareil demande moins d'animations ;
// - téléphone tourné (640 × 360) puis rendu : la rangée se recalcule, l'étape en cours reste visible ;
//   retour à Informations puis à l'aperçu (Review Focus 5) ;
// - tablette 800 × 1280 et ordinateur : les mêmes constats dans la fenêtre, le trait touchant son bord ;
// - le nom « <b>&"x » s'écrit tel quel, dans la rangée, la légende et le titre de l'étape ;
// - bibliothèque de départ (3 groupes) : la rangée de la phase 4, sans défilement ni trait au bord ;
// - les traits passent au gris des contours quand la rangée défile ;
// 6 formats × 2 thèmes, au milieu de la rangée : cibles de 44 px, pas de défilement de côté, rien sous
// les barres système ; captures assistant-rangee-<étape>-<format>-<thème>.png.
import { mkdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { chromium } from 'playwright';
import { construireBibliotheque } from '../src/modele/bibliotheque.js';
import { nouvelId } from '../src/modele/identifiant.js';
import { attendreQue, calme } from './outils/attente.mjs';
import { avecBibliotheque } from './outils/assistant.mjs';
import { TOUS_FORMATS } from './outils/bibliotheque.mjs';
import { demarrerServeur } from './outils/serveur.mjs';
import {
  CAPTURES,
  NOMS_THEME,
  RACINE,
  attendreEcran,
  creerJuge,
  ouvrir,
  verifierBarres,
  verifierCommandes,
} from './outils/page.mjs';

const fr = JSON.parse(await readFile(join(RACINE, 'src/i18n/fr.json'), 'utf8'));
const MAINTENANT = new Date('2026-10-06T10:00:00');
const NOM_PIEGE = '<b>&"x';
const groupe = (nom, noms) => ({ nom, etiquettes: noms.map(n => ({ cle: `${nom}-${n}`, nom: n })) });
// Les trois groupes de départ, puis quatre de plus : 9 étapes. Le groupe piégé est la 5e étape.
const SEPT_GROUPES = avecBibliotheque(
  construireBibliotheque(
    {
      groupes: [
        ...fr.bibliothequeDeDepart.groupes,
        groupe(NOM_PIEGE, ['Un', 'Deux']),
        groupe('Saison', ['Printemps', 'Été', 'Automne', 'Hiver']),
        groupe('Compagnie', ['En couple', 'Avec les enfants']),
        groupe('Repas', ['Restaurant', 'Pique-nique']),
      ],
      categories: fr.bibliothequeDeDepart.categories,
    },
    { nouvelId, maintenant: 'x' },
  ),
);
const ETAPES = 9;
// Le téléphone garde son écran de 360 × 640 quand on le tourne : il reste un téléphone.
const FORMATS = {
  ...TOUS_FORMATS,
  'telephone-etroit': { ...TOUS_FORMATS['telephone-etroit'], ecran: { width: 360, height: 640 } },
};

async function ouvrirAssistant(navigateur, url, { format = 'telephone-etroit', theme = 'light', donnees } = {}) {
  const { taille, ecran, tactile } = FORMATS[format];
  const ouvert = await ouvrir(navigateur, url, {
    taille,
    ecran,
    tactile,
    theme,
    donnees,
    maintenant: MAINTENANT,
    adresse: '#/nouveau-voyage',
  });
  await attendreEcran(ouvert.page, 'nouveau-voyage');
  await ouvert.page.fill('#nom', 'Vercors');
  await ouvert.page.click('[data-jour="2026-10-10"]');
  await ouvert.page.click('[data-jour="2026-10-13"]');
  await attendreRangee(ouvert.page);
  return ouvert;
}

// Le défilement doux ne touche pas la page : on attend que la rangée ne bouge plus (trois relevés
// identiques de suite), puis l'écran calmé.
async function attendreRangee(page) {
  await page.evaluate(() => (window.__rangee = []));
  await attendreQue(page, () => {
    const l = document.querySelector('.etapes-liste');
    window.__rangee = [...window.__rangee, `${l?.scrollLeft}|${l?.clientWidth}|${innerWidth}`].slice(-3);
    return window.__rangee.length === 3 && new Set(window.__rangee).size === 1;
  });
  await calme(page);
}

// L'anneau de focus (épaisseur + décalage) de l'étape qui a le focus au clavier doit tenir dans la boîte
// visible de la liste : la liste défile de côté, donc elle rogne tout ce qui dépasse. `decalage` force un
// autre décalage, pour le témoin qui prouve que la mesure voit un anneau rogné.
const anneauVisible = (page, { bord, decalage }) =>
  page.evaluate(
    ({ bord, decalage }) => {
      const liste = document.querySelector('.etapes-liste');
      const l = liste.getBoundingClientRect();
      const boutons = [...liste.querySelectorAll('.etape button')];
      const cible =
        bord === 'debut'
          ? boutons.find(b => b.getBoundingClientRect().left >= l.left - 1)
          : boutons.at(Math.floor(boutons.length / 2));
      cible.style.outlineOffset = decalage ?? '';
      cible.focus({ focusVisible: true });
      const style = getComputedStyle(cible);
      const marge = parseFloat(style.outlineWidth) + parseFloat(style.outlineOffset);
      const b = cible.getBoundingClientRect();
      const resultat = {
        focusVisible: cible.matches(':focus-visible'),
        marge,
        rogne: [
          l.left - (b.left - marge),
          b.right + marge - l.right,
          l.top - (b.top - marge),
          b.bottom + marge - l.bottom,
        ].map(x => Math.max(0, Math.round(x * 10) / 10)),
      };
      cible.style.outlineOffset = '';
      return resultat;
    },
    { bord, decalage },
  );

async function verifierAnneau(page, juge, cas) {
  await page.keyboard.press('Shift');
  const defile = await page.evaluate(() => document.querySelector('nav.etapes').hasAttribute('data-defile'));
  juge.exige(defile, `${cas} : la rangée ne défile pas, l'essai de l'anneau ne mesure rien`);
  for (const bord of ['debut', 'milieu']) {
    const r = await anneauVisible(page, { bord });
    juge.exige(
      r.focusVisible && r.rogne.every(x => x === 0),
      `${cas} : anneau de focus rogné (${bord}) : ${JSON.stringify(r)} (haut/bas/côtés en px)`,
    );
  }
  // Témoin : avec le décalage d'origine (2 px), l'anneau de 5 px dépasse bien de la liste.
  const temoin = await anneauVisible(page, { bord: 'debut', decalage: '2px' });
  juge.exige(
    temoin.rogne.some(x => x > 0),
    `${cas} : témoin de l'anneau, la mesure ne voit pas l'anneau d'origine rogné : ${JSON.stringify(temoin)}`,
  );
}

async function toucher(page, selecteur) {
  await page.click(selecteur);
  await attendreRangee(page);
}

// Ce que montre la rangée : défilement, traits au bord, étape en cours (visible, écart au milieu), le
// bord de la fenêtre (ou de l'écran) que doivent toucher les traits.
const relever = page =>
  page.evaluate(() => {
    const nav = document.querySelector('nav.etapes');
    const liste = nav.querySelector('.etapes-liste');
    const l = liste.getBoundingClientRect();
    const courante = liste.querySelector('[aria-current="step"]').closest('.etape').getBoundingClientRect();
    const suite = cote => {
      const s = nav.querySelector(`.etapes-suite[data-cote="${cote}"]`);
      if (!s) return null;
      const r = s.getBoundingClientRect();
      return {
        visible: getComputedStyle(s).visibility === 'visible' && r.width > 0,
        gauche: r.left,
        droite: r.right,
        couleur: getComputedStyle(s).backgroundColor,
      };
    };
    const fenetre = document.querySelector('dialog.fenetre[open]');
    const f = fenetre?.getBoundingClientRect();
    const temoin = document.createElement('span');
    temoin.style.background = 'var(--contour)';
    nav.append(temoin);
    const contour = getComputedStyle(temoin).backgroundColor;
    temoin.remove();
    const premiere = liste.querySelector('.etape').getBoundingClientRect().width;
    return {
      defile: nav.hasAttribute('data-defile'),
      avant: suite('avant'),
      apres: suite('apres'),
      visible: courante.left >= l.left - 1 && courante.right <= l.right + 1,
      ecart: Math.abs((courante.left + courante.right) / 2 - (l.left + l.right) / 2),
      part: courante.width,
      entieres: Math.abs(liste.scrollLeft / premiere - Math.round(liste.scrollLeft / premiere)) < 0.02,
      petits: [...liste.querySelectorAll('.etape button')]
        .map(b => b.getBoundingClientRect())
        .filter(r => r.width < 43.5 || r.height < 43.5).length,
      debordement: document.documentElement.scrollWidth - innerWidth,
      bord: f
        ? { gauche: f.left + fenetre.clientLeft, droite: f.right - fenetre.clientLeft }
        : { gauche: 0, droite: document.documentElement.clientWidth },
      trait: getComputedStyle(liste.querySelector('.etape + .etape'), '::before').backgroundColor,
      contour,
    };
  });

// Les constats d'une rangée qui défile, avec les traits attendus de chaque côté.
function juger(juge, cas, r, { avant, apres }) {
  const detail = JSON.stringify(r);
  juge.exige(r.defile, `${cas} : la rangée ne défile pas ${detail}`);
  juge.exige(
    Boolean(r.avant?.visible) === avant && Boolean(r.apres?.visible) === apres,
    `${cas} : traits au bord avant ${r.avant?.visible}, après ${r.apres?.visible} (attendus ${avant}, ${apres})`,
  );
  if (avant)
    juge.exige(
      Math.abs(r.avant?.gauche - r.bord.gauche) <= 1,
      `${cas} : le trait d’avant ne touche pas le bord ${detail}`,
    );
  if (apres)
    juge.exige(
      Math.abs(r.apres?.droite - r.bord.droite) <= 1,
      `${cas} : le trait d’après ne touche pas le bord ${detail}`,
    );
  // Au milieu quand des étapes sont cachées des deux côtés ; au bout de la rangée, elle y reste
  // (le côté sans trait n'a rien de caché).
  juge.exige(r.visible, `${cas} : l’étape en cours est cachée ${detail}`);
  if (avant && apres) juge.exige(r.ecart <= r.part / 2 + 1, `${cas} : l’étape en cours n’est pas au milieu ${detail}`);
  juge.exige(r.entieres, `${cas} : la rangée s’arrête entre deux étapes ${detail}`);
  juge.exige(r.petits === 0, `${cas} : ${r.petits} bouton(s) d’étape de moins de 44 px`);
  juge.exige(r.debordement <= 0, `${cas} : la page défile de côté (${r.debordement} px)`);
  juge.exige(
    r.trait === r.contour && r.avant?.couleur === r.contour,
    `${cas} : traits ${r.trait}, ${r.avant?.couleur} au lieu du gris des contours ${r.contour}`,
  );
}

const juge = creerJuge();
const serveur = await demarrerServeur();
const navigateur = await chromium.launch();
try {
  await mkdir(CAPTURES, { recursive: true });

  // Au téléphone : le début, le milieu, la fin, le nom piégé, puis le téléphone tourné et rendu.
  {
    const { contexte, page, erreurs } = await ouvrirAssistant(navigateur, serveur.url, { donnees: SEPT_GROUPES });
    juger(juge, 'téléphone, Informations', await relever(page), { avant: false, apres: true });
    for (let i = 0; i < 4; i++) await toucher(page, '[data-action="suivant"]');
    juger(juge, 'téléphone, 5e étape', await relever(page), { avant: true, apres: true });
    const textes = await page.evaluate(() => ({
      titre: document.querySelector('#titre-etape').textContent,
      legende: document.querySelector('.etapes-legende').textContent,
      rangee: document.querySelector('[aria-current="step"] .etape-nom').textContent,
      balises: document.querySelectorAll('.etapes b, #titre-etape b').length,
    }));
    juge.exige(
      textes.titre === NOM_PIEGE &&
        textes.rangee === NOM_PIEGE &&
        textes.legende.endsWith(NOM_PIEGE) &&
        !textes.balises,
      `téléphone, nom piégé : ${JSON.stringify(textes)}`,
    );

    // Téléphone tourné, puis rendu : la rangée se recalcule, l'étape en cours reste au milieu.
    await page.setViewportSize({ width: 640, height: 360 });
    await attendreRangee(page);
    const tourne = await relever(page);
    juger(juge, 'téléphone tourné, 5e étape', tourne, { avant: true, apres: true });
    await page.setViewportSize({ width: 360, height: 640 });
    await attendreRangee(page);
    const rendu = await relever(page);
    juger(juge, 'téléphone rendu, 5e étape', rendu, { avant: true, apres: true });
    await verifierAnneau(page, juge, 'téléphone');
    juge.exige(
      Math.abs(tourne.part - rendu.part) > 10,
      `téléphone tourné : la part d’une étape n’a pas changé (${tourne.part} puis ${rendu.part})`,
    );

    // Tourné, retour à Informations par la rangée, puis l'aperçu (Review Focus 5).
    await page.setViewportSize({ width: 640, height: 360 });
    await attendreRangee(page);
    await toucher(page, '.etape:first-child button');
    juger(juge, 'téléphone tourné, retour à Informations', await relever(page), { avant: false, apres: true });
    await toucher(page, '[data-action="apercu"]');
    juger(juge, 'téléphone tourné, aperçu', await relever(page), { avant: true, apres: false });
    await page.setViewportSize({ width: 360, height: 640 });
    await attendreRangee(page);
    juger(juge, 'téléphone, aperçu', await relever(page), { avant: true, apres: false });
    juge.exige(erreurs.length === 0, `téléphone : erreurs dans la page : ${erreurs.join(' | ')}`);
    await contexte.close();
  }

  // Le défilement : doux d'ordinaire (la rangée n'a pas encore bougé juste après l'appui), instantané
  // si l'appareil demande moins d'animations (elle est déjà arrivée).
  for (const mouvement of ['no-preference', 'reduce']) {
    const { contexte, page } = await ouvrirAssistant(navigateur, serveur.url, { donnees: SEPT_GROUPES });
    await page.emulateMedia({ reducedMotion: mouvement });
    for (let i = 0; i < 3; i++) await toucher(page, '[data-action="suivant"]');
    const sitot = await page.evaluate(() => {
      const avant = document.querySelector('.etapes-liste').scrollLeft;
      document.querySelector('[data-action="suivant"]').click();
      return { avant, apres: document.querySelector('.etapes-liste').scrollLeft };
    });
    await attendreRangee(page);
    const arrivee = await page.evaluate(() => document.querySelector('.etapes-liste').scrollLeft);
    const attendu = mouvement === 'reduce' ? arrivee : sitot.avant;
    juge.exige(
      arrivee !== sitot.avant && Math.abs(sitot.apres - attendu) <= 1,
      `défilement (${mouvement}) : ${sitot.avant} → ${sitot.apres} juste après l’appui, ${arrivee} à l’arrivée`,
    );
    await contexte.close();
  }

  // Tablette en portrait et ordinateur : dans la fenêtre, le trait touche son bord.
  for (const format of ['tablette-portrait', 'ordinateur']) {
    const { contexte, page, erreurs } = await ouvrirAssistant(navigateur, serveur.url, {
      format,
      donnees: SEPT_GROUPES,
    });
    juger(juge, `${format}, Informations`, await relever(page), { avant: false, apres: true });
    for (let i = 0; i < 4; i++) await toucher(page, '[data-action="suivant"]');
    juger(juge, `${format}, 5e étape`, await relever(page), { avant: true, apres: true });
    await toucher(page, '[data-action="apercu"]');
    juger(juge, `${format}, aperçu`, await relever(page), { avant: true, apres: false });
    juge.exige(erreurs.length === 0, `${format} : erreurs dans la page : ${erreurs.join(' | ')}`);
    await contexte.close();
  }

  // Témoin : la mesure des erreurs de la fenêtre voit bien une boucle de ResizeObserver provoquée
  // exprès (un observateur qui agrandit ce qu'il observe, à chaque notification).
  {
    const { contexte, page, erreurs } = await ouvrirAssistant(navigateur, serveur.url);
    await page.evaluate(
      () =>
        new Promise(fini => {
          const cible = document.createElement('div');
          document.body.append(cible);
          let n = 0;
          new ResizeObserver(() => {
            cible.style.height = `${20 + ++n}px`;
            if (n > 5) fini();
          }).observe(cible);
          cible.style.height = '10px';
          setTimeout(fini, 500);
        }),
    );
    await page.waitForTimeout(200);
    juge.exige(
      erreurs.some(e => e.includes('ResizeObserver loop')),
      `témoin : la boucle de ResizeObserver provoquée n’est pas vue (${erreurs.join(' | ') || 'aucune erreur'})`,
    );
    await contexte.close();
  }

  // Bibliothèque de départ : tout tient, la rangée de la phase 4.
  for (const format of ['telephone-etroit', 'tablette-portrait']) {
    const { contexte, page } = await ouvrirAssistant(navigateur, serveur.url, { format });
    for (let i = 0; i < 2; i++) await toucher(page, '[data-action="suivant"]');
    const r = await relever(page);
    juge.exige(
      !r.defile && !r.avant?.visible && !r.apres?.visible && r.trait !== r.contour,
      `${format}, bibliothèque de départ : la rangée défile ${JSON.stringify(r)}`,
    );
    await contexte.close();
  }

  // 6 formats × 2 thèmes, au milieu de la rangée (5e étape) ; au téléphone, le début et la fin aussi.
  for (const theme of ['light', 'dark']) {
    for (const format of Object.keys(FORMATS)) {
      const cas = `${format}, ${NOMS_THEME[theme]}`;
      const { contexte, page, sorties, erreurs } = await ouvrirAssistant(navigateur, serveur.url, {
        format,
        theme,
        donnees: SEPT_GROUPES,
      });
      const capturer = async etape => {
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.mouse.move(0, 0);
        await calme(page);
        await page.screenshot({ path: join(CAPTURES, `assistant-rangee-${etape}-${format}-${NOMS_THEME[theme]}.png`) });
      };
      const auTelephone = format === 'telephone-etroit';
      if (auTelephone) await capturer('debut');
      for (let i = 0; i < 4; i++) await toucher(page, '[data-action="suivant"]');
      await capturer('milieu');
      await verifierCommandes(page, juge, cas);
      await verifierBarres(page, juge, cas);
      await page.evaluate(() => {
        for (const cote of ['haut', 'bas', 'gauche', 'droite'])
          document.documentElement.style.removeProperty(`--zone-${cote}`);
      });
      if (auTelephone) {
        await toucher(page, '[data-action="apercu"]');
        await capturer('fin');
      }
      juge.exige(sorties.length === 0, `${cas} : requêtes hors de l’appli : ${sorties.join(', ')}`);
      juge.exige(erreurs.length === 0, `${cas} : erreurs dans la page : ${erreurs.join(' | ')}`);
      await contexte.close();
    }
  }
} finally {
  await navigateur.close();
  await serveur.fermer();
}
juge.conclure(
  'Rangée d’étapes qui défile',
  `${ETAPES} étapes : traits au bord, étape au milieu, 44 px, téléphone tourné, fenêtre, défilement doux ou instantané, bibliothèque de départ, anneau de focus, 6 formats × 2 thèmes`,
);
