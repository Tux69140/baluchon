// L'écran d'un voyage sur tablette et ordinateur (maquette validée le 2026-10-27,
// docs/maquettes/grand-ecran/ ; règles dans docs/superpowers/specs/2026-10-27-grand-ecran-design.md).
// - ordinateur et portable : trois colonnes (voyage 320 px | menu 360 px | liste), centrées ; le titre
//   de la liste n'est que lu ; une seule carte de choix porte aria-current, celle de la liste montrée ;
//   un long menu défile sans bouger la liste ;
// - tablettes, portrait compris : le repli, tuiles (4 par rangée en 1280 px, 2 en 800 px) puis la liste
//   et son titre visible ; avec 11 catégories, la liste commence à l'écran ;
// - toucher une tuile montre ses objets, la marque choisie et lui laisse le focus ; si la liste commence
//   dans la moitié basse de l'écran (600 × 600), elle monte jusqu'à 16 px du haut, sans voler le focus ;
//   témoin : sur la tablette, rien ne défile ;
// - voyage sans objet : l'écran vide d'aujourd'hui, centré.
// 4 formats × 2 thèmes : cibles de 44 px, rien sous 13 px, pas de défilement de côté, rien sous les
// barres système, captures. Les gestes (filtre, tampon, fiche, rotation, clavier, bandeau « Annuler ») :
// tests/ecran-voyage-grand-format-gestes.mjs.
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { chromium } from 'playwright';
import { calme } from './outils/attente.mjs';
import { demarrerServeur } from './outils/serveur.mjs';
import { CAPTURES, NOMS_THEME, creerJuge, verifierBarres, verifierCommandes } from './outils/page.mjs';
import { GRANDS, cat, focusActuel, lire, ouvrirVoyage, petitsTextes, toucher } from './outils/voyage-grand-format.mjs';

const juge = creerJuge();
const serveur = await demarrerServeur();
const navigateur = await chromium.launch();
const vu = e => JSON.stringify(e);
const ouvrirSur = (voyageId, options) => ouvrirVoyage(navigateur, serveur.url, voyageId, options);
const CINQ = ['vet', 'toi', 'ali', 'pap', 'cam'].map(cle => cat('v1', cle));
const REPLI = new Set(['tablette-paysage', 'tablette-portrait']);
const PAR_RANGEE = { 'tablette-paysage': 4, 'tablette-portrait': 2 };

// Ce que tout écran doit tenir, puis sa capture.
async function verifierEtCapturer(ouvert, cas, nom) {
  const { page, sorties, erreurs } = ouvert;
  await verifierCommandes(page, juge, cas);
  const petits = await petitsTextes(page);
  juge.exige(petits.length === 0, `${cas} : textes sous 13 px : ${petits.join(', ')}`);
  await calme(page);
  await page.screenshot({ path: join(CAPTURES, nom) });
  await verifierBarres(page, juge, cas);
  juge.exige(sorties.length === 0, `${cas} : requêtes hors de l’appli : ${sorties.join(', ')}`);
  juge.exige(erreurs.length === 0, `${cas} : erreurs dans la page : ${erreurs.join(' | ')}`);
}

