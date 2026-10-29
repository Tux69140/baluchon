// L'assistant rouvert pour modifier le voyage (phase 10) : le vrai dessin de « Nouveau voyage »
// (src/ecrans/assistant-vues.js : rangée d'étapes, Informations, étapes d'étiquettes, pied ; calendrier ;
// rangée qui défile), prérempli, avec un titre et des boutons qui disent qu'on modifie, et le
// récapitulatif à la place de l'aperçu. Modale sur tablette et ordinateur, plein écran au téléphone.
import fr from '../../../src/i18n/fr.json';
import { creerTraducteur } from '../../../src/i18n/traduction.js';
import {
  ID_TITRE,
  resumeDates,
  signePuce,
  texteChoisies,
  vueAssistant,
  vueEtapes,
  vueGroupe,
  vuePied,
} from '../../../src/ecrans/assistant-vues.js';
import { creerCalendrier } from '../../../src/ecrans/calendrier.js';
import { demander, ouvrirFenetre } from '../../../src/ecrans/fenetre.js';
import { detailsVoyage } from '../../../src/ecrans/format.js';
import { echapper } from '../../../src/ecrans/html.js';
import { lienRetour } from '../../../src/ecrans/retour.js';
import { suivreRangee } from '../../../src/ecrans/rangee-etapes.js';
import { joursEtNuits } from '../../../src/modele/periode.js';
import { choixParDefaut, groupes, recapitulatif } from './donnees.js';
import { vueRecapitulatif } from './recapitulatif.js';

// Les textes de l'assistant qui changent en mode « modifier » (brouillon, à porter dans fr.json).
const textes = structuredClone(fr);
Object.assign(textes.nouveauVoyage, {
  titre: 'Modifier le voyage',
  voirApercu: 'Voir les changements',
  creer: 'Appliquer les changements',
});
textes.nouveauVoyage.etape.apercu = 'Changements';
const tModif = creerTraducteur({ fr: textes }, 'fr');

const etapes = [
  { type: 'informations' },
  ...groupes.map(g => ({
    type: 'groupe',
    groupe: { id: g.id, nom: g.nom },
    etiquettes: g.etiquettes.map(nom => ({ id: nom, nom })),
  })),
  { type: 'apercu' },
];
const DERNIERE = etapes.length - 1;
const COTE_MIN_FENETRE = 600;

// Les informations qui ont changé, dites en petites puces au-dessus du récapitulatif.
function modifsDesInfos(avant, apres, etiquettesAvant, etiquettesApres) {
  const modifs = [];
  const jours = i => joursEtNuits(i.depart, i.retour).jours;
  if (avant.depart !== apres.depart || avant.retour !== apres.retour)
    modifs.push(jours(avant) === jours(apres) ? 'Dates décalées' : `${jours(apres)} jours au lieu de ${jours(avant)}`);
  if (avant.voyageurs !== apres.voyageurs)
    modifs.push(`${apres.voyageurs} voyageur${apres.voyageurs > 1 ? 's' : ''} au lieu de ${avant.voyageurs}`);
  for (const e of etiquettesApres) if (!etiquettesAvant.includes(e)) modifs.push(`+ ${echapper(e)}`);
  for (const e of etiquettesAvant) if (!etiquettesApres.includes(e)) modifs.push(`− ${echapper(e)}`);
  return modifs;
}

