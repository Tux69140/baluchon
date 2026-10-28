// Outils des tests des fiches de la Bibliothèque (tests/ecran-bibliotheque-fiches*.mjs) : ouvrir la
// fiche d'une catégorie ou d'un objet depuis l'écran, lire ce qu'elle montre, son catalogue des
// pictos, et attendre qu'elle se ferme.
import { attendreQue, calme } from './attente.mjs';
import { disposition, fr, remplir } from './bibliotheque.mjs';
import { lireStockage } from './page.mjs';

export const m = fr.modele;
export const FICHE = 'dialog.fiche-modele';
export const CATALOGUE = 'dialog.catalogue';
// Le picto et le nom affichés d'un picto du catalogue.
export const nomPicto = cle => fr.catalogue.pictos[cle].nom;
export const exemple = quantite =>
  remplir(m.objet.exemple, { jours: '4 jours', nuits: '3 nuits', voyageurs: '2 voyageurs', quantite });

// Ce que montre la fiche ouverte ; null s'il n'y en a pas (ou si elle se ferme).
export const lireFiche = page =>
  page.evaluate(selecteur => {
    const d = [...document.querySelectorAll(selecteur)].find(x => x.open && !('fermeture' in x.dataset));
    if (!d) return null;
    const texte = el => el?.textContent.replace(/\s+/g, ' ').trim() ?? null;
    const q = s => d.querySelector(s);
    const pied = d.querySelector('.fenetre-pied .bouton-principal');
    return {
      titre: texte(q('h2')),
      sousTitre: texte(q('.fiche-regle')),
      bouton: texte(pied),
      boutonInactif: pied?.getAttribute('aria-disabled') === 'true',
      nom: q('#f-nom')?.value ?? null,
      pave: q('.apparence .pave')?.dataset.couleur ?? null,
      picto: texte(q('.apparence-nom')),
      couleurs: [...d.querySelectorAll('.teinte[aria-checked="true"]')].map(b => b.dataset.valeur),
      nuancier: d.querySelectorAll('.teinte').length,
      choix: [...d.querySelectorAll('input[type="radio"]:checked')].map(i => texte(i.closest('label'))),
      etiquettes: [...d.querySelectorAll('.puce-etiquette[aria-pressed="true"]')].map(texte),
      aide: texte(q('.champ-inclusion .aide')),
      valeur: q('input[data-nombre="valeur"]')?.value ?? null,
      plafondActif: q('[data-bascule="plafondActif"]')?.getAttribute('aria-checked') ?? null,
      plafond: q('input[data-nombre="plafond"]')?.value ?? null,
      lecture: [texte(q('.lecture b')), texte(q('.lecture span'))],
      erreurs: [...d.querySelectorAll('.erreur-champ')].map(texte).filter(Boolean),
      focus: document.activeElement?.id || document.activeElement?.dataset?.nombre || null,
      // Des balises nées d'un nom (Review Focus 1).
      balises: d.querySelectorAll('h2 *, .fiche-regle *').length,
    };
  }, FICHE);

// Une fiche (ou le catalogue) ouverte et calmée ; rend vrai si elle est venue.
export async function attendreOuverte(page, selecteur = FICHE) {
  const ouverte = await attendreQue(
    page,
    s => [...document.querySelectorAll(s)].some(d => d.matches(':modal') && !('fermeture' in d.dataset)),
    selecteur,
  );
  await calme(page);
  return Boolean(ouverte);
}

// Rend vrai si la fiche (ou le catalogue) a quitté la page.
export async function attendreFermee(page, selecteur = FICHE) {
  const fermee = await attendreQue(page, s => !document.querySelector(s), selecteur);
  await calme(page);
  return Boolean(fermee);
}

const carte = nom => `#app section.categorie:has(.categorie-nom > b:text-is(${JSON.stringify(nom)}))`;
// En grand format, la carte (trois colonnes) ou la tuile (repli) du menu, et la ligne qui porte la
// carte et son crayon.
const entree = nom => `#app .gf-menu [data-action="choisir"]:has(b:text-is(${JSON.stringify(nom)}))`;
const ligneDuMenu = nom => `#app .gf-menu li:has(> .choix b:text-is(${JSON.stringify(nom)}))`;

