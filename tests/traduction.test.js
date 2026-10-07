// La traduction : un fichier par langue, le français servant de référence (docs/PLAN.md).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { creerTraducteur } from '../src/i18n/traduction.js';

const dictionnaires = {
  fr: { voyages: { titre: 'Voyages', vide: 'Créez votre premier voyage' } },
  en: { voyages: { titre: 'Trips' } },
};

test('une clé se lit dans la langue demandée', () => {
  const t = creerTraducteur(dictionnaires, 'en');
  assert.equal(t('voyages.titre'), 'Trips');
});

test('une clé absente de la langue demandée se lit en français', () => {
  const t = creerTraducteur(dictionnaires, 'en');
  assert.equal(t('voyages.vide'), 'Créez votre premier voyage');
});

test('une langue sans traduction se lit entièrement en français', () => {
  const t = creerTraducteur(dictionnaires, 'de');
  assert.equal(t('voyages.titre'), 'Voyages');
});

test('une clé inconnue partout est une faute de programmation, signalée tout de suite', () => {
  const t = creerTraducteur(dictionnaires, 'fr');
  assert.throws(() => t('voyages.inconnue'), /voyages\.inconnue/);
  // Une branche n'est pas un texte : la demander est aussi une faute.
  assert.throws(() => t('voyages'), /voyages/);
});
