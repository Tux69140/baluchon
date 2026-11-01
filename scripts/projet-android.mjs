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

// Déposer un fichier dans Téléchargements (phase 12) : jusqu'à Android 9, écrire demande l'autorisation
// d'écrire ; et déclarer le fichier comme téléchargement terminé (DownloadManager.addCompletedDownload,
// sans quoi le raccourci « Téléchargements » du sélecteur ne le montre pas) lève une SecurityException
// sans la seconde (essai du 31 octobre 2026). Le manifeste est recréé par « tauri android init ».
const MANIFESTE = join('src-tauri', 'gen', 'android', 'app', 'src', 'main', 'AndroidManifest.xml');
const PERMISSIONS = [
  '<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" android:maxSdkVersion="28" />',
  '<uses-permission android:name="android.permission.DOWNLOAD_WITHOUT_NOTIFICATION" />',
];

// Pose celles qui manquent juste avant « <application » ; une déjà présente (ajoutée à la main) reste seule.
function ajouterPermissions(manifeste) {
  const manquantes = PERMISSIONS.filter(permission => !manifeste.includes(permission));
  if (!manquantes.length) return manifeste;
  if (!manifeste.includes('<application'))
    throw new Error(`${enClair(MANIFESTE)} : repère « <application » introuvable.`);
  const lignes = manquantes.map(permission => `    ${permission}`).join('\n');
  // Une seule ligne vide avant « <application » : celle qui y était déjà est refaite après les autorisations.
  return manifeste.replace(/\n*^( *)<application/m, `\n${lignes}\n\n$1<application`);
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
  const manifeste = await readFile(join(racine, MANIFESTE), 'utf8');
  await writeFile(join(racine, MANIFESTE), ajouterPermissions(manifeste));
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
  const manifeste = await readFile(join(racine, MANIFESTE), 'utf8').catch(() => '');
  for (const permission of PERMISSIONS)
    if (!manifeste.includes(permission))
      fautes.push(`AndroidManifest.xml : ${permission.match(/android\.permission\.(\w+)/)[1]} absente`);
  return fautes;
}
