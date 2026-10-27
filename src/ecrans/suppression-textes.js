// Les phrases d'une suppression dans la bibliothèque (spec de la phase 7 ; maquette validée,
// docs/maquettes/suppressions/textes.js) : la question chiffrée et le bandeau « Annuler ». Les chiffres
// viennent de consequences() (src/modele/suppressions.js), jamais d'un autre calcul ; les morceaux de
// phrase, de fr.json. cible : { type, id } ; nom : celui de la cible.
import { remplir } from '../i18n/traduction.js';
import { pluriel } from './format.js';
import { echapper } from './html.js';

// « A, B et C », dans la langue de l'appli.
export const enToutesLettres = (langue, morceaux) =>
  new Intl.ListFormat(langue, { type: 'conjunction' }).format(morceaux);

// « 2 objets et 1 catégorie » : ce qui perd une étiquette, en gras ; vide si rien n'est touché.
function compte(t, langue, { categories, objets }) {
  const morceaux = [];
  if (objets.length) morceaux.push(pluriel(t, 'suppression.objets', objets.length, langue));
  if (categories.length) morceaux.push(pluriel(t, 'suppression.categories', categories.length, langue));
  return morceaux.length ? `<b>${echapper(enToutesLettres(langue, morceaux))}</b>` : '';
}

// « … perdra cette étiquette ; il garde … » : « il » pour un seul objet, « elle » pour une seule
// catégorie, « ils » à plusieurs. cle : perteEtiquette ou perteGroupe.
function perte(t, langue, cle, perdent) {
  const nombre = compte(t, langue, perdent);
  if (!nombre) return '';
  let forme = perdent.categories.length ? 'categorie' : 'objet';
  if (perdent.categories.length + perdent.objets.length > 1) forme = 'plusieurs';
  return remplir(echapper(t(`suppression.${cle}.${forme}`)), { compte: nombre });
}

// Ce que la suppression dit en plus de la phrase sur les voyages, par type de cible, en HTML.
const SUITES = {
  objet: t => echapper(t('suppression.objetTexte')),
  categorie(t, langue, { objets }) {
    const siens = objets.length
      ? remplir(echapper(pluriel(t, 'suppression.categorieObjets', objets.length, langue)), {
          compte: `<b>${echapper(pluriel(t, 'suppression.objets', objets.length, langue))}</b>`,
        })
      : '';
    return [siens, echapper(t('suppression.categorieTexte'))];
  },
  etiquette: (t, langue, { perdent }) => [
    echapper(t('suppression.etiquetteSuite')),
    perte(t, langue, 'perteEtiquette', perdent),
  ],
  groupe(t, langue, { etiquettes, perdent }) {
    const siennes = etiquettes.length
      ? remplir(echapper(pluriel(t, 'suppression.groupeEtiquettes', etiquettes.length, langue)), {
          etiquettes: echapper(
            enToutesLettres(
              langue,
              etiquettes.map(e => e.nom),
            ),
          ),
        })
      : '';
    return [siennes, perte(t, langue, 'perteGroupe', perdent)];
  },
};

// La question avant d'écrire : { titre, texte } ; titre en texte simple (la fenêtre l'échappe), texte
// en HTML où seul le nombre est en gras.
export function question(t, langue, cible, nom, consequences) {
  const morceaux = [SUITES[cible.type](t, langue, consequences), echapper(t('suppression.voyages'))].flat();
  return {
    titre: remplir(t(`suppression.${cible.type}Titre`), { nom }),
    texte: morceaux.filter(Boolean).join(' '),
  };
}

// Ce que dit le bandeau « Annuler », en texte simple.
export function texteBandeau(t, langue, cible, nom, { objets, etiquettes }) {
  const { type } = cible;
  if (type === 'objet' || type === 'etiquette') return remplir(t(`annulation.${type}`), { nom });
  const emportes = type === 'categorie' ? objets.length : etiquettes.length;
  if (!emportes) return remplir(t(`annulation.${type}Vide`), { nom });
  return remplir(pluriel(t, `annulation.${type}`, emportes, langue), { nom });
}
