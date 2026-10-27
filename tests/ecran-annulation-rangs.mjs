// Phase 7, relecture finale (constat M3) : une fiche « Nouvelle catégorie », « Nouveau groupe » ou
// « Ajouter une étiquette » ouverte, « Annuler » du bandeau rend le dernier élément de la liste ;
// l'élément créé ensuite prend la place d'après, jamais le même rang. Téléphone étroit.
// - Camping (dernière catégorie) supprimée, fiche « Nouvelle catégorie », « Annuler », « Plongée »
//   créée : rangs tous différents, Plongée après Camping ; « Annuler » touché pendant que
//   l'enregistrement relit la bibliothèque (résiduel N1) : jamais deux au même rang ;
// - groupe Hébergement (le dernier), puis « Transport » ; étiquette « Chez l’habitant » (la dernière
//   d'Hébergement), puis « Gîte » : de même.
import { chromium } from 'playwright';
import { attendreSansBandeau, ouvrirAvecHorloge, supprimerCategorie } from './outils/annulation.mjs';
import { attendreQue } from './outils/attente.mjs';
import { fermerEssai, fr, vu } from './outils/bibliotheque.mjs';
import { idGroupe, libererEcritures, lire, ouvrirEtiquettes } from './outils/etiquettes.mjs';
import {
  attendreFermee,
  attendreOuverte,
  bibliothequeStockee,
  enregistrer,
  ouvrirNouvelleCategorie,
  saisir,
} from './outils/fiches.mjs';
import { creerJuge, ecrireStockage, lireStockage } from './outils/page.mjs';
import { demarrerServeur } from './outils/serveur.mjs';
import { QUESTION, attendreQuestion, ouvrirFicheDe, repondre, toucherSupprimer } from './outils/suppressions.mjs';

const juge = creerJuge();
const serveur = await demarrerServeur();
const navigateur = await chromium.launch();
const FORMAT = 'telephone-etroit';
const NOM = 'dialog.fiche-nom';

// « Annuler » touché dans la fiche ouverte, puis l'élément revenu dans le stockage.
async function annulerDansLaFiche(page, liste, nom) {
  await page.click('.bandeau-annuler button');
  await attendreSansBandeau(page);
  return attendreQue(
    page,
    ({ liste, nom }) => JSON.parse(localStorage.getItem('baluchon-essai')).bibliotheque[liste].some(x => x.nom === nom),
    { liste, nom },
  );
}

async function poser(page, cle, valeur) {
  await ecrireStockage(page, { ...(await lireStockage(page)), [cle]: valeur });
}

// Les rangs d'une liste gardée, par nom ; distincts : aucun en double.
function rangs(liste) {
  const parNom = Object.fromEntries(liste.map(x => [x.nom, x.ordre]));
  return { parNom, distincts: new Set(liste.map(x => x.ordre)).size === liste.length };
}

// 1. Une catégorie créée après le retour de la dernière.
async function essaiCategorie() {
  const cas = 'nouvelle catégorie';
  const ouvert = await ouvrirAvecHorloge(navigateur, serveur.url, FORMAT);
  const { page } = ouvert;
  await supprimerCategorie(page, 'Camping');
  await ouvrirNouvelleCategorie(page);
  await annulerDansLaFiche(page, 'categories', 'Camping');
  await saisir(page, '#f-nom', 'Plongée');
  await enregistrer(page);
  await attendreFermee(page);
  const { parNom, distincts } = rangs((await bibliothequeStockee(page)).categories);
  juge.exige(distincts && parNom['Plongée'] > parNom.Camping, `${cas} : rangs ${vu(parNom)}`);
  await fermerEssai(juge, cas, ouvert);
}

