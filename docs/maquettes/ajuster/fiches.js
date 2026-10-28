// Fiches et fenêtres de la phase 8 (maquette), d'après la conception du 2026-10-28
// (docs/superpowers/specs/2026-10-28-phase-8-ajuster-design.md) : la fiche d'un objet du voyage avec
// « Ajuster cet objet », « Ajouter un objet », le choix d'une catégorie, « Nouvelle catégorie » (pour ce
// voyage), « Renommer », et les questions. Les fenêtres, l'abandon d'une saisie et le catalogue de
// pictos sont ceux des maquettes des phases 5 à 7.
import { ouvrirCatalogue } from '../bibliotheque/fiches.js';
import { COULEURS, PICTOS } from '../bibliotheque/donnees.js';
import { alerte, confirmer, echapper, ic, ouvrir, pave, svg } from '../bibliotheque/outils.js';
import { typo } from '../suppressions/textes.js';
import { complet, phraseRegle } from './donnees.js';

const MAX = 999;
const nomPicto = icone => PICTOS.find(([nom]) => nom === icone)?.[1] ?? '';
const pieces = n => `${n} pièce${n > 1 ? 's' : ''}`;
const etre = n => (n > 1 ? 'sont' : 'est');

// ---------- Morceaux ----------
const croix = () =>
  `<button type="button" class="bouton-icone bouton-fermer" data-fermer aria-label="Fermer">${ic('x')}</button>`;

const champNom = (valeur, erreur) => `
        <div class="champ">
          <label for="f-nom">Nom</label>
          <input id="f-nom" data-f="nom" value="${echapper(valeur)}" autocomplete="off" maxlength="60"
            aria-invalid="${Boolean(erreur)}" aria-describedby="f-nom-erreur" />
          <p class="erreur-champ" id="f-nom-erreur">${erreur ? `${ic('warning-circle')}${erreur}` : ''}</p>
        </div>`;

// − nombre + : sans saisie (fiche du voyage, comme « Dans le sac ») ou avec (fiche d'ajout).
function compteur(cle, valeur, libelle, { saisie = false, inactifMoins = valeur <= 1, inactifPlus = valeur >= MAX } = {}) {
  const milieu = saisie
    ? `<input type="text" inputmode="numeric" data-f="${cle}" value="${valeur}" aria-label="${libelle}" maxlength="3" />`
    : `<output aria-live="polite" aria-label="${libelle}">${valeur}</output>`;
  return `
            <span class="compteur${saisie ? ' compteur-saisie' : ''}">
              <button type="button" class="bouton-icone" data-f="${cle}-moins" aria-label="${libelle} : un de moins"${inactifMoins ? ' aria-disabled="true"' : ''}>${ic('minus')}</button>
              ${milieu}
              <button type="button" class="bouton-icone" data-f="${cle}-plus" aria-label="${libelle} : un de plus"${inactifPlus ? ' aria-disabled="true"' : ''}>${ic('plus')}</button>
            </span>`;
}

// Le pavé neutre de « Nouvelle catégorie » (comme la tuile de la Bibliothèque en repli).
const paveNouveau = () => `<span class="pave pave-nouveau" aria-hidden="true">${svg.plus}</span>`;

// Ombre sur le pied tant qu'il reste à défiler (décision de l'assistant, 2026-10-25).
function suivrePied(d) {
  const zone = d.querySelector('.fiche-corps');
  const pied = d.querySelector('.fenetre-pied');
  const ombrer = () => pied?.toggleAttribute('data-ombre', zone.scrollTop + zone.clientHeight < zone.scrollHeight - 2);
  zone.addEventListener('scroll', ombrer);
  new ResizeObserver(ombrer).observe(zone);
  return ombrer;
}

