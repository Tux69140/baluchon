// Outils des tests d'écran de l'assistant « Nouveau voyage » (phase 4) : remplir les informations,
// passer à l'aperçu, créer le voyage, des bibliothèques d'essai tirées de celle de départ, le retour
// système et les questions posées par-dessus (abandon, objets écartés).
import { construireBibliotheque } from '../../src/modele/bibliotheque.js';
import { nouvelId } from '../../src/modele/identifiant.js';
import { attendreQue, calme } from './attente.mjs';

// La saisie est faite (nom, dates) : « Voir l'aperçu » mène à l'aperçu (sauf si l'on y est déjà), puis
// « Créer le voyage ». S'il n'y a aucun groupe d'étiquettes, « Voir l'aperçu » est le bouton
// « suivant » lui-même. double : deux appuis rapprochés sur « Créer le voyage ».
export async function creerDepuisLAssistant(page, { double = false } = {}) {
  if (!(await page.locator('.formulaire-corps[data-etape="apercu"]').count())) {
    const apercu = page.locator('[data-action="apercu"]');
    await ((await apercu.count()) ? apercu : page.locator('[data-action="suivant"]')).click();
    await page.waitForSelector('.formulaire-corps[data-etape="apercu"]');
  }
  if (double) await page.dblclick('[data-action="creer"]');
  else await page.click('[data-action="creer"]');
}

// Une bibliothèque d'essai, à déposer avant le chargement : l'appli ne la remplace pas.
export const avecBibliotheque = bibliotheque => ({
  bibliotheque,
  meta: { bibliothequeInstallee: true, langueBibliotheque: 'fr' },
});

const construire = depart => construireBibliotheque(depart, { nouvelId, maintenant: 'x' });

// L'ancienne mini-bibliothèque (phase 2) : aucun groupe, aucune étiquette, tout est « toujours inclus ».
export const sansGroupe = depart =>
  construire({
    groupes: [],
    categories: depart.categories
      .filter(c => !c.etiquettes)
      .map(c => ({ ...c, objets: c.objets.filter(o => !o.etiquettes) })),
  });

// Toutes les catégories liées à Plage : sans Plage choisie, rien n'entre dans l'aperçu.
export const rienNEntre = depart =>
  construire({ ...depart, categories: depart.categories.map(c => ({ ...c, etiquettes: ['plage'] })) });

// La fenêtre de question posée par-dessus l'assistant (abandon, objets écartés) : son titre, ses
// boutons dans l'ordre, sa liste d'objets écartés (nom, catégorie) et les balises qu'un nom aurait fait
// naître dans cette liste ; null si aucune n'est ouverte.
export const question = page =>
  page.evaluate(() => {
    const fenetre = document.querySelector('dialog[role="alertdialog"][open]');
    if (!fenetre) return null;
    return {
      titre: fenetre.querySelector('h2').textContent.trim(),
      boutons: [...fenetre.querySelectorAll('.fenetre-pied button')].map(b => ({
        texte: b.textContent.trim(),
        principal: b.classList.contains('bouton-principal'),
      })),
      liste: [...fenetre.querySelectorAll('.liste-ecartes li')].map(li => [...li.children].map(e => e.textContent)),
      balises: fenetre.querySelectorAll('.liste-ecartes li > * *').length,
    };
  });

// La question attendue (rend null si elle ne vient pas), l'écran calmé.
export async function attendreQuestion(page) {
  await attendreQue(page, () => document.querySelector('dialog[role="alertdialog"][open]') !== null);
  await calme(page);
  return question(page);
}

// Toucher un bouton de la question par son libellé, puis attendre qu'elle soit partie. Sans question
// ouverte, rien n'est touché : c'est au test d'avoir jugé son absence.
export async function repondre(page, libelle) {
  if (!(await question(page))) return;
  await page.click(`dialog[role="alertdialog"] .fenetre-pied button:text-is("${libelle}")`);
  await attendreQue(page, () => !document.querySelector('dialog[role="alertdialog"]'));
  await calme(page);
}

// Le retour système (Android, ou celui du navigateur) quand il reste dans l'appli : l'écran calmé.
export async function retourDansLAssistant(page) {
  await page.goBack({ timeout: 3000 }).catch(() => null);
  await calme(page);
}

// L'étape affichée (infos, groupe ou apercu) et son titre.
export const etapeAffichee = page =>
  page.evaluate(() => ({
    etape: document.querySelector('.formulaire-corps')?.dataset.etape ?? null,
    titre: document.querySelector('#titre-etape')?.textContent.trim() ?? null,
  }));

// La ligne d'un objet de l'aperçu, par son nom affiché.
export const ligneObjet = (page, nom) =>
  page.locator('[data-objet]').filter({ has: page.locator('.objet-nom').getByText(nom, { exact: true }) });

// La question ouverte tient dans l'écran et ses boutons offrent des cibles de 44 px (verifierCommandes
// ne regarde que #app ; la question est posée dans document.body).
export async function verifierQuestion(page, juge, cas) {
  const m = await page.evaluate(() => {
    const fenetre = document.querySelector('dialog[role="alertdialog"][open]');
    const r = fenetre.getBoundingClientRect();
    return {
      petits: [...fenetre.querySelectorAll('button')]
        .filter(b => b.getBoundingClientRect().height < 43.5 || b.getBoundingClientRect().width < 43.5)
        .map(b => b.textContent.trim()),
      dehors: r.left < 0 || r.top < 0 || r.right > innerWidth || r.bottom > innerHeight,
      debordement: fenetre.scrollWidth - fenetre.clientWidth,
    };
  });
  juge.exige(m.petits.length === 0, `${cas} : boutons de moins de 44 px : ${m.petits.join(', ')}`);
  juge.exige(!m.dehors && m.debordement <= 0, `${cas} : la question sort de l’écran ${JSON.stringify(m)}`);
}

// Les boutons de la question ouverte : « cote » = tous sur une ligne (même haut), « empile » = chacun sur
// sa ligne, sur toute la largeur du pied de la fenêtre (ni 2+1, ni demi-largeur orpheline).
export async function verifierPiedQuestion(page, juge, cas, attendu) {
  const m = await page.evaluate(() => {
    const pied = document.querySelector('dialog[role="alertdialog"][open] .fenetre-pied');
    const style = getComputedStyle(pied);
    const p = pied.getBoundingClientRect();
    return {
      largeurPied: p.width - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight),
      boutons: [...pied.querySelectorAll('button')].map(b => {
        const r = b.getBoundingClientRect();
        return { haut: Math.round(r.top), largeur: Math.round(r.width) };
      }),
    };
  });
  const hauts = new Set(m.boutons.map(b => b.haut));
  const detail = JSON.stringify(m);
  if (attendu === 'cote') juge.exige(hauts.size === 1, `${cas} : les boutons devraient tenir côte à côte ${detail}`);
  else
    juge.exige(
      hauts.size === m.boutons.length && m.boutons.every(b => Math.abs(b.largeur - m.largeurPied) <= 1),
      `${cas} : les boutons devraient être l'un sous l'autre, pleine largeur ${detail}`,
    );
}
