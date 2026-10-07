// Le seul endroit qui sait quels fichiers du dépôt sont « du code à nous » : les contrôles le
// partagent pour ne jamais diverger sur ce qu'ils regardent.
import { readdir, readFile } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';

// Dépendances, sorties de construction, projet Android généré et brouillons : pas notre code.
const IGNORES = new Set(['node_modules', 'dist', 'target', 'gen', '.git']);
const ignore = nom => IGNORES.has(nom) || nom.endsWith('-travail');

async function parcourir(dossier) {
  let entrees;
  try {
    entrees = await readdir(dossier, { withFileTypes: true });
  } catch (erreur) {
    // Un fichier seul (index.html) se nomme comme un dossier ; un dossier absent ne contient rien.
    return erreur.code === 'ENOTDIR' ? [dossier] : [];
  }
  const fichiers = [];
  for (const entree of entrees) {
    if (ignore(entree.name)) continue;
    const chemin = join(dossier, entree.name);
    if (entree.isDirectory()) fichiers.push(...(await parcourir(chemin)));
    else fichiers.push(chemin);
  }
  return fichiers;
}

// Fichiers sous `dossiers` (relatifs à la racine), filtrés par extension, triés, chemins relatifs
// écrits avec des « / » pour que les messages se lisent pareil partout.
export async function listerFichiers(racine, dossiers, extensions) {
  const tous = [];
  for (const dossier of dossiers) tous.push(...(await parcourir(join(racine, dossier))));
  return tous
    .filter(chemin => extensions.some(ext => chemin.endsWith(ext)))
    .map(chemin => relative(racine, chemin).split(sep).join('/'))
    .sort();
}

export const lireTexte = (racine, chemin) => readFile(join(racine, chemin), 'utf8');

// Numéro de ligne (à partir de 1) d'une position dans un texte.
export const ligneDe = (texte, position) => texte.slice(0, position).split('\n').length;
