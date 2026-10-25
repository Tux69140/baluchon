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
    else fenetre.style.translate = '';
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
// l'animation ou fermeture par le navigateur n'en font pas une seconde. fermerSurVoile : une fenêtre
// sans saisie à perdre (fiche d'un objet) se ferme aussi d'un appui sur le voile ou d'un glissé de
// son en-tête vers le bas. fermerAuRetour : la fenêtre est un niveau que le retour système ferme
// (fiche, confirmation) ; pas Nouveau voyage, qui a son adresse. Rend fermer(), pour qui doit fermer
// la fenêtre sans geste de la personne.
export function ouvrirFenetre(fenetre, { surFermeture, fermerSurVoile = false, fermerAuRetour = false }) {
  let fermeture = false;
  let niveau = null;
  async function fermer() {
    if (fermeture) return;
    fermeture = true;
    // Dès le geste, pas après l'animation : l'étape est partie avant que l'écran reprenne la main.
    if (niveau) quitterNiveau(niveau);
    fenetre.dataset.fermeture = '';
    // Aucune animation si l'appareil en demande moins : la liste est vide, on ferme aussitôt.
    await Promise.allSettled(fenetre.getAnimations({ subtree: true }).map(a => a.finished));
    if (fenetre.open) fenetre.close();
    surFermeture();
  }

  fenetre.addEventListener('click', evenement => {
    if (evenement.target.closest('[data-fermer]') || (fermerSurVoile && surLeVoile(fenetre, evenement))) fermer();
  });
  if (fermerSurVoile) glisserPourFermer(fenetre, fermer);
  // Échap : on ferme nous-mêmes, pour animer. Sans geste préalable de la personne, le navigateur
  // ferme la fenêtre sans attendre (événement close) : on suit. Une fenêtre retirée de la page avec
  // l'écran qu'elle couvrait (voyage créé) n'est pas une fermeture.
  fenetre.addEventListener('cancel', evenement => {
    evenement.preventDefault();
    fermer();
  });
  fenetre.addEventListener('close', () => fenetre.isConnected && fermer());
  fenetre.showModal();
  if (fermerAuRetour) niveau = ouvrirNiveau(fenetre, fermer);
  return fermer;
}

// Fenêtre d'alerte à boutons nommés (confirmation, question à plusieurs issues). boutons : dans
// l'ordre d'affichage, { cle, libelle, principal } ; le focus va au premier, qui doit donc être le
// geste sans perte. contenu : du HTML déjà échappé par l'appelant, posé entre le texte et les
// boutons. La promesse rend la clé du bouton touché, ou null (Échap, retour système, écran parti),
// une fois la fenêtre effacée : l'écran derrière reprend alors la main. signal (AbortSignal) :
// l'écran qui a posé la question s'en va ; la fenêtre disparaît aussitôt et la réponse est null
// (sinon elle resterait par-dessus l'écran suivant, posée dans document.body).
export function demander({ t, titre, texte, contenu = '', boutons, signal }) {
  const gabarit = document.createElement('template');
  gabarit.innerHTML = vueFenetre({
    t,
    idTitre: 'titre-confirmation',
    titre: echapper(titre),
    croix: false,
    contenu: `
      <p id="texte-confirmation">${echapper(texte)}</p>${contenu}
      <div class="fenetre-pied">${boutons
        .map(
          ({ cle, libelle, principal = false }, rang) => `
        <button type="button" class="bouton ${principal ? 'bouton-principal' : 'bouton-secondaire'}" data-fermer data-cle="${echapper(cle)}"${rang === 0 ? ' autofocus' : ''}>${echapper(libelle)}</button>`,
        )
        .join('')}
      </div>`,
  });
  const fenetre = gabarit.content.firstElementChild;
  fenetre.classList.add('confirmation');
  fenetre.setAttribute('role', 'alertdialog');
  fenetre.setAttribute('aria-describedby', 'texte-confirmation');
  document.body.append(fenetre);
  return new Promise(resoudre => {
    let choisie = null;
    const retirer = () => {
      fenetre.remove();
      resoudre(choisie);
    };
    fenetre.addEventListener('click', evenement => {
      const bouton = evenement.target.closest('[data-cle]');
      if (bouton) choisie = bouton.dataset.cle;
    });
    ouvrirFenetre(fenetre, { surFermeture: retirer, fermerAuRetour: true });
    signal?.addEventListener('abort', retirer, { once: true });
    if (signal?.aborted) retirer();
  });
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
