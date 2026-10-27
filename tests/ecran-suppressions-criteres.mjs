// Phase 7 (docs/PLAN.md, critères d'acceptation) de bout en bout, sur la bibliothèque de départ
// installée par l'appli, avec les voyages d'essai et un voyage créé avant par « Nouveau voyage » (Plage,
// Camping, Chaud et Tente cochées : il reçoit les modèles visés). Téléphone étroit (une colonne) puis
// tablette en paysage (deux panneaux). Une cible de chaque type : l'étiquette Chaud et le groupe
// Hébergement (permis : personne n'y perd sa dernière étiquette), puis l'objet Crème solaire et la
// catégorie Vêtements. Chacune est supprimée deux fois :
// - d'abord, le chiffre annoncé (en gras dans la question, et dans le bandeau) est celui du stockage :
//   nombre exact d'objets supprimés, de modèles qui perdent l'étiquette ; le stockage est exactement
//   celui d'avant, moins la cible et ce qui part avec elle ; « Annuler » rend le stockage entier
//   d'avant (liens d'étiquettes dans leur ordre, rangs, champs ; objets et étiquettes comparés rangés
//   par id, les modèles n'ayant pas de rang : un objet rétabli revient en fin d'ordre de lecture), et
//   l'écran d'avant, sans rien de déplacé ;
// - puis la suppression reste : le bandeau part au bout de ses 10 s (horloge simulée) sans rien
//   déplacer à l'écran ni changer la hauteur à défiler (sa place est gardée). Présent ou absent, sur les
//   mêmes données, l'écran est le même : son arrivée ne déplace rien non plus.
// Après chaque suppression et chaque « Annuler », les voyages, dont celui créé avant, sont identiques.
import { chromium } from 'playwright';
import { attendreQue, calme } from './outils/attente.mjs';
import { a, attendreSansBandeau, lireBandeau, ouvrirAvecHorloge } from './outils/annulation.mjs';
import { creerDepuisLAssistant } from './outils/assistant.mjs';
import { fermerEssai, fr, remplir, vu } from './outils/bibliotheque.mjs';
import { attendreFermee, montrerCategorie, ouvrirFicheCategorie, ouvrirFicheObjet } from './outils/fiches.mjs';
import { attendreEcran, creerJuge, lireStockage } from './outils/page.mjs';
import { demarrerServeur } from './outils/serveur.mjs';
import {
  MODELE,
  QUESTION,
  attendreQuestion,
  net,
  ouvrirFicheDe,
  repondre,
  toucherSupprimer,
  voyagesStockes,
} from './outils/suppressions.mjs';

const juge = creerJuge();
const serveur = await demarrerServeur();
const navigateur = await chromium.launch();
const s = fr.suppression;
const FORMATS = ['telephone-etroit', 'tablette-paysage'];
const ETIQUETTE = 'dialog.fiche-nom';
const COCHEES = ['Plage', 'Camping', 'Chaud', 'Tente'];
// Les chiffres attendus de la bibliothèque de départ. annonce : le nombre en gras de la question
// (Crème solaire perd Chaud et garde Plage ; Camping perd Tente et garde Camping ; Vêtements a 7
// objets) ; emportes : ce qui part avec la cible, que dit le bandeau (les 3 étiquettes d'Hébergement,
// les 7 objets de Vêtements). Le stockage doit dire la même chose.
const CIBLES = [
  { type: 'etiquette', nom: 'Chaud', annonce: 1, emportes: 0, titre: s.etiquetteTitre, bandeau: () => a.etiquette },
  {
    type: 'groupe',
    nom: 'Hébergement',
    annonce: 1,
    emportes: 3,
    titre: s.groupeTitre,
    bandeau: n => (n === 0 ? a.groupeVide : a.groupe[n === 1 ? 'one' : 'other']),
  },
  {
    type: 'objet',
    nom: 'Crème solaire',
    categorie: 'Toilette',
    annonce: 0,
    emportes: 0,
    titre: s.objetTitre,
    bandeau: () => a.objet,
  },
  {
    type: 'categorie',
    nom: 'Vêtements',
    annonce: 7,
    emportes: 7,
    titre: s.categorieTitre,
    bandeau: n => (n === 0 ? a.categorieVide : a.categorie[n === 1 ? 'one' : 'other']),
  },
];
const surEtiquettes = cible => cible.type === 'etiquette' || cible.type === 'groupe';

