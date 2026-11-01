// Phase 12 (docs/PLAN.md, maquette validée le 2026-10-31, docs/maquettes/reglages/) : l'écran Réglages
// reçoit le bloc Thème et le bloc Sauvegarde.
// - Réglages montre Bibliothèque, Étiquettes, le bloc Thème (« Appareil » coché d'office) et le bloc
//   Sauvegarde (« Aucune sauvegarde depuis cet appareil »).
// - Toucher « Sombre » : la page passe en sombre aussitôt, le choix est coché et retenu.
// - « Sauvegarder » à 18 h 40 : un fichier baluchon-2026-10-31-18h40.json déposé, lisible par
//   lireSauvegarde ; bandeau du bas qui le nomme ; ligne « Dernière sauvegarde : 31 octobre 2026, 18 h 40 ».
// - Un second appui dans la même minute : …-2.json, le premier intact.
// - Accès aux fichiers refusé : la fenêtre « Accès aux fichiers refusé », rien de déposé, la date ne change pas.
// - Panne : message en haut, rien de déposé, la date ne change pas.
// - Un bandeau « Annuler » (suppression d'un objet) visible avant « Sauvegarder » reste utilisable après :
//   le message passe en haut.
// - Disposition : deux colonnes égales dès 700 px de large (alignées d'une carte à l'autre), empilées en
//   dessous ; cibles de 44 px, rien sous les barres système, clair et sombre ; captures reglages-theme-….
// Le thème du bureau Debian n'est jamais touché : seul emulateMedia de Playwright change de thème.
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { chromium } from 'playwright';
import { lireSauvegarde } from '../src/modele/sauvegarde.js';
import { attendreQue, calme } from './outils/attente.mjs';
import {
  a,
  annuler,
  attendreSansBandeau,
  lireBandeau,
  ouvrirAvecHorloge,
  supprimerObjet,
} from './outils/annulation.mjs';
import { fr, remplir } from './outils/bibliotheque.mjs';
import {
  CAPTURES,
  FORMATS,
  NOMS_THEME,
  attendreEcran,
  creerJuge,
  ecrireStockage,
  lireStockage,
  ouvrir,
  verifierBarres,
  verifierCommandes,
} from './outils/page.mjs';
import { demarrerServeur } from './outils/serveur.mjs';

const R = fr.reglages;
const S = R.sauvegarde;
const MAINTENANT = new Date('2026-10-31T18:40:00');
const DATE = fr.dates.dateHeure
  .replace('{date}', '31 octobre 2026')
  .replace('{heure}', fr.dates.heure.replace('{h}', '18').replace('{min}', '40'));
const FICHIER = 'baluchon-2026-10-31-18h40.json';
const DONNEES = {
  toucheRetour: true,
  voyages: [
    {
      id: 'v1',
      nom: 'Vercors',
      destination: '',
      depart: '2026-10-10',
      retour: '2026-10-13',
      femmes: 1,
      hommes: 1,
      enfants: 0,
      modifieLe: 'x',
    },
  ],
};
const QUESTION = 'dialog[role="alertdialog"]';
const vu = e => JSON.stringify(e);
// La page rend les espaces insécables comme des espaces (lecture du texte) : on compare de même.
const net = texte => texte.replace(/\s+/g, ' ');

const juge = creerJuge();
const serveur = await demarrerServeur();
const navigateur = await chromium.launch();

async function ouvrirReglages(taille, { theme = 'light', donnees = DONNEES } = {}) {
  const ouvert = await ouvrir(navigateur, serveur.url, {
    taille,
    theme,
    maintenant: MAINTENANT,
    donnees,
    adresse: '#/reglages',
  });
  await attendreEcran(ouvert.page, 'reglages');
  return ouvert;
}

