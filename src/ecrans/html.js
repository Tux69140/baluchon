// Un texte venu des données (nom de voyage…) est échappé avant d'entrer dans le HTML : il
// s'affiche tel quel, sans jamais être pris pour une balise.
const ENTITES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

export const echapper = texte => String(texte).replace(/[&<>"']/g, c => ENTITES[c]);
