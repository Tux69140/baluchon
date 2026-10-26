// Phase 7 (spec, « Maquettes validées », docs/maquettes/suppressions/) : supprimer une catégorie ou un
// objet modèle depuis sa fiche, après la question chiffrée (src/ecrans/suppression.js). Téléphone
// étroit (360 × 640) puis tablette en paysage (deux panneaux).
// - « Supprimer la catégorie » / « Supprimer l’objet » : absent d'une fiche neuve, présent sous un
//   trait, en fin de fiche, dans une fiche existante ;
// - Camping : « Ses 3 objets seront supprimés aussi. … », « 3 objets » seul en gras ; « Garder » ne
//   change rien ; « Supprimer » ferme question et fiche, Camping et ses objets quittent l'écran et le
//   stockage ; en deux panneaux, la première catégorie restante est choisie (Review Focus 4) ;
// - un objet : « Supprimer l’objet « … » ? » ; supprimé, il quitte sa catégorie ;
// - panne de supprimerObjet : la fiche reste, message en haut, stockage inchangé ;
// - double appui sur « Supprimer » pendant une écriture lente : une seule écriture, boutons de la
//   fiche inactifs (Review Focus 2) ;
// - noms « Sacs <&"> » rendus tels quels ; la dernière catégorie supprimée : « 0 catégorie · 0 objet »
//   et « Nouvelle catégorie », aux deux dispositions (Review Focus 1 et 4) ;
// - captures claires et sombres de la fiche et de la question dans captures-travail/.
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { chromium } from 'playwright';
import { construireBibliotheque } from '../src/modele/bibliotheque.js';
import { attendreQue, calme } from './outils/attente.mjs';
import { avecBibliotheque } from './outils/assistant.mjs';
import {
  DONNEES,
  fermerEssai,
  fr,
  lire,
  ouvrirBibliotheque as ouvrirLaBibliotheque,
  remplir,
  vu,
} from './outils/bibliotheque.mjs';
import { libererEcritures } from './outils/etiquettes.mjs';
import { demarrerServeur } from './outils/serveur.mjs';
import {
  FICHE,
  attendreFermee,
  bibliothequeStockee,
  lireFiche,
  m,
  ouvrirFicheCategorie,
  ouvrirFicheObjet,
  ouvrirNouvelObjet,
  ouvrirNouvelleCategorie,
  toucher,
} from './outils/fiches.mjs';
import { CAPTURES, NOMS_THEME, creerJuge, ecrireStockage, lireStockage, verifierCommandes } from './outils/page.mjs';

const juge = creerJuge();
const serveur = await demarrerServeur();
const navigateur = await chromium.launch();
const s = fr.suppression;
const QUESTION = 'dialog[role="alertdialog"]';
const FORMATS = ['telephone-etroit', 'tablette-paysage'];
const PIEGE = 'Sacs <&">';

// Une seule catégorie, au nom piégé, et son seul objet, au même nom (Review Focus 1).
const depart = fr.bibliothequeDeDepart;
const papiers = depart.categories.find(c => c.nom === 'Papiers');
let numero = 0;
const DONNEES_PIEGE = {
  ...DONNEES,
  ...avecBibliotheque(
    construireBibliotheque(
      {
        groupes: depart.groupes,
        categories: [{ ...papiers, nom: PIEGE, objets: [{ ...papiers.objets[0], nom: PIEGE }] }],
      },
      { nouvelId: () => `id-${++numero}`, maintenant: 'x' },
    ),
  ),
};

async function ouvrirBibliotheque(format, options) {
  const ouvert = await ouvrirLaBibliotheque(navigateur, serveur.url, format, options);
  // Une commande attendue qui ne vient pas fait buter l'essai vite, sans attendre 30 s.
  ouvert.page.setDefaultTimeout(5000);
  return ouvert;
}

// La panne simulée est attendue : seule une autre erreur est une faute.
function fermer(cas, ouvert) {
  ouvert.erreurs.splice(0, Infinity, ...ouvert.erreurs.filter(e => !e.includes('Panne simulée')));
  return fermerEssai(juge, cas, ouvert);
}

// Les espaces insécables des textes se lisent comme des espaces.
const net = texte => texte?.replace(/\s+/g, ' ').trim() ?? null;

