// Fiches d'un groupe et d'une étiquette de l'écran Étiquettes (spec de la phase 6 ; maquette validée,
// docs/maquettes/etiquettes/fiches.js) : un nom seul, et pour un élément existant « Supprimer », qui
// demande confirmation (décision du chef de projet, 2026-10-26 : simple confirmation, sans chiffrage
// des conséquences). Entrée dans le champ vaut « Enregistrer ». La mécanique (brouillon, abandon,
// enregistrement, suppression) est celle de toute fiche de modèle (src/ecrans/fiche-modele.js).
import { remplir } from '../i18n/traduction.js';
import { homonymeDEtiquette, homonymeDeGroupe, validerEtiquette, validerGroupe } from '../modele/etiquettes.js';
import { demander } from './fenetre.js';
import { ouvrirFicheModele } from './fiche-modele.js';
import { champNom, zoneSuppression } from './fiche-modele-vues.js';
import { pluriel } from './format.js';

const ID_AIDE = 'f-nom-aide';

// Le corps : le nom, son aide, et « Supprimer » à l'écart (absent d'une fiche neuve).
const vueCorps = (t, nom, erreur, { aide, supprimer }) => `
        ${champNom(t, nom, erreur, { idAide: ID_AIDE, entree: true })}
        <p class="aide" id="${ID_AIDE}">${aide}</p>${supprimer ? zoneSuppression(supprimer) : ''}`;

// La question avant de supprimer : « Garder » d'abord (le geste sans perte), « Supprimer » en rouge.
// Rend true une fois l'écriture faite (supprimer, qui lève une erreur en cas de panne), false sinon.
async function confirmerPuisSupprimer({ t, titre, texte, supprimer, signal }) {
  const reponse = await demander({
    t,
    titre,
    texte,
    signal,
    boutons: [
      { cle: 'garder', libelle: t('suppression.garder') },
      { cle: 'supprimer', libelle: t('suppression.supprimer'), danger: true },
    ],
  });
  if (reponse !== 'supprimer') return false;
  await supprimer();
  return true;
}

// groupe : celui à modifier, ou null pour un nouveau ; groupes : tous, pour l'unicité du nom ;
// etiquettesDuGroupe : les siennes, dans leur ordre (dites sous le titre et dans la question).
// enregistrer(saisie), supprimer() : les écritures, faites par l'écran.
export function ouvrirFicheGroupe({
  t,
  langue,
  groupe,
  groupes,
  etiquettesDuGroupe,
  enregistrer,
  supprimer,
  surFermeture,
  signal,
  dans,
}) {
  const n = etiquettesDuGroupe.length;
  const noms = new Intl.ListFormat(langue, { type: 'conjunction' }).format(etiquettesDuGroupe.map(e => e.nom));
  const texteErreur = (code, nom) =>
    code &&
    remplir(t(`modele.groupe.erreurs.${code}`), {
      nom: homonymeDeGroupe(groupes, nom, { exclu: groupe?.id, langue })?.nom ?? '',
    });
  const valider = brouillon => validerGroupe(brouillon, { groupes, existant: groupe, langue });
  let sousTitre = t('modele.groupe.sousTitreNeuf');
  if (groupe) sousTitre = n ? pluriel(t, 'etiquettes.etiquettes', n, langue) : t('modele.groupe.aucune');
  return ouvrirFicheModele({
    t,
    titre: groupe ? groupe.nom : t('modele.groupe.nouveau'),
    sousTitre,
    bouton: groupe ? t('modele.enregistrer') : t('modele.groupe.creer'),
    classe: 'fiche-nom',
    saisie: { nom: groupe?.nom ?? '' },
    valider,
    dessiner: (brouillon, erreurs) =>
      vueCorps(t, brouillon.nom, texteErreur(erreurs.nom, brouillon.nom), {
        aide: t('modele.groupe.aide'),
        supprimer: groupe && t('modele.groupe.supprimer'),
      }),
    texteAbandon: groupe
      ? remplir(t('modele.groupe.abandonTexte'), { nom: groupe.nom })
      : t('modele.groupe.abandonNouveau'),
    enregistrer,
    supprimer:
      groupe &&
      (() =>
        confirmerPuisSupprimer({
          t,
          titre: remplir(t('suppression.groupeTitre'), { nom: groupe.nom }),
          texte: n
            ? remplir(pluriel(t, 'suppression.groupeTexte', n, langue), { etiquettes: noms })
            : t('suppression.groupeVide'),
          supprimer,
          signal,
        })),
    surFermeture,
    signal,
    dans,
  });
}

// etiquette : celle à modifier, ou null pour une nouvelle ; groupe : le sien (qui ne change pas) ;
// bibliotheque : { groupes, etiquettes }, pour l'unicité du nom, tous groupes confondus.
export function ouvrirFicheEtiquette({
  t,
  langue,
  etiquette,
  groupe,
  bibliotheque,
  enregistrer,
  supprimer,
  surFermeture,
  signal,
  dans,
}) {
  // Le message nomme l'étiquette déjà là, avec sa casse, et son groupe.
  function texteErreur(code, nom) {
    if (!code) return '';
    const trouve = homonymeDEtiquette(bibliotheque, nom, { exclu: etiquette?.id, langue });
    return remplir(t(`modele.etiquette.erreurs.${code}`), {
      nom: trouve?.etiquette.nom ?? '',
      groupe: trouve?.groupe?.nom ?? '',
    });
  }
  return ouvrirFicheModele({
    t,
    titre: etiquette ? etiquette.nom : t('modele.etiquette.nouvelle'),
    sousTitre: remplir(t('modele.etiquette.dans'), { groupe: groupe.nom }),
    bouton: etiquette ? t('modele.enregistrer') : t('modele.etiquette.ajouter'),
    classe: 'fiche-nom',
    saisie: { nom: etiquette?.nom ?? '' },
    valider: brouillon =>
      validerEtiquette(brouillon, { bibliotheque, existante: etiquette, groupeId: groupe.id, langue }),
    dessiner: (brouillon, erreurs) =>
      vueCorps(t, brouillon.nom, texteErreur(erreurs.nom, brouillon.nom), {
        aide: t('modele.etiquette.aide'),
        supprimer: etiquette && t('modele.etiquette.supprimer'),
      }),
    texteAbandon: etiquette
      ? remplir(t('modele.etiquette.abandonTexte'), { nom: etiquette.nom })
      : t('modele.etiquette.abandonNouvelle'),
    enregistrer,
    supprimer:
      etiquette &&
      (() =>
        confirmerPuisSupprimer({
          t,
          titre: remplir(t('suppression.etiquetteTitre'), { nom: etiquette.nom }),
          texte: t('suppression.etiquetteTexte'),
          supprimer,
          signal,
        })),
    surFermeture,
    signal,
    dans,
  });
}
