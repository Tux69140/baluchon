// Gestes de la maquette de la phase 8, joués au doigt : ajouter un objet dans une catégorie neuve puis
// l'ajouter aussi à la bibliothèque, corriger une quantité (et la confirmation sous ce qui est dans le
// sac), renommer, retirer puis annuler, et le retrait rendu définitif par un ajout. Jugé au code de sortie.
// Usage : node docs/maquettes/ajuster/gestes.mjs  (serveur sur 127.0.0.1:8647)
import { chromium } from 'playwright';
import assert from 'node:assert/strict';

const ADRESSE = 'http://127.0.0.1:8647/docs/maquettes/ajuster/?capture';
const navigateur = await chromium.launch();
const erreurs = [];

async function ouvrirPage(vue) {
  const contexte = await navigateur.newContext({ viewport: vue, isMobile: vue.width < 600, hasTouch: true, reducedMotion: 'reduce' });
  const page = await contexte.newPage();
  page.on('pageerror', e => erreurs.push(e.message));
  await page.goto(ADRESSE);
  await page.waitForSelector('html[data-pret]');
  return page;
}
const dessus = page => page.locator('dialog[open]').last();

// ---------- Téléphone : ajouter dans une catégorie neuve, puis à la bibliothèque ----------
{
  const page = await ouvrirPage({ width: 360, height: 640 });
  await page.locator('.bouton-flottant').click();
  await dessus(page).locator('#f-nom').fill('Palmes');
  // Sans catégorie neuve : « Ajouter » sans nom est refusé, pas avec.
  await dessus(page).locator('[data-f="quantite-plus"]').click();
  await dessus(page).locator('[data-f="categorie"]').click();
  await dessus(page).locator('[data-choix="nouvelle"]').click();
  // « Choisir » sans nom : refusé, la fiche reste.
  await dessus(page).locator('[data-f="choisir"]').click();
  await assert.doesNotReject(dessus(page).locator('#f-nom[aria-invalid="true"]').waitFor());
  await dessus(page).locator('#f-nom').fill('Plongée');
  await dessus(page).locator('[data-valeur="lilas"]').click();
  await dessus(page).locator('[data-f="choisir"]').click();
  await assert.doesNotReject(dessus(page).locator('#f-categorie-nom', { hasText: 'Plongée' }).waitFor());
  await dessus(page).locator('[data-f="ajouter"]').click();
  // L'objet est dans le voyage, la catégorie neuve en dernier ; la question est posée.
  await dessus(page).locator('#question-titre', { hasText: 'bibliothèque' }).waitFor();
  assert.equal(await page.locator('.categorie').last().locator('.categorie-nom b').textContent(), 'Plongée');
  assert.equal(await page.locator('.categorie').last().locator('.objet-nom').textContent(), 'Palmes');
  assert.equal(await page.locator('.categorie').last().locator('.objet-quantite').textContent(), '2');
  await dessus(page).locator('[data-oui]').click();
  // « Plongée » n'existe que dans ce voyage : choisir, ou la créer dans la bibliothèque.
  await dessus(page).locator('#choix-titre').waitFor();
  await dessus(page).locator('[data-choix="nouvelle"]').click();
  await assert.doesNotReject(dessus(page).locator('[data-f="nom"]').and(page.locator('[value="Plongée"]')).waitFor());
  // « Suivant » sans étiquette : refusé.
  await dessus(page).locator('[data-f="enregistrer"]').click();
  await dessus(page).locator('#f-etiquettes-erreur', { hasText: 'étiquette' }).waitFor();
  await dessus(page).locator('[data-valeur="Plage"]').click();
  await dessus(page).locator('[data-f="enregistrer"]', { hasText: 'Suivant' }).click();
  // La fiche de l'objet, préremplie, dans la catégorie à venir.
  await dessus(page).locator('.fiche-regle', { hasText: 'Plongée' }).waitFor();
  assert.equal(await dessus(page).locator('#f-nom').inputValue(), 'Palmes');
  await dessus(page).locator('[data-f="enregistrer"]').click();
  await dessus(page).locator('#f-etiquettes-erreur', { hasText: 'étiquette' }).waitFor();
  await dessus(page).locator('[data-valeur="Plage"]').click();
  await dessus(page).locator('[data-f="enregistrer"]', { hasText: 'Ajouter à la bibliothèque' }).click();
  await page.locator('.alerte-haut', { hasText: 'est dans la bibliothèque' }).waitFor();
  assert.equal(await page.locator('dialog[open]').count(), 0);
  await page.context().close();
}

