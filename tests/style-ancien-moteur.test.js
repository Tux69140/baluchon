// Le style livré doit s'afficher dans le moteur des vieux Android : sur un téléphone Android 7.1, le
// moteur de pages (Chrome 116) ignorait toutes nos couleurs, écrites une seule fois avec light-dark()
// (connue à partir de Chrome 123) : fond blanc, plus de cartes ni de bouton vert (24 octobre 2026).
// Nos sources gardent light-dark() ; la fabrication (Vite, Lightning CSS) la traduit pour ce moteur.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { build } from 'vite';

const RACINE = new URL('..', import.meta.url).pathname;

async function styleLivre() {
  const sortie = await mkdtemp(join(tmpdir(), 'baluchon-style-'));
  try {
    await build({ root: RACINE, logLevel: 'silent', build: { outDir: sortie, emptyOutDir: true } });
    const fichiers = (await readdir(join(sortie, 'assets'))).filter(f => f.endsWith('.css'));
    return (await Promise.all(fichiers.map(f => readFile(join(sortie, 'assets', f), 'utf8')))).join('\n');
  } finally {
    await rm(sortie, { recursive: true, force: true });
  }
}

test('le style livré se passe de light-dark() et garde chaque couleur en clair et en sombre', async () => {
  // Témoin : nos sources l'emploient bien.
  assert.match(await readFile(join(RACINE, 'src/styles/jetons.css'), 'utf8'), /--fond: light-dark\(#f7f6f1, #0d1624\)/);
  const css = (await styleLivre()).toLowerCase();
  assert.doesNotMatch(css, /light-dark\(/);
  // Le fond du clair et celui du sombre sont tous deux livrés, et le sombre suit encore l'appareil.
  assert.match(css, /#f7f6f1/);
  assert.match(css, /#0d1624/);
  assert.match(css, /prefers-color-scheme:\s*dark/);
});

// Ce même moteur ne transmet pas les jetons de la page au voile des fenêtres (::backdrop, Chrome 122) :
// derrière la fiche, l'écran ne s'assombrissait plus. Les jetons sont donc posés aussi sur le voile,
// dans les deux thèmes comme au choix manuel.
test('le voile des fenêtres reçoit lui-même les jetons de couleur, thème compris', async () => {
  const css = await styleLivre();
  const regles = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(([, selecteur, corps]) => ({ selecteur, corps }));
  const portent = (nom, selecteur) => regles.some(r => r.corps.includes(nom) && selecteur.test(r.selecteur));
  assert.ok(portent('--voile:', /::backdrop/), 'le voile ne reçoit pas --voile');
  assert.ok(portent('--lightningcss-dark:initial', /::backdrop/), 'le voile ne suit pas le thème sombre');
  assert.ok(
    portent('--lightningcss-dark:initial', /\[data-theme=dark\] ::backdrop/),
    'le voile ne suit pas le choix manuel',
  );
  // Témoin : la page les reçoit toujours.
  assert.ok(portent('--voile:', /:root/));
});
