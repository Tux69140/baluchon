// Outils communs de la maquette : pictos Phosphor (lus dans node_modules), fenêtres, confirmation,
// alerte d'enregistrement, phrase de quantité.
import { PICTOS } from './donnees.js';

const INTERFACE = [
  'list', 'x', 'caret-left', 'caret-right', 'caret-down', 'plus', 'pencil-simple', 'arrows-down-up',
  'arrow-up', 'arrow-down', 'check', 'minus', 'info', 'warning-circle', 'magnifying-glass', 'books',
  'gear-six', 'suitcase-rolling', 'plus-circle',
];

export const svg = {};
export const duo = {};
export async function chargerIcones() {
  const lire = (nom, graisse) =>
    fetch(`../../../node_modules/@phosphor-icons/core/assets/${graisse}/${nom}-${graisse}.svg`).then(r => r.text());
  await Promise.all([
    ...INTERFACE.map(async nom => (svg[nom] = await lire(nom, 'bold'))),
    ...PICTOS.map(async ([nom]) => (duo[nom] = await lire(nom, 'duotone'))),
  ]);
}

export const ic = nom => `<span class="icone" aria-hidden="true">${svg[nom]}</span>`;
export const pave = (icone, couleur, classe = '') =>
  `<span class="pave${classe ? ` ${classe}` : ''}" data-couleur="${couleur}" aria-hidden="true">${duo[icone]}</span>`;
export const echapper = texte =>
  String(texte).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
export const sansAccents = texte => texte.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
export const reduit = matchMedia('(prefers-reduced-motion: reduce)');

// ---------- Quantités : la phrase lue sous la règle, et un exemple chiffré ----------
const EXEMPLE = { jours: 4, nuits: 3, voyageurs: 2 };

export function phraseQuantite({ regle, valeur, plafond, parPersonne }) {
  const rythme = { fixe: '', par_jour: ' par jour', par_nuit: ' par nuit' }[regle];
  const qui = parPersonne ? (regle === 'fixe' ? ' par personne' : ' et par personne') : ' pour tout le groupe';
  const borne = regle !== 'fixe' && plafond ? `, au plus ${plafond}${parPersonne ? ' par personne' : ''}` : '';
  return `${valeur}${rythme}${qui}${borne}`;
}

export function exempleQuantite({ regle, valeur, plafond, parPersonne }) {
  let q = { fixe: valeur, par_jour: valeur * EXEMPLE.jours, par_nuit: valeur * EXEMPLE.nuits }[regle];
  if (regle !== 'fixe' && plafond) q = Math.min(q, plafond);
  if (parPersonne) q *= EXEMPLE.voyageurs;
  return `Pour 4 jours, 3 nuits et 2 voyageurs : ${q}.`;
}

// ---------- Fenêtres ----------
const couche = () => document.getElementById('couche');

// Ouvre une fenêtre. Toute demande de fermeture (×, appui à côté, Échap ou retour, « Annuler »)
// passe par demanderFermeture : si garde() répond non, la fenêtre reste ouverte.
export function ouvrir(dialog, { garde = async () => true, surFermeture } = {}) {
  let ferme = false;
  async function fermer() {
    if (ferme) return;
    ferme = true;
    dialog.dataset.fermeture = '';
    await Promise.allSettled(dialog.getAnimations().map(a => a.finished));
    dialog.close();
    dialog.remove();
    surFermeture?.();
  }
  async function demanderFermeture() {
    if (await garde()) fermer();
  }
  dialog.addEventListener('click', e => {
    if (e.target === dialog || e.target.closest('[data-fermer]')) demanderFermeture();
  });
  dialog.addEventListener('cancel', e => {
    e.preventDefault();
    demanderFermeture();
  });
  // Au doigt, un glissé vers le bas sur l'en-tête referme la fiche (comme celle du voyage).
  const tete = dialog.querySelector('.fenetre-entete');
  let depart = null;
  tete?.addEventListener('pointerdown', e => {
    if (!e.target.closest('button')) depart = e.clientY;
  });
  tete?.addEventListener('pointermove', e => {
    if (depart !== null) dialog.style.transform = `translateY(${Math.max(0, e.clientY - depart)}px)`;
  });
  tete?.addEventListener('pointerup', e => {
    const dy = depart === null ? 0 : e.clientY - depart;
    depart = null;
    dialog.style.transform = '';
    if (dy > 80) demanderFermeture();
  });
  couche().append(dialog);
  dialog.showModal();
  dialog.querySelector('h2')?.focus();
  return { fermer, demanderFermeture };
}

// Question à deux réponses ; rend true si l'utilisateur choisit l'action.
export function confirmer({ titre, texte, annuler, action }) {
  return new Promise(resoudre => {
    const d = document.createElement('dialog');
    d.className = 'fenetre confirmation';
    d.setAttribute('role', 'alertdialog');
    d.setAttribute('aria-labelledby', 'confirmation-titre');
    d.innerHTML = `
      <header class="fenetre-entete"><h2 id="confirmation-titre" tabindex="-1">${titre}</h2></header>
      <p>${texte}</p>
      <div class="fenetre-pied">
        <button type="button" class="bouton bouton-secondaire" data-fermer>${annuler}</button>
        <button type="button" class="bouton bouton-principal" data-oui>${action}</button>
      </div>`;
    let reponse = false;
    const { fermer } = ouvrir(d, { surFermeture: () => resoudre(reponse) });
    d.querySelector('[data-oui]').addEventListener('click', () => {
      reponse = true;
      fermer();
    });
  });
}

// Erreur d'enregistrement : un bandeau dans la couche du dessus (popover), en haut de l'écran, pour
// rester visible par-dessus une fiche ouverte sans couvrir ses boutons ni rien pousser.
let minuteur = null;
export function alerte(texte) {
  document.querySelector('.alerte-haut')?.remove();
  const el = document.createElement('div');
  el.className = 'message message-erreur alerte-haut';
  el.setAttribute('popover', 'manual');
  el.setAttribute('role', 'alert');
  el.innerHTML = `${ic('warning-circle')}<p>${texte}</p>`;
  document.body.append(el);
  el.showPopover();
  clearTimeout(minuteur);
  minuteur = setTimeout(() => el.remove(), 6000);
}
