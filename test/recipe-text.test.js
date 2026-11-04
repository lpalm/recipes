import test from 'node:test';
import assert from 'node:assert/strict';
import { parseRecipe } from '../parser.js';
import { parseText, formatText } from '../recipe-text.js';
import { formatAmount } from '../units.js';

test('the main ingredient and its substitute both scale from the recipe portions', () => {
  const recipe = parseRecipe('T\nportions 8\n100 g cream, or {180 g} half-and-half\ncream > finish: Add the cream.');
  const cream = recipe.ingredients[0];
  assert.equal(formatAmount(cream, 16 / recipe.portions, 'metric'), '200 g');
  assert.equal(formatText(cream.prep, 16 / recipe.portions, 'metric'), 'or 360 g half-and-half');
  assert.equal(formatText(cream.prep, 4 / recipe.portions, 'metric'), 'or 90 g half-and-half');
});

test('total package counts scale while the amount in each package stays fixed', () => {
  const note = '{2 cans}, {=15 oz} per can';
  assert.equal(formatText(note, 2, 'imperial'), '4 cans, 15 oz per can');
  assert.equal(formatText(note, 0.5, 'imperial'), '1 can, 15 oz per can');
  assert.equal(formatText('{2} small jars', 2, 'metric'), '4 small jars');
});

test('instruction amounts and ranges scale without changing temperatures, times or piece sizes', () => {
  const text = 'Add {2 to 3 tbsp} jam and {1/8 tsp} extract. Bake {=1 inch} pieces at {=350°F} for {=15 minutes}.';
  assert.equal(formatText(text, 2, 'imperial'), 'Add 4 to 6 tbsp jam and ¼ tsp extract. Bake 1 inch pieces at 350°F for 15 minutes.');
  assert.equal(formatText('{1/2 cup} water', 0.5, 'metric'), '59.15 ml water');
});

test('ambiguous or malformed prose quantities fail instead of silently remaining unchanged', () => {
  for (const text of ['or 180 g cream', 'two small jars', 'twenty grams', 'half a lemon', '{2 grams}', '{2 to 1 g}', '{1/0 g}', '{=}', '{2 g', '2 g}']) {
    assert.throws(() => parseText(text), undefined, text);
  }
});
