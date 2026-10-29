// Phase 9 (docs/superpowers/specs/2026-10-29-phase-9-courses-design.md ; maquette docs/maquettes/courses/) :
// l'écran Courses d'un voyage.
// - arrivée par la puce ; titre, nombre d'objets à acheter, cartes dans l'ordre du voyage, objets par nom,
//   quantité ou « 6 / 16 » ;
// - la case ajoute une pièce achetée ; la dernière : grisé ~1 s (un appui de plus n'y fait rien), puis
//   l'objet part et le bandeau « Annuler » au chariot le dit ; « Annuler » le rend, ici comme depuis le
//   voyage revenu (sa pastille réapparaît) ;
// - écriture refusée : le compte d'avant relu et un message au bas de l'écran ;
// - vides « Rien à acheter » et « Courses faites ! », « Retour au voyage », retour système, voyage inconnu ;
// - nom piégé lu tel quel ; cartes en 2 colonnes à 1280 × 800, 3 à 1440 × 900 ;
// - captures claire et sombre aux formats.
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { chromium } from 'playwright';
import { attendreQue, calme } from './outils/attente.mjs';
import { BANDEAU, fr, objetStocke, ouvrirVoyage, remplir, vu } from './outils/ajuster.mjs';
import { fermerEssai } from './outils/bibliotheque.mjs';
import {
  attendreStocke,
  avecMarques,
  caseDe,
  lireCourses,
  objetsVus,
  ouvrirCourses as ouvrirCoursesSur,
  texteBandeau,
} from './outils/courses.mjs';
import {
  CAPTURES,
  NOMS_THEME,
  attendreEcran,
  creerJuge,
  ecrireStockage,
  lireStockage,
  verifierCommandes,
} from './outils/page.mjs';
import { demarrerServeur } from './outils/serveur.mjs';
import { DONNEES, montrerCategorie } from './outils/voyage-essai.mjs';

const c = fr.courses;
const juge = creerJuge();
const serveur = await demarrerServeur();
const navigateur = await chromium.launch();
const capture = (page, nom, format, theme) =>
  page.screenshot({ path: join(CAPTURES, `${nom}-${format}-${NOMS_THEME[theme]}.png`) });
const PIEGE = 'Café <b>moulu</b> & "fort"';
const ouvrirCourses = options => ouvrirCoursesSur(navigateur, serveur.url, options);

