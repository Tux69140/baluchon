// Nos retouches du projet Android. « tauri android init » recrée src-tauri/gen/android (hors git)
// avec l'icône Tauri et sa propre activité principale : nos versions vivent dans nos sources et y
// sont recopiées avant chaque construction (scripts/android.mjs), puis vérifiées à l'identique.
import { cp, readFile, readdir } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';

const PRINCIPAL = join('src-tauri', 'gen', 'android', 'app', 'src', 'main');
// Chaque source (dans nos fichiers) et sa place dans le projet Android.
const PERSONNALISATIONS = [
  // Icônes produites par `pnpm icones` depuis src-tauri/icons/source/.
  { source: join('src-tauri', 'icons', 'android'), cible: join(PRINCIPAL, 'res') },
  { source: join('src-tauri', 'android', 'java'), cible: join(PRINCIPAL, 'java') },
];

const enClair = chemin => chemin.split(sep).join('/');

async function lister(dossier) {
  const entrees = await readdir(dossier, { withFileTypes: true, recursive: true }).catch(() => []);
  return entrees
    .filter(e => e.isFile())
    .map(e => relative(dossier, join(e.parentPath, e.name)))
    .sort();
}

export async function copierPersonnalisations(racine) {
  for (const { source, cible } of PERSONNALISATIONS) {
    await cp(join(racine, source), join(racine, cible), { recursive: true, force: true });
  }
}

// Chaque fichier de nos sources doit se retrouver à l'identique dans le projet Android.
export async function verifierPersonnalisations(racine) {
  const fautes = [];
  for (const { source, cible } of PERSONNALISATIONS) {
    const fichiers = await lister(join(racine, source));
    if (!fichiers.length) fautes.push(`${enClair(source)} est vide : rien à copier (pour les icônes : pnpm icones)`);
    for (const fichier of fichiers) {
      const attendu = await readFile(join(racine, source, fichier));
      const present = await readFile(join(racine, cible, fichier)).catch(() => null);
      if (!present?.equals(attendu))
        fautes.push(`${enClair(fichier)} : ${present ? 'différent' : 'absent'} dans le projet Android`);
    }
  }
  return fautes;
}
