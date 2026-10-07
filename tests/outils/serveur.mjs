// Le serveur de développement des tests d'écran, démarré par le test lui-même sur un port libre :
// aucun serveur à lancer à la main, et deux tests peuvent tourner en même temps.
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const RACINE = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

export async function demarrerServeur() {
  const serveur = await createServer({ root: RACINE, logLevel: 'error', server: { port: 0, strictPort: false } });
  await serveur.listen();
  const adresse = serveur.httpServer.address();
  return { url: `http://localhost:${adresse.port}`, fermer: () => serveur.close() };
}
