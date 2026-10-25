// Écran Bibliothèque (#/bibliotheque), ouvert depuis Réglages (docs/PRD.md, US-2 à US-5 ; maquette
// validée le 2026-10-25, docs/maquettes/bibliotheque/) : les catégories de la bibliothèque et leurs
// objets modèles. Une colonne de cartes repliées à l'ouverture ; deux panneaux sur la tablette en
// paysage et l'ordinateur, la catégorie choisie à gauche et ses objets à droite. « Ranger les
// catégories » ouvre une liste compacte où ▲ et ▼ déplacent une catégorie d'une place.
// Ce fichier branche les gestes et le stockage ; le dessin est dans bibliotheque-vues.js. Les fiches
// (catégorie, objet, catalogue des pictos) arrivent avec la tâche suivante de la phase : leurs boutons
// sont déjà dessinés, sans effet.
import { remplir } from '../i18n/traduction.js';
import { deplacerCategorie } from '../modele/modeles.js';
import { alerterEnHaut } from './alerte.js';
import { vueBibliotheque } from './bibliotheque-vues.js';
import { DEUX_PANNEAUX, glisser, places } from './disposition.js';
import { poserGardeRetour } from './fenetre.js';
import { ouvrirMenu } from './menu.js';

// Déplacement d'une catégorie dans le rangement (maquette de la bibliothèque).
const GLISSEMENT = { duration: 220, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' };
const deuxPanneaux = matchMedia(DEUX_PANNEAUX);

// Ce que l'écran dessine, tiré de la bibliothèque lue : les catégories par rang, les objets de chacune
// par nom, le nom de chaque étiquette.
function preparer(bibliotheque, langue) {
  const parNom = (a, b) => a.nom.localeCompare(b.nom, langue);
  const rangees = [...bibliotheque.categories]
    .sort((a, b) => a.ordre - b.ordre)
    .map(categorie => ({
      categorie,
      objets: bibliotheque.objets.filter(o => o.categorieId === categorie.id).sort(parNom),
    }));
  return {
    rangees,
    etiquettes: new Map(bibliotheque.etiquettes.map(e => [e.id, e.nom])),
    nombreObjets: rangees.reduce((total, r) => total + r.objets.length, 0),
  };
}

// Les rangées dans l'ordre que le stockage vient de confirmer.
function reordonner(rangees, ids) {
  const parId = new Map(rangees.map(r => [r.categorie.id, r]));
  return ids.map(id => parId.get(id));
}

function ouvrirBibliotheque(app, bibliotheque, contexte) {
  const { stockage, t, langue } = contexte;
  app.innerHTML = '<main class="ecran"></main>';
  const main = app.firstElementChild;
  let donnees = preparer(bibliotheque, langue);
  const ui = {
    // Toutes repliées à l'ouverture : on voit d'un coup d'œil toute la bibliothèque.
    ouvertes: new Set(),
    choisie: donnees.rangees[0]?.categorie.id ?? null,
    ranger: false,
  };
  // La zone d'annonce du rangement : la même d'un dessin à l'autre (voir rangement() dans les vues).
  const annonce = document.createElement('p');
  annonce.className = 'lecteur';
  annonce.setAttribute('aria-live', 'polite');
  // L'ordre voulu, en avance sur l'ordre affiché tant que des écritures attendent : chaque appui part
  // de lui, pour que des appuis rapides s'additionnent. Les écritures passent une à une, dans l'ordre
  // des appuis ; l'écran ne montre que l'ordre que le stockage a confirmé. Après un échec, les
  // écritures d'avant (génération dépassée) sont abandonnées et les appuis attendent la relecture.
  let voulu = donnees.rangees.map(r => r.categorie.id);
  let file = Promise.resolve();
  let generation = 0;
  let relecture = false;
  // La garde du retour système pendant le rangement : le retour vaut « Terminé ». La poser et la
  // retirer touchent l'historique : chaque changement attend la fin du précédent.
  let garde = null;
  let gardeSuivie = Promise.resolve();
  // La fin de l'écran, quel que soit le chemin : plus rien ne touche la page.
  const fin = new AbortController();
  let choisieDessinee = ui.choisie;

  const trouverCommande = (action, id) =>
    main.querySelector(`[data-action="${action}"]${id ? `[data-id="${CSS.escape(id)}"]` : ''}`);

  // Chaque dessin suit la disposition du moment ; le focus reste sur la même commande (ou, la
  // disposition changée, sur la même catégorie), et chaque panneau garde son défilement, sauf le
  // détail d'une autre catégorie, qui se lit depuis son début.
  function peindre({ glissement = false } = {}) {
    const avant = glissement ? places(main) : null;
    const focus = document.activeElement?.closest('[data-action]');
    const cle = focus && main.contains(focus) && { action: focus.dataset.action, id: focus.dataset.id };
    const { classe, html } = vueBibliotheque({ ...contexte, ...donnees, ...ui, deuxPanneaux: deuxPanneaux.matches });
    const defilements = classe === main.className ? [...main.querySelectorAll('.panneau')].map(p => p.scrollTop) : [];
    main.className = classe;
    main.innerHTML = html;
    main.querySelectorAll('.panneau').forEach((p, i) => (p.scrollTop = defilements[i] ?? 0));
    if (ui.choisie !== choisieDessinee) main.querySelector('.panneau-droit')?.scrollTo(0, 0);
    choisieDessinee = ui.choisie;
    main.querySelector('[data-annonce]')?.replaceWith(annonce);
    if (cle)
      (
        trouverCommande(cle.action, cle.id) ??
        trouverCommande('accordeon', cle.id) ??
        trouverCommande('choisir', cle.id)
      )?.focus({ preventScroll: true });
    glisser(main, avant, GLISSEMENT);
  }

  // Vrai si l'écran est parti ; le constat suffit à tout arrêter.
  function parti() {
    if (!fin.signal.aborted && !main.isConnected) fin.abort();
    return fin.signal.aborted;
  }

  function surRetour() {
    // Consommée par ce retour : il n'y a plus rien à retirer.
    garde = null;
    terminer();
    return false;
  }

  function suivreGarde() {
    gardeSuivie = gardeSuivie.then(async () => {
      if (ui.ranger && !garde && !parti()) garde = poserGardeRetour({ surRetour });
      else if (!ui.ranger && garde) {
        const partante = garde;
        garde = null;
        await partante.retirer();
      }
    });
    return gardeSuivie;
  }

  function commencer() {
    ui.ranger = true;
    annonce.textContent = '';
    peindre();
    main.querySelector('.rangement-liste .bouton-icone:not([aria-disabled])')?.focus();
    suivreGarde();
  }

  function terminer() {
    ui.ranger = false;
    annonce.textContent = '';
    peindre();
    trouverCommande('ranger')?.focus();
    return suivreGarde();
  }

  // L'ordre confirmé par le stockage s'affiche ; la catégorie déplacée glisse à sa place et l'annonce
  // dit sa nouvelle place.
  function confirme(ids, id) {
    donnees = { ...donnees, rangees: reordonner(donnees.rangees, ids) };
    peindre({ glissement: true });
    const place = ids.indexOf(id);
    const { nom } = donnees.rangees[place].categorie;
    annonce.textContent = remplir(t('bibliotheque.place'), { nom, n: place + 1, total: ids.length });
    main.querySelector(`[data-flip="cat-${CSS.escape(id)}"]`)?.scrollIntoView({ block: 'nearest' });
  }

  // L'écriture refusée : on revient à ce que le stockage garde réellement, et on le dit.
  async function echec(erreur) {
    console.error(erreur);
    generation += 1;
    relecture = true;
    try {
      donnees = preparer(await stockage.lireBibliotheque(), langue);
    } catch (erreurDeLecture) {
      // Relecture impossible : l'écran garde l'ordre qu'il montre, le dernier confirmé.
      console.error(erreurDeLecture);
    } finally {
      relecture = false;
    }
    voulu = donnees.rangees.map(r => r.categorie.id);
    if (parti()) return;
    peindre();
    alerterEnHaut(app, t('bibliotheque.erreurOrdre'), fin.signal);
  }

  function deplacer(id, sens) {
    if (relecture) return;
    const ids = deplacerCategorie(voulu, id, sens);
    if (ids.every((x, i) => x === voulu[i])) return;
    voulu = ids;
    const sienne = generation;
    file = file
      .then(async () => {
        if (sienne !== generation || parti()) return;
        await stockage.rangerCategories(ids, new Date().toISOString());
        if (sienne === generation && !parti()) confirme(ids, id);
      })
      .catch(erreur => sienne === generation && echec(erreur))
      // Un échec qui échoue lui-même ne doit pas bloquer la file pour toujours.
      .catch(erreur => console.error(erreur));
  }

  // Quitter l'écran (menu, lien « Réglages ») pendant le rangement : on le termine d'abord, et son
  // étape d'historique part avant que l'écran suivant ne s'ouvre.
  async function sortirDuRangement() {
    if (ui.ranger) await terminer();
    else await gardeSuivie;
  }

  main.addEventListener('click', async evenement => {
    const commande = evenement.target.closest('[data-action]');
    if (!commande || commande.getAttribute('aria-disabled') === 'true') return;
    const { action, id } = commande.dataset;
    if (action === 'retour') {
      // Le lien reste un vrai lien (clavier) ; on le suit nous-mêmes, une fois le rangement terminé.
      evenement.preventDefault();
      await sortirDuRangement();
      if (!parti()) contexte.revenir(commande.getAttribute('href'));
    } else if (action === 'menu') {
      await sortirDuRangement();
      if (!parti()) ouvrirMenu(contexte, { courant: 'reglages' });
    } else if (action === 'accordeon') {
      if (!ui.ouvertes.delete(id)) ui.ouvertes.add(id);
      peindre();
    } else if (action === 'choisir') {
      ui.choisie = id;
      peindre();
    } else if (action === 'ranger') commencer();
    else if (action === 'terminer') terminer();
    else if (action === 'monter') deplacer(id, -1);
    else if (action === 'descendre') deplacer(id, 1);
  });
  deuxPanneaux.addEventListener(
    'change',
    () => {
      if (!parti()) peindre();
    },
    { signal: fin.signal },
  );
  const observateur = new MutationObserver(() => parti() && observateur.disconnect());
  observateur.observe(app, { childList: true });
  peindre();
}

export const ecranBibliotheque = {
  nom: 'bibliotheque',
  charger: ({ stockage }) => stockage.lireBibliotheque(),
  dessiner: ouvrirBibliotheque,
};
