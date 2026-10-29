// Le HTML de l'écran d'un voyage (src/ecrans/voyage.js), d'après les maquettes validées le 2026-10-24
// (docs/maquettes/voyage/) et le 2026-10-27 (docs/maquettes/grand-ecran/) : en-tête, progression,
// filtre, cartes de catégorie (téléphone) ou grand format (le voyage, le menu des catégories en cartes
// ou en tuiles, la liste de la choisie), lignes d'objet, voyage vide ; « Ajouter un objet » (phase 8,
// maquette docs/maquettes/ajuster/) : bouton flottant au téléphone, dernière ligne de la liste en grand
// format, bouton de l'écran vide. Rien ne vit ici que du dessin :
// l'ordre, les masqués et les replis viennent de l'état d'affichage (src/ecrans/rangement.js), les
// pièces du voyage lui-même.
import { remplir } from '../i18n/traduction.js';
import { estAAcheter, resteAAcheter } from '../modele/courses.js';
import { appuiSurCase, estComplet, etatDansLeSac, progression } from '../modele/sac.js';
import { detailsVoyage, pluriel } from './format.js';
import { colonnesGrandFormat, marqueAttenuee, tuileCategorie } from './grand-format-vues.js';
import { echapper } from './html.js';
import { iconeInterface, paveCategorie } from './icones.js';
import { jauge } from './jauge.js';
import { categoriesAffichees } from './rangement.js';
import { lienRetour } from './retour.js';
import mascotte from '../images/baluchon.svg';

const compte = (t, { faits, total }) => remplir(t('voyage.compte'), { faits, total });

// Une hauteur réservée (voyage.css) : le bandeau « Sac bouclé ! » prend la place de la jauge.
// pose : le sac vient de boucler, le bandeau entre avec un rebond.
function vueProgression(t, objets, { sacBoucle, pose }) {
  const avancement = progression(objets);
  const ligne = texte => `
          <span class="progression-ligne"><span>${texte}</span><b>${compte(t, avancement)}</b></span>
          ${jauge(avancement)}`;
  if (!sacBoucle)
    return `
      <div class="progression">
        <div class="progression-texte">${ligne(t('voyage.dansLeSac'))}
        </div>
      </div>`;
  return `
      <div class="progression" data-boucle${pose ? ' data-pose' : ''} role="status">
        <img src="${mascotte}" alt="" width="56" height="56" />
        <div class="progression-texte">
          <span class="progression-titre">${t('voyage.sacBoucle')}</span>${ligne(t('voyage.toutEstDansLeSac'))}
        </div>
      </div>`;
}

// « Courses · N » (phase 9) : N objets restent à acheter ; sans rien à acheter, la puce mène à l'écran vide.
function vuePuceCourses(t, { voyage, objets }) {
  const n = objets.filter(estAAcheter).length;
  const texte = n ? remplir(t('voyage.coursesCompte'), { n }) : t('voyage.courses');
  return `<a class="puce" href="#/voyage/${encodeURIComponent(voyage.id)}/courses" data-action="courses">${iconeInterface('courses')}${texte}</a>`;
}

function vueOutils(t, langue, etat, contenu) {
  const masques = etat.filtre && etat.masques.size;
  return `
      <div class="outils">
        <button type="button" class="puce" data-action="filtre" aria-pressed="${etat.filtre}">${iconeInterface('filtre')}${t('voyage.filtre')}</button>
        ${vuePuceCourses(t, contenu)}
      </div>${masques ? `\n      <p class="masques">${pluriel(t, 'voyage.masques', masques, langue)}</p>` : ''}`;
}

// Les étiquettes choisies à la création, pour mémoire : des puces sans geste, rien si le voyage n'en a pas.
function vueEtiquettes(t, etiquettes) {
  if (!etiquettes.length) return '';
  const puces = [...etiquettes]
    .sort((a, b) => a.ordre - b.ordre)
    .map(e => `<li>${iconeInterface('etiquette')}${echapper(e.nom)}</li>`)
    .join('');
  return `
        <ul class="etiquettes-voyage" aria-label="${t('voyage.etiquettes')}">${puces}</ul>`;
}

function vueEntete({ t, langue }, voyage, etiquettes) {
  const destination = voyage.destination ? `<p>${echapper(voyage.destination)}</p>` : '';
  return `
      <h1>${echapper(voyage.nom)}</h1>
      <div class="voyage-entete">
        ${destination}
        <p class="voyage-details">${echapper(detailsVoyage(t, voyage, langue))}</p>${vueEtiquettes(t, etiquettes)}
      </div>`;
}

