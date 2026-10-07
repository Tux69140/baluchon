// Les textes de l'interface vivent dans un fichier par langue (fr.json, en.json…), le français
// servant de référence : une clé absente d'une traduction se lit en français, pour qu'un
// contributeur puisse traduire petit à petit sans jamais laisser un trou à l'écran.

const LANGUE_DE_REFERENCE = 'fr';

function lire(dictionnaire, cle) {
  const valeur = cle.split('.').reduce((branche, morceau) => branche?.[morceau], dictionnaire);
  return typeof valeur === 'string' ? valeur : undefined;
}

export function creerTraducteur(dictionnaires, langue) {
  const choisi = dictionnaires[langue] ?? {};
  const reference = dictionnaires[LANGUE_DE_REFERENCE];
  return function t(cle) {
    const texte = lire(choisi, cle) ?? lire(reference, cle);
    // Une clé inconnue même en français est une faute de programmation : on la signale tout de
    // suite plutôt que d'afficher un texte vide ou la clé brute à l'utilisateur.
    if (texte === undefined) throw new Error(`Texte introuvable dans les traductions : ${cle}`);
    return texte;
  };
}
