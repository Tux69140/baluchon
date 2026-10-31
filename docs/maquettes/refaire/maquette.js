// Maquette de la phase 11 (Refaire ce voyage, supprimer un voyage), d'après la conception du 2026-10-30
// (docs/superpowers/specs/2026-10-30-phase-11-refaire-supprimer-design.md). Brouillon autonome, servi par
// Vite (`pnpm dev`, puis http://localhost:1430/docs/maquettes/refaire/) : il reprend les vrais styles et
// les vrais dessins de l'appli (Mes voyages, écran du voyage, moteur et aperçu de l'assistant, étape
// « Changements », fenêtres de question, bandeau « Annuler ») et n'y ajoute que ce que la phase apporte :
// - le menu « ⋮ » des cartes de Mes voyages et de l'en-tête du voyage (menu-carte.js) ;
// - « Refaire ce voyage » et « Supprimer le voyage » sur l'écran du voyage (ecran-voyage.js) ;
// - l'assistant « Refaire » et son aperçu (refaire.js) ;
// - la confirmation de suppression et le bandeau « Annuler » (ici) ;
// - « Modifier le voyage » qui refuse d'office un objet qu'on avait retiré (modifier.js).
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
import '../../../src/styles/bibliotheque.css';
import '../../../src/styles/fiche-modele.css';
import '../../../src/styles/etiquettes.css';
import '../../../src/styles/refus.css';
import '../../../src/styles/annulation.css';
import '../../../src/styles/ajustements.css';
import '../../../src/styles/courses.css';
import '../../../src/styles/sortir.css';
import '../../../src/styles/changements.css';
import './maquette.css';
import fr from '../../../src/i18n/fr.json';
import { creerTraducteur } from '../../../src/i18n/traduction.js';
import { montrerAnnulation } from '../../../src/ecrans/annulation.js';
import { demander } from '../../../src/ecrans/fenetre.js';
import { echapper } from '../../../src/ecrans/html.js';
import { ecranVoyages } from '../../../src/ecrans/voyages.js';
import {
  AUJOURDHUI,
  avancementDe,
  belleIle,
  belleIleNouvelles,
  bibliotheque,
  chiffrage,
  contenus,
  creerRefait,
  quiberon,
  refaireInfosSaisies,
  refaireInfosVides,
} from './donnees.js';
import { ecranNouveauVoyage } from '../../../src/ecrans/nouveau-voyage.js';
import { dessinerVoyage, grandFormat, troisColonnes } from './ecran-voyage.js';
import { poserMenus } from './menu-carte.js';
import { ouvrirModification } from './modifier.js';
import { ouvrirRefaire } from './refaire.js';

const params = new URLSearchParams(location.search);
const ETAT = params.get('etat') ?? 'voyages-menu';
const CAPTURE = params.has('capture');
if (params.get('theme') === 'sombre') document.documentElement.style.colorScheme = 'dark';
if (params.get('theme') === 'clair') document.documentElement.style.colorScheme = 'light';

const t = creerTraducteur({ fr }, 'fr');
const langue = 'fr';
// Ce que les vrais écrans attendent du contexte de l'appli ; rien n'est écrit.
const contexte = {
  t,
  langue,
  stockage: { lireBibliotheque: async () => bibliotheque, etatsDesObjets: async () => [] },
  remplacerAdresse: async () => {},
};
const app = document.getElementById('app');
let voyages = Object.values(contenus).map(c => c.voyage);
// L'avancement de chaque carte, relu à chaque dessin : un voyage créé dans la maquette a le sien.
const progressions = () => new Map(voyages.map(v => [v.id, avancementDe(contenus[v.id])]));
let compteur = 0;
const nouvelId = () => `cree-${++compteur}`;
let ecran = { nom: 'voyages' };

// ---------- Mes voyages : le vrai dessin, plus le menu « ⋮ » de chaque carte ----------
function dessinerVoyages() {
  ecran = { nom: 'voyages' };
  ecranVoyages.dessiner(app, { voyages, aujourdhui: AUJOURDHUI, progressions: progressions() }, contexte);
  poserMenus(app, voyages, {
    surRefaire: id => refaire(contenus[id], dessinerVoyages),
    surSupprimer: id => supprimer(voyages.find(v => v.id === id)),
  });
  dessinerEtats();
}

