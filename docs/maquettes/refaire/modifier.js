// « Modifier le voyage » lit la mémoire des objets écartés (phase 11, décision 11) : le vrai moteur de
// l'assistant, les vrais changements (calculerChangements) et le vrai dessin de l'étape « Changements »
// (vueChangements) ; seule différence, un objet entrant qu'on avait écarté ou retiré de ce voyage
// arrive refusé d'office, avec la mention « retiré », et s'accepte d'un appui.
import { creerAssistant, etapesDe } from '../../../src/ecrans/assistant.js';
import { ouvrirAssistant } from '../../../src/ecrans/assistant-controleur.js';
import { vueChangements } from '../../../src/ecrans/changements-vues.js';
import { echapper } from '../../../src/ecrans/html.js';
import { changementsBelleIle } from './donnees.js';
import { pastille } from './icones.js';

// Les textes que la modification remplace, comme src/ecrans/modifier-voyage.js.
const REMPLACES = {
  'nouveauVoyage.titre': 'modifierVoyage.titre',
  'nouveauVoyage.etape.apercu': 'modifierVoyage.etape',
  'nouveauVoyage.voirApercu': 'modifierVoyage.voir',
  'nouveauVoyage.creer': 'modifierVoyage.appliquer',
  'nouveauVoyage.abandon.titre': 'modifierVoyage.abandon.titre',
  'nouveauVoyage.abandon.texte': 'modifierVoyage.abandon.texte',
};

function decorer(html, retirees, acceptes) {
  const gabarit = document.createElement('template');
  gabarit.innerHTML = html;
  for (const cle of retirees) {
    const ligne = gabarit.content.querySelector(`[data-ligne="${CSS.escape(cle)}"]`);
    if (!ligne || acceptes.has(cle)) continue;
    ligne.querySelector('.objet-sous').insertAdjacentHTML('beforeend', pastille('retire', 'retiré'));
    ligne.setAttribute('aria-label', `${ligne.getAttribute('aria-label')}, retiré de ce voyage`);
  }
  return gabarit.innerHTML;
}

// contenu : le voyage ; fond(app) : son écran, derrière la fenêtre ; quitter() : on y revient.
export function ouvrirModification(app, contexte, { contenu, bibliotheque, choisies, aujourdhui, fond, quitter }) {
  const { t, langue } = contexte;
  const { entree, changements, acceptes, retirees } = changementsBelleIle();
  const { nom, destination, depart, retour, voyageurs } = contenu.voyage;
  const derniere = etapesDe(bibliotheque).length - 1;
  ouvrirAssistant(app, contexte, {
    t: cle => t(REMPLACES[cle] ?? cle),
    classe: 'assistant-modifier',
    infos: { nom, destination, depart, retour, voyageurs },
    etat: {
      ...creerAssistant(),
      etape: derniere,
      vues: new Set(Array.from({ length: derniere + 1 }, (_, i) => i)),
      choisies: new Set(choisies),
    },
    bibliotheque,
    aujourdhui,
    retour: { adresse: '?etat=voyage', libelle: echapper(nom) },
    fond,
    saisieCommencee: () => true,
    quitter,
    terminer: async () => null,
    derniere: {
      vue: () => decorer(vueChangements(t, langue, { ...entree, changements, acceptes }), retirees, acceptes),
      grise: () => false,
      entrer: () => null,
      clic(cible, outils) {
        const touchee = cible.closest('[data-ligne]');
        if (!touchee) return false;
        const cle = touchee.dataset.ligne;
        if (acceptes.has(cle)) acceptes.delete(cle);
        else acceptes.add(cle);
        outils.repeindre(`[data-ligne="${CSS.escape(cle)}"]`);
        return true;
      },
    },
  });
}
