// Écran Bibliothèque (#/bibliotheque), ouvert depuis Réglages (docs/PRD.md, US-2 à US-5 ; maquette
// validée le 2026-10-25, docs/maquettes/bibliotheque/) : les catégories de la bibliothèque et leurs
// objets modèles. Une colonne de cartes repliées à l'ouverture ; deux panneaux sur la tablette en
// paysage et l'ordinateur, la catégorie choisie à gauche et ses objets à droite. « Ranger les
// catégories » ouvre une liste compacte où ▲ et ▼ déplacent une catégorie d'une place.
// Le crayon d'une catégorie, la ligne d'un objet, « Nouvelle catégorie » et « Ajouter un objet »
// ouvrent leur fiche (src/ecrans/edition-modeles.js) ; enregistrée, la bibliothèque est relue et ce qui
// vient de changer s'éclaire ; supprimée (phase 7), elle est relue, et si la catégorie choisie est
// partie, la première qui reste l'est à sa place.
// Ce fichier branche les gestes et le stockage ; le dessin est dans bibliotheque-vues.js.
import { remplir } from '../i18n/traduction.js';
import { alerterEnHaut } from './alerte.js';
import { vueBibliotheque } from './bibliotheque-vues.js';
import { DEUX_PANNEAUX, glisser, places } from './disposition.js';
import { editerCategorie, editerObjet } from './edition-modeles.js';
import { creerFileOrdre } from './file-ordre.js';
import { GLISSEMENT, creerModeRangement, suivreFin } from './mode-rangement.js';

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

// Les rangées dans l'ordre que le stockage vient de confirmer (une catégorie partie entre-temps n'y est
// plus).
function reordonner(rangees, ids) {
  const parId = new Map(rangees.map(r => [r.categorie.id, r]));
  return ids.map(id => parId.get(id)).filter(Boolean);
}

