// Le HTML de l'assistant « Nouveau voyage » (src/ecrans/nouveau-voyage.js), d'après la maquette validée
// le 2026-10-25 (docs/maquettes/assistant/) : rangée d'étapes, étape Informations, étape d'un groupe
// d'étiquettes, aperçu à décocher, pied. Rien que du dessin : l'état vient de src/ecrans/assistant.js,
// le contenu de l'aperçu du modèle (genererApercu).
import { remplir } from '../i18n/traduction.js';
import { joursEtNuits } from '../modele/periode.js';
import { etatCoche, etatEtape, idsDeCategorie, idsDeLApercu, raisonVide } from './assistant.js';
import { vueFenetre } from './fenetre.js';
import { decrireRegle, detailsVoyage, formaterJourCourt, pluriel } from './format.js';
import { echapper } from './html.js';
import { iconeInterface, paveCategorie } from './icones.js';
import { lienRetour } from './retour.js';
import mascotte from '../images/baluchon.svg';

export const ID_TITRE = 'titre-nouveau-voyage';

// Le résumé sous « Dates » : ce qu'il reste à toucher, puis la période en toutes lettres.
export function resumeDates({ depart, retour }, t, langue) {
  const jour = date => formaterJourCourt(date, langue);
  if (!depart) return t('nouveauVoyage.resume.vide');
  if (!retour) return remplir(t('nouveauVoyage.resume.depart'), { depart: jour(depart) });
  const { jours, nuits } = joursEtNuits(depart, retour);
  return remplir(t('nouveauVoyage.resume.periode'), {
    depart: jour(depart),
    retour: jour(retour),
    jours: pluriel(t, 'duree.jours', jours, langue),
    nuits: pluriel(t, 'duree.nuits', nuits, langue),
  });
}

// L'étape Informations : voyageurs avant les dates, pour rester visibles au téléphone (décision du
// chef de projet, 2026-10-25). Ses champs restent dans la page aux autres étapes : invisibles, ils
// gardent à la fenêtre la hauteur de cette étape (src/styles/assistant.css), et la saisie avec eux.
const vueInformations = t => `
          <div class="champ">
            <label for="nom">${t('nouveauVoyage.nom')}</label>
            <input id="nom" name="nom" type="text" autocomplete="off" aria-describedby="erreur-nom" />
            <p class="erreur-champ" id="erreur-nom" aria-live="polite"></p>
          </div>
          <div class="champ champ-sans-message">
            <label for="destination">${t('nouveauVoyage.destination')}</label>
            <input id="destination" name="destination" type="text" autocomplete="off" />
          </div>
          <fieldset class="champ champ-voyageurs">
            <legend>${t('nouveauVoyage.voyageurs')}</legend>
            <div class="compteur">
              <button type="button" class="bouton-icone" data-voyageurs="-1" aria-label="${t('nouveauVoyage.moinsVoyageurs')}">${iconeInterface('moins')}</button>
              <output class="compteur-valeur" aria-live="polite"></output>
              <button type="button" class="bouton-icone" data-voyageurs="1" aria-label="${t('nouveauVoyage.plusVoyageurs')}">${iconeInterface('plus')}</button>
            </div>
          </fieldset>
          <fieldset class="champ champ-dates" aria-describedby="resume-dates erreur-dates">
            <legend>${t('nouveauVoyage.dates')}</legend>
            <p class="resume-dates" id="resume-dates" aria-live="polite"></p>
            <div class="calendrier"></div>
            <p class="erreur-champ" id="erreur-dates" aria-live="polite"></p>
          </fieldset>`;

// La rangée d'étapes, le corps (Informations, et le panneau des autres étapes) et le pied. Sur
// tablette et ordinateur, dans une fenêtre modale par-dessus Mes voyages ; au téléphone, en écran
// plein avec le lien « Mes voyages » (décision du chef de projet, 2026-10-07).
export function vueAssistant(t, { enFenetre }) {
  const contenu = `
      <nav class="etapes" aria-label="${t('nouveauVoyage.etapes')}"></nav>
      <form class="formulaire" novalidate>
        <div class="formulaire-corps" data-etape="infos">${vueInformations(t)}
          <div class="etape-panneau"></div>
        </div>
        <div class="formulaire-pied assistant-pied"></div>
      </form>`;
  if (enFenetre) return vueFenetre({ t, idTitre: ID_TITRE, titre: t('nouveauVoyage.titre'), contenu });
  return `
    <main class="ecran assistant assistant-plein">
      ${lienRetour(t)}
      <h1 id="${ID_TITRE}" tabindex="-1">${t('nouveauVoyage.titre')}</h1>${contenu}
    </main>`;
}

const nomEtape = (t, etape) =>
  etape.type === 'groupe' ? echapper(etape.groupe.nom) : t(`nouveauVoyage.etape.${etape.type}`);