// ---------- Questions ----------
// Une question à deux réponses ; rend true pour l'action. danger : l'action en rouge, avec la corbeille.
export function question({ titre, texte, non, oui, danger = false, icone }) {
  return new Promise(resoudre => {
    const d = document.createElement('dialog');
    d.className = 'fenetre confirmation';
    d.setAttribute('role', 'alertdialog');
    d.setAttribute('aria-labelledby', 'question-titre');
    d.setAttribute('aria-describedby', 'question-texte');
    d.innerHTML = `
      <header class="fenetre-entete"><h2 id="question-titre" tabindex="-1">${typo(titre)}</h2></header>
      <div id="question-texte" class="question-texte">${[texte].flat().map(p => `<p>${typo(p)}</p>`).join('')}</div>
      <div class="fenetre-pied">
        <button type="button" class="bouton bouton-secondaire" data-fermer>${typo(non)}</button>
        <button type="button" class="bouton ${danger ? 'bouton-danger' : 'bouton-principal'}" data-oui>${danger ? ic('trash') : icone ? ic(icone) : ''}${typo(oui)}</button>
      </div>`;
    let reponse = false;
    const { fermer } = ouvrir(d, { surFermeture: () => resoudre(reponse) });
    d.querySelector('[data-oui]').addEventListener('click', () => {
      reponse = true;
      fermer();
    });
  });
}

export const demanderBibliotheque = nom =>
  question({
    titre: `Ajouter aussi « ${echapper(nom)} » à la bibliothèque ?`,
    texte: 'Il pourra revenir dans vos prochains voyages : vous choisirez lesquels.',
    non: 'Non',
    oui: 'Oui, l’ajouter',
    icone: 'books',
  });

// Retirer un objet du voyage : la bibliothèque ne change pas ; ce qui part avec lui est dit.
export function confirmerRetrait(x, categorie) {
  const texte = ['La bibliothèque ne change pas.'];
  if (x.dansLeSac) texte.push(`${x.dansLeSac > 1 ? 'Ses' : 'Sa'} <b>${pieces(x.dansLeSac)}</b> déjà dans le sac ${x.dansLeSac > 1 ? 'sortent' : 'sort'} de la liste.`);
  if (categorie.objets.length === 1)
    texte.push(`C’est le dernier objet de « ${echapper(categorie.nom)} » : la catégorie disparaît aussi de ce voyage.`);
  return question({ titre: `Retirer « ${echapper(x.nom)} » de ce voyage ?`, texte, non: 'Garder', oui: 'Retirer', danger: true });
}

// Baisser la quantité prévue sous ce qui est déjà dans le sac (décision du chef de projet, 2026-10-28).
export const confirmerBaisse = (x, quantite) =>
  question({
    titre: 'Sortir une pièce du sac ?',
    texte: `${x.dansLeSac === x.quantite && x.dansLeSac > 1 ? 'Les ' : ''}<b>${pieces(x.dansLeSac)}</b> de « ${echapper(x.nom)} » ${etre(x.dansLeSac)} déjà dans le sac. En prévoir ${quantite} en sort une.`,
    non: `Garder ${x.quantite}`,
    oui: `Prévoir ${quantite}`,
  });

// Un message de réussite en haut de l'écran, à la place des messages (comme l'erreur d'enregistrement).
let minuteur = null;
export function reussite(texte, duree = 5000) {
  document.querySelector('.alerte-haut')?.remove();
  const el = document.createElement('div');
  el.className = 'message message-succes alerte-haut';
  el.setAttribute('popover', 'manual');
  el.setAttribute('role', 'status');
  el.innerHTML = `${ic('check')}<p>${typo(texte)}</p>`;
  document.body.append(el);
  el.showPopover();
  clearTimeout(minuteur);
  if (Number.isFinite(duree)) minuteur = setTimeout(() => el.remove(), duree);
}

