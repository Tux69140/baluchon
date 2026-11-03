// `pnpm paquets` : fabrique sur cette machine tous les paquets de l'ordinateur de travail, dans artifacts/ :
// les deux paquets Android signés, puis Debian, rpm et AppImage (recompressée en zstd). Windows se fabrique
// à part, sous Windows. Rien n'est fabriqué si une garde échoue.
import { execFileSync } from 'node:child_process';
import { chmod, copyFile, mkdir, mkdtemp, open, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { homedir, tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { copierPersonnalisations, verifierPersonnalisations } from '../projet-android.mjs';
import { CIBLES_ANDROID, codeVersionAndroid, lireVersion, nomPaquet, outilsAppimage, verifierCle } from './regles.mjs';

const racine = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const artifacts = join(racine, 'artifacts');
const projetAndroid = join(racine, 'src-tauri', 'gen', 'android');
const motDePasse = join(projetAndroid, 'keystore.properties');
const bundle = join(racine, 'src-tauri', 'target', 'release', 'bundle');
const cle = process.env.BALUCHON_CLE || join(homedir(), '.local', 'share', 'baluchon', 'cle.properties');

const echec = message => {
  console.error(message);
  process.exit(1);
};
const lancer = (commande, args, options = {}) => execFileSync(commande, args, { stdio: 'inherit', ...options });
const tauri = (...args) => lancer('pnpm', ['exec', 'tauri', ...args], { cwd: racine });
const existe = chemin =>
  stat(chemin).then(
    () => true,
    () => false,
  );

// Tous les fichiers d'un dossier, en profondeur (dossier absent : liste vide).
async function fichiers(dossier) {
  const entrees = await readdir(dossier, { withFileTypes: true }).catch(() => []);
  const suites = await Promise.all(
    entrees.map(e => (e.isDirectory() ? fichiers(join(dossier, e.name)) : [join(dossier, e.name)])),
  );
  return suites.flat();
}

// apksigner de la version la plus récente des build-tools.
async function apksigner() {
  const sdk = process.env.ANDROID_HOME || join(homedir(), 'Android', 'Sdk');
  const versions = (await readdir(join(sdk, 'build-tools')).catch(() => [])).sort((a, b) =>
    a.localeCompare(b, undefined, { numeric: true }),
  );
  if (!versions.length) echec(`Outils Android introuvables : aucun dossier build-tools dans ${sdk}.`);
  return join(sdk, 'build-tools', versions.at(-1), 'apksigner');
}

async function fabriquerAndroid(version, contenuCle) {
  if (!(await existe(projetAndroid))) tauri('android', 'init', '--ci', '--skip-targets-install');
  await copierPersonnalisations(racine);
  const fautes = await verifierPersonnalisations(racine);
  if (fautes.length) echec(`Fabrication refusée : le projet Android n’a pas nos retouches.\n  ${fautes.join('\n  ')}`);
  const signer = await apksigner();
  await writeFile(motDePasse, contenuCle, { mode: 0o600 });
  try {
    for (const { cible, architecture, sorte } of CIBLES_ANDROID) {
      const code = codeVersionAndroid(version, architecture);
      const sorties = join(projetAndroid, 'app', 'build', 'outputs', 'apk');
      await rm(sorties, { recursive: true, force: true });
      const config = `{"bundle":{"android":{"versionCode":${code}}}}`;
      tauri('android', 'build', '--apk', '--ci', '--target', cible, '--config', config);
      const apks = (await fichiers(sorties)).filter(f => f.endsWith('.apk') && f.includes('release'));
      if (apks.length !== 1) echec(`Un seul APK de version finale attendu pour ${cible}, trouvé : ${apks.length}.`);
      const destination = join(artifacts, nomPaquet(version, sorte));
      await copyFile(apks[0], destination);
      try {
        lancer(signer, ['verify', destination]);
      } catch {
        await rm(destination, { force: true });
        echec(`Signature de ${nomPaquet(version, sorte)} invalide : paquet retiré.`);
      }
    }
  } finally {
    await rm(motDePasse, { force: true });
  }
}

// Refait l'AppImage de Tauri en zstd niveau 22, blocs de 1 Mo, avec le même lanceur (runtime).
async function recompresserAppimage(source, destination) {
  const { appimagetool, dossierOutils } = await outilsAppimage();
  // outilsAppimage extrait dans <temporaire>/squashfs-root/appimagetool-prefix/usr/bin et ne nettoie pas.
  const travail = resolve(dossierOutils, '..', '..', '..', '..');
  const extraction = await mkdtemp(join(tmpdir(), 'baluchon-extraction-'));
  try {
    if (!(await existe(appimagetool))) echec(`Outil introuvable après extraction : ${appimagetool}`);
    await chmod(source, 0o755);
    const decalage = Number(execFileSync(source, ['--appimage-offset'], { encoding: 'utf8' }).trim());
    lancer(source, ['--appimage-extract'], { cwd: extraction, stdio: 'ignore' });
    const lanceur = join(extraction, 'lanceur');
    const fichier = await open(source, 'r');
    try {
      const octets = Buffer.alloc(decalage);
      await fichier.read(octets, 0, decalage, 0);
      await writeFile(lanceur, octets);
    } finally {
      await fichier.close();
    }
    lancer(
      appimagetool,
      [
        ...['--runtime-file', lanceur, '--comp', 'zstd'],
        ...['--mksquashfs-opt', '-Xcompression-level', '--mksquashfs-opt', '22'],
        ...['--mksquashfs-opt', '-b', '--mksquashfs-opt', '1M'],
        join(extraction, 'squashfs-root'),
        destination,
      ],
      { env: { ...process.env, ARCH: 'x86_64', PATH: `${dossierOutils}:${process.env.PATH}` } },
    );
  } finally {
    await rm(extraction, { recursive: true, force: true });
    if (basename(travail).startsWith('baluchon-appimage-')) await rm(travail, { recursive: true, force: true });
  }
}

async function fabriquerLinux(version) {
  for (const sorte of ['deb', 'rpm', 'appimage']) await rm(join(bundle, sorte), { recursive: true, force: true });
  tauri('build', '--bundles', 'deb,rpm,appimage');
  const trouver = async (sorte, fin) => {
    const trouves = (await fichiers(join(bundle, sorte))).filter(f => f.endsWith(fin));
    if (trouves.length !== 1)
      echec(`Un seul fichier ${fin} attendu dans ${join(bundle, sorte)}, trouvé : ${trouves.length}.`);
    return trouves[0];
  };
  await copyFile(await trouver('deb', '.deb'), join(artifacts, nomPaquet(version, 'deb')));
  await copyFile(await trouver('rpm', '.rpm'), join(artifacts, nomPaquet(version, 'rpm')));
  await recompresserAppimage(await trouver('appimage', '.AppImage'), join(artifacts, nomPaquet(version, 'appimage')));
}

// --- Gardes, avant toute fabrication ---
const version = await lireVersion(racine);
const contenuCle = await readFile(cle, 'utf8').catch(() => null);
const fautesCle = verifierCle(contenuCle, cle);
if (fautesCle.length) echec(`Fabrication refusée : la clé de signature n’est pas prête.\n  ${fautesCle.join('\n  ')}`);

await mkdir(artifacts, { recursive: true });
await fabriquerAndroid(version, contenuCle);
await fabriquerLinux(version);

console.log('\nPaquets fabriqués dans artifacts/ :');
for (const sorte of ['android', 'android-anciens', 'deb', 'rpm', 'appimage']) {
  const nom = nomPaquet(version, sorte);
  const { size } = await stat(join(artifacts, nom));
  console.log(`  ${nom.padEnd(48)} ${(size / 1024 / 1024).toFixed(1).padStart(7)} Mo`);
}
