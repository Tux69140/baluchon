// Les contrôles automatiques des règles de AGENTS.md (« Chaque règle mesurable a son contrôle
// automatique »). Chacun est armé de ses deux moitiés : le projet réel passe (témoin positif, et un
// exemple correct passe aussi), un exemple fautif rougit pour sa propre raison.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { verifierTaille } from '../scripts/controles/taille-fichiers.mjs';
import { verifierTextes } from '../scripts/controles/textes-hors-traduction.mjs';
import { verifierExports } from '../scripts/controles/exports-inutilises.mjs';
import { verifierCouches } from '../scripts/controles/frontiere-couches.mjs';
import { verifierLint, verifierFormat } from '../scripts/controles/lint-format.mjs';

const RACINE = join(dirname(fileURLToPath(import.meta.url)), '..');

// Un mini-projet jetable : { 'src/x.js': 'contenu' } → dossier temporaire.
async function projetEssai(fichiers) {
  const racine = await mkdtemp(join(tmpdir(), 'baluchon-controle-'));
  for (const [chemin, contenu] of Object.entries(fichiers)) {
    await mkdir(dirname(join(racine, chemin)), { recursive: true });
    await writeFile(join(racine, chemin), contenu);
  }
  return racine;
}

async function avecProjet(fichiers, travail) {
  const racine = await projetEssai(fichiers);
  try {
    return await travail(racine);
  } finally {
    await rm(racine, { recursive: true, force: true });
  }
}

const FR = JSON.stringify({ voyages: { titre: 'Voyages' } });

test('le projet réel passe tous les contrôles', async () => {
  assert.deepEqual(await verifierTaille(RACINE), []);
  assert.deepEqual(await verifierTextes(RACINE), []);
  assert.deepEqual(await verifierExports(RACINE), []);
  assert.deepEqual(await verifierCouches(RACINE), []);
});

test('taille : 500 lignes passent, 501 rougissent', async () => {
  const lignes = n => 'const a = 1;\n'.repeat(n);
  assert.deepEqual(await avecProjet({ 'src/court.js': lignes(500) }, verifierTaille), []);
  const fautes = await avecProjet({ 'src/long.js': lignes(501) }, verifierTaille);
  assert.equal(fautes.length, 1);
  assert.match(fautes[0], /src\/long\.js.*501 lignes/);
});

test('textes : un texte venu de la traduction passe', async () => {
  const fichiers = {
    'src/i18n/fr.json': FR,
    'src/ecrans/voyages.js':
      'const t = x => x;\nexport const vue = n => `<h1 class="titre">${t(\'voyages.titre\')}</h1><b>${n}&nbsp;×</b>`;\n',
    'index.html': '<!doctype html><html><head><title></title></head><body><div id="app"></div></body></html>',
  };
  assert.deepEqual(await avecProjet(fichiers, verifierTextes), []);
});

test('textes : une comparaison a > b && c < d dans le code n’est pas un texte', async () => {
  const fichiers = { 'src/i18n/fr.json': FR, 'src/modele/a.js': 'export const f = (a, b, c, d) => a > b && c < d;\n' };
  assert.deepEqual(await avecProjet(fichiers, verifierTextes), []);
});

test('textes : chaque sorte de texte écrit en dur rougit', async () => {
  const cas = {
    'texte entre balises': '`<h1>Mes voyages</h1>`',
    'libellé accessible': '`<button aria-label="Fermer la fenêtre"></button>`',
    'affectation de textContent': "document.body.textContent = 'Bonjour';",
    'clé de traduction inconnue': "t('voyages.inconnu');",
    'une seule lettre': '`<span>${3} j</span>`',
  };
  for (const [nom, code] of Object.entries(cas)) {
    const fautes = await avecProjet(
      { 'src/i18n/fr.json': FR, 'src/ecrans/a.js': `const t = x => x;\n${code}\n` },
      verifierTextes,
    );
    assert.equal(fautes.length, 1, `${nom} : ${fautes.join(' | ')}`);
    assert.match(fautes[0], /src\/ecrans\/a\.js:2/, nom);
  }
  const html = await avecProjet(
    { 'src/i18n/fr.json': FR, 'index.html': '<html><head><title>Baluchon</title></head><body></body></html>' },
    verifierTextes,
  );
  assert.equal(html.length, 1);
  assert.match(html[0], /index\.html/);
  const css = await avecProjet(
    { 'src/i18n/fr.json': FR, 'src/styles/a.css': '.a::after { content: "Vide"; }\n' },
    verifierTextes,
  );
  assert.equal(css.length, 1);
  assert.match(css[0], /src\/styles\/a\.css:1/);
});

