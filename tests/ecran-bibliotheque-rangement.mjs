// Phase 5 (docs/PLAN.md) : le rangement des catégories de la Bibliothèque (maquette validée le
// 2026-10-25, docs/maquettes/bibliotheque/), et les retours depuis l'écran. La touche retour
// d'Android est jouée par la page (window.toucheRetour) ; une sortie de l'appli demandée se compte
// dans window.sortiesDemandees.
// - « Ranger les catégories » : liste compacte, ▲ de la première et ▼ de la dernière inactifs ; ▲
//   déplace d'une place, le focus reste sur le bouton, l'annonce dit la nouvelle place ; « Terminé »
//   rend les cartes dans le nouvel ordre, que le stockage garde ; la touche retour termine le
//   rangement sans quitter l'écran ;
// - touche retour ensuite : Réglages, puis l'accueil, puis sortie de l'appli ; le lien « Réglages »
//   mène à Réglages, même pendant le rangement, sans laisser d'étape derrière lui ;
// - Review Focus 4 : six appuis rapides sur ▲, l'ordre affiché égale l'ordre enregistré ; panne
//   d'enregistrement : message en haut, ordre inchangé à l'écran et dans le stockage ;
// - écritures lentes (lenteurs) : trois ▲ rapides puis départ de l'écran (lien « Réglages », ou
//   Menu → Mes voyages) avant la fin de la première écriture : les trois déplacements sont gardés.
import { chromium } from 'playwright';
import { calme, attendreQue } from './outils/attente.mjs';
import { demarrerServeur } from './outils/serveur.mjs';
import {
  DEPART,
  attendreOrdre,
  commande,
  fermerEssai,
  fr,
  idDe,
  lire,
  ordreStocke,
  ouvrirBibliotheque as ouvrirLaBibliotheque,
  remplir,
  toucheRetour,
  vu,
  DONNEES,
} from './outils/bibliotheque.mjs';
import { attendreEcran, creerJuge } from './outils/page.mjs';

const b = fr.bibliotheque;
const juge = creerJuge();
const serveur = await demarrerServeur();
const navigateur = await chromium.launch();
const ouvrirBibliotheque = (format, options) => ouvrirLaBibliotheque(navigateur, serveur.url, format, options);
const fermer = (cas, ouvert) => fermerEssai(juge, cas, ouvert);