// Des ronds numérotés reliés, le nom dessous ; l'aperçu marqué d'une liste. Au téléphone, seul le nom
// de l'étape en cours s'écrit, dans la légende ; les autres restent dits au lecteur d'écran. Quand les
// étapes ne tiennent plus, la rangée défile (src/ecrans/rangee-etapes.js).
export function vueEtapes(t, etapes, etat, infosValides) {
  const derniere = etapes.length - 1;
  const items = etapes.map((etape, indice) => {
    const sienne = etatEtape(etat, indice, { derniere, infosValides });
    const rond = etape.type === 'apercu' ? iconeInterface('apercu') : indice + 1;
    const attributs = `${sienne === 'courante' ? ' aria-current="step"' : ''}${sienne === 'fermee' ? ' aria-disabled="true"' : ''}`;
    return `
        <li class="etape" data-etat="${sienne}">
          <button type="button" data-aller="${indice}"${attributs}>
            <span class="etape-rond">${rond}</span><span class="etape-nom">${nomEtape(t, etape)}</span>
          </button>
        </li>`;
  });
  const legende = remplir(t('nouveauVoyage.legende'), {
    n: etat.etape + 1,
    total: etapes.length,
    nom: nomEtape(t, etapes[etat.etape]),
  });
  // Les deux traits qui prolongent la rangée jusqu'au bord quand elle défile (src/ecrans/rangee-etapes.js).
  return `
      <div class="etapes-cadre">
        <span class="etapes-suite" data-cote="avant" aria-hidden="true"></span>
        <ol class="etapes-liste">${items.join('')}
        </ol>
        <span class="etapes-suite" data-cote="apres" aria-hidden="true"></span>
      </div>
      <p class="etapes-legende">${legende}</p>`;
}

export const signePuce = choisie => iconeInterface(choisie ? 'coche' : 'plus');

export const texteChoisies = (t, n, langue) =>
  n ? pluriel(t, 'nouveauVoyage.choisies', n, langue) : t('nouveauVoyage.aucuneChoisie');

// Une étape de groupe : une question posée, des puces à presser, aucune obligatoire.
export function vueGroupe(t, langue, { groupe, etiquettes }, choisies) {
  const puces = etiquettes.map(
    e =>
      `<button type="button" class="puce puce-etiquette" aria-pressed="${choisies.has(e.id)}" data-etiquette="${echapper(e.id)}"><span class="puce-signe">${signePuce(choisies.has(e.id))}</span>${echapper(e.nom)}</button>`,
  );
  const n = etiquettes.filter(e => choisies.has(e.id)).length;
  return `
          <section class="etape-groupe" aria-labelledby="titre-etape">
            <h3 class="etape-titre" id="titre-etape" tabindex="-1">${echapper(groupe.nom)}</h3>
            <p class="etape-aide">${t('nouveauVoyage.aideGroupe')}</p>
            <div class="puces-etiquettes" role="group" aria-labelledby="titre-etape">${puces.join('')}</div>
            <p class="etape-compte" aria-live="polite">${texteChoisies(t, n, langue)}</p>
          </section>`;
}

const ARIA_COCHE = { plein: 'true', entame: 'mixed', vide: 'false' };
const boite = coche =>
  `<span class="case-boite" aria-hidden="true">${coche === 'plein' ? iconeInterface('coche') : ''}</span>`;

// Une carte par catégorie : sa tête est la case de toute la catégorie, chaque ligne celle d'un objet.
// Un objet écarté reste à sa place, barré et atténué, pour être recoché d'un appui.
function vueCategorie(t, ligneDeCategorie, ecartes) {
  const { categorie, objets } = ligneDeCategorie;
  const { retenus, coche } = etatCoche(idsDeCategorie(ligneDeCategorie), ecartes);
  const lignes = objets.map(({ objet, quantite }) => {
    const sienne = ecartes.has(objet.id) ? 'vide' : 'plein';
    const nom = remplir(t('nouveauVoyage.case.objet'), { nom: echapper(objet.nom), quantite });
    return `
              <li><button type="button" class="apercu-objet" role="checkbox" aria-checked="${ARIA_COCHE[sienne]}" aria-label="${nom}" data-coche="${sienne}" data-objet="${echapper(objet.id)}">
                ${boite(sienne)}<span class="objet-texte"><span class="objet-nom">${echapper(objet.nom)}</span><span class="objet-sous">${decrireRegle(t, objet)}</span></span><span class="objet-quantite">${quantite}</span>
              </button></li>`;
  });
  const total = objets.length;
  const nom = remplir(t('nouveauVoyage.case.categorie'), { nom: echapper(categorie.nom), retenus, total });
  return `
            <section class="categorie apercu-categorie">
              <h4 class="categorie-titre"><button type="button" class="apercu-tete-cat" role="checkbox" aria-checked="${ARIA_COCHE[coche]}" aria-label="${nom}" data-coche="${coche}" data-categorie="${echapper(categorie.id)}">
                ${boite(coche)}${paveCategorie(categorie)}<span class="categorie-nom"><b>${echapper(categorie.nom)}</b></span><span class="compte">${remplir(t('voyage.compte'), { faits: retenus, total })}</span>
              </button></h4>
              <ul class="objets">${lignes.join('')}
              </ul>
            </section>`;
}

