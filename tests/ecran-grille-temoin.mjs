// Témoin de l'outillage de la grille (phase 14) : deux états sur l'écran Réglages.
// - « propre » : rien d'ajouté, aucune faute à aucun format.
// - « fautif » : une petite cible et un bloc trop large, ajoutés à la page ; chaque format bloquant
//   les relève dans le juge, le format en rapport seulement (telephone-paysage) les met au rapport.
// Le juge et la fabrique de rapport sont des espions : ils reçoivent les fautes au lieu de conclure. Les
// captures du témoin vont dans un dossier de passage, effacé à la fin : le dossier des rapports, montré au
// chef de projet, n'en reçoit aucune. Le vrai rapport (creerRapport) est essayé à part, dans ce même
// dossier : des fautes l'écrivent, une exécution propre efface celui d'avant.
import { existsSync, readdirSync, writeFileSync } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parcourirGrille, FORMATS_BLOQUANTS } from './outils/grille.mjs';
import { CAPTURES, creerRapport } from './outils/page.mjs';

const fautesJuge = [];
const fautesRapport = [];
const juge = {
  exige: (condition, message) => !condition && fautesJuge.push(message),
  conclure() {},
};
const fabriquerRapport = () => ({
  exige: (condition, message) => !condition && fautesRapport.push(message),
  conclure() {},
});

const base = {
  adresse: '#/reglages',
  donnees: { toucheRetour: true, voyages: [] },
  maintenant: new Date('2026-10-31T18:40:00'),
};
const etats = [
  { ...base, nom: 'propre' },
  {
    ...base,
    nom: 'fautif',
    preparer: async page => {
      await page.evaluate(() => {
        document
          .querySelector('#app main')
          .insertAdjacentHTML(
            'beforeend',
            '<button style="width:30px;height:30px">x</button><div style="width:2000px;height:4px"></div>',
          );
      });
    },
  },
];

const RAPPORTS = join(CAPTURES, 'phase-14', 'rapports');
const passage = await mkdtemp(join(tmpdir(), 'baluchon-temoin-'));
await parcourirGrille({ titre: 'temoin', etats, juge, fabriquerRapport, dossier: passage });

const verdict = [];
const attend = (condition, message) => !condition && verdict.push(message);
const temoinsDansRapports = (existsSync(RAPPORTS) ? readdirSync(RAPPORTS) : []).filter(nom => nom.startsWith('temoin'));
attend(temoinsDansRapports.length === 0, `le témoin laisse dans les rapports : ${temoinsDansRapports.join(', ')}`);
attend(existsSync(join(passage, 'temoin-telephone-paysage-fautif.png')), 'aucune capture de l’état fautif au rapport');

// Le vrai rapport : écrit quand il y a des fautes, effacé par une exécution propre.
const fautif = creerRapport('temoin-rapport', passage);
fautif.exige(false, 'une faute');
fautif.conclure();
attend(existsSync(join(passage, 'temoin-rapport.txt')), 'creerRapport : des fautes, et aucun rapport écrit');
writeFileSync(join(passage, 'temoin-propre.txt'), 'un ancien rapport\n');
creerRapport('temoin-propre', passage).conclure();
attend(!existsSync(join(passage, 'temoin-propre.txt')), 'creerRapport : une exécution propre garde l’ancien rapport');
await rm(passage, { recursive: true, force: true });
attend(
  fautesJuge.every(f => f.startsWith('fautif')),
  `l'état propre a des fautes : ${fautesJuge.filter(f => !f.startsWith('fautif')).join(' | ')}`,
);
for (const format of FORMATS_BLOQUANTS) {
  const siens = fautesJuge.filter(f => f.includes(` · ${format} · `));
  attend(
    siens.some(f => f.includes('cibles de moins de 44 px')),
    `${format} : aucune faute de petite cible`,
  );
  attend(
    siens.some(f => f.includes('défile de côté')),
    `${format} : aucune faute de défilement de côté`,
  );
  if (['portable', 'ordinateur'].includes(format))
    attend(
      siens.some(f => f.includes('contenu principal trop large')),
      `${format} : aucune faute de contenu trop large`,
    );
}
attend(
  !fautesJuge.some(f => f.includes('telephone-paysage')),
  'telephone-paysage ne doit pas être dans le juge bloquant',
);
attend(
  fautesRapport.some(f => f.includes('telephone-paysage') && f.startsWith('fautif')),
  'telephone-paysage : aucune faute au rapport',
);
attend(!fautesRapport.some(f => f.startsWith('propre')), "l'état propre a des fautes au rapport");

if (verdict.length) {
  console.error(`✗ témoin de la grille : ${verdict.length} attente(s) manquée(s)`);
  for (const v of verdict) console.error(`    ${v}`);
  process.exit(1);
}
console.log(
  `✓ témoin de la grille : ${fautesJuge.length} faute(s) bloquante(s), ${fautesRapport.length} au rapport, comme attendu`,
);
