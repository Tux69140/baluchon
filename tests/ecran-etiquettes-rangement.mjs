// Phase 6 (spec, « Maquettes validées », docs/maquettes/etiquettes/) : « Ranger » sur l'écran
// Étiquettes, un seul mode où chaque groupe a ses ▲ ▼, et ses étiquettes dessous en retrait avec les
// leurs. La touche retour d'Android est jouée par la page (window.toucheRetour) ; une sortie de
// l'appli demandée se compte dans window.sortiesDemandees.
// - ▲ du premier groupe et de la première étiquette de chaque groupe inactifs, ▼ des derniers aussi ;
//   ▲ Hébergement puis ▲ Plage : ordre affiché et stocké, annonce de la nouvelle place, focus gardé ;
//   « Terminé » rend les cartes dans le nouvel ordre (Hébergement passe à l'étape 3) ; la touche
//   retour pendant le rangement vaut « Terminé », puis mène à Réglages, l'accueil, la sortie ;
// - Review Focus 4 : six appuis rapides mêlant groupes et étiquettes pendant des écritures lentes,
//   puis une panne au milieu : l'ordre affiché égale toujours l'ordre enregistré, message en haut ;
//   ensuite, un nouvel appui est enregistré ;
// - tous les formats, clair et sombre : cibles, barres système ; captures ranger-etiquettes-….
import { join } from 'node:path';
import { chromium } from 'playwright';
import { attendreQue, calme } from './outils/attente.mjs';
import { demarrerServeur } from './outils/serveur.mjs';
import { DONNEES, TOUS_FORMATS, commande, fermerEssai, remplir, toucheRetour, vu } from './outils/bibliotheque.mjs';
import {
  DEPART,
  arbreDe,
  arbreDesCartes,
  arbreDuRangement,
  arbreStocke,
  attendreRangement,
  e,
  idEtiquette,
  idGroupe,
  infos,
  libererEcritures,
  lire,
  ouvrirEtiquettes as ouvrirLesEtiquettes,
} from './outils/etiquettes.mjs';
import { CAPTURES, NOMS_THEME, creerJuge, verifierBarres, verifierCommandes } from './outils/page.mjs';

const juge = creerJuge();
const serveur = await demarrerServeur();
const navigateur = await chromium.launch();
const ouvrirEtiquettes = (format, options) => ouvrirLesEtiquettes(navigateur, serveur.url, format, options);
const fermer = (cas, ouvert) => fermerEssai(juge, cas, ouvert);

async function ranger(page) {
  await page.click('#app [data-action="ranger"]');
  await calme(page);
  return lire(page);
}

// Les ▲ ▼ inactifs au bord de chaque liste, et eux seuls.
function bordsInactifs(liste) {
  const dernier = liste.length - 1;
  return liste.every((x, i) => x.monterInactif === (i === 0) && x.descendreInactif === (i === dernier));
}

