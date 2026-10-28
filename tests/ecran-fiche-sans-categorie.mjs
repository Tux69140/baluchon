// Phase 8, relecture finale (point 4) : la fiche d'un objet du voyage (src/ecrans/fiche.js) s'ouvre et se
// repeint même sans la catégorie de l'objet (aucune ligne ne la montre alors) ; elle ne lève pas
// d'erreur. Le module est importé dans une page de l'appli : l'écran du voyage ne montre jamais un objet
// sans sa catégorie. Témoin : avec sa catégorie, la fiche en montre le nom.
import { chromium } from 'playwright';
import { creerJuge } from './outils/page.mjs';
import { demarrerServeur } from './outils/serveur.mjs';
import { DONNEES } from './outils/voyage-essai.mjs';

const juge = creerJuge();
const serveur = await demarrerServeur();
const navigateur = await chromium.launch();
const page = await navigateur.newPage();
const erreurs = [];
page.on('pageerror', e => erreurs.push(e.message));
page.on('console', m => m.type() === 'error' && erreurs.push(m.text()));
await page.goto(serveur.url);

const objet = DONNEES.objetsDuVoyage.find(o => o.id === 'o-pan');
const categorie = DONNEES.categoriesDuVoyage.find(c => c.id === objet.categorieId);
const resultats = await page.evaluate(
  async ({ objet, categorie }) => {
    const { ouvrirFiche } = await import('/src/ecrans/fiche.js');
    const t = cle => cle;
    const ouvrir = sienne => {
      const fin = new AbortController();
      try {
        const repeindre = ouvrirFiche({
          t,
          objet,
          categorie: sienne,
          surChangement() {},
          surQuantite() {},
          surRenommer() {},
          surRetirer: async () => {},
          surFermeture() {},
          signal: fin.signal,
          dans: document.body,
        });
        repeindre({ ...objet, dansLeSac: 1 });
        const fiche = document.querySelector('dialog.fiche-voyage');
        return {
          regle: fiche.querySelector('.fiche-regle').textContent,
          sac: fiche.querySelector('output').textContent,
        };
      } catch (erreur) {
        return { erreur: String(erreur) };
      } finally {
        fin.abort();
      }
    };
    return { sans: ouvrir(undefined), avec: ouvrir(categorie) };
  },
  { objet, categorie },
);

juge.exige(
  JSON.stringify(resultats.sans) === JSON.stringify({ regle: '', sac: '1' }),
  `sans catégorie : ${JSON.stringify(resultats.sans)}`,
);
juge.exige(
  JSON.stringify(resultats.avec) === JSON.stringify({ regle: categorie.nom, sac: '1' }),
  `témoin, avec sa catégorie : ${JSON.stringify(resultats.avec)}`,
);
juge.exige(erreurs.length === 0, `erreurs dans la page : ${erreurs.join(' | ')}`);

await navigateur.close();
await serveur.fermer();
juge.conclure('Fiche sans catégorie', 'ouverte et repeinte sans erreur, témoin avec sa catégorie');
