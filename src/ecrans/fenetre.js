// Fenêtre modale (src/styles/fenetre.css) : un <dialog> ouvert par showModal(), qui garde le focus en
// lui, rend inerte l'écran derrière et répond à Échap. Ce module y ajoute le reste : un en-tête avec
// son titre et son « × », la fermeture par tout bouton [data-fermer], et l'animation de fermeture
// avant de rendre la main. Par défaut, un appui sur le voile ne ferme rien : un geste accidentel
// perdrait la saisie (décision du contrôleur, 2026-10-07). Partagé par les écrans qui s'ouvrent
// par-dessus un autre (Nouveau voyage, décision du chef de projet, 2026-10-07 ; fiche d'un objet).
import { echapper } from './html.js';
import { iconeInterface } from './icones.js';

// Le titre peut recevoir le focus (sans être atteint par Tab) : à l'ouverture au doigt, c'est lui qui
// le prend, plutôt qu'un champ qui ferait surgir le clavier. croix : le « × » de fermeture, absent
// d'une confirmation, où « Annuler » dit déjà la même chose (maquette du 2026-10-24).
export const vueFenetre = ({ t, idTitre, titre, contenu, croix = true }) => `
    <dialog class="fenetre" aria-labelledby="${idTitre}">
      <header class="fenetre-entete">
        <h2 id="${idTitre}" tabindex="-1">${titre}</h2>${
          croix
            ? `
        <button type="button" class="bouton-icone bouton-fermer" data-fermer aria-label="${t('fenetre.fermer')}">${iconeInterface('fermer')}</button>`
            : ''
        }
      </header>${contenu}
    </dialog>`;

// Glissé de plus de 80 px vers le bas : la fenêtre se ferme ; en deçà, elle revient à sa place.
const SEUIL_GLISSE = 80;

// Un appui sur le voile, pas dans la fenêtre : le clic vise la fenêtre elle-même (son voile en fait
// partie), en dehors de son cadre.
function surLeVoile(fenetre, evenement) {
  if (evenement.target !== fenetre) return false;
  const r = fenetre.getBoundingClientRect();
  const { clientX: x, clientY: y } = evenement;
  return x < r.left || x > r.right || y < r.top || y > r.bottom;
}

// La fenêtre suit le doigt (ou la souris) posé sur son en-tête, vers le bas seulement. Le décalage
// passe par « translate », qui s'ajoute à l'animation de fermeture (« transform ») : lâchée au-delà
// du seuil, la fenêtre continue de descendre depuis là où on l'a laissée. Un appui sur un bouton de
// l'en-tête (« × ») reste un appui : la capture du pointeur lui volerait son clic.
function glisserPourFermer(fenetre, fermer) {
  const entete = fenetre.querySelector('.fenetre-entete');
  // Le menu (src/ecrans/menu.js) n'a pas d'en-tête de fenêtre : il vient de la gauche, il ne se glisse pas.
  if (!entete) return;
  let depart = null;
  entete.addEventListener('pointerdown', evenement => {
    if (!evenement.isPrimary || evenement.button !== 0 || evenement.target.closest('button')) return;
    depart = evenement.clientY;
    entete.setPointerCapture(evenement.pointerId);
    fenetre.dataset.glisse = '';
  });
  entete.addEventListener('pointermove', evenement => {
    if (depart !== null) fenetre.style.translate = `0 ${Math.max(0, evenement.clientY - depart)}px`;
  });
  const lacher = evenement => {
    if (depart === null) return;
    const ecart = evenement.type === 'pointerup' ? evenement.clientY - depart : 0;
    depart = null;
    delete fenetre.dataset.glisse;
    if (ecart > SEUIL_GLISSE) fermer();
    // Restée ouverte (une fiche modifiée pose d'abord sa question), elle revient à sa place.
    if (!('fermeture' in fenetre.dataset)) fenetre.style.translate = '';
  };
  entete.addEventListener('pointerup', lacher);
  entete.addEventListener('pointercancel', lacher);
}

// Le retour système (Android, ou celui du navigateur) remonte l'historique de la page ; il ferme le
// dernier niveau ouvert (docs/PRD.md, « Écrans et gestes »). Chaque niveau (fiche, confirmation)
// pose donc à son ouverture une étape d'historique à lui, sans changer d'adresse : son rang
// (niveau) s'ajoute à l'état de l'étape, qui garde la profondeur lue par le routeur (src/main.js).
// Un retour qui reste à la même adresse ferme les niveaux au-dessus de l'étape atteinte ; le
// routeur, qui ne suit que les changements d'adresse, ne redessine rien. Un retour qui change
// d'adresse emporte l'écran, et ses niveaux avec lui (signal de l'écran).
const niveaux = [];
// Un niveau fermé autrement (×, Échap, un bouton…) retire son étape par history.back(), sinon le
// retour suivant ne fermerait rien de visible. L'étape ne part que peu après (le navigateur traite
// les retours dans l'ordre) : le prochain retour reçu est donc le nôtre, pas celui de la personne,
// et un niveau ouvert entre-temps attend pour poser la sienne (l'historique reculerait sous elle).
let retraitsEnAttente = 0;
// Ceux qui attendent qu'une étape retirée soit partie, dans l'ordre des retraits.
const attentesDeRetrait = [];

