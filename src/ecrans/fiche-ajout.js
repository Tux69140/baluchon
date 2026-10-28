// « Ajouter un objet » à un voyage, et « Nouvelle catégorie » pour ce voyage seulement (spec de la phase 8,
// docs/superpowers/specs/2026-10-28-phase-8-ajuster-design.md, US-19 et US-20 ; maquette validée le
// 2026-10-28, docs/maquettes/ajuster/fiches.js). Deux fiches de la mécanique commune
// (src/ecrans/fiche-modele.js) : brouillon, abandon demandé, écriture refusée qui garde la saisie.
// - « Ajouter un objet » : nom, catégorie (une ligne qui ouvre la liste de choix, src/ecrans/choix-categorie.js),
//   quantité pour tout le voyage. Rien n'est écrit avant « Ajouter » ;
// - « Nouvelle catégorie » : nom, picto et couleur, ceux de la fiche de catégorie de la bibliothèque
//   (src/ecrans/fiche-categorie.js) sans « Dans quels voyages ? ». « Choisir » la rend à la fiche d'ajout,
//   sans rien écrire : elle naît avec l'objet, jamais vide.
// Les règles (validation, objet fixé à la main, rang de la catégorie neuve) sont celles du modèle
// (src/modele/ajustements.js).
import { preparerAjout, validerAjout, validerNouvelleCategorie } from '../modele/ajustements.js';
import { nouvelId } from '../modele/identifiant.js';
import { saisieDeCategorie } from '../modele/modeles.js';
import { listeParCategorie } from '../modele/voyage.js';
import { choisirCategorie, paveNouveau } from './choix-categorie.js';
import { actionCatalogue, vueApparence } from './fiche-categorie.js';
import { attendreFiche, ouvrirFicheModele } from './fiche-modele.js';
import { champNom, compteur, message } from './fiche-modele-vues.js';
import { pluriel } from './format.js';
import { echapper } from './html.js';
import { iconeInterface, paveCategorie } from './icones.js';

// Le champ « Nom » de « Nouvelle catégorie », ouverte par-dessus la fiche d'ajout qui a déjà le sien.
const ID_NOM_CATEGORIE = 'f-nom-categorie';
const ID_AIDE_QUANTITE = 'f-quantite-aide';

// La ligne « Catégorie » : le pavé, le nom et ce que contient la retenue (une du voyage, ou la neuve), ou
// « À choisir » ; elle ouvre la liste. rangee : { categorie, objets } de la retenue du voyage, ou null.
function vueChampCategorie(t, langue, { nouvelle, rangee }, erreur) {
  let pave = paveNouveau();
  let nom = t('ajustement.ajout.aChoisir');
  let sous = t('ajustement.ajout.aChoisirAide');
  if (nouvelle) {
    pave = paveCategorie(nouvelle);
    nom = nouvelle.nom;
    sous = t('ajustement.ajout.nouvelleSousTitre');
  } else if (rangee) {
    pave = paveCategorie(rangee.categorie);
    nom = rangee.categorie.nom;
    sous = pluriel(t, 'ajustement.ajout.objetsDansCeVoyage', rangee.objets.length, langue);
  }
  return `
        <div class="champ">
          <span class="champ-titre" id="f-categorie-titre">${t('ajustement.ajout.categorie')}</span>
          <button type="button" class="champ-categorie" data-action="categorie" aria-haspopup="dialog" aria-labelledby="f-categorie-titre f-categorie-nom f-categorie-sous" aria-describedby="f-categorie-erreur"${erreur ? ' aria-invalid="true"' : ''}>
            ${pave}
            <span class="refus-texte"><b id="f-categorie-nom">${echapper(nom)}</b><span id="f-categorie-sous">${echapper(sous)}</span></span>
            <span class="chevron">${iconeInterface('suivant')}</span>
          </button>
          ${message('f-categorie-erreur', erreur)}
        </div>`;
}

// « Nouvelle catégorie » pour ce voyage. initiale : { nom, icone, couleur } déjà choisis (la liste rouverte
// reprend la saisie), sinon ceux d'une catégorie neuve de la bibliothèque. Rend une promesse : { nom (rogné),
// icone, couleur }, ou null (abandonnée, ou l'écran parti avec signal). Rien n'est écrit.
function ouvrirNouvelleCategorie({ t, langue, initiale = null, signal, dans }) {
  const { nom, icone, couleur } = initiale ?? saisieDeCategorie(null);
  return attendreFiche(
    ({ garder, surFermeture }) =>
      ouvrirFicheModele({
        t,
        titre: t('modele.categorie.nouvelle'),
        sousTitre: t('ajustement.nouvelleCategorie.texte'),
        bouton: t('ajustement.nouvelleCategorie.choisir'),
        classe: 'fiche-nouvelle-categorie',
        idTitre: 'nouvelle-categorie-titre',
        saisie: { nom, icone, couleur },
        valider: validerNouvelleCategorie,
        dessiner: (b, erreurs) =>
          champNom(t, b.nom, erreurs.nom && t(`modele.categorie.erreurs.${erreurs.nom}`), { id: ID_NOM_CATEGORIE }) +
          vueApparence(t, b),
        titreAbandon: t('ajustement.nouvelleCategorie.abandonTitre'),
        texteAbandon: t('modele.categorie.abandonNouvelle'),
        async enregistrer(b) {
          garder({ nom: b.nom.trim(), icone: b.icone, couleur: b.couleur });
        },
        actions: { catalogue: actionCatalogue({ t, langue, signal, dans }) },
        surFermeture,
        signal,
        dans,
      }),
    signal,
  );
}

