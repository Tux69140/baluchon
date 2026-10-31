// Le dessin de l'étape « Changements », dernière étape de « Modifier le voyage » (phase 10 ; maquette
// validée le 2026-10-29, docs/maquettes/plans-changent/, état « recapitulatif ») : il reprend celui de
// l'aperçu (src/ecrans/assistant-vues.js, src/styles/assistant-apercu.css) — une carte par catégorie, une
// ligne-case par changement — et y ajoute la colonne « avant → après », ce que le changement veut dire
// pour le sac, et le choix « Garder | Recalculer » d'une quantité fixée manuellement. Les changements
// viennent du modèle (src/modele/changements.js) ; rien ne vit ici que du dessin.
import { remplir } from '../i18n/traduction.js';
import { choisiesDuVoyage } from '../modele/changements.js';
import { etiquettesChoisies } from '../modele/inclusion.js';
import { joursEtNuits } from '../modele/periode.js';
import { detailsVoyage, pluriel } from './format.js';
import { echapper } from './html.js';
import { iconeInterface, paveCategorie } from './icones.js';

const boite = coche => `<span class="case-boite" aria-hidden="true">${coche ? iconeInterface('coche') : ''}</span>`;
const fleche = (avant, apres) => `${avant}<span class="recap-fleche" aria-hidden="true">→</span>${apres}`;
const pastilleSortir = (t, n, langue) =>
  `<span class="pastille-sortir">${iconeInterface('sortir')}${echapper(pluriel(t, 'voyage.aSortir', n, langue))}</span>`;
const pastilleMention = texte => `<span class="pastille-mention">${iconeInterface('retire')}${echapper(texte)}</span>`;
const mention = texte => `<span>${echapper(texte)}</span>`;

// Ce que le changement de quantité veut dire pour le sac, une fois appliqué.
function effetSurLeSac(t, langue, apres, dansLeSac) {
  if (!dansLeSac) return '';
  const ecart = apres - dansLeSac;
  if (ecart > 0) return mention(remplir(t('modifierVoyage.ligne.encoreAMettre'), { n: ecart }));
  if (ecart < 0) return pastilleSortir(t, -ecart, langue);
  return mention(t('modifierVoyage.ligne.toutDansLeSac'));
}

function sousTexte(t, langue, ligne, accepte) {
  const l = cle => t(`modifierVoyage.ligne.${cle}`);
  const dansLeSac = ligne.objet?.dansLeSac ?? 0;
  if (ligne.genre === 'quantite')
    return accepte
      ? effetSurLeSac(t, langue, ligne.apres, dansLeSac)
      : mention(remplir(l('resteA'), { n: ligne.avant }));
  if (ligne.genre === 'entree') {
    if (!accepte) return `${mention(l('pasAjoute'))}${ligne.retire ? pastilleMention(l('retire')) : ''}`;
    return mention(ligne.raison ? remplir(l('nouveauPour'), { etiquette: ligne.raison }) : l('nouveau'));
  }
  if (ligne.genre === 'retour') return mention(l(accepte ? 'revient' : 'resteRetire'));
  // Une sortie : rien n'est retiré d'office (US-27) ; cochée, l'objet sort de la liste, ou reste barré
  // tant que ses pièces sont dans le sac.
  const raison = ligne.raison ? remplir(l('etiquetteRetiree'), { etiquette: ligne.raison }) : l('plusPrevu');
  if (!accepte) return mention(remplir(l('resteDansLeVoyage'), { raison }));
  return `${mention(remplir(l('seraRetire'), { raison }))}${dansLeSac ? pastilleSortir(t, dansLeSac, langue) : ''}`;
}

// Le nom de la case reprend ce que dit la ligne, et ce que fera l'appui.
function nomDeLaCase(t, ligne, accepte) {
  const quoi = remplir(t(`modifierVoyage.case.${ligne.genre}`), ligne);
  const nom = remplir(t(`modifierVoyage.case.${accepte ? 'applique' : 'pasApplique'}`), { quoi });
  return ligne.retire && !accepte ? remplir(t('modifierVoyage.case.retire'), { quoi: nom }) : nom;
}

function ligneACocher(t, langue, ligne, accepte) {
  const valeur = ligne.genre === 'entree' ? `+&#8239;${ligne.apres}` : fleche(ligne.avant, ligne.apres);
  return `
              <li><button type="button" class="apercu-objet recap-ligne" role="checkbox" aria-checked="${accepte}" aria-label="${echapper(nomDeLaCase(t, ligne, accepte))}" data-coche="${accepte ? 'plein' : 'vide'}" data-ligne="${echapper(ligne.cle)}">
                ${boite(accepte)}<span class="objet-texte"><span class="objet-nom">${echapper(ligne.nom)}</span><span class="objet-sous">${sousTexte(t, langue, ligne, accepte)}</span></span><span class="recap-valeur">${valeur}</span>
              </button></li>`;
}