// Une étape par niveau ouvert au-dessus de celle où l'on est.
function poserEtapes() {
  for (let n = history.state?.niveau ?? 0; n < niveaux.length; n++)
    history.pushState({ ...history.state, niveau: n + 1 }, '');
}

window.addEventListener('popstate', () => {
  if (retraitsEnAttente) {
    retraitsEnAttente -= 1;
    poserEtapes();
    return attentesDeRetrait.shift()?.();
  }
  for (const niveau of niveaux.splice(history.state?.niveau ?? 0).reverse())
    if (niveau.adresse === location.href && niveau.fenetre.isConnected) niveau.fermer();
});

function ouvrirNiveau(fenetre, fermer) {
  // Une fenêtre partie avec son écran (retirée sans fermeture) ne compte plus.
  niveaux.splice(0, Infinity, ...niveaux.filter(n => n.fenetre.isConnected));
  const niveau = { fenetre, fermer, adresse: location.href };
  niveaux.push(niveau);
  if (!retraitsEnAttente) poserEtapes();
  return niveau;
}

// Un niveau encore dans la pile se ferme par un autre geste que le retour : son étape s'en va.
// Rend une promesse résolue quand l'étape est partie (aussitôt s'il n'y en avait pas). Une garde
// retirée sous une fenêtre (inerte) part à son tour dès que plus rien n'est au-dessus d'elle.
function quitterNiveau(niveau) {
  const rang = niveaux.indexOf(niveau);
  if (rang < 0) return Promise.resolve();
  niveaux.splice(rang, 1);
  retraitsEnAttente += 1;
  const partie = new Promise(resoudre => attentesDeRetrait.push(resoudre));
  history.back();
  const dessous = niveaux.at(-1);
  if (dessous?.inerte && rang === niveaux.length) dessous.inerte(quitterNiveau(dessous));
  return partie;
}

