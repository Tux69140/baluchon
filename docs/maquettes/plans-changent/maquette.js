// Maquette de la phase 10 (Quand les plans changent), d'après la conception du 2026-10-29
// (docs/superpowers/specs/2026-10-29-phase-10-plans-changent-design.md). Brouillon autonome, servi par
// Vite (`pnpm dev`, puis http://localhost:1430/docs/maquettes/plans-changent/) : il reprend les styles et
// les dessins de l'appli (écran du voyage, assistant, fiche de l'objet, fenêtres, bandeau « Annuler ») et
// y ajoute ce que la phase 10 apporte, sans toucher au code de l'appli :
// - « Modifier le voyage » dans l'en-tête du voyage, qui rouvre l'assistant prérempli ;
// - le récapitulatif des changements, accepté ou refusé ligne par ligne, puis « Appliquer » ;
// - les pièces à sortir du sac : la question après « Appliquer », le « ! » et la pastille dans la liste,
//   la fiche, et les deux gestes de la phase 8 alignés (baisse à la main, « Retirer du voyage »).
// Paramètres : ?etat=… (liste en bas de page) ; ?capture retire cette liste ; ?theme=sombre.
import '../../../src/styles/polices.css';
import '../../../src/styles/jetons.css';
import '../../../src/styles/socle.css';
import '../../../src/styles/pave.css';
import '../../../src/styles/voyages.css';
import '../../../src/styles/voyage.css';
import '../../../src/styles/voyage-mouvements.css';
import '../../../src/styles/grand-format.css';
import '../../../src/styles/nouveau-voyage.css';
import '../../../src/styles/calendrier.css';
import '../../../src/styles/fenetre.css';
import '../../../src/styles/fiche.css';
import '../../../src/styles/assistant.css';
import '../../../src/styles/assistant-apercu.css';
import '../../../src/styles/assistant-questions.css';
import '../../../src/styles/menu.css';
import '../../../src/styles/fiche-modele.css';
import '../../../src/styles/refus.css';
import '../../../src/styles/annulation.css';
import '../../../src/styles/ajustements.css';
import '../../../src/styles/courses.css';
import './maquette.css';
import fr from '../../../src/i18n/fr.json';
import { creerTraducteur } from '../../../src/i18n/traduction.js';
import { listeParCategorie } from '../../../src/modele/voyage.js';
import { etatInitial } from '../../../src/ecrans/rangement.js';
import { vueVoyage } from '../../../src/ecrans/voyage-vues.js';
import { ouvrirFiche } from '../../../src/ecrans/fiche.js';
import { montrerAnnulation } from '../../../src/ecrans/annulation.js';
import { iconeInterface } from '../../../src/ecrans/icones.js';
import { GRAND_FORMAT, TROIS_COLONNES } from '../../../src/ecrans/disposition.js';
import { ouvrirAssistant } from './assistant.js';
import {
  aSortir,
  appliquer,
  categoriesDuVoyage,
  etiquettesDuVoyage,
  estRetire,
  nouvellesEtiquettes,
  nouvellesInfos,
  objetsDeDepart,
  pourLEcran,
  quantitePour,
  voyage as voyageDeDepart,
} from './donnees.js';
import { decorerFiche, decorerVoyage, demanderBaisse, demanderRetrait, demanderSortie } from './sortir.js';

const params = new URLSearchParams(location.search);
const ETAT = params.get('etat') ?? 'voyage';
const CAPTURE = params.has('capture');
if (params.get('theme') === 'sombre') document.documentElement.style.colorScheme = 'dark';
if (params.get('theme') === 'clair') document.documentElement.style.colorScheme = 'light';

const t = creerTraducteur({ fr }, 'fr');
const langue = 'fr';
const contexte = { t, langue };
const grandFormat = matchMedia(GRAND_FORMAT);
const troisColonnes = matchMedia(TROIS_COLONNES);
const AUJOURDHUI = '2026-10-29';

// Le voyage tel qu'il est : avant la modification, ou après (« Plus tard », puis tout le reste emballé).
const APRES = ['a-sortir', 'fiche-a-sortir', 'fiche-retire'];
let voyage = APRES.includes(ETAT) ? { ...nouvellesInfos } : { ...voyageDeDepart };
let etiquettes = APRES.includes(ETAT) ? [...nouvellesEtiquettes] : [...etiquettesDuVoyage];
let objets = objetsDeDepart(APRES.includes(ETAT) ? 'apres' : 'depart');
const parId = id => objets.find(x => x.id === id);
const categories = () => categoriesDuVoyage(objets);
const categorieDe = x => categories().find(c => c.id === x.categorieId);

const app = document.getElementById('app');
let fin = new AbortController();

// ---------- Écran du voyage : le vrai dessin, plus « Modifier le voyage » et les pièces à sortir ----------
const vu = { ouvertes: null, choisie: null };
function etatDuVoyage(liste) {
  const etat = etatInitial(liste, { filtre: false });
  vu.ouvertes ??= etat.ouvertes;
  vu.choisie ??= etat.choisie;
  return { ...etat, ouvertes: vu.ouvertes, choisie: vu.choisie };
}