// L'aperçu : le nombre d'objets retenus en titre, le rappel du voyage (nom, période, voyageurs,
// étiquettes choisies), puis les catégories. Vide : la mascotte dit pourquoi, et « Revenir aux
// étiquettes » mène à l'étape `revenir`. Tout écarté : un message au-dessus de la liste, qui reste.
// Dans les deux cas, #raison-vide décrit « Créer le voyage », grisé.
export function vueApercu(t, langue, { apercu, ecartes, infos, etiquettes, revenir }) {
  const raison = raisonVide(apercu, ecartes);
  if (raison === 'aucunObjet')
    return `
          <section class="apercu-vide" aria-labelledby="titre-etape">
            <img src="${mascotte}" alt="" width="96" height="96" />
            <h3 class="etape-titre" id="titre-etape" tabindex="-1">${t('nouveauVoyage.vide.titre')}</h3>
            <p id="raison-vide">${t('nouveauVoyage.vide.texte')}</p>
            <button type="button" class="bouton bouton-secondaire" data-aller="${revenir}">${iconeInterface('precedent')}${t('nouveauVoyage.vide.revenir')}</button>
          </section>`;
  const ids = idsDeLApercu(apercu);
  const { retenus } = etatCoche(ids, ecartes);
  const titre = remplir(pluriel(t, 'nouveauVoyage.retenus', retenus, langue), { total: ids.length });
  const rappel = remplir(t(etiquettes.length ? 'nouveauVoyage.rappelEtiquettes' : 'nouveauVoyage.rappel'), {
    nom: echapper(infos.nom),
    details: detailsVoyage(t, infos, langue),
    etiquettes: etiquettes.map(e => echapper(e.nom)).join(t('nouveauVoyage.separateurEtiquettes')),
  });
  const message =
    raison === 'toutEcarte'
      ? `
            <p class="message message-info" id="raison-vide" role="status">${iconeInterface('info')}<span>${t('nouveauVoyage.toutEcarte')}</span></p>`
      : '';
  return `
          <section class="apercu" aria-labelledby="titre-etape">
            <div class="apercu-tete">
              <h3 class="etape-titre" id="titre-etape" tabindex="-1">${titre}</h3>
              <p class="apercu-rappel">${rappel}</p>
              <p class="etape-aide">${t('nouveauVoyage.aideApercu')}</p>
            </div>${message}
            <div class="apercu-categories">${apercu.map(c => vueCategorie(t, c, ecartes)).join('')}
            </div>
          </section>`;
}

// Les objets écartés que nomme la fenêtre à l'entrée dans l'aperçu (src/ecrans/nouveau-voyage.js) :
// chacun avec sa catégorie, noms échappés (ils viennent de la bibliothèque).
export const vueEcartes = objets => `
      <ul class="liste-ecartes">${objets
        .map(
          ({ nom, categorie }) => `
        <li><b>${echapper(nom)}</b><span>${echapper(categorie)}</span></li>`,
        )
        .join('')}
      </ul>`;

// « Précédent » à gauche (« Annuler » à la première étape, dans la fenêtre), l'action à droite :
// « Voir l'aperçu » et « Suivant », « Voir l'aperçu » seul juste avant l'aperçu, puis « Créer le
// voyage », grisé quand rien n'est retenu. Au téléphone, « Précédent » n'est plus qu'une flèche.
export function vuePied(t, { indice, derniere, enFenetre, grise }) {
  const precedent = t('nouveauVoyage.precedent');
  const gauche = indice
    ? `<button type="button" class="bouton bouton-secondaire bouton-precedent" data-action="precedent" aria-label="${precedent}">${iconeInterface('precedent')}<span class="texte-large">${precedent}</span></button>`
    : enFenetre
      ? `<button type="button" class="bouton bouton-secondaire" data-action="fermer">${t('fenetre.annuler')}</button>`
      : '';
  const suivant = texte =>
    `<button type="submit" class="bouton bouton-principal" data-action="suivant">${texte}${iconeInterface('suivant')}</button>`;
  let actions;
  if (indice === derniere)
    actions = `<button type="submit" class="bouton bouton-principal" data-action="creer"${grise ? ' aria-disabled="true" aria-describedby="raison-vide"' : ''}>${t('nouveauVoyage.creer')}</button>`;
  else if (indice === derniere - 1) actions = suivant(t('nouveauVoyage.voirApercu'));
  else
    actions = `<button type="button" class="bouton bouton-secondaire" data-action="apercu">${t('nouveauVoyage.voirApercu')}</button>
            ${suivant(t('nouveauVoyage.suivant'))}`;
  return `<div class="pied-gauche">${gauche}</div>
          <div class="formulaire-actions">${actions}</div>`;
}