// surFermeture est appelé une seule fois, la fenêtre effacée : appuis répétés, Échap pendant
// l'animation ou fermeture par le navigateur n'en font pas une seconde. fermerSurVoile : la fenêtre se
// ferme aussi d'un appui sur le voile ou d'un glissé de son en-tête vers le bas. fermerAuRetour : la
// fenêtre est un niveau que le retour système ferme (fiche, confirmation) ; pas Nouveau voyage, qui a
// son adresse. surGeste : une fenêtre qui a une saisie à perdre (Nouveau voyage, fiche de modèle) ;
// « × », Échap, le voile, le glissé, le retour système ou le navigateur qui la ferme de lui-même
// appellent surGeste au lieu de la fermer : l'écran demande d'abord, puis la ferme s'il le faut.
// Fermée par le navigateur (Échap répété, sans geste entre deux), elle se rouvre le temps de la
// question. Rend fermer(), pour qui doit fermer la fenêtre sans geste de la personne ; sa promesse se
// résout quand la fenêtre est effacée et que son étape d'historique est partie (le menu l'attend avant
// de changer d'écran : le retrait de l'étape, arrivé après, reculerait sous l'écran suivant).
export function ouvrirFenetre(
  fenetre,
  { surFermeture, fermerSurVoile = false, fermerAuRetour = false, surGeste = null },
) {
  let fermeture = false;
  let niveau = null;
  async function fermer() {
    if (fermeture) return;
    fermeture = true;
    // Dès le geste, pas après l'animation : l'étape est partie avant que l'écran reprenne la main.
    const etapePartie = niveau ? quitterNiveau(niveau) : null;
    fenetre.dataset.fermeture = '';
    // Aucune animation si l'appareil en demande moins : la liste est vide, on ferme aussitôt.
    await Promise.allSettled(fenetre.getAnimations({ subtree: true }).map(a => a.finished));
    if (fenetre.open) fenetre.close();
    surFermeture();
    await etapePartie;
  }

  // Le voile et le glissé passent par la même question que « × » (spec de la phase 5, fiches de modèle).
  const geste = () => (surGeste && !fermeture ? surGeste() : fermer());
  fenetre.addEventListener('click', evenement => {
    if (evenement.target.closest('[data-fermer]')) geste();
    else if (fermerSurVoile && surLeVoile(fenetre, evenement)) geste();
  });
  if (fermerSurVoile) glisserPourFermer(fenetre, geste);
  // Échap : on ferme nous-mêmes, pour animer. Sans geste préalable de la personne, le navigateur
  // ferme la fenêtre sans attendre (cancel non annulable, puis close) : on suit. Une fenêtre retirée
  // de la page avec l'écran qu'elle couvrait (voyage créé) n'est pas une fermeture.
  // Avec surGeste, ce cancel-là ne demande rien : la question s'ouvrirait sous la fenêtre, que le
  // navigateur ferme puis que close rouvre par-dessus elle ; c'est close qui demande, une fois la
  // fenêtre revenue. focusAvant : ce qui avait le focus, rendu à la réouverture (la question fermée
  // le rend à son tour).
  let focusAvant = null;
  fenetre.addEventListener('cancel', evenement => {
    evenement.preventDefault();
    focusAvant = document.activeElement;
    if (surGeste && !evenement.cancelable) return;
    geste();
  });
  fenetre.addEventListener('close', () => {
    if (!fenetre.isConnected || fermeture) return;
    if (!surGeste) return fermer();
    // Rouverte telle qu'elle était : sans rejouer l'animation d'ouverture.
    fenetre.showModal();
    for (const animation of fenetre.getAnimations({ subtree: true })) animation.finish();
    if (fenetre.contains(focusAvant)) focusAvant.focus({ preventScroll: true });
    surGeste();
  });
  // Une fenêtre à saisie que le retour système atteint ne se ferme pas d'office : comme la garde du
  // retour (poserGardeRetour), elle reste un niveau et surGeste demande ; la question qu'il ouvre se
  // place au-dessus d'elle. Fermée par surGeste lui-même (rien à perdre), elle est déjà hors de la pile.
  function auRetour() {
    if (!surGeste) return fermer();
    const rang = niveaux.length;
    surGeste();
    if (fermeture) return;
    niveaux.splice(rang, 0, niveau);
    poserEtapes();
  }
  fenetre.showModal();
  if (fermerAuRetour) niveau = ouvrirNiveau(fenetre, auRetour);
  return fermer;
}

const classeBouton = (principal, danger) => {
  if (danger) return 'bouton-danger';
  return principal ? 'bouton-principal' : 'bouton-secondaire';
};

// Fenêtre d'alerte à boutons nommés (confirmation, question à plusieurs issues). boutons : dans
// l'ordre d'affichage, { cle, libelle, principal, danger } ; le focus va au premier, qui doit donc
// être le geste sans perte. danger : une suppression, en rouge et précédée de la corbeille, pour
// qu'on ne la prenne pas pour une confirmation verte (maquette de la phase 6). contenu : du HTML
// déjà échappé par l'appelant, posé entre le texte et les boutons ; texteHtml : le texte déjà en HTML
// (échappé par l'appelant, un nombre en gras), à la place de texte ; idTexte : l'identifiant de son
// paragraphe (la question chiffrée d'une suppression a le sien) ; suite : d'autres paragraphes en HTML
// (échappés par l'appelant), lus avec lui (le retrait d'un objet du voyage). La promesse rend la clé du bouton
// touché, ou null (Échap, retour système, écran parti), une fois la fenêtre effacée : l'écran
// derrière reprend alors la main. signal (AbortSignal) : l'écran qui a posé la question s'en va ; la
// fenêtre disparaît aussitôt et la réponse est null (sinon elle resterait par-dessus l'écran
// suivant, posée dans document.body).
export function demander({
  t,
  titre,
  texte = '',
  texteHtml = echapper(texte),
  idTexte = 'texte-confirmation',
  suite = [],
  contenu = '',
  boutons,
  signal,
}) {
  const gabarit = document.createElement('template');
  gabarit.innerHTML = vueFenetre({
    t,
    idTitre: 'titre-confirmation',
    titre: echapper(titre),
    croix: false,
    contenu: `
      <p id="${idTexte}">${texteHtml}</p>${suite.map((p, i) => `<p id="${idTexte}-${i + 2}">${p}</p>`).join('')}${contenu}
      <div class="fenetre-pied">${boutons
        .map(
          ({ cle, libelle, principal = false, danger = false }, rang) => `
        <button type="button" class="bouton ${classeBouton(principal, danger)}" data-fermer data-cle="${echapper(cle)}"${rang === 0 ? ' autofocus' : ''}>${danger ? iconeInterface('supprimer') : ''}${echapper(libelle)}</button>`,
        )
        .join('')}
      </div>`,
  });
  const fenetre = gabarit.content.firstElementChild;
  fenetre.classList.add('confirmation');
  fenetre.setAttribute('role', 'alertdialog');
  fenetre.setAttribute('aria-describedby', [idTexte, ...suite.map((_, i) => `${idTexte}-${i + 2}`)].join(' '));
  document.body.append(fenetre);
  return new Promise(resoudre => {
    let choisie = null;
    let arreterMesure = () => {};
    const retirer = () => {
      arreterMesure();
      fenetre.remove();
      resoudre(choisie);
    };
    fenetre.addEventListener('click', evenement => {
      const bouton = evenement.target.closest('[data-cle]');
      if (bouton) choisie = bouton.dataset.cle;
    });
    ouvrirFenetre(fenetre, { surFermeture: retirer, fermerAuRetour: true });
    arreterMesure = empilerSiTropLarges(fenetre.querySelector('.fenetre-pied'));
    signal?.addEventListener('abort', retirer, { once: true });
    if (signal?.aborted) retirer();
  });
}

