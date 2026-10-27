// Maquette validée par le chef de projet le 2026-10-27 : l'écran d'un voyage et la Bibliothèque sur
// tablette et ordinateur. Brouillon autonome : il imite les gestes sans toucher au code de l'appli.
// Règles (détail dans maquette.css) :
// - Téléphone inchangé : l'accordéon en une colonne vaut tant que le plus petit côté de l'écran est
//   sous 600 px (téléphones de 360 à 412 px, même couchés).
// - Dès que le plus petit côté atteint 600 px (toutes les tablettes, portrait compris, et
//   l'ordinateur ; le seuil de la fenêtre modale, docs/DESIGN.md) : le voyage (titre, dates,
//   étiquettes, carte « Dans le sac », « Reste à emballer »), les catégories, puis la liste des objets
//   de la catégorie choisie, en une seule colonne.
// - Dès 1340 px de large : trois colonnes, voyage 320 px | catégories 360 px | liste 800 px au plus,
//   centrées ; chaque colonne défile seule (un long menu ne pousse jamais la liste) ; la liste n'a pas
//   de titre visible, la catégorie choisie (fond actif, bord à l'encre, flèche) le dit.
// - Repli, de 600 à 1339 px : le voyage (320 px) et, à côté dès 720 px de large (dessous avant), les
//   catégories en tuiles compactes (grille qui passe à la ligne, 190 px au moins) ; juste dessous, la
//   liste sur toute la largeur, avec son titre. Toucher une tuile fait descendre jusqu'à la liste si
//   elle commence dans la moitié basse de l'écran (cas extrême).
// - Bibliothèque (?ecran=bibliotheque) : même mise en page ; crayon dans chaque carte de catégorie en
//   trois colonnes ; en repli, « Nouvelle catégorie » en dernière tuile et « Modifier » à côté du
//   titre de la liste.
// - Le bandeau « Annuler » (phase 7) garde sa place en bas à droite ; le bas de chaque colonne la lui
//   laisse.
// Paramètres : ?ecran=bibliotheque ; ?etat=en-cours | filtre | boucle | longue | beaucoup (11
// catégories) ; ?bandeau=texte montre le bandeau « Annuler » ; ?capture retire le menu de la maquette.
// Servir la racine du dépôt (`pnpm exec vite --port 8650`) et ouvrir `/docs/maquettes/grand-ecran/`.
import { categoriesDuVoyage, complet, estBouclee, ordreNaturel, voyage } from './donnees.js';
import { carte, choix, entete, infosVoyage, lienRetour, lignes, outils, progression, tuile } from './vues.js';

const params = new URLSearchParams(location.search);
const ETAT = params.get('etat') ?? 'en-cours';
const CAPTURE = params.has('capture');
const TABLETTE = matchMedia('(min-width: 600px) and (min-height: 600px)');
const REPLI = matchMedia('(min-width: 600px) and (max-width: 1339.98px) and (min-height: 600px)');
const reduit = matchMedia('(prefers-reduced-motion: reduce)');
const biblio = params.get('ecran') === 'bibliotheque' ? await import('./bibliotheque.js') : null;
let choisieBiblio = biblio?.premiere;

// ---------- État de l'écran ----------
const categories = categoriesDuVoyage(ETAT);
const tous = () => categories.flatMap(c => c.objets);
const ui = {
  filtre: ETAT === 'filtre',
  ordre: new Map(categories.map(c => [c.id, ordreNaturel(c)])),
  bouclees: new Set(categories.filter(estBouclee).map(c => c.id)),
  ouvertes: new Set(categories.filter(c => !estBouclee(c)).map(c => c.id)),
  masques: new Set(),
  choisie: null,
};
ui.choisie = (categories.find(c => !ui.bouclees.has(c.id)) ?? categories[0]).id;
const masquer = () =>
  (ui.masques = ui.filtre
    ? new Set(
        tous()
          .filter(complet)
          .map(x => x.id),
      )
    : new Set());
masquer();
const sacBoucle = () => categories.every(estBouclee);

// Sous le filtre, une catégorie bouclée descend en bas de la liste, atténuée (forme du 2026-10-24).
const boucleesEnBas = liste =>
  ui.filtre ? [...liste.filter(c => !ui.bouclees.has(c.id)), ...liste.filter(c => ui.bouclees.has(c.id))] : liste;

// ---------- Les deux dispositions ----------
// Téléphone : l'écran d'aujourd'hui, inchangé.
function vueTelephone() {
  return `
    <main class="ecran">${lienRetour()}${entete(voyage, { retour: false })}${progression(tous(), sacBoucle())}${outils(ui)}
      <div class="categories">${boucleesEnBas(categories)
        .map(c => carte(c, ui))
        .join('')}</div>
    </main>`;
}

