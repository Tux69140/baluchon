// Structure de la bibliothèque de départ : aucune phrase ici, seulement des clés. Les mots de chaque
// langue vivent dans la branche « depart » de son dictionnaire (src/i18n/fr.json pour le français).

export const plageCategorie = {
  cle: 'plage-categorie',
  icone: 'waves',
  couleur: 'lagon',
  etiquettes: ['plage'],
  objets: [
    { cle: 'serviette-de-plage', regle: 'fixe', valeur: 1, parPersonne: true, pourQui: 'tous' },
    { cle: 'sac-de-plage', regle: 'fixe', valeur: 1, parPersonne: false, pourQui: 'tous' },
    { cle: 'parasol', regle: 'fixe', valeur: 1, parPersonne: false, pourQui: 'tous', etiquettes: ['voiture'] },
    { cle: 'masque-et-tuba', regle: 'fixe', valeur: 1, parPersonne: true, pourQui: 'tous' },
    { cle: 'jeux-de-plage', regle: 'fixe', valeur: 1, parPersonne: false, pourQui: 'tous' },
  ],
};
