// Fiche de modèle (spec de la phase 5 ; maquette validée le 2026-10-25, docs/maquettes/bibliotheque/,
// fiches.js) : la mécanique commune des fiches de catégorie et d'objet. Une même fiche crée ou
// modifie ; elle travaille sur un brouillon, écrit d'un coup par « Enregistrer ». La fermer avec des
// changements (×, « Annuler », voile, glissé, Échap, retour système) demande « Abandonner les
// modifications ? » ; non modifiée, elle se ferme directement. Au téléphone, elle monte du bas comme
// la fiche du voyage (src/styles/fiche.css) ; ailleurs, fenêtre centrée de 560 px
// (src/styles/fiche-modele.css).
//
// Le dessin vient de la fiche appelante (dessiner) ; les commandes s'y reconnaissent à leurs
// attributs (src/ecrans/fiche-modele-vues.js) :
// - data-texte="cle" : un champ de texte, recopié tel quel ;
// - data-nombre="cle" : un nombre tapé au clavier, chiffres seuls, ramené de 1 à 999, vide = null ;
// - data-pas="cle" data-sens="±1" : − ou +, borné de 1 à 999 ;
// - data-choix="cle" : un bouton radio ('true' et 'false' deviennent des booléens) ;
// - data-bascule="cle" : un interrupteur ; data-pose="cle" data-valeur="v" : un choix posé (couleur) ;
// - data-etiquette="id" : une étiquette pressée ou relâchée ;
// - data-action="nom" : une action propre à la fiche (actions[nom](brouillon), qui peut attendre).
import { bornerQuantite, lireNombre } from '../modele/modeles.js';
import { alerterEnHaut } from './alerte.js';
import { demander, ouvrirFenetre, vueFenetre } from './fenetre.js';
import { echapper } from './html.js';

const ID_TITRE = 'fiche-modele-titre';
const COMMANDES = '[data-pas], [data-bascule], [data-pose], [data-etiquette], [data-action], [data-enregistrer]';

// Ce qui désigne une commande d'un dessin à l'autre : ses attributs data-*, et la valeur d'un bouton
// radio (tous ceux d'un groupe ont la même clé).
function selecteurDe(element) {
  const attributs = [...element.attributes]
    .filter(a => a.name.startsWith('data-'))
    .map(a => `[${a.name}="${CSS.escape(a.value)}"]`);
  if (element.type === 'radio') attributs.push(`[value="${CSS.escape(element.value)}"]`);
  if (element.id) attributs.push(`#${CSS.escape(element.id)}`);
  return attributs.join('');
}

function vueFiche({ t, titre, bouton }) {
  const gabarit = document.createElement('template');
  gabarit.innerHTML = vueFenetre({
    t,
    idTitre: ID_TITRE,
    titre: echapper(titre),
    contenu: `
      <div class="fiche-corps"></div>
      <div class="fenetre-pied">
        <button type="button" class="bouton bouton-secondaire" data-fermer>${t('fenetre.annuler')}</button>
        <button type="button" class="bouton bouton-principal" data-enregistrer>${echapper(bouton)}</button>
      </div>`,
  });
  const fenetre = gabarit.content.firstElementChild;
  fenetre.classList.add('fiche', 'fiche-modele');
  return fenetre;
}

