// Maquette de la phase 9 (Courses), d'après les décisions du chef de projet du 2026-10-29. Brouillon
// autonome, servi par Vite (`pnpm dev`, puis http://localhost:1430/docs/maquettes/courses/) : il
// reprend les styles et les dessins de l'appli (écran du voyage, fiche de l'objet, fenêtres) et y
// ajoute ce que la phase 9 apporte, sans toucher au code de l'appli :
// - dans le voyage : la puce « Courses · N », la pastille « à acheter » (ou « encore N à acheter »),
//   l'interrupteur « À acheter » de la fiche (maquette du voyage validée le 2026-10-24) ;
// - l'écran Courses : une carte par catégorie, la case qui compte les pièces achetées, l'objet acheté
//   grisé une seconde puis parti avec un bandeau « Annuler » de 10 s, la fiche d'achat, les deux
//   écrans vides.
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
import './maquette.css';
import fr from '../../../src/i18n/fr.json';
import { creerTraducteur } from '../../../src/i18n/traduction.js';
import { listeParCategorie } from '../../../src/modele/voyage.js';
import { etatInitial } from '../../../src/ecrans/rangement.js';
import { vueVoyage } from '../../../src/ecrans/voyage-vues.js';
import { ouvrirFiche } from '../../../src/ecrans/fiche.js';
import { ouvrirFenetre, vueFenetre } from '../../../src/ecrans/fenetre.js';
import { iconeInterface, paveCategorie } from '../../../src/ecrans/icones.js';
import { GRAND_FORMAT, TROIS_COLONNES } from '../../../src/ecrans/disposition.js';
import { lienRetour } from '../../../src/ecrans/retour.js';
import { echapper } from '../../../src/ecrans/html.js';
import mascotte from '../../../src/images/baluchon.svg';
import chariot from '@phosphor-icons/core/bold/shopping-cart-bold.svg?raw';
import {
  basculerAAcheter,
  categories,
  estAAcheter,
  mettreDansLeSac,
  objetsDeDepart,
  resteAAcheter,
  voyage,
} from './donnees.js';

const params = new URLSearchParams(location.search);
const ETAT = params.get('etat') ?? 'voyage';
const CAPTURE = params.has('capture');
if (params.get('theme') === 'sombre') document.documentElement.style.colorScheme = 'dark';
if (params.get('theme') === 'clair') document.documentElement.style.colorScheme = 'light';

const t = creerTraducteur({ fr }, 'fr');
const contexte = { t, langue: 'fr' };
const grandFormat = matchMedia(GRAND_FORMAT);
const troisColonnes = matchMedia(TROIS_COLONNES);
const icChariot = `<span class="icone" aria-hidden="true">${chariot}</span>`;
const DELAI = 1000;
const DUREE_BANDEAU = 10000;

const DONNEES = {
  voyage: 'depart',
  fiche: 'partiel',
  'voyage-partiel': 'partiel',
  courses: 'depart',
  'courses-partiel': 'partiel',
  'fiche-achat': 'partiel',
  'achat-fini': 'partiel',
  'courses-vide': 'vide',
  'courses-faites': 'faites',
};
const objets = objetsDeDepart(DONNEES[ETAT] ?? 'depart');
const parId = id => objets.find(x => x.id === id);
const categorieDe = x => categories.find(c => c.id === x.categorieId);

const app = document.getElementById('app');
let ecran = ETAT.startsWith('courses') || ETAT === 'fiche-achat' || ETAT === 'achat-fini' ? 'courses' : 'voyage';
let fin = new AbortController();

// ---------- Écran du voyage : le vrai dessin, plus la puce, les pastilles et l'interrupteur ----------
// Alimentation choisie d'emblée : c'est là que les pastilles se voient.
const vu = { ouvertes: null, choisie: 'c-alimentation' };

