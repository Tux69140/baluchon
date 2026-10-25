// La touche retour d'Android, prise en charge par la page (essai sur la tablette du 2026-10-25) :
// laissée à la WebView, elle sautait les étapes d'historique posées sans geste de la personne (la
// garde de l'assistant, une question ouverte par le retour) et fermait l'appli en plein assistant.
// La page recule donc elle-même (history.back(), qui ne saute rien) tant que l'appli a une étape
// derrière elle, d'après l'état qu'elle tient : sa profondeur (src/main.js, 0 à l'accueil) et le
// niveau ouvert par-dessus (src/ecrans/fenetre.js). Pas d'après « canGoBack » de la WebView, qui
// saute justement ces étapes. À l'accueil, rien d'ouvert, la touche quitte l'appli
// (mise en arrière-plan, src/stockage/tauri.js).
export const retourDansLAppli = etat => (etat?.profondeur ?? 0) > 0 || (etat?.niveau ?? 0) > 0;
