// Écran Bibliothèque (#/bibliotheque), ouvert depuis Réglages (docs/PRD.md, US-2 à US-5 ; maquette
// validée le 2026-10-25, docs/maquettes/bibliotheque/ ; grand écran le 2026-10-27,
// docs/maquettes/grand-ecran/) : les catégories de la bibliothèque et leurs objets modèles. Au
// téléphone, une colonne de cartes repliées à l'ouverture ; dès 600 px de petit côté (tablettes,
// ordinateur), la même disposition que l'écran d'un voyage : la Bibliothèque, le menu des catégories
// et les objets de la choisie, en trois colonnes dès 1340 px de large, sinon les catégories en tuiles
// et la liste dessous (le « repli »). « Ranger les catégories » ouvre une liste compacte où ▲ et ▼
// déplacent une catégorie d'une place ; en grand format, elle prend la place du menu.
// Le crayon d'une catégorie, la ligne d'un objet, « Nouvelle catégorie » et « Ajouter un objet »
// ouvrent leur fiche (src/ecrans/edition-modeles.js) ; enregistrée, la bibliothèque est relue et ce qui
// vient de changer s'éclaire ; supprimée (phase 7), elle est relue, et si la catégorie choisie est
// partie, la première qui reste l'est à sa place ; rétablie par « Annuler », elle revient éclairée.
// Ce fichier branche les gestes et le stockage ; le dessin est dans bibliotheque-vues.js.
import { remplir } from '../i18n/traduction.js';
import { alerterEnHaut } from './alerte.js';
import { vueBibliotheque } from './bibliotheque-vues.js';
import { allerALaListe, suivreDisposition } from './disposition.js';
import { editerCategorie, editerObjet } from './edition-modeles.js';
import { creerFileOrdre } from './file-ordre.js';
import { GLISSEMENT, creerModeRangement, suivreFin } from './mode-rangement.js';

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

  // Chaque dessin suit la disposition du moment (src/ecrans/disposition.js) : tourner l'appareil ou
  // élargir la fenêtre redessine le même état (catégorie choisie, rangement). Le focus d'une commande
  // qui n'est plus dessinée (disposition changée, crayon d'une carte devenu « Modifier » de la choisie,
  // objet d'une catégorie repliée) va à sa catégorie, sinon à « Ranger les catégories ».
  const { peindre, commandeProche } = suivreDisposition(main, {
    dessin: disposition => vueBibliotheque({ ...contexte, ...donnees, ...ui, ...disposition }),
    choisie: () => ui.choisie,
    categorieDe: id => lue.objets.find(o => o.id === id)?.categorieId,
    repli: 'ranger',
    apresPose() {
      ui.recent = null;
      main.querySelector('[data-annonce]')?.replaceWith(annonce);
    },
    animation: GLISSEMENT,
    signal: fin.signal,
    parti,
  });
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
    commandeProche(aFocaliser)?.focus({ preventScroll: true });
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
    if (recent) enVue = recent.startsWith('cat-') ? commandeCategorie(recent.slice(4)) : commandeObjet(recent);
    peindre({ enVue });
  }
  // Une catégorie à l'écran : sa carte (téléphone), sa carte du menu (trois colonnes) ou sa tuile.
  const commandeCategorie = id => `[data-flip="cat-${CSS.escape(id)}"], .gf-tuile[data-id="${CSS.escape(id)}"]`;
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
      // Neuve : dépliée (téléphone) et choisie (grand format), pour qu'on y ajoute ses objets.
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
      allerALaListe(main);
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
  // « Annuler » du bandeau (src/ecrans/annulation.js), sur cet écran ou un autre puis revenu ici : la
  // bibliothèque relue, l'élément rétabli éclairé, sa catégorie choisie et dépliée pour qu'on le voie.
  window.addEventListener(
    'bibliotheque-retablie',
    ({ detail: { cible, categorieId } }) => {
      if (parti()) return;
      if (categorieId) {
        ui.choisie = categorieId;
        ui.ouvertes.add(categorieId);
      }
      let recent = null;
      if (cible.type === 'categorie') recent = `cat-${cible.id}`;
      else if (cible.type === 'objet') recent = cible.id;
      relire(recent);
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
