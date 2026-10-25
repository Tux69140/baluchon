// Essai des gestes de la maquette, au doigt sur le téléphone étroit : lier « Alimentation » à
// Camping, lui ajouter un objet, refuser un objet sans nom, ranger, abandonner une saisie.
// Usage : node docs/maquettes/bibliotheque/gestes.mjs  (serveur sur 127.0.0.1:8644)
import { chromium } from 'playwright';
import assert from 'node:assert/strict';

const navigateur = await chromium.launch();
const page = await navigateur.newPage({ viewport: { width: 360, height: 640 }, hasTouch: true, isMobile: true });
const erreurs = [];
page.on('pageerror', e => erreurs.push(e.message));
await page.goto('http://127.0.0.1:8644/docs/maquettes/bibliotheque/?etat=accueil&capture');
await page.waitForSelector('html[data-pret]');

// Menu → Réglages → Bibliothèque.
await page.getByRole('button', { name: 'Menu' }).click();
await page.getByRole('link', { name: 'Réglages' }).click();
await page.getByRole('link', { name: /Bibliothèque/ }).click();
await page.getByRole('heading', { name: 'Bibliothèque', level: 1 }).waitFor();

// Alimentation : liée à Camping.
await page.getByRole('button', { name: 'Modifier la catégorie Alimentation' }).click();
await page.locator('.fiche-modele label', { hasText: 'Selon les étiquettes' }).click();
await page.locator('.fiche-modele [data-f="enregistrer"]').click();
assert.match(await page.locator('#f-etiquettes-erreur').innerText(), /au moins une étiquette/);
await page.locator('.fiche-modele [data-valeur="Camping"]').click();
await page.locator('.fiche-modele [data-f="enregistrer"]').click();
await page.locator('.fiche-modele').waitFor({ state: 'detached' });
assert.match(await page.locator('[data-flip="cat-alimentation"]').innerText(), /Camping/);

// Un objet ajouté : refusé sans nom, accepté ensuite, rangé par ordre alphabétique.
await page.getByRole('button', { name: /^Alimentation/ }).click();
await page.getByRole('button', { name: 'Ajouter un objet' }).click();
await page.locator('.fiche-modele [data-f="enregistrer"]').click();
assert.match(await page.locator('#f-nom-erreur').innerText(), /Donnez un nom/);
await page.locator('#f-nom').fill('Pâtes');
await page.locator('.fiche-modele label', { hasText: 'Par jour' }).click();
await page.locator('.fiche-modele [data-f="enregistrer"]').click();
await page.locator('.fiche-modele').waitFor({ state: 'detached' });
const noms = await page.locator('[data-flip="cat-alimentation"] .objet-nom').allInnerTexts();
assert.deepEqual(noms, ['Gourde', 'Pâtes', 'Repas']);

// Abandon : une saisie fermée sans enregistrer demande confirmation, puis rien ne change.
await page.getByRole('button', { name: /^Repas/ }).click();
await page.locator('#f-nom').fill('Repas du soir');
await page.keyboard.press('Escape');
await page.getByRole('button', { name: 'Abandonner' }).click();
await page.locator('.fiche-modele').waitFor({ state: 'detached' });
assert.ok(await page.getByRole('button', { name: /^Repas/ }).isVisible());

// Ranger : Camping monte d'un cran.
await page.getByRole('button', { name: 'Ranger les catégories' }).click();
await page.getByRole('button', { name: 'Monter Camping' }).click();
await page.getByRole('button', { name: 'Terminé' }).click();
const ordre = await page.locator('.categorie .categorie-nom b').allInnerTexts();
assert.deepEqual(ordre, ['Vêtements', 'Toilette', 'Alimentation', 'Camping', 'Papiers']);

await navigateur.close();
assert.deepEqual(erreurs, []);
console.log('gestes vérifiés');
