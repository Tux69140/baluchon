// Le calendrier unique du choix des dates : un premier appui fixe le départ, un second le retour, et
// la période est grisée (décision du chef de projet, 2026-10-06). Les règles (choix A, limite d'un
// an) vivent dans le modèle (src/modele/periode.js). Composant à part, pour servir aussi à « Refaire
// ce voyage » (phase 11) et au changement de dates (phase 10).
import { ajouterJours, ajouterMois, moisDe, moisEnSemaines, moisVoisin } from '../modele/dates.js';
import { choisirJour, etatDuJour } from '../modele/periode.js';
import { formaterDate } from './format.js';
import { iconeInterface } from './icones.js';

const DEPLACEMENTS = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
const SAUTS_DE_MOIS = { PageUp: -1, PageDown: 1 };
// Un lundi quelconque : de lui, on tire les noms des sept jours, du lundi au dimanche.
const UN_LUNDI = '2024-01-01';
const SEMAINE = Array.from({ length: 7 }, (_, i) => ajouterJours(UN_LUNDI, i));

export function creerCalendrier(conteneur, { t, langue, aujourdhui, periode, auChangement }) {
  let selection = { depart: periode.depart ?? null, retour: periode.retour ?? null };
  // Jour qui reçoit le focus au clavier : un seul jour du mois est atteignable par Tab.
  let focus = selection.depart ?? aujourdhui;
  let mois = moisDe(focus);

  const dansLeMois = date => moisDe(date).annee === mois.annee && moisDe(date).mois === mois.mois;

  function cellule(jour) {
    if (!jour) return '<td></td>';
    const e = etatDuJour(selection, jour);
    const classes = [
      'jour',
      e.depart && 'jour-depart',
      e.retour && 'jour-retour',
      e.entre && 'jour-entre',
      jour === aujourdhui && 'jour-aujourdhui',
    ]
      .filter(Boolean)
      .join(' ');
    const nom = formaterDate(jour, langue, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    return `<td><button type="button" class="${classes}" data-jour="${jour}" tabindex="${jour === focus ? 0 : -1}"
      aria-label="${nom}" aria-pressed="${e.depart || e.retour}"${jour === aujourdhui ? ' aria-current="date"' : ''}${e.horsLimite ? ' aria-disabled="true"' : ''}>${Number(jour.slice(8))}</button></td>`;
  }

  function dessiner() {
    const semaines = moisEnSemaines(mois);
    if (!dansLeMois(focus)) focus = semaines.flat().find(Boolean);
    const titre = formaterDate(semaines.flat().find(Boolean), langue, { month: 'long', year: 'numeric' });
    const entetes = SEMAINE.map(
      j =>
        `<th scope="col" abbr="${formaterDate(j, langue, { weekday: 'long' })}">${formaterDate(j, langue, { weekday: 'short' })}</th>`,
    ).join('');
    conteneur.innerHTML = `
          <div class="calendrier-entete">
            <button type="button" class="bouton-icone" data-mois="-1" aria-label="${t('calendrier.moisPrecedent')}">${iconeInterface('precedent')}</button>
            <p class="calendrier-titre" id="calendrier-titre" aria-live="polite">${titre}</p>
            <button type="button" class="bouton-icone" data-mois="1" aria-label="${t('calendrier.moisSuivant')}">${iconeInterface('suivant')}</button>
          </div>
          <table class="calendrier-grille" aria-labelledby="calendrier-titre">
            <thead><tr>${entetes}</tr></thead>
            <tbody>${semaines.map(s => `<tr>${s.map(cellule).join('')}</tr>`).join('')}</tbody>
          </table>`;
  }

  // Redessiner remplace les boutons : le focus est rendu à son équivalent dans le nouveau dessin.
  function redessinerEtFocaliser(selecteur) {
    dessiner();
    conteneur.querySelector(selecteur)?.focus();
  }

  conteneur.addEventListener('click', evenement => {
    const bouton = evenement.target.closest('button');
    if (!bouton) return;
    if (bouton.dataset.mois) {
      mois = moisVoisin(mois, Number(bouton.dataset.mois));
      return redessinerEtFocaliser(`[data-mois="${bouton.dataset.mois}"]`);
    }
    if (bouton.getAttribute('aria-disabled') === 'true') return;
    selection = choisirJour(selection, bouton.dataset.jour);
    focus = bouton.dataset.jour;
    redessinerEtFocaliser(`[data-jour="${focus}"]`);
    auChangement({ ...selection });
  });

  conteneur.addEventListener('keydown', evenement => {
    const jour = evenement.target.dataset?.jour;
    const pas = DEPLACEMENTS[evenement.key];
    const saut = SAUTS_DE_MOIS[evenement.key];
    if (!jour || (pas === undefined && saut === undefined)) return;
    evenement.preventDefault();
    focus = pas === undefined ? ajouterMois(jour, saut) : ajouterJours(jour, pas);
    mois = moisDe(focus);
    redessinerEtFocaliser(`[data-jour="${focus}"]`);
  });

  dessiner();
}
