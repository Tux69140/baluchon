// Maquette cliquable de l'assistant « Nouveau voyage » complet (phase 4, forme définitive). Brouillon
// servi par Vite (il importe les vrais composants : calendrier, fenêtres, styles, écran du voyage),
// sans toucher au code de l'appli. Décisions du chef de projet du 2026-10-24 (docs/PRD.md).
import '../../../src/styles/polices.css';
import '../../../src/styles/jetons.css';
import '../../../src/styles/socle.css';
import '../../../src/styles/pave.css';
import '../../../src/styles/voyages.css';
import '../../../src/styles/voyage.css';
import '../../../src/styles/voyage-panneaux.css';
import '../../../src/styles/nouveau-voyage.css';
import '../../../src/styles/calendrier.css';
import '../../../src/styles/fenetre.css';
import './maquette.css';
import fr from '../../../src/i18n/fr.json';
import { creerTraducteur, remplir } from '../../../src/i18n/traduction.js';
import { creerCalendrier } from '../../../src/ecrans/calendrier.js';
import { decrireRegle, detailsVoyage, formaterJourCourt, pluriel } from '../../../src/ecrans/format.js';
import { iconeInterface, paveCategorie } from '../../../src/ecrans/icones.js';
import { ecranVoyages } from '../../../src/ecrans/voyages.js';
import { vueVoyage } from '../../../src/ecrans/voyage-vues.js';
import { etatInitial } from '../../../src/ecrans/rangement.js';
import { joursEtNuits } from '../../../src/modele/periode.js';
import { calculerQuantite } from '../../../src/modele/quantites.js';
import { VOYAGEURS, listeParCategorie, validerInformations } from '../../../src/modele/voyage.js';
import mascotte from '../../../src/images/baluchon.svg';
import tente from '@phosphor-icons/core/duotone/tent-duotone.svg?raw';
import listeCochee from '@phosphor-icons/core/bold/list-checks-bold.svg?raw';
import etiquette from '@phosphor-icons/core/bold/tag-bold.svg?raw';

const params = new URLSearchParams(location.search);
const ETAT = params.get('etat') ?? 'infos';
const langue = 'fr';
const t = creerTraducteur({ fr }, langue);
const ic = svg => `<span class="icone" aria-hidden="true">${svg}</span>`;
const enFenetre = Math.min(screen.width, screen.height) >= 600;
const AUJOURDHUI = '2026-10-25';

// ---------- Textes nouveaux (ils iront dans fr.json) ----------
const T = {
  etapes: 'Étapes',
  informations: 'Informations',
  apercu: 'Aperçu',
  legende: 'Étape {n} sur {total} · {nom}',
  precedent: 'Précédent',
  suivant: 'Suivant',
  voirApercu: 'Voir l’aperçu',
  creer: 'Créer le voyage',
  aideGroupe: 'Touchez les étiquettes qui décrivent ce voyage. Aucune n’est obligatoire.',
  choisies: { zero: 'Aucune étiquette choisie : ce groupe n’ajoute rien.', one: '1 étiquette choisie', other: '{n} étiquettes choisies' },
  retenus: '<b>{n}</b> objets retenus sur {total}',
  aideApercu: 'Décochez ce que vous n’emporterez pas. Rien n’est créé avant « Créer le voyage ».',
  sansEtiquette: 'sans étiquette',
  videTitre: 'Aucun objet ne correspond',
  videTexte:
    'Aucune catégorie de votre bibliothèque n’est « toujours incluse » ni liée aux étiquettes choisies. Choisissez d’autres étiquettes, ou liez des catégories à celles-ci dans la bibliothèque.',
  revenirEtiquettes: 'Revenir aux étiquettes',
  toutEcarte: 'Vous avez écarté tous les objets. Recochez ceux à emporter pour créer le voyage.',
  abandonTitre: 'Abandonner ce nouveau voyage ?',
  abandonTexte: 'Le nom, les dates et les étiquettes choisies seront perdus.',
  continuer: 'Continuer la saisie',
  abandonner: 'Abandonner',
  ecartesTitre: 'Objets écartés',
  ecartesTexte: 'Avant de changer vos choix, vous aviez écarté ces objets. Que voulez-vous en faire ?',
  garder: 'Les garder écartés',
  remettre: 'Les remettre dans la liste',
  etiquettesVoyage: 'Étiquettes du voyage',
};

