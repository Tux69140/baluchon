// Maquette de la phase 8 (ajuster un voyage), d'après la conception du 2026-10-28
// (docs/superpowers/specs/2026-10-28-phase-8-ajuster-design.md). Brouillon autonome : il imite les
// gestes sans toucher au code de l'appli, avec ses styles, l'écran du voyage de la maquette « grand
// écran » (2026-10-27), les fiches de la bibliothèque (phase 5) et le bandeau « Annuler » (phase 7).
// - Téléphone : l'accordéon, et le bouton flottant « Ajouter un objet » de la maquette de la phase 3.
// - Tablette et ordinateur : trois colonnes ou repli ; « Ajouter un objet » en dernière ligne de la
//   liste, comme dans la Bibliothèque (pas de bouton flottant dans ces dispositions).
// - Un objet touché ouvre sa fiche, avec « Ajuster cet objet » : quantité prévue, « Renommer »,
//   « Retirer du voyage ».
// Paramètres : ?etat=… (menu de la maquette) ; ?capture retire ce menu.
// Servir la racine du dépôt (`python3 -m http.server 8647 --bind 127.0.0.1`) et ouvrir
// `/docs/maquettes/ajuster/`.
import { ficheCategorie, ficheObjet } from '../bibliotheque/fiches.js';
import { chargerIcones, duo, echapper, ic as icOutils, svg as svgOutils } from '../bibliotheque/outils.js';
import { montrerBandeau, retirerBandeau } from '../suppressions/bandeau.js';
import { typo } from '../suppressions/textes.js';
import { choix, entete, ic, lienRetour, outils, progression, svg, tuile, infosVoyage } from '../grand-ecran/vues.js';
import {
  bibliotheque,
  categoriesDuVoyage,
  complet,
  estBouclee,
  faits,
  nouvelId,
  ordreNaturel,
  voyage,
} from './donnees.js';
import {
  choisirCategorie,
  confirmerBaisse,
  confirmerRetrait,
  demanderBibliotheque,
  ficheAjout,
  ficheNouvelleCategorie,
  ficheRenommer,
  ficheVoyage,
  question,
  reussite,
} from './fiches.js';

const params = new URLSearchParams(location.search);
const ETAT = params.get('etat') ?? 'voyage';
const CAPTURE = params.has('capture');
const TABLETTE = matchMedia('(min-width: 600px) and (min-height: 600px)');
const REPLI = matchMedia('(min-width: 600px) and (max-width: 1339.98px) and (min-height: 600px)');
const MASCOTTE = '../../../src/images/baluchon.svg';

await chargerIcones();
const lire = nom => fetch(`../../../node_modules/@phosphor-icons/core/assets/bold/${nom}-bold.svg`).then(r => r.text());
for (const nom of ['trash', 'books']) svgOutils[nom] ??= await lire(nom);
// Les pictos des catégories neuves : ceux du catalogue (duotone), pour les pavés de l'écran.
for (const [nom, contenu] of Object.entries(duo)) svg[nom] ??= contenu;
svg.minus = svgOutils.minus;
svg['caret-right'] ??= svgOutils['caret-right'];

// ---------- État de l'écran ----------
const categories = categoriesDuVoyage(
  ETAT === 'vide' ? 'vide' : /plongee|ponctuel|biblio-choix|biblio-categorie|biblio-objet-nouvelle|dernier/.test(ETAT) ? 'plongee' : '',
);
const tous = () => categories.flatMap(c => c.objets);
const ui = {
  filtre: false,
  ordre: new Map(),
  bouclees: new Set(),
  ouvertes: new Set(),
  masques: new Set(),
  choisie: null,
  derniere: null,
  recent: null,
};
function recalculer() {
  ui.ordre = new Map(categories.map(c => [c.id, ordreNaturel(c)]));
  ui.bouclees = new Set(categories.filter(estBouclee).map(c => c.id));
  ui.masques = ui.filtre ? new Set(tous().filter(complet).map(x => x.id)) : new Set();
  if (!categories.some(c => c.id === ui.choisie))
    ui.choisie = (categories.find(c => !ui.bouclees.has(c.id)) ?? categories[0])?.id ?? null;
}
recalculer();
for (const c of categories) if (!ui.bouclees.has(c.id)) ui.ouvertes.add(c.id);
if (ETAT.includes('plongee') || ETAT === 'fiche-ponctuel') ui.choisie = 'plongee';
const trouver = id => tous().find(x => x.id === id);
const categorieDe = x => categories.find(c => c.objets.includes(x));
const sacBoucle = () => categories.length > 0 && categories.every(estBouclee);
const boucleesEnBas = liste =>
  ui.filtre ? [...liste.filter(c => !ui.bouclees.has(c.id)), ...liste.filter(c => ui.bouclees.has(c.id))] : liste;

