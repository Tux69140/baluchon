// Écran Étiquettes (#/etiquettes), ouvert depuis Réglages (spec de la phase 6 ; maquette validée le
// 2026-10-26, docs/maquettes/etiquettes/) : les groupes de la bibliothèque, chacun une étape de
// « Nouveau voyage », et leurs étiquettes, les réponses à toucher. Une carte par groupe ; le crayon,
// une puce, « Ajouter une étiquette » et « Nouveau groupe » ouvrent leur fiche
// (src/ecrans/fiche-etiquette.js) ; enregistrée, la bibliothèque est relue et ce qui vient de changer
// s'éclaire. « Ranger » ouvre une seule liste où ▲ et ▼ déplacent un groupe, ou une étiquette dans son
// groupe, d'une place.
// Ce fichier branche les gestes et le stockage ; le dessin est dans etiquettes-vues.js.
import { remplir } from '../i18n/traduction.js';
import { preparerEtiquette, preparerGroupe } from '../modele/etiquettes.js';
import { nouvelId } from '../modele/identifiant.js';
import { parOrdre } from '../modele/inclusion.js';
import { alerterEnHaut } from './alerte.js';
import { etapesDe } from './assistant.js';
import { glisser, places } from './disposition.js';
import { vueEtiquettes } from './etiquettes-vues.js';
import { ouvrirFicheEtiquette, ouvrirFicheGroupe } from './fiche-etiquette.js';
import { creerFileOrdre } from './file-ordre.js';
import { GLISSEMENT, creerModeRangement, suivreFin } from './mode-rangement.js';

// La clé de la liste des groupes dans la file des déplacements ; celle des étiquettes d'un groupe est
// l'id du groupe.
const GROUPES = 'groupes';

// Ce que l'écran dessine, tiré de la bibliothèque lue : les groupes par rang, les étiquettes de chacun
// par rang, et l'étape de « Nouveau voyage » qu'il fait (sa place dans etapesDe, la seule définition
// des étapes ; null pour un groupe vide, qui n'en est pas une).
function preparer(bibliotheque) {
  const etapes = etapesDe(bibliotheque);
  const rangees = [...bibliotheque.groupes].sort(parOrdre).map(groupe => {
    const place = etapes.findIndex(etape => etape.type === 'groupe' && etape.groupe.id === groupe.id);
    return {
      groupe,
      etiquettes: bibliotheque.etiquettes.filter(e => e.groupeId === groupe.id).sort(parOrdre),
      etape: place < 0 ? null : place + 1,
    };
  });
  return { rangees, nombreEtiquettes: bibliotheque.etiquettes.length };
}

// Le rang de chaque élément d'une liste, tel que le stockage vient de le confirmer.
const reclasser = (liste, ids, garde = () => true) =>
  liste.map(x => (garde(x) && ids.includes(x.id) ? { ...x, ordre: ids.indexOf(x.id) } : x));

