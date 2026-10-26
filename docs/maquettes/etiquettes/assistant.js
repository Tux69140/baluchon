// L'assistant « Nouveau voyage » quand les groupes sont nombreux (maquette, phase 6 ; décision du chef
// de projet, 2026-10-26). Seule la rangée d'étapes change : tant que les étapes tiennent, elle reste
// telle que validée en phase 4 ; sinon elle défile de côté, par étapes entières, l'étape en cours
// gardée au milieu, et un trait gris prolongé jusqu'au bord de la fenêtre (de l'écran au téléphone)
// montre de quel côté des étapes sont cachées. Le corps est réduit à l'étape d'un groupe.
import { ouvrir } from '../bibliotheque/outils.js';

const GROUPES_MINI = [
  ['Activités', ['Randonnée', 'Camping', 'Plage']],
  ['Climat', ['Chaud', 'Froid', 'Pluie']],
  ['Hébergement', ['Hôtel', 'Tente', 'Chez l’habitant']],
];
const GROUPES_NOMBREUX = [
  ...GROUPES_MINI.slice(0, 2),
  ['Transport', ['Voiture', 'Train', 'Avion', 'Vélo']],
  GROUPES_MINI[2],
  ['Saison', ['Printemps', 'Été', 'Automne', 'Hiver']],
  ['Compagnie', ['En couple', 'Avec les enfants', 'Avec le chien']],
  ['Repas', ['Cuisine sur place', 'Restaurant', 'Pique-nique']],
];

// Largeur d'une étape en dessous de laquelle la rangée défile : au téléphone, le rond seul (cible de
// 44 px et un bout de trait de chaque côté) ; ailleurs, le rond et son nom dessous.
const LARGEUR_MINI = { etroit: 52, large: 104 };
const etroit = matchMedia('(max-width: 599px)');

