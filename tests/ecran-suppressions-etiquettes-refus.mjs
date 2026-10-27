// Phase 7 (spec, « Maquettes validées », docs/maquettes/suppressions/refus.js) : la fenêtre de refus
// d'une suppression d'étiquette, sur la bibliothèque de tests/suppressions.test.js déposée dans le
// stockage (tests/outils/suppressions.mjs).
// - téléphone couché : le corps est une colonne qui défile, la liste reste visible sous le texte, sans
//   se tasser ; le pied est ombré tant qu'il reste à défiler ;
// - noms « Plage <&"> », « Tongs <&"> », « Vêtements <&"> » rendus en texte dans le titre, les lignes,
//   puis « Plus rien ne bloque » (Review Focus 1) ; « Garder » ne supprime rien ;
// - après une fiche enregistrée, la liste relue en panne : le message en haut du refus (capture) ;
// - « Supprimer » du refus : une panne laisse la fiche ouverte, sans bandeau ni changement (Review
//   Focus 3) ; un double appui pendant une écriture lente n'écrit qu'une fois (Review Focus 2) ;
// - chaque format (TOUS_FORMATS : téléphones portrait et couché, tablettes, ordinateur), clair et
//   sombre : cibles de 44 px, barres système ; captures du refus, de la fiche ouverte depuis la liste
//   et de « Plus rien ne bloque » dans captures-travail/.
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { chromium } from 'playwright';
import { attendreQue, calme } from './outils/attente.mjs';
import { TOUS_FORMATS, fermerEssai, fr, remplir, vu } from './outils/bibliotheque.mjs';
import { libererEcritures, ouvrirEtiquettes } from './outils/etiquettes.mjs';
import { attendreFermee, bibliothequeStockee } from './outils/fiches.mjs';
import {
  CAPTURES,
  NOMS_THEME,
  creerJuge,
  ecrireStockage,
  lireStockage,
  verifierBarres,
  verifierCommandes,
} from './outils/page.mjs';
import { demarrerServeur } from './outils/serveur.mjs';
import {
  REFUS,
  ajouterEtiquette,
  attendreLignes,
  attendreRefus,
  depart,
  donnees,
  empreinte,
  lireRefus,
  net,
  ouvrirFicheDe,
  ouvrirLigne,
  rendreToujoursInclus,
  repondre,
  toucherSupprimer,
} from './outils/suppressions.mjs';

const juge = creerJuge();
const serveur = await demarrerServeur();
const navigateur = await chromium.launch();
const s = fr.suppression;
const r = fr.refus;
const ETIQUETTE = 'dialog.fiche-nom';
const PIEGES = { plage: 'Plage <&">', tongs: 'Tongs <&">', vetements: 'Vêtements <&">' };

// Plage, Tongs et Vêtements aux noms piégés ; Tongs seul bloque (ni Maillot de bain, ni Baignade).
function departPiege() {
  const d = depart();
  d.groupes[0].etiquettes.find(e => e.cle === 'plage').nom = PIEGES.plage;
  const vetements = d.categories[0];
  vetements.nom = PIEGES.vetements;
  vetements.objets = vetements.objets.filter(o => o.nom !== 'Maillot de bain');
  vetements.objets.find(o => o.nom === 'Tongs').nom = PIEGES.tongs;
  d.categories = d.categories.filter(c => c.nom !== 'Baignade');
  return d;
}

// Le refus de Plage ouvert depuis sa fiche.
async function refuserPlage(page, nom = 'Plage') {
  await ouvrirFicheDe(page, 'etiquette', nom);
  await toucherSupprimer(page);
  return attendreRefus(page);
}

