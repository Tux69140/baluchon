// Outils des tests d'écran des Étiquettes (tests/ecran-etiquettes*.mjs) : ouvrir l'écran par
// Menu → Réglages → Étiquettes, lire ce qu'il montre (cartes, rangement), l'ordre gardé par le
// stockage.
import { attendreQue, calme } from './attente.mjs';
import { DONNEES, TOUS_FORMATS, fr, remplir } from './bibliotheque.mjs';
import { attendreEcran, lireStockage, ouvrir } from './page.mjs';

export const e = fr.etiquettes;
export const compter = (cle, n) => remplir(e[cle][n === 1 ? 'one' : 'other'], { n });
// « 3 étiquettes · étape 2 de « Nouveau voyage » ».
export const infos = (n, etape) => remplir(e.infos, { etiquettes: compter('etiquettes', n), n: etape });
// La bibliothèque de départ : chaque groupe et ses étiquettes, dans l'ordre.
export const DEPART = {
  Activités: ['Randonnée', 'Camping', 'Plage'],
  Climat: ['Chaud', 'Froid', 'Pluie'],
  Hébergement: ['Hôtel', 'Tente', 'Chez l’habitant'],
};

export const lire = page =>
  page.evaluate(() => {
    const texte = el => el?.textContent.replace(/\s+/g, ' ').trim() ?? null;
    const fleches = racine => {
      const monter = racine.querySelector(':scope > [data-action="monter"]');
      const descendre = racine.querySelector(':scope > [data-action="descendre"]');
      return {
        id: monter?.dataset.id,
        monter: monter?.getAttribute('aria-label'),
        descendre: descendre?.getAttribute('aria-label'),
        monterInactif: monter?.getAttribute('aria-disabled') === 'true',
        descendreInactif: descendre?.getAttribute('aria-disabled') === 'true',
      };
    };
    const reglage = document.querySelector('#app a.reglage[href="#/etiquettes"]');
    const cartes = [...document.querySelectorAll('#app .groupes > section.groupe')];
    return {
      ecran: document.querySelector('#app')?.dataset.ecran ?? null,
      titre: texte(document.querySelector('#app h1')),
      resume: texte(document.querySelector('.biblio-resume')),
      aide: texte(document.querySelector('#app p.aide.etiquettes-aide')),
      retour: texte(document.querySelector('#app a.lien-retour')),
      menu: Boolean(document.querySelector('#app [data-action="menu"]')),
      ranger: texte(document.querySelector('#app .outils [data-action="ranger"]')),
      nouveauGroupe: texte(document.querySelector('#app .bouton-flottant[data-action="nouveau-groupe"]')),
      reglage: reglage && {
        titre: texte(reglage.querySelector('.reglage-texte b')),
        aide: texte(reglage.querySelector('.reglage-texte span')),
        picto: Boolean(reglage.querySelector('.reglage-picto svg')),
      },
      cartes: cartes.map(s => ({
        id: s.dataset.groupe,
        nom: texte(s.querySelector('.groupe-titre b')),
        infos: texte(s.querySelector('.groupe-infos')),
        vide: texte(s.querySelector('.groupe-vide')),
        modifier: s.querySelector('[data-action="modifier-groupe"]')?.getAttribute('aria-label'),
        puces: [...s.querySelectorAll('.etiquettes-liste .puce-modele[data-action="modifier-etiquette"]')].map(b => ({
          id: b.dataset.id,
          nom: texte(b),
          libelle: b.getAttribute('aria-label'),
        })),
        ajout: texte(s.querySelector('.groupe-ajout[data-action="nouvelle-etiquette"]')),
        recent: s.hasAttribute('data-recent'),
      })),
      // Le nombre de colonnes de cartes : autant que de bords gauches distincts.
      colonnes: new Set(cartes.map(s => Math.round(s.getBoundingClientRect().left))).size,
      // Les cartes d'une même ligne ont la même hauteur.
      lignesEgales: cartes.every(s => {
        const r = s.getBoundingClientRect();
        return cartes.every(x => {
          const q = x.getBoundingClientRect();
          return Math.round(q.top) !== Math.round(r.top) || Math.abs(q.height - r.height) < 1;
        });
      }),
      recent: texte(document.querySelector('#app .puce[data-recent]')),
      rangement: [...document.querySelectorAll('#app .rangement ol.rang-arbre > li.rang-groupe')].map(li => ({
        nom: texte(li.querySelector(':scope > .rang-ligne b')),
        ...fleches(li.querySelector(':scope > .rang-ligne')),
        liste: li.querySelector('ol.rang-etiquettes')?.getAttribute('aria-label') ?? null,
        etiquettes: [...li.querySelectorAll('ol.rang-etiquettes > li.rang-ligne')].map(l => ({
          nom: texte(l.querySelector(':scope > span')),
          ...fleches(l),
        })),
      })),
      terminer: texte(document.querySelector('#app .rangement [data-action="terminer"]')),
      annonce: texte(document.querySelector('#app [aria-live]')),
      focus: { action: document.activeElement?.dataset.action, id: document.activeElement?.dataset.id },
      sorties: window.sortiesDemandees ?? null,
    };
  });

