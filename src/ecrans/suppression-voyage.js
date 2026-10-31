// Supprimer un voyage (phase 11, décision 10 ; docs/superpowers/specs/2026-10-30-phase-11-refaire-supprimer-design.md,
// « Supprimer un voyage » ; maquette validée le 2026-10-30, docs/maquettes/refaire/), depuis le menu « ⋮ » du
// voyage ou de sa carte. La question chiffre sa liste et ce qui est déjà dans le sac
// (consequencesVoyage, src/modele/suppressions.js), « Garder » d'abord, « Supprimer » en rouge ; puis une
// seule écriture, faite par le stockage, et le bandeau « Annuler » de 10 s de la phase 7
// (src/ecrans/annulation.js), qui réécrit le voyage tel qu'il était relu juste avant la suppression.
// Seul le voyage est touché : la bibliothèque ne l'est pas, et ses écritures ne retirent pas ce bandeau.
import { remplir } from '../i18n/traduction.js';
import { consequencesVoyage } from '../modele/suppressions.js';
import { alerterEnHaut } from './alerte.js';
import { montrerAnnulation, sansAnnuler } from './annulation.js';
import { demander } from './fenetre.js';
import { pluriel } from './format.js';
import { echapper } from './html.js';

// « Sa liste de 87 objets, dont 23 déjà dans le sac, disparaîtra. … », en HTML : les nombres en gras ; la
// mention du sac seulement s'il contient quelque chose.
function texteQuestion(t, langue, { objets, dansLeSac }) {
  const gras = texte => `<b>${echapper(texte)}</b>`;
  const compte = gras(pluriel(t, 'ajustement.choix.objets', objets, langue));
  if (!dansLeSac) return remplir(echapper(t('suppressionVoyage.texte')), { compte });
  const sac = gras(remplir(t('suppressionVoyage.dansLeSac'), { n: dansLeSac }));
  return remplir(echapper(t('suppressionVoyage.texteSac')), { compte, sac });
}

// La suppression, sous la garde du bandeau (sansAnnuler : après un « Annuler » en cours, et « Annuler »
// inactif jusqu'à la fin) : le voyage relu au moment d'écrire est ce qu'« Annuler » réécrira, puis le dira
// aux écrans (événement « voyage-retabli », entier : Mes voyages relit sa liste). Rend false si le voyage
// n'existe déjà plus ; une écriture refusée lève, rien n'a changé.
function ecrire({ t, stockage, app }, id) {
  return sansAnnuler(async () => {
    const avant = await stockage.lireVoyage(id);
    if (!avant) return false;
    await stockage.supprimerVoyage(id);
    montrerAnnulation({
      t,
      app,
      voyage: id,
      texte: remplir(t('annulation.voyage'), { nom: avant.voyage.nom }),
      async annuler() {
        await stockage.creerVoyage(avant);
        window.dispatchEvent(new CustomEvent('voyage-retabli', { detail: { voyageId: id, entier: true } }));
      },
    });
    return true;
  });
}

// contexte : t, langue, stockage, app (la racine de l'appli), signal (la fin de l'écran, qui retire la
// question) ; depuis le voyage, revenirAccueil et attendre(travail), sa file d'écriture (les coches en cours
// s'écrivent avant qu'on ne chiffre ou ne supprime) ; depuis Mes voyages, relire(), qui relit et redessine
// la liste (la même relecture qu'à « Annuler »). Une lecture ou une écriture refusée dit le message de panne
// habituel, et l'on reste sur l'écran.
export async function supprimerVoyage(contexte, voyage, { depuis }) {
  const { t, langue, stockage, app, signal, attendre = travail => travail() } = contexte;
  const panne = erreur => {
    console.error(erreur);
    if (!signal.aborted) alerterEnHaut(app, t('suppression.erreur'), signal);
  };
  let contenu;
  try {
    contenu = await attendre(() => stockage.lireVoyage(voyage.id));
  } catch (erreur) {
    return panne(erreur);
  }
  if (!contenu || signal.aborted) return;
  const reponse = await demander({
    t,
    titre: remplir(t('suppressionVoyage.titre'), { nom: contenu.voyage.nom }),
    texteHtml: texteQuestion(t, langue, consequencesVoyage(contenu)),
    idTexte: 'suppression-texte',
    signal,
    boutons: [
      { cle: 'garder', libelle: t('suppression.garder') },
      { cle: 'supprimer', libelle: t('suppression.supprimer'), danger: true },
    ],
  });
  if (reponse !== 'supprimer' || signal.aborted) return;
  try {
    if (!(await attendre(() => ecrire(contexte, voyage.id)))) return;
  } catch (erreur) {
    return panne(erreur);
  }
  if (depuis === 'voyage') contexte.revenirAccueil();
  else await contexte.relire();
}
