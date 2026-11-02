// Phase 14 : le clavier qui s'ouvre sur une tablette couchée ne fait perdre ni la fiche ni la place dans la
// liste. Sous Android 11 et plus, la page s'arrête au bord du clavier (MainActivity.kt) : une tablette de
// 1280 × 800 tombe à 1280 × 420 pendant la saisie, sous les 600 px du grand format. On l'essaie sur l'écran
// d'un voyage (fiche d'un objet, « Renommer ») et sur la Bibliothèque (fiche d'un objet modèle), en repli
// (1280 × 800, la page défile) et en trois colonnes (1440 × 900, chaque colonne défile) : la liste défilée
// jusqu'en bas, la fiche ouverte sur le dernier objet, un nom tapé, puis le clavier ouvert (même largeur ×
// 420) et refermé. Exigé (bloquant) :
// - clavier ouvert : la fiche toujours ouverte, la saisie et le focus gardés, le champ et le bouton qui
//   enregistre visibles ;
// - clavier refermé : la même chose, et l'écran de fond défilé exactement comme avant (page et colonnes).
import { chromium } from 'playwright';
import { attendreQue, calme } from './outils/attente.mjs';
import { RENOMMER } from './outils/ajuster.mjs';
import { fermerEssai, ouvrirBibliotheque, vu } from './outils/bibliotheque.mjs';
import { FICHE as FICHE_MODELE, attendreOuverte, montrerCategorie, saisir } from './outils/fiches.mjs';
import { bibliothequeDeNoms, graineMini, miniAvecNoms } from './outils/mini-bibliotheque.mjs';
import { attendreEcran, creerJuge, ouvrir } from './outils/page.mjs';
import { demarrerServeur } from './outils/serveur.mjs';
import { DONNEES as VOYAGES, cat, obj } from './outils/voyage-grand-format.mjs';

const juge = creerJuge();
const serveur = await demarrerServeur();
const navigateur = await chromium.launch();
const HAUTEUR_CLAVIER_OUVERT = 420;
// Deux tablettes couchées, au doigt : le repli et les trois colonnes.
const TABLETTES = {
  repli: { width: 1280, height: 800 },
  'trois colonnes': { width: 1440, height: 900 },
};

// Le défilement de l'écran de fond : la page, puis chaque colonne (absente : null).
const defilements = page =>
  page.evaluate(() => ({
    page: Math.round(scrollY),
    colonnes: ['.gf-gauche', '.gf-menu', '.gf-liste'].map(s => document.querySelector(s)?.scrollTop ?? null),
  }));

// Liste et menu menés tout en bas : la page en repli, chaque colonne en trois colonnes.
async function defilerEnBas(page) {
  await page.evaluate(() => {
    for (const s of ['.gf-gauche', '.gf-menu', '.gf-liste']) {
      const c = document.querySelector(s);
      if (c) c.scrollTop = c.scrollHeight;
    }
    scrollTo(0, document.documentElement.scrollHeight);
  });
  await calme(page);
}

// La fiche de saisie : ouverte, sa valeur, le focus, le champ et le bouton qui enregistre visibles (rien
// ne les couvre, et ils sont dans la fenêtre).
const lireSaisie = (page, fiche) =>
  page.evaluate(fiche => {
    const d = [...document.querySelectorAll(fiche)].find(x => x.matches(':modal'));
    if (!d) return null;
    const visible = el => {
      const r = el?.getBoundingClientRect();
      if (!r || r.width === 0 || r.top < -0.5 || r.bottom > innerHeight + 0.5) return false;
      return el.contains(document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2));
    };
    return {
      valeur: d.querySelector('#f-nom')?.value ?? null,
      focus: d.contains(document.activeElement) ? document.activeElement.id : null,
      champ: visible(d.querySelector('#f-nom')),
      enregistrer: visible(d.querySelector('[data-enregistrer]')),
    };
  }, fiche);

// La fenêtre passe à cette taille ; on attend qu'elle l'ait prise puis que l'écran se pose.
async function redimensionner(page, { width, height }) {
  await page.setViewportSize({ width, height });
  await attendreQue(page, ([l, h]) => innerWidth === l && innerHeight === h, [width, height]);
  await calme(page);
}