// Le corps du refus : la liste sous le texte, ses lignes entières, le pied ombré tant qu'il reste à
// défiler ; puis, défilé en bas, la dernière ligne visible et plus d'ombre.
const mesurer = page =>
  page.evaluate(selecteur => {
    const d = document.querySelector(selecteur);
    const corps = d.querySelector('.fiche-corps');
    const cadre = el => el.getBoundingClientRect();
    const lignes = [...d.querySelectorAll('.refus-ligne')].map(l => cadre(l).height);
    const derniere = cadre([...d.querySelectorAll('.refus-ligne')].at(-1));
    return {
      sous: cadre(d.querySelector('.refus-liste')).top >= cadre(d.querySelector('.refus-explication')).bottom,
      liste: cadre(d.querySelector('.refus-liste')).height,
      lignes,
      defile: corps.scrollHeight > corps.clientHeight + 2,
      derniereVue: derniere.bottom <= cadre(corps).bottom + 0.5 && derniere.top >= cadre(corps).top - 0.5,
      ombre: d.querySelector('.fenetre-pied').hasAttribute('data-ombre'),
    };
  }, REFUS);

// 1. Téléphone couché : rien ne se tasse, la liste se lit en défilant.
async function essaiCouche() {
  const cas = 'téléphone couché';
  const ouvert = await ouvrirEtiquettes(navigateur, serveur.url, 'telephone-etroit-paysage', { donnees: donnees() });
  const { page } = ouvert;
  await refuserPlage(page);
  const haut = await mesurer(page);
  juge.exige(
    haut.sous &&
      haut.lignes.length === 3 &&
      haut.lignes.every(h => h >= 63.5) &&
      haut.liste >= haut.lignes.reduce((x, y) => x + y, 0) &&
      haut.defile &&
      haut.ombre,
    `${cas} : en haut ${vu(haut)}`,
  );
  await page.evaluate(sel => {
    const corps = document.querySelector(`${sel} .fiche-corps`);
    corps.scrollTop = corps.scrollHeight;
  }, REFUS);
  await calme(page);
  const bas = await mesurer(page);
  juge.exige(bas.derniereVue && !bas.ombre, `${cas} : défilé en bas ${vu(bas)}`);
  await fermerEssai(juge, cas, ouvert);
}

// 2. Noms piégés : rendus en texte ; « Garder » ne supprime rien.
async function essaiPieges() {
  const cas = 'noms piégés';
  const ouvert = await ouvrirEtiquettes(navigateur, serveur.url, 'telephone-etroit', {
    donnees: donnees(departPiege()),
  });
  const { page } = ouvert;
  const refus = await refuserPlage(page, PIEGES.plage);
  juge.exige(
    refus?.titre === net(remplir(r.titre, { nom: PIEGES.plage })) &&
      refus.explication === net(r.etiquette.one) &&
      refus.reste === net(remplir(r.reste, { n: 1 })) &&
      vu(refus.lignes) === vu([PIEGES.tongs]) &&
      vu(refus.details) === vu([net(remplir(r.objet, { categorie: PIEGES.vetements }))]) &&
      refus.balises === 0,
    `${cas} : refus ${vu(refus)}`,
  );
  await ouvrirLigne(page, PIEGES.tongs);
  await rendreToujoursInclus(page, fr.modele.toujoursInclus);
  await attendreLignes(page, []);
  const libre = await lireRefus(page);
  juge.exige(
    libre?.titre === net(remplir(s.etiquetteTitre, { nom: PIEGES.plage })) &&
      libre.libre === net(remplir(r.libre, { nom: PIEGES.plage })) &&
      libre.question ===
        net(`${s.etiquetteSuite} ${remplir(s.perteEtiquette.objet, { compte: '1 objet' })} ${s.voyages}`) &&
      libre.balises === 0,
    `${cas} : plus rien ne bloque ${vu(libre)}`,
  );
  await repondre(page, REFUS, s.garder);
  juge.exige(await attendreFermee(page, REFUS), `${cas} : « Garder » laisse le refus`);
  juge.exige((await page.locator(`${ETIQUETTE}[open]`).count()) === 1, `${cas} : la fiche de Plage s'est fermée`);
  const gardee = await bibliothequeStockee(page);
  juge.exige(
    gardee.etiquettes.some(e => e.nom === PIEGES.plage),
    `${cas} : « Garder » a supprimé Plage`,
  );
  await fermerEssai(juge, cas, ouvert);
}

