// Phase 3 (docs/PLAN.md) : la fiche d'un objet du voyage (US-15, US-16 ; maquette docs/maquettes/voyage/,
// états « fiche » et « confirmation »).
// - appui sur la ligne Repas (6 / 16) : fiche modale « Repas », ligne « Alimentation · 2 par jour et par
//   personne », sortie « 6 », « sur 16 », note visible ;
// - « + » : 7 dans la fiche, « 7 / 16 » sur la ligne derrière, 7 enregistrées ; « Tout dans le sac » :
//   16, « + » et « Tout dans le sac » désactivés ; « Vider » : confirmation « Les 16 pièces repartent
//   hors du sac. », puis 0, « − » et « Vider » désactivés ; avec une seule pièce, « Vider » ne demande rien ;
// - panne d'enregistrement depuis la fiche : la fiche revient à ce qui est enregistré et le message
//   se voit par-dessus la fiche ;
// - Échap ferme et rend le focus à la ligne ; un appui sur le voile ferme ;
// - téléphone : la fiche est posée sur la barre système du bas (bord bas = hauteur moins la zone) et
//   prend toute la largeur entre les barres ; tablette : fenêtre centrée de 480 px ;
// - au doigt (téléphone), glisser l'en-tête de 120 px vers le bas ferme la fiche ; témoin : 40 px ne
//   la ferme pas, elle revient à sa place ;
// - un objet sans note n'a pas de bloc « Note » ;
// - quitter le voyage, fiche et confirmation ouvertes : Mes voyages s'affiche sans fenêtre ;
// - focus à la fermeture quand la ligne n'est plus dessinée (horloge simulée) : « Tout dans le sac » sur
//   Dentifrice, dernière pièce de Toilette, répit puis tampon passés (catégorie repliée), Échap : focus
//   sur l'en-tête de Toilette ; sous le filtre, Café soluble complété puis masqué : focus sur une
//   commande visible, jamais sur la page ; témoin : sans attendre, le focus revient à la ligne ;
// - l'objet de la fiche disparaît à la relecture qui suit une panne : la fiche se ferme, le message reste ;
// - téléphone et tablette en portrait × 2 thèmes : cibles de 44 px, rien sous les barres système,
//   captures de la fiche et de sa confirmation.
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
  attendreEcran,
  creerJuge,
  ecrireStockage,
  lireStockage,
  ouvrir,
  verifierBarres,
  verifierCommandes,
} from './outils/page.mjs';
import { verifierPiedQuestion } from './outils/assistant.mjs';
import { DONNEES } from './outils/voyage-essai.mjs';

const fr = JSON.parse(await readFile(join(RACINE, 'src/i18n/fr.json'), 'utf8'));
const remplir = (texte, valeurs) => texte.replace(/\{(\w+)\}/g, (_, nom) => String(valeurs[nom]));
const juge = creerJuge();
const serveur = await demarrerServeur();
const navigateur = await chromium.launch();

// horloge : l'horloge de la page arrêtée, que seul le test fait avancer (seconde de répit, tampon).
async function ouvrirVoyage({ taille = FORMATS.telephone, theme = 'light', horloge = false } = {}) {
  const ouvert = await ouvrir(navigateur, serveur.url, {
    taille,
    theme,
    donnees: DONNEES,
    adresse: '#/voyage/v1',
    horloge,
  });
  if (horloge) await ouvert.page.clock.pauseAt((await ouvert.page.evaluate(() => Date.now())) + 10);
  return ouvert;
}

// attendreCalme : faux sous horloge arrêtée (calme() compte sur les images de la page).
async function ouvrirFiche(page, id, { attendreCalme = true } = {}) {
  await page.click(`.objet[data-id="${id}"] .objet-corps`);
  const ouverte = await attendreQue(page, () => document.querySelector('dialog.fiche[open]') !== null);
  if (attendreCalme) await calme(page);
  return ouverte;
}

// Ce qui a le focus : une commande visible (action et objet ou catégorie), ou la page elle-même.
const focusActuel = page =>
  page.evaluate(() => {
    const el = document.activeElement;
    if (!el || el === document.body) return 'body';
    const visible = el.getBoundingClientRect().width > 0;
    return `${el.dataset.action ?? el.tagName.toLowerCase()}:${el.dataset.id ?? ''}${visible ? '' : ' (invisible)'}`;
  });

