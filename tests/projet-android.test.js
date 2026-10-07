// Le projet Android est recréé par « tauri android init » (src-tauri/gen/, hors git) : nos retouches
// vivent donc dans nos sources et y sont recopiées avant chaque construction. La garde compare le
// projet Android à nos sources et refuse la construction au moindre écart.
// - L'icône est celle de Baluchon, jamais celle de Tauri (recette du 6 octobre 2026).
// - L'activité principale recolore l'heure et la batterie quand le thème de l'appareil change
//   pendant que l'appli est ouverte (recette du 6 octobre 2026 : elles restaient sombres sur fond sombre).
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
const SOURCES = {
  [`${NOS_ICONES}/mipmap-hdpi/ic_launcher.png`]: 'baluchon',
  [`${NOS_ICONES}/mipmap-anydpi-v26/ic_launcher.xml`]: '<adaptive-icon/>',
  [`${NOTRE_JAVA}/${ACTIVITE}`]: 'class MainActivity /* recolore les barres */',
};

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
  avecProjet({ [`${NOTRE_JAVA}/${ACTIVITE}`]: 'x', [`${GEN}/java/${ACTIVITE}`]: 'x' }, async racine => {
    assert.match((await verifierPersonnalisations(racine)).join('\n'), /src-tauri\/icons\/android/);
  }));

test('le vrai dépôt porte bien une activité qui suit le thème de l’appareil', async () => {
  const { readFile } = await import('node:fs/promises');
  const source = await readFile(new URL(`../${NOTRE_JAVA}/${ACTIVITE}`, import.meta.url), 'utf8');
  assert.match(source, /override fun onConfigurationChanged/);
  assert.match(source, /isAppearanceLightStatusBars/);
});
