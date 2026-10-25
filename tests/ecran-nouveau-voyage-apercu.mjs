// Phase 4 (docs/PRD.md, « Aperçu », « Aperçu vide », US-12, US-13) : l'aperçu de l'assistant et la
// création du voyage. Le 6 octobre 2026 (horloge fixée), bibliothèque de départ installée par l'appli :
// - Randonnée, Camping, Froid et Tente choisis, du 13 au 15 novembre, 2 voyageurs : le titre « n objets
//   retenus sur n » et les lignes de chaque catégorie (noms, quantités, ordre) sont ceux que calcule le
//   modèle (genererApercu) ; Camping y est, la Crème solaire non ; le rappel dit le nom tel quel, même
//   piégé (`<i>`, `&`, guillemets) ;
// - la tête d'Alimentation écarte toute la catégorie (case vide), Repas recoché la met « en partie » ;
//   le titre se recompte ; deux colonnes de catégories à 1280 × 800, une seule à 800 × 1280 ;
// - « Créer le voyage » ouvre le voyage, sans Gourde, avec Camping ; le stockage garde ses quatre
//   étiquettes, dans l'ordre des groupes ;
// - double appui sur « Créer le voyage » : un seul voyage ;
// - panne d'enregistrement (téléphone, fenêtre) : bandeau d'alerte en bas, on reste sur l'aperçu, rien
//   ne bouge, « Créer le voyage » reste visible ; la panne levée, un second appui crée un seul voyage ;
// - tout écarté : la raison est écrite (#raison-vide), « Créer le voyage » grisé et sans effet ;
//   témoin : une catégorie recochée le rend actif ;
// - bibliothèque dont rien n'entre : mascotte et message (.apercu-vide), « Créer » grisé, et « Revenir
//   aux étiquettes » mène à Activités.
// - objets écartés (Gourde, nom et catégorie piégés) : aller-retour Aperçu → Activités → Aperçu sans
//   changement, aucune fenêtre, Gourde reste écartée ; Randonnée retirée (ou remise), la fenêtre nomme
//   Gourde et sa catégorie, échappées ; retour système (Review Focus 4 : elle seule se ferme, on reste
//   sur l'aperçu), Échap et « Les garder écartés » la gardent écartée ; « Les remettre dans la liste »
//   la recoche.
// 4 formats × 2 thèmes (aperçu, tout écarté, vide) : cibles de 44 px, pas de défilement de côté, rien
// sous les barres système ; captures assistant-<état>-<format>-<thème>.png, et celles de la fenêtre des
// objets écartés (téléphone, tablette).
import { mkdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { chromium } from 'playwright';
import { construireBibliotheque } from '../src/modele/bibliotheque.js';
import { nouvelId } from '../src/modele/identifiant.js';
import { genererApercu } from '../src/modele/inclusion.js';
import { attendreQue, calme } from './outils/attente.mjs';
import {
  attendreQuestion,
  avecBibliotheque,
  etapeAffichee,
  ligneObjet,
  question,
  repondre,
  retourDansLAssistant,
  rienNEntre,
  verifierQuestion,
} from './outils/assistant.mjs';
import { demarrerServeur } from './outils/serveur.mjs';
import {
  CAPTURES,
  FORMATS,
  NOMS_THEME,
  RACINE,
  attendreEcran,
  creerJuge,
  ecrireStockage,
  lireStockage,
  ouvrir,
  verifierBarres,
  verifierCommandes,
} from './outils/page.mjs';
import { NOM } from './outils/voyage-essai.mjs';

const fr = JSON.parse(await readFile(join(RACINE, 'src/i18n/fr.json'), 'utf8'));
const nv = fr.nouveauVoyage;
const { ecartes } = nv;
// Gourde (toujours incluse) et sa catégorie, sous des noms qui seraient pris pour du HTML.
const GOURDE = 'Gourde <i>&"';
const ALIMENTATION = 'Alimentation <b>&';
const PIEGEE = construireBibliotheque(
  {
    ...fr.bibliothequeDeDepart,
    categories: fr.bibliothequeDeDepart.categories.map(c =>
      c.nom !== 'Alimentation'
        ? c
        : { ...c, nom: ALIMENTATION, objets: c.objets.map(o => (o.nom === 'Gourde' ? { ...o, nom: GOURDE } : o)) },
    ),
  },
  { nouvelId, maintenant: 'x' },
);
const questionEcartes = (q, liste) =>
  q?.titre === ecartes.titre &&
  q.balises === 0 &&
  JSON.stringify(q.liste) === JSON.stringify(liste) &&
  JSON.stringify(q.boutons) ===
    JSON.stringify([
      { texte: ecartes.remettre, principal: false },
      { texte: ecartes.garder, principal: true },
    ]);
const MAINTENANT = new Date('2026-10-06T10:00:00');
const INFOS = { depart: '2026-11-13', retour: '2026-11-15', voyageurs: 2 };
const CHOISIES = ['Randonnée', 'Camping', 'Froid', 'Tente'];
const TOUS_FORMATS = {
  ...Object.fromEntries(Object.entries(FORMATS).map(([nom, taille]) => [nom, { taille }])),
  ordinateur: { taille: { width: 1440, height: 900 }, ecran: { width: 1920, height: 1080 }, tactile: false },
};
const retenus = (n, total) => nv.retenus[n === 1 ? 'one' : 'other'].replace('{n}', n).replace('{total}', total);

const lireApercu = page =>
  page.evaluate(() => ({
    etape: document.querySelector('.formulaire-corps')?.dataset.etape,
    titre: document.querySelector('#titre-etape')?.textContent.trim(),
    rappel: document.querySelector('.apercu-rappel')?.textContent.trim() ?? null,
    balises: document.querySelectorAll('.apercu-rappel *').length,
    categories: [...document.querySelectorAll('.apercu-categorie')].map(s => {
      const tete = s.querySelector('[data-categorie][role=checkbox]');
      return {
        id: tete.dataset.categorie,
        coche: tete.getAttribute('aria-checked'),
        gauche: Math.round(s.getBoundingClientRect().left),
        objets: [...s.querySelectorAll('[data-objet][role=checkbox]')].map(b => ({
          id: b.dataset.objet,
          nom: b.querySelector('.objet-nom').textContent.trim(),
          quantite: b.querySelector('.objet-quantite').textContent.trim(),
          coche: b.getAttribute('aria-checked'),
        })),
      };
    }),
    creer: {
      grise: document.querySelector('[data-action="creer"]')?.getAttribute('aria-disabled'),
      decrit: document.querySelector('[data-action="creer"]')?.getAttribute('aria-describedby'),
    },
    raison: document.querySelector('#raison-vide')?.textContent.trim() ?? null,
  }));

async function ouvrirAssistant(navigateur, url, { taille = FORMATS['tablette-paysage'], ...options } = {}) {
  const ouvert = await ouvrir(navigateur, url, {
    taille,
    theme: 'light',
    maintenant: MAINTENANT,
    adresse: '#/nouveau-voyage',
    ...options,
  });
  await attendreEcran(ouvert.page, 'nouveau-voyage');
  return ouvert;
}

// Informations du 13 au 15 novembre, les étiquettes nommées choisies à leur étape, puis l'aperçu.
async function versApercu(page, { nom = 'Vercors', etiquettes = [] } = {}) {
  await page.fill('#nom', nom);
  await page.fill('#destination', 'Vercors');
  await page.click('[data-mois="1"]');
  await page.click(`[data-jour="${INFOS.depart}"]`);
  await page.click(`[data-jour="${INFOS.retour}"]`);
  while ((await page.$eval('.formulaire-corps', c => c.dataset.etape)) !== 'apercu') {
    await page.click('[data-action="suivant"]');
    for (const puce of await page.locator('.puce-etiquette').all())
      if (etiquettes.includes((await puce.textContent()).trim())) await puce.click();
  }
  await calme(page);
}

// Ce que le modèle met dans l'aperçu, d'après la bibliothèque que l'appli a installée.
async function attendu(page, noms) {
  const { bibliotheque } = await lireStockage(page);
  const choisies = new Set(bibliotheque.etiquettes.filter(e => noms.includes(e.nom)).map(e => e.id));
  const apercu = genererApercu(bibliotheque, INFOS, choisies);
  return {
    bibliotheque,
    categories: apercu.map(({ categorie, objets }) => ({
      id: categorie.id,
      objets: objets.map(({ objet, quantite }) => ({ id: objet.id, nom: objet.nom, quantite: String(quantite) })),
    })),
  };
}

const juge = creerJuge();
const serveur = await demarrerServeur();
const navigateur = await chromium.launch();
try {
  await mkdir(CAPTURES, { recursive: true });

  // L'aperçu calculé, décoché, puis créé (tablette en paysage).
  {
    const { contexte, page, erreurs } = await ouvrirAssistant(navigateur, serveur.url);
    await versApercu(page, { nom: NOM, etiquettes: CHOISIES });
    const { bibliotheque, categories } = await attendu(page, CHOISIES);
    const idDe = nom => bibliotheque.objets.find(o => o.nom === nom).id;
    const categorieDe = nom => bibliotheque.categories.find(c => c.nom === nom).id;
    let a = await lireApercu(page);
    const total = categories.flatMap(c => c.objets).length;
    juge.exige(a.titre === retenus(total, total), `aperçu : titre « ${a.titre} », attendu ${total} sur ${total}`);
    const vus = a.categories.map(({ id, objets }) => ({
      id,
      objets: objets.map(({ id: o, nom, quantite }) => ({ id: o, nom, quantite })),
    }));
    juge.exige(
      JSON.stringify(vus) === JSON.stringify(categories),
      `aperçu : lignes ${JSON.stringify(vus)}\n      attendu ${JSON.stringify(categories)}`,
    );
    juge.exige(
      a.categories.some(c => c.id === categorieDe('Camping')),
      'aperçu : la catégorie Camping est absente',
    );
    juge.exige(
      !a.categories.some(c => c.objets.some(o => o.nom === 'Crème solaire')),
      'aperçu : la Crème solaire est entrée',
    );
    juge.exige(a.rappel?.startsWith(NOM) && a.balises === 0, `aperçu : rappel « ${a.rappel} » (${a.balises} balises)`);
    juge.exige(new Set(a.categories.map(c => c.gauche)).size === 2, 'aperçu : pas deux colonnes à 1280 × 800');

    await page.click(`[data-categorie="${categorieDe('Alimentation')}"]`);
    a = await lireApercu(page);
    let alimentation = a.categories.find(c => c.id === categorieDe('Alimentation'));
    juge.exige(
      alimentation.coche === 'false' && alimentation.objets.every(o => o.coche === 'false'),
      `tête d’Alimentation : ${JSON.stringify(alimentation)}`,
    );
    await page.click(`[data-objet="${idDe('Repas')}"]`);
    a = await lireApercu(page);
    alimentation = a.categories.find(c => c.id === categorieDe('Alimentation'));
    juge.exige(alimentation.coche === 'mixed', `Repas recoché : Alimentation « ${alimentation.coche} »`);
    juge.exige(a.titre === retenus(total - 1, total), `Repas recoché : titre « ${a.titre} »`);

    await page.click('[data-action="creer"]');
    await attendreEcran(page, 'voyage');
    // L'écran du voyage n'ouvre qu'une catégorie : les objets se lisent dans le stockage.
    const noms = await page.$$eval('.categorie-nom b', n => n.map(x => x.textContent.trim()));
    juge.exige(noms.includes('Camping'), `voyage créé : catégories ${noms}`);
    const stockage = await lireStockage(page);
    const [voyage] = stockage.voyages;
    const objets = stockage.objetsDuVoyage.filter(o => o.voyageId === voyage.id).map(o => o.nom);
    juge.exige(
      !objets.includes('Gourde') && objets.includes('Repas') && objets.includes('Lampe frontale'),
      `voyage créé : objets ${objets}`,
    );
    const etiquettes = stockage.etiquettesDuVoyage
      .filter(e => e.voyageId === voyage.id)
      .sort((x, y) => x.ordre - y.ordre)
      .map(e => e.nom);
    juge.exige(
      stockage.voyages.length === 1 && voyage.nom === NOM && etiquettes.join(',') === CHOISIES.join(','),
      `voyage créé : ${stockage.voyages.length} voyage(s), « ${voyage.nom} », étiquettes ${etiquettes}`,
    );
    juge.exige(erreurs.length === 0, `création : erreurs dans la page : ${erreurs.join(' | ')}`);
    await contexte.close();
  }

  // Une colonne de catégories dans la fenêtre en portrait.
  {
    const { contexte, page } = await ouvrirAssistant(navigateur, serveur.url, { taille: FORMATS['tablette-portrait'] });
    await versApercu(page, { etiquettes: CHOISIES });
    const a = await lireApercu(page);
    juge.exige(
      a.categories.length > 1 && new Set(a.categories.map(c => c.gauche)).size === 1,
      `portrait : catégories en ${new Set(a.categories.map(c => c.gauche)).size} colonnes`,
    );
    await contexte.close();
  }

  // Double appui : un seul voyage.
  {
    const { contexte, page } = await ouvrirAssistant(navigateur, serveur.url, { taille: FORMATS.telephone });
    await versApercu(page);
    await page.dblclick('[data-action="creer"]');
    await attendreEcran(page, 'voyage');
    const n = (await lireStockage(page)).voyages.length;
    juge.exige(n === 1, `double appui : ${n} voyages créés`);
    await contexte.close();
  }

  // Panne d'enregistrement : le bandeau, rien ne bouge ; la panne levée, un seul voyage.
  for (const format of ['telephone', 'tablette-portrait']) {
    const { contexte, page } = await ouvrirAssistant(navigateur, serveur.url, {
      taille: FORMATS[format],
      donnees: { pannes: ['creerVoyage'] },
    });
    await versApercu(page, { etiquettes: CHOISIES });
    const places = () =>
      page.evaluate(() =>
        ['dialog', '[data-action="precedent"]', '[data-action="creer"]', '.apercu-categorie', '#titre-etape'].map(s => {
          const r = document.querySelector(s)?.getBoundingClientRect() ?? {};
          return `${r.left},${r.top},${r.width},${r.height}`;
        }),
      );
    const avant = await places();
    await page.click('[data-action="creer"]');
    const alerte = await attendreQue(page, () => document.querySelector('.alerte')?.textContent.trim());
    juge.exige(alerte === nv.erreurs.enregistrement, `panne, ${format} : alerte « ${alerte} »`);
    await calme(page);
    const apres = await places();
    juge.exige(avant.join(' ') === apres.join(' '), `panne, ${format} : l’écran a bougé ${avant} → ${apres}`);
    const etat = await page.evaluate(() => {
      const creer = document.querySelector('[data-action="creer"]');
      const c = creer.getBoundingClientRect();
      const a = document.querySelector('.alerte').getBoundingClientRect();
      return {
        adresse: location.hash,
        etape: document.querySelector('.formulaire-corps').dataset.etape,
        creerVisible: creer.contains(document.elementFromPoint(c.left + c.width / 2, c.top + c.height / 2)),
        enBas: a.bottom > innerHeight * 0.6 && a.bottom <= innerHeight,
      };
    });
    juge.exige(
      etat.adresse === '#/nouveau-voyage' && etat.etape === 'apercu',
      `panne, ${format} : quitté ${JSON.stringify(etat)}`,
    );
    juge.exige(etat.creerVisible && etat.enBas, `panne, ${format} : bandeau mal placé ${JSON.stringify(etat)}`);
    const { pannes, ...sansPanne } = await lireStockage(page);
    juge.exige(pannes?.length === 1, `panne, ${format} : témoin, la panne n’était pas posée`);
    await ecrireStockage(page, sansPanne);
    await page.click('[data-action="creer"]');
    await attendreEcran(page, 'voyage');
    const n = (await lireStockage(page)).voyages?.length;
    juge.exige(n === 1, `panne levée, ${format} : ${n} voyage(s) créé(s)`);
    await contexte.close();
  }

  // Tout écarté : la raison est écrite, « Créer le voyage » grisé et sans effet.
  {
    const { contexte, page } = await ouvrirAssistant(navigateur, serveur.url, { taille: FORMATS.telephone });
    await versApercu(page);
    for (const tete of await page.locator('[data-categorie][role=checkbox]').all()) await tete.click();
    let a = await lireApercu(page);
    juge.exige(
      a.raison === nv.toutEcarte && a.creer.grise === 'true' && a.creer.decrit === 'raison-vide',
      `tout écarté : ${JSON.stringify({ raison: a.raison, creer: a.creer })}`,
    );
    juge.exige(await page.locator('#raison-vide').isVisible(), 'tout écarté : la raison ne se voit pas');
    await page.click('[data-action="creer"]', { force: true });
    await calme(page);
    a = await lireApercu(page);
    juge.exige(
      a.etape === 'apercu' && !(await lireStockage(page)).voyages?.length,
      `tout écarté : un appui sur « Créer » a agi (${a.etape})`,
    );
    await page.click('[data-categorie][role=checkbox]');
    a = await lireApercu(page);
    juge.exige(a.creer.grise === null && a.raison === null, `tout écarté, témoin : ${JSON.stringify(a.creer)}`);
    await contexte.close();
  }

  // Rien n'entre : l'aperçu vide, et le retour aux étiquettes.
  {
    const { contexte, page, erreurs } = await ouvrirAssistant(navigateur, serveur.url, {
      donnees: avecBibliotheque(rienNEntre(fr.bibliothequeDeDepart)),
    });
    await versApercu(page);
    const a = await lireApercu(page);
    juge.exige(await page.locator('.apercu-vide').isVisible(), 'rien n’entre : pas d’aperçu vide');
    juge.exige(
      a.titre === nv.vide.titre && a.raison === nv.vide.texte && a.creer.grise === 'true',
      `rien n’entre : ${JSON.stringify(a)}`,
    );
    await page.click('.apercu-vide [data-aller]');
    await calme(page);
    const v = await page.evaluate(() => ({
      etape: document.querySelector('.formulaire-corps').dataset.etape,
      titre: document.querySelector('#titre-etape')?.textContent.trim(),
    }));
    juge.exige(v.etape === 'groupe' && v.titre === 'Activités', `« Revenir aux étiquettes » : ${JSON.stringify(v)}`);
    juge.exige(erreurs.length === 0, `rien n’entre : erreurs dans la page : ${erreurs.join(' | ')}`);
    await contexte.close();
  }

  // Objets écartés : la fenêtre ne vient qu'après un changement, et chaque réponse fait ce qu'elle dit.
  {
    const { contexte, page, erreurs } = await ouvrirAssistant(navigateur, serveur.url, {
      donnees: avecBibliotheque(PIEGEE),
    });
    await versApercu(page, { etiquettes: ['Randonnée'] });
    const gourde = ligneObjet(page, GOURDE);
    await gourde.click();
    // La case de Gourde ('true' cochée, 'false' écartée), lue sans attendre : null hors de l'aperçu.
    const caseGourde = () =>
      page.evaluate(
        nom =>
          [...document.querySelectorAll('[data-objet]')]
            .find(b => b.querySelector('.objet-nom').textContent === nom)
            ?.getAttribute('aria-checked') ?? null,
        GOURDE,
      );
    // Aller-retour vers Activités, puis l'aperçu ; touchée : Randonnée change d'état en passant.
    const allerRetour = async ({ randonnee = false } = {}) => {
      await page.click('.etape:nth-child(2) button');
      if (randonnee) await page.click('.puce-etiquette:has-text("Randonnée")');
      await page.click('.etape:last-child button');
      await calme(page);
    };
    await allerRetour();
    juge.exige(
      !(await question(page)) && (await caseGourde()) === 'false',
      'écartés, sans changement : fenêtre ou Gourde recochée',
    );
    const nommee = [[GOURDE, ALIMENTATION]];
    // [geste sur la fenêtre, case de Gourde après lui]
    const reponses = [
      ['retour système', page => retourDansLAssistant(page), 'false'],
      ['Échap', page => page.keyboard.press('Escape'), 'false'],
      [ecartes.garder, page => repondre(page, ecartes.garder), 'false'],
      [ecartes.remettre, page => repondre(page, ecartes.remettre), 'true'],
    ];
    for (const [geste, repondreAvec, attendue] of reponses) {
      await allerRetour({ randonnee: true });
      const q = await attendreQuestion(page);
      juge.exige(questionEcartes(q, nommee), `écartés, avant « ${geste} » : ${JSON.stringify(q)}`);
      await repondreAvec(page);
      await calme(page);
      const apres = { question: await question(page), ...(await etapeAffichee(page)), gourde: await caseGourde() };
      juge.exige(
        !apres.question && apres.etape === 'apercu' && apres.gourde === attendue,
        `écartés, « ${geste} » : ${JSON.stringify(apres)}`,
      );
    }
    juge.exige(erreurs.length === 0, `écartés : erreurs dans la page : ${erreurs.join(' | ')}`);
    await contexte.close();
  }

  // La fenêtre des objets écartés (Gourde et Bonnet, Camping retiré) : téléphone et tablette, 2 thèmes.
  for (const theme of ['light', 'dark'])
    for (const format of ['telephone', 'tablette-paysage']) {
      const { contexte, page } = await ouvrirAssistant(navigateur, serveur.url, { taille: FORMATS[format], theme });
      await versApercu(page, { nom: 'Week-end au Vercors', etiquettes: CHOISIES });
      for (const nom of ['Gourde', 'Bonnet']) await ligneObjet(page, nom).click();
      await page.click('.etape:nth-child(2) button');
      await page.click('.puce-etiquette:has-text("Camping")');
      await page.click('.etape:last-child button');
      await attendreQuestion(page);
      await page.mouse.move(0, 0);
      await page.screenshot({ path: join(CAPTURES, `assistant-ecartes-${format}-${NOMS_THEME[theme]}.png`) });
      await verifierQuestion(page, juge, `écartés, ${format}, ${NOMS_THEME[theme]}`);
      await contexte.close();
    }

  // 4 formats × 2 thèmes : l'aperçu (Gourde et Bonnet écartés), tout écarté, et vide.
  for (const theme of ['light', 'dark']) {
    for (const [format, { taille, ecran, tactile }] of Object.entries(TOUS_FORMATS)) {
      const cas = `${format}, ${NOMS_THEME[theme]}`;
      const options = { taille, ecran, tactile, theme };
      for (const etat of ['apercu', 'tout-ecarte', 'vide']) {
        const { contexte, page, sorties, erreurs } = await ouvrirAssistant(navigateur, serveur.url, {
          ...options,
          ...(etat === 'vide' && { donnees: avecBibliotheque(rienNEntre(fr.bibliothequeDeDepart)) }),
        });
        await versApercu(page, { nom: 'Week-end au Vercors', etiquettes: etat === 'vide' ? [] : CHOISIES });
        const { bibliotheque } = await lireStockage(page);
        const idDe = nom => bibliotheque.objets.find(o => o.nom === nom).id;
        if (etat === 'apercu') for (const nom of ['Gourde', 'Bonnet']) await page.click(`[data-objet="${idDe(nom)}"]`);
        if (etat === 'tout-ecarte')
          for (const tete of await page.locator('[data-categorie][role=checkbox]').all()) await tete.click();
        // Le haut de l'étape (titre, raison) en vue, et la souris du test loin des lignes (pas de survol).
        await page.evaluate(() => {
          window.scrollTo(0, 0);
          document.querySelector('.etape-panneau').scrollTop = 0;
        });
        await page.mouse.move(0, 0);
        await calme(page);
        await page.screenshot({ path: join(CAPTURES, `assistant-${etat}-${format}-${NOMS_THEME[theme]}.png`) });
        await verifierCommandes(page, juge, `${cas}, ${etat}`);
        await verifierBarres(page, juge, `${cas}, ${etat}`);
        juge.exige(sorties.length === 0, `${cas}, ${etat} : requêtes hors de l’appli : ${sorties.join(', ')}`);
        juge.exige(erreurs.length === 0, `${cas}, ${etat} : erreurs dans la page : ${erreurs.join(' | ')}`);
        await contexte.close();
      }
    }
  }
} finally {
  await navigateur.close();
  await serveur.fermer();
}
juge.conclure(
  'Aperçu de l’assistant',
  'contenu, cases, colonnes, création et étiquettes, double appui, panne, tout écarté, vide, objets écartés, 4 formats × 2 thèmes',
);
