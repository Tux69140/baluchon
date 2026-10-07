// Les outils communs des tests d'écran (tests/outils/page.mjs) jugent juste : un filet qui crie à
// tort, ou qui se tait devant une faute, ne protège rien. Pages d'essai montées avec les styles de
// l'appli (jetons.css, socle.css), sans serveur.
// - Témoin : une page plus haute que l'écran, bien rangée entre les barres système, bouton flottant
//   compris, ne donne aucune faute — défilée, son contenu passe forcément sous une bande.
// - Exemple fautif : la même page avec un élément fixé tout en bas, sous la barre du bas, est
//   signalée, et c'est bien cet élément qui est nommé.
import { join } from 'node:path';
import { chromium } from 'playwright';
import { FORMATS, RACINE, creerJuge, verifierBarres } from './outils/page.mjs';

const juge = creerJuge();
const paragraphes = Array.from({ length: 60 }, (_, i) => `<p>Paragraphe ${i + 1}</p>`).join('');
const PAGE = `<!doctype html>
  <body>
    <div id="app" data-ecran="essai">
      <main class="ecran">
        <h1>Essai</h1>
        ${paragraphes}
        <button class="bouton bouton-principal bouton-flottant" type="button">Flottant</button>
        <!--FAUTE-->
      </main>
    </div>
    <div class="zone-systeme" data-zone="haut"></div>
    <div class="zone-systeme" data-zone="bas"></div>
    <div class="zone-systeme" data-zone="gauche"></div>
    <div class="zone-systeme" data-zone="droite"></div>
  </body>`;
const FAUTE = '<button type="button" style="position: fixed; bottom: 0; left: 50%">Sous la barre</button>';

// Un juge qui garde ses fautes, pour regarder ce que l'outil a trouvé.
function releveur() {
  const fautes = [];
  return { fautes, exige: (condition, message) => condition || fautes.push(message) };
}

async function essayer(navigateur, html) {
  const page = await navigateur.newPage({ viewport: FORMATS.telephone });
  await page.setContent(html);
  for (const feuille of ['jetons.css', 'socle.css'])
    await page.addStyleTag({ path: join(RACINE, 'src/styles', feuille) });
  const hauteur = await page.evaluate(() => document.documentElement.scrollHeight / window.innerHeight);
  const releve = releveur();
  await verifierBarres(page, releve, 'essai');
  await page.close();
  return { hauteur, fautes: releve.fautes };
}

const navigateur = await chromium.launch();
try {
  const temoin = await essayer(navigateur, PAGE);
  juge.exige(temoin.hauteur > 2, `témoin : la page devrait dépasser deux écrans (${temoin.hauteur.toFixed(1)})`);
  juge.exige(temoin.fautes.length === 0, `témoin : fautes signalées à tort : ${temoin.fautes.join(' | ')}`);

  const fautif = await essayer(navigateur, PAGE.replace('<!--FAUTE-->', FAUTE));
  juge.exige(
    fautif.fautes.length === 1 && fautif.fautes[0].includes('« Sous la barre »'),
    `exemple fautif : l’élément sous la barre du bas devrait être seul signalé (${fautif.fautes.join(' | ') || 'rien'})`,
  );
} finally {
  await navigateur.close();
}

juge.conclure('Outils des tests d’écran', 'barres système : témoin sans faute, exemple fautif signalé');
