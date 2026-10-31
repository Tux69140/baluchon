// Écran Refaire ce voyage (#/voyage/:id/refaire et #/voyages/refaire/:id ; US-14, phase 11 ; décisions 1
// à 7 et 12 du chef de projet, docs/superpowers/specs/2026-10-30-phase-11-refaire-supprimer-design.md ;
// maquette validée le 2026-10-30, docs/maquettes/refaire/) : l'assistant de création
// (src/ecrans/assistant-controleur.js) ouvert depuis un voyage d'origine, par-dessus ce voyage ou par-dessus
// Mes voyages selon le menu « ⋮ » d'où l'on vient (src/ecrans/menu-voyage.js). Nom, destination et dates
// vides ; voyageurs et étiquettes repris. L'aperçu, construit sur la bibliothèque actuelle
// (src/modele/refaire.js), montre en plus ce qui a disparu de la bibliothèque, les ajouts à la main, les
// objets retirés la dernière fois et les quantités fixées (src/ecrans/refaire-vues.js). « Créer le voyage »
// crée un voyage neuf et ouvre sa liste ; le voyage d'origine n'est jamais touché.
import { remplir } from '../i18n/traduction.js';
import { dateDuJour } from '../modele/dates.js';
import { nouvelId } from '../modele/identifiant.js';
import { apercuRefait, repriseDe } from '../modele/refaire.js';
import { genererVoyage } from '../modele/voyage.js';
import { creerAssistant, etapesDe } from './assistant.js';
import { ouvrirAssistant } from './assistant-controleur.js';
import { echapper } from './html.js';
import { etapeApercu } from './nouveau-voyage.js';
import { ligneRefaite, vuePhraseDisparus } from './refaire-vues.js';
import { ecranVoyage, lireIdentifiant } from './voyage.js';
import { vueIntrouvable } from './voyage-vues.js';
import { ecranVoyages } from './voyages.js';

const enOrdre = choisies => JSON.stringify([...choisies].sort());