function dessinerVoyage() {
  const affiches = objets.map(pourLEcran);
  const contenu = {
    voyage,
    etiquettes: etiquettes.map((nom, ordre) => ({ id: nom, nom, ordre })),
    categories: categories(),
    objets: affiches,
  };
  const liste = listeParCategorie(contenu);
  const { classe, colonnes, html } = vueVoyage(contexte, {
    contenu,
    liste,
    etat: etatDuVoyage(liste),
    poses: { tampons: new Set(), bandeau: false },
    recent: null,
    grandFormat: grandFormat.matches,
    troisColonnes: troisColonnes.matches,
  });
  app.innerHTML = `<main class="${classe}"${colonnes ? ` data-colonnes="${colonnes}"` : ''}>${html}</main>`;
  app.querySelector('.lien-retour')?.setAttribute('href', '?etat=voyage');
  // « Modifier le voyage » : sous ce qui décrit le voyage, avant ce qui le mesure.
  app
    .querySelector('.voyage-entete')
    .insertAdjacentHTML(
      'beforeend',
      `<button type="button" class="bouton bouton-secondaire voyage-modifier" data-action="modifier">${iconeInterface('modifier')}Modifier le voyage</button>`,
    );
  decorerVoyage(app, objets);
  dessinerEtats();
}

// ---------- Les gestes sur les pièces à sortir ----------
// La dernière pièce sortie d'un objet retiré le fait quitter la liste, avec « Annuler ».
function sortirDuSac(x, n) {
  const avant = { ...x };
  x.dansLeSac = Math.max(0, n);
  if (estRetire(x) && !x.dansLeSac) {
    objets = objets.filter(o => o !== x);
    montrerAnnulation({
      t,
      app,
      texte: remplirNom(t('ajustement.retrait.bandeau'), x.nom),
      annuler: async () => {
        objets.push(avant);
        dessinerVoyage();
      },
    });
  }
}
const remplirNom = (texte, nom) => texte.replace('{nom}', nom);

// « Le garder dans le voyage » : la quantité que donne sa formule pour ce voyage ; ses pièces restent.
function garderDansLeVoyage(x) {
  x.quantite = Math.max(1, quantitePour(x, voyage));
  if (x.dansLeSac > x.quantite) x.quantite = x.dansLeSac;
}

function ouvrirFicheDuVoyage(x) {
  let repeindre = null;
  let fenetre = null;
  const raison = estRetire(x) ? '« Randonnée » ne le demande plus' : '';
  const apres = () => {
    dessinerVoyage();
    if (!objets.includes(x)) return repeindre?.(null);
    repeindre?.(x, categorieDe(x));
    decorerFiche(fenetre, x, { raison });
  };
  // La réponse à la baisse (« Garder N », « Plus tard », « C'est fait ») décide de ce que la quantité
  // baissée fait au sac.
  let sortieConfirmee = true;
  repeindre = ouvrirFiche({
    t,
    langue,
    objet: x,
    categorie: categorieDe(x),
    surChangement: n => {
      sortirDuSac(x, n);
      apres();
    },
    surQuantite: n => {
      x.quantite = n;
      x.quantiteManuelle = true;
      if (sortieConfirmee) x.dansLeSac = Math.min(x.dansLeSac, n);
      x.achetes = Math.min(x.achetes, n);
      apres();
    },
    surBaisse: async quantite => {
      const reponse = await demanderBaisse({ t, langue, objet: x, quantite, signal: fin.signal });
      if (reponse === null) return null;
      sortieConfirmee = reponse === 'fait';
      return reponse !== 'garder';
    },
    surRenommer: () => {},
    surAAcheter: () => {},
    surRetirer: async () => {
      const reponse = x.dansLeSac ? await demanderRetrait({ t, objet: x, signal: fin.signal }) : 'fait';
      if (reponse === null || reponse === 'garder') return;
      x.quantite = 0;
      x.aAcheter = false;
      if (reponse === 'fait') sortirDuSac(x, 0);
      apres();
    },
    surFermeture: () => {},
    signal: fin.signal,
    dans: document.body,
  });
  fenetre = document.querySelector('dialog.fiche-voyage');
  decorerFiche(fenetre, x, { raison });
  fenetre.addEventListener('click', evenement => {
    const bouton = evenement.target.closest('[data-maquette]');
    if (!bouton) return;
    if (bouton.dataset.maquette === 'fait') sortirDuSac(x, x.quantite);
    else garderDansLeVoyage(x);
    apres();
  });
  return fenetre;
}

