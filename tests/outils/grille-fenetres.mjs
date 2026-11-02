// Contrôles propres aux fenêtres et fiches, que la grille de base (page entière) ne voit pas, et noms
// très longs : partagés par les fichiers de grille (tests/ecran-grille-*.mjs).

// Un nom de 60 caractères dont un mot de 30 lettres sans espace.
export const LONG = `${'W'.repeat(30)} et des mots qui suivent encore et encore`.slice(0, 60);

// Un manquement jugé dans la page : la grille compte toute erreur de page comme une faute.
const exigerDansLaPage = (page, condition, message) =>
  page.evaluate(([ok, texte]) => ok || console.error(texte), [condition, message]);

// Rien de la fenêtre du dessus ne dépasse l'un de ses quatre bords ; elle porte au moins un élément. Ce qui
// défile dans une boîte de la fenêtre (le corps d'une fiche) n'est jugé que sur ses côtés : haut et bas
// sont atteints en le faisant défiler (voir dernierBoutonAtteignable).
export async function fenetreEntiere(page, selecteur = 'dialog[open]') {
  const r = await page.evaluate(selecteur => {
    const d = [...document.querySelectorAll(selecteur)].at(-1);
    if (!d) return { absente: true, coupes: [] };
    const bord = d.getBoundingClientRect();
    const dansDefilement = el => {
      for (let n = el.parentElement; n && n !== d; n = n.parentElement)
        if (/auto|scroll/.test(getComputedStyle(n).overflowY)) return true;
      return false;
    };
    const visibles = [...d.querySelectorAll('*')].filter(el => el.getBoundingClientRect().width > 0);
    const coupes = visibles
      .filter(el => {
        const r = el.getBoundingClientRect();
        const cote = r.right > bord.right + 0.5 || r.left < bord.left - 0.5;
        const hauteur = r.bottom > bord.bottom + 0.5 || r.top < bord.top - 0.5;
        return cote || (hauteur && !dansDefilement(el));
      })
      .map(el => `${el.tagName.toLowerCase()} « ${el.textContent.trim().slice(0, 20)} »`);
    return { absente: false, vide: visibles.length === 0, coupes };
  }, selecteur);
  await exigerDansLaPage(
    page,
    !r.absente && !r.vide && r.coupes.length === 0,
    `fenêtre ${selecteur} : absente, vide, ou un élément dépasse l'un de ses bords : ${r.coupes.join(', ')}`,
  );
}

// La fenêtre défilée jusqu'en bas : son dernier bouton est dans l'écran, hors de la barre du bas.
export async function dernierBoutonAtteignable(page, selecteur) {
  const dernier = await page.evaluate(selecteur => {
    const d = document.querySelector(selecteur);
    if (!d) return null;
    for (const el of [d, ...d.querySelectorAll('*')])
      if (el.scrollHeight > el.clientHeight && /auto|scroll/.test(getComputedStyle(el).overflowY))
        el.scrollTop = el.scrollHeight;
    const boutons = [...d.querySelectorAll('button')].filter(b => b.getBoundingClientRect().width > 0);
    if (boutons.length === 0) return null;
    const bas = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--zone-bas'));
    return { bas: Math.max(...boutons.map(b => b.getBoundingClientRect().bottom)), limite: innerHeight - bas };
  }, selecteur);
  await exigerDansLaPage(
    page,
    Boolean(dernier) && dernier.bas <= dernier.limite + 0.5,
    `fenêtre défilée : dernier bouton ${JSON.stringify(dernier)} (aucun bouton, ou sous la barre du bas)`,
  );
}

// Le bandeau « Annuler » : entier dans la zone libre des barres, et son bouton touchable.
export async function bandeauEntierEtTouchable(page, selecteur, message) {
  const b = await page.evaluate(selecteur => {
    const el = document.querySelector(selecteur);
    if (!el?.matches(':popover-open')) return null;
    const r = el.getBoundingClientRect();
    const bouton = el.querySelector('button').getBoundingClientRect();
    const touche = document.elementFromPoint(bouton.left + bouton.width / 2, bouton.top + bouton.height / 2);
    const zone = cote => parseFloat(getComputedStyle(document.documentElement).getPropertyValue(`--zone-${cote}`));
    return {
      entier:
        r.left >= zone('gauche') - 0.5 &&
        r.right <= innerWidth - zone('droite') + 0.5 &&
        r.top >= zone('haut') - 0.5 &&
        r.bottom <= innerHeight - zone('bas') + 0.5,
      touchable: el.querySelector('button').contains(touche),
    };
  }, selecteur);
  await exigerDansLaPage(page, Boolean(b?.entier && b.touchable), `${message} : ${JSON.stringify(b)}`);
}

// Le bandeau « Annuler » vit 10 s : la grille le juge sur une horloge de page simulée, posée juste avant
// le geste qui le fait venir puis arrêtée dès qu'il est là. calme() attend une image d'animation de la
// page : l'horloge simulée la tiendrait aussi arrêtée, donc la page garde la vraie.
export async function installerHorloge(page) {
  await page.evaluate(() => (window.__vraieImage = window.requestAnimationFrame.bind(window)));
  await page.clock.install();
  await page.evaluate(() => (window.requestAnimationFrame = window.__vraieImage));
}
export async function figerHorloge(page) {
  const maintenant = (await page.evaluate(() => Date.now())) + 100;
  await page.clock.pauseAt(maintenant);
}

