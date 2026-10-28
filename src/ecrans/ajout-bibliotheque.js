// « Ajouter aussi à la bibliothèque ? », posée après l'ajout d'un objet au voyage (spec de la phase 8,
// docs/superpowers/specs/2026-10-28-phase-8-ajuster-design.md ; maquette validée le 2026-10-28,
// docs/maquettes/ajuster/maquette.js, proposerBibliotheque). « Oui » ouvre les fiches habituelles de la
// bibliothèque (src/ecrans/fiche-objet.js, fiche-categorie.js), préremplies depuis le voyage (décisions 1
// et 2 du chef de projet) :
// - la catégorie du voyage vient d'une catégorie qui existe encore dans la bibliothèque : la fiche d'objet,
//   dans celle-ci ;
// - sinon, la liste des catégories de la bibliothèque (src/ecrans/choix-categorie.js) : une catégorie
//   choisie, puis la fiche d'objet ; ou « Nouvelle catégorie » : sa fiche, dont « Suivant » n'écrit rien,
//   puis la fiche d'objet, dans cette catégorie à venir.
// Rien n'est écrit avant le dernier bouton, « Ajouter à la bibliothèque » : la catégorie neuve, l'objet
// modèle et les liens du voyage entrent ensemble, en une opération (ajouterALaBibliotheque). Abandonner en
// chemin laisse la bibliothèque intacte. Les saisies de départ et la préparation des lignes viennent du
// modèle.
import { remplir } from '../i18n/traduction.js';
import { saisieCategoriePourLaBibliotheque, saisieObjetPourLaBibliotheque } from '../modele/ajustements.js';
import { nouvelId } from '../modele/identifiant.js';
import { groupesAvecEtiquettes, parOrdre } from '../modele/inclusion.js';
import { preparerCategorie, preparerObjet } from '../modele/modeles.js';
import { alerterEnHaut, annoncerEnHaut } from './alerte.js';
import { sansAnnuler } from './annulation.js';
import { choisirCategorie } from './choix-categorie.js';
import { demander } from './fenetre.js';
import { ouvrirFicheCategorie } from './fiche-categorie.js';
import { ouvrirFicheObjet } from './fiche-objet.js';
import { pluriel } from './format.js';

const b = 'ajustement.bibliotheque';

// Une fiche ouverte par ouvrir({ garder, surFermeture }), attendue : sa promesse rend ce que son
// enregistrement a gardé (garder(valeur)), ou null (abandonnée, ou l'écran parti avec signal, qui
// l'emporte sans la fermer).
function attendreFiche(ouvrir, signal) {
  return new Promise(resoudre => {
    let retenu = null;
    const partir = () => resoudre(null);
    signal.addEventListener('abort', partir, { once: true });
    ouvrir({
      garder(valeur) {
        retenu = valeur;
      },
      surFermeture() {
        signal.removeEventListener('abort', partir);
        resoudre(retenu);
      },
    });
  });
}

// Où ranger l'objet dans la bibliothèque, la catégorie du voyage n'y étant pas : { existante } (une
// catégorie choisie), { neuve } (la saisie de « Nouvelle catégorie », pas encore écrite), ou null.
async function choisirRangement(contexte, { bibliotheque, objet, categorie }) {
  const { t, langue, signal, dans } = contexte;
  const categories = [...bibliotheque.categories].sort(parOrdre);
  const choix = await choisirCategorie({
    t,
    titre: t(`${b}.choixTitre`),
    texte: remplir(t(`${b}.choixTexte`), { categorie: categorie.nom, nom: objet.nom }),
    lignes: categories.map(c => ({
      ...c,
      sousTitre: pluriel(
        t,
        'ajustement.choix.objets',
        bibliotheque.objets.filter(o => o.categorieId === c.id).length,
        langue,
      ),
    })),
    nouvelle: remplir(t(`${b}.creer`), { categorie: categorie.nom }),
    signal,
    dans,
  });
  if (!choix || signal.aborted) return null;
  if (choix !== 'nouvelle') return { existante: categories.find(c => c.id === choix) };
  // « Suivant » garde la saisie, validée par la fiche, sans rien écrire : la catégorie attend l'objet.
  const neuve = await attendreFiche(
    ({ garder, surFermeture }) =>
      ouvrirFicheCategorie({
        ...contexte,
        categorie: null,
        prerempli: saisieCategoriePourLaBibliotheque(categorie),
        bouton: t(`${b}.suivant`),
        enregistrer: async saisie => garder(saisie),
        surFermeture,
      }),
    signal,
  );
  return neuve && { neuve };
}