// « Ajouter un objet ». contenu() : le voyage tel que l'écran le montre (ses catégories dans leur ordre) ;
// choisie : l'id de la catégorie d'où part la fiche, ou null. ajouter(ajout) : écrit { categorie, objet }
// (src/modele/ajustements.js, preparerAjout) et rend une promesse ; refusée, la fiche reste ouverte avec
// sa saisie et le message de panne en haut. Rend une promesse : ce qui a été écrit, ou null (abandonnée,
// ou l'écran parti avec signal).
export function ouvrirAjout({ t, langue, contenu, choisie = null, signal, dans, ajouter }) {
  // Tirés à l'ouverture : un nouvel essai après une panne réécrit les mêmes lignes, jamais un second objet.
  const ids = { categorie: nouvelId(), objet: nouvelId() };
  const rangeeDe = id => listeParCategorie(contenu()).find(r => r.categorie.id === id) ?? null;
  // La retenue : la neuve, ou une catégorie du voyage qui existe toujours.
  const retenue = b => ({
    nouvelle: b.categorie?.nouvelle ?? null,
    rangee: b.categorie?.nouvelle ? null : rangeeDe(b.categorie),
  });
  const valider = b => {
    const { nouvelle, rangee } = retenue(b);
    return validerAjout({ ...b, categorie: nouvelle || rangee ? b.categorie : null });
  };
  return attendreFiche(
    ({ garder, surFermeture }) =>
      ouvrirFicheModele({
        t,
        titre: t('ajustement.ajout.titre'),
        sousTitre: t('ajustement.ajout.voyageSeulement'),
        bouton: t('ajustement.ajout.ajouter'),
        iconeBouton: 'plus',
        classe: 'fiche-ajout',
        saisie: { nom: '', categorie: choisie, quantite: 1 },
        valider,
        dessiner: (b, erreurs) => `
        ${champNom(t, b.nom, erreurs.nom && t(`modele.objet.erreurs.${erreurs.nom}`))}${vueChampCategorie(
          t,
          langue,
          retenue(b),
          erreurs.categorie && t(`modele.objet.erreurs.${erreurs.categorie}`),
        )}
        <div class="ligne-reglage ligne-seule">
          <span>${t('ajustement.ajout.quantite')}<small id="${ID_AIDE_QUANTITE}">${t('ajustement.ajout.pourToutLeVoyage')}</small></span>
          ${compteur(t, { cle: 'quantite', valeur: b.quantite, libelle: t('ajustement.ajout.quantite'), idMessage: ID_AIDE_QUANTITE, defaut: 1 })}
        </div>`,
        titreAbandon: t('ajustement.ajout.abandon.titre'),
        texteAbandon: t('ajustement.ajout.abandon.texte'),
        textePanne: t('ajustement.ajout.erreur'),
        async enregistrer(b) {
          const tirage = b.categorie?.nouvelle ? [ids.categorie, ids.objet] : [ids.objet];
          const ajout = preparerAjout(b, contenu(), {
            nouvelId: () => tirage.shift(),
            maintenant: new Date().toISOString(),
          });
          await ajouter(ajout);
          garder(ajout);
        },
        actions: {
          // La liste des catégories du voyage, dans son ordre, puis « Nouvelle catégorie ». De retour, le
          // focus revient sur la ligne « Catégorie » (la fiche la redessine et le garde).
          async categorie(b) {
            const choix = await choisirCategorie({
              t,
              titre: t('ajustement.choix.titre'),
              lignes: listeParCategorie(contenu()).map(({ categorie, objets }) => ({
                ...categorie,
                sousTitre: pluriel(t, 'ajustement.choix.objets', objets.length, langue),
              })),
              choisie: b.categorie?.nouvelle ? null : b.categorie,
              nouvelle: t('ajustement.choix.pourCeVoyage'),
              signal,
              dans,
            });
            if (choix === 'nouvelle') {
              const nouvelle = await ouvrirNouvelleCategorie({
                t,
                langue,
                initiale: b.categorie?.nouvelle,
                signal,
                dans,
              });
              if (nouvelle) b.categorie = { nouvelle };
            } else if (choix) b.categorie = choix;
            dans.querySelector('dialog.fiche-ajout [data-action="categorie"]')?.focus();
          },
        },
        surFermeture,
        signal,
        dans,
      }),
    signal,
  );
}
