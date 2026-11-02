// La disposition des écrans à listes, l'écran d'un voyage et la Bibliothèque (maquette validée le
// 2026-10-27, docs/maquettes/grand-ecran/) : une seule façon de la suivre pour les deux écrans
// (suivreDisposition), et le glissement des éléments qui changent de place.
//
// Les trois dispositions du grand format (tablettes et ordinateur ; le téléphone garde l'accordéon) :
// - téléphone : le plus petit côté < 600 px, rien ici ;
// - repli : GRAND_FORMAT et largeur < 1340 px (voyage, tuiles de catégories, liste dessous) ;
// - trois colonnes : TROIS_COLONNES (voyage | menu | liste).
// Les mêmes requêtes habillent les dispositions dans src/styles/grand-format.css (un test vérifie
// qu'elles restent identiques). Le seuil de 720 px, côté CSS seulement, ne change que la mise en page.
export const GRAND_FORMAT = '(min-width: 600px) and (min-height: 600px)';
export const TROIS_COLONNES = '(min-width: 1340px) and (min-height: 600px)';

// Relu à chaque appel : le module reste importable sans navigateur (le test des seuils).
const moinsDAnimations = () => matchMedia('(prefers-reduced-motion: reduce)');

// Les colonnes qui défilent chacune (trois colonnes) ; en repli, c'est la page qui défile.
const COLONNES = '.gf-gauche, .gf-menu, .gf-liste';

// Le défilement de chaque colonne, dans l'ordre de COLONNES.
const defilementsDes = main => [...main.querySelectorAll(COLONNES)].map(c => c.scrollTop);

// Deux dispositions lues (grand format, trois colonnes) sont la même.
const memeDisposition = (a, b) =>
  Boolean(a && b) && a.grandFormat === b.grandFormat && a.troisColonnes === b.troisColonnes;

// Pose un dessin dans main : sa classe, ses colonnes (data-colonnes : 3 ou « repli », rien hors du grand
// format) et son HTML. Un dessin dans la même disposition laisse chaque colonne là où on l'avait menée ;
// une autre disposition repart du haut, ou de `reprise` (le défilement de chaque colonne) quand on y revient.
function poserDessin(main, { classe, colonnes, html }, reprise = []) {
  const meme = classe === main.className && String(colonnes) === String(main.dataset.colonnes);
  const defilements = meme ? defilementsDes(main) : reprise;
  main.className = classe;
  if (colonnes) main.dataset.colonnes = colonnes;
  else delete main.dataset.colonnes;
  main.innerHTML = html;
  main.querySelectorAll(COLONNES).forEach((c, i) => (c.scrollTop = defilements[i] ?? 0));
}

// Une commande de l'écran, par son action et, s'il y en a un, son id.
export const trouverCommande = (main, action, id) =>
  main.querySelector(`[data-action="${action}"]${id ? `[data-id="${CSS.escape(id)}"]` : ''}`);

