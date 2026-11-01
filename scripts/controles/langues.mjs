// docs/TRADUIRE.md : un fichier de langue (src/i18n/<code>.json) peut être partiel, le français comble les
// trous, mais jamais de faute qui se voie à l'écran : clé inventée, {valeur} oubliée ou changée, forme de
// pluriel manquante pour la langue, texte vide, bibliothèque de départ à moitié traduite.
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';

const estTexte = valeur => typeof valeur === 'string';
const estBranche = valeur => valeur !== null && typeof valeur === 'object';
// Un texte au pluriel : un objet de formes (« one », « other »…), « other » toujours présent.
const estPluriel = valeur => estBranche(valeur) && estTexte(valeur.other);
const valeursDe = texte => new Set([...texte.matchAll(/\{(\w+)\}/g)].map(m => m[1]));
const reunion = textes => new Set(textes.flatMap(t => [...valeursDe(t)]));
const accolades = ensemble =>
  [...ensemble]
    .sort()
    .map(v => `{${v}}`)
    .join(' ') || 'aucune';

function controlerTexte(reference, texte, chemin, fautes) {
  if (texte.trim() === '') return fautes.push(`${chemin} : texte vide`);
  const attendues = [...valeursDe(reference)].sort().join();
  if ([...valeursDe(texte)].sort().join() !== attendues)
    fautes.push(`${chemin} : valeurs ${accolades(valeursDe(texte))} au lieu de ${accolades(valeursDe(reference))}`);
}

// Les formes que l'appli peut afficher : « other » (repli de pluriel()) et celles que la langue donne aux
// entiers de 0 à 999, les seuls nombres que l'appli compte. Pas resolvedOptions().pluralCategories : il
// compte des formes réservées aux très grands nombres (« many » en es, fr, it, pt : millions) qu'aucun
// texte ne montrera jamais.
const formesAffichables = langue => {
  const regles = new Intl.PluralRules(langue);
  return new Set(['other', ...Array.from({ length: 1000 }, (_, n) => regles.select(n))]);
};

function controlerPluriel(reference, trad, chemin, langue, fautes) {
  const formes = Object.entries(trad);
  if (!formes.every(([, texte]) => estTexte(texte) && texte.trim() !== ''))
    return fautes.push(`${chemin} : une forme de pluriel est vide ou n’est pas un texte`);
  const categories = formesAffichables(langue);
  const absentes = [...categories].filter(forme => !(forme in trad));
  if (absentes.length)
    fautes.push(`${chemin} : forme(s) de pluriel manquante(s) en « ${langue} » : ${absentes.join(', ')}`);
  // « un » peut s'écrire sans {n} (« 1 étiquette ») : on juge l'ensemble des formes, et chacune ne
  // doit employer que des valeurs que le français emploie.
  const permises = reunion(Object.values(reference));
  const employees = reunion(Object.values(trad));
  const inconnues = [...employees].filter(v => !permises.has(v));
  const oubliees = [...permises].filter(v => !employees.has(v));
  if (inconnues.length || oubliees.length)
    fautes.push(`${chemin} : valeurs ${accolades(employees)} au lieu de ${accolades(permises)}`);
}

function parcourir(reference, trad, chemin, langue, fautes) {
  if (reference === undefined) return fautes.push(`${chemin} : clé absente du français`);
  if (estPluriel(reference)) {
    if (!estBranche(trad)) return fautes.push(`${chemin} : des formes de pluriel étaient attendues`);
    return controlerPluriel(reference, trad, chemin, langue, fautes);
  }
  if (estTexte(reference)) {
    if (!estTexte(trad)) return fautes.push(`${chemin} : un texte était attendu`);
    return controlerTexte(reference, trad, chemin, fautes);
  }
  if (!estBranche(trad) || estPluriel(trad)) return fautes.push(`${chemin} : une branche de textes était attendue`);
  for (const [cle, valeur] of Object.entries(trad))
    parcourir(reference[cle], valeur, `${chemin}.${cle}`, langue, fautes);
}

const feuilles = (branche, chemin = []) =>
  Object.entries(branche).flatMap(([cle, valeur]) =>
    estBranche(valeur) && !estPluriel(valeur) ? feuilles(valeur, [...chemin, cle]) : [[...chemin, cle]],
  );
const lireChemin = (branche, chemin) => chemin.reduce((b, cle) => b?.[cle], branche);

// Les fautes lisibles d'une traduction (vide si tout va bien). La bibliothèque de départ est tout ou rien :
// absente, l'appareil installe le français ; présente, chaque nom et chaque note doivent y être.
export function verifierLangue(reference, traduction, langue) {
  const fautes = [];
  parcourir(reference, traduction, langue, langue, fautes);
  if (traduction.depart !== undefined) {
    const manquants = feuilles(reference.depart).filter(chemin => {
      const texte = lireChemin(traduction.depart, chemin);
      return !estTexte(texte) || texte.trim() === '';
    });
    if (manquants.length)
      fautes.push(
        `${langue}.depart : bibliothèque à moitié traduite, ${manquants.length} texte(s) manquant(s) (par exemple depart.${manquants[0].join('.')}) : à traduire en entier ou à retirer`,
      );
  }
  return fautes;
}

// Tous les fichiers de langue de src/i18n, le français excepté (c'est la référence).
export async function verifierLangues(racine) {
  const dossier = join(racine, 'src', 'i18n');
  const lire = async nom => JSON.parse(await readFile(join(dossier, nom), 'utf8'));
  const reference = await lire('fr.json');
  const fautes = [];
  for (const nom of (await readdir(dossier)).filter(n => n.endsWith('.json') && n !== 'fr.json').sort()) {
    const langue = nom.replace(/\.json$/, '');
    fautes.push(...verifierLangue(reference, await lire(nom), langue).map(f => `src/i18n/${nom} : ${f}`));
  }
  return fautes;
}
