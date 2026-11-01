// La fiche d'un objet modèle de la Bibliothèque, avec ce que la phase 13 y change (conception, « Où la
// composition apparaît ») : la règle gagne « Par semaine » (plafond possible, comme par jour et par nuit) ;
// l'ancien choix « Par personne | Partagé » devient « Pour qui » (Tous, Adultes, Femmes, Hommes, Enfants)
// puis « Par enfant | Partagé », le premier segment nommant le groupe choisi ; l'encadré de lecture donne
// le résumé de la règle, l'exemple chiffré sur une composition où chaque groupe compte une personne, et,
// pour un groupe, ce qui se passe quand il est absent du voyage.
// La mécanique est celle de toute fiche de modèle (src/ecrans/fiche-modele.js), les morceaux de formulaire
// ceux de l'appli (src/ecrans/fiche-modele-vues.js) ; rien n'est écrit.
import { remplir } from '../../../src/i18n/traduction.js';
import { activerPlafond, changerRegle, plafondPossible, validerObjet } from '../../../src/modele/modeles.js';
import { ouvrirFicheModele } from '../../../src/ecrans/fiche-modele.js';
import {
  champNom,
  compteur,
  inclusion,
  interrupteur,
  message,
  segments,
  zoneSuppression,
} from '../../../src/ecrans/fiche-modele-vues.js';
import { echapper } from '../../../src/ecrans/html.js';
import { POUR_QUI, exempleChiffre, resumeRegle } from './composition.js';
import { TEXTES as T } from './textes.js';

const o = 'modele.objet';
const ID_MESSAGE = 'f-valeur-erreur';
const F = T.fiche;
const LIBELLES_NOMBRE = { fixe: 'nombre', par_jour: 'chaqueJour', par_nuit: 'chaqueNuit' };

const saisieDe = objet => ({
  nom: objet.nom,
  regle: objet.regle,
  valeur: objet.valeur,
  plafondActif: objet.plafond !== null,
  plafond: objet.plafond,
  pourQui: objet.pourQui,
  partage: objet.partage,
  consommable: objet.consommable,
  selonEtiquettes: !objet.toujoursInclus,
  etiquettes: [...objet.etiquettes],
  note: objet.note,
});

const regleDe = b => ({
  regle: b.regle,
  valeur: b.valeur,
  plafond: b.plafondActif && plafondPossible(b) ? b.plafond : null,
  pourQui: b.pourQui,
  partage: b.partage,
});

function lecture(t, b) {
  if (b.valeur === null) return `<b>${t(`${o}.aIndiquer`)}</b><span>${t(`${o}.aIndiquerAide`)}</span>`;
  const regle = regleDe(b);
  const { phrase, absent } = exempleChiffre(regle);
  return `<b>${echapper(resumeRegle(regle))}</b><span>${echapper(phrase)}</span>${absent ? `<span class="lecture-absent">${echapper(absent)}</span>` : ''}`;
}

function vuePlafond(t, b, erreurs) {
  if (!plafondPossible(b)) return '';
  let precision = t(`${o}.plafondAucun`);
  if (b.plafondActif) precision = b.partage ? t(`${o}.plafondAuPlus`) : F.plafondPar[b.pourQui];
  const nombre = b.plafondActif
    ? `
          <div class="ligne-reglage"><span>${t(`${o}.auPlus`)}</span>${compteur(t, { cle: 'plafond', valeur: b.plafond, libelle: t(`${o}.plafond`), idMessage: ID_MESSAGE, erreur: erreurs.plafond })}</div>`
    : '';
  return `
          <div class="ligne-reglage">
            <span>${t(`${o}.plafond`)}<small>${precision}</small></span>
            ${interrupteur('plafondActif', b.plafondActif, t(`${o}.plafond`))}
          </div>${nombre}`;
}