// Tablette et ordinateur : le voyage, les catégories (cartes en trois colonnes, tuiles en repli), la
// liste. Le titre de la liste ne se voit qu'en repli.
function vueVoyage() {
  const c = categories.find(x => x.id === ui.choisie);
  const repli = REPLI.matches;
  const menu = repli
    ? `<ul class="ge-tuiles">${boucleesEnBas(categories)
        .map(x =>
          tuile(x, { choisie: ui.choisie, attenuee: ui.filtre && ui.bouclees.has(x.id), infos: infosVoyage(x, ui) }),
        )
        .join('')}</ul>`
    : `<ul class="choix-liste">${boucleesEnBas(categories)
        .map(x => choix(x, ui))
        .join('')}</ul>`;
  return `
    <main class="ge-ecran">
      ${lienRetour()}
      <div class="ge-voyage">${entete(voyage, { retour: false })}${progression(tous(), sacBoucle())}${outils(ui)}</div>
      <nav class="ge-menu" aria-labelledby="menu-titre">
        <h2 id="menu-titre" class="ge-cache">Catégories</h2>
        ${menu}
      </nav>
      <section class="ge-liste" aria-labelledby="detail-titre">
        <div class="ge-liste-tete"><h2 id="detail-titre"${repli ? '' : ' class="ge-cache"'}>${c.nom}</h2></div>
        <div class="ge-carte-objets">${lignes(c, ui)}</div>
      </section>
    </main>`;
}

function vue() {
  if (biblio) return biblio.vueBibliotheque(choisieBiblio, { repli: REPLI.matches });
  return TABLETTE.matches ? vueVoyage() : vueTelephone();
}

// ---------- Menu de la maquette (absent des captures) ----------
function menuMaquette() {
  if (CAPTURE) return '';
  const ecran = biblio ? 'ecran=bibliotheque&' : '';
  const lien = (debut, e, texte, bandeau = params.get('bandeau')) =>
    `<a href="?${debut}etat=${e}${bandeau ? `&bandeau=${encodeURIComponent(bandeau)}` : ''}"${debut === ecran && e === ETAT ? ' aria-current="true"' : ''}>${texte}</a>`;
  const ecrans = [lien('', ETAT, 'Un voyage'), lien('ecran=bibliotheque&', ETAT, 'La Bibliothèque')].join('');
  const etats = [
    ['en-cours', 'Liste en cours'],
    ['filtre', 'Filtre « Reste à emballer »'],
    ['boucle', 'Sac bouclé'],
    ['longue', 'Catégorie longue (12 objets)'],
    ['beaucoup', 'Beaucoup de catégories (11)'],
  ]
    .map(([e, texte]) => lien(ecran, e, texte))
    .join('');
  const bandeau = params.has('bandeau')
    ? lien(ecran, ETAT, 'Retirer le bandeau « Annuler »', '')
    : lien(ecran, ETAT, 'Montrer le bandeau « Annuler »', 'Objet « Parasol » supprimé');
  return `
    <details class="maquette-menu">
      <summary>Maquette ▾</summary>
      <nav>${ecrans}<hr />${etats}<hr />${bandeau}</nav>
    </details>`;
}

// ---------- Rendu et gestes ----------
const app = document.getElementById('app');
function rendre() {
  const ouvert = app.querySelector('.maquette-menu')?.open;
  app.innerHTML = vue() + menuMaquette();
  if (ouvert) app.querySelector('.maquette-menu').open = true;
}

app.addEventListener('click', e => {
  const cible = e.target.closest('[data-action]');
  if (!cible) return;
  const { action, id } = cible.dataset;
  if (action === 'case') {
    const x = tous().find(o => o.id === id);
    x.dansLeSac = complet(x) ? 0 : x.dansLeSac + 1;
    const c = categories.find(k => k.objets.includes(x));
    ui.ordre.set(c.id, ordreNaturel(c));
    if (estBouclee(c)) ui.bouclees.add(c.id);
    else ui.bouclees.delete(c.id);
    masquer();
  } else if (action === 'filtre') {
    ui.filtre = !ui.filtre;
    masquer();
  } else if (action === 'accordeon') {
    if (ui.ouvertes.has(id)) ui.ouvertes.delete(id);
    else ui.ouvertes.add(id);
  } else if (action === 'choisir') {
    if (biblio) choisieBiblio = id;
    else ui.choisie = id;
    rendre();
    allerALaListe();
    return;
  } else return;
  rendre();
});

// En repli, toucher une catégorie amène sa liste sous les yeux si elle commence dans la moitié basse
// de l'écran : un défilement doux (net si l'appareil demande moins d'animations) jusqu'à son titre,
// 16 px sous le haut de l'écran. Avec les tuiles, la liste est presque toujours déjà là : ce n'est
// qu'un filet pour les cas extrêmes (des dizaines de catégories).
function allerALaListe() {
  if (!REPLI.matches) return;
  const liste = app.querySelector('.ge-liste');
  if (liste && liste.getBoundingClientRect().top > innerHeight / 2)
    liste.scrollIntoView({ behavior: reduit.matches ? 'auto' : 'smooth', block: 'start' });
}

addEventListener('resize', rendre);
rendre();
document.documentElement.dataset.pret = '';

// Phase 7 : le bandeau « Annuler », qui suit d'un écran à l'autre (docs/maquettes/suppressions/).
if (params.get('bandeau')) {
  const { montrerBandeau } = await import('../suppressions/bandeau.js');
  montrerBandeau({ texte: params.get('bandeau'), duree: Infinity });
  document.documentElement.dataset.bandeau = '';
}
