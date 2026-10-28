// Fiches de la bibliothèque (maquette, phase 5) : une catégorie, son catalogue de pictos, un objet.
// Chaque fiche sert à créer comme à modifier ; elle travaille sur un brouillon, enregistré d'un coup
// par « Enregistrer ». La fermer avec des changements demande « Abandonner les modifications ? ».
import { CATALOGUE, COULEURS, GROUPES, PICTOS } from './donnees.js';
import { alerte, confirmer, duo, echapper, exempleQuantite, ic, ouvrir, pave, phraseQuantite, sansAccents, svg } from './outils.js';

const MAX = 999;
const nomPicto = icone => PICTOS.find(([nom]) => nom === icone)?.[1] ?? '';

// ---------- Morceaux de formulaire ----------
const champNom = (valeur, erreur) => `
        <div class="champ">
          <label for="f-nom">Nom</label>
          <input id="f-nom" data-f="nom" value="${echapper(valeur)}" autocomplete="off" maxlength="60"
            aria-invalid="${Boolean(erreur)}" aria-describedby="f-nom-erreur" />
          <p class="erreur-champ" id="f-nom-erreur">${erreur ? `${ic('warning-circle')}${erreur}` : ''}</p>
        </div>`;

// Choix exclusif en segments : de vrais boutons radio, dessinés côte à côte.
const segments = (nom, legende, options, valeur) => `
          <div class="segments" role="radiogroup" aria-label="${legende}">
            ${options
              .map(
                ([v, texte]) => `
            <label class="segment">
              <input type="radio" name="${nom}" value="${v}" data-f="${nom}"${v === valeur ? ' checked' : ''} />
              <span>${texte}</span>
            </label>`,
              )
              .join('')}
          </div>`;

const interrupteur = (cle, actif, libelle) =>
  `<button type="button" class="interrupteur" role="switch" data-f="${cle}" aria-checked="${actif}" aria-label="${libelle}"></button>`;

function inclusion(b, erreur, { feminin, aideToujours, groupesDispo = GROUPES }) {
  const toujours = b.etiquettes === null;
  const choisies = b.etiquettes ?? [];
  const aide = toujours
    ? aideToujours
    : choisies.length
      ? `Proposé${feminin ? 'e' : ''} si l’une de ces étiquettes est cochée : ${choisies.join(', ')}.`
      : 'Choisissez les étiquettes qui la feront proposer.';
  const groupes = toujours
    ? ''
    : groupesDispo.map(
        g => `
          <div class="groupe-etiquettes">
            <h4>${g.nom}</h4>
            <div class="puces-etiquettes">
              ${g.etiquettes
                .map(e => {
                  const oui = choisies.includes(e);
                  return `<button type="button" class="puce puce-etiquette" data-f="etiquette" data-valeur="${e}" aria-pressed="${oui}"><span class="puce-signe">${ic(oui ? 'check' : 'plus')}</span>${e}</button>`;
                })
                .join('')}
            </div>
          </div>`,
      ).join('');
  return `
        <fieldset class="champ">
          <legend>Dans quels voyages ?</legend>
          ${segments('inclusion', 'Dans quels voyages ?', [['toujours', feminin ? 'Toujours incluse' : 'Toujours inclus'], ['etiquettes', 'Selon les étiquettes']], toujours ? 'toujours' : 'etiquettes')}
          <p class="aide">${aide}</p>
          ${groupes}
          <p class="erreur-champ" id="f-etiquettes-erreur">${erreur ? `${ic('warning-circle')}${erreur}` : ''}</p>
        </fieldset>`;
}

function compteur(cle, valeur, libelle) {
  const v = valeur === '' ? '' : Number(valeur);
  return `
            <span class="compteur compteur-saisie">
              <button type="button" class="bouton-icone" data-f="${cle}-moins" aria-label="${libelle} : un de moins"${v !== '' && v <= 1 ? ' aria-disabled="true"' : ''}>${ic('minus')}</button>
              <input type="text" inputmode="numeric" data-f="${cle}" value="${v}" aria-label="${libelle}" maxlength="3" />
              <button type="button" class="bouton-icone" data-f="${cle}-plus" aria-label="${libelle} : un de plus"${v >= MAX ? ' aria-disabled="true"' : ''}>${ic('plus')}</button>
            </span>`;
}