function ouvrirEtiquettes(app, bibliotheque, contexte) {
  const { stockage, t, langue } = contexte;
  app.innerHTML = '<main class="ecran"></main>';
  const main = app.firstElementChild;
  // La bibliothèque telle que le stockage la garde (les fiches en partent), et ce que l'écran en tire.
  let lue = bibliotheque;
  let donnees = preparer(lue);
  // ranger : la liste du rangement est ouverte ; recent : l'id de ce qui vient d'être enregistré,
  // éclairé au prochain dessin seulement.
  const ui = { ranger: false, recent: null };
  // La fin de l'écran, quel que soit le chemin : plus rien ne touche la page.
  const fin = suivreFin(app, main);
  const { parti } = fin;
  // « Ranger », la touche retour qui le termine, le lien de retour et le menu.
  const mode = creerModeRangement({
    main,
    ui,
    peindre,
    premier: '.rang-arbre .bouton-icone:not([aria-disabled])',
    parti,
    contexte,
  });
  const { annonce } = mode;

  const trouverCommande = (action, id) =>
    main.querySelector(`[data-action="${action}"]${id ? `[data-id="${CSS.escape(id)}"]` : ''}`);

  // Chaque dessin garde le focus sur la même commande. enVue : ce qu'il faut amener dans la vue, avant
  // le glissement (un élément qui glisse est mesuré à son ancienne place).
  function peindre({ glissement = false, enVue = null } = {}) {
    const avant = glissement ? places(main) : null;
    const focus = document.activeElement?.closest('[data-action]');
    const cle = focus && main.contains(focus) && { action: focus.dataset.action, id: focus.dataset.id };
    const { classe, html } = vueEtiquettes({ ...contexte, ...donnees, ...ui });
    ui.recent = null;
    main.className = classe;
    main.innerHTML = html;
    main.querySelector('[data-annonce]')?.replaceWith(annonce);
    if (cle) trouverCommande(cle.action, cle.id)?.focus({ preventScroll: true });
    if (enVue) main.querySelector(enVue)?.scrollIntoView({ block: 'nearest' });
    glisser(main, avant, GLISSEMENT);
  }

  // ---------- Rangement ----------
  // Les listes rangées : celle des groupes, puis celle des étiquettes de chaque groupe.
  function definirTout() {
    const ids = liste => liste.map(x => x.id);
    ordre.definir(GROUPES, ids(donnees.rangees.map(r => r.groupe)));
    for (const { groupe, etiquettes } of donnees.rangees) ordre.definir(groupe.id, ids(etiquettes));
  }

  // L'ordre confirmé par le stockage s'affiche ; l'élément déplacé glisse à sa place et l'annonce dit
  // sa nouvelle place dans sa liste.
  function confirme(cle, ids, id) {
    lue =
      cle === GROUPES
        ? { ...lue, groupes: reclasser(lue.groupes, ids) }
        : { ...lue, etiquettes: reclasser(lue.etiquettes, ids, e => e.groupeId === cle) };
    donnees = preparer(lue);
    const deplace = (cle === GROUPES ? lue.groupes : lue.etiquettes).find(x => x.id === id);
    peindre({ glissement: true, enVue: `[data-flip="${cle === GROUPES ? 'g' : 'e'}-${CSS.escape(id)}"]` });
    // Supprimé entre l'appui et la confirmation : rien à annoncer.
    if (!deplace) return;
    annonce.textContent = remplir(t('etiquettes.place'), {
      nom: deplace.nom,
      n: ids.indexOf(id) + 1,
      total: ids.length,
    });
  }

  // L'écriture refusée : on revient à ce que le stockage garde réellement, et on le dit.
  async function echec() {
    try {
      lue = await stockage.lireBibliotheque();
      donnees = preparer(lue);
    } catch (erreurDeLecture) {
      // Relecture impossible : l'écran garde l'ordre qu'il montre, le dernier confirmé.
      console.error(erreurDeLecture);
    }
    definirTout();
    if (parti()) return;
    peindre();
    alerterEnHaut(app, t('etiquettes.erreurOrdre'), fin.signal);
  }

  const ordre = creerFileOrdre({
    ecrire: (cle, ids) => {
      const maintenant = new Date().toISOString();
      return cle === GROUPES
        ? stockage.rangerGroupes(ids, maintenant)
        : stockage.rangerEtiquettes(cle, ids, maintenant);
    },
    confirme,
    echec,
    parti,
  });
  definirTout();

  // La liste d'un élément ▲ ▼ : celle des groupes, ou celle des étiquettes de son groupe.
  const listeDe = id =>
    lue.groupes.some(g => g.id === id) ? GROUPES : lue.etiquettes.find(e => e.id === id)?.groupeId;

  // ---------- Fiches ----------
  // Ce qui reprend le focus quand une fiche se ferme : la commande qui l'a ouverte, ou ce qu'elle
  // vient d'enregistrer ; redessinée entre-temps, on la retrouve par son action et son id.
  let aFocaliser = null;
  function rendreFocus() {
    if (!aFocaliser || parti()) return;
    trouverCommande(aFocaliser.action, aFocaliser.id)?.focus({ preventScroll: true });
  }

  // Après une écriture : la bibliothèque relue, redessinée, et recent (l'id d'un groupe ou d'une
  // étiquette) éclairé et amené dans la vue. Une relecture impossible laisse l'écran tel qu'il était :
  // l'écriture, elle, a réussi, la fiche se ferme.
  async function relire(recent = null) {
    try {
      lue = await stockage.lireBibliotheque();
    } catch (erreur) {
      console.error(erreur);
      return;
    }
    donnees = preparer(lue);
    // Chaque ordre voulu garde ses déplacements en attente, et reçoit en dernier un élément neuf.
    definirTout();
    if (parti()) return;
    ui.recent = recent;
    peindre({ enVue: recent && '[data-recent]' });
  }

  // Après une suppression, le focus va au voisin dans la même liste (le suivant, sinon le précédent),
  // ou à repli s'il n'y en a plus.
  function focusVoisin(liste, id, action, repli) {
    const place = liste.findIndex(x => x.id === id);
    const voisin = liste[place + 1] ?? liste[place - 1];
    aFocaliser = voisin ? { action, id: voisin.id } : repli;
  }

  const commun = () => ({ t, langue, signal: fin.signal, dans: app, surFermeture: rendreFocus });

  // Un groupe neuf a son id dès l'ouverture de la fiche : un nouvel essai après une panne, ou un
  // second appui, écrit le même, jamais un second (Review Focus 4).
  function ouvrirGroupe(existant) {
    const id = existant?.id ?? nouvelId();
    aFocaliser = existant ? { action: 'modifier-groupe', id } : { action: 'nouveau-groupe' };
    ouvrirFicheGroupe({
      ...commun(),
      groupe: existant,
      groupes: lue.groupes,
      etiquettesDuGroupe: donnees.rangees.find(r => r.groupe.id === id)?.etiquettes ?? [],
      async enregistrer(saisie) {
        const groupe = preparerGroupe(saisie, {
          existant,
          groupes: lue.groupes,
          nouvelId: () => id,
          maintenant: new Date().toISOString(),
          langue,
        });
        await stockage.enregistrerGroupe(groupe);
        // Neuf : on y ajoute aussitôt ses étiquettes.
        if (!existant) aFocaliser = { action: 'nouvelle-etiquette', id };
        await relire(id);
      },
      async supprimer() {
        await stockage.supprimerGroupe(id);
        focusVoisin(
          donnees.rangees.map(r => r.groupe),
          id,
          'modifier-groupe',
          { action: 'nouveau-groupe' },
        );
        await relire();
      },
    });
  }

  // Une étiquette appartient à un seul groupe, qui ne change pas.
  function ouvrirEtiquette(existante, groupeId) {
    const id = existante?.id ?? nouvelId();
    const groupe = lue.groupes.find(g => g.id === (existante?.groupeId ?? groupeId));
    if (!groupe) return;
    aFocaliser = existante ? { action: 'modifier-etiquette', id } : { action: 'nouvelle-etiquette', id: groupe.id };
    ouvrirFicheEtiquette({
      ...commun(),
      etiquette: existante,
      groupe,
      bibliotheque: lue,
      async enregistrer(saisie) {
        const etiquette = preparerEtiquette(saisie, {
          existante,
          groupeId: groupe.id,
          bibliotheque: lue,
          nouvelId: () => id,
          maintenant: new Date().toISOString(),
          langue,
        });
        await stockage.enregistrerEtiquette(etiquette);
        aFocaliser = { action: 'modifier-etiquette', id };
        await relire(id);
      },
      async supprimer() {
        await stockage.supprimerEtiquette(id);
        focusVoisin(donnees.rangees.find(r => r.groupe.id === groupe.id)?.etiquettes ?? [], id, 'modifier-etiquette', {
          action: 'nouvelle-etiquette',
          id: groupe.id,
        });
        await relire();
      },
    });
  }

  // « Annuler » du bandeau (src/ecrans/annulation.js) : la bibliothèque relue, l'étiquette ou le
  // groupe rétabli éclairé.
  window.addEventListener(
    'bibliotheque-retablie',
    ({ detail: { cible } }) => {
      if (!parti()) relire(cible.type === 'etiquette' || cible.type === 'groupe' ? cible.id : null);
    },
    { signal: fin.signal },
  );

  main.addEventListener('click', evenement => {
    const commande = evenement.target.closest('[data-action]');
    if (!commande || commande.getAttribute('aria-disabled') === 'true' || mode.gerer(evenement, commande)) return;
    const { action, id } = commande.dataset;
    if (action === 'monter' || action === 'descendre') {
      const liste = listeDe(id);
      if (liste) ordre.deplacer(liste, id, action === 'monter' ? -1 : 1);
    } else if (action === 'modifier-groupe') {
      const groupe = lue.groupes.find(g => g.id === id);
      if (groupe) ouvrirGroupe(groupe);
    } else if (action === 'nouveau-groupe') ouvrirGroupe(null);
    else if (action === 'modifier-etiquette') {
      const etiquette = lue.etiquettes.find(e => e.id === id);
      if (etiquette) ouvrirEtiquette(etiquette);
    } else if (action === 'nouvelle-etiquette') ouvrirEtiquette(null, id);
  });
  peindre();
}

export const ecranEtiquettes = {
  nom: 'etiquettes',
  charger: ({ stockage }) => stockage.lireBibliotheque(),
  dessiner: ouvrirEtiquettes,
};
