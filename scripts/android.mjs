// `pnpm android:essai` : version d'essai Android (non signée pour diffusion), à installer par
// câble sur la tablette. Recrée le projet Android s'il manque, y copie nos retouches (icônes, activité
// principale) et refuse de construire au moindre écart (scripts/projet-android.mjs).
import { execFileSync } from 'node:child_process';
import { access } from 'node:fs/promises';
import { join } from 'node:path';
import { copierPersonnalisations, verifierPersonnalisations } from './projet-android.mjs';

const racine = process.cwd();
const projetAndroid = join(racine, 'src-tauri', 'gen', 'android');
const tauri = (...args) => execFileSync('pnpm', ['exec', 'tauri', ...args], { stdio: 'inherit' });

if (
  !(await access(projetAndroid).then(
    () => true,
    () => false,
  ))
)
  tauri('android', 'init', '--ci', '--skip-targets-install');
await copierPersonnalisations(racine);
const fautes = await verifierPersonnalisations(racine);
if (fautes.length) {
  console.error(`Construction refusée : le projet Android n’a pas nos retouches.\n  ${fautes.join('\n  ')}`);
  process.exit(1);
}
tauri('android', 'build', '--debug', '--apk', '--target', 'aarch64', '--ci');
console.log(
  `Version d’essai : ${join(projetAndroid, 'app', 'build', 'outputs', 'apk', 'universal', 'debug', 'app-universal-debug.apk')}`,
);
