// Tous les textes de la maquette de la phase 12, en un seul endroit (dans l'appli, ils iront dans
// src/i18n/fr.json). Espaces insécables ( ) avant « : ? ! », dans les guillemets « », entre un nombre
// et son unité (« 18 h 40 »).
const NB = ' ';

export const TEXTES = {
  theme: {
    titre: 'Thème',
    legende: 'Thème de l’appli',
    aide: `«${NB}Appareil${NB}» suit le réglage clair ou sombre de cet appareil. Le choix ne vaut que pour lui.`,
    choix: { appareil: 'Appareil', clair: 'Clair', sombre: 'Sombre' },
  },
  sauvegarde: {
    titre: 'Sauvegarde',
    aide: 'Toute la bibliothèque et tous les voyages, dans un fichier déposé dans Téléchargements.',
    sauvegarder: 'Sauvegarder',
    derniere: `Dernière sauvegarde${NB}:`,
    aucune: 'Aucune sauvegarde depuis cet appareil',
    restaurer: 'Restaurer une sauvegarde…',
    restaurerAide: `Tout ce qui est sur cet appareil sera remplacé. Une copie de l’état actuel est d’abord déposée dans Téléchargements.`,
    deposee: `Sauvegarde déposée dans Téléchargements${NB}:`,
  },
  confirmation: {
    titre: date => `Restaurer la sauvegarde du ${date}${NB}?`,
    contenu: (voyages, objets) =>
      `Elle contient <b>${voyages}${NB}voyages</b> et une bibliothèque de <b>${objets}${NB}objets</b>.`,
    remplacement: `Tout ce qui est sur cet appareil sera remplacé. Une copie de l’état actuel sera d’abord déposée dans Téléchargements.`,
    garder: 'Garder mes données',
    restaurer: 'Restaurer',
  },
  refus: {
    titre: 'Restauration impossible',
    abime: 'Ce fichier est abîmé ou incomplet.',
    format: 'Ce fichier n’est pas une sauvegarde de Baluchon.',
    version: 'Cette sauvegarde vient d’une version plus récente de Baluchon. Mettez l’appli à jour pour la restaurer.',
    rien: 'Rien n’a été modifié.',
  },
  autorisation: {
    titre: 'Accès aux fichiers refusé',
    texte: `Sans votre autorisation, Baluchon ne peut rien déposer dans Téléchargements${NB}: aucun fichier n’a été écrit.`,
    comment: `Touchez de nouveau «${NB}Sauvegarder${NB}» et acceptez la demande d’Android. Si elle ne s’affiche plus${NB}: Paramètres d’Android, Applications, Baluchon, Autorisations, puis Stockage.`,
  },
  panne: {
    titre: 'La restauration n’a pas abouti',
    texte: `Rien n’a été modifié${NB}: vos données sont telles qu’avant.`,
  },
  compris: 'Compris',
  restauree: date => `Sauvegarde du ${date} restaurée.`,
  // La sauvegarde « faite » de la maquette, et celle qu'on restaure.
  maintenant: { date: `31 octobre 2026, 18${NB}h${NB}40`, fichier: 'baluchon-2026-10-31-18h40.json' },
  fichier: { date: '12 octobre 2026, 21\u00a0h\u00a015', voyages: 4, objets: 312 },
  maquette: {
    titre: 'Maquette — phase 12',
    fichier: 'Fichier choisi par « Restaurer une sauvegarde… » (démonstration)',
    fichiers: {
      valide: 'Sauvegarde valide',
      abime: 'Fichier abîmé',
      format: 'Autre format',
      version: 'Version plus récente',
      panne: 'Panne pendant la restauration',
    },
    acces: 'Accès aux fichiers demandé par «\u00a0Sauvegarder\u00a0» (Android 7 à 9, démonstration)',
    accesChoix: { accorde: 'Accordé', refuse: 'Refusé' },
    autreTheme: theme => `Appareil en thème ${theme}`,
  },
};