const lecture = b =>
  b.valeur === ''
    ? '<b>Quantité à indiquer</b><span>Elle se calcule pour chaque voyage.</span>'
    : `<b>${phraseQuantite(b)}</b><span>${exempleQuantite(b)}</span>`;

// ---------- Mécanique commune d'une fiche ----------
// supprimer (facultatif, maquette de la phase 7) : la question avant de supprimer ; rend true une
// fois la suppression faite, et la fiche se ferme.
function fiche({ titre, sousTitre, bouton, initial, corps, valider, enregistrer, panne, nomPourAbandon, supprimer, texteSupprimer }) {
  const b = structuredClone(initial);
  const depart = JSON.stringify(b);
  let erreurs = {};
  let tente = false;
  const d = document.createElement('dialog');
  d.className = 'fenetre fiche fiche-modele';
  d.setAttribute('aria-labelledby', 'fiche-titre');
  d.innerHTML = `
      <header class="fenetre-entete">
        <h2 id="fiche-titre" tabindex="-1">${titre}</h2>
        <button type="button" class="bouton-icone bouton-fermer" data-fermer aria-label="Fermer">${ic('x')}</button>
      </header>
      <div class="fiche-corps"></div>
      <div class="fenetre-pied">
        <button type="button" class="bouton bouton-secondaire" data-fermer>Annuler</button>
        <button type="button" class="bouton bouton-principal" data-f="enregistrer">${bouton}</button>
      </div>`;
  const zone = d.querySelector('.fiche-corps');
  const peindre = () => {
    const focus = document.activeElement?.closest('[data-f]');
    const cle = focus && [focus.dataset.f, focus.dataset.valeur];
    const haut = zone.scrollTop;
    zone.innerHTML =
      (sousTitre ? `<p class="fiche-regle">${sousTitre}</p>` : '') +
      corps(b, erreurs) +
      (supprimer ? `<div class="zone-suppression"><button type="button" class="bouton bouton-supprimer" data-f="supprimer">${ic('trash')}${texteSupprimer}</button></div>` : '');
    zone.scrollTop = haut;
    if (cle) zone.querySelector(`[data-f="${cle[0]}"]${cle[1] ? `[data-valeur="${cle[1]}"]` : ''}`)?.focus({ preventScroll: true });
    ombrePied();
  };
  // Ombre sur le pied tant qu'il reste à défiler (décision de l'assistant, 2026-10-25).
  const ombrePied = () =>
    d.querySelector('.fenetre-pied').toggleAttribute('data-ombre', zone.scrollTop + zone.clientHeight < zone.scrollHeight - 2);
  zone.addEventListener('scroll', ombrePied);
  const revalider = () => {
    if (tente) erreurs = valider(b);
  };
  const garde = async () =>
    JSON.stringify(b) === depart ||
    confirmer({
      titre: 'Abandonner les modifications ?',
      texte: nomPourAbandon,
      annuler: 'Continuer la saisie',
      action: 'Abandonner',
    });
  const { fermer } = ouvrir(d, { garde });
  d.addEventListener('input', e => {
    const f = e.target.dataset.f;
    if (f === 'nom') b.nom = e.target.value;
    else if (f === 'note') b.note = e.target.value;
    else if (f === 'valeur' || f === 'plafond') {
      const chiffres = e.target.value.replace(/\D/g, '').slice(0, 3);
      e.target.value = chiffres;
      b[f] = chiffres === '' ? '' : Math.max(1, Number(chiffres));
      d.querySelector('.lecture').innerHTML = lecture(b);
    } else return;
    const avant = JSON.stringify(erreurs);
    revalider();
    if (JSON.stringify(erreurs) !== avant) peindre();
  });
  d.addEventListener('change', e => {
    const f = e.target.dataset.f;
    if (f === 'inclusion') b.etiquettes = e.target.value === 'toujours' ? null : (b.etiquettes ?? []);
    else if (f === 'regle') b.regle = e.target.value;
    else if (f === 'qui') b.parPersonne = e.target.value === 'personne';
    else return;
    revalider();
    peindre();
  });
  d.addEventListener('click', e => {
    const el = e.target.closest('[data-f]');
    if (!el || el.getAttribute('aria-disabled') === 'true') return;
    const f = el.dataset.f;
    if (f === 'supprimer') {
      supprimer().then(fait => fait && fermer());
      return;
    }
    if (f === 'enregistrer') {
      tente = true;
      erreurs = valider(b);
      if (Object.keys(erreurs).length) {
        peindre();
        zone.querySelector('[aria-invalid="true"], .erreur-champ:not(:empty)')?.closest('.champ')?.querySelector('input, button')?.focus();
        return;
      }
      if (panne()) return alerte('La modification n’a pas pu être enregistrée. Votre saisie est gardée ; réessayez.');
      enregistrer(b);
      return fermer();
    }
    const pas = { 'valeur-moins': ['valeur', -1], 'valeur-plus': ['valeur', 1], 'plafond-moins': ['plafond', -1], 'plafond-plus': ['plafond', 1] }[f];
    if (pas) b[pas[0]] = Math.min(MAX, Math.max(1, (Number(b[pas[0]]) || 0) + pas[1]));
    else if (f === 'etiquette') {
      const e2 = el.dataset.valeur;
      b.etiquettes = b.etiquettes.includes(e2) ? b.etiquettes.filter(x => x !== e2) : [...b.etiquettes, e2];
    } else if (f === 'plafond-actif') b.plafond = b.plafond ? null : Math.max(1, Number(b.valeur) || 1);
    else if (f === 'consommable') b.consommable = !b.consommable;
    else if (f === 'couleur') b.couleur = el.dataset.valeur;
    else if (f === 'catalogue') return ouvrirCatalogue(b, () => peindre());
    else return;
    revalider();
    peindre();
  });
  peindre();
  return d;
}

