// Phase 6 (spec, « Maquettes validées », docs/maquettes/etiquettes/fiches.js) : les fiches d'un groupe
// et d'une étiquette (src/ecrans/fiche-etiquette.js), sur la page d'essai
// tests/pages/fiches-etiquettes.html (l'écran Étiquettes n'existe pas encore). Bibliothèque d'essai :
// Activités [Randonnée, Camping, Plage], Climat [Chaud, Froid, Pluie], Saison (vide), « <b>&"x »
// [« <i>&"y »].
// - nouvelle étiquette : nom manquant, nom pris ailleurs ou ici (message au nom existant), message qui
//   suit chaque correction, Entrée enregistre ; nouveau groupe : nom pris, panne puis nouvel essai,
//   double appui sur « Créer le groupe » = une seule écriture ;
// - « Supprimer » : question « Garder » / « Supprimer » (rouge, picto), « Garder » laisse la fiche et
//   sa saisie, « Supprimer » ferme tout sans question d'abandon, panne = message en haut et fiche
//   ouverte ; pendant l'écriture, « Enregistrer » et « Supprimer » inactifs ;
// - question d'un groupe (étiquettes en toutes lettres, groupe vide) ; retour système ; noms à balises
//   rendus en texte (Review Focus 1) ;
// - tous les formats, clair et sombre : cibles, barres système, ombre du pied quand « Supprimer » est
//   sous le pli ; captures fiche-etiquette-…, fiche-groupe-…, supprimer-… dans captures-travail/.
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { chromium } from 'playwright';
import { attendreQue, calme } from './outils/attente.mjs';
import { demarrerServeur } from './outils/serveur.mjs';
import { TOUS_FORMATS, fermerEssai, fr, remplir, vu } from './outils/bibliotheque.mjs';
import {
  FICHE,
  attendreFermee,
  attendreOuverte,
  enregistrer,
  lireFiche,
  m,
  saisir,
  toucher,
} from './outils/fiches.mjs';
import { CAPTURES, NOMS_THEME, creerJuge, ouvrir, verifierBarres, verifierCommandes } from './outils/page.mjs';

const juge = creerJuge();
const serveur = await demarrerServeur();
const navigateur = await chromium.launch();
const s = fr.suppression;
const QUESTION = 'dialog[role="alertdialog"]';
const ADRESSE = '/tests/pages/fiches-etiquettes.html#niveau-0';

async function ouvrirEssai(format = 'telephone', theme = 'light') {
  const { taille, ecran, tactile } = TOUS_FORMATS[format];
  const ouvert = await ouvrir(navigateur, serveur.url, { taille, ecran, tactile, theme, adresse: ADRESSE });
  // Une commande attendue qui ne vient pas fait buter l'essai vite, sans attendre 30 s.
  ouvert.page.setDefaultTimeout(5000);
  return ouvert;
}

// La panne simulée par la page est attendue : seule une autre erreur est une faute.
function fermer(cas, ouvert) {
  ouvert.erreurs.splice(0, Infinity, ...ouvert.erreurs.filter(e => !e.includes('Panne simulée')));
  return fermerEssai(juge, cas, ouvert);
}

async function ouvrirFiche(page, sorte, id) {
  await page.click(`#app [data-ouvrir="${sorte}"]${id ? `[data-id="${id}"]` : ''}`);
  return attendreOuverte(page);
}

// Ce que lireFiche ne dit pas : l'aide, « Supprimer » (libellé, inactif), les balises nées d'un nom
// dans les messages, l'ombre du pied.
const lireSuite = page =>
  page.evaluate(selecteur => {
    const d = [...document.querySelectorAll(selecteur)].find(x => x.open && !('fermeture' in x.dataset));
    if (!d) return null;
    const bouton = d.querySelector('.zone-suppression [data-supprimer]');
    return {
      aide: d.querySelector('.fiche-corps > .aide')?.textContent.trim() ?? null,
      supprimer: bouton?.textContent.trim() ?? null,
      supprimerInactif: bouton?.getAttribute('aria-disabled') === 'true',
      balises: d.querySelectorAll('.erreur-champ span *').length,
      ombre: d.querySelector('.fenetre-pied').hasAttribute('data-ombre'),
    };
  }, FICHE);

