// Phase 7 (spec, « Maquettes validées », docs/maquettes/suppressions/gestes.mjs) : supprimer une
// étiquette ou un groupe depuis l'écran Étiquettes, sur la bibliothèque de tests/suppressions.test.js
// déposée dans le stockage (tests/outils/suppressions.mjs), avec des voyages. Téléphone étroit.
// - Chaud : permise, « 1 objet perdra cette étiquette » ; « Garder » ne change rien ;
// - Plage : refusée, 3 à régler, la catégorie d'abord ; « Fermer » et le retour système ferment le seul
//   refus ; Maillot de bain en « Toujours inclus » quitte la liste ; Tongs supprimé depuis sa fiche
//   (bandeau en haut, liste à 1), rétabli par « Annuler » (liste à 2), supprimé de nouveau ; Baignade
//   (le bandeau passe sur sa fiche et s'y touche) reçoit Chaud : « Plus rien ne bloque », « 1 objet et
//   1 catégorie perdront cette étiquette » ;
//   « Supprimer » ferme refus et fiche, bandeau « Étiquette « Plage » supprimée » ; « Annuler » : la
//   bibliothèque revient à l'identique (ordre des étiquettes de chaque groupe compris) et Crème solaire
//   relit [Plage, Chaud] dans cet ordre ;
// - groupe Climat refusé (Bonnet, Cape de pluie, Doudoune) ; groupe Hébergement permis (« 1 catégorie
//   perdra une de ses étiquettes ; elle garde les autres. »), supprimé puis rétabli ;
// - les voyages créés avant sont identiques.
import { chromium } from 'playwright';
import { attendreQue, calme } from './outils/attente.mjs';
import { attendreSansBandeau, lireBandeau } from './outils/annulation.mjs';
import { fermerEssai, fr, lire as lireBibliotheque, remplir, versBibliotheque, vu } from './outils/bibliotheque.mjs';
import { arbreStocke, lire, ouvrirEtiquettes } from './outils/etiquettes.mjs';
import { attendreFermee, bibliothequeStockee } from './outils/fiches.mjs';
import { creerJuge } from './outils/page.mjs';
import { demarrerServeur } from './outils/serveur.mjs';
import {
  MODELE,
  QUESTION,
  REFUS,
  ajouterEtiquette,
  attendreLignes,
  attendreQuestion,
  attendreRefus,
  donnees,
  empreinte,
  etiquettesDe,
  lireRefus,
  net,
  ouvrirFicheDe,
  ouvrirLigne,
  rendreToujoursInclus,
  repondre,
  supprimerModele,
  toucherSupprimer,
  voyagesStockes,
} from './outils/suppressions.mjs';

const juge = creerJuge();
const serveur = await demarrerServeur();
const navigateur = await chromium.launch();
const s = fr.suppression;
const r = fr.refus;
const a = fr.annulation;
const FORMAT = 'telephone-etroit';
const ETIQUETTE = 'dialog.fiche-nom';

// La phrase attendue, telle qu'on la lit (espaces insécables comprises).
const phrase = (...morceaux) => net(morceaux.join(' '));
const compte = (cle, n) => remplir(s[cle][n === 1 ? 'one' : 'other'], { n });

async function annuler(page) {
  await page.click('.bandeau-annuler button');
  await attendreSansBandeau(page);
}

// 1. Chaud : la question chiffrée, « Garder ».
async function essaiChaud(page) {
  const cas = 'Chaud';
  const avant = await empreinte(page);
  await ouvrirFicheDe(page, 'etiquette', 'Chaud');
  await toucherSupprimer(page);
  const question = await attendreQuestion(page);
  juge.exige(
    question.titre === net(remplir(s.etiquetteTitre, { nom: 'Chaud' })) &&
      question.texte ===
        phrase(s.etiquetteSuite, remplir(s.perteEtiquette.objet, { compte: compte('objets', 1) }), s.voyages) &&
      vu(question.gras) === vu([compte('objets', 1)]),
    `${cas} : question ${vu(question)}`,
  );
  juge.exige((await lireRefus(page)) === null, `${cas} : un refus s'est ouvert`);
  await repondre(page, QUESTION, s.garder);
  await page.click(`${ETIQUETTE} .bouton-fermer`);
  juge.exige(await attendreFermee(page, ETIQUETTE), `${cas} : la fiche reste ouverte`);
  juge.exige((await empreinte(page)) === avant, `${cas} : « Garder » a changé la bibliothèque`);
}

