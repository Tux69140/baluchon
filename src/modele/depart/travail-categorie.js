// Structure de la bibliothèque de départ : aucune phrase ici, seulement des clés. Les mots de chaque
// langue vivent dans la branche « depart » de son dictionnaire (src/i18n/fr.json pour le français).

export const travailCategorie = {
  cle: 'travail-categorie',
  icone: 'laptop',
  couleur: 'lilas',
  etiquettes: ['travail'],
  objets: [
    { cle: 'tenues-de-travail', regle: 'par_jour', valeur: 1, plafond: 3, parPersonne: true, pourQui: 'adultes' },
    { cle: 'documents-de-travail', regle: 'fixe', valeur: 1, parPersonne: false, pourQui: 'adultes' },
    { cle: 'badge-ou-cartes-de-visite', regle: 'fixe', valeur: 1, parPersonne: true, pourQui: 'adultes' },
  ],
};
