// Phase 14 (docs/PLAN.md) : tourner l'appareil pendant une saisie ne fait rien perdre. Une rotation passe de
// la taille portrait à la taille paysage de l'appareil, puis revient (tablette : 800 × 1280 ↔ 1280 × 800 ;
// téléphone : 393 × 873 ↔ 873 × 393), et chaque cas part des deux orientations. Ce qui doit survivre, aux
// deux appareils et dans les deux sens (bloquant, téléphone en paysage compris) :
// - la fiche d'un objet du voyage, « Renommer » ouvert : « Gourde isot » dans le champ, qui garde le focus ;
// - la fiche d'un objet modèle en création : le nom « Lampe fron » et la règle « Par jour » ;
// - l'assistant « Nouveau voyage » à l'étape Activités : même étape, mêmes étiquettes, rangée d'étapes ;
// - la question « Abandonner ce nouveau voyage ? » : toujours ouverte, le focus dedans ;
// - l'écran d'un voyage : catégorie choisie et trois coches.
// Review Focus 4 : au téléphone, la rotation lancée pendant l'ouverture animée de la fiche (l'animation
// tourne : prefers-reduced-motion: no-preference, et rallongée pour que la rotation la devance à coup sûr) ;
// la fiche finit ouverte, entière dans l'écran, avec son contenu une fois revenue en portrait. En paysage,
// seule l'allure du téléphone est notée dans captures-travail/phase-14/rapports/rotation.txt (décision 12).
import { chromium } from 'playwright';
import { attendreQue, calme } from './outils/attente.mjs';
import { FICHE as FICHE_VOYAGE, RENOMMER, ouvrirFiche, ouvrirVoyage, toucherFiche } from './outils/ajuster.mjs';
import { attendreQuestion, question } from './outils/assistant.mjs';
import { TOUS_FORMATS, fermerEssai, ouvrirBibliotheque } from './outils/bibliotheque.mjs';
import { lireFiche, m, ouvrirNouvelObjet, saisir, segment } from './outils/fiches.mjs';
import { fenetreEntiere } from './outils/grille-fenetres.mjs';
import { graineMini } from './outils/mini-bibliotheque.mjs';
import { demarrerServeur } from './outils/serveur.mjs';
import {
  FORMATS,
  FORMATS_RAPPORT,
  attendreEcran,
  creerJuge,
  creerRapport,
  ouvrir,
  verifierBarres,
} from './outils/page.mjs';

const APPAREILS = {
  tablette: { portrait: 'tablette-portrait', paysage: 'tablette-paysage', taille: FORMATS },
  telephone: { portrait: 'telephone', paysage: 'telephone-paysage', taille: { ...FORMATS, ...FORMATS_RAPPORT } },
};
const juge = creerJuge();
const rapport = creerRapport('rotation');
const serveur = await demarrerServeur();
const navigateur = await chromium.launch();
const vu = e => JSON.stringify(e);
const MAINTENANT = new Date('2026-10-06T10:00:00');

// Rotation : la fenêtre prend la taille du format, on attend qu'elle l'ait prise puis que l'écran se pose.
async function pivoter(page, appareil, format) {
  const { width, height } = APPAREILS[appareil].taille[format];
  await page.setViewportSize({ width, height });
  await attendreQue(page, ([l, h]) => innerWidth === l && innerHeight === h, [width, height]);
  await calme(page);
}