const lireQuestion = page =>
  page.evaluate(selecteur => {
    const d = document.querySelector(`${selecteur}[open]`);
    if (!d) return null;
    const texte = el => el?.textContent.replace(/\s+/g, ' ').trim() ?? null;
    return {
      titre: texte(d.querySelector('h2')),
      texte: texte(d.querySelector('#texte-confirmation')),
      boutons: [...d.querySelectorAll('.fenetre-pied button')].map(
        b =>
          `${texte(b)}:${b.classList.contains('bouton-danger') ? 'danger' : 'autre'}:${b.querySelector('svg') ? 'picto' : ''}`,
      ),
      focus: texte(document.activeElement),
      balises: d.querySelectorAll('h2 *, #texte-confirmation *').length,
    };
  }, QUESTION);

async function attendreQuestion(page) {
  await attendreQue(page, q => document.querySelector(`${q}[open]`) !== null, QUESTION);
  await calme(page);
  return lireQuestion(page);
}

// Sans question ouverte, rien n'est touché : c'est au test d'avoir jugé son absence.
async function repondre(page, libelle) {
  if (!(await lireQuestion(page))) return;
  await page.click(`${QUESTION} .fenetre-pied button:text-is("${libelle}")`);
  await attendreQue(page, q => !document.querySelector(q), QUESTION);
  await calme(page);
}

const sortie = (page, id) => page.evaluate(i => document.querySelector(`#${i}`).textContent, id);
const panne = (page, oui) => page.evaluate(v => (document.querySelector('#panne').checked = v), oui);
const retenir = (page, oui) => page.evaluate(v => (window.retenir = v), oui);
const liberer = page => page.evaluate(() => window.liberer());
const supprimer = page => toucher(page, '[data-supprimer]');
const alerte = page =>
  page.evaluate(() => {
    const a = document.querySelector('.alerte-haut');
    return a?.matches(':popover-open') ? a.textContent.trim() : null;
  });
async function retour(page) {
  await page.goBack({ timeout: 3000 }).catch(() => null);
  await calme(page);
}
const BOUTONS_QUESTION = [`${s.garder}:autre:`, `${s.supprimer}:danger:picto`];

// 1. Nouvelle étiquette dans Climat : refus, messages au nom existant, Entrée enregistre.
async function essaiNouvelleEtiquette() {
  const cas = 'nouvelle étiquette';
  const ouvert = await ouvrirEssai();
  const { page } = ouvert;
  juge.exige(await ouvrirFiche(page, 'nouvelle-etiquette', 'g-cli'), `${cas} : la fiche s'ouvre`);
  const fiche = await lireFiche(page);
  const suite = await lireSuite(page);
  juge.exige(
    fiche?.titre === m.etiquette.nouvelle &&
      fiche.sousTitre === remplir(m.etiquette.dans, { groupe: 'Climat' }) &&
      fiche.bouton === m.etiquette.ajouter &&
      fiche.nom === '',
    `${cas} : ${vu(fiche)}`,
  );
  juge.exige(
    suite?.aide === m.etiquette.aide && suite.supprimer === null,
    `${cas} : aide, pas de Supprimer ${vu(suite)}`,
  );

  await enregistrer(page);
  const vide = await lireFiche(page);
  juge.exige(
    vu(vide?.erreurs) === vu([m.etiquette.erreurs.nomManquant]) && vide.focus === 'f-nom',
    `${cas} : sans nom ${vu(vide)}`,
  );
  const attendus = [
    ['plage', remplir(m.etiquette.erreurs.nomPris, { nom: 'Plage', groupe: 'Activités' })],
    [' CHAUD ', remplir(m.etiquette.erreurs.nomPrisIci, { nom: 'Chaud' })],
    ['<I>&"Y', remplir(m.etiquette.erreurs.nomPris, { nom: '<i>&"y', groupe: '<b>&"x' })],
    ['Neige', null],
  ];
  for (const [nom, message] of attendus) {
    await saisir(page, '#f-nom', nom);
    const lue = await lireFiche(page);
    juge.exige(vu(lue?.erreurs) === vu(message ? [message] : []), `${cas} : « ${nom} » → ${vu(lue?.erreurs)}`);
  }
  juge.exige((await lireSuite(page))?.balises === 0, `${cas} : un nom à balises reste du texte dans le message`);
  await page.press(`${FICHE} #f-nom`, 'Enter');
  juge.exige(await attendreFermee(page), `${cas} : Entrée enregistre et ferme`);
  juge.exige(
    (await sortie(page, 'enregistrements')) === vu([{ nom: 'Neige' }]),
    `${cas} : ${await sortie(page, 'enregistrements')}`,
  );
  await fermer(cas, ouvert);
}

