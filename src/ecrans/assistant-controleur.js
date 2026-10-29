// Le moteur de l'assistant (US-9 à US-13), commun à « Nouveau voyage » (src/ecrans/nouveau-voyage.js) et à
// « Modifier le voyage » (phase 10) : Informations (nom, destination, voyageurs, dates), puis un groupe
// d'étiquettes par étape, puis une dernière étape que le mode dessine (l'aperçu qu'on décoche, ou les
// changements d'un voyage). Sur tablette et ordinateur, l'assistant s'ouvre en fenêtre modale par-dessus
// l'écran d'où il part (mode.fond) ; au téléphone, il occupe tout l'écran (décision du chef de projet,
// 2026-10-07). Le retour système ramène à l'étape précédente ; fermer l'assistant avec une saisie demande
// d'abord s'il faut l'abandonner. L'état (étapes, choix) vit dans src/ecrans/assistant.js, le dessin dans
// src/ecrans/assistant-vues.js.
//
// mode : { t (les textes, en partie remplacés : facultatif), infos (mutées par la saisie), etat (celui de
// creerAssistant), bibliotheque, aujourdhui, retour (le lien du haut au téléphone : facultatif), fond(app),
// saisieCommencee(infos, etat), quitter({ enFenetre }), terminer(outils) → adresse ou null,
// apresTerminer() (facultatif), derniere: { vue(outils) → HTML, grise(outils), entrer(outils) → suite ou
// 'terminer' ou null, clic(cible, outils) → true si pris en charge } } ; outils : voir plus bas.
import { VOYAGEURS, validerInformations } from '../modele/voyage.js';
import { allerA, basculerEtiquette, etapesDe, reprendreEtapes } from './assistant.js';
import {
  ID_TITRE,
  resumeDates,
  signePuce,
  texteChoisies,
  vueAssistant,
  vueEtapes,
  vueGroupe,
  vuePied,
} from './assistant-vues.js';
import { DUREE_ALERTE } from './alerte.js';
import { creerCalendrier } from './calendrier.js';
import { demander, ouvrirFenetre, poserGardeRetour } from './fenetre.js';
import { iconeInterface } from './icones.js';
import { suivreRangee } from './rangee-etapes.js';
import { vueAlerte } from './voyage-vues.js';

// Les champs qui ont un message, dans l'ordre de l'écran : le premier en erreur reçoit le focus.
const CHAMPS = ['nom', 'dates'];
// Le choix se fait d'après le plus petit côté de l'écran de l'appareil, pas d'après la fenêtre : un
// téléphone tourné reste un téléphone, et un clavier qui s'ouvre (la fenêtre perd la moitié de sa
// hauteur) ne fait rien basculer (décision du contrôleur, 2026-10-07).
const COTE_MIN_FENETRE = 600;