try {
  await mkdir(CAPTURES, { recursive: true });

  // Arrivée par la puce du voyage ; ce que l'écran montre.
  {
    const cas = 'arrivée et contenu';
    const ouvert = await ouvrirVoyage(navigateur, serveur.url, { donnees: avecMarques() });
    const { page } = ouvert;
    await page.click('#app [data-action="courses"]');
    await attendreEcran(page, 'courses');
    const vue = await lireCourses(page);
    juge.exige(
      vue.titre === c.titre && vue.icone && vue.details === remplir(c.compte.other, { n: 3 }),
      `${cas} : en-tête ${vu(vue)}`,
    );
    juge.exige(
      vu(vue.cartes.map(carte => [carte.nom, carte.objets.map(o => [o.nom, o.quantite])])) ===
        vu([
          ['Toilette', [['Dentifrice', '1']]],
          [
            'Alimentation',
            [
              ['Café soluble', '1'],
              ['Repas', '6 / 16'],
            ],
          ],
        ]),
      `${cas} : cartes ${vu(vue.cartes)}`,
    );
    // Le retour système ramène au voyage.
    await page.goBack();
    await attendreEcran(page, 'voyage');
    await fermerEssai(juge, cas, ouvert);
  }

  // La case ajoute une pièce ; la dernière : grisé, puis parti, bandeau, « Annuler ».
  {
    const cas = 'acheter';
    const ouvert = await ouvrirCourses();
    const { page } = ouvert;
    await page.click(caseDe('o-rep'));
    const repas = await attendreStocke(page, 'o-rep', 'o.achetes === 7');
    await calme(page);
    const apres = objetsVus(await lireCourses(page)).find(o => o.id === 'o-rep');
    juge.exige(repas && apres?.quantite === '7 / 16' && apres.etat === 'entame', `${cas} : Repas ${vu(apres)}`);
    await page.click(caseDe('o-caf'));
    await attendreStocke(page, 'o-caf', 'o.achetes === 1');
    const grise = objetsVus(await lireCourses(page)).find(o => o.id === 'o-caf');
    await page.click(caseDe('o-caf'));
    juge.exige(grise?.etat === 'plein', `${cas} : Café grisé pendant le répit ${vu(grise)}`);
    await attendreQue(page, () => !document.querySelector('#app .objet[data-id="o-caf"]'), null, { max: 3000 });
    const bandeau = await attendreQue(
      page,
      s => document.querySelector(s)?.matches(':popover-open') && document.querySelector(s).textContent,
      BANDEAU,
    );
    const lu = await texteBandeau(page);
    const cafe = await objetStocke(page, 'o-caf');
    juge.exige(
      bandeau &&
        lu?.texte === remplir(fr.annulation.achete.one, { nom: 'Café soluble', n: 1 }) &&
        lu.chariot.includes('<svg') &&
        cafe.achetes === 1 &&
        (await lireCourses(page)).details === remplir(c.compte.other, { n: 2 }),
      `${cas} : parti ${vu(lu)} ${vu(cafe)}`,
    );
    await page.click(`${BANDEAU} button`);
    const rendu = await attendreStocke(page, 'o-caf', 'o.achetes === 0 && o.aAcheter');
    await attendreQue(page, () => Boolean(document.querySelector('#app .objet[data-id="o-caf"]')));
    juge.exige(Boolean(rendu), `${cas} : rendu par « Annuler » ${vu(rendu)}`);
    await fermerEssai(juge, cas, ouvert);
  }

  // « Annuler » touché une fois revenu au voyage : la pastille y réapparaît.
  {
    const cas = 'annuler depuis le voyage';
    const ouvert = await ouvrirVoyage(navigateur, serveur.url, { donnees: avecMarques() });
    const { page } = ouvert;
    await page.click('#app [data-action="courses"]');
    await attendreEcran(page, 'courses');
    await page.click(caseDe('o-caf'));
    await attendreQue(page, s => document.querySelector(s)?.matches(':popover-open'), BANDEAU);
    await page.click('#app .lien-retour');
    await attendreEcran(page, 'voyage');
    await montrerCategorie(page, 'c-ali');
    const pastille = () =>
      page.evaluate(
        () => document.querySelector('#app .objet[data-id="o-caf"] .pastille-achat')?.textContent.trim() ?? null,
      );
    const avant = await pastille();
    await page.click(`${BANDEAU} button`);
    const apres = await attendreQue(page, () =>
      document.querySelector('#app .objet[data-id="o-caf"] .pastille-achat')?.textContent.trim(),
    );
    juge.exige(avant === null && apres === fr.voyage.aAcheter, `${cas} : pastille ${vu(avant)} → ${vu(apres)}`);
    await fermerEssai(juge, cas, ouvert);
  }

  // Écriture refusée : le compte d'avant relu, un message au bas.
  {
    const cas = 'panne';
    const ouvert = await ouvrirCourses();
    const { page } = ouvert;
    await ecrireStockage(page, { ...(await lireStockage(page)), pannes: ['reglerAchats'] });
    await page.click(caseDe('o-rep'));
    const message = await attendreQue(page, () => document.querySelector('#app .alerte')?.textContent.trim());
    await calme(page);
    const repas = objetsVus(await lireCourses(page)).find(o => o.id === 'o-rep');
    juge.exige(
      message === c.erreurEnregistrement && repas?.quantite === '6 / 16',
      `${cas} : ${vu(message)} ${vu(repas)}`,
    );
    ouvert.erreurs.splice(0, ouvert.erreurs.length, ...ouvert.erreurs.filter(e => !e.includes('Panne simulée')));
    await fermerEssai(juge, cas, ouvert);
  }

  // Les deux vides ; « Retour au voyage ».
  {
    const cas = 'rien à acheter';
    const ouvert = await ouvrirCourses({ donnees: DONNEES });
    const { page } = ouvert;
    const vue = await lireCourses(page);
    juge.exige(vue.vide === c.vide.rien.titre && vue.details === null, `${cas} : ${vu(vue)}`);
    await page.click('#app [data-action="retour-voyage"]');
    await attendreEcran(page, 'voyage');
    await fermerEssai(juge, cas, ouvert);
  }
  {
    const cas = 'courses faites';
    const ouvert = await ouvrirCourses({
      donnees: avecMarques({ 'o-den': { achetes: 1 }, 'o-caf': { achetes: 1 }, 'o-rep': { achetes: 16 } }),
    });
    const vue = await lireCourses(ouvert.page);
    juge.exige(vue.vide === c.vide.faites.titre, `${cas} : ${vu(vue)}`);
    await fermerEssai(juge, cas, ouvert);
  }

  // Voyage inconnu.
  {
    const cas = 'voyage inconnu';
    const ouvert = await ouvrirCourses({ voyageId: 'inconnu' });
    const titre = await ouvert.page.textContent('#app h1');
    juge.exige(titre.trim() === fr.voyage.introuvableTitre, `${cas} : ${vu(titre)}`);
    await fermerEssai(juge, cas, ouvert);
  }

  // Nom piégé, dans la ligne et le bandeau.
  {
    const cas = 'nom piégé';
    const ouvert = await ouvrirCourses({ donnees: avecMarques({ 'o-caf': { nom: PIEGE } }) });
    const { page } = ouvert;
    const cafe = objetsVus(await lireCourses(page)).find(o => o.id === 'o-caf');
    await page.click(caseDe('o-caf'));
    await attendreQue(page, s => document.querySelector(s)?.matches(':popover-open'), BANDEAU, { max: 3000 });
    const bandeau = await texteBandeau(page);
    juge.exige(
      cafe?.nom === PIEGE && cafe.balises === 0 && bandeau?.texte === remplir(fr.annulation.achete.one, { nom: PIEGE }),
      `${cas} : ${vu(cafe)} ${vu(bandeau)}`,
    );
    await fermerEssai(juge, cas, ouvert);
  }

  // Grand format : 2 colonnes de cartes à 1280 × 800, 3 à 1440 × 900 (quatre catégories à acheter).
  const QUATRE = avecMarques({ 'o-tsh': {}, 'o-bil': {} });
  for (const [format, attendues] of [
    ['tablette-paysage', 2],
    ['ordinateur', 3],
  ]) {
    const cas = `colonnes, ${format}`;
    const ouvert = await ouvrirCourses({ format, donnees: QUATRE });
    const colonnes = await ouvert.page.evaluate(
      () =>
        new Set(
          [...document.querySelectorAll('.courses-categorie')].map(e => Math.round(e.getBoundingClientRect().left)),
        ).size,
    );
    juge.exige(colonnes === attendues, `${cas} : ${colonnes} colonnes`);
    await fermerEssai(juge, cas, ouvert);
  }

  // Captures : la liste aux formats, les vides au téléphone et à l'ordinateur ; clair et sombre.
  for (const theme of ['light', 'dark']) {
    for (const format of ['telephone', 'tablette-portrait', 'tablette-paysage', 'ordinateur']) {
      const cas = `captures, ${format}, ${NOMS_THEME[theme]}`;
      const ouvert = await ouvrirCourses({ format, theme, donnees: QUATRE });
      await verifierCommandes(ouvert.page, juge, cas);
      await capture(ouvert.page, 'courses-liste', format, theme);
      await fermerEssai(juge, cas, ouvert);
    }
    for (const format of ['telephone', 'ordinateur'])
      for (const [nom, donnees] of [
        ['rien', DONNEES],
        ['faites', avecMarques({ 'o-den': { achetes: 1 }, 'o-caf': { achetes: 1 }, 'o-rep': { achetes: 16 } })],
      ]) {
        const cas = `captures ${nom}, ${format}, ${NOMS_THEME[theme]}`;
        const ouvert = await ouvrirCourses({ format, theme, donnees });
        await verifierCommandes(ouvert.page, juge, cas);
        await capture(ouvert.page, `courses-vide-${nom}`, format, theme);
        await fermerEssai(juge, cas, ouvert);
      }
  }
} finally {
  await navigateur.close();
  await serveur.fermer();
}

juge.conclure(
  'L’écran Courses',
  'contenu, achat pièce par pièce, répit, bandeau « Annuler », panne, vides, retour, nom piégé, colonnes, captures',
);
