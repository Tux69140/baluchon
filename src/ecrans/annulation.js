// Le bandeau « Annuler » d'une suppression dans la bibliothèque (spec de la phase 7 ; maquette validée,
// docs/maquettes/suppressions/bandeau.js) : 10 s pour revenir sur ce qui vient d'être supprimé. Un
// seul à la fois : une nouvelle suppression le remplace, toute autre écriture dans la bibliothèque le
// retire (surveillerEcritures) ; la suppression, déjà écrite, devient alors définitive. Il n'appartient
// à aucun écran : changer d'écran ne le retire pas, il suit (décision du chef de projet, 2026-10-26).
// Sa place : en bas à droite, au-dessus de ce qui est fixé au bas de l'écran (bouton flottant, boutons
// collés de l'assistant au téléphone), qu'il ne cache jamais ; l'écran lui garde la place au bas de sa
// liste (annulation.css). Une fenêtre ouverte rend le reste de la page intouchable : il se range alors
// dans celle du dessus, en haut, comme le message d'erreur d'enregistrement, et revient en bas à sa
// fermeture, sans que ses 10 s repartent de zéro.
import { DUREE_ALERTE, alerterEnHaut } from './alerte.js';
import { echapper } from './html.js';
import { iconeInterface } from './icones.js';

const DUREE = 10000;
// La fenêtre du dessus, qui n'est pas en train de se fermer (comme alerterEnHaut).
const FENETRE = 'dialog:modal:not([data-fermeture])';
// Ce qui est fixé au bas de l'écran et se touche : le bandeau se pose au-dessus.
const BAS_FIXE = '.bouton-flottant, .assistant-pied';
const ECART = 8;
// Les écritures de la bibliothèque autres que le rétablissement (docs/PRD.md, « Toute suppression ») :
// chacune rend la suppression précédente définitive.
const ECRITURES_BIBLIOTHEQUE = [
  'enregistrerCategorie',
  'enregistrerObjet',
  'rangerCategories',
  'enregistrerGroupe',
  'enregistrerEtiquette',
  'rangerGroupes',
  'rangerEtiquettes',
  'supprimerCategorie',
  'supprimerObjet',
  'supprimerEtiquette',
  'supprimerGroupe',
];

// Le bandeau affiché : son élément, son bouton « Annuler », sa minuterie, la fin de sa vie (qui retire
// aussi le message d'un rétablissement refusé), et ce qu'il est en train de faire : retablit (« Annuler »
// touché, le rétablissement court), expire (ses 10 s se sont écoulées pendant ce temps).
let courant = null;
// Le rétablissement en cours (« Annuler » touché), ou une promesse déjà tenue : toute lecture de la
// bibliothèque l'attend, et voit ce qu'il rend (une suppression qui relit avant d'écrire, surtout).
let retablissement = Promise.resolve();

// Le haut du plus haut de ce qui est fixé au bas de l'écran (à 48 px du bord au plus), ou null.
function hautDuBasFixe() {
  let haut = null;
  for (const el of document.querySelectorAll(BAS_FIXE)) {
    const { position } = getComputedStyle(el);
    if (position !== 'fixed' && position !== 'sticky') continue;
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height || r.bottom < innerHeight - 48 || r.height > innerHeight / 2) continue;
    haut = Math.min(haut ?? Infinity, r.top);
  }
  return haut;
}

// Range le bandeau dans la fenêtre du dessus, ou dans la page, et le pose au-dessus du bas fixé. Le
// déplacer le retire de la couche du dessus : on l'y remet. Son entrée (data-entree) court jusqu'à ce
// qu'elle s'achève une fois : montré pendant que la fiche de l'élément supprimé se ferme, il passe
// aussitôt dans la page, et c'est là qu'elle se joue ; ensuite, aucun déplacement ne la rejoue.
function placer() {
  if (!courant) return;
  const { el } = courant;
  const fenetre = [...document.querySelectorAll(FENETRE)].at(-1);
  const parent = fenetre ?? document.body;
  if (el.parentElement !== parent) parent.append(el);
  if (!el.matches(':popover-open')) el.showPopover();
  el.dataset.place = fenetre ? 'haut' : 'bas';
  const haut = fenetre ? null : hautDuBasFixe();
  regler(el, '--au-dessus', haut === null ? '' : `${innerHeight - haut + ECART}px`);
  // Le message d'une écriture refusée, en haut de la même fenêtre, le couvrirait : il se pose dessous,
  // « Annuler » touchable pour un nouvel essai, et remonte quand le message s'en va.
  const message = fenetre?.querySelector(':scope > .alerte-haut:popover-open');
  regler(el, '--sous', message ? `${message.getBoundingClientRect().bottom + ECART}px` : '');
}

