// Un objet entièrement dans le sac n'est pas rayé (on croirait qu'il est supprimé) : sa case cochée et son nom
// en gris doux disent qu'il est emballé (décision du chef de projet, 2026-10-29).
import { chromium } from 'playwright';
import { ouvrirVoyage, vu } from './outils/ajuster.mjs';
import { fermerEssai } from './outils/bibliotheque.mjs';
import { creerJuge } from './outils/page.mjs';
import { demarrerServeur } from './outils/serveur.mjs';

const juge = creerJuge();
const serveur = await demarrerServeur();
const navigateur = await chromium.launch();

try {
  const cas = 'téléphone, objet plein';
  const ouvert = await ouvrirVoyage(navigateur, serveur.url, { format: 'telephone' });
  const { page } = ouvert;
  const vue = await page.evaluate(() => {
    const nom = etat => document.querySelector(`#app .objet[data-etat="${etat}"] .objet-nom`);
    const plein = nom('plein');
    const vide = nom('vide');
    if (!plein || !vide) return null;
    const style = getComputedStyle(plein);
    return {
      rayure: style.textDecorationLine,
      couleurPlein: style.color,
      couleurVide: getComputedStyle(vide).color,
    };
  });
  juge.exige(
    vue && vue.rayure === 'none' && vue.couleurPlein !== vue.couleurVide,
    `${cas} : nom rayé ou pas grisé ${vu(vue)}`,
  );
  await fermerEssai(juge, cas, ouvert);
} finally {
  await navigateur.close();
  await serveur.fermer();
}
juge.conclure('Objet emballé', 'nom grisé, pas rayé');
