// Lint (ESLint) et formatage (Prettier) d'un code donné, comme s'il était au chemin indiqué du
// projet : sert aux tests, qui prouvent que la configuration du projet rougit bien sur une faute
// sans écrire de fichier fautif dans le dépôt.
import { join } from 'node:path';
import { ESLint } from 'eslint';
import * as prettier from 'prettier';

export async function verifierLint(racine, chemin, code) {
  const eslint = new ESLint({ cwd: racine });
  const [resultat] = await eslint.lintText(code, { filePath: join(racine, chemin) });
  return resultat.messages.map(m => `${chemin}:${m.line} — ${m.message}`);
}

export async function verifierFormat(racine, chemin, code) {
  const fichier = join(racine, chemin);
  const options = await prettier.resolveConfig(fichier);
  return prettier.check(code, { ...options, filepath: fichier });
}