async function essaiRangement() {
  const cas = 'rangement';
  const ouvert = await ouvrirEtiquettes();
  const { page } = ouvert;
  const depart = await lire(page);
  const hebergement = idGroupe(depart, 'Hébergement');
  const plage = idEtiquette(depart, 'Plage');
  const liste = await ranger(page);
  juge.exige(
    arbreDuRangement(liste) === arbreDe(DEPART) &&
      liste.cartes.length === 0 &&
      !liste.ranger &&
      !liste.nouveauGroupe &&
      liste.terminer === e.termine &&
      bordsInactifs(liste.rangement) &&
      liste.rangement.every(g => bordsInactifs(g.etiquettes)) &&
      liste.rangement[1].monter === remplir(e.monter, { nom: 'Climat' }) &&
      liste.rangement[1].descendre === remplir(e.descendre, { nom: 'Climat' }) &&
      liste.rangement[1].liste === remplir(e.listeEtiquettes, { nom: 'Climat' }) &&
      liste.rangement[0].etiquettes[1].monter === remplir(e.monter, { nom: 'Camping' }),
    `${cas} : ${vu(liste.rangement)}`,
  );
  juge.exige(liste.focus.action === 'descendre', `${cas} : focus à l’ouverture ${vu(liste.focus)}`);

  const etapes = [
    [
      hebergement,
      'Hébergement',
      { Activités: DEPART.Activités, Hébergement: DEPART.Hébergement, Climat: DEPART.Climat },
    ],
    [
      plage,
      'Plage',
      { Activités: ['Randonnée', 'Plage', 'Camping'], Hébergement: DEPART.Hébergement, Climat: DEPART.Climat },
    ],
  ];
  for (const [id, nom, ordre] of etapes) {
    await page.click(commande('monter', id));
    const apres = await attendreRangement(page, arbreDe(ordre));
    juge.exige(arbreDuRangement(apres) === arbreDe(ordre), `${cas}, ▲ ${nom} : ${arbreDuRangement(apres)}`);
    juge.exige((await arbreStocke(page)) === arbreDe(ordre), `${cas}, ▲ ${nom} : stocké ${await arbreStocke(page)}`);
    juge.exige(vu(apres.focus) === vu({ action: 'monter', id }), `${cas}, ▲ ${nom} : focus ${vu(apres.focus)}`);
    juge.exige(
      apres.annonce === remplir(e.place, { nom, n: 2, total: 3 }),
      `${cas}, ▲ ${nom} : annonce ${vu(apres.annonce)}`,
    );
  }
  await page.click('#app [data-action="terminer"]');
  await calme(page);
  const termine = await lire(page);
  const nouvel = etapes[1][2];
  juge.exige(
    arbreDesCartes(termine) === arbreDe(nouvel) &&
      vu(termine.cartes.map(c => c.infos)) === vu([infos(3, 2), infos(3, 3), infos(3, 4)]) &&
      termine.rangement.length === 0 &&
      termine.ranger === e.ranger,
    `${cas}, Terminé : ${arbreDesCartes(termine)}`,
  );
  juge.exige(termine.focus.action === 'ranger', `${cas}, Terminé : focus ${vu(termine.focus)}`);

  // La touche retour pendant le rangement : comme « Terminé », on reste sur les Étiquettes.
  await ranger(page);
  await page.click(commande('descendre', hebergement));
  const descendu = { ...DEPART, Activités: nouvel.Activités };
  await attendreRangement(page, arbreDe(descendu));
  await toucheRetour(page);
  const retour = await lire(page);
  juge.exige(
    retour.ecran === 'etiquettes' &&
      retour.rangement.length === 0 &&
      arbreDesCartes(retour) === arbreDe(descendu) &&
      retour.sorties === 0,
    `${cas}, touche retour en rangement : ${vu([retour.ecran, arbreDesCartes(retour), retour.sorties])}`,
  );
  juge.exige((await arbreStocke(page)) === arbreDe(descendu), `${cas} : stocké ${await arbreStocke(page)}`);

  await toucheRetour(page);
  const reglages = await lire(page);
  await toucheRetour(page);
  const accueil = await lire(page);
  await toucheRetour(page);
  const sortie = await lire(page);
  juge.exige(
    reglages.ecran === 'reglages' && accueil.ecran === 'voyages' && accueil.sorties === 0 && sortie.sorties === 1,
    `${cas}, touches retour : ${vu([reglages.ecran, accueil.ecran, accueil.sorties, sortie.sorties])}`,
  );
  await fermer(cas, ouvert);
}

