// Phase 4 (docs/PLAN.md, docs/PRD.md « Écrans et gestes ») : les étapes de l'assistant « Nouveau
// voyage ». Le 6 octobre 2026 (horloge fixée), bibliothèque de départ installée par l'appli :
// - la rangée : Informations, Activités, Climat, Hébergement, Aperçu ; l'étape courante est dite
//   (aria-current), les autres fermées tant que rien n'est saisi ; un appui sur une fermée ne fait rien ;
// - « Suivant » sans informations : les messages de la phase 2, on reste sur Informations ;
// - informations remplies : l'Aperçu devient touchable dans la rangée ; « Suivant » mène à Activités,
//   titre au focus, puces Randonnée, Camping, Plage ; une puce touchée est pressée et porte sa coche,
//   « 1 étiquette choisie » ; Climat et Hébergement, pas encore vus, restent fermés ; la rangée mène à
//   l'aperçu, et à Informations où la saisie est gardée ; « Voir l'aperçu » y mène aussi ; revenue à
//   Activités, la puce est toujours pressée ; « Précédent » ramène à Informations ;
// - la fenêtre garde sa hauteur d'une étape à l'autre (± 1 px) ; le passage d'étape est animé, sauf si
//   l'appareil demande moins d'animations ;
// - Voyageurs avant les dates, dans l'ordre du document et à l'écran (en paysage, dans la colonne de
//   gauche) ;
// - au téléphone : « Étape 1 sur 5 · Informations », puis « Étape 2 sur 5 · Activités » ; le pied est
//   collé au bas de l'écran ; il porte une ombre (data-dessous) tant qu'il reste à défiler dessous ;
// - bibliothèque sans groupe (ancienne mini-bibliothèque) : rangée Informations · Aperçu, et l'aperçu
//   montre les objets « toujours inclus ».
// 4 formats × 2 thèmes, aux étapes Informations et Activités : cibles de 44 px, pas de défilement de
// côté, rien sous les barres système ; captures assistant-<étape>-<format>-<thème>.png.
import { mkdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { chromium } from 'playwright';
import { attendreQue, calme } from './outils/attente.mjs';
import { avecBibliotheque, sansGroupe } from './outils/assistant.mjs';
import { demarrerServeur } from './outils/serveur.mjs';
import {
  CAPTURES,
  FORMATS,
  NOMS_THEME,
  RACINE,
  attendreEcran,
  creerJuge,
  ouvrir,
  verifierBarres,
  verifierCommandes,
} from './outils/page.mjs';

const fr = JSON.parse(await readFile(join(RACINE, 'src/i18n/fr.json'), 'utf8'));
const COCHE = await readFile(join(RACINE, 'node_modules/@phosphor-icons/core/assets/bold/check-bold.svg'), 'utf8');
const TRACE_COCHE = COCHE.match(/\bd="([^"]+)"/)[1];
const nv = fr.nouveauVoyage;
const MAINTENANT = new Date('2026-10-06T10:00:00');
const NOMS = [nv.etape.informations, ...fr.bibliothequeDeDepart.groupes.map(g => g.nom), nv.etape.apercu];
const TOUS_FORMATS = {
  ...Object.fromEntries(Object.entries(FORMATS).map(([nom, taille]) => [nom, { taille }])),
  ordinateur: { taille: { width: 1440, height: 900 }, ecran: { width: 1920, height: 1080 }, tactile: false },
};
const legende = (n, nom) => nv.legende.replace('{n}', n).replace('{total}', NOMS.length).replace('{nom}', nom);

const rangee = page =>
  page.evaluate(() =>
    [...document.querySelectorAll('nav.etapes .etape')].map(li => {
      const bouton = li.querySelector('button[data-aller]');
      return {
        nom: li.querySelector('.etape-nom')?.textContent.trim(),
        etat: li.dataset.etat,
        courante: bouton?.getAttribute('aria-current'),
        fermee: bouton?.getAttribute('aria-disabled'),
      };
    }),
  );

const vue = page =>
  page.evaluate(() => ({
    etape: document.querySelector('.formulaire-corps')?.dataset.etape,
    titre: document.querySelector('#titre-etape')?.textContent.trim() ?? null,
    focus: document.activeElement?.id || null,
    hauteur: document.querySelector('dialog')?.getBoundingClientRect().height ?? null,
    puces: [...document.querySelectorAll('.puce-etiquette')].map(p => ({
      nom: p.textContent.trim(),
      presse: p.getAttribute('aria-pressed'),
      traces: [...p.querySelectorAll('path')].map(c => c.getAttribute('d')),
    })),
    compte: document.querySelector('.etape-compte')?.textContent.trim() ?? null,
    legende: document.querySelector('.etapes-legende')?.textContent.trim() ?? null,
    nom: document.querySelector('#nom')?.value,
  }));

