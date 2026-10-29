// L'écran Courses d'un voyage (#/voyage/:id/courses ; docs/PRD.md, US-24 ; décisions du chef de projet du
// 2026-10-29, docs/superpowers/specs/2026-10-29-phase-9-courses-design.md) : les objets qui restent à
// acheter, par catégorie ; la case compte les pièces achetées comme celle du sac. Un objet tout acheté reste
// grisé une seconde, puis part, et le bandeau « Annuler » de la phase 7 le rend pendant 10 s : on fait les
// courses téléphone en main, un appui de trop doit se rattraper.
import { remplir } from '../i18n/traduction.js';
import { bornerAchetes, listeDesCourses } from '../modele/courses.js';
import { avecObjet } from './ajustements.js';
import { DUREE_ALERTE } from './alerte.js';
import { montrerAnnulation } from './annulation.js';
import { ouvrirFicheAchat } from './fiche-achat.js';
import { trouverCommande } from './disposition.js';
import { pluriel } from './format.js';
import { lireIdentifiant } from './voyage.js';
import { vueCourses } from './courses-vues.js';
import { vueAlerte, vueIntrouvable } from './voyage-vues.js';

// Le répit d'un objet tout juste acheté, comme celui d'un objet coché dans le sac (docs/PRD.md).
const REPIT = 1000;

