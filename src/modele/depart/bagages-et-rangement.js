// Structure de la bibliothèque de départ : aucune phrase ici, seulement des clés. Les mots de chaque
// langue vivent dans la branche « depart » de son dictionnaire (src/i18n/fr.json pour le français).

export const bagagesEtRangement = {
  cle: 'bagages-et-rangement',
  icone: 'suitcase-rolling',
  couleur: 'abricot',
  objets: [
    { cle: 'valise-ou-sac-de-voyage', regle: 'fixe', valeur: 1, parPersonne: true, pourQui: 'adultes' },
    {
      cle: 'sac-a-dos-de-journee',
      regle: 'fixe',
      valeur: 1,
      parPersonne: true,
      pourQui: 'adultes',
      etiquettes: ['plage', 'ville', 'sports-hiver', 'sport', 'festival', 'detente', 'thalasso', 'travail', 'photo'],
    },
    { cle: 'sacs-de-rangement', regle: 'fixe', valeur: 1, parPersonne: false, pourQui: 'tous', note: true },
    { cle: 'sac-a-linge-sale', regle: 'fixe', valeur: 1, parPersonne: false, pourQui: 'tous' },
    { cle: 'lessive-de-voyage', regle: 'par_semaine', valeur: 5, parPersonne: false, pourQui: 'tous', note: true },
    { cle: 'cadenas', regle: 'fixe', valeur: 1, parPersonne: false, pourQui: 'tous', note: true },
    { cle: 'sac-de-courses-pliable', regle: 'fixe', valeur: 1, parPersonne: false, pourQui: 'tous' },
    {
      cle: 'pochette-etanche',
      regle: 'fixe',
      valeur: 1,
      parPersonne: false,
      pourQui: 'tous',
      etiquettes: [
        'randonnee',
        'itinerance',
        'plage',
        'ville',
        'sports-hiver',
        'sport',
        'festival',
        'detente',
        'thalasso',
        'travail',
        'photo',
      ],
    },
    {
      cle: 'sac-banane',
      regle: 'fixe',
      valeur: 1,
      parPersonne: true,
      pourQui: 'adultes',
      etiquettes: ['ville', 'festival', 'detente', 'travail', 'photo'],
    },
  ],
};
