// Les gestes d'ajustement de l'écran d'un voyage, depuis la fiche d'un objet (spec de la phase 8,
// docs/superpowers/specs/2026-10-28-phase-8-ajuster-design.md ; maquette validée docs/maquettes/ajuster/) :
// corriger la quantité prévue (US-18), renommer, retirer avec son « Annuler » (US-21) ; et, depuis l'écran,
// ajouter un objet (US-19, US-20), puis proposer de l'ajouter aussi à la bibliothèque. Rien d'autre ne
// touche la bibliothèque. Les règles (bornes, confirmation, ce qu'emporte un retrait) viennent du modèle
// (src/modele/ajustements.js) ; l'écran du voyage (src/ecrans/voyage.js) garde le contenu, le dessin et la
// file d'écriture, et les prête ici :
// - contenu() : le voyage tel que l'écran le montre ;
// - appliquer(nouveau, ecriture) : le changement montré aussitôt, l'écriture dans la file ; refusée, l'écran
//   relit et le dit au bas de l'écran (la quantité, comme une coche) ;
// - attendre(ecriture) : l'écriture dans la file, après celles en cours, sans rien montrer avant elle
//   (le renommage, le retrait et l'ajout : refusés, rien ne change) ;
// - montrer(nouveau) : ce qu'une écriture attendue a fait, montré.
import { remplir } from '../i18n/traduction.js';
import { achetesApresQuantite, basculerAAcheter as basculer } from '../modele/courses.js';
import { boutonsDeQuantite, extraitDuRetrait, reglageDeQuantite, validerRenommage } from '../modele/ajustements.js';
import { BORNES_QUANTITE } from '../modele/modeles.js';
import { proposerBibliotheque } from './ajout-bibliotheque.js';
import { alerterEnHaut } from './alerte.js';
import { montrerAnnulation, sansAnnuler } from './annulation.js';
import { demander } from './fenetre.js';
import { ouvrirAjout } from './fiche-ajout.js';
import { ouvrirFicheModele } from './fiche-modele.js';
import { champNom } from './fiche-modele-vues.js';
import { pluriel } from './format.js';
import { echapper } from './html.js';

// Le contenu du voyage où l'objet id a ces champs changés.
export const avecObjet = (contenu, id, champs) => ({
  ...contenu,
  objets: contenu.objets.map(o => (o.id === id ? { ...o, ...champs } : o)),
});

// « 3 pièces », en gras dans la phrase qui l'accueille ({compte}), comme les questions chiffrées de la
// phase 7 (src/ecrans/suppression-textes.js ; maquette docs/maquettes/ajuster/fiches.js).
const comptePieces = (t, n, langue) => `<b>${echapper(pluriel(t, 'ajustement.pieces', n, langue))}</b>`;

