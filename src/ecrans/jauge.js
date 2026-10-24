// La jauge d'avancement, dessinée une seule fois pour l'écran d'un voyage et pour l'accueil
// (règle CSS dans socle.css). mini : la version fine des cartes.
export function jauge({ faits, total }, mini = false) {
  const pourcent = total ? Math.round((100 * faits) / total) : 0;
  const fini = total && faits === total ? ' data-fini' : '';
  return `<span class="jauge${mini ? ' jauge-mini' : ''}"${fini}><i style="width: ${pourcent}%"></i></span>`;
}
