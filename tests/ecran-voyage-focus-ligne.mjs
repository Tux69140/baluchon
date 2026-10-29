// Le cadre du focus d'une ligne d'objet (rendu à la ligne quand sa fiche se ferme) entoure toute la ligne, case
// comprise, de l'intérieur et aux coins arrondis : ni coupé par la carte, ni recouvert par les lignes voisines,
// ni posé sur le seul nom (remarques du chef de projet, 2026-10-29, sur ordinateur). Téléphone (accordéon) et ordinateur (trois colonnes).
import { chromium } from 'playwright';
import { calme } from './outils/attente.mjs';
import { ouvrirFiche, ouvrirVoyage, vu } from './outils/ajuster.mjs';
import { fermerEssai } from './outils/bibliotheque.mjs';
import { creerJuge } from './outils/page.mjs';
import { demarrerServeur } from './outils/serveur.mjs';

const juge = creerJuge();
const serveur = await demarrerServeur();
const navigateur = await chromium.launch();

try {
  for (const format of ['telephone', 'ordinateur']) {
    const cas = `${format}, fiche fermée par Échap`;
    const ouvert = await ouvrirVoyage(navigateur, serveur.url, { format });
    const { page } = ouvert;
    const id = await page.evaluate(() => document.querySelectorAll('#app .objet[data-id]')[1].dataset.id);
    await ouvrirFiche(page, id);
    await page.keyboard.press('Escape');
    await page.waitForSelector('dialog.fiche-voyage[open]', { state: 'detached' }).catch(() => {});
    await calme(page);
    const cadre = await page.evaluate(id => {
      const el = document.activeElement;
      const ligne = document.querySelector(`#app .objet[data-id="${CSS.escape(id)}"]`);
      if (!el?.matches(':focus-visible') || !ligne.contains(el)) return { focus: el?.className ?? null };
      // Le cadre entoure toute la ligne (case comprise), à l'intérieur : la ligne le porte, pas le bouton.
      const style = getComputedStyle(ligne);
      return {
        dedans:
          style.outlineStyle === 'solid' &&
          parseFloat(style.outlineWidth) >= 3 &&
          parseFloat(style.outlineOffset) + parseFloat(style.outlineWidth) <= 0 &&
          parseFloat(style.borderTopLeftRadius) > 0 &&
          getComputedStyle(el).outlineStyle === 'none',
        ligne: [style.outlineStyle, style.outlineWidth, style.outlineOffset, style.borderTopLeftRadius],
        bouton: getComputedStyle(el).outlineStyle,
      };
    }, id);
    juge.exige(cadre.dedans === true, `${cas} : le cadre du focus n'entoure pas la ligne de l'intérieur ${vu(cadre)}`);
    await fermerEssai(juge, cas, ouvert);
  }
} finally {
  await navigateur.close();
  await serveur.fermer();
}
juge.conclure('Focus d’une ligne d’objet', 'cadre autour de toute la ligne, au téléphone et à l’ordinateur');
