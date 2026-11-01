// Structure de la bibliothèque de départ : aucune phrase ici, seulement des clés. Les mots de chaque
// langue vivent dans la branche « depart » de son dictionnaire (src/i18n/fr.json pour le français).

export const confortEnRoute = {
  cle: 'confort-en-route',
  icone: 'airplane',
  couleur: 'ciel',
  objets: [
    {
      cle: 'oreiller-de-voyage',
      regle: 'fixe',
      valeur: 1,
      parPersonne: true,
      pourQui: 'tous',
      etiquettes: ['avion', 'train', 'voiture'],
    },
    { cle: 'masque-de-nuit', regle: 'fixe', valeur: 1, parPersonne: true, pourQui: 'adultes' },
    { cle: 'bouchons-d-oreilles', regle: 'fixe', valeur: 1, parPersonne: true, pourQui: 'adultes' },
    {
      cle: 'siege-auto',
      regle: 'fixe',
      valeur: 1,
      parPersonne: true,
      pourQui: 'enfants',
      etiquettes: ['voiture'],
      note: true,
    },
    {
      cle: 'jeux-pour-la-route',
      regle: 'fixe',
      valeur: 1,
      parPersonne: false,
      pourQui: 'enfants',
      etiquettes: ['voiture', 'train', 'avion'],
    },
  ],
};