// Un écran à listes qui suit la disposition : l'écran d'un voyage et la Bibliothèque. Chaque dessin
// relit la disposition du moment : tourner l'appareil ou élargir la fenêtre redessine le même état
// (catégorie choisie, filtre, coches, rangement), une seule fois même si les deux seuils sont franchis
// d'un coup. Le focus reste sur la même commande, ou sur la plus proche (commandeProche) si elle n'est
// plus dessinée ; chaque colonne garde son défilement, sauf la liste d'une autre catégorie, qui se lit
// depuis son début. Revenir à la disposition qu'on vient de quitter rend la page et ses colonnes là où on
// les avait laissées : le clavier d'une tablette couchée fait passer la page sous les 600 px du grand
// format le temps d'une saisie (Android 11 et plus, la page s'arrête au bord du clavier : MainActivity.kt),
// et la personne retrouve sa liste en le refermant (de même pour une fenêtre réduite puis rendue).
// Ce que l'écran fournit :
// - dessin({ grandFormat, troisColonnes }) : sa classe, ses colonnes et son HTML (poserDessin) ;
// - choisie() : la catégorie choisie ;
// - categorieDe(id) : la catégorie d'un objet ; rien si id n'est pas celui d'un objet ;
// - ligne : l'autre commande de la ligne d'un objet, s'il en a une (voyage : la fiche) ;
// - repli : la commande qui prend le focus quand rien de la catégorie n'est dessiné ;
// - apresPose() : ce que l'écran fait de chaque dessin posé, avant le focus et le glissement ;
// - animation : la durée et la courbe du glissement ; signal, parti() : la fin de l'écran.
export function suivreDisposition(main, options) {
  const { dessin, choisie, categorieDe, ligne, repli, apresPose, animation, signal, parti } = options;
  // Créées ici, pas au chargement : le module reste importable sans navigateur (le test des seuils).
  const grandFormat = matchMedia(GRAND_FORMAT);
  const troisColonnes = matchMedia(TROIS_COLONNES);
  const lue = () => ({ grandFormat: grandFormat.matches, troisColonnes: troisColonnes.matches });
  // La disposition et la catégorie du dernier dessin.
  let dessinee = null;
  let choisieDessinee = null;
  // Où en sont la page et les colonnes de la disposition dessinée, noté à chaque défilement tant qu'elle
  // est celle de l'écran : quand l'écran change de taille, la nouvelle mise en page les a déjà ramenées
  // vers le haut avant que la disposition ne se redessine.
  let place = null;
  const noter = () => {
    if (memeDisposition(dessinee, lue())) place = { page: scrollY, colonnes: defilementsDes(main) };
  };
  addEventListener('scroll', noter, { capture: true, passive: true, signal });
  // La dernière disposition quittée : sa catégorie et sa place.
  let quittee = null;

  // La commande qui reprend le focus quand celle d'avant n'est plus dessinée (ligne masquée, catégorie
  // repliée ou quittée, disposition changée, fiche fermée) : la même, sinon l'autre commande de la
  // ligne de l'objet, sinon sa catégorie (en-tête d'accordéon au téléphone, carte ou tuile du menu en
  // grand format), sinon la commande de repli ; jamais la page entière.
  function commandeProche({ action, id }) {
    const trouver = (a, i) => trouverCommande(main, a, i);
    const categorieObjet = id ? categorieDe(id) : undefined;
    const categorie = categorieObjet ?? id;
    return (
      trouver(action, id) ??
      (categorieObjet && ligne && trouver(ligne, id)) ??
      (categorie && (trouver('accordeon', categorie) ?? trouver('choisir', categorie))) ??
      (repli && trouver(repli))
    );
  }

  // glissement : ce qui change de place glisse ; enVue : ce qu'il faut amener dans la vue, avant le
  // glissement (un élément qui glisse est mesuré à son ancienne place, et la page ne défilerait pas
  // pour le montrer à la nouvelle).
  function peindre({ glissement = false, enVue = null } = {}) {
    const avant = glissement ? places(main) : null;
    const focus = document.activeElement?.closest('[data-action]');
    const cle = focus && main.contains(focus) && { action: focus.dataset.action, id: focus.dataset.id };
    const disposition = lue();
    const reprise = memeDisposition(quittee?.disposition, disposition) && quittee.choisie === choisie() && quittee;
    if (dessinee && !memeDisposition(dessinee, disposition))
      quittee = { disposition: dessinee, choisie: choisieDessinee, ...place };
    dessinee = disposition;
    poserDessin(main, dessin(dessinee), reprise?.colonnes);
    if (reprise) scrollTo(0, reprise.page);
    if (choisie() !== choisieDessinee) main.querySelector('.gf-liste')?.scrollTo(0, 0);
    choisieDessinee = choisie();
    apresPose?.();
    if (cle) commandeProche(cle)?.focus({ preventScroll: true });
    if (enVue) main.querySelector(enVue)?.scrollIntoView({ block: 'nearest' });
    noter();
    glisser(main, avant, animation);
  }

  // Les deux seuils franchis d'un coup préviennent chacun ; le second trouve la disposition déjà
  // dessinée.
  function suivre() {
    if (parti() || !dessinee || memeDisposition(dessinee, lue())) return;
    peindre();
  }
  for (const requete of [grandFormat, troisColonnes]) requete.addEventListener('change', suivre, { signal });
  return { peindre, commandeProche };
}

// Repli : toucher une tuile montre sa liste ; si elle commence dans la moitié basse de l'écran (des
// dizaines de catégories, ou un écran de 600 px) et n'y tient pas en entier, elle monte jusqu'à son
// titre, 16 px sous le haut (scroll-margin-top, grand-format.css), en douceur sauf si l'appareil demande
// moins d'animations. Une liste déjà toute à l'écran ne bouge pas : la page, à peine plus haute que
// l'écran, ne ferait qu'un sursaut de quelques pixels (décision du contrôleur, phase 8, tâche 6).
// Le focus reste sur la tuile.
export function allerALaListe(main) {
  if (main.dataset.colonnes !== 'repli') return;
  const section = main.querySelector('.gf-liste');
  const place = section?.getBoundingClientRect();
  if (place && place.top > innerHeight / 2 && place.bottom > innerHeight)
    section.scrollIntoView({ block: 'start', behavior: moinsDAnimations().matches ? 'auto' : 'smooth' });
}

// La place de chaque élément mobile ([data-flip]), relevée par rapport à l'élément mobile qui le
// contient : une ligne qui descend avec sa carte ne glisse qu'une fois, avec elle. Rien (null) si
// l'appareil demande moins d'animations : il n'y aura pas de glissement.
export function places(racine) {
  if (moinsDAnimations().matches) return null;
  const resultat = new Map();
  for (const el of racine.querySelectorAll('[data-flip]')) {
    const parent = el.parentElement.closest('[data-flip]');
    resultat.set(el.dataset.flip, el.getBoundingClientRect().top - (parent?.getBoundingClientRect().top ?? 0));
  }
  return resultat;
}

// Chaque élément part de son ancienne place (relevée par places avant le dessin) et glisse jusqu'à la
// nouvelle (technique « FLIP ») ; animation : la durée et la courbe propres à chaque écran.
export function glisser(racine, avant, animation) {
  const apres = avant && places(racine);
  if (!apres) return;
  for (const el of racine.querySelectorAll('[data-flip]')) {
    // Un élément qui vient d'apparaître (filtre retiré) n'a pas d'ancienne place : il est là, simplement.
    if (!avant.has(el.dataset.flip)) continue;
    const delta = avant.get(el.dataset.flip) - apres.get(el.dataset.flip);
    if (Math.abs(delta) > 1) el.animate([{ transform: `translateY(${delta}px)` }, { transform: 'none' }], animation);
  }
}