// Un cas pour chaque appareil et chaque orientation de départ : `preparer` met l'écran dans l'état à
// protéger (ouvert à la taille portrait, puis tourné au besoin) et rend ce qui le décrit ; `lire` le relit.
// Les rotations : départ → autre → départ.
async function cas(nom, ouvrirA, preparer, lire) {
  for (const [appareil, def] of Object.entries(APPAREILS)) {
    for (const depart of ['portrait', 'paysage']) {
      const autre = depart === 'portrait' ? 'paysage' : 'portrait';
      const titre = `${nom}, ${appareil}, départ en ${depart}`;
      const ouvert = await ouvrirA(def.portrait);
      const { page } = ouvert;
      if (depart === 'paysage') await pivoter(page, appareil, def.paysage);
      await preparer(page);
      const avant = await lire(page);
      juge.exige(avant !== null && avant !== undefined, `${titre} : l'état de départ n'est pas posé`);
      for (const [etape, format] of [
        [autre, def[autre]],
        [depart, def[depart]],
      ]) {
        await pivoter(page, appareil, format);
        const apres = await lire(page);
        juge.exige(vu(apres) === vu(avant), `${titre}, tourné en ${etape} : avant ${vu(avant)}, après ${vu(apres)}`);
      }
      await fermerEssai(juge, titre, ouvert);
    }
  }
}

// ---------- Fiche d'un objet du voyage, « Renommer » ouvert ----------
const ouvrirRenommer = async page => {
  juge.exige(await ouvrirFiche(page, 'o-gou'), 'renommer : fiche de Gourde absente');
  await toucherFiche(page, 'renommer');
  await attendreQue(page, s => document.querySelector(`${s}[open]`) !== null, RENOMMER);
  await calme(page);
  await page.fill(`${RENOMMER} #f-nom`, 'Gourde isot');
  await page.focus(`${RENOMMER} #f-nom`);
};
await cas(
  'Renommer',
  format => ouvrirVoyage(navigateur, serveur.url, { format }),
  ouvrirRenommer,
  async page => ({
    fiche: await page.evaluate(
      ([f, r]) => ({
        fiche: document.querySelector(`${f}[open]`) !== null,
        renommer: document.querySelector(`${r}[open]`)?.matches(':modal') ?? false,
        valeur: document.querySelector(`${r} #f-nom`)?.value ?? null,
        focus: document.activeElement?.closest('dialog')?.matches(r) ? document.activeElement.id : null,
      }),
      [FICHE_VOYAGE, RENOMMER],
    ),
  }),
);

// ---------- Fiche d'un objet modèle en création ----------
await cas(
  'Nouvel objet modèle',
  async format => {
    const ouvert = await ouvrirBibliotheque(navigateur, serveur.url, format);
    ouvert.page.setDefaultTimeout(5000);
    return ouvert;
  },
  async page => {
    juge.exige(await ouvrirNouvelObjet(page, 'Alimentation'), 'nouvel objet : fiche absente');
    await saisir(page, '#f-nom', 'Lampe fron');
    await segment(page, m.objet.parJour);
  },
  async page => {
    const f = await lireFiche(page);
    return f && { nom: f.nom, choix: f.choix };
  },
);

// ---------- Assistant « Nouveau voyage », étape Activités ----------
const ouvrirAssistant = async format => {
  const ouvert = await ouvrir(navigateur, serveur.url, {
    taille: TOUS_FORMATS[format].taille,
    theme: 'light',
    maintenant: MAINTENANT,
    adresse: '#/nouveau-voyage',
    donnees: graineMini(),
  });
  await attendreEcran(ouvert.page, 'nouveau-voyage');
  return ouvert;
};
const remplirInformations = async page => {
  await page.fill('#nom', 'Vercors');
  await page.click('[data-jour="2026-10-10"]');
  await page.click('[data-jour="2026-10-13"]');
};
const lireAssistant = page =>
  page.evaluate(() => ({
    etape: document.querySelector('.formulaire-corps')?.dataset.etape ?? null,
    titre: document.querySelector('#titre-etape')?.textContent.trim() ?? null,
    puces: [...document.querySelectorAll('.puce-etiquette')].map(p => `${p.textContent.trim()}:${p.ariaPressed}`),
    courante: [...document.querySelectorAll('nav.etapes .etape')].findIndex(
      li => li.querySelector('button[data-aller]')?.getAttribute('aria-current') === 'step',
    ),
    nom: document.querySelector('#nom')?.value ?? null,
  }));