try {
  await mkdir(CAPTURES, { recursive: true });

  for (const theme of ['light', 'dark'])
    for (const format of Object.keys(GRANDS)) {
      const cas = `${format}, ${NOMS_THEME[theme]}`;
      const ouvert = await ouvrirSur('v1', { format, theme });
      const m = await lire(ouvert.page);
      juge.exige(
        m.classe === 'grand-format' && m.categories === 0 && vu(m.menu) === vu(CINQ),
        `${cas} : disposition ${vu({ classe: m.classe, categories: m.categories, menu: m.menu })}`,
      );
      juge.exige(
        vu(m.courant) === vu([cat('v1', 'vet')]) && m.titre === 'Vêtements' && m.objets.length === 6,
        `${cas} : choisie ${vu(m.courant)}, liste « ${m.titre} » de ${m.objets.length} objets`,
      );
      if (REPLI.has(format))
        juge.exige(
          m.colonnes === 'repli' &&
            m.sorte === 'tuiles' &&
            m.parRangee === PAR_RANGEE[format] &&
            m.titreVisible &&
            m.titreTaille === '24px',
          `${cas} : repli ${vu(m)}`,
        );
      else
        juge.exige(
          m.colonnes === '3' &&
            m.sorte === 'cartes' &&
            m.pistes.startsWith('320px 360px ') &&
            !m.titreVisible &&
            Math.abs(m.marges[0] - m.marges[1]) <= 1,
          `${cas} : trois colonnes ${vu(m)}`,
        );
      if (format === 'ordinateur') juge.exige(m.pistes === '320px 360px 800px', `${cas} : colonnes ${m.pistes}`);
      await verifierEtCapturer(ouvert, cas, `voyage-grand-format-${format}-${NOMS_THEME[theme]}.png`);
      await ouvert.contexte.close();

      // Voyage sans objet : l'écran vide d'aujourd'hui, centré.
      const vide = await ouvrirSur('v4', { format, theme });
      const v = await lire(vide.page);
      juge.exige(
        v.classe === 'ecran' && v.colonnes === null && v.vide && Math.abs(v.marges[0] - v.marges[1]) <= 1,
        `${cas} : voyage sans objet ${vu(v)}`,
      );
      await verifierEtCapturer(
        vide,
        `${cas}, voyage sans objet`,
        `voyage-grand-format-vide-${format}-${NOMS_THEME[theme]}.png`,
      );
      await vide.contexte.close();
    }

  // Onze catégories. Portable : le menu défile seul, la liste ne bouge pas (témoin : il a défilé).
  {
    const ouvert = await ouvrirSur('v2', { format: 'portable' });
    const { page } = ouvert;
    const avant = await lire(page);
    const defile = await page.evaluate(() => {
      const menu = document.querySelector('.gf-menu');
      if (menu) menu.scrollTop = menu.scrollHeight;
      return menu?.scrollTop ?? 0;
    });
    const apres = await lire(page);
    juge.exige(
      avant.menu.length === 11 && defile > 0 && apres.hautListe === avant.hautListe,
      `portable, 11 catégories : menu défilé de ${defile} px, liste de ${avant.hautListe} à ${apres.hautListe}`,
    );
    await page.screenshot({ path: join(CAPTURES, 'voyage-grand-format-portable-11-categories-menu-defile.png') });
    await ouvert.contexte.close();
  }

  // Onze catégories en tuiles : la liste commence à l'écran, sans défiler.
  for (const format of REPLI) {
    const ouvert = await ouvrirSur('v2', { format });
    const m = await lire(ouvert.page);
    juge.exige(
      m.menu.length === 11 && m.defilement === 0 && m.hautListe < m.hauteur - 100,
      `${format}, 11 catégories : liste à ${m.hautListe} px sur ${m.hauteur}`,
    );
    await verifierEtCapturer(ouvert, `${format}, 11 catégories`, `voyage-grand-format-${format}-11-categories.png`);
    await ouvert.contexte.close();
  }

  // Toucher Camping (tuile, ou carte à la souris) : ses objets, la marque choisie, le focus sur elle.
  // Sur la tablette, la liste est déjà à l'écran : rien ne défile.
  for (const format of ['tablette-paysage', 'tablette-portrait', 'ordinateur']) {
    const ouvert = await ouvrirSur('v1', { format });
    const { page } = ouvert;
    await toucher(juge, page, `.gf-menu [data-id="${cat('v1', 'cam')}"]`, { doigt: REPLI.has(format) });
    await calme(page);
    const m = await lire(page);
    const focus = await focusActuel(page);
    juge.exige(
      vu(m.courant) === vu([cat('v1', 'cam')]) &&
        m.titre === 'Camping' &&
        m.objets.length === 3 &&
        m.objets.every(id => id.startsWith('o-v1-cam-')) &&
        focus === `choisir:${cat('v1', 'cam')}` &&
        m.defilement === 0,
      `${format}, Camping touchée : ${vu({ courant: m.courant, titre: m.titre, objets: m.objets, focus, defilement: m.defilement })}`,
    );
    juge.exige(ouvert.erreurs.length === 0, `${format}, Camping : erreurs ${ouvert.erreurs.join(' | ')}`);
    await ouvert.contexte.close();
  }

  // 600 × 600, une colonne : la liste commence dans la moitié basse ; toucher Camping la fait monter à
  // 16 px du haut (immédiatement : l'appareil demande moins d'animations), le focus reste à la tuile.
  {
    const ouvert = await ouvrirSur('v3', { format: 'tablette-portrait', taille: { width: 600, height: 600 } });
    const { page } = ouvert;
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const avant = await lire(page);
    await toucher(juge, page, `.gf-tuile[data-id="${cat('v3', 'cam')}"]`, { doigt: true });
    await calme(page);
    const apres = await lire(page);
    const focus = await focusActuel(page);
    juge.exige(
      avant.hautListe > avant.hauteur / 2 &&
        Math.abs(apres.hautListe - 16) <= 1 &&
        apres.titre === 'Camping' &&
        focus === `choisir:${cat('v3', 'cam')}`,
      `600 × 600 : liste de ${avant.hautListe} à ${apres.hautListe} px, « ${apres.titre} », focus ${focus}`,
    );
    juge.exige(ouvert.erreurs.length === 0, `600 × 600 : erreurs ${ouvert.erreurs.join(' | ')}`);
    await ouvert.contexte.close();
  }
} finally {
  await navigateur.close();
  await serveur.fermer();
}
juge.conclure(
  'Écran d’un voyage sur tablette et ordinateur',
  '4 formats × 2 thèmes, trois colonnes et repli, 11 catégories, tuile touchée, liste amenée à l’écran, voyage sans objet',
);
