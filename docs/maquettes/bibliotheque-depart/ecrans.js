// Les écrans de l'appli que la phase 13 touche, dessinés par le vrai code et à peine retouchés :
// - Nouveau voyage (le vrai moteur de l'assistant et le vrai aperçu), avec les trois compteurs et
//   l'aperçu calculé sur la composition ;
// - Modifier le voyage, étape « Changements » (le vrai dessin), ce qu'une nouvelle composition fait entrer ;
// - l'écran d'un voyage (le vrai dessin), dont l'en-tête dit la composition en détail ;
// - la Bibliothèque (le vrai écran), dont les lignes disent le résumé de la règle et dont les objets
//   ouvrent la fiche de la phase 13 (fiche.js).
// Partout où l'appli écrit « 2 voyageurs » dans le détail d'un voyage, la maquette écrit la composition :
// le texte « voyages.details » est remplacé (avecComposition).
import { creerAssistant, etapesDe } from '../../../src/ecrans/assistant.js';
import { ouvrirAssistant } from '../../../src/ecrans/assistant-controleur.js';
import { ecranBibliotheque } from '../../../src/ecrans/bibliotheque.js';
import { vueChangements } from '../../../src/ecrans/changements-vues.js';
import { GRAND_FORMAT, TROIS_COLONNES } from '../../../src/ecrans/disposition.js';
import { echapper } from '../../../src/ecrans/html.js';
import { brancherMenuVoyage } from '../../../src/ecrans/menu-voyage.js';
import { etapeApercu } from '../../../src/ecrans/nouveau-voyage.js';
import { etatInitial } from '../../../src/ecrans/rangement.js';
import { vueVoyage } from '../../../src/ecrans/voyage-vues.js';
import { groupesAvecEtiquettes } from '../../../src/modele/inclusion.js';
import { listeParCategorie } from '../../../src/modele/voyage.js';
import {
  GROUPES_COMPOSITION,
  apercu,
  changementsDeComposition,
  detailComposition,
  resumeRegle,
} from './composition.js';
import { poserCompteurs } from './compteurs.js';
import { ouvrirFiche } from './fiche.js';
import { TEXTES as T } from './textes.js';

export const grandFormat = matchMedia(GRAND_FORMAT);
export const troisColonnes = matchMedia(TROIS_COLONNES);

// Les textes de l'appli, le détail d'un voyage disant sa composition (lue à chaque appel : elle change
// pendant la saisie) ; remplaces : d'autres textes à remplacer.
const avecComposition = (t, composition, remplaces = {}) => cle => {
  if (cle === 'voyages.details') return `{periode} · ${detailComposition(composition)}`;
  return remplaces[cle] ?? t(cle);
};

// ---------- Nouveau voyage ----------
// infos : { nom, destination, depart, retour, femmes, hommes, enfants } ; etape : celle où l'on arrive.
export function ouvrirNouveau(app, contexte, { bibliotheque, infos, choisies, etape, aujourdhui, fond, quitter }) {
  const { t, langue } = contexte;
  infos.voyageurs = infos.femmes + infos.hommes + infos.enfants;
  const apercuDe = outils => apercu(outils.bibliotheque, outils.infos, outils.etat.choisies);
  // Sous le nom de chaque objet de l'aperçu, le résumé de sa règle (à la place de l'ancienne phrase).
  const ligne = objet => ({ sous: echapper(resumeRegle(objet)) });
  ouvrirAssistant(app, contexte, {
    infos,
    etat: { ...creerAssistant(), etape, vues: new Set(Array.from({ length: etape + 1 }, (_, i) => i)), choisies },
    bibliotheque,
    aujourdhui,
    fond,
    saisieCommencee: () => false,
    quitter,
    terminer: async () => null,
    derniere: etapeApercu(avecComposition(t, infos), langue, apercuDe, () => ({ ligne })),
  });
  poserCompteurs(app.querySelector('.assistant'), infos);
}

// ---------- Modifier le voyage : étape « Changements » ----------
const REMPLACES = {
  'nouveauVoyage.titre': 'modifierVoyage.titre',
  'nouveauVoyage.etape.apercu': 'modifierVoyage.etape',
  'nouveauVoyage.voirApercu': 'modifierVoyage.voir',
  'nouveauVoyage.creer': 'modifierVoyage.appliquer',
  'nouveauVoyage.abandon.titre': 'modifierVoyage.abandon.titre',
  'nouveauVoyage.abandon.texte': 'modifierVoyage.abandon.texte',
};

// La puce de ce qui a changé dans la composition : « 1 enfant de plus », « 1 homme de moins ».
function puceComposition(avant, apres) {
  return GROUPES_COMPOSITION.filter(g => apres[g] !== avant[g])
    .map(g => (apres[g] > avant[g] ? T.modif.plus[g](apres[g] - avant[g]) : T.modif.moins[g](avant[g] - apres[g])))
    .join(', ');
}