// Le stockage entier, objets et étiquettes de la bibliothèque rangés par id (voir l'en-tête).
async function stockage(page) {
  const d = await lireStockage(page);
  const parId = liste => [...liste].sort((x, y) => x.id.localeCompare(y.id));
  return {
    ...d,
    bibliotheque: {
      ...d.bibliotheque,
      objets: parId(d.bibliotheque.objets),
      etiquettes: parId(d.bibliotheque.etiquettes),
    },
  };
}

// L'id de la cible dans la bibliothèque gardée.
function idDe(bibliotheque, cible) {
  const liste = { etiquette: 'etiquettes', groupe: 'groupes', objet: 'objets', categorie: 'categories' }[cible.type];
  return bibliotheque[liste].find(x => x.nom === cible.nom)?.id;
}

// Le stockage attendu après la suppression, tiré de celui d'avant par la règle (contraintes de la
// phase) : une catégorie emporte ses objets, un groupe ses étiquettes, une étiquette ses liens ; rien
// d'autre ne change, pas même un modifieLe.
function sansLaCible(avant, cible, id) {
  let { groupes, etiquettes, categories, objets } = avant.bibliotheque;
  let parties = [];
  if (cible.type === 'categorie') {
    categories = categories.filter(c => c.id !== id);
    objets = objets.filter(o => o.categorieId !== id);
  } else if (cible.type === 'objet') objets = objets.filter(o => o.id !== id);
  else if (cible.type === 'etiquette') parties = [id];
  else {
    groupes = groupes.filter(g => g.id !== id);
    parties = etiquettes.filter(e => e.groupeId === id).map(e => e.id);
  }
  const retire = m => ({ ...m, etiquettes: m.etiquettes.filter(e => !parties.includes(e)) });
  return {
    ...avant,
    bibliotheque: {
      ...avant.bibliotheque,
      groupes,
      etiquettes: etiquettes.filter(e => !parties.includes(e.id)),
      categories: categories.map(retire),
      objets: objets.map(retire),
    },
  };
}

// Ce qui a vraiment changé entre deux bibliothèques gardées : objets partis, étiquettes parties, et
// modèles restés qui ont perdu au moins une étiquette.
function changements(avant, apres) {
  const garde = (liste, x) => liste.some(y => y.id === x.id);
  const modeles = b => [...b.categories, ...b.objets];
  return {
    objets: avant.objets.filter(o => !garde(apres.objets, o)).length,
    etiquettes: avant.etiquettes.filter(e => !garde(apres.etiquettes, e)).length,
    perdants: modeles(apres).filter(
      m => m.etiquettes.length < modeles(avant).find(x => x.id === m.id).etiquettes.length,
    ).length,
  };
}

// Tout ce que l'écran montre (#app), à sa place dans la fenêtre, avec ce que la page et chaque panneau
// défilent et ont à défiler : un élément qui bouge, une place qui change, se voient.
const positions = page =>
  page.evaluate(() => {
    const place = el => {
      const r = el.getBoundingClientRect();
      const defile = el.scrollHeight > el.clientHeight ? ` ↕${Math.round(el.scrollTop)}/${el.scrollHeight}` : '';
      return `${el.tagName.toLowerCase()}.${el.className} ${[r.left, r.top, r.width, r.height].map(Math.round).join(',')}${defile}`;
    };
    const page = document.scrollingElement;
    return [
      `page ↕${Math.round(page.scrollTop)}/${page.scrollHeight} ↔${Math.round(page.scrollLeft)}/${page.scrollWidth}`,
      ...[...document.querySelectorAll('#app *')].filter(el => el.checkVisibility()).map(place),
    ];
  });

// La première différence entre deux relevés, ou null.
function difference(avant, apres) {
  for (let i = 0; i < Math.max(avant.length, apres.length); i += 1)
    if (avant[i] !== apres[i]) return `n° ${i} sur ${avant.length}/${apres.length} : ${avant[i]} → ${apres[i]}`;
  return null;
}

// La cible amenée dans la vue, sa catégorie dépliée ou choisie : l'écran tel que « Annuler » le rendra
// (l'élément rétabli est éclairé et amené au plus près dans la vue).
async function montrer(page, cible, id) {
  if (cible.type === 'objet') await montrerCategorie(page, cible.categorie);
  if (cible.type === 'categorie') await montrerCategorie(page, cible.nom);
  const selecteur = {
    etiquette: `#app [data-action="modifier-etiquette"][data-id="${id}"]`,
    groupe: `#app section.groupe[data-groupe="${id}"]`,
    objet: `#app [data-action="modifier-objet"][data-id="${id}"]`,
    categorie: `#app [data-flip="cat-${id}"]`,
  }[cible.type];
  await page.evaluate(sel => document.querySelector(sel)?.scrollIntoView({ block: 'nearest' }), selecteur);
  await calme(page);
}

