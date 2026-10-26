// Fiches de l'écran Étiquettes (maquette, phase 6) : un groupe, une étiquette. Chaque fiche crée ou
// modifie (nom seul) ; une fiche existante porte aussi « Supprimer », qui demande confirmation
// (décision du chef de projet, 2026-10-26 : simple confirmation, chiffrage et « Annuler » en phase 7).
// Mécanique reprise de la maquette de la bibliothèque : brouillon, « Abandonner les modifications ? ».
import { alerte, confirmer, echapper, ic, ouvrir } from '../bibliotheque/outils.js';

// Deux noms sont « le même » sans tenir compte des majuscules ni des espaces autour ; les accents
// comptent (« Ete » ≠ « Été »), décision de la conception.
const cle = nom => nom.trim().toLocaleLowerCase('fr');

// La liste des noms en toutes lettres : « Chaud, Froid et Pluie ».
export const enToutesLettres = noms =>
  noms.length < 2 ? noms.join('') : `${noms.slice(0, -1).join(', ')} et ${noms.at(-1)}`;

// La question avant une suppression : « Garder » d'abord, « Supprimer » en rouge.
export function confirmerSuppression({ titre, texte }) {
  return new Promise(resoudre => {
    const d = document.createElement('dialog');
    d.className = 'fenetre confirmation';
    d.setAttribute('role', 'alertdialog');
    d.setAttribute('aria-labelledby', 'suppression-titre');
    d.setAttribute('aria-describedby', 'suppression-texte');
    d.innerHTML = `
      <header class="fenetre-entete"><h2 id="suppression-titre" tabindex="-1">${titre}</h2></header>
      <p id="suppression-texte">${texte}</p>
      <div class="fenetre-pied">
        <button type="button" class="bouton bouton-secondaire" data-fermer>Garder</button>
        <button type="button" class="bouton bouton-danger" data-oui>${ic('trash')}Supprimer</button>
      </div>`;
    let reponse = false;
    const { fermer } = ouvrir(d, { surFermeture: () => resoudre(reponse) });
    d.querySelector('[data-oui]').addEventListener('click', () => {
      reponse = true;
      fermer();
    });
  });
}

// Une fiche à un seul champ, le nom. valider(nom) rend le message d'erreur, ou ''.
function fiche({ titre, sousTitre, aide, bouton, nom, valider, enregistrer, supprimer, texteSupprimer, abandon, panne }) {
  const depart = nom;
  let valeur = nom;
  let tente = false;
  const d = document.createElement('dialog');
  d.className = 'fenetre fiche fiche-modele fiche-nom';
  d.setAttribute('aria-labelledby', 'fiche-titre');
  d.innerHTML = `
      <header class="fenetre-entete">
        <h2 id="fiche-titre" tabindex="-1">${titre}</h2>
        <button type="button" class="bouton-icone bouton-fermer" data-fermer aria-label="Fermer">${ic('x')}</button>
      </header>
      <div class="fiche-corps">
        <p class="fiche-regle">${sousTitre}</p>
        <div class="champ">
          <label for="f-nom">Nom</label>
          <input id="f-nom" data-f="nom" value="${echapper(nom)}" autocomplete="off" maxlength="60" aria-describedby="f-nom-erreur f-nom-aide" />
          <p class="erreur-champ" id="f-nom-erreur"></p>
        </div>
        <p class="aide" id="f-nom-aide">${aide}</p>
        ${supprimer ? `<div class="zone-suppression"><button type="button" class="bouton bouton-supprimer" data-f="supprimer">${ic('trash')}${texteSupprimer}</button></div>` : ''}
      </div>
      <div class="fenetre-pied">
        <button type="button" class="bouton bouton-secondaire" data-fermer>Annuler</button>
        <button type="button" class="bouton bouton-principal" data-f="enregistrer">${bouton}</button>
      </div>`;
  const champ = d.querySelector('#f-nom');
  const message = d.querySelector('#f-nom-erreur');
  const montrer = () => {
    const erreur = tente ? valider(valeur) : '';
    champ.setAttribute('aria-invalid', String(Boolean(erreur)));
    message.innerHTML = erreur ? `${ic('warning-circle')}${erreur}` : '';
    return erreur;
  };
  const garde = async () =>
    valeur === depart ||
    confirmer({ titre: 'Abandonner les modifications ?', texte: abandon, annuler: 'Continuer la saisie', action: 'Abandonner' });
  const { fermer } = ouvrir(d, { garde });
  // Ombre sur le pied tant qu'il reste à défiler : « Supprimer » peut être dessous, au téléphone couché.
  const zone = d.querySelector('.fiche-corps');
  const ombrer = () =>
    d.querySelector('.fenetre-pied').toggleAttribute('data-ombre', zone.scrollTop + zone.clientHeight < zone.scrollHeight - 2);
  zone.addEventListener('scroll', ombrer);
  ombrer();
  champ.addEventListener('input', () => {
    valeur = champ.value;
    montrer();
    ombrer();
  });
  // Entrée vaut « Enregistrer » : un seul champ, on tape le nom et on valide.
  champ.addEventListener('keydown', e => {
    if (e.key === 'Enter') d.querySelector('[data-f="enregistrer"]').click();
  });
  d.addEventListener('click', async e => {
    const f = e.target.closest('[data-f]')?.dataset.f;
    if (f === 'enregistrer') {
      tente = true;
      if (montrer()) return champ.focus();
      if (panne()) return alerte('La modification n’a pas pu être enregistrée. Votre saisie est gardée ; réessayez.');
      enregistrer(valeur.trim());
      fermer();
    } else if (f === 'supprimer') {
      if (!(await supprimer())) return;
      if (panne()) return alerte('La suppression n’a pas pu être enregistrée. Rien n’a changé ; réessayez.');
      fermer();
    }
  });
  return { d, saisir: texte => ((champ.value = texte), champ.dispatchEvent(new Event('input'))) };
}