function etatDuVoyage(liste) {
  const etat = etatInitial(liste, { filtre: false });
  vu.ouvertes ??= etat.ouvertes;
  vu.choisie ??= etat.choisie;
  return { ...etat, ouvertes: vu.ouvertes, choisie: vu.choisie };
}

const aAcheterEnTout = () => objets.filter(estAAcheter).length;

function pastille(x) {
  const reste = resteAAcheter(x);
  if (!reste) return '';
  const texte = x.achetes > 0 ? `encore ${reste} à acheter` : 'à acheter';
  return `<span class="pastille-achat">${icChariot}${texte}</span>`;
}

function dessinerVoyage() {
  const contenu = { voyage, etiquettes: [], categories, objets };
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
  const n = aAcheterEnTout();
  app.querySelector('.outils')?.insertAdjacentHTML(
    'beforeend',
    `<a class="puce" href="?etat=courses" data-action="courses">${icChariot}Courses${n ? ` · ${n}` : ''}</a>`,
  );
  for (const li of app.querySelectorAll('li.objet[data-id]')) {
    const html = pastille(parId(li.dataset.id));
    if (!html) continue;
    const texte = li.querySelector('.objet-texte');
    const sous = texte.querySelector('.objet-sous');
    if (sous) sous.insertAdjacentHTML('beforeend', html);
    else texte.insertAdjacentHTML('beforeend', `<span class="objet-sous">${html}</span>`);
  }
}

function ligneAAcheter(x) {
  const reste = resteAAcheter(x);
  const precision = x.aAcheter && x.achetes > 0 && reste ? `${x.achetes} acheté${x.achetes > 1 ? 's' : ''} sur ${x.quantite}` : 'apparaît dans les Courses';
  return `
          <div class="ligne-reglage" data-maquette="a-acheter">
            <span>À acheter<small>${precision}</small></span>
            <button type="button" class="interrupteur" role="switch" data-maquette="bascule" aria-checked="${reste > 0}" aria-label="À acheter"></button>
          </div>`;
}

function ouvrirFicheDuVoyage(x) {
  let repeindre = null;
  const poser = () => {
    const fenetre = document.querySelector('dialog.fiche-voyage');
    if (!fenetre) return;
    fenetre.querySelector('[data-maquette="a-acheter"]')?.remove();
    fenetre.querySelector('.fiche-ajuster .ligne-reglage').insertAdjacentHTML('afterend', ligneAAcheter(x));
  };
  const apres = () => {
    dessinerVoyage();
    repeindre?.(x, categorieDe(x));
    poser();
  };
  repeindre = ouvrirFiche({
    t,
    objet: x,
    categorie: categorieDe(x),
    surChangement: n => {
      mettreDansLeSac(x, n);
      apres();
    },
    surQuantite: n => {
      x.quantite = n;
      x.quantiteManuelle = true;
      x.dansLeSac = Math.min(x.dansLeSac, n);
      x.achetes = Math.min(x.achetes, n);
      apres();
    },
    surBaisse: async () => true,
    surRenommer: () => {},
    surRetirer: async () => {},
    surFermeture: () => {},
    signal: fin.signal,
    dans: document.body,
  });
  poser();
  document.querySelector('dialog.fiche-voyage').addEventListener('click', evenement => {
    if (!evenement.target.closest('[data-maquette="bascule"]')) return;
    basculerAAcheter(x);
    apres();
  });
}

// ---------- Écran Courses ----------
const quitte = new Set(); // objets achetés pendant leur seconde de répit (grisés, encore là)

function etatAchat(x) {
  if (x.achetes >= x.quantite) return 'plein';
  return x.achetes > 0 ? 'entame' : 'vide';
}

function libelleCaseAchat(x) {
  if (x.quantite === 1) return `${x.nom} : pas encore acheté. Cocher`;
  return `${x.nom} : ${x.achetes} sur ${x.quantite} achetés. Ajouter une pièce`;
}