// Sa fiche, « Supprimer », la question chiffrée, puis « Supprimer » : rend la question et le bandeau.
async function supprimer(page, cible) {
  const fiche = surEtiquettes(cible) ? ETIQUETTE : MODELE;
  if (surEtiquettes(cible)) await ouvrirFicheDe(page, cible.type, cible.nom);
  else if (cible.type === 'objet') await ouvrirFicheObjet(page, cible.categorie, cible.nom);
  else await ouvrirFicheCategorie(page, cible.nom);
  await toucherSupprimer(page, fiche);
  const question = await attendreQuestion(page);
  await repondre(page, QUESTION, s.supprimer);
  await attendreFermee(page, fiche);
  await attendreQue(page, () => document.querySelector('.bandeau-annuler')?.dataset.place === 'bas');
  await calme(page);
  return { question, bandeau: await lireBandeau(page) };
}

// Le chiffre annoncé : la somme des nombres en gras de la question (« 1 objet et 1 catégorie » = 2).
const annonce = question => question.gras.flatMap(g => g.match(/\d+/g) ?? []).reduce((n, x) => n + Number(x), 0);

// 1. Supprimer, juger les chiffres et le stockage, puis « Annuler ».
async function essaiAnnuler(page, cas, cible, voyages) {
  const avant = await stockage(page);
  const id = idDe(avant.bibliotheque, cible);
  await montrer(page, cible, id);
  const ecranAvant = await positions(page);
  const { question, bandeau } = await supprimer(page, cible);
  const apres = await stockage(page);
  const fait = changements(avant.bibliotheque, apres.bibliotheque);
  const annonces = annonce(question);
  juge.exige(question.titre === net(remplir(cible.titre, { nom: cible.nom })), `${cas} : question ${vu(question)}`);
  // Ce qui part avec la cible : les objets d'une catégorie, les étiquettes d'un groupe.
  const emportes = { categorie: fait.objets, groupe: fait.etiquettes }[cible.type] ?? 0;
  // Le nombre en gras : les objets supprimés avec une catégorie, sinon les modèles qui perdent une
  // étiquette.
  const chiffre = cible.type === 'categorie' ? fait.objets : fait.perdants;
  juge.exige(
    annonces === cible.annonce && chiffre === annonces && emportes === cible.emportes,
    `${cas} : annoncé ${annonces} (${vu(question.gras)}), fait ${vu(fait)}, attendu ${vu(cible)}`,
  );
  juge.exige(
    bandeau?.texte === remplir(cible.bandeau(emportes), { nom: cible.nom, n: emportes }),
    `${cas} : bandeau ${vu(bandeau?.texte)} (${emportes} emporté(s))`,
  );
  if (cible.type === 'objet') juge.exige(fait.objets === 1 && fait.perdants === 0, `${cas} : fait ${vu(fait)}`);
  juge.exige(vu(apres) === vu(sansLaCible(avant, cible, id)), `${cas} : le stockage a changé au-delà de la cible`);
  juge.exige((await voyagesStockes(page)) === voyages, `${cas} : les voyages ont changé à la suppression`);

  await page.click('.bandeau-annuler button');
  juge.exige(await attendreSansBandeau(page), `${cas} : le bandeau reste après « Annuler »`);
  await attendreQue(page, () => document.querySelector('#app [data-recent]') !== null);
  await calme(page);
  juge.exige(vu(await stockage(page)) === vu(avant), `${cas} : le stockage rétabli diffère de celui d'avant`);
  juge.exige((await voyagesStockes(page)) === voyages, `${cas} : les voyages ont changé à l'annulation`);
  const ecart = difference(ecranAvant, await positions(page));
  juge.exige(ecart === null, `${cas} : l'écran rétabli a bougé, ${ecart}`);
}

// 2. Supprimer de nouveau, et laisser le bandeau partir de lui-même au bout de ses 10 s.
async function essaiDepart(page, cas, cible, voyages) {
  const avant = await stockage(page);
  await montrer(page, cible, idDe(avant.bibliotheque, cible));
  await supprimer(page, cible);
  const pendant = await positions(page);
  const apres = await stockage(page);
  // L'horloge arrêtée : seul le test la fait avancer, au-delà des 10 s.
  await page.clock.pauseAt((await page.evaluate(() => Date.now())) + 20);
  juge.exige((await lireBandeau(page)) !== null, `${cas} : le bandeau est parti trop tôt`);
  await page.clock.runFor(10100);
  juge.exige(
    (await page.evaluate(() => document.querySelector('.bandeau-annuler'))) === null,
    `${cas} : le bandeau est encore là après 10 s`,
  );
  await page.clock.resume();
  await calme(page);
  const ecart = difference(pendant, await positions(page));
  juge.exige(ecart === null, `${cas} : le départ du bandeau a fait bouger l'écran, ${ecart}`);
  juge.exige(vu(await stockage(page)) === vu(apres), `${cas} : le départ du bandeau a changé le stockage`);
  juge.exige((await voyagesStockes(page)) === voyages, `${cas} : les voyages ont changé`);
}

