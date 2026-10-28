// Les morceaux de formulaire des fiches de modèle (src/ecrans/fiche-modele.js), d'après la maquette
// validée le 2026-10-25 (docs/maquettes/bibliotheque/fiches.js) : nom, segments, interrupteur,
// compteur − nombre +, inclusion par étiquettes, message sous un champ, « Supprimer ». Chaque commande porte
// l'attribut que lit la mécanique commune (data-texte, data-nombre, data-pas, data-choix,
// data-bascule, data-pose, data-etiquette) ; les zones qui suivent la saisie au clavier sans être
// redessinées en entier portent data-vivant.
import { BORNES_QUANTITE } from '../modele/modeles.js';
import { remplir } from '../i18n/traduction.js';
import { signePuce } from './assistant-vues.js';
import { echapper } from './html.js';
import { iconeInterface } from './icones.js';

// Le message d'un champ, à sa place réservée (vide, il garde sa hauteur) ; texte : déjà traduit.
export const message = (id, texte) =>
  `<p class="erreur-champ" id="${id}" data-vivant="${id}">${texte ? `${iconeInterface('erreur')}<span>${echapper(texte)}</span>` : ''}</p>`;

// Un champ décrit par un message est dit invalide au lecteur d'écran tant que le message est là.
const invalide = texte => (texte ? ' aria-invalid="true"' : '');

// idAide : une aide écrite sous le champ, qui le décrit aussi ; entree : Entrée dans le champ vaut
// « Enregistrer » (data-entree, lu par src/ecrans/fiche-modele.js), pour une fiche au nom seul. id : celui
// du champ, quand deux fiches sont ouvertes l'une sur l'autre (« Nouvelle catégorie » sur « Ajouter un
// objet ») : chaque libellé doit nommer le champ de sa fiche.
export const champNom = (t, valeur, erreur, { idAide = '', entree = false, id = 'f-nom' } = {}) => `
        <div class="champ">
          <label for="${id}">${t('modele.nom')}</label>
          <input id="${id}" data-texte="nom"${entree ? ' data-entree' : ''} value="${echapper(valeur)}" autocomplete="off" maxlength="60" aria-describedby="${id}-erreur${idAide ? ` ${idAide}` : ''}"${invalide(erreur)} />
          ${message(`${id}-erreur`, erreur)}
        </div>`;

// Choix exclusif en segments : de vrais boutons radio, dessinés côte à côte. options : [valeur,
// libellé] ; les booléens s'écrivent 'true' et 'false'. attributs : posés sur le bouton de la valeur
// nommée (le message d'un champ, par exemple).
export const segments = (cle, legende, options, valeur, attributs = {}) => `
          <div class="segments" role="radiogroup" aria-label="${echapper(legende)}">${options
            .map(
              ([v, libelle]) => `
            <label class="segment">
              <input type="radio" name="f-${cle}" value="${v}" data-choix="${cle}"${v === String(valeur) ? ' checked' : ''}${attributs[v] ?? ''} />
              <span>${echapper(libelle)}</span>
            </label>`,
            )
            .join('')}
          </div>`;

export const interrupteur = (cle, actif, libelle) =>
  `<button type="button" class="interrupteur" role="switch" data-bascule="${cle}" aria-checked="${actif}" aria-label="${echapper(libelle)}"></button>`;

// − nombre + : le nombre se tape aussi au clavier (chiffres seuls). Aux bornes, − ou + reste à sa
// place mais ne fait rien (aria-disabled). valeur : null quand le champ est vide. defaut : la valeur que
// reprend le champ laissé vide quand on le quitte (data-defaut, lu par src/ecrans/fiche-modele.js) ; sans
// lui, il reste vide et la validation le refuse.
export function compteur(t, { cle, valeur, libelle, idMessage, erreur, defaut = null }) {
  const bouton = (sens, picto, texte, inactif) =>
    `<button type="button" class="bouton-icone" data-pas="${cle}" data-sens="${sens}" data-vivant="${cle}${sens}" aria-label="${echapper(remplir(t(texte), { libelle }))}"${inactif ? ' aria-disabled="true"' : ''}>${iconeInterface(picto)}</button>`;
  return `
            <span class="compteur compteur-saisie">
              ${bouton(-1, 'moins', 'modele.objet.moins', valeur !== null && valeur <= BORNES_QUANTITE.min)}
              <input type="text" inputmode="numeric" autocomplete="off" data-nombre="${cle}"${defaut === null ? '' : ` data-defaut="${defaut}"`} value="${valeur ?? ''}" aria-label="${echapper(libelle)}" aria-describedby="${idMessage}"${invalide(erreur)} />
              ${bouton(1, 'plus', 'modele.objet.plus', valeur !== null && valeur >= BORNES_QUANTITE.max)}
            </span>`;
}

// « Dans quels voyages ? » : toujours, ou selon les étiquettes, pressées par groupe. genre : 'categorie'
// ou 'objet' (les textes s'accordent) ; groupes : [{ groupe, etiquettes }] dans l'ordre de la
// bibliothèque ; aideToujours : la phrase sous le choix « toujours ».
export function inclusion(t, brouillon, erreur, { genre, groupes, aideToujours }) {
  const textes = `modele.${genre}`;
  const choisies = new Set(brouillon.etiquettes);
  const noms = groupes
    .flatMap(g => g.etiquettes)
    .filter(e => choisies.has(e.id))
    .map(e => e.nom);
  let aide = aideToujours;
  if (brouillon.selonEtiquettes)
    aide = noms.length
      ? remplir(t(`${textes}.aideEtiquettes`), { etiquettes: noms.join(', ') })
      : t(`${textes}.choisirEtiquettes`);
  const puce = e =>
    `<button type="button" class="puce puce-etiquette" data-etiquette="${echapper(e.id)}" aria-pressed="${choisies.has(e.id)}"><span class="puce-signe">${signePuce(choisies.has(e.id))}</span>${echapper(e.nom)}</button>`;
  const liste = brouillon.selonEtiquettes
    ? groupes
        .map(
          ({ groupe, etiquettes }) => `
          <div class="groupe-etiquettes">
            <h3>${echapper(groupe.nom)}</h3>
            <div class="puces-etiquettes">${etiquettes.map(puce).join('')}</div>
          </div>`,
        )
        .join('')
    : '';
  const toujours = genre === 'categorie' ? t('modele.toujoursIncluse') : t('modele.toujoursInclus');
  return `
        <fieldset class="champ champ-inclusion">
          <legend>${t('modele.inclusion')}</legend>
          ${segments(
            'selonEtiquettes',
            t('modele.inclusion'),
            [
              ['false', toujours],
              ['true', t('modele.selonEtiquettes')],
            ],
            brouillon.selonEtiquettes,
            { true: ` aria-describedby="f-etiquettes-erreur"${invalide(erreur)}` },
          )}
          <p class="aide">${echapper(aide)}</p>${liste}
          ${message('f-etiquettes-erreur', erreur)}
        </fieldset>`;
}

// « Supprimer » d'un élément existant, en fin de fiche et sous un trait : on ne le touche pas en voulant
// enregistrer (maquettes des phases 6 et 7). texte : déjà traduit ; le bouton appelle supprimer() de
// la fiche (src/ecrans/fiche-modele.js).
export const zoneSuppression = texte => `
        <div class="zone-suppression">
          <button type="button" class="bouton bouton-supprimer" data-supprimer>${iconeInterface('supprimer')}${texte}</button>
        </div>`;