// 1 bis. « Annuler » touché pendant que l'enregistrement relit la bibliothèque (résiduel N1) : la
// lecture lente rend l'état d'avant ; « Annuler » ne répond plus jusqu'à la fin de l'écriture.
async function essaiCategoriePendantLaRelecture() {
  const cas = 'nouvelle catégorie, « Annuler » pendant la relecture';
  const ouvert = await ouvrirAvecHorloge(navigateur, serveur.url, FORMAT);
  const { page } = ouvert;
  await supprimerCategorie(page, 'Camping');
  await ouvrirNouvelleCategorie(page);
  await saisir(page, '#f-nom', 'Plongée');
  await poser(page, 'lenteurs', ['lireBibliotheque']);
  await enregistrer(page);
  await attendreQue(page, () => typeof window.debloquerStockage === 'function');
  await poser(page, 'lenteurs', []);
  await page.click('.bandeau-annuler button', { force: true });
  await attendreQue(
    page,
    () => JSON.parse(localStorage.getItem('baluchon-essai')).bibliotheque.categories.some(c => c.nom === 'Camping'),
    undefined,
    { max: 1000 },
  );
  await libererEcritures(page);
  await attendreFermee(page);
  const { parNom, distincts } = rangs((await bibliothequeStockee(page)).categories);
  juge.exige(distincts, `${cas} : rangs ${vu(parNom)}`);
  await fermerEssai(juge, cas, ouvert);
}

// « Supprimer » de la fiche d'un groupe ou d'une étiquette, puis de sa question.
async function supprimerDepuisFiche(page, sorte, nom) {
  await ouvrirFicheDe(page, sorte, nom);
  await toucherSupprimer(page);
  await attendreQuestion(page);
  await repondre(page, QUESTION, fr.suppression.supprimer);
  await attendreFermee(page, NOM);
}

// La fiche neuve ouverte, « Annuler », puis le nom et « Enregistrer ».
async function creerApresAnnuler(page, commande, liste, rendu, nom) {
  await page.click(commande);
  await attendreOuverte(page, NOM);
  await annulerDansLaFiche(page, liste, rendu);
  await saisir(page, '#f-nom', nom);
  await page.click(`${NOM} .fenetre-pied .bouton-principal`);
  await attendreFermee(page, NOM);
}

// 2. Un groupe, puis une étiquette, créés après le retour du dernier.
async function essaiEtiquettes() {
  const cas = 'nouveau groupe, nouvelle étiquette';
  const ouvert = await ouvrirEtiquettes(navigateur, serveur.url, FORMAT);
  const { page } = ouvert;
  await supprimerDepuisFiche(page, 'groupe', 'Hébergement');
  await creerApresAnnuler(page, '#app [data-action="nouveau-groupe"]', 'groupes', 'Hébergement', 'Transport');
  const groupes = rangs((await bibliothequeStockee(page)).groupes);
  juge.exige(
    groupes.distincts && groupes.parNom.Transport > groupes.parNom['Hébergement'],
    `${cas} : rangs des groupes ${vu(groupes.parNom)}`,
  );

  await supprimerDepuisFiche(page, 'etiquette', 'Chez l’habitant');
  const hebergement = idGroupe(await lire(page), 'Hébergement');
  await creerApresAnnuler(
    page,
    `#app [data-action="nouvelle-etiquette"][data-id="${hebergement}"]`,
    'etiquettes',
    'Chez l’habitant',
    'Gîte',
  );
  const b = await bibliothequeStockee(page);
  const etiquettes = rangs(b.etiquettes.filter(e => e.groupeId === hebergement));
  juge.exige(
    etiquettes.distincts && etiquettes.parNom['Gîte'] > etiquettes.parNom['Chez l’habitant'],
    `${cas} : rangs des étiquettes d'Hébergement ${vu(etiquettes.parNom)}`,
  );
  await fermerEssai(juge, cas, ouvert);
}

try {
  await essaiCategorie();
  await essaiCategoriePendantLaRelecture();
  await essaiEtiquettes();
} finally {
  await navigateur.close();
  await serveur.fermer();
}
juge.conclure(
  'Rangs après « Annuler »',
  'catégorie, groupe et étiquette créés après le retour du dernier : chacun à son propre rang',
);
