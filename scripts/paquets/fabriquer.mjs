// `pnpm paquets` : fabrique sur cette machine tous les paquets de l'ordinateur de travail, dans artifacts/ :
// les deux paquets Android signés, puis Debian, rpm et AppImage (recompressée en zstd). Windows se fabrique
// à part, sous Windows. Rien n'est fabriqué si une garde échoue.
import { execFileSync, spawnSync } from 'node:child_process';
import { rmSync } from 'node:fs';
import { chmod, copyFile, mkdir, mkdtemp, open, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { homedir, tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { copierPersonnalisations, verifierPersonnalisations } from '../projet-android.mjs';
import {
  CIBLES_ANDROID,
  codeVersionAndroid,
  lireProprietesCle,
  lireVersion,
  nomPaquet,
  outilsAppimage,
  verifierCle,
} from './regles.mjs';

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
  if (!versions.length) throw new Error(`Outils Android introuvables : aucun dossier build-tools dans ${sdk}.`);
  return join(sdk, 'build-tools', versions.at(-1), 'apksigner');
}

async function fabriquerAndroid(version, contenuCle) {
  if (!(await existe(projetAndroid))) tauri('android', 'init', '--ci', '--skip-targets-install');
  await copierPersonnalisations(racine);
  const fautes = await verifierPersonnalisations(racine);
  if (fautes.length) throw new Error(`Le projet Android n’a pas nos retouches.\n  ${fautes.join('\n  ')}`);
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
      if (apks.length !== 1)
        throw new Error(`Un seul APK de version finale attendu pour ${cible}, trouvé : ${apks.length}.`);
      const destination = join(artifacts, nomPaquet(version, sorte));
      await copyFile(apks[0], destination);
      try {
        lancer(signer, ['verify', destination]);
      } catch {
        await rm(destination, { force: true });
        throw new Error(`Signature de ${nomPaquet(version, sorte)} invalide : paquet retiré.`);
      }
    }
  } finally {
    await rm(motDePasse, { force: true });
  }
}

// Refait l'AppImage de Tauri en zstd niveau 22, blocs de 1 Mo, avec le même lanceur (runtime).
async function recompresserAppimage(source, destination, { appimagetool, dossierOutils }) {
  const extraction = await mkdtemp(join(tmpdir(), 'baluchon-extraction-'));
  try {
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
  }
}

async function fabriquerLinux(version, outils) {
  for (const sorte of ['deb', 'rpm', 'appimage']) await rm(join(bundle, sorte), { recursive: true, force: true });
  tauri('build', '--bundles', 'deb,rpm,appimage');
  const trouver = async (sorte, fin) => {
    const trouves = (await fichiers(join(bundle, sorte))).filter(f => f.endsWith(fin));
    if (trouves.length !== 1)
      throw new Error(`Un seul fichier ${fin} attendu dans ${join(bundle, sorte)}, trouvé : ${trouves.length}.`);
    return trouves[0];
  };
  await copyFile(await trouver('deb', '.deb'), join(artifacts, nomPaquet(version, 'deb')));
  await copyFile(await trouver('rpm', '.rpm'), join(artifacts, nomPaquet(version, 'rpm')));
  outils ??= await outilsAppimage();
  try {
    await recompresserAppimage(
      await trouver('appimage', '.AppImage'),
      join(artifacts, nomPaquet(version, 'appimage')),
      outils,
    );
  } finally {
    await rm(outils.travail, { recursive: true, force: true });
  }
}

// --- Gardes, avant toute fabrication ---
const version = await lireVersion(racine);
const contenuCle = await readFile(cle, 'utf8').catch(() => null);
const fautesCle = verifierCle(contenuCle, cle);
if (fautesCle.length) echec(`Fabrication refusée : la clé de signature n’est pas prête.\n  ${fautesCle.join('\n  ')}`);

// Le fichier de clé existe, le mot de passe et l'alias sont justes : vérifié par keytool, le mot de passe
// passant par l'environnement (jamais en argument, donc jamais visible dans la liste des processus).
{
  const { storeFile, keyAlias, password } = lireProprietesCle(contenuCle);
  if (!(await existe(storeFile)))
    echec(`Fabrication refusée : le fichier de clé « ${storeFile} » (storeFile) est introuvable.`);
  const essai = spawnSync(
    'keytool',
    ['-list', '-keystore', storeFile, '-alias', keyAlias, '-storepass:env', 'BALUCHON_MOT_DE_PASSE'],
    {
      env: { ...process.env, BALUCHON_MOT_DE_PASSE: password },
      encoding: 'utf8',
    },
  );
  if (essai.error) echec(`Fabrication refusée : keytool introuvable (${essai.error.message}).`);
  if (essai.status !== 0)
    echec(
      `Fabrication refusée : la clé ne s'ouvre pas avec ce mot de passe et cet alias (« ${keyAlias} ») dans ${storeFile}.`,
    );
}

// Outils d'AppImage vérifiés avant les ~13 minutes de fabrication ; seul un cache vraiment vide (toute
// première fabrication) reporte la vérification après la fabrication Linux de Tauri, qui le remplit.
let outils = null;
// Le mot de passe en clair et le dossier temporaire des outils ne doivent jamais rester, même sur Ctrl-C.
for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP']) {
  process.on(signal, () => {
    rmSync(motDePasse, { force: true });
    if (outils) rmSync(outils.travail, { recursive: true, force: true });
    process.exit(1);
  });
}
try {
  outils = await outilsAppimage();
} catch (erreur) {
  if (erreur.code !== 'CACHE_VIDE') echec(`Fabrication refusée : ${erreur.message}`);
  console.log(
    'Cache de Tauri vide (première fabrication) : les outils d’AppImage seront vérifiés après la fabrication Linux.',
  );
}
try {
  await mkdir(artifacts, { recursive: true });
  await fabriquerAndroid(version, contenuCle);
  await fabriquerLinux(version, outils);
  outils = null;
} catch (erreur) {
  console.error(`Fabrication arrêtée : ${erreur.message}`);
  if (outils) await rm(outils.travail, { recursive: true, force: true });
  process.exit(1);
}

console.log('\nPaquets fabriqués dans artifacts/ :');
for (const sorte of ['android', 'android-anciens', 'deb', 'rpm', 'appimage']) {
  const nom = nomPaquet(version, sorte);
  const { size } = await stat(join(artifacts, nom));
  console.log(`  ${nom.padEnd(48)} ${(size / 1024 / 1024).toFixed(1).padStart(7)} Mo`);
}