// ---------- Catégorie ----------
// prerempli, bouton (facultatifs, maquette de la phase 8) : une catégorie neuve qui part de ces valeurs
// (celles d'une catégorie du voyage), et le libellé du bouton principal.
export function ficheCategorie({ categorie, surEnregistrer, panne, groupes = GROUPES, supprimer, prerempli, bouton }) {
  const initial = categorie
    ? { nom: categorie.nom, icone: categorie.icone, couleur: categorie.couleur, etiquettes: categorie.etiquettes.length ? [...categorie.etiquettes] : null }
    : { nom: '', icone: 'suitcase-rolling', couleur: 'corail', etiquettes: null, ...prerempli };
  const n = categorie?.objets.length;
  return fiche({
    titre: categorie ? echapper(categorie.nom) : 'Nouvelle catégorie',
    sousTitre: categorie ? `${n} objet${n > 1 ? 's' : ''}` : '',
    bouton: bouton ?? (categorie ? 'Enregistrer' : 'Créer la catégorie'),
    initial,
    nomPourAbandon: categorie ? `Ce que vous avez changé dans « ${echapper(categorie.nom)} » ne sera pas enregistré.` : 'La nouvelle catégorie ne sera pas créée.',
    panne,
    valider: b => ({
      ...(b.nom.trim() ? {} : { nom: 'Donnez un nom à cette catégorie.' }),
      ...(b.etiquettes && !b.etiquettes.length ? { etiquettes: 'Choisissez au moins une étiquette, ou « Toujours incluse ».' } : {}),
    }),
    enregistrer: b => surEnregistrer({ ...b, nom: b.nom.trim(), etiquettes: b.etiquettes ?? [] }),
    supprimer: categorie && supprimer,
    texteSupprimer: 'Supprimer la catégorie',
    corps: (b, err) => `
        ${champNom(b.nom, err.nom)}
        <fieldset class="champ champ-sans-message">
          <legend>Picto et couleur</legend>
          <div class="apparence">
            ${pave(b.icone, b.couleur, 'pave-grand')}
            <span class="apparence-nom">${nomPicto(b.icone)}</span>
            <button type="button" class="bouton bouton-secondaire" data-f="catalogue">Changer de picto</button>
          </div>
          <div class="nuancier" role="radiogroup" aria-label="Couleur">
            ${COULEURS.map(([cle, nom]) => `<button type="button" class="teinte" role="radio" data-f="couleur" data-valeur="${cle}" data-couleur="${cle}" aria-checked="${b.couleur === cle}" aria-label="${nom}">${b.couleur === cle ? svg.check : ''}</button>`).join('')}
          </div>
        </fieldset>
        ${inclusion(b, err.etiquettes, { feminin: true, aideToujours: 'Proposée dans chaque nouveau voyage.', groupesDispo: groupes })}`,
  });
}