// ---------- L'écran du voyage ----------
const vu = { voyageId: null, ouvertes: null, choisie: null };
function montrerVoyage(contenu = quiberon) {
  // L'état d'affichage (catégories ouvertes, catégorie choisie) est propre à chaque voyage.
  if (vu.voyageId !== contenu.voyage.id)
    Object.assign(vu, { voyageId: contenu.voyage.id, ouvertes: null, choisie: null });
  ecran = { nom: 'voyage', contenu };
  dessinerVoyage(app, contexte, contenu, vu, cle => {
    // « Modifier ce voyage » : l'assistant de la phase 10, prérempli ; la maquette n'applique rien.
    if (cle === 'modifier')
      ouvrirModification(app, contexte, {
        contenu,
        bibliotheque,
        choisies: new Set(contenu.etiquettes.map(e => e.modeleId)),
        aujourdhui: AUJOURDHUI,
        fond: () => montrerVoyage(contenu),
        quitter: () => montrerVoyage(contenu),
      });
    if (cle === 'refaire') refaire(contenu, () => montrerVoyage(contenu));
    if (cle === 'supprimer') supprimer(contenu.voyage);
  });
  dessinerEtats();
}

// ---------- Refaire ce voyage ----------
// Ouvert depuis le voyage, le lien du haut (téléphone) ramène au voyage ; sinon, à Mes voyages.
function refaire(origine, fond, { infos = refaireInfosVides, etape = 0 } = {}) {
  const depuisLeVoyage = fond !== dessinerVoyages;
  ouvrirRefaire(app, contexte, {
    origine,
    retour: depuisLeVoyage ? { adresse: '#', libelle: echapper(origine.voyage.nom) } : undefined,
    bibliotheque,
    infos,
    etape,
    aujourdhui: AUJOURDHUI,
    fond,
    quitter: fond,
    creer: ({ infos: saisies, choisies, ecartes, recalculer }) =>
      ajouter(creerRefait(origine, bibliotheque, saisies, { choisies, ecartes }, recalculer, nouvelId)),
    ouvrir: id => montrerVoyage(contenus[id]),
  });
}

// Un voyage créé (Nouveau voyage, Refaire) : gardé en mémoire le temps de la page, rien n'est écrit.
function ajouter(contenu) {
  contenus[contenu.voyage.id] = { ...contenu, ecartes: contenu.ecartes ?? new Set() };
  voyages.push(contenu.voyage);
  return contenu;
}

// ---------- Nouveau voyage : le vrai assistant de création ----------
function nouveauVoyage() {
  ecran = { nom: 'nouveau' };
  ecranNouveauVoyage.dessiner(
    app,
    {
      bibliotheque,
      accueil: { voyages, aujourdhui: AUJOURDHUI, progressions: progressions() },
      aujourdhui: AUJOURDHUI,
    },
    {
      ...contexte,
      stockage: { ...contexte.stockage, creerVoyage: async contenu => ajouter(contenu) },
      revenirAccueil: () => dessinerVoyages(),
      remplacerAdresse: async adresse => montrerVoyage(contenus[decodeURIComponent(adresse.split('/').at(-1))]),
    },
  );
}

// ---------- Supprimer un voyage ----------
// La question chiffre ce qu'on perd ; la mention du sac n'apparaît que s'il contient quelque chose
// (décision 10). Depuis le voyage, on revient à Mes voyages, où attend le bandeau « Annuler ».
async function supprimer(voyage) {
  const { objets, dansLeSac } = chiffrage(contenus[voyage.id]);
  const sac = dansLeSac ? `, dont <b>${dansLeSac} déjà dans le sac</b>,` : '';
  const reponse = await demander({
    t,
    titre: `Supprimer le voyage «\u00a0${voyage.nom}\u00a0»\u00a0?`,
    texteHtml: `Sa liste de <b>${objets} objet${objets > 1 ? 's' : ''}</b>${sac} disparaîtra. La bibliothèque n’est pas touchée.`,
    idTexte: 'suppression-texte',
    boutons: [
      { cle: 'garder', libelle: t('suppression.garder') },
      { cle: 'supprimer', libelle: t('suppression.supprimer'), danger: true },
    ],
  });
  if (reponse === 'supprimer') supprime(voyage);
}

function supprime(voyage) {
  const place = voyages.indexOf(voyage);
  voyages = voyages.filter(v => v !== voyage);
  dessinerVoyages();
  montrerAnnulation({
    t,
    app,
    texte: `Voyage «\u00a0${voyage.nom}\u00a0» supprimé`,
    // La carte revient à sa place, le voyage tel qu'il était.
    annuler: async () => {
      voyages.splice(place, 0, voyage);
      if (ecran.nom === 'voyages') dessinerVoyages();
    },
  });
}

