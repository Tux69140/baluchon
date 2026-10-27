// Écran Nouveau voyage (#/nouveau-voyage) : l'assistant de création (US-9 à US-13). Informations (nom,
// destination, voyageurs, dates), puis un groupe d'étiquettes par étape, puis l'aperçu qu'on décoche
// avant « Créer le voyage », qui copie la bibliothèque dans le voyage et ouvre sa liste (docs/PRD.md,
// « Écrans et gestes » ; maquette validée le 2026-10-25, docs/maquettes/assistant/).
// Sur tablette et ordinateur, l'assistant s'ouvre en fenêtre modale par-dessus Mes voyages ; au
// téléphone, il occupe tout l'écran (décision du chef de projet, 2026-10-07). Le retour système ramène
// à l'étape précédente ; fermer l'assistant avec une saisie demande d'abord s'il faut l'abandonner.
// L'état (étapes, choix, objets écartés) vit dans src/ecrans/assistant.js, le dessin dans
// src/ecrans/assistant-vues.js.
import { dateDuJour } from '../modele/dates.js';
import { nouvelId } from '../modele/identifiant.js';
import { etiquettesChoisies, genererApercu } from '../modele/inclusion.js';
import { VOYAGEURS, genererVoyage, validerInformations } from '../modele/voyage.js';
import {
  allerA,
  basculerCategorie,
  basculerEtiquette,
  basculerObjet,
  creerAssistant,
  entrerDansApercu,
  etapesDe,
  idsDeCategorie,
  idsDeLApercu,
  raisonVide,
  remettre,
  reprendreEtapes,
  saisieCommencee,
  signatureDe,
} from './assistant.js';
import {
  ID_TITRE,
  resumeDates,
  signePuce,
  texteChoisies,
  vueApercu,
  vueAssistant,
  vueEcartes,
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
import { ecranVoyages } from './voyages.js';

// Les champs qui ont un message, dans l'ordre de l'écran : le premier en erreur reçoit le focus.
const CHAMPS = ['nom', 'dates'];
// Le choix se fait d'après le plus petit côté de l'écran de l'appareil, pas d'après la fenêtre : un
// téléphone tourné reste un téléphone, et un clavier qui s'ouvre (la fenêtre perd la moitié de sa
// hauteur) ne fait rien basculer (décision du contrôleur, 2026-10-07).
const COTE_MIN_FENETRE = 600;
// La fenêtre fermée, le focus revient au bouton de Mes voyages qui l'ouvre.
const OUVRE_LA_FENETRE = 'a[href="#/nouveau-voyage"]';

export const ecranNouveauVoyage = {
  nom: 'nouveau-voyage',
  // Mes voyages est chargé aussi : il se voit derrière la fenêtre.
  charger: async contexte => {
    const [bibliotheque, accueil] = await Promise.all([
      contexte.stockage.lireBibliotheque(),
      ecranVoyages.charger(contexte),
    ]);
    return { bibliotheque, accueil, aujourdhui: dateDuJour(new Date()) };
  },
  dessiner(app, { bibliotheque, accueil, aujourdhui }, contexte) {
    const { stockage, t, langue, remplacerAdresse, revenirAccueil } = contexte;
    // Une forme constante : une date absente vaut '' (signatureDe compare les informations d'un aperçu
    // à l'autre ; '' et undefined y feraient deux signatures).
    const infos = { nom: '', destination: '', depart: '', retour: '', voyageurs: VOYAGEURS.parDefaut };
    // Relues quand « Annuler » rend un élément de la bibliothèque (relireBibliotheque, plus bas).
    let etapes = etapesDe(bibliotheque);
    let derniere = etapes.length - 1;
    let etat = creerAssistant();
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
      ecranVoyages.dessiner(app, accueil, contexte);
      app.insertAdjacentHTML('beforeend', vueAssistant(t, { enFenetre }));
    } else app.innerHTML = vueAssistant(t, { enFenetre });
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
    const apercuCourant = () => genererApercu(bibliotheque, infos, etat.choisies);

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
      const grise = etat.etape === derniere && raisonVide(apercuCourant(), etat.ecartes) !== null;
      // Le bandeau d'une panne survit au repeint du pied : seuls son délai ou un nouvel essai l'ôtent.
      const alerte = pied.querySelector('.alerte');
      pied.innerHTML = vuePied(t, { indice: etat.etape, derniere, enFenetre, grise });
      if (alerte) pied.append(alerte);
      ombrerPied();
    }

    function peindreApercu() {
      panneau.innerHTML = vueApercu(t, langue, {
        apercu: apercuCourant(),
        ecartes: etat.ecartes,
        infos,
        etiquettes: etiquettesChoisies(bibliotheque, etat.choisies),
        // « Revenir aux étiquettes » : la première étape de groupe, ou Informations s'il n'y en a pas.
        revenir: derniere > 1 ? 1 : 0,
      });
      peindrePied();
    }

    // Un objet ou une catégorie touchés : l'aperçu se redessine sans bouger, la case garde le focus.
    function repeindreApercu(selecteur) {
      const [haut, page] = [panneau.scrollTop, window.scrollY];
      peindreApercu();
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
      const type = etapes[etat.etape].type;
      corps.dataset.etape = type === 'informations' ? 'infos' : type;
      peindreRangee({ doux: focus });
      if (type === 'groupe') {
        panneau.innerHTML = vueGroupe(t, langue, etapes[etat.etape], etat.choisies);
        peindrePied();
      } else if (type === 'apercu') peindreApercu();
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
      let aReconfirmer = [];
      if (indice === derniere)
        ({ etat, aReconfirmer } = entrerDansApercu(
          etat,
          signatureDe(infos, etat.choisies),
          idsDeLApercu(apercuCourant()),
        ));
      peindreEtape();
      if (aReconfirmer.length) demanderEcartes(aReconfirmer);
    }

    // Une question par-dessus l'assistant ; elle disparaît avec l'écran.
    async function poser(question) {
      questionOuverte = true;
      const reponse = await demander({ t, signal: fin.signal, ...question });
      questionOuverte = false;
      return reponse;
    }

    // Les objets écartés encore dans l'aperçu, après un changement de choix (docs/PRD.md, « Retour à
    // l'aperçu ») : les garder écartés est l'action principale, c'est la décision déjà prise ; Échap et
    // le retour système les gardent aussi.
    async function demanderEcartes(ids) {
      const nommes = new Set(ids);
      const objets = apercuCourant().flatMap(({ categorie, objets: lignes }) =>
        lignes
          .filter(({ objet }) => nommes.has(objet.id))
          .map(({ objet }) => ({ nom: objet.nom, categorie: categorie.nom })),
      );
      const reponse = await poser({
        titre: t('nouveauVoyage.ecartes.titre'),
        texte: t('nouveauVoyage.ecartes.texte'),
        contenu: vueEcartes(objets),
        boutons: [
          { cle: 'remettre', libelle: t('nouveauVoyage.ecartes.remettre') },
          { cle: 'garder', libelle: t('nouveauVoyage.ecartes.garder'), principal: true },
        ],
      });
      if (reponse !== 'remettre') return;
      etat = remettre(etat, ids);
      repeindreApercu('#titre-etape');
    }

    // Fermer pour de bon : la garde part d'abord (son étape d'historique ne survit pas à l'écran), puis
    // Mes voyages revient ; dans la fenêtre, le focus retourne au bouton qui l'a ouverte.
    async function quitter() {
      if (fini) return;
      fini = true;
      await suivreGarde();
      revenirAccueil(enFenetre ? { focus: OUVRE_LA_FENETRE } : {});
    }
    // Au téléphone, rien à effacer : on quitte. Dans la fenêtre, fermer() l'efface d'abord (plus bas).
    let fermer = quitter;

    // « × », Échap, « Annuler », le lien « Mes voyages » ou le retour système depuis Informations :
    // avec une saisie, « Abandonner ce nouveau voyage ? » d'abord. La question s'ouvre sans attendre :
    // appelée par la garde du retour, elle se pose au-dessus d'elle. Pendant l'enregistrement, rien :
    // le voyage est déjà en train d'être créé, l'abandonner n'aurait plus de sens.
    async function demanderFermeture() {
      if (questionOuverte || enregistrement) return;
      if (!saisieCommencee(infos, etat)) return fermer();
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
      else if (saisieCommencee(infos, etat)) demanderFermeture();
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
        const voulue = !fini && (etat.etape > 0 || saisieCommencee(infos, etat));
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

    async function creer() {
      // Un double appui ne crée jamais deux voyages ; rien de retenu, rien à créer.
      if (enregistrement || raisonVide(apercuCourant(), etat.ecartes)) return;
      enregistrement = true;
      retirerAlerte();
      try {
        const contenu = genererVoyage(
          bibliotheque,
          infos,
          { choisies: etat.choisies, ecartes: etat.ecartes },
          { nouvelId, maintenant: new Date().toISOString() },
        );
        await stockage.creerVoyage(contenu);
        // La garde part avant l'adresse : son retrait différé ramènerait sinon à l'assistant. Puis
        // remplacer l'adresse : le retour depuis la liste du voyage mène à Mes voyages, pas à l'assistant.
        fini = true;
        await suivreGarde();
        remplacerAdresse(`#/voyage/${contenu.voyage.id}`);
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
      aujourdhui,
      periode: { depart: null, retour: null },
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
      if (etat.etape === derniere) creer();
      else aller(etat.etape + 1);
    });

    racine.addEventListener('click', evenement => {
      const cible = evenement.target.closest(
        '[data-aller], [data-action], [data-etiquette], [data-objet], [data-categorie], [data-voyageurs]',
      );
      if (!cible) return;
      const { aller: indice, action, etiquette, objet, categorie, voyageurs } = cible.dataset;
      if (indice !== undefined && cible.getAttribute('aria-disabled') !== 'true') aller(Number(indice));
      else if (voyageurs) {
        const voulu = infos.voyageurs + Number(voyageurs);
        infos.voyageurs = Math.min(VOYAGEURS.max, Math.max(VOYAGEURS.min, voulu));
        rafraichirInfos();
      } else if (etiquette) basculerPuce(cible);
      else if (objet) {
        etat = basculerObjet(etat, objet);
        repeindreApercu(`[data-objet="${CSS.escape(objet)}"]`);
      } else if (categorie) {
        etat = basculerCategorie(etat, idsDeCategorie(apercuCourant().find(c => c.categorie.id === categorie)));
        repeindreApercu(`[data-categorie="${CSS.escape(categorie)}"]`);
      } else if (action === 'precedent') aller(etat.etape - 1);
      else if (action === 'apercu') aller(derniere);
      else if (action === 'fermer') demanderFermeture();
      else if (action === 'retour') {
        // Le lien « Mes voyages » du téléphone : l'écran le prend en charge (src/main.js).
        evenement.preventDefault();
        demanderFermeture();
      }
    });

    for (const zone of [corps, panneau]) zone.addEventListener('scroll', ombrerPied);
    for (const evenement of ['scroll', 'resize'])
      window.addEventListener(evenement, ombrerPied, { signal: fin.signal });
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
  },
};
