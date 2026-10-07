// `pnpm test:ecrans` : chaque test d'écran (tests/ecran-*.mjs), l'un après l'autre. Jugés
// au code de sortie ; un seul rouge suffit à faire échouer l'ensemble.
import { spawnSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const dossier = dirname(fileURLToPath(import.meta.url));
const tests = readdirSync(dossier).filter(nom => /^ecran-.*\.mjs$/.test(nom));
let echecs = 0;
for (const test of tests) {
  const { status } = spawnSync(process.execPath, [join(dossier, test)], { stdio: 'inherit' });
  if (status !== 0) echecs += 1;
  console.log(`${status === 0 ? '✓' : '✗'} ${test}`);
}
process.exitCode = echecs ? 1 : 0;