// Ce que montre l'écran : lignes, blocs, choix du thème, date, message du bas ou du haut.
const lire = page =>
  page.evaluate(() => {
    const texte = el => el?.textContent.replace(/\s+/g, ' ').trim() ?? null;
    const bandeau = document.querySelector('.bandeau-annuler');
    const alerte = document.querySelector('.alerte-haut');
    return {
      titre: texte(document.querySelector('#app h1')),
      lignes: [...document.querySelectorAll('#app a.reglage b')].map(texte),
      blocs: [...document.querySelectorAll('#app .reglages-bloc > h2')].map(texte),
      choix: [...document.querySelectorAll('#app [data-choix="theme"]')].map(i => [
        i.value,
        i.checked,
        texte(i.parentElement),
        Boolean(i.parentElement.querySelector('svg')),
      ]),
      theme: document.documentElement.dataset.theme ?? null,
      date: texte(document.querySelector('#date-sauvegarde')),
      bouton: texte(document.querySelector('[data-geste="sauvegarder"]')),
      restaurer: texte(document.querySelector('[data-geste="restaurer"]')),
      bandeau: bandeau?.matches(':popover-open') ? texte(bandeau.querySelector('p')) : null,
      bandeauBouton: Boolean(bandeau?.querySelector('button')),
      alerte: alerte?.matches(':popover-open') ? texte(alerte) : null,
    };
  });

const fichiers = async page => (await lireStockage(page)).telechargements ?? [];
const sauvegarder = page => page.click('[data-geste="sauvegarder"]');
const attendreDate = (page, texte) =>
  attendreQue(page, t => document.querySelector('#date-sauvegarde')?.textContent.includes(t), texte);
const poser = async (page, cle, valeur) => ecrireStockage(page, { ...(await lireStockage(page)), [cle]: valeur });
const sansPanne = (erreurs, ...motifs) => erreurs.filter(e => !motifs.some(m => e.includes(m)));