// 2. Nouveau groupe : nom pris, panne puis nouvel essai, double appui = une seule écriture.
async function essaiNouveauGroupe() {
  const cas = 'nouveau groupe';
  const ouvert = await ouvrirEssai();
  const { page } = ouvert;
  juge.exige(await ouvrirFiche(page, 'nouveau-groupe'), `${cas} : la fiche s'ouvre`);
  const fiche = await lireFiche(page);
  juge.exige(
    fiche?.titre === m.groupe.nouveau && fiche.sousTitre === m.groupe.sousTitreNeuf && fiche.bouton === m.groupe.creer,
    `${cas} : ${vu(fiche)}`,
  );
  juge.exige((await lireSuite(page))?.aide === m.groupe.aide, `${cas} : aide`);
  await saisir(page, '#f-nom', ' climat ');
  await enregistrer(page);
  juge.exige(
    vu((await lireFiche(page))?.erreurs) === vu([remplir(m.groupe.erreurs.nomPris, { nom: 'Climat' })]),
    `${cas} : nom pris ${vu((await lireFiche(page))?.erreurs)}`,
  );
  await saisir(page, '#f-nom', 'Durée');
  await panne(page, true);
  await enregistrer(page);
  juge.exige(
    (await alerte(page)) === fr.bibliotheque.erreurEnregistrement && (await lireFiche(page))?.nom === 'Durée',
    `${cas} : panne, message en haut et fiche gardée`,
  );
  await panne(page, false);
  await retenir(page, true);
  await enregistrer(page);
  juge.exige(
    (await lireFiche(page))?.boutonInactif === true,
    `${cas} : « Créer le groupe » inactif pendant l'écriture`,
  );
  await toucher(page, '.fenetre-pied .bouton-principal', { force: true });
  await liberer(page);
  juge.exige(await attendreFermee(page), `${cas} : la fiche se ferme`);
  juge.exige(
    (await sortie(page, 'enregistrements')) === vu([{ nom: 'Durée' }]),
    `${cas} : une seule écriture ${await sortie(page, 'enregistrements')}`,
  );
  await fermer(cas, ouvert);
}