// Sous le filtre, une catégorie bouclée descend en bas, atténuée (carte, choix ou tuile).
const estAttenuee = (etat, categorie) => etat.filtre && etat.enBas.has(categorie.id);

// Le tampon remplace le compte dès qu'une catégorie est bouclée pour l'état d'affichage (après la
// seconde de répit) ; pose : il vient d'être posé, il s'imprime avec un rebond. classes : celles des
// cartes (tampon, compte), ou celles des tuiles, qui le disent en petit.
const CARTE = { tampon: 'tampon', compte: 'compte' };
const TUILE = { tampon: 'gf-tuile-boucle', compte: 'gf-tuile-compte' };
function compteOuTampon(t, { categorie, objets }, etat, { classes = CARTE, poses = new Set() } = {}) {
  if (etat.bouclees.has(categorie.id))
    return `<span class="${classes.tampon}"${poses.has(categorie.id) ? ' data-pose' : ''}>${t('voyage.boucle')}</span>`;
  return `<span class="${classes.compte}">${compte(t, progression(objets))}</span>`;
}

// Le nom de la case dit l'état et ce que fera l'appui (« Ajouter une pièce », « Vider »…).
function libelleCase(t, objet) {
  const valeurs = { nom: objet.nom, n: objet.dansLeSac, total: objet.quantite };
  if (estComplet(objet))
    return remplir(t(`voyage.case.${appuiSurCase(objet).confirmer ? 'vider' : 'decocher'}`), valeurs);
  return remplir(t(`voyage.case.${objet.quantite === 1 ? 'cocher' : 'ajouter'}`), valeurs);
}

// recent : { id, ecoule } l'objet que « Annuler » vient de rendre s'éclaire (src/styles/bibliotheque.css) ;
// redessiné pendant l'éclairage, il le reprend où il en était (ecoule, en ms ; src/styles/ajustements.css).
const eclairage = (objet, recent) =>
  recent?.id === objet.id ? ` data-recent style="--eclairage-ecoule: ${-Math.round(recent.ecoule)}ms"` : '';

function vueObjet(t, objet, voyageurs, recent) {
  const etat = etatDansLeSac(objet);
  const entame = etat === 'entame';
  const quantite = entame ? `${objet.dansLeSac}<small> / ${objet.quantite}</small>` : `${objet.quantite}`;
  const quantiteDite = entame ? `${objet.dansLeSac} / ${objet.quantite}` : `${objet.quantite}`;
  const note = objet.note ? `, ${t('voyage.avecNote')}` : '';
  // « partagé » : la quantité vaut pour tout le groupe, pas par personne (docs/PRD.md, US-3) ; seul en
  // voyage, il n'y a personne avec qui partager, le mot ne dirait rien.
  const partage = objet.parPersonne || voyageurs < 2 ? '' : t('voyage.partage');
  // La marque « à acheter » : un mot et une icône, jamais la couleur seule (docs/DESIGN.md) ; après un achat
  // partiel, ce qui reste (phase 9).
  const reste = resteAAcheter(objet);
  let achat = '';
  if (reste) achat = objet.achetes > 0 ? remplir(t('voyage.encoreAAcheter'), { n: reste }) : t('voyage.aAcheter');
  const pastille = achat && `<span class="pastille-achat">${iconeInterface('courses')}${achat}</span>`;
  const sous =
    (partage || pastille) && `<span class="objet-sous">${partage ? `<span>${partage}</span>` : ''}${pastille}</span>`;
  // Le nom du bouton reprend tout ce que la ligne montre, dans le même ordre.
  const nomDit = [objet.nom, partage, achat].filter(Boolean).join(', ');
  return `
          <li class="objet" data-id="${echapper(objet.id)}" data-etat="${etat}" data-flip="${echapper(objet.id)}"${eclairage(objet, recent)}>
            <button type="button" class="case" data-action="case" data-id="${echapper(objet.id)}" aria-label="${echapper(libelleCase(t, objet))}">
              <span class="case-boite" aria-hidden="true">${etat === 'plein' ? iconeInterface('coche') : ''}</span>
            </button>
            <button type="button" class="objet-corps" data-action="fiche" data-id="${echapper(objet.id)}" aria-label="${echapper(remplir(t('voyage.ouvrirFiche'), { nom: nomDit, quantite: quantiteDite + note }))}">
              <span class="objet-texte"><span class="objet-nom">${echapper(objet.nom)}</span>${sous}</span>
              <span class="objet-quantite">${quantite}</span>
              <span class="objet-note">${objet.note ? iconeInterface('info') : ''}</span>
            </button>
          </li>`;
}

