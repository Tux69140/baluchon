// Règles des paquets installables : version, numéro interne Android, noms, clé de signature, garde GitHub
// et outils d'AppImage. Une seule définition de chaque règle, pour les scripts de fabrication.
import { execFile } from 'node:child_process';
import { access, mkdtemp, readFile } from 'node:fs/promises';
import { homedir, tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';

const executer = promisify(execFile);
const VERSION = /^(\d+)\.(\d+)\.(\d+)$/;
const PLAFOND_ANDROID = 2_100_000_000;

export const CIBLES_ANDROID = [
  { cible: 'aarch64', architecture: 'arm64', sorte: 'android' },
  { cible: 'armv7', architecture: 'arm', sorte: 'android-anciens' },
];

// La version de référence est celle de package.json ; Cargo.toml (section [package]) doit la porter aussi.
export async function lireVersion(racine) {
  const npm = JSON.parse(await readFile(join(racine, 'package.json'), 'utf8')).version;
  if (!VERSION.test(npm))
    throw new Error(`La version « ${npm} » de package.json doit s’écrire x.y.z (par exemple 0.1.0).`);
  const cargo = await readFile(join(racine, 'src-tauri', 'Cargo.toml'), 'utf8');
  const section = /^\[package\]\s*$([\s\S]*?)(?=^\[|(?![\s\S]))/m.exec(cargo);
  const version = section && /^version\s*=\s*"([^"]*)"/m.exec(section[1]);
  if (!version || version[1] !== npm) {
    throw new Error(
      `Versions différentes : package.json porte ${npm}, src-tauri/Cargo.toml porte ${version ? version[1] : 'aucune version'}. Les aligner avant de fabriquer.`,
    );
  }
  return npm;
}

// (majeur × 1 000 000 + mineur × 1 000 + correctif) × 10, plus 2 pour le 64 bits et 1 pour le 32 bits.
export function codeVersionAndroid(version, architecture) {
  const morceaux = VERSION.exec(version);
  if (!morceaux) throw new Error(`La version « ${version} » doit s’écrire x.y.z (par exemple 0.1.0).`);
  const [majeur, mineur, correctif] = morceaux.slice(1).map(Number);
  const code = (majeur * 1_000_000 + mineur * 1_000 + correctif) * 10 + (architecture === 'arm64' ? 2 : 1);
  if (code > PLAFOND_ANDROID) throw new Error(`La version ${version} dépasse le plafond d’Android (2 100 000 000).`);
  return code;
}

const NOMS = {
  android: v => `baluchon-${v}.apk`,
  'android-anciens': v => `baluchon-${v}-anciens-appareils.apk`,
  deb: v => `baluchon-${v}-amd64.deb`,
  rpm: v => `baluchon-${v}.x86_64.rpm`,
  appimage: v => `baluchon-${v}-x86_64.AppImage`,
  windows: v => `baluchon-${v}-x64-setup.exe`,
};

export function nomPaquet(version, sorte) {
  if (!NOMS[sorte]) throw new Error(`Sorte de paquet inconnue : « ${sorte} ».`);
  return NOMS[sorte](version);
}

// Fautes de la clé de signature, avant toute fabrication. `contenu` est null si le fichier est absent.
export function verifierCle(contenu, cheminProprietes) {
  if (contenu === null) return [`Fichier de clé absent : ${cheminProprietes}`];
  const valeurs = Object.fromEntries(
    contenu
      .split(/\r?\n/)
      .map(ligne => /^\s*([^#=\s][^=]*?)\s*=(.*)$/.exec(ligne))
      .filter(Boolean)
      .map(m => [m[1], m[2].trim()]),
  );
  return ['storeFile', 'keyAlias', 'password']
    .filter(cle => !valeurs[cle])
    .map(cle => `Clé « ${cle} » manquante ou vide dans ${cheminProprietes}`);
}

// La première fabrication de Paré (22/10/2026) s'est faite sur un dépôt en retard sur GitHub. La fabrication
// refuse de tourner sans avoir vérifié que la branche locale a tout ce que GitHub a.
// `git` lance une commande git et rend sa sortie (lève en cas d'échec).
export function verifierAJourAvecGithub(git) {
  let amont;
  try {
    amont = git(['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{u}']);
  } catch {
    throw new Error(
      'Cette branche ne suit aucune branche de GitHub : impossible de vérifier qu’elle est à jour. Fabrication arrêtée.',
    );
  }
  try {
    git(['fetch', '--quiet']);
  } catch {
    throw new Error(
      'GitHub ne répond pas (pas de réseau ?) : impossible de vérifier que ce poste a la dernière version. Fabrication arrêtée ; réessayer une fois connecté.',
    );
  }
  const retard = Number(git(['rev-list', '--count', 'HEAD..@{u}']));
  if (retard > 0)
    throw new Error(
      `Ce poste a ${retard} modification${retard > 1 ? 's' : ''} de retard sur GitHub (${amont}) : lancer « git pull » puis « pnpm install », et refabriquer.`,
    );
}

const CACHE_TAURI = join(homedir(), '.cache', 'tauri');

// Tauri laisse dans son cache le greffon AppImage de linuxdeploy ; il contient appimagetool et mksquashfs,
// qu'on extrait dans un dossier temporaire pour refaire l'AppImage en zstd.
export async function outilsAppimage(cache = CACHE_TAURI) {
  const greffon = join(cache, 'linuxdeploy-plugin-appimage.AppImage');
  try {
    await access(greffon);
  } catch {
    throw new Error(
      'Outils AppImage introuvables : lancer « pnpm paquets » avec le réseau ouvert : la première fabrication de Tauri remplit ce cache.',
    );
  }
  const travail = await mkdtemp(join(tmpdir(), 'baluchon-appimage-'));
  await executer(greffon, ['--appimage-extract'], { cwd: travail });
  const dossierOutils = join(travail, 'squashfs-root', 'appimagetool-prefix', 'usr', 'bin');
  return { appimagetool: join(dossierOutils, 'appimagetool'), dossierOutils };
}