// ---------- Fiche : quantité, confirmation sous ce qui est dans le sac, renommer ----------
{
  const page = await ouvrirPage({ width: 1280, height: 800 });
  await page.locator('[data-action="fiche"]', { hasText: 'Bonnet' }).click();
  assert.match(await dessus(page).locator('[data-calcul]').textContent(), /^calculée : 1 par personne$/);
  // 2 dans le sac sur 2 : baisser à 1 se confirme ; « Garder 2 » ne change rien.
  await dessus(page).locator('[data-f="quantite-moins"]').click();
  await dessus(page).locator('#question-titre', { hasText: 'Sortir une pièce du sac' }).waitFor();
  await dessus(page).locator('[data-fermer]', { hasText: 'Garder 2' }).click();
  await dessus(page).locator('.fiche-voyage').or(dessus(page).locator('[data-calcul]')).first().waitFor();
  assert.match(await dessus(page).locator('[data-calcul]').textContent(), /calculée/);
  await dessus(page).locator('[data-f="quantite-moins"]').click();
  await dessus(page).locator('[data-oui]', { hasText: 'Prévoir 1' }).click();
  await dessus(page).locator('[data-calcul]', { hasText: 'fixée manuellement' }).waitFor();
  assert.equal(await dessus(page).locator('.compteur-total').textContent(), 'sur 1');
  // Monter ne demande rien.
  await dessus(page).locator('[data-f="quantite-plus"]').click();
  assert.equal(await dessus(page).locator('.compteur-total').textContent(), 'sur 2');
  // Renommer : le titre et la ligne changent.
  await dessus(page).locator('[data-f="renommer"]').click();
  await dessus(page).locator('#f-nom').fill('Bonnet de laine');
  await dessus(page).locator('[data-f="enregistrer"]').click();
  await dessus(page).locator('#fiche-titre', { hasText: 'Bonnet de laine' }).waitFor();
  assert.equal(await page.locator('.ge-carte-objets .objet-nom', { hasText: 'Bonnet de laine' }).count(), 1);
  await page.context().close();
}

// ---------- Retirer, « Annuler », et le retrait rendu définitif par un ajout ----------
{
  const page = await ouvrirPage({ width: 1280, height: 800 });
  const avant = await page.locator('.ge-tuile').count();
  await page.locator('[data-action="choisir"]', { hasText: 'Toilette' }).click();
  await page.locator('[data-action="fiche"]', { hasText: 'Crème solaire' }).click();
  await dessus(page).locator('[data-f="retirer"]').click();
  await dessus(page).locator('#question-titre', { hasText: 'Retirer' }).waitFor();
  await dessus(page).locator('[data-oui]').click();
  await page.locator('.bandeau-annuler', { hasText: 'retiré du voyage' }).waitFor();
  assert.equal(await page.locator('.objet-nom', { hasText: 'Crème solaire' }).count(), 0);
  await page.locator('.bandeau-annuler button').click();
  await page.locator('.objet-nom', { hasText: 'Crème solaire' }).waitFor();
  assert.equal(await page.locator('.ge-tuile').count(), avant);
  // Retirer à nouveau, puis ajouter un objet : le bandeau s'en va, le retrait est définitif.
  await page.locator('[data-action="fiche"]', { hasText: 'Crème solaire' }).click();
  await dessus(page).locator('[data-f="retirer"]').click();
  await dessus(page).locator('[data-oui]').click();
  await page.locator('.bandeau-annuler').waitFor();
  await page.locator('.objet-ajout button').click();
  await dessus(page).locator('#f-nom').fill('Après-soleil');
  await dessus(page).locator('[data-f="ajouter"]').click();
  await dessus(page).locator('[data-fermer]', { hasText: 'Non' }).click();
  await page.locator('.bandeau-annuler').waitFor({ state: 'detached' });
  assert.equal(await page.locator('.objet-nom', { hasText: 'Après-soleil' }).count(), 1);
  await page.context().close();
}

// ---------- Le dernier objet d'une catégorie l'emporte, « Annuler » la ramène ----------
{
  const page = await ouvrirPage({ width: 360, height: 640 });
  await page.goto('http://127.0.0.1:8647/docs/maquettes/ajuster/?etat=fiche-ponctuel&capture');
  await page.waitForSelector('html[data-pret]');
  await dessus(page).locator('[data-f="retirer"]').click();
  await dessus(page).locator('p', { hasText: 'dernier objet de' }).waitFor();
  await dessus(page).locator('[data-oui]').click();
  await page.locator('.bandeau-annuler', { hasText: 'et la catégorie' }).waitFor();
  assert.equal(await page.locator('.categorie-nom b', { hasText: 'Plongée' }).count(), 0);
  await page.locator('.bandeau-annuler button').click();
  await page.locator('.categorie-nom b', { hasText: 'Plongée' }).waitFor();
  await page.context().close();
}

await navigateur.close();
if (erreurs.length) {
  console.error(erreurs.join('\n'));
  process.exit(1);
}
console.log('gestes joués');
