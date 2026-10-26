// Essai des gestes de la maquette, au doigt sur le téléphone étroit : créer un groupe et ses
// étiquettes, refuser un nom pris, renommer, ranger, supprimer, puis la rangée d'étapes qui défile.
// Usage : node docs/maquettes/etiquettes/gestes.mjs  (serveur sur 127.0.0.1:8645)
import { chromium } from 'playwright';
import assert from 'node:assert/strict';

const ADRESSE = 'http://127.0.0.1:8645/docs/maquettes/etiquettes/';
const navigateur = await chromium.launch();
const page = await navigateur.newPage({ viewport: { width: 360, height: 640 }, hasTouch: true, isMobile: true });
const erreurs = [];
page.on('pageerror', e => erreurs.push(e.message));
await page.goto(`${ADRESSE}?etat=reglages&capture`);
await page.waitForSelector('html[data-pret]');

const fiche = page.locator('.fiche-nom');
const enregistrer = () => fiche.locator('[data-f="enregistrer"]').click();
const cartes = () => page.locator('.groupe-titre b').allInnerTexts();
const puces = groupe => page.locator('.groupe', { has: page.locator(`#${groupe}`) }).locator('.puce-modele').allInnerTexts();

// Réglages → Étiquettes.
await page.getByRole('link', { name: /Étiquettes/ }).click();
await page.getByRole('heading', { name: 'Étiquettes', level: 1 }).waitFor();

// Un groupe neuf : refusé sans nom puis sous un nom pris, créé ensuite, vide.
await page.getByRole('button', { name: 'Nouveau groupe' }).click();
await enregistrer();
assert.match(await page.locator('#f-nom-erreur').innerText(), /Donnez un nom/);
await page.locator('#f-nom').fill('CLIMAT');
assert.match(await page.locator('#f-nom-erreur').innerText(), /« Climat » existe déjà/);
await page.locator('#f-nom').fill('Transport');
await enregistrer();
await fiche.waitFor({ state: 'detached' });
assert.deepEqual(await cartes(), ['Activités', 'Climat', 'Hébergement', 'Transport']);
assert.match(await page.locator('.groupe').last().innerText(), /absent de « Nouveau voyage »/);

// Ses étiquettes : « plage » est refusée (prise dans Activités), « Plage » d'un groupe peut nommer
// un groupe et inversement, donc « Transport » est acceptée comme étiquette.
const ajouter = async nom => {
  await page.locator('.groupe').last().getByRole('button', { name: 'Ajouter une étiquette' }).click();
  await page.locator('#f-nom').fill(nom);
  await enregistrer();
};
await ajouter('plage');
assert.match(await page.locator('#f-nom-erreur').innerText(), /« Plage » existe déjà, dans le groupe Activités/);
await page.locator('#f-nom').fill('Train');
await enregistrer();
await fiche.waitFor({ state: 'detached' });
await ajouter('Transport');
await fiche.waitFor({ state: 'detached' });
assert.match(await page.locator('.groupe').last().innerText(), /étape 5 de « Nouveau voyage »/);

// Renommer une étiquette.
await page.getByRole('button', { name: 'Train, modifier' }).click();
await page.locator('#f-nom').fill('Train de nuit');
await enregistrer();
await fiche.waitFor({ state: 'detached' });
const idTransport = await page.locator('.groupe').last().locator('h2').getAttribute('id');
assert.deepEqual(await puces(idTransport), ['Train de nuit', 'Transport']);

// Ranger : Transport monte d'un cran, et « Transport » passe devant « Train de nuit ».
await page.getByRole('button', { name: 'Ranger' }).click();
await page.getByRole('button', { name: 'Monter Transport' }).first().click();
await page.locator('.rang-groupe', { hasText: 'Train de nuit' }).locator('.rang-etiquettes').getByRole('button', { name: 'Monter Transport' }).click();
await page.getByRole('button', { name: 'Terminé' }).click();
assert.deepEqual(await cartes(), ['Activités', 'Climat', 'Transport', 'Hébergement']);
assert.deepEqual(await puces(idTransport), ['Transport', 'Train de nuit']);

// Supprimer : « Garder » ne change rien ; « Supprimer » ôte le groupe et ses étiquettes.
await page.getByRole('button', { name: 'Modifier le groupe Climat' }).click();
await fiche.locator('[data-f="supprimer"]').click();
assert.match(await page.locator('#suppression-texte').innerText(), /Chaud, Froid et Pluie seront supprimées/);
await page.getByRole('button', { name: 'Garder' }).click();
await fiche.locator('[data-f="supprimer"]').click();
await page.getByRole('button', { name: 'Supprimer', exact: true }).click();
await fiche.waitFor({ state: 'detached' });
assert.deepEqual(await cartes(), ['Activités', 'Transport', 'Hébergement']);

// L'assistant à 7 groupes : la rangée défile, le trait touche le bord du côté des étapes cachées.
const suites = async () => ({
  avant: await page.locator('[data-cote="avant"]').evaluate(el => el.hasAttribute('data-visible')),
  apres: await page.locator('[data-cote="apres"]').evaluate(el => el.hasAttribute('data-visible')),
});
await page.goto(`${ADRESSE}?etat=assistant-debut&capture`);
await page.waitForSelector('html[data-pret]');
assert.deepEqual(await suites(), { avant: false, apres: true });
for (let i = 0; i < 4; i++) await page.getByRole('button', { name: /Suivant/ }).click();
await page.waitForFunction(() => document.querySelector('[data-cote="avant"]').hasAttribute('data-visible'));
assert.deepEqual(await suites(), { avant: true, apres: true });
assert.ok(await page.locator('[aria-current="step"]').isVisible());
const cibles = await page.locator('.etape button').evaluateAll(bs => bs.map(b => b.getBoundingClientRect().width));
assert.ok(cibles.every(l => l >= 44), `étapes trop étroites : ${cibles}`);
await page.goto(`${ADRESSE}?etat=assistant-mini&capture`);
await page.waitForSelector('html[data-pret]');
assert.deepEqual(await suites(), { avant: false, apres: false });

await navigateur.close();
assert.deepEqual(erreurs, []);
console.log('gestes vérifiés');