export function ouvrirAssistant(app, contexte, mode) {
  const { stockage, langue, remplacerAdresse } = contexte;
  // Les textes de l'assistant, que le mode peut remplacer en partie (« Modifier le voyage »…).
  const t = mode.t ?? contexte.t;
  const { infos } = mode;
  let { bibliotheque } = mode;
  // Relues quand « Annuler » rend un élément de la bibliothèque (relireBibliotheque, plus bas).
  let etapes = etapesDe(bibliotheque);
  let derniere = etapes.length - 1;
  let etat = mode.etat;
  // Les messages n'apparaissent qu'après un premier essai, puis suivent chaque correction.
  let essaye = false;
  let enregistrement = false;
  let minuterieAlerte = null;
  // Une question est posée par-dessus (abandon, objets écartés) : un second geste n'en pose pas d'autre.
  let questionOuverte = false;
  // La garde du retour système (suivreGarde, plus bas), et la file de ses poses et retraits ; fini :
  // l'assistant se ferme, ou le voyage est créé, plus de garde.
  let garde = null;
  let gardeSuivie = Promise.resolve();
  let fini = false;
  const enFenetre = Math.min(screen.width, screen.height) >= COTE_MIN_FENETRE;
  if (enFenetre) {
    mode.fond(app);
    app.insertAdjacentHTML('beforeend', vueAssistant(t, { enFenetre, retour: mode.retour }));
  } else app.innerHTML = vueAssistant(t, { enFenetre, retour: mode.retour });
  const racine = app.querySelector(enFenetre ? 'dialog' : 'main');
  racine.classList.add('assistant');
  const element = selecteur => racine.querySelector(selecteur);
  const [rangee, formulaire, corps, panneau, pied] = [
    '.etapes',
    'form',
    '.formulaire-corps',
    '.etape-panneau',
    '.formulaire-pied',
  ].map(element);
  // La fin de l'écran, quel que soit le chemin (lien, retour, voyage créé) : plus rien ne l'écoute.
  const fin = new AbortController();
  const observateur = new MutationObserver(() => {
    if (racine.isConnected) return;
    fin.abort();
    observateur.disconnect();
  });
  observateur.observe(app, { childList: true });

  const infosValides = () => !Object.keys(validerInformations(infos)).length;
  // Ce que le mode reçoit pour sa dernière étape : l'état, de quoi le changer et redessiner, poser une
  // question par-dessus l'assistant ; fin : l'écran s'en va.
  const outils = () => ({
    infos,
    etat,
    bibliotheque,
    changerEtat: nouveau => (etat = nouveau),
    repeindre: repeindreDerniere,
    poser,
    signal: fin.signal,
    derniere,
  });

  // Le champ que décrit un message est dit invalide au lecteur d'écran tant que le message est là.
  const message = (id, code) => {
    element(`#erreur-${id}`).innerHTML = code
      ? `${iconeInterface('erreur')}<span>${t(`nouveauVoyage.erreurs.${code}`)}</span>`
      : '';
    const champ = element(`[aria-describedby~="erreur-${id}"]`);
    if (code) champ?.setAttribute('aria-invalid', 'true');
    else champ?.removeAttribute('aria-invalid');
  };

  // L'aperçu devient touchable dans la rangée dès que les informations sont valides. Trop d'étapes
  // pour la largeur : la rangée défile, l'étape en cours glisse au milieu (doux : changement d'étape).
  const suiviRangee = suivreRangee(rangee, { signal: fin.signal });
  const peindreRangee = ({ doux = false } = {}) => {
    rangee.innerHTML = vueEtapes(t, etapes, etat, infosValides());
    suiviRangee.centrer(etat.etape, { doux });
  };

  function rafraichirInfos() {
    element('#resume-dates').textContent = resumeDates(infos, t, langue);
    element('.compteur-valeur').textContent = infos.voyageurs;
    element('[data-voyageurs="-1"]').setAttribute('aria-disabled', infos.voyageurs <= VOYAGEURS.min);
    element('[data-voyageurs="1"]').setAttribute('aria-disabled', infos.voyageurs >= VOYAGEURS.max);
    peindreRangee();
    suivreGarde();
    if (!essaye) return;
    const erreurs = validerInformations(infos);
    for (const champ of CHAMPS) message(champ, erreurs[champ]);
  }

  // Du contenu continue sous le pied (la page au téléphone, sinon le corps ou le panneau de la
  // fenêtre) : le pied porte une ombre, qui dit qu'il reste à faire défiler (chef de projet, 2026-10-25).
  function ombrerPied() {
    const zone = !enFenetre ? document.scrollingElement : etat.etape ? panneau : corps;
    pied.toggleAttribute('data-dessous', zone.scrollHeight - zone.scrollTop - zone.clientHeight > 1);
  }

  function peindrePied() {
    const grise = etat.etape === derniere && mode.derniere.grise(outils());
    // Le bandeau d'une panne survit au repeint du pied : seuls son délai ou un nouvel essai l'ôtent.
    const alerte = pied.querySelector('.alerte');
    pied.innerHTML = vuePied(t, { indice: etat.etape, derniere, enFenetre, grise });
    if (alerte) pied.append(alerte);
    ombrerPied();
  }

  // La dernière étape (l'aperçu, ou les changements d'un voyage) : le mode la dessine.
  function peindreDerniere() {
    panneau.innerHTML = mode.derniere.vue(outils());
    peindrePied();
  }

  // Une case touchée dans la dernière étape : elle se redessine sans bouger, la case garde le focus.
  function repeindreDerniere(selecteur) {
    const [haut, page] = [panneau.scrollTop, window.scrollY];
    peindreDerniere();
    panneau.scrollTop = haut;
    window.scrollTo(0, page);
    element(selecteur)?.focus();
  }

  // Le focus à l'étape Informations : le nom à la souris ; au doigt, le titre, car le clavier
  // surgirait et masquerait aussitôt le calendrier.
  function focaliserInformations() {
    (matchMedia('(pointer: fine)').matches ? element('#nom') : element(`#${ID_TITRE}`))?.focus({
      preventScroll: true,
    });
  }

  // focus : le titre de l'étape (ou le premier champ) reçoit le focus, et l'étape entre en fondu ;
  // pas au premier dessin, où la fenêtre n'est pas encore ouverte.
  function peindreEtape({ focus = true } = {}) {
    const indice = etat.etape;
    const type = etapes[indice].type;
    corps.dataset.etape = type === 'informations' ? 'infos' : type;
    peindreRangee({ doux: focus });
    if (type === 'groupe') {
      panneau.innerHTML = vueGroupe(t, langue, etapes[etat.etape], etat.choisies);
      peindrePied();
    } else if (indice === derniere) peindreDerniere();
    else {
      panneau.innerHTML = '';
      peindrePied();
    }
    corps.scrollTop = 0;
    panneau.scrollTop = 0;
    ombrerPied();
    if (!focus) return;
    // Fondu et légère montée de l'étape qui arrive (assistant.css) : la classe est reposée pour rejouer.
    corps.classList.remove('entree');
    void corps.offsetWidth;
    corps.classList.add('entree');
    if (!enFenetre) window.scrollTo(0, 0);
    if (etat.etape) element('#titre-etape').focus({ preventScroll: true });
    else focaliserInformations();
  }

  function focaliserErreur() {
    const erreurs = validerInformations(infos);
    const premier = CHAMPS.find(champ => erreurs[champ]);
    if (premier === 'nom') element('#nom').focus();
    if (premier === 'dates') element('.jour[tabindex="0"]').focus();
  }

  // Le seul chemin d'une étape à l'autre (Suivant, Précédent, rangée, « Voir l'aperçu ») : au-delà
  // d'Informations, les informations doivent être valides, sinon on y revient, messages affichés.
  function aller(indice) {
    if (indice === etat.etape || indice < 0 || indice > derniere) return;
    if (indice > 0 && !infosValides()) {
      essaye = true;
      if (etat.etape) {
        etat = allerA(etat, 0);
        peindreEtape();
      }
      rafraichirInfos();
      return focaliserErreur();
    }
    etat = allerA(etat, indice);
    suivreGarde();
    // En entrant dans la dernière étape, le mode reprend l'état (objets écartés à reconfirmer…) et peut
    // demander une suite : une question, ou terminer aussitôt (rien à montrer).
    const suite = indice === derniere ? mode.derniere.entrer(outils()) : null;
    if (suite === 'terminer') return terminer();
    peindreEtape();
    suite?.();
  }

  // Une question par-dessus l'assistant ; elle disparaît avec l'écran.
  async function poser(question) {
    questionOuverte = true;
    const reponse = await demander({ t, signal: fin.signal, ...question });
    questionOuverte = false;
    return reponse;
  }

  // Fermer pour de bon : la garde part d'abord (son étape d'historique ne survit pas à l'écran), puis
  // Mes voyages revient ; dans la fenêtre, le focus retourne au bouton qui l'a ouverte.
  async function quitter() {
    if (fini) return;
    fini = true;
    await suivreGarde();
    mode.quitter({ enFenetre });
  }
  // Au téléphone, rien à effacer : on quitte. Dans la fenêtre, fermer() l'efface d'abord (plus bas).
  let fermer = quitter;

  // « × », Échap, « Annuler », le lien « Mes voyages » ou le retour système depuis Informations :
  // avec une saisie, « Abandonner ce nouveau voyage ? » d'abord. La question s'ouvre sans attendre :
  // appelée par la garde du retour, elle se pose au-dessus d'elle. Pendant l'enregistrement, rien :
  // le voyage est déjà en train d'être créé, l'abandonner n'aurait plus de sens.
  async function demanderFermeture() {
    if (questionOuverte || enregistrement) return;
    if (!mode.saisieCommencee(infos, etat)) return fermer();
    const reponse = await poser({
      titre: t('nouveauVoyage.abandon.titre'),
      texte: t('nouveauVoyage.abandon.texte'),
      boutons: [
        { cle: 'continuer', libelle: t('nouveauVoyage.abandon.continuer') },
        { cle: 'abandonner', libelle: t('nouveauVoyage.abandon.abandonner'), principal: true },
      ],
    });
    if (reponse === 'abandonner') fermer();
  }

  // Le retour système (docs/PRD.md, « Assistant ») : l'étape précédente ; depuis Informations, la
  // question d'abandon. Rend true tant que la garde doit rester. Pendant l'enregistrement du voyage,
  // il ne fait rien : l'écran s'en va de lui-même.
  function surRetour() {
    if (enregistrement) return true;
    if (etat.etape > 0) aller(etat.etape - 1);
    else if (mode.saisieCommencee(infos, etat)) demanderFermeture();
    else {
      // Défensif, non exercé par les tests : une garde encore posée alors que plus rien n'est à
      // perdre ne se voit que si son retrait attend dans la file de suivreGarde (saisie effacée
      // pendant qu'une pose précédente s'achève). Elle est consommée, l'assistant se ferme.
      garde = null;
      fermer();
      return false;
    }
    return true;
  }

  // La garde détourne le retour système tant qu'il y a quelque chose à perdre : une étape au-delà
  // d'Informations ou une saisie commencée ; sans elle, le retour ferme l'assistant comme en phase 2.
  // Poser et retirer la garde touchent l'historique : chaque changement attend la fin du précédent,
  // et aucun retrait n'a lieu sous une question ouverte (rien ne change pendant qu'elle est posée).
  function suivreGarde() {
    gardeSuivie = gardeSuivie.then(async () => {
      const voulue = !fini && (etat.etape > 0 || mode.saisieCommencee(infos, etat));
      if (voulue && !garde) garde = poserGardeRetour({ surRetour });
      else if (!voulue && garde) {
        const partante = garde;
        garde = null;
        await partante.retirer();
      }
    });
    return gardeSuivie;
  }

  function retirerAlerte() {
    clearTimeout(minuterieAlerte);
    pied.querySelector('.alerte')?.remove();
  }

  // Comme sur l'écran d'un voyage : un bandeau en bas, par-dessus, qui ne pousse rien. Il se pose
  // juste au-dessus des boutons du pied, pour ne jamais cacher « Créer le voyage ».
  function alerter(texte) {
    retirerAlerte();
    pied.insertAdjacentHTML('beforeend', vueAlerte(texte));
    const alerte = pied.lastElementChild;
    minuterieAlerte = setTimeout(() => alerte.remove(), DUREE_ALERTE);
  }

  // « Créer le voyage », « Appliquer les changements » : le mode écrit et rend l'adresse où aller (null :
  // rien à écrire). Un double appui n'écrit jamais deux fois. Écrit, la garde part avant l'adresse (son
  // retrait différé ramènerait sinon à l'assistant), puis l'adresse est remplacée : le retour depuis
  // l'écran d'arrivée ne ramène pas à l'assistant. Refusé, le message de panne, et un nouvel appui réessaie.
  async function terminer() {
    if (enregistrement || mode.derniere.grise(outils())) return;
    enregistrement = true;
    retirerAlerte();
    try {
      const adresse = await mode.terminer(outils());
      if (adresse === null) {
        enregistrement = false;
        return;
      }
      fini = true;
      await suivreGarde();
      await remplacerAdresse(adresse);
      mode.apresTerminer?.();
    } catch (erreur) {
      console.error(erreur);
      if (!fin.signal.aborted) alerter(t('nouveauVoyage.erreurs.enregistrement'));
      enregistrement = false;
    }
  }

  // « Annuler » du bandeau pendant l'assistant (src/ecrans/annulation.js) : la bibliothèque relue,
  // l'élément revenu se voit dans l'étape en cours (une étape de groupe revient dans la rangée), sans
  // rien perdre des réponses déjà données ni bouger. Pendant la création du voyage, rien : il est
  // déjà en train d'être copié.
  async function relireBibliotheque() {
    let relue;
    try {
      relue = await stockage.lireBibliotheque();
    } catch (erreur) {
      console.error(erreur);
      return;
    }
    if (fin.signal.aborted || enregistrement) return;
    const nouvelles = etapesDe(relue);
    etat = reprendreEtapes(etat, etapes, nouvelles);
    [bibliotheque, etapes, derniere] = [relue, nouvelles, nouvelles.length - 1];
    const hauts = [corps.scrollTop, panneau.scrollTop, window.scrollY];
    peindreEtape({ focus: false });
    [corps.scrollTop, panneau.scrollTop] = hauts;
    window.scrollTo(0, hauts[2]);
  }
  window.addEventListener('bibliotheque-retablie', relireBibliotheque, { signal: fin.signal });

  function basculerPuce(puce) {
    etat = basculerEtiquette(etat, puce.dataset.etiquette);
    const choisie = etat.choisies.has(puce.dataset.etiquette);
    puce.setAttribute('aria-pressed', choisie);
    puce.querySelector('.puce-signe').innerHTML = signePuce(choisie);
    const n = etapes[etat.etape].etiquettes.filter(e => etat.choisies.has(e.id)).length;
    element('.etape-compte').textContent = texteChoisies(t, n, langue);
    suivreGarde();
  }

  creerCalendrier(element('.calendrier'), {
    t,
    langue,
    aujourdhui: mode.aujourdhui,
    periode: { depart: infos.depart || null, retour: infos.retour || null },
    auChangement({ depart, retour }) {
      Object.assign(infos, { depart: depart ?? '', retour: retour ?? '' });
      rafraichirInfos();
    },
  });

  formulaire.addEventListener('input', ({ target }) => {
    if (target.name !== 'nom' && target.name !== 'destination') return;
    infos[target.name] = target.value;
    rafraichirInfos();
  });

  // Entrée dans un champ, « Suivant », « Voir l'aperçu » en dernier, « Créer le voyage ».
  formulaire.addEventListener('submit', evenement => {
    evenement.preventDefault();
    if (etat.etape === derniere) terminer();
    else aller(etat.etape + 1);
  });

  racine.addEventListener('click', evenement => {
    // Les cases de la dernière étape sont au mode (objets de l'aperçu, changements).
    if (etat.etape === derniere && mode.derniere.clic(evenement.target, outils())) return;
    const cible = evenement.target.closest('[data-aller], [data-action], [data-etiquette], [data-voyageurs]');
    if (!cible) return;
    const { aller: indice, action, etiquette, voyageurs } = cible.dataset;
    if (indice !== undefined && cible.getAttribute('aria-disabled') !== 'true') aller(Number(indice));
    else if (voyageurs) {
      const voulu = infos.voyageurs + Number(voyageurs);
      infos.voyageurs = Math.min(VOYAGEURS.max, Math.max(VOYAGEURS.min, voulu));
      rafraichirInfos();
    } else if (etiquette) basculerPuce(cible);
    else if (action === 'precedent') aller(etat.etape - 1);
    else if (action === 'apercu') aller(derniere);
    else if (action === 'fermer') demanderFermeture();
    else if (action === 'retour') {
      // Le lien « Mes voyages » du téléphone : l'écran le prend en charge (src/main.js).
      evenement.preventDefault();
      demanderFermeture();
    }
  });

  for (const zone of [corps, panneau]) zone.addEventListener('scroll', ombrerPied);
  for (const evenement of ['scroll', 'resize']) window.addEventListener(evenement, ombrerPied, { signal: fin.signal });
  // Ce qui reste à défiler change aussi sans défilement : mois de cinq ou six semaines, fenêtre qui
  // rapetisse (barres système, clavier).
  const tailles = new ResizeObserver(ombrerPied);
  for (const zone of [corps, element('.calendrier')]) tailles.observe(zone);
  fin.signal.addEventListener('abort', () => tailles.disconnect());

  rafraichirInfos();
  peindreEtape({ focus: false });

  // « Annuler », « × » et Échap posent d'abord la question quand quelque chose est saisi, comme le lien
  // « Mes voyages ». À l'ouverture, le focus va au nom à la souris ; au doigt, au titre.
  if (!enFenetre) return;
  fermer = ouvrirFenetre(racine, { surFermeture: quitter, surGeste: demanderFermeture });
  focaliserInformations();
  ombrerPied();
}
