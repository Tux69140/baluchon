// Structure de la bibliothèque de départ : aucune phrase ici, seulement des clés. Les mots de chaque
// langue vivent dans la branche « depart » de son dictionnaire (src/i18n/fr.json pour le français).

export const electronique = {
  cle: 'electronique',
  icone: 'device-mobile',
  couleur: 'lilas',
  objets: [
    { cle: 'telephone', regle: 'fixe', valeur: 1, parPersonne: true, pourQui: 'adultes' },
    { cle: 'chargeurs-et-cables', regle: 'fixe', valeur: 1, parPersonne: false, pourQui: 'tous' },
    { cle: 'batterie-externe', regle: 'fixe', valeur: 1, parPersonne: true, pourQui: 'adultes', note: true },
    { cle: 'ecouteurs', regle: 'fixe', valeur: 1, parPersonne: true, pourQui: 'tous' },
    {
      cle: 'adaptateur-de-prise',
      regle: 'fixe',
      valeur: 1,
      parPersonne: false,
      pourQui: 'tous',
      etiquettes: ['etranger'],
      note: true,
    },
    { cle: 'multiprise', regle: 'fixe', valeur: 1, parPersonne: false, pourQui: 'tous', note: true },
    {
      cle: 'ordinateur-portable-et-son-chargeur',
      regle: 'fixe',
      valeur: 1,
      parPersonne: true,
      pourQui: 'adultes',
      etiquettes: ['travail', 'photo'],
    },
  ],
};
