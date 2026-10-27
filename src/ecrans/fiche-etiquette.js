// Fiches d'un groupe et d'une étiquette de l'écran Étiquettes (spec de la phase 6 ; maquette validée,
// docs/maquettes/etiquettes/fiches.js) : un nom seul, et pour un élément existant « Supprimer ». Depuis
// la phase 7, la suppression dit ses conséquences en chiffres, ou est refusée tant qu'elle laisserait des
// catégories ou des objets sans aucune étiquette (src/ecrans/suppression.js). Entrée dans le champ vaut
// « Enregistrer ». La mécanique (brouillon, abandon, enregistrement, suppression) est celle de toute
// fiche de modèle (src/ecrans/fiche-modele.js).
import { remplir } from '../i18n/traduction.js';
import { homonymeDEtiquette, homonymeDeGroupe, validerEtiquette, validerGroupe } from '../modele/etiquettes.js';
import { ouvrirFicheModele } from './fiche-modele.js';
import { champNom, zoneSuppression } from './fiche-modele-vues.js';
import { pluriel } from './format.js';
import { supprimerPuis } from './suppression.js';

const ID_AIDE = 'f-nom-aide';

// Le corps : le nom, son aide, et « Supprimer » à l'écart (absent d'une fiche neuve).
const vueCorps = (t, nom, erreur, { aide, supprimer }) => `
        ${champNom(t, nom, erreur, { idAide: ID_AIDE, entree: true })}
        <p class="aide" id="${ID_AIDE}">${aide}</p>${supprimer ? zoneSuppression(supprimer) : ''}`;

// « Supprimer » de la fiche : la question chiffrée ou le refus, l'écriture et le bandeau
// (supprimerPuis) ; apresSuppression() : l'écran relit la bibliothèque, avant que la fiche ne se ferme.
const suppression = ({ t, langue, stockage, ouvrirFiche, apresSuppression, signal, dans }, cible) =>
  supprimerPuis({ t, langue, stockage, cible, signal, dans, ouvrirFiche }, apresSuppression);

// groupe : celui à modifier, ou null pour un nouveau ; groupes : tous, pour l'unicité du nom ;
// etiquettesDuGroupe : les siennes (leur nombre, dit sous le titre). enregistrer(saisie) : l'écriture,
// faite par l'écran. stockage, ouvrirFiche, apresSuppression : la suppression (voir suppression()).
export function ouvrirFicheGroupe(contexte) {
  const { t, langue, groupe, groupes, etiquettesDuGroupe, enregistrer, surFermeture, signal, dans } = contexte;
  const n = etiquettesDuGroupe.length;
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
    supprimer: groupe && suppression(contexte, { type: 'groupe', id: groupe.id }),
    surFermeture,
    signal,
    dans,
  });
}

// etiquette : celle à modifier, ou null pour une nouvelle ; groupe : le sien (qui ne change pas) ;
// bibliotheque : { groupes, etiquettes }, pour l'unicité du nom, tous groupes confondus.
export function ouvrirFicheEtiquette(contexte) {
  const { t, langue, etiquette, groupe, bibliotheque, enregistrer, surFermeture, signal, dans } = contexte;
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
    supprimer: etiquette && suppression(contexte, { type: 'etiquette', id: etiquette.id }),
    surFermeture,
    signal,
    dans,
  });
}
