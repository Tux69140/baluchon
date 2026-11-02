// Grille de la phase 14 : l'assistant « Nouveau voyage » (Informations, groupes d'étiquettes, Aperçu,
// question d'abandon), « Modifier le voyage » (étape Changements) et « Refaire ce voyage », à chaque
// format et chaque thème (voir tests/outils/grille.mjs). Les formats bloquants jugent par le code de
// sortie ; telephone-paysage est mis au rapport dans captures-travail/phase-14/rapports/.
import { pathToFileURL } from 'node:url';
import { attendreQue, calme } from './outils/attente.mjs';
import { attendreQuestion } from './outils/assistant.mjs';
import { FORMATS_BLOQUANTS, parcourirGrille } from './outils/grille.mjs';
import { attendreEcran } from './outils/page.mjs';
import { V, donneesOrigine, refaireDepuisLeVoyage, remplirInfos, versApercu } from './outils/refaire.mjs';

const MAINTENANT = new Date('2026-10-06T10:00:00');
const NOUVEAU = '#/nouveau-voyage';
const VOYAGE = `#/voyage/${V}`;

const sur = (nom, adresse, donnees, preparer) => ({ nom, adresse, donnees, maintenant: MAINTENANT, preparer });
const infos = async page => attendreEcran(page, 'nouveau-voyage');
// Les étapes s'ouvrent l'une après l'autre : « Suivant » autant de fois que de groupes à passer.
const suivant = async page => {
  await page.click('.assistant [data-action="suivant"]');
  await calme(page);
};
const remplies = async page => {
  await infos(page);
  await remplirInfos(page);
};
const groupe = indice => async page => {
  await remplies(page);
  for (let i = 0; i < indice; i += 1) await suivant(page);
};
const apercu = async page => {
  await remplies(page);
  await versApercu(page);
};
const abandon = async page => {
  await remplies(page);
  await page.click('[data-action="fermer"], .assistant-plein .lien-retour');
  await attendreQuestion(page);
};
const modifier = async page => {
  await attendreEcran(page, 'voyage');
  await page.click('.voyage-titre .menu-voyage-bouton');
  await page.click('.voyage-titre .menu-voyage [data-menu="modifier"]');
  await attendreEcran(page, 'modifier-voyage');
  await page.click('.assistant [data-groupe="femmes"][data-pas="1"]');
  await page.click('.assistant [data-action="apercu"], .assistant [data-action="suivant"]');
  await attendreQue(page, () => document.querySelector('.recapitulatif') !== null);
  await calme(page);
};
const refaire = async page => {
  await attendreEcran(page, 'voyage');
  await refaireDepuisLeVoyage(page);
  await remplirInfos(page);
  await versApercu(page);
};

export const ETATS = [
  { ...sur('informations-vides', NOUVEAU, {}, infos), composition: null },
  sur('informations-remplies', NOUVEAU, {}, remplies),
  sur('groupe-activites', NOUVEAU, {}, groupe(1)),
  sur('groupe-destination', NOUVEAU, {}, groupe(2)),
  sur('groupe-transport', NOUVEAU, {}, groupe(3)),
  sur('groupe-hebergement', NOUVEAU, {}, groupe(4)),
  sur('apercu', NOUVEAU, {}, apercu),
  sur('abandon', NOUVEAU, {}, abandon),
  sur('modifier-changements', VOYAGE, donneesOrigine(), modifier),
  sur('refaire-apercu', VOYAGE, donneesOrigine(), refaire),
];

if (import.meta.url === pathToFileURL(process.argv[1]).href)
  await parcourirGrille({ titre: 'assistant', etats: ETATS, formats: FORMATS_BLOQUANTS });
