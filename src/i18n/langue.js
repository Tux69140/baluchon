// La langue de l'appli : la première que l'appareil préfère et dont on a un dictionnaire, en
// cherchant d'abord la forme exacte (« pt-BR »), puis sa langue de base (« pt ») ; le français sinon.
// Pur, pour se tester sous node : la liste des dictionnaires disponibles vient de dictionnaires.js.

const LANGUE_PAR_DEFAUT = 'fr';

export function choisirLangue(preferees, disponibles) {
  for (const preferee of preferees) {
    if (disponibles.includes(preferee)) return preferee;
    const base = preferee.split('-')[0];
    if (disponibles.includes(base)) return base;
  }
  return LANGUE_PAR_DEFAUT;
}
