// Phase 7, relecture finale (constat C1) : une question chiffrée ou un refus ouverts, puis « Annuler »
// touché dans le bandeau, ne suppriment jamais sur des chiffres périmés. Au moment d'écrire, la
// bibliothèque est relue : mêmes conséquences, la suppression s'écrit ; d'autres, rien n'est écrit et la
// question est reposée (ou le refus rouvert) sur ce que le stockage garde. Téléphone étroit.
// - catégorie Toilette : question à 2 objets (Crème solaire supprimée), « Annuler » dans la question,
//   « Supprimer » : rien n'est écrit, la question revient à 3 objets ; « Supprimer » puis « Annuler » :
//   la bibliothèque d'avant, Crème solaire comprise ;
// - groupe Climat : question à 2 étiquettes (Chaud supprimée), « Annuler », « Supprimer » : rien n'est
//   écrit, la question revient avec Chaud, Froid et Pluie ;
// - groupe Climat : question permise (Bouillotte, qui ne porte que Froid, supprimée), « Annuler »,
//   « Supprimer » : rien n'est écrit, le refus s'ouvre sur Bouillotte (aucun orphelin) ;
// - refus de Climat devenu « Plus rien ne bloque » (Bouillotte supprimée depuis sa ligne) : « Annuler »
//   ramène la liste ; puis « Annuler » lent et « Supprimer » touché pendant : rien n'est écrit, le refus
//   revient sur Bouillotte, qui garde Froid.
// Capture de la question reposée dans captures-travail/.
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { chromium } from 'playwright';
import { attendreSansBandeau, lireBandeau, ouvrirAvecHorloge, supprimerObjet } from './outils/annulation.mjs';
import { attendreQue, calme } from './outils/attente.mjs';
import { fermerEssai, fr, remplir, vu } from './outils/bibliotheque.mjs';
import { libererEcritures, ouvrirEtiquettes } from './outils/etiquettes.mjs';
import { FICHE, attendreFermee, bibliothequeStockee, ouvrirFicheCategorie } from './outils/fiches.mjs';
import { CAPTURES, attendreEcran, creerJuge, ecrireStockage, lireStockage } from './outils/page.mjs';
import { demarrerServeur } from './outils/serveur.mjs';
import {
  QUESTION,
  REFUS,
  attendreLignes,
  attendreQuestion,
  attendreRefus,
  climat,
  donnees,
  empreinte,
  etiquettesDe,
  lireRefus,
  net,
  ouvrirFicheDe,
  ouvrirLigne,
  repondre,
  supprimerModele,
  toucherSupprimer,
} from './outils/suppressions.mjs';

const juge = creerJuge();
const serveur = await demarrerServeur();
const navigateur = await chromium.launch();
const s = fr.suppression;
const a = fr.annulation;
const FORMAT = 'telephone-etroit';
const ETIQUETTE = 'dialog.fiche-nom';
const compte = (cle, n) => remplir(s[cle][n === 1 ? 'one' : 'other'], { n });

// La panne simulée et les lenteurs sont posées dans le stockage du navigateur.
async function poser(page, cle, valeur) {
  await ecrireStockage(page, { ...(await lireStockage(page)), [cle]: valeur });
}

// Les fenêtres déjà vues sont marquées : la suivante, reposée, se reconnaît.
const marquer = (page, selecteur) =>
  page.evaluate(sel => document.querySelectorAll(sel).forEach(d => (d.dataset.vue = '')), selecteur);
const nouvelle = selecteur => `${selecteur}[open]:not([data-fermeture]):not([data-vue])`;

// La question reposée (ni marquée, ni en train de se fermer) : son texte et ce qui est en gras ; null
// si elle ne vient pas.
async function attendreQuestionReposee(page) {
  const venue = await attendreQue(page, sel => document.querySelector(sel) !== null, nouvelle(QUESTION));
  if (!venue) return null;
  await calme(page);
  return page.evaluate(sel => {
    const d = document.querySelector(sel);
    const texte = el => el?.textContent.replace(/\s+/g, ' ').trim() ?? null;
    return {
      titre: texte(d.querySelector('h2')),
      texte: texte(d.querySelector('#suppression-texte')),
      gras: [...d.querySelectorAll('#suppression-texte b')].map(texte),
    };
  }, nouvelle(QUESTION));
}

// « Annuler » du bandeau, puis le rétablissement vu dans le stockage (condition sur la bibliothèque).
async function annulerEtAttendre(page, condition) {
  await page.click('.bandeau-annuler button');
  await attendreSansBandeau(page);
  return attendreQue(
    page,
    source => new Function('b', `return ${source}`)(JSON.parse(localStorage.getItem('baluchon-essai')).bibliotheque),
    condition,
  );
}