// 3. Fiche de Plage : « Supprimer », « Garder », retour système, panne, écriture.
async function essaiSupprimerEtiquette() {
  const cas = 'supprimer Plage';
  const ouvert = await ouvrirEssai();
  const { page } = ouvert;
  juge.exige(await ouvrirFiche(page, 'etiquette', 'e-plage'), `${cas} : la fiche s'ouvre`);
  const fiche = await lireFiche(page);
  juge.exige(
    fiche?.titre === 'Plage' &&
      fiche.sousTitre === remplir(m.etiquette.dans, { groupe: 'Activités' }) &&
      fiche.bouton === m.enregistrer &&
      fiche.nom === 'Plage',
    `${cas} : ${vu(fiche)}`,
  );
  juge.exige((await lireSuite(page))?.supprimer === m.etiquette.supprimer, `${cas} : bouton Supprimer`);
  await saisir(page, '#f-nom', 'Plagette');

  // « Garder » : la question part, la fiche reste avec sa saisie.
  await supprimer(page);
  const question = await attendreQuestion(page);
  juge.exige(
    question?.titre === remplir(s.etiquetteTitre, { nom: 'Plage' }) &&
      question.texte === s.etiquetteTexte &&
      vu(question.boutons) === vu(BOUTONS_QUESTION) &&
      question.focus === s.garder,
    `${cas} : question ${vu(question)}`,
  );
  const pendant = { fiche: await lireFiche(page), suite: await lireSuite(page) };
  juge.exige(
    pendant.fiche?.boutonInactif && pendant.suite?.supprimerInactif,
    `${cas} : « Enregistrer » et « Supprimer » inactifs pendant la question ${vu(pendant)}`,
  );
  await repondre(page, s.garder);
  const apres = { fiche: await lireFiche(page), suite: await lireSuite(page) };
  juge.exige(
    apres.fiche?.nom === 'Plagette' && !apres.fiche.boutonInactif && !apres.suite.supprimerInactif,
    `${cas} : après « Garder » ${vu(apres)}`,
  );

  // Retour système sur la question : elle seule se ferme.
  await supprimer(page);
  await attendreQuestion(page);
  await retour(page);
  juge.exige((await lireQuestion(page)) === null, `${cas} : le retour ferme la question`);
  juge.exige((await lireFiche(page))?.nom === 'Plagette', `${cas} : la fiche reste après le retour`);
  juge.exige(page.url().endsWith(ADRESSE), `${cas} : adresse inchangée ${page.url()}`);

  // Panne : message en haut, fiche ouverte avec sa saisie.
  await panne(page, true);
  await supprimer(page);
  await attendreQuestion(page);
  await repondre(page, s.supprimer);
  juge.exige((await alerte(page)) === s.erreur, `${cas} : panne, message ${vu(await alerte(page))}`);
  const panneLue = { fiche: await lireFiche(page), suite: await lireSuite(page) };
  juge.exige(
    panneLue.fiche?.nom === 'Plagette' && !panneLue.fiche.boutonInactif && !panneLue.suite.supprimerInactif,
    `${cas} : après la panne ${vu(panneLue)}`,
  );
  juge.exige((await sortie(page, 'suppressions')) === '0', `${cas} : rien de supprimé`);

  // L'écriture : tout inactif pendant, puis question et fiche fermées sans « Abandonner… ».
  await panne(page, false);
  await retenir(page, true);
  await supprimer(page);
  await attendreQuestion(page);
  await repondre(page, s.supprimer);
  const ecriture = { fiche: await lireFiche(page), suite: await lireSuite(page) };
  juge.exige(
    ecriture.fiche?.boutonInactif && ecriture.suite?.supprimerInactif,
    `${cas} : inactifs pendant l'écriture ${vu(ecriture)}`,
  );
  await retour(page);
  juge.exige((await lireQuestion(page)) === null, `${cas} : le retour pendant l'écriture ne demande rien`);
  await liberer(page);
  juge.exige(await attendreFermee(page), `${cas} : la fiche se ferme`);
  juge.exige((await lireQuestion(page)) === null, `${cas} : aucune question d'abandon`);
  juge.exige((await sortie(page, 'suppressions')) === '1', `${cas} : une suppression`);
  juge.exige((await sortie(page, 'fermetures')) === '1', `${cas} : une fermeture`);
  await fermer(cas, ouvert);
}

