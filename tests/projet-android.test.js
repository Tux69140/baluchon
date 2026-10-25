// Le projet Android est recréé par « tauri android init » (src-tauri/gen/, hors git) : nos retouches
// vivent donc dans nos sources et y sont recopiées avant chaque construction. La garde compare le
// projet Android à nos sources et refuse la construction au moindre écart.
// - L'icône est celle de Baluchon, jamais celle de Tauri (recette du 6 octobre 2026).
// - L'activité principale recolore l'heure et la batterie quand le thème de l'appareil change
//   pendant que l'appli est ouverte (recette du 6 octobre 2026 : elles restaient sombres sur fond sombre).
// - Le socle Android de Tauri tire Jackson 2.15, qui exige Android 8 : Baluchon plantait à l'ouverture
//   sur un téléphone Android 7.1 (java.lang.BootstrapMethodError introuvable, 24 octobre 2026). Le
//   projet impose une version d'avant ce relèvement.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { copierPersonnalisations, verifierPersonnalisations } from '../scripts/projet-android.mjs';

async function avecProjet(fichiers, travail) {
  const racine = await mkdtemp(join(tmpdir(), 'baluchon-android-'));
  try {
    for (const [chemin, contenu] of Object.entries(fichiers)) {
      await mkdir(dirname(join(racine, chemin)), { recursive: true });
      await writeFile(join(racine, chemin), contenu);
    }
    return await travail(racine);
  } finally {
    await rm(racine, { recursive: true, force: true });
  }
}

const NOS_ICONES = 'src-tauri/icons/android';
const NOTRE_JAVA = 'src-tauri/android/java';
const GEN = 'src-tauri/gen/android/app/src/main';
const ACTIVITE = 'fr/biovibralyon/baluchon/MainActivity.kt';
const GRADLE = 'src-tauri/gen/android/app/build.gradle.kts';
// Le fichier de construction tel que « tauri android init » l'écrit, réduit à l'essentiel.
const GRADLE_TAURI =
  'android {\n    defaultConfig {\n        minSdk = 24\n    }\n}\n\nrust {\n    rootDirRel = "../../../"\n}\n';
const SOURCES = {
  [`${NOS_ICONES}/mipmap-hdpi/ic_launcher.png`]: 'baluchon',
  [`${NOS_ICONES}/mipmap-anydpi-v26/ic_launcher.xml`]: '<adaptive-icon/>',
  [`${NOTRE_JAVA}/${ACTIVITE}`]: 'class MainActivity /* recolore les barres */',
  [GRADLE]: GRADLE_TAURI,
};
const PIECES_JACKSON = [
  'com.fasterxml.jackson.core:jackson-databind',
  'com.fasterxml.jackson.core:jackson-core',
  'com.fasterxml.jackson.core:jackson-annotations',
  'com.fasterxml.jackson.datatype:jackson-datatype-json-org',
];

test('un projet Android tout juste recréé rougit sur chaque retouche manquante, et la copie le remet d’aplomb', () =>
  avecProjet(
    {
      ...SOURCES,
      [`${GEN}/res/mipmap-hdpi/ic_launcher.png`]: 'tauri',
      [`${GEN}/java/${ACTIVITE}`]: 'class MainActivity',
    },
    async racine => {
      const fautes = (await verifierPersonnalisations(racine)).join('\n');
      assert.match(fautes, /mipmap-hdpi\/ic_launcher\.png : différent/);
      assert.match(fautes, /mipmap-anydpi-v26\/ic_launcher\.xml : absent/);
      assert.match(fautes, /MainActivity\.kt : différent/);
      await copierPersonnalisations(racine);
      assert.deepEqual(await verifierPersonnalisations(racine), []);
    },
  ));

test('une source manquante rougit au lieu de laisser passer', () =>
  avecProjet(
    { [`${NOTRE_JAVA}/${ACTIVITE}`]: 'x', [`${GEN}/java/${ACTIVITE}`]: 'x', [GRADLE]: GRADLE_TAURI },
    async racine => {
      assert.match((await verifierPersonnalisations(racine)).join('\n'), /src-tauri\/icons\/android/);
    },
  ));

test('le vrai dépôt porte bien une activité qui suit le thème de l’appareil', async () => {
  const { readFile } = await import('node:fs/promises');
  const source = await readFile(new URL(`../${NOTRE_JAVA}/${ACTIVITE}`, import.meta.url), 'utf8');
  assert.match(source, /override fun onConfigurationChanged/);
  assert.match(source, /isAppearanceLightStatusBars/);
});