// ---------- Aiguillage des gestes de l'écran du voyage ----------
app.addEventListener('click', evenement => {
  if (ecran.nom !== 'voyage' || !app.querySelector('main:not(.assistant)')) return;
  const cible = evenement.target.closest('[data-action]');
  if (!cible) return;
  const { action, id } = cible.dataset;
  if (['retour', 'courses'].includes(action)) evenement.preventDefault();
  if (action === 'retour') return dessinerVoyages();
  if (action === 'accordeon') {
    vu.ouvertes.has(id) ? vu.ouvertes.delete(id) : vu.ouvertes.add(id);
    return montrerVoyage(ecran.contenu);
  }
  if (action === 'choisir') {
    vu.choisie = id;
    montrerVoyage(ecran.contenu);
  }
});
// Une carte de Mes voyages ouvre son voyage ; « Nouveau voyage » ouvre le vrai assistant de création.
app.addEventListener('click', evenement => {
  const nouveau = evenement.target.closest('a[href="#/nouveau-voyage"]');
  if (nouveau) {
    evenement.preventDefault();
    return nouveauVoyage();
  }
  const lien = evenement.target.closest('a.carte-voyage');
  if (!lien) return;
  evenement.preventDefault();
  const contenu = contenus[decodeURIComponent(lien.getAttribute('href').split('/').at(-1))];
  if (contenu) montrerVoyage(contenu);
});

for (const requete of [grandFormat, troisColonnes])
  requete.addEventListener('change', () => {
    if (ecran.nom === 'voyage' && app.querySelector('main:not(.assistant)')) montrerVoyage(ecran.contenu);
  });

// ---------- Les états de la maquette ----------
const ETATS = [
  ['voyages-menu', '1. Mes voyages : menu «\u00a0⋮\u00a0»'],
  ['voyage', '2. Voyage : le «\u00a0⋮\u00a0» au bout du titre'],
  ['voyage-menu', '3. Voyage : menu «\u00a0⋮\u00a0» ouvert'],
  ['voyage-long', '3 bis. Voyage au nom long'],
  ['refaire-infos', '4. Refaire : Informations'],
  ['refaire-etiquettes', '4 bis. Refaire : étiquettes reprises'],
  ['refaire-apercu', '5. Refaire : aperçu'],
  ['suppression', '6. Confirmation de suppression'],
  ['annuler', '7. Après la suppression : «\u00a0Annuler\u00a0»'],
  ['changements-retire', '8. Modifier : objet retiré refusé'],
];

function dessinerEtats() {
  if (CAPTURE) return;
  const theme = params.get('theme') ? `&theme=${params.get('theme')}` : '';
  const autre = params.get('theme') === 'sombre' ? 'clair' : 'sombre';
  const liens = ETATS.map(
    ([etat, nom]) =>
      `<a href="?etat=${etat}${theme}"${etat === ETAT ? ' aria-current="page"' : ''}>${echapper(nom)}</a>`,
  ).join('');
  app.insertAdjacentHTML(
    'beforeend',
    `<nav class="maquette-etats" aria-label="États de la maquette"><b>Maquette — phase 11</b>${liens}<a href="?etat=${ETAT}&theme=${autre}">Thème ${autre}</a></nav>`,
  );
}

const quiberonVoyage = () => voyages.find(v => v.id === 'v-quiberon');
const fondQuiberon = () => montrerVoyage(quiberon);

if (ETAT === 'voyage-long') montrerVoyage(contenus['v-bretagne']);
else if (ETAT === 'voyage' || ETAT === 'voyage-menu') {
  montrerVoyage(quiberon);
  if (ETAT === 'voyage-menu') document.querySelector('.voyage-titre .menu-voyage-bouton').click();
} else if (ETAT === 'refaire-infos') refaire(quiberon, dessinerVoyages);
else if (ETAT === 'refaire-etiquettes') refaire(quiberon, fondQuiberon, { infos: refaireInfosSaisies, etape: 1 });
else if (ETAT === 'refaire-apercu') refaire(quiberon, fondQuiberon, { infos: refaireInfosSaisies, etape: 3 });
else if (ETAT === 'changements-retire') {
  const fond = () => montrerVoyage(belleIle);
  ouvrirModification(app, contexte, {
    contenu: belleIle,
    bibliotheque,
    choisies: belleIleNouvelles,
    aujourdhui: AUJOURDHUI,
    fond,
    quitter: fond,
  });
} else {
  dessinerVoyages();
  const carte = app.querySelector('.carte-avec-actions:has(a[href$="v-quiberon"])');
  if (ETAT === 'voyages-menu') {
    // La carte et son menu, dessous, à l'écran : on ne fait défiler que s'il le faut.
    const bas = carte.getBoundingClientRect().bottom + 140;
    if (bas > innerHeight) scrollTo(0, scrollY + bas - innerHeight + 16);
    carte.querySelector('.menu-voyage-bouton').click();
  }
  if (ETAT === 'suppression') supprimer(quiberonVoyage());
  if (ETAT === 'annuler') supprime(quiberonVoyage());
}
