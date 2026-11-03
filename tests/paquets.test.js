import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  codeVersionAndroid,
  nomPaquet,
  lireVersion,
  verifierCle,
  verifierAJourAvecGithub,
  outilsAppimage,
  CIBLES_ANDROID,
} from '../scripts/paquets/regles.mjs';

async function avecDossier(travail) {
  const dossier = await mkdtemp(join(tmpdir(), 'baluchon-paquets-'));
  try {
    return await travail(dossier);
  } finally {
    await rm(dossier, { recursive: true, force: true });
  }
}

async function projet(racine, versionNpm, cargo) {
  await mkdir(join(racine, 'src-tauri'), { recursive: true });
  await writeFile(join(racine, 'package.json'), JSON.stringify({ version: versionNpm }));
  await writeFile(join(racine, 'src-tauri', 'Cargo.toml'), cargo);
}

test('le numéro interne du 64 bits dépasse celui du 32 bits de la même version', () => {
  assert.equal(codeVersionAndroid('0.1.0', 'arm64'), 10002);
  assert.equal(codeVersionAndroid('0.1.0', 'arm'), 10001);
  assert.equal(codeVersionAndroid('0.1.1', 'arm'), 10011);
  assert.equal(codeVersionAndroid('1.2.3', 'arm64'), 10020032);
});

test('une version mal formée ou trop grande est refusée', () => {
  for (const v of ['0.1', '0.1.0-beta', 'v0.1.0', ''])
    assert.throws(() => codeVersionAndroid(v, 'arm64'), /0\.1\.0|x\.y\.z/);
  assert.throws(() => codeVersionAndroid('211.0.0', 'arm64'), /2 ?100 ?000 ?000/);
});

test('les noms des paquets', () => {
  assert.equal(nomPaquet('0.1.0', 'android'), 'baluchon-0.1.0.apk');
  assert.equal(nomPaquet('0.1.0', 'android-anciens'), 'baluchon-0.1.0-anciens-appareils.apk');
  assert.equal(nomPaquet('0.1.0', 'deb'), 'baluchon-0.1.0-amd64.deb');
  assert.equal(nomPaquet('0.1.0', 'rpm'), 'baluchon-0.1.0.x86_64.rpm');
  assert.equal(nomPaquet('0.1.0', 'appimage'), 'baluchon-0.1.0-x86_64.AppImage');
  assert.equal(nomPaquet('0.1.0', 'windows'), 'baluchon-0.1.0-x64-setup.exe');
});

test('les cibles Android', () => {
  assert.deepEqual(CIBLES_ANDROID, [
    { cible: 'aarch64', architecture: 'arm64', sorte: 'android' },
    { cible: 'armv7', architecture: 'arm', sorte: 'android-anciens' },
  ]);
});

test('package.json et Cargo.toml portent la même version', async () => {
  assert.match(await lireVersion(process.cwd()), /^\d+\.\d+\.\d+$/);
});

test('lireVersion refuse deux versions différentes', async () => {
  await avecDossier(async racine => {
    await projet(racine, '0.1.1', '[package]\nname = "baluchon"\nversion = "0.1.0"\n');
    await assert.rejects(() => lireVersion(racine), /0\.1\.1[\s\S]*0\.1\.0|0\.1\.0[\s\S]*0\.1\.1/);
  });
});

test('lireVersion lit la section [package], pas les versions des dépendances', async () => {
  await avecDossier(async racine => {
    await projet(
      racine,
      '0.2.0',
      '[dependencies]\ntauri = { version = "2" }\n\n[package]\nname = "baluchon"\nversion = "0.2.0"\n\n[profile.release]\nopt-level = "s"\n',
    );
    assert.equal(await lireVersion(racine), '0.2.0');
  });
});

test('lireVersion refuse une version qui n’est pas x.y.z', async () => {
  await avecDossier(async racine => {
    await projet(racine, '0.1.0-beta', '[package]\nversion = "0.1.0-beta"\n');
    await assert.rejects(() => lireVersion(racine), /x\.y\.z/);
  });
});

test('une clé absente ou incomplète est signalée avant toute fabrication', () => {
  assert.match(verifierCle(null, '/x/cle.properties')[0], /\/x\/cle\.properties/);
  assert.equal(verifierCle('storeFile=/a.jks\nkeyAlias=baluchon\npassword=\n', '/x').length, 1);
  assert.deepEqual(verifierCle('storeFile=/a.jks\nkeyAlias=baluchon\npassword=s3cret\n', '/x'), []);
});

const fauxGit = reponses => args => {
  const reponse = reponses[args[0]];
  if (reponse instanceof Error) throw reponse;
  return reponse;
};
const GIT_A_JOUR = { 'rev-parse': 'origin/main', fetch: '', 'rev-list': '0' };

test('la fabrication Windows refuse un dépôt en retard ou hors ligne', () => {
  assert.doesNotThrow(() => verifierAJourAvecGithub(fauxGit(GIT_A_JOUR)));
  assert.throws(
    () => verifierAJourAvecGithub(fauxGit({ ...GIT_A_JOUR, 'rev-list': '3' })),
    /3 modifications de retard sur GitHub \(origin\/main\) : lancer « git pull »/,
  );
  assert.throws(() => verifierAJourAvecGithub(fauxGit({ ...GIT_A_JOUR, 'rev-list': '1' })), /1 modification de retard/);
  assert.throws(
    () => verifierAJourAvecGithub(fauxGit({ ...GIT_A_JOUR, fetch: new Error('réseau') })),
    /GitHub ne répond pas \(pas de réseau \?\)/,
  );
  assert.throws(
    () => verifierAJourAvecGithub(fauxGit({ ...GIT_A_JOUR, 'rev-parse': new Error('sans amont') })),
    /ne suit aucune branche de GitHub/,
  );
});

test('outilsAppimage dit quoi faire quand le cache de Tauri est vide', async () => {
  await avecDossier(async cache => {
    await assert.rejects(() => outilsAppimage(cache), /pnpm paquets/);
  });
});

test("l'essai d'ordinateur a son propre identifiant et pnpm bureau l'utilise", async () => {
  const racine = new URL('..', import.meta.url);
  const essai = JSON.parse(await readFile(new URL('src-tauri/tauri.essai.conf.json', racine), 'utf8'));
  assert.equal(essai.identifier, 'fr.biovibralyon.baluchon.essai');
  assert.equal(essai.productName, 'Baluchon essai');
  const paquet = JSON.parse(await readFile(new URL('package.json', racine), 'utf8'));
  assert.equal(paquet.scripts.bureau, 'tauri dev --config src-tauri/tauri.essai.conf.json');
});