// ---------- La fiche d'un objet du voyage ----------
// Celle de la phase 3 (« Dans le sac », « Tout dans le sac », « Vider », note), plus « Ajuster cet
// objet » ; « Retirer du voyage » en rouge sous un trait, en bas, comme « Supprimer » dans les fiches
// de la bibliothèque (phase 7). La ligne du haut ne dit plus que la catégorie : le calcul, ou « fixée manuellement », vit
// sous « Quantité prévue ». Chaque geste repart vers l'écran (agir), qui enregistre et repeint.
export function ficheVoyage({ objet, categorie, agir }) {
  const d = document.createElement('dialog');
  d.className = 'fenetre fiche fiche-voyage';
  d.setAttribute('aria-labelledby', 'fiche-titre');
  d.innerHTML = `
      <header class="fenetre-entete">
        <h2 id="fiche-titre" tabindex="-1"></h2>
        ${croix()}
      </header>
      <div class="fiche-corps"></div>`;
  const zone = d.querySelector('.fiche-corps');
  function peindre(x = objet, c = categorie) {
    objet = x;
    categorie = c;
    const focus = document.activeElement?.closest('[data-f]')?.dataset.f;
    d.querySelector('h2').textContent = x.nom;
    const calcul = x.manuelle ? 'fixée manuellement' : `calculée : ${phraseRegle(x.regle)}`;
    zone.innerHTML = `
        <p class="fiche-regle">${echapper(c.nom)}</p>
        <section class="fiche-bloc" aria-labelledby="fiche-sac">
          <h3 id="fiche-sac">Dans le sac</h3>
          <div class="compteur">
            <button type="button" class="bouton-icone" data-f="sac-moins" aria-label="Une pièce de moins"${x.dansLeSac === 0 ? ' aria-disabled="true"' : ''}>${ic('minus')}</button>
            <output aria-live="polite">${x.dansLeSac}</output>
            <button type="button" class="bouton-icone" data-f="sac-plus" aria-label="Une pièce de plus"${complet(x) ? ' aria-disabled="true"' : ''}>${ic('plus')}</button>
            <span class="compteur-total">sur ${x.quantite}</span>
          </div>
          <div class="fiche-actions">
            <button type="button" class="bouton bouton-principal" data-f="tout"${complet(x) ? ' aria-disabled="true"' : ''}>${ic('check')}Tout dans le sac</button>
            <button type="button" class="bouton bouton-secondaire" data-f="vider"${x.dansLeSac === 0 ? ' aria-disabled="true"' : ''}>Vider</button>
          </div>
        </section>${
          x.note
            ? `
        <section class="fiche-bloc" aria-labelledby="fiche-note">
          <h3 id="fiche-note">Note</h3>
          <p class="fiche-note">${ic('info')}<span>${echapper(x.note)}</span></p>
        </section>`
            : ''
        }
        <section class="fiche-bloc fiche-ajuster" aria-labelledby="fiche-ajuster">
          <h3 id="fiche-ajuster">Ajuster cet objet</h3>
          <div class="ligne-reglage">
            <span>Quantité prévue<small data-calcul>${calcul}</small></span>
            ${compteur('quantite', x.quantite, 'Quantité prévue', { inactifPlus: x.quantite >= MAX })}
          </div>
          <div class="fiche-actions">
            <button type="button" class="bouton bouton-secondaire" data-f="renommer">${ic('pencil-simple')}Renommer</button>
          </div>
        </section>
        <div class="zone-suppression">
          <button type="button" class="bouton bouton-supprimer" data-f="retirer">${ic('trash')}Retirer du voyage</button>
        </div>`;
    if (focus) zone.querySelector(`[data-f="${focus}"]`)?.focus({ preventScroll: true });
  }
  peindre();
  d.addEventListener('click', e => {
    const el = e.target.closest('[data-f]');
    if (!el || el.getAttribute('aria-disabled') === 'true') return;
    agir(el.dataset.f, el);
  });
  const { fermer } = ouvrir(d);
  return { d, peindre, fermer };
}

// ---------- Choisir une catégorie (du voyage, ou de la bibliothèque) ----------
// Rend l'identifiant choisi, 'nouvelle', ou null (fermée). liste : [{ id, nom, icone, couleur, sous }].
export function choisirCategorie({ titre, texte, liste, choisie, nouvelle }) {
  return new Promise(resoudre => {
    const d = document.createElement('dialog');
    d.className = 'fenetre fiche refus choix-categorie';
    d.setAttribute('aria-labelledby', 'choix-titre');
    const ligne = c => `
          <li>
            <button type="button" class="refus-ligne" data-choix="${c.id}"${c.id === choisie ? ' aria-current="true"' : ''}>
              ${pave(c.icone, c.couleur)}
              <span class="refus-texte"><b>${echapper(c.nom)}</b><span>${c.sous}</span></span>
              <span class="choix-marque" aria-hidden="true">${c.id === choisie ? svg.check : ''}</span>
            </button>
          </li>`;
    d.innerHTML = `
      <header class="fenetre-entete">
        <h2 id="choix-titre" tabindex="-1">${typo(titre)}</h2>
        ${croix()}
      </header>
      <div class="fiche-corps">
        ${texte ? `<p>${typo(texte)}</p>` : ''}
        <ul class="refus-liste">${liste.map(ligne).join('')}
          <li>
            <button type="button" class="refus-ligne choix-nouvelle" data-choix="nouvelle">
              ${paveNouveau()}
              <span class="refus-texte"><b>Nouvelle catégorie</b><span>${nouvelle}</span></span>
            </button>
          </li>
        </ul>
      </div>
      <div class="fenetre-pied">
        <button type="button" class="bouton bouton-secondaire" data-fermer>Annuler</button>
      </div>`;
    let reponse = null;
    const { fermer } = ouvrir(d, { surFermeture: () => resoudre(reponse) });
    suivrePied(d)();
    d.addEventListener('click', e => {
      const el = e.target.closest('[data-choix]');
      if (!el) return;
      reponse = el.dataset.choix;
      fermer();
    });
    d.querySelector('[aria-current="true"]')?.scrollIntoView({ block: 'nearest' });
  });
}

