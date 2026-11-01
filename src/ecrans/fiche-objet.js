// Fiche d'un objet modèle de la bibliothèque (docs/PRD.md, US-4, US-5 ; maquette validée le
// 2026-10-25, docs/maquettes/bibliotheque/, états « fiche-objet », « nouvel-objet », « refus ») : nom,
// règle de quantité (fixe, par jour, par nuit, par semaine), nombre, plafond, pour qui (tous, adultes,
// femmes, hommes, enfants), par personne du groupe ou partagé (maquette de la phase 13,
// docs/maquettes/bibliotheque-depart/), avec le résumé de la règle et un exemple chiffré ; consommable ; « Dans quels voyages ? » ; note ;
// existant, « Supprimer l'objet » en bas (maquette de la phase 7). La catégorie d'un objet ne se
// change pas. La mécanique est celle de toute fiche de modèle
// (src/ecrans/fiche-modele.js).
import { remplir } from '../i18n/traduction.js';
import { GROUPES_COMPOSITION, POUR_QUI } from '../modele/composition.js';
import {
  PERIODE_EXEMPLE,
  activerPlafond,
  changerRegle,
  exempleQuantite,
  plafondPossible,
  regleDeSaisie,
  saisieDObjet,
  validerObjet,
} from '../modele/modeles.js';
import { semainesCommencees } from '../modele/quantites.js';
import { ouvrirFicheModele } from './fiche-modele.js';
import {
  champNom,
  compteur,
  interrupteur,
  inclusion,
  message,
  segments,
  zoneSuppression,
} from './fiche-modele-vues.js';
import { decrireRegle, pluriel } from './format.js';
import { echapper } from './html.js';

const ID_MESSAGE_QUANTITE = 'f-valeur-erreur';
const LIBELLES_NOMBRE = {
  fixe: 'nombre',
  par_jour: 'chaqueJour',
  par_nuit: 'chaqueNuit',
  par_semaine: 'chaqueSemaine',
};

// L'encadré sous la règle : le résumé (decrireRegle, le même que partout), l'exemple chiffré sur 10 jours,
// 9 nuits et un voyageur de chaque groupe (« 2 semaines » pour « par semaine »), et, pour un groupe autre
// que « tous », ce qui arrive quand il manque au voyage ; sans nombre, ce qu'il reste à faire.
function lecture(t, langue, brouillon) {
  if (brouillon.valeur === null)
    return `<b>${t('modele.objet.aIndiquer')}</b><span>${t('modele.objet.aIndiquerAide')}</span>`;
  const regle = regleDeSaisie(brouillon);
  const o = 'modele.objet';
  const semaines =
    regle.regle === 'par_semaine'
      ? remplir(t(`${o}.exempleSemaines`), {
          semaines: pluriel(t, 'duree.semaines', semainesCommencees(PERIODE_EXEMPLE.jours), langue),
        })
      : '';
  const compte = Object.fromEntries(
    GROUPES_COMPOSITION.map(g => [g, pluriel(t, `voyages.compte.${g}`, PERIODE_EXEMPLE[g], langue)]),
  );
  const exemple = remplir(t(`${o}.exemple`), {
    jours: `${pluriel(t, 'duree.jours', PERIODE_EXEMPLE.jours, langue)}${semaines}`,
    nuits: pluriel(t, 'duree.nuits', PERIODE_EXEMPLE.nuits, langue),
    composition: remplir(t(`${o}.exempleComposition`), compte),
    quantite: exempleQuantite(regle),
  });
  const absent =
    regle.pourQui === 'tous'
      ? ''
      : `<span class="lecture-absent">${echapper(t(`${o}.absent.${regle.pourQui}`))}</span>`;
  return `<b>${echapper(decrireRegle(t, regle))}</b><span>${echapper(exemple)}</span>${absent}`;
}

function vuePlafond(t, b, erreurs) {
  if (!plafondPossible(b)) return '';
  const o = 'modele.objet';
  let precision = t(`${o}.plafondAucun`);
  if (b.plafondActif) precision = t(b.parPersonne ? `${o}.plafondPar.${b.pourQui}` : `${o}.plafondAuPlus`);
  const nombre = b.plafondActif
    ? `
          <div class="ligne-reglage"><span>${t(`${o}.auPlus`)}</span>${compteur(t, {
            cle: 'plafond',
            valeur: b.plafond,
            libelle: t(`${o}.plafond`),
            idMessage: ID_MESSAGE_QUANTITE,
            erreur: erreurs.plafond,
          })}</div>`
    : '';
  return `
          <div class="ligne-reglage">
            <span>${t(`${o}.plafond`)}<small>${precision}</small></span>
            ${interrupteur('plafondActif', b.plafondActif, t(`${o}.plafond`))}
          </div>${nombre}`;
}

