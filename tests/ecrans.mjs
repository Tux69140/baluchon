// `pnpm test:ecrans` : chaque test d'écran (tests/ecran-*.mjs), jugé au code de sortie ; un seul rouge suffit
// à faire échouer l'ensemble. Ils tournent par paquets de PARALLELES (un navigateur chacun), les plus longs
// d'abord ; la sortie d'un test s'affiche d'un bloc quand il finit. Un test rouge sous la charge est rejoué
// seul une fois : vert seul, il est signalé comme instable ; rouge seul, il échoue (accord du chef de projet,
// 2026-10-29 : « un test qui passe seul est ok pour moi »).
import { spawn } from 'node:child_process';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { cpus } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const dossier = dirname(fileURLToPath(import.meta.url));
const PARALLELES = Math.max(1, Math.min(4, Math.floor(cpus().length / 3)));
// Les durées du dernier passage (ignoré par git), pour lancer les plus longs en premier.
const FICHIER_DUREES = join(dossier, '..', 'node_modules', '.cache', 'durees-ecrans.json');

function lireDurees() {
  try {
    return JSON.parse(readFileSync(FICHIER_DUREES, 'utf8'));
  } catch {
    return {};
  }
}

// Lance un test ; rend son code de sortie, sa sortie et sa durée (s).
function lancer(test) {
  return new Promise(resoudre => {
    const debut = Date.now();
    const enfant = spawn(process.execPath, [join(dossier, test)], { stdio: ['ignore', 'pipe', 'pipe'] });
    let sortie = '';
    enfant.stdout.on('data', d => (sortie += d));
    enfant.stderr.on('data', d => (sortie += d));
    enfant.on('close', code => resoudre({ code, sortie, duree: (Date.now() - debut) / 1000 }));
  });
}

const durees = lireDurees();
const tests = readdirSync(dossier)
  .filter(nom => /^ecran-.*\.mjs$/.test(nom))
  .sort((a, b) => (durees[b] ?? Infinity) - (durees[a] ?? Infinity));
const debut = Date.now();
const rouges = [];
const file = [...tests];
await Promise.all(
  Array.from({ length: PARALLELES }, async () => {
    for (let test = file.shift(); test; test = file.shift()) {
      const { code, sortie, duree } = await lancer(test);
      durees[test] = duree;
      process.stdout.write(sortie);
      if (code === 0) console.log(`✓ ${test} (${Math.round(duree)} s)`);
      else rouges.push(test);
    }
  }),
);

let echecs = 0;
for (const test of rouges) {
  console.log(`… ${test} rouge sous la charge : rejoué seul`);
  const { code, sortie } = await lancer(test);
  process.stdout.write(sortie);
  if (code === 0) console.log(`⚠ ${test} : instable (rouge sous la charge, vert seul)`);
  else {
    echecs += 1;
    console.log(`✗ ${test}`);
  }
}
try {
  writeFileSync(FICHIER_DUREES, JSON.stringify(durees, null, 1));
} catch {
  // Pas de cache : l'ordre suivant sera l'ordre alphabétique.
}
console.log(
  `${tests.length} tests d'écran en ${Math.round((Date.now() - debut) / 60000)} min, ${PARALLELES} à la fois`,
);
process.exitCode = echecs ? 1 : 0;
