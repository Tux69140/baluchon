// Dates de calendrier locales, sans heure (« AAAA-MM-JJ », docs/PLAN.md « Dates »). Les calculs se
// font en UTC : une date de calendrier n'a pas de fuseau, et un passage à l'heure d'été ne doit
// jamais décaler un jour.
const FORMAT = /^(\d{4})-(\d{2})-(\d{2})$/;
const MS_PAR_JOUR = 86_400_000;

const deux = n => String(n).padStart(2, '0');
const versTexte = (annee, mois, jour) => `${annee}-${deux(mois)}-${deux(jour)}`;
const depuisUtc = ms => new Date(ms).toISOString().slice(0, 10);
const joursDansLeMois = (annee, mois) => new Date(Date.UTC(annee, mois, 0)).getUTCDate();

function versUtc(date) {
  const [, annee, mois, jour] = FORMAT.exec(date);
  return Date.UTC(Number(annee), Number(mois) - 1, Number(jour));
}

// Une vraie date du calendrier : le 30 février ou le 13e mois sont refusés.
export function estDate(texte) {
  return typeof texte === 'string' && FORMAT.test(texte) && depuisUtc(versUtc(texte)) === texte;
}

export const ajouterJours = (date, n) => depuisUtc(versUtc(date) + n * MS_PAR_JOUR);

export const ecartEnJours = (de, a) => Math.round((versUtc(a) - versUtc(de)) / MS_PAR_JOUR);

// La date du jour sur l'horloge de l'appareil, en heure locale : à 23 h 30 le 12, on est le 12.
export const dateDuJour = maintenant =>
  versTexte(maintenant.getFullYear(), maintenant.getMonth() + 1, maintenant.getDate());

export const moisDe = date => ({ annee: Number(date.slice(0, 4)), mois: Number(date.slice(5, 7)) });

export function moisVoisin({ annee, mois }, decalage) {
  const indice = annee * 12 + (mois - 1) + decalage;
  return { annee: Math.floor(indice / 12), mois: (indice % 12) + 1 };
}

// Le même jour n mois plus tard, ramené au dernier jour du mois s'il n'existe pas (31 janvier → 28 février).
export function ajouterMois(date, n) {
  const { annee, mois } = moisVoisin(moisDe(date), n);
  return versTexte(annee, mois, Math.min(Number(date.slice(8)), joursDansLeMois(annee, mois)));
}

// Un mois découpé en semaines du lundi au dimanche ; null pour les cases hors du mois.
export function moisEnSemaines({ annee, mois }) {
  const decalage = (new Date(Date.UTC(annee, mois - 1, 1)).getUTCDay() + 6) % 7;
  const cases = [
    ...Array(decalage).fill(null),
    ...Array.from({ length: joursDansLeMois(annee, mois) }, (_, i) => versTexte(annee, mois, i + 1)),
  ];
  while (cases.length % 7) cases.push(null);
  return Array.from({ length: cases.length / 7 }, (_, i) => cases.slice(i * 7, i * 7 + 7));
}
