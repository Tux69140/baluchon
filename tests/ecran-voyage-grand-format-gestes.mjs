// Les gestes de l'écran d'un voyage sur tablette et ordinateur (maquette validée le 2026-10-27 ;
// Review Focus de docs/superpowers/specs/2026-10-27-grand-ecran-design.md). En tuiles (tablette) et en
// cartes (ordinateur) :
// - filtre : Papiers, bouclée, descend en fin de menu, atténuée (bord en pointillés, fond transparent ;
//   choisie, elle garde son fond actif) ; la choisir dit que ses objets sont masqués ; la dernière
//   pièce de Toilette (horloge simulée) : pas de tampon à 900 ms, son tampon à 1000 ms, puis la
//   suivante non bouclée choisie une seconde plus tard (Review Focus 2) ;
// - fiche fermée après que sa catégorie a cédé la place : le focus va à la tuile ou à la carte de
//   cette catégorie ;
// - trois colonnes : une coche ne ramène pas en haut la liste défilée ; témoin : une autre catégorie
//   se montre depuis son début ;
// - passer de l'ordinateur à la tablette en portrait, au téléphone, puis revenir : coche, filtre et
//   catégorie choisie gardés, l'accordéon au téléphone, le focus sur une commande visible ; le lien
//   « Mes voyages » garde le focus ; une fiche ouverte pendant le changement rend le focus à sa ligne
//   (Review Focus 1) ;
// - un nom de catégorie long et piégé : rien d'interprété, rien qui déborde (Review Focus 3) ;
// - clavier : Mes voyages → filtre → tuiles dans l'ordre → première case ; Entrée sur une tuile la
//   choisit et lui laisse le focus (Review Focus 4) ;
// - bandeau « Annuler » : la dernière ligne de chaque colonne (trois colonnes) ou de la page (repli)
//   reste au-dessus de lui (Review Focus 5).
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { chromium } from 'playwright';
import { couvert, lireBandeau, ouvrirAvecHorloge, supprimerObjet, versMesVoyages } from './outils/annulation.mjs';
import { attendreQue, calme } from './outils/attente.mjs';
import { demarrerServeur } from './outils/serveur.mjs';
import { CAPTURES, FORMATS, RACINE, attendreEcran, creerJuge } from './outils/page.mjs';
import { DONNEES, PIEGE, cat, focusActuel, lire, obj, ouvrirVoyage, toucher } from './outils/voyage-grand-format.mjs';

const fr = JSON.parse(await readFile(join(RACINE, 'src/i18n/fr.json'), 'utf8'));
const juge = creerJuge();
const serveur = await demarrerServeur();
const navigateur = await chromium.launch();
const vu = e => JSON.stringify(e);
const ouvrirSur = (voyageId, options) => ouvrirVoyage(navigateur, serveur.url, voyageId, options);
const DEUX = { 'tablette-paysage': true, ordinateur: false };
const fermee = page => attendreQue(page, () => !document.querySelector('dialog'));
const quantite = (page, id) =>
  page.evaluate(id => document.querySelector(`.objet[data-id="${id}"] .objet-quantite`)?.textContent ?? null, id);
const filtreAllume = page =>
  page.evaluate(() => document.querySelector('[data-action="filtre"]')?.getAttribute('aria-pressed'));
const commandeVisible = focus => focus !== 'body' && !focus.endsWith('(invisible)');
// L'aspect calculé des catégories atténuées du menu (spec, § 6 ; docs/DESIGN.md, 2026-10-24) : bord en
// pointillés et fond transparent, sauf la choisie, qui garde son fond actif.
const aspectAttenuees = page =>
  page.evaluate(() => {
    const sonde = document.createElement('span');
    sonde.style.background = 'var(--actif)';
    document.body.append(sonde);
    const actif = getComputedStyle(sonde).backgroundColor;
    sonde.remove();
    return [...document.querySelectorAll('.gf-menu [data-attenuee]')].map(el => {
      const s = getComputedStyle(el);
      const fond = s.backgroundColor === actif ? 'actif' : s.backgroundColor;
      return el.getAttribute('aria-current') === 'true' ? { choisie: fond } : { bord: s.borderTopStyle, fond };
    });
  });
const ATTENUEE = { bord: 'dashed', fond: 'rgba(0, 0, 0, 0)' };

