// Le thème choisi (Appareil, Clair, Sombre), appliqué dès le lancement et à chaque changement de choix
// (l'écran Réglages rappelle appliquerTheme). « Appareil » ne pose rien : les jetons suivent alors
// l'appareil (color-scheme) ; « Clair » et « Sombre » posent data-theme sur la racine
// (src/styles/jetons.css). Les barres système d'Android prennent la couleur du thème réellement affiché ;
// tant que le choix est « Appareil », la page suit l'appareil en direct et les barres avec elle.
const REQUETE = '(prefers-color-scheme: dark)';

// Un seul suivi de l'appareil, même si appliquerTheme est rappelé : il relit le stockage le plus récent.
let suivi = null;

function appliquer(stockage, appareil) {
  const racine = document.documentElement;
  const choix = stockage.lireTheme();
  let sombre;
  if (choix === 'appareil') {
    delete racine.dataset.theme;
    sombre = appareil.matches;
  } else {
    sombre = choix === 'sombre';
    racine.dataset.theme = sombre ? 'dark' : 'light';
  }
  stockage.reglerBarres(sombre);
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
