// Le HTML de l'écran Étiquettes (src/ecrans/etiquettes.js), d'après la maquette validée de la phase 6
// (docs/maquettes/etiquettes/maquette.js) : en-tête, une carte par groupe avec ses étiquettes en
// puces, et le rangement (chaque groupe avec ▲ ▼, ses étiquettes dessous en retrait avec les leurs).
// Rien ne vit ici que du dessin : l'ordre, les étapes et ce qui vient d'être enregistré viennent de
// l'écran.
import { remplir } from '../i18n/traduction.js';
import { pluriel } from './format.js';
import { echapper } from './html.js';
import { iconeInterface } from './icones.js';
import { barreHaut } from './menu.js';

// Sous le nom : « N étiquettes · étape N de « Nouveau voyage » », ou l'absence d'étape d'un groupe vide.
function infosGroupe({ t, langue }, { etiquettes, etape }) {
  if (!etiquettes.length) return t('etiquettes.absent');
  return remplir(t('etiquettes.infos'), {
    etiquettes: pluriel(t, 'etiquettes.etiquettes', etiquettes.length, langue),
    n: etape,
  });
}

// Ce qui vient d'être enregistré (un groupe ou une étiquette, par son id) s'éclaire un instant
// (src/styles/etiquettes.css).
const eclaire = ({ recent }, id) => (recent === id ? ' data-recent' : '');

function puce(vue, etiquette) {
  const libelle = remplir(vue.t('etiquettes.modifierEtiquette'), { nom: etiquette.nom });
  return `
          <li><button type="button" class="puce puce-modele" data-action="modifier-etiquette" data-id="${echapper(etiquette.id)}" aria-label="${echapper(libelle)}"${eclaire(vue, etiquette.id)}>${echapper(etiquette.nom)}</button></li>`;
}

function carteGroupe(vue, rangee) {
  const { t } = vue;
  const { groupe, etiquettes } = rangee;
  const id = echapper(groupe.id);
  const puces = etiquettes.length
    ? `
        <ul class="etiquettes-liste">${etiquettes.map(e => puce(vue, e)).join('')}
        </ul>`
    : `
        <p class="groupe-vide">${t('etiquettes.vide')}</p>`;
  return `
      <section class="groupe" data-groupe="${id}" data-flip="g-${id}"${eclaire(vue, groupe.id)} aria-labelledby="titre-${id}">
        <div class="groupe-entete">
          <h2 class="groupe-titre" id="titre-${id}"><b>${echapper(groupe.nom)}</b><span class="groupe-infos">${infosGroupe(vue, rangee)}</span></h2>
          <button type="button" class="bouton-icone bouton-modifier" data-action="modifier-groupe" data-id="${id}" aria-label="${echapper(remplir(t('etiquettes.modifierGroupe'), { nom: groupe.nom }))}">${iconeInterface('modifier')}</button>
        </div>${puces}
        <button type="button" class="groupe-ajout" data-action="nouvelle-etiquette" data-id="${id}">${iconeInterface('plus')}${t('etiquettes.ajouter')}</button>
      </section>`;
}

// Un bouton ▲ ou ▼ ; au bord de sa liste, il reste à sa place mais ne fait rien (aria-disabled).
function fleche({ t }, action, { id, nom }, inactif) {
  const libelle = echapper(remplir(t(`etiquettes.${action}`), { nom }));
  return `<button type="button" class="bouton-icone" data-action="${action}" data-id="${echapper(id)}" aria-label="${libelle}"${inactif ? ' aria-disabled="true"' : ''}>${iconeInterface(action)}</button>`;
}

function rangEtiquettes(vue, { groupe, etiquettes }) {
  if (!etiquettes.length) return '';
  const dernier = etiquettes.length - 1;
  const lignes = etiquettes
    .map(
      (etiquette, rang) => `
              <li class="rang-ligne" data-flip="e-${echapper(etiquette.id)}">
                <span>${echapper(etiquette.nom)}</span>
                ${fleche(vue, 'monter', etiquette, rang === 0)}
                ${fleche(vue, 'descendre', etiquette, rang === dernier)}
              </li>`,
    )
    .join('');
  const libelle = echapper(remplir(vue.t('etiquettes.listeEtiquettes'), { nom: groupe.nom }));
  return `
            <ol class="rang-etiquettes" aria-label="${libelle}">${lignes}
            </ol>`;
}

// La zone d'annonce (data-annonce) est remplacée par l'écran par la sienne, qui reste la même d'un
// dessin à l'autre : un lecteur d'écran n'annonce que les changements d'une zone qu'il connaît déjà.
function rangement(vue) {
  const { t, rangees } = vue;
  const dernier = rangees.length - 1;
  const lignes = rangees
    .map(
      (rangee, rang) => `
          <li class="rang-groupe" data-flip="g-${echapper(rangee.groupe.id)}">
            <div class="rang-ligne">
              <span class="rang-picto">${iconeInterface('etiquette')}</span>
              <b>${echapper(rangee.groupe.nom)}</b>
              ${fleche(vue, 'monter', rangee.groupe, rang === 0)}
              ${fleche(vue, 'descendre', rangee.groupe, rang === dernier)}
            </div>${rangEtiquettes(vue, rangee)}
          </li>`,
    )
    .join('');
  return `
      <section class="rangement" aria-labelledby="rangement-titre">
        <div class="rangement-tete">
          <h2 id="rangement-titre">${t('etiquettes.ranger')}</h2>
          <button type="button" class="bouton bouton-principal" data-action="terminer">${iconeInterface('coche')}${t('etiquettes.termine')}</button>
        </div>
        <p class="aide">${t('etiquettes.rangerAide')}</p>
        <ol class="rang-arbre">${lignes}
        </ol>
        <p data-annonce></p>
      </section>`;
}

// Le contenu de l'écran et sa disposition (la classe de <main>). vue : le contexte de l'appli, plus
// rangees (chaque groupe dans l'ordre, ses étiquettes dans l'ordre, son étape ou null),
// nombreEtiquettes, ranger, recent (l'id de ce qui vient d'être enregistré).
export function vueEtiquettes(vue) {
  const { t, langue, rangees, nombreEtiquettes, ranger } = vue;
  const resume = `${pluriel(t, 'etiquettes.groupes', rangees.length, langue)} · ${pluriel(t, 'etiquettes.etiquettes', nombreEtiquettes, langue)}`;
  const entete = `${barreHaut(vue, { retour: { adresse: '#/reglages', libelle: t('reglages.titre') } })}
      <h1>${t('etiquettes.titre')}</h1>
      <p class="biblio-resume">${resume}</p>`;
  if (ranger) return { classe: 'ecran', html: `${entete}${rangement(vue)}` };
  return {
    classe: 'ecran ecran-avec-flottant',
    html: `${entete}
      <p class="aide etiquettes-aide">${t('etiquettes.aide')}</p>
      <div class="outils">
        <button type="button" class="puce" data-action="ranger">${iconeInterface('ranger')}${t('etiquettes.ranger')}</button>
      </div>
      <div class="groupes">${rangees.map(r => carteGroupe(vue, r)).join('')}
      </div>
      <button type="button" class="bouton bouton-principal bouton-flottant" data-action="nouveau-groupe">${iconeInterface('plus')}${t('etiquettes.nouveauGroupe')}</button>`,
  };
}
