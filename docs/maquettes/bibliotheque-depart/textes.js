// Tous les textes nouveaux de la maquette de la phase 13, en un seul endroit (dans l'appli, ils iront dans
// src/i18n/fr.json). Espaces insécables ( ) avant « : ; ? ! », dans les guillemets « », entre un nombre
// et le mot qu'il compte (« 2 femmes »).
const NB = ' ';
const accord = (n, un, plusieurs) => `${n}${NB}${n > 1 ? plusieurs : un}`;

export const TEXTES = {
  compte: {
    femmes: n => accord(n, 'femme', 'femmes'),
    hommes: n => accord(n, 'homme', 'hommes'),
    enfants: n => accord(n, 'enfant', 'enfants'),
  },
  // Nouveau voyage, étape Informations : les trois compteurs à la place de « Voyageurs ».
  composition: {
    legende: 'Voyageurs',
    total: n => `${n}${NB}en tout`,
    groupes: { femmes: 'Femmes', hommes: 'Hommes', enfants: 'Enfants' },
    moins: { femmes: 'Une femme de moins', hommes: 'Un homme de moins', enfants: 'Un enfant de moins' },
    plus: { femmes: 'Une femme de plus', hommes: 'Un homme de plus', enfants: 'Un enfant de plus' },
    aucun: 'Ajoutez au moins une personne.',
    max: 'Un voyage compte au plus 20 voyageurs.',
  },
  // Les morceaux du résumé d'une règle (composition.js, resumeRegle).
  regle: {
    par_jour: 'par jour',
    par_nuit: 'par nuit',
    par_semaine: 'par semaine',
    auPlus: 'au plus',
    unite: { tous: 'personne', adultes: 'adulte', femmes: 'femme', hommes: 'homme', enfants: 'enfant' },
    partage: {
      tous: 'partagé',
      adultes: 'partagé entre les adultes',
      femmes: 'partagé entre les femmes',
      hommes: 'partagé entre les hommes',
      enfants: 'partagé entre les enfants',
    },
    // Ce qui fait entrer un objet à l'étape « Changements » : « nouveau · pour les enfants ».
    raison: { tous: 'tous', adultes: 'les adultes', femmes: 'les femmes', hommes: 'les hommes', enfants: 'les enfants' },
  },
  exemple: {
    phrase: ({ jours, nuits, composition, quantite }) => `Pour ${jours} et ${nuits}, avec ${composition}${NB}:${NB}${quantite}.`,
    semaines: n => ` (${n}${NB}semaines)`,
    composition: c => `${accord(c.femmes, 'femme', 'femmes')}, ${accord(c.hommes, 'homme', 'hommes')} et ${accord(c.enfants, 'enfant', 'enfants')}`,
    absent: {
      adultes: 'Sans adulte dans le voyage, il n’est pas proposé.',
      femmes: 'Sans femme dans le voyage, il n’est pas proposé.',
      hommes: 'Sans homme dans le voyage, il n’est pas proposé.',
      enfants: 'Sans enfant dans le voyage, il n’est pas proposé.',
    },
  },
  // La fiche d'un objet modèle : ce qui s'ajoute ou change.
  fiche: {
    parSemaine: 'Par semaine',
    chaqueSemaine: 'Chaque semaine',
    pourQui: 'Pour qui',
    groupes: { tous: 'Tous', adultes: 'Adultes', femmes: 'Femmes', hommes: 'Hommes', enfants: 'Enfants' },
    compter: 'Compté pour chacun, ou partagé',
    par: { tous: 'Par personne', adultes: 'Par adulte', femmes: 'Par femme', hommes: 'Par homme', enfants: 'Par enfant' },
    partage: 'Partagé',
    plafondPar: { tous: 'au plus, par personne', adultes: 'au plus, par adulte', femmes: 'au plus, par femme', hommes: 'au plus, par homme', enfants: 'au plus, par enfant' },
  },
  // « Modifier le voyage », étape « Changements » : la puce de ce qui a changé dans la composition.
  modif: {
    plus: { femmes: n => `${accord(n, 'femme', 'femmes')} de plus`, hommes: n => `${accord(n, 'homme', 'hommes')} de plus`, enfants: n => `${accord(n, 'enfant', 'enfants')} de plus` },
    moins: { femmes: n => `${accord(n, 'femme', 'femmes')} de moins`, hommes: n => `${accord(n, 'homme', 'hommes')} de moins`, enfants: n => `${accord(n, 'enfant', 'enfants')} de moins` },
  },
  aPropos: {
    menu: 'À propos',
    titre: 'À propos',
    nom: 'Baluchon',
    version: v => `Version ${v}`,
    slogan: 'Listes de bagages, libre et hors ligne.',
    liens: 'Sur le web',
    bref: 'Bon à savoir',
    decouvrir: { titre: 'Découvrir Baluchon', adresse: 'https://baluchon.biovibralyon.fr/', affiche: 'baluchon.biovibralyon.fr' },
    versions: { titre: 'Nouvelles versions', adresse: 'https://baluchon.biovibralyon.fr/telecharger', affiche: 'baluchon.biovibralyon.fr/telecharger' },
    navigateur: 'ouvre le navigateur',
    libre: {
      titre: 'Appli libre',
      texte: `Licence GNU GPL, version 3 ou ultérieure (GPL-3.0-or-later)${NB}: chacun peut l’utiliser, l’étudier, la partager et la modifier.`,
    },
    horsLigne: {
      titre: 'Hors ligne, sans traceur',
      texte: `Vos voyages et votre bibliothèque restent sur cet appareil${NB}: Baluchon n’envoie rien, à personne.`,
    },
    traduction: { titre: 'Traduction', texte: 'Texte original en français.' },
    credits: {
      titre: 'Crédits',
      lignes: [`Pictos${NB}: Phosphor Icons, licence MIT.`, `Polices${NB}: Baumans et Source Sans 3, licence SIL Open Font License (OFL).`],
    },
  },
  maquette: { titre: 'Maquette — phase 13' },
};