// Un essai : `preparer` ouvre la fiche sur le dernier objet de la liste défilée et y tape `nom` ;
// `fiche` : la fenêtre de saisie ; `temoin` : la fiche du dessous qui doit rester ouverte, s'il y en a une.
async function essayer(titre, ouvert, taille, { preparer, fiche, temoin, nom }) {
  const { page } = ouvert;
  await preparer(page);
  const fond = await defilements(page);
  const avant = await lireSaisie(page, fiche);
  juge.exige(
    fond.page + fond.colonnes.reduce((s, c) => s + (c ?? 0), 0) > 0,
    `${titre} : témoin, l'écran de fond n'est pas défilé ${vu(fond)}`,
  );
  juge.exige(
    avant?.valeur === nom && avant.focus === 'f-nom' && avant.champ && avant.enregistrer,
    `${titre} : la saisie n'est pas posée ${vu(avant)}`,
  );
  const ouverte = () => page.evaluate(s => !s || document.querySelector(`${s}[open]`) !== null, temoin);
  await redimensionner(page, { width: taille.width, height: HAUTEUR_CLAVIER_OUVERT });
  const clavier = await lireSaisie(page, fiche);
  juge.exige(
    (await ouverte()) && vu(clavier) === vu(avant),
    `${titre}, clavier ouvert : avant ${vu(avant)}, pendant ${vu(clavier)}`,
  );
  await redimensionner(page, taille);
  const apres = await lireSaisie(page, fiche);
  juge.exige(
    (await ouverte()) && vu(apres) === vu(avant),
    `${titre}, clavier refermé : avant ${vu(avant)}, après ${vu(apres)}`,
  );
  const fondApres = await defilements(page);
  juge.exige(vu(fondApres) === vu(fond), `${titre}, clavier refermé : fond avant ${vu(fond)}, après ${vu(fondApres)}`);
  await fermerEssai(juge, titre, ouvert);
}

// ---------- Écran d'un voyage : Camping (12 objets) du voyage aux 11 catégories ----------
const DERNIER_CAMPING = obj('v3', 'cam', 11);
for (const [disposition, taille] of Object.entries(TABLETTES)) {
  const ouvert = await ouvrir(navigateur, serveur.url, {
    taille,
    theme: 'light',
    donnees: VOYAGES,
    adresse: '#/voyage/v3',
  });
  ouvert.page.setDefaultTimeout(5000);
  await attendreEcran(ouvert.page, 'voyage');
  await essayer(`voyage, ${disposition}`, ouvert, taille, {
    async preparer(page) {
      await page.click(`.gf-menu [data-action="choisir"][data-id="${cat('v3', 'cam')}"]`);
      await calme(page);
      await defilerEnBas(page);
      await page.click(`#app .objet[data-id="${DERNIER_CAMPING}"] .objet-corps`);
      await attendreQue(page, () => document.querySelector('dialog.fiche-voyage:modal') !== null);
      await calme(page);
      await page.click('dialog.fiche-voyage [data-fiche="renommer"]');
      await attendreQue(page, s => document.querySelector(`${s}:modal`) !== null, RENOMMER);
      await calme(page);
      await page.fill(`${RENOMMER} #f-nom`, 'Gamelle inox');
      await page.focus(`${RENOMMER} #f-nom`);
    },
    fiche: RENOMMER,
    temoin: 'dialog.fiche-voyage',
    nom: 'Gamelle inox',
  });
}

// ---------- Bibliothèque : Camping allongée à 20 objets ----------
let numero = 0;
const description = miniAvecNoms();
const camping = description.categories.find(c => c.nom === 'Camping');
const modele = camping.objets[0];
for (let i = camping.objets.length; i < 20; i++) camping.objets.push({ ...modele, nom: `Objet de camping ${i + 1}` });
const BIBLIOTHEQUE = {
  toucheRetour: true,
  ...graineMini(bibliothequeDeNoms(description, { nouvelId: () => `id-${++numero}`, maintenant: 'x' })),
};
for (const [disposition, taille] of Object.entries(TABLETTES)) {
  const ouvert = await ouvrirBibliotheque(navigateur, serveur.url, 'tablette-paysage', {
    donnees: BIBLIOTHEQUE,
    taille,
  });
  ouvert.page.setDefaultTimeout(5000);
  await essayer(`Bibliothèque, ${disposition}`, ouvert, taille, {
    async preparer(page) {
      await montrerCategorie(page, 'Camping');
      await defilerEnBas(page);
      await page.click('#app .gf-liste li.objet-modele:has(.objet-nom:text-is("Objet de camping 20")) .objet-corps');
      await attendreOuverte(page);
      await saisir(page, '#f-nom', 'Réchaud à gaz');
      await page.focus(`${FICHE_MODELE} #f-nom`);
    },
    fiche: FICHE_MODELE,
    temoin: null,
    nom: 'Réchaud à gaz',
  });
}

await navigateur.close();
await serveur.fermer();
juge.conclure(
  'clavier ouvert sur une tablette couchée',
  'voyage et Bibliothèque, repli et trois colonnes : fiche, saisie, focus et place dans la liste gardés',
);