// La dernière ligne de la liste en grand format, comme dans la Bibliothèque : ajouter un objet à cette
// catégorie-là.
const vueLigneAjout = (t, categorieId) => `
          <li class="objet objet-ajout">
            <button type="button" class="objet-corps" data-action="ajouter" data-id="${echapper(categorieId)}">${iconeInterface('plus')}${t('voyage.ajouter')}</button>
          </li>`;

// Une catégorie ouverte dont le filtre masque tout le dit en toutes lettres, plutôt que d'être vide.
// ajout : l'id de la catégorie dont la liste finit par « Ajouter un objet » (grand format).
function vueLignes({ t, langue, voyageurs, recent }, { objets }, nombre, ajout = null) {
  const fin = ajout ? vueLigneAjout(t, ajout) : '';
  if (!objets.length) {
    const info = `<p class="ligne-info">${pluriel(t, 'voyage.categorieMasquee', nombre, langue)}</p>`;
    return fin
      ? `${info}<ul class="objets">${fin}
        </ul>`
      : info;
  }
  return `<ul class="objets">${objets.map(o => vueObjet(t, o, voyageurs, recent)).join('')}${fin}
        </ul>`;
}

function vueCategorie(contexte, affichee, toute, etat, poses) {
  const { t } = contexte;
  const { categorie } = affichee;
  const ouverte = etat.ouvertes.has(categorie.id);
  return `
      <section class="categorie" data-id="${echapper(categorie.id)}" data-flip="cat-${echapper(categorie.id)}"${marqueAttenuee(estAttenuee(etat, categorie))}>
        <h2 class="categorie-titre">
          <button type="button" class="categorie-tete" data-action="accordeon" data-id="${echapper(categorie.id)}" aria-expanded="${ouverte}">
            ${paveCategorie(categorie)}
            <span class="categorie-nom"><b>${echapper(categorie.nom)}</b>${jauge(progression(toute.objets), true)}</span>
            ${compteOuTampon(t, toute, etat, { poses })}
            <span class="chevron" aria-hidden="true">${iconeInterface('deplier')}</span>
          </button>
        </h2>
        ${ouverte ? vueLignes(contexte, affichee, toute.objets.length) : ''}
      </section>`;
}

// Trois colonnes : dans le menu, une catégorie se choisit ; la choisie porte aria-current et sa flèche.
function vueChoix({ t }, affichee, toute, etat, poses) {
  const { categorie } = affichee;
  return `
          <li data-flip="cat-${echapper(categorie.id)}">
            <button type="button" class="choix" data-action="choisir" data-id="${echapper(categorie.id)}" aria-current="${etat.choisie === categorie.id}"${marqueAttenuee(estAttenuee(etat, categorie))}>
              ${paveCategorie(categorie)}
              <span class="categorie-nom"><b>${echapper(categorie.nom)}</b>${jauge(progression(toute.objets), true)}</span>
              ${compteOuTampon(t, toute, etat, { poses })}
              <span class="chevron" aria-hidden="true">${iconeInterface('suivant')}</span>
            </button>
          </li>`;
}

// Repli : la même chose en tuile compacte, pavé, nom, puis le compte ou « Bouclé ! » en petit. Les
// tuiles passent à la ligne : sans glissement (data-flip), une tuile changerait de colonne d'un bond.
const vueTuile = ({ t }, { categorie }, toute, etat) =>
  tuileCategorie(categorie, {
    choisie: etat.choisie,
    infos: compteOuTampon(t, toute, etat, { classes: TUILE }),
    attenuee: estAttenuee(etat, categorie),
  });