// ---------- « Nouvelle catégorie » pour ce voyage ----------
// Les trois réglages de la fiche de catégorie de la bibliothèque, sans « Dans quels voyages ? ».
// « Choisir » la rend à la fiche d'ajout ; rien n'est écrit avant « Ajouter ». Rend { nom, icone,
// couleur } ou null.
export function ficheNouvelleCategorie(initial = { nom: '', icone: 'suitcase-rolling', couleur: 'corail' }) {
  return new Promise(resoudre => {
    const b = { ...initial };
    const depart = JSON.stringify(b);
    let erreur = '';
    let reponse = null;
    const d = document.createElement('dialog');
    d.className = 'fenetre fiche fiche-modele';
    d.setAttribute('aria-labelledby', 'fiche-titre');
    d.innerHTML = `
      <header class="fenetre-entete">
        <h2 id="fiche-titre" tabindex="-1">Nouvelle catégorie</h2>
        ${croix()}
      </header>
      <div class="fiche-corps"></div>
      <div class="fenetre-pied">
        <button type="button" class="bouton bouton-secondaire" data-fermer>Annuler</button>
        <button type="button" class="bouton bouton-principal" data-f="choisir">Choisir</button>
      </div>`;
    const zone = d.querySelector('.fiche-corps');
    const peindre = () => {
      const focus = document.activeElement?.closest('[data-f]');
      const cle = focus && [focus.dataset.f, focus.dataset.valeur];
      zone.innerHTML = `
        <p class="fiche-regle">Pour ce voyage seulement : la bibliothèque ne change pas.</p>
        ${champNom(b.nom, erreur)}
        <fieldset class="champ champ-sans-message">
          <legend>Picto et couleur</legend>
          <div class="apparence">
            ${pave(b.icone, b.couleur, 'pave-grand')}
            <span class="apparence-nom">${nomPicto(b.icone)}</span>
            <button type="button" class="bouton bouton-secondaire" data-f="catalogue">Changer de picto</button>
          </div>
          <div class="nuancier" role="radiogroup" aria-label="Couleur">
            ${COULEURS.map(([c, nom]) => `<button type="button" class="teinte" role="radio" data-f="couleur" data-valeur="${c}" data-couleur="${c}" aria-checked="${b.couleur === c}" aria-label="${nom}">${b.couleur === c ? svg.check : ''}</button>`).join('')}
          </div>
        </fieldset>`;
      if (cle) zone.querySelector(`[data-f="${cle[0]}"]${cle[1] ? `[data-valeur="${cle[1]}"]` : ''}`)?.focus({ preventScroll: true });
    };
    const garde = async () =>
      reponse !== null ||
      JSON.stringify(b) === depart ||
      confirmer({ titre: 'Abandonner cette catégorie ?', texte: 'La nouvelle catégorie ne sera pas créée.', annuler: 'Continuer la saisie', action: 'Abandonner' });
    const { fermer } = ouvrir(d, { garde, surFermeture: () => resoudre(reponse) });
    suivrePied(d);
    d.addEventListener('input', e => {
      if (e.target.dataset.f !== 'nom') return;
      b.nom = e.target.value;
      if (erreur && b.nom.trim()) {
        erreur = '';
        peindre();
      }
    });
    d.addEventListener('click', e => {
      const el = e.target.closest('[data-f]');
      if (!el) return;
      const f = el.dataset.f;
      if (f === 'couleur') b.couleur = el.dataset.valeur;
      else if (f === 'catalogue') return ouvrirCatalogue(b, peindre);
      else if (f === 'choisir') {
        if (!b.nom.trim()) {
          erreur = 'Donnez un nom à cette catégorie.';
          peindre();
          return zone.querySelector('#f-nom').focus();
        }
        reponse = { ...b, nom: b.nom.trim() };
        return fermer();
      } else return;
      peindre();
    });
    peindre();
  });
}

