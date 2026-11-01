// Structure de la bibliothèque de départ : aucune phrase ici, seulement des clés. Les mots de chaque
// langue vivent dans la branche « depart » de son dictionnaire (src/i18n/fr.json pour le français).

export const pharmacie = {
  cle: 'pharmacie',
  icone: 'first-aid-kit',
  couleur: 'framboise',
  objets: [
    { cle: 'trousse-de-secours', regle: 'fixe', valeur: 1, parPersonne: false, pourQui: 'tous', note: true },
    { cle: 'medicaments-habituels', regle: 'fixe', valeur: 1, parPersonne: true, pourQui: 'tous', note: true },
    { cle: 'comprimes-antidouleur', regle: 'fixe', valeur: 4, parPersonne: false, pourQui: 'adultes' },
    {
      cle: 'comprimes-antidouleur-pour-enfant',
      regle: 'fixe',
      valeur: 4,
      parPersonne: false,
      pourQui: 'enfants',
      note: true,
    },
    { cle: 'thermometre', regle: 'fixe', valeur: 1, parPersonne: false, pourQui: 'enfants' },
    { cle: 'preservatifs', regle: 'par_semaine', valeur: 5, parPersonne: false, pourQui: 'adultes' },
    { cle: 'anti-moustiques', regle: 'fixe', valeur: 1, parPersonne: false, pourQui: 'tous' },
    { cle: 'pince-a-tiques', regle: 'fixe', valeur: 1, parPersonne: false, pourQui: 'tous', note: true },
    {
      cle: 'comprimes-contre-le-mal-des-transports',
      regle: 'fixe',
      valeur: 2,
      parPersonne: true,
      pourQui: 'tous',
      note: true,
    },
    {
      cle: 'sels-de-rehydratation',
      regle: 'fixe',
      valeur: 1,
      parPersonne: false,
      pourQui: 'tous',
      etiquettes: ['randonnee', 'itinerance', 'sports-hiver', 'sport', 'chaud', 'etranger'],
    },
    {
      cle: 'comprimes-de-charbon-contre-les-maux-de-ventre',
      regle: 'fixe',
      valeur: 2,
      parPersonne: false,
      pourQui: 'tous',
      etiquettes: ['etranger'],
    },
    { cle: 'gel-hydroalcoolique', regle: 'fixe', valeur: 1, parPersonne: false, pourQui: 'tous' },
  ],
};