// ---------- « Modifier le voyage » ----------
function ouvrirModification({ etape = 0, infos = nouvellesInfos, choisies = nouvellesEtiquettes } = {}) {
  ouvrirAssistant({
    app,
    t,
    langue,
    voyage,
    etiquettes,
    objets,
    infos,
    choisies,
    etape,
    aujourdhui: AUJOURDHUI,
    dessinerDerriere: dessinerVoyage,
    surFermer: dessinerVoyage,
    async surAppliquer(saisie, choisiesApres, lignes, choix) {
      objets = appliquer(objets, lignes, choix, saisie);
      voyage = { ...voyage, ...saisie };
      etiquettes = choisiesApres;
      vu.ouvertes = null;
      vu.choisie = null;
      dessinerVoyage();
      const concernes = objets.filter(x => aSortir(x));
      if (!concernes.length) return;
      const reponse = await demanderSortie({ t, objets: concernes, categories: categories(), signal: fin.signal });
      if (reponse !== 'fait') return;
      for (const x of concernes) sortirDuSac(x, x.quantite);
      dessinerVoyage();
    },
  });
}

// ---------- Aiguillage ----------
app.addEventListener('click', evenement => {
  const cible = evenement.target.closest('[data-action]');
  if (!cible || !app.querySelector('main:not(.assistant)')) return;
  const { action, id } = cible.dataset;
  if (action === 'retour') return evenement.preventDefault();
  if (action === 'modifier') return ouvrirModification({ infos: voyage, choisies: etiquettes });
  if (action === 'accordeon') {
    vu.ouvertes.has(id) ? vu.ouvertes.delete(id) : vu.ouvertes.add(id);
    return dessinerVoyage();
  }
  if (action === 'choisir') {
    vu.choisie = id;
    return dessinerVoyage();
  }
  const x = parId(id);
  if (!x) return;
  if (action === 'case') {
    // Un appui sur le « ! » sort une pièce, sans confirmation ; sinon, il en met une.
    if (aSortir(x)) sortirDuSac(x, x.dansLeSac - 1);
    else x.dansLeSac = x.dansLeSac >= x.quantite ? 0 : x.dansLeSac + 1;
    return dessinerVoyage();
  }
  if (action === 'fiche') ouvrirFicheDuVoyage(x);
});

for (const requete of [grandFormat, troisColonnes])
  requete.addEventListener('change', () => {
    if (app.querySelector('main:not(.assistant)')) dessinerVoyage();
  });

// ---------- Les états de la maquette ----------
const ETATS = [
  ['voyage', '1. Voyage : « Modifier le voyage »'],
  ['assistant', '2. Assistant rouvert : Informations'],
  ['recapitulatif', '3. Récapitulatif des changements'],
  ['sortie', '4. Après « Appliquer » : pièces à sortir'],
  ['a-sortir', '5. Liste après « Plus tard »'],
  ['fiche-a-sortir', '6. Fiche : pièce à sortir'],
  ['fiche-retire', '7. Fiche : objet retiré'],
  ['baisse', '8. Baisse à la main sous le sac'],
  ['retrait', '9. Retirer un objet emballé'],
];

function dessinerEtats() {
  if (CAPTURE) return;
  const theme = params.get('theme') ? `&theme=${params.get('theme')}` : '';
  const autre = params.get('theme') === 'sombre' ? 'clair' : 'sombre';
  app.insertAdjacentHTML(
    'beforeend',
    `<nav class="maquette-etats" aria-label="États de la maquette"><b>Maquette — phase 10</b>${ETATS.map(
      ([etat, nom]) => `<a href="?etat=${etat}${theme}"${etat === ETAT ? ' aria-current="page"' : ''}>${nom}</a>`,
    ).join('')}<a href="?etat=${ETAT}&theme=${autre}">Thème ${autre}</a></nav>`,
  );
}

// Les états qui montrent une catégorie précise : celle où le changement se voit.
const CHOISIE = {
  'a-sortir': 'c-vetements',
  baisse: 'c-vetements',
  retrait: 'c-vetements',
  'fiche-a-sortir': 'c-camping',
};
vu.choisie = CHOISIE[ETAT] ?? null;
const cliquer = selecteur => document.querySelector(selecteur)?.click();

if (ETAT === 'assistant') ouvrirModification({ etape: 0 });
else if (ETAT === 'recapitulatif') ouvrirModification({ etape: 3 });
else if (ETAT === 'sortie') {
  ouvrirModification({ etape: 3 });
  // Le retrait des chaussures coché, puis « Appliquer les changements ».
  cliquer('[data-ligne="o-chaussures"]');
  cliquer('[data-action="creer"]');
} else {
  dessinerVoyage();
  if (!grandFormat.matches && CHOISIE[ETAT])
    app.querySelector(`.categorie[data-id="${CHOISIE[ETAT]}"]`)?.scrollIntoView({ block: 'start' });
  if (ETAT === 'fiche-a-sortir') ouvrirFicheDuVoyage(parId('o-gaz'));
  if (ETAT === 'fiche-retire') ouvrirFicheDuVoyage(parId('o-chaussures'));
  if (ETAT === 'baisse' || ETAT === 'retrait') {
    const fenetre = ouvrirFicheDuVoyage(parId('o-tshirts'));
    if (ETAT === 'baisse') {
      fenetre.querySelector('[data-fiche="quantite-moins"]').click();
      fenetre.querySelector('[data-fermer]').click();
    } else fenetre.querySelector('[data-supprimer]').click();
  }
}