// ---------- « Ajouter un objet » ----------
// categories : celles du voyage ; choisie : celle d'où l'on part. ajouter({ nom, quantite, categorie })
// reçoit l'identifiant d'une catégorie du voyage, ou { nouvelle: { nom, icone, couleur } }. panne() :
// l'écriture échoue (la saisie est gardée).
export function ficheAjout({ categories, choisie, ajouter, panne = () => false }) {
  const b = { nom: '', quantite: 1, categorie: choisie ?? categories[0]?.id ?? null };
  const depart = JSON.stringify(b);
  const erreurs = {};
  let ajoute = false;
  const d = document.createElement('dialog');
  d.className = 'fenetre fiche fiche-modele fiche-ajout';
  d.setAttribute('aria-labelledby', 'fiche-titre');
  d.innerHTML = `
      <header class="fenetre-entete">
        <h2 id="fiche-titre" tabindex="-1">Ajouter un objet</h2>
        ${croix()}
      </header>
      <div class="fiche-corps"></div>
      <div class="fenetre-pied">
        <button type="button" class="bouton bouton-secondaire" data-fermer>Annuler</button>
        <button type="button" class="bouton bouton-principal" data-f="ajouter">${ic('plus')}Ajouter</button>
      </div>`;
  const zone = d.querySelector('.fiche-corps');
  const retenue = () =>
    b.categorie?.nouvelle ?? categories.find(c => c.id === b.categorie);
  const peindre = () => {
    const focus = document.activeElement?.closest('[data-f]')?.dataset.f;
    const c = retenue();
    const sous = b.categorie?.nouvelle
      ? 'Nouvelle, pour ce voyage'
      : `${c.objets.length} objet${c.objets.length > 1 ? 's' : ''} dans ce voyage`;
    zone.innerHTML = `
        <p class="fiche-regle">Dans ce voyage seulement : la bibliothèque ne change pas.</p>
        ${champNom(b.nom, erreurs.nom)}
        <div class="champ">
          <span class="champ-titre" id="f-categorie-titre">Catégorie</span>
          <button type="button" class="champ-categorie" data-f="categorie" aria-labelledby="f-categorie-titre f-categorie-nom" aria-haspopup="dialog">
            ${c ? pave(c.icone, c.couleur) : paveNouveau()}
            <span class="refus-texte"><b id="f-categorie-nom">${c ? echapper(c.nom) : 'À choisir'}</b><span>${c ? sous : 'ou créez-en une'}</span></span>
            <span class="chevron" aria-hidden="true">${svg['caret-right']}</span>
          </button>
          <p class="erreur-champ" id="f-categorie-erreur">${erreurs.categorie ? `${ic('warning-circle')}${erreurs.categorie}` : ''}</p>
        </div>
        <div class="ligne-reglage ligne-seule">
          <span>Quantité<small>pour tout le voyage</small></span>
          ${compteur('quantite', b.quantite, 'Quantité', { saisie: true })}
        </div>`;
    if (focus) zone.querySelector(`[data-f="${focus}"]`)?.focus({ preventScroll: true });
    ombrer();
  };
  const garde = async () =>
    ajoute ||
    JSON.stringify(b) === depart ||
    confirmer({ titre: 'Abandonner cet objet ?', texte: 'Il ne sera pas ajouté au voyage.', annuler: 'Continuer la saisie', action: 'Abandonner' });
  const { fermer } = ouvrir(d, { garde });
  const ombrer = suivrePied(d);
  d.addEventListener('input', e => {
    const f = e.target.dataset.f;
    if (f === 'nom') {
      b.nom = e.target.value;
      if (erreurs.nom && b.nom.trim()) {
        delete erreurs.nom;
        peindre();
      }
    } else if (f === 'quantite') {
      const chiffres = e.target.value.replace(/\D/g, '').slice(0, 3);
      e.target.value = chiffres;
      b.quantite = chiffres === '' ? '' : Math.max(1, Number(chiffres));
    }
  });
  d.addEventListener('focusout', e => {
    if (e.target.dataset.f === 'quantite' && b.quantite === '') {
      b.quantite = 1;
      peindre();
    }
  });
  d.addEventListener('click', async e => {
    const el = e.target.closest('[data-f]');
    if (!el || el.getAttribute('aria-disabled') === 'true') return;
    const f = el.dataset.f;
    if (f === 'quantite-moins' || f === 'quantite-plus') {
      b.quantite = Math.min(MAX, Math.max(1, (Number(b.quantite) || 1) + (f === 'quantite-plus' ? 1 : -1)));
    } else if (f === 'categorie') {
      const choix = await choisirCategorie({
        titre: 'Catégorie de l’objet',
        liste: categories.map(c => ({ ...c, sous: `${c.objets.length} objet${c.objets.length > 1 ? 's' : ''}` })),
        choisie: b.categorie?.nouvelle ? null : b.categorie,
        nouvelle: 'Pour ce voyage seulement',
      });
      if (choix === 'nouvelle') {
        const nouvelle = await ficheNouvelleCategorie(b.categorie?.nouvelle);
        if (nouvelle) b.categorie = { nouvelle };
      } else if (choix) b.categorie = choix;
      if (choix) delete erreurs.categorie;
      peindre();
      zone.querySelector('[data-f="categorie"]').focus();
      return;
    } else if (f === 'ajouter') {
      if (!b.nom.trim()) erreurs.nom = 'Donnez un nom à cet objet.';
      if (!retenue()) erreurs.categorie = 'Choisissez une catégorie, ou créez-en une.';
      if (Object.keys(erreurs).length) {
        peindre();
        return zone.querySelector('[aria-invalid="true"]')?.focus();
      }
      if (panne()) return alerte('L’objet n’a pas pu être ajouté. Votre saisie est gardée ; réessayez.');
      ajoute = true;
      await fermer();
      ajouter({ nom: b.nom.trim(), quantite: Number(b.quantite) || 1, categorie: b.categorie });
      return;
    } else return;
    peindre();
  });
  peindre();
  return {
    d,
    remplir(nom, quantite, categorie) {
      Object.assign(b, { nom, quantite, ...(categorie ? { categorie } : {}) });
      peindre();
    },
  };
}