function ouvrirCourses(app, contenuInitial, contexte) {
  const { stockage, t, langue } = contexte;
  app.innerHTML = '<main class="ecran courses-ecran"></main>';
  const main = app.firstElementChild;
  let contenu = contenuInitial;
  // Les objets tout achetés pendant leur seconde de répit : { minuterie, terminer }, terminer() montrant
  // leur bandeau « Annuler ». Un répit coupé (l'écran quitté, la panne d'un autre objet) le montre aussitôt :
  // un objet acheté ne part jamais sans lui (relecture finale de la phase 9, constat M2).
  const retenus = new Map();
  // La file d'écriture : une à la fois, dans l'ordre des appuis ; après un échec, celles d'avant
  // (génération dépassée) sont abandonnées et les appuis attendent la relecture.
  let file = Promise.resolve();
  let generation = 0;
  let relecture = false;
  let minuterieAlerte = null;
  // La fiche d'achat ouverte : l'objet qu'elle montre et de quoi la repeindre.
  let fiche = null;
  const fin = new AbortController();
  const parti = () => {
    if (!fin.signal.aborted && !main.isConnected) fin.abort();
    return fin.signal.aborted;
  };

  // Le focus d'une commande redessinée revient à la même, sinon à la ligne de son objet, sinon au lien retour.
  function peindre() {
    const focus = document.activeElement?.closest('[data-action]');
    const cle = focus && main.contains(focus) && { action: focus.dataset.action, id: focus.dataset.id };
    main.innerHTML = vueCourses(contexte, { contenu, liste: listeDesCourses(contenu, new Set(retenus.keys())) });
    fiche?.repeindre(contenu.objets.find(o => o.id === fiche.id));
    if (!cle) return;
    const cible =
      trouverCommande(main, cle.action, cle.id) ??
      (cle.id && trouverCommande(main, 'fiche-achat', cle.id)) ??
      trouverCommande(main, 'retour');
    cible?.focus({ preventScroll: true });
  }

  function alerter(texte) {
    app.querySelector('.alerte')?.remove();
    clearTimeout(minuterieAlerte);
    app.insertAdjacentHTML('beforeend', vueAlerte(texte));
    const alerte = app.lastElementChild;
    minuterieAlerte = setTimeout(() => alerte.remove(), DUREE_ALERTE);
  }

  // L'écriture refusée : on revient à ce que le stockage garde réellement, et on le dit.
  async function echec(erreur) {
    console.error(erreur);
    generation += 1;
    relecture = true;
    const coupes = [...retenus];
    for (const [, { minuterie }] of coupes) clearTimeout(minuterie);
    retenus.clear();
    try {
      contenu = (await stockage.lireVoyage(contenu.voyage.id)) ?? contenu;
    } catch (erreurDeLecture) {
      console.error(erreurDeLecture);
    } finally {
      relecture = false;
    }
    if (parti()) return;
    peindre();
    alerter(t('courses.erreurEnregistrement'));
    // Ceux dont l'achat est bien écrit partent avec leur bandeau ; les autres restent, relus.
    for (const [id, { terminer }] of coupes) {
      const relu = contenu.objets.find(o => o.id === id);
      if (relu && relu.achetes >= relu.quantite) terminer?.();
    }
  }

  // L'écran d'abord, puis l'écriture dans la file ; rend false pendant la relecture d'un échec.
  function appliquer(nouveau, ecriture) {
    if (relecture) return false;
    contenu = nouveau;
    peindre();
    const sienne = generation;
    file = file
      .then(() => sienne === generation && ecriture())
      .catch(erreur => sienne === generation && echec(erreur))
      .catch(erreur => console.error(erreur));
    return true;
  }

  // « Annuler » réécrit la marque et les pièces d'avant, puis l'écran ouvert sur ce voyage le montre
  // (événement « achat-retabli » : celui-ci, ou la liste du voyage si l'on y est revenu).
  function proposerAnnulation(objet, avant, texte) {
    const { id, voyageId } = objet;
    montrerAnnulation({
      t,
      app,
      texte,
      icone: 'courses',
      async annuler() {
        await stockage.reglerAchats(id, avant.aAcheter, avant.achetes, new Date().toISOString());
        window.dispatchEvent(new CustomEvent('achat-retabli', { detail: { voyageId, objetId: id } }));
      },
    });
  }

  // Les pièces achetées d'un objet ; toutes achetées, il reste grisé le temps du répit, puis part avec le bandeau.
  function changerAchetes(id, voulu) {
    const objet = contenu.objets.find(o => o.id === id);
    if (!objet || retenus.has(id)) return;
    const achetes = bornerAchetes(objet, voulu);
    if (achetes === objet.achetes) return;
    const avant = { aAcheter: objet.aAcheter, achetes: objet.achetes };
    const modifieLe = new Date().toISOString();
    const fini = achetes >= objet.quantite;
    const retenu = { minuterie: null, terminer: null };
    if (fini) retenus.set(id, retenu);
    const ecrit = appliquer(avecObjet(contenu, id, { achetes, modifieLe }), () =>
      stockage.reglerAchats(id, objet.aAcheter, achetes, modifieLe),
    );
    if (!ecrit) return retenus.delete(id);
    if (!fini) return;
    const texte = remplir(pluriel(t, 'annulation.achete', objet.quantite, langue), { nom: objet.nom });
    retenu.terminer = () => proposerAnnulation(objet, avant, texte);
    retenu.minuterie = setTimeout(() => {
      if (parti() || retenus.get(id) !== retenu) return;
      retenus.delete(id);
      peindre();
      retenu.terminer();
    }, REPIT);
  }

  // « À acheter » éteint depuis la fiche : l'objet quitte les Courses, le bandeau le rend.
  function eteindre(id) {
    const objet = contenu.objets.find(o => o.id === id);
    if (!objet) return;
    const avant = { aAcheter: objet.aAcheter, achetes: objet.achetes };
    const modifieLe = new Date().toISOString();
    const ecrit = appliquer(avecObjet(contenu, id, { aAcheter: false, modifieLe }), () =>
      stockage.reglerAchats(id, false, objet.achetes, modifieLe),
    );
    if (ecrit) proposerAnnulation(objet, avant, remplir(t('annulation.plusAAcheter'), { nom: objet.nom }));
  }

  // Fermée, la fiche rend le focus à la ligne de l'objet, ou au lien retour si elle est partie.
  function ouvrirLaFiche(id) {
    const objet = contenu.objets.find(o => o.id === id);
    if (!objet || fiche || retenus.has(id)) return;
    fiche = {
      id,
      repeindre: ouvrirFicheAchat({
        t,
        objet,
        categorie: contenu.categories.find(c => c.id === objet.categorieId),
        surAchetes: n => changerAchetes(id, n),
        surAAcheter: () => eteindre(id),
        surFermeture: () => {
          fiche = null;
          (trouverCommande(main, 'fiche-achat', id) ?? trouverCommande(main, 'retour'))?.focus();
        },
        signal: fin.signal,
        dans: app,
      }),
    };
  }

  main.addEventListener(
    'click',
    evenement => {
      const commande = evenement.target.closest('[data-action]');
      if (!commande) return;
      const { action, id } = commande.dataset;
      if (action === 'retour-voyage') {
        evenement.preventDefault();
        return contexte.revenir(commande.getAttribute('href'));
      }
      const objet = contenu.objets.find(o => o.id === id);
      if (action === 'case-achat' && objet) changerAchetes(id, objet.achetes + 1);
      if (action === 'fiche-achat') ouvrirLaFiche(id);
    },
    { signal: fin.signal },
  );

  // « Annuler » d'un achat, d'ici : l'objet relu revient dans la liste. Lui seul change : les autres gardent
  // ce que l'écran montre, écritures encore en file comprises (relecture finale de la phase 9, constat M1).
  window.addEventListener(
    'achat-retabli',
    async ({ detail: { voyageId, objetId } }) => {
      if (voyageId !== contenu.voyage.id || parti()) return;
      try {
        const objet = (await stockage.lireVoyage(voyageId))?.objets.find(o => o.id === objetId);
        if (!objet || parti() || !contenu.objets.some(o => o.id === objetId)) return;
        contenu = avecObjet(contenu, objetId, { aAcheter: objet.aAcheter, achetes: objet.achetes });
        peindre();
      } catch (erreur) {
        console.error(erreur);
      }
    },
    { signal: fin.signal },
  );
  fin.signal.addEventListener('abort', () => {
    clearTimeout(minuterieAlerte);
    for (const { minuterie, terminer } of retenus.values()) {
      clearTimeout(minuterie);
      terminer?.();
    }
    retenus.clear();
  });
  const observateur = new MutationObserver(() => parti() && observateur.disconnect());
  observateur.observe(app, { childList: true });
  peindre();
}

export const ecranCourses = {
  nom: 'courses',
  async charger({ stockage, parametre }) {
    const id = lireIdentifiant(parametre);
    return { contenu: id === null ? null : await stockage.lireVoyage(id) };
  },
  dessiner(app, donnees, contexte) {
    if (!donnees.contenu) app.innerHTML = vueIntrouvable(contexte.t);
    else ouvrirCourses(app, donnees.contenu, contexte);
  },
};
