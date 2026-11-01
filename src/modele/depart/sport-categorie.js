// Structure de la bibliothèque de départ : aucune phrase ici, seulement des clés. Les mots de chaque
// langue vivent dans la branche « depart » de son dictionnaire (src/i18n/fr.json pour le français).

export const sportCategorie = {
  cle: 'sport-categorie',
  icone: 'soccer-ball',
  couleur: 'corail',
  etiquettes: ['sport'],
  objets: [
    { cle: 'tenues-de-sport', regle: 'par_jour', valeur: 1, plafond: 3, parPersonne: true, pourQui: 'tous' },
    { cle: 'brassiere-de-sport', regle: 'par_jour', valeur: 1, plafond: 2, parPersonne: true, pourQui: 'femmes' },
    { cle: 'serviette-de-sport', regle: 'fixe', valeur: 1, parPersonne: true, pourQui: 'tous' },
  ],
};
