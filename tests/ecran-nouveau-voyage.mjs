// Phase 2 (docs/PLAN.md, spec 2026-10-06) : créer un voyage (US-9, US-10).
// Le 6 octobre 2026 (horloge fixée), bibliothèque de départ installée par l'appli :
// - parcours complet depuis Mes voyages (un voyage passé) par le bouton flottant : nom, destination,
//   10 puis 13 octobre sur le calendrier (résumé « 4 jours, 3 nuits », jours 11 et 12 grisés),
//   Créer → la liste du voyage : Repas 16, T-shirts 8, Pyjama 2, Dentifrice 1 ; elle survit au
//   rechargement ; le retour mène à Mes voyages, où le voyage figure dans « À venir » ; la
//   bibliothèque n'est pas installée deux fois (mêmes catégories, mêmes identifiants) ;
// - le résumé des dates dit la période en toutes lettres, comme la spec ;
// - aller-retour dans la journée (deux appuis sur le 10) : pas de Pyjama ;
// - choix A : après le 15, un appui sur le 12 en fait le nouveau départ ; un appui après un voyage
//   complet recommence ;
// - au-delà d'un an après le départ, les jours sont inactifs ; le dernier jour permis est choisissable ;
// - Créer sans rien (au téléphone) : messages en toutes lettres à leur place réservée, rien ne
//   bouge, focus sur le nom ; le nom et les dates sont dits invalides au lecteur d'écran ; le
//   message du nom (et son « invalide ») s'efface une fois le nom saisi, celui des dates reste ;
// - au clavier : flèches, Page suiv., Entrée et Espace ;
// - voyageurs : 2 par défaut, bornés à 1 et 20 (Playwright tient un bouton aria-disabled pour
//   inactif et l'attendrait : les appuis qui doivent être refusés sont forcés) ;
// - double appui sur Créer : un seul voyage ; panne d'enregistrement : message, on reste sur le
//   formulaire, la saisie est gardée, et le bouton Créer ne bouge pas ; la panne levée, un second
//   appui crée le voyage (un seul).
// 3 formats × 2 thèmes : cibles de 44 px, pas de défilement de côté, rien sous les barres système.
import { mkdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { chromium } from 'playwright';
import { calme } from './outils/attente.mjs';
import { demarrerServeur } from './outils/serveur.mjs';
import {
  CAPTURES,
  FORMATS,
  NOMS_THEME,
  RACINE,
  attendreEcran,
  creerJuge,
  ecrireStockage,
  lireStockage,
  ouvrir,
  verifierBarres,
  verifierCommandes,
} from './outils/page.mjs';

const fr = JSON.parse(await readFile(join(RACINE, 'src/i18n/fr.json'), 'utf8'));
const MAINTENANT = new Date('2026-10-06T10:00:00');
// Un voyage déjà fait, pour que Mes voyages montre sa liste et son bouton flottant.
const PAQUES = {
  id: 'p1',
  nom: 'Pâques',
  destination: '',
  depart: '2026-04-03',
  retour: '2026-04-06',
  voyageurs: 2,
  modifieLe: 'x',
};
const jour = date => `[data-jour="${date}"]`;
// Nom accessible d'un jour : sa date en toutes lettres, puis son rôle dans le voyage s'il en a un.
const nomDuJour = (date, etat) => {
  const lettres = new Intl.DateTimeFormat('fr', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${date}T12:00:00Z`));
  return etat
    ? fr.calendrier.jourAvecEtat.replace('{jour}', lettres).replace('{etat}', fr.calendrier.etat[etat])
    : lettres;
};
const lireNom = (page, date) => page.getAttribute(`[data-jour="${date}"]`, 'aria-label');
// Le repère de la période (fond et traits) d'un jour, tel qu'il est dessiné.
const repere = (page, date) =>
  page.$eval(`[data-jour="${date}"]`, b => {
    const s = getComputedStyle(b);
    return `${s.backgroundColor} | ${s.boxShadow}`;
  });
const titreMois = (annee, mois) =>
  new Intl.DateTimeFormat('fr', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(
    Date.UTC(annee, mois - 1, 15),
  );

const etat = page =>
  page.evaluate(() => ({
    titre: document.querySelector('.calendrier-titre')?.textContent.trim(),
    depart: document.querySelector('.jour-depart')?.dataset.jour ?? null,
    retour: document.querySelector('.jour-retour')?.dataset.jour ?? null,
    entre: [...document.querySelectorAll('.jour-entre')].map(b => b.dataset.jour),
    resume: document.querySelector('#resume-dates')?.textContent.trim(),
    focus: document.activeElement?.dataset?.jour ?? document.activeElement?.id ?? null,
    voyageurs: document.querySelector('.compteur-valeur')?.textContent.trim(),
  }));

const objetsAffiches = page =>
  page.evaluate(() =>
    Object.fromEntries(
      [...document.querySelectorAll('.objet')].map(o => [
        o.querySelector('.objet-nom').textContent,
        o.querySelector('.objet-quantite').textContent,
      ]),
    ),
  );

async function nouveauFormulaire(navigateur, url, options = {}) {
  const ouvert = await ouvrir(navigateur, url, {
    taille: FORMATS.telephone,
    theme: 'light',
    maintenant: MAINTENANT,
    adresse: '#/nouveau-voyage',
    ...options,
  });
  await attendreEcran(ouvert.page, 'nouveau-voyage');
  return ouvert;
}

async function remplirEtCreer(page, { nom, depart, retour, double = false, avantCreer }) {
  await page.fill('#nom', nom);
  await page.click(jour(depart));
  await page.click(jour(retour));
  await avantCreer?.();
  if (double) await page.dblclick('button[type=submit]');
  else await page.click('button[type=submit]');
}

const juge = creerJuge();
const serveur = await demarrerServeur();
const navigateur = await chromium.launch();
try {
  await mkdir(CAPTURES, { recursive: true });

  // Parcours complet, depuis Mes voyages et son bouton flottant.
  {
    const { contexte, page, erreurs } = await ouvrir(navigateur, serveur.url, {
      taille: FORMATS['tablette-portrait'],
      theme: 'light',
      maintenant: MAINTENANT,
      donnees: { voyages: [PAQUES] },
    });
    await attendreEcran(page, 'voyages');
    await page.click('.bouton-flottant');
    await attendreEcran(page, 'nouveau-voyage');
    const idsCategories = async () => (await lireStockage(page)).bibliotheque.categories.map(c => c.id).join(',');
    const idsAvant = await idsCategories();
    juge.exige((await etat(page)).titre === titreMois(2026, 10), `parcours : mois affiché ${(await etat(page)).titre}`);
    juge.exige((await etat(page)).voyageurs === '2', 'parcours : 2 voyageurs par défaut');
    await page.fill('#nom', 'Vercors');
    await page.fill('#destination', 'Autrans');
    await page.click(jour('2026-10-10'));
    await page.click(jour('2026-10-13'));
    const e = await etat(page);
    juge.exige(e.depart === '2026-10-10' && e.retour === '2026-10-13', `parcours : sélection ${JSON.stringify(e)}`);
    juge.exige(
      JSON.stringify(e.entre) === JSON.stringify(['2026-10-11', '2026-10-12']),
      `parcours : jours grisés ${e.entre}`,
    );
    juge.exige(e.resume === 'Du sam. 10 oct. au mar. 13 oct. · 4 jours, 3 nuits', `parcours : résumé « ${e.resume} »`);
    // Jamais la couleur seule : le rôle du jour est dit au lecteur d'écran, et la période porte un
    // trait visible, qui reste quand le doigt (ou la souris) s'y attarde.
    for (const [date, etatAttendu] of [
      ['2026-10-10', 'depart'],
      ['2026-10-11', 'entre'],
      ['2026-10-13', 'retour'],
      ['2026-10-14', null],
    ]) {
      const vu = await lireNom(page, date);
      juge.exige(vu === nomDuJour(date, etatAttendu), `parcours : nom du ${date} « ${vu} »`);
    }
    const traitDeLaPeriode = await page.$eval(jour('2026-10-12'), b => getComputedStyle(b).boxShadow);
    const traitHorsPeriode = await page.$eval(jour('2026-10-14'), b => getComputedStyle(b).boxShadow);
    juge.exige(
      traitDeLaPeriode !== 'none' && traitHorsPeriode === 'none',
      `parcours : trait de la période « ${traitDeLaPeriode} », hors période « ${traitHorsPeriode} »`,
    );
    const auRepos = await repere(page, '2026-10-12');
    await page.hover(jour('2026-10-12'));
    const auSurvol = await repere(page, '2026-10-12');
    juge.exige(auSurvol === auRepos, `parcours : au survol, la période change « ${auRepos} » → « ${auSurvol} »`);
    await page.hover(jour('2026-10-14'));
    juge.exige(
      (await repere(page, '2026-10-14')) !== (await repere(page, '2026-10-15')),
      'parcours : témoin, le survol ne se voit pas',
    );
    await page.click('button[type=submit]');
    await attendreEcran(page, 'voyage');
    const hash = await page.evaluate(() => location.hash);
    juge.exige(/^#\/voyage\/[0-9a-f-]{36}$/.test(hash), `parcours : adresse ${hash}`);
    const attendus = { Repas: '16', 'T-shirts': '8', Pyjama: '2', Dentifrice: '1' };
    const vus = await objetsAffiches(page);
    for (const [nom, quantite] of Object.entries(attendus))
      juge.exige(vus[nom] === quantite, `parcours : ${nom} vaut ${vus[nom]}, attendu ${quantite}`);
    await page.reload();
    await attendreEcran(page, 'voyage');
    juge.exige((await objetsAffiches(page)).Repas === '16', 'parcours : le voyage ne survit pas au rechargement');
    const idsApres = await idsCategories();
    juge.exige(
      idsAvant.split(',').length === 4 && idsApres === idsAvant,
      `parcours : bibliothèque réinstallée (${idsAvant} → ${idsApres})`,
    );
    await page.goBack();
    await attendreEcran(page, 'voyages');
    const aVenir = await page.$$eval('#rubrique-aVenir ~ ul .carte-voyage-nom', n => n.map(x => x.textContent));
    juge.exige(aVenir.includes('Vercors'), `parcours : Vercors absent de « À venir » (${aVenir})`);
    juge.exige(erreurs.length === 0, `parcours : erreurs dans la page : ${erreurs.join(' | ')}`);
    await contexte.close();
  }

  // Aller-retour dans la journée : pas de Pyjama.
  {
    const { contexte, page } = await nouveauFormulaire(navigateur, serveur.url);
    await remplirEtCreer(page, {
      nom: 'Journée',
      depart: '2026-10-10',
      retour: '2026-10-10',
      avantCreer: async () => {
        const vu = await lireNom(page, '2026-10-10');
        juge.exige(vu === nomDuJour('2026-10-10', 'departEtRetour'), `journée : nom du jour « ${vu} »`);
      },
    });
    await attendreEcran(page, 'voyage');
    const vus = await objetsAffiches(page);
    juge.exige(!('Pyjama' in vus) && vus['T-shirts'] === '2', `journée : ${JSON.stringify(vus)}`);
    await contexte.close();
  }

  // Choix A, recommencer, et limite d'un an.
  {
    const { contexte, page } = await nouveauFormulaire(navigateur, serveur.url);
    await page.click(jour('2026-10-15'));
    await page.click(jour('2026-10-12'));
    let e = await etat(page);
    juge.exige(e.depart === '2026-10-12' && e.retour === null, `choix A : ${JSON.stringify(e)}`);
    juge.exige(e.resume.startsWith(fr.nouveauVoyage.resume.depart.split('{')[0]), `choix A : résumé « ${e.resume} »`);
    await page.click(jour('2026-10-14'));
    await page.click(jour('2026-10-20'));
    e = await etat(page);
    juge.exige(e.depart === '2026-10-20' && e.retour === null, `recommencer : ${JSON.stringify(e)}`);
    await page.click(jour('2026-10-10'));
    for (let i = 0; i < 12; i++) await page.click('[data-mois="1"]');
    e = await etat(page);
    juge.exige(e.titre === titreMois(2027, 10), `limite : mois ${e.titre}`);
    const inactifs = await page.evaluate(() => ({
      apres: document.querySelector('[data-jour="2027-10-11"]').getAttribute('aria-disabled'),
      limite: document.querySelector('[data-jour="2027-10-10"]').getAttribute('aria-disabled'),
    }));
    juge.exige(inactifs.apres === 'true' && inactifs.limite !== 'true', `limite : ${JSON.stringify(inactifs)}`);
    await page.click(jour('2027-10-11'), { force: true });
    juge.exige((await etat(page)).retour === null, 'limite : un jour au-delà d’un an a été choisi');
    await page.click(jour('2027-10-10'));
    juge.exige((await etat(page)).retour === '2027-10-10', 'limite : le dernier jour permis est refusé');
    await contexte.close();
  }

  // Créer sans rien : messages à leur place réservée, rien ne bouge.
  {
    const { contexte, page } = await nouveauFormulaire(navigateur, serveur.url);
    const positions = () =>
      page.evaluate(() =>
        ['.calendrier', '.compteur', 'button[type=submit]'].map(
          s => document.querySelector(s).getBoundingClientRect().top + window.scrollY,
        ),
      );
    const avant = await positions();
    await page.click('button[type=submit]');
    await calme(page);
    const apres = await positions();
    juge.exige(JSON.stringify(avant) === JSON.stringify(apres), `erreurs : l’écran a bougé ${avant} → ${apres}`);
    const textes = await page.evaluate(() => ({
      nom: document.querySelector('#erreur-nom').textContent.trim(),
      dates: document.querySelector('#erreur-dates').textContent.trim(),
    }));
    juge.exige(
      textes.nom === fr.nouveauVoyage.erreurs.nomManquant && textes.dates === fr.nouveauVoyage.erreurs.datesManquantes,
      `erreurs : messages ${JSON.stringify(textes)}`,
    );
    juge.exige((await etat(page)).focus === 'nom', `erreurs : focus sur ${(await etat(page)).focus}`);
    const invalides = () =>
      page.evaluate(() => ({
        nom: document.querySelector('#nom').getAttribute('aria-invalid'),
        dates: document.querySelector('[aria-describedby~="erreur-dates"]').getAttribute('aria-invalid'),
      }));
    let invalide = await invalides();
    juge.exige(invalide.nom === 'true' && invalide.dates === 'true', `erreurs : invalides ${JSON.stringify(invalide)}`);
    juge.exige(
      (await page.evaluate(() => location.hash)) === '#/nouveau-voyage',
      'erreurs : le formulaire a été quitté',
    );
    await page.fill('#nom', 'Vercors');
    juge.exige((await page.textContent('#erreur-nom')).trim() === '', 'erreurs : le message du nom reste après saisie');
    invalide = await invalides();
    juge.exige(
      invalide.nom === null && invalide.dates === 'true',
      `erreurs : après saisie du nom, invalides ${JSON.stringify(invalide)}`,
    );
    await contexte.close();
  }

  // Au clavier.
  {
    const { contexte, page } = await nouveauFormulaire(navigateur, serveur.url);
    await page.focus(jour('2026-10-10'));
    await page.keyboard.press('ArrowRight');
    juge.exige((await etat(page)).focus === '2026-10-11', `clavier : → mène à ${(await etat(page)).focus}`);
    await page.keyboard.press('ArrowDown');
    juge.exige((await etat(page)).focus === '2026-10-18', `clavier : ↓ mène à ${(await etat(page)).focus}`);
    await page.keyboard.press('PageDown');
    let e = await etat(page);
    juge.exige(
      e.focus === '2026-11-18' && e.titre === titreMois(2026, 11),
      `clavier : Page suiv. ${JSON.stringify(e)}`,
    );
    await page.keyboard.press('Enter');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('Space');
    e = await etat(page);
    juge.exige(e.depart === '2026-11-18' && e.retour === '2026-11-20', `clavier : sélection ${JSON.stringify(e)}`);
    await contexte.close();
  }

  // Voyageurs bornés de 1 à 20.
  {
    const { contexte, page } = await nouveauFormulaire(navigateur, serveur.url);
    await page.click('[data-voyageurs="-1"]');
    await page.click('[data-voyageurs="-1"]', { force: true });
    const min = await page.evaluate(() => ({
      valeur: document.querySelector('.compteur-valeur').textContent,
      inactif: document.querySelector('[data-voyageurs="-1"]').getAttribute('aria-disabled'),
    }));
    juge.exige(min.valeur === '1' && min.inactif === 'true', `voyageurs : minimum ${JSON.stringify(min)}`);
    for (let i = 0; i < 25; i++) await page.click('[data-voyageurs="1"]', { force: true });
    juge.exige((await etat(page)).voyageurs === '20', `voyageurs : maximum ${(await etat(page)).voyageurs}`);
    await contexte.close();
  }

  // Double appui : un seul voyage.
  {
    const { contexte, page } = await nouveauFormulaire(navigateur, serveur.url);
    await remplirEtCreer(page, { nom: 'Vercors', depart: '2026-10-10', retour: '2026-10-13', double: true });
    await attendreEcran(page, 'voyage');
    const n = (await lireStockage(page)).voyages.length;
    juge.exige(n === 1, `double appui : ${n} voyages créés`);
    await contexte.close();
  }

  // Panne d'enregistrement : message, on reste sur le formulaire.
  {
    const { contexte, page } = await nouveauFormulaire(navigateur, serveur.url, {
      donnees: { pannes: ['creerVoyage'] },
    });
    const haut = () =>
      page.evaluate(() => document.querySelector('button[type=submit]').getBoundingClientRect().top + window.scrollY);
    const avant = await haut();
    await remplirEtCreer(page, { nom: 'Vercors', depart: '2026-10-10', retour: '2026-10-13' });
    await page.waitForFunction(() => document.querySelector('#erreur-creation').textContent.trim() !== '');
    juge.exige(
      (await page.textContent('#erreur-creation')).trim() === fr.nouveauVoyage.erreurs.enregistrement,
      'panne : message absent ou inattendu',
    );
    juge.exige((await page.evaluate(() => location.hash)) === '#/nouveau-voyage', 'panne : le formulaire a été quitté');
    await calme(page);
    const apres = await haut();
    juge.exige(avant === apres, `panne : le bouton Créer a bougé ${avant} → ${apres}`);
    const garde = { ...(await etat(page)), nom: await page.inputValue('#nom') };
    juge.exige(
      garde.nom === 'Vercors' && garde.depart === '2026-10-10' && garde.retour === '2026-10-13',
      `panne : saisie perdue ${JSON.stringify(garde)}`,
    );
    // La panne levée, un second appui sur Créer réussit, et ne crée qu'un voyage.
    const { pannes, ...sansPanne } = await lireStockage(page);
    juge.exige(pannes?.length === 1, 'panne : témoin, la panne n’était pas posée');
    await ecrireStockage(page, sansPanne);
    await page.click('button[type=submit]');
    await attendreEcran(page, 'voyage');
    const n = (await lireStockage(page)).voyages?.length;
    juge.exige(n === 1, `panne levée : ${n} voyage(s) créé(s)`);
    await contexte.close();
  }

  // 3 formats × 2 thèmes, période choisie ; au téléphone, capture des messages d'erreur d'abord.
  for (const theme of ['light', 'dark']) {
    for (const [format, taille] of Object.entries(FORMATS)) {
      const cas = `${format}, ${NOMS_THEME[theme]}`;
      const { contexte, page, sorties, erreurs } = await nouveauFormulaire(navigateur, serveur.url, { taille, theme });
      if (format === 'telephone') {
        await page.click('button[type=submit]');
        await calme(page);
        await page.screenshot({
          path: join(CAPTURES, `nouveau-voyage-erreurs-${NOMS_THEME[theme]}.png`),
          fullPage: true,
        });
      }
      await page.fill('#nom', 'Vercors');
      await page.click(jour('2026-10-10'));
      await page.click(jour('2026-10-13'));
      await page.evaluate(() => window.scrollTo(0, 0));
      await verifierCommandes(page, juge, cas);
      if (format === 'tablette-portrait')
        await page.screenshot({ path: join(CAPTURES, `nouveau-voyage-${NOMS_THEME[theme]}.png`), fullPage: true });
      if (format === 'telephone')
        await page.screenshot({
          path: join(CAPTURES, `nouveau-voyage-telephone-${NOMS_THEME[theme]}.png`),
          fullPage: true,
        });
      await verifierBarres(page, juge, cas);
      juge.exige(sorties.length === 0, `${cas} : requêtes hors de l’appli : ${sorties.join(', ')}`);
      juge.exige(erreurs.length === 0, `${cas} : erreurs dans la page : ${erreurs.join(' | ')}`);
      await contexte.close();
    }
  }
} finally {
  await navigateur.close();
  await serveur.fermer();
}
juge.conclure(
  'Écran Nouveau voyage',
  'parcours, calendrier, erreurs, clavier, voyageurs, pannes, 3 formats × 2 thèmes',
);