await cas(
  'Assistant, Activités',
  ouvrirAssistant,
  async page => {
    await remplirInformations(page);
    await page.click('[data-action="suivant"]');
    await attendreQue(page, () => document.querySelector('.formulaire-corps')?.dataset.etape === 'groupe');
    await calme(page);
    for (const rang of [1, 2]) await page.click(`[data-etiquette]:nth-child(${rang})`);
    await calme(page);
  },
  async page => {
    const v = await lireAssistant(page);
    juge.exige(
      v.etape === 'groupe' &&
        v.titre === 'Activités' &&
        v.courante === 1 &&
        v.puces.filter(p => p.endsWith(':true')).length >= 2,
      `assistant : l'état posé n'est pas Activités avec deux étiquettes : ${vu(v)}`,
    );
    return v;
  },
);

// ---------- Question d'abandon ----------
await cas(
  'Question d’abandon',
  ouvrirAssistant,
  async page => {
    await page.fill('#nom', 'Vercors');
    await page
      .locator('dialog .bouton-fermer, [data-action="fermer"], .lien-retour')
      .locator('visible=true')
      .first()
      .click();
    juge.exige((await attendreQuestion(page)) !== null, 'abandon : la question ne vient pas');
  },
  async page => {
    const q = await question(page);
    const dedans = await page.evaluate(() => document.activeElement?.closest('dialog[role="alertdialog"]') !== null);
    return q && { titre: q.titre, boutons: q.boutons, focusDedans: dedans };
  },
);

// ---------- Écran du voyage : catégorie choisie et trois coches ----------
const OBJETS = ['o-tsh', 'o-sou', 'o-pan'];
await cas(
  'Voyage, catégorie et coches',
  format => ouvrirVoyage(navigateur, serveur.url, { format }),
  async page => {
    const menu = '.gf-menu [data-action="choisir"][data-id="c-vet"]';
    if (await page.$(menu)) await page.click(menu);
    else if ((await page.getAttribute('[data-action="accordeon"][data-id="c-vet"]', 'aria-expanded')) !== 'true')
      await page.click('[data-action="accordeon"][data-id="c-vet"]');
    await calme(page);
    for (const id of OBJETS) await page.click(`.objet[data-id="${id}"] .case`);
    await calme(page);
  },
  page =>
    page.evaluate(ids => {
      const choisie =
        document.querySelector('.gf-menu [data-id="c-vet"]')?.getAttribute('aria-current') ??
        document.querySelector('[data-action="accordeon"][data-id="c-vet"]')?.getAttribute('aria-expanded');
      return {
        choisie,
        quantites: ids.map(
          id => document.querySelector(`.objet[data-id="${id}"] .objet-quantite`)?.textContent ?? null,
        ),
      };
    }, OBJETS),
);

// ---------- Review Focus 4 : rotation pendant l'ouverture animée de la fiche, au téléphone ----------
// La fiche monte en 260 ms ; l'animation est rallongée à 3 s pour que la rotation la devance à coup sûr.
const montee = page =>
  page.evaluate(
    f =>
      document
        .querySelector(f)
        ?.getAnimations()
        .some(a => a.playState === 'running'),
    FICHE_VOYAGE,
  );
