// La fiche d'achat d'un objet de l'écran Courses (maquette validée le 2026-10-29, docs/maquettes/courses/,
// état « fiche-achat ») : les pièces achetées, réglées une à une ou d'un coup, puis, sous un trait,
// l'interrupteur « À acheter », pour retirer en magasin ce qu'on a finalement déjà. Elle a l'allure de la
// fiche de l'objet du voyage (src/ecrans/fiche.js) : panneau du bas au téléphone, fenêtre centrée
// ailleurs. Tout acheter, ou éteindre l'interrupteur, la ferme : l'objet quitte alors les Courses. Elle ne
// garde rien elle-même : chaque geste repart vers l'écran, qui l'enregistre et la repeint.
import { remplir } from '../i18n/traduction.js';
import { bornerAchetes } from '../modele/courses.js';
import { ouvrirFenetre, vueFenetre } from './fenetre.js';
import { iconeInterface } from './icones.js';

const vueFiche = t =>
  vueFenetre({
    t,
    idTitre: 'achat-titre',
    titre: '',
    contenu: `
      <div class="fiche-corps">
        <p class="fiche-regle"></p>
        <section class="fiche-bloc" aria-labelledby="achat-achete">
          <h3 id="achat-achete">${t('achat.titre')}</h3>
          <div class="compteur">
            <button type="button" class="bouton-icone" data-achat="moins" aria-label="${t('achat.moins')}">${iconeInterface('moins')}</button>
            <output aria-live="polite"></output>
            <button type="button" class="bouton-icone" data-achat="plus" aria-label="${t('achat.plus')}">${iconeInterface('plus')}</button>
            <span class="compteur-total"></span>
          </div>
          <div class="fiche-actions">
            <button type="button" class="bouton bouton-principal" data-achat="tout">${iconeInterface('coche')}${t('achat.tout')}</button>
          </div>
        </section>
        <section class="fiche-bloc fiche-ajuster">
          <div class="ligne-reglage">
            <span>${t('fiche.aAcheter')}<small>${t('achat.aAcheterAide')}</small></span>
            <button type="button" class="interrupteur" role="switch" data-achat="a-acheter" aria-checked="true" aria-label="${t('fiche.aAcheter')}"></button>
          </div>
        </section>
      </div>`,
  });

// Les pièces achetées que donne chaque bouton.
const VOULU = {
  moins: objet => objet.achetes - 1,
  plus: objet => objet.achetes + 1,
  tout: objet => objet.quantite,
};

// Ouvre la fiche dans dans (l'écran Courses). surAchetes(n) : le nouveau nombre de pièces achetées ;
// surAAcheter() : l'interrupteur éteint ; surFermeture : la fiche effacée ; signal : l'écran s'en va, la
// fiche disparaît avec lui. Rend repeindre(objet), que l'écran appelle à chaque changement ; un objet
// qui n'existe plus ferme la fiche.
export function ouvrirFicheAchat({ t, objet, categorie, surAchetes, surAAcheter, surFermeture, signal, dans }) {
  const gabarit = document.createElement('template');
  gabarit.innerHTML = vueFiche(t);
  const fenetre = gabarit.content.firstElementChild;
  fenetre.classList.add('fiche', 'fiche-voyage', 'fiche-achat');
  const q = selecteur => fenetre.querySelector(selecteur);
  let actuel = objet;
  let fermer = null;
  // Une fois l'objet tout acheté ou retiré des Courses, la fiche se ferme et ne répond plus.
  let finie = false;

  function repeindre(nouveau) {
    if (!nouveau) return fermer?.();
    actuel = nouveau;
    q('h2').textContent = actuel.nom;
    q('.fiche-regle').textContent = categorie?.nom ?? '';
    q('.compteur output').textContent = actuel.achetes;
    q('.compteur-total').textContent = remplir(t('achat.sur'), { total: actuel.quantite });
    q('[data-achat="moins"]').setAttribute('aria-disabled', String(actuel.achetes === 0));
  }

  fenetre.addEventListener('click', evenement => {
    const bouton = evenement.target.closest('[data-achat]');
    if (!bouton || finie || bouton.getAttribute('aria-disabled') === 'true') return;
    const quoi = bouton.dataset.achat;
    if (quoi === 'a-acheter') {
      finie = true;
      surAAcheter();
      return fermer();
    }
    const achetes = bornerAchetes(actuel, VOULU[quoi](actuel));
    if (achetes >= actuel.quantite) finie = true;
    surAchetes(achetes);
    if (finie) fermer();
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
