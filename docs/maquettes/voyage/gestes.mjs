// Joue les gestes de la maquette et vérifie leurs effets (animations actives).
import { chromium } from 'playwright';
const b = await chromium.launch();
const echecs = [];
const verifier = (ok, quoi) => (ok ? console.log('ok  ', quoi) : echecs.push(quoi));
const url = e => `http://127.0.0.1:8642/docs/maquettes/voyage/?etat=${e}&capture`;

// Une colonne (téléphone)
let p = await (await b.newContext({ viewport: { width: 393, height: 873 }, hasTouch: true })).newPage();
p.on('pageerror', e => echecs.push('erreur JS: ' + e.message));
await p.goto(url('en-cours'));
await p.waitForSelector('html[data-pret]');
const caseDe = nom => p.locator('.objet', { hasText: nom }).locator('.case');
const etat = nom => p.locator('.objet', { hasText: nom }).getAttribute('data-etat');
await caseDe('Pantalons').click();
verifier((await etat('Pantalons')) === 'entame', 'un appui entame Pantalons (1/4)');
for (let i = 0; i < 3; i++) await caseDe('Pantalons').click();
verifier((await etat('Pantalons')) === 'plein', 'quatre appuis cochent Pantalons');
const ordreAvant = await p.locator('[data-flip^="o"]').evaluateAll(els => els.map(e => e.textContent.trim().split('\n')[0]));
await p.waitForTimeout(300);
const ordrePendant = await p.locator('[data-flip^="o"]').evaluateAll(els => els.map(e => e.textContent.trim().split('\n')[0]));
verifier(JSON.stringify(ordreAvant) === JSON.stringify(ordrePendant), 'rien ne bouge pendant la seconde');
await p.waitForTimeout(1200);
const vet = await p.locator('[data-flip="cat-vetements"] .objet-nom').allTextContents();
verifier(vet.indexOf('Pantalons') > vet.indexOf('Veste de pluie'), 'Pantalons descend après la seconde');
// Confirmation sur un objet plein de plus d'une pièce
await caseDe('Pantalons').click();
verifier(await p.locator('dialog.confirmation[open]').isVisible(), 'vider Pantalons demande confirmation');
await p.locator('[data-vider]').click();
await p.waitForTimeout(400);
verifier((await etat('Pantalons')) === 'vide', 'Vider remet Pantalons à 0');
// Objet d'une pièce : décoche directe
await caseDe('Crème solaire').click();
await p.waitForTimeout(1300);
verifier(await p.locator('[data-flip="cat-toilette"] .tampon').isVisible(), 'Toilette reçoit son tampon');
await p.waitForTimeout(1300);
verifier((await p.locator('[data-flip="cat-toilette"] .categorie-tete').getAttribute('aria-expanded')) === 'false', 'Toilette se replie');
// Fiche
await p.locator('.objet-corps', { hasText: 'Chaussettes' }).click();
verifier(await p.locator('dialog.fiche[open]').isVisible(), 'la fiche s’ouvre');
await p.locator('[data-fiche="tout"]').click();
verifier((await p.locator('.fiche output').first().textContent()) === '8', 'Tout dans le sac : 8 / 8');
await p.locator('[data-fiche="vider"]').click();
verifier(await p.locator('dialog.confirmation[open]').isVisible(), 'Vider dans la fiche demande confirmation');
await p.locator('[data-vider]').click();
await p.waitForTimeout(400);
verifier((await p.locator('.fiche output').first().textContent()) === '0', 'la fiche affiche 0 après Vider');
await p.locator('[data-fiche="plus"]').click();
await p.locator('[data-fiche="vider"]').click();
verifier(!(await p.locator('dialog.confirmation').count()), 'une seule pièce se vide sans confirmation');
await p.locator('[data-fiche="tout"]').click();
await p.keyboard.press('Escape');
await p.waitForTimeout(400);
verifier(!(await p.locator('dialog.fiche').count()), 'Échap ferme la fiche');
// Filtre
await p.locator('[data-action="filtre"]').click();
verifier(!(await p.locator('.objet[data-etat="plein"]').count()), 'le filtre masque les objets cochés');
const cats = await p.locator('.categorie').evaluateAll(els => els.map(e => e.dataset.flip));
verifier(cats.at(-1) === 'cat-toilette' || cats.at(-1) === 'cat-papiers', 'les catégories bouclées sont en bas');

// Deux panneaux (tablette en paysage)
p = await (await b.newContext({ viewport: { width: 1280, height: 800 }, hasTouch: true })).newPage();
p.on('pageerror', e => echecs.push('erreur JS: ' + e.message));
await p.goto(url('en-cours'));
await p.waitForSelector('html[data-pret]');
await p.locator('.choix', { hasText: 'Toilette' }).click();
await p.locator('.objet', { hasText: 'Crème solaire' }).locator('.case').click();
await p.waitForTimeout(1300);
verifier(await p.locator('.detail-tete .tampon').isVisible(), 'deux panneaux : tampon sur Toilette');
await p.waitForTimeout(1300);
verifier((await p.locator('#detail-titre').textContent()) === 'Alimentation', 'deux panneaux : passage à Alimentation');

// Sac bouclé
await p.goto(url('fin'));
await p.waitForSelector('html[data-pret]');
await p.locator('.choix', { hasText: 'Camping' }).click();
await p.locator('.objet', { hasText: 'Lampes frontales' }).locator('.case').click();
await p.waitForTimeout(1300);
verifier(await p.locator('.progression[data-boucle]').isVisible(), 'le dernier objet déclenche « Sac bouclé ! »');

await b.close();
if (echecs.length) {
  console.error('ÉCHECS :\n' + echecs.join('\n'));
  process.exit(1);
}