// Ce que la fiche montre : titre, ligne de règle, compteur, boutons désactivés, note.
const fiche = page =>
  page.evaluate(() => {
    const d = document.querySelector('dialog.fiche[open]');
    if (!d) return null;
    const texte = s => d.querySelector(s)?.textContent.trim() ?? null;
    const titre = document.getElementById(d.getAttribute('aria-labelledby'));
    return {
      modale: d.matches(':modal'),
      titre: titre && d.contains(titre) ? titre.textContent.trim() : null,
      regle: texte('.fiche-regle'),
      sortie: texte('.compteur output'),
      sur: texte('.compteur-total'),
      desactives: [...d.querySelectorAll('[data-fiche][aria-disabled="true"]')].map(b => b.dataset.fiche).join(),
      note: texte('.fiche-note'),
    };
  });

// Un bouton absent est une faute dite, pas un arrêt du test : la suite juge ce qui en découle.
const appuyerFiche = (page, quoi) =>
  page
    .locator(`dialog.fiche [data-fiche="${quoi}"]`)
    .click({ timeout: 3000 })
    .catch(() => juge.exige(false, `bouton « ${quoi} » de la fiche introuvable`));
const quantiteLigne = (page, id) =>
  page.evaluate(id => document.querySelector(`.objet[data-id="${id}"] .objet-quantite`)?.textContent, id);
const enregistre = (page, id, n) =>
  attendreQue(
    page,
    ({ id, n }) =>
      JSON.parse(localStorage.getItem('baluchon-essai')).objetsDuVoyage.find(o => o.id === id).dansLeSac === n,
    { id, n },
  );
const confirmation = page =>
  page.evaluate(() => {
    const d = document.querySelector('dialog[role="alertdialog"][open]');
    return d && d.querySelector('p').textContent.trim();
  });
const fermee = page => attendreQue(page, () => !document.querySelector('dialog'));
const rect = page =>
  page.evaluate(() => {
    const r = document.querySelector('dialog.fiche[open]')?.getBoundingClientRect();
    if (!r) return null;
    return {
      left: r.left,
      right: r.right,
      top: r.top,
      bottom: r.bottom,
      width: r.width,
      W: innerWidth,
      H: innerHeight,
    };
  });

// Un glissé au doigt, par le protocole du navigateur : de vrais événements tactiles, en plusieurs pas.
async function glisser(page, depuis, dy) {
  const cdp = await page.context().newCDPSession(page);
  const point = y => [{ x: depuis.x, y }];
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: point(depuis.y) });
  for (let pas = 1; pas <= 8; pas++)
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: point(depuis.y + (dy * pas) / 8) });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await cdp.detach();
}

const pointDeLEntete = page =>
  page.evaluate(() => {
    const r = document.querySelector('dialog.fiche .fenetre-entete').getBoundingClientRect();
    return { x: r.left + r.width / 3, y: r.top + r.height / 2 };
  });

