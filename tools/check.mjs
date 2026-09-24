// Parses and lays out every recipe file, reports the ones the app would reject, and lists files missing from the index.
import { readdir, readFile } from 'node:fs/promises';
import { parseRecipe } from '../parser.js';
import { layoutMap } from '../map.js';

const dir = new URL('../recipes/', import.meta.url);
const files = (await readdir(dir)).filter(f => f.endsWith('.txt') && f !== 'index.txt').map(f => f.slice(0, -4)).sort();
const index = (await readFile(new URL('index.txt', dir), 'utf8')).split('\n').map(l => l.trim()).filter(Boolean);
let bad = 0;
for (const id of files) {
  try {
    const recipe = parseRecipe(await readFile(new URL(`${id}.txt`, dir), 'utf8'));
    layoutMap(recipe);
  } catch (e) {
    bad++;
    console.log(`${id}: ${e.message}`);
  }
}
const missing = files.filter(f => !index.includes(f)), stale = index.filter(f => !files.includes(f));
if (missing.length) console.log('not in index.txt:', missing.join(', '));
if (stale.length) console.log('in index.txt but no file:', stale.join(', '));
console.log(`${files.length} recipes, ${bad} broken`);
process.exit(bad || missing.length || stale.length ? 1 : 0);
