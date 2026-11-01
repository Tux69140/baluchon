// Le thème choisi (Appareil, Clair, Sombre), appliqué dès le lancement et à chaque changement de choix
// (l'écran Réglages rappelle appliquerTheme). « Appareil » ne pose rien : les jetons suivent alors
// l'appareil (color-scheme) ; « Clair » et « Sombre » posent data-theme sur la racine
// (src/styles/jetons.css). Les barres système d'Android prennent la couleur du thème réellement affiché ;
// tant que le choix est « Appareil », la page suit l'appareil en direct et les barres avec elle.
const REQUETE = '(prefers-color-scheme: dark)';

// Un seul suivi de l'appareil, même si appliquerTheme est rappelé : il relit le stockage le plus récent.
let suivi = null;

// La règle « choix -> attribut » : seule définition. Appelée dès le début du démarrage (src/main.js), avant
// tout await, pour que la page ne s'affiche jamais un instant dans le thème de l'appareil.
export function poserTheme(choix) {
  if (choix === 'appareil') delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = choix === 'sombre' ? 'dark' : 'light';
}

function appliquer(stockage, appareil) {
  const choix = stockage.lireTheme();
  poserTheme(choix);
  stockage.reglerBarres(choix === 'appareil' ? appareil.matches : choix === 'sombre');
}

export function appliquerTheme(stockage) {
  const appareil = window.matchMedia(REQUETE);
  if (!suivi) {
    suivi = { stockage, appareil };
    appareil.addEventListener('change', () => {
      // Forcé en Clair ou Sombre, l'appareil ne change rien : barres et page restent comme elles sont.
      if (suivi.stockage.lireTheme() === 'appareil') appliquer(suivi.stockage, suivi.appareil);
    });
  } else suivi.stockage = stockage;
  appliquer(stockage, appareil);
}