// ---------- Catalogue des pictos ----------
function ouvrirCatalogue(b, apres) {
  const d = document.createElement('dialog');
  d.className = 'fenetre fiche catalogue';
  d.setAttribute('aria-labelledby', 'catalogue-titre');
  d.innerHTML = `
      <header class="fenetre-entete">
        <h2 id="catalogue-titre" tabindex="-1">Choisir un picto</h2>
        <button type="button" class="bouton-icone bouton-fermer" data-fermer aria-label="Fermer">${ic('x')}</button>
      </header>
      <div class="catalogue-recherche">
        <span class="champ-loupe">${ic('magnifying-glass')}<input type="search" aria-label="Chercher un picto" placeholder="Chercher : tente, soleil, repas…" autocomplete="off" /></span>
        <p class="catalogue-compte" aria-live="polite"></p>
      </div>
      <div class="fiche-corps catalogue-corps"></div>`;
  const zone = d.querySelector('.catalogue-corps');
  const compte = d.querySelector('.catalogue-compte');
  const tuile = ([nom, libelle]) => {
    const oui = nom === b.icone;
    return `<button type="button" class="tuile" data-picto="${nom}" aria-pressed="${oui}">${oui ? pave(nom, b.couleur) : `<span class="tuile-picto" aria-hidden="true">${duo[nom]}</span>`}<span class="tuile-nom">${libelle}</span></button>`;
  };
  const peindre = mot => {
    const m = sansAccents(mot.trim());
    if (!m) {
      compte.textContent = `${PICTOS.length} pictos`;
      zone.innerHTML = CATALOGUE.map(([theme, liste]) => `<section class="theme"><h3>${theme}</h3><div class="grille-pictos">${liste.map(tuile).join('')}</div></section>`).join('');
      return;
    }
    const trouves = PICTOS.filter(([, libelle, mots]) => sansAccents(`${libelle} ${mots}`).split(/\s+/).some(x => x.startsWith(m)));
    compte.textContent = trouves.length ? `${trouves.length} picto${trouves.length > 1 ? 's' : ''} pour « ${mot.trim()} »` : '';
    zone.innerHTML = trouves.length
      ? `<div class="grille-pictos">${trouves.map(tuile).join('')}</div>`
      : `<p class="catalogue-vide">Aucun picto ne correspond à « ${echapper(mot.trim())} ». Essayez un autre mot : tente, soleil, repas…</p>`;
  };
  const champ = d.querySelector('input');
  champ.addEventListener('input', () => peindre(champ.value));
  const { fermer } = ouvrir(d);
  d.addEventListener('click', e => {
    const t = e.target.closest('[data-picto]');
    if (!t) return;
    b.icone = t.dataset.picto;
    fermer();
    apres();
  });
  peindre('');
  zone.querySelector('[aria-pressed="true"]')?.scrollIntoView({ block: 'center' });
  return { d, chercher: mot => ((champ.value = mot), peindre(mot)) };
}
export { ouvrirCatalogue };

