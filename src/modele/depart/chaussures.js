// Structure de la bibliothèque de départ : aucune phrase ici, seulement des clés. Les mots de chaque
// langue vivent dans la branche « depart » de son dictionnaire (src/i18n/fr.json pour le français).

export const chaussures = {
  cle: 'chaussures',
  icone: 'sneaker',
  couleur: 'corail',
  objets: [
    { cle: 'chaussures-confortables', regle: 'fixe', valeur: 1, parPersonne: true, pourQui: 'tous' },
    {
      cle: 'sandales-ou-tongs',
      regle: 'fixe',
      valeur: 1,
      parPersonne: true,
      pourQui: 'tous',
      etiquettes: ['chaud', 'plage', 'camping', 'thalasso'],
    },
    {
      cle: 'chaussures-de-randonnee',
      regle: 'fixe',
      valeur: 1,
      parPersonne: true,
      pourQui: 'tous',
      etiquettes: ['randonnee', 'itinerance'],
      note: true,
    },
    {
      cle: 'chaussures-chaudes-et-impermeables',
      regle: 'fixe',
      valeur: 1,
      parPersonne: true,
      pourQui: 'tous',
      etiquettes: ['froid', 'sports-hiver', 'pluie'],
    },
    { cle: 'chaussures-de-sport', regle: 'fixe', valeur: 1, parPersonne: true, pourQui: 'tous', etiquettes: ['sport'] },
    {
      cle: 'chaussures-habillees',
      regle: 'fixe',
      valeur: 1,
      parPersonne: true,
      pourQui: 'adultes',
      etiquettes: ['soirees', 'travail'],
    },
    { cle: 'chaussons', regle: 'fixe', valeur: 1, parPersonne: true, pourQui: 'tous' },
  ],
};