// « Pour qui » : le groupe, puis comment il compte (« Par enfant » nomme le groupe choisi, ou « Partagé ») ;
// un titre visible, car les cinq mots seuls ne disent pas de quoi il s'agit.
const vuePourQui = (t, b) => `
          <div class="pour-qui">
            <p class="pour-qui-titre">${t('modele.objet.pourQui')}</p>
            ${segments(
              'pourQui',
              t('modele.objet.pourQui'),
              POUR_QUI.map(g => [g, t(`modele.objet.groupes.${g}`)]),
              b.pourQui,
              {},
              { classe: 'segments-pour-qui' },
            )}
            ${segments(
              'parPersonne',
              t('modele.objet.compter'),
              [
                ['true', t(`modele.objet.par.${b.pourQui}`)],
                ['false', t('modele.objet.partage')],
              ],
              b.parPersonne,
            )}
          </div>`;

function vueCorps(t, langue, b, codes, { categorie, groupes, supprimer }) {
  const o = 'modele.objet';
  const erreurs = Object.fromEntries(Object.entries(codes).map(([champ, code]) => [champ, t(`${o}.erreurs.${code}`)]));
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
              ['par_semaine', t(`${o}.parSemaine`)],
            ],
            b.regle,
            {},
            { classe: 'segments-regle' },
          )}
          <div class="ligne-reglage">
            <span>${t(`${o}.${LIBELLES_NOMBRE[b.regle]}`)}</span>
            ${compteur(t, {
              cle: 'valeur',
              valeur: b.valeur,
              libelle: t(`${o}.quantite`),
              idMessage: ID_MESSAGE_QUANTITE,
              erreur: erreurs.valeur,
            })}
          </div>${vuePlafond(t, b, erreurs)}
          ${vuePourQui(t, b)}
          <p class="lecture" aria-live="polite" data-vivant="lecture">${lecture(t, langue, b)}</p>
          ${message(ID_MESSAGE_QUANTITE, erreurs.valeur ?? erreurs.plafond)}
        </fieldset>
        <div class="ligne-reglage ligne-seule">
          <span>${t(`${o}.consommable`)}<small>${t(`${o}.consommableAide`)}</small></span>
          ${interrupteur('consommable', b.consommable, t(`${o}.consommable`))}
        </div>
        ${inclusion(t, b, erreurs.etiquettes, {
          genre: 'objet',
          groupes,
          aideToujours: remplir(t(`${o}.aideToujours`), { categorie: categorie.nom }),
        })}
        <div class="champ champ-sans-message">
          <label for="f-note">${t(`${o}.note`)} <small>${t(`${o}.noteAide`)}</small></label>
          <textarea id="f-note" data-texte="note" rows="3" maxlength="400">${echapper(b.note)}</textarea>
        </div>${supprimer ? zoneSuppression(t(`${o}.supprimer`)) : ''}`;
}

// Ce qu'un changement entraîne, selon les règles du modèle : « Fixe » efface le plafond ;
// l'interrupteur allumé propose le nombre déjà choisi, éteint il l'efface.
function ajuster(b, cle) {
  if (cle === 'regle') Object.assign(b, changerRegle(b, b.regle));
  if (cle === 'plafondActif') Object.assign(b, activerPlafond(b, b.plafondActif));
}

// objet : celui à modifier, ou null pour un nouvel objet de categorie ; groupes : les étiquettes par
// groupe (voir inclusion()). enregistrer(saisie) : l'écran prépare et écrit l'objet ; supprimer() : il
// pose la question et le supprime, rend true une fois fait (src/ecrans/edition-modeles.js) ; absent
// pour un objet neuf. prerempli, bouton (facultatifs, maquette de la phase 8) : la saisie de départ
// d'un objet neuf (celle d'un objet ajouté au voyage, src/ecrans/ajout-bibliotheque.js), et le
// libellé du bouton principal.
export function ouvrirFicheObjet({
  t,
  langue,
  objet,
  categorie,
  groupes,
  enregistrer,
  supprimer,
  prerempli = {},
  bouton,
  surFermeture,
  signal,
  dans,
}) {
  return ouvrirFicheModele({
    t,
    titre: objet ? objet.nom : t('modele.objet.nouveau'),
    sousTitre: remplir(t('modele.objet.dans'), { categorie: categorie.nom }),
    bouton: bouton ?? (objet ? t('modele.enregistrer') : t('modele.objet.ajouter')),
    saisie: { ...saisieDObjet(objet), ...prerempli },
    valider: validerObjet,
    dessiner: (brouillon, codes) => vueCorps(t, langue, brouillon, codes, { categorie, groupes, supprimer }),
    texteAbandon: objet
      ? remplir(t('modele.objet.abandonTexte'), { nom: objet.nom })
      : t('modele.objet.abandonNouveau'),
    enregistrer,
    supprimer,
    ajuster,
    surFermeture,
    signal,
    dans,
  });
}
