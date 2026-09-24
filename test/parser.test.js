import test from 'node:test';
import assert from 'node:assert/strict';
import { parseRecipe } from '../parser.js';

const recipe = (ingredients, steps) => parseRecipe(['T', 'portions 2', ...ingredients, ...steps].join('\n'));

test('ingredient amounts: mixed numbers, glyph fractions, unknown units become part of the name', () => {
  const r = recipe(['1 1/2 cups flour, sifted', '2 eggs', '½ tsp chili flakes', 'salt', '2 l water'], ['flour + eggs + chili flakes + salt + water > mix: Mix.']);
  assert.deepEqual(r.ingredients[0], { name: 'flour', amount: 1.5, unit: 'cup', prep: 'sifted' });
  assert.deepEqual(r.ingredients[1], { name: 'eggs', amount: 2, unit: null, prep: null });
  assert.equal(r.ingredients[2].amount, 0.5);
  assert.deepEqual(r.ingredients[3], { name: 'salt', amount: null, unit: null, prep: null });
  assert.equal(r.ingredients[4].unit, 'l');
});

test('step line: inputs, time, equipment and oven are split off the instruction', () => {
  const r = recipe(['1 egg', '1 cup milk'], ['egg > beat: Beat well.', 'beat + milk > bake: Bake until set. ~1 h 30 min [dish] [oven 200 fan]']);
  const bake = r.steps[1];
  assert.deepEqual(bake.inputs, [{ kind: 'step', index: 0 }, { kind: 'ingredient', index: 1 }]);
  assert.equal(bake.instruction, 'Bake until set.');
  assert.equal(bake.minutes, 90);
  assert.deepEqual(bake.equipment, ['dish']);
  assert.deepEqual(bake.oven, { celsius: 200, fan: true });
  assert.equal(r.steps[0].minutes, null);
  const f = recipe(['1 egg'], ['egg > bake: Bake. [oven 350 F]']);
  assert.equal(Math.round(f.steps[0].oven.celsius), 177);
  assert.equal(f.steps[0].oven.fan, false);
});

test('tree rules: unknown, unused and doubly used inputs and colliding names are errors', () => {
  assert.throws(() => recipe(['1 egg'], ['eggs > beat: Beat.']), /unknown input "eggs"/);
  assert.throws(() => recipe(['1 egg', '1 cup milk'], ['egg > beat: Beat.']), /"milk" is never used/);
  assert.throws(() => recipe(['1 egg'], ['egg > beat: Beat.', 'egg > fry: Fry.']), /"egg" is used by steps 1 and 2/);
  assert.throws(() => recipe(['1 egg', '1 cup milk'], ['egg > beat: Beat.', 'milk > warm: Warm.']), /"beat" is never used/);
  assert.throws(() => recipe(['1 egg'], ['egg > egg: Beat.']), /"egg" is already used as a name/);
});
