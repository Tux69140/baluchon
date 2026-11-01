// Structure de la bibliothèque de départ : aucune phrase ici, seulement des clés. Les mots de chaque
// langue vivent dans la branche « depart » de son dictionnaire (src/i18n/fr.json pour le français).

export const sportsDHiver = {
  cle: 'sports-d-hiver',
  icone: 'person-simple-ski',
  couleur: 'ciel',
  etiquettes: ['sports-hiver'],
  objets: [
    { cle: 'pantalon-de-ski', regle: 'fixe', valeur: 1, parPersonne: true, pourQui: 'tous' },
    { cle: 'veste-de-ski', regle: 'fixe', valeur: 1, parPersonne: true, pourQui: 'tous' },
    { cle: 'masque-de-ski', regle: 'fixe', valeur: 1, parPersonne: true, pourQui: 'tous' },
    { cle: 'casque', regle: 'fixe', valeur: 1, parPersonne: true, pourQui: 'tous' },
    { cle: 'chaussettes-de-ski', regle: 'par_jour', valeur: 1, plafond: 3, parPersonne: true, pourQui: 'tous' },
    { cle: 'chaufferettes', regle: 'fixe', valeur: 2, parPersonne: true, pourQui: 'tous' },
    { cle: 'apres-ski', regle: 'fixe', valeur: 1, parPersonne: true, pourQui: 'tous' },
  ],
};
