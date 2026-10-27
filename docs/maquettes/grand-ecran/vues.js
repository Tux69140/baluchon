// Les morceaux de l'écran d'un voyage, dessinés avec les classes de l'appli (src/styles/voyage.css,
// pave.css) : le vocabulaire validé le 2026-10-24, plus la tuile compacte du repli (2026-10-27).
import { complet, faits } from './donnees.js';

const ICONES = {
  'identification-card': 'duotone',
  't-shirt': 'duotone',
  tooth: 'duotone',
  'fork-knife': 'duotone',
  tent: 'duotone',
  'battery-charging': 'duotone',
  'first-aid-kit': 'duotone',
  sneaker: 'duotone',
  'book-open': 'duotone',
  umbrella: 'duotone',
  car: 'duotone',
  check: 'bold',
  info: 'bold',
  'caret-down': 'bold',
  'caret-right': 'bold',
  'caret-left': 'bold',
  funnel: 'bold',
  tag: 'bold',
  list: 'bold',
  'arrows-down-up': 'bold',
  'pencil-simple': 'bold',
  plus: 'bold',
};
export const svg = {};
await Promise.all(
  Object.entries(ICONES).map(async ([nom, graisse]) => {
    const r = await fetch(`../../../node_modules/@phosphor-icons/core/assets/${graisse}/${nom}-${graisse}.svg`);
    svg[nom] = await r.text();
  }),
);
export const ic = nom => `<span class="icone" aria-hidden="true">${svg[nom]}</span>`;
const MASCOTTE = '../../../src/images/baluchon.svg';

export function jauge(fait, total, mini = false) {
  const pc = total ? Math.round((100 * fait) / total) : 0;
  return `<span class="jauge${mini ? ' jauge-mini' : ''}"${fait === total && total ? ' data-fini' : ''}><i style="width: ${pc}%"></i></span>`;
}

export const pave = c => `<span class="pave" data-couleur="${c.couleur}" aria-hidden="true">${svg[c.icone]}</span>`;

export function compteOuTampon(c, ui) {
  if (ui.bouclees.has(c.id)) return '<span class="tampon">Bouclé !</span>';
  return `<span class="compte">${faits(c)} / ${c.objets.length}</span>`;
}

// retour : false quand le lien « Mes voyages » est posé à part (tablette et ordinateur).
export function entete(voyage, { retour = true } = {}) {
  const puces = voyage.etiquettes.map(e => `<li>${ic('tag')}${e}</li>`).join('');
  return `${retour ? lienRetour() : ''}
      <h1>${voyage.nom}</h1>
      <div class="voyage-entete">
        <p>${voyage.destination}</p>
        <p class="voyage-details">${voyage.details}</p>
        <ul class="etiquettes-voyage" aria-label="Étiquettes du voyage">${puces}</ul>
      </div>`;
}

export const lienRetour = () => `
      <a class="lien-retour" href="#">${ic('caret-left')}Mes voyages</a>`;

export function progression(tous, sacBoucle) {
  const t = tous.length;
  const f = tous.filter(complet).length;
  if (sacBoucle)
    return `
      <div class="progression" data-boucle role="status">
        <img src="${MASCOTTE}" alt="" width="56" height="56" />
        <div class="progression-texte">
          <span class="progression-titre">Sac bouclé !</span>
          <span class="progression-ligne"><span>Tout est dans le sac</span><b>${f} / ${t}</b></span>
          ${jauge(f, t)}
        </div>
      </div>`;
  return `
      <div class="progression">
        <div class="progression-texte">
          <span class="progression-ligne"><span>Dans le sac</span><b>${f} / ${t}</b></span>
          ${jauge(f, t)}
        </div>
      </div>`;
}

export function outils(ui) {
  const m = ui.masques.size;
  const masques = ui.filtre && m ? `${m} objet${m > 1 ? 's' : ''} dans le sac, masqué${m > 1 ? 's' : ''}` : '';
  return `
      <div class="outils">
        <button type="button" class="puce" data-action="filtre" aria-pressed="${ui.filtre}">${ic('funnel')}Reste à emballer</button>
      </div>${masques ? `\n      <p class="masques">${masques}</p>` : ''}`;
}

function etatObjet(x) {
  if (complet(x)) return 'plein';
  return x.dansLeSac > 0 ? 'entame' : 'vide';
}