// ---------- Objet ----------
// prerempli, bouton (facultatifs, maquette de la phase 8) : comme pour ficheCategorie.
export function ficheObjet({ objet, categorie, surEnregistrer, panne, groupes = GROUPES, supprimer, prerempli, bouton }) {
  const initial = objet
    ? { ...structuredClone(objet), etiquettes: objet.etiquettes.length ? [...objet.etiquettes] : null }
    : { nom: '', regle: 'fixe', valeur: 1, plafond: null, parPersonne: true, consommable: false, etiquettes: null, note: '', ...prerempli };
  return fiche({
    titre: objet ? echapper(objet.nom) : 'Nouvel objet',
    sousTitre: `Dans « ${echapper(categorie.nom)} »`,
    bouton: bouton ?? (objet ? 'Enregistrer' : 'Ajouter l’objet'),
    initial,
    nomPourAbandon: objet ? `Ce que vous avez changé dans « ${echapper(objet.nom)} » ne sera pas enregistré.` : 'Le nouvel objet ne sera pas ajouté.',
    panne,
    valider: b => ({
      ...(b.nom.trim() ? {} : { nom: 'Donnez un nom à cet objet.' }),
      ...(b.valeur === '' ? { valeur: `Indiquez une quantité, de 1 à ${MAX}.` } : {}),
      ...(b.regle !== 'fixe' && b.plafond === '' ? { valeur: `Indiquez un plafond, de 1 à ${MAX}, ou retirez-le.` } : {}),
      ...(b.etiquettes && !b.etiquettes.length ? { etiquettes: 'Choisissez au moins une étiquette, ou « Toujours inclus ».' } : {}),
    }),
    enregistrer: b =>
      surEnregistrer({ ...b, nom: b.nom.trim(), plafond: b.regle === 'fixe' ? null : b.plafond, etiquettes: b.etiquettes ?? [] }),
    supprimer: objet && supprimer,
    texteSupprimer: 'Supprimer l’objet',
    corps: (b, err) => `
        ${champNom(b.nom, err.nom)}
        <fieldset class="champ">
          <legend>Quantité</legend>
          ${segments('regle', 'Règle de quantité', [['fixe', 'Fixe'], ['par_jour', 'Par jour'], ['par_nuit', 'Par nuit']], b.regle)}
          <div class="ligne-reglage">
            <span>${{ fixe: 'Nombre', par_jour: 'Chaque jour', par_nuit: 'Chaque nuit' }[b.regle]}</span>
            ${compteur('valeur', b.valeur, 'Quantité')}
          </div>
          ${
            b.regle === 'fixe'
              ? ''
              : `<div class="ligne-reglage">
            <span>Plafond<small>${b.plafond !== null ? `au plus${b.parPersonne ? ', par personne' : ''}` : 'aucun'}</small></span>
            ${interrupteur('plafond-actif', b.plafond !== null, 'Plafond')}
          </div>
          ${b.plafond !== null ? `<div class="ligne-reglage"><span>Au plus</span>${compteur('plafond', b.plafond, 'Plafond')}</div>` : ''}`
          }
          ${segments('qui', 'Pour qui', [['personne', 'Par personne'], ['partage', 'Partagé']], b.parPersonne ? 'personne' : 'partage')}
          <p class="lecture" aria-live="polite">${lecture(b)}</p>
          <p class="erreur-champ" id="f-valeur-erreur">${err.valeur ? `${ic('warning-circle')}${err.valeur}` : ''}</p>
        </fieldset>
        <div class="ligne-reglage ligne-seule">
          <span>Consommable<small>à racheter avant chaque voyage</small></span>
          ${interrupteur('consommable', b.consommable, 'Consommable')}
        </div>
        ${inclusion(b, err.etiquettes, { feminin: false, aideToujours: `Proposé dès que la catégorie « ${echapper(categorie.nom)} » l’est.`, groupesDispo: groupes })}
        <div class="champ champ-sans-message">
          <label for="f-note">Note <small>facultative, lue pendant le voyage</small></label>
          <textarea id="f-note" data-f="note" rows="3" maxlength="400">${echapper(b.note)}</textarea>
        </div>`,
  });
}
