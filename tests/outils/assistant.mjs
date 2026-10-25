// Outils des tests d'écran de l'assistant « Nouveau voyage » (phase 4) : remplir les informations,
// passer à l'aperçu, créer le voyage, et des bibliothèques d'essai tirées de celle de départ.
import { construireBibliotheque } from '../../src/modele/bibliotheque.js';
import { nouvelId } from '../../src/modele/identifiant.js';

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
