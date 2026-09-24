// Lays the steps out as the recipe map: one row per ingredient, a pot's steps stack downward in one column,
// and a new column opens only where separate pots merge.

export function layoutMap({ ingredients, steps }) {
  const consumerOf = { ingredient: ingredients.map(() => null), step: steps.map(() => null) };
  steps.forEach((step, s) => step.inputs.forEach(({ kind, index }) => { consumerOf[kind][index] = s; }));
  const pots = steps.map(step => step.inputs.filter(i => i.kind === 'step').map(i => i.index));
  const added = steps.map(step => step.inputs.filter(i => i.kind === 'ingredient').map(i => i.index));

  // Rows, walking down from the finished dish: what a pot already holds comes first, then what the step adds.
  let rowCount = 0;
  const ingredientRow = ingredients.map(() => null);
  const cellRows = steps.map(() => null);
  const blankRows = []; // [row, step] for steps that add nothing: they still need a row, with an empty ingredient cell
  const placeRows = s => {
    const first = rowCount;
    pots[s].forEach(placeRows);
    const ownFirst = rowCount;
    added[s].forEach(i => { ingredientRow[i] = rowCount++; });
    if (pots[s].length === 1 && !added[s].length) blankRows.push([rowCount++, s]);
    cellRows[s] = pots[s].length >= 2 ? [first, rowCount - first] : [ownFirst, rowCount - ownFirst];
  };
  placeRows(steps.length - 1);

  const col = [];
  steps.forEach((step, s) => {
    const inputCols = pots[s].map(p => col[p]);
    col[s] = inputCols.length === 0 ? 1 : inputCols.length === 1 ? inputCols[0] : 1 + Math.max(...inputCols);
  });
  const colCount = 1 + Math.max(...col);
  // A cell reaches right until the merge that takes it in.
  const endCol = s => {
    let c = consumerOf.step[s];
    while (c !== null && col[c] === col[s]) c = consumerOf.step[c];
    return c === null ? colCount : col[c];
  };
  const cells = [
    ...ingredients.map((_, i) => ({ kind: 'ingredient', index: i, row: ingredientRow[i], rowSpan: 1, col: 0, colSpan: col[consumerOf.ingredient[i]] })),
    ...blankRows.map(([row, s]) => ({ kind: 'blank', index: s, row, rowSpan: 1, col: 0, colSpan: col[s] })),
    ...steps.map((_, s) => ({
      kind: 'step', index: s, row: cellRows[s][0], rowSpan: cellRows[s][1], col: col[s], colSpan: endCol(s) - col[s],
      merges: pots[s].length >= 2,
      continues: pots[s].length === 1,
      continued: consumerOf.step[s] !== null && pots[consumerOf.step[s]].length === 1,
    })),
  ];
  return { rowCount, colCount, cells };
}
