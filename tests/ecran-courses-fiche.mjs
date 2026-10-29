// Phase 9 (docs/superpowers/specs/2026-10-29-phase-9-courses-design.md ; maquette docs/maquettes/courses/,
// état « fiche-achat ») : la fiche d'achat, ouverte par la ligne d'un objet de l'écran Courses.
// - nom en titre, catégorie dessous, « Acheté » 6 « sur 16 » ; + et − écrivent ; − inactif à 0 ;
// - « Tout acheté » ferme la fiche, l'objet part après la seconde de répit avec « Repas : achetés (16) » ;
//   + jusqu'à la quantité fait de même ;
// - l'interrupteur éteint ferme la fiche, l'objet part avec « Pain : plus à acheter » ; « Annuler » le
//   remet marqué ;
// - le retour système ferme la fiche sans rien écrire ; nom piégé lu tel quel ;
// - captures claire et sombre au téléphone et à 1280 × 800.
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { chromium } from 'playwright';
import { attendreQue, calme } from './outils/attente.mjs';
import { BANDEAU, fr, objetStocke, remplir, vu } from './outils/ajuster.mjs';
import { fermerEssai } from './outils/bibliotheque.mjs';
import { attendreStocke, avecMarques, lireCourses, objetsVus, ouvrirCourses, texteBandeau } from './outils/courses.mjs';
import { CAPTURES, NOMS_THEME, creerJuge, verifierCommandes } from './outils/page.mjs';
import { demarrerServeur } from './outils/serveur.mjs';

const a = fr.achat;
const FICHE = 'dialog.fiche-achat';
const juge = creerJuge();
const serveur = await demarrerServeur();
const navigateur = await chromium.launch();
const ouvrirEssai = (options = {}) => ouvrirCourses(navigateur, serveur.url, options);
const capture = (page, nom, format, theme) =>
  page.screenshot({ path: join(CAPTURES, `${nom}-${format}-${NOMS_THEME[theme]}.png`) });
const PIEGE = 'Repas <b>chauds</b> & "secs"';

async function ouvrirFiche(page, id) {
  await page.click(`#app .objet[data-id="${id}"] .objet-corps`);
  await attendreQue(page, s => document.querySelector(`${s}[open]`) !== null, FICHE);
  await calme(page);
}
const lireFiche = page =>
  page.evaluate(s => {
    const d = [...document.querySelectorAll(s)].find(x => x.open && !('fermeture' in x.dataset));
    if (!d) return null;
    const texte = el => el?.textContent.replace(/[ \t\r\n]+/g, ' ').trim() ?? null;
    return {
      titre: d.querySelector('h2').textContent,
      balises: d.querySelectorAll('h2 *').length,
      ligne: texte(d.querySelector('.fiche-regle')),
      bloc: texte(d.querySelector('.fiche-bloc h3')),
      achetes: texte(d.querySelector('.compteur output')),
      sur: texte(d.querySelector('.compteur-total')),
      tout: texte(d.querySelector('[data-achat="tout"]')),
      interrupteur: d.querySelector('[data-achat="a-acheter"]')?.getAttribute('aria-checked') ?? null,
      aide: texte(d.querySelector('.fiche-ajuster small')),
      desactives: [...d.querySelectorAll('[aria-disabled="true"]')].map(b => b.dataset.achat).join(),
    };
  }, FICHE);
const toucher = (page, quoi) => page.click(`${FICHE} [data-achat="${quoi}"]`);
const fermee = page => attendreQue(page, s => !document.querySelector(s), FICHE);

