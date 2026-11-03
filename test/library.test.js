import test from 'node:test';
import assert from 'node:assert/strict';
import { libraryView } from '../library.js';

const entry = (id, title, category, ingredient = '', instruction = '') => ({
  id, recipe: { title, category, ingredients: [{ name: ingredient }], steps: [{ label: 'Cook', instruction, equipment: [] }] },
});
const library = [
  entry('cod', 'Baked fish', 'Non-vegan Mains', 'fish'),
  entry('curry', 'Curry', 'Non-vegan Mains', 'fish'),
  entry('stew', 'Fish stew', 'Non-vegan Mains', 'fish'),
  entry('meatballs', 'Meatballs', 'Non-vegan Mains', 'beef'),
  entry('noodles', 'Noodles', 'Sides', 'fish sauce'),
  entry('rice', 'Rice', 'Sides', 'rice', 'Serve with fish.'),
  entry('waffles', 'Waffles', 'Breakfast', 'flour'),
];
const ids = entries => entries.map(e => e.id);
const groups = view => view.groups.map(group => [group.name, ids(group.entries)]);

test('recent matches come from the full history, excluding newer unrelated recipes', () => {
  const view = libraryView(library, ' FISH ', ['meatballs', 'waffles', 'noodles', 'curry', 'cod']);
  assert.deepEqual(ids(view.recent), ['noodles', 'curry']);
  assert.deepEqual(groups(view), [['Title', ['cod', 'stew']], ['Steps', ['rice']]]);
});

test('only the two latest matches are promoted and every other match keeps its usual order', () => {
  const view = libraryView(library, 'fish', ['rice', 'stew', 'curry', 'cod']);
  assert.deepEqual(ids(view.recent), ['rice', 'stew']);
  assert.deepEqual(groups(view), [['Title', ['cod']], ['Ingredients', ['curry', 'noodles']]]);
});

test('an empty search promotes recent recipes across categories without duplicating them', () => {
  const view = libraryView(library, '  ', ['noodles', 'meatballs', 'cod']);
  assert.deepEqual(ids(view.recent), ['noodles', 'meatballs']);
  assert.deepEqual(groups(view), [
    ['Breakfast', ['waffles']], ['Non-vegan Mains', ['cod', 'curry', 'stew']], ['Sides', ['rice']],
  ]);
});

test('one matching visit does not pull in unrelated recipes to fill the recent section', () => {
  const view = libraryView(library, 'fish', ['meatballs', 'noodles']);
  assert.deepEqual(ids(view.recent), ['noodles']);
  assert.deepEqual(groups(view), [['Title', ['cod', 'stew']], ['Ingredients', ['curry']], ['Steps', ['rice']]]);
});

test('searches without matching history keep the existing tiers and empty results', () => {
  const view = libraryView(library, 'fish', ['meatballs']);
  assert.deepEqual(ids(view.recent), []);
  assert.deepEqual(groups(view), [['Title', ['cod', 'stew']], ['Ingredients', ['curry', 'noodles']], ['Steps', ['rice']]]);
  assert.deepEqual(libraryView(library, 'chocolate', ['meatballs', 'cod']), { recent: [], groups: [] });
});
