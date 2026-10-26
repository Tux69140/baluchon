// Essai des gestes de la maquette, au doigt sur le téléphone étroit : supprimer et annuler, le bandeau
// qui suit d'un écran à l'autre et s'en va au bout de 10 s, puis le refus de « Plage » réglé élément
// par élément jusqu'à la suppression, et son annulation à l'identique.
// Usage : node docs/maquettes/suppressions/gestes.mjs  (serveur sur 127.0.0.1:8646)
import { chromium } from 'playwright';
import assert from 'node:assert/strict';

const ADRESSE = 'http://127.0.0.1:8646/docs/maquettes/suppressions/';
const navigateur = await chromium.launch();
const page = await navigateur.newPage({ viewport: { width: 360, height: 640 }, hasTouch: true, isMobile: true });
const erreurs = [];
page.on('pageerror', e => erreurs.push(e.message));
await page.clock.install();
const aller = async etat => {
  await page.goto(`${ADRESSE}?etat=${etat}&capture`);
  await page.waitForSelector('html[data-pret]');
};
// En capture, le bandeau reste : on le remplace par un vrai bandeau de 10 s en refaisant le geste.
const bandeau = page.locator('.bandeau-annuler');
const fiche = page.locator('dialog.fiche-modele').last();
const refus = page.locator('dialog.refus');
const objets = () => page.locator('.objet-modele .objet-nom').allInnerTexts();
const pucesDe = nom => page.locator('.objet-modele', { hasText: nom }).locator('.puces-mini span').allInnerTexts();

// ---------- Un objet : supprimer, annuler ----------
await page.goto(`${ADRESSE}?etat=bibliotheque`);
await page.waitForSelector('html[data-pret]');
await page.locator('.categorie-tete', { hasText: 'Baignade' }).click();
assert.deepEqual(await objets(), ['Masque et tuba', 'Parasol', 'Serviette de plage']);
await page.getByRole('button', { name: /Parasol/ }).click();
await fiche.locator('[data-f="supprimer"]').click();
await page.getByRole('button', { name: 'Supprimer', exact: true }).click();
await bandeau.waitFor();
assert.match(await bandeau.innerText(), /Objet «\sParasol\s» supprimé/);
assert.deepEqual(await objets(), ['Masque et tuba', 'Serviette de plage']);
await bandeau.getByRole('button', { name: 'Annuler' }).click();
await bandeau.waitFor({ state: 'detached' });
assert.deepEqual(await objets(), ['Masque et tuba', 'Parasol', 'Serviette de plage']);

// ---------- Le bandeau suit, puis s'en va au bout de 10 s ----------
await page.getByRole('button', { name: /Parasol/ }).click();
await fiche.locator('[data-f="supprimer"]').click();
await page.getByRole('button', { name: 'Supprimer', exact: true }).click();
await bandeau.waitFor();
await page.getByRole('button', { name: 'Menu' }).click();
await page.getByRole('link', { name: 'Mes voyages' }).click();
await page.getByRole('heading', { name: 'Mes voyages' }).waitFor();
assert.ok(await bandeau.isVisible(), 'le bandeau suit sur Mes voyages');
await page.clock.fastForward(9000);
assert.ok(await bandeau.isVisible(), 'encore là après 9 s');
await page.clock.fastForward(1100);
await bandeau.waitFor({ state: 'detached' });

// ---------- Une catégorie : la question chiffrée, puis Annuler la rend avec ses objets ----------
await aller('bibliotheque');
await page.getByRole('button', { name: 'Modifier la catégorie Camping' }).click();
await fiche.locator('[data-f="supprimer"]').click();
assert.match(await page.locator('#suppression-texte').innerText(), /Ses 3 objets seront supprimés aussi/);
await page.getByRole('button', { name: 'Supprimer', exact: true }).click();
await bandeau.waitFor();
assert.equal(await page.locator('.categorie-tete', { hasText: 'Camping' }).count(), 0);
await bandeau.getByRole('button', { name: 'Annuler' }).click();
await page.locator('.categorie-tete', { hasText: 'Camping' }).click();
assert.deepEqual(await objets(), ['Lampe frontale', 'Réchaud', 'Sac de couchage']);