// Le refus de Plage (piégée) réglé : Tongs en « Toujours inclus », plus rien ne bloque.
async function jusquALaQuestion(page) {
  await refuserPlage(page, PIEGES.plage);
  await ouvrirLigne(page, PIEGES.tongs);
  await rendreToujoursInclus(page, fr.modele.toujoursInclus);
  await attendreLignes(page, []);
}

async function poser(page, cle, operations) {
  await ecrireStockage(page, { ...(await lireStockage(page)), [cle]: operations });
}

// 3. « Supprimer » du refus : une panne laisse tout en place (fiche ouverte, message en haut, pas de
// bandeau) ; un double appui pendant une écriture lente n'écrit qu'une fois.
async function essaiEcriture() {
  const cas = 'écriture depuis le refus';
  let ouvert = await ouvrirEtiquettes(navigateur, serveur.url, 'telephone-etroit', { donnees: donnees(departPiege()) });
  await jusquALaQuestion(ouvert.page);
  const avant = await empreinte(ouvert.page);
  await poser(ouvert.page, 'pannes', ['supprimerEtiquette']);
  await repondre(ouvert.page, REFUS, s.supprimer);
  await attendreQue(ouvert.page, () => document.querySelector('.alerte-haut')?.matches(':popover-open'));
  // La fiche de Plage reste, « Supprimer » de nouveau actif (null : sans aria-disabled).
  const panne = await ouvert.page.evaluate(f => {
    const bouton = document.querySelector(`${f}[open] [data-supprimer]`);
    return {
      alerte: document.querySelector('.alerte-haut')?.textContent.trim(),
      fiche: bouton ? bouton.getAttribute('aria-disabled') : 'absente',
      bandeau: Boolean(document.querySelector('.bandeau-annuler')),
    };
  }, ETIQUETTE);
  juge.exige(
    panne.alerte === s.erreur && panne.fiche === null && !panne.bandeau && (await lireRefus(ouvert.page)) === null,
    `${cas} : panne ${vu(panne)}`,
  );
  juge.exige((await empreinte(ouvert.page)) === avant, `${cas} : la panne a changé la bibliothèque`);
  ouvert.erreurs.splice(0, Infinity, ...ouvert.erreurs.filter(e => !e.includes('Panne simulée')));
  await fermerEssai(juge, `${cas}, panne`, ouvert);

  ouvert = await ouvrirEtiquettes(navigateur, serveur.url, 'telephone-etroit', { donnees: donnees(departPiege()) });
  await jusquALaQuestion(ouvert.page);
  await poser(ouvert.page, 'lenteurs', ['supprimerEtiquette']);
  await ouvert.page.dblclick(`${REFUS} .fenetre-pied button:text-is("${s.supprimer}")`);
  const ecritures = await libererEcritures(ouvert.page, { max: 2 });
  juge.exige(await attendreFermee(ouvert.page, ETIQUETTE), `${cas} : la fiche de Plage reste ouverte`);
  const apres = await bibliothequeStockee(ouvert.page);
  juge.exige(
    ecritures === 1 && !apres.etiquettes.some(e => e.nom === PIEGES.plage),
    `${cas} : double appui, ${ecritures} écriture(s)`,
  );
  await fermerEssai(juge, `${cas}, double appui`, ouvert);
}