// ---------- Lignes (celles de la maquette « grand écran », qui ouvrent la fiche) ----------
function etatObjet(x) {
  if (complet(x)) return 'plein';
  return x.dansLeSac > 0 ? 'entame' : 'vide';
}

function ligne(x) {
  const etat = etatObjet(x);
  const quantite = etat === 'entame' ? `${x.dansLeSac}<small> / ${x.quantite}</small>` : `${x.quantite}`;
  const libelle = complet(x)
    ? `${x.nom} : dans le sac. ${x.quantite > 1 ? 'Vider' : 'Décocher'}`
    : x.quantite === 1
      ? `${x.nom} : pas encore dans le sac. Cocher`
      : `${x.nom} : ${x.dansLeSac} sur ${x.quantite} dans le sac. Ajouter une pièce`;
  const partage = x.regle && !x.regle.parPersonne;
  return `
          <li class="objet" data-etat="${etat}"${ui.recent === x.id ? ' data-recent' : ''}>
            <button type="button" class="case" data-action="case" data-id="${x.id}" aria-label="${echapper(libelle)}">
              <span class="case-boite" aria-hidden="true">${etat === 'plein' ? svg.check : ''}</span>
            </button>
            <button type="button" class="objet-corps" data-action="fiche" data-id="${x.id}">
              <span class="objet-texte"><span class="objet-nom">${echapper(x.nom)}</span>${partage ? '<span class="objet-sous"><span>partagé</span></span>' : ''}</span>
              <span class="objet-quantite">${quantite}</span>
              <span class="objet-note">${x.note ? svg.info : ''}</span>
            </button>
          </li>`;
}

const ligneAjout = c => `
          <li class="objet objet-ajout">
            <button type="button" class="objet-corps" data-action="ajouter" data-id="${c.id}">${icOutils('plus')}Ajouter un objet</button>
          </li>`;

function lignes(c, { ajout = false } = {}) {
  const visibles = ui.ordre.get(c.id).filter(x => !ui.masques.has(x.id));
  const fin = ajout ? ligneAjout(c) : '';
  if (!visibles.length) {
    const nb = c.objets.length;
    const info = `<p class="ligne-info">Catégorie bouclée : ${nb > 1 ? `ses ${nb} objets sont` : 'son objet est'} dans le sac, masqué${nb > 1 ? 's' : ''} par le filtre.</p>`;
    return ajout ? `${info}<ul class="objets">${fin}</ul>` : info;
  }
  return `<ul class="objets">${visibles.map(ligne).join('')}${fin}
        </ul>`;
}

const paveDe = c => `<span class="pave" data-couleur="${c.couleur}" aria-hidden="true">${svg[c.icone]}</span>`;
const jauge = (f, t) => {
  const pc = t ? Math.round((100 * f) / t) : 0;
  return `<span class="jauge jauge-mini"${f === t && t ? ' data-fini' : ''}><i style="width: ${pc}%"></i></span>`;
};

function carte(c) {
  const ouverte = ui.ouvertes.has(c.id);
  const compte = ui.bouclees.has(c.id)
    ? '<span class="tampon">Bouclé !</span>'
    : `<span class="compte">${faits(c)} / ${c.objets.length}</span>`;
  return `
      <section class="categorie" id="cat-${c.id}"${ui.filtre && ui.bouclees.has(c.id) ? ' data-attenuee' : ''}${ui.recent === `cat-${c.id}` ? ' data-recent' : ''}>
        <h2 class="categorie-titre">
          <button type="button" class="categorie-tete" data-action="accordeon" data-id="${c.id}" aria-expanded="${ouverte}">
            ${paveDe(c)}
            <span class="categorie-nom"><b>${echapper(c.nom)}</b>${jauge(faits(c), c.objets.length)}</span>
            ${compte}
            <span class="chevron" aria-hidden="true">${svg['caret-down']}</span>
          </button>
        </h2>
        ${ouverte ? lignes(c) : ''}
      </section>`;
}