// contenu : le voyage ; composition : la nouvelle ; fond : l'écran du voyage, derrière la fenêtre.
export function ouvrirModification(app, contexte, { contenu, bibliotheque, composition, aujourdhui, fond }) {
  const { t, langue } = contexte;
  const { voyage } = contenu;
  const infos = { ...voyage, ...composition };
  infos.voyageurs = infos.femmes + infos.hommes + infos.enfants;
  const choisies = new Set(contenu.etiquettes.map(e => e.modeleId));
  const puce = () => puceComposition(voyage, infos);
  const textes = avecComposition(t, infos, {
    'modifierVoyage.modifs.voyageurs.one': puce(),
    'modifierVoyage.modifs.voyageurs.other': puce(),
    'modifierVoyage.ligne.nouveauPour': 'nouveau · pour {etiquette}',
  });
  const changements = changementsDeComposition(bibliotheque, contenu, infos, choisies);
  const acceptes = new Set(changements.flatMap(c => c.lignes).map(l => l.cle));
  const derniere = etapesDe(bibliotheque).length - 1;
  ouvrirAssistant(app, contexte, {
    t: cle => t(REMPLACES[cle] ?? cle),
    classe: 'assistant-modifier',
    infos,
    etat: { ...creerAssistant(), etape: derniere, vues: new Set(Array.from({ length: derniere + 1 }, (_, i) => i)), choisies },
    bibliotheque,
    aujourdhui,
    retour: { adresse: '#', libelle: echapper(voyage.nom) },
    fond,
    saisieCommencee: () => false,
    quitter: fond,
    terminer: async () => null,
    derniere: {
      vue: () => vueChangements(textes, langue, { contenu, bibliotheque, infos, choisies, changements, acceptes }),
      grise: () => false,
      entrer: () => null,
      clic(cible, outils) {
        const touchee = cible.closest('[data-ligne]');
        if (!touchee) return false;
        const cle = touchee.dataset.ligne;
        if (!acceptes.delete(cle)) acceptes.add(cle);
        outils.repeindre(`[data-ligne="${CSS.escape(cle)}"]`);
        return true;
      },
    },
  });
  poserCompteurs(app.querySelector('.assistant'), infos);
}

// ---------- L'écran d'un voyage ----------
// vu : { ouvertes, choisie } gardé d'un dessin à l'autre ; surChoix(cle) : une ligne du menu « ⋮ ».
export function dessinerVoyage(app, contexte, contenu, vu, surChoix) {
  const liste = listeParCategorie(contenu);
  const etat = etatInitial(liste, { filtre: false });
  vu.ouvertes ??= etat.ouvertes;
  vu.choisie ??= etat.choisie;
  const { classe, colonnes, html } = vueVoyage(
    { ...contexte, t: avecComposition(contexte.t, contenu.voyage) },
    {
      contenu,
      liste,
      etat: { ...etat, ouvertes: vu.ouvertes, choisie: vu.choisie },
      poses: { tampons: new Set(), bandeau: false },
      recent: null,
      grandFormat: grandFormat.matches,
      troisColonnes: troisColonnes.matches,
    },
  );
  app.innerHTML = `<main class="${classe}"${colonnes ? ` data-colonnes="${colonnes}"` : ''}>${html}</main>`;
  brancherMenuVoyage(app.querySelector('.voyage-titre'), surChoix);
}

// ---------- La Bibliothèque ----------
// Le vrai écran reçoit une copie de la bibliothèque où « par semaine » se lit « par jour » (il ne connaît
// pas encore la règle) ; chaque ligne d'objet reçoit ensuite le résumé de la règle de la phase 13. Un objet
// touché ouvre la fiche de la phase 13, pas celle de l'appli.
export function ouvrirBibliotheque(app, contexte, { bibliotheque, ouverte }) {
  const copie = { ...bibliotheque, objets: bibliotheque.objets.map(o => (o.regle === 'par_semaine' ? { ...o, regle: 'par_jour' } : o)) };
  const parId = new Map(bibliotheque.objets.map(o => [o.id, o]));
  const resumer = () => {
    for (const bouton of app.querySelectorAll('[data-action="modifier-objet"]')) {
      const regle = bouton.querySelector('.objet-sous > span:first-child');
      const texte = resumeRegle(parId.get(bouton.dataset.id));
      if (regle && regle.textContent !== texte) regle.textContent = texte;
    }
  };
  ecranBibliotheque.dessiner(app, copie, { ...contexte, stockage: { lireBibliotheque: async () => copie } });
  const main = app.querySelector('main');
  new MutationObserver(resumer).observe(main, { childList: true, subtree: true });
  // L'état d'ouverture voulu : une catégorie dépliée (téléphone), ou choisie (grand format).
  const id = bibliotheque.categories.find(c => c.nom === ouverte)?.id;
  const cible = main.querySelector(`[data-action="accordeon"][data-id="${id}"], [data-action="choisir"][data-id="${id}"]`);
  if (cible) cible.click();
  // En repli, choisir une tuile amène la liste dans la vue : la maquette s'ouvre en haut de l'écran.
  scrollTo({ top: 0, behavior: 'instant' });
  resumer();
  // Un objet ouvre la fiche de la phase 13 ; le reste des gestes est celui de l'écran.
  main.addEventListener(
    'click',
    evenement => {
      const bouton = evenement.target.closest('[data-action="modifier-objet"]');
      if (!bouton) return;
      evenement.stopPropagation();
      ouvrirFicheObjet(app, contexte, bibliotheque, parId.get(bouton.dataset.id), () => bouton.isConnected && bouton.focus());
    },
    true,
  );
}

export function ouvrirFicheObjet(app, contexte, bibliotheque, objet, surFermeture = () => {}) {
  const fin = new AbortController();
  ouvrirFiche({
    t: contexte.t,
    objet,
    categorie: bibliotheque.categories.find(c => c.id === objet.categorieId),
    groupes: groupesAvecEtiquettes(bibliotheque),
    signal: fin.signal,
    dans: app,
    surFermeture,
  });
}
