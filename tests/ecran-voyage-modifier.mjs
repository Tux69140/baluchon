// Phase 10 (docs/superpowers/specs/2026-10-29-phase-10-plans-changent-design.md ; maquette validée
// docs/maquettes/plans-changent/, états voyage, assistant, recapitulatif, sortie) : « Modifier le voyage ».
// - l'assistant s'ouvre prérempli (nom, voyageurs, étiquettes du voyage) ;
// - critère : de 2 à 3 voyageurs, la ligne Repas dit 16 → 24 ; appliqué, Repas vaut 24 et une quantité
//   fixée manuellement ne bouge pas (gardée par défaut) ;
// - ajouter « Pluie » fait entrer le Poncho, avec sa quantité pour ce voyage ;
// - retirer « Randonnée » sans rien cocher garde tous les objets et leurs pièces ; l'accepter pour un
//   objet emballé pose la question de la sortie, et « Plus tard » le laisse barré ;
// - seul le nom changé : pas d'étape « Changements », le voyage porte le nouveau nom ;
// - panne d'écriture : le message, rien d'écrit, un second appui réussit (Review Focus 2) ;
// - abandon après un changement : la question, puis le voyage inchangé ;
// - captures claire et sombre de l'assistant, des changements et de la question de sortie.
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { chromium } from 'playwright';
import { genererVoyage } from '../src/modele/voyage.js';
import { attendreQue, calme } from './outils/attente.mjs';
import { attendreQuestion, fr, lireQuestion, objetStocke, ouvrirVoyage, repondre, vu } from './outils/ajuster.mjs';
import { avecBibliotheque } from './outils/assistant.mjs';
import { fermerEssai } from './outils/bibliotheque.mjs';
import { CAPTURES, NOMS_THEME, attendreEcran, creerJuge, ecrireStockage, lireStockage } from './outils/page.mjs';
import { demarrerServeur } from './outils/serveur.mjs';

const m = fr.modifierVoyage;
const juge = creerJuge();
const serveur = await demarrerServeur();
const navigateur = await chromium.launch();
const capture = (page, nom, format, theme) =>
  page.screenshot({ path: join(CAPTURES, `${nom}-${format}-${NOMS_THEME[theme]}.png`) });

const categorie = (id, nom, icone, couleur, ordre, etiquettes = []) => ({
  id,
  nom,
  icone,
  couleur,
  ordre,
  toujoursIncluse: !etiquettes.length,
  modifieLe: 'x',
  etiquettes,
});
const objet = (id, categorieId, nom, regle, valeur, autres = {}) => ({
  id,
  categorieId,
  nom,
  regle,
  valeur,
  plafond: null,
  parPersonne: true,
  consommable: false,
  toujoursInclus: !autres.etiquettes?.length,
  note: '',
  modifieLe: 'x',
  etiquettes: [],
  ...autres,
});
const BIBLIOTHEQUE = {
  groupes: [
    { id: 'g-act', nom: 'Activités', ordre: 0, modifieLe: 'x' },
    { id: 'g-cli', nom: 'Climat', ordre: 1, modifieLe: 'x' },
  ],
  etiquettes: [
    { id: 'e-rando', groupeId: 'g-act', nom: 'Randonnée', ordre: 0, modifieLe: 'x' },
    { id: 'e-pluie', groupeId: 'g-cli', nom: 'Pluie', ordre: 0, modifieLe: 'x' },
  ],
  categories: [
    categorie('c-vet', 'Vêtements', 't-shirt', 'ciel', 0),
    categorie('c-ali', 'Alimentation', 'fork-knife', 'pomme', 1),
  ],
  objets: [
    objet('o-pull', 'c-vet', 'Pull', 'fixe', 1),
    objet('o-chaussures', 'c-vet', 'Chaussures de marche', 'fixe', 1, { parPersonne: false, etiquettes: ['e-rando'] }),
    objet('o-poncho', 'c-vet', 'Poncho', 'fixe', 1, { etiquettes: ['e-pluie'] }),
    objet('o-repas', 'c-ali', 'Repas', 'par_jour', 2, { consommable: true }),
  ],
};
let n = 0;
const contenu = genererVoyage(
  BIBLIOTHEQUE,
  { nom: 'Quiberon', destination: 'Bretagne', depart: '2026-11-10', retour: '2026-11-13', voyageurs: 2 },
  { choisies: new Set(['e-rando']), ecartes: new Set() },
  { nouvelId: () => `id-${++n}`, maintenant: 'avant' },
);
const parNom = nom => contenu.objets.find(o => o.nom === nom);
const DONNEES = {
  ...avecBibliotheque(BIBLIOTHEQUE),
  voyages: [contenu.voyage],
  etiquettesDuVoyage: contenu.etiquettes,
  categoriesDuVoyage: contenu.categories,
  objetsDuVoyage: contenu.objets.map(o => {
    if (o.nom === 'Pull') return { ...o, quantite: 5, quantiteManuelle: true };
    if (o.nom === 'Chaussures de marche') return { ...o, dansLeSac: 1 };
    return o;
  }),
};
const V = contenu.voyage.id;

