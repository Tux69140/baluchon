// Fiche d'une catégorie de la bibliothèque (docs/PRD.md, US-3 ; maquette validée le 2026-10-25,
// docs/maquettes/bibliotheque/, états « fiche-categorie » et « nouvelle-categorie ») : nom, picto
// (choisi dans le catalogue) et couleur, « Dans quels voyages ? » ; existante, « Supprimer la
// catégorie » en bas (maquette de la phase 7). La mécanique (brouillon, abandon, enregistrement,
// suppression) est celle de toute fiche de modèle (src/ecrans/fiche-modele.js).
import { remplir } from '../i18n/traduction.js';
import { CATALOGUE } from '../modele/catalogue.js';
import { COULEURS, saisieDeCategorie, validerCategorie } from '../modele/modeles.js';
import { ouvrirCatalogue } from './catalogue.js';
import { ouvrirFicheModele } from './fiche-modele.js';
import { champNom, inclusion, zoneSuppression } from './fiche-modele-vues.js';
import { pluriel } from './format.js';
import { echapper } from './html.js';
import { iconeInterface, paveCategorie } from './icones.js';

const texteErreur = (t, code) => code && t(`modele.categorie.erreurs.${code}`);
// Un picto venu d'ailleurs que du catalogue (base modifiée à la main) n'a pas de nom : rien n'est dit.
const CONNUS = new Set(CATALOGUE.flatMap(({ pictos }) => pictos));
const nomPicto = (t, cle) => (CONNUS.has(cle) ? t(`catalogue.pictos.${cle}.nom`) : '');

// Le picto et la couleur d'une catégorie : le pavé, le nom du picto, « Changer de picto » (data-action
// « catalogue », voir actionCatalogue) et le nuancier. Partagé avec « Nouvelle catégorie » d'un voyage
// (src/ecrans/fiche-ajout.js).
export function vueApparence(t, brouillon) {
  const teinte = cle => {
    const choisie = brouillon.couleur === cle;
    return `<button type="button" class="teinte" role="radio" data-pose="couleur" data-valeur="${cle}" data-couleur="${cle}" aria-checked="${choisie}" aria-label="${t(`couleurs.${cle}`)}">${choisie ? iconeInterface('coche') : ''}</button>`;
  };
  return `
        <fieldset class="champ champ-sans-message">
          <legend>${t('modele.categorie.apparence')}</legend>
          <div class="apparence">
            ${paveCategorie(brouillon, { grand: true })}
            <span class="apparence-nom">${echapper(nomPicto(t, brouillon.icone))}</span>
            <button type="button" class="bouton bouton-secondaire" data-action="catalogue">${t('modele.categorie.changerPicto')}</button>
          </div>
          <div class="nuancier" role="radiogroup" aria-label="${t('modele.categorie.couleur')}">${COULEURS.map(teinte).join('')}</div>
        </fieldset>`;
}

// L'action « catalogue » d'une fiche (src/ecrans/fiche-modele.js) : le catalogue s'ouvre par-dessus la
// fiche ; une tuile touchée change le picto du brouillon.
export const actionCatalogue =
  ({ t, langue, signal, dans }) =>
  async brouillon => {
    const choisi = await ouvrirCatalogue({
      t,
      langue,
      icone: brouillon.icone,
      couleur: brouillon.couleur,
      signal,
      dans,
    });
    if (choisi) brouillon.icone = choisi;
  };

function vueCorps(t, brouillon, erreurs, { groupes, supprimer }) {
  return `
        ${champNom(t, brouillon.nom, texteErreur(t, erreurs.nom))}${vueApparence(t, brouillon)}
        ${inclusion(t, brouillon, texteErreur(t, erreurs.etiquettes), {
          genre: 'categorie',
          groupes,
          aideToujours: t('modele.categorie.aideToujours'),
        })}${supprimer ? zoneSuppression(t('modele.categorie.supprimer')) : ''}`;
}

// categorie : celle à modifier, ou null pour une nouvelle ; nombreObjets : les siens, dits sous le
// titre ; groupes : les étiquettes par groupe (voir inclusion()). enregistrer(saisie) : l'écran
// prépare et écrit la catégorie ; supprimer() : il pose la question et la supprime, rend true une fois
// fait (src/ecrans/edition-modeles.js) ; absent pour une catégorie neuve. prerempli, bouton
// (facultatifs, maquette de la phase 8) : la saisie de départ d'une catégorie neuve (celle d'une
// catégorie du voyage, src/ecrans/ajout-bibliotheque.js), et le libellé du bouton principal.
export function ouvrirFicheCategorie({
  t,
  langue,
  categorie,
  nombreObjets,
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
    titre: categorie ? categorie.nom : t('modele.categorie.nouvelle'),
    sousTitre: categorie ? pluriel(t, 'bibliotheque.objets', nombreObjets, langue) : '',
    bouton: bouton ?? (categorie ? t('modele.enregistrer') : t('modele.categorie.creer')),
    saisie: { ...saisieDeCategorie(categorie), ...prerempli },
    valider: validerCategorie,
    dessiner: (brouillon, erreurs) => vueCorps(t, brouillon, erreurs, { groupes, supprimer }),
    texteAbandon: categorie
      ? remplir(t('modele.categorie.abandonTexte'), { nom: categorie.nom })
      : t('modele.categorie.abandonNouvelle'),
    enregistrer,
    supprimer,
    actions: { catalogue: actionCatalogue({ t, langue, signal, dans }) },
    surFermeture,
    signal,
    dans,
  });
}
