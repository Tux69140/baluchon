// AGENTS.md : « Un nom n'est exporté que si un autre fichier l'importe. » Lecture par les noms :
// un nom exporté doit figurer dans l'import d'au moins un autre fichier (tests compris).
import { listerFichiers, lireTexte, ligneDe } from './fichiers.mjs';
import { lireCode } from './litteraux.mjs';

const DOSSIERS = ['src', 'scripts', 'tests'];
const EXTENSIONS = ['.js', '.mjs'];
const DECLARATION = /\bexport\s+(?:async\s+)?(?:function\*?|const|let|var|class)\s+([\w$]+)/g;
const LISTE_EXPORTEE = /\bexport\s*\{([^{}]*)\}/g;
// `import { a, b as c } from`, `import d, { a } from`, `export { a } from` (porte d'entrée),
// `const { a } = await import(…)`.
const LISTES_IMPORTEES = [
  /\bimport\s*(?:[\w$]+\s*,\s*)?\{([^{}]*)\}\s*from/g,
  /\bexport\s*\{([^{}]*)\}\s*from/g,
  /\{([^{}]*)\}\s*=\s*await\s+import\(/g,
];

// `a as b` : c'est « b » qui sort d'un fichier qui exporte, « a » qu'un fichier importe.
const noms = (liste, cote) =>
  liste
    .split(',')
    .map(morceau => morceau.trim())
    .filter(Boolean)
    .map(morceau => {
      const [origine, alias] = morceau.split(/\s+as\s+/);
      return cote === 'exporte' ? (alias ?? origine) : origine;
    });

export async function verifierExports(racine) {
  const fichiers = await listerFichiers(racine, DOSSIERS, EXTENSIONS);
  const exportes = [];
  const importateurs = new Map();
  for (const chemin of fichiers) {
    const source = await lireTexte(racine, chemin);
    const { code } = lireCode(source);
    for (const trouve of code.matchAll(DECLARATION))
      exportes.push({ nom: trouve[1], chemin, ligne: ligneDe(source, trouve.index) });
    for (const trouve of code.matchAll(LISTE_EXPORTEE)) {
      // Une réexportation (`export { a } from …`) a déjà son origine : elle compte comme import, plus bas.
      if (/^\s*from\b/.test(code.slice(trouve.index + trouve[0].length))) continue;
      for (const nom of noms(trouve[1], 'exporte'))
        exportes.push({ nom, chemin, ligne: ligneDe(source, trouve.index) });
    }
    for (const motif of LISTES_IMPORTEES) {
      for (const trouve of code.matchAll(motif)) {
        for (const nom of noms(trouve[1], 'importe')) {
          if (!importateurs.has(nom)) importateurs.set(nom, new Set());
          importateurs.get(nom).add(chemin);
        }
      }
    }
  }
  return exportes
    .filter(({ nom, chemin }) => ![...(importateurs.get(nom) ?? [])].some(autre => autre !== chemin))
    .map(
      ({ nom, chemin, ligne }) => `${chemin}:${ligne} — « ${nom} » est exporté mais aucun autre fichier ne l'importe`,
    );
}