// 1. Le contenu, le thème, la sauvegarde, le second appui.
async function essaiParcours(format, taille) {
  const cas = `parcours (${format})`;
  const ouvert = await ouvrirReglages(taille);
  const { page, contexte, erreurs, sorties } = ouvert;
  const vue = await lire(page);
  juge.exige(
    vue.titre === R.titre &&
      vu(vue.lignes) === vu([R.bibliotheque, R.etiquettes]) &&
      vu(vue.blocs) === vu([R.theme.titre, S.titre]) &&
      vu(vue.choix.map(c => [c[0], c[1], c[3]])) ===
        vu([
          ['appareil', true, true],
          ['clair', false, true],
          ['sombre', false, true],
        ]) &&
      vu(vue.choix.map(c => c[2])) === vu([R.theme.appareil, R.theme.clair, R.theme.sombre]) &&
      vue.theme === null &&
      vue.date === S.aucune &&
      vue.bouton === S.sauvegarder &&
      vue.restaurer === S.restaurer &&
      vue.bandeau === null,
    `${cas} : au départ ${vu(vue)}`,
  );

  // Sombre : la page passe en sombre aussitôt, le choix est retenu (et l'appareil en clair n'y change rien).
  await page.click('label.segment:has([value="sombre"])');
  await attendreQue(page, () => document.documentElement.dataset.theme === 'dark');
  const sombre = await lire(page);
  juge.exige(
    sombre.theme === 'dark' &&
      vu(sombre.choix.map(c => [c[0], c[1]])) ===
        vu([
          ['appareil', false],
          ['clair', false],
          ['sombre', true],
        ]),
    `${cas} : Sombre ${vu(sombre)}`,
  );
  juge.exige(
    (await page.evaluate(() => localStorage.getItem('baluchon-theme'))) === 'sombre',
    `${cas} : le choix Sombre n'est pas retenu`,
  );
  await page.click('label.segment:has([value="appareil"])');
  await attendreQue(page, () => !document.documentElement.dataset.theme);
  juge.exige((await lire(page)).theme === null, `${cas} : Appareil ne rend pas la main à l'appareil`);

  // Sauvegarder : le fichier, le bandeau, la date.
  await sauvegarder(page);
  await attendreDate(page, DATE);
  await calme(page);
  const faits = await fichiers(page);
  const lu = faits.length === 1 ? lireSauvegarde(faits[0].texte) : null;
  juge.exige(
    faits.length === 1 && faits[0].nom === FICHIER && lu?.ok === true,
    `${cas} : fichiers déposés ${vu(faits.map(f => f.nom))} ; lecture ${vu(lu)}`.slice(0, 400),
  );
  juge.exige(
    lu?.contenu?.voyages.length === 1 &&
      lu.contenu.voyages[0].voyage.nom === 'Vercors' &&
      lu.contenu.bibliotheque.categories.length > 0 &&
      lu.resume.creeLe === MAINTENANT.toISOString(),
    `${cas} : le fichier ne contient pas les données`,
  );
  const apres = await lire(page);
  juge.exige(
    apres.date === net(`${S.derniere} ${DATE}`) &&
      apres.bandeau === net(`${S.deposee} ${FICHIER}`) &&
      !apres.bandeauBouton &&
      (await page.evaluate(() => localStorage.getItem('baluchon-derniere-sauvegarde'))) === MAINTENANT.toISOString(),
    `${cas} : après Sauvegarder ${vu(apres)}`,
  );
  const place = await page.evaluate(() => {
    const b = document.querySelector('.bandeau-annuler').getBoundingClientRect();
    return {
      bas: b.bottom <= innerHeight,
      droite: b.right <= innerWidth,
      role: document.querySelector('.bandeau-annuler').getAttribute('role'),
    };
  });
  juge.exige(place.bas && place.droite && place.role === 'status', `${cas} : place du bandeau ${vu(place)}`);
  const focus = await page.evaluate(() => document.activeElement?.dataset.geste ?? null);
  juge.exige(focus === 'sauvegarder', `${cas} : le focus est sur ${vu(focus)}`);

  // Second appui dans la même minute : -2, le premier intact.
  await sauvegarder(page);
  await attendreQue(page, () => /-2\.json/.test(document.querySelector('.bandeau-annuler p')?.textContent ?? ''));
  const deux = await fichiers(page);
  juge.exige(
    vu(deux.map(f => f.nom)) === vu([FICHIER, FICHIER.replace('.json', '-2.json')]) && deux[0].texte === faits[0].texte,
    `${cas} : second appui ${vu(deux.map(f => f.nom))}`,
  );
  juge.exige(vu(sorties) === '[]', `${cas} : requêtes hors de l’appli : ${sorties.join(', ')}`);
  juge.exige(erreurs.length === 0, `${cas} : erreurs dans la page : ${erreurs.join(' | ')}`);
  await contexte.close();
}

// 2. Accès refusé, puis panne : rien de déposé, la date ne change pas.
async function essaiEchecs() {
  const cas = 'refus et panne';
  const ouvert = await ouvrirReglages(FORMATS['tablette-paysage']);
  const { page, contexte, erreurs } = ouvert;
  await poser(page, 'refus', ['deposerFichier']);
  await sauvegarder(page);
  await attendreQue(page, q => document.querySelector(`${q}[open]`) !== null, QUESTION);
  await calme(page);
  const fenetre = await page.evaluate(q => {
    const f = document.querySelector(q);
    return { titre: f.querySelector('h2')?.textContent.trim(), texte: f.textContent.replace(/\s+/g, ' ') };
  }, QUESTION);
  juge.exige(
    fenetre.titre === S.autorisation.titre &&
      fenetre.texte.includes(net(S.autorisation.texte)) &&
      fenetre.texte.includes(net(S.autorisation.comment)),
    `${cas} : fenêtre ${vu(fenetre)}`,
  );
  await page.click(`${QUESTION} button:text-is("${S.compris}")`);
  await attendreQue(page, q => !document.querySelector(q), QUESTION);
  await calme(page);
  let vue = await lire(page);
  juge.exige(
    (await fichiers(page)).length === 0 && vue.date === S.aucune && vue.bandeau === null,
    `${cas} : après le refus ${vu(vue)}`,
  );
  const focus = await page.evaluate(() => document.activeElement?.dataset.geste ?? null);
  juge.exige(focus === 'sauvegarder', `${cas} : après le refus, le focus est sur ${vu(focus)}`);

  await poser(page, 'refus', []);
  await poser(page, 'pannes', ['deposerFichier']);
  await sauvegarder(page);
  await attendreQue(page, () => document.querySelector('.alerte-haut')?.matches(':popover-open') ?? false);
  vue = await lire(page);
  juge.exige(
    vue.alerte === net(S.erreur) &&
      (await fichiers(page)).length === 0 &&
      vue.date === S.aucune &&
      vue.bandeau === null,
    `${cas} : après la panne ${vu(vue)}`,
  );
  // Témoin : la panne levée, la sauvegarde réussit.
  await poser(page, 'pannes', []);
  await sauvegarder(page);
  await attendreDate(page, DATE);
  juge.exige((await fichiers(page)).length === 1, `${cas} : la sauvegarde ne reprend pas après la panne`);
  const inattendues = sansPanne(erreurs, 'Panne simulée');
  juge.exige(inattendues.length === 0, `${cas} : erreurs dans la page : ${inattendues.join(' | ')}`);
  await contexte.close();
}