// À l'accueil, la touche retour met l'appli en arrière-plan au lieu de la fermer (décision du chef de
// projet, 2026-10-25) : l'activité en donne le moyen à la page (window.BaluchonAndroid, lu par
// src/stockage/tauri.js), sur le fil de l'interface.
test('l’activité donne à la page le moyen de mettre l’appli en arrière-plan', async () => {
  const { readFile } = await import('node:fs/promises');
  const source = await readFile(new URL(`../${NOTRE_JAVA}/${ACTIVITE}`, import.meta.url), 'utf8');
  assert.match(source, /override fun onWebViewCreate\(webView: WebView\)/);
  assert.match(source, /addJavascriptInterface\(Passerelle\(\), "BaluchonAndroid"\)/);
  assert.match(source, /@JavascriptInterface\s+fun mettreEnArrierePlan\(\)/);
  assert.match(source, /runOnUiThread \{ moveTaskToBack\(true\) \}/);
});

test('le projet Android impose à Jackson une version qui tourne sous Android 7, une seule fois', () =>
  avecProjet(SOURCES, async racine => {
    const { readFile } = await import('node:fs/promises');
    assert.match((await verifierPersonnalisations(racine)).join('\n'), /build\.gradle\.kts : Jackson/);
    await copierPersonnalisations(racine);
    const gradle = await readFile(join(racine, GRADLE), 'utf8');
    for (const piece of PIECES_JACKSON) {
      const version = gradle.match(new RegExp(`"${piece}:([\\d.]+)"`))?.[1];
      assert.match(version ?? '', /^2\.1[0-3]\.\d+$/, `${piece} : Jackson 2.14 et plus exige Android 8`);
    }
    assert.match(gradle, /configurations\.all \{\s*resolutionStrategy\.force\(/);
    // Témoin : le reste du fichier est intact, le bloc posé juste avant « rust { ».
    const coupure = GRADLE_TAURI.indexOf('\nrust {');
    assert.ok(gradle.startsWith(GRADLE_TAURI.slice(0, coupure)) && gradle.endsWith(GRADLE_TAURI.slice(coupure)));
    // Une seconde construction ne le pose pas deux fois.
    await copierPersonnalisations(racine);
    assert.equal(await readFile(join(racine, GRADLE), 'utf8'), gradle);
    assert.deepEqual(await verifierPersonnalisations(racine), []);
  }));

test('un fichier de construction sans repère « rust { » est refusé plutôt que laissé sans Jackson imposé', () =>
  avecProjet({ ...SOURCES, [GRADLE]: 'android {}\n' }, async racine => {
    await assert.rejects(copierPersonnalisations(racine), /rust \{/);
  }));

// Sous Android 11, le moteur de pages ne dit pas à la page où sont l'heure et les boutons du bas quand
// l'appli s'étend sous eux : l'en-tête passait sous l'heure (Asus, Android 7.1, 24 octobre 2026).
// L'appli ne s'y étend donc qu'à partir d'Android 11 ; en dessous, elle se range entre des barres
// noires (jamais le violet du modèle Tauri) et se réduit quand le clavier s'ouvre.
test('l’activité ne s’étend sous les barres système qu’à partir d’Android 11', async () => {
  const { readFile } = await import('node:fs/promises');
  const source = await readFile(new URL(`../${NOTRE_JAVA}/${ACTIVITE}`, import.meta.url), 'utf8');
  assert.match(source, /val sousLesBarres = Build\.VERSION\.SDK_INT >= Build\.VERSION_CODES\.R/);
  assert.match(source, /if \(sousLesBarres\) \{[^}]*enableEdgeToEdge\(\)/);
  assert.match(source, /window\.statusBarColor = Color\.BLACK/);
  assert.match(source, /window\.navigationBarColor = Color\.BLACK/);
  assert.match(source, /setSoftInputMode\(WindowManager\.LayoutParams\.SOFT_INPUT_ADJUST_RESIZE\)/);
  // Sur des barres noires, l'heure reste claire : la recoloration selon le thème attend Android 11.
  assert.match(source, /if \(!sousLesBarres\) return/);
  assert.equal(source.match(/enableEdgeToEdge\(\)/g).length, 1);
});
