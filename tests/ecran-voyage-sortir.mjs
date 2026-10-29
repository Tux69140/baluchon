// Phase 10 (docs/superpowers/specs/2026-10-29-phase-10-plans-changent-design.md ; maquette validée
// docs/maquettes/plans-changent/) : sortir du sac les pièces de trop, tout de suite ou plus tard.
// - un appui sur la case « ! » sort une pièce ; deux appuis rapides sur 2 pièces de trop en sortent 2,
//   jamais sous la quantité prévue (Review Focus 1) ;
// - la dernière pièce d'un objet retiré sortie, il quitte la liste avec « Annuler », qui le rend barré ;
// - la fiche d'un objet à sortir : le rappel, « C'est fait » ; d'un objet retiré : « Le garder dans le voyage » ;
// - la baisse à la main sous le sac : « Garder N », « Plus tard », « C'est fait » ;
// - « Retirer du voyage » d'un objet emballé : « Plus tard » le laisse barré, « C'est fait » le retire.
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { chromium } from 'playwright';
import { attendreQue, calme } from './outils/attente.mjs';
import {
  BANDEAU,
  FICHE,
  attendreQuestion,
  fr,
  lireQuestion,
  objetStocke,
  ouvrirFiche,
  ouvrirVoyage,
  remplir,
  repondre,
  texteBandeau,
  toucherFiche,
  vu,
} from './outils/ajuster.mjs';
import { fermerEssai } from './outils/bibliotheque.mjs';
import { CAPTURES, NOMS_THEME, creerJuge } from './outils/page.mjs';
import { demarrerServeur } from './outils/serveur.mjs';
import { DONNEES } from './outils/voyage-essai.mjs';

const s = fr.sortie;
const juge = creerJuge();
const serveur = await demarrerServeur();
const navigateur = await chromium.launch();
const capture = (page, nom, format, theme) =>
  page.screenshot({ path: join(CAPTURES, `${nom}-${format}-${NOMS_THEME[theme]}.png`) });

const retire = (id, nom, categorieId, dansLeSac) => ({
  ...DONNEES.objetsDuVoyage[0],
  id,
  nom,
  categorieId,
  modeleId: `m-${id}`,
  regle: 'fixe',
  valeur: 1,
  parPersonne: false,
  quantite: 0,
  dansLeSac,
});
const ESSAI = {
  ...DONNEES,
  objetsDuVoyage: [
    ...DONNEES.objetsDuVoyage.map(o => {
      if (o.id === 'o-tsh') return { ...o, dansLeSac: 10 };
      if (o.id === 'o-pul') return { ...o, dansLeSac: 3 };
      if (o.id === 'o-pan') return { ...o, dansLeSac: 4 };
      return o;
    }),
    retire('o-chm', 'Chaussures de marche', 'c-vet', 1),
    retire('o-bon', 'Bonnet', 'c-vet', 1),
  ],
};

const ligneDe = (page, id) =>
  page.evaluate(id => {
    const li = document.querySelector(`#app .objet[data-id="${CSS.escape(id)}"]`);
    return li ? { etat: li.dataset.etat, retire: li.hasAttribute('data-retire') } : null;
  }, id);
const sac = async (page, id) => {
  const o = await objetStocke(page, id);
  return o && { quantite: o.quantite, dansLeSac: o.dansLeSac, manuelle: o.quantiteManuelle };
};
const bandeauVenu = page =>
  attendreQue(page, sel => document.querySelector(sel)?.matches(':popover-open') ?? false, BANDEAU);
const questionOuverte = page =>
  page.evaluate(() => document.querySelector('dialog[role="alertdialog"][open]') !== null);