// « Supprimer » de la fiche ouverte : libellé, trait au-dessus, en fin de fiche, inactif.
const lireZone = page =>
  page.evaluate(selecteur => {
    const d = [...document.querySelectorAll(selecteur)].find(x => x.open && !('fermeture' in x.dataset));
    const bouton = d?.querySelector('.zone-suppression [data-supprimer]');
    if (!bouton) return null;
    const zone = bouton.closest('.zone-suppression');
    return {
      libelle: bouton.textContent.trim(),
      trait: parseFloat(getComputedStyle(zone).borderTopWidth) > 0,
      enDernier: zone === d.querySelector('.fiche-corps').lastElementChild,
      inactif: bouton.getAttribute('aria-disabled') === 'true',
      enregistrerInactif: d.querySelector('[data-enregistrer]').getAttribute('aria-disabled') === 'true',
    };
  }, FICHE);

const lireQuestion = page =>
  page.evaluate(selecteur => {
    const d = document.querySelector(`${selecteur}[open]`);
    if (!d) return null;
    const texte = el => el?.textContent ?? null;
    return {
      titre: texte(d.querySelector('h2')),
      texte: texte(d.querySelector('#suppression-texte')),
      decrit: d.getAttribute('aria-describedby'),
      gras: [...d.querySelectorAll('#suppression-texte b')].map(texte),
      balises: d.querySelectorAll('h2 *, #suppression-texte *:not(b)').length,
      boutons: [...d.querySelectorAll('.fenetre-pied button')].map(
        b => `${b.textContent.trim()}:${b.classList.contains('bouton-danger') ? 'danger' : 'autre'}`,
      ),
      focus: document.activeElement?.textContent.trim() ?? null,
    };
  }, QUESTION);

async function supprimer(page) {
  await toucher(page, '[data-supprimer]');
  await attendreQue(page, q => document.querySelector(`${q}[open]`) !== null, QUESTION);
  await calme(page);
  return lireQuestion(page);
}

async function repondre(page, libelle, { double = false } = {}) {
  const bouton = `${QUESTION} .fenetre-pied button:text-is("${libelle}")`;
  if (double) await page.dblclick(bouton);
  else await page.click(bouton);
  await attendreQue(page, q => !document.querySelector(q), QUESTION);
  await calme(page);
}

const alerte = page =>
  page.evaluate(() => {
    const a = document.querySelector('.alerte-haut');
    return a?.matches(':popover-open') ? a.textContent.trim() : null;
  });

// La bibliothèque gardée, objets et étiquettes rangés par id : l'ordre de lecture ne compte pas.
const empreinte = async page => {
  const b = await bibliothequeStockee(page);
  const parId = liste => [...liste].sort((x, y) => x.id.localeCompare(y.id));
  return vu({ ...b, objets: parId(b.objets), etiquettes: parId(b.etiquettes) });
};

async function poser(page, cle, operations) {
  const donnees = await lireStockage(page);
  await ecrireStockage(page, { ...donnees, [cle]: operations });
}

// Les objets que l'écran montre d'une catégorie (dépliée ou choisie).
const objetsVus = (vue, nom) =>
  (vue.panneaux ? vue.detailObjets : vue.cartes.find(c => c.nom === nom)?.objets.map(o => o.nom)) ?? [];

// 1. « Supprimer » : absent d'une fiche neuve, présent sous un trait dans une fiche existante.
async function essaiPresence(format) {
  const cas = `présence de « Supprimer » (${format})`;
  const ouvert = await ouvrirBibliotheque(format);
  const { page } = ouvert;
  await ouvrirNouvelleCategorie(page);
  juge.exige((await lireZone(page)) === null, `${cas} : présent dans une nouvelle catégorie`);
  await toucher(page, '.bouton-fermer');
  await attendreFermee(page);
  await ouvrirFicheCategorie(page, 'Camping');
  const categorie = await lireZone(page);
  juge.exige(
    categorie?.libelle === m.categorie.supprimer && categorie.trait && categorie.enDernier && !categorie.inactif,
    `${cas} : catégorie ${vu(categorie)}`,
  );
  await toucher(page, '.bouton-fermer');
  await attendreFermee(page);
  await ouvrirNouvelObjet(page, 'Toilette');
  juge.exige((await lireZone(page)) === null, `${cas} : présent dans un nouvel objet`);
  await toucher(page, '.bouton-fermer');
  await attendreFermee(page);
  await ouvrirFicheObjet(page, 'Toilette', 'Crème solaire');
  const objet = await lireZone(page);
  juge.exige(
    objet?.libelle === m.objet.supprimer && objet.trait && objet.enDernier && !objet.inactif,
    `${cas} : objet ${vu(objet)}`,
  );
  await fermer(cas, ouvert);
}

