// Phase 7 (maquette validée, docs/maquettes/suppressions/bandeau.css et captures.mjs) : l'aspect et la
// place du bandeau « Annuler » (src/ecrans/annulation.js), à tous les formats, en clair et en sombre.
// - 56 px de haut au moins, 440 px de large au plus, « Annuler » de 44 px au moins, aucun texte sous
//   13 px, rien ne défile de côté ;
// - il ne couvre rien de touchable : ni le bouton flottant (accueil, Bibliothèque), ni les boutons
//   collés en bas de « Nouveau voyage » au téléphone, ni les boutons de la fenêtre qui l'accueille
//   (fiche, « Nouveau voyage » sur la tablette) ; la page ou le panneau défilé jusqu'en bas, la
//   dernière ligne reste au-dessus de lui (place gardée, Review Focus 5) ;
// - captures claires et sombres du bandeau sur la Bibliothèque, par-dessus une fiche, sur l'accueil,
//   dans un voyage et sur « Nouveau voyage », dans captures-travail/.
// Le bandeau vit 10 s : chaque parcours en prend un neuf, et vérifie qu'il est toujours là.
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { chromium } from 'playwright';
import { attendreQue, calme } from './outils/attente.mjs';
import { couvert, lireBandeau, ouvrirAvecHorloge, supprimerObjet, versMesVoyages } from './outils/annulation.mjs';
import { TOUS_FORMATS, fermerEssai, versBibliotheque, vu } from './outils/bibliotheque.mjs';
import { attendreFermee, ouvrirFicheObjet, toucher } from './outils/fiches.mjs';
import { CAPTURES, NOMS_THEME, attendreEcran, creerJuge, verifierCommandes } from './outils/page.mjs';
import { demarrerServeur } from './outils/serveur.mjs';

const juge = creerJuge();
const serveur = await demarrerServeur();
const navigateur = await chromium.launch();

// L'aspect du bandeau, sa place, et ce qu'il couvre ; puis la capture de l'écran. hote : la page, ou
// la fenêtre qui doit l'accueillir (en haut) ; seulement : ce qui ne doit pas être couvert, si ce
// n'est pas tout l'écran (voir couvert()).
async function juger(page, cas, ecran, { hote = 'page', seulement = null, nomCapture } = {}) {
  const b = await lireBandeau(page);
  if (!b) return juge.exige(false, `${cas} : pas de bandeau sur ${ecran}`);
  juge.exige(
    b.hote === hote && b.place === (hote === 'page' ? 'bas' : 'haut'),
    `${cas} : sur ${ecran}, bandeau ${vu({ hote: b.hote, place: b.place })}, attendu dans ${hote}`,
  );
  juge.exige(
    b.role === 'status' &&
      b.cadre.height >= 55.5 &&
      b.cadre.width <= 440.5 &&
      b.bouton.width >= 43.5 &&
      b.bouton.height >= 43.5 &&
      b.petitTexte >= 13 &&
      b.cadre.top >= 0 &&
      b.cadre.bottom <= b.hauteurEcran &&
      b.touchable,
    `${cas} : aspect sur ${ecran} ${vu(b)}`,
  );
  await verifierCommandes(page, juge, `${cas}, ${ecran}`);
  const dessous = await couvert(page, seulement);
  juge.exige(dessous.length === 0, `${cas} : sur ${ecran}, le bandeau couvre ${dessous.join(', ')}`);
  await calme(page);
  await page.screenshot({ path: join(CAPTURES, nomCapture) });
}

async function essai(format, theme) {
  const cas = `${format}, ${NOMS_THEME[theme]}`;
  const capture = ecran => `annulation-${ecran}-${format}-${NOMS_THEME[theme]}.png`;
  const ouvert = await ouvrirAvecHorloge(navigateur, serveur.url, format, { theme });
  const { page } = ouvert;

  // La Bibliothèque, puis une fiche ouverte par-dessus.
  await supprimerObjet(page, 'Toilette', 'Crème solaire');
  await juger(page, cas, 'la Bibliothèque', { nomCapture: capture('bibliotheque') });
  await page.evaluate(() => window.scrollTo(0, 0));
  await ouvrirFicheObjet(page, 'Toilette', 'Brosse à dents');
  await juger(page, cas, 'une fiche', { hote: 'fiche', nomCapture: capture('fiche') });
  await toucher(page, '.bouton-fermer');
  await attendreFermee(page);

  // L'accueil, puis un voyage.
  await supprimerObjet(page, 'Toilette', 'Dentifrice');
  await versMesVoyages(page);
  await juger(page, cas, 'Mes voyages', { nomCapture: capture('accueil') });
  await page.click('#app a.carte-voyage[href="#/voyage/v1"]');
  await attendreEcran(page, 'voyage');
  await juger(page, cas, 'un voyage', { nomCapture: capture('voyage') });

  // « Nouveau voyage » : au téléphone, les boutons collés en bas ; ailleurs, la fenêtre.
  await page.click('#app a[href="#/voyages"]');
  await attendreEcran(page, 'voyages');
  await versBibliotheque(page);
  await supprimerObjet(page, 'Toilette', 'Brosse à dents');
  await page.click('#app [data-action="menu"]');
  await attendreQue(page, () => document.querySelector('dialog.tiroir[open]') !== null);
  await calme(page);
  await page.click('dialog.tiroir a.tiroir-lien[href="#/nouveau-voyage"]');
  await attendreEcran(page, 'nouveau-voyage');
  const enFenetre = await page.evaluate(() => document.querySelector('dialog:modal .assistant-pied') !== null);
  // Sur la tablette et l'ordinateur, « Nouveau voyage » est une fenêtre : le bandeau doit y être.
  if (!format.startsWith('telephone'))
    juge.exige(enFenetre, `${cas} : « Nouveau voyage » ne s'est pas ouvert en fenêtre`);
  await juger(page, cas, '« Nouveau voyage »', {
    hote: enFenetre ? 'fenetre' : 'page',
    seulement: enFenetre ? null : '.assistant-pied a, .assistant-pied button',
    nomCapture: capture('nouveau-voyage'),
  });
  await fermerEssai(juge, cas, ouvert);
}

try {
  await mkdir(CAPTURES, { recursive: true });
  for (const format of Object.keys(TOUS_FORMATS))
    for (const theme of Object.keys(NOMS_THEME)) await essai(format, theme);
} finally {
  await navigateur.close();
  await serveur.fermer();
}
juge.conclure(
  'Place du bandeau « Annuler »',
  'aspect, cibles, rien de couvert sur la Bibliothèque, une fiche, l’accueil, un voyage et « Nouveau voyage », tous formats, clair et sombre',
);
