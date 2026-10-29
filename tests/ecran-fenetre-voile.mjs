// Un appui sur le voile ferme une fiche (ou demande « Abandonner ? ») ; une sélection du texte d'un champ,
// commencée dans la fiche et lâchée sur le voile (souris tirée de droite à gauche au-delà du bord), n'est pas un
// appui sur le voile : rien ne se passe (remarque du chef de projet, 2026-10-29).
import { chromium } from 'playwright';
import { calme } from './outils/attente.mjs';
import { ouvrirVoyage, vu } from './outils/ajuster.mjs';
import { AJOUT, AVEC_BIBLIOTHEQUE, toucherAjouter } from './outils/ajouter.mjs';
import { fermerEssai } from './outils/bibliotheque.mjs';
import { creerJuge } from './outils/page.mjs';
import { demarrerServeur } from './outils/serveur.mjs';

const juge = creerJuge();
const serveur = await demarrerServeur();
const navigateur = await chromium.launch();

// Les fenêtres ouvertes, de la plus basse à celle du dessus.
const ouvertes = page =>
  page.evaluate(() =>
    [...document.querySelectorAll('dialog[open]:not([data-fermeture])')].map(d => d.className.trim()),
  );

try {
  const cas = 'ordinateur, fiche « Ajouter un objet »';
  const ouvert = await ouvrirVoyage(navigateur, serveur.url, { format: 'ordinateur', donnees: AVEC_BIBLIOTHEQUE });
  const { page } = ouvert;
  await toucherAjouter(page);
  await page.fill(`${AJOUT} #f-nom`, 'Nouvel objet');
  const champ = await page.locator(`${AJOUT} #f-nom`).boundingBox();
  const cadre = (await page.locator(`${AJOUT}[open]`).boundingBox()).x;
  // Sélection de droite à gauche : appui à la fin du texte, lâché à gauche de la fiche, sur le voile.
  await page.mouse.move(champ.x + champ.width - 8, champ.y + champ.height / 2);
  await page.mouse.down();
  await page.mouse.move(Math.max(4, cadre - 40), champ.y + champ.height / 2, { steps: 8 });
  await page.mouse.up();
  await calme(page);
  const apres = await ouvertes(page);
  const selection = await page.evaluate(s => {
    const c = document.querySelector(s);
    return c.value.slice(c.selectionStart, c.selectionEnd);
  }, `${AJOUT} #f-nom`);
  juge.exige(
    apres.length === 1 && apres[0].includes('fiche-ajout') && selection === 'Nouvel objet',
    `${cas} : sélection lâchée sur le voile : fenêtres ${vu(apres)}, sélection ${vu(selection)}`,
  );
  // Témoin : un vrai appui sur le voile demande toujours « Abandonner cet objet ? ».
  await page.mouse.click(Math.max(4, cadre - 40), champ.y + champ.height / 2);
  await calme(page);
  const voile = await ouvertes(page);
  juge.exige(voile.length === 2, `${cas} : appui sur le voile sans question : ${vu(voile)}`);
  await fermerEssai(juge, cas, ouvert);
} finally {
  await navigateur.close();
  await serveur.fermer();
}
juge.conclure('Voile des fenêtres', 'une sélection lâchée sur le voile ne ferme rien ; un appui le fait');
