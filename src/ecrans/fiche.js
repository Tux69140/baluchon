// La fiche d'un objet du voyage (docs/PRD.md, US-15, US-16, US-18, US-21 ; maquettes docs/maquettes/voyage/,
// état « fiche », et docs/maquettes/ajuster/) : ce qui est dans le sac, réglé pièce par pièce, d'un coup
// ou vidé, la note de l'objet, puis, sous un trait, « Ajuster cet objet » (la quantité prévue, « Renommer »)
// et « Retirer du voyage » en rouge, au bas, comme « Supprimer » dans les fiches de la bibliothèque. La
// ligne du haut ne dit que la catégorie : le calcul de la quantité, ou « fixée manuellement », vit sous
// « Quantité prévue », pour ne jamais se lire deux fois. Au téléphone, elle monte du bas de l'écran ;
// ailleurs, c'est une fenêtre centrée (src/styles/fiche.css). Elle ne garde rien elle-même : chaque geste
// repart vers l'écran du voyage, qui l'enregistre et la repeint.
import { remplir } from '../i18n/traduction.js';
import { boutonsDeQuantite } from '../modele/ajustements.js';
import { bornerDansLeSac, estComplet, viderDemandeConfirmation } from '../modele/sac.js';
import { confirmer, ouvrirFenetre, vueFenetre } from './fenetre.js';
import { zoneSuppression } from './fiche-modele-vues.js';
import { decrireRegle } from './format.js';
import { echapper } from './html.js';
import { iconeInterface } from './icones.js';

// Vider plus d'une pièce se confirme, depuis la case comme depuis la fiche (décision du 2026-10-24).
export const confirmerVider = ({ t, objet, signal }) =>
  confirmer({
    t,
    titre: remplir(t('fiche.confirmerTitre'), { nom: objet.nom }),
    texte: remplir(t('fiche.confirmerTexte'), { n: objet.dansLeSac }),
    action: t('fiche.vider'),
    signal,
  });

// Le nom, la catégorie, les compteurs, le calcul et les boutons sont dessinés sans leur état : repeindre()
// le pose, à l'ouverture comme à chaque changement, sans remplacer les boutons (le focus reste sur celui
// qu'on vient d'appuyer).
function vueFiche(t, objet) {
  const note = objet.note
    ? `
        <section class="fiche-bloc" aria-labelledby="fiche-note">
          <h3 id="fiche-note">${t('fiche.note')}</h3>
          <p class="fiche-note">${iconeInterface('info')}<span>${echapper(objet.note)}</span></p>
        </section>`
    : '';
  return vueFenetre({
    t,
    idTitre: 'fiche-titre',
    titre: '',
    contenu: `
      <div class="fiche-corps">
        <p class="fiche-regle"></p>
        <section class="fiche-bloc" aria-labelledby="fiche-sac">
          <h3 id="fiche-sac">${t('fiche.dansLeSac')}</h3>
          <div class="compteur">
            <button type="button" class="bouton-icone" data-fiche="moins" aria-label="${t('fiche.moins')}">${iconeInterface('moins')}</button>
            <output aria-live="polite"></output>
            <button type="button" class="bouton-icone" data-fiche="plus" aria-label="${t('fiche.plus')}">${iconeInterface('plus')}</button>
            <span class="compteur-total"></span>
          </div>
          <div class="fiche-actions">
            <button type="button" class="bouton bouton-principal" data-fiche="tout">${iconeInterface('coche')}${t('fiche.tout')}</button>
            <button type="button" class="bouton bouton-secondaire" data-fiche="vider">${t('fiche.vider')}</button>
          </div>
        </section>${note}
        <section class="fiche-bloc fiche-ajuster" aria-labelledby="fiche-ajuster">
          <h3 id="fiche-ajuster">${t('fiche.ajuster')}</h3>
          <div class="ligne-reglage">
            <span>${t('fiche.quantitePrevue')}<small data-calcul></small></span>
            <span class="compteur">
              <button type="button" class="bouton-icone" data-fiche="quantite-moins" aria-label="${t('fiche.quantiteMoins')}">${iconeInterface('moins')}</button>
              <output aria-live="polite" aria-label="${t('fiche.quantitePrevue')}"></output>
              <button type="button" class="bouton-icone" data-fiche="quantite-plus" aria-label="${t('fiche.quantitePlus')}">${iconeInterface('plus')}</button>
            </span>
          </div>
          <div class="fiche-actions">
            <button type="button" class="bouton bouton-secondaire" data-fiche="renommer">${iconeInterface('modifier')}${t('fiche.renommer')}</button>
          </div>
        </section>${zoneSuppression(t('fiche.retirer'))}
      </div>`,
  });
}

