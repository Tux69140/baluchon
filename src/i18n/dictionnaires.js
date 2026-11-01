// Tous les dictionnaires de l'interface, trouvés dans ce dossier : ajouter une langue, c'est déposer
// son fichier JSON ici. Réservé à Vite (import.meta.glob n'existe pas sous node) : seul main.js
// l'importe ; les tests de logique passent par traduction.js et langue.js.
const dossier = import.meta.glob('./*.json', { eager: true, import: 'default' });

// Les langues d'essai des tests d'écran (tests/langues/, jamais publiées) ne se chargent qu'en mode
// « essai » ; le build de production en retire ce bloc, donc ces fichiers.
const essais =
  import.meta.env.MODE === 'essai'
    ? import.meta.glob('../../tests/langues/*.json', { eager: true, import: 'default' })
    : {};

const parLangue = fichiers =>
  Object.fromEntries(Object.entries(fichiers).map(([chemin, texte]) => [chemin.match(/([^/]+)\.json$/)[1], texte]));

export const DICTIONNAIRES = { ...parLangue(dossier), ...parLangue(essais) };