const groupeStocke = async (page, nom) => (await bibliothequeStockee(page)).groupes.some(g => g.nom === nom);

// Menu → Réglages → Étiquettes, depuis la Bibliothèque.
async function versEtiquettes(page) {
  await page.click('[data-action="menu"]');
  await attendreQue(page, () => document.querySelector('dialog.tiroir[open]') !== null);
  await calme(page);
  await page.click(`dialog.tiroir .tiroir-lien:text-is("${fr.menu.reglages}")`);
  await attendreEcran(page, 'reglages');
  await page.click('#app a.reglage[href="#/etiquettes"]');
  await attendreEcran(page, 'etiquettes');
}

// 1. Catégorie : la question reposée à 3 objets ; rien n'est perdu.
async function essaiCategorie() {
  const cas = 'catégorie Toilette';
  const ouvert = await ouvrirAvecHorloge(navigateur, serveur.url, FORMAT);
  const { page } = ouvert;
  const avant = await empreinte(page);
  await supprimerObjet(page, 'Toilette', 'Crème solaire');
  await ouvrirFicheCategorie(page, 'Toilette');
  await toucherSupprimer(page, FICHE);
  const premiere = await attendreQuestion(page);
  juge.exige(vu(premiere.gras) === vu([compte('objets', 2)]), `${cas} : première question ${vu(premiere)}`);
  await marquer(page, QUESTION);
  await annulerEtAttendre(page, `b.objets.some(o => o.nom === 'Crème solaire')`);
  const retablie = await empreinte(page);
  await repondre(page, QUESTION, s.supprimer);
  const reposee = await attendreQuestionReposee(page);
  juge.exige(
    reposee?.titre === net(remplir(s.categorieTitre, { nom: 'Toilette' })) &&
      vu(reposee.gras) === vu([compte('objets', 3)]) &&
      (await empreinte(page)) === retablie,
    `${cas} : question reposée ${vu(reposee)}, stockage ${(await empreinte(page)) === retablie ? 'inchangé' : 'changé'}`,
  );
  if (!reposee) return fermerEssai(juge, cas, ouvert);
  await mkdir(CAPTURES, { recursive: true });
  await page.screenshot({ path: join(CAPTURES, `suppression-question-reposee-${FORMAT}.png`) });
  await page.click(`${nouvelle(QUESTION)} .fenetre-pied button:text-is("${s.supprimer}")`);
  await attendreFermee(page, FICHE);
  await attendreQue(page, () => document.querySelector('.bandeau-annuler') !== null);
  const bandeau = await lireBandeau(page);
  juge.exige(
    bandeau?.texte === remplir(a.categorie.other, { nom: 'Toilette', n: 3 }),
    `${cas} : bandeau ${vu(bandeau)}`,
  );
  await annulerEtAttendre(page, `b.categories.some(c => c.nom === 'Toilette')`);
  juge.exige((await empreinte(page)) === avant, `${cas} : « Annuler » ne rend pas la bibliothèque d'avant`);
  await fermerEssai(juge, cas, ouvert);
}

// 2. Groupe : la question reposée nomme Chaud, revenue.
async function essaiGroupe() {
  const cas = 'groupe Climat, Chaud revenue';
  const ouvert = await ouvrirEtiquettes(navigateur, serveur.url, FORMAT, {
    donnees: donnees(climat({ bouillotte: false })),
  });
  const { page } = ouvert;
  await ouvrirFicheDe(page, 'etiquette', 'Chaud');
  await toucherSupprimer(page);
  await attendreQuestion(page);
  await repondre(page, QUESTION, s.supprimer);
  await attendreFermee(page, ETIQUETTE);
  await ouvrirFicheDe(page, 'groupe', 'Climat');
  await toucherSupprimer(page);
  const premiere = await attendreQuestion(page);
  juge.exige(
    premiere.texte?.includes('Froid et Pluie') && !premiere.texte.includes('Chaud'),
    `${cas} : première ${vu(premiere)}`,
  );
  await marquer(page, QUESTION);
  await annulerEtAttendre(page, `b.etiquettes.some(e => e.nom === 'Chaud')`);
  const retablie = await empreinte(page);
  await repondre(page, QUESTION, s.supprimer);
  const reposee = await attendreQuestionReposee(page);
  juge.exige(
    reposee?.texte?.includes('Chaud, Froid et Pluie') && (await empreinte(page)) === retablie,
    `${cas} : question reposée ${vu(reposee)}, Climat ${(await groupeStocke(page, 'Climat')) ? 'gardé' : 'supprimé'}`,
  );
  if (reposee) {
    await page.click(`${nouvelle(QUESTION)} .fenetre-pied button:text-is("${s.garder}")`);
    await calme(page);
    juge.exige((await empreinte(page)) === retablie, `${cas} : « Garder » a écrit`);
  }
  await fermerEssai(juge, cas, ouvert);
}

