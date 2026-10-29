// Les pièces à sortir du sac (phase 10) : le « ! » à la place de la coche, la pastille « N à sortir du
// sac » (icône et mot, jamais la couleur seule), le « ! » de la catégorie, et les trois questions qui
// proposent « C'est fait » ou « Plus tard ». Posé par-dessus le vrai dessin de l'écran du voyage
// (src/ecrans/voyage-vues.js), qui ne connaît pas encore cet état.
import { remplir } from '../../../src/i18n/traduction.js';
import { vueEcartes } from '../../../src/ecrans/assistant-vues.js';
import { demander } from '../../../src/ecrans/fenetre.js';
import { pluriel } from '../../../src/ecrans/format.js';
import { echapper } from '../../../src/ecrans/html.js';
import plateau from '@phosphor-icons/core/bold/tray-arrow-up-bold.svg?raw';
import { aSortir, estRetire } from './donnees.js';

const icPlateau = `<span class="icone" aria-hidden="true">${plateau}</span>`;
const pieces = n => `${n} pièce${n > 1 ? 's' : ''}`;

export const pastilleSortir = n => `<span class="pastille-sortir">${icPlateau}${n} à sortir du sac</span>`;

// Le « ! » d'une catégorie (carte, choix, tuile) : un repère ; son nom dit ce qu'il signale.
const marque = n =>
  `<span class="marque-sortir" role="img" aria-label="${n} objet${n > 1 ? 's' : ''} avec des pièces à sortir du sac">!</span>`;

export function decorerVoyage(app, objets) {
  const parCategorie = new Map();
  for (const li of app.querySelectorAll('li.objet[data-id]')) {
    const x = objets.find(o => o.id === li.dataset.id);
    const n = x ? aSortir(x) : 0;
    if (!n) continue;
    li.dataset.sortir = '';
    if (estRetire(x)) li.dataset.retire = '';
    const caseObjet = li.querySelector('.case');
    caseObjet.querySelector('.case-boite').innerHTML = '<span class="signe-sortir">!</span>';
    caseObjet.setAttribute('aria-label', `${x.nom} : ${pieces(n)} à sortir du sac. En sortir une`);
    const texte = li.querySelector('.objet-texte');
    let sous = texte.querySelector('.objet-sous');
    if (!sous) {
      texte.insertAdjacentHTML('beforeend', '<span class="objet-sous"></span>');
      sous = texte.querySelector('.objet-sous');
    }
    if (estRetire(x)) sous.insertAdjacentHTML('afterbegin', '<span>retiré du voyage</span>');
    sous.insertAdjacentHTML('beforeend', pastilleSortir(n));
    if (estRetire(x)) li.querySelector('.objet-quantite').textContent = '';
    const etat = estRetire(x) ? ', retiré du voyage' : `, ${x.quantite} prévu${x.quantite > 1 ? 's' : ''}`;
    li.querySelector('.objet-corps').setAttribute(
      'aria-label',
      `${x.nom}${etat}, ${n} à sortir du sac. Ouvrir la fiche`,
    );
  }
  for (const x of objets) if (aSortir(x)) parCategorie.set(x.categorieId, (parCategorie.get(x.categorieId) ?? 0) + 1);
  for (const [id, n] of parCategorie) {
    const cible = CSS.escape(id);
    for (const compte of app.querySelectorAll(
      `.categorie[data-id="${cible}"] .categorie-tete .compte, .choix[data-id="${cible}"] .compte`,
    ))
      compte.insertAdjacentHTML('beforebegin', marque(n));
    const tuile = app.querySelector(`.gf-tuile[data-id="${cible}"] .gf-tuile-compte`);
    if (tuile) tuile.outerHTML = `<span class="tuile-sortir">${marque(n)}${tuile.outerHTML}</span>`;
  }
}

