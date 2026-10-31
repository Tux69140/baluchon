// « Refaire ce voyage » (phase 11, décisions 1 à 7 et 12) : le vrai moteur de l'assistant
// (src/ecrans/assistant-controleur.js) avec un mode à lui, comme « Nouveau voyage » et « Modifier le
// voyage ». Titre qui nomme le voyage d'origine ; nom, destination et dates vides ; voyageurs et
// étiquettes repris ; dernière étape : le vrai aperçu (vueApercu), auquel s'ajoutent, en tête, la phrase
// sur ce qui a disparu de la bibliothèque, et sur les lignes les mentions « retiré » et « ajouté à la
// main », et le choix « Garder | Recalculer » d'une quantité fixée manuellement, dessiné comme à l'étape
// « Changements » (src/ecrans/changements-vues.js).
import { remplir } from '../../../src/i18n/traduction.js';
import { etiquettesChoisies } from '../../../src/modele/inclusion.js';
import {
  basculerCategorie,
  basculerObjet,
  creerAssistant,
  entrerDansApercu,
  etapesDe,
  idsDeCategorie,
  idsDeLApercu,
  raisonVide,
  remettre,
  signatureDe,
} from '../../../src/ecrans/assistant.js';
import { ouvrirAssistant } from '../../../src/ecrans/assistant-controleur.js';
import { vueApercu, vueEcartes } from '../../../src/ecrans/assistant-vues.js';
import { echapper } from '../../../src/ecrans/html.js';
import { iconeInterface } from '../../../src/ecrans/icones.js';
import { apercuRefait, reprise } from './donnees.js';
import { pastille } from './icones.js';

const guillemets = nom => `«\u00a0${echapper(nom)}\u00a0»`;
const enListe = noms => new Intl.ListFormat('fr', { type: 'conjunction' }).format(noms.map(guillemets));

// La phrase en tête de l'aperçu : les étiquettes et les objets du voyage d'origine qui ne sont plus
// dans la bibliothèque, et qui ne sont donc pas repris (décisions 6 et 7). Vide s'il n'y en a pas.
function phraseDisparus({ etiquettes, objets }) {
  const morceaux = [];
  if (etiquettes.length)
    morceaux.push(`${etiquettes.length > 1 ? 'les étiquettes' : 'l’étiquette'} ${enListe(etiquettes)}`);
  if (objets.length) morceaux.push(`${objets.length > 1 ? 'les objets' : 'l’objet'} ${enListe(objets)}`);
  if (!morceaux.length) return '';
  const total = etiquettes.length + objets.length;
  const fin =
    total > 1
      ? 'ne sont plus dans la bibliothèque\u00a0: ils ne sont pas repris.'
      : `n’est plus dans la bibliothèque\u00a0: ${etiquettes.length ? 'elle n’est pas reprise' : 'il n’est pas repris'}.`;
  const phrase = `${morceaux.join(' et ')} ${fin}`;
  return phrase[0].toUpperCase() + phrase.slice(1);
}

// Le choix d'une quantité fixée manuellement : les segments de l'étape « Changements », mêmes classes,
// mêmes textes (fr.json, modifierVoyage.ligne).
function vueSegments(t, id, nom, { gardee, calcul }, recalculer) {
  const l = cle => t(`modifierVoyage.ligne.${cle}`);
  const choix = (valeur, libelle, coche) =>
    `<label class="segment"><input type="radio" name="m-${echapper(id)}" value="${valeur}" data-manuelle="${echapper(id)}"${coche ? ' checked' : ''} /><span>${echapper(libelle)}</span></label>`;
  return `
                <div class="segments recap-segments" role="radiogroup" aria-label="${echapper(remplir(l('quantiteDe'), { nom }))}">
                  ${choix('garder', remplir(l('garder'), { n: gardee }), !recalculer)}
                  ${choix('recalculer', remplir(l('recalculer'), { n: calcul }), recalculer)}
                </div>`;
}

