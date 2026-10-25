// Joue les gestes de la maquette de l'assistant et vérifie leurs effets (décisions du 2026-10-24).
// Usage : node docs/maquettes/assistant/gestes.mjs  (serveur Vite sur 127.0.0.1:8643)
import { chromium } from 'playwright';
const b = await chromium.launch();
const echecs = [];
const verifier = (ok, quoi) => (ok ? console.log('ok  ', quoi) : echecs.push(quoi));
const url = e => `http://127.0.0.1:8643/docs/maquettes/assistant/?etat=${e}`;

for (const [format, vue] of [
  ['tablette', { width: 1280, height: 800 }],
  ['téléphone', { width: 393, height: 873 }],
]) {
  const p = await (await b.newContext({ viewport: vue, screen: vue, hasTouch: true })).newPage();
  p.on('pageerror', e => echecs.push(`${format} erreur JS: ${e.message}`));
  const etapeCourante = () => p.locator('.etape[data-etat="courante"] .etape-nom').textContent();
  const hauteur = () => p.evaluate(() => document.querySelector('dialog.assistant')?.getBoundingClientRect().height);

  // Neuf : seules Informations et rien d'autre ; Suivant sans rien refuse et montre les erreurs.
  await p.goto(url('neuf'));
  await p.waitForSelector('html[data-pret]');
  verifier((await p.locator('.etape[data-etat="fermee"]').count()) === 4, `${format}: au départ, les autres étapes sont fermées`);
  await p.locator('[data-action="suivant"]').click();
  verifier((await etapeCourante()) === 'Informations', `${format}: Suivant sans informations reste sur Informations`);
  verifier((await p.locator('#erreur-nom').textContent()).length > 0, `${format}: le nom manquant est signalé`);
  // Retour système sans saisie : l'assistant se ferme.
  await p.goBack();
  await p.waitForSelector('text=Mes voyages');
  verifier(!(await p.locator('.assistant').count()) || !(await p.locator('dialog.assistant[open]').count()), `${format}: retour sans saisie ferme l'assistant`);

  // Parcours : Informations remplies → Activités, choix, puis aperçu par la rangée d'étapes.
  await p.goto(url('infos'));
  await p.waitForSelector('html[data-pret]');
  const h0 = await hauteur();
  await p.locator('[data-action="suivant"]').click();
  verifier((await etapeCourante()) === 'Activités', `${format}: Suivant mène à Activités`);
  if (h0) verifier((await hauteur()) === h0, `${format}: la fenêtre garde sa hauteur d'une étape à l'autre`);
  await p.locator('[data-etiquette="camping"]').click();
  verifier((await p.locator('[data-etiquette="camping"]').getAttribute('aria-pressed')) === 'true', `${format}: une puce se choisit`);
  verifier((await p.locator('.etape[data-etat="fermee"]').count()) === 2, `${format}: Climat et Hébergement, pas encore vus, restent fermés`);
  await p.locator('.etape:last-child button').click();
  verifier((await etapeCourante()) === 'Aperçu', `${format}: la rangée mène directement à l'aperçu`);
  verifier((await p.locator('[data-categorie="camping"]').count()) === 1, `${format}: Camping cochée fait entrer la catégorie Camping`);

  // Décocher une catégorie entière, puis un objet ; la case de la catégorie passe à « en partie ».
  await p.locator('[data-categorie="alimentation"]').click();
  verifier((await p.locator('[data-categorie="alimentation"]').getAttribute('aria-checked')) === 'false', `${format}: la catégorie se décoche entière`);
  await p.locator('[data-objet="repas"]').click();
  verifier((await p.locator('[data-categorie="alimentation"]').getAttribute('aria-checked')) === 'mixed', `${format}: un objet recoché met la catégorie « en partie »`);

  // Retour système : étape précédente.
  await p.goBack();
  verifier((await etapeCourante()) === 'Hébergement', `${format}: retour depuis l'aperçu mène à l'étape précédente (Hébergement)`);
  // Aller-retour sans changement : pas de fenêtre.
  await p.locator('.etape:last-child button').click();
  verifier(!(await p.locator('dialog.confirmation[open]').count()), `${format}: sans changement, aucune fenêtre des objets écartés`);
  verifier((await p.locator('[data-objet="gourde"]').getAttribute('aria-checked')) === 'false', `${format}: les choix de l'aperçu sont conservés`);
  // Changement d'étiquette : la fenêtre nomme Gourde ; « Les remettre » la recoche.
  await p.locator('.etape:nth-child(2) button').click();
  await p.locator('[data-etiquette="randonnee"]').click();
  await p.locator('.etape:last-child button').click();
  await p.waitForSelector('dialog.confirmation[open]');
  verifier((await p.locator('.liste-ecartes').textContent()).includes('Gourde'), `${format}: après un changement, la fenêtre nomme les objets écartés`);
  await p.locator('[data-reponse="non"]').click();
  verifier((await p.locator('[data-objet="gourde"]').getAttribute('aria-checked')) === 'true', `${format}: « Les remettre dans la liste » recoche Gourde`);

  // Tout décocher : « Créer le voyage » grisé, la raison est écrite.
  for (const c of await p.locator('[data-categorie]').all()) {
    while ((await c.getAttribute('aria-checked')) !== 'false') await c.click();
  }
  verifier((await p.locator('[data-action="creer"]').getAttribute('aria-disabled')) === 'true', `${format}: tout écarté grise « Créer le voyage »`);
  verifier(await p.locator('#raison-vide').isVisible(), `${format}: la raison est écrite`);
  await p.locator('[data-categorie="vetements"]').click();
  await p.locator('[data-action="creer"]').click();
  verifier(await p.locator('.etiquettes-voyage').isVisible(), `${format}: le voyage créé montre ses étiquettes`);
  verifier(!(await p.locator('text=Repas').count()), `${format}: un objet écarté est absent du voyage`);

  // Retour depuis Informations avec saisie : confirmation, puis « Continuer la saisie » garde tout.
  await p.goto(url('infos'));
  await p.waitForSelector('html[data-pret]');
  await p.goBack();
  await p.waitForSelector('dialog.confirmation[open]');
  verifier(true, `${format}: retour avec saisie demande confirmation`);
  await p.locator('[data-reponse="non"]').click();
  verifier((await p.locator('#nom').inputValue()) === 'Week-end au Vercors', `${format}: « Continuer la saisie » garde la saisie`);
}
await b.close();
if (echecs.length) {
  console.error('ÉCHECS :\n' + echecs.join('\n'));
  process.exit(1);
}
console.log('tous les gestes passent');