// ---------- Bibliothèque : la mini-bibliothèque de la phase 4, ou une bibliothèque complète ----------
const g = (id, nom, etiquettes) => ({ id, nom, etiquettes: etiquettes.map(([eid, enom]) => ({ id: eid, nom: enom })) });
const GROUPES_MINI = [
  g('activites', 'Activités', [['randonnee', 'Randonnée'], ['camping', 'Camping'], ['plage', 'Plage']]),
  g('climat', 'Climat', [['chaud', 'Chaud'], ['froid', 'Froid'], ['pluie', 'Pluie']]),
  g('hebergement', 'Hébergement', [['hotel', 'Hôtel'], ['tente', 'Tente'], ['habitant', 'Chez l’habitant']]),
];
const GROUPES_COMPLETS = [
  g('activites', 'Activités', [
    ['randonnee', 'Randonnée'], ['camping', 'Camping'], ['plage', 'Plage'], ['ski', 'Ski'], ['velo', 'Vélo'],
    ['ville', 'Visite de ville'], ['affaires', 'Voyage d’affaires'], ['festival', 'Festival'], ['peche', 'Pêche'],
    ['escalade', 'Escalade'], ['bivouac', 'Bivouac'], ['baignade', 'Baignade en rivière'],
  ]),
  g('climat', 'Climat', [['chaud', 'Chaud'], ['froid', 'Froid'], ['pluie', 'Pluie'], ['neige', 'Neige'], ['vent', 'Vent']]),
  g('transport', 'Transport', [['voiture', 'Voiture'], ['train', 'Train'], ['avion', 'Avion'], ['bateau', 'Bateau'], ['car', 'Car']]),
  g('hebergement', 'Hébergement', [
    ['hotel', 'Hôtel'], ['tente', 'Tente'], ['habitant', 'Chez l’habitant'], ['gite', 'Gîte'], ['refuge', 'Refuge'],
  ]),
];
const GROUPES = ETAT === 'nombreuses' ? GROUPES_COMPLETS : GROUPES_MINI;
const NOM_ETIQUETTE = new Map(GROUPES.flatMap(gr => gr.etiquettes.map(e => [e.id, e.nom])));

const ob = (id, nom, regle, valeur, { pp = true, plafond = null, tags = null, consommable = false } = {}) => ({
  id, nom, regle, valeur, plafond, parPersonne: pp, tags, consommable,
});
const CATEGORIES = [
  {
    id: 'vetements', nom: 'Vêtements', icone: 't-shirt', couleur: 'ciel', ordre: 0, tags: null,
    objets: [
      ob('tshirts', 'T-shirts', 'par_jour', 1, { plafond: 5 }),
      ob('sous-vetements', 'Sous-vêtements', 'par_jour', 1),
      ob('pyjama', 'Pyjama', 'par_nuit', 1, { plafond: 1 }),
      ob('maillot', 'Maillot de bain', 'fixe', 1, { tags: ['plage'] }),
      ob('doudoune', 'Doudoune', 'fixe', 1, { tags: ['froid'] }),
      ob('bonnet', 'Bonnet', 'fixe', 1, { tags: ['froid'] }),
      ob('cape', 'Cape de pluie', 'fixe', 1, { tags: ['pluie'] }),
    ],
  },
  {
    id: 'toilette', nom: 'Toilette', icone: 'tooth', couleur: 'lagon', ordre: 1, tags: null,
    objets: [
      ob('brosse', 'Brosse à dents', 'fixe', 1),
      ob('dentifrice', 'Dentifrice', 'fixe', 1, { pp: false }),
      ob('creme', 'Crème solaire', 'fixe', 1, { pp: false, tags: ['plage', 'chaud'] }),
    ],
  },
  {
    id: 'alimentation', nom: 'Alimentation', icone: 'fork-knife', couleur: 'pomme', ordre: 2, tags: null,
    objets: [ob('repas', 'Repas', 'par_jour', 2, { consommable: true }), ob('gourde', 'Gourde', 'fixe', 1)],
  },
  {
    id: 'papiers', nom: 'Papiers', icone: 'identification-card', couleur: 'tournesol', ordre: 3, tags: null,
    objets: [ob('identite', 'Pièce d’identité', 'fixe', 1), ob('chargeur', 'Chargeur de téléphone', 'fixe', 1, { pp: false })],
  },
  {
    id: 'camping', nom: 'Camping', icone: 'tent', couleur: 'abricot', ordre: 4, tags: ['camping', 'tente'],
    objets: [
      ob('lampe', 'Lampe frontale', 'fixe', 1),
      ob('couchage', 'Sac de couchage', 'fixe', 1),
      ob('rechaud', 'Réchaud', 'fixe', 1, { pp: false }),
    ],
  },
];
const pave = c =>
  c.icone === 'tent' ? `<span class="pave" data-couleur="${c.couleur}" aria-hidden="true">${tente}</span>` : paveCategorie(c);

