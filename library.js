// Groups matching recipes in display order, with recently opened matches first.
import { formatText } from './recipe-text.js';

const CATEGORY_ORDER = ['Breakfast', 'Non-vegan Mains', 'Other Vegan Mains', 'Tofu Vegan Mains', 'Pizza Making', 'Sides', 'Snacks', 'Toddler', 'Dessert', 'Creami', 'Drinks', 'Cocktail', 'Spice mixes'];
const SEARCH_TIERS = [
  ['Title', e => e.recipe.title], ['Category', e => e.recipe.category || ''],
  ['Ingredients', e => e.recipe.ingredients.map(i => i.name).join('\n')],
  ['Steps', e => e.recipe.steps.map(s => [s.label, formatText(s.instruction, 1, 'metric'), ...s.equipment].join('\n')).join('\n')],
];
const categoryRank = c => { const i = CATEGORY_ORDER.indexOf(c); return i < 0 ? CATEGORY_ORDER.length : i; };

export function libraryView(library, query, recentIds) {
  const q = query.trim().toLowerCase();
  const recipes = library.filter(e => e.recipe);
  let groups;
  if (q) {
    const seen = new Set();
    groups = SEARCH_TIERS.map(([name, text]) => {
      const entries = recipes.filter(e => !seen.has(e) && text(e).toLowerCase().includes(q));
      entries.forEach(e => seen.add(e));
      return { name, entries };
    }).filter(group => group.entries.length);
  } else {
    const categories = new Map();
    for (const entry of recipes) {
      const name = entry.recipe.category || '';
      if (!categories.has(name)) categories.set(name, []);
      categories.get(name).push(entry);
    }
    groups = [...categories.keys()].sort((a, b) => categoryRank(a) - categoryRank(b) || a.localeCompare(b))
      .map(name => ({ name, entries: categories.get(name) }));
  }
  const matches = new Map(groups.flatMap(group => group.entries.map(entry => [entry.id, entry])));
  // Filter the full history before limiting it, so newer unrelated visits cannot hide matching ones.
  const recent = recentIds.filter(id => matches.has(id)).slice(0, 2).map(id => matches.get(id));
  const promoted = new Set(recent);
  return {
    recent,
    groups: groups.map(({ name, entries }) => ({ name, entries: entries.filter(entry => !promoted.has(entry)) }))
      .filter(group => group.entries.length),
  };
}
