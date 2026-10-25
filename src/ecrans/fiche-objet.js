// Fiche d'un objet modèle de la bibliothèque (docs/PRD.md, US-4, US-5 ; maquette validée le
// 2026-10-25, docs/maquettes/bibliotheque/, états « fiche-objet », « nouvel-objet », « refus ») : nom,
// règle de quantité (fixe, par jour, par nuit), nombre, plafond, par personne ou partagé, avec la
// phrase de quantité et un exemple chiffré ; consommable ; « Dans quels voyages ? » ; note. La
// catégorie d'un objet ne se change pas. La mécanique est celle de toute fiche de modèle
// (src/ecrans/fiche-modele.js).
import { remplir } from '../i18n/traduction.js';
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
import { ouvrirFicheModele } from './fiche-modele.js';
import { champNom, compteur, interrupteur, inclusion, message, segments } from './fiche-modele-vues.js';
import { decrireRegle, pluriel } from './format.js';
import { echapper } from './html.js';

const ID_MESSAGE_QUANTITE = 'f-valeur-erreur';
const LIBELLES_NOMBRE = { fixe: 'nombre', par_jour: 'chaqueJour', par_nuit: 'chaqueNuit' };

// L'encadré sous la règle : la phrase de quantité (decrireRegle, la même que partout) et l'exemple
// chiffré sur 4 jours, 3 nuits, 2 voyageurs ; sans nombre, ce qu'il reste à faire.
function lecture(t, langue, brouillon) {
  if (brouillon.valeur === null)
    return `<b>${t('modele.objet.aIndiquer')}</b><span>${t('modele.objet.aIndiquerAide')}</span>`;
  const regle = regleDeSaisie(brouillon);
  const exemple = remplir(t('modele.objet.exemple'), {
    jours: pluriel(t, 'duree.jours', PERIODE_EXEMPLE.jours, langue),
    nuits: pluriel(t, 'duree.nuits', PERIODE_EXEMPLE.nuits, langue),
    voyageurs: pluriel(t, 'voyages.voyageurs', PERIODE_EXEMPLE.voyageurs, langue),
    quantite: exempleQuantite(regle),
  });
  return `<b>${echapper(decrireRegle(t, regle))}</b><span>${echapper(exemple)}</span>`;
}

function vuePlafond(t, b, erreurs) {
  if (!plafondPossible(b)) return '';
  const o = 'modele.objet';
  let precision = t(`${o}.plafondAucun`);
  if (b.plafondActif) precision = t(b.parPersonne ? `${o}.plafondAuPlusParPersonne` : `${o}.plafondAuPlus`);
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

function vueCorps(t, langue, b, codes, { categorie, groupes }) {
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
            ],
            b.regle,
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
          ${segments(
            'parPersonne',
            t(`${o}.pourQui`),
            [
              ['true', t(`${o}.parPersonne`)],
              ['false', t(`${o}.partage`)],
            ],
            b.parPersonne,
          )}
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
        </div>`;
}

// Ce qu'un changement entraîne, selon les règles du modèle : « Fixe » efface le plafond ;
// l'interrupteur allumé propose le nombre déjà choisi, éteint il l'efface.
function ajuster(b, cle) {
  if (cle === 'regle') Object.assign(b, changerRegle(b, b.regle));
  if (cle === 'plafondActif') Object.assign(b, activerPlafond(b, b.plafondActif));
}

// objet : celui à modifier, ou null pour un nouvel objet de categorie ; groupes : les étiquettes par
// groupe (voir inclusion()). enregistrer(saisie) : l'écran prépare et écrit l'objet
// (src/ecrans/bibliotheque.js).
export function ouvrirFicheObjet({ t, langue, objet, categorie, groupes, enregistrer, surFermeture, signal, dans }) {
  return ouvrirFicheModele({
    t,
    titre: objet ? objet.nom : t('modele.objet.nouveau'),
    sousTitre: remplir(t('modele.objet.dans'), { categorie: categorie.nom }),
    bouton: objet ? t('modele.enregistrer') : t('modele.objet.ajouter'),
    saisie: saisieDObjet(objet),
    valider: validerObjet,
    dessiner: (brouillon, codes) => vueCorps(t, langue, brouillon, codes, { categorie, groupes }),
    texteAbandon: objet
      ? remplir(t('modele.objet.abandonTexte'), { nom: objet.nom })
      : t('modele.objet.abandonNouveau'),
    enregistrer,
    ajuster,
    surFermeture,
    signal,
    dans,
  });
}
