// Écran Modifier le voyage (#/voyage/:id/modifier ; US-25, US-26, US-27, phase 10 ; décisions du chef de
// projet du 2026-10-29, docs/superpowers/specs/2026-10-29-phase-10-plans-changent-design.md ; maquette
// validée docs/maquettes/plans-changent/) : l'assistant de création (src/ecrans/assistant-controleur.js)
// rouvert prérempli — nom, destination, voyageurs, dates, étiquettes —, dont la dernière étape,
// « Changements », liste ce que la modification entraîne, à accepter ou refuser ligne par ligne. Rien ne
// change sans « Appliquer les changements », qui écrit tout en une fois puis revient au voyage ; s'il
// reste des pièces à sortir du sac, l'écran du voyage pose la question (src/ecrans/sortie-du-sac.js).
// Sans aucun objet qui change, on enregistre directement. La bibliothèque n'est jamais touchée.
import { appliquerChangements, calculerChangements, choisiesDuVoyage } from '../modele/changements.js';
import { dateDuJour } from '../modele/dates.js';
import { nouvelId } from '../modele/identifiant.js';
import { creerAssistant, etapesDe } from './assistant.js';
import { ouvrirAssistant } from './assistant-controleur.js';
import { vueChangements } from './changements-vues.js';
import { echapper } from './html.js';
import { annoncerSortie } from './sortie-du-sac.js';
import { ecranVoyage, lireIdentifiant } from './voyage.js';
import { vueIntrouvable } from './voyage-vues.js';

// Les textes de l'assistant que la modification remplace (maquette) ; les autres restent ceux de la création.
const REMPLACES = {
  'nouveauVoyage.titre': 'modifierVoyage.titre',
  'nouveauVoyage.etape.apercu': 'modifierVoyage.etape',
  'nouveauVoyage.voirApercu': 'modifierVoyage.voir',
  'nouveauVoyage.creer': 'modifierVoyage.appliquer',
  'nouveauVoyage.abandon.titre': 'modifierVoyage.abandon.titre',
  'nouveauVoyage.abandon.texte': 'modifierVoyage.abandon.texte',
  'nouveauVoyage.erreurs.enregistrement': 'modifierVoyage.erreur',
};

const signature = ({ nom, destination, depart, retour, voyageurs }, choisies) =>
  JSON.stringify([nom, destination, depart, retour, voyageurs, [...choisies].sort()]);

function modeModification({ contenu, bibliotheque, filtre, aujourdhui }, contexte) {
  const { t, langue, stockage, revenir } = contexte;
  const { voyage } = contenu;
  const adresse = `#/voyage/${encodeURIComponent(voyage.id)}`;
  const { nom, destination, depart, retour, voyageurs } = voyage;
  const infos = { nom, destination, depart, retour, voyageurs };
  const choisies = choisiesDuVoyage(bibliotheque, contenu.etiquettes);
  const depuis = signature(infos, choisies);
  // Toutes les étapes sont déjà connues : on peut toucher n'importe laquelle de la rangée.
  const vues = new Set(etapesDe(bibliotheque).map((_, i) => i));
  // Les changements de la dernière visite de l'étape, et les cases touchées : revenir aux étapes d'avant
  // puis aux changements garde une décision tant que sa ligne dit la même chose.
  let changements = [];
  let acceptes = new Set();
  const decisions = new Map();
  const cleDeDecision = ligne => `${ligne.cle}:${ligne.apres}`;
  const entree = outils => ({
    contenu,
    bibliotheque: outils.bibliotheque,
    infos: outils.infos,
    choisies: outils.etat.choisies,
  });

  return {
    t: cle => t(REMPLACES[cle] ?? cle),
    classe: 'assistant-modifier',
    infos,
    etat: { ...creerAssistant(), choisies: new Set(choisies), vues },
    bibliotheque,
    aujourdhui,
    retour: { adresse, libelle: echapper(voyage.nom) },
    // Le voyage se voit derrière la fenêtre.
    fond: app => ecranVoyage.dessiner(app, { contenu, filtre }, contexte),
    saisieCommencee: (actuelles, etat) => signature(actuelles, etat.choisies) !== depuis,
    quitter: () => revenir(adresse),
    // Un pas en arrière, vers le voyage d'où l'on vient, plutôt qu'une adresse remplacée : le retour
    // depuis le voyage mène là où il menait avant.
    allerA: () => revenir(adresse),
    async terminer(outils) {
      const resultat = appliquerChangements(
        { ...entree(outils), changements, acceptes },
        { nouvelId, maintenant: new Date().toISOString() },
      );
      await stockage.modifierVoyage(resultat.modification);
      annoncerSortie(voyage.id, resultat.aSortir);
      return adresse;
    },
    derniere: {
      vue: outils => vueChangements(t, langue, { ...entree(outils), changements, acceptes }),
      grise: () => false,
      entrer(outils) {
        changements = calculerChangements(entree(outils));
        const lignes = changements.flatMap(c => c.lignes);
        acceptes = new Set(lignes.filter(l => decisions.get(cleDeDecision(l)) ?? l.defaut).map(l => l.cle));
        return lignes.length ? null : 'terminer';
      },
      clic(cible, outils) {
        const touchee = cible.closest('[data-ligne], input[data-manuelle]');
        if (!touchee) return false;
        const cle = touchee.dataset.ligne ?? touchee.dataset.manuelle;
        const ligne = changements.flatMap(c => c.lignes).find(l => l.cle === cle);
        const voulue = touchee.dataset.ligne ? !acceptes.has(cle) : touchee.value === 'recalculer';
        if (voulue) acceptes.add(cle);
        else acceptes.delete(cle);
        decisions.set(cleDeDecision(ligne), voulue);
        const selecteur = touchee.dataset.ligne
          ? `[data-ligne="${CSS.escape(cle)}"]`
          : `input[data-manuelle="${CSS.escape(cle)}"][value="${touchee.value}"]`;
        outils.repeindre(selecteur);
        return true;
      },
    },
  };
}

export const ecranModifierVoyage = {
  nom: 'modifier-voyage',
  async charger({ stockage, parametre }) {
    const id = lireIdentifiant(parametre);
    const [contenu, bibliotheque] = await Promise.all([
      id === null ? null : stockage.lireVoyage(id),
      stockage.lireBibliotheque(),
    ]);
    const filtre = contenu ? stockage.lireFiltre(contenu.voyage.id) : false;
    return { contenu, bibliotheque, filtre, aujourdhui: dateDuJour(new Date()) };
  },
  dessiner(app, donnees, contexte) {
    if (!donnees.contenu) app.innerHTML = vueIntrouvable(contexte.t);
    else ouvrirAssistant(app, contexte, modeModification(donnees, contexte));
  },
};
