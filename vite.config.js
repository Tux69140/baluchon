import { defineConfig } from 'vite';

// Le plus ancien moteur de pages où Baluchon doit s'afficher : le WebView d'Android 7.1 (Chrome 116,
// téléphone Asus, 24 octobre 2026). Lightning CSS y traduit ce qu'il ne connaît pas, light-dark() en tête.
const MOTEURS_ANCIENS = { chrome: 116 << 16, safari: 17 << 16 };

export default defineConfig({
  clearScreen: false,
  // Cible commune au navigateur d'Android (WebView) et à WebKitGTK (Debian).
  build: { target: 'es2022' },
  css: { transformer: 'lightningcss', lightningcss: { targets: MOTEURS_ANCIENS } },
  // Port fixe : Tauri l'attend (src-tauri/tauri.conf.json, devUrl).
  // src-tauri (construction de Rust, projet Android) compte des dizaines de milliers de fichiers : ne pas les surveiller.
  server: { port: 1430, strictPort: true, watch: { ignored: ['**/src-tauri/**'] } },
});