// ---------- État de l'assistant ----------
const S = {
  etape: 0,
  vues: new Set([0]),
  infos: { nom: '', destination: '', depart: null, retour: null, voyageurs: VOYAGEURS.parDefaut },
  choisies: new Set(),
  ecartes: new Set(),
  // Ce qui a produit le dernier aperçu vu : étiquettes, dates, voyageurs. S'il change, et qu'il y a des
  // objets écartés, la fenêtre « Objets écartés » demande quoi en faire (décision du 2026-10-24).
  signature: null,
  essaye: false,
  videRegles: false,
};
const ETAPES = () => [T.informations, ...GROUPES.map(gr => gr.nom), T.apercu];
const DERNIERE = () => ETAPES().length - 1;
const infosValides = () => !Object.keys(validerInformations(S.infos)).length;
const saisieCommencee = () =>
  Boolean(S.infos.nom.trim() || S.infos.destination.trim() || S.infos.depart || S.choisies.size);
const signature = () =>
  JSON.stringify([[...S.choisies].sort(), S.infos.depart, S.infos.retour, S.infos.voyageurs]);
const entre = tags => !tags || tags.some(x => S.choisies.has(x));

function apercu() {
  if (S.videRegles || !infosValides()) return [];
  const periode = { ...joursEtNuits(S.infos.depart, S.infos.retour), voyageurs: S.infos.voyageurs };
  return CATEGORIES.filter(c => entre(c.tags))
    .map(c => ({
      categorie: c,
      objets: c.objets
        .filter(o => entre(o.tags))
        .map(o => ({ ...o, quantite: calculerQuantite(o, periode) }))
        .filter(o => o.quantite > 0)
        .sort((a, b) => a.nom.localeCompare(b.nom)),
    }))
    .filter(c => c.objets.length);
}

// ---------- Vues ----------
function vueEtapes() {
  const noms = ETAPES();
  const items = noms.map((nom, i) => {
    const courante = i === S.etape;
    const ouverte = !courante && (S.vues.has(i) || (i === DERNIERE() && infosValides()));
    const rond = i === DERNIERE() ? ic(listeCochee) : i + 1;
    const etat = courante ? 'courante' : ouverte ? 'ouverte' : 'fermee';
    return `
        <li class="etape" data-etat="${etat}">
          <button type="button" data-aller="${i}"${courante ? ' aria-current="step"' : ''}${etat === 'fermee' ? ' aria-disabled="true"' : ''}>
            <span class="etape-rond">${rond}</span><span class="etape-nom">${nom}</span>
          </button>
        </li>`;
  });
  return `
      <ol class="etapes-liste">${items.join('')}
      </ol>
      <p class="etapes-legende">${remplir(T.legende, { n: S.etape + 1, total: noms.length, nom: noms[S.etape] })}</p>`;
}

const vueInfos = () => `
          <div class="champ">
            <label for="nom">${t('nouveauVoyage.nom')}</label>
            <input id="nom" name="nom" type="text" autocomplete="off" aria-describedby="erreur-nom" value="${S.infos.nom}" />
            <p class="erreur-champ" id="erreur-nom" aria-live="polite"></p>
          </div>
          <div class="champ champ-sans-message">
            <label for="destination">${t('nouveauVoyage.destination')}</label>
            <input id="destination" name="destination" type="text" autocomplete="off" value="${S.infos.destination}" />
          </div>
          <fieldset class="champ champ-voyageurs">
            <legend>${t('nouveauVoyage.voyageurs')}</legend>
            <div class="compteur">
              <button type="button" class="bouton-icone" data-voyageurs="-1" aria-label="${t('nouveauVoyage.moinsVoyageurs')}">${iconeInterface('moins')}</button>
              <output class="compteur-valeur" aria-live="polite"></output>
              <button type="button" class="bouton-icone" data-voyageurs="1" aria-label="${t('nouveauVoyage.plusVoyageurs')}">${iconeInterface('plus')}</button>
            </div>
          </fieldset>
          <fieldset class="champ champ-dates" aria-describedby="resume-dates erreur-dates">
            <legend>${t('nouveauVoyage.dates')}</legend>
            <p class="resume-dates" id="resume-dates" aria-live="polite"></p>
            <div class="calendrier"></div>
            <p class="erreur-champ" id="erreur-dates" aria-live="polite"></p>
          </fieldset>`;