// voyage, etiquettes, objets : le voyage tel qu'il est ; infos, choisies : ce que l'assistant montre au
// départ (les états de la maquette) ; surAppliquer(infos, choisies, lignes, choix) ; surFermer().
export function ouvrirAssistant({
  app,
  t,
  langue,
  voyage,
  etiquettes,
  objets,
  infos,
  choisies,
  etape,
  aujourdhui,
  dessinerDerriere,
  surAppliquer,
  surFermer,
}) {
  const saisie = { ...infos };
  const etiquettesChoisies = new Set(choisies);
  let etat = { etape, vues: new Set(etapes.map((_, i) => i)) };
  let lignes = [];
  let choix = new Map();
  let signatureVue = null;
  const fin = new AbortController();
  const enFenetre = Math.min(screen.width, screen.height) >= COTE_MIN_FENETRE;

  if (enFenetre) {
    dessinerDerriere();
    document.body.insertAdjacentHTML('beforeend', vueAssistant(tModif, { enFenetre }));
  } else app.innerHTML = vueAssistant(tModif, { enFenetre });
  const racine = enFenetre ? document.body.lastElementChild : app.querySelector('main');
  racine.classList.add('assistant', 'assistant-modifier');
  const q = s => racine.querySelector(s);
  // Au téléphone, le lien du haut ramène au voyage, pas à Mes voyages.
  q('.lien-retour')?.insertAdjacentHTML(
    'afterend',
    lienRetour(t, { adresse: '?etat=voyage', libelle: echapper(voyage.nom) }),
  );
  q('.lien-retour')?.remove();
  const [rangee, corps, panneau, pied] = ['.etapes', '.formulaire-corps', '.etape-panneau', '.formulaire-pied'].map(q);
  const suivi = suivreRangee(rangee, { signal: fin.signal });

  q('#nom').value = saisie.nom;
  q('#destination').value = saisie.destination;

  const signature = () =>
    JSON.stringify([saisie.depart, saisie.retour, saisie.voyageurs, [...etiquettesChoisies].sort()]);
  // Le récapitulatif se recalcule quand les informations ou les étiquettes ont changé depuis la dernière
  // visite ; sinon il garde les cases touchées.
  function preparerRecapitulatif() {
    if (signatureVue === signature()) return;
    signatureVue = signature();
    lignes = recapitulatif(objets, { avant: voyage, apres: saisie }, etiquettes, [...etiquettesChoisies]);
    choix = choixParDefaut(lignes);
  }

  function peindreInfos() {
    q('#resume-dates').textContent = resumeDates(saisie, t, langue);
    q('.compteur-valeur').textContent = saisie.voyageurs;
    q('[data-voyageurs="-1"]').setAttribute('aria-disabled', saisie.voyageurs <= 1);
  }

  function peindreRecapitulatif() {
    const choisiesTriees = etapes
      .filter(e => e.type === 'groupe')
      .flatMap(e => e.etiquettes.map(x => x.nom))
      .filter(nom => etiquettesChoisies.has(nom));
    const rappel = remplirRappel(choisiesTriees);
    panneau.innerHTML = vueRecapitulatif({
      parCategorie: lignes,
      choix,
      rappel,
      modifs: modifsDesInfos(voyage, saisie, etiquettes, [...etiquettesChoisies]),
    });
  }

  const remplirRappel = noms =>
    [
      echapper(saisie.nom),
      detailsVoyage(t, saisie, langue),
      ...(noms.length ? [noms.map(echapper).join(', ')] : []),
    ].join(' · ');

  function peindre({ focus = false } = {}) {
    const e = etapes[etat.etape];
    corps.dataset.etape = e.type === 'informations' ? 'infos' : e.type;
    rangee.innerHTML = vueEtapes(tModif, etapes, etat, true);
    suivi.centrer(etat.etape, { doux: focus });
    if (e.type === 'groupe') panneau.innerHTML = vueGroupe(t, langue, e, etiquettesChoisies);
    else if (e.type === 'apercu') {
      preparerRecapitulatif();
      peindreRecapitulatif();
    } else panneau.innerHTML = '';
    pied.innerHTML = vuePied(tModif, { indice: etat.etape, derniere: DERNIERE, enFenetre, grise: false });
    panneau.scrollTop = 0;
    if (focus && etat.etape) q('#titre-etape')?.focus({ preventScroll: true });
  }

  function aller(indice) {
    if (indice < 0 || indice > DERNIERE || indice === etat.etape) return;
    etat = { ...etat, etape: indice };
    if (!enFenetre) scrollTo(0, 0);
    peindre({ focus: true });
  }

  const aChange = () =>
    saisie.nom !== voyage.nom ||
    saisie.destination !== voyage.destination ||
    signature() !== JSON.stringify([voyage.depart, voyage.retour, voyage.voyageurs, [...etiquettes].sort()]);

  let fermer = () => {
    fin.abort();
    surFermer();
  };
  async function demanderFermeture() {
    if (!aChange()) return fermer();
    const reponse = await demander({
      t,
      titre: 'Abandonner ces changements ?',
      texte: 'Le voyage reste tel qu’il était.',
      boutons: [
        { cle: 'continuer', libelle: 'Continuer la modification' },
        { cle: 'abandonner', libelle: 'Abandonner', principal: true },
      ],
    });
    if (reponse === 'abandonner') fermer();
  }

  creerCalendrier(q('.calendrier'), {
    t,
    langue,
    aujourdhui,
    periode: { depart: saisie.depart, retour: saisie.retour },
    auChangement({ depart, retour }) {
      Object.assign(saisie, { depart: depart ?? '', retour: retour ?? '' });
      peindreInfos();
    },
  });

  racine.querySelector('form').addEventListener('submit', e => {
    e.preventDefault();
    if (etat.etape < DERNIERE) aller(etat.etape + 1);
  });
  racine.addEventListener('input', ({ target }) => {
    if (target.name === 'nom' || target.name === 'destination') saisie[target.name] = target.value;
  });
  racine.addEventListener('change', ({ target }) => {
    if (!target.dataset.manuelle) return;
    choix.set(target.dataset.manuelle, target.value === 'recalculer');
    const haut = panneau.scrollTop;
    peindreRecapitulatif();
    panneau.scrollTop = haut;
    q(`[data-manuelle="${target.dataset.manuelle}"][value="${target.value}"]`).focus();
  });
  racine.addEventListener('click', evenement => {
    const cible = evenement.target.closest(
      '[data-aller], [data-action], [data-etiquette], [data-voyageurs], [data-ligne]',
    );
    if (!cible) return;
    const { aller: indice, action, etiquette, voyageurs, ligne } = cible.dataset;
    if (indice !== undefined) aller(Number(indice));
    else if (voyageurs) {
      saisie.voyageurs = Math.max(1, Math.min(20, saisie.voyageurs + Number(voyageurs)));
      peindreInfos();
    } else if (etiquette) {
      etiquettesChoisies.has(etiquette) ? etiquettesChoisies.delete(etiquette) : etiquettesChoisies.add(etiquette);
      cible.setAttribute('aria-pressed', etiquettesChoisies.has(etiquette));
      cible.querySelector('.puce-signe').innerHTML = signePuce(etiquettesChoisies.has(etiquette));
      const n = etapes[etat.etape].etiquettes.filter(x => etiquettesChoisies.has(x.id)).length;
      q('.etape-compte').textContent = texteChoisies(t, n, langue);
    } else if (ligne) {
      choix.set(ligne, !choix.get(ligne));
      const haut = [panneau.scrollTop, scrollY];
      peindreRecapitulatif();
      panneau.scrollTop = haut[0];
      scrollTo(0, haut[1]);
      q(`[data-ligne="${CSS.escape(ligne)}"]`).focus();
    } else if (action === 'precedent') aller(etat.etape - 1);
    else if (action === 'apercu') aller(DERNIERE);
    else if (action === 'fermer' || action === 'retour') {
      evenement.preventDefault();
      demanderFermeture();
    } else if (action === 'creer') {
      evenement.preventDefault();
      const fini = () => surAppliquer(saisie, [...etiquettesChoisies], lignes, choix);
      fin.abort();
      if (enFenetre) fermerFenetre().then(fini);
      else fini();
    }
  });

  peindreInfos();
  peindre();
  let fermerFenetre = async () => {};
  if (enFenetre) {
    fermerFenetre = ouvrirFenetre(racine, { surFermeture: () => racine.remove(), surGeste: demanderFermeture });
    const fermerDeLaFenetre = fermerFenetre;
    fermer = async () => {
      fin.abort();
      await fermerDeLaFenetre();
      surFermer();
    };
    q(`#${ID_TITRE}`).focus();
  }
  return { racine };
}
