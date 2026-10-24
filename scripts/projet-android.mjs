// Nos retouches du projet Android. « tauri android init » recrée src-tauri/gen/android (hors git)
// avec l'icône Tauri et sa propre activité principale : nos versions vivent dans nos sources et y
// sont recopiées avant chaque construction (scripts/android.mjs), puis vérifiées à l'identique.
import { cp, readFile, readdir, writeFile } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';

const PRINCIPAL = join('src-tauri', 'gen', 'android', 'app', 'src', 'main');
// Chaque source (dans nos fichiers) et sa place dans le projet Android.
const PERSONNALISATIONS = [
  // Icônes produites par `pnpm icones` depuis src-tauri/icons/source/.
  { source: join('src-tauri', 'icons', 'android'), cible: join(PRINCIPAL, 'res') },
  { source: join('src-tauri', 'android', 'java'), cible: join(PRINCIPAL, 'java') },
];

const enClair = chemin => chemin.split(sep).join('/');

// Le socle Android de Tauri tire Jackson 2.15, qui exige Android 8 depuis la 2.14 : Baluchon plantait
// à l'ouverture sous Android 7 (java.lang.BootstrapMethodError introuvable, 24 octobre 2026), que le
// projet déclare pourtant (minSdk 24). Le fichier de construction impose une version d'avant ce
// relèvement, que le socle accepte.
const GRADLE = join('src-tauri', 'gen', 'android', 'app', 'build.gradle.kts');
const JACKSON_ANDROID_7 = '2.13.5';
const PIECES_JACKSON = [
  'com.fasterxml.jackson.core:jackson-databind',
  'com.fasterxml.jackson.core:jackson-core',
  'com.fasterxml.jackson.core:jackson-annotations',
  'com.fasterxml.jackson.datatype:jackson-datatype-json-org',
];
const BLOC_JACKSON = [
  '// Baluchon sur Android 7 : Jackson imposé (scripts/projet-android.mjs).',
  'configurations.all {',
  '    resolutionStrategy.force(',
  PIECES_JACKSON.map(piece => `        "${piece}:${JACKSON_ANDROID_7}"`).join(',\n'),
  '    )',
  '}',
  '',
].join('\n');

function imposerJackson(gradle) {
  if (gradle.includes(BLOC_JACKSON)) return gradle;
  if (!gradle.includes('\nrust {')) throw new Error(`${enClair(GRADLE)} : repère « rust { » introuvable.`);
  return gradle.replace('\nrust {', `\n${BLOC_JACKSON}\nrust {`);
}

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
  const gradle = await readFile(join(racine, GRADLE), 'utf8');
  await writeFile(join(racine, GRADLE), imposerJackson(gradle));
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
  const gradle = await readFile(join(racine, GRADLE), 'utf8').catch(() => '');
  if (!gradle.includes(BLOC_JACKSON)) fautes.push('build.gradle.kts : Jackson n’est pas imposé (Android 7)');
  return fautes;
}