// ---------- Étiquette ----------
// demanderSuppression (facultatif, maquette de la phase 7) remplace la simple confirmation : rend true
// une fois la suppression faite.
export function ficheEtiquette({ etiquette, groupe, groupes, panne, surEnregistrer, surSupprimer, demanderSuppression }) {
  const autre = nom =>
    groupes.flatMap(g => g.etiquettes.map(e => ({ e, g }))).find(({ e }) => e !== etiquette && cle(e.nom) === cle(nom));
  return fiche({
    titre: etiquette ? echapper(etiquette.nom) : 'Nouvelle étiquette',
    sousTitre: `Dans le groupe « ${echapper(groupe.nom)} »`,
    aide: 'Le nom tel qu’il apparaîtra en puce dans « Nouveau voyage » et dans les fiches de la bibliothèque.',
    bouton: etiquette ? 'Enregistrer' : 'Ajouter l’étiquette',
    nom: etiquette?.nom ?? '',
    panne,
    abandon: etiquette ? `Ce que vous avez changé dans « ${echapper(etiquette.nom)} » ne sera pas enregistré.` : 'La nouvelle étiquette ne sera pas ajoutée.',
    valider: nom => {
      if (!nom.trim()) return 'Donnez un nom à cette étiquette.';
      const deja = autre(nom);
      if (!deja) return '';
      return deja.g === groupe
        ? `L’étiquette « ${echapper(deja.e.nom)} » existe déjà dans ce groupe.`
        : `L’étiquette « ${echapper(deja.e.nom)} » existe déjà, dans le groupe ${echapper(deja.g.nom)}.`;
    },
    enregistrer: surEnregistrer,
    texteSupprimer: 'Supprimer l’étiquette',
    supprimer:
      etiquette &&
      (demanderSuppression ??
      (async () => {
        const oui = await confirmerSuppression({
          titre: `Supprimer l’étiquette « ${echapper(etiquette.nom)} » ?`,
          texte: 'Elle ne sera plus proposée dans « Nouveau voyage », et les catégories et objets de la bibliothèque qui la portent la perdent. Les voyages déjà créés ne changent pas.',
        });
        if (oui && !panne()) surSupprimer();
        return oui;
      })),
  });
}

// ---------- Groupe ----------
export function ficheGroupe({ groupe, groupes, panne, surEnregistrer, surSupprimer, demanderSuppression }) {
  const n = groupe?.etiquettes.length ?? 0;
  return fiche({
    titre: groupe ? echapper(groupe.nom) : 'Nouveau groupe',
    sousTitre: groupe ? (n ? `${n} étiquette${n > 1 ? 's' : ''}` : 'Aucune étiquette') : 'Ses étiquettes s’ajoutent ensuite, dans sa carte.',
    aide: 'Ce nom est le titre de son étape dans « Nouveau voyage ».',
    bouton: groupe ? 'Enregistrer' : 'Créer le groupe',
    nom: groupe?.nom ?? '',
    panne,
    abandon: groupe ? `Ce que vous avez changé dans « ${echapper(groupe.nom)} » ne sera pas enregistré.` : 'Le nouveau groupe ne sera pas créé.',
    valider: nom => {
      if (!nom.trim()) return 'Donnez un nom à ce groupe.';
      const deja = groupes.find(g => g !== groupe && cle(g.nom) === cle(nom));
      return deja ? `Le groupe « ${echapper(deja.nom)} » existe déjà.` : '';
    },
    enregistrer: surEnregistrer,
    texteSupprimer: 'Supprimer le groupe',
    supprimer:
      groupe &&
      (demanderSuppression ??
      (async () => {
        const noms = groupe.etiquettes.map(e => echapper(e.nom));
        const oui = await confirmerSuppression({
          titre: `Supprimer le groupe « ${echapper(groupe.nom)} » ?`,
          texte: `${
            noms.length
              ? `${noms.length > 1 ? 'Ses étiquettes' : 'Son étiquette'} ${enToutesLettres(noms)} ${noms.length > 1 ? 'seront supprimées' : 'sera supprimée'} aussi, et son étape disparaîtra de « Nouveau voyage ». `
              : ''
          }Les voyages déjà créés ne changent pas.`,
        });
        if (oui && !panne()) surSupprimer();
        return oui;
      })),
  });
}
