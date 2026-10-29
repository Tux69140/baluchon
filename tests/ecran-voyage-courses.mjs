// Phase 9 (docs/superpowers/specs/2026-10-29-phase-9-courses-design.md ; maquette docs/maquettes/courses/) :
// la marque « à acheter » dans la liste du voyage.
// - la puce « Courses · N » à côté du filtre mène à l'écran Courses ; sans rien à acheter, « Courses » seul ;
// - la pastille (icône et mot) : « à acheter », ou « encore N à acheter » après un achat partiel ; aucune
//   sur un objet non marqué ou tout acheté ; le nom de la ligne la reprend ;
// - l'interrupteur « À acheter » de la fiche l'éteint (gardé à la relance) et la rallume ; rallumé sur un
//   objet tout acheté, il repart de zéro ;
// - un objet marqué mis en entier dans le sac compte comme acheté, et le vider ne le remet pas à acheter ;
// - une quantité augmentée sur un objet tout acheté le remet à acheter pour ce qui manque ;
// - captures claire et sombre de la liste et de la fiche aux formats.
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { chromium } from 'playwright';
import { attendreQue, calme } from './outils/attente.mjs';
import { FICHE, fr, ligne, ouvrirFiche, ouvrirVoyage, remplir, toucherFiche, vu } from './outils/ajuster.mjs';
import { fermerEssai } from './outils/bibliotheque.mjs';
import { CAPTURES, NOMS_THEME, creerJuge, verifierCommandes } from './outils/page.mjs';
import { demarrerServeur } from './outils/serveur.mjs';
import { DONNEES, montrerCategorie } from './outils/voyage-essai.mjs';

const v = fr.voyage;
const f = fr.fiche;
const juge = creerJuge();
const serveur = await demarrerServeur();
const navigateur = await chromium.launch();
const capture = (page, nom, format, theme) =>
  page.screenshot({ path: join(CAPTURES, `${nom}-${format}-${NOMS_THEME[theme]}.png`) });

// Café soluble (1, partagé) à acheter ; Repas (16) à acheter, 6 achetés.
const marque = (champs = {}) => ({
  ...DONNEES,
  objetsDuVoyage: DONNEES.objetsDuVoyage.map(o => {
    if (o.id === 'o-caf') return { ...o, aAcheter: true, ...champs['o-caf'] };
    if (o.id === 'o-rep') return { ...o, aAcheter: true, achetes: 6, ...champs['o-rep'] };
    return o;
  }),
});
const ouvrirEssai = (options = {}) => ouvrirVoyage(navigateur, serveur.url, { donnees: marque(), ...options });

// La puce Courses et la pastille d'une ligne (texte, icône, nom accessible).
const lirePuce = page =>
  page.evaluate(() => {
    const a = document.querySelector('#app .outils [data-action="courses"]');
    return (
      a && { texte: a.textContent.trim(), adresse: a.getAttribute('href'), icone: Boolean(a.querySelector('svg')) }
    );
  });
const lirePastille = (page, id) =>
  page.evaluate(id => {
    const li = document.querySelector(`#app .objet[data-id="${CSS.escape(id)}"]`);
    const p = li?.querySelector('.pastille-achat');
    return {
      texte: p?.textContent.trim() ?? null,
      icone: Boolean(p?.querySelector('svg')),
      nom: li?.querySelector('.objet-corps').getAttribute('aria-label') ?? null,
    };
  }, id);
const lireInterrupteur = page =>
  page.evaluate(s => {
    const b = document.querySelector(`${s} [data-fiche="a-acheter"]`);
    const ligne = b?.closest('.ligne-reglage');
    return b && { coche: b.getAttribute('aria-checked'), aide: ligne.querySelector('small').textContent.trim() };
  }, FICHE);
const attendreStocke = (page, id, condition) =>
  attendreQue(
    page,
    ([id, c]) => {
      const o = JSON.parse(localStorage.getItem('baluchon-essai')).objetsDuVoyage.find(x => x.id === id);
      return new Function('o', `return ${c}`)(o) && o;
    },
    [id, condition],
  );

