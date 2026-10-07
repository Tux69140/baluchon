// Lecture grossière d'un fichier JavaScript : ses chaînes et gabarits (`…${x}…`), et le code
// débarrassé des commentaires et du contenu des chaînes. Assez pour les contrôles (textes écrits
// en dur, accès interdits) sans dépendre d'un analyseur complet ; les positions sont conservées
// à l'identique pour donner le bon numéro de ligne.

// Après ces caractères, une barre oblique ouvre une expression régulière, pas une division.
const AVANT_REGEX = /[(,=:[!&|?{};+\-*%<>~^]/;

export function lireCode(source) {
  const litteraux = [];
  const code = source.split('');
  const blanchir = (debut, fin) => {
    for (let k = debut; k < fin; k++) if (code[k] !== '\n') code[k] = ' ';
  };

  function finDeChaine(j) {
    const guillemet = source[j];
    let k = j + 1;
    while (k < source.length && source[k] !== guillemet && source[k] !== '\n') k += source[k] === '\\' ? 2 : 1;
    return k + 1;
  }

  function finDeRegex(j) {
    let k = j + 1;
    let classe = false;
    while (k < source.length && source[k] !== '\n') {
      if (source[k] === '\\') k += 1;
      else if (source[k] === '[') classe = true;
      else if (source[k] === ']') classe = false;
      else if (source[k] === '/' && !classe) break;
      k += 1;
    }
    k += 1;
    while (/[a-z]/i.test(source[k] ?? '')) k += 1;
    return k;
  }

  // Un gabarit : son texte garde sa longueur, chaque `${…}` y devient une suite de « \0 ».
  function finDeGabarit(j) {
    let k = j + 1;
    let texte = '';
    while (k < source.length && source[k] !== '`') {
      if (source[k] === '\\') {
        texte += source.slice(k, k + 2);
        k += 2;
      } else if (source[k] === '$' && source[k + 1] === '{') {
        const fermante = parcourirCode(k + 2, true);
        texte += '\0'.repeat(fermante + 1 - k);
        k = fermante + 1;
      } else {
        texte += source[k];
        k += 1;
      }
    }
    litteraux.push({ texte, debut: j + 1 });
    return k + 1;
  }

  // Parcourt du code ; dans une interpolation, s'arrête sur l'accolade qui la ferme.
  function parcourirCode(j, interpolation) {
    let profondeur = 0;
    let precedent = '(';
    while (j < source.length) {
      const c = source[j];
      if (c === '/' && source[j + 1] === '/') {
        const fin = source.indexOf('\n', j);
        blanchir(j, fin < 0 ? source.length : fin);
        j = fin < 0 ? source.length : fin;
      } else if (c === '/' && source[j + 1] === '*') {
        const fin = source.indexOf('*/', j + 2);
        blanchir(j, fin < 0 ? source.length : fin + 2);
        j = fin < 0 ? source.length : fin + 2;
      } else if (c === "'" || c === '"') {
        const fin = finDeChaine(j);
        litteraux.push({ texte: source.slice(j + 1, fin - 1), debut: j + 1 });
        blanchir(j + 1, fin - 1);
        j = fin;
        precedent = c;
      } else if (c === '`') {
        const fin = finDeGabarit(j);
        blanchir(j + 1, fin - 1);
        j = fin;
        precedent = c;
      } else if (c === '/' && AVANT_REGEX.test(precedent)) {
        j = finDeRegex(j);
        precedent = 'x';
      } else {
        if (c === '{') profondeur += 1;
        if (c === '}') {
          if (interpolation && profondeur === 0) return j;
          profondeur -= 1;
        }
        if (!/\s/.test(c)) precedent = c;
        j += 1;
      }
    }
    return j;
  }

  parcourirCode(0, false);
  return { litteraux, code: code.join('') };
}