// ---------- Les dispositions ----------
const flottant = () =>
  `<button type="button" class="bouton bouton-principal bouton-flottant" data-action="ajouter">${ic('plus')}Ajouter un objet</button>`;

function vueVide() {
  return `
      <section class="vide-voyage">
        <img src="${MASCOTTE}" alt="" width="88" height="88" />
        <h2>Rien à emballer pour l’instant</h2>
        <p>Ce voyage ne contient plus aucun objet. Ajoutez-en ici.</p>
        <button type="button" class="bouton bouton-principal" data-action="ajouter">${ic('plus')}Ajouter un objet</button>
      </section>`;
}

function vueTelephone() {
  if (!categories.length)
    return `<main class="ecran">${lienRetour()}${entete(voyage, { retour: false })}${vueVide()}</main>`;
  return `
    <main class="ecran ecran-avec-flottant">${lienRetour()}${entete(voyage, { retour: false })}${progression(tous(), sacBoucle())}${outils(ui)}
      <div class="categories">${boucleesEnBas(categories).map(carte).join('')}</div>
    </main>${flottant()}`;
}

function vueGrande() {
  if (!categories.length)
    return `<main class="ecran">${lienRetour()}${entete(voyage, { retour: false })}${vueVide()}</main>`;
  const c = categories.find(x => x.id === ui.choisie);
  const repli = REPLI.matches;
  const marque = x => (ui.recent === `cat-${x.id}` ? ' data-recent' : '');
  const menu = repli
    ? `<ul class="ge-tuiles">${boucleesEnBas(categories)
        .map(x => tuile(x, { choisie: ui.choisie, attenuee: ui.filtre && ui.bouclees.has(x.id), infos: infosVoyage(x, ui) }).replace('<li>', `<li${marque(x)}>`))
        .join('')}</ul>`
    : `<ul class="choix-liste">${boucleesEnBas(categories)
        .map(x => choix(x, ui).replace('<li>', `<li${marque(x)}>`))
        .join('')}</ul>`;
  return `
    <main class="ge-ecran">
      ${lienRetour()}
      <div class="ge-voyage">${entete(voyage, { retour: false })}${progression(tous(), sacBoucle())}${outils(ui)}</div>
      <nav class="ge-menu" aria-labelledby="menu-titre">
        <h2 id="menu-titre" class="ge-cache">Catégories</h2>
        ${menu}
      </nav>
      <section class="ge-liste" aria-labelledby="detail-titre">
        <div class="ge-liste-tete"><h2 id="detail-titre"${repli ? '' : ' class="ge-cache"'}>${echapper(c.nom)}</h2></div>
        <div class="ge-carte-objets">${lignes(c, { ajout: true })}</div>
      </section>
    </main>`;
}

// ---------- Menu de la maquette (absent des captures) ----------
const ETATS = [
  ['voyage', 'Écran du voyage : « Ajouter un objet »'],
  ['vide', 'Voyage vidé de ses objets'],
  ['fiche', 'Fiche : quantité calculée (T-shirts)'],
  ['fiche-manuelle', 'Fiche : quantité fixée manuellement'],
  ['baisse', 'Baisser sous ce qui est dans le sac'],
  ['fiche-ponctuel', 'Fiche d’un objet ajouté à la main'],
  ['renommer', 'Renommer'],
  ['retirer', 'Retirer : simple'],
  ['retirer-sac', 'Retirer : avec des pièces dans le sac'],
  ['retirer-dernier', 'Retirer : dernier de sa catégorie'],
  ['bandeau', 'Retiré : bandeau « Annuler »'],
  ['ajout', 'Ajouter un objet'],
  ['ajout-erreur', 'Ajouter un objet : sans nom'],
  ['ajout-categories', 'Choisir sa catégorie'],
  ['ajout-nouvelle', 'Nouvelle catégorie (pour ce voyage)'],
  ['ajout-rempli', 'Ajouter un objet : dans « Plongée »'],
  ['question', 'Ajouter aussi à la bibliothèque ?'],
  ['biblio-objet', 'Bibliothèque : fiche préremplie'],
  ['biblio-choix', 'Bibliothèque : choisir sa catégorie'],
  ['biblio-categorie', 'Bibliothèque : nouvelle catégorie préremplie'],
  ['biblio-objet-nouvelle', 'Bibliothèque : l’objet dans la catégorie à venir'],
  ['biblio-fait', 'Ajouté à la bibliothèque'],
];

