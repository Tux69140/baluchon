// Les parcours « Sauvegarder » (et, plus tard dans la phase, « Restaurer ») de l'écran Réglages (spec de la
// phase 12, docs/superpowers/specs/2026-10-31-phase-12-reglages-sauvegarde-design.md). Tout passe par le
// stockage et le modèle : lire toutes les données, construire le fichier, le déposer dans Téléchargements.
import { construireSauvegarde, nomDeSauvegarde } from '../modele/sauvegarde.js';
import { annoncerEnHaut, alerterEnHaut } from './alerte.js';
import { montrerMessage, sansAnnuler } from './annulation.js';
import { demander } from './fenetre.js';
import { echapper } from './html.js';

// Plus de noms que cela dans la même minute : une panne, pas un usage.
const ESSAIS_MAX = 99;

// Lit tout, dépose le fichier sous un nom libre (…-2, …-3 tant que le nom existe : jamais d'écrasement),
// et note la date. Rend { etat: 'depose', nom }, ou { etat: 'refuse' }. Garde « Annuler » : un
// rétablissement en cours s'achève d'abord, et « Annuler » ne répond plus pendant la sauvegarde.
function deposer({ stockage }, maintenant) {
  return sansAnnuler(async () => {
    const fichier = JSON.stringify(construireSauvegarde(await stockage.lireTout(), maintenant.toISOString()));
    for (let numero = 1; numero <= ESSAIS_MAX; numero += 1) {
      const nom = nomDeSauvegarde(maintenant, { numero });
      const reponse = await stockage.deposerFichier(nom, fichier);
      if (reponse === 'depose') {
        stockage.ecrireDerniereSauvegarde(maintenant.toISOString());
        return { etat: 'depose', nom };
      }
      if (reponse === 'refuse') return { etat: 'refuse' };
    }
    throw new Error(`Plus de nom libre pour ${nomDeSauvegarde(maintenant)}`);
  });
}

// Le fichier est déposé : le bandeau du bas le nomme ; un bandeau « Annuler » en cours reste intact, et le
// message passe alors en haut.
function annoncerDepot({ t, app }, nom, signal) {
  const debut = t('reglages.sauvegarde.deposee');
  const html = `${echapper(debut)} <b class="nom-fichier">${echapper(nom)}</b>`;
  if (!montrerMessage({ texteHtml: html })) annoncerEnHaut(app, `${debut} ${nom}`, signal);
}

// « Sauvegarder » : app, la racine de l'appli, et signal, la fin de l'écran, servent aux messages. La
// promesse se tient toujours : refus et panne sont dits à l'écran.
export async function sauvegarder(contexte, { app, signal }) {
  const { t } = contexte;
  let resultat;
  try {
    resultat = await deposer(contexte, new Date());
  } catch (erreur) {
    console.error(erreur);
    alerterEnHaut(app, t('reglages.sauvegarde.erreur'), signal);
    return;
  }
  if (resultat.etat === 'depose') return annoncerDepot({ ...contexte, app }, resultat.nom, signal);
  await demander({
    t,
    titre: t('reglages.sauvegarde.autorisation.titre'),
    texte: t('reglages.sauvegarde.autorisation.texte'),
    suite: [echapper(t('reglages.sauvegarde.autorisation.comment'))],
    boutons: [{ cle: 'compris', libelle: t('reglages.sauvegarde.compris'), principal: true }],
    signal,
  });
}