// 4. La liste relue en panne, après une fiche enregistrée (relecture finale, mineur de T6) : le refus
// le dit en haut, comme toute panne, et garde ce qu'il montrait.
async function essaiRelecture() {
  const cas = 'relecture en panne';
  const ouvert = await ouvrirEtiquettes(navigateur, serveur.url, 'telephone-etroit', { donnees: donnees() });
  const { page } = ouvert;
  await refuserPlage(page);
  await ouvrirLigne(page, 'Tongs');
  await poser(page, 'pannes', ['lireBibliotheque']);
  await rendreToujoursInclus(page, fr.modele.toujoursInclus);
  await attendreQue(page, () => document.querySelector('.alerte-haut') !== null);
  await calme(page);
  const vue = await page.evaluate(sel => {
    const alerte = document.querySelector('.alerte-haut');
    return {
      alerte: alerte?.textContent.trim() ?? null,
      dansLeRefus: Boolean(alerte?.closest(sel)),
      visible: alerte?.matches(':popover-open') ?? false,
    };
  }, REFUS);
  await page.screenshot({ path: join(CAPTURES, 'refus-relecture-en-panne-telephone-etroit.png') });
  const refus = await lireRefus(page);
  juge.exige(
    vue.alerte === r.erreurLecture && vue.dansLeRefus && vue.visible && refus?.lignes.length === 3,
    `${cas} : ${vu({ ...vue, lignes: refus?.lignes })}`,
  );
  await poser(page, 'pannes', []);
  ouvert.erreurs.splice(0, Infinity, ...ouvert.erreurs.filter(e => !e.includes('Panne simulée')));
  await fermerEssai(juge, cas, ouvert);
}

// 5. Les trois états, chaque format et thème : cibles, barres système, captures.
async function essaiCaptures(format, theme) {
  const cas = `captures (${format}, ${NOMS_THEME[theme]})`;
  const ouvert = await ouvrirEtiquettes(navigateur, serveur.url, format, { theme, donnees: donnees() });
  const { page } = ouvert;
  const capturer = async nom => {
    await page.mouse.move(0, 0);
    await calme(page);
    await verifierCommandes(page, juge, `${nom}, ${cas}`);
    await page.screenshot({ path: join(CAPTURES, `${nom}-${format}-${NOMS_THEME[theme]}.png`) });
  };
  await refuserPlage(page);
  await capturer('refus-suppression');
  await ouvrirLigne(page, 'Maillot de bain');
  await capturer('refus-suppression-fiche');
  await rendreToujoursInclus(page, fr.modele.toujoursInclus);
  await attendreLignes(page, ['Baignade', 'Tongs']);
  await ouvrirLigne(page, 'Tongs');
  await rendreToujoursInclus(page, fr.modele.toujoursInclus);
  await attendreLignes(page, ['Baignade']);
  await ouvrirLigne(page, 'Baignade');
  await ajouterEtiquette(page, 'Chaud');
  await attendreLignes(page, []);
  // La question repart d'en haut, sans « × » : la liste défilée ne la laisse pas à mi-hauteur.
  const libre = await lireRefus(page);
  juge.exige(
    libre?.libre !== null && libre.defilement === 0 && !libre.croix,
    `${cas} : plus rien ne bloque ${vu(libre)}`,
  );
  await capturer('refus-suppression-libre');
  await verifierBarres(page, juge, `refus-suppression-libre, ${cas}`);
  await fermerEssai(juge, cas, ouvert);
}

// Un essai qui bute (une fenêtre attendue qui ne vient pas) est une faute : les suivants tournent.
async function essayer(nom, essai) {
  try {
    await essai();
  } catch (erreur) {
    juge.exige(false, `${nom} : interrompu, ${erreur.message.split('\n')[0]}`);
  }
}

try {
  await mkdir(CAPTURES, { recursive: true });
  await essayer('téléphone couché', essaiCouche);
  await essayer('noms piégés', essaiPieges);
  await essayer('écriture depuis le refus', essaiEcriture);
  await essayer('relecture en panne', essaiRelecture);
  for (const format of Object.keys(TOUS_FORMATS))
    for (const theme of Object.keys(NOMS_THEME))
      await essayer(`${format}, ${theme}`, () => essaiCaptures(format, theme));
} finally {
  await navigateur.close();
  await serveur.fermer();
}
juge.conclure(
  'Fenêtre de refus',
  `téléphone couché, noms piégés, plus rien ne bloque, ${Object.keys(TOUS_FORMATS).length} formats × 2 thèmes, captures`,
);