// Ouvre la fiche dans dans (l'écran, pour qu'elle parte avec lui). titre, sousTitre, bouton,
// texteAbandon : des textes (échappés ici). saisie : le brouillon de départ. valider(brouillon) : les
// codes d'erreur par champ. dessiner(brouillon, erreurs) : le HTML du corps ; les erreurs ne sont
// montrées qu'après un premier « Enregistrer », puis suivent chaque correction. ajuster(brouillon,
// cle) : ce qu'un changement entraîne (« Fixe » efface le plafond…). enregistrer(brouillon) : rend
// une promesse ; tant qu'elle court, « Enregistrer » est inactif ; refusée, la fiche reste ouverte
// avec sa saisie et le message de panne s'affiche en haut ; tenue, la fiche se ferme. surFermeture :
// la fiche effacée (enregistrée ou non). signal : l'écran s'en va, la fiche disparaît avec lui.
export function ouvrirFicheModele({
  t,
  titre,
  sousTitre = '',
  bouton,
  saisie,
  valider,
  dessiner,
  texteAbandon,
  enregistrer,
  ajuster = () => {},
  actions = {},
  surFermeture = () => {},
  signal,
  dans,
}) {
  const brouillon = structuredClone(saisie);
  const depart = JSON.stringify(brouillon);
  const fenetre = vueFiche({ t, titre, bouton });
  const corps = fenetre.querySelector('.fiche-corps');
  const pied = fenetre.querySelector('.fenetre-pied');
  const boutonEnregistrer = pied.querySelector('[data-enregistrer]');
  const gabarit = document.createElement('template');
  let essaye = false;
  let enregistrement = false;
  let questionOuverte = false;
  let fermer = () => {};

  const erreurs = () => (essaye ? valider(brouillon) : {});
  const contenu = () =>
    (sousTitre ? `<p class="fiche-regle">${echapper(sousTitre)}</p>` : '') + dessiner(brouillon, erreurs());

  // Ombre sur le pied tant qu'il reste à défiler (décision de l'assistant, 2026-10-25).
  const ombrer = () =>
    pied.toggleAttribute('data-ombre', corps.scrollTop + corps.clientHeight < corps.scrollHeight - 2);

  // Tout redessiner, après un geste (bouton, segment) : le défilement et le focus restent où ils
  // étaient ; une commande qui a disparu (le plafond, après « Fixe ») rend le focus au titre.
  function peindre() {
    const actif = document.activeElement;
    const cle = actif && corps.contains(actif) ? selecteurDe(actif) : null;
    const haut = corps.scrollTop;
    corps.innerHTML = contenu();
    corps.scrollTop = haut;
    if (cle) (corps.querySelector(cle) ?? fenetre.querySelector('h2')).focus({ preventScroll: true });
    ombrer();
  }

  // Après une frappe au clavier : seules les zones vivantes (messages, phrase de quantité, − et +) sont
  // remplacées ; le champ où l'on tape reste le même élément, avec son curseur et le clavier ouvert.
  function rafraichir() {
    gabarit.innerHTML = contenu();
    const neuf = gabarit.content;
    for (const zone of [...neuf.querySelectorAll('[data-vivant]')]) {
      const ancienne = corps.querySelector(`[data-vivant="${CSS.escape(zone.dataset.vivant)}"]`);
      if (ancienne && !ancienne.contains(document.activeElement)) ancienne.replaceWith(zone);
    }
    for (const champ of corps.querySelectorAll('[aria-describedby]')) {
      const jumeau = neuf.querySelector(selecteurDe(champ));
      if (jumeau?.hasAttribute('aria-invalid')) champ.setAttribute('aria-invalid', 'true');
      else champ.removeAttribute('aria-invalid');
    }
    ombrer();
  }

  // Le premier champ en faute reçoit le focus (celui qu'un message décrit).
  function focaliserErreur() {
    const premier = corps.querySelector('.erreur-champ:not(:empty)');
    if (!premier) return;
    const decrit = [...corps.querySelectorAll('[aria-describedby]')].filter(el =>
      el.getAttribute('aria-describedby').split(' ').includes(premier.id),
    );
    (decrit.find(el => el.getAttribute('aria-invalid') === 'true') ?? decrit[0])?.focus();
  }

  function changer(cle) {
    ajuster(brouillon, cle);
    peindre();
  }

  async function sauver() {
    if (enregistrement) return;
    essaye = true;
    if (Object.keys(valider(brouillon)).length) {
      peindre();
      return focaliserErreur();
    }
    enregistrement = true;
    boutonEnregistrer.setAttribute('aria-disabled', 'true');
    try {
      await enregistrer(structuredClone(brouillon));
    } catch (erreur) {
      console.error(erreur);
      enregistrement = false;
      boutonEnregistrer.removeAttribute('aria-disabled');
      if (!signal.aborted && fenetre.isConnected) alerterEnHaut(dans, t('bibliotheque.erreurEnregistrement'), signal);
      return;
    }
    // Enregistrée : plus rien ne s'y écrit, elle se ferme (enregistrement reste vrai jusqu'au bout).
    fermer();
  }

  // Tout geste de fermeture passe ici. La question s'ouvre sans attendre : appelée par le retour
  // système, elle se pose au-dessus de la fiche (src/ecrans/fenetre.js). Pendant l'écriture, rien.
  function demanderFermeture() {
    if (questionOuverte || enregistrement) return;
    if (JSON.stringify(brouillon) === depart) return fermer();
    questionOuverte = true;
    demander({
      t,
      titre: t('modele.abandon.titre'),
      texte: texteAbandon,
      signal,
      boutons: [
        { cle: 'continuer', libelle: t('modele.abandon.continuer') },
        { cle: 'abandonner', libelle: t('modele.abandon.abandonner'), principal: true },
      ],
    }).then(reponse => {
      questionOuverte = false;
      if (reponse === 'abandonner') fermer();
    });
  }

  fenetre.addEventListener('input', ({ target }) => {
    const { texte, nombre } = target.dataset;
    if (texte) brouillon[texte] = target.value;
    else if (nombre) {
      brouillon[nombre] = lireNombre(target.value);
      // Ce qui est affiché est ce qui sera enregistré : « 12a » devient 12, « 0 » devient 1.
      target.value = brouillon[nombre] ?? '';
      ajuster(brouillon, nombre);
    } else return;
    rafraichir();
  });

  fenetre.addEventListener('change', ({ target }) => {
    const cle = target.dataset.choix;
    if (!cle) return;
    brouillon[cle] = { true: true, false: false }[target.value] ?? target.value;
    changer(cle);
  });

  fenetre.addEventListener('click', async evenement => {
    const commande = evenement.target.closest(COMMANDES);
    if (!commande || commande.getAttribute('aria-disabled') === 'true') return;
    const { pas, sens, bascule, pose, valeur, etiquette, action } = commande.dataset;
    if ('enregistrer' in commande.dataset) return sauver();
    if (pas) {
      brouillon[pas] = bornerQuantite((brouillon[pas] ?? 0) + Number(sens));
      changer(pas);
    } else if (bascule) {
      brouillon[bascule] = !brouillon[bascule];
      changer(bascule);
    } else if (pose) {
      brouillon[pose] = valeur;
      changer(pose);
    } else if (etiquette) {
      const choisies = new Set(brouillon.etiquettes);
      if (!choisies.delete(etiquette)) choisies.add(etiquette);
      brouillon.etiquettes = [...choisies];
      changer('etiquettes');
    } else if (actions[action]) {
      await actions[action](brouillon);
      if (fenetre.isConnected) changer(action);
    }
  });

  corps.addEventListener('scroll', ombrer);
  const tailles = new ResizeObserver(ombrer);
  tailles.observe(corps);

  corps.innerHTML = contenu();
  dans.append(fenetre);
  const effacer = () => {
    tailles.disconnect();
    fenetre.remove();
  };
  signal.addEventListener('abort', effacer, { once: true });
  fermer = ouvrirFenetre(fenetre, {
    fermerSurVoile: true,
    fermerAuRetour: true,
    surGeste: demanderFermeture,
    surFermeture: () => {
      signal.removeEventListener('abort', effacer);
      effacer();
      surFermeture();
    },
  });
  ombrer();
  // Le titre prend le focus : le lecteur d'écran dit d'abord ce qu'on modifie, et au doigt aucun
  // clavier ne surgit.
  fenetre.querySelector('h2').focus();
}