// Ranger, deux fois ▲ sur Camping, Terminé ; puis ▼ et la touche retour, qui termine sans quitter.
async function essaiRangement() {
  const cas = 'rangement';
  const ouvert = await ouvrirBibliotheque();
  const { page } = ouvert;
  const camping = idDe(await lire(page), 'Camping');
  await page.click('[data-action="ranger"]');
  await calme(page);
  const liste = await lire(page);
  juge.exige(
    vu(liste.rangement.map(l => l.nom)) === vu(DEPART) &&
      liste.cartes.length === 0 &&
      !liste.ranger &&
      liste.rangement[0].monterInactif &&
      !liste.rangement[0].descendreInactif &&
      liste.rangement[4].descendreInactif &&
      !liste.rangement[4].monterInactif &&
      liste.rangement.slice(1, 4).every(l => !l.monterInactif && !l.descendreInactif) &&
      liste.rangement[2].monter === remplir(b.monter, { nom: 'Alimentation' }) &&
      liste.rangement[2].descendre === remplir(b.descendre, { nom: 'Alimentation' }),
    `${cas} : liste ${vu(liste)}`,
  );
  juge.exige(liste.focus.action === 'descendre', `${cas} : focus à l’ouverture ${vu(liste.focus)}`);

  const etapes = [
    [['Vêtements', 'Toilette', 'Alimentation', 'Camping', 'Papiers'], 4],
    [['Vêtements', 'Toilette', 'Camping', 'Alimentation', 'Papiers'], 3],
  ];
  for (const [ordre, place] of etapes) {
    await page.click(commande('monter', camping));
    const apres = await attendreOrdre(page, ordre);
    juge.exige(
      vu(apres.rangement.map(l => l.nom)) === vu(ordre),
      `${cas}, ▲ Camping : ordre ${vu(apres.rangement.map(l => l.nom))}`,
    );
    juge.exige(
      apres.focus.action === 'monter' && apres.focus.id === camping,
      `${cas}, ▲ Camping : focus ${vu(apres.focus)}`,
    );
    juge.exige(
      apres.annonce === remplir(b.place, { nom: 'Camping', n: place, total: 5 }),
      `${cas}, ▲ Camping : annonce ${vu(apres.annonce)}`,
    );
  }
  await page.click('[data-action="terminer"]');
  await calme(page);
  const termine = await lire(page);
  const nouvel = etapes[1][0];
  juge.exige(
    vu(termine.cartes.map(c => c.nom)) === vu(nouvel) && termine.rangement.length === 0 && termine.ranger,
    `${cas}, Terminé : ${vu(termine.cartes.map(c => c.nom))}`,
  );
  juge.exige(termine.focus.action === 'ranger', `${cas}, Terminé : focus ${vu(termine.focus)}`);
  juge.exige(vu(await ordreStocke(page)) === vu(nouvel), `${cas} : stockage ${vu(await ordreStocke(page))}`);

  // La touche retour pendant le rangement : comme « Terminé », on reste sur la Bibliothèque.
  await page.click('[data-action="ranger"]');
  await calme(page);
  await page.click(commande('descendre', camping));
  const descendu = etapes[0][0];
  await attendreOrdre(page, descendu);
  await toucheRetour(page);
  const retour = await lire(page);
  juge.exige(
    retour.ecran === 'bibliotheque' &&
      retour.rangement.length === 0 &&
      vu(retour.cartes.map(c => c.nom)) === vu(descendu) &&
      retour.sorties === 0,
    `${cas}, touche retour en rangement : ${vu(retour)}`,
  );
  juge.exige(vu(await ordreStocke(page)) === vu(descendu), `${cas} : stockage ${vu(await ordreStocke(page))}`);

  // Puis la touche retour : Réglages, l'accueil, la sortie de l'appli.
  await toucheRetour(page);
  const reglages = await lire(page);
  await toucheRetour(page);
  const accueil = await lire(page);
  await toucheRetour(page);
  const sortie = await lire(page);
  juge.exige(
    reglages.ecran === 'reglages' &&
      accueil.ecran === 'voyages' &&
      accueil.sorties === 0 &&
      sortie.ecran === 'voyages' &&
      sortie.sorties === 1,
    `${cas}, touches retour : ${vu([reglages.ecran, accueil.ecran, accueil.sorties, sortie.sorties])}`,
  );
  await fermer(cas, ouvert);
}

// Le lien « Réglages », hors rangement puis pendant le rangement ; ensuite la touche retour ramène à
// l'accueil et quitte l'appli (aucune étape oubliée derrière soi).
async function essaiLienReglages() {
  for (const pendantRangement of [false, true]) {
    const cas = `lien Réglages${pendantRangement ? ' pendant le rangement' : ''}`;
    const ouvert = await ouvrirBibliotheque();
    const { page } = ouvert;
    if (pendantRangement) {
      await page.click('[data-action="ranger"]');
      await calme(page);
    }
    await page.click('#app a.lien-retour');
    await attendreEcran(page, 'reglages');
    await toucheRetour(page);
    const accueil = await lire(page);
    await toucheRetour(page);
    const sortie = await lire(page);
    juge.exige(
      accueil.ecran === 'voyages' && accueil.sorties === 0 && sortie.sorties === 1,
      `${cas} : ${vu([accueil.ecran, accueil.sorties, sortie.sorties])}`,
    );
    await fermer(cas, ouvert);
  }
}