function ligneCourses(x) {
  const etat = quitte.has(x.id) ? 'plein' : etatAchat(x);
  const quantite = etat === 'entame' ? `${x.achetes}<small> / ${x.quantite}</small>` : `${x.quantite}`;
  return `
          <li class="objet" data-id="${x.id}" data-etat="${etat}">
            <button type="button" class="case" data-action="case-achat" data-id="${x.id}" aria-label="${echapper(libelleCaseAchat(x))}">
              <span class="case-boite" aria-hidden="true">${etat === 'plein' ? iconeInterface('coche') : ''}</span>
            </button>
            <button type="button" class="objet-corps" data-action="fiche-achat" data-id="${x.id}" aria-label="${echapper(`${x.nom}, ${x.achetes ? `${x.achetes} / ` : ''}${x.quantite}. Ouvrir la fiche`)}">
              <span class="objet-texte"><span class="objet-nom">${echapper(x.nom)}</span></span>
              <span class="objet-quantite">${quantite}</span>
              <span class="objet-note"></span>
            </button>
          </li>`;
}

function vueVideCourses(jamais) {
  const titre = jamais ? 'Rien à acheter' : 'Courses faites !';
  const texte = jamais
    ? 'Aucun objet de ce voyage n’est marqué « à acheter ». La marque se pose depuis la fiche d’un objet, dans la liste du voyage.'
    : 'Tout ce qu’il fallait acheter est acheté. Il reste à le mettre dans le sac.';
  return `
      <section class="vide-voyage courses-vide">
        <img src="${mascotte}" alt="" width="88" height="88" />
        <h2>${titre}</h2>
        <p>${texte}</p>
        <a class="bouton bouton-secondaire" href="?etat=voyage" data-action="retour-voyage">${iconeInterface('retour')}Retour au voyage</a>
      </section>`;
}

function dessinerCourses() {
  const visibles = objets.filter(x => estAAcheter(x) || quitte.has(x.id));
  const n = objets.filter(estAAcheter).length;
  const lien = lienRetour(t, { adresse: '?etat=voyage', libelle: echapper(voyage.nom) });
  let corps;
  if (!visibles.length) {
    const jamaisMarque = !objets.some(x => x.aAcheter);
    corps = vueVideCourses(jamaisMarque);
  } else {
    const cartes = [...categories]
      .sort((a, b) => a.ordre - b.ordre)
      .map(c => {
        const siens = visibles
          .filter(x => x.categorieId === c.id)
          .sort((a, b) => a.nom.localeCompare(b.nom, 'fr'));
        if (!siens.length) return '';
        return `
      <section class="categorie courses-categorie" data-id="${c.id}">
        <h2 class="categorie-titre">
          <span class="categorie-tete courses-tete">
            ${paveCategorie(c)}
            <span class="categorie-nom"><b>${echapper(c.nom)}</b></span>
          </span>
        </h2>
        <ul class="objets">${siens.map(ligneCourses).join('')}
        </ul>
      </section>`;
      })
      .join('');
    corps = `<div class="courses-cartes">${cartes}</div>`;
  }
  const sousTitre = n ? `${n} objet${n > 1 ? 's' : ''} à acheter` : '';
  app.innerHTML = `
    <main class="ecran courses-ecran">
      ${lien}
      <h1>${icChariot}Courses</h1>
      ${sousTitre ? `<p class="voyage-details courses-details">${sousTitre}</p>` : ''}
      ${corps}
    </main>`;
}