// Voyageurs, puis les dates : dans l'ordre du document, et à l'écran (dessous, ou dans la colonne de droite).
const voyageursAvantDates = page =>
  page.evaluate(() => {
    const voyageurs = document.querySelector('.champ-voyageurs');
    const dates = document.querySelector('.champ-dates');
    const v = voyageurs.getBoundingClientRect();
    const d = dates.getBoundingClientRect();
    const destination = document.querySelector('#destination').getBoundingClientRect();
    return {
      document: Boolean(voyageurs.compareDocumentPosition(dates) & Node.DOCUMENT_POSITION_FOLLOWING),
      dessous: v.bottom <= d.top + 0.5,
      aGauche: v.right <= d.left + 0.5 && v.top >= destination.bottom - 0.5,
    };
  });

const pied = page =>
  page.evaluate(() => {
    const p = document.querySelector('.formulaire-pied');
    return { bas: p.getBoundingClientRect().bottom, ecran: innerHeight, dessous: p.hasAttribute('data-dessous') };
  });

async function ouvrirAssistant(navigateur, url, { taille = FORMATS['tablette-paysage'], ...options } = {}) {
  const ouvert = await ouvrir(navigateur, url, {
    taille,
    theme: 'light',
    maintenant: MAINTENANT,
    adresse: '#/nouveau-voyage',
    ...options,
  });
  await attendreEcran(ouvert.page, 'nouveau-voyage');
  return ouvert;
}

async function remplirInformations(page) {
  await page.fill('#nom', 'Vercors');
  await page.click('[data-jour="2026-10-10"]');
  await page.click('[data-jour="2026-10-13"]');
}

// force : Playwright attendrait qu'un bouton aria-disabled devienne actif ; on veut l'appui refusé.
async function aller(page, selecteur, { force = false } = {}) {
  await page.click(selecteur, { force });
  await calme(page);
  return vue(page);
}