// Ne touche au style que s'il change.
function regler(el, propriete, valeur) {
  if (el.style.getPropertyValue(propriete) !== valeur) el.style.setProperty(propriete, valeur);
}

// Chaque fenêtre qui s'ouvre, commence à se fermer ou se ferme, et chaque écran dessiné (son bouton
// flottant, le pied de l'assistant) replace le bandeau.
new MutationObserver(placer).observe(document.body, {
  subtree: true,
  childList: true,
  attributeFilter: ['open', 'data-fermeture'],
});
addEventListener('resize', placer);

function retirerAnnulation() {
  if (!courant) return;
  clearTimeout(courant.minuterie);
  courant.fin.abort();
  courant.el.remove();
  courant = null;
}

// Retire ce bandeau-là s'il est encore affiché (pas celui qui l'a remplacé).
function retirer(bandeau) {
  if (courant === bandeau) retirerAnnulation();
}

// Au bout de son temps, le bandeau s'en va ; pas pendant un rétablissement : c'est sa fin qui décide
// (réussi, il part ; refusé, il le dit).
function expirer(bandeau) {
  if (bandeau.retablit) bandeau.expire = true;
  else retirer(bandeau);
}

// Rend « Annuler » inactif (rétablissement ou autre écriture en cours) ou de nouveau actif.
function activer(bandeau, actif) {
  if (actif) bandeau.bouton.removeAttribute('aria-disabled');
  else bandeau.bouton.setAttribute('aria-disabled', 'true');
}

// « Annuler » touché. Tant que le rétablissement court, « Annuler » ne répond plus : un seul
// rétablissement. Refusé, le bandeau reste jusqu'au bout de ses 10 s pour un nouvel essai ; si elles se
// sont écoulées pendant le rétablissement, il reste encore le temps de lire le message (6 s).
async function retablir(bandeau, { t, app, annuler }) {
  bandeau.retablit = true;
  activer(bandeau, false);
  try {
    await annuler();
    retirer(bandeau);
  } catch (erreur) {
    console.error(erreur);
    if (courant !== bandeau) return;
    activer(bandeau, true);
    if (bandeau.expire) bandeau.minuterie = setTimeout(() => expirer(bandeau), DUREE_ALERTE);
    alerterEnHaut(app, t('annulation.erreur'), bandeau.fin.signal);
  } finally {
    bandeau.retablit = false;
    bandeau.expire = false;
  }
}

// texte : ce qui vient d'être supprimé, en texte simple ; annuler() rétablit et rend une promesse.
// app : la racine de l'appli, où dire un rétablissement refusé.
export function montrerAnnulation({ t, app, texte, annuler }) {
  retirerAnnulation();
  const el = document.createElement('div');
  el.className = 'bandeau-annuler';
  el.setAttribute('popover', 'manual');
  el.setAttribute('role', 'status');
  el.dataset.entree = '';
  el.innerHTML = `
    ${iconeInterface('supprimer')}
    <p>${echapper(texte)}</p>
    <button type="button" class="bandeau-action">${iconeInterface('annuler')}${echapper(t('annulation.annuler'))}</button>`;
  // Sans animation (l'appareil en demande moins), rien ne s'achève : data-entree reste, sans effet.
  el.addEventListener('animationend', () => delete el.dataset.entree, { once: true });
  const bouton = el.querySelector('button');
  const bandeau = { el, bouton, fin: new AbortController(), retablit: false, expire: false };
  bandeau.minuterie = setTimeout(() => expirer(bandeau), DUREE);
  courant = bandeau;
  bouton.addEventListener('click', () => {
    if (bouton.getAttribute('aria-disabled') !== 'true') retablissement = retablir(bandeau, { t, app, annuler });
  });
  placer();
}

// Le stockage, de même forme, dont chaque écriture de la bibliothèque retire le bandeau une fois
// faite : refusée, rien n'a changé, et le bandeau reste, son « Annuler » toujours bon (pendant
// l'écriture, il ne répond plus). Le rétablissement et les écritures d'un voyage le laissent. Une
// lecture ou une écriture de la bibliothèque attend la fin d'un rétablissement en cours.
export function surveillerEcritures(stockage) {
  const surveillees = ECRITURES_BIBLIOTHEQUE.map(nom => [
    nom,
    async (...valeurs) => {
      await retablissement;
      const bandeau = courant;
      if (bandeau) activer(bandeau, false);
      try {
        const resultat = await stockage[nom](...valeurs);
        if (bandeau) retirer(bandeau);
        return resultat;
      } catch (erreur) {
        if (bandeau && courant === bandeau) activer(bandeau, true);
        throw erreur;
      }
    },
  ]);
  async function lireBibliotheque() {
    await retablissement;
    return stockage.lireBibliotheque();
  }
  return Object.freeze({ ...stockage, ...Object.fromEntries(surveillees), lireBibliotheque });
}