try {
  await mkdir(CAPTURES, { recursive: true });

  // Ce que montre la fiche ; + et − écrivent ; − inactif à 0.
  {
    const cas = 'contenu et compteur';
    const ouvert = await ouvrirEssai();
    const { page } = ouvert;
    await ouvrirFiche(page, 'o-rep');
    const vue = await lireFiche(page);
    juge.exige(
      vue?.titre === 'Repas' &&
        vue.ligne === 'Alimentation' &&
        vue.bloc === a.titre &&
        vue.achetes === '6' &&
        vue.sur === remplir(a.sur, { total: 16 }) &&
        vue.tout === a.tout &&
        vue.interrupteur === 'true' &&
        vue.aide === a.aAcheterAide &&
        vue.desactives === '',
      `${cas} : ${vu(vue)}`,
    );
    await toucher(page, 'plus');
    await attendreStocke(page, 'o-rep', 'o.achetes === 7');
    await toucher(page, 'moins');
    await toucher(page, 'moins');
    const stocke = await attendreStocke(page, 'o-rep', 'o.achetes === 5');
    await calme(page);
    juge.exige(
      stocke &&
        (await lireFiche(page))?.achetes === '5' &&
        objetsVus(await lireCourses(page)).find(o => o.id === 'o-rep')?.quantite === '5 / 16',
      `${cas} : après + − − ${vu(await lireFiche(page))}`,
    );
    await page.keyboard.press('Escape');
    await fermee(page);
    await ouvrirFiche(page, 'o-caf');
    juge.exige((await lireFiche(page))?.desactives === 'moins', `${cas} : − inactif à 0 ${vu(await lireFiche(page))}`);
    await fermerEssai(juge, cas, ouvert);
  }

  // « Tout acheté » : la fiche se ferme, l'objet part après le répit, avec le bandeau.
  {
    const cas = 'tout acheté';
    const ouvert = await ouvrirEssai();
    const { page } = ouvert;
    await ouvrirFiche(page, 'o-rep');
    await toucher(page, 'tout');
    await fermee(page);
    await attendreStocke(page, 'o-rep', 'o.achetes === 16');
    await attendreQue(page, () => !document.querySelector('#app .objet[data-id="o-rep"]'), null, { max: 3000 });
    const bandeau = await attendreQue(page, s => document.querySelector(s)?.matches(':popover-open'), BANDEAU);
    const lu = await texteBandeau(page);
    juge.exige(
      bandeau && lu?.texte === remplir(fr.annulation.achete.other, { nom: 'Repas', n: 16 }),
      `${cas} : ${vu(lu)}`,
    );
    await fermerEssai(juge, cas, ouvert);
  }

  // + jusqu'à la quantité : de même.
  {
    const cas = '+ jusqu’au bout';
    const ouvert = await ouvrirEssai();
    const { page } = ouvert;
    await ouvrirFiche(page, 'o-caf');
    await toucher(page, 'plus');
    await fermee(page);
    await attendreStocke(page, 'o-caf', 'o.achetes === 1');
    await attendreQue(page, s => document.querySelector(s)?.matches(':popover-open'), BANDEAU, { max: 3000 });
    juge.exige(
      (await texteBandeau(page))?.texte === remplir(fr.annulation.achete.one, { nom: 'Café soluble' }),
      `${cas} : ${vu(await texteBandeau(page))}`,
    );
    await fermerEssai(juge, cas, ouvert);
  }

  // L'interrupteur éteint : l'objet part avec « plus à acheter » ; « Annuler » le remet marqué.
  {
    const cas = 'interrupteur';
    const ouvert = await ouvrirEssai();
    const { page } = ouvert;
    await ouvrirFiche(page, 'o-den');
    await toucher(page, 'a-acheter');
    await fermee(page);
    const eteint = await attendreStocke(page, 'o-den', 'o.aAcheter === false');
    await attendreQue(page, s => document.querySelector(s)?.matches(':popover-open'), BANDEAU);
    juge.exige(
      eteint &&
        (await texteBandeau(page))?.texte === remplir(fr.annulation.plusAAcheter, { nom: 'Dentifrice' }) &&
        !objetsVus(await lireCourses(page)).some(o => o.id === 'o-den'),
      `${cas} : ${vu(await texteBandeau(page))}`,
    );
    await page.click(`${BANDEAU} button`);
    const rendu = await attendreStocke(page, 'o-den', 'o.aAcheter === true');
    await attendreQue(page, () => Boolean(document.querySelector('#app .objet[data-id="o-den"]')));
    juge.exige(Boolean(rendu), `${cas} : rendu ${vu(rendu)}`);
    await fermerEssai(juge, cas, ouvert);
  }

  // Retour système : la fiche se ferme, rien n'est écrit, l'écran reste.
  {
    const cas = 'retour système';
    const ouvert = await ouvrirEssai();
    const { page } = ouvert;
    await ouvrirFiche(page, 'o-rep');
    await page.goBack();
    await fermee(page);
    await calme(page);
    const repas = await objetStocke(page, 'o-rep');
    juge.exige(
      repas.achetes === 6 && (await page.evaluate(() => document.querySelector('#app')?.dataset.ecran)) === 'courses',
      `${cas} : ${vu(repas)}`,
    );
    await fermerEssai(juge, cas, ouvert);
  }

  // Nom piégé.
  {
    const cas = 'nom piégé';
    const ouvert = await ouvrirEssai({ donnees: avecMarques({ 'o-rep': { achetes: 6, nom: PIEGE } }) });
    const { page } = ouvert;
    await ouvrirFiche(page, 'o-rep');
    const vue = await lireFiche(page);
    juge.exige(vue?.titre === PIEGE && vue.balises === 0, `${cas} : ${vu(vue)}`);
    await fermerEssai(juge, cas, ouvert);
  }

  // Captures.
  for (const theme of ['light', 'dark'])
    for (const format of ['telephone', 'tablette-paysage']) {
      const cas = `captures, ${format}, ${NOMS_THEME[theme]}`;
      const ouvert = await ouvrirEssai({ format, theme });
      await ouvrirFiche(ouvert.page, 'o-rep');
      await verifierCommandes(ouvert.page, juge, cas);
      await capture(ouvert.page, 'courses-fiche', format, theme);
      await fermerEssai(juge, cas, ouvert);
    }
} finally {
  await navigateur.close();
  await serveur.fermer();
}

juge.conclure('La fiche d’achat', 'contenu, compteur, tout acheté, interrupteur, retour système, nom piégé, captures');
