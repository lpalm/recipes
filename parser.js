// Turns a recipe text file into its ingredients and steps; each step names the ingredients and earlier steps it takes in.
import { normalizeUnit } from './units.js';

const FRACTION_GLYPHS = { '½': 1 / 2, '⅓': 1 / 3, '⅔': 2 / 3, '¼': 1 / 4, '¾': 3 / 4, '⅛': 1 / 8, '⅜': 3 / 8, '⅝': 5 / 8, '⅞': 7 / 8 };

export function parseRecipe(text) {
  const recipe = { title: '', portions: null, ingredients: [], steps: [] };
  const names = new Map();
  let section = null; // shopping section for the ingredient lines that follow a "produce:" header
  text.split(/\r?\n/).forEach((raw, i) => {
    const line = raw.trim();
    const at = `line ${i + 1}`;
    if (!line) return;
    if (!recipe.title) { recipe.title = line; return; }
    const portions = line.match(/^portions\s+(\d+)$/i);
    if (portions) { recipe.portions = Number(portions[1]); return; }
    if (line.includes(' > ')) {
      const step = parseStep(line, at, names);
      names.set(step.label.toLowerCase(), { kind: 'step', index: recipe.steps.length });
      recipe.steps.push(step);
      return;
    }
    const header = line.match(/^([^:]+):$/);
    if (header) { section = header[1].trim(); return; }
    const ingredient = { ...parseIngredient(line, at), section };
    if (names.has(ingredient.name.toLowerCase())) throw new Error(`${at}: "${ingredient.name}" is already used as a name`);
    names.set(ingredient.name.toLowerCase(), { kind: 'ingredient', index: recipe.ingredients.length });
    recipe.ingredients.push(ingredient);
  });
  checkUsage(recipe);
  return recipe;
}

// "1 1/2 cups flour, sifted" → amount 1.5, unit cups, name flour, prep sifted. Amount and unit are optional.
function parseIngredient(line, at) {
  const comma = line.indexOf(',');
  const head = comma < 0 ? line : line.slice(0, comma);
  const prep = comma < 0 ? null : line.slice(comma + 1).trim() || null;
  const words = head.trim().split(/\s+/);
  const number = readNumber(words);
  let amount = null, unit = null;
  if (number) {
    amount = number.value;
    words.splice(0, number.words);
    if (words.length > 1 && normalizeUnit(words[0])) unit = normalizeUnit(words.shift());
  }
  const name = words.join(' ');
  if (!name) throw new Error(`${at}: ingredient line needs a name`);
  return { name, amount, unit, prep };
}

// Reads "2", "1.5", "1/2", "1½" or "1 1/2" from the start of the words.
function readNumber(words) {
  const first = /^\d+(\.\d+)?$/.test(words[0]) ? Number(words[0]) : parseFraction(words[0]);
  if (first === null) return null;
  const second = words.length > 1 ? parseFraction(words[1]) : null;
  return second === null ? { value: first, words: 1 } : { value: first + second, words: 2 };
}

function parseFraction(word) {
  const slash = word.match(/^(\d+)\/(\d+)$/);
  if (slash) return Number(slash[1]) / Number(slash[2]);
  const glyph = word.match(/^(\d+)?([½⅓⅔¼¾⅛⅜⅝⅞])$/);
  if (glyph) return Number(glyph[1] || 0) + FRACTION_GLYPHS[glyph[2]];
  return null;
}

// "water + salt > boil: Bring to a boil. ~8 min [large pot] [oven 220 fan]" — oven degrees are °C unless followed by F.
function parseStep(line, at, names) {
  const arrow = line.indexOf(' > ');
  const colon = line.indexOf(':', arrow);
  if (colon < 0) throw new Error(`${at}: step needs "inputs > label: instruction"`);
  const label = line.slice(arrow + 3, colon).trim();
  if (!label) throw new Error(`${at}: step needs a label before the colon`);
  if (names.has(label.toLowerCase())) throw new Error(`${at}: "${label}" is already used as a name`);
  const inputs = line.slice(0, arrow).split('+').map(s => s.trim()).map(name => {
    const found = names.get(name.toLowerCase());
    if (!found) throw new Error(`${at}: unknown input "${name}"`);
    return { kind: found.kind, index: found.index };
  });
  const step = { label, inputs, instruction: '', minutes: null, equipment: [], oven: null };
  let rest = line.slice(colon + 1).replace(/\[([^\]]*)\]/g, (_, text) => {
    const oven = text.trim().match(/^oven\s+(\d+)\s*([cf])?(\s+fan)?$/i);
    if (oven) step.oven = { celsius: /f/i.test(oven[2] || '') ? (Number(oven[1]) - 32) * 5 / 9 : Number(oven[1]), fan: Boolean(oven[3]) };
    else step.equipment.push(text.trim());
    return ' ';
  });
  rest = rest.replace(/~\s*(?:(\d+)\s*h\b)?\s*(?:(\d+)\s*min\b)?/g, (match, h, min) => {
    if ((h === undefined && min === undefined) || step.minutes !== null) return match;
    step.minutes = Number(h || 0) * 60 + Number(min || 0);
    return ' ';
  });
  step.instruction = rest.replace(/\s+/g, ' ').trim();
  if (!step.instruction) throw new Error(`${at}: step "${label}" needs an instruction`);
  return step;
}

// The steps must form one tree ending in the last step: every ingredient and every earlier step feeds exactly one step.
function checkUsage(recipe) {
  if (!recipe.title) throw new Error('recipe needs a title on the first line');
  if (!recipe.portions) throw new Error('recipe needs a "portions N" line');
  if (!recipe.steps.length) throw new Error('recipe needs at least one step');
  const uses = { ingredient: recipe.ingredients.map(() => []), step: recipe.steps.map(() => []) };
  recipe.steps.forEach((step, s) => step.inputs.forEach(({ kind, index }) => uses[kind][index].push(s + 1)));
  recipe.ingredients.forEach((ingredient, i) => expectOneUse(ingredient.name, uses.ingredient[i]));
  recipe.steps.slice(0, -1).forEach((step, s) => expectOneUse(step.label, uses.step[s]));
}

function expectOneUse(name, steps) {
  if (steps.length === 1) return;
  if (!steps.length) throw new Error(`"${name}" is never used by a step`);
  throw new Error(`"${name}" is used by steps ${steps.join(' and ')}; each input feeds exactly one step`);
}