// Les réponses d'une question restent côte à côte quand elles tiennent ; sinon chacune prend sa
// ligne, sur toute la largeur (data-empile). Le pied est un flex qui passe à la ligne : on le lâche
// à largeur naturelle, et si les boutons ne sont plus au même niveau on les empile (ni 2+1, ni
// demi-largeur). Ne dépend que de la largeur : pas de boucle. Le calcul attend l'image suivante :
// lâcher puis empiler les boutons change la hauteur du pied dans l'image de la notification, ce que
// le navigateur signale en « ResizeObserver loop completed with undelivered notifications ». Rend la
// fonction qui arrête l'observation. La première mesure se fait tout de suite (hors de l'observateur,
// donc sans boucle) : sans elle, la première image s'afficherait boutons côte à côte, un à-coup visible
// quand l'appareil demande moins d'animations.
function empilerSiTropLarges(pied) {
  const boutons = [...pied.children];
  let image = 0;
  const mesurer = () => {
    pied.removeAttribute('data-empile');
    if (new Set(boutons.map(b => b.offsetTop)).size > 1) pied.setAttribute('data-empile', '');
  };
  mesurer();
  const observateur = new ResizeObserver(() => {
    cancelAnimationFrame(image);
    image = requestAnimationFrame(mesurer);
  });
  observateur.observe(pied);
  return () => {
    observateur.disconnect();
    cancelAnimationFrame(image);
  };
}

// Avant un geste qui défait quelque chose (vider un objet du sac) : « Annuler » puis le bouton de
// l'action. La promesse rend true si l'action est choisie, false pour « Annuler » ou Échap. Le focus
// va d'abord à « Annuler », le geste sans perte.
export async function confirmer({ t, titre, texte, action, signal }) {
  const cle = await demander({
    t,
    titre,
    texte,
    signal,
    boutons: [
      { cle: 'annuler', libelle: t('fenetre.annuler') },
      { cle: 'action', libelle: action, principal: true },
    ],
  });
  return cle === 'action';
}

// Garde du retour système, pour un écran qui doit le comprendre autrement (l'assistant : retour =
// étape précédente). C'est un niveau comme une fenêtre, qui ne ferme rien : le retour appelle
// surRetour() au lieu de quitter l'écran ; si surRetour rend true, la garde se repose aussitôt (le
// retour suivant l'appelle encore) ; sinon elle est consommée et le retour suivant quitte l'écran.
// Une fenêtre ouverte par-dessus reste le dernier niveau : le retour la ferme, sans appeler
// surRetour. retirer() enlève l'étape sans quitter l'écran.
export function poserGardeRetour({ surRetour }) {
  let actif = true;
  const garde = {
    // Pas de fenêtre : la garde reste dans la pile tant que l'écran vit.
    fenetre: { isConnected: true },
    adresse: location.href,
    inerte: null,
    fermer() {
      if (!actif) return garde.inerte?.();
      // Rang de la garde : ce que surRetour ouvre (une fenêtre) se place au-dessus d'elle, pas dessous.
      const rang = niveaux.length;
      if (!surRetour()) return;
      niveaux.splice(rang, 0, garde);
      poserEtapes();
    },
  };
  niveaux.push(garde);
  if (!retraitsEnAttente) poserEtapes();
  return {
    // Rend une promesse résolue quand l'étape de la garde est partie : un écran qui change ensuite
    // l'adresse (replaceState) l'attend, sinon le retrait différé le ramènerait à l'ancienne adresse.
    retirer() {
      actif = false;
      if (niveaux.at(-1) === garde || !niveaux.includes(garde)) return quitterNiveau(garde);
      return new Promise(resoudre => (garde.inerte = resoudre));
    },
  };
}