function texteChoisies(n) {
  if (!n) return T.choisies.zero;
  return remplir(n === 1 ? T.choisies.one : T.choisies.other, { n });
}

function vueGroupe(groupe) {
  const puces = groupe.etiquettes.map(e => {
    const choisie = S.choisies.has(e.id);
    return `<button type="button" class="puce puce-etiquette" aria-pressed="${choisie}" data-etiquette="${e.id}"><span class="puce-signe">${iconeInterface(choisie ? 'coche' : 'plus')}</span>${e.nom}</button>`;
  });
  const n = groupe.etiquettes.filter(e => S.choisies.has(e.id)).length;
  return `
          <section class="etape-groupe" aria-labelledby="titre-etape">
            <h3 class="etape-titre" id="titre-etape" tabindex="-1">${groupe.nom}</h3>
            <p class="etape-aide">${T.aideGroupe}</p>
            <div class="puces-etiquettes" role="group" aria-labelledby="titre-etape">${puces.join('')}</div>
            <p class="etape-compte" aria-live="polite">${texteChoisies(n)}</p>
          </section>`;
}

function etatCoche(objets) {
  const retenus = objets.filter(o => !S.ecartes.has(o.id)).length;
  return { retenus, coche: retenus === objets.length ? 'plein' : retenus ? 'entame' : 'vide' };
}

const aria = { plein: 'true', entame: 'mixed', vide: 'false' };
const boite = coche => `<span class="case-boite" aria-hidden="true">${coche === 'plein' ? iconeInterface('coche') : ''}</span>`;

function vueCategorieApercu({ categorie, objets }) {
  const { retenus, coche } = etatCoche(objets);
  const lignes = objets.map(o => {
    const c = S.ecartes.has(o.id) ? 'vide' : 'plein';
    return `
              <li><button type="button" class="apercu-objet" role="checkbox" aria-checked="${aria[c]}" data-coche="${c}" data-objet="${o.id}">
                ${boite(c)}<span class="objet-texte"><span class="objet-nom">${o.nom}</span><span class="objet-sous">${decrireRegle(t, o)}</span></span><span class="objet-quantite">${o.quantite}</span>
              </button></li>`;
  });
  return `
          <section class="categorie apercu-categorie">
            <h4 class="categorie-titre"><button type="button" class="apercu-tete-cat" role="checkbox" aria-checked="${aria[coche]}" data-coche="${coche}" data-categorie="${categorie.id}">
              ${boite(coche)}${pave(categorie)}<span class="categorie-nom"><b>${categorie.nom}</b></span><span class="compte">${retenus} / ${objets.length}</span>
            </button></h4>
            <ul class="objets">${lignes.join('')}
            </ul>
          </section>`;
}

function rappel() {
  const tags = [...S.choisies].map(id => NOM_ETIQUETTE.get(id));
  const details = detailsVoyage(t, S.infos, langue);
  return `${S.infos.nom} · ${details}${tags.length ? ` · ${tags.join(', ')}` : ''}`;
}

function vueApercu(liste) {
  if (!liste.length)
    return `
          <section class="apercu-vide" aria-labelledby="titre-etape">
            <img src="${mascotte}" alt="" width="96" height="96" />
            <h3 class="etape-titre" id="titre-etape" tabindex="-1">${T.videTitre}</h3>
            <p id="raison-vide">${T.videTexte}</p>
            <button type="button" class="bouton bouton-secondaire" data-aller="1">${iconeInterface('precedent')}${T.revenirEtiquettes}</button>
          </section>`;
  const tous = liste.flatMap(c => c.objets);
  const retenus = tous.filter(o => !S.ecartes.has(o.id)).length;
  const message = retenus
    ? ''
    : `<p class="message message-info apercu-message" id="raison-vide" role="status">${iconeInterface('info')}<span>${T.toutEcarte}</span></p>`;
  return `
          <section class="apercu" aria-labelledby="titre-etape">
            <div class="apercu-tete">
              <h3 class="etape-titre apercu-compte" id="titre-etape" tabindex="-1">${remplir(T.retenus, { n: retenus, total: tous.length })}</h3>
              <p class="apercu-rappel">${rappel()}</p>
              <p class="etape-aide">${T.aideApercu}</p>
            </div>${message}
            <div class="apercu-categories">${liste.map(vueCategorieApercu).join('')}
            </div>
          </section>`;
}

