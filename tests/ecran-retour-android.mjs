// La touche retour d'Android passe par la page (essai sur la tablette du 2026-10-25, Ruling R8). Laissée
// à la WebView, elle sautait les étapes que la garde de l'assistant repose sans geste de la personne,
// et fermait l'appli au 2e appui. L'appli la prend donc en charge (src/stockage, ecouterRetourSysteme) :
// elle recule d'une étape tant qu'il en reste une, et ne ferme l'appli qu'à l'accueil, rien d'ouvert.
// Ici, la variante navigateur du stockage joue la touche (window.toucheRetour) et compte les fermetures
// demandées (window.fermeturesDemandees) au lieu de fermer.
// - Assistant : Aperçu → Hébergement → Climat → Activités → Informations, puis « Abandonner ce nouveau
//   voyage ? » ; la touche ne ferme que la question, la touche suivante la repose ; « Abandonner » mène
//   à Mes voyages, d'où la touche demande la fermeture (témoin : aucune fermeture demandée avant).
// - Voyage ouvert depuis Mes voyages, fiche d'un objet ouverte : la touche ferme la fiche, puis ramène à
//   Mes voyages, puis demande la fermeture.
// Téléphone et tablette en paysage (fenêtre de l'assistant).
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { chromium } from 'playwright';
import { attendreQue, calme } from './outils/attente.mjs';
import { attendreQuestion, etapeAffichee, ligneObjet, question, repondre } from './outils/assistant.mjs';
import { demarrerServeur } from './outils/serveur.mjs';
import { FORMATS, RACINE, attendreEcran, creerJuge, ouvrir } from './outils/page.mjs';
import { DONNEES as DONNEES_VOYAGE } from './outils/voyage-essai.mjs';

const fr = JSON.parse(await readFile(join(RACINE, 'src/i18n/fr.json'), 'utf8'));
const { abandon } = fr.nouveauVoyage;
const MAINTENANT = new Date('2026-10-06T10:00:00');
const DONNEES_ASSISTANT = {
  voyages: [
    {
      id: 'v1',
      nom: 'Vercors',
      destination: '',
      depart: '2026-10-10',
      retour: '2026-10-13',
      voyageurs: 2,
      modifieLe: 'x',
    },
  ],
};

// Un appui sur la touche retour, l'écran calmé.
async function toucheRetour(page) {
  await page.evaluate(() => window.toucheRetour());
  await calme(page);
}

// Ce que l'on voit : l'écran, l'étape de l'assistant, la question ou la fiche ouvertes, et les fermetures
// de l'appli demandées jusque-là. dansLAppli : la page n'a pas quitté l'appli.
const etat = (page, url) =>
  page.evaluate(
    u => ({
      dansLAppli: location.href.startsWith(u),
      ecran: document.querySelector('#app')?.dataset.ecran ?? null,
      etape: document.querySelector('.formulaire-corps')?.dataset.etape ?? null,
      question: document.querySelector('dialog[role="alertdialog"][open] h2')?.textContent.trim() ?? null,
      fiche: Boolean(document.querySelector('dialog.fiche[open]')),
      fermetures: window.fermeturesDemandees ?? null,
    }),
    url,
  );

const vu = e => JSON.stringify(e);
const juge = creerJuge();
const serveur = await demarrerServeur();
const navigateur = await chromium.launch();

// L'appli ouverte sur Mes voyages, la touche retour simulée. Rend null (faute notée) si la page ne
// l'offre pas : le reste du cas n'aurait plus de sens.
async function ouvrirAvecTouche(cas, format, donnees, maintenant) {
  const ouvert = await ouvrir(navigateur, serveur.url, {
    taille: FORMATS[format],
    theme: 'light',
    maintenant,
    donnees: { ...donnees, toucheRetour: true },
    adresse: '#/voyages',
  });
  await attendreEcran(ouvert.page, 'voyages');
  const offerte = await ouvert.page.evaluate(() => typeof window.toucheRetour === 'function');
  juge.exige(offerte, `${cas} : la page n’offre pas la touche retour`);
  if (offerte) return ouvert;
  await ouvert.contexte.close();
  return null;
}

