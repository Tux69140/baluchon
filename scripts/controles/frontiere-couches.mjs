// AGENTS.md, « Couches étanches » : aucun écran n'accède à SQLite ni à Tauri, tout passe par la
// couche de stockage ; le modèle est pur (ni affichage, ni stockage, ni traduction) ; le stockage
// ne connaît pas les écrans. Les écrans n'entrent dans le stockage que par sa porte d'entrée.
import { posix } from 'node:path';
import { listerFichiers, lireTexte, ligneDe } from './fichiers.mjs';
import { lireCode } from './litteraux.mjs';

const MODELE = 'src/modele/';
const STOCKAGE = 'src/stockage/';
const ECRANS = 'src/ecrans/';
const PORTE_DU_STOCKAGE = 'src/stockage/index.js';
const IMPORT = /\b(?:from|import)\s*\(?\s*(['"])([^'"]+)\1/g;
// Accès directs aux mémoires de l'appareil ou à Tauri : réservés au stockage.
const ACCES_RESERVE = /\b(localStorage|sessionStorage|indexedDB|__TAURI\w*)\b/g;

function regle(chemin, cible) {
  const relatif = cible.startsWith('.');
  const resolu = relatif ? posix.normalize(posix.join(posix.dirname(chemin), cible)) : cible;
  if (cible.startsWith('@tauri-apps/') && !chemin.startsWith(STOCKAGE)) return 'seul le stockage parle à Tauri';
  if (chemin.startsWith(MODELE) && !(relatif && resolu.startsWith(MODELE)))
    return 'le modèle est pur : il n’importe que le modèle';
  if (chemin.startsWith(STOCKAGE) && (resolu.startsWith(ECRANS) || resolu === 'src/main.js'))
    return 'le stockage ne connaît pas les écrans';
  if (chemin.startsWith(ECRANS) && resolu.startsWith(STOCKAGE) && resolu !== PORTE_DU_STOCKAGE)
    return `les écrans passent par ${PORTE_DU_STOCKAGE}`;
  return null;
}

export async function verifierCouches(racine) {
  const fautes = [];
  for (const chemin of await listerFichiers(racine, ['src'], ['.js'])) {
    const source = await lireTexte(racine, chemin);
    for (const trouve of source.matchAll(IMPORT)) {
      const raison = regle(chemin, trouve[2]);
      if (raison)
        fautes.push(`${chemin}:${ligneDe(source, trouve.index)} — import de ${trouve[2]} interdit : ${raison}`);
    }
    if (chemin.startsWith(STOCKAGE)) continue;
    for (const trouve of lireCode(source).code.matchAll(ACCES_RESERVE)) {
      fautes.push(
        `${chemin}:${ligneDe(source, trouve.index)} — accès direct à ${trouve[1]} interdit : réservé au stockage`,
      );
    }
  }
  return fautes;
}