function vuePied() {
  const premiere = S.etape === 0;
  const derniere = S.etape === DERNIERE();
  const gauche = premiere
    ? enFenetre
      ? `<button type="button" class="bouton bouton-secondaire" data-action="fermer">${t('fenetre.annuler')}</button>`
      : ''
    : `<button type="button" class="bouton bouton-secondaire bouton-precedent" data-action="precedent" aria-label="${T.precedent}">${iconeInterface('precedent')}<span class="texte-large">${T.precedent}</span></button>`;
  let actions;
  if (derniere) {
    const vide = !apercu().some(c => c.objets.some(o => !S.ecartes.has(o.id)));
    actions = `<button type="submit" class="bouton bouton-principal" data-action="creer"${vide ? ' aria-disabled="true" aria-describedby="raison-vide"' : ''}>${T.creer}</button>`;
  } else if (S.etape === DERNIERE() - 1)
    actions = `<button type="submit" class="bouton bouton-principal" data-action="suivant">${T.voirApercu}${iconeInterface('suivant')}</button>`;
  else
    actions = `<button type="button" class="bouton bouton-secondaire" data-action="apercu">${T.voirApercu}</button>
            <button type="submit" class="bouton bouton-principal" data-action="suivant">${T.suivant}${iconeInterface('suivant')}</button>`;
  return `
          <div class="pied-gauche">${gauche}</div>
          <div class="formulaire-actions">${actions}</div>`;
}

// ---------- Coquille : fenêtre sur tablette et ordinateur, écran plein au téléphone ----------
const app = document.querySelector('#app');
let racine;

function coquille() {
  if (enFenetre) {
    ecranVoyages.dessiner(
      app,
      {
        voyages: [
          { id: 'a', nom: 'Bretagne en famille', destination: 'Crozon', depart: '2026-11-20', retour: '2026-11-24', voyageurs: 4 },
          { id: 'b', nom: 'Week-end à Lyon', destination: '', depart: '2026-09-12', retour: '2026-09-13', voyageurs: 2 },
        ],
        aujourdhui: AUJOURDHUI,
        progressions: new Map(),
      },
      { t, langue },
    );
    app.insertAdjacentHTML(
      'beforeend',
      `
    <dialog class="fenetre assistant" aria-labelledby="titre-nv">
      <header class="fenetre-entete">
        <h2 id="titre-nv" tabindex="-1">${t('nouveauVoyage.titre')}</h2>
        <button type="button" class="bouton-icone bouton-fermer" data-action="fermer" aria-label="${t('fenetre.fermer')}">${iconeInterface('fermer')}</button>
      </header>
      <nav class="etapes" aria-label="${T.etapes}"></nav>
      <form class="formulaire" novalidate><div class="formulaire-corps"></div><div class="formulaire-pied assistant-pied"></div></form>
    </dialog>`,
    );
    racine = app.querySelector('dialog.assistant');
    racine.addEventListener('cancel', e => {
      e.preventDefault();
      demanderAbandon();
    });
    racine.showModal();
  } else {
    app.innerHTML = `
    <main class="ecran assistant assistant-plein">
      <a class="lien-retour" href="#" data-action="fermer">${iconeInterface('retour')}${t('voyages.titre')}</a>
      <h1 id="titre-nv">${t('nouveauVoyage.titre')}</h1>
      <nav class="etapes" aria-label="${T.etapes}"></nav>
      <form class="formulaire" novalidate><div class="formulaire-corps"></div><div class="formulaire-pied assistant-pied"></div></form>
    </main>`;
    racine = app.querySelector('main');
  }
  racine.addEventListener('click', surClic);
  el('.formulaire-corps').addEventListener('scroll', ombrerPied);
  addEventListener('scroll', ombrerPied);
  addEventListener('resize', ombrerPied);
  racine.addEventListener('input', surSaisie);
  racine.querySelector('form').addEventListener('submit', e => {
    e.preventDefault();
    const action = e.submitter?.dataset.action;
    if (action === 'creer') creer();
    else avancer();
  });
}

const el = sel => racine.querySelector(sel);

function message(id, code) {
  const p = el(`#erreur-${id}`);
  if (p) p.innerHTML = code ? `${iconeInterface('erreur')}<span>${t(`nouveauVoyage.erreurs.${code}`)}</span>` : '';
}