try {
  for (const [format, doigt] of Object.entries(DEUX)) {
    const choisir = (page, id) => toucher(juge, page, `.gf-menu [data-id="${id}"]`, { doigt });

    // Filtre, puis la dernière pièce de Toilette.
    {
      const { contexte, page, erreurs } = await ouvrirSur('v1', { format, horloge: true });
      await toucher(juge, page, '[data-action="filtre"]', { doigt });
      const filtre = await lire(page);
      juge.exige(
        vu(filtre.menu) === vu(['vet', 'toi', 'ali', 'cam', 'pap'].map(c => cat('v1', c))) &&
          vu(filtre.attenuees) === vu([cat('v1', 'pap')]),
        `${format}, filtre : menu ${vu(filtre.menu)}, atténuées ${vu(filtre.attenuees)}`,
      );
      await page.mouse.move(0, 0);
      const aspect = await aspectAttenuees(page);
      juge.exige(vu(aspect) === vu([ATTENUEE]), `${format}, filtre : aspect de Papiers ${vu(aspect)}`);
      await choisir(page, cat('v1', 'pap'));
      await page.mouse.move(0, 0);
      const choisie = await aspectAttenuees(page);
      juge.exige(vu(choisie) === vu([{ choisie: 'actif' }]), `${format}, Papiers choisie : ${vu(choisie)}`);
      const papiers = await lire(page);
      juge.exige(
        papiers.titre === 'Papiers' && papiers.info === fr.voyage.categorieMasquee.other.replace('{n}', 2),
        `${format}, Papiers sous le filtre : « ${papiers.titre} », « ${papiers.info} »`,
      );
      await choisir(page, cat('v1', 'toi'));
      await toucher(juge, page, `.objet[data-id="${obj('v1', 'toi', 2)}"] .case`, { doigt });
      await page.clock.runFor(900);
      const a900 = await lire(page);
      await page.clock.runFor(100);
      const a1000 = await lire(page);
      await page.clock.runFor(1000);
      const a2000 = await lire(page);
      juge.exige(
        !a900.tampons.includes(cat('v1', 'toi')) &&
          a1000.tampons.includes(cat('v1', 'toi')) &&
          a1000.titre === 'Toilette',
        `${format}, Toilette : tampon à 900 ms ${vu(a900.tampons)}, à 1000 ms ${vu(a1000.tampons)} (${a1000.titre})`,
      );
      // L'ordre affiché sous le filtre : Vêtements, Alimentation, Camping, puis Toilette et Papiers au
      // fond ; la suivante de Toilette, en reprenant au début, est Vêtements (categorieSuivante).
      juge.exige(
        vu(a2000.courant) === vu([cat('v1', 'vet')]) &&
          a2000.titre === 'Vêtements' &&
          a2000.objets.length > 0 &&
          vu(a2000.attenuees) === vu([cat('v1', 'toi'), cat('v1', 'pap')]),
        `${format}, une seconde après le tampon : ${vu({ courant: a2000.courant, titre: a2000.titre, attenuees: a2000.attenuees })}`,
      );
      juge.exige(erreurs.length === 0, `${format}, filtre : erreurs ${erreurs.join(' | ')}`);
      await contexte.close();
    }

    // Fiche fermée après que Toilette, bouclée, a cédé la place : focus à Toilette dans le menu.
    {
      const { contexte, page, erreurs } = await ouvrirSur('v1', { format, horloge: true });
      await choisir(page, cat('v1', 'toi'));
      await toucher(juge, page, `.objet[data-id="${obj('v1', 'toi', 2)}"] .objet-corps`, { doigt });
      await attendreQue(page, () => document.querySelector('dialog.fiche[open]') !== null);
      await toucher(juge, page, 'dialog.fiche [data-fiche="tout"]', { doigt });
      await page.clock.runFor(1000);
      await page.clock.runFor(1000);
      const titre = (await lire(page)).titre;
      await page.keyboard.press('Escape');
      await fermee(page);
      const focus = await focusActuel(page);
      juge.exige(
        titre === 'Alimentation' && focus === `choisir:${cat('v1', 'toi')}`,
        `${format}, fiche fermée, Toilette quittée : liste ${titre}, focus ${focus}`,
      );
      juge.exige(erreurs.length === 0, `${format}, fiche : erreurs ${erreurs.join(' | ')}`);
      await contexte.close();
    }
  }

  // Trois colonnes : la liste défilée ne remonte pas à une coche ; une autre catégorie part du haut.
  {
    const { contexte, page, erreurs } = await ouvrirSur('v3', { format: 'portable' });
    const sixieme = await page.evaluate(() => {
      const liste = document.querySelector('.gf-liste');
      if (liste) liste.scrollTop = 80;
      return { defile: liste?.scrollTop ?? 0, id: document.querySelector('.gf-liste .objet:nth-child(6)')?.dataset.id };
    });
    await toucher(juge, page, `.objet[data-id="${sixieme.id}"] .case`);
    const apres = await page.evaluate(() => document.querySelector('.gf-liste')?.scrollTop);
    juge.exige(
      sixieme.defile === 80 && apres === 80,
      `liste défilée de ${sixieme.defile} px, ${apres} px après une coche`,
    );
    await toucher(juge, page, `.gf-menu [data-id="${cat('v3', 'cam')}"]`);
    const camping = await page.evaluate(() => {
      const liste = document.querySelector('.gf-liste');
      return { haut: liste?.scrollTop, defilable: liste && liste.scrollHeight > liste.clientHeight };
    });
    juge.exige(camping.haut === 0 && camping.defilable, `Camping choisie : ${vu(camping)}`);
    juge.exige(erreurs.length === 0, `défilement : erreurs ${erreurs.join(' | ')}`);
    await contexte.close();
  }

  // Ordinateur → tablette en portrait → téléphone → ordinateur, dans la même page.
  {
    const { contexte, page, erreurs } = await ouvrirSur('v1', { format: 'ordinateur' });
    const repas = obj('v1', 'ali', 0);
    await toucher(juge, page, '[data-action="filtre"]');
    await toucher(juge, page, `.gf-menu [data-id="${cat('v1', 'ali')}"]`);
    await toucher(juge, page, `.objet[data-id="${repas}"] .case`);
    const etapes = [
      ['tablette-portrait', () => document.querySelector('main[data-colonnes="repli"]')],
      ['telephone', () => document.querySelector('.categorie')],
      ['ordinateur', () => document.querySelector('main[data-colonnes="3"]')],
    ];
    for (const [nom, arrivee] of etapes) {
      await page.setViewportSize(FORMATS[nom]);
      await attendreQue(page, arrivee);
      await calme(page);
      const m = await lire(page);
      const focus = await focusActuel(page);
      const pieces = await quantite(page, repas);
      const filtre = await filtreAllume(page);
      const choisie =
        nom === 'telephone'
          ? await page.evaluate(
              id => document.querySelector(`[data-action="accordeon"][data-id="${id}"]`)?.getAttribute('aria-expanded'),
              cat('v1', 'ali'),
            )
          : m.courant[0] === cat('v1', 'ali') && m.titre === 'Alimentation';
      juge.exige(
        pieces === '7 / 16' && filtre === 'true' && (choisie === true || choisie === 'true') && commandeVisible(focus),
        `vers ${nom} : Repas ${pieces}, filtre ${filtre}, Alimentation ${choisie}, focus ${focus}`,
      );
    }
    juge.exige(erreurs.length === 0, `changement de disposition : erreurs ${erreurs.join(' | ')}`);
    await contexte.close();
  }

  // Le lien « Mes voyages » garde le focus ; une fiche ouverte pendant le changement rend le focus à
  // sa ligne.
  {
    const { contexte, page, erreurs } = await ouvrirSur('v1', { format: 'tablette-paysage' });
    await page.focus('.lien-retour');
    await page.setViewportSize(FORMATS.telephone);
    await attendreQue(page, () => document.querySelector('.categorie'));
    await page.setViewportSize(FORMATS.ordinateur);
    await attendreQue(page, () => document.querySelector('main[data-colonnes="3"]'));
    const lien = await page.evaluate(() => document.activeElement?.matches('.lien-retour'));
    juge.exige(lien, 'changement de disposition : le lien « Mes voyages » a perdu le focus');

    const tshirts = obj('v1', 'vet', 0);
    await toucher(juge, page, `.objet[data-id="${tshirts}"] .objet-corps`);
    await attendreQue(page, () => document.querySelector('dialog.fiche[open]') !== null);
    await page.setViewportSize(FORMATS['tablette-portrait']);
    await attendreQue(page, () => document.querySelector('main[data-colonnes="repli"]'));
    await page.keyboard.press('Escape');
    await fermee(page);
    const focus = await focusActuel(page);
    juge.exige(focus === `fiche:${tshirts}`, `fiche fermée après le changement : focus ${focus}`);
    juge.exige(erreurs.length === 0, `lien et fiche : erreurs ${erreurs.join(' | ')}`);
    await contexte.close();
  }

  // Un nom long et piégé, en tuiles et en cartes.
  for (const format of ['tablette-paysage', 'tablette-portrait', 'ordinateur']) {
    const { contexte, page, erreurs } = await ouvrirSur('v5', { format });
    const m = await page.evaluate(
      id => {
        const entree = document.querySelector(`.gf-menu [data-id="${id}"]`);
        const nom = entree?.querySelector('b');
        const titre = document.querySelector('#liste-titre');
        const r = entree?.getBoundingClientRect();
        const colonne = document.querySelector('.gf-menu')?.getBoundingClientRect();
        return {
          nom: nom?.textContent,
          titre: titre?.textContent,
          balises: (nom?.children.length ?? 1) + (titre?.children.length ?? 1),
          deborde: !entree || entree.scrollWidth > entree.clientWidth || r.right > colonne.right + 0.5,
          defileDeCote: document.documentElement.scrollWidth > innerWidth,
        };
      },
      cat('v5', 'pie'),
    );
    juge.exige(
      m.nom === PIEGE && m.titre === PIEGE && m.balises === 0 && !m.deborde && !m.defileDeCote,
      `${format}, nom piégé : ${vu(m)}`,
    );
    juge.exige(erreurs.length === 0, `${format}, nom piégé : erreurs ${erreurs.join(' | ')}`);
    await contexte.close();
  }

  // Clavier, sur la tablette en paysage.
  {
    const { contexte, page, erreurs } = await ouvrirSur('v1', { format: 'tablette-paysage' });
    const premiere = (await lire(page)).objets[0];
    await page.focus('.lien-retour');
    const suite = [];
    for (let i = 0; i < 7; i++) {
      await page.keyboard.press('Tab');
      suite.push(await focusActuel(page));
    }
    const attendue = [
      'filtre:',
      ...['vet', 'toi', 'ali', 'pap', 'cam'].map(c => `choisir:${cat('v1', c)}`),
      `case:${premiere}`,
    ];
    juge.exige(vu(suite) === vu(attendue), `Tab depuis Mes voyages : ${vu(suite)}`);
    const tuile = `.gf-tuile[data-id="${cat('v1', 'ali')}"]`;
    await page.focus(tuile, { timeout: 2000 }).catch(() => juge.exige(false, `commande absente : ${tuile}`));
    await page.keyboard.press('Enter');
    await calme(page);
    const m = await lire(page);
    const focus = await focusActuel(page);
    juge.exige(
      vu(m.courant) === vu([cat('v1', 'ali')]) && m.titre === 'Alimentation' && focus === `choisir:${cat('v1', 'ali')}`,
      `Entrée sur Alimentation : choisie ${vu(m.courant)}, « ${m.titre} », focus ${focus}`,
    );
    juge.exige(erreurs.length === 0, `clavier : erreurs ${erreurs.join(' | ')}`);
    await contexte.close();
  }

  // Bandeau « Annuler » (un objet supprimé de la Bibliothèque), voyage de 11 catégories aux listes longues.
  for (const format of ['portable', 'tablette-paysage']) {
    const ouvert = await ouvrirAvecHorloge(navigateur, serveur.url, format, { donnees: DONNEES });
    const { page } = ouvert;
    await supprimerObjet(page, 'Toilette', 'Crème solaire');
    await versMesVoyages(page);
    await page.click('#app a.carte-voyage[href="#/voyage/v3"]');
    await attendreEcran(page, 'voyage');
    const bandeau = await lireBandeau(page);
    await calme(page);
    await page.screenshot({ path: join(CAPTURES, `voyage-grand-format-${format}-bandeau-haut.png`) });
    const dessous = await couvert(page);
    const bas = await page.evaluate(() => {
      const fond = sel => document.querySelector(sel)?.getBoundingClientRect().bottom ?? null;
      const defile = sel => document.querySelector(sel)?.scrollTop ?? 0;
      return {
        derniers: ['.gf-gauche > :last-child', '.gf-menu li:last-child', '.gf-liste .objet:last-child'].map(fond),
        defilements: [Math.round(scrollY), defile('.gf-menu'), defile('.gf-liste')],
      };
    });
    const trois = format === 'portable';
    juge.exige(
      bandeau &&
        dessous.length === 0 &&
        bas.derniers.every(b => b !== null && b <= bandeau.cadre.top) &&
        (trois ? bas.defilements[1] > 0 && bas.defilements[2] > 0 : bas.defilements[0] > 0),
      `${format}, bandeau « Annuler » : ${vu({ haut: bandeau?.cadre.top, dessous, ...bas })}`,
    );
    await page.screenshot({ path: join(CAPTURES, `voyage-grand-format-${format}-bandeau-bas.png`) });
    juge.exige(ouvert.erreurs.length === 0, `${format}, bandeau : erreurs ${ouvert.erreurs.join(' | ')}`);
    await ouvert.contexte.close();
  }
} finally {
  await navigateur.close();
  await serveur.fermer();
}
juge.conclure(
  'Gestes de l’écran d’un voyage sur tablette et ordinateur',
  'filtre, tampon puis suivante, fiche, défilement, changement de disposition, nom piégé, clavier, bandeau « Annuler »',
);
