import js from '@eslint/js';
import globals from 'globals';

export default [
  { ignores: ['dist/', 'node_modules/', 'src-tauri/', '**/*-travail/'] },
  js.configs.recommended,
  { files: ['src/**/*.js'], languageOptions: { globals: globals.browser } },
  { files: ['scripts/**', 'tests/**', '*.config.js'], languageOptions: { globals: globals.node } },
  // Les tests d'écran envoient des fonctions s'exécuter dans la page (page.evaluate).
  { files: ['tests/**/*.mjs'], languageOptions: { globals: { ...globals.node, ...globals.browser } } },
];
