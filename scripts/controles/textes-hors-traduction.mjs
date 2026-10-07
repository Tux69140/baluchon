// AGENTS.md : « Textes d'interface dans les fichiers de traduction, jamais écrits en dur dans le
// code. » On cherche ce qui finit à l'écran : texte entre balises, libellés accessibles, textes
// posés par le code, contenu CSS, et la page d'accueil. Chaque t('clé') doit aussi exister en
// français, la langue de référence.
import { creerTraducteur } from '../../src/i18n/traduction.js';
import { listerFichiers, lireTexte, ligneDe } from './fichiers.mjs';
import { lireCode } from './litteraux.mjs';

// La moindre lettre est un texte à traduire ; un symbole (« × », « + », « → ») n'en est pas un.
const MOT = /\p{L}/u;
const ATTRIBUT = /\b(aria-label|title|placeholder|alt)\s*=\s*"([^"]*)"/g;
const ENTRE_BALISES = />([^<>]*)</g;
const AFFECTATION = /\.(textContent|innerText|title|placeholder|ariaLabel)\s*=\s*['"`]/g;
const CLE = /\bt\(\s*(['"])([^'"]+)\1\s*\)/g;
const CONTENU_CSS = /content\s*:\s*(['"])([^'"]*)\1/g;

// Retire les interpolations (« \0 ») et les entités HTML (&nbsp;) avant de chercher un mot.
const porteUnMot = texte => MOT.test(texte.replace(/\0+/g, ' ').replace(/&#?\w+;/g, ' '));

function textesDansLitteral({ texte, debut }, signaler) {
  for (const motif of [ENTRE_BALISES, ATTRIBUT]) {
    for (const trouve of texte.matchAll(motif)) {
      const contenu = trouve[2] ?? trouve[1];
      if (porteUnMot(contenu)) signaler(debut + trouve.index, contenu.trim());
    }
  }
}

async function verifierJs(racine, chemin, t, fautes) {
  const source = await lireTexte(racine, chemin);
  const signaler = (position, texte) =>
    fautes.push(`${chemin}:${ligneDe(source, position)} — texte écrit en dur : « ${texte} »`);
  const { litteraux, code } = lireCode(source);
  for (const litteral of litteraux) textesDansLitteral(litteral, signaler);
  for (const trouve of code.matchAll(AFFECTATION)) {
    const litteral = litteraux.find(l => l.debut === trouve.index + trouve[0].length);
    if (litteral && porteUnMot(litteral.texte)) signaler(trouve.index, litteral.texte);
  }
  for (const trouve of source.matchAll(CLE)) {
    try {
      t(trouve[2]);
    } catch {
      fautes.push(`${chemin}:${ligneDe(source, trouve.index)} — clé absente de src/i18n/fr.json : ${trouve[2]}`);
    }
  }
}

async function verifierHtml(racine, chemin, fautes) {
  const source = await lireTexte(racine, chemin);
  // Scripts, styles et commentaires gardent leur longueur, blanchis, pour garder les numéros de ligne.
  const blanc = bloc => bloc.replace(/[^\n]/g, ' ');
  const corps = source.replace(/<(script|style)\b[\s\S]*?<\/\1>|<!--[\s\S]*?-->/g, blanc);
  for (const motif of [ENTRE_BALISES, ATTRIBUT]) {
    for (const trouve of corps.matchAll(motif)) {
      const contenu = trouve[2] ?? trouve[1];
      if (porteUnMot(contenu))
        fautes.push(`${chemin}:${ligneDe(source, trouve.index)} — texte écrit en dur : « ${contenu.trim()} »`);
    }
  }
}

async function verifierCss(racine, chemin, fautes) {
  const source = await lireTexte(racine, chemin);
  for (const trouve of source.matchAll(CONTENU_CSS)) {
    if (porteUnMot(trouve[2]))
      fautes.push(`${chemin}:${ligneDe(source, trouve.index)} — texte écrit en dur : « ${trouve[2]} »`);
  }
}

export async function verifierTextes(racine) {
  const fautes = [];
  const t = creerTraducteur({ fr: JSON.parse(await lireTexte(racine, 'src/i18n/fr.json')) }, 'fr');
  for (const chemin of await listerFichiers(racine, ['src'], ['.js'])) {
    if (!chemin.startsWith('src/i18n/')) await verifierJs(racine, chemin, t, fautes);
  }
  for (const chemin of await listerFichiers(racine, ['index.html', 'src'], ['.html']))
    await verifierHtml(racine, chemin, fautes);
  for (const chemin of await listerFichiers(racine, ['src'], ['.css'])) await verifierCss(racine, chemin, fautes);
  return fautes;
}
