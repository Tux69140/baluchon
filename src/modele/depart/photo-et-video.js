// Structure de la bibliothèque de départ : aucune phrase ici, seulement des clés. Les mots de chaque
// langue vivent dans la branche « depart » de son dictionnaire (src/i18n/fr.json pour le français).

export const photoEtVideo = {
  cle: 'photo-et-video',
  icone: 'camera',
  couleur: 'framboise',
  etiquettes: ['photo'],
  objets: [
    { cle: 'appareil-photo', regle: 'fixe', valeur: 1, parPersonne: false, pourQui: 'tous' },
    { cle: 'chargeur-de-l-appareil', regle: 'fixe', valeur: 1, parPersonne: false, pourQui: 'tous' },
    { cle: 'batteries-de-rechange', regle: 'fixe', valeur: 1, parPersonne: false, pourQui: 'tous', note: true },
    { cle: 'cartes-memoire', regle: 'fixe', valeur: 1, parPersonne: false, pourQui: 'tous', note: true },
    { cle: 'disque-dur-externe', regle: 'fixe', valeur: 1, parPersonne: false, pourQui: 'tous', note: true },
    { cle: 'trepied-de-voyage', regle: 'fixe', valeur: 1, parPersonne: false, pourQui: 'tous' },
    { cle: 'micro-externe', regle: 'fixe', valeur: 1, parPersonne: false, pourQui: 'tous' },
  ],
};