// Le bandeau « Annuler » de la phase 7, au chariot : il rend l'objet tel qu'il était.
let bandeau = null;
function montrerBandeau(texte, annuler) {
  bandeau?.el.remove();
  clearTimeout(bandeau?.minuterie);
  const el = document.createElement('div');
  el.className = 'bandeau-annuler';
  el.setAttribute('role', 'status');
  el.dataset.entree = '';
  el.innerHTML = `
    ${icChariot}
    <p>${echapper(texte)}</p>
    <button type="button" class="bandeau-action">${iconeInterface('annuler')}Annuler</button>`;
  el.addEventListener('animationend', () => delete el.dataset.entree, { once: true });
  const moi = { el, minuterie: setTimeout(() => el.remove(), DUREE_BANDEAU) };
  el.querySelector('button').addEventListener('click', () => {
    clearTimeout(moi.minuterie);
    el.remove();
    annuler();
    dessiner();
  });
  document.body.append(el);
  bandeau = moi;
}

// Un objet tout juste acheté reste grisé une seconde, puis part ; le bandeau le rend.
function achatTermine(x, avant) {
  quitte.add(x.id);
  dessiner();
  setTimeout(() => {
    quitte.delete(x.id);
    dessiner();
    montrerBandeau(`${x.nom} : acheté${x.quantite > 1 ? `s (${x.quantite})` : ''}`, () => {
      x.achetes = avant;
    });
  }, DELAI);
}

function achatRetire(x, avant) {
  dessiner();
  montrerBandeau(`${x.nom} : plus à acheter`, () => {
    x.aAcheter = true;
    x.achetes = avant;
  });
}

function changerAchat(x, n) {
  const avant = x.achetes;
  x.achetes = Math.max(0, Math.min(x.quantite, n));
  if (x.achetes >= x.quantite) achatTermine(x, avant);
  else dessiner();
}

function ouvrirFicheAchat(x) {
  const gabarit = document.createElement('template');
  gabarit.innerHTML = vueFenetre({
    t,
    idTitre: 'achat-titre',
    titre: echapper(x.nom),
    contenu: `
      <div class="fiche-corps">
        <p class="fiche-regle">${echapper(categorieDe(x).nom)}</p>
        <section class="fiche-bloc" aria-labelledby="achat-acheter">
          <h3 id="achat-acheter">Acheté</h3>
          <div class="compteur">
            <button type="button" class="bouton-icone" data-achat="moins" aria-label="Une pièce de moins">${iconeInterface('moins')}</button>
            <output aria-live="polite"></output>
            <button type="button" class="bouton-icone" data-achat="plus" aria-label="Une pièce de plus">${iconeInterface('plus')}</button>
            <span class="compteur-total">sur ${x.quantite}</span>
          </div>
          <div class="fiche-actions">
            <button type="button" class="bouton bouton-principal" data-achat="tout">${iconeInterface('coche')}Tout acheté</button>
          </div>
        </section>
        <section class="fiche-bloc fiche-ajuster">
          <div class="ligne-reglage">
            <span>À acheter<small>l’éteindre retire l’objet des Courses</small></span>
            <button type="button" class="interrupteur" role="switch" data-achat="bascule" aria-checked="true" aria-label="À acheter"></button>
          </div>
        </section>
      </div>`,
  });
  const fenetre = gabarit.content.firstElementChild;
  fenetre.classList.add('fiche', 'fiche-voyage');
  const peindre = () => {
    fenetre.querySelector('output').textContent = x.achetes;
    fenetre.querySelector('[data-achat="moins"]').setAttribute('aria-disabled', String(x.achetes === 0));
  };
  peindre();
  document.body.append(fenetre);
  let apresFermeture = null;
  const fermer = ouvrirFenetre(fenetre, {
    fermerSurVoile: true,
    fermerAuRetour: true,
    surFermeture: () => {
      fenetre.remove();
      apresFermeture?.();
    },
  });
  fenetre.querySelector('h2').focus();
  fenetre.addEventListener('click', evenement => {
    const bouton = evenement.target.closest('[data-achat]');
    if (!bouton || bouton.getAttribute('aria-disabled') === 'true') return;
    const quoi = bouton.dataset.achat;
    const avant = x.achetes;
    if (quoi === 'bascule') {
      x.aAcheter = false;
      apresFermeture = () => achatRetire(x, avant);
      return fermer();
    }
    const voulu = quoi === 'tout' ? x.quantite : x.achetes + (quoi === 'plus' ? 1 : -1);
    if (voulu >= x.quantite) {
      x.achetes = x.quantite;
      apresFermeture = () => achatTermine(x, avant);
      return fermer();
    }
    x.achetes = Math.max(0, voulu);
    peindre();
    dessiner();
  });
}

