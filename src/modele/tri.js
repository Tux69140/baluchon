// Le tri des noms, défini ici une seule fois : sans égard aux accents ni à la casse, les nombres
// comptés comme tels (« Objet 2 » avant « Objet 10 »), selon la langue de l'appli. La langue se pose
// une fois au démarrage (main.js) pour que les fonctions du modèle n'aient pas à la recevoir ; tant
// qu'elle n'est pas posée, le tri est celui du français.
const collateur = langue => new Intl.Collator(langue, { sensitivity: 'base', numeric: true });

let tri = collateur('fr');

export function poserLangueDuTri(langue) {
  tri = collateur(langue);
}

export const comparerNoms = (a, b) => tri.compare(a, b);
