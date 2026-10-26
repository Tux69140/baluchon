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

function vueCorps(t, brouillon, erreurs, { groupes, supprimer }) {
  const teinte = cle => {
    const choisie = brouillon.couleur === cle;
    return `<button type="button" class="teinte" role="radio" data-pose="couleur" data-valeur="${cle}" data-couleur="${cle}" aria-checked="${choisie}" aria-label="${t(`couleurs.${cle}`)}">${choisie ? iconeInterface('coche') : ''}</button>`;
  };
  return `
        ${champNom(t, brouillon.nom, texteErreur(t, erreurs.nom))}
        <fieldset class="champ champ-sans-message">
          <legend>${t('modele.categorie.apparence')}</legend>
          <div class="apparence">
            ${paveCategorie(brouillon, { grand: true })}
            <span class="apparence-nom">${echapper(nomPicto(t, brouillon.icone))}</span>
            <button type="button" class="bouton bouton-secondaire" data-action="catalogue">${t('modele.categorie.changerPicto')}</button>
          </div>
          <div class="nuancier" role="radiogroup" aria-label="${t('modele.categorie.couleur')}">${COULEURS.map(teinte).join('')}</div>
        </fieldset>
        ${inclusion(t, brouillon, texteErreur(t, erreurs.etiquettes), {
          genre: 'categorie',
          groupes,
          aideToujours: t('modele.categorie.aideToujours'),
        })}${supprimer ? zoneSuppression(t('modele.categorie.supprimer')) : ''}`;
}

// categorie : celle à modifier, ou null pour une nouvelle ; nombreObjets : les siens, dits sous le
// titre ; groupes : les étiquettes par groupe (voir inclusion()). enregistrer(saisie) : l'écran
// prépare et écrit la catégorie ; supprimer() : il pose la question et la supprime, rend true une fois
// fait (src/ecrans/edition-modeles.js) ; absent pour une catégorie neuve.
export function ouvrirFicheCategorie({
  t,
  langue,
  categorie,
  nombreObjets,
  groupes,
  enregistrer,
  supprimer,
  surFermeture,
  signal,
  dans,
}) {
  return ouvrirFicheModele({
    t,
    titre: categorie ? categorie.nom : t('modele.categorie.nouvelle'),
    sousTitre: categorie ? pluriel(t, 'bibliotheque.objets', nombreObjets, langue) : '',
    bouton: categorie ? t('modele.enregistrer') : t('modele.categorie.creer'),
    saisie: saisieDeCategorie(categorie),
    valider: validerCategorie,
    dessiner: (brouillon, erreurs) => vueCorps(t, brouillon, erreurs, { groupes, supprimer }),
    texteAbandon: categorie
      ? remplir(t('modele.categorie.abandonTexte'), { nom: categorie.nom })
      : t('modele.categorie.abandonNouvelle'),
    enregistrer,
    supprimer,
    actions: {
      // Le catalogue s'ouvre par-dessus la fiche ; une tuile touchée change le picto du brouillon.
      async catalogue(brouillon) {
        const choisi = await ouvrirCatalogue({
          t,
          langue,
          icone: brouillon.icone,
          couleur: brouillon.couleur,
          signal,
          dans,
        });
        if (choisi) brouillon.icone = choisi;
      },
    },
    surFermeture,
    signal,
    dans,
  });
}