try {
  await mkdir(CAPTURES, { recursive: true });

  // La puce, les pastilles et leur lecture.
  {
    const cas = 'puce et pastilles';
    const ouvert = await ouvrirEssai();
    const { page } = ouvert;
    const puce = await lirePuce(page);
    juge.exige(
      puce?.texte === remplir(v.coursesCompte, { n: 2 }) && puce.adresse === '#/voyage/v1/courses' && puce.icone,
      `${cas} : puce ${vu(puce)}`,
    );
    await montrerCategorie(page, 'c-ali');
    const cafe = await lirePastille(page, 'o-caf');
    const repas = await lirePastille(page, 'o-rep');
    const gourde = await lirePastille(page, 'o-gou');
    juge.exige(cafe.texte === v.aAcheter && cafe.icone && cafe.nom.includes(v.aAcheter), `${cas} : Café ${vu(cafe)}`);
    const encore = remplir(v.encoreAAcheter, { n: 10 });
    juge.exige(repas.texte === encore && repas.nom.includes(encore), `${cas} : Repas ${vu(repas)}`);
    juge.exige(gourde.texte === null, `${cas} : Gourde sans pastille ${vu(gourde)}`);
    await fermerEssai(juge, cas, ouvert);
  }

  // Sans rien à acheter : « Courses » seul ; la puce mène à l'écran Courses.
  {
    const cas = 'rien à acheter';
    const ouvert = await ouvrirVoyage(navigateur, serveur.url);
    const { page } = ouvert;
    const puce = await lirePuce(page);
    juge.exige(puce?.texte === v.courses, `${cas} : puce ${vu(puce)}`);
    await page.click('#app [data-action="courses"]');
    await attendreQue(page, () => location.hash === '#/voyage/v1/courses');
    await fermerEssai(juge, cas, ouvert);
  }

  // L'interrupteur : éteint, la pastille part et le reste à la relance ; rallumé, elle revient.
  {
    const cas = 'interrupteur';
    const ouvert = await ouvrirEssai();
    const { page } = ouvert;
    await ouvrirFiche(page, 'o-rep');
    const repas = await lireInterrupteur(page);
    juge.exige(
      repas?.coche === 'true' && repas.aide === remplir(f.achetesSur.other, { n: 6, total: 16 }),
      `${cas} : Repas ${vu(repas)}`,
    );
    await page.keyboard.press('Escape');
    await attendreQue(page, s => !document.querySelector(s), FICHE);
    await ouvrirFiche(page, 'o-caf');
    const avant = await lireInterrupteur(page);
    juge.exige(avant?.coche === 'true' && avant.aide === f.aAcheterAide, `${cas} : Café ${vu(avant)}`);
    await toucherFiche(page, 'a-acheter');
    const eteint = await attendreStocke(page, 'o-caf', 'o.aAcheter === false');
    await calme(page);
    juge.exige(
      eteint && (await lireInterrupteur(page))?.coche === 'false' && (await lirePastille(page, 'o-caf')).texte === null,
      `${cas} : éteint ${vu(eteint)} ${vu(await lireInterrupteur(page))}`,
    );
    juge.exige((await lirePuce(page))?.texte === remplir(v.coursesCompte, { n: 1 }), `${cas} : puce après extinction`);
    await page.reload();
    await attendreQue(page, () => document.querySelector('#app')?.dataset.ecran === 'voyage');
    await montrerCategorie(page, 'c-ali');
    juge.exige((await lirePastille(page, 'o-caf')).texte === null, `${cas} : toujours éteint après relance`);
    await ouvrirFiche(page, 'o-caf');
    await toucherFiche(page, 'a-acheter');
    await attendreStocke(page, 'o-caf', 'o.aAcheter === true');
    await calme(page);
    juge.exige((await lirePastille(page, 'o-caf')).texte === v.aAcheter, `${cas} : rallumé`);
    await fermerEssai(juge, cas, ouvert);
  }

  // Rallumer sur un objet tout acheté repart de zéro.
  {
    const cas = 'rallumer tout acheté';
    const ouvert = await ouvrirEssai({ donnees: marque({ 'o-rep': { achetes: 16 } }) });
    const { page } = ouvert;
    await montrerCategorie(page, 'c-ali');
    juge.exige((await lirePastille(page, 'o-rep')).texte === null, `${cas} : pas de pastille`);
    await ouvrirFiche(page, 'o-rep');
    juge.exige((await lireInterrupteur(page))?.coche === 'false', `${cas} : interrupteur éteint`);
    await toucherFiche(page, 'a-acheter');
    const stocke = await attendreStocke(page, 'o-rep', 'o.aAcheter && o.achetes === 0');
    await calme(page);
    juge.exige(stocke && (await lirePastille(page, 'o-rep')).texte === v.aAcheter, `${cas} : ${vu(stocke)}`);
    await fermerEssai(juge, cas, ouvert);
  }

  // Sac plein = acheté ; vider ne remet pas à acheter.
  {
    const cas = 'sac plein';
    const ouvert = await ouvrirEssai();
    const { page } = ouvert;
    await montrerCategorie(page, 'c-ali');
    await page.click('#app .objet[data-id="o-caf"] .case');
    const plein = await attendreStocke(page, 'o-caf', 'o.dansLeSac === 1');
    await calme(page);
    juge.exige(
      plein?.achetes === 1 && (await lirePastille(page, 'o-caf')).texte === null,
      `${cas} : coché ${vu(plein)} ${vu(await lirePastille(page, 'o-caf'))}`,
    );
    await page.click('#app .objet[data-id="o-caf"] .case');
    const vide = await attendreStocke(page, 'o-caf', 'o.dansLeSac === 0');
    await calme(page);
    juge.exige(vide?.achetes === 1 && (await lirePastille(page, 'o-caf')).texte === null, `${cas} : vidé ${vu(vide)}`);
    await fermerEssai(juge, cas, ouvert);
  }

  // Quantité augmentée sur un objet tout acheté : « encore 2 à acheter ».
  {
    const cas = 'quantité augmentée';
    const ouvert = await ouvrirEssai({ donnees: marque({ 'o-rep': { achetes: 16 } }) });
    const { page } = ouvert;
    await ouvrirFiche(page, 'o-rep');
    await toucherFiche(page, 'quantite-plus');
    await toucherFiche(page, 'quantite-plus');
    const stocke = await attendreStocke(page, 'o-rep', 'o.quantite === 18');
    await page.keyboard.press('Escape');
    await attendreQue(page, s => !document.querySelector(s), FICHE);
    await calme(page);
    const pastille = await lirePastille(page, 'o-rep');
    juge.exige(
      stocke?.achetes === 16 && pastille.texte === remplir(v.encoreAAcheter, { n: 2 }),
      `${cas} : ${vu(stocke)} ${vu(pastille)} ${vu(await ligne(page, 'o-rep'))}`,
    );
    await fermerEssai(juge, cas, ouvert);
  }

  // Captures : la liste (Alimentation) et la fiche de Repas, aux formats, claire et sombre.
  for (const theme of ['light', 'dark'])
    for (const format of ['telephone', 'tablette-portrait', 'tablette-paysage', 'ordinateur']) {
      const cas = `captures, ${format}, ${NOMS_THEME[theme]}`;
      const ouvert = await ouvrirEssai({ format, theme });
      const { page } = ouvert;
      await montrerCategorie(page, 'c-ali');
      await page.evaluate(() =>
        document.querySelector('#app .objet[data-id="o-rep"]')?.scrollIntoView({ block: 'center' }),
      );
      await calme(page);
      await verifierCommandes(page, juge, cas);
      await capture(page, 'voyage-courses-liste', format, theme);
      await ouvrirFiche(page, 'o-rep');
      await verifierCommandes(page, juge, `${cas}, fiche`);
      await capture(page, 'voyage-courses-fiche', format, theme);
      await fermerEssai(juge, cas, ouvert);
    }
} finally {
  await navigateur.close();
  await serveur.fermer();
}

juge.conclure('La marque « à acheter » dans le voyage', 'puce, pastilles, interrupteur, sac plein, quantité, captures');
