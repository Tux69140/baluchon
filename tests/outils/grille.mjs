// La grille de la phase 14 : un même parcours de vérifications pour chaque écran, à chaque format et
// chaque thème. Les formats bloquants jugent par le code de sortie ; les formats « en rapport » notent
// leurs défauts dans captures-travail/phase-14/rapports/ avec une capture de l'état fautif.
import { mkdir, readdir, rm } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { chromium } from 'playwright';
import {
  CAPTURES,
  FORMATS,
  FORMATS_RAPPORT,
  ZONES_PAR_FORMAT,
  creerJuge,
  creerRapport,
  ouvrir,
  poserZones,
  verifierBarres,
  verifierCommandes,
  verifierLargeur,
} from './page.mjs';
import { demarrerServeur } from './serveur.mjs';

export const FORMATS_BLOQUANTS = ['telephone', 'tablette-portrait', 'tablette-paysage', 'portable', 'ordinateur'];
const AVEC_SOURIS = ['portable', 'ordinateur'];

// Un état : { nom, adresse, donnees, composition, maintenant, preparer, erreursAttendues }. erreursAttendues :
// les morceaux de message d'erreur de la page qu'une panne simulée provoque exprès (les autres restent des fautes). Si `capture` est donné, la page
// en est photographiée quand cet état, à ce format et ce thème, a au moins une faute.
async function verifierEtat(navigateur, url, etat, format, theme, juge, capture) {
  const cas = `${etat.nom} · ${format} · ${theme}`;
  const { adresse = '', donnees, composition, maintenant, preparer = async () => {}, erreursAttendues = [] } = etat;
  let fautes = 0;
  const compte = {
    exige(condition, message) {
      if (!condition) fautes += 1;
      juge.exige(condition, message);
    },
  };
  const { contexte, page, sorties, erreurs } = await ouvrir(navigateur, url, {
    taille: { ...FORMATS, ...FORMATS_RAPPORT }[format],
    theme,
    donnees,
    maintenant,
    adresse,
    tactile: !AVEC_SOURIS.includes(format),
    ...(composition !== undefined && { composition }),
  });
  try {
    await poserZones(page, ZONES_PAR_FORMAT[format]);
    await preparer(page);
    await verifierCommandes(page, compte, cas);
    await verifierBarres(page, compte, cas, ZONES_PAR_FORMAT[format]);
    if (AVEC_SOURIS.includes(format)) await verifierLargeur(page, compte, cas);
    const imprevues = erreurs.filter(e => !erreursAttendues.some(a => e.includes(a)));
    compte.exige(imprevues.length === 0, `${cas} : erreurs de page : ${imprevues.join(' | ')}`);
    compte.exige(sorties.length === 0, `${cas} : requêtes sortantes : ${sorties.join(', ')}`);
    if (capture && fautes) {
      await mkdir(dirname(capture), { recursive: true });
      await page.screenshot({ path: capture });
    }
  } finally {
    await contexte.close();
  }
}

// Les rapports et captures d'une exécution précédente de ce titre : un état devenu propre n'en laisse pas.
async function purgerRapports(titre, rapport) {
  const dossier = join(CAPTURES, 'phase-14', 'rapports');
  const anciens = await readdir(dossier).catch(() => []);
  for (const nom of anciens)
    if (rapport.some(f => nom === `${titre}-${f}.txt` || (nom.startsWith(`${titre}-${f}-`) && nom.endsWith('.png'))))
      await rm(join(dossier, nom));
}

export async function parcourirGrille({
  titre,
  etats,
  formats = FORMATS_BLOQUANTS,
  rapport = ['telephone-paysage'],
  juge = creerJuge(),
  fabriquerRapport = creerRapport,
}) {
  await purgerRapports(titre, rapport);
  const serveur = await demarrerServeur();
  const navigateur = await chromium.launch();
  try {
    for (const format of formats)
      for (const theme of ['light', 'dark'])
        for (const etat of etats) await verifierEtat(navigateur, serveur.url, etat, format, theme, juge);
    for (const format of rapport) {
      const noteur = fabriquerRapport(`${titre}-${format}`);
      for (const etat of etats) {
        const capture = join(CAPTURES, 'phase-14', 'rapports', `${titre}-${format}-${etat.nom}.png`);
        await verifierEtat(navigateur, serveur.url, etat, format, 'light', noteur, capture);
      }
      noteur.conclure(`${titre}-${format}`, '');
    }
  } finally {
    await navigateur.close();
    await serveur.fermer();
  }
  juge.conclure(titre, `${etats.length} état(s) vérifiés à ${formats.length} format(s), clair et sombre`);
}
