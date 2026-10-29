// Le cadre du focus d'une ligne d'objet (rendu à la ligne quand sa fiche se ferme) tient en entier dans la
// carte de la liste : ni coupé par son bord, ni recouvert par les lignes voisines (remarque du chef de projet,
// 2026-10-29, sur ordinateur). Téléphone (accordéon) et ordinateur (trois colonnes).
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
      const style = getComputedStyle(el);
      const marge = parseFloat(style.outlineOffset) + parseFloat(style.outlineWidth);
      const r = el.getBoundingClientRect();
      const l = ligne.getBoundingClientRect();
      return {
        dedans:
          r.left - marge >= l.left &&
          r.right + marge <= l.right &&
          r.top - marge >= l.top &&
          r.bottom + marge <= l.bottom,
        cadre: [r.left - marge, r.top - marge, r.right + marge, r.bottom + marge].map(Math.round),
        ligne: [l.left, l.top, l.right, l.bottom].map(Math.round),
      };
    }, id);
    juge.exige(cadre.dedans === true, `${cas} : le cadre du focus déborde de la ligne ${vu(cadre)}`);
    await fermerEssai(juge, cas, ouvert);
  }
} finally {
  await navigateur.close();
  await serveur.fermer();
}
juge.conclure('Focus d’une ligne d’objet', 'cadre entier dans la ligne, au téléphone et à l’ordinateur');
