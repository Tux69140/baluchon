// Le contour du focus clavier se voit (AGENTS.md, WCAG 1.4.11) : c'est le seul repère du jour courant
// quand on parcourt le calendrier au clavier. En clair et en sombre, sa couleur atteint au moins 3:1
// contre la carte, le fond et le gris de la période (ce qui l'entoure), sur un jour de la période et
// sur un bouton. Témoin du calcul : l'ancien bleu ciel, sur la carte claire, est bien sous 3:1.
// Captures du focus sur un jour et sur un bouton, en clair et en sombre.
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { chromium } from 'playwright';
import { demarrerServeur } from './outils/serveur.mjs';
import { CAPTURES, FORMATS, NOMS_THEME, attendreEcran, creerJuge, ouvrir } from './outils/page.mjs';

const MAINTENANT = new Date('2026-10-06T10:00:00');
const MINIMUM = 3;
const VOISINS = ['--carte', '--fond', '--actif'];

// Rapport de contraste WCAG entre deux couleurs « rgb(r, g, b) ».
function contraste(a, b) {
  const luminance = rgb => {
    const [r, g, v] = rgb
      .match(/[\d.]+/g)
      .slice(0, 3)
      .map(n => {
        const c = Number(n) / 255;
        return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
      });
    return 0.2126 * r + 0.7152 * g + 0.0722 * v;
  };
  const [claire, sombre] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (claire + 0.05) / (sombre + 0.05);
}

// La couleur d'un jeton, telle que la page la résout dans son thème.
const couleurs = (page, jetons) =>
  page.evaluate(noms => {
    const sonde = document.createElement('span');
    document.body.append(sonde);
    const vues = Object.fromEntries(
      noms.map(nom => {
        sonde.style.color = `var(${nom})`;
        return [nom, getComputedStyle(sonde).color];
      }),
    );
    sonde.remove();
    return vues;
  }, jetons);

// Le contour de l'élément qui a le focus : visible au clavier, épais, et de quelle couleur.
const contour = page =>
  page.evaluate(() => {
    const el = document.activeElement;
    const s = getComputedStyle(el);
    return {
      visible: el.matches(':focus-visible'),
      style: s.outlineStyle,
      epaisseur: parseFloat(s.outlineWidth),
      couleur: s.outlineColor,
      quoi: el.dataset.jour ?? el.getAttribute('aria-label') ?? el.textContent.trim(),
    };
  });

const juge = creerJuge();
const serveur = await demarrerServeur();
const navigateur = await chromium.launch();
try {
  await mkdir(CAPTURES, { recursive: true });
  for (const theme of ['light', 'dark']) {
    const nomTheme = NOMS_THEME[theme];
    const { contexte, page, erreurs } = await ouvrir(navigateur, serveur.url, {
      taille: FORMATS.telephone,
      theme,
      maintenant: MAINTENANT,
      adresse: '#/nouveau-voyage',
    });
    await attendreEcran(page, 'nouveau-voyage');
    const fonds = await couleurs(page, [...VOISINS, '--ciel']);
    if (theme === 'light')
      juge.exige(
        contraste(fonds['--ciel'], fonds['--carte']) < MINIMUM,
        'témoin : le calcul ne voit pas le bleu ciel trop pâle sur la carte claire',
      );

    // Un jour au milieu de la période, atteint au clavier ; puis le bouton « un voyageur de plus ».
    await page.click('[data-jour="2026-10-10"]');
    await page.click('[data-jour="2026-10-14"]');
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowLeft');
    const jour = await contour(page);
    await page.locator('.calendrier').screenshot({ path: join(CAPTURES, `focus-jour-${nomTheme}.png`) });
    await page.focus('[data-voyageurs="-1"]');
    await page.keyboard.press('Tab');
    const bouton = await contour(page);
    await page.locator('.compteur').screenshot({ path: join(CAPTURES, `focus-bouton-${nomTheme}.png`) });

    for (const [cas, vu] of [
      [`${nomTheme}, jour`, jour],
      [`${nomTheme}, bouton`, bouton],
    ]) {
      juge.exige(
        vu.visible && vu.style === 'solid' && vu.epaisseur >= 2,
        `${cas} : contour absent ou trop fin ${JSON.stringify(vu)}`,
      );
      for (const voisin of VOISINS) {
        const rapport = contraste(vu.couleur, fonds[voisin]);
        juge.exige(
          rapport >= MINIMUM,
          `${cas} (${vu.quoi}) : contour ${vu.couleur} sur ${voisin} ${fonds[voisin]} = ${rapport.toFixed(2)}:1`,
        );
      }
    }
    juge.exige(jour.quoi === '2026-10-12', `${nomTheme} : le focus est sur ${jour.quoi}, attendu le 12`);
    juge.exige(erreurs.length === 0, `${nomTheme} : erreurs dans la page : ${erreurs.join(' | ')}`);
    await contexte.close();
  }
} finally {
  await navigateur.close();
  await serveur.fermer();
}
juge.conclure('Contour du focus', 'au moins 3:1 sur la carte, le fond et la période, en clair et en sombre');
