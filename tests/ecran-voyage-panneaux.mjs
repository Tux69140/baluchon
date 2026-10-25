// Phase 3 (docs/PLAN.md) : la liste d'un voyage en deux panneaux, sur la tablette en paysage
// (1280 × 800, au doigt) et l'ordinateur (1440 × 900, à la souris) ; maquette docs/maquettes/voyage/.
// - contenu d'au plus 1080 px, centré ; à gauche l'en-tête, la progression, le filtre puis les choix
//   de catégorie dans l'ordre de la bibliothèque ; la choisie est la première non bouclée, marquée
//   aria-current, sur fond actif avec sa flèche (témoin : les autres sans flèche) ; à droite ses objets ;
// - toucher Alimentation montre ses objets à droite ;
// - la dernière pièce de Toilette (horloge simulée) : pas de tampon à 900 ms, tampon dans la tête du
//   détail à 1000 ms, puis la catégorie suivante non bouclée à droite une seconde plus tard ;
// - filtre : Papiers, bouclée, en dernier à gauche et atténuée ; la choisir dit que ses objets sont
//   masqués par le filtre ;
// - fiche ouverte sur Dentifrice, Toilette bouclée et quittée entre-temps : à la fermeture, le focus va
//   au choix de Toilette à gauche (l'en-tête d'accordéon n'existe pas en deux panneaux) ;
// - une coche ne ramène pas en haut un panneau qu'on avait fait défiler (fenêtre basse) ; témoin
//   inverse : la catégorie suivante, venue seule après le tampon, se montre depuis son début ;
// - tourner la tablette dans la même page après une coche : en portrait, une colonne, la coche
//   gardée ; de retour en paysage, la même catégorie choisie et la coche toujours là ; une fiche
//   ouverte pendant la rotation se ferme ensuite en rendant le focus à une commande visible ; le
//   lien « Mes voyages » qui a le focus le garde à travers la rotation.
// 2 formats × 2 thèmes : cibles de 44 px, pas de défilement de côté, rien sous les barres système,
// et captures.
import { mkdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { chromium } from 'playwright';
import { attendreQue, calme } from './outils/attente.mjs';
import { demarrerServeur } from './outils/serveur.mjs';
import {
  CAPTURES,
  FORMATS,
  NOMS_THEME,
  RACINE,
  creerJuge,
  ouvrir,
  verifierBarres,
  verifierCommandes,
} from './outils/page.mjs';
import { DONNEES, ETIQUETTES, avecPieces } from './outils/voyage-essai.mjs';

const fr = JSON.parse(await readFile(join(RACINE, 'src/i18n/fr.json'), 'utf8'));
const remplir = (texte, valeurs) => texte.replace(/\{(\w+)\}/g, (_, nom) => String(valeurs[nom]));
const LARGES = {
  'tablette-paysage': { taille: FORMATS['tablette-paysage'], tactile: true },
  ordinateur: { taille: { width: 1440, height: 900 }, tactile: false },
};
const juge = creerJuge();
const serveur = await demarrerServeur();
const navigateur = await chromium.launch();

// horloge : l'horloge de la page arrêtée, que seul le test fait avancer (seconde de répit, tampon).
async function ouvrirVoyage({
  format = 'tablette-paysage',
  theme = 'light',
  horloge = false,
  taille,
  donnees = DONNEES,
} = {}) {
  const ouvert = await ouvrir(navigateur, serveur.url, {
    taille: taille ?? LARGES[format].taille,
    tactile: LARGES[format].tactile,
    theme,
    donnees,
    adresse: '#/voyage/v1',
    horloge,
  });
  if (horloge) await ouvert.page.clock.pauseAt((await ouvert.page.evaluate(() => Date.now())) + 10);
  return ouvert;
}

// Ce que montrent les deux panneaux, lu dans la page.
const lire = page =>
  page.evaluate(() => {
    const panneaux = document.querySelector('main.panneaux');
    const r = panneaux?.getBoundingClientRect();
    const gauche = document.querySelector('.panneau-gauche');
    const choix = [...document.querySelectorAll('.panneau-gauche .choix')];
    const choisie = document.querySelector('.choix[aria-current="true"]');
    const autre = choix.find(c => c !== choisie);
    const fleche = c => c && getComputedStyle(c.querySelector('.chevron')).visibility;
    // L'ordre du panneau de gauche : chaque repère trouvé, dans l'ordre du document.
    const reperes = ['h1', '.progression', '[data-action="filtre"]', '.choix-liste'];
    const ordre = gauche
      ? [...gauche.querySelectorAll(reperes.join(', '))].map(el => reperes.find(s => el.matches(s)))
      : [];
    return {
      panneaux: Boolean(panneaux),
      largeur: r && Math.round(r.width),
      marges: r && [Math.round(r.left), Math.round(innerWidth - r.right)],
      ordreGauche: [...new Set(ordre)].join(' > '),
      choix: choix.map(c => c.dataset.id).join(),
      courant: choix
        .filter(c => c.getAttribute('aria-current') === 'true')
        .map(c => c.dataset.id)
        .join(),
      attenuees: choix
        .filter(c => c.hasAttribute('data-attenuee'))
        .map(c => c.dataset.id)
        .join(),
      // Le fond actif est celui des jauges (var(--actif)) ; la choisie a un bord de 2 px.
      fondActif:
        choisie &&
        getComputedStyle(choisie).backgroundColor === getComputedStyle(gauche.querySelector('.jauge')).backgroundColor,
      fondAutre:
        autre &&
        getComputedStyle(autre).backgroundColor === getComputedStyle(gauche.querySelector('.jauge')).backgroundColor,
      bord: choisie && getComputedStyle(choisie).borderTopWidth,
      fleches: [fleche(choisie), fleche(autre)].join(),
      titre: document.querySelector('.panneau-droit #detail-titre')?.textContent.trim() ?? null,
      objets: [...document.querySelectorAll('.panneau-droit .objet')].map(o => o.dataset.id).join(),
      tampon: Boolean(document.querySelector('.detail-tete .tampon')),
      info: document.querySelector('.panneau-droit .ligne-info')?.textContent.trim() ?? null,
      categories: document.querySelectorAll('.categorie').length,
      // Les puces d'étiquette sont dans le panneau de gauche, sous les dates.
      puces: [...document.querySelectorAll('.panneau-gauche ul.etiquettes-voyage li')].map(li => li.textContent.trim()),
      pucesInteractives: document.querySelectorAll('.etiquettes-voyage :is(a, button, input, [tabindex])').length,
    };
  });

const etatObjet = (page, id) =>
  page.evaluate(id => document.querySelector(`.objet[data-id="${id}"]`)?.dataset.etat, id);

// Ce qui a le focus : une commande visible (action et catégorie ou objet), ou la page elle-même.
const focusActuel = page =>
  page.evaluate(() => {
    const el = document.activeElement;
    if (!el || el === document.body) return 'body';
    const visible = el.getBoundingClientRect().width > 0;
    return `${el.dataset.action ?? el.tagName.toLowerCase()}:${el.dataset.id ?? ''}${visible ? '' : ' (invisible)'}`;
  });

// Une commande absente est une faute dite, pas un arrêt du test : la suite juge ce qui en découle.
const toucher = (page, selecteur) =>
  page.click(selecteur, { timeout: 2000 }).catch(() => juge.exige(false, `commande absente : ${selecteur}`));
const choisir = (page, id) => toucher(page, `.choix[data-id="${id}"]`);
const fermee = page => attendreQue(page, () => !document.querySelector('dialog'));

try {
  await mkdir(CAPTURES, { recursive: true });

  // Disposition, choix, filtre, aux deux formats et dans les deux thèmes.
  for (const theme of ['light', 'dark'])
    for (const format of Object.keys(LARGES)) {
      const cas = `${format}, ${NOMS_THEME[theme]}`;
      const { contexte, page, sorties, erreurs } = await ouvrirVoyage({ format, theme });
      const m = await lire(page);
      juge.exige(m.panneaux && m.categories === 0, `${cas} : pas en deux panneaux ${JSON.stringify(m)}`);
      juge.exige(
        m.largeur <= 1080 && Math.abs(m.marges[0] - m.marges[1]) <= 1,
        `${cas} : contenu de ${m.largeur} px, marges ${m.marges}`,
      );
      juge.exige(
        m.ordreGauche === 'h1 > .progression > [data-action="filtre"] > .choix-liste',
        `${cas} : panneau de gauche ${m.ordreGauche}`,
      );
      juge.exige(m.choix === 'c-pap,c-vet,c-toi,c-ali', `${cas} : choix ${m.choix}`);
      juge.exige(
        JSON.stringify(m.puces) === JSON.stringify(ETIQUETTES) && m.pucesInteractives === 0,
        `${cas} : étiquettes ${JSON.stringify(m.puces)}, ${m.pucesInteractives} élément(s) interactif(s)`,
      );
      juge.exige(
        m.courant === 'c-vet' && m.fondActif && !m.fondAutre && m.bord === '2px' && m.fleches === 'visible,hidden',
        `${cas} : choisie ${m.courant}, fond actif ${m.fondActif}/${m.fondAutre}, bord ${m.bord}, flèches ${m.fleches}`,
      );
      juge.exige(
        m.titre === 'Vêtements' && m.objets === 'o-pan,o-pul,o-pyj,o-sou,o-tsh,o-cha',
        `${cas} : détail ${m.titre} ${m.objets}`,
      );
      await verifierCommandes(page, juge, cas);
      await page.screenshot({ path: join(CAPTURES, `voyage-panneaux-${format}-${NOMS_THEME[theme]}.png`) });

      await choisir(page, 'c-ali');
      const ali = await lire(page);
      juge.exige(
        ali.courant === 'c-ali' && ali.titre === 'Alimentation' && ali.objets === 'o-caf,o-rep,o-gou',
        `${cas} : Alimentation choisie ${ali.courant} ${ali.titre} ${ali.objets}`,
      );

      await toucher(page, '[data-action="filtre"]');
      await calme(page);
      const filtre = await lire(page);
      juge.exige(
        filtre.choix === 'c-vet,c-toi,c-ali,c-pap' && filtre.attenuees === 'c-pap',
        `${cas} : filtre, choix ${filtre.choix}, atténuées ${filtre.attenuees}`,
      );
      await choisir(page, 'c-pap');
      const papiers = await lire(page);
      juge.exige(
        papiers.titre === 'Papiers' && papiers.info === remplir(fr.voyage.categorieMasquee.other, { n: 2 }),
        `${cas} : Papiers sous le filtre ${papiers.titre} « ${papiers.info} »`,
      );
      await calme(page);
      await page.screenshot({ path: join(CAPTURES, `voyage-panneaux-filtre-${format}-${NOMS_THEME[theme]}.png`) });
      await verifierBarres(page, juge, `${cas}, filtre`);
      juge.exige(sorties.length === 0, `${cas} : requêtes hors de l’appli : ${sorties.join(', ')}`);
      juge.exige(erreurs.length === 0, `${cas} : erreurs dans la page : ${erreurs.join(' | ')}`);
      await contexte.close();
    }

  // La dernière pièce de Toilette : tampon, puis la suivante non bouclée à droite.
  {
    const { contexte, page, erreurs } = await ouvrirVoyage({ horloge: true });
    await choisir(page, 'c-toi');
    await toucher(page, '.objet[data-id="o-den"] .case');
    await page.clock.runFor(900);
    const a900 = await lire(page);
    await page.clock.runFor(100);
    const a1000 = await lire(page);
    await page.clock.runFor(1000);
    const a2000 = await lire(page);
    juge.exige(!a900.tampon && a900.titre === 'Toilette', `Toilette à 900 ms : tampon ${a900.tampon}, ${a900.titre}`);
    juge.exige(
      a1000.tampon && a1000.titre === 'Toilette',
      `Toilette à 1000 ms : tampon ${a1000.tampon}, ${a1000.titre}`,
    );
    juge.exige(
      a2000.titre === 'Alimentation' && a2000.courant === 'c-ali',
      `Toilette, une seconde après le tampon : ${a2000.titre}, choisie ${a2000.courant}`,
    );
    juge.exige(erreurs.length === 0, `Toilette : erreurs dans la page : ${erreurs.join(' | ')}`);
    await contexte.close();
  }

  // Fiche fermée après que sa catégorie a cédé la place : focus au choix de cette catégorie.
  {
    const { contexte, page, erreurs } = await ouvrirVoyage({ horloge: true });
    await choisir(page, 'c-toi');
    await toucher(page, '.objet[data-id="o-den"] .objet-corps');
    await attendreQue(page, () => document.querySelector('dialog.fiche[open]') !== null);
    await toucher(page, 'dialog.fiche [data-fiche="tout"]');
    await page.clock.runFor(1000);
    await page.clock.runFor(1000);
    const titre = (await lire(page)).titre;
    await page.keyboard.press('Escape');
    await fermee(page);
    const focus = await focusActuel(page);
    juge.exige(
      titre === 'Alimentation' && focus === 'choisir:c-toi',
      `fiche fermée, Toilette quittée : détail ${titre}, focus ${focus}`,
    );
    juge.exige(erreurs.length === 0, `fiche, deux panneaux : erreurs dans la page : ${erreurs.join(' | ')}`);
    await contexte.close();
  }

  // Fenêtre basse : le panneau de droite défile, et une coche ne le ramène pas en haut.
  {
    const { contexte, page, erreurs } = await ouvrirVoyage({ taille: { width: 1280, height: 420 } });
    const defile = await page.evaluate(() => {
      const droit = document.querySelector('.panneau-droit');
      if (droit) droit.scrollTop = 120;
      return droit?.scrollTop ?? 0;
    });
    await toucher(page, '.objet[data-id="o-tsh"] .case');
    const apres = await page.evaluate(() => document.querySelector('.panneau-droit')?.scrollTop);
    juge.exige(defile > 0 && apres === defile, `panneau défilé de ${defile} px, ${apres} px après une coche`);
    juge.exige(erreurs.length === 0, `défilement : erreurs dans la page : ${erreurs.join(' | ')}`);
    await contexte.close();
  }

  // Fenêtre très basse, Alimentation déjà bouclée : Toilette finie, la suite passe à Vêtements, qui
  // se montre depuis son début, même si Toilette avait été défilée.
  {
    const { contexte, page, erreurs } = await ouvrirVoyage({
      taille: { width: 1280, height: 300 },
      donnees: avecPieces({ 'o-rep': 16, 'o-caf': 1 }),
      horloge: true,
    });
    await choisir(page, 'c-toi');
    await toucher(page, '.objet[data-id="o-den"] .case');
    const defile = await page.evaluate(() => {
      const droit = document.querySelector('.panneau-droit');
      if (droit) droit.scrollTop = droit.scrollHeight;
      return droit?.scrollTop ?? 0;
    });
    await page.clock.runFor(1000);
    await page.clock.runFor(1000);
    const vu = await page.evaluate(() => ({
      titre: document.querySelector('#detail-titre')?.textContent.trim(),
      haut: document.querySelector('.panneau-droit')?.scrollTop,
    }));
    juge.exige(
      defile > 0 && vu.titre === 'Vêtements' && vu.haut === 0,
      `suivante venue seule : Toilette défilée de ${defile} px, puis ${vu.titre} à ${vu.haut} px`,
    );
    juge.exige(erreurs.length === 0, `suivante : erreurs dans la page : ${erreurs.join(' | ')}`);
    await contexte.close();
  }

  // Le lien « Mes voyages » garde le focus à travers la rotation.
  {
    const { contexte, page, erreurs } = await ouvrirVoyage();
    await page.focus('.lien-retour');
    await page.setViewportSize(FORMATS['tablette-portrait']);
    await attendreQue(page, () => !document.querySelector('.panneaux'));
    const focus = await page.evaluate(() => document.activeElement?.matches('.lien-retour'));
    juge.exige(focus, 'rotation : le lien « Mes voyages » a perdu le focus');
    juge.exige(erreurs.length === 0, `retour, rotation : erreurs dans la page : ${erreurs.join(' | ')}`);
    await contexte.close();
  }

  // Tourner la tablette dans la même page : rien de perdu.
  {
    const { contexte, page, erreurs } = await ouvrirVoyage();
    await choisir(page, 'c-ali');
    await toucher(page, '.objet[data-id="o-caf"] .case');
    await page.setViewportSize(FORMATS['tablette-portrait']);
    await attendreQue(page, () => !document.querySelector('.panneaux') && document.querySelector('.categorie'));
    const portrait = await lire(page);
    const cafePortrait = await etatObjet(page, 'o-caf');
    juge.exige(
      !portrait.panneaux && portrait.categories === 4 && cafePortrait === 'plein',
      `en portrait : deux panneaux ${portrait.panneaux}, ${portrait.categories} cartes, Café ${cafePortrait}`,
    );
    await page.setViewportSize(FORMATS['tablette-paysage']);
    await attendreQue(page, () => document.querySelector('.panneaux'));
    const paysage = await lire(page);
    const cafePaysage = await etatObjet(page, 'o-caf');
    juge.exige(
      paysage.panneaux && paysage.titre === 'Alimentation' && paysage.courant === 'c-ali' && cafePaysage === 'plein',
      `de retour en paysage : ${paysage.titre}, choisie ${paysage.courant}, Café ${cafePaysage}`,
    );

    // Une fiche ouverte pendant la rotation se ferme sans viser un élément disparu.
    await toucher(page, '.objet[data-id="o-rep"] .objet-corps');
    await attendreQue(page, () => document.querySelector('dialog.fiche[open]') !== null);
    await page.setViewportSize(FORMATS['tablette-portrait']);
    await attendreQue(page, () => !document.querySelector('.panneaux'));
    await page.keyboard.press('Escape');
    await fermee(page);
    const focus = await focusActuel(page);
    juge.exige(focus === 'fiche:o-rep', `fiche fermée après rotation : focus ${focus}`);
    juge.exige(erreurs.length === 0, `rotation : erreurs dans la page : ${erreurs.join(' | ')}`);
    await contexte.close();
  }
} finally {
  await navigateur.close();
  await serveur.fermer();
}
juge.conclure(
  'Liste d’un voyage en deux panneaux',
  '2 formats × 2 thèmes, choix, tampon puis suivante, filtre, focus après la fiche, défilement, rotation',
);
