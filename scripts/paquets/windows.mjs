// `pnpm paquets:windows` : fabrique l'installateur Windows (NSIS) dans artifacts/. À lancer sous Windows,
// sur un dépôt cloné depuis GitHub ; ailleurs, le script refuse proprement.
import { execFileSync } from 'node:child_process';
import { copyFile, mkdir, readdir, rm } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { lireVersion, nomPaquet, verifierAJourAvecGithub } from './regles.mjs';

const racine = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const dossierNsis = join(racine, 'src-tauri', 'target', 'release', 'bundle', 'nsis');

async function fabriquerWindows() {
  if (process.platform !== 'win32') throw new Error('Le paquet Windows se fabrique sous Windows.');
  const version = await lireVersion(racine);
  verifierAJourAvecGithub(args =>
    execFileSync('git', args, { cwd: racine, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim(),
  );
  // Tauri ne vide pas ce dossier : sans cela, l'installateur d'une version précédente fausserait le compte.
  await rm(dossierNsis, { recursive: true, force: true });
  // Le CLI de Tauri est lancé par Node lui-même : sous Windows, `pnpm exec` passerait par un shell.
  execFileSync(
    process.execPath,
    [join(racine, 'node_modules', '@tauri-apps', 'cli', 'tauri.js'), 'build', '--bundles', 'nsis'],
    { cwd: racine, stdio: 'inherit' },
  );
  const installateurs = (await readdir(dossierNsis).catch(() => [])).filter(nom => nom.endsWith('.exe'));
  if (installateurs.length !== 1)
    throw new Error(
      `Un seul installateur .exe était attendu dans ${dossierNsis}, il y en a ${installateurs.length}. Vider ce dossier et refabriquer.`,
    );
  const destination = join(racine, 'artifacts', nomPaquet(version, 'windows'));
  await mkdir(dirname(destination), { recursive: true });
  await copyFile(join(dossierNsis, installateurs[0]), destination);
  console.log(`Installateur Windows ${version} prêt : ${destination}`);
}

// Rien ne se lance quand un test importe ce fichier : seulement quand Node l'exécute.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  fabriquerWindows().catch(erreur => {
    console.error(erreur.message);
    process.exit(1);
  });
}
