// Écran Nouveau voyage (#/nouveau-voyage), étape Informations (US-9, US-10) : nom, destination,
// dates sur le calendrier unique, voyageurs. « Créer le voyage » copie la bibliothèque dans le voyage
// et ouvre sa liste. Les étapes des étiquettes et l'aperçu arrivent en phase 4.
// Sur tablette et ordinateur, le formulaire s'ouvre en fenêtre modale par-dessus Mes voyages ; au
// téléphone, il occupe tout l'écran (décision du chef de projet, 2026-10-07).
import { remplir } from '../i18n/traduction.js';
import { dateDuJour } from '../modele/dates.js';
import { nouvelId } from '../modele/identifiant.js';
import { joursEtNuits } from '../modele/periode.js';
import { VOYAGEURS, genererVoyage, validerInformations } from '../modele/voyage.js';
import { creerCalendrier } from './calendrier.js';
import { ouvrirFenetre, vueFenetre } from './fenetre.js';
import { formaterJourCourt, pluriel } from './format.js';
import { iconeInterface } from './icones.js';
import { lienRetour } from './retour.js';
import { ecranVoyages } from './voyages.js';

// Les champs qui ont un message, dans l'ordre de l'écran : le premier en erreur reçoit le focus.
const CHAMPS = ['nom', 'dates'];
// Le choix se fait d'après le plus petit côté de l'écran de l'appareil, pas d'après la fenêtre : un
// téléphone tourné reste un téléphone, et un clavier qui s'ouvre (la fenêtre perd la moitié de sa
// hauteur) ne fait rien basculer (décision du contrôleur, 2026-10-07).
const COTE_MIN_FENETRE = 600;
const ID_TITRE = 'titre-nouveau-voyage';
// La fenêtre fermée, le focus revient au bouton de Mes voyages qui l'ouvre.
const OUVRE_LA_FENETRE = 'a[href="#/nouveau-voyage"]';

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

// « Annuler » ne sert que dans la fenêtre : au téléphone, le lien « Mes voyages » en tient lieu.
function vueFormulaire(t, { annuler }) {
  return `
      <form class="formulaire" novalidate>
        <div class="formulaire-corps">
          <div class="champ">
            <label for="nom">${t('nouveauVoyage.nom')}</label>
            <input id="nom" name="nom" type="text" autocomplete="off" aria-describedby="erreur-nom" />
            <p class="erreur-champ" id="erreur-nom" aria-live="polite"></p>
          </div>
          <div class="champ champ-sans-message">
            <label for="destination">${t('nouveauVoyage.destination')}</label>
            <input id="destination" name="destination" type="text" autocomplete="off" />
          </div>
          <fieldset class="champ champ-dates" aria-describedby="resume-dates erreur-dates">
            <legend>${t('nouveauVoyage.dates')}</legend>
            <p class="resume-dates" id="resume-dates" aria-live="polite"></p>
            <div class="calendrier"></div>
            <p class="erreur-champ" id="erreur-dates" aria-live="polite"></p>
          </fieldset>
          <fieldset class="champ champ-voyageurs">
            <legend>${t('nouveauVoyage.voyageurs')}</legend>
            <div class="compteur">
              <button type="button" class="bouton-icone" data-voyageurs="-1" aria-label="${t('nouveauVoyage.moinsVoyageurs')}">${iconeInterface('moins')}</button>
              <output class="compteur-valeur" aria-live="polite"></output>
              <button type="button" class="bouton-icone" data-voyageurs="1" aria-label="${t('nouveauVoyage.plusVoyageurs')}">${iconeInterface('plus')}</button>
            </div>
          </fieldset>
        </div>
        <div class="formulaire-pied">
          <div class="formulaire-actions">
            ${annuler ? `<button type="button" class="bouton bouton-secondaire" data-fermer>${t('fenetre.annuler')}</button>` : ''}
            <button class="bouton bouton-principal" type="submit">${t('nouveauVoyage.creer')}</button>
          </div>
          <p class="erreur-champ" id="erreur-creation" aria-live="polite"></p>
        </div>
      </form>`;
}

const vueEcranPlein = (t, contenu) => `
    <main class="ecran">
      ${lienRetour(t)}
      <h1 id="${ID_TITRE}">${t('nouveauVoyage.titre')}</h1>${contenu}
    </main>`;

export const ecranNouveauVoyage = {
  nom: 'nouveau-voyage',
  // Mes voyages est chargé aussi : il se voit derrière la fenêtre.
  charger: async contexte => {
    const [bibliotheque, accueil] = await Promise.all([
      contexte.stockage.lireBibliotheque(),
      ecranVoyages.charger(contexte),
    ]);
    return { bibliotheque, accueil, aujourdhui: dateDuJour(new Date()) };
  },
  dessiner(app, { bibliotheque, accueil, aujourdhui }, contexte) {
    const { stockage, t, langue, remplacerAdresse, revenirAccueil } = contexte;
    const infos = { nom: '', destination: '', depart: null, retour: null, voyageurs: VOYAGEURS.parDefaut };
    // Les messages n'apparaissent qu'après un premier essai, puis suivent chaque correction.
    let essaye = false;
    let enregistrement = false;
    const enFenetre = Math.min(screen.width, screen.height) >= COTE_MIN_FENETRE;
    if (enFenetre) {
      ecranVoyages.dessiner(app, accueil, contexte);
      const contenu = vueFormulaire(t, { annuler: true });
      app.insertAdjacentHTML(
        'beforeend',
        vueFenetre({ t, idTitre: ID_TITRE, titre: t('nouveauVoyage.titre'), contenu }),
      );
    } else app.innerHTML = vueEcranPlein(t, vueFormulaire(t, { annuler: false }));
    const formulaire = app.querySelector('form');
    const element = selecteur => formulaire.querySelector(selecteur);
    // Le champ que décrit un message est dit invalide au lecteur d'écran tant que le message est là.
    const message = (id, code) => {
      element(`#erreur-${id}`).innerHTML = code
        ? `${iconeInterface('erreur')}<span>${t(`nouveauVoyage.erreurs.${code}`)}</span>`
        : '';
      const champ = element(`[aria-describedby~="erreur-${id}"]`);
      if (code) champ?.setAttribute('aria-invalid', 'true');
      else champ?.removeAttribute('aria-invalid');
    };

    function rafraichir() {
      element('#resume-dates').textContent = resume(infos, t, langue);
      element('.compteur-valeur').textContent = infos.voyageurs;
      element('[data-voyageurs="-1"]').setAttribute('aria-disabled', infos.voyageurs <= VOYAGEURS.min);
      element('[data-voyageurs="1"]').setAttribute('aria-disabled', infos.voyageurs >= VOYAGEURS.max);
      if (!essaye) return;
      const erreurs = validerInformations(infos);
      for (const champ of CHAMPS) message(champ, erreurs[champ]);
    }

    creerCalendrier(element('.calendrier'), {
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
      if (premier === 'nom') return element('#nom').focus();
      if (premier === 'dates') return element('.jour[tabindex="0"]').focus();
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

    if (!enFenetre) return;
    // Fermer la fenêtre fait comme le lien « Mes voyages ». À l'ouverture, le focus va au nom à la
    // souris ; au doigt, au titre : le clavier surgirait et masquerait aussitôt le calendrier.
    const fenetre = app.querySelector('dialog');
    ouvrirFenetre(fenetre, { surFermeture: () => revenirAccueil({ focus: OUVRE_LA_FENETRE }) });
    const souris = matchMedia('(pointer: fine)').matches;
    (souris ? element('#nom') : fenetre.querySelector(`#${ID_TITRE}`)).focus();
  },
};