// 3. Groupe permis, puis Bouillotte revenue : le refus, jamais d'orphelin.
async function essaiOrphelin() {
  const cas = 'groupe Climat, Bouillotte revenue';
  const ouvert = await ouvrirAvecHorloge(navigateur, serveur.url, FORMAT, {
    donnees: donnees(climat({ bouillotte: true })),
  });
  const { page } = ouvert;
  await supprimerObjet(page, 'Vêtements', 'Bouillotte');
  await versEtiquettes(page);
  await ouvrirFicheDe(page, 'groupe', 'Climat');
  await toucherSupprimer(page);
  const premiere = await attendreQuestion(page);
  juge.exige(premiere.titre === net(remplir(s.groupeTitre, { nom: 'Climat' })), `${cas} : question ${vu(premiere)}`);
  await marquer(page, QUESTION);
  await annulerEtAttendre(page, `b.objets.some(o => o.nom === 'Bouillotte')`);
  const retablie = await empreinte(page);
  await repondre(page, QUESTION, s.supprimer);
  const refus = await attendreRefus(page);
  juge.exige(
    vu(refus?.lignes) === vu(['Bouillotte']) &&
      (await empreinte(page)) === retablie &&
      vu(await etiquettesDe(page, 'Bouillotte')) === vu(['Froid']),
    `${cas} : refus ${vu(refus)}, Bouillotte ${vu(await etiquettesDe(page, 'Bouillotte'))}`,
  );
  await fermerEssai(juge, cas, ouvert);
}

// 4. Le refus libre revient à la liste quand « Annuler » rend Bouillotte, même touché juste avant
// « Supprimer », pendant un rétablissement lent.
async function essaiRefusLibre() {
  const cas = 'refus libre, Bouillotte revenue';
  const ouvert = await ouvrirEtiquettes(navigateur, serveur.url, FORMAT, {
    donnees: donnees(climat({ bouillotte: true })),
  });
  const { page } = ouvert;
  // Le refus montre « Plus rien ne bloque ».
  const estLibre = sel => document.querySelector(`${sel}[open] .message-succes`) !== null;
  await ouvrirFicheDe(page, 'groupe', 'Climat');
  await toucherSupprimer(page);
  await attendreRefus(page);
  await ouvrirLigne(page, 'Bouillotte');
  await supprimerModele(page);
  juge.exige(
    await attendreQue(page, estLibre, REFUS),
    `${cas} : pas de « Plus rien ne bloque » ${vu(await lireRefus(page))}`,
  );
  await page.click('.bandeau-annuler button');
  await attendreSansBandeau(page);
  const liste = await attendreLignes(page, ['Bouillotte']);
  juge.exige(
    liste?.role === null && liste.libre === null,
    `${cas} : « Annuler », la liste ne revient pas ${vu(liste)}`,
  );

  // « Annuler » lent, « Supprimer » touché pendant : rien n'est écrit, le refus revient.
  await ouvrirLigne(page, 'Bouillotte');
  await supprimerModele(page);
  await attendreQue(page, estLibre, REFUS);
  await calme(page);
  await poser(page, 'lenteurs', ['retablirBibliotheque']);
  await page.click('.bandeau-annuler button');
  await marquer(page, REFUS);
  await page.click(`${REFUS}[open] [data-supprimer]`);
  await libererEcritures(page);
  await poser(page, 'lenteurs', []);
  const venu = await attendreQue(page, sel => document.querySelector(sel) !== null, nouvelle(REFUS));
  await calme(page);
  const rouvert = venu ? await lireRefus(page) : null;
  juge.exige(
    vu(rouvert?.lignes) === vu(['Bouillotte']) &&
      (await groupeStocke(page, 'Climat')) &&
      vu(await etiquettesDe(page, 'Bouillotte')) === vu(['Froid']),
    `${cas} : rétablissement lent ${vu({ refus: rouvert, climat: await groupeStocke(page, 'Climat'), bouillotte: await etiquettesDe(page, 'Bouillotte') })}`,
  );
  await fermerEssai(juge, cas, ouvert);
}

try {
  await essaiCategorie();
  await essaiGroupe();
  await essaiOrphelin();
  await essaiRefusLibre();
} finally {
  await navigateur.close();
  await serveur.fermer();
}
juge.conclure(
  'Suppressions sur des chiffres périmés',
  'question et refus relisent au moment d’écrire : question reposée, refus rouvert, rien de perdu, aucun orphelin',
);