// Aucun mot d'un segment (choix côte à côte : quantité, pour qui, thème, règle) ne déborde de son segment :
// la boîte du mot est aussi large que sa case ou plus étroite, rien n'est posé sur le voisin ni coupé.
export async function segmentsSansDebord(page, selecteur = 'body') {
  const debordent = await page.evaluate(selecteur => {
    const racine = document.querySelector(selecteur);
    const cases = racine ? [...racine.querySelectorAll('.segment')] : [];
    return cases
      .filter(c => c.getBoundingClientRect().width > 0)
      .filter(c => c.querySelector('span').getBoundingClientRect().width > c.getBoundingClientRect().width + 0.5)
      .map(c => {
        const mot = c.querySelector('span');
        return `« ${c.textContent.trim().slice(0, 20)} » (${Math.round(mot.getBoundingClientRect().width)} px dans ${Math.round(c.getBoundingClientRect().width)})`;
      });
  }, selecteur);
  await exigerDansLaPage(page, debordent.length === 0, `segments dont le mot déborde : ${debordent.join(', ')}`);
}

// Chaque rangée de segments qui passe sur plusieurs lignes a des traits nets : un seul trait entre deux
// cases voisines (jamais deux, jamais aucun), entre deux lignes, et aucun trait en doublon avec le cadre
// au début d'une ligne. Un trait est une bordure calculée ou l'écart laissé entre deux cases (le fond du
// cadre fait le trait). Seuls les coins du cadre sont arrondis : aucune encoche entre deux lignes.
export async function segmentsBordsNets(page, selecteur) {
  const fautes = await page.evaluate(selecteur => {
    const rangee = document.querySelector(selecteur);
    if (!rangee) return ['rangée absente'];
    const cases = [...rangee.querySelectorAll('.segment')];
    const cadre = rangee.getBoundingClientRect();
    const bord = (c, cote) => parseFloat(getComputedStyle(c)[`border${cote}Width`]) || 0;
    // L'intérieur du cadre, sa bordure ôtée.
    const interieur = {
      top: cadre.top + bord(rangee, 'Top'),
      bottom: cadre.bottom - bord(rangee, 'Bottom'),
      left: cadre.left + bord(rangee, 'Left'),
      right: cadre.right - bord(rangee, 'Right'),
    };
    const mal = cases.length ? [] : ['aucune case'];
    cases.forEach((c, i) => {
      const r = c.getBoundingClientRect();
      const nom = c.textContent.trim().slice(0, 12);
      if (r.right > cadre.right + 0.5 || r.left < cadre.left - 0.5) mal.push(`« ${nom} » : dépasse le cadre`);
      const debutDeLigne = i === 0 || r.left < cases[i - 1].getBoundingClientRect().right - 1;
      if (debutDeLigne) {
        if (bord(c, 'Left') > 0) mal.push(`« ${nom} » : trait gauche doublé avec le cadre`);
      } else {
        const trait = bord(c, 'Left') + r.left - cases[i - 1].getBoundingClientRect().right;
        if (trait < 1 || trait > 2) mal.push(`« ${nom} » : ${trait} px de trait à gauche (1 à 2 attendus)`);
      }
      const dessus = cases
        .slice(0, i)
        .filter(a => a.getBoundingClientRect().bottom <= r.top + 1 && a.getBoundingClientRect().right > r.left + 1);
      if (dessus.length) {
        const trait = bord(c, 'Top') + r.top - Math.max(...dessus.map(a => a.getBoundingClientRect().bottom));
        if (trait < 1 || trait > 2) mal.push(`« ${nom} » : ${trait} px de trait au-dessus (1 à 2 attendus)`);
      }
      // Un coin arrondi n'a sa place qu'à un coin du cadre : ailleurs (contre la ligne voisine), il laisse
      // une encoche dans le fond de la case choisie.
      const mot = c.querySelector('span');
      const m = mot.getBoundingClientRect();
      const contre = (a, b) => Math.abs(a - b) <= 1;
      for (const [coin, haut, gauche] of [
        ['TopLeft', true, true],
        ['TopRight', true, false],
        ['BottomLeft', false, true],
        ['BottomRight', false, false],
      ]) {
        const rayon = parseFloat(getComputedStyle(mot)[`border${coin}Radius`]) || 0;
        const auCoin =
          contre(haut ? m.top : m.bottom, haut ? interieur.top : interieur.bottom) &&
          contre(gauche ? m.left : m.right, gauche ? interieur.left : interieur.right);
        if (rayon > 0 && !auCoin) mal.push(`« ${nom} » : coin ${coin} arrondi (${rayon} px) hors d'un coin du cadre`);
      }
    });
    return mal;
  }, selecteur);
  await exigerDansLaPage(page, fautes.length === 0, `traits des segments : ${fautes.join(' ; ')}`);
}