// Une quantité fixée manuellement : gardée par défaut ; « Recalculer » est un choix explicite (deux
// segments, comme ceux des fiches de modèle).
function ligneManuelle(t, langue, ligne, recalculer) {
  const l = cle => t(`modifierVoyage.ligne.${cle}`);
  const nom = `m-${echapper(ligne.cle)}`;
  const effet = recalculer ? effetSurLeSac(t, langue, ligne.apres, ligne.objet.dansLeSac) : '';
  const choix = (valeur, libelle, coche) =>
    `<label class="segment"><input type="radio" name="${nom}" value="${valeur}" data-manuelle="${echapper(ligne.cle)}"${coche ? ' checked' : ''} /><span>${echapper(libelle)}</span></label>`;
  return `
              <li class="recap-manuelle">
                <div class="recap-ligne-fixe">
                  <span class="recap-signe">${iconeInterface('modifier')}</span><span class="objet-texte"><span class="objet-nom">${echapper(ligne.nom)}</span><span class="objet-sous">${mention(remplir(l('manuelle'), ligne))}${effet}</span></span><span class="recap-valeur">${recalculer ? fleche(ligne.avant, ligne.apres) : ligne.avant}</span>
                </div>
                <div class="segments recap-segments" role="radiogroup" aria-label="${echapper(remplir(l('quantiteDe'), ligne))}">
                  ${choix('garder', remplir(l('garder'), { n: ligne.avant }), !recalculer)}
                  ${choix('recalculer', remplir(l('recalculer'), { n: ligne.apres }), recalculer)}
                </div>
              </li>`;
}

const carte = (t, langue, { categorie, lignes }, acceptes) => `
            <section class="categorie apercu-categorie recap-categorie">
              <h4 class="categorie-titre recap-tete">${paveCategorie(categorie)}<span class="categorie-nom"><b>${echapper(categorie.nom)}</b></span></h4>
              <ul class="objets">${lignes
                .map(ligne =>
                  ligne.genre === 'manuelle'
                    ? ligneManuelle(t, langue, ligne, acceptes.has(ligne.cle))
                    : ligneACocher(t, langue, ligne, acceptes.has(ligne.cle)),
                )
                .join('')}
              </ul>
            </section>`;

// Ce qui a changé dans les informations, en petites puces : la durée (ou des dates décalées), les
// voyageurs, les étiquettes ajoutées et retirées.
function modifications(t, langue, { contenu, bibliotheque, infos, choisies }) {
  const m = cle => `modifierVoyage.modifs.${cle}`;
  const puces = [];
  const { voyage } = contenu;
  const [jours, joursAvant] = [infos, voyage].map(v => joursEtNuits(v.depart, v.retour).jours);
  if (jours !== joursAvant) puces.push(remplir(pluriel(t, m('jours'), jours, langue), { avant: joursAvant }));
  else if (infos.depart !== voyage.depart) puces.push(t(m('datesDecalees')));
  if (infos.voyageurs !== voyage.voyageurs)
    puces.push(remplir(pluriel(t, m('voyageurs'), infos.voyageurs, langue), { avant: voyage.voyageurs }));
  const avant = choisiesDuVoyage(bibliotheque, contenu.etiquettes);
  for (const e of etiquettesChoisies(bibliotheque, choisies))
    if (!avant.has(e.id)) puces.push(remplir(t(m('ajoutee')), { nom: e.nom }));
  for (const e of etiquettesChoisies(bibliotheque, avant))
    if (!choisies.has(e.id)) puces.push(remplir(t(m('retiree')), { nom: e.nom }));
  return puces;
}

// entree : { contenu, bibliotheque, infos, choisies, changements, acceptes }.
export function vueChangements(t, langue, entree) {
  const { bibliotheque, infos, choisies, changements, acceptes } = entree;
  const total = changements.flatMap(c => c.lignes).length;
  const titre = remplir(pluriel(t, 'modifierVoyage.compte', acceptes.size, langue), { total });
  const etiquettes = etiquettesChoisies(bibliotheque, choisies);
  const rappel = remplir(t(etiquettes.length ? 'nouveauVoyage.rappelEtiquettes' : 'nouveauVoyage.rappel'), {
    nom: echapper(infos.nom),
    details: detailsVoyage(t, infos, langue),
    etiquettes: etiquettes.map(e => echapper(e.nom)).join(t('nouveauVoyage.separateurEtiquettes')),
  });
  const puces = modifications(t, langue, entree)
    .map(p => `<li>${echapper(p)}</li>`)
    .join('');
  return `
          <section class="apercu recapitulatif" aria-labelledby="titre-etape">
            <div class="apercu-tete">
              <h3 class="etape-titre" id="titre-etape" tabindex="-1" aria-live="polite">${titre}</h3>
              <p class="apercu-rappel">${rappel}</p>${puces ? `\n              <ul class="recap-modifs" aria-label="${t('modifierVoyage.ceQuiChange')}">${puces}</ul>` : ''}
              <p class="etape-aide">${t('modifierVoyage.aide')}</p>
            </div>
            <div class="apercu-categories">${changements.map(c => carte(t, langue, c, acceptes)).join('')}
            </div>
          </section>`;
}