// 3. Un bandeau « Annuler » en cours survit à « Sauvegarder » ; le message passe en haut.
async function essaiAnnuler() {
  const cas = 'bandeau « Annuler » en cours';
  const ouvert = await ouvrirAvecHorloge(navigateur, serveur.url, 'tablette-paysage');
  const { page, contexte, erreurs } = ouvert;
  await supprimerObjet(page, 'Toilette', 'Crème solaire');
  const avant = await lireBandeau(page);
  juge.exige(avant?.texte === remplir(a.objet, { nom: 'Crème solaire' }), `${cas} : bandeau ${vu(avant)}`);
  await page.click('#app a.lien-retour');
  await attendreEcran(page, 'reglages');
  await calme(page);
  juge.exige((await lireBandeau(page)) !== null, `${cas} : le bandeau n'a pas suivi sur Réglages`);
  await sauvegarder(page);
  await attendreQue(
    page,
    aucune => !document.querySelector('#date-sauvegarde')?.textContent.includes(aucune),
    S.aucune,
  );
  await attendreQue(page, () => document.querySelector('.alerte-haut')?.matches(':popover-open') ?? false);
  const vue = await lire(page);
  const bandeau = await lireBandeau(page);
  juge.exige(
    vue.alerte?.startsWith(net(S.deposee)) &&
      vue.alerte.endsWith('.json') &&
      bandeau?.texte === remplir(a.objet, { nom: 'Crème solaire' }) &&
      bandeau.touchable,
    `${cas} : après Sauvegarder ${vu({ alerte: vue.alerte, bandeau })}`,
  );
  // « Annuler » répond encore : l'objet revient.
  await annuler(page);
  juge.exige(await attendreSansBandeau(page), `${cas} : le bandeau reste après « Annuler »`);
  const objets = (await lireStockage(page)).bibliotheque?.objets ?? [];
  juge.exige(
    objets.some(o => o.nom === 'Crème solaire'),
    `${cas} : « Annuler » n'a pas rétabli l'objet`,
  );
  juge.exige(erreurs.length === 0, `${cas} : erreurs dans la page : ${erreurs.join(' | ')}`);
  await contexte.close();
}

// Les rectangles des éléments de la disposition.
const mesures = page =>
  page.evaluate(() => {
    const r = sel => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const { left, top, right, bottom, width } = el.getBoundingClientRect();
      return { left, top, right, bottom, width };
    };
    const liste = document.querySelector('#app ul.reglages').getBoundingClientRect();
    const cartes = [...document.querySelectorAll('#app .reglages-carte')].map(c => {
      const { left, right } = c.getBoundingClientRect();
      return { left, right };
    });
    return {
      liste: { left: liste.left, right: liste.right },
      cartes,
      aideTheme: r('#aide-theme'),
      segments: r('.segments-theme'),
      sauvegarder: r('[data-geste="sauvegarder"]'),
      restaurer: r('[data-geste="restaurer"]'),
      titreTheme: r('#titre-theme'),
    };
  });