function ouvrirBibliotheque(app, bibliotheque, contexte) {
  const { stockage, t, langue } = contexte;
  app.innerHTML = '<main class="ecran"></main>';
  const main = app.firstElementChild;
  // La bibliothèque telle que le stockage la garde (les fiches en partent), et ce que l'écran en tire.
  let lue = bibliotheque;
  let donnees = preparer(lue, langue);
  const ui = {
    // Toutes repliées à l'ouverture : on voit d'un coup d'œil toute la bibliothèque.
    ouvertes: new Set(),
    choisie: donnees.rangees[0]?.categorie.id ?? null,
    ranger: false,
    // Ce qui vient d'être enregistré, éclairé au prochain dessin seulement.
    recent: null,
  };
  // La fin de l'écran, quel que soit le chemin : plus rien ne touche la page.
  const fin = suivreFin(app, main);
  const { parti } = fin;
  // « Ranger les catégories », la touche retour qui le termine, le lien de retour et le menu.
  const mode = creerModeRangement({
    main,
    ui,
    peindre,
    premier: '.rangement-liste .bouton-icone:not([aria-disabled])',
    parti,
    contexte,
  });
  const { annonce } = mode;
  let choisieDessinee = ui.choisie;

  const trouverCommande = (action, id) =>
    main.querySelector(`[data-action="${action}"]${id ? `[data-id="${CSS.escape(id)}"]` : ''}`);

  // Chaque dessin suit la disposition du moment ; le focus reste sur la même commande (ou, la
  // disposition changée, sur la même catégorie), et chaque panneau garde son défilement, sauf le
  // détail d'une autre catégorie, qui se lit depuis son début. enVue : ce qu'il faut amener dans la
  // vue, avant le glissement : un élément qui glisse est mesuré à son ancienne place, et la page ne
  // défilerait pas pour le montrer à la nouvelle.
  function peindre({ glissement = false, enVue = null } = {}) {
    const avant = glissement ? places(main) : null;
    const focus = document.activeElement?.closest('[data-action]');
    const cle = focus && main.contains(focus) && { action: focus.dataset.action, id: focus.dataset.id };
    const { classe, html } = vueBibliotheque({ ...contexte, ...donnees, ...ui, deuxPanneaux: deuxPanneaux.matches });
    ui.recent = null;
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
    if (enVue) main.querySelector(enVue)?.scrollIntoView({ block: 'nearest' });
    glisser(main, avant, GLISSEMENT);
  }

  // L'ordre confirmé par le stockage s'affiche ; la catégorie déplacée glisse à sa place et l'annonce
  // dit sa nouvelle place.
  function confirme(_cle, ids, id) {
    donnees = { ...donnees, rangees: reordonner(donnees.rangees, ids) };
    // La copie lue suit le rang confirmé : les fiches en partent.
    lue = { ...lue, categories: lue.categories.map(c => ({ ...c, ordre: ids.indexOf(c.id) })) };
    peindre({ glissement: true, enVue: `[data-flip="cat-${CSS.escape(id)}"]` });
    const place = ids.indexOf(id);
    // Partie entre l'appui et la confirmation : rien à annoncer.
    const deplacee = donnees.rangees.find(r => r.categorie.id === id);
    if (deplacee)
      annonce.textContent = remplir(t('bibliotheque.place'), {
        nom: deplacee.categorie.nom,
        n: place + 1,
        total: ids.length,
      });
  }

  // L'écriture refusée : on revient à ce que le stockage garde réellement, et on le dit.
  async function echec() {
    try {
      lue = await stockage.lireBibliotheque();
      donnees = preparer(lue, langue);
    } catch (erreurDeLecture) {
      // Relecture impossible : l'écran garde l'ordre qu'il montre, le dernier confirmé.
      console.error(erreurDeLecture);
    }
    ordre.definir('categories', idsAffiches());
    if (parti()) return;
    peindre();
    alerterEnHaut(app, t('bibliotheque.erreurOrdre'), fin.signal);
  }

  // Les déplacements ▲ ▼ (src/ecrans/file-ordre.js) : une seule liste ici, les catégories.
  const idsAffiches = () => donnees.rangees.map(r => r.categorie.id);
  const ordre = creerFileOrdre({
    ecrire: (_cle, ids) => stockage.rangerCategories(ids, new Date().toISOString()),
    confirme,
    echec,
    parti,
  });
  ordre.definir('categories', idsAffiches());

  // ---------- Fiches ----------
  // Ce qui reprend le focus quand une fiche se ferme : la commande qui l'a ouverte, ou ce qu'elle
  // vient d'enregistrer ; redessinée entre-temps, on la retrouve par son action et son id.
  let aFocaliser = null;
  function rendreFocus() {
    if (!aFocaliser || parti()) return;
    const { action, id } = aFocaliser;
    (trouverCommande(action, id) ?? trouverCommande('accordeon', id) ?? trouverCommande('choisir', id))?.focus({
      preventScroll: true,
    });
  }

  // Après une écriture : la bibliothèque relue, redessinée, et recent (« cat-<id> », l'id d'un objet,
  // ou null après une suppression) éclairé et amené dans la vue. La catégorie choisie partie, la
  // première qui reste l'est à sa place (aucune s'il n'en reste pas). Une relecture impossible laisse
  // l'écran tel qu'il était : l'écriture, elle, a réussi, la fiche se ferme.
  async function relire(recent) {
    try {
      lue = await stockage.lireBibliotheque();
    } catch (erreur) {
      console.error(erreur);
      return;
    }
    donnees = preparer(lue, langue);
    if (!donnees.rangees.some(r => r.categorie.id === ui.choisie))
      ui.choisie = donnees.rangees[0]?.categorie.id ?? null;
    // L'ordre voulu garde ses déplacements en attente, et reçoit en dernier une catégorie neuve.
    ordre.definir('categories', idsAffiches());
    if (parti()) return;
    ui.recent = recent;
    let enVue = null;
    if (recent) enVue = recent.startsWith('cat-') ? `[data-flip="${CSS.escape(recent)}"]` : commandeObjet(recent);
    peindre({ enVue });
  }
  const commandeObjet = id => `[data-action="modifier-objet"][data-id="${CSS.escape(id)}"]`;

  // Une écriture faite depuis une fiche. Supprimé, le focus revient à ce qui reste de plus proche :
  // « Ajouter un objet » de la même catégorie, ou la première catégorie, ou « Nouvelle catégorie ».
  async function apresEcriture({ cible, neuve, supprimee }) {
    const { type, id } = cible;
    if (supprimee) {
      const categorieId = type === 'objet' ? lue.objets.find(o => o.id === id)?.categorieId : null;
      await relire(null);
      const premiere = donnees.rangees[0]?.categorie.id;
      if (categorieId) aFocaliser = { action: 'nouvel-objet', id: categorieId };
      else aFocaliser = premiere ? { action: 'accordeon', id: premiere } : { action: 'nouvelle-categorie' };
    } else if (type === 'categorie') {
      // Neuve : dépliée (une colonne) et choisie (deux panneaux), pour qu'on y ajoute ses objets.
      if (neuve) {
        ui.ouvertes.add(id);
        ui.choisie = id;
        aFocaliser = { action: 'accordeon', id };
      }
      await relire(`cat-${id}`);
    } else {
      aFocaliser = { action: 'modifier-objet', id };
      await relire(id);
    }
  }

  const commun = () => ({
    t,
    langue,
    stockage,
    bibliotheque: lue,
    signal: fin.signal,
    dans: app,
    surFermeture: rendreFocus,
    apresEcriture,
  });

  function ouvrirCategorie(existante) {
    aFocaliser = existante ? { action: 'modifier-categorie', id: existante.id } : { action: 'nouvelle-categorie' };
    editerCategorie({
      ...commun(),
      categorie: existante,
      nombreObjets: donnees.rangees.find(r => r.categorie.id === existante?.id)?.objets.length ?? 0,
    });
  }

  function ouvrirObjet(existant, categorieId) {
    const categorie = lue.categories.find(c => c.id === (existant?.categorieId ?? categorieId));
    if (!categorie) return;
    aFocaliser = existant
      ? { action: 'modifier-objet', id: existant.id }
      : { action: 'nouvel-objet', id: categorie.id };
    editerObjet({ ...commun(), objet: existant, categorie });
  }

  main.addEventListener('click', evenement => {
    const commande = evenement.target.closest('[data-action]');
    if (!commande || commande.getAttribute('aria-disabled') === 'true' || mode.gerer(evenement, commande)) return;
    const { action, id } = commande.dataset;
    if (action === 'accordeon') {
      if (!ui.ouvertes.delete(id)) ui.ouvertes.add(id);
      peindre();
    } else if (action === 'choisir') {
      ui.choisie = id;
      peindre();
    } else if (action === 'monter') ordre.deplacer('categories', id, -1);
    else if (action === 'descendre') ordre.deplacer('categories', id, 1);
    else if (action === 'modifier-categorie') {
      const categorie = lue.categories.find(c => c.id === id);
      if (categorie) ouvrirCategorie(categorie);
    } else if (action === 'nouvelle-categorie') ouvrirCategorie(null);
    else if (action === 'modifier-objet') {
      const objet = lue.objets.find(o => o.id === id);
      if (objet) ouvrirObjet(objet);
    } else if (action === 'nouvel-objet') ouvrirObjet(null, id);
  });
  deuxPanneaux.addEventListener(
    'change',
    () => {
      if (!parti()) peindre();
    },
    { signal: fin.signal },
  );
  peindre();
}

export const ecranBibliotheque = {
  nom: 'bibliotheque',
  charger: ({ stockage }) => stockage.lireBibliotheque(),
  dessiner: ouvrirBibliotheque,
};