// « Modifier le voyage » depuis l'écran du voyage, jusqu'à l'assistant.
async function ouvrirModification(page) {
  await page.click('#app [data-action="modifier"]');
  await attendreEcran(page, 'modifier-voyage');
  await calme(page);
}
const aller = async (page, indice) => {
  await page.click(`.assistant [data-aller="${indice}"]`);
  await calme(page);
};
const basculerEtiquette = async (page, indice, nom) => {
  await aller(page, indice);
  await page.click(`.assistant [data-etiquette]:has-text(${JSON.stringify(nom)})`);
};
async function voirLesChangements(page) {
  await page.click('.assistant [data-action="apercu"], .assistant [data-action="suivant"]');
  await calme(page);
}
const lignes = page =>
  page.evaluate(() =>
    [...document.querySelectorAll('.recapitulatif .recap-ligne, .recapitulatif .recap-manuelle')].map(l => ({
      nom: l.querySelector('.objet-nom').textContent,
      valeur: l.querySelector('.recap-valeur').textContent.replace(/\s+/g, ''),
      coche: l.getAttribute('aria-checked'),
      garde: l.querySelector('input[value="garder"]')?.checked ?? null,
    })),
  );
async function appliquer(page) {
  await page.click('.assistant [data-action="creer"]');
  await attendreEcran(page, 'voyage');
  await calme(page);
}
const stocke = async (page, nom) => (await lireStockage(page)).objetsDuVoyage.find(o => o.nom === nom) ?? null;

// Décision 11 : le Poncho a été écarté de ce voyage ; ajouter « Pluie » le propose, refusé et « retiré ».
const DONNEES_ECARTE = { ...DONNEES, objetsEcartes: [{ voyageId: V, modeleId: 'o-poncho' }] };
async function verifierRetire(format, theme) {
  const cas = `retiré ${format} ${NOMS_THEME[theme]}`;
  const ouvert = await ouvrirVoyage(navigateur, serveur.url, { format, theme, donnees: DONNEES_ECARTE, voyageId: V });
  const { page } = ouvert;
  await ouvrirModification(page);
  await basculerEtiquette(page, 2, 'Pluie');
  await voirLesChangements(page);
  const poncho = await page.evaluate(() => {
    const l = [...document.querySelectorAll('.recapitulatif .recap-ligne')].find(
      b => b.querySelector('.objet-nom').textContent === 'Poncho',
    );
    return (
      l && {
        coche: l.getAttribute('aria-checked'),
        mention: l.querySelector('.pastille-mention')?.textContent.trim() ?? null,
        case: l.getAttribute('aria-label'),
        barre: getComputedStyle(l.querySelector('.recap-valeur')).textDecorationLine,
      }
    );
  });
  juge.exige(
    poncho?.coche === 'false' &&
      poncho.mention === 'retiré' &&
      poncho.case.endsWith(', retiré de ce voyage') &&
      poncho.barre === 'line-through',
    `${cas} : Poncho ${vu(poncho)}`,
  );
  await capture(page, 'voyage-modifier-retire', format, theme);
  await fermerEssai(juge, cas, ouvert);
}

