// Phase 11 (docs/superpowers/specs/2026-10-30-phase-11-refaire-supprimer-design.md, « Refaire ce voyage » ;
// maquette validée le 2026-10-30, docs/maquettes/refaire/, états refaire-infos et refaire-etiquettes) :
// l'assistant ouvert en mode « refaire » depuis le menu « ⋮ » du voyage ou de sa carte.
// - aux quatre formats × 2 thèmes : fenêtre par-dessus le voyage (téléphone : plein écran), titrée
//   « Refaire « … » » (nom piégé échappé) ; nom, destination et dates vides, 3 voyageurs repris ;
//   Randonnée reprise et cochée, Plongée (supprimée de la bibliothèque) absente, Pluie non cochée ;
//   cibles de 44 px, pas de défilement de côté ; captures Informations et étiquettes ;
// - fermer sans rien saisir ne demande rien et rend le voyage ; après un nom saisi, « Abandonner ce
//   nouveau voyage ? » (les étiquettes, comme à la création, attendent nom et dates : une étiquette
//   changée seule ne se produit pas à l'écran) ;
// - le retour système sans saisie rend le voyage ; après la saisie, il recule d'une étape, puis pose la
//   question d'abandon ;
// - « Créer le voyage » ouvre le nouveau voyage ; le retour mène au voyage d'origine, inchangé (relu égal) ;
// - depuis la carte : Mes voyages derrière la fenêtre (téléphone : lien « Mes voyages ») ; fermer rend
//   Mes voyages et le focus au bouton « ⋮ » de la carte ; le voyage créé, le retour mène à Mes voyages ;
// - un voyage inconnu : « Voyage introuvable », par les deux adresses ;
// - Vigilance 5 : un nom d'origine très long ne fait rien déborder à 393 px.
import { mkdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { chromium } from 'playwright';
import { calme } from './outils/attente.mjs';
import { attendreQuestion, question, repondre, retourDansLAssistant } from './outils/assistant.mjs';
import { fermerEssai } from './outils/bibliotheque.mjs';
import {
  CAPTURES,
  NOMS_THEME,
  RACINE,
  attendreEcran,
  creerJuge,
  verifierBarres,
  verifierCommandes,
} from './outils/page.mjs';
import {
  NOM_ORIGINE,
  QUATRE,
  V,
  carte,
  contenuStocke,
  donneesOrigine,
  ouvrirEssai,
  refaireDepuisLaCarte,
  refaireDepuisLeVoyage,
  remplirInfos,
  versApercu,
  voyageOuvert,
} from './outils/refaire.mjs';
import { demarrerServeur } from './outils/serveur.mjs';

const fr = JSON.parse(await readFile(join(RACINE, 'src/i18n/fr.json'), 'utf8'));
const nv = fr.nouveauVoyage;
const NB = '\u00a0';
const vu = e => JSON.stringify(e);
const titreAttendu = nom => `Refaire «${NB}${nom}${NB}»`;
const juge = creerJuge();
const serveur = await demarrerServeur();
const navigateur = await chromium.launch();

// L'assistant tel qu'il s'ouvre : fenêtre ou plein écran, ce qu'on voit derrière, titre, informations.
const lireAssistant = page =>
  page.evaluate(() => {
    const texte = el => el?.textContent.replace(/[ \t\r\n]+/g, ' ').trim() ?? null;
    const fenetre = document.querySelector('dialog.assistant[open]');
    return {
      fenetre: fenetre !== null,
      voyageDerriere: document.querySelector('#app > main .voyage-titre') !== null,
      voyagesDerriere: document.querySelector('#app > main .carte-voyage') !== null,
      titre: texte(document.querySelector('.assistant h1, .assistant h2')),
      balises: document.querySelectorAll('.assistant h1 *, .assistant .fenetre-entete h2 *').length,
      retour: texte(document.querySelector('.assistant .lien-retour')),
      nom: document.querySelector('#nom')?.value ?? null,
      destination: document.querySelector('#destination')?.value ?? null,
      dates: texte(document.querySelector('#resume-dates')),
      voyageurs: texte(document.querySelector('.compteur-valeur')),
      etape: document.querySelector('.formulaire-corps')?.dataset.etape ?? null,
    };
  });
const puces = page =>
  page.evaluate(() =>
    Object.fromEntries(
      [...document.querySelectorAll('.assistant .puce-etiquette')].map(p => [
        p.textContent.trim(),
        p.getAttribute('aria-pressed'),
      ]),
    ),
  );
const aller = async (page, indice) => {
  await page.click(`.assistant [data-aller="${indice}"]`);
  await calme(page);
};
// « × » ou Échap dans la fenêtre ; au téléphone, le lien du haut.
async function fermer(page, format) {
  if (format === 'telephone') await page.click('.assistant .lien-retour');
  else await page.keyboard.press('Escape');
  await calme(page);
}

try {
  await mkdir(CAPTURES, { recursive: true });

  // Aux quatre formats, clair et sombre : ce qui est repris, et les captures.
  for (const format of Object.keys(QUATRE))
    for (const theme of ['light', 'dark']) {
      const cas = `${format} ${NOMS_THEME[theme]}`;
      const capture = (page, nom) =>
        page.screenshot({ path: join(CAPTURES, `${nom}-${format}-${NOMS_THEME[theme]}.png`) });
      const ouvert = await ouvrirEssai(navigateur, serveur.url, { format, theme });
      const { page } = ouvert;
      await attendreEcran(page, 'voyage');
      await refaireDepuisLeVoyage(page);
      const vue = await lireAssistant(page);
      const enFenetre = format !== 'telephone';
      juge.exige(
        vu(vue) ===
          vu({
            fenetre: enFenetre,
            voyageDerriere: enFenetre,
            voyagesDerriere: false,
            titre: titreAttendu(NOM_ORIGINE),
            balises: 0,
            retour: enFenetre ? null : NOM_ORIGINE,
            nom: '',
            destination: '',
            dates: nv.resume.vide,
            voyageurs: '3',
            etape: 'infos',
          }),
        `${cas} : assistant ouvert ${vu(vue)}`,
      );
      await capture(page, 'refaire-infos');
      await verifierCommandes(page, juge, `${cas} Informations`);
      // Les étiquettes attendent, comme à la création, des informations valides.
      await remplirInfos(page);
      await aller(page, 1);
      const activites = await puces(page);
      juge.exige(
        vu(activites) === vu({ Randonnée: 'true' }),
        `${cas} : étiquettes d'Activités reprises ${vu(activites)}`,
      );
      await verifierCommandes(page, juge, `${cas} étiquettes`);
      await capture(page, 'refaire-etiquettes');
      await aller(page, 2);
      const climat = await puces(page);
      juge.exige(vu(climat) === vu({ Pluie: 'false' }), `${cas} : étiquettes de Climat ${vu(climat)}`);
      await verifierBarres(page, juge, `${cas} étiquettes`);
      await fermerEssai(juge, cas, ouvert);
    }

  for (const [format, theme] of [
    ['telephone', 'light'],
    ['tablette-paysage', 'dark'],
  ]) {
    const cas = `${format} ${NOMS_THEME[theme]}`;
    const ouvert = await ouvrirEssai(navigateur, serveur.url, { format, theme });
    const { page } = ouvert;
    await attendreEcran(page, 'voyage');
    const origine = await contenuStocke(page, V);

    // Fermer sans rien saisir : aucune question, le voyage revient.
    await refaireDepuisLeVoyage(page);
    await fermer(page, format);
    juge.exige((await question(page)) === null, `${cas} : question sans saisie ${vu(await question(page))}`);
    await attendreEcran(page, 'voyage');
    juge.exige(
      (await page.evaluate(() => location.hash)) === `#/voyage/${V}`,
      `${cas} : fermé sans saisie, adresse ${await page.evaluate(() => location.hash)}`,
    );

    // Un nom saisi : la question d'abandon de la création.
    await refaireDepuisLeVoyage(page);
    await page.fill('#nom', 'Quiberon 2027');
    await fermer(page, format);
    const abandon = await attendreQuestion(page);
    juge.exige(abandon?.titre === nv.abandon.titre, `${cas} : abandon après le nom ${vu(abandon)}`);
    await repondre(page, nv.abandon.abandonner);
    await attendreEcran(page, 'voyage');

    // Le retour système, sans saisie : le voyage revient.
    await refaireDepuisLeVoyage(page);
    await retourDansLAssistant(page);
    await attendreEcran(page, 'voyage');
    juge.exige(
      (await page.evaluate(() => location.hash)) === `#/voyage/${V}`,
      `${cas} : retour système sans saisie ${await page.evaluate(() => location.hash)}`,
    );

    // Le retour système recule d'une étape ; à Informations, après la saisie, la question d'abandon.
    await refaireDepuisLeVoyage(page);
    await remplirInfos(page);
    await page.click('.assistant [data-action="suivant"]');
    await calme(page);
    const avance = await lireAssistant(page);
    await retourDansLAssistant(page);
    const recul = await lireAssistant(page);
    juge.exige(
      avance.etape === 'groupe' && recul.etape === 'infos',
      `${cas} : retour système depuis Activités ${vu([avance.etape, recul.etape])}`,
    );
    await retourDansLAssistant(page);
    const retour = await attendreQuestion(page);
    juge.exige(retour?.titre === nv.abandon.titre, `${cas} : retour système après saisie ${vu(retour)}`);
    await repondre(page, nv.abandon.abandonner);
    await attendreEcran(page, 'voyage');

    // « Créer le voyage » : le nouveau voyage s'ouvre ; le retour mène au voyage d'origine, inchangé.
    await refaireDepuisLeVoyage(page);
    await remplirInfos(page);
    await versApercu(page);
    await page.click('.assistant [data-action="creer"]');
    const cree = await voyageOuvert(page);
    const titre = await page.textContent('#app h1');
    juge.exige(cree && cree !== V && titre === 'Quiberon 2027', `${cas} : voyage créé ${vu({ cree, titre })}`);
    await page.goBack();
    await attendreEcran(page, 'voyage');
    juge.exige(
      (await page.evaluate(() => location.hash)) === `#/voyage/${V}`,
      `${cas} : retour après la création ${await page.evaluate(() => location.hash)}`,
    );
    const relu = await contenuStocke(page, V);
    juge.exige(vu(relu) === vu(origine), `${cas} : le voyage d'origine a changé ${vu(relu)}`);
    await fermerEssai(juge, cas, ouvert);

    // Depuis la carte : Mes voyages derrière ; fermer rend le focus au « ⋮ » de la carte.
    const accueil = await ouvrirEssai(navigateur, serveur.url, { format, theme, adresse: '#/voyages' });
    const p = accueil.page;
    await attendreEcran(p, 'voyages');
    await refaireDepuisLaCarte(p, V);
    const depuisCarte = await lireAssistant(p);
    const enFenetre = format !== 'telephone';
    juge.exige(
      depuisCarte.fenetre === enFenetre &&
        depuisCarte.voyagesDerriere === enFenetre &&
        depuisCarte.retour === (enFenetre ? null : fr.voyages.titre) &&
        depuisCarte.titre === titreAttendu(NOM_ORIGINE),
      `${cas} : depuis la carte ${vu(depuisCarte)}`,
    );
    await fermer(p, format);
    await attendreEcran(p, 'voyages');
    const focus = await p.evaluate(
      s => document.activeElement === document.querySelector(`${s} > .menu-voyage-bouton`),
      carte(V),
    );
    juge.exige(!enFenetre || focus, `${cas} : focus au retour sur Mes voyages ${focus}`);
    await refaireDepuisLaCarte(p, V);
    await remplirInfos(p, 'Quiberon encore');
    await versApercu(p);
    await p.click('.assistant [data-action="creer"]');
    const autre = await voyageOuvert(p);
    juge.exige(autre && autre !== V, `${cas} : voyage créé depuis la carte ${autre}`);
    await p.goBack();
    await attendreEcran(p, 'voyages');
    juge.exige(
      (await contenuStocke(p, V)).objets.length === origine.objets.length,
      `${cas} : voyage d'origine après la création depuis la carte`,
    );
    await fermerEssai(juge, `${cas} carte`, accueil);
  }

  // Un voyage inconnu, par l'une ou l'autre adresse : « Voyage introuvable ».
  for (const adresse of ['#/voyage/inconnu/refaire', '#/voyages/refaire/inconnu']) {
    const ouvert = await ouvrirEssai(navigateur, serveur.url, { adresse });
    await attendreEcran(ouvert.page, 'refaire-voyage');
    const titre = await ouvert.page.textContent('#app h1');
    juge.exige(titre === fr.voyage.introuvableTitre, `${adresse} : ${vu(titre)}`);
    await fermerEssai(juge, adresse, ouvert);
  }

  // Vigilance 5 : un nom d'origine très long, au téléphone.
  {
    const long = `Tour de Bretagne à vélo de Saint-Malo à Quiberon ${'Kerhostinarbrevelanbihan'.repeat(3)}`;
    const ouvert = await ouvrirEssai(navigateur, serveur.url, { donnees: donneesOrigine({ nom: long }) });
    const { page } = ouvert;
    await attendreEcran(page, 'voyage');
    await refaireDepuisLeVoyage(page);
    const titre = await page.evaluate(() => {
      const h = document.querySelector('.assistant h1');
      return { texte: h.textContent, deborde: h.scrollWidth - h.clientWidth };
    });
    juge.exige(titre.texte === titreAttendu(long) && titre.deborde <= 0, `téléphone, nom long : titre ${vu(titre)}`);
    await verifierCommandes(page, juge, 'téléphone, nom long');
    await page.screenshot({ path: join(CAPTURES, 'refaire-nom-long-telephone-clair.png') });
    await fermerEssai(juge, 'téléphone, nom long', ouvert);
  }
} finally {
  await navigateur.close();
  await serveur.fermer();
}
juge.conclure('Refaire ce voyage', 'repris, abandon, retour système, création, carte, nom long');