function menuMaquette() {
  if (CAPTURE) return '';
  return `
    <details class="maquette-menu">
      <summary>Maquette ▾</summary>
      <nav>${ETATS.map(([e, texte]) => `<a href="?etat=${e}"${e === ETAT ? ' aria-current="true"' : ''}>${texte}</a>`).join('')}</nav>
    </details>`;
}

// ---------- Rendu ----------
const app = document.getElementById('app');
function rendre() {
  recalculer();
  const ouvert = app.querySelector('.maquette-menu')?.open;
  app.innerHTML = (TABLETTE.matches ? vueGrande() : vueTelephone()) + menuMaquette();
  if (ouvert) app.querySelector('.maquette-menu').open = true;
}

function eclairer(cle) {
  ui.recent = cle;
  rendre();
  ui.recent = null;
}

// ---------- La fiche d'un objet ----------
let fiche = null;

function enregistrer(x, changement) {
  Object.assign(x, changement);
  rendre();
  fiche?.peindre(x, categorieDe(x));
}

async function agirSurFiche(x, quoi) {
  const c = categorieDe(x);
  if (quoi === 'sac-moins') enregistrer(x, { dansLeSac: Math.max(0, x.dansLeSac - 1) });
  else if (quoi === 'sac-plus') enregistrer(x, { dansLeSac: Math.min(x.quantite, x.dansLeSac + 1) });
  else if (quoi === 'tout') enregistrer(x, { dansLeSac: x.quantite });
  else if (quoi === 'vider') {
    if (x.dansLeSac > 1 && !(await question({ titre: `Vider « ${echapper(x.nom)} » ?`, texte: `Les ${x.dansLeSac} pièces repartent hors du sac.`, non: 'Annuler', oui: 'Vider' })))
      return;
    enregistrer(x, { dansLeSac: 0 });
  } else if (quoi === 'quantite-plus') enregistrer(x, { quantite: Math.min(999, x.quantite + 1), manuelle: true });
  else if (quoi === 'quantite-moins') {
    const q = x.quantite - 1;
    if (q < 1) return;
    if (q < x.dansLeSac && !(await confirmerBaisse(x, q))) return;
    enregistrer(x, { quantite: q, dansLeSac: Math.min(x.dansLeSac, q), manuelle: true });
  } else if (quoi === 'renommer') {
    const nom = await ficheRenommer(x);
    if (nom) enregistrer(x, { nom });
  } else if (quoi === 'retirer') {
    if (!(await confirmerRetrait(x, c))) return;
    await fiche?.fermer();
    retirer(x, c);
  }
}

function ouvrirFiche(x) {
  fiche = ficheVoyage({ objet: x, categorie: categorieDe(x), agir: quoi => agirSurFiche(x, quoi) });
  fiche.d.addEventListener('close', () => (fiche = null), { once: true });
  return fiche;
}

// ---------- Retirer, et « Annuler » ----------
let retrait = null;
function retirer(x, c) {
  const rang = categories.indexOf(c);
  const derniere = c.objets.length === 1;
  c.objets.splice(c.objets.indexOf(x), 1);
  if (derniere) categories.splice(rang, 1);
  retrait = { x, c, rang, derniere };
  rendre();
  const texte = derniere
    ? `« ${echapper(x.nom)} » et la catégorie « ${echapper(c.nom)} » retirés du voyage`
    : `« ${echapper(x.nom)} » retiré du voyage`;
  montrerBandeau({ texte: typo(texte), annuler: annulerRetrait, duree: CAPTURE ? Infinity : 10000 });
}

function annulerRetrait() {
  if (!retrait) return;
  const { x, c, rang, derniere } = retrait;
  if (derniere) categories.splice(rang, 0, c);
  c.objets.push(x);
  retrait = null;
  ui.choisie = c.id;
  ui.ouvertes.add(c.id);
  eclairer(x.id);
}

// Ajouter un objet au voyage pendant les 10 s rend le retrait définitif (conception, « Pendant les 10 s »).
function retraitDefinitif() {
  if (!retrait) return;
  retrait = null;
  retirerBandeau();
}

