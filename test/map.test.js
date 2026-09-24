import test from 'node:test';
import assert from 'node:assert/strict';
import { parseRecipe } from '../parser.js';
import { layoutMap } from '../map.js';

const layout = text => {
  const recipe = parseRecipe(text);
  const { cells, ...size } = layoutMap(recipe);
  const named = {};
  cells.forEach(c => { if (c.kind !== 'blank') named[c.kind === 'step' ? recipe.steps[c.index].label : recipe.ingredients[c.index].name] = c; });
  return { ...size, cell: named };
};
const place = ({ row, rowSpan, col, colSpan }) => [row, rowSpan, col, colSpan];

test('a pot continues in its column below its previous step; merging pots opens the next column', () => {
  const { rowCount, colCount, cell } = layout(`T
portions 2
2 l water
1 tbsp salt
200 g spaghetti
60 ml olive oil
3 cloves garlic
1 handful parsley
water + salt > boil: Boil.
boil + spaghetti > cook: Cook.
olive oil + garlic > sizzle: Sizzle.
cook + sizzle + parsley > toss: Toss.`);
  assert.equal(rowCount, 6);
  assert.equal(colCount, 3);
  assert.deepEqual(['water', 'salt', 'spaghetti', 'olive oil', 'garlic', 'parsley'].map(n => cell[n].row), [0, 1, 2, 3, 4, 5]);
  assert.deepEqual(place(cell.boil), [0, 2, 1, 1]);
  assert.deepEqual(place(cell.cook), [2, 1, 1, 1]);
  assert.deepEqual(place(cell.sizzle), [3, 2, 1, 1]);
  assert.deepEqual(place(cell.toss), [0, 6, 2, 1]);
  assert.deepEqual(place(cell.parsley), [5, 1, 0, 2]);
  assert.deepEqual(place(cell.water), [0, 1, 0, 1]);
  assert.equal(cell.boil.continued, true);
  assert.equal(cell.cook.continues, true);
  assert.equal(cell.cook.continued, false);
  assert.equal(cell.sizzle.continues, false);
  assert.equal(cell.toss.continues, false);
  assert.deepEqual(['water', 'salt', 'spaghetti', 'olive oil', 'garlic', 'parsley'].map(n => cell[n].endsGroup), [false, true, true, false, true, true]);
});

test('a step that adds nothing gets a row of its own', () => {
  const { rowCount, cell } = layout(`T
portions 1
1 egg
egg > fry: Fry.
fry > rest: Rest.`);
  assert.equal(rowCount, 2);
  assert.deepEqual(place(cell.fry), [0, 1, 1, 1]);
  assert.deepEqual(place(cell.rest), [1, 1, 1, 1]);
  assert.deepEqual(layoutMap(parseRecipe('T\nportions 1\n1 egg\negg > fry: Fry.\nfry > rest: Rest.')).cells.filter(c => c.kind === 'blank').map(place), [[1, 1, 0, 1]]);
});

test('a pot that waits for a later merge reaches across the columns in between', () => {
  const { colCount, cell } = layout(`T
portions 1
1 a
1 b
1 c
1 d
1 e
1 f
a + b > p: P.
c + d > q: Q.
p + q > m: M.
e + f > r: R.
m + r > z: Z.`);
  assert.equal(colCount, 4);
  assert.deepEqual(place(cell.p), [0, 2, 1, 1]);
  assert.deepEqual(place(cell.m), [0, 4, 2, 1]);
  assert.deepEqual(place(cell.r), [4, 2, 1, 2]);
  assert.deepEqual(place(cell.z), [0, 6, 3, 1]);
  assert.equal(cell.e.colSpan, 1);
});
