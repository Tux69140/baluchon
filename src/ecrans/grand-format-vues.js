// Le HTML commun à l'écran d'un voyage et à la Bibliothèque sur tablette et ordinateur (maquette
// validée le 2026-10-27, docs/maquettes/grand-ecran/) : les colonnes et la tuile d'une catégorie.
// src/styles/grand-format.css décrit et habille ce HTML ; chaque écran y met ses propres pièces.
import { echapper } from './html.js';
import { paveCategorie } from './icones.js';

// La marque d'une catégorie bouclée descendue sous le filtre « Reste à emballer » (voyage) : carte,
// choix ou tuile, habillés par voyage.css et grand-format.css.
export const marqueAttenuee = oui => (oui ? ' data-attenuee' : '');

// Une tuile du repli : le pavé, le nom, puis ce qu'en dit l'écran (infos : compte, « Bouclé ! »,
// nombre d'objets). La choisie porte aria-current ; attenuee : bouclée sous le filtre ; recent : elle
// vient d'être enregistrée, elle s'éclaire.
export const tuileCategorie = (categorie, { choisie, infos, attenuee = false, recent = false }) => `
          <li${recent ? ' data-recent' : ''}>
            <button type="button" class="gf-tuile" data-action="choisir" data-id="${echapper(categorie.id)}" aria-current="${choisie === categorie.id}"${marqueAttenuee(attenuee)}>
              ${paveCategorie(categorie)}
              <span class="gf-tuile-texte"><b>${echapper(categorie.nom)}</b>${infos}</span>
            </button>
          </li>`;

// Les trois parties, dans l'ordre où le clavier les parcourt : debut (le bloc de gauche), le menu des
// catégories (cartes ou tuiles, ou ce qui prend sa place : enPlaceDuMenu), puis la liste de la
// choisie, s'il y en a une. Le titre de la liste (déjà échappé) ne se voit qu'en repli, où les tuiles
// sortent de l'écran en défilant ; en trois colonnes, la carte choisie le dit, et il reste pour la
// lecture d'écran. apresLeTitre : ce qui l'accompagne (« Modifier » de la Bibliothèque).
export function colonnesGrandFormat({ t, debut, menu, enPlaceDuMenu, liste, troisColonnes }) {
  const milieu = enPlaceDuMenu
    ? `
      <div class="gf-menu">${enPlaceDuMenu}
      </div>`
    : `
      <nav class="gf-menu" aria-labelledby="menu-titre">
        <h2 id="menu-titre" class="lecteur">${t('voyage.categories')}</h2>
        ${menu}
      </nav>`;
  const fin = liste
    ? `
      <section class="gf-liste" aria-labelledby="liste-titre">
        <div class="gf-liste-tete">
          <h2 id="liste-titre"${troisColonnes ? ' class="lecteur"' : ''}>${liste.titre}</h2>${liste.apresLeTitre ?? ''}
        </div>
        <div class="gf-carte-objets">${liste.lignes}</div>
      </section>`
    : '';
  return `
      <div class="gf-gauche">${debut}
      </div>${milieu}${fin}`;
}
