// Ce que l'aperçu de « Refaire ce voyage » ajoute à celui de la création (src/ecrans/assistant-vues.js,
// vueApercu ; phase 11, décisions 1, 4, 6 et 7 ; maquette validée le 2026-10-30, docs/maquettes/refaire/) :
// en tête, la phrase qui nomme ce qui a disparu de la bibliothèque ; sur les lignes, les mentions « ajouté
// à la main » et « retiré », et le choix « Garder | Recalculer » d'une quantité fixée manuellement, dessiné
// comme à l'étape « Changements » (src/ecrans/changements-vues.js). Rien que du dessin : le contenu vient du
// modèle (src/modele/refaire.js).
import { remplir } from '../i18n/traduction.js';
import { pastilleMention, vueSegmentsManuelle } from './changements-vues.js';
import { decrireRegle, pluriel } from './format.js';
import { echapper } from './html.js';
import { iconeInterface } from './icones.js';
import { enToutesLettres } from './suppression-textes.js';

const guillemets = nom => `«\u00a0${nom}\u00a0»`;

// Les étiquettes et les objets du voyage d'origine qui ne sont plus dans la bibliothèque, et qui ne sont
// donc pas repris : « L’étiquette « Plongée » et l’objet « Lampe frontale » ne sont plus dans la
// bibliothèque : ils ne sont pas repris. » Rien s'il n'y en a pas. disparues : celles de repriseDe.
export function vuePhraseDisparus(t, langue, { etiquettes, objets }) {
  const d = cle => `refaireVoyage.disparus.${cle}`;
  const morceau = (cle, noms) =>
    remplir(pluriel(t, d(cle), noms.length, langue), { liste: enToutesLettres(langue, noms.map(guillemets)) });
  const morceaux = [];
  if (etiquettes.length) morceaux.push(morceau('etiquettes', etiquettes));
  if (objets.length) morceaux.push(morceau('objets', objets));
  if (!morceaux.length) return '';
  const [a, b] = morceaux;
  const debut = b ? remplir(t(d('et')), { a, b }) : a;
  let forme = etiquettes.length ? 'etiquetteSeule' : 'objetSeul';
  if (etiquettes.length + objets.length > 1) forme = 'plusieurs';
  const phrase = remplir(t(d(forme)), { debut });
  // La phrase commence par un morceau en minuscule (« l’étiquette… ») : la majuscule vient d'ici.
  return `
            <p class="message message-info refaire-disparus" role="note">${iconeInterface('info')}<span>${echapper(phrase[0].toUpperCase() + phrase.slice(1))}</span></p>`;
}

// La fonction `ligne` de vueApercu pour un voyage refait. donnees : ce que rend apercuRefait (ajouts,
// retires, manuelles) ; recalculer : les quantités fixées qu'on a choisi de recalculer.
export function ligneRefaite(t, { ajouts, retires, manuelles }, { recalculer }) {
  return (objet, ecarte) => {
    const { id } = objet;
    const fixee = manuelles.get(id);
    if (fixee) {
      const texte = remplir(t('modifierVoyage.ligne.manuelle'), { avant: fixee.gardee, apres: fixee.calcul });
      return {
        sous: `<span>${echapper(texte)}</span>`,
        dire: texte,
        // Écarté, il n'y a plus de quantité à choisir.
        apres: ecarte ? '' : vueSegmentsManuelle(t, { cle: id, nom: objet.nom, ...fixee }, recalculer.has(id)),
      };
    }
    if (ajouts.has(id)) {
      const ajoute = t('refaireVoyage.ajoute');
      return { sous: pastilleMention(ajoute, 'aLaMain'), dire: ajoute };
    }
    // « retiré » tant que l'objet reste écarté : recoché, il est repris comme les autres.
    if (retires.has(id) && ecarte)
      return {
        sous: `${decrireRegle(t, objet)}${pastilleMention(t('refaireVoyage.retire'))}`,
        dire: t('refaireVoyage.retireLu'),
      };
    return null;
  };
}
