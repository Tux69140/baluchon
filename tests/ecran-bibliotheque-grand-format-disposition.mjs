// La Bibliothèque sur tablette et ordinateur, quand la disposition change dans la même page (fenêtre
// redimensionnée sur Debian, tablette tournée ; Review Focus 1 de
// docs/superpowers/specs/2026-10-27-grand-ecran-design.md) :
// - ordinateur → tablette en portrait → téléphone → ordinateur : la catégorie choisie reste, le focus
//   sur sa carte, sa tuile ou son en-tête d'accordéon ; un seul dessin à chaque fois, même quand les
//   deux seuils sont franchis d'un coup ;
// - le focus sur un objet dont la ligne n'est plus dessinée revient à sa catégorie, comme sur l'écran
//   d'un voyage ;
// - « Ranger les catégories » est gardé, le focus sur la même commande.
// Le reste de la Bibliothèque en grand format : ecran-bibliotheque-grand-format.mjs.
import { chromium } from 'playwright';
import { calme } from './outils/attente.mjs';
import { demarrerServeur } from './outils/serveur.mjs';
import {
  DEPART,
  changerDeFormat,
  commande,
  fermerEssai,
  idDe,
  lire,
  ouvrirBibliotheque,
  vu,
} from './outils/bibliotheque.mjs';
import { creerJuge } from './outils/page.mjs';
import { GRANDS, focusActuel, toucher } from './outils/voyage-grand-format.mjs';

const juge = creerJuge();
const serveur = await demarrerServeur();
const navigateur = await chromium.launch();

// Une commande attendue qui ne vient pas fait buter l'essai vite, sans attendre 30 s.
async function ouvrirSur(format) {
  const ouvert = await ouvrirBibliotheque(navigateur, serveur.url, format, { appareil: GRANDS[format] });
  ouvert.page.setDefaultTimeout(5000);
  return ouvert;
}
const fermer = (cas, ouvert) => fermerEssai(juge, cas, ouvert);
// Une entrée du menu (carte ou tuile) par le nom de sa catégorie.
const entree = nom => `#app .gf-menu [data-action="choisir"]:has(b:text-is(${JSON.stringify(nom)}))`;

// Une commande visible a le focus, jamais la page entière (Review Focus 1).
const commandeVisible = focus => focus !== 'body' && !focus.endsWith('(invisible)');

// Ordinateur → tablette en portrait → téléphone → ordinateur, dans la même page : Alimentation reste
// choisie, le focus sur une commande visible (Review Focus 1).
async function essaiChangementDeDisposition() {
  const cas = 'changement de disposition';
  const ouvert = await ouvrirSur('ordinateur');
  const { page } = ouvert;
  await toucher(juge, page, entree('Alimentation'));
  await calme(page);
  // Les dessins complets de la page (main reçoit tout son contenu d'un coup) : un seul à chaque
  // changement, même quand les deux seuils sont franchis à la fois (du téléphone à l'ordinateur).
  await page.evaluate(() => {
    window.dessins = 0;
    new MutationObserver(r => (window.dessins += r.filter(m => m.addedNodes.length > 1).length)).observe(
      document.querySelector('#app main'),
      { childList: true },
    );
  });
  for (const nom of ['tablette-portrait', 'telephone', 'ordinateur']) {
    await page.evaluate(() => (window.dessins = 0));
    await changerDeFormat(page, nom);
    const dessins = await page.evaluate(() => window.dessins);
    const v = await lire(page);
    const focus = await focusActuel(page);
    // Au téléphone, l'accordéon d'aujourd'hui ne déplie rien : la catégorie gardée est celle dont
    // l'en-tête a le focus ; on la lit au lieu de la supposer.
    const gardee =
      nom === 'telephone'
        ? await page.evaluate(() => {
            const tete = document.activeElement?.closest('[data-action="accordeon"]');
            return { id: tete?.dataset.id, nom: tete?.querySelector('.categorie-nom b')?.textContent };
          })
        : null;
    const choisie = gardee ? gardee.nom : v.choisie;
    juge.exige(
      choisie === 'Alimentation' &&
        (gardee ? gardee.id && focus === `accordeon:${gardee.id}` : focus.startsWith('choisir:')) &&
        commandeVisible(focus) &&
        dessins === 1,
      `${cas}, vers ${nom} : ${vu({ disposition: v.disposition, choisie: v.choisie, focus, dessins })}`,
    );
  }
  await fermer(cas, ouvert);
}

// Le focus sur un objet, d'une disposition à l'autre : quand sa ligne n'est plus dessinée, il revient
// à sa catégorie, jamais à la page (Review Focus 1, comme l'écran d'un voyage). Un objet de Vêtements
// (choisie) : ordinateur → téléphone → ordinateur ; au téléphone, un objet de Camping dépliée, non
// choisie : → tablette en portrait.
async function essaiFocusSurUnObjet() {
  const cas = 'focus sur un objet';
  const ouvert = await ouvrirSur('ordinateur');
  const { page } = ouvert;
  const objet = id => `#app :is(.gf-liste, [data-categorie="${id}"]) [data-action="modifier-objet"]`;
  const vetements = await page.evaluate(() => document.querySelector('.gf-menu [aria-current="true"]').dataset.id);
  await page.focus(objet(vetements));
  const vus = [];
  for (const nom of ['telephone', 'ordinateur']) {
    await changerDeFormat(page, nom);
    vus.push(await focusActuel(page));
  }
  juge.exige(
    vu(vus) === vu([`accordeon:${vetements}`, `choisir:${vetements}`]),
    `${cas}, Vêtements, vers le téléphone puis l'ordinateur : focus ${vu(vus)}`,
  );
  await changerDeFormat(page, 'telephone');
  const camping = idDe(await lire(page), 'Camping');
  await page.click(commande('accordeon', camping));
  await calme(page);
  await page.focus(objet(camping));
  await changerDeFormat(page, 'tablette-portrait');
  const focus = await focusActuel(page);
  juge.exige(
    focus === `choisir:${camping}` && commandeVisible(focus),
    `${cas}, Camping dépliée, vers la tablette : focus ${focus}`,
  );
  await fermer(cas, ouvert);
}

// « Ranger les catégories » d'une disposition à l'autre : la liste ▲ ▼ reste à la place du menu (ou
// des cartes), le focus sur la même commande.
async function essaiRangerEnChangeant() {
  const cas = 'rangement, changement de disposition';
  const ouvert = await ouvrirSur('ordinateur');
  const { page } = ouvert;
  await toucher(juge, page, '#app [data-action="ranger"]');
  await calme(page);
  const depart = await focusActuel(page);
  for (const nom of ['tablette-portrait', 'telephone', 'ordinateur']) {
    await changerDeFormat(page, nom);
    const v = await lire(page);
    const focus = await focusActuel(page);
    juge.exige(
      vu(v.rangement.map(l => l.nom)) === vu(DEPART) &&
        v.choix.length === 0 &&
        v.cartes.length === 0 &&
        focus === depart &&
        commandeVisible(focus),
      `${cas}, vers ${nom} : ${vu({ rangement: v.rangement.length, choix: v.choix, focus, depart })}`,
    );
  }
  await fermer(cas, ouvert);
}

try {
  await essaiChangementDeDisposition();
  await essaiFocusSurUnObjet();
  await essaiRangerEnChangeant();
} finally {
  await navigateur.close();
  await serveur.fermer();
}
juge.conclure(
  'Bibliothèque, changement de disposition',
  'catégorie choisie, focus sur une catégorie ou un objet, rangement gardé',
);
