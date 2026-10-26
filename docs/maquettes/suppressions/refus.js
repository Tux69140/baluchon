// La fenêtre de refus (maquette de la phase 7, décisions du chef de projet du 2026-10-26) : elle liste
// les catégories et les objets qui n'auraient plus aucune étiquette ; un appui ouvre leur fiche, par-dessus,
// et l'on revient à la liste, d'où l'élément réglé disparaît. Quand elle est vide, la fenêtre devient
// la question chiffrée : « Plus rien ne bloque ».
import { echapper, ic, ouvrir, pave, svg } from '../bibliotheque/outils.js';
import { pluriel, question, refus, typo } from './textes.js';

// cible, nom : ce que l'on veut supprimer ; calculer() : ses conséquences, relues après chaque fiche ;
// ouvrirFiche(element) : ouvre la fiche et rend la fenêtre <dialog> ; supprimer() : la suppression.
// Rend une promesse : true une fois la suppression faite, false si l'on ferme sans supprimer.
export function ouvrirRefus({ cible, nom, calculer, ouvrirFiche, supprimer }) {
  return new Promise(resoudre => {
    const d = document.createElement('dialog');
    d.className = 'fenetre fiche refus';
    d.setAttribute('aria-labelledby', 'refus-titre');
    let fait = false;
    let annonce = '';
    let avant = null;

    const ligne = (element, i, type) => {
      const c = type === 'categorie' ? element : element.categorie;
      const detail = typo(type === 'categorie' ? `Catégorie · ${pluriel(c.objets.length, 'objet')}` : `Objet · dans « ${echapper(c.nom)} »`);
      return `
          <li data-cle="${type}-${element.id}">
            <button type="button" class="refus-ligne" data-i="${i}">
              ${pave(c.icone, c.couleur)}
              <span class="refus-texte"><b>${echapper(element.nom)}</b><span>${detail}</span></span>
              <span class="chevron" aria-hidden="true">${svg['caret-right']}</span>
            </button>
          </li>`;
    };

    function peindre() {
      const csq = calculer();
      const elements = [
        ...csq.bloquent.categories.map(x => [x, 'categorie']),
        ...csq.bloquent.objets.map(x => [x, 'objet']),
      ];
      // Un élément réglé quitte la liste : on le dit à la lecture d'écran.
      if (avant) {
        const partis = avant.filter(([x, t]) => !elements.some(([y, u]) => y.id === x.id && u === t));
        if (partis.length)
          annonce = elements.length
            ? `${partis.map(([x]) => x.nom).join(', ')} : réglé. Il en reste ${elements.length}.`
            : 'Tout est réglé.';
      }
      avant = elements;
      if (!elements.length) {
        const q = question(cible, nom, csq);
        d.setAttribute('role', 'alertdialog');
        d.innerHTML = `
      <header class="fenetre-entete">
        <h2 id="refus-titre" tabindex="-1">${q.titre}</h2>
      </header>
      <div class="fiche-corps">
        <p class="message message-succes refus-libre">${ic('check')}<span>${typo(`Plus rien ne bloque : vous pouvez supprimer « ${echapper(nom)} ».`)}</span></p>
        <p id="refus-texte">${q.texte}</p>
        <p class="lecteur" aria-live="polite">${annonce}</p>
      </div>
      <div class="fenetre-pied">
        <button type="button" class="bouton bouton-secondaire" data-fermer>Garder</button>
        <button type="button" class="bouton bouton-danger" data-oui>${ic('trash')}Supprimer</button>
      </div>`;
        d.setAttribute('aria-describedby', 'refus-texte');
        if (d.open) d.querySelector('h2').focus();
        return;
      }
      const r = refus(cible, nom, csq);
      d.innerHTML = `
      <header class="fenetre-entete">
        <h2 id="refus-titre" tabindex="-1">${r.titre}</h2>
        <button type="button" class="bouton-icone bouton-fermer" data-fermer aria-label="Fermer">${ic('x')}</button>
      </header>
      <div class="fiche-corps">
        <p class="refus-explication">${r.texte}</p>
        <h3 class="refus-reste">${r.reste}</h3>
        <ul class="refus-liste">${elements.map(([x, t], i) => ligne(x, i, t)).join('')}
        </ul>
        <p class="lecteur" aria-live="polite">${annonce}</p>
      </div>
      <div class="fenetre-pied">
        <button type="button" class="bouton bouton-secondaire" data-fermer>Fermer</button>
      </div>`;
      d._elements = elements;
      ombrer();
    }

    // Ombre sur le pied tant qu'il reste à défiler, comme les fiches : la liste continue dessous.
    function ombrer() {
      const zone = d.querySelector('.fiche-corps');
      zone.addEventListener('scroll', ombrer, { once: true });
      d.querySelector('.fenetre-pied').toggleAttribute('data-ombre', zone.scrollTop + zone.clientHeight < zone.scrollHeight - 2);
    }

    d.addEventListener('click', e => {
      const b = e.target.closest('[data-i]');
      if (b) {
        const [element, type] = d._elements[Number(b.dataset.i)];
        const fiche = ouvrirFiche(element, type);
        // De retour de la fiche (enregistrée, supprimée ou fermée) : la liste est relue.
        fiche.addEventListener('close', () => {
          peindre();
          (d.querySelector(`[data-cle="${type}-${element.id}"] button`) ?? d.querySelector('.refus-ligne, [data-oui]'))?.focus();
        });
        return;
      }
      if (e.target.closest('[data-oui]')) {
        // fait d'abord : la liste ne se relit plus, l'étiquette n'existe plus.
        fait = true;
        supprimer();
        fermer();
      }
    });
    // « Annuler » sur le bandeau pendant que la fenêtre est ouverte : l'élément revient dans la liste.
    document.addEventListener('biblio-changee', () => d.isConnected && !fait && peindre());
    peindre();
    const { fermer } = ouvrir(d, { surFermeture: () => resoudre(fait) });
    ombrer();
  });
}
