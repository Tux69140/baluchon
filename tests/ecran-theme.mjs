// Phase 12 (docs/PLAN.md), thème : le choix « Appareil », « Clair » ou « Sombre » est retenu sur l'appareil
// et appliqué dès le lancement.
// - Choix « Sombre » retenu : après rechargement, data-theme="dark" est posé sur la racine AVANT que
//   #app reçoive son premier contenu (aucun dessin clair entre deux), même si l'appareil est en clair.
// - Choix « Clair » : data-theme="light" de la même façon, même si l'appareil est en sombre ; il ne
//   bouge plus quand l'appareil change de thème.
// - « Appareil » (ou aucun choix, ou choix inconnu) : aucun attribut data-theme ; la page suit
//   l'appareil en direct (page.emulateMedia), et reglerBarres reçoit la bonne valeur à chaque
//   changement, une seule fois par changement.
// - Un choix forcé n'est pas bousculé par l'appareil : reglerBarres ne reçoit rien de plus.
// Le thème du bureau Debian n'est jamais touché : seul emulateMedia de Playwright change de thème.
import { chromium } from 'playwright';
import { demarrerServeur } from './outils/serveur.mjs';
import { attendreEcran, creerJuge, ouvrir } from './outils/page.mjs';

const CLE_THEME = 'baluchon-theme';
const juge = creerJuge();
const serveur = await demarrerServeur();
const navigateur = await chromium.launch();
const TAILLE = { width: 800, height: 1280 };
const DONNEES = { voyages: [] };

// Posé avant le chargement : le thème de la racine au moment où #app reçoit du contenu pour la première fois.
const OBSERVER = () => {
  window.themeAuPremierContenu = undefined;
  const guetter = () => {
    const app = document.querySelector('#app');
    if (!app) return requestAnimationFrame(guetter);
    new MutationObserver(() => {
      if (window.themeAuPremierContenu === undefined && app.childNodes.length)
        window.themeAuPremierContenu = document.documentElement.dataset.theme ?? null;
    }).observe(app, { childList: true, subtree: true });
  };
  guetter();
};

const lire = page =>
  page.evaluate(() => ({
    theme: document.documentElement.dataset.theme ?? null,
    premier: window.themeAuPremierContenu,
    barres: window.barresReglees ?? null,
    fond: getComputedStyle(document.body).backgroundColor,
  }));

async function ouvrirAvec(cas, { choix, appareil }) {
  const ouvert = await ouvrir(navigateur, serveur.url, { taille: TAILLE, theme: appareil, donnees: DONNEES });
  const { page } = ouvert;
  if (choix !== undefined) await page.evaluate(([cle, v]) => localStorage.setItem(cle, v), [CLE_THEME, choix]);
  await page.addInitScript(OBSERVER);
  await page.reload();
  await attendreEcran(page, 'voyages');
  return ouvert;
}