// 2. Plage : le refus, réglé élément par élément, puis la suppression et son annulation.
async function essaiPlage(page) {
  const cas = 'Plage';
  await ouvrirFicheDe(page, 'etiquette', 'Plage');
  await toucherSupprimer(page);
  let refus = await attendreRefus(page);
  const vetements = remplir(r.objet, { categorie: 'Vêtements' });
  juge.exige(
    refus?.titre === net(remplir(r.titre, { nom: 'Plage' })) &&
      refus.role !== 'alertdialog' &&
      refus.explication === net(r.etiquette.other) &&
      refus.reste === net(remplir(r.reste, { n: 3 })) &&
      vu(refus.lignes) === vu(['Baignade', 'Maillot de bain', 'Tongs']) &&
      vu(refus.details) === vu([net(remplir(r.categorie.other, { n: 3 })), net(vetements), net(vetements)]) &&
      vu(refus.paves) === vu(['ciel', 'ciel', 'ciel']) &&
      vu(refus.boutons) === vu([`${r.fermer}:autre`]) &&
      refus.croix,
    `${cas} : refus ${vu(refus)}`,
  );

  // « Fermer », puis le retour système : le refus seul se ferme, la fiche de Plage reste.
  await repondre(page, REFUS, r.fermer);
  await attendreQue(page, d => !document.querySelector(d), REFUS);
  juge.exige(
    (await page.locator(`${ETIQUETTE}[open] [data-supprimer]:not([aria-disabled])`).count()) === 1,
    `${cas} : après « Fermer », la fiche de Plage n'est plus là ou reste inactive`,
  );
  await toucherSupprimer(page);
  await attendreRefus(page);
  await page.goBack();
  await attendreQue(page, d => !document.querySelector(d), REFUS);
  await calme(page);
  juge.exige((await page.locator(`${ETIQUETTE}[open]`).count()) === 1, `${cas} : le retour a fermé la fiche`);
  await toucherSupprimer(page);
  await attendreRefus(page);

  // La fiche de Maillot de bain, ouverte depuis la liste puis fermée par le retour système : elle
  // seule se ferme ; la liste, relue, n'a pas changé, et le focus revient sur sa ligne.
  juge.exige(await ouvrirLigne(page, 'Maillot de bain'), `${cas} : la fiche de Maillot ne s'ouvre pas`);
  await page.goBack();
  juge.exige(await attendreFermee(page, MODELE), `${cas} : le retour laisse la fiche de Maillot`);
  refus = await attendreLignes(page, ['Baignade', 'Maillot de bain', 'Tongs']);
  await attendreQue(page, () => document.activeElement?.classList.contains('refus-ligne'));
  refus = await lireRefus(page);
  juge.exige(
    refus?.focus?.startsWith('Maillot de bain') && (await page.locator(`${ETIQUETTE}[open]`).count()) === 1,
    `${cas} : après le retour sur la fiche de Maillot ${vu(refus)}`,
  );

  // Maillot de bain en « Toujours inclus » : il quitte la liste, le focus revient dans la liste.
  await ouvrirLigne(page, 'Maillot de bain');
  juge.exige(await rendreToujoursInclus(page, fr.modele.toujoursInclus), `${cas} : la fiche de Maillot reste`);
  refus = await attendreLignes(page, ['Baignade', 'Tongs']);
  juge.exige(
    refus?.reste === net(remplir(r.reste, { n: 2 })) &&
      refus.annonce === net(remplir(r.regle, { noms: 'Maillot de bain', n: 2 })) &&
      refus.focus?.startsWith('Baignade'),
    `${cas} : Maillot réglé ${vu(refus)}`,
  );

  // Tongs supprimé depuis sa fiche : le bandeau passe en haut, dans le refus, et se touche.
  await ouvrirLigne(page, 'Tongs');
  juge.exige(await supprimerModele(page), `${cas} : la fiche de Tongs reste`);
  refus = await attendreLignes(page, ['Baignade']);
  const bandeau = await lireBandeau(page);
  juge.exige(
    bandeau?.texte === remplir(a.objet, { nom: 'Tongs' }) &&
      bandeau.place === 'haut' &&
      bandeau.hote === 'fenetre' &&
      bandeau.touchable,
    `${cas} : bandeau de Tongs ${vu(bandeau)}`,
  );
  await annuler(page);
  refus = await attendreLignes(page, ['Baignade', 'Tongs']);
  juge.exige(refus?.reste === net(remplir(r.reste, { n: 2 })), `${cas} : Tongs rétabli ${vu(refus)}`);
  await ouvrirLigne(page, 'Tongs');
  await supprimerModele(page);
  await attendreLignes(page, ['Baignade']);

  // Baignade reçoit Chaud : le bandeau de Tongs passe dans sa fiche, et s'y touche ; l'enregistrement
  // le retire (la suppression de Tongs devient définitive). Plus rien ne bloque : la question chiffrée
  // prend la place de la liste.
  await ouvrirLigne(page, 'Baignade');
  const surFiche = await lireBandeau(page);
  juge.exige(
    surFiche?.hote === 'fiche' && surFiche.place === 'haut' && surFiche.touchable,
    `${cas} : bandeau sur la fiche de Baignade ${vu(surFiche)}`,
  );
  juge.exige(await ajouterEtiquette(page, 'Chaud'), `${cas} : la fiche de Baignade reste`);
  juge.exige(await attendreSansBandeau(page), `${cas} : l'enregistrement de Baignade laisse le bandeau`);
  await attendreQue(page, d => document.querySelector(`${d} .message-succes`) !== null, REFUS);
  await calme(page);
  refus = await lireRefus(page);
  juge.exige(
    refus?.role === 'alertdialog' &&
      refus.titre === net(remplir(s.etiquetteTitre, { nom: 'Plage' })) &&
      refus.libre === net(remplir(r.libre, { nom: 'Plage' })) &&
      refus.question ===
        phrase(
          s.etiquetteSuite,
          remplir(s.perteEtiquette.plusieurs, { compte: '1 objet et 1 catégorie' }),
          s.voyages,
        ) &&
      refus.decrit === 'suppression-texte' &&
      vu(refus.gras) === vu(['1 objet et 1 catégorie']) &&
      vu(refus.boutons) === vu([`${s.garder}:autre`, `${s.supprimer}:danger`]) &&
      !refus.croix &&
      refus.lignes.length === 0 &&
      refus.annonce === net(r.toutRegle) &&
      refus.focus === s.garder,
    `${cas} : plus rien ne bloque ${vu(refus)}`,
  );

  // « Supprimer » : refus et fiche fermés, bandeau en bas, Plage partie de l'écran et du stockage.
  const avant = await empreinte(page);
  const arbreAvant = await arbreStocke(page);
  await repondre(page, REFUS, s.supprimer);
  juge.exige(await attendreFermee(page, REFUS), `${cas} : le refus reste ouvert`);
  juge.exige(await attendreFermee(page, ETIQUETTE), `${cas} : la fiche de Plage reste ouverte`);
  await attendreQue(page, () => document.querySelector('.bandeau-annuler')?.dataset.place === 'bas');
  const supprime = await lireBandeau(page);
  const vue = await lire(page);
  juge.exige(
    supprime?.texte === remplir(a.etiquette, { nom: 'Plage' }) && supprime.place === 'bas',
    `${cas} : bandeau ${vu(supprime)}`,
  );
  juge.exige(
    !vue.cartes.some(c => c.puces.some(p => p.nom === 'Plage')),
    `${cas} : Plage encore à l'écran ${vu(vue.cartes.map(c => c.puces.map(p => p.nom)))}`,
  );
  const sans = await bibliothequeStockee(page);
  juge.exige(
    !sans.etiquettes.some(e => e.nom === 'Plage') &&
      vu(await etiquettesDe(page, 'Crème solaire')) === vu(['Chaud']) &&
      vu(await etiquettesDe(page, 'Baignade')) === vu(['Chaud']),
    `${cas} : stockage après suppression ${vu(sans.etiquettes.map(e => e.nom))}`,
  );

  // « Annuler » : Plage revient, éclairée ; la bibliothèque est celle d'avant, liens dans l'ordre.
  await annuler(page);
  await attendreQue(page, () => document.querySelector('#app .puce[data-recent]') !== null);
  const retablie = await lire(page);
  juge.exige(retablie.recent === 'Plage', `${cas} : Plage pas éclairée ${vu(retablie.recent)}`);
  juge.exige((await empreinte(page)) === avant, `${cas} : la bibliothèque rétablie diffère`);
  juge.exige((await arbreStocke(page)) === arbreAvant, `${cas} : ordre des étiquettes ${await arbreStocke(page)}`);
  juge.exige(
    vu(await etiquettesDe(page, 'Crème solaire')) === vu(['Plage', 'Chaud']),
    `${cas} : Crème solaire ${vu(await etiquettesDe(page, 'Crème solaire'))}`,
  );

  // Dans la Bibliothèque, Crème solaire porte de nouveau Plage, puis Chaud.
  await page.click('#app a.lien-retour');
  await calme(page);
  await versBibliotheque(page);
  await page.click('#app section.categorie:has(.categorie-nom > b:text-is("Toilette")) [data-action="accordeon"]');
  await calme(page);
  const creme = (await lireBibliotheque(page)).cartes
    .find(c => c.nom === 'Toilette')
    ?.objets.find(o => o.nom === 'Crème solaire');
  juge.exige(vu(creme?.puces) === vu(['Plage', 'Chaud']), `${cas} : Crème solaire à l'écran ${vu(creme)}`);
}