// Le nombre de pièces dans le sac que donne chaque bouton du sac : − et « Vider » inactifs à 0, + et
// « Tout dans le sac » au complet.
const SAC = {
  moins: { valeur: objet => bornerDansLeSac(objet, objet.dansLeSac - 1), inactif: objet => objet.dansLeSac === 0 },
  plus: { valeur: objet => bornerDansLeSac(objet, objet.dansLeSac + 1), inactif: estComplet },
  tout: { valeur: objet => objet.quantite, inactif: estComplet },
  vider: { valeur: () => 0, inactif: objet => objet.dansLeSac === 0 },
};
// La quantité prévue : un de moins, un de plus, dans les bornes du modèle (boutonsDeQuantite).
const QUANTITE = {
  'quantite-moins': { pas: -1, inactif: objet => !boutonsDeQuantite(objet).moins },
  'quantite-plus': { pas: 1, inactif: objet => !boutonsDeQuantite(objet).plus },
};
const inactif = (quoi, objet) => (SAC[quoi] ?? QUANTITE[quoi])?.inactif(objet) ?? false;

// Ouvre la fiche dans dans (l'écran du voyage, pour qu'elle parte avec lui). surChangement(valeur) : le
// nouveau nombre de pièces dans le sac ; surQuantite(n) : la quantité prévue voulue ; surRenommer() ;
// surRetirer() : rend une promesse, tenue quand la question et l'écriture sont finies (d'ici là, « Retirer
// du voyage » ne répond plus) ; surFermeture : la fiche effacée ; signal : l'écran s'en va, la fiche
// disparaît avec lui. Rend repeindre(objet, categorie), que l'écran appelle à chaque changement ; un objet
// qui n'existe plus (relu après une panne, retiré) ferme la fiche.
export function ouvrirFiche({
  t,
  objet,
  categorie,
  surChangement,
  surQuantite,
  surRenommer,
  surRetirer,
  surFermeture,
  signal,
  dans,
}) {
  const gabarit = document.createElement('template');
  gabarit.innerHTML = vueFiche(t, objet);
  const fenetre = gabarit.content.firstElementChild;
  fenetre.classList.add('fiche', 'fiche-voyage');
  const q = selecteur => fenetre.querySelector(selecteur);
  let actuel = objet;
  let fermer = null;

  function repeindre(nouveau, sienne = categorie) {
    if (!nouveau) return fermer?.();
    actuel = nouveau;
    q('h2').textContent = actuel.nom;
    q('.fiche-regle').textContent = sienne?.nom ?? '';
    q('.compteur output').textContent = actuel.dansLeSac;
    q('.compteur-total').textContent = remplir(t('fiche.sur'), { total: actuel.quantite });
    q('.fiche-ajuster output').textContent = actuel.quantite;
    q('[data-calcul]').textContent = actuel.quantiteManuelle
      ? t('fiche.fixeeManuellement')
      : remplir(t('fiche.calculee'), { regle: decrireRegle(t, actuel) });
    for (const bouton of fenetre.querySelectorAll('[data-fiche]'))
      bouton.setAttribute('aria-disabled', String(inactif(bouton.dataset.fiche, actuel)));
  }

  // « Retirer du voyage » : inactif jusqu'à la fin de la question et de l'écriture (un double appui ne
  // retire qu'une fois), et aucun autre geste de la fiche ne compte d'ici là (une pièce de plus viserait
  // un objet retiré) ; retiré, la fiche se ferme d'elle-même (repeindre).
  let retrait = false;
  async function retirer(bouton) {
    retrait = true;
    bouton.setAttribute('aria-disabled', 'true');
    try {
      await surRetirer();
    } finally {
      retrait = false;
      bouton.removeAttribute('aria-disabled');
    }
  }

  fenetre.addEventListener('click', async evenement => {
    const bouton = evenement.target.closest('[data-fiche], [data-supprimer]');
    if (!bouton || retrait || bouton.getAttribute('aria-disabled') === 'true') return;
    if ('supprimer' in bouton.dataset) return retirer(bouton);
    const quoi = bouton.dataset.fiche;
    if (quoi === 'renommer') return surRenommer();
    if (QUANTITE[quoi]) return surQuantite(actuel.quantite + QUANTITE[quoi].pas);
    if (quoi === 'vider' && viderDemandeConfirmation(actuel)) {
      const accord = await confirmerVider({ t, objet: actuel, signal });
      if (!fenetre.isConnected) return;
      bouton.focus();
      if (!accord) return;
    }
    surChangement(SAC[quoi].valeur(actuel));
  });

  repeindre(objet);
  dans.append(fenetre);
  const effacer = () => fenetre.remove();
  signal.addEventListener('abort', effacer, { once: true });
  fermer = ouvrirFenetre(fenetre, {
    fermerSurVoile: true,
    fermerAuRetour: true,
    surFermeture: () => {
      signal.removeEventListener('abort', effacer);
      effacer();
      surFermeture();
    },
  });
  // Le titre prend le focus : le lecteur d'écran dit d'abord de quel objet il s'agit.
  q('h2').focus();
  return repeindre;
}
