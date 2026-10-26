// Les phrases de la question chiffrée et du bandeau « Annuler » (src/ecrans/suppression-textes.js),
// assemblées comme la maquette validée (docs/maquettes/suppressions/textes.js) : seul le nombre est en
// gras, tout nom est échappé, « perdra » ou « perdront » selon le nombre d'éléments touchés.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fr from '../src/i18n/fr.json' with { type: 'json' };
import { creerTraducteur } from '../src/i18n/traduction.js';
import { question, texteBandeau } from '../src/ecrans/suppression-textes.js';

const t = creerTraducteur({ fr }, 'fr');
// Les espaces insécables des textes se comparent comme des espaces.
const net = texte => texte.replace(/\u00a0/g, ' ');
const lire = (cible, nom, csq) => {
  const { titre, texte } = question(t, 'fr', cible, nom, csq);
  return { titre: net(titre), texte: net(texte) };
};
const VOYAGES = 'Les voyages déjà créés ne changent pas.';
const element = nom => ({ id: nom, nom });
const csq = ({ objets = [], etiquettes = [], categories = [], objetsPerdus = [] } = {}) => ({
  objets: objets.map(element),
  etiquettes: etiquettes.map(element),
  perdent: { categories: categories.map(element), objets: objetsPerdus.map(element) },
  bloquent: { categories: [], objets: [] },
});
const OBJET = { type: 'objet', id: 'o' };
const CATEGORIE = { type: 'categorie', id: 'c' };
const ETIQUETTE = { type: 'etiquette', id: 'e' };
const GROUPE = { type: 'groupe', id: 'g' };

test('objet : titre et phrase, sans chiffre', () => {
  assert.deepEqual(lire(OBJET, 'Parasol', csq()), {
    titre: 'Supprimer l’objet « Parasol » ?',
    texte: `Il ne sera plus proposé dans « Nouveau voyage ». ${VOYAGES}`,
  });
});

test('catégorie : ses objets comptés, le nombre seul en gras', () => {
  assert.deepEqual(lire(CATEGORIE, 'Camping', csq({ objets: ['a', 'b', 'c'] })), {
    titre: 'Supprimer la catégorie « Camping » ?',
    texte: `Ses <b>3 objets</b> seront supprimés aussi. Elle ne sera plus proposée dans « Nouveau voyage ». ${VOYAGES}`,
  });
  assert.equal(
    lire(CATEGORIE, 'Papiers', csq({ objets: ['a'] })).texte,
    `Son <b>1 objet</b> sera supprimé aussi. Elle ne sera plus proposée dans « Nouveau voyage ». ${VOYAGES}`,
  );
  assert.equal(lire(CATEGORIE, 'Vide', csq()).texte, `Elle ne sera plus proposée dans « Nouveau voyage ». ${VOYAGES}`);
});

test('étiquette : « perdra » il ou elle, « perdront » à plusieurs', () => {
  const suite = 'Elle ne sera plus proposée dans « Nouveau voyage ».';
  assert.deepEqual(lire(ETIQUETTE, 'Hôtel', csq()), {
    titre: 'Supprimer l’étiquette « Hôtel » ?',
    texte: `${suite} ${VOYAGES}`,
  });
  assert.equal(
    lire(ETIQUETTE, 'Chaud', csq({ objetsPerdus: ['Crème solaire'] })).texte,
    `${suite} <b>1 objet</b> perdra cette étiquette ; il garde ses autres étiquettes. ${VOYAGES}`,
  );
  assert.equal(
    lire(ETIQUETTE, 'Chaud', csq({ categories: ['Baignade'] })).texte,
    `${suite} <b>1 catégorie</b> perdra cette étiquette ; elle garde ses autres étiquettes. ${VOYAGES}`,
  );
  assert.equal(
    lire(ETIQUETTE, 'Plage', csq({ categories: ['Baignade'], objetsPerdus: ['Crème solaire'] })).texte,
    `${suite} <b>1 objet et 1 catégorie</b> perdront cette étiquette ; ils gardent leurs autres étiquettes. ${VOYAGES}`,
  );
});

test('groupe : ses étiquettes en toutes lettres, échappées, puis ce qui perd une étiquette', () => {
  assert.deepEqual(lire(GROUPE, 'Hébergement', csq({ etiquettes: ['Hôtel', '<Tente>'], categories: ['Camping'] })), {
    titre: 'Supprimer le groupe « Hébergement » ?',
    texte:
      'Ses étiquettes Hôtel et &lt;Tente&gt; seront supprimées aussi, et son étape disparaîtra de « Nouveau voyage ». ' +
      `<b>1 catégorie</b> perdra une de ses étiquettes ; elle garde les autres. ${VOYAGES}`,
  });
  assert.equal(
    lire(GROUPE, 'Climat', csq({ etiquettes: ['Chaud'], objetsPerdus: ['a', 'b'] })).texte,
    'Son étiquette Chaud sera supprimée aussi, et son étape disparaîtra de « Nouveau voyage ». ' +
      `<b>2 objets</b> perdront une de leurs étiquettes ; ils gardent les autres. ${VOYAGES}`,
  );
  assert.equal(lire(GROUPE, 'Saison', csq()).texte, VOYAGES);
});

test('un nom à balises reste du texte : le titre est échappé par la fenêtre, la phrase ici', () => {
  const nom = 'Sacs <&">';
  assert.equal(lire(CATEGORIE, nom, csq()).titre, 'Supprimer la catégorie « Sacs <&"> » ?');
  assert.ok(!lire(GROUPE, nom, csq({ etiquettes: ['<b>x</b>'] })).texte.includes('<b>x'));
});

test('le bandeau dit ce qui vient d’être supprimé', () => {
  const bandeau = (cible, nom, c) => net(texteBandeau(t, 'fr', cible, nom, c));
  assert.equal(bandeau(OBJET, 'Parasol', csq()), 'Objet « Parasol » supprimé');
  assert.equal(
    bandeau(CATEGORIE, 'Camping', csq({ objets: ['a', 'b', 'c'] })),
    'Catégorie « Camping » et 3 objets supprimés',
  );
  assert.equal(bandeau(CATEGORIE, 'Papiers', csq({ objets: ['a'] })), 'Catégorie « Papiers » et 1 objet supprimés');
  assert.equal(bandeau(CATEGORIE, 'Vide', csq()), 'Catégorie « Vide » supprimée');
  assert.equal(bandeau(ETIQUETTE, 'Hôtel', csq()), 'Étiquette « Hôtel » supprimée');
  assert.equal(
    bandeau(GROUPE, 'Climat', csq({ etiquettes: ['a', 'b'] })),
    'Groupe « Climat » et 2 étiquettes supprimés',
  );
  assert.equal(bandeau(GROUPE, 'Saison', csq()), 'Groupe « Saison » supprimé');
});
