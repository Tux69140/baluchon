// AGENTS.md : « Fichiers courts : environ 500 lignes au plus. » Au-delà, on découpe par zone
// de responsabilité, avec un fichier porte d'entrée.
import { listerFichiers, lireTexte } from './fichiers.mjs';

const MAXIMUM = 500;
const EXTENSIONS = ['.js', '.mjs', '.css', '.html', '.rs', '.sql'];

export async function verifierTaille(racine) {
  const fautes = [];
  const fichiers = await listerFichiers(
    racine,
    ['src', 'scripts', 'tests', 'src-tauri/src', 'src-tauri/migrations', 'index.html'],
    EXTENSIONS,
  );
  for (const chemin of fichiers) {
    const texte = await lireTexte(racine, chemin);
    const lignes = texte.split('\n').length - (texte.endsWith('\n') ? 1 : 0);
    if (lignes > MAXIMUM)
      fautes.push(`${chemin} : ${lignes} lignes (au plus ${MAXIMUM}) — découper par zone de responsabilité`);
  }
  return fautes;
}
