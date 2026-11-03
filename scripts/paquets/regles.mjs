// Règles des paquets installables : version, numéro interne Android, noms, clé de signature, garde GitHub
// et outils d'AppImage. Une seule définition de chaque règle, pour les scripts de fabrication.
import { execFile } from 'node:child_process';
import { access, mkdtemp, readFile, rm } from 'node:fs/promises';
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

// La version de référence est celle de package.json ; Cargo.toml (section [package]) et Cargo.lock doivent la porter aussi.
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
  // Cargo.lock (commité) porte aussi la version du paquet : un oubli donnerait un dépôt qui change tout seul.
  const verrou = await readFile(join(racine, 'src-tauri', 'Cargo.lock'), 'utf8').catch(() => null);
  const dansVerrou = verrou && /^name\s*=\s*"baluchon"\s*\r?\nversion\s*=\s*"([^"]*)"/m.exec(verrou);
  if (dansVerrou && dansVerrou[1] !== npm) {
    throw new Error(
      `Versions différentes : package.json porte ${npm}, src-tauri/Cargo.lock porte ${dansVerrou[1]} pour le paquet baluchon. Lancer « cargo update -p baluchon --manifest-path src-tauri/Cargo.toml » (ou une construction), puis commiter src-tauri/Cargo.lock.`,
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

// Les lignes `nom=valeur` du fichier de clé.
export function lireProprietesCle(contenu) {
  return Object.fromEntries(
    contenu
      .split(/\r?\n/)
      .map(ligne => /^\s*([^#=\s][^=]*?)\s*=(.*)$/.exec(ligne))
      .filter(Boolean)
      .map(m => [m[1], m[2].trim()]),
  );
}

// Fautes de la clé de signature, avant toute fabrication. `contenu` est null si le fichier est absent.
// Le mot de passe n'est jamais écrit dans ce fichier : il est tapé à chaque fabrication (choix du chef de projet).
export function verifierCle(contenu, cheminProprietes) {
  if (contenu === null) return [`Fichier de clé absent : ${cheminProprietes}`];
  const valeurs = lireProprietesCle(contenu);
  const fautes = ['storeFile', 'keyAlias']
    .filter(cle => !valeurs[cle])
    .map(cle => `Clé « ${cle} » manquante ou vide dans ${cheminProprietes}`);
  if (contenu.split(/\r?\n/).some(ligne => /^\s*[#!]?\s*password\b/i.test(ligne)))
    fautes.push(`Le mot de passe ne doit pas être écrit dans ${cheminProprietes} : retirer la ligne « password ».`);
  return fautes;
}

// Contenu du fichier lu par Android pour signer : la clé de `contenuCle` et le mot de passe tapé. Android lit
// ce fichier en format « properties » de Java (\ y est un échappement, les espaces des bords sont perdus) et
// la clé PKCS12 n'accepte que l'ASCII : un tel mot de passe ne pourrait pas être celui de la clé.
export function fichierSignature(contenuCle, motDePasse) {
  if (!/^[!-~](?:[ -~]*[!-~])?$/.test(motDePasse) || motDePasse.includes('\\'))
    throw new Error(
      'Mot de passe illisible pour Android (vide, accent, \\ ou espace au bord) : ce ne peut pas être celui de la clé.',
    );
  const { storeFile, keyAlias } = lireProprietesCle(contenuCle);
  return `storeFile=${storeFile}\nkeyAlias=${keyAlias}\npassword=${motDePasse}\n`;
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
    throw Object.assign(
      new Error(
        'Outils AppImage introuvables : lancer « pnpm paquets » avec le réseau ouvert : la première fabrication de Tauri remplit ce cache.',
      ),
      { code: 'CACHE_VIDE' },
    );
  }
  const travail = await mkdtemp(join(tmpdir(), 'baluchon-appimage-'));
  try {
    await executer(greffon, ['--appimage-extract'], { cwd: travail });
    const dossierOutils = join(travail, 'squashfs-root', 'appimagetool-prefix', 'usr', 'bin');
    const appimagetool = join(dossierOutils, 'appimagetool');
    await access(appimagetool);
    // `travail` : dossier temporaire à effacer par l'appelant quand il a fini.
    return { appimagetool, dossierOutils, travail };
  } catch (erreur) {
    await rm(travail, { recursive: true, force: true });
    throw new Error(`Outils AppImage inutilisables (extraction du cache de Tauri) : ${erreur.message}`);
  }
}
