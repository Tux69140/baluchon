// Grille de la phase 14 : l'accueil, les menus, Réglages (et le message après « Sauvegarder »), la restauration
// et « À propos », à chaque format et chaque thème (voir tests/outils/grille.mjs). Les formats bloquants jugent
// par le code de sortie ; telephone-paysage et telephone-etroit sont mis au rapport, en clair et en sombre, dans
// captures-travail/phase-14/rapports/.
import { pathToFileURL } from 'node:url';
import { attendreQue, calme } from './outils/attente.mjs';
import { FORMATS_BLOQUANTS, parcourirGrille } from './outils/grille.mjs';
import { bandeauEntier, figerHorloge, installerHorloge } from './outils/grille-fenetres.mjs';
import { attendreEcran } from './outils/page.mjs';
import { DEPART, FICHIERS_REFUSES, VALIDE, attendreFenetre, choisir } from './outils/restaurer.mjs';

const MAINTENANT = new Date('2026-10-12T10:00:00');
const NOM_LONG = 'A'.repeat(120);
const v = (id, nom, depart, retour) => ({
  id,
  nom,
  destination: 'Quelque part',
  depart,
  retour,
  femmes: 1,
  hommes: 1,
  enfants: 0,
  modifieLe: 'x',
});
const VOYAGES = [
  v('c1', 'Vercors', '2026-10-10', '2026-10-13'),
  v('a1', 'Toussaint', '2026-10-24', '2026-11-01'),
  v('a4', NOM_LONG, '2027-01-01', '2027-01-02'),
  v('p1', 'Pâques', '2026-04-03', '2026-04-06'),
];
const objet = (voyageId, quantite, dansLeSac) => ({ voyageId, quantite, dansLeSac });
const AVEC_VOYAGES = {
  toucheRetour: true,
  voyages: VOYAGES,
  objetsDuVoyage: [objet('c1', 2, 1), objet('c1', 1, 0), objet('a1', 3, 3), objet('p1', 1, 1)],
};
const SANS_VOYAGE = { toucheRetour: true, voyages: [] };

const sur = (nom, adresse, donnees, preparer) => ({ nom, adresse, donnees, maintenant: MAINTENANT, preparer });
const sansPreparation = ecran => async page => attendreEcran(page, ecran);
const ouvrirMenuDeCarte = async page => {
  await attendreEcran(page, 'voyages');
  await page.click('li.carte-avec-actions:has(> a.carte-voyage[href="#/voyage/c1"]) > .menu-voyage-bouton');
  await attendreQue(page, () => document.querySelector('.menu-voyage:popover-open') !== null);
};
const ouvrirMenuPrincipal = async page => {
  await attendreEcran(page, 'voyages');
  await page.click('[data-action="menu"]');
  await attendreQue(page, () => document.querySelector('dialog.tiroir[open]') !== null);
};
// Le message du bas après « Sauvegarder » (le fichier déposé) : entier, sur l'horloge simulée arrêtée dès
// qu'il est là. Pas d'heure imposée à la page : elle empêcherait l'horloge simulée de tourner.
const sauvegarder = async page => {
  await attendreEcran(page, 'reglages');
  await installerHorloge(page);
  await page.click('[data-geste="sauvegarder"]');
  await attendreQue(page, () => document.querySelector('.bandeau-annuler')?.matches(':popover-open') ?? false);
  await calme(page);
  await figerHorloge(page);
  await bandeauEntier(page, '.bandeau-annuler', '« Sauvegarder » : message du fichier déposé absent ou coupé');
};
const restaurer = fichier => async page => {
  await attendreEcran(page, 'reglages');
  await choisir(page, fichier);
  await attendreFenetre(page);
};

export const ETATS = [
  { ...sur('accueil-vide', '', SANS_VOYAGE, sansPreparation('voyages')), composition: null },
  sur('accueil-liste', '', AVEC_VOYAGES, sansPreparation('voyages')),
  sur('menu-carte', '', AVEC_VOYAGES, ouvrirMenuDeCarte),
  sur('menu-principal', '', AVEC_VOYAGES, ouvrirMenuPrincipal),
  sur('a-propos', '#/a-propos', SANS_VOYAGE, sansPreparation('a-propos')),
  sur('reglages', '#/reglages', DEPART, sansPreparation('reglages')),
  { nom: 'reglages-sauvegarde-message', adresse: '#/reglages', donnees: DEPART, preparer: sauvegarder },
  sur('restauration-confirmation', '#/reglages', DEPART, restaurer(VALIDE)),
  sur('restauration-refus-abime', '#/reglages', DEPART, restaurer(FICHIERS_REFUSES.abime)),
  sur('restauration-refus-format', '#/reglages', DEPART, restaurer(FICHIERS_REFUSES.format)),
  sur('restauration-refus-version', '#/reglages', DEPART, restaurer(FICHIERS_REFUSES.version)),
  {
    ...sur('alerte-lecture', '', { ...SANS_VOYAGE, pannes: ['listerVoyages'] }, async page => {
      await attendreQue(page, () => document.querySelector('.message-erreur') !== null);
    }),
    erreursAttendues: ['Panne simulée : listerVoyages'],
  },
];

if (import.meta.url === pathToFileURL(process.argv[1]).href)
  await parcourirGrille({ titre: 'accueil', etats: ETATS, formats: FORMATS_BLOQUANTS });
