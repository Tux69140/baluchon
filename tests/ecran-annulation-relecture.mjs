// Phase 7, résiduel N1 de la relecture ciblée : « Annuler » touché pendant que « Supprimer » relit la
// bibliothèque pour la revérifier. Sous Tauri, la lecture est un aller-retour : un rétablissement lancé
// pendant ce temps passait sous la comparaison (faite sur l'état d'avant), puis l'écriture supprimait
// ce qu'il venait de rendre. « Annuler » ne répond plus de la revérification à la fin de l'écriture :
// rien de rendu n'est perdu, aucun orphelin. La lecture lente rend l'état lu à l'appel, comme la base.
// - question de la catégorie Toilette (Crème solaire supprimée), lecture lente, « Annuler » : inactif ;
//   la catégorie part avec ses 2 objets annoncés ;
// - refus de Climat devenu « Plus rien ne bloque » (Bouillotte supprimée), lecture lente, « Annuler » :
//   inactif ; aucun objet ne reste sans étiquette.
import { chromium } from 'playwright';
import { lireBandeau, ouvrirAvecHorloge, supprimerObjet } from './outils/annulation.mjs';
import { attendreQue, calme } from './outils/attente.mjs';
import { fermerEssai, fr, remplir, vu } from './outils/bibliotheque.mjs';
import { libererEcritures, ouvrirEtiquettes } from './outils/etiquettes.mjs';
import { FICHE, attendreFermee, bibliothequeStockee, ouvrirFicheCategorie } from './outils/fiches.mjs';
import { creerJuge, ecrireStockage, lireStockage } from './outils/page.mjs';
import { demarrerServeur } from './outils/serveur.mjs';
import {
  QUESTION,
  REFUS,
  attendreQuestion,
  attendreRefus,
  climat,
  donnees,
  ouvrirFicheDe,
  ouvrirLigne,
  supprimerModele,
  toucherSupprimer,
} from './outils/suppressions.mjs';

const juge = creerJuge();
const serveur = await demarrerServeur();
const navigateur = await chromium.launch();
const FORMAT = 'telephone-etroit';
const s = fr.suppression;

async function poser(page, cle, valeur) {
  await ecrireStockage(page, { ...(await lireStockage(page)), [cle]: valeur });
}

// « Supprimer » touché (selecteur) avec la lecture de la bibliothèque ralentie : la revérification
// lit l'état d'avant et attend ; les lectures suivantes ne sont plus ralenties. « Annuler » est alors
// touché ; rend ce que montrait le bandeau, et si l'élément est revenu dans le stockage.
async function annulerPendantLaRelecture(page, selecteur, nom) {
  await poser(page, 'lenteurs', ['lireBibliotheque']);
  await page.click(selecteur);
  await attendreQue(page, () => typeof window.debloquerStockage === 'function');
  await poser(page, 'lenteurs', []);
  const bandeau = await lireBandeau(page);
  await page.click('.bandeau-annuler button', { force: true });
  // Un rétablissement, s'il a lieu, le temps de s'écrire.
  const revenu = await attendreQue(
    page,
    n => JSON.parse(localStorage.getItem('baluchon-essai')).bibliotheque.objets.some(o => o.nom === n),
    nom,
    { max: 1000 },
  );
  await libererEcritures(page);
  return { bandeau, revenu: Boolean(revenu) };
}

const objetStocke = async (page, nom) => (await bibliothequeStockee(page)).objets.some(o => o.nom === nom);

// 1. La question de la catégorie Toilette.
async function essaiQuestion() {
  const cas = 'question, « Annuler » pendant la relecture';
  const ouvert = await ouvrirAvecHorloge(navigateur, serveur.url, FORMAT);
  const { page } = ouvert;
  await supprimerObjet(page, 'Toilette', 'Crème solaire');
  await ouvrirFicheCategorie(page, 'Toilette');
  await toucherSupprimer(page, FICHE);
  await attendreQuestion(page);
  const { bandeau, revenu } = await annulerPendantLaRelecture(
    page,
    `${QUESTION} .fenetre-pied button:text-is("${s.supprimer}")`,
    'Crème solaire',
  );
  await attendreFermee(page, FICHE);
  await attendreQue(page, () => document.querySelector('.bandeau-annuler p')?.textContent.includes('Toilette'));
  await calme(page);
  const apres = await lireBandeau(page);
  const perdue = revenu && !(await objetStocke(page, 'Crème solaire'));
  juge.exige(
    bandeau?.bouton.inactif &&
      !perdue &&
      apres?.texte === remplir(fr.annulation.categorie.other, { nom: 'Toilette', n: 2 }),
    `${cas} : ${vu({ inactif: bandeau?.bouton.inactif, revenue: revenu, perdue, bandeau: apres?.texte })}`,
  );
  await fermerEssai(juge, cas, ouvert);
}

// 2. Le refus de Climat, devenu « Plus rien ne bloque ».
async function essaiRefus() {
  const cas = 'refus, « Annuler » pendant la relecture';
  const ouvert = await ouvrirEtiquettes(navigateur, serveur.url, FORMAT, {
    donnees: donnees(climat({ bouillotte: true })),
  });
  const { page } = ouvert;
  await ouvrirFicheDe(page, 'groupe', 'Climat');
  await toucherSupprimer(page);
  await attendreRefus(page);
  await ouvrirLigne(page, 'Bouillotte');
  await supprimerModele(page);
  await attendreQue(page, sel => document.querySelector(`${sel}[open] .message-succes`) !== null, REFUS);
  await calme(page);
  const { bandeau, revenu } = await annulerPendantLaRelecture(page, `${REFUS}[open] [data-supprimer]`, 'Bouillotte');
  await attendreFermee(page, 'dialog.fiche-nom');
  await calme(page);
  const b = await bibliothequeStockee(page);
  const orphelins = b.objets.filter(o => !o.toujoursInclus && !o.etiquettes.length).map(o => o.nom);
  juge.exige(
    bandeau?.bouton.inactif && !orphelins.length,
    `${cas} : ${vu({ inactif: bandeau?.bouton.inactif, revenue: revenu, orphelins })}`,
  );
  await fermerEssai(juge, cas, ouvert);
}

try {
  await essaiQuestion();
  await essaiRefus();
} finally {
  await navigateur.close();
  await serveur.fermer();
}
juge.conclure(
  '« Annuler » pendant la revérification',
  'inactif de la relecture à l’écriture : rien de rendu n’est perdu, aucun orphelin',
);
