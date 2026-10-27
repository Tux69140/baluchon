// La fenêtre de refus d'une suppression (spec de la phase 7 ; maquette validée, décisions du chef de
// projet du 2026-10-26, docs/maquettes/suppressions/refus.js) : supprimer cette étiquette ou ce groupe
// laisserait des catégories ou des objets sans aucune étiquette, qui ne seraient plus jamais proposés.
// La fenêtre les liste (les catégories d'abord) ; un appui ouvre leur fiche par-dessus, et l'on revient
// à la liste, relue, d'où l'élément réglé disparaît. Vide, elle devient la question chiffrée :
// « Plus rien ne bloque », « Garder » ou « Supprimer ».
// Au téléphone, elle monte du bas comme les fiches (src/styles/fiche.css) ; ailleurs, fenêtre centrée de
// 520 px (src/styles/refus.css). Son en-tête reste le même élément d'un dessin à l'autre : le glissé
// pour fermer y tient, et le bandeau « Annuler », rangé dans la fenêtre, n'est jamais effacé.
import { remplir } from '../i18n/traduction.js';
import { consequences, estBloquee } from '../modele/suppressions.js';
import { ouvrirFenetre } from './fenetre.js';
import { pluriel } from './format.js';
import { echapper } from './html.js';
import { iconeInterface, paveCategorie } from './icones.js';
import { question } from './suppression-textes.js';

const ID_TITRE = 'refus-titre';
const ID_TEXTE = 'suppression-texte';

// Les éléments qui bloquent, dans l'ordre de consequences() : catégories, puis objets.
const bloquants = ({ bloquent }) => [
  ...bloquent.categories.map(element => ({ element, type: 'categorie' })),
  ...bloquent.objets.map(element => ({ element, type: 'objet' })),
];
const cle = ({ element, type }) => `${type}-${element.id}`;

// Une ligne : le pavé de la catégorie (la sienne, ou celle de l'objet), le nom, ce que c'est.
function vueLigne(t, langue, bibliotheque, { element, type }, rang) {
  const categorie = type === 'categorie' ? element : bibliotheque.categories.find(c => c.id === element.categorieId);
  const detail =
    type === 'categorie'
      ? pluriel(t, 'refus.categorie', bibliotheque.objets.filter(o => o.categorieId === element.id).length, langue)
      : remplir(t('refus.objet'), { categorie: categorie?.nom ?? '' });
  return `
          <li>
            <button type="button" class="refus-ligne" data-rang="${rang}" data-cle="${echapper(cle({ element, type }))}">
              ${categorie ? paveCategorie(categorie) : ''}
              <span class="refus-texte"><b>${echapper(element.nom)}</b><span>${echapper(detail)}</span></span>
              <span class="chevron">${iconeInterface('suivant')}</span>
            </button>
          </li>`;
}

