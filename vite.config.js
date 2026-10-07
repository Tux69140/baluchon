import { defineConfig } from 'vite';

export default defineConfig({
  clearScreen: false,
  // Cible commune au navigateur d'Android (WebView) et à WebKitGTK (Debian).
  build: { target: 'es2022' },
  // Port fixe : Tauri l'attend (src-tauri/tauri.conf.json, devUrl).
  server: { port: 1430, strictPort: true },
});