try {
  await mkdir(CAPTURES, { recursive: true });
  for (const format of ['telephone', 'tablette-portrait', 'tablette-paysage', 'ordinateur'])
    for (const theme of ['light', 'dark']) await verifierRetire(format, theme);
  for (const [format, theme] of [
    ['telephone', 'light'],
    ['tablette-paysage', 'dark'],
  ]) {
    const cas = `${format} ${NOMS_THEME[theme]}`;
    const ouvert = await ouvrirVoyage(navigateur, serveur.url, { format, theme, donnees: DONNEES, voyageId: V });
    const { page } = ouvert;

    // Prérempli.
    await ouvrirModification(page);
    const prerempli = await page.evaluate(() => ({
      nom: document.querySelector('#nom').value,
      voyageurs: document.querySelector('.compteur-valeur').textContent,
      titre: document.querySelector('.assistant h1, .assistant h2').textContent.trim(),
    }));
    juge.exige(
      vu(prerempli) === vu({ nom: 'Quiberon', voyageurs: '2', titre: m.titre }),
      `${cas} : prérempli ${vu(prerempli)}`,
    );
    await aller(page, 1);
    const rando = await page.getAttribute('.assistant [data-etiquette="e-rando"]', 'aria-pressed');
    juge.exige(rando === 'true', `${cas} : Randonnée pas présélectionnée (${rando})`);
    await aller(page, 0);
    await page.click('.assistant [data-voyageurs="1"]');
    await capture(page, 'voyage-modifier-assistant', format, theme);

    // Critère : Repas 16 → 24, Pull fixé à 5 gardé par défaut.
    await voirLesChangements(page);
    const vues = await lignes(page);
    const repas = vues.find(l => l.nom === 'Repas');
    const pull = vues.find(l => l.nom === 'Pull');
    juge.exige(repas?.valeur === '16→24' && repas.coche === 'true', `${cas} : Repas ${vu(repas)}`);
    juge.exige(pull?.garde === true, `${cas} : Pull ${vu(pull)}`);
    await capture(page, 'voyage-modifier-changements', format, theme);
    await appliquer(page);
    juge.exige(
      (await stocke(page, 'Repas')).quantite === 24 && (await stocke(page, 'Pull')).quantite === 5,
      `${cas} : appliqué ${vu(await stocke(page, 'Repas'))} ${vu(await stocke(page, 'Pull'))}`,
    );

    // Ajouter « Pluie » : le Poncho entre, 1 par personne pour 3.
    await ouvrirModification(page);
    await basculerEtiquette(page, 2, 'Pluie');
    await voirLesChangements(page);
    const poncho = (await lignes(page)).find(l => l.nom === 'Poncho');
    juge.exige(poncho?.coche === 'true' && poncho.valeur.includes('3'), `${cas} : Poncho ${vu(poncho)}`);
    await appliquer(page);
    juge.exige(
      (await stocke(page, 'Poncho'))?.quantite === 3,
      `${cas} : Poncho stocké ${vu(await stocke(page, 'Poncho'))}`,
    );

    // Retirer « Randonnée » sans rien cocher : tout reste, pièces comprises.
    await ouvrirModification(page);
    await basculerEtiquette(page, 1, 'Randonnée');
    await voirLesChangements(page);
    const chaussures = (await lignes(page)).find(l => l.nom === 'Chaussures de marche');
    juge.exige(chaussures?.coche === 'false', `${cas} : Chaussures cochées d'office ${vu(chaussures)}`);
    await appliquer(page);
    const gardees = await stocke(page, 'Chaussures de marche');
    const etiquettes = (await lireStockage(page)).etiquettesDuVoyage.filter(e => e.voyageId === V).map(e => e.nom);
    juge.exige(
      gardees?.quantite === 1 && gardees.dansLeSac === 1 && vu(etiquettes) === vu(['Pluie']),
      `${cas} : retrait sans rien cocher ${vu(gardees)} ${vu(etiquettes)}`,
    );

    // Remettre « Randonnée » : rien ne change pour les objets, pas d'étape « Changements ».
    await ouvrirModification(page);
    await basculerEtiquette(page, 1, 'Randonnée');
    await aller(page, 0);
    await page.fill('#nom', 'Quiberon en famille');
    await voirLesChangements(page);
    await attendreEcran(page, 'voyage');
    await calme(page);
    const titre = await page.textContent('#app h1');
    juge.exige(titre === 'Quiberon en famille', `${cas} : nom seul ${vu(titre)}`);

    // Retirer « Randonnée » et l'accepter : la question de sortie, « Plus tard ».
    await ouvrirModification(page);
    await basculerEtiquette(page, 1, 'Randonnée');
    await voirLesChangements(page);
    await page.click('.recapitulatif .recap-ligne:has-text("Chaussures de marche")');
    await appliquer(page);
    await attendreQuestion(page);
    const question = await lireQuestion(page);
    juge.exige(
      question?.boutons.join() === [fr.sortie.plusTard, fr.sortie.fait].join(),
      `${cas} : question de sortie ${vu(question)}`,
    );
    await capture(page, 'voyage-modifier-sortie', format, theme);
    await repondre(page, fr.sortie.plusTard);
    const barre = await page.evaluate(
      id => document.querySelector(`#app .objet[data-id="${id}"]`)?.hasAttribute('data-retire') ?? null,
      parNom('Chaussures de marche').id,
    );
    juge.exige(barre === true, `${cas} : Chaussures pas barrées (${barre})`);
    juge.exige(
      vu(await objetStocke(page, parNom('Chaussures de marche').id)).includes('"quantite":0'),
      `${cas} : Chaussures stockées ${vu(await objetStocke(page, parNom('Chaussures de marche').id))}`,
    );

    // Panne d'écriture, puis un second appui qui réussit.
    await ecrireStockage(page, { ...(await lireStockage(page)), pannes: ['modifierVoyage'] });
    await ouvrirModification(page);
    await page.click('.assistant [data-voyageurs="1"]');
    await voirLesChangements(page);
    await page.click('.assistant [data-action="creer"]');
    const alerte = await attendreQue(page, () => document.querySelector('.assistant .alerte')?.textContent ?? false);
    juge.exige(
      alerte === m.erreur && (await stocke(page, 'Repas')).quantite === 24,
      `${cas} : panne ${vu(alerte)} ${vu(await stocke(page, 'Repas'))}`,
    );
    ouvert.erreurs.splice(0, ouvert.erreurs.length, ...ouvert.erreurs.filter(e => !e.includes('Panne simulée')));
    await ecrireStockage(page, { ...(await lireStockage(page)), pannes: [] });
    await appliquer(page);
    juge.exige((await stocke(page, 'Repas')).quantite === 32, `${cas} : réessai ${vu(await stocke(page, 'Repas'))}`);

    // Abandon après un changement : la question, puis rien n'a changé.
    await ouvrirModification(page);
    await page.click('.assistant [data-voyageurs="-1"]');
    if (format === 'telephone') await page.click('.assistant .lien-retour');
    else await page.keyboard.press('Escape');
    await attendreQuestion(page);
    const abandon = await lireQuestion(page);
    juge.exige(abandon?.titre === m.abandon.titre, `${cas} : abandon ${vu(abandon)}`);
    await repondre(page, fr.nouveauVoyage.abandon.abandonner);
    await attendreEcran(page, 'voyage');
    juge.exige(
      (await lireStockage(page)).voyages.find(v => v.id === V).voyageurs === 4,
      `${cas} : abandon a écrit ${vu((await lireStockage(page)).voyages)}`,
    );
    await fermerEssai(juge, cas, ouvert);
  }
} finally {
  await navigateur.close();
  await serveur.fermer();
}
juge.conclure('Modifier le voyage', 'prérempli, changements, sortie, panne, abandon');