// Menu → Nouveau voyage, du 10 au 13 octobre, les étiquettes de COCHEES pressées à chaque étape.
async function creerVoyage(page) {
  await page.clock.setSystemTime(new Date('2026-10-06T10:00:00'));
  await page.click('#app [data-action="menu"]');
  await attendreQue(page, () => document.querySelector('dialog.tiroir[open]') !== null);
  await calme(page);
  await page.click('dialog.tiroir a.tiroir-lien[href="#/nouveau-voyage"]');
  await attendreEcran(page, 'nouveau-voyage');
  await page.fill('#nom', 'Avant les suppressions');
  await page.fill('#destination', 'Vercors');
  await page.click('[data-jour="2026-10-10"]');
  await page.click('[data-jour="2026-10-13"]');
  while ((await page.$eval('.formulaire-corps', c => c.dataset.etape)) !== 'apercu') {
    await page.click('[data-action="suivant"]');
    await calme(page);
    for (const puce of await page.locator('.puce-etiquette').all())
      if (COCHEES.includes((await puce.textContent()).trim()) && (await puce.getAttribute('aria-pressed')) !== 'true')
        await puce.click();
  }
  await creerDepuisLAssistant(page);
  await attendreEcran(page, 'voyage');
  await page.click('#app a.lien-retour');
  await attendreEcran(page, 'voyages');
}

// L'écran de la cible (Bibliothèque ou Étiquettes), par Réglages : depuis l'accueil, par le menu ;
// depuis l'autre écran, par son lien de retour.
async function versEcranDe(page, cible) {
  const ecran = surEtiquettes(cible) ? 'etiquettes' : 'bibliotheque';
  const ici = await page.getAttribute('#app', 'data-ecran');
  if (ici === ecran) return;
  if (ici === 'voyages') {
    await page.click('#app [data-action="menu"]');
    await attendreQue(page, () => document.querySelector('dialog.tiroir[open]') !== null);
    await calme(page);
    await page.click(`dialog.tiroir .tiroir-lien:text-is("${fr.menu.reglages}")`);
  } else await page.click('#app a.lien-retour');
  await attendreEcran(page, 'reglages');
  await page.click(`#app a.reglage[href="#/${ecran}"]`);
  await attendreEcran(page, ecran);
  await calme(page);
}

async function essai(format) {
  const ouvert = await ouvrirAvecHorloge(navigateur, serveur.url, format);
  const { page } = ouvert;
  await creerVoyage(page);
  const voyages = await voyagesStockes(page);
  // Le voyage créé avant porte les modèles visés : sans eux, rien ne prouverait qu'il ne change pas.
  const d = await lireStockage(page);
  const cree = d.voyages.find(v => v.nom === 'Avant les suppressions');
  const noms = liste => liste.filter(x => x.voyageId === cree?.id).map(x => x.nom);
  juge.exige(
    ['Crème solaire', 'T-shirts', 'Lampe frontale'].every(n => noms(d.objetsDuVoyage).includes(n)) &&
      ['Vêtements', 'Camping'].every(n => noms(d.categoriesDuVoyage).includes(n)) &&
      ['Chaud', 'Tente'].every(n => noms(d.etiquettesDuVoyage).includes(n)),
    `${format} : le voyage créé avant ne porte pas les modèles visés ${vu(d.objetsDuVoyage.length)}`,
  );
  for (const cible of CIBLES) {
    const cas = `${cible.nom} (${format})`;
    await versEcranDe(page, cible);
    await essaiAnnuler(page, cas, cible, voyages);
    await essaiDepart(page, cas, cible, voyages);
  }
  await fermerEssai(juge, format, ouvert);
}

try {
  for (const format of FORMATS) await essai(format);
} finally {
  await navigateur.close();
  await serveur.fermer();
}
juge.conclure(
  'Critères de la phase 7',
  'chiffres annoncés = stockage, « Annuler » à l’identique, voyages inchangés, bandeau qui ne fait rien bouger, une cible de chaque type',
);
