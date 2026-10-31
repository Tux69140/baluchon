// Écran Nouveau voyage (#/nouveau-voyage) : l'assistant de création (US-9 à US-13). Informations (nom,
// destination, voyageurs, dates), puis un groupe d'étiquettes par étape, puis l'aperçu qu'on décoche
// avant « Créer le voyage », qui copie la bibliothèque dans le voyage et ouvre sa liste (docs/PRD.md,
// « Écrans et gestes » ; maquette validée le 2026-10-25, docs/maquettes/assistant/).
// Sur tablette et ordinateur, l'assistant s'ouvre en fenêtre modale par-dessus Mes voyages ; au
// téléphone, il occupe tout l'écran (décision du chef de projet, 2026-10-07). Le retour système ramène
// à l'étape précédente ; fermer l'assistant avec une saisie demande d'abord s'il faut l'abandonner.
// Le moteur de l'assistant, commun avec « Modifier le voyage », vit dans src/ecrans/assistant-controleur.js ;
// ce fichier n'en garde que ce qui est propre à la création : l'aperçu, les objets écartés, la copie.
import { dateDuJour } from '../modele/dates.js';
import { nouvelId } from '../modele/identifiant.js';
import { etiquettesChoisies, genererApercu } from '../modele/inclusion.js';
import { VOYAGEURS, genererVoyage } from '../modele/voyage.js';
import {
  basculerCategorie,
  basculerObjet,
  creerAssistant,
  entrerDansApercu,
  idsDeCategorie,
  idsDeLApercu,
  raisonVide,
  remettre,
  saisieCommencee,
  signatureDe,
} from './assistant.js';
import { vueApercu, vueEcartes } from './assistant-vues.js';
import { ouvrirAssistant } from './assistant-controleur.js';
import { ecranVoyages } from './voyages.js';

// La fenêtre fermée, le focus revient au bouton de Mes voyages qui l'ouvre.
const OUVRE_LA_FENETRE = 'a[href="#/nouveau-voyage"]';

const apercuDe = ({ bibliotheque, infos, etat }) => genererApercu(bibliotheque, infos, etat.choisies);

// Les objets écartés encore dans l'aperçu, après un changement de choix (docs/PRD.md, « Retour à
// l'aperçu ») : les garder écartés est l'action principale, c'est la décision déjà prise ; Échap et
// le retour système les gardent aussi. apercu : celui que montre l'assistant.
async function demanderEcartes(t, outils, ids, apercu) {
  const nommes = new Set(ids);
  const objets = apercu.flatMap(({ categorie, objets: lignes }) =>
    lignes
      .filter(({ objet }) => nommes.has(objet.id))
      .map(({ objet }) => ({ nom: objet.nom, categorie: categorie.nom })),
  );
  const reponse = await outils.poser({
    titre: t('nouveauVoyage.ecartes.titre'),
    texte: t('nouveauVoyage.ecartes.texte'),
    contenu: vueEcartes(objets),
    boutons: [
      { cle: 'remettre', libelle: t('nouveauVoyage.ecartes.remettre') },
      { cle: 'garder', libelle: t('nouveauVoyage.ecartes.garder'), principal: true },
    ],
  });
  if (reponse !== 'remettre') return;
  outils.changerEtat(remettre(outils.etat, ids));
  outils.repeindre('#titre-etape');
}

// La dernière étape quand c'est l'aperçu qu'on décoche : celle de la création, et celle de « Refaire ce
// voyage » (src/ecrans/refaire-voyage.js), qui y ajoute ses mentions. apercuDe(outils) : l'aperçu montré ;
// enPlus(outils) : ce que le mode ajoute à vueApercu ({ enTete, ligne }), rien pour la création.
export function etapeApercu(t, langue, apercuDe, enPlus = () => ({})) {
  return {
    vue: outils =>
      vueApercu(t, langue, {
        apercu: apercuDe(outils),
        ecartes: outils.etat.ecartes,
        infos: outils.infos,
        etiquettes: etiquettesChoisies(outils.bibliotheque, outils.etat.choisies),
        // « Revenir aux étiquettes » : la première étape de groupe, ou Informations s'il n'y en a pas.
        revenir: outils.derniere > 1 ? 1 : 0,
        ...enPlus(outils),
      }),
    // Rien de retenu, rien à créer.
    grise: outils => raisonVide(apercuDe(outils), outils.etat.ecartes) !== null,
    entrer(outils) {
      const { etat, aReconfirmer } = entrerDansApercu(
        outils.etat,
        signatureDe(outils.infos, outils.etat.choisies),
        idsDeLApercu(apercuDe(outils)),
      );
      outils.changerEtat(etat);
      return aReconfirmer.length ? () => demanderEcartes(t, { ...outils, etat }, aReconfirmer, apercuDe(outils)) : null;
    },
    clic(cible, outils) {
      const touchee = cible.closest('[data-objet], [data-categorie]');
      if (!touchee) return false;
      const { objet, categorie } = touchee.dataset;
      if (objet) {
        outils.changerEtat(basculerObjet(outils.etat, objet));
        outils.repeindre(`[data-objet="${CSS.escape(objet)}"]`);
      } else {
        const ids = idsDeCategorie(apercuDe(outils).find(c => c.categorie.id === categorie));
        outils.changerEtat(basculerCategorie(outils.etat, ids));
        outils.repeindre(`[data-categorie="${CSS.escape(categorie)}"]`);
      }
      return true;
    },
  };
}

// La création : l'aperçu en dernière étape, où l'on décoche objets et catégories, puis « Créer le
// voyage », qui copie la bibliothèque dans le voyage et ouvre sa liste.
function modeCreation({ bibliotheque, accueil, aujourdhui }, contexte) {
  const { t, stockage, revenirAccueil } = contexte;
  return {
    // Une forme constante : une date absente vaut '' (signatureDe compare les informations d'un aperçu
    // à l'autre ; '' et undefined y feraient deux signatures).
    infos: { nom: '', destination: '', depart: '', retour: '', voyageurs: VOYAGEURS.parDefaut },
    etat: creerAssistant(),
    bibliotheque,
    aujourdhui,
    // Mes voyages se voit derrière la fenêtre.
    fond: app => ecranVoyages.dessiner(app, accueil, contexte),
    saisieCommencee,
    quitter: ({ enFenetre }) => revenirAccueil(enFenetre ? { focus: OUVRE_LA_FENETRE } : {}),
    async terminer({ bibliotheque: biblio, infos, etat }) {
      const contenu = genererVoyage(
        biblio,
        infos,
        { choisies: etat.choisies, ecartes: etat.ecartes },
        { nouvelId, maintenant: new Date().toISOString() },
      );
      await stockage.creerVoyage(contenu);
      return `#/voyage/${contenu.voyage.id}`;
    },
    derniere: etapeApercu(t, contexte.langue, apercuDe),
  };
}

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
  dessiner(app, donnees, contexte) {
    ouvrirAssistant(app, contexte, modeCreation(donnees, contexte));
  },
};
