// Attendre l'écran, pas l'horloge : jamais de pause fixe (AGENTS.md). On rend la main quand
// les polices sont chargées, qu'aucune animation ne joue et que la page n'a plus changé pendant
// deux images de suite. Au bout du délai, on rend la main sans erreur : c'est la vérification
// suivante du test qui juge.
const dormir = ms => new Promise(r => setTimeout(r, ms));

function releve() {
  if (!window.__baluchonCalme) {
    window.__baluchonCalme = { n: 0 };
    new MutationObserver(() => (window.__baluchonCalme.n += 1)).observe(document, {
      subtree: true,
      childList: true,
      attributes: true,
      characterData: true,
    });
  }
  return new Promise(r =>
    requestAnimationFrame(() =>
      r({
        n: window.__baluchonCalme.n,
        occupe:
          document.fonts.status === 'loading' ||
          !document.querySelector('#app')?.dataset.ecran ||
          document.getAnimations().some(a => a.playState === 'running'),
      }),
    ),
  );
}

export async function calme(page, { max = 10000 } = {}) {
  const fin = Date.now() + max;
  let avant = null;
  while (Date.now() < fin) {
    const maintenant = await page.evaluate(releve).catch(() => null);
    if (maintenant && avant && !maintenant.occupe && !avant.occupe && maintenant.n === avant.n) return;
    avant = maintenant;
    await dormir(40);
  }
  console.warn(`calme : l’écran bouge encore au bout de ${max} ms`);
}

// Attendre qu'une condition lue dans la page soit vraie, en relisant depuis Node : contrairement à
// calme() et à waitForFunction, rien ne dépend des minuteries de la page, qu'une horloge simulée
// (page.clock) peut tenir arrêtées. Rend la dernière valeur lue ; c'est au test de la juger.
export async function attendreQue(page, condition, argument, { max = 5000 } = {}) {
  const fin = Date.now() + max;
  let valeur;
  do {
    valeur = await page.evaluate(condition, argument);
    if (valeur) return valeur;
    await dormir(40);
  } while (Date.now() < fin);
  return valeur;
}
