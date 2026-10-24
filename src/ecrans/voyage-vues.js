// Le HTML de l'écran d'un voyage (src/ecrans/voyage.js), d'après la maquette validée le 2026-10-24
// (docs/maquettes/voyage/) : en-tête, progression, filtre, cartes de catégorie, lignes d'objet, voyage
// vide. Rien ne vit ici que du dessin : l'ordre, les masqués et les replis viennent de l'état
// d'affichage (src/ecrans/rangement.js), les pièces du voyage lui-même.
import { remplir } from '../i18n/traduction.js';
import { appuiSurCase, estComplet, etatDansLeSac, progression } from '../modele/sac.js';
import { detailsVoyage, pluriel } from './format.js';
import { echapper } from './html.js';
import { iconeInterface, paveCategorie } from './icones.js';
import { categoriesAffichees } from './rangement.js';
import { lienRetour } from './retour.js';
import mascotte from '../images/baluchon.svg';

const compte = (t, { faits, total }) => remplir(t('voyage.compte'), { faits, total });

function jauge({ faits, total }, mini = false) {
  const pourcent = total ? Math.round((100 * faits) / total) : 0;
  const fini = total && faits === total ? ' data-fini' : '';
  return `<span class="jauge${mini ? ' jauge-mini' : ''}"${fini}><i style="width: ${pourcent}%"></i></span>`;
}

// Une hauteur réservée : le bandeau « Sac bouclé ! » prend la place de la jauge, à peine plus haut.
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

function vueOutils(t, langue, etat) {
  const masques = etat.filtre && etat.masques.size;
  return `
      <div class="outils">
        <button type="button" class="puce" data-action="filtre" aria-pressed="${etat.filtre}">${iconeInterface('filtre')}${t('voyage.filtre')}</button>
      </div>${masques ? `\n      <p class="masques">${pluriel(t, 'voyage.masques', masques, langue)}</p>` : ''}`;
}

function vueEntete({ t, langue }, voyage) {
  const destination = voyage.destination ? `<p>${echapper(voyage.destination)}</p>` : '';
  return `
      ${lienRetour(t)}
      <h1>${echapper(voyage.nom)}</h1>
      <div class="voyage-entete">
        ${destination}
        <p class="voyage-details">${echapper(detailsVoyage(t, voyage, langue))}</p>
      </div>`;
}

// Le tampon remplace le compte dès qu'une catégorie est bouclée pour l'état d'affichage (après la
// seconde de répit) ; pose : il vient d'être posé, il s'imprime avec un rebond.
function compteOuTampon(t, { categorie, objets }, etat, poses) {
  if (etat.bouclees.has(categorie.id))
    return `<span class="tampon"${poses.has(categorie.id) ? ' data-pose' : ''}>${t('voyage.boucle')}</span>`;
  return `<span class="compte">${compte(t, progression(objets))}</span>`;
}

// Le nom de la case dit l'état et ce que fera l'appui (« Ajouter une pièce », « Vider »…).
function libelleCase(t, objet) {
  const valeurs = { nom: objet.nom, n: objet.dansLeSac, total: objet.quantite };
  if (estComplet(objet))
    return remplir(t(`voyage.case.${appuiSurCase(objet).confirmer ? 'vider' : 'decocher'}`), valeurs);
  return remplir(t(`voyage.case.${objet.quantite === 1 ? 'cocher' : 'ajouter'}`), valeurs);
}

function vueObjet(t, objet) {
  const etat = etatDansLeSac(objet);
  const entame = etat === 'entame';
  const quantite = entame ? `${objet.dansLeSac}<small> / ${objet.quantite}</small>` : `${objet.quantite}`;
  const quantiteDite = entame ? `${objet.dansLeSac} / ${objet.quantite}` : `${objet.quantite}`;
  const note = objet.note ? `, ${t('voyage.avecNote')}` : '';
  // « partagé » : la quantité vaut pour tout le groupe, pas par personne (docs/PRD.md, US-3).
  const partage = objet.parPersonne ? '' : t('voyage.partage');
  const sous = partage && `<span class="objet-sous"><span>${partage}</span></span>`;
  // Le nom du bouton reprend tout ce que la ligne montre, dans le même ordre.
  const nomDit = partage ? `${objet.nom}, ${partage}` : objet.nom;
  return `
          <li class="objet" data-id="${echapper(objet.id)}" data-etat="${etat}" data-flip="${echapper(objet.id)}">
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

// Une catégorie ouverte dont le filtre masque tout le dit en toutes lettres, plutôt que d'être vide.
function vueLignes(t, langue, { objets }, nombre) {
  if (!objets.length) return `<p class="ligne-info">${pluriel(t, 'voyage.categorieMasquee', nombre, langue)}</p>`;
  return `<ul class="objets">${objets.map(o => vueObjet(t, o)).join('')}
        </ul>`;
}

function vueCategorie({ t, langue }, affichee, toute, etat, poses) {
  const { categorie } = affichee;
  const ouverte = etat.ouvertes.has(categorie.id);
  const attenuee = etat.filtre && etat.enBas.has(categorie.id) ? ' data-attenuee' : '';
  return `
      <section class="categorie" data-id="${echapper(categorie.id)}" data-flip="cat-${echapper(categorie.id)}"${attenuee}>
        <h2 class="categorie-titre">
          <button type="button" class="categorie-tete" data-action="accordeon" data-id="${echapper(categorie.id)}" aria-expanded="${ouverte}">
            ${paveCategorie(categorie)}
            <span class="categorie-nom"><b>${echapper(categorie.nom)}</b>${jauge(progression(toute.objets), true)}</span>
            ${compteOuTampon(t, toute, etat, poses)}
            <span class="chevron" aria-hidden="true">${iconeInterface('deplier')}</span>
          </button>
        </h2>
        ${ouverte ? vueLignes(t, langue, affichee, toute.objets.length) : ''}
      </section>`;
}

function vueVide(t) {
  return `
      <section class="vide-voyage">
        <img src="${mascotte}" alt="" width="88" height="88" />
        <h2>${t('voyage.vide.titre')}</h2>
        <p>${t('voyage.vide.texte')}</p>
      </section>`;
}

// Le contenu de l'écran. liste : les catégories du voyage et leurs pièces (listeParCategorie) ;
// poses : les tampons et le bandeau qui viennent d'apparaître, animés une seule fois.
export function vueVoyage(contexte, { contenu, liste, etat, poses }) {
  const { t, langue } = contexte;
  if (!contenu.objets.length) return vueEntete(contexte, contenu.voyage) + vueVide(t);
  const parId = new Map(liste.map(c => [c.categorie.id, c]));
  const categories = categoriesAffichees(etat, liste)
    .map(c => vueCategorie(contexte, c, parId.get(c.categorie.id), etat, poses.tampons))
    .join('');
  return `${vueEntete(contexte, contenu.voyage)}${vueProgression(t, contenu.objets, { sacBoucle: etat.sacBoucle, pose: poses.bandeau })}${vueOutils(t, langue, etat)}
      <div class="categories">${categories}
      </div>`;
}

export const vueIntrouvable = t => `
    <main class="ecran">
      ${lienRetour(t)}
      <h1>${t('voyage.introuvableTitre')}</h1>
      <p class="message message-erreur" role="alert">${t('voyage.introuvable')}</p>
    </main>`;

// En bas, par-dessus la liste, sans rien pousser ; le message est un paragraphe pour être lu.
export const vueAlerte = texte => `
    <div class="message message-erreur alerte" role="alert">${iconeInterface('erreur')}<p>${texte}</p></div>`;
