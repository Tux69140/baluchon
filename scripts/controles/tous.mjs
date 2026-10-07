// `pnpm controles` : les règles mesurables de AGENTS.md sur tout le projet. Code de sortie 1
// à la moindre faute, chacune nommée avec son fichier et sa ligne. Lint et formatage ont leurs
// propres commandes (pnpm lint, pnpm format:verif).
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { verifierTaille } from './taille-fichiers.mjs';
import { verifierTextes } from './textes-hors-traduction.mjs';
import { verifierExports } from './exports-inutilises.mjs';
import { verifierCouches } from './frontiere-couches.mjs';

const racine = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const controles = {
  'Taille des fichiers': verifierTaille,
  'Textes hors traduction': verifierTextes,
  'Exports inutilisés': verifierExports,
  'Frontière des couches': verifierCouches,
};

let total = 0;
for (const [nom, verifier] of Object.entries(controles)) {
  const fautes = await verifier(racine);
  total += fautes.length;
  console.log(`${fautes.length ? '✗' : '✓'} ${nom}${fautes.length ? ` : ${fautes.length} faute(s)` : ''}`);
  for (const faute of fautes) console.log(`    ${faute}`);
}
process.exitCode = total ? 1 : 0;
