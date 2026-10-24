// Phase 3 (docs/PLAN.md) : cocher pièce par pièce dans la liste d'un voyage (US-15, US-16, US-17, US-22).
// Au téléphone, horloge de la page simulée (page.clock) pour mener la seconde de répit sans pause :
// - six appuis sur la case de Repas (0 / 16) : « 6 / 16 », case entamée, ordre inchangé ; seize : case
//   pleine, toujours à sa place, et les seize pièces enregistrées ; elle descend après la seconde ;
// - trois coches en moins d'une seconde qui complètent trois objets : rien ne bouge à 900 ms ; à
//   1100 ms, la liste a changé d'ordre une seule fois (ordre relevé à chaque changement de la page) ;
// - la case d'un objet complet de deux pièces demande confirmation : « Annuler » ne change rien et rend
//   le focus à la case, « Vider » remet à 0 ; témoin : celle d'un objet d'une pièce décoche sans fenêtre ;
// - la dernière pièce de Toilette : tampon « Bouclé ! » au bout d'une seconde (pas avant), catégorie
//   repliée une seconde plus tard ; un appui ailleurs pendant le tampon repousse ce repli ;
// - filtre « Reste à emballer » : objets complets masqués, compte des masqués, catégorie bouclée en
//   dernier et atténuée ; une coche sous le filtre disparaît après la seconde ; après rechargement de
//   la page, filtre toujours actif et coches gardées ; une catégorie qui y boucle dit pendant son tampon
//   que ses objets sont masqués, puis descend au fond ;
// - le dernier objet du voyage : bandeau « Sac bouclé ! » (témoin : absent avant), à sa place réservée :
//   la liste en dessous ne bouge pas ;
// - panne d'enregistrement : message en bas, la case revient à son état enregistré ; le message part
//   au bout de six secondes ; une panne au milieu d'une rafale ramène aux pièces vraiment enregistrées,
//   et la case sert encore ensuite ;
// - le filtre basculé pendant la seconde de répit, dans les deux sens : liste rangée sans reste ;
// - animations réduites : la liste se range sans aucune animation ; témoin : sans réglage, elle glisse.
// Téléphone et tablette en portrait × 2 thèmes : cibles de 44 px, pas de défilement de côté, rien sous
// les barres système (filtre, sac bouclé, panne), et captures de ces états et du tampon.
import { mkdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { chromium } from 'playwright';
import { attendreQue, calme } from './outils/attente.mjs';
import { demarrerServeur } from './outils/serveur.mjs';
import {
  CAPTURES,
  FORMATS,
  NOMS_THEME,
  RACINE,
  creerJuge,
  ecrireStockage,
  lireStockage,
  ouvrir,
  verifierBarres,
  verifierCommandes,
} from './outils/page.mjs';
import { DONNEES, avecPieces } from './outils/voyage-essai.mjs';

const fr = JSON.parse(await readFile(join(RACINE, 'src/i18n/fr.json'), 'utf8'));
const remplir = (texte, valeurs) => texte.replace(/\{(\w+)\}/g, (_, nom) => String(valeurs[nom]));
const TOUT_DANS_LE_SAC = avecPieces(o => o.quantite);
const juge = creerJuge();
const serveur = await demarrerServeur();
const navigateur = await chromium.launch();

// Le voyage ouvert au téléphone, l'horloge de la page arrêtée : seul le test la fait avancer.
async function ouvrirVoyage({ donnees = DONNEES, taille = FORMATS.telephone, theme = 'light' } = {}) {
  const ouvert = await ouvrir(navigateur, serveur.url, {
    taille,
    theme,
    donnees,
    adresse: '#/voyage/v1',
    horloge: true,
  });
  await ouvert.page.clock.pauseAt((await ouvert.page.evaluate(() => Date.now())) + 10);
  return ouvert;
}

async function appuyer(page, id, fois = 1) {
  for (let i = 0; i < fois; i++) await page.click(`.objet[data-id="${id}"] .case`);
}

const ordre = (page, categorieId) =>
  page.evaluate(
    id => [...document.querySelectorAll(`.categorie[data-id="${id}"] .objet`)].map(o => o.dataset.id).join(','),
    categorieId,
  );

const ligne = (page, id) =>
  page.evaluate(id => {
    const o = document.querySelector(`.objet[data-id="${id}"]`);
    return o && { etat: o.dataset.etat, quantite: o.querySelector('.objet-quantite').textContent };
  }, id);

const enregistre = (page, id, n) =>
  attendreQue(
    page,
    ({ id, n }) =>
      JSON.parse(localStorage.getItem('baluchon-essai')).objetsDuVoyage.find(o => o.id === id).dansLeSac === n,
    { id, n },
  );

const fenetreOuverte = page =>
  page.evaluate(() => {
    const d = document.querySelector('dialog[role="alertdialog"][open]');
    return d && { titre: d.querySelector('h2').textContent.trim(), texte: d.querySelector('p').textContent.trim() };
  });

try {
  await mkdir(CAPTURES, { recursive: true });

  // Repas, pièce par pièce.
  {
    const { contexte, page, erreurs } = await ouvrirVoyage({ donnees: avecPieces({ 'o-rep': 0 }) });
    const avant = await ordre(page, 'c-ali');
    await appuyer(page, 'o-rep', 6);
    const six = await ligne(page, 'o-rep');
    juge.exige(
      six?.quantite === '6 / 16' && six.etat === 'entame' && (await ordre(page, 'c-ali')) === avant,
      `six appuis sur Repas : ${JSON.stringify(six)}, ordre ${await ordre(page, 'c-ali')}`,
    );
    await appuyer(page, 'o-rep', 10);
    const seize = await ligne(page, 'o-rep');
    juge.exige(
      seize?.etat === 'plein' && (await ordre(page, 'c-ali')) === avant,
      `seize appuis sur Repas : ${JSON.stringify(seize)}, ordre ${await ordre(page, 'c-ali')}`,
    );
    juge.exige(await enregistre(page, 'o-rep', 16), 'seize appuis sur Repas : pas seize pièces enregistrées');
    await page.clock.runFor(1000);
    const apres = await ordre(page, 'c-ali');
    juge.exige(apres === 'o-caf,o-gou,o-rep', `Repas complet : ordre après la seconde ${apres}`);
    juge.exige(erreurs.length === 0, `Repas : erreurs dans la page : ${erreurs.join(' | ')}`);
    await contexte.close();
  }

  // Trois coches rapides : un seul déplacement, une seconde après la dernière.
  {
    const { contexte, page, erreurs } = await ouvrirVoyage();
    // Relevé à chaque changement de la page, plus fin qu'à chaque image : un ordre intermédiaire,
    // même effacé avant d'être peint, serait compté.
    await page.evaluate(() => {
      window.ordres = [];
      const noter = () => {
        const o = [...document.querySelectorAll('.categorie[data-id="c-vet"] .objet')].map(e => e.dataset.id).join();
        if (window.ordres.at(-1) !== o) window.ordres.push(o);
      };
      noter();
      new MutationObserver(noter).observe(document.querySelector('#app'), { childList: true, subtree: true });
    });
    for (const id of ['o-pan', 'o-pyj', 'o-pul']) await appuyer(page, id);
    await page.clock.runFor(900);
    const a900 = await page.evaluate(() => window.ordres);
    await page.clock.runFor(200);
    const glissements = await page.evaluate(() => document.getAnimations().length);
    const a1100 = await page.evaluate(() => window.ordres);
    juge.exige(a900.length === 1, `trois coches : l’ordre a bougé avant la seconde ${JSON.stringify(a900)}`);
    juge.exige(
      a1100.length === 2 && a1100[1] === 'o-sou,o-tsh,o-cha,o-pan,o-pul,o-pyj',
      `trois coches : ordres successifs ${JSON.stringify(a1100)}`,
    );
    juge.exige(glissements > 0, 'trois coches : la liste se range sans glisser');
    juge.exige(erreurs.length === 0, `trois coches : erreurs dans la page : ${erreurs.join(' | ')}`);
    await contexte.close();
  }

  // Vider un objet complet : confirmation au-delà d'une pièce.
  {
    const { contexte, page, erreurs } = await ouvrirVoyage();
    await appuyer(page, 'o-gou');
    const demande = await attendreQue(page, () => document.querySelector('dialog[role="alertdialog"][open]') !== null);
    const vue = await fenetreOuverte(page);
    juge.exige(
      demande &&
        vue?.titre === remplir(fr.fiche.confirmerTitre, { nom: 'Gourde' }) &&
        vue.texte === remplir(fr.fiche.confirmerTexte, { n: 2 }),
      `Gourde complète : fenêtre ${JSON.stringify(vue)}`,
    );
    // Sans fenêtre, la suite n'a pas de sens : le constat ci-dessus suffit.
    const bouton = nom => page.locator('dialog[role="alertdialog"]').getByRole('button', { name: nom, exact: true });
    if (demande) {
      await bouton(fr.fenetre.annuler).click();
      await attendreQue(page, () => !document.querySelector('dialog'));
      const annule = await ligne(page, 'o-gou');
      const focus = await page.evaluate(() => document.activeElement?.closest('.objet')?.dataset.id);
      const garde = (await lireStockage(page)).objetsDuVoyage.find(o => o.id === 'o-gou').dansLeSac;
      juge.exige(
        annule?.etat === 'plein' && garde === 2 && focus === 'o-gou',
        `Annuler : ${JSON.stringify(annule)}, ${garde} enregistrées, focus ${focus}`,
      );
      await appuyer(page, 'o-gou');
      await attendreQue(page, () => document.querySelector('dialog[role="alertdialog"][open]') !== null);
      await bouton(fr.fiche.vider).click();
      const vide = await attendreQue(
        page,
        () => document.querySelector('.objet[data-id="o-gou"]')?.dataset.etat === 'vide',
      );
      juge.exige(vide && (await enregistre(page, 'o-gou', 0)), `Vider : ${JSON.stringify(await ligne(page, 'o-gou'))}`);
      await attendreQue(page, () => !document.querySelector('dialog'));
    }
    await appuyer(page, 'o-gel');
    const sansFenetre = await page.evaluate(() => !document.querySelector('dialog[open]'));
    const gel = await ligne(page, 'o-gel');
    juge.exige(
      sansFenetre && gel?.etat === 'vide',
      `Gel douche (1 pièce) : fenêtre ${!sansFenetre}, ${JSON.stringify(gel)}`,
    );
    juge.exige(erreurs.length === 0, `confirmation : erreurs dans la page : ${erreurs.join(' | ')}`);
    await contexte.close();
  }

  // Dernière pièce de Toilette : tampon après une seconde, repli une seconde plus tard.
  {
    const { contexte, page, erreurs } = await ouvrirVoyage();
    const toilette = () =>
      page.evaluate(() => {
        const c = document.querySelector('.categorie[data-id="c-toi"]');
        const tampon = c.querySelector('.tampon');
        return {
          tampon: Boolean(tampon && tampon.getBoundingClientRect().width > 0),
          ouverte: c.querySelector('.categorie-tete').getAttribute('aria-expanded'),
        };
      });
    await appuyer(page, 'o-den');
    await page.clock.runFor(900);
    const a900 = await toilette();
    await page.clock.runFor(100);
    const a1000 = await toilette();
    await page.clock.runFor(1000);
    const a2000 = await toilette();
    juge.exige(!a900.tampon && a900.ouverte === 'true', `Toilette à 900 ms : ${JSON.stringify(a900)}`);
    juge.exige(a1000.tampon && a1000.ouverte === 'true', `Toilette à 1000 ms : ${JSON.stringify(a1000)}`);
    juge.exige(a2000.tampon && a2000.ouverte === 'false', `Toilette à 2000 ms : ${JSON.stringify(a2000)}`);
    juge.exige(erreurs.length === 0, `Toilette : erreurs dans la page : ${erreurs.join(' | ')}`);
    await contexte.close();
  }

  // Un appui ailleurs pendant le tampon repousse le repli : rien ne bouge moins d'une seconde après un appui.
  {
    const { contexte, page, erreurs } = await ouvrirVoyage();
    const ouverte = () =>
      page.evaluate(() =>
        document.querySelector('.categorie[data-id="c-toi"] .categorie-tete').getAttribute('aria-expanded'),
      );
    await appuyer(page, 'o-den');
    await page.clock.runFor(1000);
    await appuyer(page, 'o-tsh');
    await page.clock.runFor(1000);
    const repousse = await ouverte();
    await page.clock.runFor(1000);
    const replie = await ouverte();
    juge.exige(
      repousse === 'true' && replie === 'false',
      `Toilette, appui pendant le tampon : ouverte ${repousse}, puis ${replie}`,
    );
    juge.exige(erreurs.length === 0, `appui pendant le tampon : erreurs dans la page : ${erreurs.join(' | ')}`);
    await contexte.close();
  }

  // Filtre « Reste à emballer », retenu après rechargement.
  {
    const { contexte, page, erreurs } = await ouvrirVoyage();
    const vu = () =>
      page.evaluate(() => ({
        presse: document.querySelector('[data-action="filtre"]').getAttribute('aria-pressed'),
        pleins: document.querySelectorAll('.objet[data-etat="plein"]').length,
        masques: document.querySelector('.masques')?.textContent.trim(),
        categories: [...document.querySelectorAll('.categorie')].map(
          c => c.dataset.id + (c.hasAttribute('data-attenuee') ? '~' : ''),
        ),
        cafe: Boolean(document.querySelector('.objet[data-id="o-caf"]')),
      }));
    await page.click('[data-action="filtre"]');
    await page.clock.runFor(1000);
    const filtre = await vu();
    juge.exige(
      filtre.presse === 'true' &&
        filtre.pleins === 0 &&
        filtre.masques === remplir(fr.voyage.masques.other, { n: 6 }) &&
        filtre.categories.join() === 'c-vet,c-toi,c-ali,c-pap~',
      `filtre : ${JSON.stringify(filtre)}`,
    );
    await appuyer(page, 'o-caf');
    const coche = await vu();
    await page.clock.runFor(1000);
    const range = await vu();
    juge.exige(
      coche.cafe && !range.cafe,
      `filtre : Café coché ${JSON.stringify(coche)}, puis ${JSON.stringify(range)}`,
    );
    await enregistre(page, 'o-caf', 1);
    await page.reload();
    await attendreQue(page, () => document.querySelector('#app')?.dataset.ecran === 'voyage');
    const recharge = await vu();
    juge.exige(
      recharge.presse === 'true' && !recharge.cafe && recharge.masques === remplir(fr.voyage.masques.other, { n: 7 }),
      `filtre après rechargement : ${JSON.stringify(recharge)}`,
    );
    juge.exige(erreurs.length === 0, `filtre : erreurs dans la page : ${erreurs.join(' | ')}`);
    await contexte.close();
  }

  // Sous le filtre, une catégorie qui boucle : pendant son tampon, elle dit pourquoi elle est vide, puis
  // elle descend au fond, atténuée, dans l'ordre de la bibliothèque.
  {
    const { contexte, page, erreurs } = await ouvrirVoyage();
    await page.click('[data-action="filtre"]');
    await appuyer(page, 'o-den');
    await page.clock.runFor(1000);
    const info = await page.evaluate(
      () => document.querySelector('.categorie[data-id="c-toi"] .ligne-info')?.textContent.trim() ?? null,
    );
    await page.clock.runFor(1000);
    const ordreFinal = await page.evaluate(() =>
      [...document.querySelectorAll('.categorie')]
        .map(c => c.dataset.id + (c.hasAttribute('data-attenuee') ? '~' : ''))
        .join(),
    );
    juge.exige(
      info === remplir(fr.voyage.categorieMasquee.other, { n: 3 }) && ordreFinal === 'c-vet,c-ali,c-pap~,c-toi~',
      `filtre, Toilette bouclée : « ${info} », puis ${ordreFinal}`,
    );
    juge.exige(erreurs.length === 0, `filtre, Toilette : erreurs dans la page : ${erreurs.join(' | ')}`);
    await contexte.close();
  }

  // Le dernier objet du voyage : « Sac bouclé ! ».
  {
    const { contexte, page, erreurs } = await ouvrirVoyage({
      donnees: avecPieces(o => (o.id === 'o-den' ? 0 : o.quantite)),
    });
    const bandeau = () =>
      page.evaluate(() => {
        const p = document.querySelector('.progression');
        return p.hasAttribute('data-boucle') ? p.querySelector('.progression-titre')?.textContent.trim() : null;
      });
    // Le bandeau a sa place réservée : rien ne bouge en dessous (mesuré sans animation).
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const haut = () => page.evaluate(() => document.querySelector('.categorie').getBoundingClientRect().top);
    const avant = await bandeau();
    const hautAvant = await haut();
    await appuyer(page, 'o-den');
    await page.clock.runFor(1000);
    const apres = await bandeau();
    const hautApres = await haut();
    juge.exige(avant === null && apres === fr.voyage.sacBoucle, `sac bouclé : avant ${avant}, après ${apres}`);
    juge.exige(
      Math.abs(hautApres - hautAvant) < 0.5,
      `sac bouclé : la liste a bougé de ${hautApres - hautAvant} px sous le bandeau`,
    );
    juge.exige(erreurs.length === 0, `sac bouclé : erreurs dans la page : ${erreurs.join(' | ')}`);
    await contexte.close();
  }

  // Panne d'enregistrement : message en bas, la case revient à ce qui est enregistré.
  {
    const { contexte, page } = await ouvrirVoyage();
    await ecrireStockage(page, { ...(await lireStockage(page)), pannes: ['reglerDansLeSac'] });
    await appuyer(page, 'o-caf');
    const message = await attendreQue(page, () => document.querySelector('.alerte[role="alert"]')?.textContent.trim());
    const cafe = await ligne(page, 'o-caf');
    juge.exige(
      message === fr.voyage.erreurEnregistrement && cafe?.etat === 'vide',
      `panne : message « ${message} », ${JSON.stringify(cafe)}`,
    );
    await page.clock.runFor(6000);
    juge.exige(
      await page.evaluate(() => !document.querySelector('.alerte')),
      'panne : le message reste après six secondes',
    );
    await contexte.close();
  }

  // Panne au milieu d'une rafale : dix appuis d'un coup sur Repas (0 / 16), la panne armée par la
  // 3e écriture. L'écran revient aux trois pièces enregistrées, le dit, et la case sert encore.
  {
    const { contexte, page, erreurs } = await ouvrirVoyage({ donnees: avecPieces({ 'o-rep': 0 }) });
    await page.evaluate(() => {
      const ecrire = Storage.prototype.setItem;
      let ecritures = 0;
      Storage.prototype.setItem = function (cle, valeur) {
        if (cle === 'baluchon-essai' && ++ecritures === 3)
          valeur = JSON.stringify({ ...JSON.parse(valeur), pannes: ['reglerDansLeSac'] });
        ecrire.call(this, cle, valeur);
      };
      for (let i = 0; i < 10; i++) document.querySelector('.objet[data-id="o-rep"] .case').click();
    });
    const message = await attendreQue(page, () => document.querySelector('.alerte[role="alert"]')?.textContent.trim());
    const repas = await ligne(page, 'o-rep');
    const garde = (await lireStockage(page)).objetsDuVoyage.find(o => o.id === 'o-rep').dansLeSac;
    juge.exige(
      message === fr.voyage.erreurEnregistrement && repas?.quantite === '3 / 16' && garde === 3,
      `panne en rafale : message « ${message} », ${JSON.stringify(repas)}, ${garde} enregistrées`,
    );
    const { pannes, ...sansPanne } = await lireStockage(page);
    await ecrireStockage(page, sansPanne);
    await appuyer(page, 'o-rep');
    const reprise = await ligne(page, 'o-rep');
    juge.exige(
      pannes?.length === 1 && reprise?.quantite === '4 / 16' && (await enregistre(page, 'o-rep', 4)),
      `panne en rafale, la case ensuite : ${JSON.stringify(reprise)}`,
    );
    const autres = erreurs.filter(e => !e.includes('Panne simulée : reglerDansLeSac'));
    juge.exige(autres.length === 0, `panne en rafale : erreurs dans la page : ${autres.join(' | ')}`);
    await contexte.close();
  }

  // Le filtre basculé pendant la seconde de répit, un objet tout juste complété (allumé : Pantalons ;
  // éteint : Pyjama, qui doit réapparaître puis descendre) : une fois la liste rangée, aucun objet à
  // demi effacé (immobile, opaque), l'ordre de Vêtements et les masqués sont justes.
  for (const [allume, id, attendu, masques] of [
    [false, 'o-pan', 'o-pul,o-pyj,o-sou,o-tsh', remplir(fr.voyage.masques.other, { n: 7 })],
    [true, 'o-pyj', 'o-pan,o-pul,o-sou,o-tsh,o-cha,o-pyj', null],
  ]) {
    const { contexte, page, erreurs } = await ouvrirVoyage();
    if (allume) await page.click('[data-action="filtre"]');
    await appuyer(page, id);
    await page.clock.runFor(500);
    await page.click('[data-action="filtre"]');
    await page.clock.runFor(1000);
    await attendreQue(page, () => !document.getAnimations().some(a => a.playState === 'running'));
    const vu = await page.evaluate(() => ({
      vetements: [...document.querySelectorAll('.categorie[data-id="c-vet"] .objet')].map(o => o.dataset.id).join(),
      masques: document.querySelector('.masques')?.textContent.trim() ?? null,
      troubles: [...document.querySelectorAll('.objet')]
        .filter(o => getComputedStyle(o).opacity !== '1' || getComputedStyle(o).transform !== 'none')
        .map(o => o.dataset.id),
    }));
    const cas = `filtre ${allume ? 'éteint' : 'allumé'} pendant le répit`;
    juge.exige(
      vu.vetements === attendu && vu.masques === masques && vu.troubles.length === 0,
      `${cas} : ${JSON.stringify(vu)}`,
    );
    juge.exige(erreurs.length === 0, `${cas} : erreurs dans la page : ${erreurs.join(' | ')}`);
    await contexte.close();
  }

  // Animations réduites : la liste se range sans glisser.
  {
    const { contexte, page, erreurs } = await ouvrirVoyage();
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await appuyer(page, 'o-pan');
    await page.clock.runFor(1000);
    const vu = await page.evaluate(() => ({
      animations: document.getAnimations().length,
      dernier: [...document.querySelectorAll('.categorie[data-id="c-vet"] .objet')].at(-1)?.dataset.id,
    }));
    juge.exige(vu.animations === 0 && vu.dernier === 'o-pan', `animations réduites : ${JSON.stringify(vu)}`);
    juge.exige(erreurs.length === 0, `animations réduites : erreurs dans la page : ${erreurs.join(' | ')}`);
    await contexte.close();
  }

  // Les états à voir, en une colonne, clair et sombre.
  const UNE_COLONNE = { telephone: FORMATS.telephone, 'tablette-portrait': FORMATS['tablette-portrait'] };
  for (const theme of ['light', 'dark']) {
    for (const [format, taille] of Object.entries(UNE_COLONNE)) {
      const cas = etat => `${etat}, ${format}, ${NOMS_THEME[theme]}`;
      const capture = (page, etat) =>
        page.screenshot({ path: join(CAPTURES, `voyage-${etat}-${format}-${NOMS_THEME[theme]}.png`) });

      // Filtre actif et sac bouclé : états stables, horloge réelle.
      const filtre = await ouvrir(navigateur, serveur.url, { taille, theme, donnees: DONNEES, adresse: '#/voyage/v1' });
      await filtre.page.click('[data-action="filtre"]');
      await calme(filtre.page);
      await verifierCommandes(filtre.page, juge, cas('filtre'));
      await capture(filtre.page, 'filtre');
      await verifierBarres(filtre.page, juge, cas('filtre'));
      await filtre.contexte.close();

      const boucle = await ouvrir(navigateur, serveur.url, {
        taille,
        theme,
        donnees: TOUT_DANS_LE_SAC,
        adresse: '#/voyage/v1',
      });
      await verifierCommandes(boucle.page, juge, cas('sac bouclé'));
      await capture(boucle.page, 'boucle');
      await verifierBarres(boucle.page, juge, cas('sac bouclé'));
      await boucle.contexte.close();

      // Tampon tout juste posé : l'horloge reste arrêtée avant le repli.
      const tampon = await ouvrirVoyage({ taille, theme });
      await appuyer(tampon.page, 'o-den');
      await tampon.page.clock.runFor(1000);
      await tampon.page.evaluate(() =>
        document.querySelector('.categorie[data-id="c-toi"]').scrollIntoView({ block: 'center' }),
      );
      await attendreQue(tampon.page, () => !document.getAnimations().some(a => a.playState === 'running'));
      await verifierCommandes(tampon.page, juge, cas('tampon'));
      await capture(tampon.page, 'tampon');
      await tampon.contexte.close();

      // Panne : le message est jugé sous les barres système pendant ses six secondes.
      const panne = await ouvrirVoyage({ taille, theme });
      await ecrireStockage(panne.page, { ...(await lireStockage(panne.page)), pannes: ['reglerDansLeSac'] });
      await appuyer(panne.page, 'o-caf');
      await attendreQue(panne.page, () => document.querySelector('.alerte') !== null);
      await panne.page.clock.resume();
      await capture(panne.page, 'panne');
      await verifierBarres(panne.page, juge, cas('panne'));
      juge.exige(
        await panne.page.evaluate(() => document.querySelector('.alerte') !== null),
        `${cas('panne')} : message parti avant la fin de la vérification`,
      );
      await panne.contexte.close();
    }
  }
} finally {
  await navigateur.close();
  await serveur.fermer();
}
juge.conclure(
  'Gestes dans la liste d’un voyage',
  'pièce par pièce, seconde de répit, confirmation, tampon, filtre, sac bouclé, panne (rafale comprise), filtre pendant le répit, animations réduites, 2 formats × 2 thèmes',
);
