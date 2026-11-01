// Structure de la bibliothèque de départ : aucune phrase ici, seulement des clés. Les mots de chaque
// langue vivent dans la branche « depart » de son dictionnaire (src/i18n/fr.json pour le français).

// Les groupes d’étiquettes, dans l’ordre des étapes de l’assistant.
export const GROUPES = [
  {
    cle: 'activites',
    etiquettes: [
      'randonnee',
      'itinerance',
      'plage',
      'ville',
      'sports-hiver',
      'sport',
      'festival',
      'soirees',
      'detente',
      'thalasso',
      'travail',
      'photo',
    ],
  },
  { cle: 'destination', etiquettes: ['chaud', 'froid', 'pluie', 'etranger'] },
  { cle: 'transport', etiquettes: ['avion', 'train', 'voiture'] },
  { cle: 'hebergement', etiquettes: ['hotel', 'location', 'chez-l-habitant', 'camping'] },
];