// ---------- La fiche ----------
// Le rappel en tête de « Dans le sac », et « C'est fait » à la place de « Tout dans le sac » (qui ne
// servirait à rien) ; pour un objet retiré, « Le garder dans le voyage », et plus rien à ajuster.
export function decorerFiche(fenetre, x, { raison = '' } = {}) {
  fenetre.querySelector('.sortir-rappel')?.remove();
  fenetre.querySelector('[data-maquette="fait"]')?.remove();
  fenetre.querySelector('[data-maquette="garder"]')?.remove();
  const n = aSortir(x);
  const retire = estRetire(x);
  fenetre.toggleAttribute('data-sortir', n > 0);
  fenetre.toggleAttribute('data-retire', retire);
  if (!n) return;
  const detail = retire
    ? `Retiré du voyage${raison ? ` : ${raison}` : ''}. Sortez-le du sac, puis touchez « C’est fait ».`
    : `${x.dansLeSac} dans le sac pour ${x.quantite} prévu${x.quantite > 1 ? 's' : ''}. Sortez-en ${n === 1 ? 'une' : n}, puis touchez « C’est fait ».`;
  fenetre
    .querySelector('#fiche-sac')
    .insertAdjacentHTML(
      'afterend',
      `<div class="sortir-rappel" role="status"><span class="marque-sortir" aria-hidden="true">!</span><p><b>${n} à sortir du sac</b><span>${detail}</span></p></div>`,
    );
  const actions = fenetre.querySelector('.fiche-bloc .fiche-actions');
  actions.insertAdjacentHTML(
    'afterbegin',
    `<button type="button" class="bouton bouton-principal" data-maquette="fait">C’est fait</button>${
      retire
        ? '<button type="button" class="bouton bouton-secondaire" data-maquette="garder">Le garder dans le voyage</button>'
        : ''
    }`,
  );
}

// ---------- Les questions ----------
// Après « Appliquer les changements » : une seule fenêtre pour tous les objets concernés, nommés avec
// leur nombre de pièces. Rend 'fait', 'plus-tard' ou null.
export function demanderSortie({ t, objets, categories, signal }) {
  const total = objets.reduce((s, x) => s + aSortir(x), 0);
  const lignes = objets.map(x => ({
    nom: x.nom,
    categorie: `${pieces(aSortir(x))} · ${estRetire(x) ? 'retiré du voyage' : categories.find(c => c.id === x.categorieId).nom}`,
  }));
  return demander({
    t,
    titre: `Sortir ${total === 1 ? 'une pièce' : `${total} pièces`} du sac ?`,
    texte: 'Ces pièces sont dans le sac, mais le voyage ne les prévoit plus. Sortez-les, puis touchez « C’est fait ».',
    contenu: vueEcartes(lignes),
    suite: ['« Plus tard » : elles restent signalées par un « ! » dans la liste, jusqu’à ce que vous les sortiez.'],
    signal,
    boutons: [
      { cle: 'plus-tard', libelle: 'Plus tard' },
      { cle: 'fait', libelle: 'C’est fait', principal: true },
    ],
  });
}

// La baisse à la main sous le nombre dans le sac (phase 8 alignée) : « Garder N » annule la baisse.
export function demanderBaisse({ t, langue, objet, quantite, signal }) {
  const sortent = objet.dansLeSac - quantite;
  return demander({
    t,
    titre: pluriel(t, 'ajustement.baisse.titre', sortent, langue),
    texteHtml: remplir(echapper(pluriel(t, 'ajustement.baisse.texte', sortent, langue)), {
      compte: `<b>${pieces(objet.dansLeSac)}</b>`,
      nom: echapper(objet.nom),
      quantite,
    }),
    suite: [
      `Sortez-${sortent === 1 ? 'la' : 'les'}, puis touchez « C’est fait ». « Plus tard » : ${sortent === 1 ? 'elle reste signalée' : 'elles restent signalées'} par un « ! » dans la liste.`,
    ],
    signal,
    boutons: [
      { cle: 'garder', libelle: remplir(t('ajustement.baisse.garder'), { n: objet.quantite }) },
      { cle: 'plus-tard', libelle: 'Plus tard' },
      { cle: 'fait', libelle: 'C’est fait', principal: true },
    ],
  });
}

// « Retirer du voyage » d'un objet emballé (phase 8 alignée) : « C'est fait », il part ; « Plus tard », il
// reste barré avec le « ! ».
export function demanderRetrait({ t, objet, signal }) {
  return demander({
    t,
    titre: remplir(t('ajustement.retrait.titre'), { nom: objet.nom }),
    texte: t('ajustement.retrait.bibliotheque'),
    idTexte: 'retrait-texte',
    suite: [
      `${objet.dansLeSac > 1 ? 'Ses' : 'Sa'} <b>${pieces(objet.dansLeSac)}</b> ${objet.dansLeSac > 1 ? 'sont' : 'est'} dans le sac : sortez-${objet.dansLeSac > 1 ? 'les' : 'la'}, puis touchez « C’est fait ». « Plus tard » : il reste barré dans la liste, avec un « ! », jusqu’à ce qu’elles soient sorties.`,
    ],
    signal,
    boutons: [
      { cle: 'garder', libelle: t('ajustement.retrait.garder') },
      { cle: 'plus-tard', libelle: 'Plus tard' },
      { cle: 'fait', libelle: 'C’est fait', danger: true },
    ],
  });
}