const clair = fond => /^rgb\((24[0-9]|25[0-5])/.test(fond);

// « Sombre » retenu, appareil en clair.
{
  const { page, contexte, erreurs } = await ouvrirAvec('sombre', { choix: 'sombre', appareil: 'light' });
  const e = await lire(page);
  juge.exige(e.theme === 'dark', `Sombre : data-theme = ${e.theme}`);
  juge.exige(e.premier === 'dark', `Sombre : au premier contenu, data-theme = ${e.premier}`);
  juge.exige(!clair(e.fond), `Sombre : fond clair ${e.fond}`);
  juge.exige(JSON.stringify(e.barres) === '[true]', `Sombre : barres ${JSON.stringify(e.barres)}`);
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.emulateMedia({ colorScheme: 'light' });
  const apres = await lire(page);
  juge.exige(apres.theme === 'dark', `Sombre forcé : l'appareil l'a fait bouger (${apres.theme})`);
  juge.exige(JSON.stringify(apres.barres) === '[true]', `Sombre forcé : barres ${JSON.stringify(apres.barres)}`);
  juge.exige(erreurs.length === 0, `Sombre : erreurs ${erreurs.join(' | ')}`);
  await contexte.close();
}

// « Clair » retenu, appareil en sombre.
{
  const { page, contexte, erreurs } = await ouvrirAvec('clair', { choix: 'clair', appareil: 'dark' });
  const e = await lire(page);
  juge.exige(e.theme === 'light' && e.premier === 'light', `Clair : ${JSON.stringify(e)}`);
  juge.exige(clair(e.fond), `Clair : fond sombre ${e.fond}`);
  juge.exige(JSON.stringify(e.barres) === '[false]', `Clair : barres ${JSON.stringify(e.barres)}`);
  await page.emulateMedia({ colorScheme: 'light' });
  await page.emulateMedia({ colorScheme: 'dark' });
  const apres = await lire(page);
  juge.exige(apres.theme === 'light', `Clair forcé : l'appareil l'a fait bouger (${apres.theme})`);
  juge.exige(JSON.stringify(apres.barres) === '[false]', `Clair forcé : barres ${JSON.stringify(apres.barres)}`);
  juge.exige(erreurs.length === 0, `Clair : erreurs ${erreurs.join(' | ')}`);
  await contexte.close();
}

// « Appareil », « aucun choix » et « choix inconnu » : pas d'attribut, la page suit l'appareil.
for (const [cas, choix] of [
  ['appareil', 'appareil'],
  ['aucun choix', undefined],
  ['choix inconnu', 'violet'],
]) {
  const { page, contexte, erreurs } = await ouvrirAvec(cas, { choix, appareil: 'light' });
  const e = await lire(page);
  juge.exige(e.theme === null && e.premier === null, `${cas} : attribut posé ${JSON.stringify(e)}`);
  juge.exige(clair(e.fond), `${cas} : fond sombre en clair ${e.fond}`);
  juge.exige(JSON.stringify(e.barres) === '[false]', `${cas} : barres ${JSON.stringify(e.barres)}`);
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.waitForFunction(() => window.barresReglees.length === 2);
  const sombre = await lire(page);
  juge.exige(sombre.theme === null, `${cas} : attribut posé en sombre ${sombre.theme}`);
  juge.exige(!clair(sombre.fond), `${cas} : page restée claire ${sombre.fond}`);
  juge.exige(JSON.stringify(sombre.barres) === '[false,true]', `${cas} : barres ${JSON.stringify(sombre.barres)}`);
  await page.emulateMedia({ colorScheme: 'light' });
  await page.waitForFunction(() => window.barresReglees.length === 3);
  const retour = await lire(page);
  juge.exige(clair(retour.fond), `${cas} : page restée sombre ${retour.fond}`);
  juge.exige(
    JSON.stringify(retour.barres) === '[false,true,false]',
    `${cas} : barres ${JSON.stringify(retour.barres)}`,
  );
  juge.exige(erreurs.length === 0, `${cas} : erreurs ${erreurs.join(' | ')}`);
  await contexte.close();
}

// Passer de « Sombre » à « Appareil » en cours de route retire l'attribut et suit l'appareil.
{
  const { page, contexte } = await ouvrirAvec('bascule', { choix: 'sombre', appareil: 'light' });
  const bascule = await page.evaluate(async () => {
    const { appliquerTheme } = await import('/src/ecrans/theme.js');
    const { ouvrirStockage } = await import('/src/stockage/index.js');
    const stockage = await ouvrirStockage();
    stockage.ecrireTheme('appareil');
    appliquerTheme(stockage);
    return { theme: document.documentElement.dataset.theme ?? null, barres: window.barresReglees };
  });
  juge.exige(bascule.theme === null, `Bascule : attribut resté ${bascule.theme}`);
  juge.exige(JSON.stringify(bascule.barres) === '[true,false]', `Bascule : barres ${JSON.stringify(bascule.barres)}`);
  await contexte.close();
}

await navigateur.close();
await serveur.fermer();
juge.conclure('thème', 'choix retenu, appliqué avant le premier dessin, appareil suivi en direct, barres réglées');
