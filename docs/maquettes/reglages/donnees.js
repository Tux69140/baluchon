// Les quatre voyages de la sauvegarde « du 12 octobre 2026 », tels que Mes voyages les montre une fois
// restaurés, au format de l'appli (src/ecrans/voyages.js). Leur avancement est donné tout fait : la
// maquette n'a pas de listes d'objets.
export const AUJOURDHUI = '2026-10-31';

const voyage = (id, nom, destination, depart, retour, voyageurs) => ({
  id,
  nom,
  destination,
  depart,
  retour,
  voyageurs,
});

export const voyagesRestaures = [
  voyage('v-lyon', 'Week-end à Lyon', 'Lyon', '2026-10-30', '2026-11-01', 2),
  voyage('v-jura', 'Noël dans le Jura', 'Les Rousses', '2026-12-21', '2026-12-27', 4),
  voyage('v-quiberon', 'Quiberon', 'Bretagne', '2026-07-12', '2026-07-19', 2),
  voyage('v-verdon', 'Gorges du Verdon', 'Provence', '2026-05-01', '2026-05-04', 2),
];

export const progressions = new Map([
  ['v-lyon', { faits: 18, total: 42 }],
  ['v-jura', { faits: 0, total: 56 }],
]);