// 3. Groupes : Climat refusé ; Hébergement permis, supprimé puis rétabli.
async function essaiGroupes(page) {
  const cas = 'groupes';
  await ouvrirFicheDe(page, 'groupe', 'Climat');
  await toucherSupprimer(page);
  const climat = await attendreRefus(page);
  juge.exige(
    climat?.titre === net(remplir(r.titre, { nom: 'Climat' })) &&
      climat.explication === net(r.groupe.other) &&
      vu(climat.lignes) === vu(['Bonnet', 'Cape de pluie', 'Doudoune']) &&
      climat.reste === net(remplir(r.reste, { n: 3 })),
    `${cas} : refus de Climat ${vu(climat)}`,
  );
  await page.keyboard.press('Escape');
  await attendreFermee(page, REFUS);
  await page.click(`${ETIQUETTE} .bouton-fermer`);
  await attendreFermee(page, ETIQUETTE);

  const avant = await empreinte(page);
  await ouvrirFicheDe(page, 'groupe', 'Hébergement');
  await toucherSupprimer(page);
  const question = await attendreQuestion(page);
  const siennes = remplir(s.groupeEtiquettes.other, { etiquettes: 'Hôtel, Tente et Chez l’habitant' });
  const perte = remplir(s.perteGroupe.categorie, { compte: compte('categories', 1) });
  juge.exige(
    (await lireRefus(page)) === null &&
      question.titre === net(remplir(s.groupeTitre, { nom: 'Hébergement' })) &&
      question.texte === phrase(siennes, perte, s.voyages) &&
      question.texte.includes('1 catégorie perdra une de ses étiquettes ; elle garde les autres.') &&
      vu(question.gras) === vu([compte('categories', 1)]),
    `${cas} : question d'Hébergement ${vu(question)}`,
  );
  await repondre(page, QUESTION, s.supprimer);
  juge.exige(await attendreFermee(page, ETIQUETTE), `${cas} : la fiche d'Hébergement reste`);
  await attendreQue(page, () => document.querySelector('.bandeau-annuler')?.dataset.place === 'bas');
  const bandeau = await lireBandeau(page);
  juge.exige(
    bandeau?.texte === remplir(a.groupe.other, { nom: 'Hébergement', n: 3 }) &&
      vu(await etiquettesDe(page, 'Camping')) === vu(['Camping']) &&
      !(await lire(page)).cartes.some(c => c.nom === 'Hébergement'),
    `${cas} : Hébergement supprimé ${vu(bandeau)}`,
  );
  await annuler(page);
  await attendreQue(page, () => document.querySelector('#app .groupe[data-recent]') !== null);
  juge.exige((await empreinte(page)) === avant, `${cas} : Hébergement rétabli diffère`);
}

try {
  const ouvert = await ouvrirEtiquettes(navigateur, serveur.url, FORMAT, { donnees: donnees() });
  const { page } = ouvert;
  const voyages = await voyagesStockes(page);
  await essaiChaud(page);
  await essaiPlage(page);
  await page.click('#app a.lien-retour');
  await calme(page);
  await page.click('#app a.reglage[href="#/etiquettes"]');
  await attendreQue(page, () => document.querySelector('#app')?.dataset.ecran === 'etiquettes');
  await calme(page);
  await essaiGroupes(page);
  juge.exige((await voyagesStockes(page)) === voyages, 'les voyages créés avant ont changé');
  juge.exige((await page.locator(MODELE).count()) === 0, 'une fiche de modèle est restée');
  await fermerEssai(juge, 'parcours', ouvert);
} finally {
  await navigateur.close();
  await serveur.fermer();
}
juge.conclure(
  'Suppressions d’étiquettes et de groupes',
  'question chiffrée, refus réglé élément par élément, bandeau, annulation à l’identique, groupes',
);
