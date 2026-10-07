// Les outils communs des tests d'écran (tests/outils/page.mjs) jugent juste : un filet qui crie à
// tort, ou qui se tait devant une faute, ne protège rien. Pages d'essai montées avec les styles de
// l'appli (jetons.css, socle.css, fenetre.css), sans serveur.
// - Témoin : une page plus haute que l'écran, bien rangée entre les barres système, bouton flottant
//   compris, ne donne aucune faute — défilée, son contenu passe forcément sous une bande.
// - Exemple fautif : la même page avec un élément fixé tout en bas, sous la barre du bas, est
//   signalée, et c'est bien cet élément qui est nommé.
// - Fenêtre modale, témoin : une fenêtre rangée entre les barres, dont le corps défile, ne donne
//   aucune faute — le voile couvre les bandes, et ce que le corps cache en défilant (plus haut que
//   la fenêtre) n'est pas jugé ; exemple fautif : la même fenêtre collée en bas de l'écran, sous la
//   barre du bas, est signalée.
import { join } from 'node:path';
import { chromium } from 'playwright';
import { FORMATS, RACINE, creerJuge, verifierBarres } from './outils/page.mjs';

const juge = creerJuge();
const paragraphes = Array.from({ length: 60 }, (_, i) => `<p>Paragraphe ${i + 1}</p>`).join('');
const BANDES = `
    <div class="zone-systeme" data-zone="haut"></div>
    <div class="zone-systeme" data-zone="bas"></div>
    <div class="zone-systeme" data-zone="gauche"></div>
    <div class="zone-systeme" data-zone="droite"></div>`;
const PAGE = `<!doctype html>
  <body>
    <div id="app" data-ecran="essai">
      <main class="ecran">
        <h1>Essai</h1>
        ${paragraphes}
        <button class="bouton bouton-principal bouton-flottant" type="button">Flottant</button>
        <!--FAUTE-->
      </main>
    </div>${BANDES}
  </body>`;
const FAUTE = '<button type="button" style="position: fixed; bottom: 0; left: 50%">Sous la barre</button>';
const FENETRE = `<!doctype html>
  <body>
    <div id="app" data-ecran="essai">
      <main class="ecran"><h1>Derrière</h1>${paragraphes}</main>
      <dialog class="fenetre" style="/*FAUTE*/">
        <h2>Fenêtre</h2>
        <div style="flex: 0 1 auto; min-height: 0; overflow-y: auto">${paragraphes}</div>
        <button class="bouton bouton-principal" type="button">Pied</button>
      </dialog>
    </div>${BANDES}
  </body>`;
const FENETRE_FAUTIVE = FENETRE.replace('/*FAUTE*/', 'inset: auto 0 0 0; margin: 0 auto');

// Un juge qui garde ses fautes, pour regarder ce que l'outil a trouvé.
function releveur() {
  const fautes = [];
  return { fautes, exige: (condition, message) => condition || fautes.push(message) };
}

async function essayer(navigateur, html) {
  const page = await navigateur.newPage({ viewport: FORMATS.telephone });
  await page.setContent(html);
  for (const feuille of ['jetons.css', 'socle.css', 'fenetre.css'])
    await page.addStyleTag({ path: join(RACINE, 'src/styles', feuille) });
  await page.evaluate(() => document.querySelector('dialog')?.showModal());
  const hauteur = await page.evaluate(() => document.documentElement.scrollHeight / window.innerHeight);
  const fenetre = await page.evaluate(() => {
    const f = document.querySelector('dialog');
    const corps = f?.querySelector('div');
    return f && { modale: f.matches(':modal'), defile: corps.scrollHeight > corps.clientHeight };
  });
  const releve = releveur();
  await verifierBarres(page, releve, 'essai');
  await page.close();
  return { hauteur, fenetre, fautes: releve.fautes };
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

  const fenetre = await essayer(navigateur, FENETRE);
  juge.exige(
    fenetre.fenetre?.modale && fenetre.fenetre.defile,
    `fenêtre, témoin : elle devrait être modale et son corps défiler (${JSON.stringify(fenetre.fenetre)})`,
  );
  juge.exige(fenetre.fautes.length === 0, `fenêtre, témoin : fautes signalées à tort : ${fenetre.fautes.join(' | ')}`);

  const fenetreFautive = await essayer(navigateur, FENETRE_FAUTIVE);
  juge.exige(
    fenetreFautive.fautes.some(f => f.includes('dialog « Fenêtre')),
    `fenêtre, exemple fautif : la fenêtre sous la barre du bas devrait être signalée (${fenetreFautive.fautes.join(' | ') || 'rien'})`,
  );
} finally {
  await navigateur.close();
}

juge.conclure(
  'Outils des tests d’écran',
  'barres système : témoins sans faute (page, fenêtre modale), exemples fautifs signalés',
);