// L'écriture unique. Le rang d'une catégorie neuve se calcule sur les catégories relues au moment d'écrire,
// relecture et écriture ensemble sous la garde du bandeau (comme editerCategorie,
// src/ecrans/edition-modeles.js). Les ids sont ceux tirés au début : un nouvel essai après une panne
// réécrit les mêmes lignes, jamais un second objet. Rend les liens écrits.
function ecrire(stockage, { saisie, rangement, ids, objetDuVoyage, categorieDuVoyage }) {
  return sansAnnuler(async () => {
    const maintenant = new Date().toISOString();
    const { categories } = await stockage.lireBibliotheque();
    const neuve = rangement.neuve
      ? preparerCategorie(rangement.neuve, { categories, nouvelId: () => ids.categorie, maintenant })
      : null;
    const modele = preparerObjet(saisie, {
      categorieId: neuve?.id ?? rangement.existante.id,
      nouvelId: () => ids.objet,
      maintenant,
    });
    await stockage.ajouterALaBibliotheque({
      categorie: neuve,
      objet: modele,
      objetDuVoyage,
      // La catégorie du voyage n'est liée qu'à celle créée depuis elle, jamais à une catégorie choisie.
      categorieDuVoyage: neuve ? categorieDuVoyage : null,
    });
    return { objetModeleId: modele.id, categorieModeleId: neuve?.id ?? null };
  });
}

// objet, categorie : l'objet du voyage tout juste ajouté et sa catégorie du voyage. dans : la racine de
// l'appli, où s'ouvrent les fiches et se disent les messages ; signal : la fin de l'écran. Rend une
// promesse : les liens écrits ({ objetModeleId, categorieModeleId }, ce dernier null sans catégorie
// neuve) une fois l'objet entré dans la bibliothèque, ou null (« Non », abandon, écran parti).
export async function proposerBibliotheque({ t, langue, stockage, objet, categorie, signal, dans }) {
  const reponse = await demander({
    t,
    titre: remplir(t(`${b}.question`), { nom: objet.nom }),
    texte: t(`${b}.questionTexte`),
    signal,
    boutons: [
      { cle: 'non', libelle: t(`${b}.non`) },
      { cle: 'oui', libelle: t(`${b}.oui`), principal: true, icone: 'bibliotheque' },
    ],
  });
  if (reponse !== 'oui' || signal.aborted) return null;
  let bibliotheque;
  try {
    bibliotheque = await stockage.lireBibliotheque();
  } catch (erreur) {
    console.error(erreur);
    if (!signal.aborted) alerterEnHaut(dans, t('voyage.erreurModification'), signal);
    return null;
  }
  if (signal.aborted) return null;
  const contexte = { t, langue, groupes: groupesAvecEtiquettes(bibliotheque), signal, dans };
  const connue = bibliotheque.categories.find(c => c.id === categorie.modeleId);
  const rangement = connue
    ? { existante: connue }
    : await choisirRangement(contexte, { bibliotheque, objet, categorie });
  if (!rangement || signal.aborted) return null;
  const ids = { categorie: nouvelId(), objet: nouvelId() };
  const liens = await attendreFiche(
    ({ garder, surFermeture }) =>
      ouvrirFicheObjet({
        ...contexte,
        objet: null,
        categorie: rangement.existante ?? { nom: rangement.neuve.nom.trim() },
        prerempli: saisieObjetPourLaBibliotheque(objet),
        bouton: t(`${b}.ajouter`),
        enregistrer: async saisie =>
          garder(
            await ecrire(stockage, {
              saisie,
              rangement,
              ids,
              objetDuVoyage: objet.id,
              categorieDuVoyage: categorie.id,
            }),
          ),
        surFermeture,
      }),
    signal,
  );
  if (liens && !signal.aborted) annoncerEnHaut(dans, remplir(t(`${b}.fait`), { nom: objet.nom }), signal);
  return liens;
}