export function ouvrirAssistant({ app, etat, ic }) {
  const groupes = etat === 'assistant-mini' ? GROUPES_MINI : GROUPES_NOMBREUX;
  const etapes = ['Informations', ...groupes.map(([nom]) => nom), 'Aperçu'];
  const derniere = etapes.length - 1;
  let courante = { 'assistant-debut': 0, 'assistant-fin': derniere }[etat] ?? 3;
  const vues = new Set(etapes.map((_, i) => i).filter(i => etat === 'assistant-fin' || i <= Math.max(courante, 3)));
  const choisies = new Set(['Randonnée', 'Camping', 'Train']);
  const enFenetre = Math.min(screen.width, screen.height) >= 600;

  const rangee = () =>
    etapes
      .map((nom, i) => {
        const sienne = i === courante ? 'courante' : vues.has(i) || i === derniere ? 'ouverte' : 'fermee';
        const rond = i === derniere ? ic('list-checks') : i + 1;
        return `
          <li class="etape" data-etat="${sienne}">
            <button type="button" data-aller="${i}"${sienne === 'courante' ? ' aria-current="step"' : ''}${sienne === 'fermee' ? ' aria-disabled="true"' : ''}>
              <span class="etape-rond">${rond}</span><span class="etape-nom">${nom}</span>
            </button>
          </li>`;
      })
      .join('');

  const corps = () => {
    if (courante === 0)
      return `<div class="demo-vide"><p class="etape-titre">Informations</p><p class="etape-aide">Nom, destination, voyageurs et dates : inchangés.</p></div>`;
    if (courante === derniere)
      return `<div class="demo-vide"><p class="etape-titre">Aperçu</p><p class="etape-aide">La liste à décocher : inchangée.</p></div>`;
    const [nom, etiquettes] = groupes[courante - 1];
    const n = etiquettes.filter(e => choisies.has(e)).length;
    return `
          <section class="etape-groupe" aria-labelledby="titre-etape">
            <h3 class="etape-titre" id="titre-etape" tabindex="-1">${nom}</h3>
            <p class="etape-aide">Touchez les étiquettes qui décrivent ce voyage. Aucune n’est obligatoire.</p>
            <div class="puces-etiquettes" role="group" aria-labelledby="titre-etape">${etiquettes
              .map(
                e =>
                  `<button type="button" class="puce puce-etiquette" aria-pressed="${choisies.has(e)}" data-etiquette="${e}"><span class="puce-signe">${ic(choisies.has(e) ? 'check' : 'plus')}</span>${e}</button>`,
              )
              .join('')}</div>
            <p class="etape-compte">${n ? `${n} étiquette${n > 1 ? 's' : ''} choisie${n > 1 ? 's' : ''}` : 'Aucune étiquette choisie : ce groupe n’ajoute rien.'}</p>
          </section>`;
  };

  const pied = () => {
    const gauche = courante
      ? `<button type="button" class="bouton bouton-secondaire bouton-precedent" data-pas="-1" aria-label="Précédent">${ic('caret-left')}<span class="texte-large">Précédent</span></button>`
      : enFenetre
        ? '<button type="button" class="bouton bouton-secondaire" data-fermer>Annuler</button>'
        : '';
    const actions =
      courante === derniere
        ? '<button type="button" class="bouton bouton-principal">Créer le voyage</button>'
        : courante === derniere - 1
          ? `<button type="button" class="bouton bouton-principal" data-pas="1">Voir l’aperçu${ic('caret-right')}</button>`
          : `<button type="button" class="bouton bouton-secondaire" data-aller="${derniere}">Voir l’aperçu</button>
            <button type="button" class="bouton bouton-principal" data-pas="1">Suivant${ic('caret-right')}</button>`;
    return `<div class="pied-gauche">${gauche}</div><div class="formulaire-actions">${actions}</div>`;
  };

  const contenu = `
      <nav class="etapes" aria-label="Étapes">
        <div class="etapes-cadre">
          <span class="etapes-suite" data-cote="avant" aria-hidden="true"></span>
          <ol class="etapes-liste"></ol>
          <span class="etapes-suite" data-cote="apres" aria-hidden="true"></span>
        </div>
        <p class="etapes-legende"></p>
      </nav>
      <div class="formulaire-corps demo-corps"><div class="etape-panneau"></div></div>
      <div class="formulaire-pied assistant-pied"></div>`;

  let racine;
  if (enFenetre) {
    racine = document.createElement('dialog');
    racine.className = 'fenetre assistant demo-assistant';
    racine.setAttribute('aria-labelledby', 'titre-assistant');
    racine.innerHTML = `
      <header class="fenetre-entete">
        <h2 id="titre-assistant" tabindex="-1">Nouveau voyage</h2>
        <button type="button" class="bouton-icone bouton-fermer" data-fermer aria-label="Fermer">${ic('x')}</button>
      </header>${contenu}`;
    app.innerHTML = '<main class="ecran demo-derriere"><h1>Mes voyages</h1></main>';
    ouvrir(racine, { surFermeture: () => (location.href = '?etat=etiquettes') });
  } else {
    app.innerHTML = `
    <main class="ecran assistant assistant-plein demo-assistant">
      <div class="barre-haut"><a class="lien-retour" href="?etat=etiquettes">${ic('caret-left')}Mes voyages</a></div>
      <h1 tabindex="-1">Nouveau voyage</h1>${contenu}
    </main>`;
    racine = app.querySelector('main');
  }
  const liste = racine.querySelector('.etapes-liste');

  // Combien d'étapes entières tiennent ; si toutes ne tiennent pas, chacune prend la largeur d'une
  // part, et la liste défile d'une étape à l'autre.
  function mesurer() {
    const place = liste.clientWidth;
    const mini = etroit.matches ? LARGEUR_MINI.etroit : LARGEUR_MINI.large;
    const tiennent = Math.max(1, Math.floor(place / mini));
    const defile = etapes.length > tiennent;
    racine.querySelector('.etapes').toggleAttribute('data-defile', defile);
    liste.style.setProperty('--part', defile ? `${place / tiennent}px` : '');
    return { tiennent, defile, part: place / tiennent };
  }

  // L'étape en cours au milieu de ce qui se voit, sans dépasser les bords de la liste.
  function centrer(doux) {
    const { tiennent, defile, part } = mesurer();
    if (!defile) return suites();
    const premiere = Math.min(Math.max(0, courante - Math.floor((tiennent - 1) / 2)), etapes.length - tiennent);
    liste.scrollTo({ left: premiere * part, behavior: doux ? 'smooth' : 'instant' });
    suites();
  }

  // Le trait de chaque côté où des étapes sont cachées.
  function suites() {
    const avant = liste.scrollLeft > 1;
    const apres = liste.scrollLeft + liste.clientWidth < liste.scrollWidth - 1;
    racine.querySelector('[data-cote="avant"]').toggleAttribute('data-visible', avant);
    racine.querySelector('[data-cote="apres"]').toggleAttribute('data-visible', apres);
  }

  function dessiner(doux = false) {
    liste.innerHTML = rangee();
    racine.querySelector('.etapes-legende').textContent = `Étape ${courante + 1} sur ${etapes.length} · ${etapes[courante]}`;
    racine.querySelector('.etape-panneau').innerHTML = corps();
    racine.querySelector('.assistant-pied').innerHTML = pied();
    centrer(doux);
  }

  liste.addEventListener('scroll', suites, { passive: true });
  addEventListener('resize', () => centrer(false));
  racine.addEventListener('click', e => {
    const aller = e.target.closest('[data-aller]');
    const pas = e.target.closest('[data-pas]');
    const puce = e.target.closest('[data-etiquette]');
    if (aller && aller.getAttribute('aria-disabled') !== 'true') courante = Number(aller.dataset.aller);
    else if (pas) courante = Math.min(derniere, Math.max(0, courante + Number(pas.dataset.pas)));
    else if (puce) {
      const x = puce.dataset.etiquette;
      choisies.has(x) ? choisies.delete(x) : choisies.add(x);
    } else return;
    vues.add(courante);
    dessiner(!matchMedia('(prefers-reduced-motion: reduce)').matches);
  });
  dessiner();
}
