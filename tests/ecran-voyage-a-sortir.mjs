// Les pièces à sortir du sac dans la liste du voyage (phase 10 ; maquette validée le 2026-10-29,
// docs/maquettes/plans-changent/, état « a-sortir ») : un « ! » à la place de la coche et la pastille
// « N à sortir du sac » ; un objet retiré barré ; la catégorie marquée « ! », jamais « Bouclé ! », et pas
// de « Sac bouclé ! » tant qu'une pièce attend sa sortie. Témoin : sans excédent, la catégorie est bouclée.
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { chromium } from 'playwright';
import { ouvrirVoyage, remplir, fr, vu } from './outils/ajuster.mjs';
import { fermerEssai } from './outils/bibliotheque.mjs';
import { attendreQue, calme } from './outils/attente.mjs';
import { CAPTURES, NOMS_THEME, contraste, creerJuge } from './outils/page.mjs';
import { demarrerServeur } from './outils/serveur.mjs';
import { avecPieces } from './outils/voyage-essai.mjs';

const juge = creerJuge();
const serveur = await demarrerServeur();
const navigateur = await chromium.launch();

// Tout est emballé, sauf : T-shirts 8 prévus et 9 dans le sac ; Chaussures de marche retirées (0 prévu,
// 1 dans le sac). Vêtements n'a que ces pièces-là en attente.
const emballe = avecPieces(o => o.quantite);
const AVEC_EXCEDENT = {
  ...emballe,
  objetsDuVoyage: [
    ...emballe.objetsDuVoyage.map(o => (o.id === 'o-tsh' ? { ...o, dansLeSac: 9 } : o)),
    { ...emballe.objetsDuVoyage[0], id: 'o-chm', nom: 'Chaussures de marche', quantite: 0, dansLeSac: 1 },
  ],
};

const lireListe = page =>
  page.evaluate(() => {
    const texte = el => el?.textContent.replace(/\s+/g, ' ').trim() ?? null;
    const ligne = id => {
      const li = document.querySelector(`#app .objet[data-id="${id}"]`);
      if (!li) return null;
      const nom = li.querySelector('.objet-nom');
      return {
        etat: li.dataset.etat,
        signe: texte(li.querySelector('.case-boite')),
        caseDit: li.querySelector('.case').getAttribute('aria-label'),
        pastille: texte(li.querySelector('.pastille-sortir')),
        sous: texte(li.querySelector('.objet-sous')),
        quantite: texte(li.querySelector('.objet-quantite')),
        barre: getComputedStyle(nom).textDecorationLine,
        couleurs: [
          getComputedStyle(li.querySelector('.case-boite')).color,
          getComputedStyle(li.querySelector('.case-boite')).backgroundColor,
        ],
      };
    };
    const vet = document.querySelector('#app [data-id="c-vet"]');
    return {
      tshirts: ligne('o-tsh'),
      chaussures: ligne('o-chm'),
      marqueVet: [...document.querySelectorAll('#app [data-id="c-vet"] .marque-sortir')].length,
      tamponVet: Boolean(vet?.querySelector('.tampon, .gf-tuile-boucle')),
      sacBoucle: Boolean(document.querySelector('#app .progression[data-boucle]')),
      tuile: document.querySelector('#app .gf-tuile[data-id="c-vet"] .marque-sortir') !== null,
    };
  });

const attendreListe = page => attendreQue(page, () => document.querySelector('#app .objet[data-id]') !== null);

try {
  await mkdir(CAPTURES, { recursive: true });
  const pieceDit = remplir(fr.voyage.aSortir.one, { n: 1 });
  for (const [format, theme] of [
    ['telephone', 'light'],
    ['telephone', 'dark'],
    ['tablette-paysage', 'light'],
    ['tablette-paysage', 'dark'],
  ]) {
    const cas = `${format} ${NOMS_THEME[theme]}`;
    const ouvert = await ouvrirVoyage(navigateur, serveur.url, { format, theme, donnees: AVEC_EXCEDENT });
    const { page } = ouvert;
    await attendreListe(page);
    if (await page.$('.gf-menu')) await page.click('.gf-menu [data-action="choisir"][data-id="c-vet"]');
    await calme(page);
    const vue = await lireListe(page);
    const { tshirts, chaussures } = vue;
    juge.exige(
      tshirts?.etat === 'a-sortir' && tshirts.signe === '!' && tshirts.pastille === pieceDit,
      `${cas} : T-shirts sans « ! » ni pastille ${vu(tshirts)}`,
    );
    juge.exige(
      /sortir/i.test(tshirts?.caseDit ?? ''),
      `${cas} : la case ne dit pas qu'elle sort une pièce ${vu(tshirts)}`,
    );
    juge.exige(
      chaussures?.signe === '!' &&
        chaussures.barre.includes('line-through') &&
        chaussures.sous.includes(fr.voyage.retire) &&
        chaussures.quantite === '',
      `${cas} : objet retiré mal dessiné ${vu(chaussures)}`,
    );
    juge.exige(contraste(...tshirts.couleurs) >= 4.5, `${cas} : « ! » peu lisible ${vu(tshirts.couleurs)}`);
    juge.exige(vue.marqueVet > 0 && !vue.tamponVet, `${cas} : catégorie sans « ! » ou bouclée ${vu(vue)}`);
    juge.exige(!vue.sacBoucle, `${cas} : « Sac bouclé ! » malgré des pièces à sortir`);
    if (format === 'tablette-paysage') juge.exige(vue.tuile, `${cas} : la tuile de Vêtements n'a pas son « ! »`);
    // Avec le filtre, les deux restent visibles : ils ne sont pas emballés.
    await page.click('#app [data-action="filtre"]');
    await calme(page);
    const filtre = await lireListe(page);
    juge.exige(filtre.tshirts && filtre.chaussures, `${cas} : le filtre masque une pièce à sortir ${vu(filtre)}`);
    await page.click('#app [data-action="filtre"]');
    await calme(page);
    await page.screenshot({ path: join(CAPTURES, `voyage-a-sortir-${format}-${NOMS_THEME[theme]}.png`) });
    await fermerEssai(juge, cas, ouvert);
  }

  // Témoin : sans pièce de trop, Vêtements est bouclée et le sac aussi.
  const ouvert = await ouvrirVoyage(navigateur, serveur.url, { donnees: emballe });
  await attendreListe(ouvert.page);
  await calme(ouvert.page);
  const temoin = await lireListe(ouvert.page);
  juge.exige(temoin.tamponVet && temoin.sacBoucle && temoin.marqueVet === 0, `témoin : pas bouclé ${vu(temoin)}`);
  await fermerEssai(juge, 'témoin', ouvert);
} finally {
  await navigateur.close();
  await serveur.fermer();
}
juge.conclure('Pièces à sortir', '« ! », pastille, catégorie et sac non bouclés');
