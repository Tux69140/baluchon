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
import { etiquettesChoisies } from '../modele/inclusion.js';
import { apercuRefait, repriseDe } from '../modele/refaire.js';
import { genererVoyage } from '../modele/voyage.js';
import {
  basculerCategorie,
  basculerObjet,
  creerAssistant,
  entrerDansApercu,
  etapesDe,
  idsDeCategorie,
  idsDeLApercu,
  raisonVide,
  signatureDe,
} from './assistant.js';
import { ouvrirAssistant } from './assistant-controleur.js';
import { vueApercu } from './assistant-vues.js';
import { echapper } from './html.js';
import { demanderEcartes } from './nouveau-voyage.js';
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
      vue(outils) {
        const donnees = calcul(outils);
        return vueApercu(t, langue, {
          apercu: donnees.apercu,
          ecartes: outils.etat.ecartes,
          infos: outils.infos,
          etiquettes: etiquettesChoisies(outils.bibliotheque, outils.etat.choisies),
          revenir: outils.derniere > 1 ? 1 : 0,
          enTete: vuePhraseDisparus(t, langue, repriseDe(origine, outils.bibliotheque).disparues),
          ligne: ligneRefaite(t, donnees, { recalculer }),
        });
      },
      // Rien de retenu, rien à créer.
      grise: outils => raisonVide(calcul(outils).apercu, outils.etat.ecartes) !== null,
      entrer(outils) {
        const { etat, aReconfirmer } = entrerDansApercu(
          outils.etat,
          signatureDe(outils.infos, outils.etat.choisies),
          idsDeLApercu(calcul(outils).apercu),
        );
        outils.changerEtat(etat);
        return aReconfirmer.length
          ? () => demanderEcartes(t, { ...outils, etat }, aReconfirmer, calcul(outils).apercu)
          : null;
      },
      // Un objet, une catégorie, ou un segment « Garder | Recalculer ».
      clic(cible, outils) {
        const touchee = cible.closest('[data-objet], [data-categorie], input[data-manuelle]');
        if (!touchee) return false;
        const { objet, categorie, manuelle } = touchee.dataset;
        if (manuelle) {
          if (touchee.value === 'recalculer') recalculer.add(manuelle);
          else recalculer.delete(manuelle);
          outils.repeindre(`input[data-manuelle="${CSS.escape(manuelle)}"][value="${touchee.value}"]`);
        } else if (objet) {
          outils.changerEtat(basculerObjet(outils.etat, objet));
          outils.repeindre(`[data-objet="${CSS.escape(objet)}"]`);
        } else {
          const ids = idsDeCategorie(calcul(outils).apercu.find(c => c.categorie.id === categorie));
          outils.changerEtat(basculerCategorie(outils.etat, ids));
          outils.repeindre(`[data-categorie="${CSS.escape(categorie)}"]`);
        }
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