// depuis : 'voyage' (le voyage d'origine derrière la fenêtre) ou 'voyages' (Mes voyages derrière).
function modeRefaire({ origine, bibliotheque, accueil, filtre, aujourdhui }, contexte, depuis) {
  const { t, langue, stockage, revenir, revenirAccueil } = contexte;
  const { voyage } = origine;
  const adresse = `#/voyage/${encodeURIComponent(voyage.id)}`;
  const reprise = repriseDe(origine, bibliotheque);
  const reprises = enOrdre(reprise.choisies);
  // Les quantités fixées qu'on a choisi de recalculer (décision 4 : gardées par défaut).
  const recalculer = new Set();
  const calcul = ({ bibliotheque: biblio, infos, etat }) =>
    apercuRefait(origine, biblio, infos, etat.choisies, recalculer);
  // Le titre nomme le voyage d'origine ; les autres textes sont ceux de la création.
  const titre = remplir(t('refaireVoyage.titre'), { nom: echapper(voyage.nom) });
  const depuisLeVoyage = depuis === 'voyage';
  // Revenu à Mes voyages, le focus va au bouton « ⋮ » de la carte, qui a ouvert l'assistant.
  const boutonDeLaCarte = `.menu-voyage-bouton[popovertarget="${CSS.escape(`menu-${voyage.id}`)}"]`;
  // L'aperçu de la création, avec ce que « Refaire » y ajoute : la phrase des disparus et les mentions.
  const apercu = etapeApercu(
    t,
    langue,
    outils => calcul(outils).apercu,
    outils => ({
      enTete: vuePhraseDisparus(t, langue, repriseDe(origine, outils.bibliotheque).disparues),
      ligne: ligneRefaite(t, calcul(outils), { recalculer }),
    }),
  );

  return {
    t: cle => (cle === 'nouveauVoyage.titre' ? titre : t(cle)),
    classe: 'assistant-refaire',
    infos: { nom: '', destination: '', depart: '', retour: '', voyageurs: voyage.voyageurs },
    etat: {
      ...creerAssistant(),
      choisies: new Set(reprise.choisies),
      // Ce qu'on avait écarté ou retiré la dernière fois arrive écarté (décision 1).
      ecartes: new Set(reprise.ecartes),
      // Les étapes d'étiquettes arrivent remplies : déjà touchables (l'aperçu attend nom et dates).
      vues: new Set(
        etapesDe(bibliotheque)
          .map((_, i) => i)
          .slice(0, -1),
      ),
    },
    bibliotheque,
    aujourdhui,
    // Au téléphone, le lien du haut ramène au voyage d'origine (sinon, à Mes voyages).
    retour: depuisLeVoyage ? { adresse, libelle: echapper(voyage.nom) } : undefined,
    fond: depuisLeVoyage
      ? app => ecranVoyage.dessiner(app, { contenu: origine, filtre }, contexte)
      : app => ecranVoyages.dessiner(app, accueil, contexte),
    // Ce qui est repris ne compte pas comme une saisie : seul ce qu'on touche soi-même (les voyageurs non
    // plus, comme à la création).
    saisieCommencee: ({ nom, destination, depart }, etat) =>
      Boolean(nom.trim() || destination.trim() || depart || enOrdre(etat.choisies) !== reprises),
    quitter: ({ enFenetre }) =>
      depuisLeVoyage ? revenir(adresse) : revenirAccueil(enFenetre ? { focus: boutonDeLaCarte } : {}),
    // Le voyage neuf, copié de l'aperçu que l'on voit ; son adresse remplace celle de l'assistant : le
    // retour mène au voyage d'origine, ou à Mes voyages.
    async terminer(outils) {
      const { infos, etat } = outils;
      const contenu = genererVoyage(
        outils.bibliotheque,
        infos,
        { choisies: etat.choisies, ecartes: etat.ecartes, apercu: calcul(outils).apercu },
        { nouvelId, maintenant: new Date().toISOString() },
      );
      await stockage.creerVoyage(contenu);
      return `#/voyage/${encodeURIComponent(contenu.voyage.id)}`;
    },
    derniere: {
      ...apercu,
      // Un segment « Garder | Recalculer » ; sinon un objet ou une catégorie, comme à la création.
      clic(cible, outils) {
        const segment = cible.closest('input[data-manuelle]');
        if (!segment) return apercu.clic(cible, outils);
        const { manuelle } = segment.dataset;
        if (segment.value === 'recalculer') recalculer.add(manuelle);
        else recalculer.delete(manuelle);
        outils.repeindre(`input[data-manuelle="${CSS.escape(manuelle)}"][value="${segment.value}"]`);
        return true;
      },
    },
  };
}

function ecranRefaire(depuis) {
  return {
    nom: 'refaire-voyage',
    // Ce qui se voit derrière la fenêtre est chargé aussi : le voyage d'origine, ou Mes voyages.
    async charger(contexte) {
      const { stockage, parametre } = contexte;
      const id = lireIdentifiant(parametre);
      const [origine, bibliotheque, accueil] = await Promise.all([
        id === null ? null : stockage.lireVoyage(id),
        stockage.lireBibliotheque(),
        depuis === 'voyages' ? ecranVoyages.charger(contexte) : null,
      ]);
      const filtre = origine && depuis === 'voyage' ? stockage.lireFiltre(origine.voyage.id) : false;
      return { origine, bibliotheque, accueil, filtre, aujourdhui: dateDuJour(new Date()) };
    },
    dessiner(app, donnees, contexte) {
      if (!donnees.origine) app.innerHTML = vueIntrouvable(contexte.t);
      else ouvrirAssistant(app, contexte, modeRefaire(donnees, contexte, depuis));
    },
  };
}

export const ecranRefaireVoyage = ecranRefaire('voyage');
export const ecranRefaireDepuisVoyages = ecranRefaire('voyages');