// Review Focus 4 : six appuis rapides mêlés, écritures lentes libérées une à une ; la quatrième tombe
// en panne. Les trois premières restent, les suivantes sont abandonnées ; l'écran montre le stocké.
async function essaiAppuisRapidesEtPanne() {
  const cas = 'appuis rapides et panne';
  const ouvert = await ouvrirEtiquettes('telephone', {
    donnees: { ...DONNEES, lenteurs: ['rangerGroupes', 'rangerEtiquettes'] },
  });
  const { page } = ouvert;
  const depart = await lire(page);
  const ids = Object.fromEntries(
    ['Hébergement', 'Climat']
      .map(nom => [nom, idGroupe(depart, nom)])
      .concat(['Pluie', 'Randonnée'].map(nom => [nom, idEtiquette(depart, nom)])),
  );
  await ranger(page);
  const appuis = [
    ['monter', ids.Hébergement],
    ['monter', ids.Pluie],
    ['monter', ids.Hébergement],
    ['monter', ids.Pluie],
    ['descendre', ids.Randonnée],
    ['monter', ids.Climat],
  ];
  // Tous les appuis d'un coup, avant toute écriture : ils s'additionnent.
  await page.evaluate(liste => {
    for (const [action, id] of liste) document.querySelector(`[data-action="${action}"][data-id="${id}"]`).click();
  }, appuis);
  const premiers = await libererEcritures(page, { max: 3 });
  const trois = { Hébergement: DEPART.Hébergement, Activités: DEPART.Activités, Climat: ['Chaud', 'Pluie', 'Froid'] };
  const intermediaire = await attendreRangement(page, arbreDe(trois));
  juge.exige(
    premiers === 3 && arbreDuRangement(intermediaire) === arbreDe(trois),
    `${cas}, trois écritures : ${premiers}, ${arbreDuRangement(intermediaire)}`,
  );
  juge.exige(
    (await arbreStocke(page)) === arbreDe(trois),
    `${cas}, trois écritures : stocké ${await arbreStocke(page)}`,
  );

  // La panne, posée dans le stockage d'essai pendant que la quatrième écriture attend.
  await page.evaluate(() => {
    const cle = 'baluchon-essai';
    const donnees = JSON.parse(localStorage.getItem(cle));
    localStorage.setItem(cle, JSON.stringify({ ...donnees, pannes: ['rangerGroupes', 'rangerEtiquettes'] }));
  });
  const suivantes = await libererEcritures(page, { max: 4 });
  await attendreQue(page, () => document.querySelector('.alerte-haut:popover-open') !== null);
  await calme(page);
  const message = await page.evaluate(() => {
    const alerte = document.querySelector('.alerte-haut:popover-open');
    const r = alerte?.getBoundingClientRect();
    return (
      alerte && { texte: alerte.textContent.trim(), role: alerte.getAttribute('role'), haut: r.top < innerHeight / 3 }
    );
  });
  juge.exige(
    message?.texte === e.erreurOrdre && message.role === 'alert' && message.haut,
    `${cas} : message ${vu(message)}`,
  );
  const apres = await lire(page);
  juge.exige(
    suivantes === 1 && arbreDuRangement(apres) === arbreDe(trois) && (await arbreStocke(page)) === arbreDe(trois),
    `${cas}, panne : ${suivantes} écriture(s) tentée(s), affiché ${arbreDuRangement(apres)}, stocké ${await arbreStocke(page)}`,
  );

  // La panne passée, un nouvel appui part de l'ordre stocké et s'enregistre.
  await page.evaluate(() => {
    const cle = 'baluchon-essai';
    const donnees = JSON.parse(localStorage.getItem(cle));
    delete donnees.pannes;
    delete donnees.lenteurs;
    localStorage.setItem(cle, JSON.stringify(donnees));
  });
  await page.click(commande('descendre', ids.Hébergement));
  const encore = { Activités: DEPART.Activités, Hébergement: DEPART.Hébergement, Climat: trois.Climat };
  const fin = await attendreRangement(page, arbreDe(encore));
  juge.exige(
    arbreDuRangement(fin) === arbreDe(encore) && (await arbreStocke(page)) === arbreDe(encore),
    `${cas}, après la panne : affiché ${arbreDuRangement(fin)}, stocké ${await arbreStocke(page)}`,
  );
  // Rien d'autre ne s'affiche en erreur : la panne simulée est au journal, c'est attendu.
  ouvert.erreurs.splice(0, Infinity, ...ouvert.erreurs.filter(x => !x.includes('Panne simulée')));
  await fermer(cas, ouvert);
}

async function essaiFormat(format, theme) {
  const cas = `${format}, ${NOMS_THEME[theme]}, rangement`;
  const ouvert = await ouvrirEtiquettes(format, { theme });
  const { page } = ouvert;
  await ranger(page);
  await page.mouse.move(0, 0);
  await calme(page);
  await verifierCommandes(page, juge, cas);
  await page.screenshot({ path: join(CAPTURES, `ranger-etiquettes-${format}-${NOMS_THEME[theme]}.png`) });
  await verifierBarres(page, juge, cas);
  await fermer(cas, ouvert);
}

try {
  await essaiRangement();
  await essaiAppuisRapidesEtPanne();
  for (const theme of ['light', 'dark'])
    for (const format of Object.keys(TOUS_FORMATS)) await essaiFormat(format, theme);
} finally {
  await navigateur.close();
  await serveur.fermer();
}
juge.conclure(
  'Rangement des étiquettes',
  'bords inactifs, ▲ groupe et étiquette, annonce, Terminé, touche retour, appuis rapides, panne ; 6 formats × 2 thèmes',
);
