// Mise en forme des dates et des nombres pour l'écran, dans la langue de l'appli : les noms des jours
// et des mois viennent du navigateur (Intl), il n'y a donc rien à traduire de notre côté.
import { remplir } from '../i18n/traduction.js';
import { GROUPES_COMPOSITION, totalVoyageurs } from '../modele/composition.js';

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

// « 1 voyageur », « 2 voyageurs » : la forme que la langue donne à ce nombre (`zero`, `one`, `two`,
// `few`, `many`, `other`), lue sous la clé du fichier de traduction ; `other` si cette forme manque.
export function pluriel(t, cle, n, langue) {
  const forme = new Intl.PluralRules(langue).select(n);
  let texte;
  try {
    texte = t(`${cle}.${forme}`);
  } catch (faute) {
    if (forme === 'other') throw faute;
    texte = t(`${cle}.other`);
  }
  return remplir(texte, { n });
}

// « 2 femmes, 1 enfant » : les groupes présents d'un voyage, les groupes vides omis.
export const detailComposition = (t, c, langue) =>
  GROUPES_COMPOSITION.filter(g => c[g] > 0)
    .map(g => pluriel(t, `voyages.compte.${g}`, c[g], langue))
    .join(', ');

// La ligne « du sam. 10 oct. au mar. 13 oct. 2026 · 3 voyageurs », commune à la carte du voyage et à
// son en-tête ; avec detail, la composition (« 2 femmes, 1 enfant ») remplace le total : en-tête et aperçu.
export const detailsVoyage = (t, voyage, langue, { detail = false } = {}) =>
  remplir(t('voyages.details'), {
    periode: formaterPeriode(t, voyage.depart, voyage.retour, langue),
    voyageurs: detail
      ? detailComposition(t, voyage, langue)
      : pluriel(t, 'voyages.voyageurs', totalVoyageurs(voyage), langue),
  });

const BASES_REGLE = { fixe: 'fixe', par_jour: 'parJour', par_nuit: 'parNuit', par_semaine: 'parSemaine' };

// La règle de quantité d'un objet, dite en toutes lettres sur la fiche et dans les listes : « 1 par
// enfant », « 2 par jour, au plus 7, par personne », « 1 par semaine et par personne », « 5 par
// semaine, partagé », « 4, partagé entre les adultes ». bref : « 2 / jour / enfant », « 5 / semaine »,
// pour tenir sur une ligne (la formule d'origine d'une quantité fixée manuellement) ; elle ne dit pas
// « partagé ».
export function decrireRegle(t, objet, { bref = false } = {}) {
  const { regle, valeur, plafond, parPersonne, pourQui } = objet;
  const famille = bref ? 'regleBreve' : 'regle';
  const unite = parPersonne ? t(`regle.unite.${pourQui}`) : '';
  const enUnite = (cle, base) => remplir(t(`${famille}.${cle}`), { regle: base, unite, valeur, plafond });
  const base = enUnite(bref && regle === 'fixe' && parPersonne ? 'fixeParUnite' : BASES_REGLE[regle]);
  if (bref) {
    const avecUnite = parPersonne && regle !== 'fixe' ? enUnite('parUnite', base) : base;
    return plafond === null ? avecUnite : enUnite(parPersonne ? 'plafondParUnite' : 'plafond', avecUnite);
  }
  const avecPlafond = plafond === null ? base : enUnite('plafond', base);
  if (!parPersonne)
    return remplir(t('regle.avecPartage'), { regle: avecPlafond, partage: t(`regle.partage.${pourQui}`) });
  if (regle === 'fixe') return enUnite('parUnite', avecPlafond);
  return enUnite(plafond === null ? 'etParUnite' : 'plafondParUnite', avecPlafond);
}

// « 31 octobre 2026, 18 h 40 » : un instant (ISO) à l'heure de l'appareil, en toutes lettres. Sert à la
// date de la dernière sauvegarde et à la confirmation de restauration.
export function formaterInstant(t, iso, langue) {
  const instant = new Date(iso);
  const date = new Intl.DateTimeFormat(langue, { day: 'numeric', month: 'long', year: 'numeric' }).format(instant);
  const heure = remplir(t('dates.heure'), {
    h: instant.getHours(),
    min: String(instant.getMinutes()).padStart(2, '0'),
  });
  return remplir(t('dates.dateHeure'), { date, heure });
}
