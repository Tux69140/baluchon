// La langue d'essai des tests d'écran : « eo » (espéranto), le français de src/i18n/fr.json dont chaque texte,
// bibliothèque de départ comprise, est précédé de « ⟦eo⟧ ». Les {valeurs} sont gardées : seul le début change,
// et un texte resté en français à l'écran se voit aussitôt. Écrite dans tests/langues/ (ignoré par git, jamais
// publié) ; Vite ne la charge qu'en mode « essai » (src/i18n/dictionnaires.js).
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { RACINE } from './page.mjs';

export const MARQUE_ESSAI = '⟦eo⟧ ';

const marquer = valeur => {
  if (typeof valeur === 'string') return MARQUE_ESSAI + valeur;
  return Object.fromEntries(Object.entries(valeur).map(([cle, suite]) => [cle, marquer(suite)]));
};

export async function ecrireLangueEssai() {
  const francais = JSON.parse(await readFile(join(RACINE, 'src/i18n/fr.json'), 'utf8'));
  const fichier = join(RACINE, 'tests/langues/eo.json');
  const contenu = JSON.stringify(marquer(francais), null, 2) + '\n';
  // Réécrit seulement s'il manque ou diffère : les serveurs d'essai déjà lancés surveillent ce dossier, et
  // une réécriture identique rechargerait leurs pages en plein test.
  if ((await readFile(fichier, 'utf8').catch(() => null)) === contenu) return;
  await mkdir(join(RACINE, 'tests/langues'), { recursive: true });
  await writeFile(fichier, contenu);
}
