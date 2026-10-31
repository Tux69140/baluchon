// Phase 11 (docs/superpowers/specs/2026-10-30-phase-11-refaire-supprimer-design.md, « Refaire ce voyage »,
// « Aperçu » ; maquette validée le 2026-10-30, docs/maquettes/refaire/, état refaire-apercu) : l'aperçu du
// voyage refait, sur le voyage d'essai de tests/outils/refaire.mjs (un ajout à la main, un objet retiré,
// une quantité fixée, une étiquette et un objet supprimés depuis de la bibliothèque).
// - aux quatre formats × 2 thèmes : en tête, la phrase qui nomme Plongée et Lampe frontale ; Cerf-volant
//   coché, « ajouté à la main » ; Chaussures de marche barré, « retiré », recoché d'un appui (la mention
//   s'efface), décoché de nouveau (elle revient) ; Pull « fixée manuellement : 5 · le calcul donne 3 »,
//   « Garder 5 » choisi, « Recalculer : 3 » change la quantité ; cibles de 44 px, pas de défilement de
//   côté ; captures de l'aperçu ;
// - créé en gardant 5 : le voyage a Pull 5 (fixé), le Cerf-volant, pas les Chaussures, qu'il retient
//   écartées ; refait à son tour, il les montre de nouveau « retiré » ; le voyage d'origine est inchangé ;
// - revenu à l'aperçu après avoir choisi Pluie, la fenêtre des objets écartés nomme les Chaussures ;
// - créé avec « Recalculer » et les Chaussures recochées : Pull 3, Chaussures dans le voyage ;
// - Vigilance 4 : une bibliothèque dont rien n'entre plus ; l'aperçu montre le seul ajout à la main, et
//   « Créer le voyage » marche ; décoché, « tout écarté » et « Créer le voyage » grisé, sans effet.
import { mkdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { chromium } from 'playwright';
import { calme } from './outils/attente.mjs';
import { attendreQuestion, repondre } from './outils/assistant.mjs';
import { fermerEssai } from './outils/bibliotheque.mjs';
import {
  CAPTURES,
  NOMS_THEME,
  RACINE,
  attendreEcran,
  creerJuge,
  lireStockage,
  verifierCommandes,
} from './outils/page.mjs';
import {
  QUATRE,
  RIEN_N_ENTRE,
  V,
  contenuStocke,
  donneesOrigine,
  ligne,
  lireApercu,
  ouvrirEssai,
  refaireDepuisLeVoyage,
  remplirInfos,
  versApercu,
  voyageOuvert,
} from './outils/refaire.mjs';
import { demarrerServeur } from './outils/serveur.mjs';

const fr = JSON.parse(await readFile(join(RACINE, 'src/i18n/fr.json'), 'utf8'));
const nv = fr.nouveauVoyage;
const l = fr.modifierVoyage.ligne;
const r = fr.refaireVoyage;
const NB = '\u00a0';
const vu = e => JSON.stringify(e);
const remplir = (texte, valeurs) => texte.replace(/\{(\w+)\}/g, (_, nom) => String(valeurs[nom]));
const PHRASE = `L’étiquette «${NB}Plongée${NB}» et l’objet «${NB}Lampe frontale${NB}» ne sont plus dans la bibliothèque${NB}: ils ne sont pas repris.`;
const MANUELLE = remplir(l.manuelle, { avant: 5, apres: 3 });
const GARDER = remplir(l.garder, { n: 5 });
const RECALCULER = remplir(l.recalculer, { n: 3 });
const juge = creerJuge();
const serveur = await demarrerServeur();
const navigateur = await chromium.launch();

// Un appui sur une ligne de l'aperçu (par son nom), ou sur un segment du Pull.
const toucher = async (page, nom) => {
  await page.click(`.apercu [data-objet]:has(.objet-nom:text-is("${nom}"))`);
  await calme(page);
};
const segment = async (page, valeur) => {
  await page.click(`.apercu label.segment:has(input[data-manuelle][value="${valeur}"])`);
  await calme(page);
};

// Les lignes attendues de l'aperçu d'origine, telles que le refait les montre d'abord.
function verifierDepart(vue, cas) {
  const cerf = ligne(vue, 'Cerf-volant');
  const chaussures = ligne(vue, 'Chaussures de marche');
  const pull = ligne(vue, 'Pull');
  juge.exige(vue.phrase === PHRASE && vue.phraseApres && vue.balises === 0, `${cas} : phrase ${vu(vue.phrase)}`);
  juge.exige(
    vue.titre === remplir(nv.retenus.other, { n: 4, total: 5 }) &&
      vu(vue.lignes.map(x => x.nom)) === vu(['Chaussures de marche', 'Pull', 'Repas', 'Cerf-volant', 'Couteau']),
    `${cas} : lignes ${vu([vue.titre, vue.lignes.map(x => x.nom)])}`,
  );
  juge.exige(
    cerf?.coche === 'true' &&
      vu(cerf.mentions) === vu([r.ajoute]) &&
      cerf.sous === r.ajoute &&
      cerf.case === `Cerf-volant, 1, ${r.ajoute}` &&
      cerf.quantite === '1',
    `${cas} : Cerf-volant ${vu(cerf)}`,
  );
  juge.exige(
    chaussures?.coche === 'false' &&
      vu(chaussures.mentions) === vu([r.retire]) &&
      chaussures.case === `Chaussures de marche, 1, ${r.retireLu}` &&
      chaussures.barre === 'line-through' &&
      chaussures.segments.length === 0,
    `${cas} : Chaussures ${vu(chaussures)}`,
  );
  juge.exige(
    pull?.coche === 'true' &&
      pull.quantite === '5' &&
      pull.sous === MANUELLE &&
      pull.case === `Pull, 5, ${MANUELLE}` &&
      vu(pull.segments) === vu([`${GARDER} ✓`, RECALCULER]),
    `${cas} : Pull ${vu(pull)}`,
  );
  juge.exige(ligne(vue, 'Repas')?.quantite === '18', `${cas} : Repas ${vu(ligne(vue, 'Repas'))}`);
}

async function ouvrirApercu(format, theme, donnees) {
  const ouvert = await ouvrirEssai(navigateur, serveur.url, { format, theme, donnees });
  await attendreEcran(ouvert.page, 'voyage');
  await refaireDepuisLeVoyage(ouvert.page);
  await remplirInfos(ouvert.page);
  await versApercu(ouvert.page);
  return ouvert;
}

try {
  await mkdir(CAPTURES, { recursive: true });

  for (const format of Object.keys(QUATRE))
    for (const theme of ['light', 'dark']) {
      const cas = `${format} ${NOMS_THEME[theme]}`;
      const capture = (page, nom) =>
        page.screenshot({ path: join(CAPTURES, `${nom}-${format}-${NOMS_THEME[theme]}.png`) });
      const ouvert = await ouvrirApercu(format, theme);
      const { page } = ouvert;
      verifierDepart(await lireApercu(page), cas);
      await verifierCommandes(page, juge, cas);
      await capture(page, 'refaire-apercu');
      // La suite de l'aperçu : l'ajout à la main, sous le pli au téléphone.
      await page.locator('.apercu [data-objet]:has(.objet-nom:text-is("Cerf-volant"))').scrollIntoViewIfNeeded();
      await calme(page);
      await capture(page, 'refaire-apercu-suite');

      // « retiré » : recoché d'un appui, la mention s'efface ; décoché, elle revient.
      await toucher(page, 'Chaussures de marche');
      const recochee = ligne(await lireApercu(page), 'Chaussures de marche');
      juge.exige(
        recochee?.coche === 'true' &&
          recochee.mentions.length === 0 &&
          recochee.barre === 'none' &&
          recochee.case === 'Chaussures de marche, 1',
        `${cas} : Chaussures recochées ${vu(recochee)}`,
      );
      await toucher(page, 'Chaussures de marche');
      const redecochee = ligne(await lireApercu(page), 'Chaussures de marche');
      juge.exige(vu(redecochee?.mentions) === vu([r.retire]), `${cas} : Chaussures décochées ${vu(redecochee)}`);

      // « Recalculer : 3 » change la quantité ; « Garder 5 » la rend.
      await segment(page, 'recalculer');
      const recalcule = ligne(await lireApercu(page), 'Pull');
      juge.exige(
        recalcule?.quantite === '3' && vu(recalcule.segments) === vu([GARDER, `${RECALCULER} ✓`]),
        `${cas} : Recalculer ${vu(recalcule)}`,
      );
      await segment(page, 'garder');
      juge.exige(ligne(await lireApercu(page), 'Pull')?.quantite === '5', `${cas} : Garder`);
      await fermerEssai(juge, cas, ouvert);
    }

  // Créé en gardant 5 : Pull fixé, Cerf-volant, Chaussures écartées et retenues comme telles.
  {
    const cas = 'téléphone, garder';
    const ouvert = await ouvrirApercu('telephone', 'light');
    const { page } = ouvert;
    const origine = await contenuStocke(page, V);
    await page.click('.assistant [data-action="creer"]');
    const cree = await voyageOuvert(page);
    const stocke = await contenuStocke(page, cree);
    const objet = nom => stocke.objets.find(o => o.nom === nom) ?? null;
    juge.exige(
      vu(stocke.objets.map(o => o.nom).sort()) === vu(['Cerf-volant', 'Couteau', 'Pull', 'Repas']),
      `${cas} : objets ${vu(stocke.objets.map(o => o.nom))}`,
    );
    juge.exige(
      objet('Pull')?.quantite === 5 && objet('Pull').quantiteManuelle === true && objet('Pull').dansLeSac === 0,
      `${cas} : Pull ${vu(objet('Pull'))}`,
    );
    juge.exige(
      objet('Cerf-volant')?.modeleId === null &&
        objet('Cerf-volant').quantite === 1 &&
        objet('Cerf-volant').dansLeSac === 0,
      `${cas} : Cerf-volant ${vu(objet('Cerf-volant'))}`,
    );
    juge.exige(
      vu(stocke.ecartes.map(e => e.modeleId)) === vu(['o-chaussures']),
      `${cas} : écartés retenus ${vu(stocke.ecartes)}`,
    );
    juge.exige(vu(await contenuStocke(page, V)) === vu(origine), `${cas} : le voyage d'origine a changé`);

    // Refait à son tour : les Chaussures reviennent « retiré ».
    await refaireDepuisLeVoyage(page);
    await remplirInfos(page, 'Quiberon 2028');
    await versApercu(page);
    const encore = await lireApercu(page);
    juge.exige(
      ligne(encore, 'Chaussures de marche')?.coche === 'false' &&
        vu(ligne(encore, 'Chaussures de marche').mentions) === vu([r.retire]) &&
        vu(ligne(encore, 'Cerf-volant')?.mentions) === vu([r.ajoute]) &&
        encore.phrase === null,
      `${cas} : refait de nouveau ${vu(encore)}`,
    );
    await fermerEssai(juge, cas, ouvert);
  }

  // Créé avec « Recalculer » et les Chaussures recochées.
  {
    const cas = 'tablette paysage, recalculer';
    const ouvert = await ouvrirApercu('tablette-paysage', 'dark');
    const { page } = ouvert;
    // Revenu à l'aperçu après un changement (Pluie choisie) : la fenêtre des objets écartés nomme les
    // Chaussures, retirées la dernière fois (elles comptent comme écartées) ; on les garde écartées.
    await page.click('.assistant [data-aller="2"]');
    await calme(page);
    await page.click('.assistant .puce-etiquette:has-text("Pluie")');
    await versApercu(page);
    const fenetre = await attendreQuestion(page);
    juge.exige(
      fenetre?.titre === nv.ecartes.titre && vu(fenetre.liste) === vu([['Chaussures de marche', 'Vêtements']]),
      `${cas} : fenêtre des écartés ${vu(fenetre)}`,
    );
    await repondre(page, nv.ecartes.garder);
    await segment(page, 'recalculer');
    await toucher(page, 'Chaussures de marche');
    await page.click('.assistant [data-action="creer"]');
    const cree = await voyageOuvert(page);
    const stocke = await contenuStocke(page, cree);
    const objet = nom => stocke.objets.find(o => o.nom === nom) ?? null;
    juge.exige(
      objet('Pull')?.quantite === 3 && objet('Pull').quantiteManuelle === false,
      `${cas} : Pull ${vu(objet('Pull'))}`,
    );
    juge.exige(
      objet('Chaussures de marche')?.quantite === 1 && stocke.ecartes.length === 0,
      `${cas} : Chaussures ${vu(objet('Chaussures de marche'))} ${vu(stocke.ecartes)}`,
    );
    await fermerEssai(juge, cas, ouvert);
  }

  // Vigilance 4 : rien n'entre plus que l'ajout à la main.
  {
    const cas = 'téléphone, seul l’ajout à la main';
    const ouvert = await ouvrirApercu('telephone', 'light', donneesOrigine({ bibliotheque: RIEN_N_ENTRE }));
    const { page } = ouvert;
    const seul = await lireApercu(page);
    juge.exige(
      vu(seul.lignes.map(x => [x.nom, x.coche, x.mentions])) === vu([['Cerf-volant', 'true', [r.ajoute]]]) &&
        seul.grise === null &&
        seul.raison === null,
      `${cas} : aperçu ${vu(seul)}`,
    );
    await toucher(page, 'Cerf-volant');
    const ecarte = await lireApercu(page);
    juge.exige(ecarte.raison === nv.toutEcarte && ecarte.grise === 'true', `${cas} : tout écarté ${vu(ecarte)}`);
    await page.screenshot({ path: join(CAPTURES, 'refaire-apercu-tout-ecarte-telephone-clair.png') });
    const avant = (await lireStockage(page)).voyages.length;
    await page.click('.assistant [data-action="creer"]', { force: true });
    await calme(page);
    juge.exige(
      (await page.evaluate(() => document.querySelector('#app').dataset.ecran)) === 'refaire-voyage' &&
        (await lireStockage(page)).voyages.length === avant,
      `${cas} : « Créer le voyage » grisé a agi`,
    );
    // Témoin : recoché, « Créer le voyage » crée le voyage avec le seul Cerf-volant.
    await toucher(page, 'Cerf-volant');
    juge.exige((await lireApercu(page)).grise === null, `${cas} : recoché, toujours grisé`);
    await page.click('.assistant [data-action="creer"]');
    const cree = await voyageOuvert(page);
    const objets = (await contenuStocke(page, cree)).objets.map(o => o.nom);
    juge.exige(vu(objets) === vu(['Cerf-volant']), `${cas} : voyage créé ${vu(objets)}`);
    await fermerEssai(juge, cas, ouvert);
  }
} finally {
  await navigateur.close();
  await serveur.fermer();
}
juge.conclure('Refaire ce voyage : aperçu', 'phrase, mentions, quantité fixée, création, tout écarté');