export function ligne(x) {
  const etat = etatObjet(x);
  const quantite = etat === 'entame' ? `${x.dansLeSac}<small> / ${x.quantite}</small>` : `${x.quantite}`;
  const libelle = complet(x)
    ? `${x.nom} : dans le sac. ${x.quantite > 1 ? 'Vider' : 'Décocher'}`
    : x.quantite === 1
      ? `${x.nom} : pas encore dans le sac. Cocher`
      : `${x.nom} : ${x.dansLeSac} sur ${x.quantite} dans le sac. Ajouter une pièce`;
  return `
          <li class="objet" data-etat="${etat}">
            <button type="button" class="case" data-action="case" data-id="${x.id}" aria-label="${libelle}">
              <span class="case-boite" aria-hidden="true">${etat === 'plein' ? svg.check : ''}</span>
            </button>
            <button type="button" class="objet-corps">
              <span class="objet-texte"><span class="objet-nom">${x.nom}</span>${x.partage ? '<span class="objet-sous"><span>partagé</span></span>' : ''}</span>
              <span class="objet-quantite">${quantite}</span>
              <span class="objet-note">${x.note ? svg.info : ''}</span>
            </button>
          </li>`;
}

export const visibles = (c, ui) => ui.ordre.get(c.id).filter(x => !ui.masques.has(x.id));

// Les lignes visibles d'une catégorie, ou la phrase qui dit que le filtre les masque toutes.
export function lignes(c, ui) {
  if (!visibles(c, ui).length) {
    const nb = c.objets.length;
    return `<p class="ligne-info">Catégorie bouclée : ${nb > 1 ? `ses ${nb} objets sont` : 'son objet est'} dans le sac, masqué${nb > 1 ? 's' : ''} par le filtre.</p>`;
  }
  return `<ul class="objets">${visibles(c, ui).map(ligne).join('')}
        </ul>`;
}

// La carte en accordéon de l'écran en une colonne (téléphone seulement).
export function carte(c, ui) {
  const ouverte = ui.ouvertes.has(c.id);
  return `
      <section class="categorie" id="cat-${c.id}"${ui.filtre && ui.bouclees.has(c.id) ? ' data-attenuee' : ''}>
        <h2 class="categorie-titre">
          <button type="button" class="categorie-tete" data-action="accordeon" data-id="${c.id}" aria-expanded="${ouverte}">
            ${pave(c)}
            <span class="categorie-nom"><b>${c.nom}</b>${jauge(faits(c), c.objets.length, true)}</span>
            ${compteOuTampon(c, ui)}
            <span class="chevron" aria-hidden="true">${svg['caret-down']}</span>
          </button>
        </h2>
        ${ouverte ? lignes(c, ui) : ''}
      </section>`;
}

// Le choix d'une catégorie dans la colonne du milieu (trois colonnes) : la choisie porte aria-current
// et sa flèche vers la liste.
export function choix(c, ui) {
  const attenuee = ui.filtre && ui.bouclees.has(c.id) ? ' data-attenuee' : '';
  return `
          <li>
            <button type="button" class="choix" data-action="choisir" data-id="${c.id}" aria-current="${ui.choisie === c.id}"${attenuee}>
              ${pave(c)}
              <span class="categorie-nom"><b>${c.nom}</b>${jauge(faits(c), c.objets.length, true)}</span>
              ${compteOuTampon(c, ui)}
              <span class="chevron" aria-hidden="true">${svg['caret-right']}</span>
            </button>
          </li>`;
}

// Une tuile compacte (repli) : pavé, nom, compte ou « Bouclé ! » en petit ; la choisie a le fond
// actif et le bord à l'encre, comme le choix des deux panneaux. infos : ce qui se lit sous le nom.
export function tuile(c, { choisie, attenuee = false, infos }) {
  return `
          <li>
            <button type="button" class="ge-tuile" data-action="choisir" data-id="${c.id}" aria-current="${choisie === c.id}"${attenuee ? ' data-attenuee' : ''}>
              ${pave(c)}
              <span class="ge-tuile-texte"><b>${c.nom}</b>${infos}</span>
            </button>
          </li>`;
}

export const infosVoyage = (c, ui) =>
  ui.bouclees.has(c.id)
    ? '<span class="ge-tuile-boucle">Bouclé !</span>'
    : `<span class="ge-tuile-compte">${faits(c)} / ${c.objets.length}</span>`;