// Le vrai aperçu, puis ce que la phase 11 y ajoute. Une mention se lit aussi au lecteur d'écran : elle
// rejoint le nom de la case.
function decorer(t, html, { ajouts, retires, manuelles, disparues }, { ecartes, recalculer }) {
  const gabarit = document.createElement('template');
  gabarit.innerHTML = html;
  const racine = gabarit.content;
  const phrase = phraseDisparus(disparues);
  if (phrase)
    racine
      .querySelector('.apercu-tete')
      ?.insertAdjacentHTML(
        'afterend',
        `<p class="message message-info refaire-disparus" role="note">${iconeInterface('info')}<span>${phrase}</span></p>`,
      );
  for (const ligne of racine.querySelectorAll('[data-objet]')) {
    const id = ligne.dataset.objet;
    const sous = ligne.querySelector('.objet-sous');
    const dire = mot => ligne.setAttribute('aria-label', `${ligne.getAttribute('aria-label')}, ${mot}`);
    if (ajouts.has(id)) {
      sous.innerHTML = pastille('aLaMain', 'ajouté à la main');
      dire('ajouté à la main');
    }
    // « retiré » tant que l'objet reste écarté : recoché, il est repris comme les autres.
    if (retires.has(id) && ecartes.has(id)) {
      sous.insertAdjacentHTML('beforeend', pastille('retire', 'retiré'));
      dire('retiré la dernière fois');
    }
    const fixee = manuelles.get(id);
    if (fixee) {
      const texte = remplir(t('modifierVoyage.ligne.manuelle'), { avant: fixee.gardee, apres: fixee.calcul });
      sous.innerHTML = `<span>${echapper(texte)}</span>`;
      dire(texte);
      // Écarté, il n'y a plus de quantité à choisir.
      if (!ecartes.has(id)) {
        const nom = ligne.querySelector('.objet-nom').textContent;
        ligne.parentElement.classList.add('refaire-manuelle');
        ligne.insertAdjacentHTML('afterend', vueSegments(t, id, nom, fixee, recalculer.has(id)));
      }
    }
  }
  return gabarit.innerHTML;
}

// origine : le voyage à refaire ; infos, etape : ce que l'assistant montre au départ (états de la
// maquette) ; fond(app) : l'écran d'où l'on part, derrière la fenêtre ; quitter() : on y revient ;
// creer({ infos, choisies, ecartes, recalculer }) : « Créer le voyage », rend le voyage créé, qu'on ouvre.
export function ouvrirRefaire(
  app,
  contexte,
  { origine, bibliotheque, infos, etape = 0, aujourdhui, fond, quitter, retour, creer, ouvrir },
) {
  const { t, langue } = contexte;
  const r = reprise(origine, bibliotheque);
  const nombreEtapes = etapesDe(bibliotheque).length;
  const recalculer = new Set();
  const depart = JSON.stringify([...r.choisies].sort());
  const calcul = outils => apercuRefait(origine, outils.bibliotheque, outils.infos, outils.etat.choisies, recalculer);

  async function demanderEcartes(outils, ids) {
    const nommes = new Set(ids);
    const objets = calcul(outils).apercu.flatMap(({ categorie, objets: lignes }) =>
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

  ouvrirAssistant(app, contexte, {
    // Le titre nomme le voyage d'origine ; « Créer le voyage » reste le bouton final.
    t: cle => (cle === 'nouveauVoyage.titre' ? `Refaire ${guillemets(origine.voyage.nom)}` : t(cle)),
    classe: 'assistant-refaire',
    infos: { ...infos },
    etat: {
      ...creerAssistant(),
      etape,
      // Les étapes d'étiquettes arrivent remplies : déjà touchables (l'aperçu, lui, attend nom et dates).
      vues: new Set(Array.from({ length: etape ? nombreEtapes : nombreEtapes - 1 }, (_, i) => i)),
      choisies: new Set(r.choisies),
      // Ce qu'on avait retiré la dernière fois arrive écarté (décision 1).
      ecartes: new Set(r.ecartes),
    },
    bibliotheque,
    aujourdhui,
    retour,
    fond,
    // Ce qui est repris ne compte pas comme une saisie : seul ce qu'on touche soi-même.
    saisieCommencee: ({ nom, destination, depart: jour }, etat) =>
      Boolean(nom.trim() || destination.trim() || jour || JSON.stringify([...etat.choisies].sort()) !== depart),
    quitter,
    // Le voyage créé (en mémoire, rien n'est écrit) s'ouvre aussitôt.
    terminer: async ({ infos: saisies, etat }) =>
      creer({ infos: saisies, choisies: etat.choisies, ecartes: etat.ecartes, recalculer }).voyage.id,
    allerA: async id => ouvrir(id),
    derniere: {
      vue: outils => {
        const donnees = calcul(outils);
        const html = vueApercu(t, langue, {
          apercu: donnees.apercu,
          ecartes: outils.etat.ecartes,
          infos: outils.infos,
          etiquettes: etiquettesChoisies(outils.bibliotheque, outils.etat.choisies),
          revenir: 1,
        });
        return decorer(t, html, donnees, { ecartes: outils.etat.ecartes, recalculer });
      },
      grise: outils => raisonVide(calcul(outils).apercu, outils.etat.ecartes) !== null,
      entrer(outils) {
        const ids = idsDeLApercu(calcul(outils).apercu);
        const { etat, aReconfirmer } = entrerDansApercu(
          outils.etat,
          signatureDe(outils.infos, outils.etat.choisies),
          ids,
        );
        outils.changerEtat(etat);
        return aReconfirmer.length ? () => demanderEcartes({ ...outils, etat }, aReconfirmer) : null;
      },
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
  });
}