// La catégorie visible : choisie dans le menu (grand format) ou dépliée (téléphone).
export async function montrerCategorie(page, nom) {
  if ((await disposition(page)) !== 'telephone') await page.click(entree(nom));
  else if ((await page.getAttribute(`${carte(nom)} [data-action="accordeon"]`, 'aria-expanded')) !== 'true')
    await page.click(`${carte(nom)} [data-action="accordeon"]`);
  await calme(page);
}

// Le crayon de la catégorie : dans sa carte (téléphone, trois colonnes) ; en repli, « Modifier » au
// titre de la liste, une fois la catégorie choisie.
export async function ouvrirFicheCategorie(page, nom) {
  const ou = await disposition(page);
  if (ou === 'repli') {
    await montrerCategorie(page, nom);
    await page.click('#app .gf-liste-tete [data-action="modifier-categorie"]');
  } else {
    await page.click(`${ou === 'trois' ? ligneDuMenu(nom) : carte(nom)} [data-action="modifier-categorie"]`);
  }
  return attendreOuverte(page);
}

// Une seule commande « Nouvelle catégorie » quelle que soit la disposition : bouton flottant, bouton
// sous les cartes ou dernière tuile.
export async function ouvrirNouvelleCategorie(page) {
  await page.click('#app [data-action="nouvelle-categorie"]');
  return attendreOuverte(page);
}

export async function ouvrirFicheObjet(page, categorie, objet) {
  await montrerCategorie(page, categorie);
  await page.click(`#app li.objet-modele:has(.objet-nom:text-is(${JSON.stringify(objet)})) .objet-corps`);
  return attendreOuverte(page);
}

export async function ouvrirNouvelObjet(page, categorie) {
  await montrerCategorie(page, categorie);
  const dans = (await disposition(page)) === 'telephone' ? carte(categorie) : '#app .gf-liste';
  await page.click(`${dans} [data-action="nouvel-objet"]`);
  return attendreOuverte(page);
}

// Taper un texte dans un champ de la fiche (il remplace ce qui y était).
export async function saisir(page, selecteur, texte) {
  await page.fill(`${FICHE} ${selecteur}`, texte);
  await calme(page);
}

// force : toucher même une commande inactive (aria-disabled), que Playwright refuse sinon.
export async function toucher(page, selecteur, { force = false } = {}) {
  await page.click(`${FICHE} ${selecteur}`, { force });
  await calme(page);
}

// Un segment (bouton radio dessiné) par son libellé.
export const segment = (page, libelle) => toucher(page, `label.segment:has(span:text-is(${JSON.stringify(libelle)}))`);
export const enregistrer = page => toucher(page, '.fenetre-pied .bouton-principal');

// Le catalogue ouvert : ses thèmes, ses tuiles (clé), la tuile pressée, le compte, le message vide, sa
// hauteur.
export const lireCatalogue = page =>
  page.evaluate(selecteur => {
    const d = document.querySelector(`${selecteur}[open]`);
    if (!d) return null;
    const texte = el => el?.textContent.replace(/\s+/g, ' ').trim() ?? null;
    return {
      titre: texte(d.querySelector('h2')),
      themes: [...d.querySelectorAll('.theme h3')].map(texte),
      tuiles: [...d.querySelectorAll('.tuile')].map(b => b.dataset.picto),
      noms: [...d.querySelectorAll('.tuile .tuile-nom')].map(texte),
      pressee: [...d.querySelectorAll('.tuile[aria-pressed="true"]')].map(b => b.dataset.picto),
      compte: texte(d.querySelector('.catalogue-compte')),
      vide: texte(d.querySelector('.catalogue-vide')),
      hauteur: Math.round(d.getBoundingClientRect().height),
    };
  }, CATALOGUE);

export async function chercherPicto(page, mot) {
  await page.fill(`${CATALOGUE} input[type="search"]`, mot);
  await calme(page);
  return lireCatalogue(page);
}

// Les modèles gardés par le stockage.
export const bibliothequeStockee = async page => (await lireStockage(page)).bibliotheque;
export const idEtiquette = (bibliotheque, nom) => bibliotheque.etiquettes.find(e => e.nom === nom)?.id;

// L'élément éclairé après un enregistrement : son nom affiché (ligne, carte ou tuile).
export const eclaire = page =>
  page.evaluate(
    () =>
      document
        .querySelector('#app [data-recent]')
        ?.querySelector('.objet-nom, .categorie-nom > b, .gf-tuile-texte > b')
        ?.textContent.trim() ?? null,
  );
