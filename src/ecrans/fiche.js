// La fiche d'un objet du voyage (docs/PRD.md, US-15, US-16 ; maquette docs/maquettes/voyage/, état
// « fiche ») : ce qui est dans le sac, réglé pièce par pièce, d'un coup ou vidé, et la note de
// l'objet. Au téléphone, elle monte du bas de l'écran ; ailleurs, c'est une fenêtre centrée
// (src/styles/fiche.css). Elle ne garde rien elle-même : chaque changement repart vers l'écran du
// voyage (surChangement), qui l'enregistre comme une coche et la repeint.
import { remplir } from '../i18n/traduction.js';
import { bornerDansLeSac, estComplet, viderDemandeConfirmation } from '../modele/sac.js';
import { confirmer, ouvrirFenetre, vueFenetre } from './fenetre.js';
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

// Le compteur et les boutons sont dessinés sans leur état : repeindre() le pose, à l'ouverture comme
// à chaque changement, sans remplacer les boutons (le focus reste sur celui qu'on vient d'appuyer).
function vueFiche(t, objet, categorie) {
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
    titre: echapper(objet.nom),
    contenu: `
      <div class="fiche-corps">
        <p class="fiche-regle">${echapper(remplir(t('fiche.regle'), { categorie: categorie.nom, regle: decrireRegle(t, objet) }))}</p>
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
      </div>`,
  });
}

// Le nombre de pièces que donne chaque bouton, et quand il est désactivé : − et « Vider » à 0, + et
// « Tout dans le sac » au complet.
const BOUTONS = {
  moins: { valeur: objet => bornerDansLeSac(objet, objet.dansLeSac - 1), inactif: objet => objet.dansLeSac === 0 },
  plus: { valeur: objet => bornerDansLeSac(objet, objet.dansLeSac + 1), inactif: estComplet },
  tout: { valeur: objet => objet.quantite, inactif: estComplet },
  vider: { valeur: () => 0, inactif: objet => objet.dansLeSac === 0 },
};

// Ouvre la fiche dans dans (l'écran du voyage, pour qu'elle parte avec lui). surChangement(valeur) :
// le nouveau nombre de pièces dans le sac ; surFermeture : la fiche effacée ; signal : l'écran s'en
// va, la fiche disparaît avec lui. Rend repeindre(objet), que l'écran appelle à chaque changement ;
// un objet qui n'existe plus (relu après une panne) ferme la fiche.
export function ouvrirFiche({ t, objet, categorie, surChangement, surFermeture, signal, dans }) {
  const gabarit = document.createElement('template');
  gabarit.innerHTML = vueFiche(t, objet, categorie);
  const fenetre = gabarit.content.firstElementChild;
  fenetre.classList.add('fiche');
  let actuel = objet;
  let fermer = null;

  function repeindre(nouveau) {
    if (!nouveau) return fermer?.();
    actuel = nouveau;
    fenetre.querySelector('output').textContent = actuel.dansLeSac;
    fenetre.querySelector('.compteur-total').textContent = remplir(t('fiche.sur'), { total: actuel.quantite });
    for (const bouton of fenetre.querySelectorAll('[data-fiche]'))
      bouton.setAttribute('aria-disabled', String(BOUTONS[bouton.dataset.fiche].inactif(actuel)));
  }

  fenetre.addEventListener('click', async evenement => {
    const bouton = evenement.target.closest('[data-fiche]');
    if (!bouton || bouton.getAttribute('aria-disabled') === 'true') return;
    const quoi = bouton.dataset.fiche;
    if (quoi === 'vider' && viderDemandeConfirmation(actuel)) {
      const accord = await confirmerVider({ t, objet: actuel, signal });
      if (!fenetre.isConnected) return;
      bouton.focus();
      if (!accord) return;
    }
    surChangement(BOUTONS[quoi].valeur(actuel));
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
  fenetre.querySelector('h2').focus();
  return repeindre;
}