// ---------- « Chaud » : permise, 1 objet la perd et garde « Plage » ----------
await aller('etiquettes');
await page.getByRole('button', { name: 'Chaud, modifier' }).click();
await page.locator('.fiche-nom [data-f="supprimer"]').click();
assert.match(await page.locator('#suppression-texte').innerText(), /1 objet perdra cette étiquette/);
await page.getByRole('button', { name: 'Garder' }).click();
await page.locator('.fiche-nom .bouton-fermer').click();

// ---------- « Plage » : refusée, réglée élément par élément ----------
await page.getByRole('button', { name: 'Plage, modifier' }).click();
await page.locator('.fiche-nom [data-f="supprimer"]').click();
await refus.waitFor();
const lignes = () => refus.locator('.refus-texte b').allInnerTexts();
assert.deepEqual(await lignes(), ['Baignade', 'Maillot de bain', 'Tongs']);
assert.match(await refus.locator('.refus-reste').innerText(), /3 à régler/);

// Maillot de bain passe en « Toujours inclus » : il quitte la liste.
await refus.getByRole('button', { name: /Maillot de bain/ }).click();
await fiche.locator('.segment', { hasText: 'Toujours inclus' }).click();
await fiche.locator('[data-f="enregistrer"]').click();
await page.waitForFunction(() => document.querySelectorAll('.refus-ligne').length === 2);
assert.deepEqual(await lignes(), ['Baignade', 'Tongs']);

// Tongs est supprimé depuis sa fiche : le bandeau passe en haut, la liste se raccourcit.
await refus.getByRole('button', { name: /Tongs/ }).click();
await fiche.locator('[data-f="supprimer"]').click();
await page.getByRole('button', { name: 'Supprimer', exact: true }).click();
await bandeau.waitFor();
assert.equal(await bandeau.getAttribute('data-place'), 'haut');
await page.waitForFunction(() => document.querySelectorAll('.refus-ligne').length === 1);

// « Annuler » sur le bandeau : Tongs revient dans la liste.
await bandeau.getByRole('button', { name: 'Annuler' }).click();
await page.waitForFunction(() => document.querySelectorAll('.refus-ligne').length === 2);
await refus.getByRole('button', { name: /Tongs/ }).click();
await fiche.locator('[data-f="supprimer"]').click();
await page.getByRole('button', { name: 'Supprimer', exact: true }).click();
await page.waitForFunction(() => document.querySelectorAll('.refus-ligne').length === 1);

// Baignade reçoit aussi « Chaud » : plus rien ne bloque, la question chiffrée prend la place.
await refus.getByRole('button', { name: /Baignade/ }).click();
await fiche.getByRole('button', { name: /Chaud/ }).click();
await fiche.locator('[data-f="enregistrer"]').click();
await refus.getByText('Plus rien ne bloque').waitFor();
assert.match(await refus.innerText(), /1 objet et 1 catégorie perdront cette étiquette/);
await refus.getByRole('button', { name: 'Supprimer', exact: true }).click();
await refus.waitFor({ state: 'detached' });
await page.locator('.fiche-nom').waitFor({ state: 'detached' });
assert.match(await bandeau.innerText(), /Étiquette «\sPlage\s» supprimée/);
assert.equal(await page.getByRole('button', { name: 'Plage, modifier' }).count(), 0);

// Annuler : « Plage » revient, et ses liens aussi (Crème solaire la porte de nouveau).
await bandeau.getByRole('button', { name: 'Annuler' }).click();
await page.getByRole('button', { name: 'Plage, modifier' }).waitFor();
await page.getByRole('link', { name: 'Réglages' }).click();
await page.getByRole('link', { name: /Bibliothèque/ }).click();
await page.locator('.categorie-tete', { hasText: 'Toilette' }).click();
assert.deepEqual(await pucesDe('Crème solaire'), ['Plage', 'Chaud']);

await navigateur.close();
assert.deepEqual(erreurs, []);
console.log('gestes vérifiés');