function rafraichirInfos() {
  if (S.etape !== 0) return;
  const { depart, retour } = S.infos;
  const jour = d => formaterJourCourt(d, langue);
  let resume = t('nouveauVoyage.resume.vide');
  if (depart && !retour) resume = remplir(t('nouveauVoyage.resume.depart'), { depart: jour(depart) });
  if (depart && retour) {
    const { jours, nuits } = joursEtNuits(depart, retour);
    resume = remplir(t('nouveauVoyage.resume.periode'), {
      depart: jour(depart),
      retour: jour(retour),
      jours: pluriel(t, 'duree.jours', jours, langue),
      nuits: pluriel(t, 'duree.nuits', nuits, langue),
    });
  }
  el('#resume-dates').textContent = resume;
  el('.compteur-valeur').textContent = S.infos.voyageurs;
  if (S.essaye) {
    const erreurs = validerInformations(S.infos);
    message('nom', erreurs.nom);
    message('dates', erreurs.dates);
  }
}

function dessiner({ focus = false } = {}) {
  el('.etapes').innerHTML = vueEtapes();
  const corps = el('.formulaire-corps');
  corps.dataset.etape = S.etape === 0 ? 'infos' : S.etape === DERNIERE() ? 'apercu' : 'groupe';
  if (S.etape === 0) {
    corps.innerHTML = vueInfos();
    creerCalendrier(el('.calendrier'), {
      t,
      langue,
      aujourdhui: AUJOURDHUI,
      periode: S.infos,
      auChangement({ depart, retour }) {
        Object.assign(S.infos, { depart, retour });
        rafraichirInfos();
        el('.etapes').innerHTML = vueEtapes();
      },
    });
    rafraichirInfos();
  } else if (S.etape === DERNIERE()) corps.innerHTML = vueApercu(apercu());
  else corps.innerHTML = vueGroupe(GROUPES[S.etape - 1]);
  el('.formulaire-pied').innerHTML = vuePied();
  el('.formulaire-pied').dataset.etape = corps.dataset.etape;
  ombrerPied();
  if (focus) {
    corps.classList.add('entree');
    corps.addEventListener('animationend', () => corps.classList.remove('entree'), { once: true });
    corps.scrollTop = 0;
    if (!enFenetre) scrollTo(0, 0);
    (el('#titre-etape') ?? el('#nom'))?.focus({ preventScroll: true });
  }
}

// Du contenu continue sous le pied (page au téléphone, corps de la fenêtre ailleurs) : le pied porte
// une ombre, qui dit qu'il reste à faire défiler (remarque du chef de projet, 2026-10-25).
function ombrerPied() {
  const pied = el('.formulaire-pied');
  const zone = enFenetre ? el('.formulaire-corps') : document.scrollingElement;
  const reste = zone.scrollHeight - zone.scrollTop - zone.clientHeight;
  pied.toggleAttribute('data-dessous', reste > 1);
}

// L'aperçu se redessine sans bouger : on garde la position de défilement.
function redessinerApercu() {
  const corps = el('.formulaire-corps');
  const haut = corps.scrollTop;
  const page = scrollY;
  corps.innerHTML = vueApercu(apercu());
  el('.formulaire-pied').innerHTML = vuePied();
  corps.scrollTop = haut;
  scrollTo(0, page);
  ombrerPied();
}

function aller(i) {
  if (i === S.etape) return;
  if (i > 0 && !infosValides()) {
    S.essaye = true;
    if (S.etape !== 0) {
      S.etape = 0;
      dessiner({ focus: true });
    }
    rafraichirInfos();
    return;
  }
  S.etape = i;
  S.vues.add(i);
  dessiner({ focus: true });
  if (i === DERNIERE()) entrerDansApercu();
}

function avancer() {
  aller(S.etape + 1);
}

// En arrivant à l'aperçu : si les choix ont changé depuis le dernier aperçu et que des objets écartés y
// figurent encore, la fenêtre demande quoi en faire.
function entrerDansApercu() {
  const sig = signature();
  const avant = S.signature;
  S.signature = sig;
  if (avant === null || avant === sig) return;
  const presents = apercu()
    .flatMap(c => c.objets.map(o => ({ ...o, categorie: c.categorie.nom })))
    .filter(o => S.ecartes.has(o.id));
  if (presents.length) demanderEcartes(presents);
}