// « Pour qui » : le groupe, puis comment il compte ; un titre visible, car les cinq mots seuls ne disent
// pas de quoi il s'agit.
const vuePourQui = b => `
          <div class="pour-qui">
            <p class="pour-qui-titre" id="titre-pour-qui">${F.pourQui}</p>
            ${segments('pourQui', F.pourQui, POUR_QUI.map(g => [g, F.groupes[g]]), b.pourQui, {}, { classe: 'segments-pour-qui' })}
            ${segments(
              'partage',
              F.compter,
              [
                ['false', F.par[b.pourQui]],
                ['true', F.partage],
              ],
              b.partage,
            )}
          </div>`;

function vueCorps(t, b, codes, { categorie, groupes }) {
  const erreurs = Object.fromEntries(Object.entries(codes).map(([champ, code]) => [champ, t(`${o}.erreurs.${code}`)]));
  const libelleNombre = b.regle === 'par_semaine' ? F.chaqueSemaine : t(`${o}.${LIBELLES_NOMBRE[b.regle]}`);
  return `
        ${champNom(t, b.nom, erreurs.nom)}
        <fieldset class="champ">
          <legend>${t(`${o}.quantite`)}</legend>
          ${segments(
            'regle',
            t(`${o}.regle`),
            [
              ['fixe', t(`${o}.fixe`)],
              ['par_jour', t(`${o}.parJour`)],
              ['par_nuit', t(`${o}.parNuit`)],
              ['par_semaine', F.parSemaine],
            ],
            b.regle,
            {},
            { classe: 'segments-regle' },
          )}
          <div class="ligne-reglage">
            <span>${libelleNombre}</span>
            ${compteur(t, { cle: 'valeur', valeur: b.valeur, libelle: t(`${o}.quantite`), idMessage: ID_MESSAGE, erreur: erreurs.valeur })}
          </div>${vuePlafond(t, b, erreurs)}${vuePourQui(b)}
          <p class="lecture" aria-live="polite" data-vivant="lecture">${lecture(t, b)}</p>
          ${message(ID_MESSAGE, erreurs.valeur ?? erreurs.plafond)}
        </fieldset>
        <div class="ligne-reglage ligne-seule">
          <span>${t(`${o}.consommable`)}<small>${t(`${o}.consommableAide`)}</small></span>
          ${interrupteur('consommable', b.consommable, t(`${o}.consommable`))}
        </div>
        ${inclusion(t, b, erreurs.etiquettes, { genre: 'objet', groupes, aideToujours: remplir(t(`${o}.aideToujours`), { categorie: categorie.nom }) })}
        <div class="champ champ-sans-message">
          <label for="f-note">${t(`${o}.note`)} <small>${t(`${o}.noteAide`)}</small></label>
          <textarea id="f-note" data-texte="note" rows="3" maxlength="400">${echapper(b.note)}</textarea>
        </div>${zoneSuppression(t(`${o}.supprimer`))}`;
}

function ajuster(b, cle) {
  if (cle === 'regle') Object.assign(b, changerRegle(b, b.regle));
  if (cle === 'plafondActif') Object.assign(b, activerPlafond(b, b.plafondActif));
}

// Ouvre la fiche d'un objet existant ; enregistrer ne fait que la fermer.
export function ouvrirFiche({ t, objet, categorie, groupes, signal, dans, surFermeture }) {
  return ouvrirFicheModele({
    t,
    titre: objet.nom,
    sousTitre: remplir(t(`${o}.dans`), { categorie: categorie.nom }),
    bouton: t('modele.enregistrer'),
    saisie: saisieDe(objet),
    valider: validerObjet,
    dessiner: (brouillon, codes) => vueCorps(t, brouillon, codes, { categorie, groupes }),
    texteAbandon: remplir(t(`${o}.abandonTexte`), { nom: objet.nom }),
    enregistrer: async () => {},
    supprimer: async () => false,
    ajuster,
    surFermeture,
    signal,
    dans,
  });
}