test('exports : un nom importé ailleurs passe, un nom que personne n’importe rougit', async () => {
  const fichiers = {
    'src/modele/dates.js': 'export function jours() {}\nexport const nuits = 1;\n',
    'src/main.js': "import { jours } from './modele/dates.js';\njours();\n",
  };
  const fautes = await avecProjet(fichiers, verifierExports);
  assert.equal(fautes.length, 1);
  assert.match(fautes[0], /src\/modele\/dates\.js.*nuits/);
  fichiers['src/main.js'] = "import { jours, nuits as n } from './modele/dates.js';\njours(n);\n";
  assert.deepEqual(await avecProjet(fichiers, verifierExports), []);
});

test('exports : un import dynamique posé dans un bloc compte comme import', async () => {
  const fichiers = {
    'src/stockage/tauri.js': 'export function creer() {}\n',
    'src/stockage/index.js':
      "export async function ouvrir(x) {\n  if (x) {\n    const { creer } = await import('./tauri.js');\n    return creer();\n  }\n}\n",
    'src/main.js': "import { ouvrir } from './stockage/index.js';\nouvrir();\n",
  };
  assert.deepEqual(await avecProjet(fichiers, verifierExports), []);
});

test('couches : chaque passage interdit rougit, les passages permis passent', async () => {
  const permis = {
    'src/modele/a.js': "import { b } from './b.js';\nexport const a = b;\n",
    'src/stockage/tauri.js': "import { invoke } from '@tauri-apps/api/core';\nimport { a } from '../modele/a.js';\n",
    'src/ecrans/voyages.js':
      "import { ouvrirStockage } from '../stockage/index.js';\nimport { a } from '../modele/a.js';\n",
  };
  assert.deepEqual(await avecProjet(permis, verifierCouches), []);
  const interdits = {
    'src/ecrans/a.js': "import { invoke } from '@tauri-apps/api/core';\n",
    'src/ecrans/b.js': "import { x } from '../stockage/tauri.js';\n",
    'src/ecrans/c.js': "const d = localStorage.getItem('x');\n",
    'src/modele/d.js': "import { x } from '../stockage/index.js';\n",
    'src/modele/e.js': "import { t } from '../i18n/traduction.js';\n",
    'src/stockage/f.js': "import { vue } from '../ecrans/voyages.js';\n",
    'src/main.js': "import { invoke } from '@tauri-apps/api/core';\n",
  };
  for (const [chemin, code] of Object.entries(interdits)) {
    const fautes = await avecProjet({ [chemin]: code }, verifierCouches);
    assert.equal(fautes.length, 1, `${chemin} : ${fautes.join(' | ')}`);
    assert.match(fautes[0], new RegExp(chemin.replace('.', '\\.')));
  }
});

test('lint : un code propre passe, une variable inutilisée rougit', async () => {
  assert.deepEqual(await verifierLint(RACINE, 'src/essai.js', 'export const a = 1;\n'), []);
  const fautes = await verifierLint(RACINE, 'src/essai.js', 'const inutile = 1;\nexport const a = 2;\n');
  assert.equal(fautes.length, 1);
  assert.match(fautes[0], /inutile/);
});

test('format : un code formaté passe, un code mal formaté rougit', async () => {
  assert.equal(await verifierFormat(RACINE, 'src/essai.js', "export const a = { b: 'c' };\n"), true);
  assert.equal(await verifierFormat(RACINE, 'src/essai.js', 'export const a={b:"c"}\n'), false);
});
