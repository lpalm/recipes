import test from 'node:test';
import { readdir, readFile } from 'node:fs/promises';
import { parseRecipe } from '../parser.js';

test('every authored recipe declares its prose quantities so new fixed-amount mistakes fail validation', async () => {
  const directory = new URL('../recipes/', import.meta.url);
  for (const file of (await readdir(directory)).filter(name => name.endsWith('.txt') && name !== 'index.txt')) {
    try { parseRecipe(await readFile(new URL(file, directory), 'utf8')); }
    catch (error) { throw new Error(`${file}: ${error.message}`, { cause: error }); }
  }
});