// ---------- « Renommer » ----------
// Une fiche à un champ, comme celles des étiquettes ; rend le nouveau nom, ou null.
export function ficheRenommer(objet) {
  return new Promise(resoudre => {
    let valeur = objet.nom;
    let reponse = null;
    const d = document.createElement('dialog');
    d.className = 'fenetre fiche fiche-modele fiche-nom';
    d.setAttribute('aria-labelledby', 'fiche-titre');
    d.innerHTML = `
      <header class="fenetre-entete">
        <h2 id="fiche-titre" tabindex="-1">Renommer l’objet</h2>
        ${croix()}
      </header>
      <div class="fiche-corps">
        <p class="fiche-regle">Dans ce voyage seulement : la bibliothèque ne change pas.</p>
        ${champNom(valeur, '')}
      </div>
      <div class="fenetre-pied">
        <button type="button" class="bouton bouton-secondaire" data-fermer>Annuler</button>
        <button type="button" class="bouton bouton-principal" data-f="enregistrer">Enregistrer</button>
      </div>`;
    const champ = d.querySelector('#f-nom');
    const message = d.querySelector('#f-nom-erreur');
    const garde = async () =>
      reponse !== null ||
      valeur === objet.nom ||
      confirmer({ titre: 'Abandonner les modifications ?', texte: `« ${echapper(objet.nom)} » garde son nom.`, annuler: 'Continuer la saisie', action: 'Abandonner' });
    const { fermer } = ouvrir(d, { garde, surFermeture: () => resoudre(reponse) });
    suivrePied(d);
    champ.addEventListener('input', () => {
      valeur = champ.value;
      if (valeur.trim()) {
        champ.setAttribute('aria-invalid', 'false');
        message.innerHTML = '';
      }
    });
    champ.addEventListener('keydown', e => {
      if (e.key === 'Enter') d.querySelector('[data-f="enregistrer"]').click();
    });
    d.querySelector('[data-f="enregistrer"]').addEventListener('click', () => {
      if (!valeur.trim()) {
        champ.setAttribute('aria-invalid', 'true');
        message.innerHTML = `${ic('warning-circle')}Donnez un nom à cet objet.`;
        return champ.focus();
      }
      reponse = valeur.trim();
      fermer();
    });
    champ.select();
  });
}