try {
  await mkdir(CAPTURES, { recursive: true });

  // Repas : contenu, compteur, tout, vider.
  {
    const { contexte, page, erreurs } = await ouvrirVoyage();
    const ouverte = await ouvrirFiche(page, 'o-rep');
    const vue = await fiche(page);
    juge.exige(
      ouverte &&
        vue?.modale &&
        vue.titre === 'Repas' &&
        vue.regle === 'Alimentation · 2 par jour et par personne' &&
        vue.sortie === '6' &&
        vue.sur === remplir(fr.fiche.sur, { total: 16 }) &&
        vue.desactives === '' &&
        vue.note === 'Prévoir un repas de secours par personne en plus.',
      `fiche de Repas : ${JSON.stringify(vue)}`,
    );
    if (ouverte) {
      await appuyerFiche(page, 'plus');
      const sept = await fiche(page);
      juge.exige(
        sept?.sortie === '7' &&
          (await quantiteLigne(page, 'o-rep')) === '7 / 16' &&
          (await enregistre(page, 'o-rep', 7)),
        `« + » : fiche ${JSON.stringify(sept)}, ligne ${await quantiteLigne(page, 'o-rep')}`,
      );
      await appuyerFiche(page, 'tout');
      const tout = await fiche(page);
      juge.exige(
        tout?.sortie === '16' && tout.desactives === 'plus,tout' && (await enregistre(page, 'o-rep', 16)),
        `« Tout dans le sac » : ${JSON.stringify(tout)}`,
      );
      // Un bouton désactivé ne fait rien (Playwright refuse d'appuyer sur un bouton aria-disabled : on force).
      await page.locator('dialog.fiche [data-fiche="plus"]').click({ force: true });
      juge.exige((await fiche(page))?.sortie === '16', '« + » désactivé : le compteur a bougé');
      await appuyerFiche(page, 'vider');
      const question = await attendreQue(page, () => document.querySelector('dialog[role="alertdialog"][open]'));
      juge.exige(
        question && (await confirmation(page)) === remplir(fr.fiche.confirmerTexte, { n: 16 }),
        `« Vider » : confirmation « ${await confirmation(page)} »`,
      );
      if (question) {
        await page
          .locator('dialog[role="alertdialog"]')
          .getByRole('button', { name: fr.fiche.vider, exact: true })
          .click();
        await attendreQue(page, () => !document.querySelector('dialog[role="alertdialog"]'));
        const vide = await fiche(page);
        juge.exige(
          vide?.sortie === '0' && vide.desactives === 'moins,vider' && (await enregistre(page, 'o-rep', 0)),
          `« Vider » confirmé : ${JSON.stringify(vide)}`,
        );
      }
      await appuyerFiche(page, 'plus');
      await appuyerFiche(page, 'vider');
      const sansQuestion = await page.evaluate(() => !document.querySelector('dialog[role="alertdialog"]'));
      juge.exige(
        sansQuestion && (await fiche(page))?.sortie === '0' && (await enregistre(page, 'o-rep', 0)),
        `« Vider » une seule pièce : confirmation ${!sansQuestion}, ${JSON.stringify(await fiche(page))}`,
      );
      // Échap ferme ; le focus revient à la ligne.
      await page.keyboard.press('Escape');
      const ferme = await fermee(page);
      const focus = await page.evaluate(() => {
        const el = document.activeElement;
        return el?.matches('.objet-corps') ? el.dataset.id : el?.outerHTML.slice(0, 60);
      });
      juge.exige(ferme && focus === 'o-rep', `Échap : fermée ${ferme}, focus ${focus}`);
    }
    juge.exige(erreurs.length === 0, `Repas : erreurs dans la page : ${erreurs.join(' | ')}`);
    await contexte.close();
  }

  // Appui sur le voile, objet sans note, place au téléphone, glissé vers le bas.
  {
    const { contexte, page, erreurs } = await ouvrirVoyage();
    await ouvrirFiche(page, 'o-caf');
    const cafe = await fiche(page);
    juge.exige(
      cafe?.titre === 'Café soluble' &&
        cafe.regle === 'Alimentation · 1 en tout' &&
        cafe.note === null &&
        (await page.evaluate(() => document.querySelectorAll('dialog.fiche h3').length)) === 1,
      `Café soluble (sans note) : ${JSON.stringify(cafe)}`,
    );
    await page.touchscreen.tap(200, 20);
    const voile = await fermee(page);
    juge.exige(voile, 'appui sur le voile : la fiche reste ouverte');
    // Restée ouverte, elle rendrait la suite impossible : on la ferme autrement.
    if (!voile) {
      await page.keyboard.press('Escape');
      await fermee(page);
    }

    // Place au téléphone, barres système posées : sur la barre du bas, toute la largeur entre les barres.
    await page.evaluate(() => {
      for (const [cote, taille] of Object.entries({ haut: 64, bas: 48, gauche: 24, droite: 24 }))
        document.documentElement.style.setProperty(`--zone-${cote}`, `${taille}px`);
    });
    await ouvrirFiche(page, 'o-rep');
    const place = await rect(page);
    juge.exige(
      place &&
        Math.abs(place.bottom - (place.H - 48)) < 0.5 &&
        Math.abs(place.left - 24) < 0.5 &&
        Math.abs(place.right - (place.W - 24)) < 0.5,
      `téléphone : place de la fiche ${JSON.stringify(place)}`,
    );

    // Glissé de 40 px : la fiche revient à sa place ; de 120 px : elle se ferme.
    if (place) await glisser(page, await pointDeLEntete(page), 40);
    await calme(page);
    const apres40 = await page.evaluate(() => document.querySelector('dialog.fiche')?.open ?? false);
    const place40 = apres40 && (await rect(page));
    juge.exige(
      apres40 && place && Math.abs(place40.bottom - place.bottom) < 0.5,
      `glissé de 40 px : ouverte ${apres40}, ${JSON.stringify(place40)}`,
    );
    if (apres40) {
      await glisser(page, await pointDeLEntete(page), 120);
      juge.exige(await fermee(page), 'glissé de 120 px : la fiche reste ouverte');
    }
    juge.exige(erreurs.length === 0, `voile et glissé : erreurs dans la page : ${erreurs.join(' | ')}`);
    await contexte.close();
  }

  // Tablette : fenêtre centrée de 480 px.
  {
    const { contexte, page } = await ouvrirVoyage({ taille: FORMATS['tablette-portrait'] });
    await ouvrirFiche(page, 'o-rep');
    const place = await rect(page);
    juge.exige(
      place &&
        Math.abs(place.width - 480) < 0.5 &&
        Math.abs(place.left + place.width / 2 - place.W / 2) < 0.5 &&
        Math.abs(place.top + (place.bottom - place.top) / 2 - place.H / 2) < 1,
      `tablette : place de la fiche ${JSON.stringify(place)}`,
    );
    await contexte.close();
  }

  // Panne d'enregistrement depuis la fiche.
  {
    const { contexte, page } = await ouvrirVoyage();
    await ouvrirFiche(page, 'o-rep');
    await ecrireStockage(page, { ...(await lireStockage(page)), pannes: ['reglerDansLeSac'] });
    await appuyerFiche(page, 'plus');
    const message = await attendreQue(page, () => document.querySelector('.alerte[role="alert"]')?.textContent.trim());
    const vue = await fiche(page);
    const visible = await page.evaluate(() => {
      const a = document.querySelector('.alerte');
      const r = a?.getBoundingClientRect();
      const dessus = r && document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      return Boolean(dessus && a.contains(dessus));
    });
    juge.exige(
      message === fr.voyage.erreurEnregistrement && vue?.sortie === '6' && visible,
      `panne depuis la fiche : message « ${message} », visible ${visible}, ${JSON.stringify(vue)}`,
    );
    await contexte.close();
  }

  // Quitter le voyage, fiche et confirmation ouvertes.
  {
    const { contexte, page, erreurs } = await ouvrirVoyage();
    await ouvrirFiche(page, 'o-gou');
    await appuyerFiche(page, 'vider');
    const question = await attendreQue(page, () => document.querySelector('dialog[role="alertdialog"][open]') !== null);
    await page.evaluate(() => (location.hash = '#/voyages'));
    await attendreEcran(page, 'voyages');
    const vu = await page.evaluate(() => {
      const carte = document.querySelector('a.carte-voyage[href="#/voyage/v1"]');
      const r = carte.getBoundingClientRect();
      const touche = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      return { fenetres: document.querySelectorAll('dialog').length, touchable: carte.contains(touche) };
    });
    const gourde = (await lireStockage(page)).objetsDuVoyage.find(o => o.id === 'o-gou').dansLeSac;
    juge.exige(
      question && vu.fenetres === 0 && vu.touchable && gourde === 2,
      `quitter, fiche ouverte : ${JSON.stringify({ question, ...vu, gourde })}`,
    );
    juge.exige(erreurs.length === 0, `quitter : erreurs dans la page : ${erreurs.join(' | ')}`);
    await contexte.close();
  }

  // Focus à la fermeture : la ligne d'origine, sinon l'en-tête de sa catégorie, sinon une commande visible.
  {
    const { contexte, page, erreurs } = await ouvrirVoyage({ horloge: true });
    // Témoin : fermée aussitôt, la fiche rend le focus à la ligne.
    await ouvrirFiche(page, 'o-den', { attendreCalme: false });
    await page.keyboard.press('Escape');
    await fermee(page);
    const temoin = await focusActuel(page);
    juge.exige(temoin === 'fiche:o-den', `focus, fiche fermée aussitôt : ${temoin}`);
    // Dentifrice complète Toilette : après le répit et le tampon, la catégorie est repliée.
    await ouvrirFiche(page, 'o-den', { attendreCalme: false });
    await appuyerFiche(page, 'tout');
    await page.clock.runFor(1000);
    await page.clock.runFor(1000);
    const repliee = await page.evaluate(() =>
      document.querySelector('[data-action="accordeon"][data-id="c-toi"]').getAttribute('aria-expanded'),
    );
    await page.keyboard.press('Escape');
    await fermee(page);
    const focus = await focusActuel(page);
    juge.exige(
      repliee === 'false' && focus === 'accordeon:c-toi',
      `focus, Toilette repliée pendant la fiche : repliée ${repliee}, focus ${focus}`,
    );
    juge.exige(erreurs.length === 0, `focus, catégorie repliée : erreurs dans la page : ${erreurs.join(' | ')}`);
    await contexte.close();
  }
  {
    const { contexte, page, erreurs } = await ouvrirVoyage({ horloge: true });
    await page.click('[data-action="filtre"]');
    await page.clock.runFor(1000);
    await ouvrirFiche(page, 'o-caf', { attendreCalme: false });
    await appuyerFiche(page, 'tout');
    await page.clock.runFor(1000);
    const masque = await page.evaluate(() => !document.querySelector('.objet[data-id="o-caf"]'));
    await page.keyboard.press('Escape');
    await fermee(page);
    const focus = await focusActuel(page);
    juge.exige(
      masque && focus !== 'body' && !focus.endsWith('(invisible)'),
      `focus, Café masqué par le filtre pendant la fiche : masqué ${masque}, focus ${focus}`,
    );
    juge.exige(erreurs.length === 0, `focus, filtre : erreurs dans la page : ${erreurs.join(' | ')}`);
    await contexte.close();
  }

  // L'objet disparaît à la relecture qui suit une panne : la fiche se ferme.
  {
    const { contexte, page } = await ouvrirVoyage();
    await ouvrirFiche(page, 'o-rep');
    const stocke = await lireStockage(page);
    await ecrireStockage(page, {
      ...stocke,
      objetsDuVoyage: stocke.objetsDuVoyage.filter(o => o.id !== 'o-rep'),
      pannes: ['reglerDansLeSac'],
    });
    await appuyerFiche(page, 'plus');
    await attendreQue(page, () => document.querySelector('.alerte') !== null);
    await attendreQue(page, () => !document.querySelector('dialog.fiche'));
    const vu = await page.evaluate(() => ({
      fiche: Boolean(document.querySelector('dialog.fiche')),
      ligne: Boolean(document.querySelector('.objet[data-id="o-rep"]')),
      alerte: Boolean(document.querySelector('.alerte')),
    }));
    // Le message d'échec reste à l'écran : il ne part pas avec la fiche qui se ferme.
    juge.exige(!vu.fiche && !vu.ligne && vu.alerte, `objet disparu à la relecture : ${JSON.stringify(vu)}`);
    await contexte.close();
  }

  // La fiche et sa confirmation, en une colonne, clair et sombre.
  const UNE_COLONNE = { telephone: FORMATS.telephone, 'tablette-portrait': FORMATS['tablette-portrait'] };
  for (const theme of ['light', 'dark']) {
    for (const [format, taille] of Object.entries(UNE_COLONNE)) {
      const cas = etat => `${etat}, ${format}, ${NOMS_THEME[theme]}`;
      const capture = (page, etat) =>
        page.screenshot({ path: join(CAPTURES, `${etat}-${format}-${NOMS_THEME[theme]}.png`) });
      const { contexte, page } = await ouvrirVoyage({ taille, theme });
      await ouvrirFiche(page, 'o-rep');
      await verifierCommandes(page, juge, cas('fiche'));
      await capture(page, 'fiche');
      await appuyerFiche(page, 'tout');
      await appuyerFiche(page, 'vider');
      await attendreQue(page, () => document.querySelector('dialog[role="alertdialog"][open]') !== null);
      await calme(page);
      await capture(page, 'fiche-confirmation');
      // « Vider » : « Annuler » et l'action tiennent côte à côte, comme avant.
      await verifierPiedQuestion(page, juge, cas('confirmation'), 'cote');
      await page.keyboard.press('Escape');
      await attendreQue(page, () => !document.querySelector('dialog[role="alertdialog"]'));
      await verifierBarres(page, juge, cas('fiche'));
      await contexte.close();
    }
  }
} finally {
  await navigateur.close();
  await serveur.fermer();
}
juge.conclure(
  'Fiche d’un objet du voyage',
  'contenu, compteur, tout, vider et sa confirmation, panne, Échap, voile, glissé, place, quitter, 2 formats × 2 thèmes',
);
