// Phase 1 (docs/PLAN.md) : l'écran Voyages du premier lancement (US-29, US-35, US-37).
// Au téléphone (393 × 873) et à la tablette (800 × 1280, 1280 × 800), en clair puis en sombre :
// - l'écran vide s'affiche, mascotte, invitation et bouton « Nouveau voyage » (44 × 44 au moins),
//   tous ses textes venus de src/i18n/fr.json ;
// - le fond suit le thème de l'appareil (sable en clair, nuit marine en sombre) ;
// - les polices sont celles de l'appli, chargées sans aucune requête hors de l'appli (hors ligne) ;
// - toute commande offre 44 × 44 px, rien ne défile de côté ; avec des barres système simulées,
//   rien ne passe dessous ;
// - le premier lancement installe la bibliothèque de départ de fr.json, en français.
// Témoin : un stockage qui contient un voyage ne montre pas l'écran vide, mais ce voyage — l'écran
// lit donc bien le stockage, et l'écran vide n'est pas affiché d'office.
// Une bibliothèque déjà installée (celle de l'utilisateur) n'est jamais remplacée par celle de départ.
// Une adresse inconnue ramène à Mes voyages (#/voyages).
// Captures claire et sombre à la tablette en portrait, dans captures-travail/.
import { mkdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { chromium } from 'playwright';
import { demarrerServeur } from './outils/serveur.mjs';
import {
  CAPTURES,
  FORMATS,
  NOMS_THEME,
  RACINE,
  attendreEcran,
  creerJuge,
  lireStockage,
  ouvrir,
  verifierBarres,
  verifierCommandes,
} from './outils/page.mjs';

const fr = JSON.parse(await readFile(join(RACINE, 'src/i18n/fr.json'), 'utf8'));
// Fond de page attendu (docs/DESIGN.md) : sable en clair, nuit marine en sombre.
const FONDS = { light: 'rgb(247, 246, 241)', dark: 'rgb(13, 22, 36)' };
const juge = creerJuge();

// Mesures prises dans la page.
function mesurer() {
  const vide = document.querySelector('.vide');
  const bouton = vide?.querySelector('.bouton');
  const image = vide?.querySelector('img');
  const rect = bouton?.getBoundingClientRect();
  return {
    ecran: document.querySelector('#app')?.dataset.ecran,
    titre: vide?.querySelector('h2')?.textContent.trim(),
    bouton: bouton?.textContent.trim(),
    tailleBouton: rect ? { largeur: rect.width, hauteur: rect.height } : null,
    mascotte: Boolean(image?.complete && image.naturalWidth > 0),
    fond: getComputedStyle(document.body).backgroundColor,
    polices: [...document.fonts].filter(f => f.status === 'loaded').map(f => f.family.replace(/"/g, '')),
    policeTitre: document.querySelector('h1') ? getComputedStyle(document.querySelector('h1')).fontFamily : '',
    langue: document.documentElement.lang,
    titreFenetre: document.title,
  };
}

const serveur = await demarrerServeur();
const navigateur = await chromium.launch();
try {
  await mkdir(CAPTURES, { recursive: true });
  for (const theme of ['light', 'dark']) {
    for (const [format, taille] of Object.entries(FORMATS)) {
      const cas = `${format}, ${NOMS_THEME[theme]}`;
      const { contexte, page, sorties, erreurs } = await ouvrir(navigateur, serveur.url, { taille, theme });
      const m = await page.evaluate(mesurer);
      juge.exige(m.ecran === 'voyages', `${cas} : l’écran Voyages n’est pas affiché (${m.ecran})`);
      juge.exige(m.titre === fr.voyages.vide.titre, `${cas} : invitation inattendue « ${m.titre} »`);
      juge.exige(m.bouton === fr.voyages.nouveau, `${cas} : bouton inattendu « ${m.bouton} »`);
      juge.exige(
        m.tailleBouton?.largeur >= 44 && m.tailleBouton?.hauteur >= 44,
        `${cas} : bouton trop petit (${JSON.stringify(m.tailleBouton)})`,
      );
      juge.exige(m.mascotte, `${cas} : la mascotte n’est pas affichée`);
      juge.exige(m.fond === FONDS[theme], `${cas} : fond ${m.fond}, attendu ${FONDS[theme]}`);
      juge.exige(
        m.polices.includes('Baumans') && m.polices.includes('Source Sans 3'),
        `${cas} : polices chargées ${m.polices}`,
      );
      juge.exige(m.policeTitre.startsWith('Baumans'), `${cas} : le titre n’est pas en Baumans (${m.policeTitre})`);
      juge.exige(
        m.langue === 'fr' && m.titreFenetre === fr.appli.nom,
        `${cas} : langue « ${m.langue} », titre « ${m.titreFenetre} »`,
      );
      const stocke = await lireStockage(page);
      juge.exige(
        stocke.bibliotheque?.categories.map(c => c.nom).join() ===
          fr.bibliothequeDeDepart.categories.map(c => c.nom).join() && stocke.meta?.langueBibliotheque === 'fr',
        `${cas} : bibliothèque de départ non installée (${JSON.stringify(stocke.meta)})`,
      );
      await verifierCommandes(page, juge, cas);
      if (format === 'tablette-portrait')
        await page.screenshot({ path: join(CAPTURES, `voyages-vide-${NOMS_THEME[theme]}.png`) });
      await verifierBarres(page, juge, cas);
      juge.exige(sorties.length === 0, `${cas} : requêtes hors de l’appli : ${sorties.join(', ')}`);
      juge.exige(erreurs.length === 0, `${cas} : erreurs dans la page : ${erreurs.join(' | ')}`);
      await contexte.close();
    }
  }

  // Témoin : un voyage dans le stockage, et l'écran le montre au lieu de l'écran vide.
  const voyage = {
    id: 'v1',
    nom: 'Vercors',
    destination: 'Autrans',
    depart: '2026-10-10',
    retour: '2026-10-13',
    voyageurs: 2,
  };
  const temoin = await ouvrir(navigateur, serveur.url, {
    taille: FORMATS['tablette-portrait'],
    theme: 'light',
    donnees: { voyages: [voyage] },
  });
  const vu = await temoin.page.evaluate(() => ({
    ecran: document.querySelector('#app')?.dataset.ecran,
    vide: Boolean(document.querySelector('.vide')),
    texte: document.querySelector('#app').textContent,
  }));
  juge.exige(
    vu.ecran === 'voyages' && !vu.vide && vu.texte.includes('Vercors'),
    `témoin : un voyage enregistré devrait remplacer l’écran vide (${JSON.stringify(vu)})`,
  );
  await temoin.contexte.close();

  // Lancement suivant : la bibliothèque de l'utilisateur, ici une seule catégorie à lui, reste la sienne.
  const sienne = {
    categories: [{ id: 'c1', nom: 'Mes affaires', icone: 'tooth', couleur: 'lilas', ordre: 0, toujoursIncluse: true }],
    objets: [],
  };
  const relance = await ouvrir(navigateur, serveur.url, {
    taille: FORMATS.telephone,
    theme: 'light',
    donnees: { bibliotheque: sienne, meta: { bibliothequeInstallee: true, langueBibliotheque: 'fr' } },
  });
  const gardee = (await lireStockage(relance.page)).bibliotheque;
  juge.exige(
    JSON.stringify(gardee) === JSON.stringify(sienne),
    `relance : la bibliothèque de l’utilisateur a été remplacée (${JSON.stringify(gardee).slice(0, 80)})`,
  );
  await relance.contexte.close();

  // Une adresse inconnue ramène à Mes voyages, et l'adresse affichée le dit.
  const egare = await ouvrir(navigateur, serveur.url, {
    taille: FORMATS.telephone,
    theme: 'light',
    adresse: '#/nimporte',
  });
  await attendreEcran(egare.page, 'voyages');
  const adresse = await egare.page.evaluate(() => location.hash);
  juge.exige(adresse === '#/voyages', `adresse inconnue : l’appli devrait ramener à #/voyages (${adresse})`);
  juge.exige(egare.erreurs.length === 0, `adresse inconnue : erreurs dans la page : ${egare.erreurs.join(' | ')}`);
  await egare.contexte.close();
} finally {
  await navigateur.close();
  await serveur.fermer();
}

juge.conclure('Écran Voyages vide', '3 formats × 2 thèmes, témoin compris');
