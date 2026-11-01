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
const MANIFESTE = 'src-tauri/gen/android/app/src/main/AndroidManifest.xml';
const MANIFESTE_TAURI =
  '<?xml version="1.0" encoding="utf-8"?>\n<manifest xmlns:android="http://schemas.android.com/apk/res/android">\n    <uses-permission android:name="android.permission.INTERNET" />\n\n    <application/>\n</manifest>\n';
const SOURCES = {
  [`${NOS_ICONES}/mipmap-hdpi/ic_launcher.png`]: 'baluchon',
  [`${NOS_ICONES}/mipmap-anydpi-v26/ic_launcher.xml`]: '<adaptive-icon/>',
  [`${NOTRE_JAVA}/${ACTIVITE}`]: 'class MainActivity /* recolore les barres */',
  [GRADLE]: GRADLE_TAURI,
  [MANIFESTE]: MANIFESTE_TAURI,
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
    {
      [`${NOTRE_JAVA}/${ACTIVITE}`]: 'x',
      [`${GEN}/java/${ACTIVITE}`]: 'x',
      [GRADLE]: GRADLE_TAURI,
      [MANIFESTE]: MANIFESTE_TAURI,
    },
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

// Les barres système suivent le thème réellement affiché, choisi par la page (phase 12) : sans effet
// sous Android 11 (barres noires, icônes claires : l'heure y disparaîtrait autrement). Dès que la page
// a réglé les barres, l'activité ne le fait plus d'elle-même au changement de thème de l'appareil.
test('la page règle les couleurs des barres système, et l’activité lui laisse la main', async () => {
  const { readFile } = await import('node:fs/promises');
  const source = await readFile(new URL(`../${NOTRE_JAVA}/${ACTIVITE}`, import.meta.url), 'utf8');
  assert.match(source, /@JavascriptInterface\s+fun reglerBarres\(sombre: Boolean\)/);
  const corps = source.match(/fun reglerBarres\(sombre: Boolean\) \{([\s\S]*?)\n {4}\}\n/)?.[1] ?? '';
  assert.match(corps, /if \(!sousLesBarres\) return/);
  assert.match(corps, /pageReglesLesBarres = true/);
  assert.match(corps, /runOnUiThread/);
  assert.match(source, /if \(!sousLesBarres \|\| pageReglesLesBarres\) return/);
  // Une seule définition de la couleur des barres, partagée par la page et par le changement de thème.
  assert.equal(source.match(/isAppearanceLightStatusBars =/g).length, 1);
});

// Déposer un fichier dans Téléchargements : Android 7 à 9 demande l'autorisation d'écrire, et la
// déclaration du fichier comme téléchargement terminé lève une SecurityException sans la seconde
// permission (essai du 31 octobre 2026). Le manifeste est régénéré : la retouche vit ici.
const PERMISSIONS = [
  /<uses-permission android:name="android\.permission\.WRITE_EXTERNAL_STORAGE" android:maxSdkVersion="28" \/>/g,
  /<uses-permission android:name="android\.permission\.DOWNLOAD_WITHOUT_NOTIFICATION" \/>/g,
];

test('le manifeste reçoit les deux autorisations du dépôt dans Téléchargements, une seule fois', () =>
  avecProjet(SOURCES, async racine => {
    const { readFile } = await import('node:fs/promises');
    assert.match(
      (await verifierPersonnalisations(racine)).join('\n'),
      /AndroidManifest\.xml : .*WRITE_EXTERNAL_STORAGE/,
    );
    assert.match(
      (await verifierPersonnalisations(racine)).join('\n'),
      /AndroidManifest\.xml : .*DOWNLOAD_WITHOUT_NOTIFICATION/,
    );
    await copierPersonnalisations(racine);
    const manifeste = await readFile(join(racine, MANIFESTE), 'utf8');
    for (const permission of PERMISSIONS) assert.equal(manifeste.match(permission)?.length, 1);
    // Les autorisations suivent celle d'Internet, sans ligne vide de trop avant « <application ».
    assert.equal(
      manifeste,
      MANIFESTE_TAURI.replace(
        '\n\n    <application/>',
        '\n    <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" android:maxSdkVersion="28" />\n    <uses-permission android:name="android.permission.DOWNLOAD_WITHOUT_NOTIFICATION" />\n\n    <application/>',
      ),
    );
    // Témoin : le reste du manifeste est intact.
    assert.ok(manifeste.includes('android.permission.INTERNET') && manifeste.includes('<application/>'));
    await copierPersonnalisations(racine);
    assert.equal(await readFile(join(racine, MANIFESTE), 'utf8'), manifeste);
    assert.deepEqual(await verifierPersonnalisations(racine), []);
  }));

test('un manifeste qui porte déjà les autorisations (ajoutées à la main) n’en reçoit pas de double', () =>
  avecProjet(
    {
      ...SOURCES,
      [MANIFESTE]: MANIFESTE_TAURI.replace(
        '\n    <application/>',
        '    <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" android:maxSdkVersion="28" />\n    <uses-permission android:name="android.permission.DOWNLOAD_WITHOUT_NOTIFICATION" />\n\n    <application/>',
      ),
    },
    async racine => {
      const { readFile } = await import('node:fs/promises');
      const avant = await readFile(join(racine, MANIFESTE), 'utf8');
      await copierPersonnalisations(racine);
      assert.equal(await readFile(join(racine, MANIFESTE), 'utf8'), avant);
      assert.deepEqual(await verifierPersonnalisations(racine), []);
    },
  ));

test('un manifeste sans repère « <application » est refusé', () =>
  avecProjet({ ...SOURCES, [MANIFESTE]: '<manifest/>' }, async racine => {
    await assert.rejects(copierPersonnalisations(racine), /<application/);
  }));

test('l’activité dépose un fichier dans Téléchargements sans jamais écraser, hors du fil de l’interface', async () => {
  const { readFile } = await import('node:fs/promises');
  const source = await readFile(new URL(`../${NOTRE_JAVA}/${ACTIVITE}`, import.meta.url), 'utf8');
  assert.match(source, /@JavascriptInterface\s+fun deposer\(numero: String, nom: String, texte: String\)/);
  assert.match(source, /MediaStore\.Downloads\.EXTERNAL_CONTENT_URI/);
  assert.match(source, /override fun onRequestPermissionsResult/);
  assert.match(source, /addCompletedDownload\(/);
  assert.match(source, /MediaScannerConnection\.scanFile/);
  assert.match(source, /baluchonDepose\(/);
});

test('l’activité n’ouvre dans le navigateur que des adresses https://', async () => {
  const { readFile } = await import('node:fs/promises');
  const source = await readFile(new URL(`../${NOTRE_JAVA}/${ACTIVITE}`, import.meta.url), 'utf8');
  assert.match(source, /import android\.content\.Intent/);
  assert.match(source, /import android\.net\.Uri/);
  const corps =
    source.match(/@JavascriptInterface\s+fun ouvrirLien\(adresse: String\) \{([\s\S]*?)\n {4}\}\n/)?.[1] ?? '';
  assert.match(corps, /if \(!adresse\.startsWith\("https:\/\/"\)\) return/);
  assert.match(corps, /Intent\(Intent\.ACTION_VIEW, Uri\.parse\(adresse\)\)/);
});

// Le nom vient de la page : jamais un chemin. Et si seule la déclaration comme téléchargement échoue, le
// fichier est bien écrit : on répond « depose » (il se retrouve par le gestionnaire de fichiers).
test('l’activité refuse un nom qui est un chemin, et garde le fichier écrit si la déclaration échoue', async () => {
  const { readFile } = await import('node:fs/promises');
  const source = await readFile(new URL(`../${NOTRE_JAVA}/${ACTIVITE}`, import.meta.url), 'utf8');
  const corps = source.match(/private fun deposerOuDemander\(depot: Depot\) \{([\s\S]*?)\n {2}\}\n/)?.[1] ?? '';
  assert.match(corps, /depot\.nom\.contains\('\/'\) \|\| depot\.nom\.contains\("\.\."\)/);
  assert.match(corps, /repondre\(depot, "erreur:/);
  assert.match(
    source,
    /try \{\s*\(getSystemService\(DOWNLOAD_SERVICE\) as DownloadManager\)\.addCompletedDownload\([\s\S]*?\} catch \(e: Exception\) \{\s*Log\.w\(/,
  );
  assert.match(source, /@Volatile\s+private var pageReglesLesBarres = false/);
});

// Un second dépôt pendant que la boîte d'autorisation est ouverte ne la redemande pas : Android répondrait
// aussitôt par des tableaux vides, lus comme un refus pour tous les dépôts en attente.
test('l’activité ne demande l’autorisation que si aucune demande n’est déjà en cours', async () => {
  const { readFile } = await import('node:fs/promises');
  const source = await readFile(new URL(`../${NOTRE_JAVA}/${ACTIVITE}`, import.meta.url), 'utf8');
  assert.match(
    source,
    /val aucuneDemandeEnCours = synchronized\(depotsEnAttente\) \{\s*val vide = depotsEnAttente\.isEmpty\(\)\s*depotsEnAttente\.add\(depot\)\s*vide\s*\}/,
  );
  assert.match(source, /if \(aucuneDemandeEnCours\) \{\s*runOnUiThread \{\s*requestPermissions\(/);
  assert.equal(source.match(/requestPermissions\(/g).length, 1);
});