async function ouvrirEnMontant(ouvert) {
  const { page } = ouvert;
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.addStyleTag({ content: '.fiche:modal { animation-duration: 3s !important; }' });
  await calme(page);
  await page.click('.objet[data-id="o-gou"] .objet-corps');
}
{
  const def = APPAREILS.telephone;
  const ouvert = await ouvrirVoyage(navigateur, serveur.url, { format: def.portrait });
  const { page } = ouvert;
  page.setDefaultTimeout(5000);
  await ouvrirEnMontant(ouvert);
  await attendreQue(page, f => document.querySelector(`${f}:modal`) !== null, FICHE_VOYAGE);
  juge.exige(await montee(page), 'ouverture animée : l’animation ne tourne pas, le test ne prouve rien');
  // Sans attendre sa fin : au paysage, puis de retour au portrait.
  await page.setViewportSize(def.taille[def.paysage]);
  await attendreQue(page, () => innerWidth === 873);
  const enRoute = await montee(page);
  juge.exige(enRoute, 'ouverture animée : l’animation était déjà finie à la rotation, le test ne prouve rien');
  await page.setViewportSize(def.taille[def.portrait]);
  await attendreQue(page, () => innerWidth === 393);
  await attendreQue(
    page,
    f =>
      !(
        document
          .querySelector(f)
          ?.getAnimations()
          .some(a => a.playState === 'running') ?? true
      ),
    FICHE_VOYAGE,
  );
  await calme(page);
  const fiche = await lireFiche(page).catch(() => null);
  const ouverte = await page.evaluate(
    f => ({
      modale: document.querySelector(f)?.matches(':modal') ?? false,
      titre: document.querySelector(`${f} h2`)?.textContent.trim() ?? '',
      corps: document.querySelector(`${f} .fiche-corps`)?.textContent.trim().length ?? 0,
    }),
    FICHE_VOYAGE,
  );
  juge.exige(
    ouverte.modale && ouverte.titre !== '' && ouverte.corps > 0,
    `ouverture animée, revenue en portrait : ${vu(ouverte)} ${vu(fiche)}`,
  );
  await fenetreEntiere(page, FICHE_VOYAGE);
  const place = await page.evaluate(f => {
    const r = document.querySelector(f).getBoundingClientRect();
    return { haut: r.top, bas: r.bottom, gauche: r.left, droite: r.right, l: innerWidth, h: innerHeight };
  }, FICHE_VOYAGE);
  juge.exige(
    place.haut >= -0.5 && place.gauche >= -0.5 && place.bas <= place.h + 0.5 && place.droite <= place.l + 0.5,
    `ouverture animée, revenue en portrait : la fiche sort de l'écran ${vu(place)}`,
  );
  await verifierBarres(page, juge, 'ouverture animée, revenue en portrait');
  await fermerEssai(juge, 'ouverture animée', ouvert);
}

// Rapport (non bloquant) : la fiche ouverte au téléphone en paysage, après une ouverture tournée en route.
{
  const def = APPAREILS.telephone;
  const ouvert = await ouvrirVoyage(navigateur, serveur.url, { format: def.portrait });
  const { page } = ouvert;
  page.setDefaultTimeout(5000);
  await ouvrirEnMontant(ouvert);
  await attendreQue(page, f => document.querySelector(`${f}:modal`) !== null, FICHE_VOYAGE);
  await page.setViewportSize(def.taille[def.paysage]);
  await attendreQue(page, () => innerWidth === 873);
  await attendreQue(
    page,
    f =>
      !(
        document
          .querySelector(f)
          ?.getAnimations()
          .some(a => a.playState === 'running') ?? true
      ),
    FICHE_VOYAGE,
  );
  await calme(page);
  const place = await page.evaluate(f => {
    const d = document.querySelector(f);
    if (!d) return null;
    const r = d.getBoundingClientRect();
    return { haut: r.top, bas: r.bottom, gauche: r.left, droite: r.right, l: innerWidth, h: innerHeight };
  }, FICHE_VOYAGE);
  rapport.exige(
    place && place.haut >= -0.5 && place.gauche >= -0.5 && place.bas <= place.h + 0.5 && place.droite <= place.l + 0.5,
    `fiche du voyage ouverte en route, téléphone en paysage : sort de l'écran ${vu(place)}`,
  );
  await ouvert.contexte.close();
}

await navigateur.close();
await serveur.fermer();
rapport.conclure();
juge.conclure('rotation pendant une saisie', 'fiches, assistant, question, voyage, ouverture animée conservés');