// Tablette et ordinateur (src/styles/grand-format.css) : le voyage (debut : en-tête, progression,
// filtre), le menu des catégories (cartes en trois colonnes, tuiles en repli), puis la liste de la
// choisie.
function vueGrandFormat(contexte, { liste, etat, poses }, debut, troisColonnes) {
  const parId = new Map(liste.map(c => [c.categorie.id, c]));
  const affichees = categoriesAffichees(etat, liste);
  const choisie = affichees.find(c => c.categorie.id === etat.choisie);
  const toute = affichee => parId.get(affichee.categorie.id);
  const menu = troisColonnes
    ? `<ul class="choix-liste">${affichees.map(c => vueChoix(contexte, c, toute(c), etat, poses.tampons)).join('')}
        </ul>`
    : `<ul class="gf-tuiles">${affichees.map(c => vueTuile(contexte, c, toute(c), etat)).join('')}
        </ul>`;
  return colonnesGrandFormat({
    t: contexte.t,
    debut,
    menu,
    liste: {
      titre: echapper(choisie.categorie.nom),
      lignes: vueLignes(contexte, choisie, toute(choisie).objets.length, choisie.categorie.id),
    },
    troisColonnes,
  });
}

// « Nouveau voyage » ne crée jamais de voyage vide : celui-ci a perdu tous ses objets, on lui en rajoute.
function vueVide(t) {
  return `
      <section class="vide-voyage">
        <img src="${mascotte}" alt="" width="88" height="88" />
        <h2>${t('voyage.vide.titre')}</h2>
        <p>${t('voyage.vide.texte')}</p>
        <button type="button" class="bouton bouton-principal" data-action="ajouter">${iconeInterface('plus')}${t('voyage.ajouter')}</button>
      </section>`;
}

// Au téléphone, « Ajouter un objet » flotte en bas à droite ; l'écran lui garde sa place (ecran-avec-flottant).
const vueFlottant = t => `
      <button type="button" class="bouton bouton-principal bouton-flottant" data-action="ajouter">${iconeInterface('plus')}${t('voyage.ajouter')}</button>`;

// Le contenu de l'écran et sa disposition (la classe de <main>, et colonnes, son data-colonnes) : une
// colonne de cartes au téléphone ; le grand format si grandFormat (tablettes, ordinateur), en trois
// colonnes si troisColonnes, sinon en repli. Un voyage vide reste en une colonne.
// liste : les catégories du voyage et leurs pièces (listeParCategorie) ; poses : les tampons et le
// bandeau qui viennent d'apparaître, animés une seule fois ; recent : l'objet à éclairer ({ id, ecoule }).
export function vueVoyage(contexteDeLAppli, { contenu, liste, etat, poses, recent, grandFormat, troisColonnes }) {
  // Le nombre de voyageurs et l'objet à éclairer suivent le contexte jusqu'aux lignes (« partagé »).
  const contexte = { ...contexteDeLAppli, voyageurs: contenu.voyage.voyageurs, recent };
  const { t, langue } = contexte;
  // Le lien retour vient en tête, hors du voyage : en grand format, il est seul sur sa ligne.
  const lien = `
      ${lienRetour(t)}`;
  const entete = vueEntete(contexte, contenu.voyage, contenu.etiquettes);
  if (!contenu.objets.length) return { classe: 'ecran', html: lien + entete + vueVide(t) };
  const debut = `${entete}${vueProgression(t, contenu.objets, { sacBoucle: etat.sacBoucle, pose: poses.bandeau })}${vueOutils(t, langue, etat, contenu)}`;
  if (grandFormat)
    return {
      classe: 'grand-format',
      colonnes: troisColonnes ? 3 : 'repli',
      html: lien + vueGrandFormat(contexte, { liste, etat, poses }, debut, troisColonnes),
    };
  const parId = new Map(liste.map(c => [c.categorie.id, c]));
  const categories = categoriesAffichees(etat, liste)
    .map(c => vueCategorie(contexte, c, parId.get(c.categorie.id), etat, poses.tampons))
    .join('');
  return {
    classe: 'ecran ecran-avec-flottant',
    html: `${lien}${debut}
      <div class="categories">${categories}
      </div>${vueFlottant(t)}`,
  };
}

export const vueIntrouvable = t => `
    <main class="ecran">
      ${lienRetour(t)}
      <h1>${t('voyage.introuvableTitre')}</h1>
      <p class="message message-erreur" role="alert">${t('voyage.introuvable')}</p>
    </main>`;

// En bas, par-dessus la liste, sans rien pousser ; le message est un paragraphe pour être lu. Il
// s'efface de lui-même au bout de DUREE_ALERTE (src/ecrans/alerte.js ; écran d'un voyage, assistant
// « Nouveau voyage »).

export const vueAlerte = texte => `
    <div class="message message-erreur alerte" role="alert">${iconeInterface('erreur')}<p>${texte}</p></div>`;
