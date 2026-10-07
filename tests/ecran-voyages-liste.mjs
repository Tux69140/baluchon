// Phase 2 (docs/PLAN.md) : la liste des voyages classée (US-28).
// Le 12 octobre 2026 (horloge de la page fixée), des voyages enregistrés dans le désordre :
// - rubriques « En cours », « À venir », « Passés », dans cet ordre, et dans chacune l'ordre prévu
//   (à venir : du plus proche au plus lointain ; passés : du plus récent au plus ancien) ; un voyage
//   qui part ou rentre aujourd'hui est en cours ;
// - chaque carte mène à son voyage ; un nom avec des caractères spéciaux s'affiche tel quel ; un nom
//   très long sans espace ne fait pas défiler la page de côté ;
// - le bouton flottant « Nouveau voyage » mène à l'assistant et ne cache jamais la dernière carte ;
// - une adresse inconnue ramène à Mes voyages.
// Témoin : avec seulement des voyages à venir, une seule rubrique s'affiche.
// 3 formats × 2 thèmes : cibles de 44 px, pas de défilement de côté, rien sous les barres système.
import { mkdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { chromium } from 'playwright';
import { calme } from './outils/attente.mjs';
import { demarrerServeur } from './outils/serveur.mjs';
import {
  CAPTURES,
  FORMATS,
  NOMS_THEME,
  RACINE,
  attendreEcran,
  creerJuge,
  ouvrir,
  verifierBarres,
  verifierCommandes,
} from './outils/page.mjs';

const fr = JSON.parse(await readFile(join(RACINE, 'src/i18n/fr.json'), 'utf8'));
const MAINTENANT = new Date('2026-10-12T10:00:00');
const NOM_SPECIAL = '<b>Été & "co"</b>';
const NOM_LONG = 'A'.repeat(120);
const v = (id, nom, depart, retour) => ({
  id,
  nom,
  destination: 'Quelque part',
  depart,
  retour,
  voyageurs: 2,
  modifieLe: 'x',
});
const VOYAGES = [
  v('p1', 'Pâques', '2026-04-03', '2026-04-06'),
  v('a2', 'Noël', '2026-12-20', '2026-12-27'),
  v('c1', 'Vercors', '2026-10-10', '2026-10-13'),
  v('p2', 'Week-end', '2026-10-09', '2026-10-11'),
  v('a1', 'Toussaint', '2026-10-24', '2026-11-01'),
  v('c2', 'Rentre aujourd’hui', '2026-10-05', '2026-10-12'),
  v('c3', 'Part aujourd’hui', '2026-10-12', '2026-10-20'),
  v('a3', NOM_SPECIAL, '2026-11-05', '2026-11-06'),
  v('a4', NOM_LONG, '2027-01-01', '2027-01-02'),
];
const ATTENDU = [
  [fr.voyages.rubriques.enCours, ['Rentre aujourd’hui', 'Vercors', 'Part aujourd’hui']],
  [fr.voyages.rubriques.aVenir, ['Toussaint', NOM_SPECIAL, 'Noël', NOM_LONG]],
  [fr.voyages.rubriques.passes, ['Week-end', 'Pâques']],
];

const lireRubriques = page =>
  page.evaluate(() =>
    [...document.querySelectorAll('.rubrique')].map(r => [
      r.querySelector('h2').textContent.trim(),
      [...r.querySelectorAll('.carte-voyage-nom')].map(n => n.textContent),
    ]),
  );

const juge = creerJuge();
const serveur = await demarrerServeur();
const navigateur = await chromium.launch();
try {
  await mkdir(CAPTURES, { recursive: true });
  for (const theme of ['light', 'dark']) {
    for (const [format, taille] of Object.entries(FORMATS)) {
      const cas = `${format}, ${NOMS_THEME[theme]}`;
      const { contexte, page, sorties, erreurs } = await ouvrir(navigateur, serveur.url, {
        taille,
        theme,
        maintenant: MAINTENANT,
        donnees: { voyages: VOYAGES },
      });
      juge.exige(
        JSON.stringify(await lireRubriques(page)) === JSON.stringify(ATTENDU),
        `${cas} : rubriques ${JSON.stringify(await lireRubriques(page))}`,
      );
      const liens = await page.$$eval('a.carte-voyage', as => as.map(a => a.getAttribute('href')));
      juge.exige(liens[0] === '#/voyage/c2' && liens.length === VOYAGES.length, `${cas} : liens ${liens}`);
      const flottant = await page.$eval('.bouton-flottant', a => ({
        href: a.getAttribute('href'),
        texte: a.textContent.trim(),
      }));
      juge.exige(
        flottant.href === '#/nouveau-voyage' && flottant.texte === fr.voyages.nouveau,
        `${cas} : bouton flottant ${JSON.stringify(flottant)}`,
      );
      await verifierCommandes(page, juge, cas);
      if (format === 'tablette-portrait')
        await page.screenshot({ path: join(CAPTURES, `voyages-liste-${NOMS_THEME[theme]}.png`) });
      // Tout en bas, la dernière carte reste au-dessus du bouton flottant.
      await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
      await calme(page);
      const cache = await page.evaluate(() => {
        const cartes = document.querySelectorAll('.carte-voyage');
        return (
          cartes[cartes.length - 1].getBoundingClientRect().bottom >
          document.querySelector('.bouton-flottant').getBoundingClientRect().top
        );
      });
      juge.exige(!cache, `${cas} : le bouton flottant cache la dernière carte`);
      await verifierBarres(page, juge, cas);
      juge.exige(sorties.length === 0, `${cas} : requêtes hors de l’appli : ${sorties.join(', ')}`);
      juge.exige(erreurs.length === 0, `${cas} : erreurs dans la page : ${erreurs.join(' | ')}`);
      await contexte.close();
    }
  }

  // Une adresse inconnue ramène à Mes voyages.
  const egare = await ouvrir(navigateur, serveur.url, {
    taille: FORMATS.telephone,
    theme: 'light',
    adresse: '#/nimporte',
  });
  await attendreEcran(egare.page, 'voyages');
  juge.exige(
    (await egare.page.evaluate(() => location.hash)) === '#/voyages',
    'adresse inconnue : pas de retour à #/voyages',
  );
  await egare.contexte.close();

  // Témoin : seulement des voyages à venir → une seule rubrique.
  const temoin = await ouvrir(navigateur, serveur.url, {
    taille: FORMATS.telephone,
    theme: 'light',
    maintenant: MAINTENANT,
    donnees: { voyages: [v('a1', 'Toussaint', '2026-10-24', '2026-11-01')] },
  });
  const seule = await lireRubriques(temoin.page);
  juge.exige(
    seule.length === 1 && seule[0][0] === fr.voyages.rubriques.aVenir,
    `témoin : rubriques ${JSON.stringify(seule)}`,
  );
  await temoin.contexte.close();
} finally {
  await navigateur.close();
  await serveur.fermer();
}
juge.conclure('Écran Voyages classé', '3 formats × 2 thèmes, adresse inconnue et témoin compris');