function surClic(e) {
  const cible = e.target.closest('[data-aller], [data-action], [data-etiquette], [data-objet], [data-categorie], [data-voyageurs]');
  if (!cible) return;
  if (cible.dataset.aller !== undefined) {
    if (cible.getAttribute('aria-disabled') === 'true') return;
    return aller(Number(cible.dataset.aller));
  }
  if (cible.dataset.voyageurs) {
    S.infos.voyageurs = Math.min(VOYAGEURS.max, Math.max(VOYAGEURS.min, S.infos.voyageurs + Number(cible.dataset.voyageurs)));
    return rafraichirInfos();
  }
  if (cible.dataset.etiquette) {
    const id = cible.dataset.etiquette;
    if (S.choisies.has(id)) S.choisies.delete(id);
    else S.choisies.add(id);
    const choisie = S.choisies.has(id);
    cible.setAttribute('aria-pressed', choisie);
    cible.querySelector('.puce-signe').innerHTML = iconeInterface(choisie ? 'coche' : 'plus');
    const groupe = GROUPES[S.etape - 1];
    el('.etape-compte').textContent = texteChoisies(groupe.etiquettes.filter(x => S.choisies.has(x.id)).length);
    return;
  }
  if (cible.dataset.objet) {
    const id = cible.dataset.objet;
    if (S.ecartes.has(id)) S.ecartes.delete(id);
    else S.ecartes.add(id);
    redessinerApercu();
    return el(`[data-objet="${id}"]`).focus();
  }
  if (cible.dataset.categorie) {
    const c = apercu().find(x => x.categorie.id === cible.dataset.categorie);
    const { coche } = etatCoche(c.objets);
    for (const o of c.objets) coche === 'vide' ? S.ecartes.delete(o.id) : S.ecartes.add(o.id);
    redessinerApercu();
    return el(`[data-categorie="${c.categorie.id}"]`).focus();
  }
  const action = cible.dataset.action;
  if (action === 'fermer') {
    e.preventDefault();
    return demanderAbandon();
  }
  if (action === 'precedent') return aller(S.etape - 1);
  if (action === 'apercu') return aller(DERNIERE());
}

function surSaisie({ target }) {
  if (target.name !== 'nom' && target.name !== 'destination') return;
  S.infos[target.name] = target.value;
  rafraichirInfos();
  el('.etapes').innerHTML = vueEtapes();
}

// ---------- Fenêtres par-dessus l'assistant ----------
function question({ titre, texte, liste = '', non, oui, classe = '' }) {
  document.body.insertAdjacentHTML(
    'beforeend',
    `
    <dialog class="fenetre confirmation ${classe}" role="alertdialog" aria-labelledby="titre-question" aria-describedby="texte-question">
      <header class="fenetre-entete"><h2 id="titre-question" tabindex="-1">${titre}</h2></header>
      <p id="texte-question">${texte}</p>${liste}
      <div class="fenetre-pied">
        <button type="button" class="bouton bouton-secondaire" data-reponse="non">${non}</button>
        <button type="button" class="bouton bouton-principal" data-reponse="oui">${oui}</button>
      </div>
    </dialog>`,
  );
  const d = document.body.lastElementChild;
  d.showModal();
  return new Promise(resoudre => {
    const fin = r => {
      d.close();
      d.remove();
      resoudre(r);
    };
    d.addEventListener('click', e => {
      const b = e.target.closest('[data-reponse]');
      if (b) fin(b.dataset.reponse === 'oui');
    });
    d.addEventListener('cancel', e => {
      e.preventDefault();
      fin(null);
    });
  });
}

async function demanderAbandon() {
  if (saisieCommencee()) {
    const oui = await question({ titre: T.abandonTitre, texte: T.abandonTexte, non: T.continuer, oui: T.abandonner });
    if (!oui) return;
  }
  fermerAssistant();
}

async function demanderEcartes(objets) {
  const liste = `<ul class="liste-ecartes">${objets.map(o => `<li><b>${o.nom}</b><span>${o.categorie}</span></li>`).join('')}</ul>`;
  // Garder écartés est l'action principale : c'est la décision déjà prise par la personne.
  const garder = await question({
    titre: T.ecartesTitre,
    texte: T.ecartesTexte,
    liste,
    non: T.remettre,
    oui: T.garder,
    classe: 'fenetre-ecartes',
  });
  if (garder === false) {
    for (const o of objets) S.ecartes.delete(o.id);
    redessinerApercu();
  }
}

function fermerAssistant() {
  racine.close?.();
  ecranVoyages.dessiner(app, { voyages: [], aujourdhui: AUJOURDHUI, progressions: new Map() }, { t, langue });
}