const juge = creerJuge();
const serveur = await demarrerServeur();
const navigateur = await chromium.launch();
try {
  await mkdir(CAPTURES, { recursive: true });

  // Le parcours des étapes, dans la fenêtre de la tablette en paysage.
  {
    const { contexte, page, erreurs } = await ouvrirAssistant(navigateur, serveur.url);
    let r = await rangee(page);
    juge.exige(JSON.stringify(r.map(e => e.nom)) === JSON.stringify(NOMS), `rangée : ${r.map(e => e.nom).join(', ')}`);
    juge.exige(
      JSON.stringify(r.map(e => e.etat)) === JSON.stringify(['courante', 'fermee', 'fermee', 'fermee', 'fermee']),
      `rangée au départ : ${r.map(e => e.etat)}`,
    );
    juge.exige(
      r[0].courante === 'step' && r.slice(1).every(e => e.courante === null && e.fermee === 'true'),
      `rangée au départ, attributs : ${JSON.stringify(r)}`,
    );

    // Suivant sans informations : les messages de la phase 2, on reste.
    let v = await aller(page, '[data-action="suivant"]');
    const messages = await page.evaluate(() => [
      document.querySelector('#erreur-nom').textContent.trim(),
      document.querySelector('#erreur-dates').textContent.trim(),
    ]);
    juge.exige(
      messages[0] === nv.erreurs.nomManquant && messages[1] === nv.erreurs.datesManquantes,
      `Suivant sans informations : messages ${messages}`,
    );
    juge.exige(
      v.etape === 'infos' && v.focus === 'nom',
      `Suivant sans informations : étape ${v.etape}, focus ${v.focus}`,
    );

    await remplirInformations(page);
    r = await rangee(page);
    juge.exige(
      r[4].etat === 'ouverte' && r[4].fermee === null,
      `informations valides : aperçu ${JSON.stringify(r[4])}`,
    );
    // Informations valides : seule la garde de l'étape fermée retient l'appui sur Climat (le témoin
    // positif, la rangée qui mène à l'aperçu, vient plus bas).
    v = await aller(page, '.etape:nth-child(3) button', { force: true });
    const sansMessage = await page.evaluate(
      () =>
        !document.querySelector('#erreur-nom').textContent.trim() &&
        !document.querySelector('#erreur-dates').textContent.trim(),
    );
    juge.exige(
      v.etape === 'infos' && v.titre === null && sansMessage,
      `Climat, fermée, touchée : étape « ${v.etape} », titre « ${v.titre} », sans message ${sansMessage}`,
    );
    const ordre = await voyageursAvantDates(page);
    juge.exige(ordre.document && ordre.aGauche, `paysage : voyageurs après les dates ${JSON.stringify(ordre)}`);
    const hauteur = (await vue(page)).hauteur;

    v = await aller(page, '[data-action="suivant"]');
    juge.exige(
      v.etape === 'groupe' && v.titre === 'Activités' && v.focus === 'titre-etape',
      `Suivant : ${JSON.stringify(v)}`,
    );
    juge.exige(Math.abs(v.hauteur - hauteur) <= 1, `Activités : la fenêtre passe de ${hauteur} à ${v.hauteur} px`);
    juge.exige(
      JSON.stringify(v.puces.map(p => p.nom)) === JSON.stringify(['Randonnée', 'Camping', 'Plage']),
      `Activités : puces ${v.puces.map(p => p.nom)}`,
    );
    juge.exige(
      v.puces.every(p => p.presse === 'false'),
      'Activités : une puce est déjà pressée',
    );
    juge.exige(v.compte === nv.aucuneChoisie, `Activités : compte « ${v.compte} »`);
    const animation = () => page.$eval('.etape-panneau', p => getComputedStyle(p).animationName);
    juge.exige((await animation()) !== 'none', 'Activités : témoin, le passage d’étape n’est pas animé');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    juge.exige((await animation()) === 'none', 'Activités : animé alors que l’appareil en demande moins');
    await page.emulateMedia({ reducedMotion: 'no-preference' });

    v = await aller(page, '[data-etiquette]:nth-child(2)');
    const camping = v.puces[1];
    juge.exige(
      camping.presse === 'true' && camping.traces.includes(TRACE_COCHE),
      `Camping touchée : ${JSON.stringify(camping)}`,
    );
    juge.exige(!v.puces[0].traces.includes(TRACE_COCHE), 'Randonnée, non choisie, porte une coche');
    juge.exige(v.compte === nv.choisies.one, `Camping touchée : compte « ${v.compte} »`);
    r = await rangee(page);
    juge.exige(
      JSON.stringify(r.map(e => e.etat)) === JSON.stringify(['ouverte', 'courante', 'fermee', 'fermee', 'ouverte']),
      `rangée à Activités : ${r.map(e => e.etat)}`,
    );

    v = await aller(page, '.etape:last-child button');
    r = await rangee(page);
    juge.exige(
      v.etape === 'apercu' && r[4].courante === 'step' && v.focus === 'titre-etape',
      `rangée → Aperçu : ${JSON.stringify(v)}`,
    );
    juge.exige(Math.abs(v.hauteur - hauteur) <= 1, `Aperçu : la fenêtre passe de ${hauteur} à ${v.hauteur} px`);
    v = await aller(page, '.etape:first-child button');
    juge.exige(v.etape === 'infos' && v.nom === 'Vercors', `rangée → Informations : ${JSON.stringify(v)}`);
    juge.exige(Math.abs(v.hauteur - hauteur) <= 1, `Informations : la fenêtre passe de ${hauteur} à ${v.hauteur} px`);
    v = await aller(page, '[data-action="apercu"]');
    juge.exige(v.etape === 'apercu', `« Voir l’aperçu » mène à « ${v.etape} »`);
    v = await aller(page, '.etape:nth-child(2) button');
    juge.exige(v.puces[1]?.presse === 'true', 'revenue à Activités : Camping n’est plus pressée');
    v = await aller(page, '[data-action="precedent"]');
    juge.exige(v.etape === 'infos', `« Précédent » depuis Activités mène à « ${v.etape} »`);
    juge.exige(erreurs.length === 0, `parcours : erreurs dans la page : ${erreurs.join(' | ')}`);
    await contexte.close();
  }

  // Au téléphone : légende, pied collé en bas et son ombre, voyageurs au-dessus des dates.
  {
    const { contexte, page, erreurs } = await ouvrirAssistant(navigateur, serveur.url, { taille: FORMATS.telephone });
    let v = await vue(page);
    juge.exige(v.legende === legende(1, nv.etape.informations), `téléphone : légende « ${v.legende} »`);
    let p = await pied(page);
    juge.exige(Math.abs(p.bas - p.ecran) <= 1, `téléphone : le pied n’est pas en bas (${p.bas} / ${p.ecran})`);
    juge.exige(p.dessous, 'téléphone : pas d’ombre sur le pied alors qu’il reste à défiler');
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    p = await attendreQue(page, () => !document.querySelector('.formulaire-pied').hasAttribute('data-dessous'));
    juge.exige(p, 'téléphone : l’ombre reste une fois tout défilé');
    const ordre = await voyageursAvantDates(page);
    juge.exige(ordre.document && ordre.dessous, `téléphone : voyageurs après les dates ${JSON.stringify(ordre)}`);
    await page.evaluate(() => window.scrollTo(0, 0));
    await remplirInformations(page);
    v = await aller(page, '[data-action="suivant"]');
    juge.exige(v.legende === legende(2, 'Activités'), `téléphone, Activités : légende « ${v.legende} »`);
    p = await pied(page);
    juge.exige(Math.abs(p.bas - p.ecran) <= 1, `téléphone, Activités : pied à ${p.bas} sur ${p.ecran}`);
    juge.exige(erreurs.length === 0, `téléphone : erreurs dans la page : ${erreurs.join(' | ')}`);
    await contexte.close();
  }

  // Bibliothèque sans aucun groupe (Review Focus 1).
  {
    const { contexte, page, erreurs } = await ouvrirAssistant(navigateur, serveur.url, {
      donnees: avecBibliotheque(sansGroupe(fr.bibliothequeDeDepart)),
    });
    const r = await rangee(page);
    juge.exige(
      JSON.stringify(r.map(e => e.nom)) === JSON.stringify([nv.etape.informations, nv.etape.apercu]),
      `sans groupe : rangée ${r.map(e => e.nom)}`,
    );
    juge.exige(!(await page.locator('[data-action="apercu"]').count()), 'sans groupe : « Voir l’aperçu » en double');
    await remplirInformations(page);
    const v = await aller(page, '[data-action="suivant"]');
    const categories = await page.$$eval('.apercu-categorie .categorie-nom', n => n.map(x => x.textContent.trim()));
    juge.exige(
      v.etape === 'apercu' && categories.join(',') === 'Vêtements,Toilette,Alimentation,Papiers',
      `sans groupe : aperçu ${v.etape}, catégories ${categories}`,
    );
    juge.exige(erreurs.length === 0, `sans groupe : erreurs dans la page : ${erreurs.join(' | ')}`);
    await contexte.close();
  }

  // 4 formats × 2 thèmes, aux étapes Informations (remplie) et Activités (Randonnée et Camping).
  for (const theme of ['light', 'dark']) {
    for (const [format, { taille, ecran, tactile }] of Object.entries(TOUS_FORMATS)) {
      const cas = `${format}, ${NOMS_THEME[theme]}`;
      const { contexte, page, sorties, erreurs } = await ouvrirAssistant(navigateur, serveur.url, {
        taille,
        ecran,
        tactile,
        theme,
      });
      await page.fill('#nom', 'Week-end au Vercors');
      await page.fill('#destination', 'Vercors');
      await page.click('[data-mois="1"]');
      await page.click('[data-jour="2026-11-13"]');
      await page.click('[data-jour="2026-11-15"]');
      for (const etape of ['infos', 'activites']) {
        if (etape === 'activites') {
          await page.click('[data-action="suivant"]');
          await page.click('[data-etiquette]:nth-child(1)');
          await page.click('[data-etiquette]:nth-child(2)');
        }
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.mouse.move(0, 0);
        await calme(page);
        await page.screenshot({ path: join(CAPTURES, `assistant-${etape}-${format}-${NOMS_THEME[theme]}.png`) });
        await verifierCommandes(page, juge, `${cas}, ${etape}`);
        await verifierBarres(page, juge, `${cas}, ${etape}`);
        await page.evaluate(() => {
          for (const cote of ['haut', 'bas', 'gauche', 'droite'])
            document.documentElement.style.removeProperty(`--zone-${cote}`);
        });
      }
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
  'Étapes de l’assistant',
  'rangée, Suivant, Précédent, puces, hauteur gardée, légende et pied au téléphone, sans groupe, 4 formats × 2 thèmes',
);
