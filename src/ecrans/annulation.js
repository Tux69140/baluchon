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
import { ECRITURES_BIBLIOTHEQUE } from '../stockage/index.js';
import { DUREE_ALERTE, alerterEnHaut } from './alerte.js';
import { echapper } from './html.js';
import { iconeInterface } from './icones.js';

const DUREE = 10000;
// La fenêtre du dessus, qui n'est pas en train de se fermer (comme alerterEnHaut).
const FENETRE = 'dialog:modal:not([data-fermeture])';
// Ce qui est fixé au bas de l'écran et se touche : le bandeau se pose au-dessus.
const BAS_FIXE = '.bouton-flottant, .assistant-pied';
const ECART = 8;

// Le bandeau affiché : son élément, son bouton « Annuler », sa minuterie et son échéance, la fin de sa
// vie (qui retire aussi le message d'un rétablissement refusé), et ce qui le tient : retablit (« Annuler »
// touché, le rétablissement court), occupations (rétablissement, écritures et revérifications en
// cours, pendant lesquels « Annuler » ne répond plus).
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

// Le bandeau s'en va dans duree ms ; à l'échéance, pas pendant un rétablissement : c'est sa fin qui
// décide (réussi, il part ; refusé, il le dit et reste encore un peu).
function programmerFin(bandeau, duree) {
  clearTimeout(bandeau.minuterie);
  bandeau.echeance = Date.now() + duree;
  bandeau.minuterie = setTimeout(() => {
    if (!bandeau.retablit) retirer(bandeau);
  }, duree);
}

// « Annuler » ne répond plus tant qu'au moins une chose le tient, et de nouveau ensuite.
function occuper(bandeau) {
  bandeau.occupations += 1;
  bandeau.bouton.setAttribute('aria-disabled', 'true');
}
function liberer(bandeau) {
  bandeau.occupations -= 1;
  if (!bandeau.occupations) bandeau.bouton.removeAttribute('aria-disabled');
}

// « Annuler » touché : un seul rétablissement à la fois. Refusé, le bandeau reste pour un nouvel essai
// jusqu'au bout de ses 10 s, et au moins le temps de lire le message (6 s), même si elles s'achèvent
// avant (ou se sont achevées pendant le rétablissement).
async function retablir(bandeau, { t, app, annuler }) {
  bandeau.retablit = true;
  occuper(bandeau);
  try {
    await annuler();
    retirer(bandeau);
  } catch (erreur) {
    console.error(erreur);
    if (courant !== bandeau) return;
    programmerFin(bandeau, Math.max(bandeau.echeance - Date.now(), DUREE_ALERTE));
    alerterEnHaut(app, t('annulation.erreur'), bandeau.fin.signal);
  } finally {
    bandeau.retablit = false;
    liberer(bandeau);
  }
}

// La garde, seule définition : travail(bandeau) (une écriture de la bibliothèque, ou une relecture
// suivie d'une écriture : une suppression, un retrait du voyage) attend la fin d'un rétablissement en
// cours, puis court avec « Annuler » inactif jusqu'à sa fin. Aucun rétablissement ne se glisse entre ce
// qu'il lit et ce qu'il écrit : rien ne s'écrit sur une lecture que « Annuler » aurait rendue périmée
// (résiduel N1 de la phase 7 ; relecture finale de la phase 8, point 1).
// bandeau : celui affiché au début, ou null.
export async function sansAnnuler(travail) {
  await retablissement;
  const bandeau = courant;
  if (bandeau) occuper(bandeau);
  try {
    return await travail(bandeau);
  } finally {
    if (bandeau) liberer(bandeau);
  }
}

// texte : ce qui vient d'être supprimé, en texte simple ; annuler() rétablit et rend une promesse.
// app : la racine de l'appli, où dire un rétablissement refusé. voyage : l'id du voyage d'un retrait
// d'objet (le bandeau de la bibliothèque n'en a pas).
export function montrerAnnulation({ t, app, texte, annuler, voyage = null }) {
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
  const bandeau = { el, bouton, voyage, fin: new AbortController(), retablit: false, occupations: 0 };
  programmerFin(bandeau, DUREE);
  courant = bandeau;
  // Toujours une promesse tenue, quoi qu'il arrive dans retablir : les lectures et écritures qui
  // l'attendent ne restent jamais bloquées.
  bouton.addEventListener('click', () => {
    if (bouton.getAttribute('aria-disabled') !== 'true')
      retablissement = retablir(bandeau, { t, app, annuler }).catch(console.error);
  });
  placer();
}

// Le stockage, de même forme, dont chaque écriture de la bibliothèque passe par la garde et retire le
// bandeau une fois faite : refusée, rien n'a changé, et le bandeau reste, son « Annuler » toujours bon.
// Le bandeau d'un retrait du voyage ne part qu'à l'ajout d'un objet à ce voyage (l'objet retiré
// pourrait y revenir autrement) : une écriture de la bibliothèque le laisse, et le rétablissement
// aussi. Un ajout au voyage, comme une lecture de la bibliothèque, attend la fin d'un rétablissement
// en cours.
export function surveillerEcritures(stockage) {
  const surveillees = ECRITURES_BIBLIOTHEQUE.map(nom => [
    nom,
    (...valeurs) =>
      sansAnnuler(async bandeau => {
        const resultat = await stockage[nom](...valeurs);
        if (bandeau && !bandeau.voyage) retirer(bandeau);
        return resultat;
      }),
  ]);
  async function ajouterAuVoyage(ajout) {
    await retablissement;
    const resultat = await stockage.ajouterAuVoyage(ajout);
    if (courant?.voyage === ajout.objet.voyageId) retirerAnnulation();
    return resultat;
  }
  async function lireBibliotheque() {
    await retablissement;
    return stockage.lireBibliotheque();
  }
  return Object.freeze({ ...stockage, ...Object.fromEntries(surveillees), ajouterAuVoyage, lireBibliotheque });
}