// 4. Groupes : question qui nomme les étiquettes, groupe vide, noms à balises, retour système.
async function essaiGroupes() {
  const cas = 'groupes';
  const ouvert = await ouvrirEssai();
  const { page } = ouvert;
  juge.exige(await ouvrirFiche(page, 'groupe', 'g-cli'), `${cas} : fiche de Climat`);
  const climat = await lireFiche(page);
  juge.exige(
    climat?.titre === 'Climat' &&
      climat.sousTitre === remplir(fr.etiquettes.etiquettes.other, { n: 3 }) &&
      climat.bouton === m.enregistrer,
    `${cas} : ${vu(climat)}`,
  );
  juge.exige((await lireSuite(page))?.supprimer === m.groupe.supprimer, `${cas} : bouton Supprimer`);
  await supprimer(page);
  const question = await attendreQuestion(page);
  juge.exige(
    question?.titre === remplir(s.groupeTitre, { nom: 'Climat' }) &&
      question.texte === remplir(s.groupeTexte.other, { etiquettes: 'Chaud, Froid et Pluie' }) &&
      vu(question.boutons) === vu(BOUTONS_QUESTION),
    `${cas} : question de Climat ${vu(question)}`,
  );
  await repondre(page, s.garder);
  // Non modifiée, le retour la ferme sans rien demander.
  await retour(page);
  juge.exige(await attendreFermee(page), `${cas} : le retour ferme la fiche non modifiée`);
  juge.exige((await lireQuestion(page)) === null, `${cas} : sans question`);

  // Modifiée : le retour demande « Abandonner les modifications ? ».
  await ouvrirFiche(page, 'groupe', 'g-cli');
  await saisir(page, '#f-nom', 'Météo');
  await retour(page);
  const abandon = await attendreQuestion(page);
  juge.exige(
    abandon?.titre === m.abandon.titre && abandon.texte === remplir(m.groupe.abandonTexte, { nom: 'Climat' }),
    `${cas} : question d'abandon ${vu(abandon)}`,
  );
  await repondre(page, m.abandon.continuer);
  juge.exige((await lireFiche(page))?.nom === 'Météo', `${cas} : la saisie reste`);
  await page.click(`${FICHE} .bouton-fermer`);
  await attendreQuestion(page);
  await repondre(page, m.abandon.abandonner);
  await attendreFermee(page);

  await ouvrirFiche(page, 'groupe', 'g-vide');
  juge.exige((await lireFiche(page))?.sousTitre === m.groupe.aucune, `${cas} : groupe vide, sous-titre`);
  await supprimer(page);
  const vide = await attendreQuestion(page);
  juge.exige(
    vide?.titre === remplir(s.groupeTitre, { nom: 'Saison' }) && vide.texte === s.groupeVide,
    `${cas} : question du groupe vide ${vu(vide)}`,
  );
  await repondre(page, s.garder);
  await page.click(`${FICHE} .bouton-fermer`);
  await attendreFermee(page);

  // Review Focus 1 : des noms à balises, rendus en texte partout.
  await ouvrirFiche(page, 'groupe', 'g-bizarre');
  const bizarre = await lireFiche(page);
  juge.exige(bizarre?.titre === '<b>&"x' && bizarre.balises === 0, `${cas} : titre du groupe ${vu(bizarre)}`);
  await supprimer(page);
  const qBizarre = await attendreQuestion(page);
  juge.exige(
    qBizarre?.titre === remplir(s.groupeTitre, { nom: '<b>&"x' }) &&
      qBizarre.texte === remplir(s.groupeTexte.one, { etiquettes: '<i>&"y' }) &&
      qBizarre.balises === 0,
    `${cas} : question du groupe à balises ${vu(qBizarre)}`,
  );
  await repondre(page, s.garder);
  await page.click(`${FICHE} .bouton-fermer`);
  await attendreFermee(page);
  await ouvrirFiche(page, 'etiquette', 'e-bizarre');
  const etiquette = await lireFiche(page);
  juge.exige(
    etiquette?.titre === '<i>&"y' &&
      etiquette.sousTitre === remplir(m.etiquette.dans, { groupe: '<b>&"x' }) &&
      etiquette.balises === 0,
    `${cas} : fiche de l'étiquette à balises ${vu(etiquette)}`,
  );
  await supprimer(page);
  const qEtiquette = await attendreQuestion(page);
  juge.exige(
    qEtiquette?.titre === remplir(s.etiquetteTitre, { nom: '<i>&"y' }) && qEtiquette.balises === 0,
    `${cas} : question de l'étiquette à balises ${vu(qEtiquette)}`,
  );
  await repondre(page, s.garder);
  await fermer(cas, ouvert);
}

// La fenêtre du dessus tient dans l'écran.
async function verifierDansLEcran(page, cas, selecteur) {
  const r = await page.evaluate(sel => {
    const d = [...document.querySelectorAll(sel)].at(-1)?.getBoundingClientRect();
    return d && { haut: d.top, bas: d.bottom, gauche: d.left, droite: d.right, l: innerWidth, h: innerHeight };
  }, selecteur);
  juge.exige(
    r && r.haut >= 0 && r.gauche >= 0 && r.bas <= r.h + 0.5 && r.droite <= r.l + 0.5,
    `${cas} : la fenêtre sort de l'écran ${vu(r)}`,
  );
}