// ---------- Ajouter un objet ----------
function ouvrirAjout(depuis) {
  return ficheAjout({
    categories,
    choisie: depuis ?? (TABLETTE.matches ? ui.choisie : (ui.derniere ?? categories[0]?.id)),
    ajouter: ({ nom, quantite, categorie }) => {
      retraitDefinitif();
      let c = categories.find(k => k.id === categorie);
      if (categorie?.nouvelle) {
        c = { id: `c-${nouvelId()}`, modele: null, ...categorie.nouvelle, objets: [] };
        categories.push(c);
      }
      const x = { id: nouvelId(), nom, quantite, dansLeSac: 0, regle: null, manuelle: true, modele: null, note: '' };
      c.objets.push(x);
      ui.choisie = c.id;
      ui.ouvertes.add(c.id);
      eclairer(x.id);
      app.querySelector(`[data-id="${x.id}"]`)?.scrollIntoView({ block: 'nearest' });
      proposerBibliotheque(x, c);
    },
  });
}

// ---------- « Ajouter aussi à la bibliothèque ? » ----------
const ficheBiblioObjet = (x, categorieBiblio, apres) =>
  ficheObjet({
    categorie: categorieBiblio,
    prerempli: { nom: x.nom, regle: 'fixe', valeur: x.quantite, parPersonne: false, etiquettes: [] },
    bouton: 'Ajouter à la bibliothèque',
    panne: () => false,
    surEnregistrer: apres,
  });

async function proposerBibliotheque(x, c) {
  if (!(await demanderBibliotheque(x.nom))) return;
  const connue = bibliotheque.find(k => k.id === c.modele);
  if (connue) return ficheBiblioObjet(x, connue, () => ajouteEnBibliotheque(x));
  return choisirEnBibliotheque(x, c);
}

async function choisirEnBibliotheque(x, c) {
  const id = await choisirCategorie({
    titre: 'Dans quelle catégorie de la bibliothèque ?',
    texte: `« ${echapper(c.nom)} » n’existe que dans ce voyage. Choisissez où ranger « ${echapper(x.nom)} » dans la bibliothèque, ou créez-y une catégorie.`,
    liste: bibliotheque.map(k => ({ ...k, sous: `${k.objets.length} objet${k.objets.length > 1 ? 's' : ''}` })),
    nouvelle: `Créer « ${echapper(c.nom)} » dans la bibliothèque`,
  });
  if (!id) return;
  if (id !== 'nouvelle')
    return ficheBiblioObjet(x, bibliotheque.find(k => k.id === id), () => ajouteEnBibliotheque(x));
  return ficheCategorie({
    prerempli: { nom: c.nom, icone: c.icone, couleur: c.couleur, etiquettes: [] },
    bouton: 'Suivant',
    panne: () => false,
    // Rien n'est écrit avant le dernier « Enregistrer » : la catégorie attend l'objet.
    surEnregistrer: brouillon =>
      setTimeout(() =>
        ficheBiblioObjet(x, { ...brouillon, objets: [] }, () => {
          const nouvelle = { id: `b-${nouvelId()}`, ...brouillon, objets: [] };
          bibliotheque.push(nouvelle);
          c.modele = nouvelle.id;
          ajouteEnBibliotheque(x);
        }),
      ),
  });
}

function ajouteEnBibliotheque(x) {
  x.modele = x.nom;
  reussite(`« ${echapper(x.nom)} » est dans la bibliothèque.`, CAPTURE ? Infinity : 5000);
}

// ---------- Gestes de l'écran ----------
app.addEventListener('click', e => {
  const cible = e.target.closest('[data-action]');
  if (!cible) return;
  const { action, id } = cible.dataset;
  if (action === 'case') {
    const x = trouver(id);
    if (complet(x) && x.dansLeSac > 1) {
      question({ titre: `Vider « ${echapper(x.nom)} » ?`, texte: `Les ${x.dansLeSac} pièces repartent hors du sac.`, non: 'Annuler', oui: 'Vider' }).then(
        oui => oui && enregistrer(x, { dansLeSac: 0 }),
      );
      return;
    }
    x.dansLeSac = complet(x) ? 0 : x.dansLeSac + 1;
    ui.derniere = categorieDe(x).id;
  } else if (action === 'filtre') ui.filtre = !ui.filtre;
  else if (action === 'accordeon') {
    if (ui.ouvertes.has(id)) ui.ouvertes.delete(id);
    else ui.ouvertes.add(id);
    ui.derniere = id;
  } else if (action === 'choisir') ui.choisie = id;
  else if (action === 'fiche') {
    ui.derniere = categorieDe(trouver(id)).id;
    return ouvrirFiche(trouver(id));
  } else if (action === 'ajouter') return ouvrirAjout(id);
  else return;
  rendre();
});