// 2. Camping : la question chiffrée, « Garder », puis « Supprimer ».
async function essaiCategorie(format) {
  const cas = `Camping supprimée (${format})`;
  const ouvert = await ouvrirBibliotheque(format);
  const { page } = ouvert;
  const avant = await empreinte(page);
  const stockee = await bibliothequeStockee(page);
  const camping = stockee.categories.find(c => c.nom === 'Camping');
  await ouvrirFicheCategorie(page, 'Camping');
  const question = await supprimer(page);
  juge.exige(
    question?.titre === remplir(s.categorieTitre, { nom: 'Camping' }) &&
      net(question.texte) ===
        'Ses 3 objets seront supprimés aussi. Elle ne sera plus proposée dans « Nouveau voyage ». Les voyages déjà créés ne changent pas.' &&
      question.decrit === 'suppression-texte' &&
      vu(question.gras) === vu(['3 objets']) &&
      question.balises === 0 &&
      vu(question.boutons) === vu([`${s.garder}:autre`, `${s.supprimer}:danger`]) &&
      question.focus === s.garder,
    `${cas} : question ${vu(question)}`,
  );
  await repondre(page, s.garder);
  juge.exige(
    (await lireFiche(page))?.titre === 'Camping' && (await empreinte(page)) === avant,
    `${cas} : « Garder » a changé quelque chose`,
  );
  await supprimer(page);
  await repondre(page, s.supprimer);
  juge.exige(await attendreFermee(page), `${cas} : la fiche reste ouverte`);
  const vue = await lire(page);
  const apres = await bibliothequeStockee(page);
  juge.exige(
    !vue.cartes.some(c => c.nom === 'Camping') && !vue.choix.includes('Camping'),
    `${cas} : Camping encore à l'écran ${vu({ cartes: vue.cartes.map(c => c.nom), choix: vue.choix })}`,
  );
  juge.exige(
    !apres.categories.some(c => c.id === camping.id) &&
      !apres.objets.some(o => o.categorieId === camping.id) &&
      apres.objets.length === stockee.objets.length - 3 &&
      apres.categories.length === stockee.categories.length - 1,
    `${cas} : stockage ${vu(apres.categories.map(c => c.nom))}`,
  );
  // Camping était choisie (la fiche s'ouvre depuis le détail) : la première restante l'est à sa place.
  if (vue.panneaux)
    juge.exige(
      vue.choisie === 'Vêtements' && vue.detail === 'Vêtements',
      `${cas} : choisie ${vu({ choisie: vue.choisie, detail: vue.detail })}`,
    );
  await fermer(cas, ouvert);
}

// 3. Un objet supprimé quitte sa catégorie ; une panne laisse tout en place.
async function essaiObjet(format) {
  const cas = `Crème solaire supprimée (${format})`;
  const ouvert = await ouvrirBibliotheque(format);
  const { page } = ouvert;
  const avant = await empreinte(page);
  await poser(page, 'pannes', ['supprimerObjet']);
  await ouvrirFicheObjet(page, 'Toilette', 'Crème solaire');
  const question = await supprimer(page);
  juge.exige(
    question?.titre === remplir(s.objetTitre, { nom: 'Crème solaire' }) &&
      net(question.texte) ===
        'Il ne sera plus proposé dans « Nouveau voyage ». Les voyages déjà créés ne changent pas.' &&
      question.gras.length === 0,
    `${cas} : question ${vu(question)}`,
  );
  await repondre(page, s.supprimer);
  await attendreQue(page, () => document.querySelector('.alerte-haut') !== null);
  const zone = await lireZone(page);
  juge.exige(
    (await alerte(page)) === s.erreur &&
      (await lireFiche(page))?.titre === 'Crème solaire' &&
      !zone?.inactif &&
      !zone?.enregistrerInactif &&
      (await empreinte(page)) === avant,
    `${cas} : panne ${vu({ alerte: await alerte(page), zone })}`,
  );
  await poser(page, 'pannes', []);
  await supprimer(page);
  await repondre(page, s.supprimer);
  juge.exige(await attendreFermee(page), `${cas} : la fiche reste ouverte`);
  const vue = await lire(page);
  const apres = await bibliothequeStockee(page);
  juge.exige(
    vu(objetsVus(vue, 'Toilette')) === vu(['Brosse à dents', 'Dentifrice']) &&
      !apres.objets.some(o => o.nom === 'Crème solaire'),
    `${cas} : ${vu({ vus: objetsVus(vue, 'Toilette'), stockes: apres.objets.length })}`,
  );
  await fermer(cas, ouvert);
}

