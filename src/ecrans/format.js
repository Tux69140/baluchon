// Mise en forme des dates et des nombres pour l'écran, dans la langue de l'appli : les noms des jours
// et des mois viennent du navigateur (Intl), il n'y a donc rien à traduire de notre côté.
import { remplir } from '../i18n/traduction.js';

// Une date de calendrier se lit à midi UTC et se formate en UTC : aucun fuseau ne la décale.
const enDate = date => new Date(`${date}T12:00:00Z`);

export const formaterDate = (date, langue, options) =>
  new Intl.DateTimeFormat(langue, { ...options, timeZone: 'UTC' }).format(enDate(date));

// « sam. 10 oct. » : le jour court des périodes et du résumé des dates de l'assistant.
const JOUR_COURT = { weekday: 'short', day: 'numeric', month: 'short' };

export const formaterJourCourt = (date, langue) => formaterDate(date, langue, JOUR_COURT);

// « du sam. 10 oct. au mar. 13 oct. 2026 » (spec phase 2) : l'année n'est dite qu'une fois quand
// départ et retour la partagent, sinon aux deux dates.
export function formaterPeriode(t, depart, retour, langue) {
  const avecAnnee = { ...JOUR_COURT, year: 'numeric' };
  const memeAnnee = depart.slice(0, 4) === retour.slice(0, 4);
  return remplir(t('dates.periode'), {
    depart: memeAnnee ? formaterJourCourt(depart, langue) : formaterDate(depart, langue, avecAnnee),
    retour: formaterDate(retour, langue, avecAnnee),
  });
}

// « 1 voyageur », « 2 voyageurs » : clés `one` et `other` du fichier de traduction. Une langue aux
// pluriels plus fins (phase 13) ajoutera ses formes ici.
export function pluriel(t, cle, n, langue) {
  const forme = new Intl.PluralRules(langue).select(n) === 'one' ? 'one' : 'other';
  return remplir(t(`${cle}.${forme}`), { n });
}

// La ligne « du sam. 10 oct. au mar. 13 oct. 2026 · 2 voyageurs », commune à la carte du voyage et à
// son en-tête.
export const detailsVoyage = (t, voyage, langue) =>
  remplir(t('voyages.details'), {
    periode: formaterPeriode(t, voyage.depart, voyage.retour, langue),
    voyageurs: pluriel(t, 'voyages.voyageurs', voyage.voyageurs, langue),
  });