// L'assistant, de l'aperçu jusqu'à l'abandon, puis Mes voyages.
async function essaiAssistant(format) {
  const cas = `assistant, ${format}`;
  const ouvert = await ouvrirAvecTouche(cas, format, DONNEES_ASSISTANT, MAINTENANT);
  if (!ouvert) return;
  const { contexte, page, erreurs } = ouvert;
  await page.click('.bouton-flottant');
  await attendreEcran(page, 'nouveau-voyage');
  await page.fill('#nom', 'Vercors');
  await page.click('[data-jour="2026-10-10"]');
  await page.click('[data-jour="2026-10-13"]');
  await page.click('[data-action="suivant"]');
  await page.click('.puce-etiquette:has-text("Randonnée")');
  await page.click('.etape:last-child button');
  await ligneObjet(page, 'Gourde').click();
  await calme(page);

  const titres = [];
  for (let i = 0; i < 4; i++) {
    await toucheRetour(page);
    const { etape, titre } = await etapeAffichee(page);
    titres.push(etape === 'infos' ? 'Informations' : titre);
  }
  const infos = await etat(page, serveur.url);
  juge.exige(
    titres.join(',') === 'Hébergement,Climat,Activités,Informations' && !infos.question && infos.fermetures === 0,
    `${cas} : étapes ${titres} ${vu(infos)}`,
  );

  await toucheRetour(page);
  const q = await attendreQuestion(page);
  juge.exige(q?.titre === abandon.titre, `${cas}, Informations : pas de question d’abandon ${vu(q)}`);
  await toucheRetour(page);
  const fermee = await etat(page, serveur.url);
  juge.exige(
    fermee.dansLAppli && !fermee.question && fermee.etape === 'infos' && fermee.fermetures === 0,
    `${cas}, touche sur la question : ${vu(fermee)}`,
  );
  await toucheRetour(page);
  const reposee = await attendreQuestion(page);
  juge.exige(reposee?.titre === abandon.titre, `${cas} : la question ne revient pas ${vu(reposee)}`);
  if (!reposee) return contexte.close();

  await repondre(page, abandon.abandonner);
  await attendreEcran(page, 'voyages');
  const accueil = await etat(page, serveur.url);
  juge.exige(accueil.fermetures === 0, `${cas}, Mes voyages : fermeture demandée trop tôt ${vu(accueil)}`);
  await toucheRetour(page);
  const fin = await etat(page, serveur.url);
  juge.exige(
    fin.dansLAppli && fin.ecran === 'voyages' && fin.fermetures === 1 && !(await question(page)),
    `${cas}, touche sur Mes voyages : ${vu(fin)}`,
  );
  juge.exige(erreurs.length === 0, `${cas} : erreurs dans la page : ${erreurs.join(' | ')}`);
  await contexte.close();
}

// Un voyage ouvert depuis Mes voyages, la fiche d'un objet ouverte.
async function essaiVoyage(format) {
  const cas = `voyage, ${format}`;
  const ouvert = await ouvrirAvecTouche(cas, format, DONNEES_VOYAGE);
  if (!ouvert) return;
  const { contexte, page, erreurs } = ouvert;
  await page.click('a.carte-voyage[href="#/voyage/v1"]');
  await attendreEcran(page, 'voyage');
  if (format === 'tablette-paysage') await page.click('.choix[data-id="c-ali"]');
  await page.click('.objet[data-id="o-rep"] .objet-corps');
  await attendreQue(page, () => document.querySelector('dialog.fiche[open]') !== null);
  await calme(page);

  await toucheRetour(page);
  const un = await etat(page, serveur.url);
  juge.exige(un.ecran === 'voyage' && !un.fiche && un.fermetures === 0, `${cas}, 1er appui : ${vu(un)}`);
  await toucheRetour(page);
  const deux = await etat(page, serveur.url);
  juge.exige(deux.ecran === 'voyages' && deux.fermetures === 0, `${cas}, 2e appui : ${vu(deux)}`);
  await toucheRetour(page);
  const trois = await etat(page, serveur.url);
  juge.exige(
    trois.dansLAppli && trois.ecran === 'voyages' && trois.fermetures === 1,
    `${cas}, 3e appui : ${vu(trois)}`,
  );
  juge.exige(erreurs.length === 0, `${cas} : erreurs dans la page : ${erreurs.join(' | ')}`);
  await contexte.close();
}

try {
  for (const format of ['telephone', 'tablette-paysage']) {
    await essaiAssistant(format);
    await essaiVoyage(format);
  }
} finally {
  await navigateur.close();
  await serveur.fermer();
}
juge.conclure(
  'Touche retour d’Android',
  'l’assistant recule d’une étape, la question d’abandon se ferme seule, la fiche puis le voyage se ferment, l’appli ne se ferme qu’à l’accueil',
);