addEventListener('resize', rendre);
rendre();

// ---------- Les états de la maquette ----------
const parNom = nom => tous().find(x => x.nom === nom);
const attendre = () => new Promise(r => setTimeout(r, 50));
const cliquer = async sel => {
  await attendre();
  [...document.querySelectorAll('dialog[open]')].at(-1)?.querySelector(sel)?.click();
  await attendre();
};

async function mettreEnEtat() {
  const plongee = categories.find(c => c.id === 'plongee');
  switch (ETAT) {
    case 'fiche':
      ouvrirFiche(parNom('T-shirts'));
      break;
    case 'fiche-manuelle':
      Object.assign(parNom('T-shirts'), { quantite: 6, manuelle: true });
      rendre();
      ouvrirFiche(parNom('T-shirts'));
      break;
    case 'baisse':
      ouvrirFiche(parNom('Bonnet'));
      await cliquer('[data-f="quantite-moins"]');
      break;
    case 'fiche-ponctuel':
      ouvrirFiche(parNom('Masque et tuba'));
      break;
    case 'renommer':
      ouvrirFiche(parNom('Crème solaire'));
      await cliquer('[data-f="renommer"]');
      break;
    case 'retirer':
      ouvrirFiche(parNom('Crème solaire'));
      await cliquer('[data-f="retirer"]');
      break;
    case 'retirer-sac':
      ouvrirFiche(parNom('T-shirts'));
      await cliquer('[data-f="retirer"]');
      break;
    case 'retirer-dernier':
      ouvrirFiche(parNom('Masque et tuba'));
      await cliquer('[data-f="retirer"]');
      break;
    case 'bandeau': {
      const x = parNom('Crème solaire');
      retirer(x, categorieDe(x));
      break;
    }
    case 'ajout':
      ouvrirAjout('toilette');
      break;
    case 'ajout-erreur':
      ouvrirAjout('toilette');
      await cliquer('[data-f="ajouter"]');
      break;
    case 'ajout-categories':
      ouvrirAjout('toilette').remplir('Masque et tuba', 2);
      await cliquer('[data-f="categorie"]');
      break;
    case 'ajout-nouvelle':
      ouvrirAjout('toilette').remplir('Masque et tuba', 2);
      await cliquer('[data-f="categorie"]');
      await cliquer('[data-choix="nouvelle"]');
      {
        const d = [...document.querySelectorAll('dialog[open]')].at(-1);
        const champ = d.querySelector('#f-nom');
        champ.value = 'Plongée';
        champ.dispatchEvent(new Event('input', { bubbles: true }));
        d.querySelector('[data-valeur="lilas"]').click();
      }
      break;
    case 'ajout-rempli':
      ouvrirAjout('toilette').remplir('Palmes', 2, { nouvelle: { nom: 'Plongée', icone: 'waves', couleur: 'lilas' } });
      break;
    case 'question':
      demanderBibliotheque('Gourde pliable');
      break;
    case 'biblio-objet':
      ficheBiblioObjet({ nom: 'Gourde pliable', quantite: 2 }, bibliotheque.find(k => k.id === 'alimentation'), () => {});
      break;
    case 'biblio-choix':
      choisirEnBibliotheque(plongee.objets[0], plongee);
      break;
    case 'biblio-categorie':
      choisirEnBibliotheque(plongee.objets[0], plongee);
      await cliquer('[data-choix="nouvelle"]');
      break;
    case 'biblio-objet-nouvelle':
      ficheBiblioObjet(plongee.objets[0], { nom: 'Plongée', objets: [] }, () => {});
      break;
    case 'biblio-fait':
      reussite('« Gourde pliable » est dans la bibliothèque.', Infinity);
      break;
  }
}
await mettreEnEtat();
document.documentElement.dataset.pret = '';