// ---------- Le voyage créé : son écran, avec ses étiquettes en en-tête ----------
function creer() {
  const liste = apercu();
  if (!liste.some(c => c.objets.some(o => !S.ecartes.has(o.id)))) return;
  if (enFenetre) racine.close();
  afficherVoyage(liste);
}

function afficherVoyage(liste) {
  const voyage = { id: 'v', ...S.infos };
  const categories = [];
  const objets = [];
  for (const { categorie, objets: siens } of liste) {
    const retenus = siens.filter(o => !S.ecartes.has(o.id));
    if (!retenus.length) continue;
    categories.push({ id: categorie.id, nom: categorie.nom, icone: categorie.icone, couleur: categorie.couleur, ordre: categorie.ordre });
    for (const o of retenus) objets.push({ ...o, categorieId: categorie.id, dansLeSac: 0, note: '' });
  }
  const contenu = { voyage, categories, objets };
  const rangee = listeParCategorie(contenu);
  const deuxPanneaux = matchMedia('(min-width: 1000px) and (orientation: landscape)').matches;
  const { classe, html } = vueVoyage(
    { t, langue },
    { contenu, liste: rangee, etat: etatInitial(rangee, { filtre: false }), poses: { tampons: new Set(), bandeau: false }, deuxPanneaux },
  );
  app.innerHTML = `<main class="${classe}">${html}</main>`;
  // Le pavé « tente » n'existe pas encore dans l'appli : la maquette le pose elle-même.
  for (const p of app.querySelectorAll('.pave:empty')) p.innerHTML = tente;
  const tags = [...S.choisies].map(id => `<li>${ic(etiquette)}${NOM_ETIQUETTE.get(id)}</li>`).join('');
  app
    .querySelector('.voyage-entete')
    .insertAdjacentHTML('beforeend', `<ul class="etiquettes-voyage" aria-label="${T.etiquettesVoyage}">${tags}</ul>`);
}

// ---------- Retour système : étape précédente ; depuis Informations, fermeture ----------
history.pushState({ assistant: true }, '');
addEventListener('popstate', () => {
  if (document.querySelector('dialog.confirmation[open]')) return history.pushState({ assistant: true }, '');
  if (S.etape > 0) {
    history.pushState({ assistant: true }, '');
    return aller(S.etape - 1);
  }
  if (saisieCommencee()) {
    history.pushState({ assistant: true }, '');
    return demanderAbandon();
  }
  fermerAssistant();
});

// ---------- États de capture ----------
const REMPLI = { nom: 'Week-end au Vercors', destination: 'Vercors', depart: '2026-11-13', retour: '2026-11-15', voyageurs: 2 };
function preparer() {
  coquille();
  dessiner();
  // La fenêtre garde la hauteur de l'étape Informations, la plus haute : rien ne saute d'une étape à
  // l'autre (le corps défile si une étape est plus longue).
  if (enFenetre) {
    Object.assign(S.infos, REMPLI);
    dessiner();
    racine.style.height = `${racine.getBoundingClientRect().height}px`;
    Object.assign(S.infos, { nom: '', destination: '', depart: null, retour: null, voyageurs: VOYAGEURS.parDefaut });
    dessiner();
  }
  if (ETAT === 'neuf') return;
  Object.assign(S.infos, REMPLI);
  const tout = () => ETAPES().forEach((_, i) => S.vues.add(i));
  switch (ETAT) {
    case 'infos':
      S.vues.add(1);
      break;
    case 'activites':
    case 'nombreuses':
      S.choisies = new Set(['randonnee', 'camping']);
      S.etape = 1;
      S.vues.add(1);
      break;
    case 'apercu':
    case 'ecartes':
    case 'tout-ecarte':
    case 'voyage':
      S.choisies = new Set(['randonnee', 'camping', 'froid', 'tente']);
      S.ecartes = new Set(['gourde', 'bonnet']);
      if (ETAT === 'tout-ecarte') S.ecartes = new Set(apercu().flatMap(c => c.objets.map(o => o.id)));
      tout();
      S.etape = DERNIERE();
      break;
    case 'vide':
      S.videRegles = true;
      tout();
      S.etape = DERNIERE();
      break;
    case 'abandon':
      break;
  }
  dessiner();
  if (ETAT === 'ecartes') {
    S.signature = 'avant';
    entrerDansApercu();
  }
  if (ETAT === 'abandon') demanderAbandon();
  if (ETAT === 'voyage') {
    if (enFenetre) racine.close();
    afficherVoyage(apercu());
  }
}

preparer();
await document.fonts.ready;
document.documentElement.dataset.pret = '';
