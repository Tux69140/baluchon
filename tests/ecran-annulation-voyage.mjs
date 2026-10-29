// Phase 8, tâche 4 : la portée du bandeau « Annuler » d'un retrait du voyage (src/ecrans/annulation.js)
// et le message de réussite en haut (annoncerEnHaut, src/ecrans/alerte.js). L'écran de retrait n'existe
// pas encore : le module est importé dans une page de l'appli, avec un stockage factice. Les parcours
// réels sont rejoués avec l'écran du voyage.
// - une écriture de la bibliothèque ne retire que le bandeau de la bibliothèque ;
// - ajouter au même voyage retire le bandeau du retrait, à un autre voyage le laisse ;
// - rétablir dans le voyage ne retire rien ; « Annuler » ne répond plus pendant un ajout au voyage ;
// - une suppression de la bibliothèque remplace le bandeau d'un retrait ;
// - le message de réussite s'affiche en haut, puis s'efface.
import { chromium } from 'playwright';
import { creerJuge } from './outils/page.mjs';
import { demarrerServeur } from './outils/serveur.mjs';

const juge = creerJuge();
const egal = (nom, vu, attendu) =>
  juge.exige(
    JSON.stringify(vu) === JSON.stringify(attendu),
    `${nom} : ${JSON.stringify(vu)} au lieu de ${JSON.stringify(attendu)}`,
  );
const serveur = await demarrerServeur();
const navigateur = await chromium.launch();
const page = await navigateur.newPage();
await page.goto(serveur.url);

// Dans la page : un stockage factice, et les scénarios ; chacun rend ce qui reste affiché.
const resultats = await page.evaluate(async () => {
  const { montrerAnnulation, surveillerEcritures } = await import('/src/ecrans/annulation.js');
  const { annoncerEnHaut } = await import('/src/ecrans/alerte.js');
  const { ECRITURES_BIBLIOTHEQUE } = await import('/src/stockage/index.js');
  const app = document.querySelector('#app') ?? document.body;
  const t = cle => cle;
  const factice = Object.fromEntries(ECRITURES_BIBLIOTHEQUE.map(nom => [nom, async () => {}]));
  // enCours : un ajout qui ne finit qu'à la demande.
  let enCours = null;
  Object.assign(factice, {
    ajouterAuVoyage: () => enCours ?? Promise.resolve(),
    retablirDansLeVoyage: async () => {},
    lireBibliotheque: async () => ({}),
  });
  const stockage = surveillerEcritures(factice);
  const affiche = () => document.querySelector('.bandeau-annuler')?.querySelector('p')?.textContent ?? null;
  const montrer = (texte, voyage) => montrerAnnulation({ t, app, texte, annuler: async () => {}, voyage });
  const ajout = voyageId => ({ categorie: null, objet: { voyageId } });
  const sortie = {};

  montrer('retrait', 'v1');
  await stockage.ajouterALaBibliotheque({});
  sortie.survitBibliotheque = affiche();

  await stockage.retablirDansLeVoyage(ajout('v1'));
  sortie.survitRetablissement = affiche();

  await stockage.ajouterAuVoyage(ajout('v2'));
  sortie.survitAutreVoyage = affiche();

  await stockage.ajouterAuVoyage(ajout('v1'));
  sortie.partMemeVoyage = affiche();

  montrer('retrait', 'v1');
  montrer('suppression');
  sortie.remplace = affiche();

  // Témoin positif : le bandeau de la bibliothèque, lui, part à une écriture de la bibliothèque.
  await stockage.ajouterALaBibliotheque({});
  sortie.temoin = affiche();

  // Le bandeau de la bibliothèque n'est pas retiré par un ajout au voyage.
  montrer('suppression');
  await stockage.ajouterAuVoyage(ajout('v1'));
  sortie.bibliothequeSurvitAjout = affiche();

  // Pendant un ajout à un autre voyage, « Annuler » ne répond plus ; l'ajout fini, si.
  montrer('retrait', 'v2');
  let finir;
  enCours = new Promise(r => (finir = r));
  const ajoutEnCours = stockage.ajouterAuVoyage(ajout('v1'));
  await new Promise(r => setTimeout(r, 0));
  const annuler = () => document.querySelector('.bandeau-annuler button')?.getAttribute('aria-disabled') ?? null;
  sortie.annulerPendantAjout = annuler();
  finir();
  await ajoutEnCours;
  enCours = null;
  sortie.annulerApresAjout = annuler();

  annoncerEnHaut(app, 'Ajouté', new AbortController().signal);
  const message = document.querySelector('.message-succes.alerte-haut');
  sortie.message = message && {
    ouvert: message.matches(':popover-open'),
    role: message.getAttribute('role'),
    texte: message.textContent.trim(),
    coche: !!message.querySelector('.icone'),
    haut: message.getBoundingClientRect().top < 100,
  };
  return sortie;
});

egal('une écriture de la bibliothèque laisse le retrait', resultats.survitBibliotheque, 'retrait');
egal('rétablir dans le voyage ne retire rien', resultats.survitRetablissement, 'retrait');
egal('ajouter à un autre voyage le laisse', resultats.survitAutreVoyage, 'retrait');
egal('ajouter au même voyage retire le retrait', resultats.partMemeVoyage, null);
egal('une suppression remplace le retrait', resultats.remplace, 'suppression');
egal('témoin : le bandeau de la bibliothèque part', resultats.temoin, null);
egal('ajouter au voyage laisse le bandeau de la bibliothèque', resultats.bibliothequeSurvitAjout, 'suppression');
egal('« Annuler » inactif pendant un ajout', resultats.annulerPendantAjout, 'true');
egal('« Annuler » de nouveau actif après l’ajout', resultats.annulerApresAjout, null);
egal('le message de réussite : en haut, role status, coche', resultats.message, {
  ouvert: true,
  role: 'status',
  texte: 'Ajouté',
  coche: true,
  haut: true,
});

// Il s'efface seul (DUREE_ALERTE, 6 s), l'horloge avancée.
await page.clock.install();
await page.evaluate(async () => {
  const { annoncerEnHaut } = await import('/src/ecrans/alerte.js');
  annoncerEnHaut(document.body, 'Ajouté', new AbortController().signal);
});
egal('le message est là', await page.locator('.message-succes.alerte-haut').count(), 1);
await page.clock.runFor(6100);
egal("le message s'efface", await page.locator('.message-succes.alerte-haut').count(), 0);

await navigateur.close();
await serveur.fermer();
juge.conclure('bandeau de retrait', 'portée et message de réussite');
