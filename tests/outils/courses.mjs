// Outils des tests d'écran des Courses (tests/ecran-courses.mjs, tests/ecran-courses-fiche.mjs) : le voyage
// d'essai avec des objets à acheter, l'écran ouvert, ce qu'il montre, le bandeau et ce que le stockage garde.
import { attendreQue } from './attente.mjs';
import { BANDEAU } from './ajuster.mjs';
import { TOUS_FORMATS } from './bibliotheque.mjs';
import { attendreEcran, ouvrir } from './page.mjs';
import { DONNEES } from './voyage-essai.mjs';

// Marqués : Dentifrice (Toilette, 1), Café soluble (Alimentation, 1), Repas (Alimentation, 16, 6 achetés).
// marques : d'autres objets ou d'autres champs, { id: champs }.
export const avecMarques = (marques = {}) => {
  const tous = { 'o-den': {}, 'o-caf': {}, 'o-rep': { achetes: 6 }, ...marques };
  return {
    ...DONNEES,
    objetsDuVoyage: DONNEES.objetsDuVoyage.map(o => (o.id in tous ? { ...o, aAcheter: true, ...tous[o.id] } : o)),
  };
};

export async function ouvrirCourses(
  navigateur,
  url,
  { format = 'telephone', theme = 'light', donnees = avecMarques(), voyageId = 'v1' } = {},
) {
  const { taille, ecran, tactile } = TOUS_FORMATS[format];
  const ouvert = await ouvrir(navigateur, url, {
    taille,
    ecran,
    tactile,
    theme,
    donnees,
    adresse: `#/voyage/${voyageId}/courses`,
  });
  ouvert.page.setDefaultTimeout(5000);
  await attendreEcran(ouvert.page, 'courses');
  return ouvert;
}

// Ce que montre l'écran Courses.
export const lireCourses = page =>
  page.evaluate(() => {
    const texte = el => el?.textContent.replace(/[ \t\r\n]+/g, ' ').trim() ?? null;
    const main = document.querySelector('#app main');
    return {
      titre: texte(main.querySelector('h1')),
      icone: Boolean(main.querySelector('h1 svg')),
      details: texte(main.querySelector('.courses-details')),
      vide: texte(main.querySelector('.courses-vide h2')),
      cartes: [...main.querySelectorAll('.courses-categorie')].map(carte => ({
        nom: texte(carte.querySelector('.categorie-nom')),
        objets: [...carte.querySelectorAll('.objet')].map(li => ({
          id: li.dataset.id,
          nom: li.querySelector('.objet-nom').textContent,
          balises: li.querySelectorAll('.objet-nom *').length,
          quantite: texte(li.querySelector('.objet-quantite')),
          etat: li.dataset.etat,
        })),
      })),
    };
  });
export const objetsVus = vue => vue.cartes.flatMap(carte => carte.objets);
export const texteBandeau = page =>
  page.evaluate(s => {
    const b = document.querySelector(s);
    return b?.matches(':popover-open') ? { texte: b.querySelector('p').textContent, chariot: b.innerHTML } : null;
  }, BANDEAU);
export const attendreStocke = (page, id, condition) =>
  attendreQue(
    page,
    ([id, c]) => {
      const o = JSON.parse(localStorage.getItem('baluchon-essai')).objetsDuVoyage.find(x => x.id === id);
      return new Function('o', `return ${c}`)(o) && o;
    },
    [id, condition],
  );
export const caseDe = id => `#app .objet[data-id="${id}"] .case`;