// L'ordre d'une vue (cartes ou rangement) ou du stockage, en une ligne : « Activités[Randonnée,…]|… ».
const arbre = groupes => groupes.map(([nom, siennes]) => `${nom}[${siennes.join(',')}]`).join('|');
export const arbreDesCartes = vue => arbre(vue.cartes.map(c => [c.nom, c.puces.map(p => p.nom)]));
export const arbreDuRangement = vue => arbre(vue.rangement.map(g => [g.nom, g.etiquettes.map(x => x.nom)]));
export const arbreDe = ordre => arbre(Object.entries(ordre));

export async function arbreStocke(page) {
  const { groupes = [], etiquettes = [] } = (await lireStockage(page)).bibliotheque ?? {};
  const parOrdre = (x, y) => x.ordre - y.ordre;
  return arbre(
    groupes.toSorted(parOrdre).map(g => [
      g.nom,
      etiquettes
        .filter(x => x.groupeId === g.id)
        .toSorted(parOrdre)
        .map(x => x.nom),
    ]),
  );
}

export const idGroupe = (vue, nom) => vue.cartes.find(c => c.nom === nom)?.id ?? null;
export const idEtiquette = (vue, nom) => vue.cartes.flatMap(c => c.puces).find(p => p.nom === nom)?.id ?? null;

// Menu → Réglages → Étiquettes, depuis l'accueil.
export async function ouvrirEtiquettes(
  navigateur,
  url,
  format = 'telephone',
  { theme = 'light', donnees = DONNEES } = {},
) {
  const { taille, ecran, tactile } = TOUS_FORMATS[format];
  const ouvert = await ouvrir(navigateur, url, { taille, ecran, tactile, theme, donnees, adresse: '#/voyages' });
  ouvert.page.setDefaultTimeout(5000);
  await attendreEcran(ouvert.page, 'voyages');
  await versReglages(ouvert.page);
  await ouvert.page.click('#app a.reglage[href="#/etiquettes"]');
  await attendreEcran(ouvert.page, 'etiquettes');
  return ouvert;
}

async function versReglages(page) {
  await page.click('[data-action="menu"]');
  await attendreQue(page, () => document.querySelector('dialog.tiroir[open]') !== null);
  await calme(page);
  await page.click(`dialog.tiroir .tiroir-lien:text-is("${fr.menu.reglages}")`);
  await attendreEcran(page, 'reglages');
}

// Attend que le rangement montre cet ordre (arbre) ; rend ce qu'on voit alors.
export async function attendreRangement(page, attendu) {
  await attendreQue(
    page,
    voulu =>
      [...document.querySelectorAll('#app ol.rang-arbre > li.rang-groupe')]
        .map(
          li =>
            `${li.querySelector(':scope > .rang-ligne b').textContent.trim()}[${[
              ...li.querySelectorAll('ol.rang-etiquettes > li > span'),
            ]
              .map(s => s.textContent.trim())
              .join(',')}]`,
        )
        .join('|') === voulu,
    attendu,
  );
  await calme(page);
  return lire(page);
}

// Libère, l'une après l'autre, les écritures lentes en attente (lenteurs) ; rend leur nombre.
export async function libererEcritures(page, { max = 1 } = {}) {
  let liberees = 0;
  while (liberees < max) {
    const libere = await attendreQue(
      page,
      () => {
        if (typeof window.debloquerStockage !== 'function') return false;
        const debloquer = window.debloquerStockage;
        window.debloquerStockage = null;
        debloquer();
        return true;
      },
      undefined,
      { max: 1500 },
    );
    if (!libere) break;
    liberees += 1;
  }
  return liberees;
}
