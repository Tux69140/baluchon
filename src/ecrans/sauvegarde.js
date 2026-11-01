// Les parcours « Sauvegarder » et « Restaurer » de l'écran Réglages (spec de la phase 12,
// docs/superpowers/specs/2026-10-31-phase-12-reglages-sauvegarde-design.md). Tout passe par le stockage et le
// modèle : lire toutes les données, construire le fichier, le déposer dans Téléchargements ; à la
// restauration, valider le fichier, confirmer, déposer d'abord une copie de l'état actuel, puis tout remplacer
// en une seule opération.
import { remplir } from '../i18n/traduction.js';
import { construireSauvegarde, lireSauvegarde, nomDeSauvegarde } from '../modele/sauvegarde.js';
import { annoncerEnHaut, alerterEnHaut } from './alerte.js';
import { montrerMessage, retirerAnnulation, sansAnnuler } from './annulation.js';
import { demander } from './fenetre.js';
import { formaterInstant, pluriel } from './format.js';
import { echapper } from './html.js';

// Plus de noms que cela dans la même minute : une panne, pas un usage.
const ESSAIS_MAX = 99;

// Lit tout et dépose le fichier sous un nom libre (…-2, …-3 tant que le nom existe : jamais d'écrasement).
// Rend { etat: 'depose', nom }, ou { etat: 'refuse' }. La date de dernière sauvegarde ne se note que pour
// une vraie sauvegarde, pas pour la copie d'avant une restauration. Sans garde : l'appelant la pose.
async function ecrireFichier({ stockage }, maintenant, { avantRestauration = false } = {}) {
  const fichier = JSON.stringify(construireSauvegarde(await stockage.lireTout(), maintenant.toISOString()));
  for (let numero = 1; numero <= ESSAIS_MAX; numero += 1) {
    const nom = nomDeSauvegarde(maintenant, { avantRestauration, numero });
    const reponse = await stockage.deposerFichier(nom, fichier);
    if (reponse === 'depose') {
      if (!avantRestauration) stockage.ecrireDerniereSauvegarde(maintenant.toISOString());
      return { etat: 'depose', nom };
    }
    if (reponse === 'refuse') return { etat: 'refuse' };
  }
  throw new Error(`Plus de nom libre pour ${nomDeSauvegarde(maintenant, { avantRestauration })}`);
}

// Garde « Annuler » : un rétablissement en cours s'achève d'abord, et « Annuler » ne répond plus pendant
// la sauvegarde.
const deposer = (contexte, maintenant) => sansAnnuler(() => ecrireFichier(contexte, maintenant));

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

// ---------- Restaurer ----------

// Une fenêtre d'information à un seul bouton « Compris » : paragraphes, déjà échappés ou non (texte simple).
function informer({ t }, titre, paragraphes, signal) {
  return demander({
    t,
    titre,
    texte: paragraphes[0],
    suite: paragraphes.slice(1).map(echapper),
    boutons: [{ cle: 'compris', libelle: t('reglages.sauvegarde.compris'), principal: true }],
    signal,
  });
}

// La copie de l'état actuel, puis le remplacement de tout, sous la même garde : aucun « Annuler » ne se glisse
// entre les deux. Le remplacement ne commence que si la copie est déposée ; il est une seule opération du
// stockage, qui laisse tout intact si elle échoue. Rend { etat: 'refuse' } sans avoir rien remplacé, ou
// { etat: 'depose' }.
function copierPuisRemplacer(contexte, contenu, maintenant) {
  return sansAnnuler(async () => {
    const copie = await ecrireFichier(contexte, maintenant, { avantRestauration: true });
    if (copie.etat !== 'depose') return copie;
    await contexte.stockage.remplacerTout(contenu);
    return copie;
  });
}

// « Restaurer » : texte, le contenu du fichier choisi. La promesse se tient toujours : refus, accès refusé et
// panne sont dits à l'écran, avec ce qui n'a pas changé. Réussie, la restauration retire tout bandeau
// « Annuler » (son rétablissement réécrirait des données d'avant par-dessus les restaurées), ramène à Mes
// voyages et le dit dans le bandeau du bas.
export async function restaurer(contexte, texte, { signal }) {
  const { t, langue } = contexte;
  const lu = lireSauvegarde(texte);
  const prefixe = 'reglages.sauvegarde.restauration';
  if (!lu.ok) {
    await informer(
      contexte,
      t(`${prefixe}.refus.titre`),
      [t(`${prefixe}.refus.${lu.raison}`), t(`${prefixe}.refus.rien`)],
      signal,
    );
    return;
  }
  const date = formaterInstant(t, lu.resume.creeLe, langue);
  const { voyages, objets } = lu.resume;
  const gras = (cle, n) => `<b>${echapper(pluriel(t, `${prefixe}.${cle}`, n, langue))}</b>`;
  const reponse = await demander({
    t,
    titre: remplir(t(`${prefixe}.titre`), { date }),
    texteHtml: remplir(echapper(t(`${prefixe}.contenu`)), {
      voyages: gras('voyages', voyages),
      objets: gras('objets', objets),
    }),
    suite: [echapper(t(`${prefixe}.remplacement`))],
    boutons: [
      { cle: 'garder', libelle: t(`${prefixe}.garder`) },
      { cle: 'restaurer', libelle: t(`${prefixe}.restaurer`), danger: true, icone: 'restaurer' },
    ],
    signal,
  });
  if (reponse !== 'restaurer' || signal.aborted) return;
  let copie;
  try {
    copie = await copierPuisRemplacer(contexte, lu.contenu, new Date());
  } catch (erreur) {
    console.error(erreur);
    await informer(contexte, t(`${prefixe}.panne.titre`), [t(`${prefixe}.panne.texte`)], signal);
    return;
  }
  if (copie.etat === 'refuse') {
    await informer(
      contexte,
      t('reglages.sauvegarde.autorisation.titre'),
      [
        t('reglages.sauvegarde.autorisation.texte'),
        t('reglages.sauvegarde.autorisation.comment'),
        t(`${prefixe}.refusee`),
      ],
      signal,
    );
    return;
  }
  retirerAnnulation();
  location.hash = '#/voyages';
  montrerMessage({ texteHtml: echapper(remplir(t(`${prefixe}.reussie`), { date })) });
}