// ecran : { t, langue, stockage, app (la racine de l'appli), signal (la fin de l'écran), contenu, appliquer,
// attendre, montrer } (voir plus haut). Rend les gestes que la fiche déclenche.
export function gestesDAjustement(ecran) {
  const { t, langue, stockage, app, signal } = ecran;
  const objetDe = id => ecran.contenu().objets.find(o => o.id === id);

  // « Sortir … du sac ? », à la fermeture de la fiche qui a baissé la quantité prévue sous ce qui est déjà
  // dans le sac (décisions du chef de projet, 2026-10-28 et 2026-10-29) : « Garder N » (la quantité écrite)
  // ou « Retirer N » (les pièces qui sortent). Rend true pour « Retirer », false pour « Garder », null si la
  // question est fermée sans réponse (la fiche reste ouverte).
  async function confirmerBaisse(id, quantite) {
    const objet = objetDe(id);
    if (!objet) return false;
    const sortent = objet.dansLeSac - reglageDeQuantite(objet, quantite).dansLeSac;
    const reponse = await demander({
      t,
      titre: pluriel(t, 'ajustement.baisse.titre', sortent, langue),
      texteHtml: remplir(echapper(pluriel(t, 'ajustement.baisse.texte', sortent, langue)), {
        compte: comptePieces(t, objet.dansLeSac, langue),
        nom: echapper(objet.nom),
        quantite,
      }),
      signal,
      boutons: [
        { cle: 'garder', libelle: remplir(t('ajustement.baisse.garder'), { n: objet.quantite }) },
        { cle: 'retirer', libelle: remplir(t('ajustement.baisse.retirer'), { n: sortent }), principal: true },
      ],
    });
    return reponse === null ? null : reponse === 'retirer';
  }

  // La quantité prévue s'enregistre et devient manuelle, définitivement ; le sac suit une quantité qui passe
  // dessous (la fiche a déjà eu l'accord : confirmerBaisse). Jamais sous 1 ni, en montant, au-delà de ce que
  // + permet (boutonsDeQuantite).
  function regler(id, quantite) {
    const objet = objetDe(id);
    if (!objet || quantite === objet.quantite) return;
    if (quantite > objet.quantite ? !boutonsDeQuantite(objet).plus : quantite < BORNES_QUANTITE.min) return;
    const { dansLeSac } = reglageDeQuantite(objet, quantite);
    const achetes = achetesApresQuantite(objet, quantite);
    const modifieLe = new Date().toISOString();
    ecran.appliquer(
      avecObjet(ecran.contenu(), id, { quantite, dansLeSac, achetes, quantiteManuelle: true, modifieLe }),
      () => stockage.reglerQuantite(id, quantite, dansLeSac, achetes, modifieLe),
    );
  }

  // L'interrupteur « À acheter » de la fiche (phase 9) : montré aussitôt, écrit dans la file. Pas de bandeau
  // « Annuler » ici : le rallumer, au même endroit, rattrape l'erreur (choix de la conception).
  function basculerAAcheter(id) {
    const objet = objetDe(id);
    if (!objet) return;
    const { aAcheter, achetes } = basculer(objet);
    const modifieLe = new Date().toISOString();
    ecran.appliquer(avecObjet(ecran.contenu(), id, { aAcheter, achetes, modifieLe }), () =>
      stockage.reglerAchats(id, aAcheter, achetes, modifieLe),
    );
  }

  // « Renommer » : une fiche au nom seul, comme celles des étiquettes ; refusée, elle reste ouverte avec
  // sa saisie et le message en haut (src/ecrans/fiche-modele.js). Ce voyage seulement.
  function renommer(id) {
    const objet = objetDe(id);
    if (!objet) return;
    ouvrirFicheModele({
      t,
      titre: t('ajustement.renommer.titre'),
      sousTitre: t('ajustement.ajout.voyageSeulement'),
      bouton: t('modele.enregistrer'),
      classe: 'fiche-nom',
      champInitial: '#f-nom',
      saisie: { nom: objet.nom },
      valider: validerRenommage,
      dessiner: (brouillon, erreurs) =>
        champNom(t, brouillon.nom, erreurs.nom && t(`modele.objet.erreurs.${erreurs.nom}`), { entree: true }),
      texteAbandon: remplir(t('ajustement.renommer.abandon'), { nom: objet.nom }),
      async enregistrer({ nom }) {
        const net = nom.trim();
        const modifieLe = new Date().toISOString();
        await ecran.attendre(() => stockage.renommerObjetDuVoyage(id, net, modifieLe));
        if (!signal.aborted && objetDe(id)) ecran.montrer(avecObjet(ecran.contenu(), id, { nom: net, modifieLe }));
      },
      signal,
      dans: app,
    });
  }

  // La question avant de retirer : ce qui part avec l'objet (ses pièces, sa catégorie s'il est le dernier).
  async function confirmerRetrait(objet) {
    const { categorie } = extraitDuRetrait(ecran.contenu(), objet.id);
    const suite = [];
    if (objet.dansLeSac)
      suite.push(
        remplir(echapper(pluriel(t, 'ajustement.retrait.pieces', objet.dansLeSac, langue)), {
          compte: comptePieces(t, objet.dansLeSac, langue),
        }),
      );
    if (categorie)
      suite.push(remplir(echapper(t('ajustement.retrait.derniere')), { categorie: echapper(categorie.nom) }));
    const reponse = await demander({
      t,
      titre: remplir(t('ajustement.retrait.titre'), { nom: objet.nom }),
      texte: t('ajustement.retrait.bibliotheque'),
      idTexte: 'retrait-texte',
      suite,
      signal,
      boutons: [
        { cle: 'garder', libelle: t('ajustement.retrait.garder') },
        { cle: 'retirer', libelle: t('ajustement.retrait.retirer'), danger: true },
      ],
    });
    return reponse === 'retirer';
  }

  // « Annuler » : les mêmes lignes réécrites à l'identique, puis l'écran ouvert sur ce voyage le montre
  // (événement « voyage-retabli ») ; depuis un autre écran, le voyage relu le montrera.
  function proposerAnnulation(extrait) {
    const { objet, categorie } = extrait;
    const texte = categorie
      ? remplir(t('ajustement.retrait.bandeauCategorie'), { nom: objet.nom, categorie: categorie.nom })
      : remplir(t('ajustement.retrait.bandeau'), { nom: objet.nom });
    montrerAnnulation({
      t,
      app,
      texte,
      voyage: objet.voyageId,
      async annuler() {
        await stockage.retablirDansLeVoyage(extrait);
        const detail = { voyageId: objet.voyageId, objetId: objet.id, categorieId: objet.categorieId };
        window.dispatchEvent(new CustomEvent('voyage-retabli', { detail }));
      },
    });
  }

  // « Retirer du voyage » : la question, puis une seule écriture, dans la file. Refusée, rien ne change et
  // le message le dit, sans bandeau. Faite, l'objet (et sa catégorie devenue vide) quitte l'écran, la
  // fiche se ferme, et le bandeau « Annuler » prend le relais pour 10 s. Au moment d'écrire, après les
  // écritures d'avant et sous la garde du bandeau (sansAnnuler : après un « Annuler » en cours, et
  // « Annuler » inactif jusqu'à la fin), le voyage est relu : l'extrait vient de ce que la base garde,
  // qu'un « Annuler » vient peut-être de changer sans que l'écran l'ait encore montré (relecture finale
  // de la phase 8, point 1).
  async function retirer(id) {
    const objet = objetDe(id);
    if (!objet || !(await confirmerRetrait(objet)) || signal.aborted) return;
    let extrait;
    try {
      extrait = await ecran.attendre(() =>
        sansAnnuler(async () => {
          const relu = await stockage.lireVoyage(objet.voyageId);
          if (!relu?.objets.some(o => o.id === id)) return null;
          const avant = extraitDuRetrait(relu, id);
          await stockage.retirerDuVoyage(id);
          return avant;
        }),
      );
    } catch (erreur) {
      console.error(erreur);
      if (!signal.aborted) alerterEnHaut(app, t('ajustement.retrait.erreur'), signal);
      return;
    }
    if (!extrait) return;
    if (!signal.aborted) {
      const contenu = ecran.contenu();
      ecran.montrer({
        ...contenu,
        categories: contenu.categories.filter(c => c.id !== extrait.categorie?.id),
        objets: contenu.objets.filter(o => o.id !== id),
      });
    }
    proposerAnnulation(extrait);
  }

  // « Ajouter un objet », la fiche partie de la catégorie depuis (ou d'aucune) : une seule écriture, dans la
  // file. Refusée, la fiche reste ouverte avec sa saisie ; faite, le stockage surveillé retire le bandeau
  // d'un retrait de ce voyage (src/ecrans/annulation.js). Rend ce qui a été écrit ({ categorie, objet }),
  // ou null : à l'écran de le montrer.
  const ajouter = depuis =>
    ouvrirAjout({
      t,
      langue,
      contenu: ecran.contenu,
      choisie: depuis,
      signal,
      dans: app,
      ajouter: ajout => ecran.attendre(() => stockage.ajouterAuVoyage(ajout)),
    });

  // « Ajouter aussi à la bibliothèque ? », après un ajout (l'objet écrit, src/ecrans/ajout-bibliotheque.js).
  // Entré dans la bibliothèque, l'objet du voyage est lié à son modèle, et sa catégorie à celle créée depuis
  // elle : l'écran garde ces liens comme la base, pour qu'« Annuler » un retrait les réécrive.
  async function proposer(objet) {
    const categorie = ecran.contenu().categories.find(c => c.id === objet.categorieId);
    const liens = await proposerBibliotheque({ t, langue, stockage, objet, categorie, signal, dans: app });
    if (!liens || signal.aborted) return;
    const { objetModeleId, categorieModeleId } = liens;
    const contenu = avecObjet(ecran.contenu(), objet.id, { modeleId: objetModeleId });
    ecran.montrer({
      ...contenu,
      categories: contenu.categories.map(c =>
        c.id === categorie.id && categorieModeleId ? { ...c, modeleId: categorieModeleId } : c,
      ),
    });
  }

  return { regler, basculerAAcheter, confirmerBaisse, renommer, retirer, ajouter, proposer };
}
