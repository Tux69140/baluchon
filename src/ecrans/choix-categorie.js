// Choisir une catégorie dans une liste (spec de la phase 8 ; maquette validée le 2026-10-28,
// docs/maquettes/ajuster/fiches.js, « Choisir une catégorie ») : celles du voyage pour « Ajouter un objet »,
// celles de la bibliothèque pour « Ajouter aussi à la bibliothèque ? ». Les lignes sont celles de la
// fenêtre de refus de la phase 7 (src/styles/refus.css) ; la retenue est sur fond actif avec une coche
// (jamais la seule couleur) ; « Nouvelle catégorie » vient en dernier, pavé neutre et « + » vert. Au
// téléphone, elle monte du bas comme les fiches ; ailleurs, fenêtre centrée (src/styles/ajustements.css).
import { ouvrirFenetre, vueFenetre } from './fenetre.js';
import { echapper } from './html.js';
import { iconeInterface, paveCategorie } from './icones.js';

const ID_TITRE = 'choix-titre';

// Le pavé de « Nouvelle catégorie » : sans couleur de catégorie, un « + » à la place du picto.
export const paveNouveau = () => `<span class="pave pave-nouveau" aria-hidden="true">${iconeInterface('plus')}</span>`;

const vueLigne = ({ id, nom, icone, couleur, sousTitre }, choisie) => {
  const retenue = id === choisie;
  return `
          <li>
            <button type="button" class="refus-ligne" data-choix="${echapper(id)}"${retenue ? ' aria-current="true"' : ''}>
              ${paveCategorie({ icone, couleur })}
              <span class="refus-texte"><b>${echapper(nom)}</b><span>${echapper(sousTitre)}</span></span>
              <span class="choix-marque">${retenue ? iconeInterface('coche') : ''}</span>
            </button>
          </li>`;
};

// titre, texte (facultatif), nouvelle (le sous-titre de « Nouvelle catégorie ») : des textes, échappés ici.
// lignes : [{ id, nom, icone, couleur, sousTitre }] dans l'ordre voulu ; choisie : l'id de la retenue, ou
// null. Rend une promesse : l'id touché, 'nouvelle', ou null (« Annuler », ×, Échap, voile, retour système,
// ou l'écran parti avec signal). dans : l'écran, pour que la fenêtre parte avec lui.
export function choisirCategorie({ t, titre, texte = '', lignes, choisie = null, nouvelle, signal, dans }) {
  const gabarit = document.createElement('template');
  gabarit.innerHTML = vueFenetre({
    t,
    idTitre: ID_TITRE,
    titre: echapper(titre),
    contenu: `
      <div class="fiche-corps">${texte ? `\n        <p>${echapper(texte)}</p>` : ''}
        <ul class="refus-liste">${lignes.map(l => vueLigne(l, choisie)).join('')}
          <li>
            <button type="button" class="refus-ligne choix-nouvelle" data-choix="nouvelle">
              ${paveNouveau()}
              <span class="refus-texte"><b>${echapper(t('ajustement.choix.nouvelle'))}</b><span>${echapper(nouvelle)}</span></span>
            </button>
          </li>
        </ul>
      </div>
      <div class="fenetre-pied">
        <button type="button" class="bouton bouton-secondaire" data-fermer>${echapper(t('fenetre.annuler'))}</button>
      </div>`,
  });
  const fenetre = gabarit.content.firstElementChild;
  fenetre.classList.add('fiche', 'refus', 'choix-categorie');
  const corps = fenetre.querySelector('.fiche-corps');
  const pied = fenetre.querySelector('.fenetre-pied');
  // Ombre sur le pied tant que la liste continue dessous, comme les fiches.
  const ombrer = () =>
    pied.toggleAttribute('data-ombre', corps.scrollTop + corps.clientHeight < corps.scrollHeight - 2);
  dans.append(fenetre);
  return new Promise(resoudre => {
    let reponse = null;
    const tailles = new ResizeObserver(ombrer);
    const effacer = () => {
      tailles.disconnect();
      fenetre.remove();
    };
    function partir() {
      effacer();
      resoudre(null);
    }
    signal.addEventListener('abort', partir, { once: true });
    const fermer = ouvrirFenetre(fenetre, {
      fermerSurVoile: true,
      fermerAuRetour: true,
      surFermeture: () => {
        signal.removeEventListener('abort', partir);
        effacer();
        resoudre(reponse);
      },
    });
    fenetre.addEventListener('click', evenement => {
      const ligne = evenement.target.closest('[data-choix]');
      if (!ligne || reponse !== null) return;
      reponse = ligne.dataset.choix;
      fermer();
    });
    corps.addEventListener('scroll', ombrer);
    tailles.observe(corps);
    // La retenue est amenée dans la vue ; le titre prend le focus, comme les autres fiches.
    fenetre.querySelector('[aria-current="true"]')?.scrollIntoView({ block: 'nearest' });
    fenetre.querySelector('h2').focus();
    if (signal.aborted) partir();
  });
}
