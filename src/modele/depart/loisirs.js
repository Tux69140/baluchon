// Structure de la bibliothèque de départ : aucune phrase ici, seulement des clés. Les mots de chaque
// langue vivent dans la branche « depart » de son dictionnaire (src/i18n/fr.json pour le français).

export const loisirs = {
  cle: 'loisirs',
  icone: 'book-open',
  couleur: 'tournesol',
  objets: [
    { cle: 'livre-ou-liseuse', regle: 'fixe', valeur: 1, parPersonne: true, pourQui: 'tous' },
    { cle: 'carnet-et-stylo', regle: 'fixe', valeur: 1, parPersonne: false, pourQui: 'tous', note: true },
    { cle: 'guide-de-voyage', regle: 'fixe', valeur: 1, parPersonne: false, pourQui: 'tous' },
    { cle: 'jeu-de-cartes', regle: 'fixe', valeur: 1, parPersonne: false, pourQui: 'tous' },
    {
      cle: 'cadeau-pour-vos-hotes',
      regle: 'fixe',
      valeur: 1,
      parPersonne: false,
      pourQui: 'tous',
      etiquettes: ['chez-l-habitant'],
      note: true,
    },
    { cle: 'doudou', regle: 'fixe', valeur: 1, parPersonne: true, pourQui: 'enfants', note: true },
    { cle: 'veilleuse', regle: 'fixe', valeur: 1, parPersonne: false, pourQui: 'enfants' },
  ],
};