// Review Focus 4 : six appuis rapides sur ▲, puis une panne d'enregistrement.
async function essaiAppuisRapidesEtPanne() {
  const cas = 'appuis rapides';
  const ouvert = await ouvrirBibliotheque();
  const { page } = ouvert;
  const camping = idDe(await lire(page), 'Camping');
  await page.click('[data-action="ranger"]');
  await calme(page);
  await page.evaluate(id => {
    for (let i = 0; i < 6; i++) document.querySelector(`[data-action="monter"][data-id="${id}"]`).click();
  }, camping);
  const attendu = ['Camping', 'Vêtements', 'Toilette', 'Alimentation', 'Papiers'];
  const apres = await attendreOrdre(page, attendu);
  const stocke = await ordreStocke(page);
  juge.exige(
    vu(apres.rangement.map(l => l.nom)) === vu(attendu) && vu(stocke) === vu(attendu),
    `${cas} : affiché ${vu(apres.rangement.map(l => l.nom))}, stocké ${vu(stocke)}`,
  );
  await fermer(cas, ouvert);

  const casPanne = 'panne du rangement';
  const enPanne = await ouvrirBibliotheque('telephone', { donnees: { ...DONNEES, pannes: ['rangerCategories'] } });
  const p = enPanne.page;
  const campingEnPanne = idDe(await lire(p), 'Camping');
  await p.click('[data-action="ranger"]');
  await calme(p);
  await p.click(commande('monter', campingEnPanne));
  await attendreQue(p, () => document.querySelector('.alerte-haut:popover-open') !== null);
  await calme(p);
  const message = await p.evaluate(() => {
    const alerte = document.querySelector('.alerte-haut:popover-open');
    const r = alerte?.getBoundingClientRect();
    return (
      alerte && { texte: alerte.textContent.trim(), role: alerte.getAttribute('role'), haut: r.top < innerHeight / 3 }
    );
  });
  const vue = await lire(p);
  juge.exige(
    message?.texte === b.erreurOrdre && message.role === 'alert' && message.haut,
    `${casPanne} : message ${vu(message)}`,
  );
  juge.exige(
    vu(vue.rangement.map(l => l.nom)) === vu(DEPART) && vu(await ordreStocke(p)) === vu(DEPART),
    `${casPanne} : ordre ${vu(vue.rangement.map(l => l.nom))}`,
  );
  // Rien d'autre ne s'affiche en erreur : la panne simulée est au journal, c'est attendu.
  enPanne.erreurs.splice(0, Infinity, ...enPanne.erreurs.filter(e => !e.includes('Panne simulée')));
  await fermer(casPanne, enPanne);
}

// Trois ▲ rapides, puis on quitte l'écran pendant que la première écriture attend ; on libère ensuite
// chaque écriture, l'une après l'autre : le stockage garde les trois déplacements.
async function essaiDepartPendantLEcriture() {
  for (const depart of ['lien Réglages', 'Menu → Mes voyages']) {
    const cas = `départ par ${depart} pendant l’écriture`;
    const ouvert = await ouvrirBibliotheque('telephone', { donnees: { ...DONNEES, lenteurs: ['rangerCategories'] } });
    const { page } = ouvert;
    const camping = idDe(await lire(page), 'Camping');
    await page.click('[data-action="ranger"]');
    await calme(page);
    await page.evaluate(id => {
      for (let i = 0; i < 3; i++) document.querySelector(`[data-action="monter"][data-id="${id}"]`).click();
    }, camping);
    await attendreQue(page, () => typeof window.debloquerStockage === 'function');
    if (depart === 'lien Réglages') {
      await page.click('#app a.lien-retour');
      await attendreEcran(page, 'reglages');
    } else {
      await page.click('[data-action="menu"]');
      await attendreQue(page, () => document.querySelector('dialog.tiroir[open]') !== null);
      await calme(page);
      await page.click(`dialog.tiroir .tiroir-lien:text-is("${fr.voyages.titre}")`);
      await attendreEcran(page, 'voyages');
    }
    // Chaque écriture libérée laisse la suivante attendre à son tour (window.debloquerStockage reposé).
    for (let i = 0; i < 3; i++) {
      const libere = await attendreQue(page, () => {
        if (typeof window.debloquerStockage !== 'function') return false;
        const debloquer = window.debloquerStockage;
        window.debloquerStockage = null;
        debloquer();
        return true;
      });
      if (!libere) break;
    }
    const attendu = ['Vêtements', 'Camping', 'Toilette', 'Alimentation', 'Papiers'];
    await attendreQue(
      page,
      noms => {
        const stocke = JSON.parse(localStorage.getItem('baluchon-essai')).bibliotheque.categories;
        return (
          stocke
            .toSorted((x, y) => x.ordre - y.ordre)
            .map(c => c.nom)
            .join('|') === noms
        );
      },
      attendu.join('|'),
    );
    const stocke = await ordreStocke(page);
    juge.exige(vu(stocke) === vu(attendu), `${cas} : stocké ${vu(stocke)}`);
    await fermer(cas, ouvert);
  }
}

try {
  await essaiDepartPendantLEcriture();
  await essaiRangement();
  await essaiLienReglages();
  await essaiAppuisRapidesEtPanne();
} finally {
  await navigateur.close();
  await serveur.fermer();
}
juge.conclure('Rangement des catégories', 'déplacements, Terminé, touche retour, lien Réglages, appuis rapides, panne');