// 4. Disposition : deux colonnes égales dès 700 px, empilées en dessous, cartes de la largeur de la liste.
async function essaiDisposition(largeur, deuxColonnes) {
  const cas = `disposition ${largeur} px`;
  const ouvert = await ouvrirReglages({ width: largeur, height: 900 });
  const { page, contexte } = ouvert;
  const m = await mesures(page);
  const memeLargeur = m.cartes.every(c => Math.abs(c.left - m.liste.left) < 1 && Math.abs(c.right - m.liste.right) < 1);
  juge.exige(m.cartes.length === 2 && memeLargeur, `${cas} : cartes ${vu(m.cartes)} / liste ${vu(m.liste)}`);
  if (deuxColonnes) {
    juge.exige(
      m.aideTheme.right <= m.segments.left &&
        Math.abs(m.sauvegarder.width - m.restaurer.width) < 2 &&
        Math.abs(m.sauvegarder.width - m.segments.width) < 2 &&
        Math.abs(m.segments.left - m.restaurer.left) < 1 &&
        m.sauvegarder.right <= m.restaurer.left &&
        Math.abs(m.sauvegarder.top - m.restaurer.top) < 2,
      `${cas} : deux colonnes ${vu(m)}`,
    );
  } else {
    juge.exige(
      m.aideTheme.bottom <= m.segments.top &&
        Math.abs(m.segments.left - m.aideTheme.left) < 1 &&
        m.sauvegarder.bottom <= m.restaurer.top &&
        Math.abs(m.sauvegarder.left - m.restaurer.left) < 1,
      `${cas} : empilé ${vu(m)}`,
    );
  }
  await contexte.close();
}

// 5. Chaque format, chaque thème : cibles, barres système, captures.
async function essaiFormat(format, theme) {
  const cas = `${format}, ${NOMS_THEME[theme]}`;
  const ouvert = await ouvrirReglages(FORMATS[format], { theme });
  const { page, contexte, erreurs } = ouvert;
  await verifierCommandes(page, juge, cas);
  await page.mouse.move(0, 0);
  await page.screenshot({ path: join(CAPTURES, `reglages-theme-${format}-${NOMS_THEME[theme]}-depart.png`) });
  await sauvegarder(page);
  await attendreDate(page, DATE);
  await calme(page);
  await page.mouse.move(0, 0);
  await page.screenshot({ path: join(CAPTURES, `reglages-theme-${format}-${NOMS_THEME[theme]}-sauvegarde.png`) });
  // Un bandeau fixé au bas reste hors du contenu des barres : jugé avec le reste, barres posées après les captures.
  await verifierBarres(page, juge, cas);
  juge.exige(erreurs.length === 0, `${cas} : erreurs dans la page : ${erreurs.join(' | ')}`);
  await contexte.close();
}

try {
  await mkdir(CAPTURES, { recursive: true });
  await essaiParcours('telephone', FORMATS.telephone);
  await essaiParcours('tablette-paysage', FORMATS['tablette-paysage']);
  await essaiEchecs();
  await essaiAnnuler();
  await essaiDisposition(699, false);
  await essaiDisposition(700, true);
  await essaiDisposition(393, false);
  await essaiDisposition(1280, true);
  for (const theme of ['light', 'dark']) for (const format of Object.keys(FORMATS)) await essaiFormat(format, theme);
} finally {
  await navigateur.close();
  await serveur.fermer();
}
juge.conclure(
  'Réglages',
  'thème, Sauvegarder (fichier, bandeau, date, second appui), refus, panne, « Annuler » conservé, deux colonnes dès 700 px ; 5 formats × 2 thèmes',
);