// 4. Double appui sur « Supprimer » pendant une écriture lente : une seule écriture.
async function essaiDoubleAppui(format) {
  const cas = `double appui (${format})`;
  const ouvert = await ouvrirBibliotheque(format);
  const { page } = ouvert;
  const avant = (await bibliothequeStockee(page)).objets.length;
  await poser(page, 'lenteurs', ['supprimerObjet']);
  await ouvrirFicheObjet(page, 'Alimentation', 'Gourde');
  await supprimer(page);
  await repondre(page, s.supprimer, { double: true });
  const pendant = await lireZone(page);
  juge.exige(
    pendant?.inactif && pendant.enregistrerInactif,
    `${cas} : boutons actifs pendant l'écriture ${vu(pendant)}`,
  );
  const ecritures = await libererEcritures(page, { max: 2 });
  juge.exige(await attendreFermee(page), `${cas} : la fiche reste ouverte`);
  const apres = (await bibliothequeStockee(page)).objets.length;
  juge.exige(ecritures === 1 && apres === avant - 1, `${cas} : ${ecritures} écriture(s), ${avant} → ${apres} objets`);
  await fermer(cas, ouvert);
}

// 5. Noms piégés, puis la dernière catégorie supprimée : une bibliothèque vide, sans erreur.
async function essaiPiegeEtDerniere(format) {
  const cas = `noms piégés, dernière catégorie (${format})`;
  const ouvert = await ouvrirBibliotheque(format, { donnees: DONNEES_PIEGE });
  const { page } = ouvert;
  await ouvrirFicheObjet(page, PIEGE, PIEGE);
  const objet = await supprimer(page);
  juge.exige(
    objet?.titre === remplir(s.objetTitre, { nom: PIEGE }) && objet.balises === 0,
    `${cas} : question de l'objet ${vu(objet)}`,
  );
  await repondre(page, s.garder);
  await toucher(page, '.bouton-fermer');
  await attendreFermee(page);
  await ouvrirFicheCategorie(page, PIEGE);
  const categorie = await supprimer(page);
  juge.exige(
    categorie?.titre === remplir(s.categorieTitre, { nom: PIEGE }) &&
      net(categorie.texte).startsWith('Son 1 objet sera supprimé aussi.') &&
      vu(categorie.gras) === vu(['1 objet']) &&
      categorie.balises === 0,
    `${cas} : question de la catégorie ${vu(categorie)}`,
  );
  await repondre(page, s.supprimer);
  juge.exige(await attendreFermee(page), `${cas} : la fiche reste ouverte`);
  const vue = await lire(page);
  const resume = `${remplir(fr.bibliotheque.categories.one, { n: 0 })} · ${remplir(fr.bibliotheque.objets.one, { n: 0 })}`;
  juge.exige(
    vue.resume === resume && vue.nouvelle && vue.cartes.length === 0 && vue.choix.length === 0 && vue.detail === null,
    `${cas} : bibliothèque vide ${vu({ resume: vue.resume, nouvelle: vue.nouvelle, detail: vue.detail })}`,
  );
  const stockee = await bibliothequeStockee(page);
  juge.exige(stockee.categories.length === 0 && stockee.objets.length === 0, `${cas} : stockage pas vide`);
  await fermer(cas, ouvert);
}

// 6. Captures claires et sombres : la fiche de Camping (« Supprimer » amené dans la vue), puis la question.
async function essaiCaptures(format, theme) {
  const cas = `captures (${format}, ${NOMS_THEME[theme]})`;
  const ouvert = await ouvrirBibliotheque(format, { theme });
  const { page } = ouvert;
  await mkdir(CAPTURES, { recursive: true });
  await ouvrirFicheCategorie(page, 'Camping');
  await page.locator(`${FICHE} [data-supprimer]`).scrollIntoViewIfNeeded();
  await calme(page);
  await page.screenshot({ path: join(CAPTURES, `supprimer-categorie-fiche-${format}-${NOMS_THEME[theme]}.png`) });
  await supprimer(page);
  await verifierCommandes(page, juge, cas);
  await page.screenshot({ path: join(CAPTURES, `supprimer-categorie-question-${format}-${NOMS_THEME[theme]}.png`) });
  await fermer(cas, ouvert);
}

try {
  for (const format of FORMATS) {
    await essaiPresence(format);
    await essaiCategorie(format);
    await essaiObjet(format);
    await essaiPiegeEtDerniere(format);
    for (const theme of Object.keys(NOMS_THEME)) await essaiCaptures(format, theme);
  }
  await essaiDoubleAppui('telephone-etroit');
} finally {
  await navigateur.close();
  await serveur.fermer();
}
juge.conclure(
  'Suppressions dans la bibliothèque',
  'question chiffrée, Garder, Supprimer, panne, double appui, noms piégés, bibliothèque vide, deux dispositions',
);
