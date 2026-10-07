// `pnpm icones` : toutes les icônes de l'appli depuis nos sources (src-tauri/icons/source/).
// « tauri icon » dépose les icônes Android directement dans le projet Android quand il existe, et
// ailleurs sinon : on le fait donc produire dans un dossier temporaire, puis on range toujours au
// même endroit — bureau dans src-tauri/icons, Android dans src-tauri/icons/android. Le projet
// Android les reçoit ensuite par copie (scripts/projet-android.mjs).
import { execFileSync } from 'node:child_process';
import { cp, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const racine = process.cwd();
const icones = join(racine, 'src-tauri', 'icons');
const BUREAU = ['32x32.png', '64x64.png', '128x128.png', '128x128@2x.png', 'icon.png', 'icon.icns', 'icon.ico'];

const sortie = await mkdtemp(join(tmpdir(), 'baluchon-icones-'));
try {
  execFileSync('pnpm', ['exec', 'tauri', 'icon', join(icones, 'source', 'icone.manifeste.json'), '--output', sortie], {
    stdio: 'inherit',
  });
  for (const fichier of BUREAU) await cp(join(sortie, fichier), join(icones, fichier));
  await rm(join(icones, 'android'), { recursive: true, force: true });
  await cp(join(sortie, 'android'), join(icones, 'android'), { recursive: true });
} finally {
  await rm(sortie, { recursive: true, force: true });
}
