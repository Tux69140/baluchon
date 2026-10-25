// src/ecrans/alerte.js : le message d'une écriture refusée, en haut de l'écran (Review Focus de la
// tâche 5). Page d'essai : tests/pages/alerte.html.
// - rien d'ouvert : le message est dans #app, affiché (popover ouvert) ;
// - une fiche ouverte : le message est dans la fiche ;
// - une fiche, puis une question par-dessus (posée dans document.body) : le message est dans la
//   question, la fenêtre du dessus, et c'est bien lui qu'on touche à sa place ; un second message
//   remplace le premier, où qu'il soit (un seul dans la page).
import { chromium } from 'playwright';
import { attendreQue, calme } from './outils/attente.mjs';
import { demarrerServeur } from './outils/serveur.mjs';
import { FORMATS, creerJuge, ouvrir } from './outils/page.mjs';

const juge = creerJuge();
const serveur = await demarrerServeur();
const navigateur = await chromium.launch();
const vu = e => JSON.stringify(e);

// Où est le message, et peut-on le lire et le toucher.
const lireAlertes = page =>
  page.evaluate(() => {
    const alertes = [...document.querySelectorAll('.alerte-haut')];
    const alerte = alertes.at(-1);
    const modales = [...document.querySelectorAll('dialog:modal')];
    const r = alerte?.getBoundingClientRect();
    const touchee = r && document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return {
      nombre: alertes.length,
      ouverte: Boolean(alerte?.matches(':popover-open')),
      hote: alerte ? (alerte.closest('dialog')?.querySelector('h2')?.textContent ?? alerte.parentElement.id) : null,
      dessus: modales.at(-1)?.querySelector('h2')?.textContent ?? null,
      visible: Boolean(touchee && alerte.contains(touchee)),
    };
  });

async function ouvrirEssai() {
  const ouvert = await ouvrir(navigateur, serveur.url, {
    taille: FORMATS.telephone,
    theme: 'light',
    adresse: '/tests/pages/alerte.html',
  });
  return ouvert;
}

async function ouvrirModale(page, bouton, titre) {
  await page.click(bouton);
  await attendreQue(page, t => [...document.querySelectorAll('dialog:modal h2')].some(h => h.textContent === t), titre);
  await calme(page);
}

async function alerter(page) {
  await page.evaluate(() => window.alerter());
  await calme(page);
}

try {
  const { page, erreurs, contexte } = await ouvrirEssai();
  await alerter(page);
  const seule = await lireAlertes(page);
  juge.exige(
    seule.nombre === 1 && seule.ouverte && seule.hote === 'app' && seule.visible,
    `rien d’ouvert : ${vu(seule)}`,
  );

  await ouvrirModale(page, '#fiche', 'Fiche');
  await alerter(page);
  const fiche = await lireAlertes(page);
  juge.exige(fiche.nombre === 1 && fiche.ouverte && fiche.hote === 'Fiche' && fiche.visible, `fiche : ${vu(fiche)}`);

  await page.evaluate(() => document.querySelector('#demander').click());
  await attendreQue(page, () =>
    [...document.querySelectorAll('dialog:modal h2')].some(h => h.textContent === 'Question'),
  );
  await calme(page);
  for (const fois of ['premier', 'second']) {
    await alerter(page);
    const question = await lireAlertes(page);
    juge.exige(
      question.nombre === 1 &&
        question.ouverte &&
        question.dessus === 'Question' &&
        question.hote === 'Question' &&
        question.visible,
      `fiche puis question, ${fois} message : ${vu(question)}`,
    );
  }
  juge.exige(erreurs.length === 0, `erreurs dans la page : ${erreurs.join(' | ')}`);
  await contexte.close();
} finally {
  await navigateur.close();
  await serveur.fermer();
}
juge.conclure('Message en haut', 'rien d’ouvert, dans une fiche, dans la question posée par-dessus, un seul à la fois');