try {
  await mkdir(CAPTURES, { recursive: true });
  const ouvert = await ouvrirVoyage(navigateur, serveur.url, { donnees: ESSAI });
  const { page } = ouvert;

  // Deux appuis rapides sur T-shirts (8 prévus, 10 dans le sac) : deux pièces sorties, aucune question.
  let cas = 'case « ! », deux appuis';
  await page.dblclick('#app .objet[data-id="o-tsh"] .case');
  await attendreQue(page, () => document.querySelector('#app .objet[data-id="o-tsh"]')?.dataset.etat === 'plein');
  await calme(page);
  const tsh = await sac(page, 'o-tsh');
  juge.exige(
    tsh.dansLeSac === 8 && !(await questionOuverte(page)),
    `${cas} : ${vu(tsh)}, question ${await questionOuverte(page)}`,
  );

  // La dernière pièce de Bonnet (retiré) sortie : il part, « Annuler » le rend barré.
  cas = 'dernière pièce d’un retiré';
  await page.click('#app .objet[data-id="o-bon"] .case');
  await bandeauVenu(page);
  const bandeau = await texteBandeau(page);
  juge.exige(
    (await ligneDe(page, 'o-bon')) === null && bandeau === remplir(fr.ajustement.retrait.bandeau, { nom: 'Bonnet' }),
    `${cas} : ligne ${vu(await ligneDe(page, 'o-bon'))}, bandeau ${vu(bandeau)}`,
  );
  await page.click(`${BANDEAU} button`);
  await attendreQue(page, () => document.querySelector('#app .objet[data-id="o-bon"]') !== null);
  const rendu = await ligneDe(page, 'o-bon');
  juge.exige(
    rendu?.retire && vu(await sac(page, 'o-bon')) === vu({ quantite: 0, dansLeSac: 1, manuelle: false }),
    `${cas} : « Annuler » ${vu(rendu)} ${vu(await sac(page, 'o-bon'))}`,
  );
  await calme(page);

  // La fiche de Pull (2 prévus, 3 dans le sac) : le rappel, puis « C'est fait ».
  cas = 'fiche à sortir';
  await ouvrirFiche(page, 'o-pul');
  const rappel = await page.evaluate(sel => {
    const r = document.querySelector(`${sel} .sortir-rappel`);
    return (
      r && [
        r.querySelector('.marque-sortir').textContent,
        r.querySelector('b').textContent,
        r.querySelector('p span').textContent,
      ]
    );
  }, FICHE);
  juge.exige(
    vu(rappel) === vu(['!', remplir(fr.voyage.aSortir.one, { n: 1 }), remplir(s.rappel.one, { prevus: 2 })]),
    `${cas} : rappel ${vu(rappel)}`,
  );
  await capture(page, 'voyage-fiche-a-sortir', 'telephone', 'light');
  await toucherFiche(page, 'fait');
  await attendreQue(page, () => document.querySelector('#app .objet[data-id="o-pul"]')?.dataset.etat === 'plein');
  juge.exige((await sac(page, 'o-pul')).dansLeSac === 2, `${cas} : ${vu(await sac(page, 'o-pul'))}`);
  await page.keyboard.press('Escape');
  await calme(page);

  // La fiche de Chaussures de marche (retiré) : « Le garder dans le voyage ».
  cas = 'fiche d’un retiré';
  await ouvrirFiche(page, 'o-chm');
  const garder = await page.textContent(`${FICHE} [data-fiche="garder"]`);
  juge.exige(garder?.trim() === s.garder, `${cas} : bouton ${vu(garder)}`);
  await capture(page, 'voyage-fiche-retire', 'telephone', 'light');
  await toucherFiche(page, 'garder');
  await attendreQue(page, () => !document.querySelector('#app .objet[data-id="o-chm"]')?.hasAttribute('data-retire'));
  juge.exige(
    vu(await sac(page, 'o-chm')) === vu({ quantite: 1, dansLeSac: 1, manuelle: false }),
    `${cas} : ${vu(await sac(page, 'o-chm'))}`,
  );
  await page.keyboard.press('Escape');
  await calme(page);

  // Baisse à la main : Pantalons 4 → 3, 4 dans le sac. « Plus tard » : le « ! » ; puis Chaussettes 8 → 7 :
  // « Garder 8 » ne change rien, « C'est fait » sort la pièce.
  cas = 'baisse à la main';
  const b = fr.ajustement.baisse;
  await ouvrirFiche(page, 'o-pan');
  await toucherFiche(page, 'quantite-moins');
  await page.keyboard.press('Escape');
  await attendreQuestion(page);
  const question = await lireQuestion(page);
  juge.exige(
    vu(question?.boutons) === vu([remplir(b.garder, { n: 4 }), s.plusTard, s.fait]),
    `${cas} : boutons ${vu(question?.boutons)}`,
  );
  await capture(page, 'voyage-baisse-sortir', 'telephone', 'light');
  await repondre(page, s.plusTard);
  await attendreQue(page, () => document.querySelector('#app .objet[data-id="o-pan"]')?.dataset.etat === 'a-sortir');
  juge.exige(
    vu(await sac(page, 'o-pan')) === vu({ quantite: 3, dansLeSac: 4, manuelle: true }),
    `${cas} : « Plus tard » ${vu(await sac(page, 'o-pan'))}`,
  );
  await calme(page);
  await ouvrirFiche(page, 'o-cha');
  await toucherFiche(page, 'quantite-moins');
  await page.keyboard.press('Escape');
  await attendreQuestion(page);
  await repondre(page, remplir(b.garder, { n: 8 }));
  await calme(page);
  juge.exige((await sac(page, 'o-cha')).quantite === 8, `${cas} : « Garder » ${vu(await sac(page, 'o-cha'))}`);
  if (await page.$(`${FICHE}[open]`)) await page.keyboard.press('Escape');
  await calme(page);
  await ouvrirFiche(page, 'o-cha');
  await toucherFiche(page, 'quantite-moins');
  await page.keyboard.press('Escape');
  await attendreQuestion(page);
  await repondre(page, s.fait);
  await attendreQue(page, () => document.querySelector('#app .objet[data-id="o-cha"]')?.dataset.etat === 'plein');
  juge.exige(
    vu(await sac(page, 'o-cha')) === vu({ quantite: 7, dansLeSac: 7, manuelle: true }),
    `${cas} : « C'est fait » ${vu(await sac(page, 'o-cha'))}`,
  );
  await calme(page);

  // « Retirer du voyage » d'un objet emballé : Gourde (2 / 2) « Plus tard », Brosse à dents « C'est fait ».
  cas = 'retirer un objet emballé';
  await ouvrirFiche(page, 'o-gou');
  await toucherFiche(page, 'retirer');
  await attendreQuestion(page);
  const retrait = await lireQuestion(page);
  juge.exige(
    vu(retrait?.boutons) === vu([fr.ajustement.retrait.garder, s.plusTard, s.fait]),
    `${cas} : boutons ${vu(retrait?.boutons)}`,
  );
  await capture(page, 'voyage-retrait-sortir', 'telephone', 'light');
  await repondre(page, s.plusTard);
  await attendreQue(page, () => document.querySelector('#app .objet[data-id="o-gou"]')?.hasAttribute('data-retire'));
  juge.exige(
    vu(await sac(page, 'o-gou')) === vu({ quantite: 0, dansLeSac: 2, manuelle: false }),
    `${cas} : « Plus tard » ${vu(await sac(page, 'o-gou'))}`,
  );
  if (await page.$(`${FICHE}[open]`)) await page.keyboard.press('Escape');
  await calme(page);
  await ouvrirFiche(page, 'o-bro');
  await toucherFiche(page, 'retirer');
  await attendreQuestion(page);
  await repondre(page, s.fait);
  await bandeauVenu(page);
  juge.exige(
    (await ligneDe(page, 'o-bro')) === null && (await objetStocke(page, 'o-bro')) === null,
    `${cas} : « C'est fait » ${vu(await ligneDe(page, 'o-bro'))}`,
  );
  await fermerEssai(juge, 'sortir', ouvert);

  // Les captures sombres des deux fiches.
  const sombre = await ouvrirVoyage(navigateur, serveur.url, { donnees: ESSAI, theme: 'dark' });
  await ouvrirFiche(sombre.page, 'o-pul');
  await capture(sombre.page, 'voyage-fiche-a-sortir', 'telephone', 'dark');
  await sombre.page.keyboard.press('Escape');
  await calme(sombre.page);
  await ouvrirFiche(sombre.page, 'o-chm');
  await capture(sombre.page, 'voyage-fiche-retire', 'telephone', 'dark');
  await fermerEssai(juge, 'captures sombres', sombre);
} finally {
  await navigateur.close();
  await serveur.fermer();
}
juge.conclure('Sortir du sac', 'case « ! », fiches, baisse et retrait alignés');