// ---------- Aiguillage ----------
function dessiner() {
  if (ecran === 'voyage') dessinerVoyage();
  else dessinerCourses();
  dessinerEtats();
}

function aller(vers) {
  ecran = vers;
  fin.abort();
  fin = new AbortController();
  dessiner();
  scrollTo(0, 0);
}

app.addEventListener('click', evenement => {
  const cible = evenement.target.closest('[data-action]');
  if (!cible) return;
  const { action, id } = cible.dataset;
  if (['courses', 'retour', 'retour-voyage'].includes(action)) {
    evenement.preventDefault();
    if (action === 'retour' && ecran === 'voyage') return;
    return aller(action === 'courses' ? 'courses' : 'voyage');
  }
  if (action === 'accordeon') {
    vu.ouvertes.has(id) ? vu.ouvertes.delete(id) : vu.ouvertes.add(id);
    return dessiner();
  }
  if (action === 'choisir') {
    vu.choisie = id;
    return dessiner();
  }
  const x = parId(id);
  if (action === 'case') {
    mettreDansLeSac(x, x.dansLeSac >= x.quantite ? 0 : x.dansLeSac + 1);
    return dessiner();
  }
  if (action === 'fiche') return ouvrirFicheDuVoyage(x);
  if (action === 'case-achat') {
    if (quitte.has(x.id)) return;
    return changerAchat(x, x.achetes + 1);
  }
  if (action === 'fiche-achat') return ouvrirFicheAchat(x);
});

for (const requete of [grandFormat, troisColonnes]) requete.addEventListener('change', () => dessiner());

// ---------- Les états de la maquette ----------
const ETATS = [
  ['voyage', 'Voyage : puce Courses et pastilles'],
  ['voyage-partiel', 'Voyage : après des achats partiels'],
  ['fiche', 'Fiche de l’objet : « À acheter »'],
  ['courses', 'Courses'],
  ['courses-partiel', 'Courses : achats partiels'],
  ['fiche-achat', 'Fiche d’achat'],
  ['achat-fini', 'Objet acheté : grisé puis bandeau « Annuler »'],
  ['courses-vide', 'Courses : rien à acheter'],
  ['courses-faites', 'Courses : tout est acheté'],
];

function dessinerEtats() {
  if (CAPTURE) return;
  const theme = params.get('theme') ? `&theme=${params.get('theme')}` : '';
  app.insertAdjacentHTML(
    'beforeend',
    `<nav class="maquette-etats" aria-label="États de la maquette"><b>Maquette — phase 9</b>${ETATS.map(
      ([etat, nom]) => `<a href="?etat=${etat}${theme}"${etat === ETAT ? ' aria-current="page"' : ''}>${nom}</a>`,
    ).join('')}<a href="?etat=${ETAT}&theme=${params.get('theme') === 'sombre' ? 'clair' : 'sombre'}">Thème ${params.get('theme') === 'sombre' ? 'clair' : 'sombre'}</a></nav>`,
  );
}

dessiner();
if (ecran === 'voyage' && !grandFormat.matches)
  app.querySelector('.categorie[data-id="c-hygiene"]')?.scrollIntoView({ block: 'start' });
if (ETAT === 'fiche') ouvrirFicheDuVoyage(parId('o-repas'));
if (ETAT === 'fiche-achat') ouvrirFicheAchat(parId('o-repas'));
if (ETAT === 'achat-fini') changerAchat(parId('o-cafe'), 1);
