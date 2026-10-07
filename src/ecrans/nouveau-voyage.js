// Écran Nouveau voyage (#/nouveau-voyage), étape Informations (US-9, US-10) : nom, destination,
// dates sur le calendrier unique, voyageurs. « Créer le voyage » copie la bibliothèque dans le voyage
// et ouvre sa liste. Les étapes des étiquettes et l'aperçu arrivent en phase 4.
import { remplir } from '../i18n/traduction.js';
import { dateDuJour } from '../modele/dates.js';
import { nouvelId } from '../modele/identifiant.js';
import { joursEtNuits } from '../modele/periode.js';
import { VOYAGEURS, genererVoyage, validerInformations } from '../modele/voyage.js';
import { creerCalendrier } from './calendrier.js';
import { formaterJourCourt, pluriel } from './format.js';
import { iconeInterface } from './icones.js';
import { lienRetour } from './retour.js';

// Les champs qui ont un message, dans l'ordre de l'écran : le premier en erreur reçoit le focus.
const CHAMPS = ['nom', 'dates'];

function resume({ depart, retour }, t, langue) {
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

function vue(t) {
  return `
    <main class="ecran">
      ${lienRetour(t)}
      <h1>${t('nouveauVoyage.titre')}</h1>
      <form class="formulaire" novalidate>
        <div class="champ">
          <label for="nom">${t('nouveauVoyage.nom')}</label>
          <input id="nom" name="nom" type="text" autocomplete="off" aria-describedby="erreur-nom" />
          <p class="erreur-champ" id="erreur-nom" aria-live="polite"></p>
        </div>
        <div class="champ">
          <label for="destination">${t('nouveauVoyage.destination')}</label>
          <input id="destination" name="destination" type="text" autocomplete="off" />
        </div>
        <fieldset class="champ" aria-describedby="resume-dates erreur-dates">
          <legend>${t('nouveauVoyage.dates')}</legend>
          <p class="resume-dates" id="resume-dates" aria-live="polite"></p>
          <div class="calendrier"></div>
          <p class="erreur-champ" id="erreur-dates" aria-live="polite"></p>
        </fieldset>
        <fieldset class="champ">
          <legend>${t('nouveauVoyage.voyageurs')}</legend>
          <div class="compteur">
            <button type="button" class="bouton-icone" data-voyageurs="-1" aria-label="${t('nouveauVoyage.moinsVoyageurs')}">${iconeInterface('moins')}</button>
            <output class="compteur-valeur" aria-live="polite"></output>
            <button type="button" class="bouton-icone" data-voyageurs="1" aria-label="${t('nouveauVoyage.plusVoyageurs')}">${iconeInterface('plus')}</button>
          </div>
        </fieldset>
        <button class="bouton bouton-principal" type="submit">${t('nouveauVoyage.creer')}</button>
        <!-- Sous le bouton : ce message tient sur deux lignes au téléphone et ne doit pas le déplacer. -->
        <p class="erreur-champ" id="erreur-creation" aria-live="polite"></p>
      </form>
    </main>`;
}

export const ecranNouveauVoyage = {
  nom: 'nouveau-voyage',
  charger: async ({ stockage }) => ({
    bibliotheque: await stockage.lireBibliotheque(),
    aujourdhui: dateDuJour(new Date()),
  }),
  dessiner(app, { bibliotheque, aujourdhui }, { stockage, t, langue, remplacerAdresse }) {
    const infos = { nom: '', destination: '', depart: null, retour: null, voyageurs: VOYAGEURS.parDefaut };
    // Les messages n'apparaissent qu'après un premier essai, puis suivent chaque correction.
    let essaye = false;
    let enregistrement = false;
    app.innerHTML = vue(t);
    const formulaire = app.querySelector('form');
    // Le champ que décrit un message est dit invalide au lecteur d'écran tant que le message est là.
    const message = (id, code) => {
      app.querySelector(`#erreur-${id}`).innerHTML = code
        ? `${iconeInterface('erreur')}<span>${t(`nouveauVoyage.erreurs.${code}`)}</span>`
        : '';
      const champ = app.querySelector(`[aria-describedby~="erreur-${id}"]`);
      if (code) champ?.setAttribute('aria-invalid', 'true');
      else champ?.removeAttribute('aria-invalid');
    };

    function rafraichir() {
      app.querySelector('#resume-dates').textContent = resume(infos, t, langue);
      app.querySelector('.compteur-valeur').textContent = infos.voyageurs;
      app.querySelector('[data-voyageurs="-1"]').setAttribute('aria-disabled', infos.voyageurs <= VOYAGEURS.min);
      app.querySelector('[data-voyageurs="1"]').setAttribute('aria-disabled', infos.voyageurs >= VOYAGEURS.max);
      if (!essaye) return;
      const erreurs = validerInformations(infos);
      for (const champ of CHAMPS) message(champ, erreurs[champ]);
    }

    creerCalendrier(app.querySelector('.calendrier'), {
      t,
      langue,
      aujourdhui,
      periode: infos,
      auChangement({ depart, retour }) {
        Object.assign(infos, { depart, retour });
        rafraichir();
      },
    });

    formulaire.addEventListener('input', ({ target }) => {
      if (target.name !== 'nom' && target.name !== 'destination') return;
      infos[target.name] = target.value;
      rafraichir();
    });

    formulaire.addEventListener('click', ({ target }) => {
      const bouton = target.closest('[data-voyageurs]');
      if (!bouton) return;
      const voulu = infos.voyageurs + Number(bouton.dataset.voyageurs);
      infos.voyageurs = Math.min(VOYAGEURS.max, Math.max(VOYAGEURS.min, voulu));
      rafraichir();
    });

    formulaire.addEventListener('submit', async evenement => {
      evenement.preventDefault();
      // Un double appui ne crée jamais deux voyages.
      if (enregistrement) return;
      essaye = true;
      message('creation', null);
      rafraichir();
      const erreurs = validerInformations(infos);
      const premier = CHAMPS.find(champ => erreurs[champ]);
      if (premier === 'nom') return app.querySelector('#nom').focus();
      if (premier === 'dates') return app.querySelector('.jour[tabindex="0"]').focus();
      // Les voyageurs sont bornés par − / + : une erreur ici serait une faute de programmation.
      if (erreurs.voyageurs) return message('creation', erreurs.voyageurs);
      enregistrement = true;
      try {
        const contenu = genererVoyage(bibliotheque, infos, { nouvelId, maintenant: new Date().toISOString() });
        await stockage.creerVoyage(contenu);
        // Remplacer l'adresse : le retour depuis la liste du voyage mène à Mes voyages, pas au formulaire.
        remplacerAdresse(`#/voyage/${contenu.voyage.id}`);
      } catch (erreur) {
        console.error(erreur);
        message('creation', 'enregistrement');
        enregistrement = false;
      }
    });

    rafraichir();
  },
};