async function capturer(page, nom, cas, format, theme, selecteur = FICHE) {
  await page.mouse.move(0, 0);
  await calme(page);
  await verifierCommandes(page, juge, `${nom}, ${cas}`);
  await verifierDansLEcran(page, `${nom}, ${cas}`, selecteur);
  await page.screenshot({ path: join(CAPTURES, `${nom}-${format}-${NOMS_THEME[theme]}.png`) });
}

// « Supprimer » sous le pli : le pied porte son ombre ; défilé jusqu'en bas, elle s'en va.
async function verifierOmbre(page, cas) {
  const pli = await page.evaluate(selecteur => {
    const d = document.querySelector(selecteur);
    const corps = d.querySelector('.fiche-corps');
    const dessous =
      d.querySelector('[data-supprimer]').getBoundingClientRect().bottom > corps.getBoundingClientRect().bottom;
    return { dessous, ombre: d.querySelector('.fenetre-pied').hasAttribute('data-ombre') };
  }, FICHE);
  juge.exige(pli.dessous && pli.ombre, `${cas} : « Supprimer » sous le pli, pied ombré ${vu(pli)}`);
  await page.evaluate(selecteur => {
    const corps = document.querySelector(`${selecteur} .fiche-corps`);
    corps.scrollTop = corps.scrollHeight;
  }, FICHE);
  await calme(page);
  juge.exige((await lireSuite(page))?.ombre === false, `${cas} : défilé en bas, plus d'ombre`);
  await page.evaluate(selecteur => (document.querySelector(`${selecteur} .fiche-corps`).scrollTop = 0), FICHE);
  await calme(page);
}

async function essaiFormat(format, theme) {
  const cas = `${format}, ${NOMS_THEME[theme]}`;
  const ouvert = await ouvrirEssai(format, theme);
  const { page } = ouvert;
  juge.exige(await ouvrirFiche(page, 'etiquette', 'e-plage'), `${cas} : fiche de Plage`);
  await capturer(page, 'fiche-etiquette', cas, format, theme);
  if (format === 'telephone-etroit-paysage') await verifierOmbre(page, cas);
  await supprimer(page);
  juge.exige((await attendreQuestion(page)) !== null, `${cas} : question`);
  await capturer(page, 'supprimer', cas, format, theme, QUESTION);
  const petits = await page.$$eval(`${QUESTION} button`, boutons =>
    boutons.filter(b => b.getBoundingClientRect().height < 43.5).map(b => b.textContent.trim()),
  );
  juge.exige(petits.length === 0, `${cas} : boutons de la question de moins de 44 px : ${petits}`);
  await repondre(page, s.garder);
  await page.click(`${FICHE} .bouton-fermer`);
  await attendreFermee(page);
  juge.exige(await ouvrirFiche(page, 'groupe', 'g-cli'), `${cas} : fiche de Climat`);
  await capturer(page, 'fiche-groupe', cas, format, theme);
  await verifierBarres(page, juge, `fiche-groupe, ${cas}`);
  await fermer(cas, ouvert);
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
  await essayer('nouvelle étiquette', essaiNouvelleEtiquette);
  await essayer('nouveau groupe', essaiNouveauGroupe);
  await essayer('supprimer Plage', essaiSupprimerEtiquette);
  await essayer('groupes', essaiGroupes);
  for (const theme of ['light', 'dark'])
    for (const format of Object.keys(TOUS_FORMATS))
      await essayer(`${format}, ${theme}`, () => essaiFormat(format, theme));
} finally {
  await navigateur.close();
  await serveur.fermer();
}
juge.conclure(
  'Fiches de groupe et d’étiquette',
  `messages, Supprimer et sa question, retour, ${Object.keys(TOUS_FORMATS).length} formats × 2 thèmes`,
);