// cible : { type: 'etiquette' | 'groupe', id } ; nom : le sien. lire() : relit la bibliothèque (rend
// une promesse), à l'ouverture, après chaque fiche fermée et quand « Annuler » rétablit un élément
// (événement « bibliotheque-retablie »). ouvrirFiche(element, type) : ouvre la fiche d'une catégorie ou
// d'un objet par-dessus, et rend une promesse résolue à sa fermeture. supprimer(bibliotheque) : écrit la
// suppression et montre le bandeau, d'après la bibliothèque dont la question a dit les chiffres.
// Rend une promesse : true une fois la suppression écrite ; false pour « Fermer », « Garder », ×, Échap,
// le voile, le retour système, ou l'écran qui s'en va (signal) ; une écriture refusée la rejette, et la
// fiche de l'étiquette dit la panne. dans : l'écran, pour que la fenêtre parte avec lui.
export async function ouvrirRefus({ t, langue, cible, nom, lire, ouvrirFiche, supprimer, signal, dans }) {
  let lue = await lire();
  const fenetre = document.createElement('dialog');
  fenetre.className = 'fenetre fiche refus';
  fenetre.setAttribute('aria-labelledby', ID_TITRE);
  fenetre.innerHTML = `
      <header class="fenetre-entete">
        <h2 id="${ID_TITRE}" tabindex="-1"></h2>
        <button type="button" class="bouton-icone bouton-fermer" data-fermer aria-label="${echapper(t('fenetre.fermer'))}">${iconeInterface('fermer')}</button>
      </header>
      <div class="fiche-corps"></div>
      <div class="fenetre-pied"></div>
      <p class="lecteur" aria-live="polite"></p>`;
  const titre = fenetre.querySelector('h2');
  const croix = fenetre.querySelector('.bouton-fermer');
  const corps = fenetre.querySelector('.fiche-corps');
  const pied = fenetre.querySelector('.fenetre-pied');
  // Hors du corps redessiné : une annonce n'est dite que par une zone qui était déjà là.
  const annonce = fenetre.querySelector('[aria-live]');
  // Les éléments que montre la liste, au dernier dessin.
  let montres = [];
  // Chaque lecture porte un numéro : une lecture lente ne recouvre jamais une plus récente.
  let lecture = 0;
  // « Supprimer » touché : la fenêtre se ferme, puis la suppression s'écrit (une seule fois).
  let choisi = false;
  const fin = new AbortController();

  // Ombre sur le pied tant qu'il reste à défiler, comme les fiches : la liste continue dessous.
  const ombrer = () =>
    pied.toggleAttribute('data-ombre', corps.scrollTop + corps.clientHeight < corps.scrollHeight - 2);

  // Un élément réglé quitte la liste : on le dit au lecteur d'écran.
  function annoncer(elements) {
    const partis = montres.filter(m => !elements.some(e => cle(e) === cle(m)));
    if (!partis.length) return;
    const noms = new Intl.ListFormat(langue, { type: 'conjunction' }).format(partis.map(p => p.element.nom));
    annonce.textContent = elements.length
      ? remplir(t('refus.regle'), { noms, n: elements.length })
      : t('refus.toutRegle');
  }

  function peindre() {
    const chiffres = consequences(lue, cible, langue);
    const elements = estBloquee(chiffres) ? bloquants(chiffres) : [];
    annoncer(elements);
    montres = elements;
    const libre = !elements.length;
    // D'une forme à l'autre (liste, question), le corps repart d'en haut ; la liste relue garde sa place.
    const haut = libre === croix.hidden ? corps.scrollTop : 0;
    croix.hidden = libre;
    if (libre) {
      const { titre: texteTitre, texte } = question(t, langue, cible, nom, chiffres);
      fenetre.setAttribute('role', 'alertdialog');
      fenetre.setAttribute('aria-describedby', ID_TEXTE);
      titre.textContent = texteTitre;
      corps.innerHTML = `
        <p class="message message-succes refus-libre">${iconeInterface('coche')}<span>${echapper(remplir(t('refus.libre'), { nom }))}</span></p>
        <p id="${ID_TEXTE}">${texte}</p>`;
      pied.innerHTML = `
        <button type="button" class="bouton bouton-secondaire" data-fermer>${echapper(t('suppression.garder'))}</button>
        <button type="button" class="bouton bouton-danger" data-supprimer>${iconeInterface('supprimer')}${echapper(t('suppression.supprimer'))}</button>`;
    } else {
      // Un élément rétabli par « Annuler » peut faire revenir la liste après « Plus rien ne bloque ».
      fenetre.removeAttribute('role');
      fenetre.removeAttribute('aria-describedby');
      titre.textContent = remplir(t('refus.titre'), { nom });
      corps.innerHTML = `
        <p class="refus-explication">${echapper(pluriel(t, `refus.${cible.type}`, elements.length, langue))}</p>
        <h3 class="refus-reste">${echapper(remplir(t('refus.reste'), { n: elements.length }))}</h3>
        <ul class="refus-liste">${elements.map((e, rang) => vueLigne(t, langue, lue, e, rang)).join('')}
        </ul>`;
      pied.innerHTML = `
        <button type="button" class="bouton bouton-secondaire" data-fermer>${echapper(t('refus.fermer'))}</button>`;
    }
    corps.scrollTop = haut;
    ombrer();
  }

  // Relire puis redessiner ; focus : ce qui le reçoit ensuite (la ligne de l'élément s'il reste, sinon
  // la première, ou « Garder » quand plus rien ne bloque : jamais « Supprimer », geste qui perd).
  async function relire(focus = null) {
    const numero = ++lecture;
    let relue;
    try {
      relue = await lire();
    } catch (erreur) {
      // Relecture impossible : la fenêtre garde ce qu'elle montre ; la suppression, si on la demande,
      // s'écrira sur ce qui a été annoncé.
      console.error(erreur);
      return;
    }
    if (numero !== lecture || !fenetre.isConnected || choisi) return;
    lue = relue;
    peindre();
    if (!focus) return;
    const ligne = fenetre.querySelector(`.refus-ligne[data-cle="${CSS.escape(focus)}"]`);
    (ligne ?? fenetre.querySelector('.refus-ligne, .fenetre-pied [data-fermer]'))?.focus();
  }

  peindre();
  dans.append(fenetre);
  return new Promise((resoudre, rejeter) => {
    const effacer = () => {
      fin.abort();
      fenetre.remove();
    };
    async function surFermeture() {
      signal.removeEventListener('abort', partir);
      effacer();
      if (!choisi) return resoudre(false);
      try {
        await supprimer(lue);
        resoudre(true);
      } catch (erreur) {
        rejeter(erreur);
      }
    }
    // L'écran s'en va : la fenêtre disparaît avec lui, rien n'est supprimé.
    function partir() {
      effacer();
      resoudre(false);
    }
    signal.addEventListener('abort', partir, { once: true });
    const fermer = ouvrirFenetre(fenetre, { surFermeture, fermerSurVoile: true, fermerAuRetour: true });

    fenetre.addEventListener('click', evenement => {
      const ligne = evenement.target.closest('.refus-ligne');
      if (ligne) {
        const { element, type } = montres[Number(ligne.dataset.rang)];
        // De retour de la fiche (enregistrée, supprimée ou fermée) : la liste est relue.
        ouvrirFiche(element, type).then(() => relire(cle({ element, type })));
      } else if (evenement.target.closest('[data-supprimer]') && !choisi) {
        choisi = true;
        fermer();
      }
    });
    // « Annuler » du bandeau pendant que la fenêtre est ouverte : l'élément revient dans la liste.
    window.addEventListener('bibliotheque-retablie', () => relire(), { signal: fin.signal });
    corps.addEventListener('scroll', ombrer, { signal: fin.signal });
    const tailles = new ResizeObserver(ombrer);
    tailles.observe(corps);
    fin.signal.addEventListener('abort', () => tailles.disconnect());
    if (signal.aborted) partir();
    titre.focus();
  });
}
